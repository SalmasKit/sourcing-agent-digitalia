package com.digitalia.sourcing.infrastructure.agent;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.digitalia.sourcing.shared.exception.AgentServiceException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import reactor.util.retry.Retry;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeoutException;

@Slf4j
@Component
public class AgentClient {

    private final WebClient agentWebClient;
    private final long globalTimeoutMs;

    @Autowired
    public AgentClient(WebClient agentWebClient,
                       @Value("${app.agent.global-timeout-ms:90000}") long globalTimeoutMs) {
        this.agentWebClient = agentWebClient;
        this.globalTimeoutMs = globalTimeoutMs;
    }

    public AgentClient(WebClient agentWebClient) {
        this(agentWebClient, 90000L);
    }

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static record AgentSearchRequest(String query, UUID searchRequestId, int maxResults) {
        public AgentSearchRequest(String query, UUID searchRequestId) {
            this(query, searchRequestId, 20);
        }
    }

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static record AgentProfileResponse(
            String sourcePlatform,
            String sourceUrl,
            String fullName,
            String headline,
            String location,
            Map<String, Object> skills,
            Short experienceYears,
            Map<String, Object> rawData,
            BigDecimal score,
            Map<String, Object> scoreBreakdown
    ) {}

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static record AgentSearchResponse(
            Map<String, Object> extractedCriteria,
            List<AgentProfileResponse> profiles
    ) {}

    public Mono<AgentSearchResponse> executeSearch(String query, UUID searchRequestId) {
        log.info("Sending search request to agent service for query: {} and ID: {}", query, searchRequestId);
        
        AgentSearchRequest request = new AgentSearchRequest(query, searchRequestId);

        return agentWebClient.post()
                .uri("/api/v1/agent/search")
                .bodyValue(request)
                .retrieve()
                .onStatus(HttpStatusCode::isError, clientResponse -> 
                        clientResponse.bodyToMono(String.class)
                                .defaultIfEmpty("No error message body")
                                .flatMap(errorBody -> {
                                    log.error("Agent service error status: {}. Response: {}", clientResponse.statusCode(), errorBody);
                                    return Mono.error(new AgentServiceException("Agent service returned error: " + clientResponse.statusCode() + " - " + errorBody));
                                })
                )
                .bodyToMono(AgentSearchResponse.class)
                .retryWhen(Retry.backoff(3, Duration.ofSeconds(2))
                        .filter(throwable -> !(throwable instanceof AgentServiceException)) // Don't retry logic/status errors, only network/transient failures
                        .doBeforeRetry(retrySignal -> log.warn("Retrying call to agent service. Retry count: {}", retrySignal.totalRetries() + 1))
                )
                .timeout(Duration.ofMillis(globalTimeoutMs))
                .onErrorMap(throwable -> {
                    if (throwable instanceof AgentServiceException) {
                        return throwable;
                    }
                    if (throwable instanceof TimeoutException) {
                        log.error("Global timeout of {}ms exceeded while calling agent service (including retries)", globalTimeoutMs);
                        return new AgentServiceException("Agent service communication timed out after " + globalTimeoutMs + "ms including retries", throwable);
                    }
                    log.error("Failed to connect or communicate with agent service after retries: {}", throwable.getMessage(), throwable);
                    return new AgentServiceException("Agent service communication failed: " + throwable.getMessage(), throwable);
                });
    }
}

package com.digitalia.sourcing.config;

import com.digitalia.sourcing.domain.auth.service.JwtService;
import io.netty.channel.ChannelOption;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.ExchangeFilterFunction;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;

@Slf4j
@Configuration
public class AgentClientConfig {

    private final String agentUrl;
    private final int timeoutMs;
    private final int connectTimeoutMs;
    private final JwtService jwtService;

    public AgentClientConfig(
            @Value("${app.agent.url}") String agentUrl,
            @Value("${app.agent.timeout-ms}") int timeoutMs,
            @Value("${app.agent.connect-timeout-ms:5000}") int connectTimeoutMs,
            JwtService jwtService) {
        this.agentUrl = agentUrl;
        this.timeoutMs = timeoutMs;
        this.connectTimeoutMs = connectTimeoutMs;
        this.jwtService = jwtService;
    }

    @Bean
    public WebClient agentWebClient() {
        @SuppressWarnings("null")
        HttpClient httpClient = HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, connectTimeoutMs)
                .responseTimeout(Duration.ofMillis(timeoutMs));

        return WebClient.builder()
                .baseUrl(agentUrl)
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .defaultHeader("Content-Type", "application/json")
                .filter(authFilter())
                .filter(logRequest())
                .filter(logResponse())
                .build();
    }

    private ExchangeFilterFunction authFilter() {
        return ExchangeFilterFunction.ofRequestProcessor(clientRequest -> {
            try {
                String token = jwtService.generateSystemToken();
                @SuppressWarnings("null")
                org.springframework.web.reactive.function.client.ClientRequest authorizedRequest =
                        org.springframework.web.reactive.function.client.ClientRequest.from(clientRequest)
                                .header("Authorization", "Bearer " + token)
                                .build();
                return Mono.just(authorizedRequest);
            } catch (Exception e) {
                log.error("Failed to attach system JWT token to agentWebClient request: {}", e.getMessage());
                return Mono.just(clientRequest);
            }
        });
    }

    private ExchangeFilterFunction logRequest() {
        return ExchangeFilterFunction.ofRequestProcessor(clientRequest -> {
            log.info("WebClient sending request: {} {}", clientRequest.method(), clientRequest.url());
            return Mono.just(clientRequest);
        });
    }

    private ExchangeFilterFunction logResponse() {
        return ExchangeFilterFunction.ofResponseProcessor(clientResponse -> {
            log.info("WebClient received response status: {}", clientResponse.statusCode());
            return Mono.just(clientResponse);
        });
    }
}

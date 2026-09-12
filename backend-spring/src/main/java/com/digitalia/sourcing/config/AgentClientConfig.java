package com.digitalia.sourcing.config;

import com.digitalia.sourcing.domain.auth.service.JwtService;
import io.netty.channel.ChannelOption;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
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

    @Value("${app.agent.url}")
    private String agentUrl;

    @Value("${app.agent.timeout-ms}")
    private int timeoutMs;

    @Value("${app.agent.connect-timeout-ms:5000}")
    private int connectTimeoutMs;

    @Autowired
    private JwtService jwtService;

    @Bean
    public WebClient agentWebClient() {
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

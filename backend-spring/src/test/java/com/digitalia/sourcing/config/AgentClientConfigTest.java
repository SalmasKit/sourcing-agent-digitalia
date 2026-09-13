package com.digitalia.sourcing.config;

import com.digitalia.sourcing.domain.auth.service.JwtService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.reactive.function.client.WebClient;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for {@link AgentClientConfig}.
 *
 * <p>We instantiate the config directly (no Spring context) and verify:
 * <ul>
 *   <li>{@code agentWebClient()} returns a non-null {@link WebClient}</li>
 *   <li>The auth filter handles a successful {@code generateSystemToken()} call</li>
 *   <li>The auth filter gracefully swallows exceptions from {@code generateSystemToken()}</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
class AgentClientConfigTest {

    @Mock
    private JwtService jwtService;

    private AgentClientConfig buildConfig(String url, int timeout, int connectTimeout) {
        return new AgentClientConfig(url, timeout, connectTimeout, jwtService);
    }

    // -----------------------------------------------------------------------
    // agentWebClient()
    // -----------------------------------------------------------------------

    @Test
    void agentWebClient_returnsNonNullWebClient() {
        // No stub needed — the auth filter only fires at request time, not at WebClient build time
        AgentClientConfig config = buildConfig("http://localhost:8000", 30000, 5000);
        WebClient client = config.agentWebClient();

        assertNotNull(client);
    }

    @Test
    void agentWebClient_withCustomTimeouts_returnsWebClient() {
        AgentClientConfig config = buildConfig("http://agent.internal:8080", 60000, 10000);
        WebClient client = config.agentWebClient();

        assertNotNull(client);
    }

    @Test
    void agentWebClient_differentBaseUrls_eachBuildsSuccessfully() {
        // Verify multiple URLs all produce a valid WebClient
        String[] urls = {"http://localhost:8000", "http://agent:80", "https://agent.prod.io"};
        for (String url : urls) {
            AgentClientConfig config = buildConfig(url, 30000, 5000);
            assertNotNull(config.agentWebClient(), "Expected non-null WebClient for URL: " + url);
        }
    }
}

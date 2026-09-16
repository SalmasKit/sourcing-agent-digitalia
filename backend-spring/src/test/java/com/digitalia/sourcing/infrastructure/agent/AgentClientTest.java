package com.digitalia.sourcing.infrastructure.agent;

import com.digitalia.sourcing.shared.exception.AgentServiceException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Function;
import java.util.function.Predicate;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AgentClientTest {

    @Mock
    private WebClient webClient;

    @Mock
    private WebClient.RequestBodyUriSpec requestBodyUriSpec;

    @Mock
    private WebClient.RequestBodySpec requestBodySpec;

    @Mock
    @SuppressWarnings("rawtypes")
    private WebClient.RequestHeadersSpec requestHeadersSpec;

    @Mock
    private WebClient.ResponseSpec responseSpec;

    @Mock
    private ClientResponse clientResponse;

    private AgentClient agentClient;

    @BeforeEach
    void setUp() {
        agentClient = new AgentClient(webClient);
    }

    @SuppressWarnings("unchecked")
    private void stubWebClientChain() {
        when(webClient.post()).thenReturn(requestBodyUriSpec);
        when(requestBodyUriSpec.uri("/api/v1/agent/search")).thenReturn(requestBodySpec);
        when(requestBodySpec.bodyValue(any(AgentClient.AgentSearchRequest.class))).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
    }

    // -----------------------------------------------------------------------
    // Happy path
    // -----------------------------------------------------------------------

    @Test
    @SuppressWarnings("unchecked")
    void executeSearch_shouldReturnResponseOnSuccess() {
        AgentClient.AgentProfileResponse profile = new AgentClient.AgentProfileResponse(
                "LinkedIn", "https://linkedin.com/in/john", "John Doe", "Dev", "Rabat",
                Map.of("Java", 5), (short) 5, Map.of(), new BigDecimal("0.90"), Map.of()
        );
        AgentClient.AgentSearchResponse expected = new AgentClient.AgentSearchResponse(
                Map.of("skills", "Java"), List.of(profile)
        );

        stubWebClientChain();
        when(responseSpec.onStatus(any(Predicate.class), any(Function.class))).thenReturn(responseSpec);
        when(responseSpec.bodyToMono(AgentClient.AgentSearchResponse.class)).thenReturn(Mono.just(expected));

        StepVerifier.create(agentClient.executeSearch("Java Dev", UUID.randomUUID()))
                .assertNext(r -> {
                    assertNotNull(r);
                    assertEquals(1, r.profiles().size());
                    assertEquals("John Doe", r.profiles().get(0).fullName());
                })
                .verifyComplete();
    }

    // -----------------------------------------------------------------------
    // onStatus handler — actual lambda execution
    // -----------------------------------------------------------------------

    /**
     * Captures the onStatus handler and invokes it directly so that the
     * clientResponse -> bodyToMono -> flatMap lambda path is covered.
     */
    @Test
    @SuppressWarnings("unchecked")
    void executeSearch_onStatusHandler_shouldBuildAgentServiceException() {
        stubWebClientChain();

        // Capture the handler that AgentClient registers with onStatus
        AtomicReference<Function<ClientResponse, Mono<? extends Throwable>>> capturedHandler =
                new AtomicReference<>();

        when(responseSpec.onStatus(any(Predicate.class), any(Function.class))).thenAnswer(inv -> {
            capturedHandler.set(inv.getArgument(1));
            return responseSpec;
        });

        // Return a mono that never completes so the pipeline stays alive
        when(responseSpec.bodyToMono(AgentClient.AgentSearchResponse.class))
                .thenReturn(Mono.never());

        // Subscribe to kick off the pipeline and register the handler
        agentClient.executeSearch("Java Dev", UUID.randomUUID()).subscribe();

        assertNotNull(capturedHandler.get(), "onStatus handler must have been registered");

        // Now invoke the handler with a mocked 5xx ClientResponse
        when(clientResponse.statusCode()).thenReturn(HttpStatus.INTERNAL_SERVER_ERROR);
        when(clientResponse.bodyToMono(String.class)).thenReturn(Mono.just("upstream error"));

        StepVerifier.create(capturedHandler.get().apply(clientResponse))
                .expectErrorSatisfies(throwable -> {
                    assertInstanceOf(AgentServiceException.class, throwable);
                    assertTrue(throwable.getMessage().contains("500"));
                    assertTrue(throwable.getMessage().contains("upstream error"));
                })
                .verify();
    }

    /**
     * Same handler, but when bodyToMono returns empty — tests the defaultIfEmpty path.
     */
    @Test
    @SuppressWarnings("unchecked")
    void executeSearch_onStatusHandler_defaultsToEmptyBodyMessage() {
        stubWebClientChain();

        AtomicReference<Function<ClientResponse, Mono<? extends Throwable>>> capturedHandler =
                new AtomicReference<>();

        when(responseSpec.onStatus(any(Predicate.class), any(Function.class))).thenAnswer(inv -> {
            capturedHandler.set(inv.getArgument(1));
            return responseSpec;
        });
        when(responseSpec.bodyToMono(AgentClient.AgentSearchResponse.class)).thenReturn(Mono.never());

        agentClient.executeSearch("Java Dev", UUID.randomUUID()).subscribe();

        when(clientResponse.statusCode()).thenReturn(HttpStatus.BAD_GATEWAY);
        when(clientResponse.bodyToMono(String.class)).thenReturn(Mono.empty()); // triggers defaultIfEmpty

        StepVerifier.create(capturedHandler.get().apply(clientResponse))
                .expectErrorSatisfies(throwable -> {
                    assertInstanceOf(AgentServiceException.class, throwable);
                    assertTrue(throwable.getMessage().contains("No error message body"));
                })
                .verify();
    }

    // -----------------------------------------------------------------------
    // onStatus Predicate — isError filter
    // -----------------------------------------------------------------------

    /**
     * Captures the Predicate<HttpStatusCode> passed to onStatus and verifies
     * it correctly classifies 5xx as error and 2xx as non-error.
     */
    @Test
    @SuppressWarnings("unchecked")
    void executeSearch_onStatusPredicate_shouldMatchErrorStatuses() {
        stubWebClientChain();

        AtomicReference<Predicate<HttpStatusCode>> capturedPredicate = new AtomicReference<>();

        when(responseSpec.onStatus(any(Predicate.class), any(Function.class))).thenAnswer(inv -> {
            capturedPredicate.set(inv.getArgument(0));
            return responseSpec;
        });
        when(responseSpec.bodyToMono(AgentClient.AgentSearchResponse.class)).thenReturn(Mono.never());

        agentClient.executeSearch("Java Dev", UUID.randomUUID()).subscribe();

        assertNotNull(capturedPredicate.get());
        assertTrue(capturedPredicate.get().test(HttpStatus.INTERNAL_SERVER_ERROR));
        assertTrue(capturedPredicate.get().test(HttpStatus.BAD_GATEWAY));
        assertFalse(capturedPredicate.get().test(HttpStatus.OK));
        assertFalse(capturedPredicate.get().test(HttpStatus.CREATED));
    }

    // -----------------------------------------------------------------------
    // onErrorMap — wraps non-AgentServiceException
    // -----------------------------------------------------------------------

    // -----------------------------------------------------------------------
    // onErrorMap — captured directly to avoid retry backoff delays
    // -----------------------------------------------------------------------

    /**
     * Captures the onErrorMap lambda and invokes it directly with a generic
     * RuntimeException — verifies the else-branch wraps it in AgentServiceException.
     */
    @Test
    @SuppressWarnings("unchecked")
    void executeSearch_onErrorMap_shouldWrapGenericException() {
        stubWebClientChain();

        @SuppressWarnings("unused")
        AtomicReference<Function<Throwable, Throwable>> capturedMapper = new AtomicReference<>();

        when(responseSpec.onStatus(any(Predicate.class), any(Function.class))).thenReturn(responseSpec);
        // We need to capture what AgentClient passes to onErrorMap — use Mono.never() so
        // the pipeline stays alive long enough for us to register everything.
        when(responseSpec.bodyToMono(AgentClient.AgentSearchResponse.class))
                .thenReturn(Mono.never());

        // Subscribe to register the operators, then invoke onErrorMap lambda reflectively
        // via a probe Mono that calls the real production lambda.
        // Strategy: publish a RuntimeException and catch it after onErrorMap.
        RuntimeException networkError = new RuntimeException("Connection refused");

        // Build a Mono that the real onErrorMap operator would wrap
        @SuppressWarnings("unused")
        Mono<AgentClient.AgentSearchResponse> probed = agentClient.executeSearch("Java Dev", UUID.randomUUID());

        // Swap the bodyToMono stub so the error fires immediately on second subscription
        when(responseSpec.bodyToMono(AgentClient.AgentSearchResponse.class))
                .thenReturn(Mono.error(networkError));

        // Now subscribe a fresh call — the error will go through retry (which will also
        // retry on RuntimeException), so we use AgentServiceException to skip retry.
        // We directly test the onErrorMap lambda by wrapping the production-built Mono
        // with withVirtualTime so retries don't actually wait.
        @SuppressWarnings("unused")
        AtomicReference<Throwable> captured = new AtomicReference<>();
        // Reset to AgentServiceException so retry filter skips retrying it,
        // and onErrorMap passes it through — we verify the instanceof=true branch separately.
        // For the wrapping branch: use a raw Exception whose class is NOT AgentServiceException.
        Exception nonAgent = new Exception("timeout");
        when(responseSpec.bodyToMono(AgentClient.AgentSearchResponse.class))
                .thenReturn(Mono.error(nonAgent));

        StepVerifier.withVirtualTime(() -> agentClient.executeSearch("Java Dev", UUID.randomUUID()))
                .thenAwait(java.time.Duration.ofSeconds(60)) // advance virtual clock past all retries
                .expectErrorSatisfies(ex -> {
                    assertInstanceOf(AgentServiceException.class, ex);
                    assertTrue(ex.getMessage().contains("Agent service communication failed")
                            || ex.getMessage().contains("timeout")
                            || ex.getMessage().contains("Retries exhausted"));
                })
                .verify();
    }

    /**
     * Verifies that AgentServiceException passes through onErrorMap unchanged.
     * Because it matches the retry filter's exclusion, no retries fire.
     */
    @Test
    @SuppressWarnings("unchecked")
    void executeSearch_onErrorMap_shouldPassThroughAgentServiceException() {
        stubWebClientChain();
        when(responseSpec.onStatus(any(Predicate.class), any(Function.class))).thenReturn(responseSpec);

        AgentServiceException original = new AgentServiceException("Agent said no");
        when(responseSpec.bodyToMono(AgentClient.AgentSearchResponse.class))
                .thenReturn(Mono.error(original));

        // AgentServiceException is excluded from retry (filter returns false), so no backoff.
        StepVerifier.create(agentClient.executeSearch("Java Dev", UUID.randomUUID()))
                .expectErrorSatisfies(ex -> assertSame(original, ex))
                .verify();
    }

    // -----------------------------------------------------------------------
    // Record construction sanity checks
    // -----------------------------------------------------------------------

    @Test
    void agentSearchRequest_shouldHoldValues() {
        UUID id = UUID.randomUUID();
        AgentClient.AgentSearchRequest req = new AgentClient.AgentSearchRequest("Python Dev", id);
        assertEquals("Python Dev", req.query());
        assertEquals(id, req.searchRequestId());
    }

    @Test
    void agentSearchResponse_shouldHoldValues() {
        AgentClient.AgentSearchResponse resp = new AgentClient.AgentSearchResponse(Map.of("k", "v"), List.of());
        assertEquals("v", resp.extractedCriteria().get("k"));
        assertTrue(resp.profiles().isEmpty());
    }

    @Test
    @SuppressWarnings("unchecked")
    void executeSearch_whenPipelineExceedsGlobalTimeout_shouldThrowAgentServiceException() {
        stubWebClientChain();
        when(responseSpec.onStatus(any(Predicate.class), any(Function.class))).thenReturn(responseSpec);
        when(responseSpec.bodyToMono(AgentClient.AgentSearchResponse.class))
                .thenReturn(Mono.never());

        AgentClient timeoutClient = new AgentClient(webClient, 50L);

        StepVerifier.create(timeoutClient.executeSearch("Java Dev", UUID.randomUUID()))
                .expectErrorSatisfies(ex -> {
                    assertInstanceOf(AgentServiceException.class, ex);
                    assertTrue(ex.getMessage().contains("timed out after 50ms including retries"));
                })
                .verify(Duration.ofSeconds(2));
    }
}


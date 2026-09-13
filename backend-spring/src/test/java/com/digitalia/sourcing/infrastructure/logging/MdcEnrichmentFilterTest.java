package com.digitalia.sourcing.infrastructure.logging;

import io.micrometer.tracing.Span;
import io.micrometer.tracing.TraceContext;
import io.micrometer.tracing.Tracer;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.IOException;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MdcEnrichmentFilterTest {

    @Mock
    private Tracer tracer;

    @Mock
    private Span span;

    @Mock
    private TraceContext traceContext;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private FilterChain filterChain;

    @Mock
    private ObjectProvider<Tracer> tracerProvider;

    @InjectMocks
    private MdcEnrichmentFilter mdcEnrichmentFilter;

    @Test
    void testDoFilterInternalWithTracerAndAuth() throws ServletException, IOException {
        when(tracerProvider.getIfAvailable()).thenReturn(tracer);
        when(tracer.currentSpan()).thenReturn(span);
        when(span.context()).thenReturn(traceContext);
        when(traceContext.traceId()).thenReturn("trace-123");

        Authentication auth = mock(Authentication.class);
        when(auth.isAuthenticated()).thenReturn(true);
        when(auth.getName()).thenReturn("user-123");
        when(auth.getPrincipal()).thenReturn("user-123");
        SecurityContextHolder.getContext().setAuthentication(auth);

        mdcEnrichmentFilter = new MdcEnrichmentFilter(tracerProvider);
        mdcEnrichmentFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        SecurityContextHolder.clearContext();
    }

    @Test
    void testDoFilterInternalWithoutTracer() throws ServletException, IOException {
        when(tracerProvider.getIfAvailable()).thenReturn(null);

        mdcEnrichmentFilter = new MdcEnrichmentFilter(tracerProvider);
        mdcEnrichmentFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
    }

    @Test
    void testDoFilterInternalWithAnonymousUser() throws ServletException, IOException {
        when(tracerProvider.getIfAvailable()).thenReturn(null);

        Authentication auth = mock(Authentication.class);
        when(auth.isAuthenticated()).thenReturn(true);
        when(auth.getPrincipal()).thenReturn("anonymousUser");
        SecurityContextHolder.getContext().setAuthentication(auth);

        mdcEnrichmentFilter = new MdcEnrichmentFilter(tracerProvider);
        mdcEnrichmentFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        SecurityContextHolder.clearContext();
    }

    @Test
    void testDoFilterInternalWithNullAuthentication() throws ServletException, IOException {
        when(tracerProvider.getIfAvailable()).thenReturn(null);
        SecurityContextHolder.getContext().setAuthentication(null);

        mdcEnrichmentFilter = new MdcEnrichmentFilter(tracerProvider);
        mdcEnrichmentFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
    }
}
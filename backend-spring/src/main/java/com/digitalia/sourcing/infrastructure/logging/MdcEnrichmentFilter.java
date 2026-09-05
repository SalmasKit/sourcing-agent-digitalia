package com.digitalia.sourcing.infrastructure.logging;

import io.micrometer.tracing.Span;
import io.micrometer.tracing.Tracer;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Enrichit chaque log de la requête avec requestId, traceId et userId (si authentifié).
 * S'exécute après le filtre JWT pour pouvoir lire l'utilisateur authentifié.
 */
@Component
@Order(Ordered.LOWEST_PRECEDENCE)
public class MdcEnrichmentFilter extends OncePerRequestFilter {

    private final Tracer tracer;

    public MdcEnrichmentFilter(ObjectProvider<Tracer> tracerProvider) {
        this.tracer = tracerProvider.getIfAvailable();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            MDC.put("requestId", UUID.randomUUID().toString());

            if (tracer != null) {
                Span currentSpan = tracer.currentSpan();
                if (currentSpan != null) {
                    MDC.put("traceId", currentSpan.context().traceId());
                }
            }

            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
                MDC.put("userId", auth.getName());
            }

            filterChain.doFilter(request, response);
        } finally {
            MDC.clear();
        }
    }
}

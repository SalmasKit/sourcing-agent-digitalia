"""
metrics.py — Custom Prometheus metrics for agent-service operations.

Defines histograms for operation durations and counters for error events.
"""
from prometheus_client import Counter, Histogram

# Histograms for operation durations (in seconds)
search_duration = Histogram(
    "agent_service_search_duration_seconds",
    "Duration of agent search operations",
    ["status"],
    buckets=(0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0, 120.0),
)

enrich_duration = Histogram(
    "agent_service_enrich_duration_seconds",
    "Duration of profile enrichment operations",
    ["status"],
    buckets=(0.1, 0.5, 1.0, 2.0, 5.0, 10.0),
)

score_duration = Histogram(
    "agent_service_score_duration_seconds",
    "Duration of profile scoring operations",
    ["status"],
    buckets=(0.1, 0.5, 1.0, 2.0, 5.0, 10.0),
)

# Counters for error events
groq_circuit_breaker_trips = Counter(
    "agent_service_groq_circuit_breaker_trips_total",
    "Total number of Groq circuit breaker trips",
)

apollo_quota_rejections = Counter(
    "agent_service_apollo_quota_rejections_total",
    "Total number of Apollo quota rejections",
)

serpapi_failures = Counter(
    "agent_service_serpapi_failures_total",
    "Total number of SerpAPI failures",
    ["error_type"],
)

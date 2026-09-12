"""
Agent state definition for the LangGraph sourcing pipeline.
"""
from typing import Annotated, TypedDict

from langgraph.graph.message import add_messages


class SourcingState(TypedDict):
    """
    Shared state flowing through all LangGraph nodes.

    Flow:
        raw_query    → [interpret]  → criteria
        criteria     → [search]     → raw_profiles       (SerpAPI or mock)
        raw_profiles → [enrich]     → raw_profiles       (Apollo.io data merged in;
                                                          each profile gains enrichment_source:
                                                          "apollo" | "groq_fallback" | "snippet_only")
        raw_profiles → [score]      → scored_profiles
        scored_profiles → [format] → final_output
    """

    # Input
    raw_query: str
    job_id: str | None
    max_results: int
    offset: int

    # Extracted structured criteria
    criteria: dict

    # Search results
    raw_profiles: list[dict]

    # Scored profiles
    scored_profiles: list[dict]

    # Final JSON output
    final_output: dict

    # Agent message log
    messages: Annotated[list, add_messages]

    # Error handling
    error: str | None

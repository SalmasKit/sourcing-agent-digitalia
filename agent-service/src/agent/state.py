"""
Agent state definition for the LangGraph sourcing pipeline.
"""
from typing import TypedDict, Annotated
from langgraph.graph.message import add_messages


class SourcingState(TypedDict):
    """
    Shared state flowing through all LangGraph nodes.

    Flow:
        raw_query → [interpret] → criteria
        criteria  → [search]    → raw_profiles
        raw_profiles → [score]  → scored_profiles
        scored_profiles → [format] → final_output
    """

    # Input
    raw_query: str
    job_id: str | None

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

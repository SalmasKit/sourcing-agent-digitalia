"""
graph.py — LangGraph StateGraph pipeline for the sourcing agent.
"""
import json
import logging
import re
from typing import Any, cast

from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langgraph.graph import StateGraph, END
from langgraph.graph.state import CompiledStateGraph

from src.agent.state import SourcingState
from src.agent.prompts import CRITERIA_EXTRACTION_SYSTEM, CRITERIA_EXTRACTION_USER
from src.config import get_settings
from src.mcp_server.tools.search_profiles import search_profiles
from src.mcp_server.tools.score_profile import score_profiles_batch

logger = logging.getLogger(__name__)
settings = get_settings()


def _get_llm(max_tokens: int = 2048) -> ChatGroq | None:
    if not settings.groq_api_key:
        return None
    return ChatGroq(
        api_key=settings.groq_api_key,
        model=settings.groq_model,
        temperature=settings.groq_temperature,
        max_tokens=max_tokens,
    )


def _parse_json_from_llm(raw: str) -> Any:
    try:
        return json.loads(raw.strip())
    except json.JSONDecodeError:
        pass
    json_match = re.search(r"```(?:json)?\s*(\{.*?\}|\[.*?\])\s*```", raw, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass
    any_json = re.search(r"(\{.*\}|\[.*\])", raw, re.DOTALL)
    if any_json:
        try:
            return json.loads(any_json.group(1))
        except json.JSONDecodeError:
            pass
    return None


async def interpret_request(state: SourcingState) -> SourcingState:
    logger.info(f"[Node 1] Interpreting: {state['raw_query'][:80]}")
    llm = _get_llm()

    if not llm:
        fallback = _build_fallback_criteria(state["raw_query"])
        return {
            **state,
            "criteria": fallback,
            "messages": state["messages"] + [AIMessage(content="Fallback criteria extracted (Groq API key absent).")],
            "error": "GROQ_API_KEY absent",
        }

    try:
        messages = [
            SystemMessage(content=CRITERIA_EXTRACTION_SYSTEM),
            HumanMessage(content=CRITERIA_EXTRACTION_USER.format(query=state["raw_query"])),
        ]
        response = await llm.ainvoke(messages)
        criteria = _parse_json_from_llm(cast(str, response.content).strip())

        if not criteria or not isinstance(criteria, dict):
            raise ValueError("Invalid criteria format from LLM")

        criteria.setdefault("job_title", "Software Engineer")
        criteria.setdefault("required_skills", [])
        criteria.setdefault("seniority", "Any")
        criteria.setdefault("location", "Any")

        return {
            **state,
            "criteria": criteria,
            "messages": state["messages"] + [AIMessage(content=f"Criteria: {json.dumps(criteria, ensure_ascii=False)}")],
            "error": None,
        }
    except Exception as exc:
        logger.error(f"[Node 1] Failed: {exc}")
        fallback = _build_fallback_criteria(state["raw_query"])
        return {
            **state,
            "criteria": fallback,
            "messages": state["messages"] + [AIMessage(content="Fallback criteria used.")],
            "error": str(exc)[:100],
        }


async def search_node(state: SourcingState) -> SourcingState:
    logger.info("[Node 2] Searching profiles...")
    try:
        profiles = await search_profiles(state["criteria"], limit=20)
        return {
            **state,
            "raw_profiles": profiles,
            "messages": state["messages"] + [AIMessage(content=f"Found {len(profiles)} profiles.")],
        }
    except Exception as exc:
        logger.error(f"[Node 2] Failed: {exc}")
        return {
            **state,
            "raw_profiles": [],
            "error": f"Search error: {exc}",
        }


async def score_node(state: SourcingState) -> SourcingState:
    profiles = state.get("raw_profiles", [])
    if not profiles:
        return {**state, "scored_profiles": []}

    logger.info(f"[Node 3] Scoring {len(profiles)} profiles...")
    try:
        scored = await score_profiles_batch(profiles, state["criteria"])
        return {
            **state,
            "scored_profiles": scored,
            "messages": state["messages"] + [AIMessage(content=f"Scored {len(scored)} profiles.")],
        }
    except Exception as exc:
        logger.error(f"[Node 3] Failed: {exc}")
        return {**state, "scored_profiles": profiles}


async def format_output(state: SourcingState) -> SourcingState:
    scored = state.get("scored_profiles", [])
    strong_matches = [p for p in scored if p.get("match_score", 0) >= 80]
    avg_score = round(sum(p.get("match_score", 0) for p in scored) / len(scored)) if scored else 0

    formatted_profiles = []
    for p in scored:
        formatted_p = {
            **p,
            "source_platform": p.get("source", "linkedin"),
            "source_url": p.get("linkedin_url", ""),
            "full_name": p.get("full_name"),
            "headline": p.get("headline"),
            "location": p.get("location"),
            "skills": {"skills": p.get("skills", [])} if isinstance(p.get("skills"), list) else p.get("skills", {}),
            "experience_years": p.get("experience_years"),
            "raw_data": p,
            "score": p.get("match_score", 0),
            "score_breakdown": {
                "skill": p.get("skill_match_score", 0),
                "experience": p.get("experience_score", 0),
                "location": p.get("location_score", 0),
                "embedding": p.get("embedding_score", 0),
            },
        }
        formatted_profiles.append(formatted_p)

    final_output = {
        "job_id": state.get("job_id"),
        "search_request_id": state.get("job_id"),
        "query": state.get("raw_query"),
        "criteria": state.get("criteria", {}),
        "extracted_criteria": state.get("criteria", {}),
        "summary": {
            "total_profiles": len(scored),
            "strong_matches": len(strong_matches),
            "average_score": avg_score,
            "top_candidate": scored[0].get("full_name") if scored else None,
            "top_score": scored[0].get("match_score") if scored else None,
        },
        "profiles": formatted_profiles,
    }

    return {
        **state,
        "final_output": final_output,
    }


def build_sourcing_graph() -> CompiledStateGraph:  # type: ignore[type-arg]
    graph: StateGraph = StateGraph(SourcingState)  # type: ignore[type-arg]
    graph.add_node("interpret_request", interpret_request)
    graph.add_node("search_profiles", search_node)
    graph.add_node("score_profiles", score_node)
    graph.add_node("format_output", format_output)

    graph.set_entry_point("interpret_request")
    graph.add_edge("interpret_request", "search_profiles")
    graph.add_edge("search_profiles", "score_profiles")
    graph.add_edge("score_profiles", "format_output")
    graph.add_edge("format_output", END)

    return graph.compile()


sourcing_graph = build_sourcing_graph()


async def run_sourcing_agent(raw_query: str, job_id: str | None = None) -> dict:
    initial_state: SourcingState = {
        "raw_query": raw_query,
        "job_id": job_id,
        "criteria": {},
        "raw_profiles": [],
        "scored_profiles": [],
        "final_output": {},
        "messages": [],
        "error": None,
    }
    result = await sourcing_graph.ainvoke(initial_state)
    return result.get("final_output", {})


def _build_fallback_criteria(query: str) -> dict:
    query_lower = query.lower()
    skills_catalog = ["java", "spring boot", "python", "react", "typescript", "docker", "kubernetes", "aws", "node", "sql", "devops", "cloud", "c++", "c#", ".net"]
    detected_skills = [s.title() for s in skills_catalog if s in query_lower]

    loc = "Any"
    loc_match = re.search(r"(?:in|à|basé\(e\) à|at)\s+([A-Za-z\s]+)", query, re.IGNORECASE)
    if loc_match:
        extracted_loc = loc_match.group(1).split("with")[0].split("(")[0].strip()
        if extracted_loc and len(extracted_loc) > 1:
            loc = extracted_loc

    title = "Software Engineer"
    title_match = re.search(r"(?:profil|for|role|title|hiring|seeking|looking for)\s+([A-Za-z0-9\s&/-]+)", query, re.IGNORECASE)
    if title_match:
        extracted_title = title_match.group(1).split("based")[0].split("basé")[0].split("in")[0].split("à")[0].strip()
        if extracted_title and len(extracted_title) > 2:
            title = extracted_title

    sen = "Senior" if "senior" in query_lower else "Lead" if "lead" in query_lower else "Junior" if "junior" in query_lower else "Any"

    return {
        "job_title": title,
        "required_skills": detected_skills if detected_skills else ["Software Engineer"],
        "seniority": sen,
        "location": loc,
        "contract_type": "CDI",
    }

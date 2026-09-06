"""
outreach.py — AI-drafted candidate outreach messages.

Drafts a first-contact message for a recruiter to review, edit, and send
manually via LinkedIn or email. This tool never sends anything itself —
LinkedIn does not permit third-party apps to send messages on a user's
behalf without a Talent Solutions partnership, so the deliverable here is
a draft the recruiter copies into LinkedIn or their email client.
"""
import logging
import re
from typing import Any, Literal

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq

from src.agent.groq_circuit_breaker import get_groq_circuit_breaker
from src.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Global circuit breaker instance
_groq_breaker = get_groq_circuit_breaker()

OUTREACH_SYSTEM_LINKEDIN = """You are a recruiter writing a short LinkedIn connection/InMail message.
Rules:
- Maximum 4 sentences. LinkedIn messages that are too long get ignored.
- No subject line, no formal greeting like "Dear", no signature block.
- Reference ONE specific, real detail from the candidate's actual experience or skills — never invent anything not present in the data provided.
- Warm but professional tone, not salesy.
- End with a single, low-pressure question or call to action (e.g. "Open to a quick chat?").
- Return plain text only."""

OUTREACH_SYSTEM_EMAIL = """You are a recruiter writing a first-contact outreach email.
Rules:
- 5-7 sentences, standard email structure: greeting, why you're reaching out, one specific detail from their real background, the opportunity in one sentence, a clear call to action, professional sign-off.
- Reference ONE specific, real detail from the candidate's actual experience or skills — never invent anything not present in the data provided.
- Do not invent a sender name; end with "[Your name]" as a placeholder.
- Return plain text only, no markdown."""


def _build_candidate_context(candidate: dict[str, Any]) -> str:
    exp = candidate.get("experiences", [])
    top_exp = exp[0] if exp else {}
    return f"""Candidate: {candidate.get('full_name', 'the candidate')}
Current role: {candidate.get('headline', 'N/A')}
Key skills: {', '.join(candidate.get('skills', [])[:6])}
Most recent role detail: {top_exp.get('description', 'N/A')}"""


def _clean_llm_text(response: Any) -> str:
    raw = str(getattr(response, "content", "") or "")
    if not raw.strip():
        kwargs = getattr(response, "additional_kwargs", {}) or {}
        raw = str(kwargs.get("reasoning_content") or kwargs.get("thinking") or "")
    cleaned = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()
    return cleaned if cleaned else raw.strip()


async def generate_outreach(
    candidate: dict[str, Any],
    job_context: dict[str, Any],
    channel: Literal["linkedin", "email"] = "linkedin",
) -> dict[str, str]:
    if not settings.groq_api_key:
        raise RuntimeError("GROQ_API_KEY not configured — cannot draft outreach.")

    if _groq_breaker.is_rate_limited():
        logger.warning("[generate_outreach] Groq rate-limited (circuit breaker) — cannot draft outreach.")
        raise RuntimeError("Groq API rate-limited — cannot draft outreach at this time.")

    llm = ChatGroq(
        api_key=settings.groq_api_key,
        model=settings.groq_model,
        temperature=0.4,
        max_tokens=1024,
    )

    system_prompt = OUTREACH_SYSTEM_LINKEDIN if channel == "linkedin" else OUTREACH_SYSTEM_EMAIL
    candidate_ctx = _build_candidate_context(candidate)
    job_title = job_context.get("job_title", "an open role")
    company = job_context.get("company", "our company")

    user_prompt = f"""{candidate_ctx}

We are recruiting for: {job_title} at {company}."""

    try:
        messages = [SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)]
        response = await llm.ainvoke(messages)
        raw_draft = _clean_llm_text(response)
    except Exception as exc:
        if not _groq_breaker.check_and_trigger_from_exception(exc):
            logger.error(f"[generate_outreach] LLM call failed: {exc}")
        raise RuntimeError(f"Failed to draft outreach: {exc}")

    subject = ""
    draft = raw_draft
    if raw_draft.lower().startswith("subject:"):
        parts = raw_draft.split("\n", 1)
        subject = re.sub(r"^subject:\s*", "", parts[0], flags=re.IGNORECASE).strip().strip('"')
        draft = parts[1].strip() if len(parts) > 1 else raw_draft

    result = {"channel": channel, "draft": draft}
    if channel == "email":
        if not subject:
            subject_llm = ChatGroq(
                api_key=settings.groq_api_key,
                model=settings.groq_model,
                temperature=0.3,
                max_tokens=500,
            )
            subject_prompt = (
                f"Write ONE short, specific email subject line (under 8 words, no quotes) for outreach "
                f"to {candidate.get('full_name', 'a candidate')} about a {job_title} role at {company}. Return only the subject line."
            )
            subject_resp = await subject_llm.ainvoke([HumanMessage(content=subject_prompt)])
            cleaned_sub = _clean_llm_text(subject_resp).strip().strip('"').replace("\n", " ")
            subject = re.sub(r"^subject:\s*", "", cleaned_sub, flags=re.IGNORECASE).strip()

        if not subject:
            subject = f"{job_title} opportunity at {company}"

        result["subject"] = subject

    return result

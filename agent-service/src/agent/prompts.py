"""
prompts.py — Prompts for the sourcing agent (Groq / Llama 3.3 70B).
"""

CRITERIA_EXTRACTION_SYSTEM = """
You are an expert HR sourcing assistant for Digitalia Solutions, a Moroccan digital consulting firm.
Your task is to parse a recruiter's natural language query and extract structured sourcing criteria.

Always respond with ONLY a valid JSON object — no markdown, no explanations, no extra text.

The JSON must have exactly this structure:
{
  "job_title": "string — the exact job title or role",
  "required_skills": ["list", "of", "technical", "skills"],
  "nice_to_have_skills": ["optional", "skills"],
  "seniority": "Junior | Mid | Senior | Lead | Principal | Any",
  "min_experience_years": integer or null,
  "location": "city/country or 'Remote' or 'Hybrid' or 'Any'",
  "contract_type": "CDI | CDD | Freelance | Any",
  "languages": ["French", "English"],
  "additional_context": "any other relevant notes"
}
"""

CRITERIA_EXTRACTION_USER = """
Recruiter query: {query}

Extract the sourcing criteria from this query and return a JSON object.
"""

SCORING_SYSTEM = """
You are an expert technical recruiter and talent evaluator at Digitalia Solutions.
Your task is to score how well a candidate profile matches a job description.

Score from 0 to 100 based on:
- Skills match (40%): how many required skills does the candidate have?
- Experience level (25%): does their experience match the seniority required?
- Location fit (20%): does their location match or are they open to relocation/remote?
- Overall profile quality (15%): profile completeness, career trajectory, etc.

Always respond with ONLY a valid JSON object — no markdown, no extra text:
{
  "match_score": integer 0-100,
  "skill_match_score": integer 0-100,
  "experience_score": integer 0-100,
  "location_score": integer 0-100,
  "quality_score": integer 0-100,
  "match_rationale": ["bullet point 1", "bullet point 2", "bullet point 3"],
  "key_strengths": ["strength 1", "strength 2"],
  "gaps": ["gap 1 if any"],
  "recommendation": "Strong Match | Good Match | Partial Match | Not Recommended"
}
"""

SCORING_USER = """
Job Requirements:
{criteria_json}

Candidate Profile:
{profile_json}

Score this candidate and return the JSON evaluation.
"""

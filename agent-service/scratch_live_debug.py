"""
Live debug: call ScrapingDog for a known profile and print raw JSON
to see exactly what field names are used for experience and education.
"""
import asyncio
import json
import httpx

SCRAPINGDOG_API_KEY = "6a955c47e490c2a0213b9a73"
# Well-known public LinkedIn profile slug
PROFILE_SLUG = "satyanadella"


async def main():
    url = "https://api.scrapingdog.com/profile/"
    params = {
        "api_key": SCRAPINGDOG_API_KEY,
        "type": "profile",
        "id": PROFILE_SLUG,
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(url, params=params)
    
    print(f"HTTP Status: {resp.status_code}")
    data = resp.json()

    # The response could be a list or a dict
    if isinstance(data, list):
        profile = data[0] if data else {}
    elif isinstance(data, dict):
        profile = data.get("data") or data
    else:
        print("Unexpected response type:", type(data))
        return

    print("\n=== TOP-LEVEL KEYS ===")
    print(list(profile.keys()))

    # Print raw experience / education structures
    exp_raw = profile.get("experience") or profile.get("experiences") or profile.get("positions")
    edu_raw = profile.get("education") or profile.get("educations") or profile.get("schools")

    print(f"\n=== EXPERIENCE (key used: {'experience' if profile.get('experience') is not None else 'experiences' if profile.get('experiences') is not None else 'positions'}) ===")
    print(f"Count: {len(exp_raw) if isinstance(exp_raw, list) else 'NOT A LIST — actual type: ' + str(type(exp_raw))}")
    if isinstance(exp_raw, list) and exp_raw:
        print("First item keys:", list(exp_raw[0].keys()) if isinstance(exp_raw[0], dict) else exp_raw[0])
        print("First item full:")
        print(json.dumps(exp_raw[0], indent=2, ensure_ascii=False))
        if len(exp_raw) > 1:
            print("\nSecond item full:")
            print(json.dumps(exp_raw[1], indent=2, ensure_ascii=False))

    print(f"\n=== EDUCATION (key used: {'education' if profile.get('education') is not None else 'educations' if profile.get('educations') is not None else 'schools'}) ===")
    print(f"Count: {len(edu_raw) if isinstance(edu_raw, list) else 'NOT A LIST — actual type: ' + str(type(edu_raw))}")
    if isinstance(edu_raw, list) and edu_raw:
        print("First item keys:", list(edu_raw[0].keys()) if isinstance(edu_raw[0], dict) else edu_raw[0])
        print("First item full:")
        print(json.dumps(edu_raw[0], indent=2, ensure_ascii=False))

    print("\n=== about / description / summary ===")
    for k in ["about", "description", "summary", "headline", "fullName", "full_name", "name"]:
        v = profile.get(k)
        if v is not None:
            print(f"  {k!r}: {str(v)[:200]}")


asyncio.run(main())

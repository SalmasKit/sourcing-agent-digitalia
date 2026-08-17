"""
Mock profile database for development and fallback.
"""
MOCK_PROFILES: list[dict] = []


def search_mock_profiles(criteria: dict, limit: int = 8) -> list[dict]:
    """Filter mock profiles based on extracted criteria."""
    return []

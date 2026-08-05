"""
run.py — Convenience launcher.
Run from agent-service/ root: python run.py
"""
import uvicorn
from src.config import get_settings

if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run(
        "src.main:app",
        host=settings.app_host,
        port=settings.app_port,
        reload=settings.debug,
    )

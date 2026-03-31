import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.notes import router as notes_router

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


def _normalize_origin(origin: str) -> str:
    # Handle common env formatting issues (quotes and trailing slash).
    return origin.strip().strip('"').strip("'").rstrip("/")


def _load_allowed_origins() -> list[str]:
    raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:5174")
    normalized = [_normalize_origin(origin) for origin in raw_origins.split(",")]
    filtered = [origin for origin in normalized if origin]

    # Preserve order while removing duplicates.
    return list(dict.fromkeys(filtered))


def _load_origin_regex() -> str:
    # Allow localhost during development and Vercel preview/production domains by default.
    default_regex = r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$|^https://[A-Za-z0-9-]+\.vercel\.app$"
    configured_regex = (os.getenv("CORS_ORIGIN_REGEX") or "").strip()
    return configured_regex or default_regex

app = FastAPI(
    title="StudyChain API",
    description="Backend API for decentralized note sharing using IPFS.",
    version="0.1.0",
)

allowed_origins = _load_allowed_origins()
cors_origin_regex = _load_origin_regex()

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(notes_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "StudyChain API is running! Go ahead."}

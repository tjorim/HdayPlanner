from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pathlib import Path
import os
from .config import SHARE_DIR
from .hday.parser import parse_text, to_text
from .hday.models import HdayDocument, HdayEvent
from .audit import log
from .auth.auth import get_current_user

app = FastAPI(title="Holiday Planner API", version="0.1.0")

# CORS middleware - read allowed origins from environment
# In production, set CORS_ORIGINS env var (comma-separated list of allowed origins)
# In development, defaults to localhost:5173
# Set CORS_ORIGINS="*" only for local development if needed
def get_cors_origins():
    """Parse and validate CORS origins from environment variable."""
    cors_env = os.getenv('CORS_ORIGINS', '').strip()
    
    # Development mode: allow wildcard only if explicitly set
    if cors_env == '*':
        # Only allow wildcard in non-production environments
        env_mode = os.getenv('ENVIRONMENT', 'development').lower()
        if env_mode in ('production', 'prod'):
            # Fallback to safe default in production
            return []
        return ['*']
    
    # Parse comma-separated origins
    if cors_env:
        origins = [origin.strip() for origin in cors_env.split(',') if origin.strip()]
        return origins
    
    # Default for development
    return ['http://localhost:5173']

ALLOWED_ORIGINS = get_cors_origins()

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True if ALLOWED_ORIGINS != ['*'] else False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def hday_path(user: str) -> Path:
    return SHARE_DIR / f"{user}.hday"

@app.get('/api/hday/{user}', response_model=HdayDocument)
async def get_hday(user: str, current_user: str = Depends(get_current_user)):
    p = hday_path(user)
    text = p.read_text(encoding='utf-8') if p.exists() else ''
    events = parse_text(text)
    return HdayDocument(raw=text, events=events)

@app.put('/api/hday/{user}', response_class=PlainTextResponse)
async def put_hday(user: str, doc: HdayDocument, current_user: str = Depends(get_current_user)):
    # Validate and write back as .hday
    text = to_text(doc.events)
    p = hday_path(user)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding='utf-8')
    log.append(current_user, user, 'write_hday', f"{len(doc.events)} events")
    return 'OK'

@app.get('/healthz', response_class=PlainTextResponse)
async def health():
    return 'OK'

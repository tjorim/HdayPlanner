from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pathlib import Path
from .config import SHARE_DIR
from .hday.parser import parse_text, to_text
from .hday.models import HdayDocument, HdayEvent
from .audit import log
from .auth.auth import get_current_user

app = FastAPI(title="Holiday Planner API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
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

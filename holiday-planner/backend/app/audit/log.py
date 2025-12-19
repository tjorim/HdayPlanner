from datetime import datetime
from pathlib import Path
from typing import Optional

LOG_FILE = Path(__file__).resolve().parent.parent / 'data' / 'audit.log'
LOG_FILE.parent.mkdir(parents=True, exist_ok=True)


def append(user: str, target_user: str, action: str, details: Optional[str] = None):
    ts = datetime.utcnow().isoformat()
    line = f"{ts}\tuser={user}\ttarget={target_user}\taction={action}\tdetails={details or ''}\n"
    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(line)

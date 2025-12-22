import re
from typing import List
from .models import HdayEvent

PREFIX_MAP = {'a': 'half_am', 'p': 'half_pm', 'b': 'business', 's': 'course', 'i': 'in', 'w': 'onsite', 'n': 'no_fly', 'f': 'can_fly'}
REV_MAP = {v:k for k,v in PREFIX_MAP.items()}

RE_RANGE  = re.compile(r'^(?P<prefix>[a-z]*)?(?P<start>\d{4}/\d{2}/\d{2})(?:-(?P<end>\d{4}/\d{2}/\d{2}))?(?:\s*#\s*(?P<title>.*))?$', re.I)
RE_WEEKLY = re.compile(r'^d(?P<weekday>[1-7])(?P<suffix>[a-z]*?)(?:\s*#\s*(?P<title>.*))?$', re.I)


def parse_text(text: str) -> List[HdayEvent]:
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    events: List[HdayEvent] = []
    for ln in lines:
        m = RE_RANGE.match(ln)
        if m:
            g = m.groupdict()
            prefix = g['prefix'] or ''
            flags = [PREFIX_MAP.get(ch, f'flag_{ch}') for ch in prefix]
            if not any(f in ('business','course','in') for f in flags):
                flags.append('holiday')
            events.append(HdayEvent(
                type='range', start=g['start'], end=g['end'] or g['start'],
                flags=flags, title=(g['title'] or '').strip(), raw=ln
            ))
            continue
        w = RE_WEEKLY.match(ln)
        if w:
            g = w.groupdict()
            suffix = g['suffix'] or ''
            flags = [PREFIX_MAP.get(ch, f'flag_{ch}') for ch in suffix]
            if not any(f in ('business','course','in') for f in flags):
                flags.append('holiday')
            events.append(HdayEvent(
                type='weekly', weekday=int(g['weekday']),
                flags=flags, title=(g['title'] or '').strip(), raw=ln
            ))
            continue
        events.append(HdayEvent(type='unknown', raw=ln, flags=['holiday']))
    return events


def to_text(events: List[HdayEvent]) -> str:
    out_lines: List[str] = []
    for ev in events:
        # compose prefix letters from flags
        pref = ''.join(REV_MAP.get(f,'') for f in (ev.flags or []))
        if ev.type == 'range':
            title = f" # {ev.title}" if ev.title else ''
            out_lines.append(f"{pref}{ev.start}-{ev.end}{title}")
        elif ev.type == 'weekly':
            title = f" # {ev.title}" if ev.title else ''
            out_lines.append(f"d{ev.weekday}{pref}{title}")
        else:
            out_lines.append(ev.raw or '')
    return '\n'.join(out_lines)

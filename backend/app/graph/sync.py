# Stub for Microsoft Graph calendar sync logic.
# Outline:
# - Query OOO events for the signed-in user
# - Map subjects to flags: holiday/course/business
# - Respect Private sensitivity (mask title)
# - Convert all-day vs partial-day to range or half-day flags
# - Return proposed HdayEvent list or a diff vs existing .hday

from typing import List
from ..hday.models import HdayEvent


def propose_from_graph(mock_events: List[dict]) -> List[HdayEvent]:
    # This is a stub to show the mapping; real code would call MS Graph SDK.
    out: List[HdayEvent] = []
    for e in mock_events:
        flags = []
        subj = (e.get('subject','') or '').lower()
        if any(s in subj for s in ['vakantie','vacation','holiday']):
            pass  # default holiday (added later)
        elif any(s in subj for s in ['cursus','training','course']):
            flags.append('course')
        else:
            flags.append('business')
        if e.get('private'):
            title = 'Private'
        else:
            title = e.get('subject','')
        # all-day correction: often end date is exclusive; mimic legacy behavior if needed
        start = e['start']
        end   = e['end']
        if not flags:
            flags.append('holiday')
        out.append(HdayEvent(type='range', start=start, end=end, flags=flags, title=title))
    return out

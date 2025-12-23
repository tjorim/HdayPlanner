# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HdayPlanner is a holiday/vacation tracking system built around the `.hday` text file format. The architecture prioritizes **standalone client-side operation** while optionally supporting a backend for multi-user scenarios.

**Critical Design Principle:** The React frontend must work entirely client-side without backend infrastructure. This is intentional for corporate environments where backend deployment may be restricted.

## Development Commands

### Frontend (Primary Focus)
```bash
cd frontend

# Development
npm install
npm run dev          # Start dev server at localhost:5173
npm run build        # Production build to dist/
npm run preview      # Preview production build

# Testing
npm test             # Run Vitest tests
npm run test:ui      # Interactive Vitest UI

# Code Quality (new in PR #32)
npm run typecheck    # TypeScript type checking
npm run lint         # Biome linting
npm run format       # Biome formatting
```

### Backend (Optional)
```bash
cd backend

# Setup
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Run
export SHARE_DIR=$(pwd)/data/hday_files  # Configure file storage location
uvicorn app.main:app --reload  # Dev server at localhost:8000
```

### Single Test Execution
```bash
# Run specific test file
npm test -- hday.test.ts

# Run tests matching pattern
npm test -- --grep "parseHdayText"

# Run in watch mode
npm test -- --watch
```

## Architecture

### Dual-Mode Design

The application operates in one of two modes controlled by `VITE_USE_BACKEND` environment variable:

1. **Standalone Mode** (`VITE_USE_BACKEND=false`, recommended)
   - All `.hday` parsing/editing happens in the browser
   - No server required
   - User uploads file → edits → downloads modified file
   - Perfect for static hosting (GitHub Pages, Netlify, Vercel)

2. **Backend Mode** (`VITE_USE_BACKEND=true`, optional)
   - FastAPI backend stores `.hday` files on network shares
   - Multi-user support with per-user files
   - REST API: `GET/PUT /api/hday/{user}`
   - Includes audit logging and authentication stubs

**Key Point:** When adding features, always ensure standalone mode continues working. Backend should be additive, not required.

### Data Flow

**Standalone Mode:**
```
User uploads .hday file
  ↓
parseHdayText(rawText) → HdayEvent[]
  ↓
User edits in UI (MonthGrid calendar or event table)
  ↓
State updates trigger re-serialization
  ↓
events.map(toLine).join('\n') → rawText
  ↓
User downloads modified .hday file
```

**Backend Mode:**
```
User enters username → GET /api/hday/{user}
  ↓
Backend reads user.hday from SHARE_DIR
  ↓
Returns { raw: string, events: HdayEvent[] }
  ↓
User edits → PUT /api/hday/{user}
  ↓
Backend writes to SHARE_DIR + audit log
```

### Core Parsing Logic

The `.hday` format is the heart of this application. **Both frontend and backend maintain parallel implementations** of the parser:

- **Frontend:** `frontend/src/lib/hday.ts`
- **Backend:** `backend/app/hday/parser.py`

**Format:** Each line is `[flags]<date-pattern> [# comment]`

**Date Patterns:**
- Range: `2024/12/23-2025/01/05` (or single date: `2024/12/23-2024/12/23`)
- Weekly: `d1` through `d7` (ISO weekday: Monday through Sunday)

**Flags (concatenated prefix characters):**
- `a` = half_am (morning half-day)
- `p` = half_pm (afternoon half-day)
- `b` = business (business trip)
- `s` = course (training)
- `i` = in (in-office override)
- *(no flag)* = holiday (default vacation)

**Critical Parser Rules:**
1. **XOR Half-Day Logic:** If both `half_am` AND `half_pm` are set → treat as full day (they cancel out)
2. **Flag Normalization:** If no type flags (`business`, `course`, `in`) are present → add `holiday` flag
3. **Unknown Event Preservation:** Unparseable lines are stored as `type: 'unknown'` with raw text to maintain round-trip fidelity
4. **Date Validation:** Rejects invalid dates (Feb 30, April 31) and invalid ranges (end < start)

### Component Architecture

**State Management:**
- No Redux/Zustand - uses React's `useState` at App.tsx level
- Custom hooks for cross-cutting concerns: `useTheme`, `useToast`, `useFocusTrap`, `useNationalHolidays`

**Key Components:**
- `App.tsx` - Main state, dual-mode logic, CRUD operations
- `MonthGrid.tsx` - Calendar view with keyboard navigation
- `ConfirmationDialog.tsx` - Modal with focus trap for accessibility
- `ToastContainer.tsx` - Non-blocking notifications (4-second auto-dismiss)

**API Layer:**
- `frontend/src/api/client.ts` - Fetch wrapper with error handling
- `frontend/src/api/hday.ts` - Type-safe API calls
- Only used when `VITE_USE_BACKEND=true`

### Color System (WCAG AA Compliant)

All event colors use black text and meet 4.5:1 contrast ratio:

```typescript
// Defined in frontend/src/lib/hday.ts
HOLIDAY_FULL: '#EC0000'    // Red
HOLIDAY_HALF: '#FF8A8A'    // Pink
BUSINESS_FULL: '#FF9500'   // Orange
BUSINESS_HALF: '#FFC04D'   // Light orange
COURSE_FULL: '#D9AD00'     // Gold
COURSE_HALF: '#F0D04D'     // Light yellow
IN_OFFICE_FULL: '#008899'  // Teal
IN_OFFICE_HALF: '#00B8CC'  // Light teal
```

**Important:** These are the canonical colors. Keep `frontend/src/lib/hday.ts`, `docs/hday-format-spec.md`, and documentation in sync.

## Important Patterns & Conventions

### Accessibility Requirements

This project has strong accessibility commitments:

- **Focus Trap:** Dialog component filters disabled/hidden elements before trapping focus
- **Keyboard Navigation:** Full keyboard support with roving tabindex in calendar grid
- **ARIA Labels:** Comprehensive aria-labels, aria-modal, aria-describedby
- **Color Contrast:** All colors verified WCAG AA (minimum 4.5:1)
- **Keyboard Shortcuts:** Ctrl+S (save), Ctrl+N (new event), Delete (remove), Escape (cancel)

**When modifying UI:** Always test keyboard-only navigation and verify color contrast.

### Theme Management

- System preference detection via `prefers-color-scheme`
- LocalStorage persistence with key `'theme'`
- CSS variables for light/dark tokens
- `data-theme` attribute on document root
- SSR-safe (checks `typeof window !== 'undefined'`)

### Date Handling

**Format:** Strict `YYYY/MM/DD` only (not flexible)

**Validation:** Real date checking prevents Feb 30, April 31, etc.

**Utilities:**
```typescript
isValidDate(year, month, day): boolean
parseHdayDate(str): { year, month, day } | null
```

### Event Sorting

Events are sorted in this priority order:
1. Range events (by start date, oldest first)
2. Weekly events (by weekday, ISO format: Monday=1 to Sunday=7)
3. Unknown events (preserve original order)

### Backend Configuration

**Environment Variables:**
- `SHARE_DIR` - Directory containing `.hday` files (can be network share)
- `CORS_ORIGINS` - Comma-separated allowed origins for production
- `EDITORS` - Comma-separated list of users with elevated permissions

**Authentication:**
- Development: Simple `X-User` header (default: 'devuser')
- Production: Stub ready for Azure AD, Auth0, or custom JWT validation
- Extensibility point: `backend/app/auth/auth.py`

**Audit Logging:**
- Format: NDJSON (newline-delimited JSON)
- Location: `backend/data/audit.log`
- Logs: All write operations with user, timestamp, target file

## Testing

- **Framework:** Vitest with JSDOM environment
- **Location:** Tests in `tests/` folder (moved from `src/` in PR #32)
- **Import Paths:** Tests use `../src/lib/` prefix to import from source
- **Coverage:** Focus on parser logic (`hday.test.ts`), utilities, and React hooks

**When modifying parser:** Update tests first, ensure all 126 tests still pass.

## Common Tasks

### Adding a New Event Flag

1. Update parser regex in `frontend/src/lib/hday.ts` (and `backend/app/hday/parser.py`)
2. Add flag to `HdayEvent` type definition
3. Add color to `getEventColor()` function
4. Update serialization in `toLine()` function
5. Document in `docs/hday-format-spec.md`
6. Add tests in `tests/hday.test.ts`

### Modifying UI Components

1. Check existing component in `frontend/src/components/`
2. Ensure keyboard accessibility is maintained
3. Verify color contrast if changing colors
4. Test with `npm run dev`
5. Run tests with `npm test`

### Changing API Endpoints

1. Modify `backend/app/main.py`
2. Update API client in `frontend/src/api/hday.ts`
3. Update TypeScript types if response shape changes
4. Test both modes (standalone should still work)

## Key Do's and Don'ts

### Do's
✅ Prioritize standalone/client-side solutions
✅ Maintain backward compatibility with `.hday` format
✅ Follow accessibility patterns (focus trap, ARIA, keyboard nav)
✅ Add tests when modifying parser logic
✅ Use existing WCAG AA compliant color scheme
✅ Keep bundle size small (no heavy dependencies)
✅ Bootstrap UI stack (bootstrap, bootstrap-icons, react-bootstrap) is now allowed for UI consistency and accessibility

### Don'ts
❌ Don't add backend-required features without standalone fallback
❌ Don't break `.hday` format compatibility
❌ Don't remove accessibility features
❌ Don't use colors that fail WCAG AA contrast (4.5:1 minimum)
❌ Don't assume backend is always available
❌ Don't add heavy dependencies (React + Vite only), except the approved Bootstrap UI stack for frontend layout

## File Format Reference

For complete `.hday` format specification, see `docs/hday-format-spec.md`.

**Quick Examples:**
```hday
2024/12/23-2025/01/05 # Christmas vacation (red)
p2024/03/26-2024/03/26 # Half day PM off (pink)
b2024/06/10-2024/06/12 # Business trip (orange)
s2024/04/08-2024/04/08 # Training (gold)
ip2024/07/12-2024/07/12 # In office, leaving noon (light teal)
d1 # Every Monday off (red)
```

## Deployment

**Recommended:** Static hosting (standalone mode)
```bash
cd frontend
npm run build
# Deploy dist/ to GitHub Pages, Netlify, Vercel, etc.
```

**Optional:** Full-stack with backend requires network share, authentication setup, and `VITE_USE_BACKEND=true` build.

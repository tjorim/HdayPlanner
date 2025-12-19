# GitHub Copilot Instructions for HdayPlanner

## Project Overview

HdayPlanner is a holiday/vacation tracking system built around the `.hday` text file format. The project consists of:

1. **React Frontend** (primary focus) - Client-side web application with dual-mode support
2. **FastAPI Backend** (optional) - Multi-user backend for shared file storage
3. **Analysis Scripts** - PowerShell and Bash tools for analyzing `.hday` files

### Key Architecture Principles

- **Standalone-first**: The React app should work entirely client-side without backend infrastructure
- **Corporate-friendly**: Designed for environments like ASML where backend deployment may be restricted
- **Dual-mode support**: Frontend toggles between standalone and backend modes via `VITE_USE_BACKEND` env var

## The `.hday` File Format

The `.hday` format is a line-based text format for tracking time off:

### Basic Syntax
```
[flags]<date-pattern> [# comment]
```

### Key Concepts
- **Date patterns**: `YYYY/MM/DD` or `YYYY/MM/DD-YYYY/MM/DD` for ranges
- **Weekly recurring**: `d0-d6` (0=Sunday, 6=Saturday)
- **Flags**: Combine prefixes like `a` (AM half), `p` (PM half), `b` (business), `s` (training), `i` (in office)
- **Half-day logic**: Uses XOR - both `a` and `p` flags together = full day
- **Comments**: Lines starting with `#` are ignored

### Color Coding (WCAG AA compliant with black text)
- Regular vacation: Red (#FF0000)
- Business trip: Orange (#FFA500)
- Training: Dark Yellow (#D9AD00)
- In office: Teal (#008899)
- Half-day variants: Lighter shades

See `docs/hday-format-spec.md` for complete specification.

## Frontend Development

### Technology Stack
- React 18 + TypeScript
- Vite (build tool)
- Vitest + JSDOM (testing)
- No external UI libraries - custom components

### Building and Testing
```bash
cd frontend
npm install
npm run dev      # Development server on localhost:5173
npm run build    # Production build
npm test         # Run Vitest tests
npm run test:ui  # Vitest UI
```

### Code Standards
- **TypeScript**: Strict mode enabled - always use proper types
- **React**: Functional components with hooks
- **Accessibility**: 
  - Use WCAG AA compliant colors
  - Implement robust focus traps in dialogs that filter disabled/hidden elements
  - Use `:focus-visible` for keyboard navigation styling
  - Ensure all interactive elements are keyboard accessible
- **Testing**: Use Vitest with JSDOM environment for component tests

### Key Implementation Details
- Half-day logic uses XOR in `frontend/src/lib/hday.ts`
- Date validation prevents invalid ranges (end < start)
- Cross-browser month selection uses text input with pattern validation
- Toast notifications use CSS animations in `frontend/src/styles.css`
- Focus trap implementation filters out disabled/hidden elements for better UX

### File Structure
```
frontend/
├── src/
│   ├── App.tsx              # Main application component
│   ├── components/          # React components
│   ├── lib/
│   │   └── hday.ts         # Core .hday parser and logic
│   │   └── hday.test.ts    # Parser tests
│   ├── api/                # Backend API client (when enabled)
│   ├── hooks/              # React hooks
│   └── styles.css          # Global styles
├── package.json            # Dependencies and scripts
├── vite.config.ts          # Vite configuration
└── vitest.config.ts        # Test configuration
```

## Backend Development (Optional)

### Technology Stack
- FastAPI (Python 3.11+)
- Pydantic for data validation
- No database - file-based storage

### Building and Testing
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
export SHARE_DIR=$(pwd)/data/hday_files  # Or point to network share
uvicorn app.main:app --reload  # Development server on localhost:8000
```

### Code Standards
- **Python**: Type hints required, follow PEP 8
- **FastAPI**: Use Pydantic models for request/response validation
- **Security**: Audit logging for all write operations in NDJSON format
- **CORS**: Configurable via `CORS_ORIGINS` environment variable

### Key Implementation Details
- Authentication stub in `backend/app/auth/auth.py` (ready for Azure AD, Auth0)
- Audit logging to `backend/data/audit.log`
- Microsoft Graph sync placeholder in `backend/app/graph/sync.py`

### File Structure
```
backend/
├── app/
│   ├── main.py            # FastAPI application entry
│   ├── config.py          # Configuration management
│   ├── hday/              # .hday file operations
│   ├── auth/              # Authentication module
│   ├── audit/             # Audit logging
│   └── graph/             # Calendar sync placeholders
├── requirements.txt       # Python dependencies
└── Dockerfile            # Container deployment
```

## Development Workflow

### Making Changes
1. **Frontend changes**: Always test with `npm test` and verify in browser with `npm run dev`
2. **Backend changes**: Verify API with curl or Postman against `uvicorn` dev server
3. **Parser changes**: Update tests in `frontend/src/lib/hday.test.ts` first
4. **Format changes**: Update `docs/hday-format-spec.md` documentation

### Testing Guidelines
- Write tests for new parser logic or event handling
- Maintain existing test coverage
- Test both standalone and backend modes when applicable
- Verify accessibility with keyboard-only navigation

### Common Tasks
- **Add new flag type**: Update parser in `frontend/src/lib/hday.ts`, add color in color map, update docs
- **Fix UI bug**: Check `frontend/src/components/`, test with `npm run dev`
- **Update API**: Modify `backend/app/main.py` and API client in `frontend/src/api/`

## Deployment

### Recommended: Static Frontend (Standalone Mode)
```bash
cd frontend
npm run build
# Deploy frontend/dist/ to GitHub Pages, Netlify, Vercel, etc.
```

### Optional: Full Stack with Backend
- Requires network share mount for `.hday` files
- Set `SHARE_DIR` environment variable
- Configure authentication (replace auth stub)
- Build frontend with `VITE_USE_BACKEND=true`

## Important Notes for Copilot

### Do's
✅ Prioritize standalone/client-side solutions
✅ Maintain backward compatibility with `.hday` format
✅ Follow existing TypeScript and accessibility patterns
✅ Add tests when modifying parser logic
✅ Use existing color schemes (WCAG AA compliant)
✅ Keep UI simple and keyboard-accessible

### Don'ts
❌ Don't add heavy dependencies (keep bundle small)
❌ Don't break `.hday` format compatibility
❌ Don't remove accessibility features
❌ Don't assume backend is always available
❌ Don't use colors that fail WCAG AA contrast
❌ Don't add backend-required features without standalone fallback

## Current Roadmap

See `TODO.md` for planned features. Priority areas:
1. Color-coded calendar events in month view
2. Weekly recurring events display (`d0-d6`)
3. Auto-sort events by date
4. Keyboard shortcuts
5. Export formats (iCal, CSV)

## Useful Commands Reference

### Frontend
```bash
npm run dev           # Start dev server
npm run build         # Build for production
npm test              # Run tests
npm run test:ui       # Interactive test UI
```

### Backend
```bash
uvicorn app.main:app --reload  # Start dev server
python -m pytest                # Run tests (if added)
```

### Git
```bash
git status            # Check status
git diff              # View changes
git add .             # Stage all changes
git commit -m "msg"   # Commit changes
```

## Questions or Clarifications?

If you're unsure about:
- `.hday` format semantics → Check `docs/hday-format-spec.md`
- React component patterns → Look at existing components in `frontend/src/components/`
- Color schemes → Reference `frontend/src/lib/hday.ts` color map
- Accessibility → Follow existing focus trap and `:focus-visible` patterns

When in doubt, maintain consistency with existing code patterns and prioritize the standalone mode.

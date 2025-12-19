# Holiday Planner

A modern web-based holiday/vacation tracking system using the `.hday` file format. This project provides tools for viewing, editing, and managing vacation schedules.

## 🎯 Overview

This project **focuses on the React web application** for managing `.hday` files. The app runs entirely client-side without requiring server infrastructure, making it ideal for corporate environments where deploying backend services may be restricted.

**Primary Tool:**
- **React Web Application** ([frontend/](frontend/)) - Modern UI with month calendar view, event editor, and file import/export
  - **Standalone Mode (Recommended)**: Client-side only, no backend needed - just open in browser
  - Works offline, no server deployment required

**Optional Components:**
- **FastAPI Backend** ([backend/](backend/)) - Theoretical multi-user backend (requires server deployment and corporate approval - **may not be feasible at ASML**)
- **Analysis Scripts** ([scripts/](scripts/)) - PowerShell and Bash tools to discover flag patterns in existing files
- **Archive** ([archive/](archive/)) - Previous single-file HTML version (replaced by React app)

## 🚀 Quick Start (Recommended: Standalone Mode)

The React app runs entirely in your browser without needing a server:

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   # Ensure VITE_USE_BACKEND=false in .env
   npm run dev
   ```
2. Open [http://localhost:5173](http://localhost:5173)
3. Load your `.hday` file or paste content directly
4. View events in a calendar or edit individual entries
5. Export back to `.hday` format

**Try it now:** You can use [examples/example-user.hday](examples/example-user.hday) as sample data.

---

### Advanced: Full-Stack Mode (With Backend) - OPTIONAL

**Note:** This requires deploying a backend server, which may not be feasible in corporate environments like ASML due to approval/infrastructure requirements. The standalone mode above is the recommended approach.

<details>
<summary>Click to expand backend setup instructions</summary>

For multi-user scenarios with shared file storage (if backend deployment is approved):

1. **Start the Backend**
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   export SHARE_DIR=$(pwd)/data/hday_files  # Or point to network share
   uvicorn app.main:app --reload
   ```

2. **Start the Frontend**
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   # Ensure VITE_USE_BACKEND=true and VITE_API_BASE=http://localhost:8000
   npm run dev
   ```

3. Open [http://localhost:5173](http://localhost:5173), enter a username, click Load, edit, and Save

</details>

---

## 📋 The `.hday` File Format

The `.hday` format is a simple text-based format for tracking time off. Each line represents a single event or recurring pattern.

**Quick Example:**
```hday
2024/12/23-2025/01/05 # Christmas vacation
p2024/03/26-2024/03/26 # Half day PM off
b2024/06/10-2024/06/12 # Business trip
s2024/04/08-2024/04/08 # Training course
d1 # Every Monday off
```

**For complete format specification**, including all flags, color codes, and advanced features, see [docs/hday-format-spec.md](docs/hday-format-spec.md)

## 🏗️ Application Architecture

### Frontend ([frontend/](frontend/)) - **PRIMARY FOCUS**
React + Vite + TypeScript application featuring:
- **Dual Mode Support**: Toggle between standalone and backend modes via `VITE_USE_BACKEND` environment variable
- Month-based calendar view with color-coded events
- Event editor with validation and accessibility features
- User and team schedule views
- Direct `.hday` file save/load
- Comprehensive test coverage with Vitest

**Accessibility Features:**
- Robust focus trap in dialogs that filters disabled/hidden elements
- `:focus-visible` styling on interactive controls
- WCAG AA compliant color palette with black text (see [frontend/src/lib/hday.ts](frontend/src/lib/hday.ts))

**Testing:**
Run tests with `npm test` or `npm run test:ui` for the Vitest UI. Uses JSDOM environment for React component testing.

**Technical Implementation Notes:**
- Half-day logic uses XOR: both `half_am` and `half_pm` flags together are treated as full day
- Date validation prevents invalid ranges (end < start)
- Cross-browser month selection uses text input with pattern validation
- Toast notifications use CSS animations defined in [frontend/src/styles.css](frontend/src/styles.css)

---

### Backend ([backend/](backend/)) - **OPTIONAL / THEORETICAL**

**Note:** The backend is provided for reference but may not be deployable in corporate environments like ASML.

FastAPI + Python application providing:
- RESTful API for reading/writing `.hday` files
- Configurable shared directory support (network shares, SMB, NFS)
- Audit logging for compliance tracking
- Authentication stub (ready for Azure AD, Auth0, Keycloak)
- Microsoft Graph API sync placeholder for calendar integration

**API Endpoints:**
- `GET /api/hday/{user}` - Returns `{ raw, events[] }` for a user's `.hday` file
- `PUT /api/hday/{user}` - Writes `.hday` file from `events[]` array
- `GET /healthz` - Health check endpoint

**CORS Configuration:**
- Development (default): `http://localhost:5173`
- Production: Set `CORS_ORIGINS` environment variable to comma-separated list of allowed origins
- Example: `export CORS_ORIGINS="https://your-frontend.com,https://www.your-frontend.com"`
- Note: Wildcard (`*`) is blocked in production mode for security

**Audit Logging:**
Write operations are logged to `backend/data/audit.log` in NDJSON format:
```json
{"ts":"2025-12-19T20:10:00.123Z","user":"alice","target":"testuser.hday","action":"write","details":"Updated 2 events"}
```

---

## 🌐 Deployment (Recommended: Static Frontend)

### GitHub Pages / Netlify / Vercel (Standalone Mode)
**This is the recommended deployment approach** - works entirely client-side without backend infrastructure:

1. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```
2. Deploy the `frontend/dist/` directory to GitHub Pages, Netlify, Vercel, or any static hosting
3. The app works entirely client-side (no backend required)

Users can then open the web app, upload their `.hday` files, edit them, and download the updated files.

### Production Backend Deployment (Optional)

<details>
<summary>Click to expand backend deployment details (if backend is approved in your environment)</summary>

**Storage Configuration:**
- Mount your network share (SMB/NFS) containing `.hday` files to the backend container
- Set `SHARE_DIR` environment variable to the mount path
- Example: `SHARE_DIR=/mnt/shared/holiday_files`

**Authentication:**
- Replace [backend/app/auth/auth.py](backend/app/auth/auth.py) stub with proper JWT verification
- Supported providers: Azure AD, Auth0, Keycloak, or custom OAuth2/OIDC
- Use the `X-User` header approach for development only

**Calendar Integration (Optional):**
- Extend [backend/app/graph/sync.py](backend/app/graph/sync.py) with Microsoft Graph API or other calendar service
- Use keyword detection for automatic flag assignment (see format spec)

**Permissions:**
- Implement role-based access control in the auth module
- Allow self-edit for personal `.hday` files
- Add owner/admin roles for team/group files

**Docker Deployment:**
1. Build and run the backend container (see [backend/Dockerfile](backend/Dockerfile))
2. Build the frontend with `VITE_USE_BACKEND=true`
3. Serve frontend static files via nginx or similar
4. Configure backend to point to your `.hday` file storage (network share)

</details>

## 📁 Repository Structure

```
HdayPlanner/
├── README.md                  # This file
├── TODO.md                    # Project roadmap
├── docs/                      # Documentation
│   └── hday-format-spec.md   # Complete .hday format specification
├── examples/                  # Example files
│   ├── example-user.hday     # Sample .hday file with demo data
│   └── example-team-overview.html # Legacy team overview example
├── scripts/                   # Utility scripts
│   ├── analyze-hday-patterns.ps1  # PowerShell analysis tool
│   └── analyze-hday-patterns.sh   # Bash analysis tool
├── archive/                   # Previous versions
│   └── hday_viewer.html      # Earlier single-file HTML version
├── backend/                   # FastAPI backend (Python)
│   ├── app/                  # Application code
│   ├── Dockerfile            # Container deployment
│   └── requirements.txt      # Python dependencies
└── frontend/                  # React frontend (TypeScript)
    ├── src/                  # Source code
    ├── index.html            # Entry HTML
    ├── package.json          # Node dependencies
    └── vite.config.ts        # Vite configuration
```

## 🔍 Analysis Scripts

Two scripts in [scripts/](scripts/) help analyze existing `.hday` files and discover all flag patterns in use:

### PowerShell (Windows)
```powershell
.\scripts\analyze-hday-patterns.ps1 -Path "\\network\share\CUG_holiday"
.\scripts\analyze-hday-patterns.ps1 -Path "\\network\share\CUG_holiday" -MaxFiles 100
```

### Bash (Linux/Mac/WSL)
```bash
./scripts/analyze-hday-patterns.sh /mnt/share/CUG_holiday
./scripts/analyze-hday-patterns.sh /mnt/share/CUG_holiday 100
```

**What they do:**
- Scan all `.hday` files in a directory
- Extract and count unique prefix patterns (`p`, `a`, `pb`, `ip`, etc.)
- Calculate usage percentages
- Show examples of each pattern
- Identify unknown or rare flag combinations

This is useful for discovering all the ways flags are combined in your organization's `.hday` files.

---

## 🤝 Contributing

Contributions welcome! Areas of interest:
- Additional export formats (iCal, CSV, etc.)
- Mobile-responsive improvements
- Integration with other calendar systems
- Documentation improvements

## 📝 License

[Add your chosen license here]

## 🙏 Credits

Originally developed for ASML's internal holiday tracking system. This open-source version maintains compatibility with the `.hday` format while modernizing the user experience.
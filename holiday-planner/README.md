# Holiday Planner (Full-Stack Application)

This directory contains a **FastAPI backend** and a **React (Vite) frontend** to view/edit `.hday` files while maintaining compatibility with legacy holiday overview systems.

## Structure
```
holiday-planner/
  backend/   # FastAPI API (read/write .hday, audit, auth stub)
  frontend/  # React UI (list + month view + save)
```

## Local Dev
1. **Backend**
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   export SHARE_DIR=$(pwd)/data/hday_files
   uvicorn app.main:app --reload
   ```
2. **Frontend**
   ```bash
   cd ../frontend
   npm install
   cp .env.example .env  # ensure VITE_API_BASE points to backend
   npm run dev
   ```
3. Open the frontend (http://localhost:5173), enter a username (e.g., `testuser`), click Load, edit, and **Save .hday**.

## Production Deployment

**Storage:**
- Mount your network share (SMB/NFS) containing `.hday` files to the backend container
- Set `SHARE_DIR` environment variable to the mount path
- Example: `SHARE_DIR=/mnt/shared/holiday_files`

**Authentication:**
- Replace `app/auth/auth.py` stub with proper JWT verification (e.g., Azure AD, Auth0, Keycloak)
- Use the `X-User` header approach for development only

**Calendar Integration (Optional):**
- Extend `app/graph/sync.py` with Microsoft Graph API or other calendar service
- Use keyword detection for automatic flag assignment (see main README)

**Permissions:**
- Implement role-based access control
- Allow self-edit for personal files
- Add owner/admin roles for team/group files

## Compatibility
- `.hday` writer preserves the legacy format: prefix flags (`a`, `p`, `b`, `s`, `i`), date ranges, weekly `d0..6`, optional `# title`.
- Existing overview pages continue working since files and structure remain unchanged.

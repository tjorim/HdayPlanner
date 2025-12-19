# Holiday Planner Backend (FastAPI)

## Dev quickstart
```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scriptsctivate
pip install -r requirements.txt
export SHARE_DIR=$(pwd)/data/hday_files   # Windows: set SHARE_DIR=%cd%\data\hday_files
uvicorn app.main:app --reload
```

## Configuration

### CORS Origins
Configure allowed origins via the `CORS_ORIGINS` environment variable:

- **Development (default)**: `http://localhost:5173`
- **Production**: Set `CORS_ORIGINS` to a comma-separated list of allowed origins:
  ```bash
  export CORS_ORIGINS="https://your-frontend.com,https://www.your-frontend.com"
  ```
- **Local dev with wildcard** (not recommended): `export CORS_ORIGINS="*"`
  - Note: Wildcard (`*`) is blocked in production (when `ENVIRONMENT=production`)
  - `allow_credentials` is disabled when using wildcard

### API
- `GET /api/hday/{user}` → returns `{ raw, events[] }`
- `PUT /api/hday/{user}` → writes `.hday` from `events[]`
- `GET /healthz` → health check

### Network Share (production)
Mount your network share (SMB/NFS) containing `.hday` files to the container host and set `SHARE_DIR` to that mount path. The API preserves the `.hday` format for compatibility with existing overview pages.

### Auth
For dev, a simple `X-User` header identifies the editor. In prod, replace `app/auth/auth.py` with proper JWT validation (Azure AD, Auth0, etc.).

### Audit
Appends write events to `backend/app/data/audit.log`. Replace with DB-backed storage if preferred.

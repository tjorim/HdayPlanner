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
Write operations are appended to `backend/app/data/audit.log` in **NDJSON** (newline-delimited JSON) format:

```json
{"ts":"2025-12-19T20:10:00.123Z","user":"alice","target":"testuser.hday","action":"write","details":"Updated 2 events"}
{"ts":"2025-12-19T20:15:42.987Z","user":"bob","target":"jdoe.hday","action":"write","details":"Initial import"}
```

This format avoids corruption issues from tabs/newlines in free-text fields and is easy to stream/process. Replace with DB-backed storage if preferred.

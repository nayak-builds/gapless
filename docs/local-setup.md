# Local setup

## Frontend (scaffolded)

Requires Node 20.

```powershell
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Routes: `/`, `/signin`, `/dashboard`.

There is no backend or auth yet. Do not point this UI at production Supabase.

## Backend (scaffolded)

Requires Python 3.12. Use a **dev** Supabase project (not production).

```powershell
cd backend
python -m venv .venv
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

On Windows, if `Activate.ps1` fails with “running scripts is disabled”, the `Set-ExecutionPolicy` line above is required once per user. It only affects your account, not the whole machine.

If you prefer not to change policy, skip activation and call the venv directly:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\uvicorn.exe main:app --reload --host 127.0.0.1 --port 8000
```

Edit `backend/.env` with real values (this file must never be committed). Then:

```powershell
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

- [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health) — process is up (no database)
- [http://127.0.0.1:8000/health/db](http://127.0.0.1:8000/health/db) — `SELECT 1` against Supabase Postgres

CORS allows `http://localhost:3000`. There is no auth or application schema yet.

Never use production service-role keys on a laptop.

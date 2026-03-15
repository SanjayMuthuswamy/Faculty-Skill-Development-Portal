# Deploy with Vercel (Frontend) + Render (Backend)

## 1) Push code

```bash
git add .
git commit -m "Add Vercel + Render deployment config"
git push origin main
```

## 2) Deploy backend on Render

1. In Render, click **New +** -> **Blueprint**.
2. Connect your GitHub repo and select branch `main`.
3. Render will detect `render.yaml` and create:
- PostgreSQL database `fsdp-postgres`
- Web service `fsdp-backend`
4. Open the created web service and set these required env vars:
- `CORS_ORIGINS=["https://<your-vercel-domain>"]`
- `ALLOWED_HOSTS=["<your-render-backend-domain>"]`
5. Optional: set `OPENROUTER_API_KEY`, `NEWSDATA_API_KEY`, Sentry vars.

Notes:
- Backend health endpoint is `/api/v1/health`.
- Uploads are persisted with a Render disk mounted at `server/uploads`.

## 3) Deploy frontend on Vercel

1. In Vercel, click **Add New...** -> **Project**.
2. Import this repo.
3. Set **Root Directory** to `client`.
4. Framework preset: **Vite**.
5. Add environment variable:
- `VITE_API_BASE_URL=https://<your-render-backend-domain>`
6. Deploy.

## 4) Automatic updates on push

Yes, live app auto-updates after `git push` when auto-deploy is enabled:
- Vercel auto-deploys frontend from `main`
- Render auto-deploys backend from `main`

## 5) Post-deploy checks

1. Open `https://<backend>/api/v1/health` -> should return 200.
2. Open frontend URL and test login.
3. Verify admin/faculty routes load without CORS errors.

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1g10-gY3DDb8rSmmRjGS892u6qpA04bL8

## Run Locally

**Prerequisites:**  Node.js


1. Copy `.env.example` to `.env.local` and fill in `GEMINI_API_KEY`. Optionally set `VITE_API_URL` to your backend (defaults to `http://localhost:3000`).
2. Install dependencies:
   `npm install`
3. Run the app:
   `npm run dev`

## Backend (NestJS + PostgreSQL)

1. Create a PostgreSQL database and update `server/.env` based on `server/.env.example`.
2. Install backend dependencies and run the API server:
   ```bash
   cd server
   npm install
   npm run start:dev
   ```
   The server listens on `PORT` (default `3000`), exposes `GET /health` for quick checks, and automatically manages the `trips` table.
3. Verify the backend is up with `curl http://localhost:3000/health` and ensure it returns `{ "status": "ok" }`.
4. In the web app, set the API 서버 URL to your NestJS server (e.g., `http://localhost:3000`) from the 공유 모달 and start syncing trips.

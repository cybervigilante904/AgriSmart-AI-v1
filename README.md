<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# AgriSmart AI

AgriSmart AI is a React agricultural advisory frontend with an Express API backend.

## Project Structure

- `frontend/` - React, Vite, and Tailwind application
- `backend/` - Express API server and Gemini integration
- `shared/` - Data modules used by both frontend and backend
- `dist/` - Compiled backend server output

View your app in AI Studio: https://ai.studio/apps/2be8d937-ca36-4403-a903-41d960e208f4

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies: `npm install`
2. Configure `GEMINI_API_KEY` in your environment or `.env.local`.
3. Start the full-stack development server: `npm run dev`
4. Open `http://localhost:3000`.

## Production Build

Run `npm run build` to build the frontend into `frontend/dist` and bundle the backend into `dist/server.cjs`.

Run `npm start` to serve the production build.

## Frontend Deployment

For a frontend-only deployment, use `frontend` as the Netlify base directory and `dist` as the publish directory. API routes still require the backend server or a Netlify Functions migration.

## Render Deployment

Deploy the repository as a Web Service. Render can use the included `render.yaml`, or configure these values manually:

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Environment variable: `GEMINI_API_KEY`
- Environment variable: `NODE_ENV=production`

The service listens on Render's assigned `PORT` and serves both the frontend and API.

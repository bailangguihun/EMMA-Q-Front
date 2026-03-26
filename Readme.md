# The Brainwave Alpha Project

This directory is the frontend repository root for EMMA-Q.

Do not upload the parent `C:\The Brainwave Alpha Project` folder as-is. Only upload the UI files in this directory. The sibling `__MACOSX` directory is not part of the frontend repository.

## Purpose

- `welcome.html`: landing page
- `about.html`: project and API overview
- `preferences.html`: parameter tuning, file upload, generation, and evaluation
- `api-client.js`: browser API client
- `preferences.js`: form logic and result rendering
- `config.js`: runtime API defaults for local and production usage

## API contract used by the frontend

- `GET /api/health`
- `POST /api/preferences`
- `POST /api/pipeline/run`
- `POST /api/evaluate`

All responses should stay in JSON. The frontend never accepts or stores `DEEPSEEK_API_KEY`.

## Development and production API configuration

The frontend reads defaults from `config.js`.

```js
window.EMMAQ_RUNTIME_CONFIG = {
  apiBaseUrl: "",
  localApiBaseUrl: "http://127.0.0.1:8000/api",
  productionApiBaseUrl: "https://api.your-domain.com/api"
};
```

Rules:

1. If `apiBaseUrl` is set, the frontend uses it directly.
2. If `apiBaseUrl` is empty and the page is opened from `file://`, `localhost`, or `127.0.0.1`, the frontend uses `localApiBaseUrl`.
3. Otherwise it uses `productionApiBaseUrl`.

This keeps the frontend static and avoids introducing a build framework.

## Local development

1. Start the backend on `http://127.0.0.1:8000`.
2. Keep `config.js` as-is, or set `apiBaseUrl` explicitly.
3. Open `preferences.html` directly or serve this directory with any static file server.
4. Use the UI health check before running the pipeline.

## Cloudflare Pages deployment

Recommended settings:

- Framework preset: `None`
- Build command: leave empty
- Build output directory: `/`
- Root directory: repository root

Before production deployment, update `config.js` so `productionApiBaseUrl` points to the real backend, for example:

```js
productionApiBaseUrl: "https://api.your-domain.com/api"
```

## Files that should be committed

- `welcome.html`
- `about.html`
- `preferences.html`
- `styles.css`
- `app.js`
- `api-client.js`
- `preferences.js`
- `config.js`
- `favicon.ico`
- `.gitignore`
- `Readme.md`

## Files that should not be committed

- OS/editor junk such as `.DS_Store`, `Thumbs.db`, `.idea`, `.vscode`
- any local screenshots or temporary files created during testing

## Troubleshooting

- If the page opens from `file://`, the backend must allow browser CORS.
- If health check works but generation fails, verify the backend API base URL shown in the form.
- If generation succeeds but evaluation says "service not configured", set `DEEPSEEK_API_KEY` on the backend only.

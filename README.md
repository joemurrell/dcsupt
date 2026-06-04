# DCS UPT

DCS UPT is now a **data-driven training site** with an **admin CMS** for managing sections, learning paths, and content items from the frontend.

## What changed

- Added a Node/Express server with SQLite persistence.
- Added admin authentication with session-based access control.
- Added CMS entities:
  - Sections
  - Learning Paths
  - Content Items
  - Content Links
  - Audit Logs
- Converted phase pages (`/phases/*.html`) to render from API data.
- Added read-only fallback JSON on phase pages if API is unavailable.
- Added admin UI:
  - `/admin/login.html`
  - `/admin/index.html`

## Local development

```bash
cd /tmp/workspace/joemurrell/dcsupt
npm install
npm start
```

App runs on `http://localhost:3000` by default.

### Default admin login

Set your own in env vars for production.

- username: `admin`
- password: `admin123!`

## Environment variables

- `PORT` (default `3000`)
- `DATABASE_PATH` (default `./data/dcsupt.sqlite`)
- `SESSION_SECRET` (set a strong random value in production)
- `ADMIN_USERNAME` (default `admin`)
- `ADMIN_PASSWORD` (default `admin123!`, used only for first seed)

## Run tests

```bash
npm test
```

## Deployment

### Railway (recommended)

Railway is the best fit for this app because it needs server-side auth and a database.

1. Connect this repo to Railway.
2. Set environment variables (`SESSION_SECRET`, admin credentials).
3. Deploy with start command `npm start`.
4. Attach persistent volume or managed DB path for `DATABASE_PATH`.

### GitHub Pages

GitHub Pages can only host static files, so admin login + CMS write operations are not supported there by themselves.

You can still host static pages on GitHub Pages in read-only mode and point them to a separate backend API hosted on Railway.

## Content operations now supported

From the admin dashboard you can:

- Add/edit/delete sections and learning paths
- Add/edit/delete content items
- Move items between sections/paths
- Reorder items (drag and drop + save)
- Publish/unpublish content
- Add/edit/delete related links per item

## Notes

- This repository remains framework-light and keeps the original site design.
- Existing phase URLs are preserved.

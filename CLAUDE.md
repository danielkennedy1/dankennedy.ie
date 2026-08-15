# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Personal portfolio website (dankennedy.ie) — a static single-page site served via nginx in a Docker container.

## Architecture

- `index.html` — main page; sections start `visibility: hidden` and are revealed via JS animations
- `main.js` — orchestrates all entrance animations (canvas dot effect, name wipe reveal)
- `nozzle/` — rocket nozzle subpage (`index.html` + `nozzle.js` with Three.js 3D scene)
- `examsearch/` — examsearch project description subpage
- `public/` — static assets served as-is (images, favicons, webmanifest, CSVs, pre-compiled CSS)
  - `public/style.css` — **pre-compiled** Tailwind CSS v3.2.7. Edit directly when adding new utility classes.
  - `html/tailwind.config.js` — config reference for Tailwind regeneration
- `package.json` — Vite (dev), three, urdf-loader
- `vite.config.js` — multi-page Rollup input config
- `Dockerfile` — multi-stage: node build → nginx serve from `dist/`
- `.github/workflows/build.yaml` — CI/CD pipeline triggered on push to `main`

## CI/CD Pipeline

Pushes to `main` (excluding `bump:` commits) trigger:
1. Commitizen version bump + CHANGELOG update (committed back to the branch)
2. Docker image built and tagged with the new semver + `latest`
3. Image pushed to GHCR (`ghcr.io/<repo>`)

## Commits

This repo uses **Conventional Commits** enforced by Commitizen (`cz_conventional_commits`). Always use conventional commit format: `feat:`, `fix:`, `chore:`, etc.

## Local Development

```bash
npm install
npm run dev      # Vite dev server at http://localhost:5173
npm run build    # outputs to dist/
npm run preview  # preview dist/ locally
```

To preview via Docker (mirrors production):

```bash
docker build -t dankennedy-ie .
docker run -p 8080:80 dankennedy-ie
# Open http://localhost:8080
```

To update Tailwind CSS (if adding new utility classes not already in `public/style.css`), regenerate it with:

```bash
npx tailwindcss -i input.css -o public/style.css --config html/tailwind.config.js
```

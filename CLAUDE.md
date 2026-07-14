# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Personal portfolio website (dankennedy.ie) — a static single-page site served via nginx in a Docker container.

## Architecture

- `html/` — all static assets served by nginx
  - `index.html` — single-page layout; sections start `visibility: hidden` and are revealed via JS animations
  - `main.js` — orchestrates all entrance animations (typewriter effect on name, then sequential fade-ins for sections, contact buttons, and tech icons)
  - `style.css` — **pre-compiled** Tailwind CSS v3.2.7 (checked into the repo; not generated at runtime). Edit this file directly when adding new Tailwind utility classes.
  - `tailwind.config.js` — config reference; uses `tailwindcss-animated` plugin for animation utilities
- `Dockerfile` — copies `html/` into `nginx:alpine` image, exposes port 80
- `.github/workflows/build.yaml` — CI/CD pipeline triggered on push to `main`

## CI/CD Pipeline

Pushes to `main` (excluding `bump:` commits) trigger:
1. Commitizen version bump + CHANGELOG update (committed back to the branch)
2. Docker image built and tagged with the new semver + `latest`
3. Image pushed to GHCR (`ghcr.io/<repo>`)

## Commits

This repo uses **Conventional Commits** enforced by Commitizen (`cz_conventional_commits`). Always use conventional commit format: `feat:`, `fix:`, `chore:`, etc.

## Local Development

To preview the site locally with Docker:

```bash
docker build -t dankennedy-ie .
docker run -p 8080:80 dankennedy-ie
# Open http://localhost:8080
```

To update Tailwind CSS (if adding new utility classes not already in `style.css`), regenerate it with:

```bash
npx tailwindcss -i input.css -o html/style.css --config html/tailwind.config.js
```

There is no package.json in this repo — Tailwind can be run via `npx` without a local install.

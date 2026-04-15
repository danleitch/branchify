# Branchify

Branchify is a lightweight static React + TypeScript utility for generating clean, consistent Git branch names in seconds.

## Features

- Fast branch name generation with simple inputs
- Supports optional ticket numbers while keeping the final branch visible
- Generates PR titles like `feat/BRF-123: Description.`
- Copies the generated branch name and full `git checkout -b` command
- Persists your latest values and recent branches in `localStorage`
- Fully static frontend output (`dist/`) with no backend runtime
- Mobile-friendly, minimal UI

## Tech Stack

- [Vite](https://vite.dev/) (build + dev server)
- React + TypeScript
- Nginx for static Docker hosting

## Local Development

```bash
npm install
npm run dev
```

Then open the local URL shown by Vite (typically `http://localhost:5173`).

## Production Build

```bash
npm run build
```

The static site is written to `dist/`.

## Docker (Static Hosting)

### Build image

```bash
docker build -t branchify:latest .
```

### Run container

```bash
docker run --rm -p 8080:80 branchify:latest
```

App will be available at `http://localhost:8080`.

## Docker Compose (Homelab Friendly)

```bash
docker compose up -d --build
```

This starts one service:

- `branchify` (serves the static app on internal container port `80`)

The included Nginx config supports SPA route refresh via `try_files ... /index.html`.

## GitHub Actions to Docker Hub

The workflow at `.github/workflows/docker-publish.yml` will:

- build the Docker image for pull requests targeting `main`
- build and push the image to Docker Hub on pushes to `main`
- publish `latest` for the default branch and `sha-*` tags for traceability

Add these repository secrets in GitHub before enabling the publish step:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

Optional repository variable:

- `DOCKERHUB_REPOSITORY` to publish to an explicit image path such as `blades/branchify`

The published image name defaults to:

```text
<DOCKERHUB_USERNAME>/branchify
```

If `DOCKERHUB_REPOSITORY` is set, it overrides the default and publishes to that exact Docker Hub repository.

Pull request builds do not push to Docker Hub. They build against a local fallback image name so the workflow still validates successfully when secrets are unavailable.

## Notes

- This is now a **fully static app**: no backend, no runtime Node server.
- The Docker image uses multi-stage builds: Node for compile, Nginx for serving.
- Intended to sit cleanly behind an existing reverse proxy in a homelab setup.

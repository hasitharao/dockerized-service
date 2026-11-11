# Dockerized Node.js service, deployed with GitHub Actions

A small Express service that is containerized with Docker and deployed to a remote Linux server by a GitHub Actions workflow. Built for the roadmap.sh "Dockerized Service" project.

## Routes

| Route | Auth | Response |
|---|---|---|
| `/` | none | `Hello, world!` |
| `/secret` | HTTP Basic Auth | the value of `SECRET_MESSAGE`, or `401` |
| `/healthz` | none | `ok` (the deploy uses it to verify the new container) |

Config comes from three environment variables: `SECRET_MESSAGE`, `USERNAME` and `PASSWORD`. The service exits at startup if any is missing, and credentials are compared in constant time.

## How it deploys

```
git push to main
  -> GitHub Actions builds a multi-arch image (amd64 + arm64) and pushes it to GHCR
  -> the deploy job joins a private Tailscale network and SSHes to the server
  -> the server gets a .env written from GitHub secrets, pulls the image,
     replaces the container and checks /healthz
```

Images are tagged with the commit SHA (and `latest`), so every deploy is traceable and rollbacks are a re-run.

## The server

The target is an Ubuntu 24.04 VM (Multipass) running on my Mac, reachable only through Tailscale. I chose this to avoid paying for a cloud server or giving a card. The pipeline is the same for any VPS: point `SSH_HOST` at it and remove the Tailscale step.

Server setup: Docker installed, a non-root `deploy` user in the `docker` group, and a dedicated CI public key in its `authorized_keys`.

## Secrets (GitHub Environment `production`)

| Secret | Purpose |
|---|---|
| `SSH_HOST`, `SSH_USER` | where to deploy |
| `SSH_PRIVATE_KEY` | dedicated CI key for the `deploy` user |
| `SSH_KNOWN_HOSTS` | pinned server host key, so CI refuses an impostor |
| `TS_AUTHKEY` | ephemeral Tailscale auth key so the runner can reach the server |
| `SECRET_MESSAGE`, `USERNAME`, `PASSWORD` | runtime config for the app |

Auth keys expire (90 days at most). When a deploy fails at "Join the tailnet", create a new key and update `TS_AUTHKEY`.

## Run it locally

```bash
cp .env.example .env     # edit the values, without quotes
npm ci && node server.js

docker build -t dockerized-service .
docker run --rm -p 3000:3000 --env-file .env dockerized-service
```

Check the image has no secrets in it:

```bash
docker run --rm --entrypoint sh dockerized-service -c 'ls -a /app'
```

## Security notes

- `.env` is in both `.gitignore` and `.dockerignore`, and the Dockerfile copies only `server.js`. Secrets are injected at runtime and never baked into an image.
- The container runs as the non-root `node` user.
- The registry login on the server uses the job's short-lived `GITHUB_TOKEN`, and it logs out afterwards.
- Secrets are scoped to a GitHub Environment instead of the whole repository.
- Basic Auth over plain HTTP is only acceptable here because traffic stays inside the encrypted tailnet. On a public server, put TLS in front (for example Caddy).

Project page:   printf '\nProject page: %s\n' "$(pbpaste)" >> README.md
  git add README.md && git commit -m "Link roadmap.sh project page [skip ci]" && git push

## Project page

https://roadmap.sh/projects/dockerized-service-deployment

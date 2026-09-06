# Node Devcontainer Documentation

This devcontainer provides the Node/TypeScript development environment for the `gcp-demos` workspace. It is defined via `docker-compose.yml` + `Dockerfile` and is intended to be used with VS Code Dev Containers (or any devcontainer-compatible tool).

## Containers

Two services are defined in [docker-compose.yml](docker-compose.yml):

### `devcontainer`

The main development environment that VS Code attaches to (`service: devcontainer` in [devcontainer.json](devcontainer.json)).

- Built from the local [Dockerfile](Dockerfile) (base image `mcr.microsoft.com/devcontainers/typescript-node:20`)
- Runs `sleep infinity` to stay alive as an attachable container
- Volumes mounted:
  - `../../..:/workspaces` — the repo/workspace folder
  - `~/.ssh:/home/node/.ssh` — host SSH keys
  - `~/.gcp:/var/secrets` — GCP credentials
  - SSH agent socket bind mount (`${SSH_AUTH_SOCK}` → `/ssh-agent.sock`)

### `grafana`

An observability sidecar for local telemetry.

- Image: `grafana/otel-lgtm:0.24.1` (bundles Grafana + the OTel LGTM stack: Loki, Grafana, Tempo, Mimir)
- Ports exposed:
  - `3000` — Grafana UI
  - `4317` — OTLP gRPC receiver
  - `4318` — OTLP HTTP receiver
- Data persisted in the `otel-lgtm-data` volume
- Default admin credentials: `admin` / `admin`

## Environment Variables

Injected into the `devcontainer` service defined in `docker-compose.yml`:

| Variable                         | Description                                                   |
| -------------------------------- | ------------------------------------------------------------- |
| `SSH_AUTH_SOCK`                  | Path to the forwarded SSH agent socket (`/ssh-agent.sock`)    |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to the GCP service account key file under `/var/secrets` |
| `PROJECT_ID`                     | GCP project ID                                                |
| `PULUMI_ACCESS_TOKEN`            | Pulumi Cloud access token                                     |

## Tools Installed

### Util

`Node.js 20`, `TypeScript`, `npm`, `zsh`, `curl`, `bash`, `git`, `openssh-client`, `apache2-utils`

### CLI Tools

`pulumi`, `gcloud`, `nx`, `docker`, `claude`

## Post-Create Setup Script

- Authenticates `gcloud` using the service account key (`GOOGLE_APPLICATION_CREDENTIALS`)
- Sets the active `gcloud` project (`PROJECT_ID`)
- Runs `npm install` if `node_modules` is not already present

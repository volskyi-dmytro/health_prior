# Infrastructure and Deployment — HealthPrior

**Audience:** DevOps engineers, platform engineers, or technical interviewers asking "how do you deploy this?" and "how would you scale it?"

---

## 1. Production Stack Overview

HealthPrior runs on a single Ubuntu VPS (OVH) behind Cloudflare's CDN/proxy layer. The full request path is:

```
Browser → Cloudflare (CDN, DDoS protection, HTTPS enforcement)
        → Nginx reverse proxy (host: healthprior.volskyi-dmytro.com)
        → Docker containers (bridge network on the VPS)
```

Cloudflare terminates the public TLS connection and forwards traffic to Nginx over HTTPS using a Cloudflare Origin Certificate. Nginx then routes to containers over localhost. All five application containers run under Docker Compose from `/opt/healthprior/docker-compose.prod.yml`, with PostgreSQL data persisted to a named Docker volume (`postgres_data`).

The live demo is at `https://healthprior.volskyi-dmytro.com`.

---

## 2. Container Architecture

All containers use `restart: unless-stopped` and have explicit Docker healthchecks. The compose file is `docker-compose.prod.yml`; images are pulled from Docker Hub rather than built on the VPS.

### backend (`stpunk47/healthprior-backend`)

- **Port:** `8100:8000` — FastAPI served by uvicorn on container port 8000
- **Healthcheck:** `curl -f http://localhost:8000/health` every 30s, 3 retries, 40s start period
- **depends_on:** `postgres` (condition: `service_healthy`)
- **Key env vars:** `DATABASE_URL`, `OPENROUTER_API_KEY`, `PAYER_AGENT_URL=http://payer-agent:8200`, `SESSION_SECRET_KEY`, `ADMIN_GITHUB_EMAIL`, `GITHUB_OAUTH_CLIENT_ID/SECRET`, `ENABLE_PDF_EXPORT`

### mcp-server (`stpunk47/healthprior-backend`)

The MCP server reuses the backend image — no separate Dockerfile. The entrypoint is overridden:

```yaml
command: python -m app.mcp_server.server
```

- **Port:** `8001:8001`
- **Healthcheck:** `curl -f http://localhost:8001/health` every 30s
- **Key env vars:** same image, same `.env` file — `OPENROUTER_API_KEY` is needed for ICD-10 lookups

### frontend (`stpunk47/healthprior-frontend`)

- **Port:** `3100:80` — Nginx serves the compiled React SPA
- **Healthcheck:** wget to `/health` (built into the frontend Nginx config) every 30s
- **No runtime env vars** — `VITE_API_URL` is baked in at build time; in production it defaults to same-origin, so the browser hits `/api/` which Nginx proxies to the backend

### payer-agent (`stpunk47/healthprior-payer-agent`)

- **Port:** `8200:8200` — A2A agent server
- **Healthcheck:** `curl -f http://localhost:8200/.well-known/agent.json` every 30s, 3 retries, 40s start period
- **Volume:** `payer_data:/data` (task store persistence)
- **Key env vars:** `OPENROUTER_API_KEY`

### postgres (`postgres:16-alpine`)

- **Port:** not exposed externally in prod — internal only
- **Healthcheck:** `pg_isready -U ${POSTGRES_USER:-healthprior}` every 5s, 5 retries
- **Volume:** `postgres_data:/var/lib/postgresql/data`
- **Key env vars:** `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` (from `.env` on VPS)

---

## 3. CI/CD Pipeline

The pipeline lives in `.github/workflows/deploy.yml` and runs on every push to `main`. Pull requests only trigger the `test` job. It has three sequential stages:

### Stage 1 — test

Runs `pytest tests/ -v` against the `backend/` directory using Python 3.12. A `postgres:16-alpine` service container is spun up automatically by GitHub Actions and wired to the test runner via `DATABASE_URL=postgresql+asyncpg://healthprior:testpass@localhost:5432/healthprior_test`.

The `TESTING=true` flag skips database initialization (table creation) so tests run against the freshly created schema. LLM calls are not made during tests — `OPENROUTER_API_KEY` is set to a dummy value.

### Stage 2 — build

Only runs on `main` branch pushes (skipped on PRs). Uses Docker Buildx with GitHub Actions cache (`type=gha`) to build three images in sequence and push to Docker Hub:

- `stpunk47/healthprior-backend`
- `stpunk47/healthprior-frontend`
- `stpunk47/healthprior-payer-agent`

Each image is tagged with both a short SHA (`sha-abc1234`) and `latest`. The short SHA tag is passed as an output to the deploy stage so the VPS pulls the exact image built in this run, not an unrelated `latest`.

### Stage 3 — deploy

SSH into the VPS via `appleboy/ssh-action`. The deploy script:

1. SCPs `docker-compose.prod.yml` to `/opt/healthprior/`
2. Explicitly pulls the three tagged images (`docker pull stpunk47/healthprior-backend:sha-abc1234`, etc.)
3. Patches the `IMAGE_TAG` variable in `/opt/healthprior/.env` via `sed`
4. Runs `docker compose -f docker-compose.prod.yml up -d --remove-orphans`
5. Validates and reloads Nginx: `sudo nginx -t && sudo nginx -s reload`
6. Polls health endpoints in a loop — up to 30 attempts for the backend (`http://localhost:8100/health`), 20 for the MCP server (`http://localhost:8001/health`), and 20 for the payer agent (`http://localhost:8200/.well-known/agent.json`) — sleeping 3 seconds between each attempt

### GitHub Secrets Required

| Secret | Purpose |
|---|---|
| `DOCKER_USERNAME` | Docker Hub login for image push |
| `DOCKER_PASSWORD` | Docker Hub password |
| `VPS_SSH_KEY` | Private SSH key for VPS access |
| `VPS_HOST` | VPS IP address |
| `VPS_USER` | SSH username on the VPS |
| `OPENROUTER_API_KEY` | LLM API key injected into production `.env` |
| `DATABASE_URL` | Production PostgreSQL connection string |

---

## 4. Networking and TLS

### Cloudflare layer

All DNS for `volskyi-dmytro.com` is proxied through Cloudflare. Public clients connect to Cloudflare's edge nodes, which handle DDoS protection, HTTP→HTTPS redirection, and TLS termination. The VPS IP is never exposed directly.

### Cloudflare Origin Certificate

The origin certificate — valid from 2026-03-07 to 2041-03-03 — is a 15-year Cloudflare Origin CA cert, not a Let's Encrypt cert. It is stored on the VPS at:

```
/etc/ssl/cloudflare/volskyi-dmytro.com.pem
/etc/ssl/cloudflare/volskyi-dmytro.com.key
```

This cert is only trusted by Cloudflare, not by public browsers. That is intentional: because all traffic flows through Cloudflare first, browsers only need to trust Cloudflare's edge cert. Direct requests to the VPS IP over HTTPS would show a cert warning.

### Nginx configuration (`nginx/healthprior.conf`)

```nginx
server {
    listen 80;
    server_name healthprior.volskyi-dmytro.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    ssl_certificate     /etc/ssl/cloudflare/volskyi-dmytro.com.pem;
    ssl_certificate_key /etc/ssl/cloudflare/volskyi-dmytro.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-Content-Type-Options nosniff always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location /api/ { proxy_pass http://127.0.0.1:8100/; proxy_read_timeout 120s; }
    location /mcp/ { proxy_pass http://127.0.0.1:8001/; proxy_read_timeout 60s;  }
    location /     { proxy_pass http://127.0.0.1:3100/; }
}
```

The `/api/` prefix is stripped before forwarding — `POST /api/notes/structure` arrives at the backend as `POST /notes/structure`. The 120-second `proxy_read_timeout` on `/api/` accommodates LLM calls, which can take 15–30 seconds.

### Note on deployed config vs. repo config

The repo's `nginx/healthprior.conf` has an explicit HTTP→HTTPS `return 301` redirect block. The deployed VPS config was observed to combine both ports in a single server block without the redirect directive. This is not a security issue — Cloudflare's "Always Use HTTPS" setting handles the redirect at the CDN edge — but it is a discrepancy between the repo and the live server.

### Internal Docker networking

Containers communicate by service name over Docker's default bridge network. For example, the backend reaches the payer agent at `http://payer-agent:8200` and the MCP server at `http://mcp-server:8001`. PostgreSQL is not port-exposed to the host in the prod compose file; only the application containers communicate with it.

**Exposed host ports:**

| Port | Service |
|---|---|
| 3100 | Frontend (React SPA via Nginx) |
| 8100 | Backend (FastAPI) |
| 8001 | MCP server |
| 8200 | Payer agent (A2A) |

---

## 5. Database

PostgreSQL 16 Alpine runs as the `healthprior-postgres` container. The application uses async SQLAlchemy with the `asyncpg` driver. Connection string format: `postgresql+asyncpg://user:pass@host/dbname`.

**Schema (three tables):**

- `prior_auth_submissions` — UUID primary key, `raw_note` text, `fhir_bundle` JSONB, `coverage_result` JSONB, `prior_auth_package` JSONB, `decision` varchar, `created_at` timestamp
- `audit_log` — one row per LLM call; columns: `session_id` UUID, `model` varchar, `prompt_tokens` / `completion_tokens` int, `latency_ms` int, `mcp_tools_called` JSONB, `created_at` timestamp
- `policies` — payer policy criteria seeded at startup from `backend/app/data/mcr_621_criteria.json`

Data is persisted to the `postgres_data` named Docker volume (`/var/lib/postgresql/data`). The volume survives `docker compose down` and container restarts. It is destroyed only with `docker compose down -v`.

`TESTING=true` in the environment skips the DB initialization block on startup, which allows pytest to run without needing Alembic migrations applied.

---

## 6. Environment Variables and Secrets Management

**Local development:** Copy `.env.example` to `.env` and fill in `OPENROUTER_API_KEY`. The `.env` file is gitignored and never committed.

**CI/CD:** All secrets are stored in GitHub repository secrets and injected as environment variables during the Actions run. The deploy job writes `IMAGE_TAG` into the VPS `.env` file at deploy time.

**Production:** The VPS has `/opt/healthprior/.env` with all runtime secrets. `docker-compose.prod.yml` uses `env_file: .env` for the backend and payer agent services. No secrets are baked into Docker images — images are built without any API keys or credentials.

---

## 7. Current Limitations and Production Hardening Recommendations

This is an honest assessment of what the current deployment lacks for true production use in a healthcare context.

### What the prototype does not have

**High availability.** There is a single VPS with no failover. If the host goes down, the service is unavailable. Docker's `restart: unless-stopped` handles container crashes but not host-level failures.

**Stateful task store.** The payer agent stores A2A tasks in memory (a Python dict). If the `healthprior-payer-agent` container restarts mid-evaluation, all in-flight tasks are lost. The `payer_data` volume is mounted but the current implementation does not write task state to disk.

**No Redis.** Session tokens, task queues, and LLM response caching all happen in-process. Under concurrent load, multiple backend workers (if scaled horizontally) would have inconsistent session state.

**No rate limiting.** The Nginx config and FastAPI application have no request rate limiting. A single client could saturate the LLM API quota.

**No structured observability.** Logs go to stdout and are only accessible via `docker logs`. There is no log aggregation (e.g., Loki), no metrics collection (Prometheus/Grafana), and no distributed tracing. The `audit_log` table provides per-submission LLM telemetry but nothing for infrastructure-level health.

**PostgreSQL is not replicated.** A single Postgres container with a local volume. No read replicas, no automated backups, no point-in-time recovery.

**No Kubernetes or auto-scaling.** The current stack is a fixed five-container deployment. There is no mechanism to scale the backend or payer agent horizontally under load.

### What a production-ready version would look like

| Concern | Current | Production target |
|---|---|---|
| Compute | Single VPS | Kubernetes cluster (EKS/GKE), or managed container service (AWS ECS Fargate) |
| Database | Single Postgres container | Amazon RDS PostgreSQL with Multi-AZ failover and automated daily snapshots |
| Task queue | In-memory dict | Redis (ElastiCache) with task state persisted and TTL-based expiry |
| Secrets | `.env` file on VPS | AWS Secrets Manager or HashiCorp Vault; secrets injected at runtime, never on disk |
| TLS renewal | Manual Cloudflare origin cert | cert-manager (Kubernetes) or AWS ACM auto-renewal |
| Observability | `docker logs` | OpenTelemetry SDK in FastAPI → Grafana/Datadog; structured JSON logs; alerting on error rate and LLM latency |
| Rate limiting | None | NGINX rate limiting directives or an API gateway (AWS API Gateway, Kong) per-IP and per-session |
| CI/CD | Direct SSH deploy | Blue/green or rolling deployment via Kubernetes Deployments; health gate before traffic cutover |
| HIPAA compliance | Not applicable (prototype) | Business Associate Agreement with all vendors, encryption at rest (RDS encrypted volumes), VPC with private subnets, audit logging to CloudTrail |

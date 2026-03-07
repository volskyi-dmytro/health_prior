# HealthPrior — Clinical AI Prior Authorization

HealthPrior is a prototype AI system for clinical note structuring and prior authorization automation. It uses LLMs via OpenRouter to parse unstructured clinical notes into FHIR-compatible structured data and generate prior authorization requests.

## Architecture

```mermaid
graph TD
    User[Browser] --> CF[Cloudflare CDN/Proxy]
    CF --> Nginx[Nginx Reverse Proxy]
    Nginx --> FE[React Frontend :3100]
    Nginx --> BE[FastAPI Backend :8100]
    BE --> MCP[MCP HTTP Server :8001]
    BE --> PG[PostgreSQL]
    BE --> OR[OpenRouter LLM API]
    MCP --> BE
```

## Live Demo

https://healthprior.volskyi-dmytro.com

## Local Setup

```bash
cp .env.example .env
# Fill in your API keys in .env
docker compose up --build
```

- Frontend: http://localhost:3100
- Backend API: http://localhost:8100
- API Docs: http://localhost:8100/docs

## Testing

```bash
cd backend && pytest tests/ -v
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| POST | /notes/parse | Parse clinical note into structured FHIR data |
| POST | /notes/structure | Structure note with ICD-10/CPT codes |
| GET | /coverage/{patient_id} | Check insurance coverage |
| POST | /prior-auth/generate | Generate prior auth request |
| GET | /prior-auth/{id}/status | Check prior auth status |

## MCP Server Tools

The MCP HTTP server (port 8001) exposes the following tools for AI agent use:

- `parse_clinical_note` — Extract structured data from free-text clinical notes
- `check_coverage` — Verify patient insurance coverage for a procedure
- `generate_prior_auth` — Generate a prior authorization request document
- `get_icd10_codes` — Map diagnoses to ICD-10 codes
- `get_cpt_codes` — Map procedures to CPT codes

## GitHub Secrets Required

| Secret | Description |
|--------|-------------|
| DOCKER_USERNAME | Docker Hub username |
| DOCKER_PASSWORD | Docker Hub password |
| VPS_SSH_KEY | Private SSH key for VPS deployment |
| VPS_HOST | VPS IP address |
| VPS_USER | VPS SSH username |
| OPENROUTER_API_KEY | OpenRouter API key for LLM access |
| OPENAI_API_KEY | OpenAI API key (fallback) |
| DATABASE_URL | Production PostgreSQL connection string |

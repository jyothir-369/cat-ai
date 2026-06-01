# CAT AI

**Production-grade AI assistant and automation platform.**
Conversational AI · Workflow Automation · RAG Knowledge Base · Multi-Tenant SaaS

---

## What is CAT AI?

CAT AI is a self-hostable AI platform that unifies chat, knowledge retrieval, and workflow automation in a single multi-tenant SaaS product. It routes queries across OpenAI, Anthropic, Groq, and Gemini, runs durable multi-step AI workflows, and lets teams build shared knowledge bases with cited RAG responses — all under one roof.

---

## Features

| Capability | Detail |
|---|---|
| **Multi-model chat** | Stream responses from OpenAI, Anthropic, Groq, or Gemini. Switch models per conversation. |
| **RAG knowledge base** | Upload PDF, DOCX, TXT, CSV. Hybrid vector + BM25 retrieval. Source citations in every answer. |
| **Workflow automation** | Build trigger-based DAG workflows with LLM, condition, API call, approval, and loop steps. |
| **Long-term memory** | Extract and recall user facts across sessions using pgvector semantic search. |
| **Multi-tenant workspaces** | Full RBAC (owner / admin / member / viewer). Every query is workspace-scoped. |
| **Integrations** | OAuth connectors for Slack, Gmail, Notion, Google Sheets, GitHub, and more. |
| **Billing** | Stripe Checkout, Customer Portal, and webhook-driven subscription sync. |
| **Audit logging** | Immutable audit trail for all auth events, mutations, and billing actions. |

---

## Tech Stack

**Backend** — FastAPI · Python 3.12 · SQLAlchemy 2.0 (async) · Alembic · Celery + Redis · Pydantic v2

**Frontend** — Next.js 14 App Router · TypeScript · Tailwind CSS · shadcn/ui · Zustand · TanStack Query

**Database** — PostgreSQL 16 · pgvector (embeddings) · Redis 7 (cache / queue)

**Storage** — AWS S3

**Infra** — Docker · ECS Fargate · GitHub Actions CI/CD · Terraform

---

## Project Structure

```
cat-ai/
├── apps/
│   ├── api/                        # FastAPI backend (this repo)
│   │   ├── main.py                 # App factory, middleware, lifespan
│   │   ├── api/v1/                 # Routers (one file per domain)
│   │   │   ├── auth.py
│   │   │   ├── chat.py
│   │   │   ├── conversations.py
│   │   │   ├── files.py
│   │   │   ├── knowledge.py
│   │   │   ├── workflows.py
│   │   │   ├── integrations.py
│   │   │   ├── webhooks.py
│   │   │   ├── usage.py
│   │   │   ├── billing.py
│   │   │   └── admin.py
│   │   ├── services/               # Business logic (no HTTP concerns)
│   │   │   └── billing_service.py
│   │   ├── db/
│   │   │   ├── models/             # SQLAlchemy ORM models
│   │   │   │   ├── user.py         # users · organizations · memberships · sessions
│   │   │   │   ├── conversation.py # conversations · messages · tool_calls
│   │   │   │   ├── knowledge.py    # files · knowledge_bases · documents · chunks
│   │   │   │   ├── memory.py       # long-term memory (pgvector)
│   │   │   │   ├── workflow.py     # workflows · runs · step_runs · webhook_events
│   │   │   │   ├── billing.py      # subscriptions · invoices · usage_logs
│   │   │   │   ├── audit.py        # audit_logs · notifications
│   │   │   │   └── integrations.py # OAuth connections
│   │   │   ├── repos/              # Repository pattern — all raw queries
│   │   │   ├── session.py          # Async engine + session factory + Base
│   │   │   └── migrations/         # Alembic revision scripts
│   │   ├── middleware/
│   │   │   ├── logging.py          # Correlation ID · structured request logs
│   │   │   └── rate_limit.py       # Redis sliding-window rate limiter
│   │   └── core/
│   │       ├── config.py           # Pydantic Settings (reads .env)
│   │       ├── exceptions.py       # AppError hierarchy + HTTP status codes
│   │       ├── security.py         # JWT · bcrypt · HMAC
│   │       └── deps.py             # FastAPI dependency injectors
│   ├── web/                        # Next.js frontend
│   └── worker/                     # Celery workers (ingestion, memory, workflows)
├── infra/
│   ├── terraform/                  # AWS IaC (ECS · RDS · ElastiCache · S3)
│   └── docker/                     # Dockerfiles + docker-compose.yml
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/                        # Playwright
```

---

## Quick Start

### Prerequisites

- Python 3.12+
- PostgreSQL 16 with the `pgvector` extension
- Redis 7
- Node.js 20+ (frontend only)

### 1. Clone and install

```bash
git clone https://github.com/your-org/cat-ai.git
cd cat-ai/apps/api

python -m venv .venv
source .venv/bin/activate

pip install fastapi uvicorn sqlalchemy asyncpg alembic redis celery \
            pydantic-settings python-jose bcrypt bcrypt stripe \
            "pydantic[email]" structlog sentry-sdk
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values (see [Environment Variables](#environment-variables) below).

### 3. Start local services

```bash
# PostgreSQL + Redis via Docker
docker-compose -f infra/docker/docker-compose.yml up -d postgres redis
```

### 4. Run database migrations

```bash
alembic upgrade head
```

### 5. Start the API

```bash
# Development (auto-reload, debug mode)
DEBUG=true uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Production
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

API is live at `http://localhost:8000`
Interactive docs at `http://localhost:8000/docs` (debug mode only)

---

## Environment Variables

All variables are read from `.env` via Pydantic Settings. Copy `.env.example` and fill in your values.

### Required

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL async URL — `postgresql+asyncpg://user:pass@host:5432/catai` |
| `REDIS_URL` | Redis URL — `redis://localhost:6379/0` |
| `JWT_SECRET` | Random 256-bit secret for signing JWTs (min 32 chars) |

### AI Providers (at least one required)

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | OpenAI API key |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `GROQ_API_KEY` | Groq API key (fast / cheap inference) |
| `GEMINI_API_KEY` | Google Gemini API key |

### Billing (required for paid plans)

| Variable | Description |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_live_…` or `sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_…`) |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (sent to frontend) |
| `STRIPE_PRO_PRICE_ID` | Stripe Price ID for the Pro plan |
| `STRIPE_TEAM_PRICE_ID` | Stripe Price ID for the Team plan |

### Storage

| Variable | Description |
|---|---|
| `AWS_REGION` | AWS region (default: `us-east-1`) |
| `AWS_S3_BUCKET` | S3 bucket name for file uploads |
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |

### App

| Variable | Default | Description |
|---|---|---|
| `DEBUG` | `false` | Enables `/docs`, auto-create tables, verbose logging |
| `ENVIRONMENT` | `production` | `development` / `staging` / `production` |
| `FRONTEND_URL` | `http://localhost:3000` | Used for CORS and Stripe redirect URLs |

---

## API Reference

All routes are under `/api/v1`. Authentication uses `Authorization: Bearer <token>`.

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Register a new user |
| `POST` | `/api/v1/auth/login` | Login — returns JWT + sets refresh cookie |
| `POST` | `/api/v1/auth/refresh` | Refresh access token via HttpOnly cookie |
| `GET` | `/api/v1/auth/me` | Current user profile |
| `POST` | `/api/v1/auth/logout` | Revoke session, clear cookie |

### Chat

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/chat/stream` | SSE streaming chat (main AI endpoint) |

### Conversations

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/conversations` | List conversations (paginated) |
| `POST` | `/api/v1/conversations` | Create a new conversation |
| `GET` | `/api/v1/conversations/{id}/messages` | Get message history |
| `DELETE` | `/api/v1/conversations/{id}` | Delete a conversation |

### Files & Knowledge

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/files/upload` | Get S3 presigned URL, trigger ingestion |
| `GET` | `/api/v1/files` | List workspace files |
| `GET` | `/api/v1/knowledge` | List knowledge bases |
| `POST` | `/api/v1/knowledge` | Create a knowledge base |
| `POST` | `/api/v1/knowledge/{id}/query` | Query a knowledge base directly |

### Workflows

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/workflows` | List workflows |
| `POST` | `/api/v1/workflows` | Create a workflow |
| `POST` | `/api/v1/workflows/{id}/run` | Trigger a manual run |
| `GET` | `/api/v1/workflows/runs/{id}` | Get run status + step details |

### Integrations & Webhooks

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/integrations` | List connected integrations |
| `POST` | `/api/v1/integrations/connect` | Initiate OAuth flow |
| `DELETE` | `/api/v1/integrations/{id}` | Revoke an integration |
| `GET` | `/api/v1/webhooks` | List registered webhooks |
| `POST` | `/api/v1/webhooks/{source}` | Receive inbound webhook |

### Billing & Usage

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/billing/checkout` | Create Stripe Checkout session |
| `POST` | `/api/v1/billing/portal` | Create Stripe Customer Portal session |
| `POST` | `/api/v1/billing/webhook` | Stripe webhook receiver (HMAC verified) |
| `GET` | `/api/v1/usage/summary` | Token usage + cost for current period |

### Admin

| Method | Path | Auth |
|---|---|---|
| `GET` | `/api/v1/admin/users` | Owner / Admin only |
| `GET` | `/api/v1/admin/metrics` | Owner / Admin only |

### System

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Load-balancer health probe (no auth) |

---

## Plans & Limits

| Plan | Price | Messages/day | Storage | Workspaces | Models |
|---|---|---|---|---|---|
| **Free** | $0 | 50 | 10 MB | 1 | GPT-4o Mini, Claude Haiku |
| **Pro** | $20/mo | Unlimited | 5 GB | 1 | All models |
| **Team** | $79/mo | Unlimited | 50 GB | 5 | All models |
| **Enterprise** | Custom | Unlimited | Custom | Unlimited | All + vLLM |

---

## Middleware Stack

Middleware executes in this order on every request (outermost → innermost):

```
CORS           — answers browser preflight OPTIONS before any auth runs
  └── Logging      — assigns X-Correlation-ID, logs method/path/status/latency
        └── RateLimit  — Redis sliding-window counter, plan-aware RPM limits
```

Rate limit response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## Exception Hierarchy

All application errors inherit from `AppError` and are serialized to JSON by the global exception handler in `main.py`.

```
AppError (500)
├── ValidationError (400)
├── ConflictError (409)
├── AuthenticationError (401)
├── AuthorizationError (403)
├── NotFoundError (404)
├── UnprocessableError (422)
├── RateLimitError (429)
├── PlanLimitError (402)
├── PaymentRequiredError (402)
├── ProviderError (502)
├── ServiceUnavailableError (503)
├── WorkflowExecutionError (500)
├── IntegrationError (502)
└── WebhookVerificationError (401)
```

---

## Database Models

| Table | Purpose |
|---|---|
| `users` | Core identity |
| `organizations` | Workspaces / tenants |
| `memberships` | User ↔ org with role |
| `sessions` | JWT refresh token store |
| `conversations` | Chat session container |
| `messages` | Individual chat messages |
| `tool_calls` | Tool call trace per message |
| `memories` | Long-term semantic memory (pgvector) |
| `files` | Uploaded file metadata |
| `knowledge_bases` | Vector KB containers |
| `documents` | Parsed documents |
| `document_chunks` | Embedding units (pgvector) |
| `workflows` | Workflow definitions |
| `workflow_versions` | Versioned snapshots |
| `workflow_runs` | Execution instances |
| `workflow_step_runs` | Per-step records |
| `webhook_events` | Inbound webhook log |
| `integrations` | OAuth connections (credentials AES-256-GCM encrypted) |
| `subscriptions` | Stripe subscription state |
| `invoices` | Billing invoice records |
| `usage_logs` | Per-request token metering (partitioned by month) |
| `audit_logs` | Immutable security trail (partitioned by month) |
| `notifications` | In-app notifications |

---

## Security

- **JWT** — 15-minute access tokens + 30-day refresh tokens in HttpOnly cookies
- **Passwords** — bcrypt hashed, never stored in plaintext
- **OAuth credentials** — AES-256-GCM encrypted at rest, keys in AWS KMS
- **Webhook verification** — HMAC-SHA256 on all inbound webhooks (Stripe, GitHub, etc.)
- **Multi-tenancy** — every ORM query is scoped by `workspace_id`; cross-workspace leakage is impossible at the ORM layer
- **Rate limiting** — Redis sliding-window per user, plan-aware limits
- **File uploads** — MIME type validation + ClamAV scan before ingestion
- **RBAC** — owner / admin / member / viewer roles enforced at the service layer

---

## Development

### Run tests

```bash
# Unit tests (no DB required)
pytest tests/unit/ -v

# Integration tests (requires Docker services)
pytest tests/integration/ -v

# E2E (requires full stack running)
cd apps/web && npx playwright test
```

### Alembic migrations

```bash
# Generate a new migration after model changes
alembic revision --autogenerate -m "add_xyz_table"

# Apply
alembic upgrade head

# Rollback one step
alembic downgrade -1
```

### Docker Compose (full local stack)

```bash
docker-compose -f infra/docker/docker-compose.yml up
```

Starts: API · Celery worker · Next.js · PostgreSQL · Redis

---

## Deployment

The production stack runs on AWS ECS Fargate.

```
Route 53
  └── CloudFront + WAF
        ├── S3 (Next.js static assets)
        └── ALB
              ├── ECS Fargate — API (FastAPI)
              └── ECS Fargate — Worker (Celery)

RDS PostgreSQL (Multi-AZ)  +  ElastiCache Redis  +  S3 (files)
```

CI/CD is handled by GitHub Actions:

- **On PR** — lint + type-check + unit tests + integration tests
- **On merge to `main`** — build Docker → push ECR → ECS blue-green deploy → E2E on staging
- **On release tag** — canary 10% → monitor error rate → full rollout

---

## Roadmap

- [x] Phase 1 — Core chat · auth · SSE streaming
- [x] Phase 2 — Workspaces · RBAC · model routing · conversation summarization
- [x] Phase 3 — File upload · RAG pipeline · pgvector · citations
- [x] Phase 4 — Tool calling · built-in tools · OAuth integrations
- [x] Phase 5 — Workflow automation engine · durable execution · human approvals
- [x] Phase 6 — Billing · usage metering · audit logs · GDPR
- [ ] Phase 7 — Enterprise SSO (SAML/OIDC) · LLM evaluation · advanced analytics
- [ ] Phase 8 — Self-hosted vLLM · Qdrant migration · multi-region

---

## License

Proprietary — © 2026 CAT AI. All rights reserved.

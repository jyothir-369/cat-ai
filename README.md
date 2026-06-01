# CAT AI

**Production-grade AI assistant and automation platform.**
Conversational AI · Workflow Automation · RAG Knowledge Base · Multi-Tenant SaaS

[![CI](https://github.com/your-org/cat-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/cat-ai/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.12](https://img.shields.io/badge/python-3.12-blue)](https://python.org)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)

---

## What Is CAT AI?

CAT AI unifies three capabilities that teams typically stitch together from separate tools:

| Capability | What it replaces |
|---|---|
| **Multi-model chat** (GPT-4o, Claude, Groq, Gemini) | ChatGPT / Claude.ai — but with model switching and team workspaces |
| **RAG knowledge base** (upload docs, get cited answers) | Notion AI / Confluence AI — but open and self-hostable |
| **Workflow automation** (trigger-based AI agent pipelines) | Zapier / n8n — but with native AI steps and human approvals |

Everything runs in one platform with shared workspaces, RBAC, usage metering, and Stripe billing.

---

## Quick Start (Local Dev)

### Prerequisites

- Docker + Docker Compose
- Python 3.12
- Node.js 20 + pnpm

```bash
# 1. Clone
git clone https://github.com/your-org/cat-ai.git
cd cat-ai

# 2. Environment
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env — minimum required:
#   JWT_SECRET=<random 32 hex chars>
#   SECRET_KEY=<random 32 hex chars>
#   OPENAI_API_KEY=sk-...         ← or ANTHROPIC_API_KEY

# 3. Start infrastructure (Postgres + Redis)
docker compose -f infra/docker/docker-compose.yml up -d postgres redis

# 4. Install Python deps
cd apps/api && pip install -r requirements.txt

# 5. Run migrations + seed
python ../../scripts/migrate.sh          # creates all tables
python ../../scripts/seed.py             # demo users + workspace

# 6. Start API
uvicorn main:app --reload --port 8000
# → http://localhost:8000/docs

# 7. Start frontend (separate terminal)
cd apps/web && pnpm install && pnpm dev
# → http://localhost:3000

# 8. (Optional) Start Celery worker
cd apps/worker && celery -A celery_app worker --loglevel=info
```

### Demo Credentials (after seed)

| Role | Email | Password |
|---|---|---|
| Demo user | `demo@catai.dev` | `password123` |
| Superadmin | `admin@catai.dev` | `password123` |

---

## Full Docker Compose Stack

```bash
# Start everything: API + worker + beat + web + postgres + redis
docker compose -f infra/docker/docker-compose.yml up -d

# Logs
docker compose -f infra/docker/docker-compose.yml logs -f api

# Stop + remove volumes
docker compose -f infra/docker/docker-compose.yml down -v
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Next.js 14 (App Router)   ←→   FastAPI (modular monolith)│
│  Tailwind + shadcn/ui            api/v1/* routes          │
│  Zustand + TanStack Query        services/ (business logic)│
│  SSE streaming client            ai/ (provider adapters)  │
└──────────────────┬───────────────────────┬────────────────┘
                   │                       │
          ┌────────▼────────┐    ┌─────────▼────────┐
          │  PostgreSQL 16  │    │   Redis 7         │
          │  + pgvector     │    │   Cache + Queue   │
          └─────────────────┘    └──────────────────┘
                   │
          ┌────────▼────────┐
          │  Celery Workers │
          │  ingestion      │
          │  memory extract │
          │  workflow exec  │
          └─────────────────┘
```

### Key Design Decisions

| Decision | Choice | Why |
|---|---|---|
| Backend architecture | Modular monolith | Ship fast; extract microservices at 10K+ users |
| Streaming | Server-Sent Events (SSE) | Simpler than WebSockets for one-directional AI output |
| Vector store | pgvector (MVP) → Qdrant (>500K chunks) | One DB to manage in development |
| Auth | Custom JWT + HttpOnly refresh cookie | No vendor lock-in; Auth0 path for enterprise SSO |
| Workflow engine | Celery DAG (topological sort) | Battle-tested; Temporal.io upgrade path |
| Multi-tenancy | `org_id` FK on every table, ORM-enforced | No cross-tenant leakage possible |

---

## Project Structure

```
cat-ai/
├── apps/
│   ├── api/                    # FastAPI backend
│   │   ├── main.py             # App factory — all routers + middleware
│   │   ├── api/v1/             # 11 route files (thin HTTP layer)
│   │   │   ├── auth.py         # /auth/register|login|refresh|me|logout
│   │   │   ├── chat.py         # /chat/stream (SSE)
│   │   │   ├── conversations.py
│   │   │   ├── files.py        # S3 presigned upload
│   │   │   ├── knowledge.py    # KB CRUD + /query
│   │   │   ├── workflows.py    # CRUD + /run + /approve
│   │   │   ├── integrations.py # OAuth connectors
│   │   │   ├── webhooks.py     # Inbound webhook receiver
│   │   │   ├── usage.py        # Token + cost analytics
│   │   │   ├── billing.py      # Stripe checkout/portal/webhook
│   │   │   ├── admin.py        # Platform metrics (superadmin)
│   │   │   └── memory.py       # Memory CRUD
│   │   ├── services/           # Business logic (9 services)
│   │   ├── ai/                 # LLM providers + orchestration
│   │   │   ├── providers/      # openai, anthropic, groq, gemini, vllm
│   │   │   ├── orchestrator.py # 6-stage prompt assembly
│   │   │   ├── router.py       # Model routing + fallback
│   │   │   ├── circuit_breaker.py
│   │   │   ├── token_counter.py
│   │   │   └── guardrails.py
│   │   ├── db/
│   │   │   ├── models/         # 7 SQLAlchemy model files
│   │   │   ├── repos/          # Data access layer
│   │   │   └── migrations/     # Alembic
│   │   ├── middleware/         # logging, rate_limit, auth, tenant
│   │   └── core/               # config, security, deps, exceptions
│   │
│   ├── worker/                 # Celery async workers
│   │   ├── celery_app.py
│   │   ├── tasks/              # ingestion, memory, workflow_exec, ...
│   │   ├── parsers/            # pdf, docx, csv_xlsx, web
│   │   └── chunkers/           # fixed, sentence, semantic
│   │
│   └── web/                    # Next.js 14 frontend
│       ├── app/                # App Router pages
│       │   ├── (auth)/         # login, register
│       │   └── (dashboard)/    # chat, knowledge, workflows, ...
│       ├── components/         # chat, workflow, knowledge, billing, ui
│       ├── hooks/              # useChat, useAuth, useWorkflow, ...
│       └── lib/                # api client, SSE streaming, Zustand stores
│
├── packages/
│   ├── shared-types/           # Pydantic + TypeScript type mirrors
│   └── prompts/                # Versioned prompt templates
│
├── infra/
│   ├── docker/                 # Dockerfiles + docker-compose
│   └── terraform/              # AWS ECS + RDS + Redis + CloudFront
│
├── tests/
│   ├── unit/                   # Pure logic, no DB/HTTP
│   ├── integration/            # Real DB + Redis (Docker)
│   ├── e2e/                    # Playwright browser tests
│   └── fixtures/               # Shared pytest fixtures
│
└── scripts/
    ├── seed.py                 # Dev DB seed
    └── migrate.sh              # Alembic runner
```

---

## Environment Variables

Copy `apps/api/.env.example` to `apps/api/.env`. Minimum required to boot:

```bash
# Required always
JWT_SECRET=<32-char hex>
SECRET_KEY=<32-char hex>
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/catai
REDIS_URL=redis://localhost:6379/0

# Required for chat to work (at least one)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AIza...

# Required for file upload
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_FILES=cat-ai-files

# Required for billing
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_TEAM_PRICE_ID=price_...
```

See `apps/api/.env.example` for the full list with descriptions.

---

## API Reference

Interactive docs available at `http://localhost:8000/docs` when `DEBUG=true`.

### Core endpoints

```
POST   /api/v1/auth/register          Create account
POST   /api/v1/auth/login             Login → JWT + refresh cookie
GET    /api/v1/auth/me                Current user

POST   /api/v1/chat/stream            SSE streaming chat (main AI endpoint)
GET    /api/v1/conversations          List conversations
GET    /api/v1/conversations/{id}/messages

POST   /api/v1/files/upload           Get S3 presigned URL
GET    /api/v1/knowledge              List knowledge bases
POST   /api/v1/knowledge/{id}/query   Semantic search

GET    /api/v1/workflows              List workflows
POST   /api/v1/workflows/{id}/run     Trigger manually
POST   /api/v1/workflows/runs/{id}/approve

GET    /api/v1/usage/summary          Token + cost summary
POST   /api/v1/billing/checkout       Stripe checkout
GET    /admin/health                  Liveness probe
```

### Chat streaming example

```javascript
const response = await fetch('/api/v1/chat/stream', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ message: 'Explain RAG in one paragraph' }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const text = decoder.decode(value);
  for (const line of text.split('\n')) {
    if (line.startsWith('data:')) {
      const chunk = JSON.parse(line.slice(5));
      if (chunk.token) process.stdout.write(chunk.token);
      if (chunk.done) console.log('\nDone. Conv ID:', chunk.conversation_id);
    }
  }
}
```

---

## Supported Models

| Provider | Models | Routing prefix |
|---|---|---|
| **OpenAI** | gpt-4o, gpt-4o-mini, o1, o3 | `gpt-`, `o1`, `o3`, `o4` |
| **Anthropic** | claude-3-5-sonnet, claude-3-haiku | `claude-` |
| **Groq** | llama-3.1-70b, llama-3.1-8b, mixtral-8x7b, gemma2 | `llama-`, `mixtral-`, `gemma-` |
| **Gemini** | gemini-1.5-pro, gemini-1.5-flash | `gemini-` |

Model routing is automatic based on the `model_id` prefix. Fallback order on failure: OpenAI → Anthropic → Groq.

---

## Plans & Billing

| Plan | Price | Messages/day | Storage | Models | Automations |
|---|---|---|---|---|---|
| **Free** | $0 | 50 | 10 MB | GPT-4o-mini, Groq | — |
| **Pro** | $20/mo | Unlimited | 5 GB | All | Basic |
| **Team** | $79/mo | Unlimited | 50 GB | All | Full + RBAC |
| **Enterprise** | Custom | Unlimited | Unlimited | All + vLLM | Full + SSO |

---

## Running Tests

```bash
# Install test deps
pip install pytest pytest-asyncio pytest-mock anyio httpx --break-system-packages

# Unit tests (no DB required)
cd apps/api && python -m pytest ../../tests/unit/ -v

# Integration tests (requires Docker postgres+redis)
docker compose -f infra/docker/docker-compose.yml up -d postgres redis
python -m pytest ../../tests/integration/ -v

# E2E tests (requires running frontend+API)
cd tests/e2e && pnpm install && pnpm exec playwright install chromium
BASE_URL=http://localhost:3000 pnpm exec playwright test
```

---

## Deployment

### AWS ECS (production)

```bash
# 1. Bootstrap infrastructure
cd infra/terraform
terraform init
terraform workspace new prod
terraform apply -var-file="environments/prod/terraform.tfvars" \
                -var="db_password=$DB_PASSWORD"

# 2. Build + push images
aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY
docker build -f infra/docker/Dockerfile.api -t $ECR_REGISTRY/cat-ai/api:latest .
docker push $ECR_REGISTRY/cat-ai/api:latest

# 3. Deploy
aws ecs update-service --cluster cat-ai-prod --service cat-ai-api-prod --force-new-deployment
```

### CI/CD (GitHub Actions)

| Trigger | Pipeline |
|---|---|
| Pull request | Lint + type-check + unit tests + integration tests |
| Merge to `main` | Build → push ECR → ECS blue-green → E2E on staging |
| Version tag `v*.*.*` | Canary 10% → monitor 5min → full rollout |

---

## Workflow Automation

Workflows are DAGs defined in JSON. Supported step types:

| Type | Description |
|---|---|
| `llm` | Call AI model, get structured response |
| `condition` | Branch on expression evaluation |
| `api_call` | HTTP request to external service |
| `retrieval` | Search knowledge base |
| `approval` | Pause, notify human, wait for approve/reject |
| `tool` | Execute registered tool (web_search, calculator, etc.) |
| `transform` | Reshape data between steps |
| `loop` | Iterate over a list |

```json
{
  "name": "Summarize and notify",
  "trigger": { "type": "webhook", "config": { "source": "github" } },
  "steps": [
    { "id": "s1", "type": "retrieval", "config": { "kb_id": "..." } },
    { "id": "s2", "type": "llm", "config": { "prompt": "Summarize: {{rag_context}}" } },
    { "id": "s3", "type": "approval", "config": { "approver_user_id": "..." } },
    { "id": "s4", "type": "api_call", "config": { "url": "https://hooks.slack.com/..." } }
  ],
  "edges": [
    { "from": "s1", "to": "s2" },
    { "from": "s2", "to": "s3" },
    { "from": "s3", "to": "s4" }
  ]
}
```

---

## Memory System

CAT AI automatically extracts and stores facts from conversations:

- **Short-term**: last N messages in context window
- **Long-term**: extracted facts embedded and stored in `memories` table
- **Retrieval**: top-k by `score = 0.7 × cosine_similarity + 0.3 × recency_decay`
- **Privacy**: users can view/delete all memories at `/settings/memory`
- **GDPR**: deletion cascades to all memory records

Memory extraction runs as a background Celery task after each response. Deduplication threshold: cosine similarity > 0.95.

---

## Contributing

```bash
# Fork + clone, then:
git checkout -b feature/your-feature

# Code style
pip install ruff mypy
ruff check apps/api apps/worker
ruff format apps/api apps/worker
mypy apps/api --ignore-missing-imports

# Before PR: run unit tests
cd apps/api && python -m pytest ../../tests/unit/ -v
```

### Adding a new LLM provider

1. Create `apps/api/ai/providers/yourprovider.py` implementing `BaseProvider`
2. Add model prefix routing in `apps/api/ai/router.py`
3. Add `YOUR_PROVIDER_API_KEY` and `YOUR_PROVIDER_API_URL` to `core/config.py` and `.env.example`
4. Add unit tests in `tests/unit/test_yourprovider_provider.py`

---

## Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Framework | FastAPI 0.115, Python 3.12, Pydantic v2 |
| ORM | SQLAlchemy 2.0 async, Alembic |
| Database | PostgreSQL 16 + pgvector |
| Cache/Queue | Redis 7, Celery 5.4 |
| Storage | AWS S3 |
| LLM | OpenAI SDK, Anthropic SDK, httpx (Groq/Gemini) |
| Auth | python-jose JWT, bcrypt |
| Billing | Stripe Python SDK |

### Frontend
| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router, TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| State | Zustand (client), TanStack Query (server) |
| Streaming | Fetch + SSE manual parser |
| Charts | Recharts |
| Workflow UI | React Flow |

### Infrastructure
| Layer | Technology |
|---|---|
| Containers | Docker, ECS Fargate |
| IaC | Terraform (VPC, RDS, ElastiCache, S3, ECR, ECS, CloudFront, WAF) |
| CI/CD | GitHub Actions |
| Monitoring | CloudWatch, Sentry, Langfuse |
| CDN | CloudFront + WAF |

---

## License

MIT — see [LICENSE](LICENSE).

---

## Roadmap

| Phase | Weeks | Status |
|---|---|---|
| 1 — Core chat + auth + streaming | 1–3 | ✅ Complete |
| 2 — History + model routing + workspaces | 4–5 | ✅ Complete |
| 3 — File upload + RAG | 6–8 | ✅ Complete |
| 4 — Tool calling + integrations | 9–11 | ✅ Complete |
| 5 — Workflow automation engine | 12–15 | ✅ Complete |
| 6 — Billing + analytics + hardening | 16–18 | ✅ Complete |
| 7 — Enterprise SSO + vLLM + Qdrant | 19+ | 🔜 Planned |

---

*CAT AI Architecture Blueprint v1.0 — Production-Ready*

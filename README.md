# BANK AI — Financial Reconciliation & Transaction Intelligence Platform

A fintech-grade AI-powered reconciliation system that compares bank statements with external transaction records (LMS/ERP/Payment Gateway exports).

## Architecture

```
backend/                     # FastAPI + SQLAlchemy + Groq LLM
├── app/
│   ├── api/v1/              # REST endpoints
│   │   ├── reconciliation   # Deterministic matching engine
│   │   ├── investigation    # Analytics, fuzzy matching, anomalies
│   │   ├── ai               # AI intelligence layer (non-authoritative)
│   │   ├── ai_assistant     # Conversational AI investigator
│   │   └── reports          # CSV/XLSX/PDF exports
│   ├── services/            # Domain-driven business logic
│   ├── integrations/groq/   # LLM client, prompts, schemas
│   ├── core/                # Config, security, observability
│   └── models/              # SQLAlchemy ORM models
frontend/                    # Next.js 14 + Recharts + TanStack Table
├── app/                     # Pages
├── components/              # Shared UI components
├── features/                # Domain-specific feature modules
│   ├── analytics/           # Recharts dashboards
│   ├── investigation/       # Anomaly panel, merchant grid
│   └── ai-assistant/        # Conversational AI chat
└── services/                # API client services
```

## Quick Start

```bash
# Backend
cd backend
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

## Key Design Rules

1. **Deterministic reconciliation is the source of truth** — AI never overwrites matching results
2. **AI is assistive only** — interpretations, summaries, explanations
3. **Token optimization** — only send summarized samples to LLM, never full datasets
4. **Rate limited** — 60 req/min via slowapi
5. **Prompt injection protected** — all AI queries sanitized before LLM dispatch

## Testing

```bash
cd backend
python -m pytest tests/ -v
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes (for AI) | Groq API key for Llama-3 access |
| `GROQ_MODEL` | No | Model ID (default: llama-3-70b-8192) |
| `DATABASE_URL` | No | SQLAlchemy URL (default: sqlite:///./app.db) |

## License

Proprietary — All rights reserved.

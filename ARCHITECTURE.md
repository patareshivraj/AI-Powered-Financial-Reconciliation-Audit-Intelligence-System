# Architecture Overview

## System Layers

### Layer 1: Data Ingestion
- File upload (CSV/XLSX) via FastAPI endpoints
- MIME validation + path traversal prevention (`app/core/security.py`)
- Parser service normalizes dates, amounts, references

### Layer 2: Deterministic Reconciliation Engine
- **DuplicateDetectionService**: Flags identical reference+amount+date combos
- **MatchingService**: Multi-stage funnel — exact ref → amount match → date tolerance
- **ReconciliationSummaryService**: Aggregate match/mismatch/unmatched counts
- All results persisted to SQLite via SQLAlchemy ORM

### Layer 3: AI Intelligence (Non-Authoritative)
- **GroqService**: Structured LLM completions with Pydantic response models
- **AiSummaryService**: Executive dashboard summaries
- **MismatchExplanationService**: Root-cause analysis for discrepancies
- **OperationalInsightService**: Macro-level operational trends
- **AiAssistantService**: Conversational analytics with deterministic context injection
- All AI queries pass through `sanitize_ai_query()` for injection protection

### Layer 4: Investigation & Analytics
- **AnalyticsService**: Pandas-based aggregation (volume trends, status distribution)
- **FuzzyMatchingService**: RapidFuzz reference similarity detection (≥85% threshold)
- **AnomalyDetectionService**: Deterministic rules (high-value duplicates, >50% variance)
- **MerchantIntelligenceService**: Entity-level risk scoring
- **ReportingService**: CSV/XLSX/PDF generation via pandas + reportlab

## Security Architecture
- Rate limiting: 60 req/min global (slowapi)
- Upload validation: MIME type check via python-magic, extension whitelist, size cap
- AI security: Prompt injection pattern matching, 500-char query limit, HTML stripping
- Request timing: All requests logged with latency, slow requests (>500ms) flagged

## Data Flow
```
Upload → Parse → Normalize → Reconcile (deterministic) → Persist
                                                          ↓
                            AI Layer (read-only) ← Summarize/Explain/Investigate
                                                          ↓
                                              Reports (CSV/XLSX/PDF)
```

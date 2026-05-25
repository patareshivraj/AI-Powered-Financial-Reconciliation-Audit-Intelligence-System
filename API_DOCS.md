# API Documentation

Base URL: `http://127.0.0.1:8000/api/v1`

## Reconciliation

| Method | Endpoint | Description |
|---|---|---|
| POST | `/reconciliation/run/{session_id}` | Execute deterministic matching engine |
| GET | `/reconciliation/results/{session_id}` | Fetch matched/unmatched pairs |
| GET | `/reconciliation/summary/{session_id}` | Aggregate match statistics |
| GET | `/reconciliation/export/{session_id}?format=csv\|xlsx` | Download results |

## Investigation & Analytics

| Method | Endpoint | Description |
|---|---|---|
| GET | `/investigation/analytics/{session_id}` | Volume trends, status distribution |
| GET | `/investigation/fuzzy-matches/{session_id}` | Probable matches via RapidFuzz |
| GET | `/investigation/merchant-intelligence/{session_id}` | Entity risk scores |
| GET | `/investigation/anomalies/{session_id}` | Deterministic anomaly flags |

## AI Intelligence (Non-Authoritative)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/ai/reconciliation-summary/{session_id}` | LLM executive summary |
| GET | `/ai/explain-mismatch/{result_id}` | Root-cause discrepancy analysis |
| POST | `/ai/operational-insights/{session_id}` | Operational trend observations |
| POST | `/ai/categorize-transactions/{session_id}` | Transaction categorization |

## AI Assistant

| Method | Endpoint | Description |
|---|---|---|
| POST | `/ai-assistant/chat/{session_id}` | Conversational investigation queries |

Body: `{ "query": "Which merchants have the most mismatches?" }`

## Reports

| Method | Endpoint | Description |
|---|---|---|
| GET | `/reports/investigation/{session_id}?format=csv\|xlsx\|pdf` | Investigation report download |

## Uploads

| Method | Endpoint | Description |
|---|---|---|
| POST | `/uploads/bank-statement` | Upload bank CSV/XLSX |
| POST | `/uploads/external-transactions` | Upload ledger CSV/XLSX |

## Health

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health/` | Platform health check |

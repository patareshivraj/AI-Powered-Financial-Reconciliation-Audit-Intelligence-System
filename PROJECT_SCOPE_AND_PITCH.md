# BANK AI - Complete Project Scope & Pitch Deck Documentation

## 1. Executive Summary

**What this project is:**
BANK AI is an enterprise-grade financial reconciliation engine that leverages deterministic matching rules augmented by advanced AI explanation models to provide high-fidelity insights into ledger-to-bank discrepancies.

**Why it exists & What problem it solves:**
Financial reconciliation is traditionally a highly manual, error-prone, and time-consuming process. Finance teams spend countless hours manually cross-referencing bank statements with internal ledgers to find missing transactions, mismatched amounts, and untracked expenses. BANK AI automates the matching process and, more importantly, uses AI to explain exactly *why* a mismatch occurred (e.g., missing receipts, undetected fees, vendor name changes), eliminating the investigative overhead.

**Who uses it:**
- **Financial Analysts:** To reconcile daily/monthly statements rapidly.
- **Auditors:** To review immutable audit trails and verify compliance.
- **CFOs/Finance Managers:** To gain high-level insights into vendor spend and operational bottlenecks.

**Key business value & Expected outcomes:**
- **Time Savings:** Reduces manual reconciliation time by 90%.
- **Accuracy:** Deterministic matching ensures 100% financial accuracy, while AI handles the qualitative explanation.
- **Risk Mitigation:** Identifies shadow IT spend, fraud anomalies, and missing invoices instantly.

---

## 2. Project Vision

**Long-term vision:**
To become the industry standard for intelligent financial operations, replacing legacy spreadsheet workflows with an automated, AI-driven financial nervous system.

**Mission statement:**
Deliver deterministic financial accuracy combined with human-like analytical intelligence to empower finance teams to focus on strategy, not data entry.

**Business goals:**
- Achieve zero-hallucination AI financial reporting.
- Scale to handle millions of transaction rows concurrently.
- Provide a seamless, enterprise-ready integration layer for existing ERPs (Enterprise Resource Planning).

**Success metrics:**
- **Match Rate:** >95% automated deterministic matching.
- **Resolution Time:** <2 minutes to identify and explain a batch of mismatches.
- **AI Accuracy:** 0% hallucination rate on financial figures (enforced via context injection).

---

## 3. User Journey

**Step 1: User Opens Application**
- **User Does:** Navigates to the BANK AI web portal.
- **User Sees:** The Enterprise Auth Simulation login screen.
- **Backend:** N/A.
- **Data/APIs:** Static frontend loads.

**Step 2: User Login**
- **User Does:** Selects a Role (ADMIN, ANALYST, AUDITOR).
- **User Sees:** Loading spinner, then redirected to the Main Dashboard.
- **Backend:** Registers the simulated user (if missing) and issues a JWT token.
- **APIs:** `POST /api/v1/auth/signup`, `POST /api/v1/auth/login`.
- **Data:** User profile stored in SQLite; Token stored in `localStorage`.

**Step 3: Dashboard Loads**
- **User Does:** Views the high-level financial metrics.
- **User Sees:** Empty state or historical reconciliation summaries.
- **Backend:** Validates JWT, fetches session history.
- **APIs:** `GET /api/v1/reconciliation/history`.

**Step 4: User Uploads Data**
- **User Does:** Drags and drops a Bank Statement CSV and an Internal Ledger CSV into the Upload Dropzones.
- **User Sees:** Progress bars, followed by a Data Preview Table showing parsed rows.
- **Backend:** Parses CSVs, validates column headers, cleans data, stores raw transactions in DB.
- **APIs:** `POST /api/v1/reconciliation/upload`.
- **Data:** `Transaction` records created in SQLite.

**Step 5: Reconciliation Processing**
- **User Does:** Clicks "Run Reconciliation".
- **User Sees:** Real-time log terminal output, then the Results Grid.
- **Backend:** Executes deterministic matching (Exact amount -> Reference Code -> 24h Date proximity). Flags matches and mismatches.
- **Data:** `ReconciliationResult` records created.

**Step 6: AI Anomaly Investigation**
- **User Does:** Clicks "Explain Mismatch" on a failed row.
- **User Sees:** A sliding drawer opens with an AI-generated explanation.
- **Backend:** Extracts the specific DB rows, formats a strict context payload, and queries the Groq Llama-3 API.
- **APIs:** `POST /api/v1/ai/explain/{result_id}`.
- **Response:** JSON containing explanation, confidence score, and suggested action.

---

## 4. Complete System Flow

**User** ↓ Interacts via web browser
**Frontend** ↓ React SPA (Create React App) manages UI state and routing
**Authentication** ↓ JWT token validation via Axios Interceptors
**Backend** ↓ FastAPI receives REST requests
**Database** ↓ SQLite stores immutable transaction data
**AI Services** ↓ Groq API (Llama 3 70B) processes strict contextual prompts
**External APIs** ↓ (Future ERP integrations)
**Response Engine** ↓ FastAPI serializes data via Pydantic models
**Frontend Display** ↓ Data rendered in Shadcn-styled grids and charts

**Layer Breakdown:**
- **Frontend:** Purpose is to provide a responsive, intuitive UX. Inputs are user clicks/files. Outputs are API calls and DOM rendering.
- **Backend:** Purpose is business logic orchestration and security. Inputs are HTTP requests. Outputs are validated JSON responses.
- **Database:** Purpose is state persistence. Inputs are SQLAlchemy ORM objects. Outputs are relational data queries.
- **AI Layer:** Purpose is human-readable analysis. Inputs are strict JSON context blocks. Outputs are text strings (explanations).

---

## 5. Architecture Overview

### Frontend
- **Technologies:** React 19 (CRA), Tailwind CSS v3, TypeScript, Lucide Icons, Axios.
- **Components:** `UploadDropzone`, `DataPreviewTable`, `ReconciliationTable`, `AiAuditDrawer`, `SimulationLoginOverlay`.
- **State Management:** React Context (`ReconciliationProvider`), Custom Hooks (`useAuth`).
- **UI Flow:** Auth -> Dashboard -> Upload -> Preview -> Reconcile -> Analyze -> Report.

### Backend
- **Services:** FastAPI, Uvicorn, SQLAlchemy, Pydantic.
- **Controllers:** Grouped by domain (Reconciliation, AI, Investigation, Auth).
- **Business Logic:** Strict separation of deterministic math (Python rules) and qualitative analysis (LLM).

### Database
- **Tables:** `ReconciliationSession`, `Transaction`, `ReconciliationResult`.
- **Relationships:** A Session has many Transactions and Results. A Result links a Bank Transaction to a Ledger Transaction.

### AI Layer
- **Models:** Groq API (Llama-3-70b-versatile).
- **Prompt Flow:** System Prompt (defines persona) + Context Injection (raw DB row data) + User Request.
- **Context Management:** AI is never allowed to query the DB directly. The backend feeds it strictly formatted JSON to prevent hallucination.

### Infrastructure
- **Hosting:** Deployable via Docker, AWS EC2, or Vercel (Frontend) / DigitalOcean (Backend).
- **Storage:** Local file system for uploads (can migrate to S3).
- **Security:** JWT Auth, CORS whitelisting, Rate Limiting (SlowAPI).

---

## 6. Feature Breakdown

### 1. Deterministic Reconciliation Engine
- **Purpose:** Match records accurately without AI hallucination risk.
- **How it works:** 3-pass algorithm: 1) Exact Amount & Date, 2) Reference Match, 3) 24h Proximity Match.
- **Benefits:** 100% mathematically accurate. Auditable.
- **Limitations:** Cannot match if amounts differ slightly due to undocumented fees.

### 2. AI Mismatch Explainer (Audit Drawer)
- **Purpose:** Explain *why* a transaction failed to match.
- **How it works:** Injects the isolated mismatched row into an LLM prompt.
- **Benefits:** Saves hours of manual investigation.
- **Future improvements:** Connect to email/Slack to automatically request receipts from employees.

### 3. Merchant Intelligence Datagrid
- **Purpose:** Group anomalies by vendor.
- **How it works:** SQL `GROUP BY` aggregations on merchant names, calculating failure rates.
- **Benefits:** Identifies problematic vendors or shadow IT subscriptions (e.g., 50 failed AWS charges).

---

## 7. API Flow Documentation

**API Name:** Trigger AI Mismatch Explanation
- **Purpose:** Generate natural language explanation for a discrepancy.
- **Request:** `POST /api/v1/ai/explain/{result_id}`
- **Authentication:** Bearer JWT required.
- **Data Flow:** Result ID -> Fetch DB Rows -> Construct Prompt -> Call Groq -> Return JSON.
- **Example Payload Response:**
  ```json
  {
    "explanation": "The bank statement shows a charge for $50.00 from 'AWS', but the ledger is missing this record. This is likely an unrecorded cloud expense.",
    "confidence": 0.98,
    "suggested_action": "Request invoice from the engineering department."
  }
  ```

---

## 8. Data Flow Explanation
- **Originates:** User uploads CSV files.
- **Moves:** Via multipart/form-data to FastAPI backend.
- **Stored:** Parsed and saved to SQLite (`app.db`).
- **Processed:** Python logic cross-references tables. AI processes isolated JSON representations.
- **Retrieved:** Frontend fetches via REST GET requests.
- **Secured:** JWT authorization, CORS enforcement, Rate Limiting.
- **Lifecycle:** Session created -> Files parsed -> Matched -> AI Analyzed -> Session Archived.

---

## 9. Database Design
- **Entities:** Session, Transaction, Result, User.
- **Relationships:** 
  - `Session` (1) to (N) `Transaction`
  - `Result` links (1) Bank `Transaction` and (1) Ledger `Transaction` (Nullable if missing).
- **Optimization:** Indexes on `amount`, `transaction_date`, and `session_id` for rapid matching.
- **Scaling Strategy:** Migrate from SQLite to PostgreSQL. Implement partitioning by `session_id`.

---

## 10. AI Workflow
- **Prompt Creation:** Hardcoded templates in `ai_summary_service.py`.
- **Context Collection:** Backend queries DB, formats exact values (Amount: $50, Date: X), and injects them into the prompt.
- **Response Generation:** Groq LLM returns structured JSON.
- **Hallucination Reduction:** The LLM is explicitly instructed: "Only use the provided JSON. Do not invent numbers."
- **Validation:** Pydantic models validate the LLM's JSON output before sending it to the frontend.

---

## 11. Security Architecture
- **Authentication:** OAuth2 with Password Flow (JWT).
- **Authorization:** Role-Based Access Control (RBAC) - ADMIN, ANALYST, AUDITOR.
- **API Security:** CORS explicitly whitelisted to the frontend domain.
- **Rate Limiting:** `SlowAPI` limits endpoints to 60 req/minute to prevent abuse and LLM cost spikes.
- **Data Privacy:** Raw CSVs are not sent to the LLM, only isolated, anonymized snippets.

---

## 12. Scalability Plan
- **Current Limits:** SQLite locking during concurrent writes; Groq API rate limits.
- **Expected Growth:** Transitioning from 1,000 rows/month to 100,000 rows/month.
- **Scaling Strategy:** 
  1. Migrate SQLite to PostgreSQL.
  2. Implement Redis caching for AI explanations.
  3. Move reconciliation processing to a Celery background worker queue.
- **Cost Optimization:** Cache exact match explanations to avoid duplicate LLM API calls.

---

## 13. Technology Stack

| Technology | Purpose | Why Chosen | Alternatives |
|---|---|---|---|
| **React 19 (CRA)** | Frontend UI | Stable, massive ecosystem, easy to hire for | Vue, Angular |
| **TailwindCSS v3** | Styling | Rapid UI development, utility-first | SCSS, Bootstrap |
| **FastAPI** | Backend API | High performance, async native, auto-docs | Django, Flask |
| **SQLite** | Database | Zero-config local development | PostgreSQL |
| **Groq (Llama-3)** | AI Inference | Extremely low latency, cost-effective | OpenAI GPT-4 |

---

## 14. Development Roadmap

- **Phase 1: MVP (Current)** - Local SQLite, basic deterministic matching, Groq AI explanations.
- **Phase 2: Beta** - PostgreSQL migration, user management, PDF report exports.
- **Phase 3: Production** - Celery background queues, ERP integrations (Xero/QuickBooks).
- **Phase 4: Scale** - Multi-tenant SaaS architecture, custom fine-tuned LLM deployment.

---

## 15. Pitch Deck Style Explanation

- **Slide 1: Problem** - "Finance teams waste 40 hours a month manually matching spreadsheets."
- **Slide 2: Solution** - "BANK AI: Deterministic matching meets AI-powered investigation."
- **Slide 3: Demo Flow** - Upload -> Auto-Match -> AI Explains Anomalies.
- **Slide 4: Architecture** - React + FastAPI + Strict AI Context Injection.
- **Slide 5: AI Advantage** - "We don't let AI do math. We let AI explain the math."
- **Slide 6: Market Opportunity** - $10B FinOps automation market.
- **Slide 7: Business Model** - B2B SaaS (Per-seat + Transaction volume).
- **Slide 8: Competitive Edge** - Zero-hallucination guarantee via context isolation.
- **Slide 9: Roadmap** - ERP Integrations -> Multi-tenant SaaS.
- **Slide 10: Vision** - The autonomous financial nervous system.

---

## 16. Non-Technical Explanation (Explain Like I'm a Client)

Imagine you have two massive lists of purchases: one from your bank, and one from your accountant. Finding which items match and which ones are missing takes hours of staring at a screen.

**BANK AI does two things:**
1. **The Calculator:** It instantly cross-references both lists using strict math. If the date and amount match perfectly, it clears them.
2. **The Detective:** For the messy items left over (like a $50 charge that your accountant forgot to record), it uses an AI assistant to look at the discrepancy and tell you in plain English: *"You have a $50 charge from Amazon on the bank statement, but it's missing from your books. You need to find this receipt."*

It saves your team days of work, and because the AI is only acting as a "detective" (and not doing the math), it never makes up fake numbers.

---

## 17. Developer Handover Document

**Project Structure:**
- `/frontend`: React 19 SPA (Create React App).
- `/backend`: Python FastAPI application.

**Environment Variables:**
- Frontend: `.env.production` (`REACT_APP_API_URL`)
- Backend: `.env` (`GROQ_API_KEY`, `DB_URL`)

**Deployment Steps:**
1. **Frontend:** Run `npm install --legacy-peer-deps` -> `npm run build`. Host `build/` on Nginx. Configure Nginx with `try_files $uri /index.html` for client-side routing.
2. **Backend:** Install requirements, set CORS in `config.py` to allow the frontend domain. Run via Uvicorn/Gunicorn.

**Known Issues:**
- SQLite database locks (`.db-wal`) can occur under heavy concurrent load. Migrate to PostgreSQL for enterprise production.

**Future Improvements:**
- Replace synchronous AI calls in FastAPI with Celery background tasks to prevent HTTP timeouts on massive datasets.

---
*End of Document*

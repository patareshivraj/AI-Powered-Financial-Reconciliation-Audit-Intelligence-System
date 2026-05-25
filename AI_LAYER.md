# AI Layer Documentation

## Design Philosophy

The AI layer in BANK AI is **strictly non-authoritative**. It exists as an intelligence augmentation sidecar — it can read, interpret, and explain reconciliation data, but it **cannot** modify, overwrite, or influence deterministic matching results.

## What AI Does
- Generate executive summaries of reconciliation sessions
- Explain root causes of individual mismatches
- Identify operational trends across transaction datasets
- Categorize transactions by vendor, payment mode, and type
- Answer natural language investigation queries

## What AI Does NOT Do
- ✘ Perform financial calculations
- ✘ Modify reconciliation results
- ✘ Override match/mismatch status
- ✘ Persist any data to the database
- ✘ Make authoritative financial decisions

## Token Optimization
- `TokenOptimizationUtils.extract_mismatch_samples()` selects balanced subsets
- Maximum 30 samples sent per request
- Merchant data capped at top 10 entities
- All prompts use structured JSON output schemas via Pydantic

## Security
- All user queries pass through `sanitize_ai_query()` before LLM dispatch
- Prompt injection patterns are blocked (regex-based detection)
- Query length capped at 500 characters
- HTML/XML tags stripped from inputs
- AI responses are never trusted for financial accuracy

## Provider
- **Groq** (Llama-3 70B 8192 context)
- Free tier with TPM/RPM limits
- Graceful degradation if API key is missing

## Prompt Files
Located in `backend/app/integrations/groq/prompts/`:
- `reconciliation_summary.txt` — Executive summary generation
- `mismatch_explainer.txt` — Individual discrepancy analysis
- `operational_insights.txt` — Macro-level trend extraction
- `ai_assistant.txt` — Conversational investigation context
- `narration_parser.txt` — Transaction description parsing

import pandas as pd
from sqlalchemy.orm import Session, joinedload
from app.models.base import ReconciliationResult, Transaction
from app.utils.logging import logger
from typing import Dict, Any, List

class MerchantIntelligenceService:
    @staticmethod
    def analyze_merchants(db: Session, session_id: str) -> List[Dict[str, Any]]:
        """
        Aggregates transaction data by description (treating it as merchant proxy for now)
        to detect spending trends, frequencies, and anomaly patterns.
        """
        logger.info(f"Running merchant intelligence for session {session_id}")
        
        # We'll analyze bank transactions for merchant insights
        results = db.query(ReconciliationResult).options(
            joinedload(ReconciliationResult.bank_transaction)
        ).filter(ReconciliationResult.session_id == session_id).all()
        
        data = []
        for r in results:
            if r.bank_transaction:
                data.append({
                    "merchant": r.bank_transaction.description or "UNKNOWN",
                    "amount": r.bank_transaction.amount or 0.0,
                    "date": r.bank_transaction.transaction_date,
                    "status": r.match_type
                })
                
        df = pd.DataFrame(data)
        if df.empty:
            return []
            
        # Group by merchant
        merchant_stats = df.groupby('merchant').agg(
            transaction_count=('amount', 'count'),
            total_volume=('amount', 'sum'),
            mismatch_count=('status', lambda x: (x != 'MATCHED').sum())
        ).reset_index()
        
        # Calculate risk score (simple heuristic: % of mismatches + volume weight)
        merchant_stats['risk_score'] = (merchant_stats['mismatch_count'] / merchant_stats['transaction_count']) * 100
        
        # Sort by volume and risk
        merchant_stats = merchant_stats.sort_values(by=['total_volume', 'risk_score'], ascending=[False, False])
        
        # Return top 50 merchants
        return merchant_stats.head(50).to_dict(orient='records')

    @staticmethod
    def get_merchant_deepdive(db: Session, session_id: str, merchant: str):
        """Fetches detailed transactions for a specific merchant."""
        results = db.query(ReconciliationResult).options(
            joinedload(ReconciliationResult.bank_transaction),
            joinedload(ReconciliationResult.ledger_transaction)
        ).filter(
            ReconciliationResult.session_id == session_id
        ).all()
        
        txs = []
        for r in results:
            b = r.bank_transaction
            l = r.ledger_transaction
            
            # Check if this merchant is involved
            is_merchant = False
            tx_amount = 0
            tx_date = ""
            tx_ref = ""
            
            if b and b.description and merchant.lower() in b.description.lower():
                is_merchant = True
                tx_amount = b.amount
                tx_date = b.transaction_date
                tx_ref = b.reference
            elif l and l.description and merchant.lower() in l.description.lower():
                is_merchant = True
                tx_amount = l.amount
                tx_date = l.transaction_date
                tx_ref = l.reference
                
            if is_merchant:
                txs.append({
                    "id": r.id,
                    "date": tx_date.isoformat() if hasattr(tx_date, "isoformat") else str(tx_date),
                    "amount": float(tx_amount),
                    "reference": tx_ref,
                    "status": r.match_type
                })
                
        # Sort by date descending
        txs.sort(key=lambda x: x["date"], reverse=True)
        
        total_transactions = len(txs)
        mismatches = [tx for tx in txs if tx["status"] != "MATCHED"]
        mismatch_count = len(mismatches)
        risk_percentage = (mismatch_count / total_transactions * 100) if total_transactions > 0 else 0
        
        if total_transactions > 0:
            date_start = txs[-1]["date"][:10]  # Oldest
            date_end = txs[0]["date"][:10]    # Newest
            date_context = f"between {date_start} and {date_end}"
        else:
            date_context = "in the current period"
            
        mismatch_types = {}
        for m in mismatches:
            mismatch_types[m["status"]] = mismatch_types.get(m["status"], 0) + 1
            
        breakdown = ", ".join([f"{count} {st.replace('_', ' ').lower()}" for st, count in mismatch_types.items()])
        
        if risk_percentage == 0:
            ai_risk_level = "LOW"
            ai_summary = f"Merchant {merchant} shows optimal reconciliation health {date_context}. All {total_transactions} transactions successfully matched across systems, indicating perfect data synchronization and no discrepancies."
        elif risk_percentage < 30:
            ai_risk_level = "MEDIUM"
            ai_summary = f"Merchant {merchant} exhibits moderate risk {date_context}. Found {mismatch_count} anomalies out of {total_transactions} total transactions. The primary issues include {breakdown}. This indicates minor inconsistencies that may require manual review."
        else:
            ai_risk_level = "HIGH"
            
            # Determine the primary cause for the rich narrative
            primary_cause = ""
            suggestion = ""
            if mismatch_types:
                top_mismatch = max(mismatch_types.items(), key=lambda item: item[1])[0]
                if top_mismatch == "MISSING_IN_EXTERNAL":
                    primary_cause = "due to missing entries in the external ledger"
                    suggestion = "The discrepancies are primarily caused by transactions being present in the bank statement but missing in the ledger. This suggests a potential issue with data synchronization or delayed ledger updates."
                elif top_mismatch == "MISSING_IN_BANK":
                    primary_cause = "due to transactions missing from the bank statement"
                    suggestion = "The discrepancies are primarily caused by transactions being recorded in the ledger but not yet settled or appearing in the bank feed. This suggests timing differences or potential unrecorded bank activity."
                elif "AMOUNT" in top_mismatch:
                    primary_cause = "due to amount discrepancies"
                    suggestion = "The discrepancies are primarily caused by mismatched monetary values between the bank and the ledger. This suggests potential issues with currency conversion, fees being recorded differently, or partial payments."
                else:
                    primary_cause = f"due to {top_mismatch.replace('_', ' ').lower()}"
                    suggestion = f"The discrepancies are driven by a high volume of {top_mismatch.replace('_', ' ').lower()}. This indicates structural reconciliation friction for this merchant."

            ai_summary = f"Merchant {merchant} has a high number of mismatches, with {mismatch_count} out of {total_transactions} transactions not reconciling {primary_cause}. {suggestion}"
            
        return {
            "merchant": merchant,
            "total_transactions": total_transactions,
            "mismatch_count": mismatch_count,
            "ai_risk_level": ai_risk_level,
            "ai_summary": ai_summary,
            "transactions": txs
        }

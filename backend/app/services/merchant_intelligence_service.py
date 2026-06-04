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
    async def get_merchant_deep_dive(db: Session, session_id: str, merchant_name: str) -> Dict[str, Any]:
        """Fetches detailed transactions for a specific merchant and generates an AI summary."""
        results = db.query(ReconciliationResult).options(
            joinedload(ReconciliationResult.bank_transaction)
        ).filter(ReconciliationResult.session_id == session_id).all()
        
        merchant_txs = []
        mismatches = []
        total_vol = 0.0
        
        for r in results:
            if r.bank_transaction and (r.bank_transaction.description or "UNKNOWN") == merchant_name:
                item = {
                    "id": r.id,
                    "reference": r.bank_transaction.reference,
                    "date": r.bank_transaction.transaction_date,
                    "amount": r.bank_transaction.amount,
                    "status": r.match_type,
                    "remarks": r.comments
                }
                merchant_txs.append(item)
                total_vol += (r.bank_transaction.amount or 0.0)
                if r.match_type != 'MATCHED':
                    mismatches.append(item)
                    
        if not merchant_txs:
            return {"error": "Merchant not found."}

        # 2. Get AI Summary using Groq
        from app.integrations.groq.groq_service import GroqService
        from pydantic import BaseModel, Field
        class MerchantSummaryResponse(BaseModel):
            summary: str = Field(description="A concise 2-3 sentence AI summary of this merchant's reconciliation status.")
            risk_level: str = Field(description="LOW, MEDIUM, or HIGH")
            
        context = {
            "merchant_name": merchant_name,
            "total_transactions": len(merchant_txs),
            "total_volume": total_vol,
            "mismatch_count": len(mismatches),
            "mismatch_samples": mismatches[:10]
        }
        
        ai_response = await GroqService.get_structured_completion(
            prompt_file="merchant_summary.txt",
            context_data=context,
            response_model=MerchantSummaryResponse,
            max_tokens=300
        )
        
        ai_summary = ai_response.get("data", {}).get("summary", "AI analysis unavailable.")
        risk_level = ai_response.get("data", {}).get("risk_level", "UNKNOWN")
        
        return {
            "merchant_name": merchant_name,
            "total_transactions": len(merchant_txs),
            "total_volume": total_vol,
            "mismatch_count": len(mismatches),
            "transactions": merchant_txs,
            "ai_summary": ai_summary,
            "ai_risk_level": risk_level
        }

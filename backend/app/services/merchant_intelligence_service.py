import pandas as pd
from sqlalchemy.orm import Session
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
        results = db.query(ReconciliationResult).filter(ReconciliationResult.session_id == session_id).all()
        
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

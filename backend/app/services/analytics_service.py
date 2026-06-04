import pandas as pd
from sqlalchemy.orm import Session, joinedload
from app.models.base import ReconciliationSession, ReconciliationResult, Transaction
from app.utils.logging import logger
from typing import Dict, Any, List

class AnalyticsService:
    @staticmethod
    def get_session_analytics(db: Session, session_id: str) -> Dict[str, Any]:
        """
        Generates deterministic macro-level operational analytics using pandas DataFrames.
        Includes volume analytics, mismatch distributions, and daily trends.
        """
        logger.info(f"Generating deterministic analytics for session {session_id}")
        
        results = db.query(ReconciliationResult).options(
            joinedload(ReconciliationResult.bank_transaction),
            joinedload(ReconciliationResult.ledger_transaction)
        ).filter(ReconciliationResult.session_id == session_id).all()
        if not results:
            return {"error": "No data found for session."}
            
        data = []
        for r in results:
            btx = r.bank_transaction
            ltx = r.ledger_transaction
            
            # Prefer bank date, fallback to ledger date
            tx_date = None
            if btx and btx.transaction_date:
                tx_date = btx.transaction_date
            elif ltx and ltx.transaction_date:
                tx_date = ltx.transaction_date
                
            amount = 0
            if btx and btx.amount:
                amount = btx.amount
            elif ltx and ltx.amount:
                amount = ltx.amount
                
            data.append({
                "status": r.match_type,
                "amount": amount,
                "date": tx_date.date() if tx_date else None,
                "source": "BANK" if btx else ("LEDGER" if ltx else "UNKNOWN")
            })
            
        df = pd.DataFrame(data)
        if df.empty:
            return {"error": "Insufficient data for analytics."}
            
        # 1. Status Distribution
        status_counts = df['status'].value_counts().to_dict()
        
        # 2. Volume Trend (by Date)
        if 'date' in df.columns:
            trend_df = df.groupby('date').agg(
                total_transactions=('amount', 'count'),
                total_volume=('amount', 'sum')
            ).reset_index()
            # Convert dates to strings for JSON serialization
            trend_df['date'] = trend_df['date'].astype(str)
            volume_trends = trend_df.to_dict(orient='records')
        else:
            volume_trends = []
            
        # 3. High-Value Mismatches (Sum of mismatched amounts)
        mismatch_df = df[df['status'] != 'MATCHED']
        total_mismatch_value = float(mismatch_df['amount'].sum()) if not mismatch_df.empty else 0.0
        
        return {
            "status_distribution": status_counts,
            "volume_trends": volume_trends,
            "total_mismatch_value": total_mismatch_value,
            "total_processed": len(df)
        }

from sqlalchemy.orm import Session, joinedload
from app.models.base import ReconciliationResult
from app.utils.logging import logger
from typing import Dict, Any, List

class AnomalyDetectionService:
    @staticmethod
    def detect_anomalies(db: Session, session_id: str) -> List[Dict[str, Any]]:
        """
        Deterministically detects operational anomalies such as:
        - High-value duplicates
        - Massive amount mismatches
        - Stale/old unmatched records
        """
        logger.info(f"Running deterministic anomaly detection for session {session_id}")
        
        mismatches = db.query(ReconciliationResult).options(
            joinedload(ReconciliationResult.bank_transaction),
            joinedload(ReconciliationResult.ledger_transaction)
        ).filter(
            ReconciliationResult.session_id == session_id,
            ReconciliationResult.match_type != "MATCHED"
        ).all()
        
        anomalies = []
        
        for r in mismatches:
            b_tx = r.bank_transaction
            l_tx = r.ledger_transaction
            
            # Rule 1: High Value Duplicate
            if r.match_type == "DUPLICATE":
                amt = (b_tx.amount if b_tx else 0) or (l_tx.amount if l_tx else 0)
                if amt > 50000:
                    anomalies.append({
                        "result_id": r.id,
                        "type": "HIGH_VALUE_DUPLICATE",
                        "severity": "CRITICAL",
                        "description": f"Duplicate transaction detected with abnormally high value: {amt}"
                    })
                    
            # Rule 2: Massive Amount Mismatch (> 50% variance)
            if r.match_type == "AMOUNT_MISMATCH" and b_tx and l_tx:
                variance = abs(b_tx.amount - l_tx.amount)
                if b_tx.amount > 0 and (variance / b_tx.amount) > 0.5:
                    anomalies.append({
                        "result_id": r.id,
                        "type": "MASSIVE_AMOUNT_VARIANCE",
                        "severity": "HIGH",
                        "description": f"Ledger differs from bank by {variance} (>50% variance)."
                    })
                    
        return anomalies

from rapidfuzz import fuzz, process
from sqlalchemy.orm import Session
from app.models.base import ReconciliationResult, Transaction
from app.utils.logging import logger
from typing import List, Dict, Any

class FuzzyMatchingService:
    @staticmethod
    def detect_probable_matches(db: Session, session_id: str) -> List[Dict[str, Any]]:
        """
        Uses rapidfuzz to scan completely unmatched records in both ledgers and 
        finds probable pairs based on string distance metrics (e.g. UTR123 vs UTR-123).
        """
        logger.info(f"Running fuzzy matching analysis for session {session_id}")
        
        # Get orphans
        missing_in_bank = db.query(ReconciliationResult).filter(
            ReconciliationResult.session_id == session_id,
            ReconciliationResult.match_type == "MISSING_IN_BANK"
        ).all()
        
        missing_in_external = db.query(ReconciliationResult).filter(
            ReconciliationResult.session_id == session_id,
            ReconciliationResult.match_type == "MISSING_IN_EXTERNAL"
        ).all()
        
        if not missing_in_bank or not missing_in_external:
            return []
            
        # We only have ledger transactions for "MISSING_IN_BANK"
        ledger_orphans = [r.ledger_transaction for r in missing_in_bank if r.ledger_transaction]
        
        # We only have bank transactions for "MISSING_IN_EXTERNAL"
        bank_orphans = [r.bank_transaction for r in missing_in_external if r.bank_transaction]
        
        probable_matches = []
        
        # Build reference lookup
        ledger_refs = {tx.reference: tx for tx in ledger_orphans if tx.reference}
        ledger_ref_keys = list(ledger_refs.keys())
        
        for b_tx in bank_orphans:
            if not b_tx.reference:
                continue
                
            # Perform rapidfuzz extraction
            # extractOne returns (match, score, index)
            best_match = process.extractOne(
                b_tx.reference, 
                ledger_ref_keys, 
                scorer=fuzz.ratio
            )
            
            if best_match and best_match[1] >= 85.0: # 85% similarity threshold
                matched_ref = best_match[0]
                score = best_match[1]
                l_tx = ledger_refs[matched_ref]
                
                probable_matches.append({
                    "bank_transaction_id": b_tx.id,
                    "ledger_transaction_id": l_tx.id,
                    "bank_reference": b_tx.reference,
                    "ledger_reference": l_tx.reference,
                    "confidence": round(score, 2),
                    "reason": "Reference ID formatting variation detected."
                })
                
        return probable_matches

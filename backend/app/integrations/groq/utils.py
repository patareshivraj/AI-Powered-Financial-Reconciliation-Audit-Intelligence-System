from typing import List, Dict, Any
from app.models.base import Transaction, ReconciliationResult
from app.utils.logging import logger

class TokenOptimizationUtils:
    """
    Implements rules to optimize token consumption and avoid TPM/RPM rate limits.
    Compresses datasets, filters samples, and summarizes transaction metadata.
    """

    @staticmethod
    def extract_mismatch_samples(results: List[ReconciliationResult], max_samples: int = 15) -> List[Dict[str, Any]]:
        """
        Extracts a compact, balanced subset of discrepant records (excluding perfect MATCHED statuses)
        to act as context for summary generation.
        """
        logger.info(f"Preprocessing {len(results)} results to select max {max_samples} audit samples...")
        
        # Isolate mismatch pairings
        mismatches = [
            r for r in results 
            if r.match_type in ["AMOUNT_MISMATCH", "DATE_MISMATCH", "PARTIAL_MATCH", "MISSING_IN_BANK", "MISSING_IN_EXTERNAL"]
        ]

        if not mismatches:
            return []

        # Sort or select balanced samples
        samples = []
        status_counts = {}

        for r in mismatches:
            if len(samples) >= max_samples:
                break
                
            m_type = r.match_type
            # Balance sample collection (limit duplicates of same error class)
            status_counts[m_type] = status_counts.get(m_type, 0) + 1
            if status_counts[m_type] > 4:
                continue

            b_tx = r.bank_transaction
            e_tx = r.ledger_transaction

            samples.append({
                "result_id": r.id,
                "status": m_type,
                "ref_key": b_tx.reference if b_tx else (e_tx.reference if e_tx else "N/A"),
                "bank_amount": b_tx.amount if b_tx else None,
                "ledger_amount": e_tx.amount if e_tx else None,
                "bank_date": b_tx.transaction_date.strftime("%Y-%m-%d") if b_tx else "N/A",
                "ledger_date": e_tx.transaction_date.strftime("%Y-%m-%d") if e_tx else "N/A",
                "remarks": r.comments
            })

        # If we didn't fill samples due to balance restrictions, fill with remaining items
        if len(samples) < min(max_samples, len(mismatches)):
            remaining = [
                r for r in mismatches 
                if r.id not in [s["result_id"] for s in samples]
            ]
            for r in remaining:
                if len(samples) >= max_samples:
                    break
                b_tx = r.bank_transaction
                e_tx = r.ledger_transaction
                samples.append({
                    "result_id": r.id,
                    "status": r.match_type,
                    "ref_key": b_tx.reference if b_tx else (e_tx.reference if e_tx else "N/A"),
                    "bank_amount": b_tx.amount if b_tx else None,
                    "ledger_amount": e_tx.amount if e_tx else None,
                    "bank_date": b_tx.transaction_date.strftime("%Y-%m-%d") if b_tx else "N/A",
                    "ledger_date": e_tx.transaction_date.strftime("%Y-%m-%d") if e_tx else "N/A",
                    "remarks": r.comments
                })

        return samples

    @staticmethod
    def compress_transaction_metadata(transactions: List[Transaction], limit: int = 30) -> str:
        """
        Compresses standard transactions to a highly compact string schema:
        'REF|DATE|AMOUNT|SOURCE'
        Avoids sending verbose properties to keep token usage down.
        """
        logger.info(f"Compressing {len(transactions)} transaction nodes for safe Groq ingestion...")
        lines = []
        for tx in transactions[:limit]:
            ref = tx.reference or "N/A"
            date = tx.transaction_date.strftime("%Y-%m-%d")
            source = "BANK" if tx.source_type == "BANK_STATEMENT" else "LEDGER"
            lines.append(f"{ref.strip()}|{date}|{tx.amount}|{source}")

        return "\n".join(lines)

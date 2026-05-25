from typing import List, Dict, Set, Tuple
from app.models.base import Transaction, ReconciliationResult
from app.utils.logging import logger
import uuid

class MatchingService:
    @staticmethod
    def run_matching(
        session_id: str,
        bank_txs: List[Transaction],
        external_txs: List[Transaction],
        duplicate_ids: Set[str]
    ) -> List[ReconciliationResult]:
        """
        Deterministic matching engine.
        Priority matching:
        1. reference_id
        2. amount
        3. transaction_date
        
        Statuses:
        - MATCHED: Reference, Amount, and Date match perfectly.
        - AMOUNT_MISMATCH: Reference matches, but Amount differs.
        - DATE_MISMATCH: Reference matches, but Date differs.
        - PARTIAL_MATCH: Reference matches, but both Amount and Date differ.
        - MISSING_IN_BANK: Record exists in External Ledger, not in Bank.
        - MISSING_IN_EXTERNAL: Record exists in Bank, not in External Ledger.
        """
        logger.info(f"Running deterministic matching for session {session_id}...")
        results = []

        # Filter out duplicates from matching pools
        active_bank = [t for t in bank_txs if t.id not in duplicate_ids]
        active_external = [t for t in external_txs if t.id not in duplicate_ids]

        # Convert to dictionary pools keyed by reference for O(N) lookup
        # Since references can repeat (e.g. multi-split payments), keep a list of transactions per reference
        bank_ref_map: Dict[str, List[Transaction]] = {}
        for tx in active_bank:
            if tx.reference:
                ref_key = tx.reference.strip().lower()
                bank_ref_map.setdefault(ref_key, []).append(tx)

        external_ref_map: Dict[str, List[Transaction]] = {}
        for tx in active_external:
            if tx.reference:
                ref_key = tx.reference.strip().lower()
                external_ref_map.setdefault(ref_key, []).append(tx)

        # Set to track matched transaction IDs to avoid double matching
        matched_bank_ids = set()
        matched_external_ids = set()

        # Step 1: Match by reference keys
        for ref_key, bank_list in bank_ref_map.items():
            if ref_key in external_ref_map:
                external_list = external_ref_map[ref_key]

                # We have matching reference IDs. Try to match amount and dates.
                for b_tx in bank_list:
                    best_match = None
                    best_status = "PARTIAL_MATCH"
                    best_score = 40
                    best_remarks = ""

                    for e_tx in external_list:
                        if e_tx.id in matched_external_ids:
                            continue

                        # Check amount match
                        amounts_match = abs(round(b_tx.amount, 2) - abs(round(e_tx.amount, 2))) < 0.01
                        
                        # Check date match (ignoring hours/minutes if it is a general day match)
                        b_date = b_tx.transaction_date.date()
                        e_date = e_tx.transaction_date.date()
                        dates_match = b_date == e_date

                        if amounts_match and dates_match:
                            best_match = e_tx
                            best_status = "MATCHED"
                            best_score = 100
                            best_remarks = "Perfect match on reference, amount, and value date."
                            break
                        elif amounts_match:
                            # Amount matches, but date differs
                            best_match = e_tx
                            best_status = "DATE_MISMATCH"
                            best_score = 75
                            best_remarks = f"Reference and amount match. Date mismatch: Bank={b_date}, Ledger={e_date}."
                        elif dates_match and (best_score < 70):
                            # Date matches, but amount differs
                            best_match = e_tx
                            best_status = "AMOUNT_MISMATCH"
                            best_score = 70
                            best_remarks = f"Reference and date match. Amount mismatch: Bank={b_tx.amount}, Ledger={e_tx.amount}."

                    if best_match:
                        matched_bank_ids.add(b_tx.id)
                        matched_external_ids.add(best_match.id)
                        b_tx.matching_status = "RECONCILIED"
                        best_match.matching_status = "RECONCILIED"

                        results.append(ReconciliationResult(
                            id=str(uuid.uuid4()),
                            session_id=session_id,
                            bank_transaction_id=b_tx.id,
                            ledger_transaction_id=best_match.id,
                            match_score=best_score,
                            match_type=best_status,
                            comments=best_remarks
                        ))

        # Step 2: Handle unmatched bank transactions (Missing in External Ledger)
        for b_tx in active_bank:
            if b_tx.id not in matched_bank_ids:
                b_tx.matching_status = "MANUAL_REVIEW"
                results.append(ReconciliationResult(
                    id=str(uuid.uuid4()),
                    session_id=session_id,
                    bank_transaction_id=b_tx.id,
                    ledger_transaction_id=None,
                    match_score=0,
                    match_type="MISSING_IN_EXTERNAL",
                    comments="Transaction is present in Bank Statement but missing in External Ledger."
                ))

        # Step 3: Handle unmatched external transactions (Missing in Bank Statement)
        for e_tx in active_external:
            if e_tx.id not in matched_external_ids:
                e_tx.matching_status = "MANUAL_REVIEW"
                results.append(ReconciliationResult(
                    id=str(uuid.uuid4()),
                    session_id=session_id,
                    bank_transaction_id=None,
                    ledger_transaction_id=e_tx.id,
                    match_score=0,
                    match_type="MISSING_IN_BANK",
                    comments="Transaction is present in External Ledger but missing in Bank Statement."
                ))

        # Step 4: Include duplicates as standalone results
        # We also need to map bank duplicates and external duplicates as standalone warnings
        for t in bank_txs:
            if t.id in duplicate_ids:
                results.append(ReconciliationResult(
                    id=str(uuid.uuid4()),
                    session_id=session_id,
                    bank_transaction_id=t.id,
                    ledger_transaction_id=None,
                    match_score=10,
                    match_type="DUPLICATE",
                    comments="Duplicate Bank Statement record identified and ignored during main reconciliation."
                ))

        for t in external_txs:
            if t.id in duplicate_ids:
                results.append(ReconciliationResult(
                    id=str(uuid.uuid4()),
                    session_id=session_id,
                    bank_transaction_id=None,
                    ledger_transaction_id=t.id,
                    match_score=10,
                    match_type="DUPLICATE",
                    comments="Duplicate External Ledger record identified and ignored during main reconciliation."
                ))

        logger.info(f"Reconciliation matched {len(results)} total records.")
        return results

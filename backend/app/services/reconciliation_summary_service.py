from typing import List
from app.models.base import Transaction, ReconciliationResult
from app.schemas.reconciliation import ReconciliationSummarySchema
from app.utils.logging import logger

class ReconciliationSummaryService:
    @staticmethod
    def calculate_summary(
        bank_txs: List[Transaction],
        external_txs: List[Transaction],
        results: List[ReconciliationResult]
    ) -> ReconciliationSummarySchema:
        """
        Calculates aggregate statistics from the matching results.
        
        Metrics:
        - total_bank_transactions
        - total_external_transactions
        - matched_count
        - mismatch_count
        - unmatched_count
        - duplicate_count
        - matched_amount
        - unmatched_amount
        """
        logger.info("Computing reconciliation statistics and metric indicators...")

        total_bank = len(bank_txs)
        total_external = len(external_txs)

        matched_count = 0
        mismatch_count = 0
        unmatched_count = 0
        duplicate_count = 0

        matched_amount = 0.0
        unmatched_amount = 0.0

        for res in results:
            m_type = res.match_type

            if m_type == "MATCHED":
                matched_count += 1
                # Add to matched volume
                # Get the bank transaction amount if present, fallback to ledger transaction amount
                if res.bank_transaction:
                    matched_amount += abs(res.bank_transaction.amount)
                elif res.ledger_transaction:
                    matched_amount += abs(res.ledger_transaction.amount)
            elif m_type in ["AMOUNT_MISMATCH", "DATE_MISMATCH", "PARTIAL_MATCH"]:
                mismatch_count += 1
                if res.bank_transaction:
                    unmatched_amount += abs(res.bank_transaction.amount)
                if res.ledger_transaction:
                    unmatched_amount += abs(res.ledger_transaction.amount)
            elif m_type in ["MISSING_IN_BANK", "MISSING_IN_EXTERNAL"]:
                unmatched_count += 1
                if res.bank_transaction:
                    unmatched_amount += abs(res.bank_transaction.amount)
                if res.ledger_transaction:
                    unmatched_amount += abs(res.ledger_transaction.amount)
            elif m_type == "DUPLICATE":
                duplicate_count += 1
                # Duplicates are also treated as unmatched values for safety
                if res.bank_transaction:
                    unmatched_amount += abs(res.bank_transaction.amount)
                elif res.ledger_transaction:
                    unmatched_amount += abs(res.ledger_transaction.amount)

        # Round values to 2 decimal places to prevent float errors
        matched_amount = round(matched_amount, 2)
        unmatched_amount = round(unmatched_amount, 2)

        logger.info(
            f"Metrics completed: Matched={matched_count}, Mismatch={mismatch_count}, "
            f"Unmatched={unmatched_count}, Duplicate={duplicate_count}"
        )

        return ReconciliationSummarySchema(
            total_bank_transactions=total_bank,
            total_external_transactions=total_external,
            matched_count=matched_count,
            mismatch_count=mismatch_count,
            unmatched_count=unmatched_count,
            duplicate_count=duplicate_count,
            matched_amount=matched_amount,
            unmatched_amount=unmatched_amount
        )

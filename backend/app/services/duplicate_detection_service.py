from typing import List, Tuple, Set
from app.models.base import Transaction
from app.utils.logging import logger

class DuplicateDetectionService:
    @staticmethod
    def detect_duplicates(transactions: List[Transaction]) -> Tuple[Set[str], List[Transaction]]:
        """
        Scans a list of transactions to detect duplicates based on:
        - reference_id
        - amount
        - transaction_date
        
        Returns:
        - A set of transaction IDs that are identified as duplicates (i.e. second or subsequent occurrences)
        - The updated transactions list with updated matching status
        """
        logger.info(f"Scanning {len(transactions)} transactions for internal duplicates...")
        seen_keys = set()
        duplicate_ids = set()

        for tx in transactions:
            if not tx.reference:
                # Let's skip empty reference_ids to avoid false duplicates
                continue
                
            # Create a unique logical deduplication key
            # Standardize date to date string (ignoring microsecond noise if any)
            date_str = tx.transaction_date.strftime("%Y-%m-%d %H:%M:%S")
            key = (tx.reference.strip().lower(), round(tx.amount, 2), date_str)

            if key in seen_keys:
                duplicate_ids.add(tx.id)
                tx.matching_status = "DUPLICATE"
                logger.warning(f"Duplicate detected: ID {tx.id} for reference {tx.reference}")
            else:
                seen_keys.add(key)

        return duplicate_ids, transactions

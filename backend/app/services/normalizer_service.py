import pandas as pd
import numpy as np
import re
from typing import Dict, List, Any
from app.core.constants import BANK_COLUMN_MAPPINGS, CANONICAL_KEYS
from app.utils.logging import logger

class NormalizerService:
    """
    Financial Data Normalization Engine.
    Maps heterogeneous bank statement columns into standard canonical structures.
    """

    @classmethod
    def normalize_dataframe(cls, df: pd.DataFrame, source_type: str) -> pd.DataFrame:
        """
        Takes raw spreadsheet DataFrame and normalizes it to our canonical schema format.
        Does not hardcode naming indices. Maps synonyms and sanitizes values.
        """
        logger.info(f"Normalizing raw DataFrame with {len(df)} records. Source: {source_type}")
        
        # Make a copy to avoid mutating the original
        work_df = df.copy()
        
        # 0. Pre-process: Detect and merge split debit/credit amount columns
        #    Many bank statements use separate debit_amount/credit_amount columns
        #    instead of a single 'amount' column. We must merge them before mapping.
        work_df = cls._merge_split_amounts(work_df)
        
        # 1. Map columns using synonyms whitelists
        mapped_cols = cls._map_headers(work_df.columns.tolist())
        work_df.rename(columns=mapped_cols, inplace=True)
        
        # 2. Allocate canonical columns if missing
        for key in CANONICAL_KEYS:
            if key not in work_df.columns:
                work_df[key] = None
                
        # 3. Restructure DataFrame to include ONLY canonical keys + keep record source
        canonical_df = work_df[CANONICAL_KEYS].copy()
        canonical_df["source"] = source_type
        
        # 4. Standardize Whitespace on all string columns
        for col in ["transaction_id", "reference_id", "description", "transaction_type"]:
            canonical_df[col] = canonical_df[col].astype(str).str.strip()
            # Restore true nulls
            canonical_df.loc[canonical_df[col].isin(["nan", "None", "NAT", "<NA>", ""]), col] = None

        # 5. Normalize Date Strings to uniform ISO strings
        canonical_df["date"] = cls._normalize_dates(canonical_df["date"])

        # 6. Normalize Amount Values to float elements
        canonical_df["amount"] = cls._normalize_amounts(canonical_df["amount"])
        
        logger.info(f"DataFrame normalized successfully. Columns mapped: {mapped_cols}")
        return canonical_df

    @staticmethod
    def _merge_split_amounts(df: pd.DataFrame) -> pd.DataFrame:
        """
        Detects when a file uses split debit/credit columns instead of a unified 'amount' column.
        Merges them into a single 'amount' column: amount = debit + credit (filling NaN with 0).
        
        Common patterns detected:
        - debit_amount / credit_amount
        - debit / credit
        - withdrawal / deposit
        - dr_amount / cr_amount
        """
        col_lower_map = {c.strip().lower().replace(" ", "_").replace("-", "_"): c for c in df.columns}
        
        # Check if a clean 'amount' column already exists — if so, no merging needed
        if 'amount' in col_lower_map:
            return df
        
        # Define known debit/credit column pairs
        debit_synonyms = ['debit_amount', 'debit', 'withdrawal', 'dr_amount', 'withdrawals']
        credit_synonyms = ['credit_amount', 'credit', 'deposit', 'cr_amount', 'deposits']
        
        debit_col = None
        credit_col = None
        
        for syn in debit_synonyms:
            if syn in col_lower_map:
                debit_col = col_lower_map[syn]
                break
                
        for syn in credit_synonyms:
            if syn in col_lower_map:
                credit_col = col_lower_map[syn]
                break
        
        if debit_col and credit_col:
            logger.info(f"Detected split amount columns: debit='{debit_col}', credit='{credit_col}'. Merging into unified 'amount'.")
            df[debit_col] = pd.to_numeric(df[debit_col], errors='coerce').fillna(0.0)
            df[credit_col] = pd.to_numeric(df[credit_col], errors='coerce').fillna(0.0)
            df['amount'] = df[debit_col] + df[credit_col]
            # Drop the original split columns to prevent them from winning synonym mapping
            df = df.drop(columns=[debit_col, credit_col])
        elif debit_col and not credit_col:
            logger.info(f"Detected single debit column: '{debit_col}'. Using as 'amount'.")
            df['amount'] = pd.to_numeric(df[debit_col], errors='coerce').fillna(0.0)
            df = df.drop(columns=[debit_col])
        elif credit_col and not debit_col:
            logger.info(f"Detected single credit column: '{credit_col}'. Using as 'amount'.")
            df['amount'] = pd.to_numeric(df[credit_col], errors='coerce').fillna(0.0)
            df = df.drop(columns=[credit_col])
        
        return df

    @staticmethod
    def _map_headers(columns: List[str]) -> Dict[str, str]:
        """
        Scans columns and Renames them based on synonyms list matching.
        """
        mapped_result = {}
        for canonical_key, synonyms in BANK_COLUMN_MAPPINGS.items():
            for col in columns:
                clean_col = str(col).strip().lower().replace(" ", "_").replace("-", "_")
                # Look for direct match or substring in synonyms list
                if clean_col in [s.lower() for s in synonyms] or clean_col == canonical_key:
                    mapped_result[col] = canonical_key
                    break
        return mapped_result

    @staticmethod
    def _normalize_dates(date_series: pd.Series) -> pd.Series:
        """
        Pipes date elements and maps them to clean ISO format strings 'YYYY-MM-DD HH:MM:SS'.
        """
        def parse_date(val: Any) -> Any:
            if pd.isna(val) or val is None or str(val).strip() in ["", "nan", "None"]:
                return None
            try:
                # Use pandas automatic datetime parser
                parsed_dt = pd.to_datetime(val, errors="coerce")
                if pd.isna(parsed_dt):
                    return None
                return parsed_dt.strftime("%Y-%m-%d %H:%M:%S")
            except Exception:
                return None

        return date_series.apply(parse_date)

    @staticmethod
    def _normalize_amounts(amount_series: pd.Series) -> pd.Series:
        """
        Converts text currency expressions (e.g. '$1,250.00 Cr', '(350.00)') to clean float values.
        """
        def parse_amount(val: Any) -> float:
            if pd.isna(val) or val is None:
                return 0.0
            
            val_str = str(val).strip()
            if val_str in ["", "nan", "None"]:
                return 0.0

            # Check if it has a negative visual signizer (e.g. parenthesis or minus)
            is_negative = False
            if val_str.startswith("(") and val_str.endswith(")"):
                is_negative = True
            elif val_str.startswith("-"):
                is_negative = True
            elif "dr" in val_str.lower():
                is_negative = True

            # Extract numeric segments using regex, ignoring commas and currency signs
            cleaned_num = re.sub(r"[^\d\.]", "", val_str)
            if not cleaned_num:
                return 0.0

            try:
                amount_float = float(cleaned_num)
                return -amount_float if is_negative else amount_float
            except ValueError:
                return 0.0

        return amount_series.apply(parse_amount).astype(float)

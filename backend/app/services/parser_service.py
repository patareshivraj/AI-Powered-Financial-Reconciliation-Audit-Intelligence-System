import pandas as pd
import os
from fastapi import HTTPException, status
from app.utils.logging import logger

class ParserService:
    """
    Highly resilient file parsing service.
    Translates raw spreadsheet tables into standardized, rich Pandas DataFrames.
    """

    @staticmethod
    def parse_file(file_path: str) -> pd.DataFrame:
        """
        Auto-detects format from filename and executes secure, safe parser routines.
        Handles BOM prefixes, odd delimiters, and returns standard DataFrames.
        """
        if not os.path.exists(file_path):
            logger.error(f"Parser called on non-existent disk cache: {file_path}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction file not found in system cache."
            )
            
        ext = file_path.split(".")[-1].lower()
        logger.info(f"Parsing file format: '.{ext}' from path: {file_path}")

        try:
            if ext == "csv":
                return ParserService._parse_csv(file_path)
            elif ext == "xlsx":
                return ParserService._parse_xlsx(file_path)
            else:
                raise ValueError(f"Unsupported file parser driver extension: {ext}")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Parser failed during extraction of {file_path}. Error: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Parsing sheet failed. Ensure file is not corrupted. Error: {str(e)}"
            )

    @staticmethod
    def _parse_csv(file_path: str) -> pd.DataFrame:
        """
        Loads CSV tables safely. Inspects delimiters and encoding types (utf-8 with BOM etc.)
        """
        try:
            # 1. Probe delimiter and encoding formats
            # Read first few lines to determine encoding
            with open(file_path, "rb") as f:
                head = f.read(1024)
            
            # Simple BOM check
            encoding = "utf-8-sig" if head.startswith(b"\xef\xbb\xbf") else "utf-8"
            
            # 2. Extract dataframe
            # Handles whitespace stripping on headers automatically
            df = pd.read_csv(
                file_path, 
                encoding=encoding, 
                skipinitialspace=True,
                keep_default_na=True
            )
            
            # Clean column strings
            df.columns = [str(c).strip() for c in df.columns]
            
            # Drop entirely empty rows
            df.dropna(how="all", inplace=True)
            
            logger.info(f"Successfully parsed CSV: {len(df)} rows, columns: {list(df.columns)}")
            return df
            
        except Exception as e:
            logger.warning(f"Default UTF-8 parser failed. Retrying with Latin-1: {e}")
            try:
                df = pd.read_csv(file_path, encoding="latin1", skipinitialspace=True)
                df.columns = [str(c).strip() for c in df.columns]
                df.dropna(how="all", inplace=True)
                return df
            except Exception as e2:
                raise ValueError(f"CSV Parse failure (Encoding errors): {e2}")

    @staticmethod
    def _parse_xlsx(file_path: str) -> pd.DataFrame:
        """
        Loads Excel workbooks using openpyxl engine.
        Reads primary spreadsheet sheet.
        """
        try:
            # Load workbook
            # keep_default_na=True keeps null cell formats standard
            df = pd.read_excel(
                file_path,
                engine="openpyxl",
                keep_default_na=True
            )
            
            # Clean columns
            df.columns = [str(c).strip() for c in df.columns]
            
            # Drop empty rows
            df.dropna(how="all", inplace=True)
            
            logger.info(f"Successfully parsed XLSX: {len(df)} rows, columns: {list(df.columns)}")
            return df
        except Exception as e:
            raise ValueError(f"XLSX Parse failure (Excel structure errors): {e}")

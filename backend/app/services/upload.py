import os
import shutil
from fastapi import UploadFile, HTTPException, status
from app.core.config import settings
from app.utils.logging import logger

class UploadService:
    """
    Fintech-grade upload safety-handling service.
    Enforces size boundaries, extension whitelist, and folder integrity checks.
    """
    
    @staticmethod
    def initialize_upload_folders() -> None:
        """
        Guarantees that upload and report output directories exist in local paths.
        """
        for directory in [settings.UPLOAD_DIR, settings.REPORTS_DIR]:
            try:
                if not os.path.exists(directory):
                    logger.info(f"Creating missing directory pathway: {directory}")
                    os.makedirs(directory, exist_ok=True)
                else:
                    logger.debug(f"Confirmed pathway presence: {directory}")
            except Exception as e:
                logger.error(f"Critical failure creating pathway: {directory}. Error: {e}")
                raise SystemError(f"Directory pathway creation failed: {e}")

    @staticmethod
    def validate_file_metadata(file: UploadFile) -> None:
        """
        Performs thorough validation checks against incoming file streams.
        Ensures strict compliance with file extensions, sizes, and formats.
        """
        if not file.filename:
            logger.warning("Empty filename parameter received.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Transaction file upload rejected: No filename provided."
            )
            
        # 1. Extension Verification
        file_ext = file.filename.split(".")[-1].lower()
        if file_ext not in settings.ALLOWED_EXTENSIONS:
            logger.warning(f"Rejected illegal file extension: '.{file_ext}' for file {file.filename}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported format '.{file_ext}'. Allowed formats: {settings.ALLOWED_EXTENSIONS}"
            )
            
        # 2. File Size Verification (Pre-check using Content-Length headers)
        # Note: True bytes verification is also done during stream piping
        content_length = file.headers.get("content-length")
        if content_length:
            try:
                size_bytes = int(content_length)
                if size_bytes > settings.MAX_UPLOAD_SIZE:
                    logger.warning(f"File {file.filename} size ({size_bytes}B) exceeds threshold limits.")
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File exceeds maximum upload boundary of {settings.MAX_UPLOAD_SIZE / (1024*1024):.0f}MB."
                    )
            except ValueError:
                pass

    @classmethod
    def save_uploaded_file(cls, file: UploadFile, subfolder: str = "") -> str:
        """
        Safely pipes the uploaded file stream into local disk storage under
        validated pathways. Prevents payload inflation attacks.
        """
        cls.validate_file_metadata(file)
        
        # Construct absolute pathway safely
        target_dir = os.path.abspath(os.path.join(settings.UPLOAD_DIR, subfolder))
        os.makedirs(target_dir, exist_ok=True)
        
        # Clean filename to avoid path traversal exploits
        safe_filename = os.path.basename(file.filename)
        file_path = os.path.join(target_dir, safe_filename)
        
        logger.info(f"Piping transaction file stream to disk path: {file_path}")
        
        total_bytes = 0
        try:
            with open(file_path, "wb") as buffer:
                # Read chunks sequentially to minimize memory footprint
                while chunk := file.file.read(1024 * 1024):  # 1MB Chunks
                    total_bytes += len(chunk)
                    if total_bytes > settings.MAX_UPLOAD_SIZE:
                        logger.warning(f"Pipe stream bounds exceeded for: {safe_filename}")
                        # Remove half-written corrupted file
                        if os.path.exists(file_path):
                            os.remove(file_path)
                        raise HTTPException(
                            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail="Upload payload exceeded maximum safe stream boundary."
                        )
                    buffer.write(chunk)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to pipe upload stream: {e}")
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Could not safely persist file upload: {e}"
            )
            
        logger.info(f"Successfully committed file upload: {safe_filename} ({total_bytes} bytes written)")
        return file_path

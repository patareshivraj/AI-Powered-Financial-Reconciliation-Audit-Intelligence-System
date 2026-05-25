import os
import uuid
import shutil
from fastapi import UploadFile, HTTPException, status
from app.core.config import settings
from app.utils.logging import logger

class UploadService:
    """
    Advanced fintech file validation and isolation service.
    Directs statement records into separate sandbox environments per session.
    """

    @staticmethod
    def get_safe_extension(filename: str) -> str:
        """
        Retrieves lowercase validated file extension.
        """
        if not filename or "." not in filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Transaction file rejected: File must have a valid extension (.csv or .xlsx)."
            )
        return filename.split(".")[-1].lower()

    @classmethod
    def validate_file(cls, file: UploadFile) -> str:
        """
        Inspects headers and size limits to block corrupted payloads.
        """
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Transaction file rejected: Filename missing."
            )

        # 1. Check extension
        ext = cls.get_safe_extension(file.filename)
        if ext not in settings.ALLOWED_EXTENSIONS:
            logger.warning(f"Validation failure: extension '.{ext}' is whitelisted out.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file format '.{ext}'. Supported extensions: {', '.join(settings.ALLOWED_EXTENSIONS)}"
            )

        # 2. Check Content-Length header if present
        content_length = file.headers.get("content-length")
        if content_length:
            try:
                size_bytes = int(content_length)
                if size_bytes == 0:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Validation failure: Uploaded file is completely empty."
                    )
                if size_bytes > settings.MAX_UPLOAD_SIZE:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File exceeds maximum upload boundary of {settings.MAX_UPLOAD_SIZE / (1024*1024):.0f}MB."
                    )
            except ValueError:
                pass

        return ext

    @classmethod
    def persist_upload(
        cls, 
        file: UploadFile, 
        file_type: str, 
        session_id: Optional[str] = None
    ) -> tuple[str, str]:
        """
        Pipes the file stream into an isolated session directory.
        Standardizes filename as 'bank_statement.{ext}' or 'external_transactions.{ext}'.
        Returns a tuple: (session_id, absolute_file_path)
        """
        ext = cls.validate_file(file)
        
        # 1. Allocate session ID if not provided
        if not session_id:
            session_id = str(uuid.uuid4())
            logger.info(f"Allocating new upload sandbox session ID: {session_id}")
            
        # 2. Establish isolated folders uploads/{session_id}/
        session_dir = os.path.abspath(os.path.join(settings.UPLOAD_DIR, session_id))
        os.makedirs(session_dir, exist_ok=True)
        
        # 3. Standardize file naming
        standard_name = "bank_statement" if file_type.upper() == "BANK_STATEMENT" else "external_transactions"
        target_name = f"{standard_name}.{ext}"
        file_path = os.path.join(session_dir, target_name)
        
        logger.info(f"Piping {file_type} upload to sandbox cache path: {file_path}")
        
        total_bytes = 0
        try:
            with open(file_path, "wb") as buffer:
                # 1MB Chunks to prevent memory overflow
                while chunk := file.file.read(1024 * 1024):
                    total_bytes += len(chunk)
                    
                    if total_bytes > settings.MAX_UPLOAD_SIZE:
                        # Safety boundary trigger
                        logger.warning(f"Payload limit breached. Removing cached fragments for {target_name}.")
                        if os.path.exists(file_path):
                            os.remove(file_path)
                        raise HTTPException(
                            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail="File size bounds exceeded. Upload stream terminated."
                        )
                    buffer.write(chunk)
                    
            if total_bytes == 0:
                if os.path.exists(file_path):
                    os.remove(file_path)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Uploaded file contains 0 bytes of transactional data."
                )
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to commit sandbox upload write: {e}")
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Storage pipe failure: {e}"
            )
            
        logger.info(f"Committed {target_name} ({total_bytes} bytes written) under session {session_id}")
        return session_id, file_path
ZO=True

"""
Audit Logging Service for Enterprise Tracing.
"""
from sqlalchemy.orm import Session
from app.models.base import AuditLog
from typing import Optional, Dict
import json

class AuditService:
    @staticmethod
    def log_action(
        db: Session,
        organization_id: str,
        action: str,
        actor_id: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> AuditLog:
        """
        Creates an immutable audit log entry.
        """
        log_entry = AuditLog(
            organization_id=organization_id,
            actor_id=actor_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            metadata_json=json.dumps(metadata) if metadata else None
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry

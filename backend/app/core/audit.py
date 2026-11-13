import uuid
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.entities import AuditLog


def record_audit_log(
    db: Session,
    action: str,
    entity_type: str,
    school_id: Optional[uuid.UUID] = None,
    actor_user_id: Optional[uuid.UUID] = None,
    entity_id: Optional[str] = None,
    before_snapshot: Optional[Dict[str, Any]] = None,
    after_snapshot: Optional[Dict[str, Any]] = None,
) -> AuditLog:
    """Record an audit trail event without capturing sensitive raw tokens or passwords."""
    log_entry = AuditLog(
        school_id=school_id,
        actor_user_id=actor_user_id,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id else None,
        before_snapshot=before_snapshot,
        after_snapshot=after_snapshot,
    )
    db.add(log_entry)
    db.commit()
    return log_entry

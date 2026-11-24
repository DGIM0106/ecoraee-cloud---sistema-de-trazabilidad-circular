from datetime import datetime, timezone
from typing import Optional
from uuid import UUID
from sqlmodel import Session, select
from models.model_network import ModelAuditoria
from models.model_users import ModelUsuario


def registrar_auditoria(
    session: Session,
    tabla_afectada: str,
    tipo_operacion: str,
    detalle: str,
    id_usuario: Optional[UUID] = None,
):
    """
    Registra una entrada en la tabla AUDITORIA con UUID para mantener la trazabilidad
    de las operaciones INSERT, UPDATE y DELETE del sistema.
    """
    try:
        resolved_user_id = id_usuario
        if resolved_user_id is None:
            primer_usuario = session.exec(select(ModelUsuario)).first()
            resolved_user_id = primer_usuario.id_usuario if primer_usuario else None

        auditoria = ModelAuditoria(
            fecha_accion=datetime.now(timezone.utc),
            tabla_afectada=tabla_afectada[:60],
            tipo_operacion=tipo_operacion[:20],
            detalle=detalle[:500],
            id_usuario=resolved_user_id,
        )
        session.add(auditoria)
    except Exception as e:
        print(f"Aviso al registrar auditoria: {e}")

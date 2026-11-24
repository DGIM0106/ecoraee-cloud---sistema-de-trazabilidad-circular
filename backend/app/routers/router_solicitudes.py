from datetime import datetime, timezone
from typing import List
from uuid import UUID
from fastapi import APIRouter, HTTPException, status
from sqlmodel import select, desc
from MyDbContext import SessionDep
from models.model_catalogs import ModelCentro
from models.model_traceability import ModelSolicitud, ModelLote, ModelDispositivo
from dtos.dto_common import MessageResponseDTO
from dtos.dto_traceability import (
    SolicitudCreateDTO,
    SolicitudUpdateDTO,
    SolicitudResponseDTO,
    LoteCreateDTO,
    LoteResumenDTO,
    LoteResponseDTO,
)
from services.audit_service import registrar_auditoria

solicitudes = APIRouter(prefix="/solicitudes", tags=["Solicitudes y Lotes"])

ESTADOS_SOLICITUD_VALIDOS = {"Pendiente", "Asignada", "En Recoleccion", "Finalizada"}


@solicitudes.get("/", response_model=List[SolicitudResponseDTO])
def listar_solicitudes(session: SessionDep):
    centros = {c.id_centro: c for c in session.exec(select(ModelCentro)).all()}
    lotes_all = session.exec(select(ModelLote)).all()
    dispositivos_all = session.exec(select(ModelDispositivo)).all()

    disp_por_lote = {}
    for d in dispositivos_all:
        disp_por_lote[d.id_lote] = disp_por_lote.get(d.id_lote, 0) + 1

    lotes_por_sol = {}
    for l in lotes_all:
        lotes_por_sol.setdefault(l.id_solicitud, []).append(
            LoteResumenDTO(
                id_lote=l.id_lote,
                codigo_lote=l.codigo_lote,
                fecha_creacion=l.fecha_creacion,
                id_solicitud=l.id_solicitud,
                total_dispositivos=disp_por_lote.get(l.id_lote, 0),
            )
        )

    sols = session.exec(
        select(ModelSolicitud).order_by(desc(ModelSolicitud.fecha_solicitud))
    ).all()
    resultado = []
    for s in sols:
        c = centros.get(s.id_centro)
        lotes_sol = lotes_por_sol.get(s.id_solicitud, [])
        total_equipos = sum(item.total_dispositivos for item in lotes_sol)
        resultado.append(
            SolicitudResponseDTO(
                id_solicitud=s.id_solicitud,
                codigo_solicitud=s.codigo_solicitud,
                fecha_solicitud=s.fecha_solicitud,
                estado_recoleccion=s.estado_recoleccion,
                id_centro=s.id_centro,
                nombre_centro=c.nombre_centro if c else "Centro desconocido",
                codigo_centro=c.codigo_centro if c else "",
                lotes=lotes_sol,
                total_lotes=len(lotes_sol),
                total_dispositivos=total_equipos,
            )
        )
    return resultado


@solicitudes.post("/", status_code=status.HTTP_201_CREATED, response_model=SolicitudResponseDTO)
def crear_solicitud(data: SolicitudCreateDTO, session: SessionDep):
    if data.estado_recoleccion not in ESTADOS_SOLICITUD_VALIDOS:
        raise HTTPException(
            status_code=400,
            detail=f"Estado inválido. Valores permitidos: {', '.join(ESTADOS_SOLICITUD_VALIDOS)}",
        )

    codigo_clean = data.codigo_solicitud.strip()
    existente = session.exec(
        select(ModelSolicitud).where(ModelSolicitud.codigo_solicitud == codigo_clean)
    ).first()
    if existente:
        raise HTTPException(status_code=400, detail="El código de solicitud ya se encuentra registrado.")

    centro = session.get(ModelCentro, data.id_centro)
    if not centro:
        raise HTTPException(status_code=404, detail="El centro de recepción indicado no existe.")

    nueva = ModelSolicitud(
        codigo_solicitud=codigo_clean,
        fecha_solicitud=datetime.now(timezone.utc),
        estado_recoleccion=data.estado_recoleccion,
        id_centro=data.id_centro,
    )
    session.add(nueva)
    registrar_auditoria(
        session,
        tabla_afectada="SOLICITUD",
        tipo_operacion="INSERT",
        detalle=f"Creación de solicitud {nueva.codigo_solicitud} en centro {centro.nombre_centro}",
        id_usuario=data.id_usuario,
    )
    session.commit()
    session.refresh(nueva)
    return SolicitudResponseDTO(
        id_solicitud=nueva.id_solicitud,
        codigo_solicitud=nueva.codigo_solicitud,
        fecha_solicitud=nueva.fecha_solicitud,
        estado_recoleccion=nueva.estado_recoleccion,
        id_centro=nueva.id_centro,
        nombre_centro=centro.nombre_centro,
        codigo_centro=centro.codigo_centro,
        lotes=[],
        total_lotes=0,
        total_dispositivos=0,
    )


@solicitudes.put("/{id_solicitud}", response_model=SolicitudResponseDTO)
def actualizar_solicitud(id_solicitud: UUID, data: SolicitudUpdateDTO, session: SessionDep):
    sol = session.get(ModelSolicitud, id_solicitud)
    if not sol:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada.")

    if data.estado_recoleccion is not None:
        if data.estado_recoleccion not in ESTADOS_SOLICITUD_VALIDOS:
            raise HTTPException(
                status_code=400,
                detail=f"Estado inválido. Valores permitidos: {', '.join(ESTADOS_SOLICITUD_VALIDOS)}",
            )
        sol.estado_recoleccion = data.estado_recoleccion

    if data.id_centro is not None:
        centro = session.get(ModelCentro, data.id_centro)
        if not centro:
            raise HTTPException(status_code=404, detail="Centro no encontrado.")
        sol.id_centro = data.id_centro

    session.add(sol)
    registrar_auditoria(
        session,
        tabla_afectada="SOLICITUD",
        tipo_operacion="UPDATE",
        detalle=f"Actualización de solicitud {sol.codigo_solicitud} a estado '{sol.estado_recoleccion}'",
        id_usuario=data.id_usuario,
    )
    session.commit()
    session.refresh(sol)
    centro = session.get(ModelCentro, sol.id_centro)
    return SolicitudResponseDTO(
        id_solicitud=sol.id_solicitud,
        codigo_solicitud=sol.codigo_solicitud,
        fecha_solicitud=sol.fecha_solicitud,
        estado_recoleccion=sol.estado_recoleccion,
        id_centro=sol.id_centro,
        nombre_centro=centro.nombre_centro if centro else "",
        codigo_centro=centro.codigo_centro if centro else "",
    )


@solicitudes.delete("/{id_solicitud}", response_model=MessageResponseDTO)
def eliminar_solicitud(id_solicitud: UUID, session: SessionDep):
    sol = session.get(ModelSolicitud, id_solicitud)
    if not sol:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada.")
    try:
        codigo = sol.codigo_solicitud
        session.delete(sol)
        registrar_auditoria(
            session,
            tabla_afectada="SOLICITUD",
            tipo_operacion="DELETE",
            detalle=f"Eliminación de solicitud {codigo}",
        )
        session.commit()
        return MessageResponseDTO(message=f"Solicitud {codigo} eliminada correctamente.")
    except Exception:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede eliminar la solicitud porque tiene lotes vinculados.",
        )


@solicitudes.get("/lotes", response_model=List[LoteResponseDTO])
def listar_lotes(session: SessionDep):
    sols = {s.id_solicitud: s for s in session.exec(select(ModelSolicitud)).all()}
    centros = {c.id_centro: c for c in session.exec(select(ModelCentro)).all()}
    dispositivos = session.exec(select(ModelDispositivo)).all()

    conteo = {}
    for d in dispositivos:
        conteo[d.id_lote] = conteo.get(d.id_lote, 0) + 1

    lotes = session.exec(select(ModelLote).order_by(desc(ModelLote.fecha_creacion))).all()
    resultado = []
    for l in lotes:
        sol = sols.get(l.id_solicitud)
        centro = centros.get(sol.id_centro) if sol else None
        resultado.append(
            LoteResponseDTO(
                id_lote=l.id_lote,
                codigo_lote=l.codigo_lote,
                fecha_creacion=l.fecha_creacion,
                id_solicitud=l.id_solicitud,
                codigo_solicitud=sol.codigo_solicitud if sol else "",
                estado_recoleccion=sol.estado_recoleccion if sol else "",
                id_centro=sol.id_centro if sol else None,
                nombre_centro=centro.nombre_centro if centro else "",
                total_dispositivos=conteo.get(l.id_lote, 0),
            )
        )
    return resultado


@solicitudes.post("/lotes", status_code=status.HTTP_201_CREATED, response_model=LoteResponseDTO)
def crear_lote(data: LoteCreateDTO, session: SessionDep):
    codigo_clean = data.codigo_lote.strip()
    existente = session.exec(
        select(ModelLote).where(ModelLote.codigo_lote == codigo_clean)
    ).first()
    if existente:
        raise HTTPException(status_code=400, detail="El código de lote ya existe.")

    sol = session.get(ModelSolicitud, data.id_solicitud)
    if not sol:
        raise HTTPException(status_code=404, detail="La solicitud asociada no existe.")

    centro = session.get(ModelCentro, sol.id_centro)

    nuevo = ModelLote(
        codigo_lote=codigo_clean,
        fecha_creacion=datetime.now(timezone.utc),
        id_solicitud=data.id_solicitud,
    )
    session.add(nuevo)
    registrar_auditoria(
        session,
        tabla_afectada="LOTE",
        tipo_operacion="INSERT",
        detalle=f"Creación de lote {nuevo.codigo_lote} vinculado a solicitud {sol.codigo_solicitud}",
        id_usuario=data.id_usuario,
    )
    session.commit()
    session.refresh(nuevo)
    return LoteResponseDTO(
        id_lote=nuevo.id_lote,
        codigo_lote=nuevo.codigo_lote,
        fecha_creacion=nuevo.fecha_creacion,
        id_solicitud=nuevo.id_solicitud,
        codigo_solicitud=sol.codigo_solicitud,
        estado_recoleccion=sol.estado_recoleccion,
        id_centro=sol.id_centro,
        nombre_centro=centro.nombre_centro if centro else "",
        total_dispositivos=0,
    )


@solicitudes.delete("/lotes/{id_lote}", response_model=MessageResponseDTO)
def eliminar_lote(id_lote: UUID, session: SessionDep):
    lote = session.get(ModelLote, id_lote)
    if not lote:
        raise HTTPException(status_code=404, detail="Lote no encontrado.")
    try:
        codigo = lote.codigo_lote
        session.delete(lote)
        registrar_auditoria(
            session,
            tabla_afectada="LOTE",
            tipo_operacion="DELETE",
            detalle=f"Eliminación de lote {codigo}",
        )
        session.commit()
        return MessageResponseDTO(message=f"Lote {codigo} eliminado correctamente.")
    except Exception:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede eliminar el lote porque contiene dispositivos registrados.",
        )

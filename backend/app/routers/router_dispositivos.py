from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, HTTPException, status, Form, File, UploadFile
from sqlmodel import select, desc
from MyDbContext import SessionDep
from models.model_users import ModelUsuario, ModelRol
from models.model_catalogs import (
    ModelCentro,
    ModelCategoria,
    ModelObjeto,
    ModelCondicion,
    ModelEstadoCatalogo,
)
from models.model_traceability import (
    ModelSolicitud,
    ModelLote,
    ModelDispositivo,
    ModelEvaluacionTecnica,
    ModelHistorialEstados,
    ModelTransferenciaMovimiento,
    ModelTratamiento,
    ModelEvidencia,
    ModelInventario,
)
from dtos.dto_common import MessageResponseDTO
from dtos.dto_traceability import (
    DispositivoCreateDTO,
    DispositivoUpdateDTO,
    DispositivoResponseDTO,
    DispositivoDetalleResponseDTO,
    EvaluacionCreateDTO,
    EvaluacionUpdateDTO,
    EvaluacionResponseDTO,
    HistorialEstadoResponseDTO,
    TransferenciaCreateDTO,
    TransferenciaUpdateDTO,
    TransferenciaResponseDTO,
    TratamientoResponseDTO,
    EvidenciaResponseDTO,
)
from services.s3_service import upload_evidence_file, delete_evidence_file, BACKEND_BASE_URL
from services.audit_service import registrar_auditoria

dispositivos = APIRouter(prefix="/dispositivos", tags=["Dispositivos y Trazabilidad RAEE"])

CLASIFICACIONES_VALIDAS = {
    "Reutilizacion",
    "Reacondicionamiento",
    "Reciclaje",
    "Disposicion Final",
}

ESTADOS_TRANSFERENCIA_VALIDOS = {"En Transito", "Entregado", "Cancelado"}

ROLES_EVALUADORES = {
    "Tecnico Clasificador",
    "Técnico Evaluador RAEE",
    "Administrador del Sistema",
}


def _obtener_estado_por_orden(session: SessionDep, orden: int) -> ModelEstadoCatalogo:
    estado = session.exec(
        select(ModelEstadoCatalogo).where(ModelEstadoCatalogo.orden == orden)
    ).first()
    if not estado:
        estado = session.exec(select(ModelEstadoCatalogo)).first()
    if not estado:
        raise HTTPException(
            status_code=500,
            detail="El catálogo ESTADO_CATALOGO no está inicializado en la base de datos.",
        )
    return estado


def _agregar_estado_historial(
    session: SessionDep,
    id_dispositivo: UUID,
    orden_estado: int,
    observacion: str,
):
    estado = _obtener_estado_por_orden(session, orden_estado)
    historial_actual = session.exec(
        select(ModelHistorialEstados)
        .where(ModelHistorialEstados.id_dispositivo == id_dispositivo)
        .order_by(desc(ModelHistorialEstados.id_secuencia))
    ).first()
    nueva_secuencia = (historial_actual.id_secuencia + 1) if historial_actual else 1

    nuevo_hist = ModelHistorialEstados(
        id_dispositivo=id_dispositivo,
        id_secuencia=nueva_secuencia,
        id_estado=estado.id_estado,
        fecha_cambio=datetime.now(timezone.utc),
        observacion=observacion[:250] if observacion else None,
    )
    session.add(nuevo_hist)


def _ajustar_inventario(session: SessionDep, id_centro: UUID, id_categoria: UUID, delta: int):
    inv = session.exec(
        select(ModelInventario).where(
            ModelInventario.id_centro == id_centro,
            ModelInventario.id_categoria == id_categoria,
        )
    ).first()
    ahora = datetime.now(timezone.utc)
    if inv:
        inv.stock_actual = max(0, inv.stock_actual + delta)
        inv.fecha_actualizacion = ahora
        session.add(inv)
    elif delta > 0:
        nuevo_inv = ModelInventario(
            stock_actual=delta,
            fecha_actualizacion=ahora,
            id_centro=id_centro,
            id_categoria=id_categoria,
        )
        session.add(nuevo_inv)


def _build_dispositivo_dto(
    d: ModelDispositivo,
    objeto: Optional[ModelObjeto],
    cat: Optional[ModelCategoria],
    lote: Optional[ModelLote],
    sol: Optional[ModelSolicitud],
    centro: Optional[ModelCentro],
    ult: Optional[ModelHistorialEstados],
    estados_cat: dict,
    conteo_pasos: int,
    ev: Optional[ModelEvaluacionTecnica],
    condiciones: dict,
    usuarios: dict,
    trat: Optional[ModelTratamiento],
    evidencias: List[EvidenciaResponseDTO],
) -> DispositivoResponseDTO:
    return DispositivoResponseDTO(
        id_dispositivo=d.id_dispositivo,
        num_serie=d.num_serie,
        id_objeto=d.id_objeto,
        codigo_objeto=objeto.codigo_objeto if objeto else "",
        nombre_objeto=objeto.nombre_objeto if objeto else "Objeto sin catálogo",
        marca=objeto.marca if objeto else "",
        modelo=objeto.modelo if objeto else "",
        id_categoria=d.id_categoria,
        nombre_categoria=cat.nombre_categoria if cat else "Sin Categoría",
        id_lote=d.id_lote,
        codigo_lote=lote.codigo_lote if lote else "",
        id_solicitud=sol.id_solicitud if sol else None,
        codigo_solicitud=sol.codigo_solicitud if sol else "",
        id_centro_actual=centro.id_centro if centro else None,
        nombre_centro=centro.nombre_centro if centro else "Centro no asignado",
        codigo_centro=centro.codigo_centro if centro else "",
        id_estado_actual=ult.id_estado if ult else None,
        estado_actual=estados_cat.get(ult.id_estado, "Recibido en Centro") if ult else "Recibido en Centro",
        fecha_registro=d.fecha_registro,
        fecha_ultimo_estado=ult.fecha_cambio if ult else None,
        total_eventos_historial=conteo_pasos,
        evaluacion=(
            EvaluacionResponseDTO(
                id_evaluacion=ev.id_evaluacion,
                fecha_evaluacion=ev.fecha_evaluacion,
                diagnostico=ev.diagnostico,
                clasificacion_tecnica=ev.clasificacion_tecnica,
                id_dispositivo=ev.id_dispositivo,
                id_condicion=ev.id_condicion,
                descripcion_condicion=condiciones.get(ev.id_condicion, ""),
                id_usuario_evaluador=ev.id_usuario_evaluador,
                nombre_evaluador=usuarios.get(ev.id_usuario_evaluador, ""),
            )
            if ev
            else None
        ),
        tratamiento=(
            TratamientoResponseDTO(
                id_tratamiento=trat.id_tratamiento,
                resultado=trat.resultado,
                destino=trat.destino,
                fecha_cierre=trat.fecha_cierre,
                id_dispositivo=trat.id_dispositivo,
                evidencias=evidencias,
            )
            if trat
            else None
        ),
    )


@dispositivos.get("/", response_model=List[DispositivoResponseDTO])
def listar_dispositivos(session: SessionDep):
    categorias = {c.id_categoria: c for c in session.exec(select(ModelCategoria)).all()}
    objetos = {o.id_objeto: o for o in session.exec(select(ModelObjeto)).all()}
    lotes = {l.id_lote: l for l in session.exec(select(ModelLote)).all()}
    solicitudes_map = {s.id_solicitud: s for s in session.exec(select(ModelSolicitud)).all()}
    centros = {c.id_centro: c for c in session.exec(select(ModelCentro)).all()}
    estados_cat = {e.id_estado: e.nombre_estado for e in session.exec(select(ModelEstadoCatalogo)).all()}
    condiciones = {c.id_condicion: c.descripcion_condicion for c in session.exec(select(ModelCondicion)).all()}
    usuarios = {u.id_usuario: u.nombre for u in session.exec(select(ModelUsuario)).all()}

    evaluaciones = {
        ev.id_dispositivo: ev for ev in session.exec(select(ModelEvaluacionTecnica)).all()
    }
    tratamientos = {
        t.id_dispositivo: t for t in session.exec(select(ModelTratamiento)).all()
    }
    evidencias_por_trat: dict = {}
    for evi in session.exec(select(ModelEvidencia)).all():
        evidencias_por_trat.setdefault(evi.id_tratamiento, []).append(
            EvidenciaResponseDTO.model_validate(evi)
        )

    # Última transferencia entregada para reflejar centro actual
    ultimo_centro_por_disp: dict = {}
    for m in session.exec(
        select(ModelTransferenciaMovimiento).order_by(ModelTransferenciaMovimiento.fecha_movimiento)
    ).all():
        if m.estado_transferencia == "Entregado":
            ultimo_centro_por_disp[m.id_dispositivo] = m.id_centro_destino

    historiales = session.exec(
        select(ModelHistorialEstados).order_by(ModelHistorialEstados.id_secuencia)
    ).all()
    ultimo_hist: dict = {}
    conteo_pasos: dict = {}
    for h in historiales:
        ultimo_hist[h.id_dispositivo] = h
        conteo_pasos[h.id_dispositivo] = conteo_pasos.get(h.id_dispositivo, 0) + 1

    dispositivos_list = session.exec(
        select(ModelDispositivo).order_by(desc(ModelDispositivo.fecha_registro))
    ).all()

    resultado = []
    for d in dispositivos_list:
        lote = lotes.get(d.id_lote)
        sol = solicitudes_map.get(lote.id_solicitud) if lote else None
        centro_id = ultimo_centro_por_disp.get(d.id_dispositivo) or (sol.id_centro if sol else None)
        centro = centros.get(centro_id) if centro_id else None
        trat = tratamientos.get(d.id_dispositivo)
        resultado.append(
            _build_dispositivo_dto(
                d=d,
                objeto=objetos.get(d.id_objeto),
                cat=categorias.get(d.id_categoria),
                lote=lote,
                sol=sol,
                centro=centro,
                ult=ultimo_hist.get(d.id_dispositivo),
                estados_cat=estados_cat,
                conteo_pasos=conteo_pasos.get(d.id_dispositivo, 0),
                ev=evaluaciones.get(d.id_dispositivo),
                condiciones=condiciones,
                usuarios=usuarios,
                trat=trat,
                evidencias=evidencias_por_trat.get(trat.id_tratamiento, []) if trat else [],
            )
        )
    return resultado


@dispositivos.get("/transferencias/all", response_model=List[TransferenciaResponseDTO])
def listar_todas_transferencias(session: SessionDep):
    centros = {c.id_centro: c for c in session.exec(select(ModelCentro)).all()}
    disps = {d.id_dispositivo: d for d in session.exec(select(ModelDispositivo)).all()}
    objetos = {o.id_objeto: o for o in session.exec(select(ModelObjeto)).all()}
    movs = session.exec(
        select(ModelTransferenciaMovimiento).order_by(
            desc(ModelTransferenciaMovimiento.fecha_movimiento)
        )
    ).all()

    resultado = []
    for m in movs:
        c_orig = centros.get(m.id_centro_origen)
        c_dest = centros.get(m.id_centro_destino)
        d = disps.get(m.id_dispositivo)
        obj = objetos.get(d.id_objeto) if d else None
        resultado.append(
            TransferenciaResponseDTO(
                id_movimiento=m.id_movimiento,
                fecha_movimiento=m.fecha_movimiento,
                estado_transferencia=m.estado_transferencia,
                id_centro_origen=m.id_centro_origen,
                nombre_centro_origen=c_orig.nombre_centro if c_orig else "",
                codigo_centro_origen=c_orig.codigo_centro if c_orig else "",
                id_centro_destino=m.id_centro_destino,
                nombre_centro_destino=c_dest.nombre_centro if c_dest else "",
                codigo_centro_destino=c_dest.codigo_centro if c_dest else "",
                id_dispositivo=m.id_dispositivo,
                num_serie=d.num_serie if d else "",
                nombre_objeto=obj.nombre_objeto if obj else "",
                marca=obj.marca if obj else "",
                modelo=obj.modelo if obj else "",
            )
        )
    return resultado


@dispositivos.get("/{id_dispositivo}", response_model=DispositivoDetalleResponseDTO)
def obtener_detalle_trazabilidad(id_dispositivo: UUID, session: SessionDep):
    d = session.get(ModelDispositivo, id_dispositivo)
    if not d:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado.")

    objeto = session.get(ModelObjeto, d.id_objeto)
    cat = session.get(ModelCategoria, d.id_categoria)
    lote = session.get(ModelLote, d.id_lote)
    sol = session.get(ModelSolicitud, lote.id_solicitud) if lote else None
    centro = session.get(ModelCentro, sol.id_centro) if sol else None

    estados_cat = {e.id_estado: e.nombre_estado for e in session.exec(select(ModelEstadoCatalogo)).all()}
    centros_map = {c.id_centro: c for c in session.exec(select(ModelCentro)).all()}
    condiciones = {c.id_condicion: c.descripcion_condicion for c in session.exec(select(ModelCondicion)).all()}
    usuarios = {u.id_usuario: u.nombre for u in session.exec(select(ModelUsuario)).all()}

    historiales = session.exec(
        select(ModelHistorialEstados)
        .where(ModelHistorialEstados.id_dispositivo == id_dispositivo)
        .order_by(ModelHistorialEstados.id_secuencia)
    ).all()

    linea_tiempo = [
        HistorialEstadoResponseDTO(
            id_historial=h.id_historial,
            id_secuencia=h.id_secuencia,
            id_estado=h.id_estado,
            nombre_estado=estados_cat.get(h.id_estado, "Estado"),
            fecha_cambio=h.fecha_cambio,
            observacion=h.observacion or "Sin observación",
        )
        for h in historiales
    ]

    ev = session.exec(
        select(ModelEvaluacionTecnica).where(ModelEvaluacionTecnica.id_dispositivo == id_dispositivo)
    ).first()

    transferencias = session.exec(
        select(ModelTransferenciaMovimiento)
        .where(ModelTransferenciaMovimiento.id_dispositivo == id_dispositivo)
        .order_by(ModelTransferenciaMovimiento.fecha_movimiento)
    ).all()

    trat = session.exec(
        select(ModelTratamiento).where(ModelTratamiento.id_dispositivo == id_dispositivo)
    ).first()

    evidencias = []
    if trat:
        evis = session.exec(
            select(ModelEvidencia).where(ModelEvidencia.id_tratamiento == trat.id_tratamiento)
        ).all()
        evidencias = [EvidenciaResponseDTO.model_validate(e) for e in evis]

    return DispositivoDetalleResponseDTO(
        id_dispositivo=d.id_dispositivo,
        num_serie=d.num_serie,
        id_objeto=d.id_objeto,
        codigo_objeto=objeto.codigo_objeto if objeto else "",
        nombre_objeto=objeto.nombre_objeto if objeto else "",
        marca=objeto.marca if objeto else "",
        modelo=objeto.modelo if objeto else "",
        id_categoria=d.id_categoria,
        nombre_categoria=cat.nombre_categoria if cat else "",
        id_lote=d.id_lote,
        codigo_lote=lote.codigo_lote if lote else "",
        codigo_solicitud=sol.codigo_solicitud if sol else "",
        id_centro_recepcion=centro.id_centro if centro else None,
        nombre_centro_recepcion=centro.nombre_centro if centro else "",
        fecha_registro=d.fecha_registro,
        historial_estados=linea_tiempo,
        evaluacion_tecnica=(
            EvaluacionResponseDTO(
                id_evaluacion=ev.id_evaluacion,
                fecha_evaluacion=ev.fecha_evaluacion,
                diagnostico=ev.diagnostico,
                clasificacion_tecnica=ev.clasificacion_tecnica,
                id_dispositivo=ev.id_dispositivo,
                id_condicion=ev.id_condicion,
                descripcion_condicion=condiciones.get(ev.id_condicion, ""),
                id_usuario_evaluador=ev.id_usuario_evaluador,
                nombre_evaluador=usuarios.get(ev.id_usuario_evaluador, ""),
            )
            if ev
            else None
        ),
        transferencias=[
            TransferenciaResponseDTO(
                id_movimiento=m.id_movimiento,
                fecha_movimiento=m.fecha_movimiento,
                estado_transferencia=m.estado_transferencia,
                id_centro_origen=m.id_centro_origen,
                nombre_centro_origen=(
                    centros_map[m.id_centro_origen].nombre_centro
                    if m.id_centro_origen in centros_map
                    else ""
                ),
                codigo_centro_origen=(
                    centros_map[m.id_centro_origen].codigo_centro
                    if m.id_centro_origen in centros_map
                    else ""
                ),
                id_centro_destino=m.id_centro_destino,
                nombre_centro_destino=(
                    centros_map[m.id_centro_destino].nombre_centro
                    if m.id_centro_destino in centros_map
                    else ""
                ),
                codigo_centro_destino=(
                    centros_map[m.id_centro_destino].codigo_centro
                    if m.id_centro_destino in centros_map
                    else ""
                ),
                id_dispositivo=m.id_dispositivo,
                num_serie=d.num_serie,
                nombre_objeto=objeto.nombre_objeto if objeto else "",
                marca=objeto.marca if objeto else "",
                modelo=objeto.modelo if objeto else "",
            )
            for m in transferencias
        ],
        tratamiento=(
            TratamientoResponseDTO(
                id_tratamiento=trat.id_tratamiento,
                resultado=trat.resultado,
                destino=trat.destino,
                fecha_cierre=trat.fecha_cierre,
                id_dispositivo=trat.id_dispositivo,
                evidencias=evidencias,
            )
            if trat
            else None
        ),
    )


@dispositivos.post("/", status_code=status.HTTP_201_CREATED, response_model=DispositivoResponseDTO)
def registrar_dispositivo(data: DispositivoCreateDTO, session: SessionDep):
    serie_clean = data.num_serie.strip().upper()
    existente = session.exec(
        select(ModelDispositivo).where(ModelDispositivo.num_serie == serie_clean)
    ).first()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Violación de RN-01: El número de serie '{serie_clean}' ya se encuentra registrado.",
        )

    cat = session.get(ModelCategoria, data.id_categoria)
    if not cat:
        raise HTTPException(
            status_code=404,
            detail="La categoría seleccionada no existe en la base de datos. Créala primero en el módulo de Catálogos.",
        )

    objeto = session.get(ModelObjeto, data.id_objeto)
    if not objeto:
        raise HTTPException(
            status_code=404,
            detail="El objeto seleccionado no existe en la base de datos. Créalo primero en el módulo de Catálogos.",
        )

    if objeto.id_categoria != cat.id_categoria:
        raise HTTPException(
            status_code=400,
            detail="El objeto seleccionado no pertenece a la categoría indicada en la base de datos.",
        )

    lote = session.get(ModelLote, data.id_lote)
    if not lote:
        raise HTTPException(status_code=404, detail="El lote seleccionado no existe.")

    sol = session.get(ModelSolicitud, lote.id_solicitud)
    centro = session.get(ModelCentro, sol.id_centro) if sol else None

    nuevo = ModelDispositivo(
        num_serie=serie_clean,
        id_objeto=objeto.id_objeto,
        id_categoria=cat.id_categoria,
        id_lote=lote.id_lote,
        fecha_registro=datetime.now(timezone.utc),
    )
    session.add(nuevo)
    session.flush()

    _agregar_estado_historial(
        session,
        id_dispositivo=nuevo.id_dispositivo,
        orden_estado=1,
        observacion=data.observacion_inicial or f"Ingreso inicial en lote {lote.codigo_lote}",
    )

    if sol:
        _ajustar_inventario(session, sol.id_centro, cat.id_categoria, delta=1)

    registrar_auditoria(
        session,
        tabla_afectada="DISPOSITIVO",
        tipo_operacion="INSERT",
        detalle=f"Registro de dispositivo {nuevo.num_serie} ({objeto.nombre_objeto}) en lote {lote.codigo_lote}",
        id_usuario=data.id_usuario,
    )
    session.commit()
    session.refresh(nuevo)

    estado_1 = _obtener_estado_por_orden(session, 1)
    ult = session.exec(
        select(ModelHistorialEstados)
        .where(ModelHistorialEstados.id_dispositivo == nuevo.id_dispositivo)
        .order_by(desc(ModelHistorialEstados.id_secuencia))
    ).first()

    return _build_dispositivo_dto(
        d=nuevo,
        objeto=objeto,
        cat=cat,
        lote=lote,
        sol=sol,
        centro=centro,
        ult=ult,
        estados_cat={estado_1.id_estado: estado_1.nombre_estado},
        conteo_pasos=1,
        ev=None,
        condiciones={},
        usuarios={},
        trat=None,
        evidencias=[],
    )


@dispositivos.put("/{id_dispositivo}", response_model=DispositivoResponseDTO)
def actualizar_dispositivo(id_dispositivo: UUID, data: DispositivoUpdateDTO, session: SessionDep):
    disp = session.get(ModelDispositivo, id_dispositivo)
    if not disp:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado.")

    if data.num_serie is not None:
        serie_clean = data.num_serie.strip().upper()
        dup = session.exec(
            select(ModelDispositivo).where(
                ModelDispositivo.num_serie == serie_clean,
                ModelDispositivo.id_dispositivo != id_dispositivo,
            )
        ).first()
        if dup:
            raise HTTPException(status_code=400, detail="Ese número de serie ya pertenece a otro dispositivo.")
        disp.num_serie = serie_clean

    target_objeto_id = data.id_objeto if data.id_objeto is not None else disp.id_objeto
    target_categoria_id = data.id_categoria if data.id_categoria is not None else disp.id_categoria

    objeto = session.get(ModelObjeto, target_objeto_id)
    if not objeto:
        raise HTTPException(status_code=404, detail="El objeto seleccionado no existe en la base de datos.")
    cat = session.get(ModelCategoria, target_categoria_id)
    if not cat:
        raise HTTPException(status_code=404, detail="La categoría seleccionada no existe en la base de datos.")

    if objeto.id_categoria != cat.id_categoria:
        raise HTTPException(
            status_code=400,
            detail="El objeto seleccionado no corresponde a la categoría elegida.",
        )

    disp.id_objeto = objeto.id_objeto
    disp.id_categoria = cat.id_categoria

    if data.id_lote is not None:
        if not session.get(ModelLote, data.id_lote):
            raise HTTPException(status_code=404, detail="El lote seleccionado no existe.")
        disp.id_lote = data.id_lote

    session.add(disp)
    registrar_auditoria(
        session,
        tabla_afectada="DISPOSITIVO",
        tipo_operacion="UPDATE",
        detalle=f"Actualización de datos del dispositivo {disp.num_serie} ({objeto.nombre_objeto})",
        id_usuario=data.id_usuario,
    )
    session.commit()
    session.refresh(disp)

    lote = session.get(ModelLote, disp.id_lote)
    sol = session.get(ModelSolicitud, lote.id_solicitud) if lote else None
    centro = session.get(ModelCentro, sol.id_centro) if sol else None
    estados_cat = {e.id_estado: e.nombre_estado for e in session.exec(select(ModelEstadoCatalogo)).all()}
    ult = session.exec(
        select(ModelHistorialEstados)
        .where(ModelHistorialEstados.id_dispositivo == disp.id_dispositivo)
        .order_by(desc(ModelHistorialEstados.id_secuencia))
    ).first()

    return _build_dispositivo_dto(
        d=disp,
        objeto=objeto,
        cat=cat,
        lote=lote,
        sol=sol,
        centro=centro,
        ult=ult,
        estados_cat=estados_cat,
        conteo_pasos=ult.id_secuencia if ult else 0,
        ev=None,
        condiciones={},
        usuarios={},
        trat=None,
        evidencias=[],
    )


@dispositivos.delete("/{id_dispositivo}", response_model=MessageResponseDTO)
def eliminar_dispositivo(id_dispositivo: UUID, session: SessionDep):
    disp = session.get(ModelDispositivo, id_dispositivo)
    if not disp:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado.")

    try:
        ev = session.exec(
            select(ModelEvaluacionTecnica).where(ModelEvaluacionTecnica.id_dispositivo == id_dispositivo)
        ).first()
        if ev:
            session.delete(ev)

        for m in session.exec(
            select(ModelTransferenciaMovimiento).where(
                ModelTransferenciaMovimiento.id_dispositivo == id_dispositivo
            )
        ).all():
            session.delete(m)

        for h in session.exec(
            select(ModelHistorialEstados).where(
                ModelHistorialEstados.id_dispositivo == id_dispositivo
            )
        ).all():
            session.delete(h)

        trat = session.exec(
            select(ModelTratamiento).where(ModelTratamiento.id_dispositivo == id_dispositivo)
        ).first()
        if trat:
            for e in session.exec(
                select(ModelEvidencia).where(ModelEvidencia.id_tratamiento == trat.id_tratamiento)
            ).all():
                delete_evidence_file(e.url_archivo)
                session.delete(e)
            session.delete(trat)

        serie = disp.num_serie
        session.delete(disp)
        registrar_auditoria(
            session,
            tabla_afectada="DISPOSITIVO",
            tipo_operacion="DELETE",
            detalle=f"Eliminación de dispositivo {serie} (UUID {id_dispositivo})",
        )
        session.commit()
        return MessageResponseDTO(message=f"Dispositivo {serie} eliminado correctamente.")
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"No se pudo eliminar el dispositivo por restricciones de integridad: {str(e)}",
        )


@dispositivos.post("/evaluaciones", status_code=status.HTTP_201_CREATED, response_model=EvaluacionResponseDTO)
def registrar_evaluacion_tecnica(data: EvaluacionCreateDTO, session: SessionDep):
    disp = session.get(ModelDispositivo, data.id_dispositivo)
    if not disp:
        raise HTTPException(status_code=404, detail="El dispositivo a evaluar no existe.")

    if data.clasificacion_tecnica not in CLASIFICACIONES_VALIDAS:
        raise HTTPException(
            status_code=400,
            detail=f"Clasificación '{data.clasificacion_tecnica}' no válida. Use: {', '.join(CLASIFICACIONES_VALIDAS)}",
        )

    evaluador = session.get(ModelUsuario, data.id_usuario_evaluador)
    if not evaluador:
        raise HTTPException(status_code=404, detail="El usuario evaluador no existe.")
    rol_eval = session.get(ModelRol, evaluador.id_rol)
    if rol_eval and rol_eval.nombre_rol not in ROLES_EVALUADORES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Violación de RN-02: El usuario '{evaluador.nombre}' tiene rol '{rol_eval.nombre_rol}'. Solo un Técnico autorizado o Administrador puede registrar evaluaciones técnicas.",
        )

    cond = session.get(ModelCondicion, data.id_condicion)
    if not cond:
        raise HTTPException(status_code=404, detail="La condición física seleccionada no existe.")

    existente = session.exec(
        select(ModelEvaluacionTecnica).where(ModelEvaluacionTecnica.id_dispositivo == data.id_dispositivo)
    ).first()
    if existente:
        raise HTTPException(
            status_code=400,
            detail="Este dispositivo ya cuenta con una evaluación técnica registrada. Puede actualizarla.",
        )

    nueva_eval = ModelEvaluacionTecnica(
        fecha_evaluacion=datetime.now(timezone.utc),
        diagnostico=data.diagnostico.strip(),
        clasificacion_tecnica=data.clasificacion_tecnica,
        id_dispositivo=data.id_dispositivo,
        id_condicion=data.id_condicion,
        id_usuario_evaluador=data.id_usuario_evaluador,
    )
    session.add(nueva_eval)

    ult = session.exec(
        select(ModelHistorialEstados)
        .where(ModelHistorialEstados.id_dispositivo == data.id_dispositivo)
        .order_by(desc(ModelHistorialEstados.id_secuencia))
    ).first()
    estado_1 = _obtener_estado_por_orden(session, 1)
    if not ult or ult.id_estado == estado_1.id_estado:
        _agregar_estado_historial(
            session,
            id_dispositivo=data.id_dispositivo,
            orden_estado=2,
            observacion=f"Inspección técnica realizada por {evaluador.nombre}",
        )
        session.flush()

    _agregar_estado_historial(
        session,
        id_dispositivo=data.id_dispositivo,
        orden_estado=3,
        observacion=f"Clasificado como {data.clasificacion_tecnica}: {data.diagnostico.strip()}",
    )

    registrar_auditoria(
        session,
        tabla_afectada="EVALUACION_TECNICA",
        tipo_operacion="INSERT",
        detalle=f"Evaluación técnica de equipo {disp.num_serie} -> {data.clasificacion_tecnica}",
        id_usuario=data.id_usuario_evaluador,
    )
    session.commit()
    session.refresh(nueva_eval)
    return EvaluacionResponseDTO(
        id_evaluacion=nueva_eval.id_evaluacion,
        fecha_evaluacion=nueva_eval.fecha_evaluacion,
        diagnostico=nueva_eval.diagnostico,
        clasificacion_tecnica=nueva_eval.clasificacion_tecnica,
        id_dispositivo=nueva_eval.id_dispositivo,
        id_condicion=nueva_eval.id_condicion,
        descripcion_condicion=cond.descripcion_condicion,
        id_usuario_evaluador=nueva_eval.id_usuario_evaluador,
        nombre_evaluador=evaluador.nombre,
    )


@dispositivos.put("/evaluaciones/{id_evaluacion}", response_model=EvaluacionResponseDTO)
def actualizar_evaluacion_tecnica(id_evaluacion: UUID, data: EvaluacionUpdateDTO, session: SessionDep):
    ev = session.get(ModelEvaluacionTecnica, id_evaluacion)
    if not ev:
        raise HTTPException(status_code=404, detail="Evaluación técnica no encontrada.")

    evaluador = session.get(ModelUsuario, data.id_usuario_evaluador)
    if not evaluador:
        raise HTTPException(status_code=404, detail="Usuario evaluador no encontrado.")
    rol_eval = session.get(ModelRol, evaluador.id_rol)
    if rol_eval and rol_eval.nombre_rol not in ROLES_EVALUADORES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Violación de RN-02: Solo un Técnico autorizado o Administrador puede cambiar la clasificación técnica.",
        )

    if data.clasificacion_tecnica is not None:
        if data.clasificacion_tecnica not in CLASIFICACIONES_VALIDAS:
            raise HTTPException(status_code=400, detail="Clasificación técnica no válida.")
        ev.clasificacion_tecnica = data.clasificacion_tecnica
    if data.diagnostico is not None:
        ev.diagnostico = data.diagnostico.strip()
    if data.id_condicion is not None:
        if not session.get(ModelCondicion, data.id_condicion):
            raise HTTPException(status_code=404, detail="Condición no encontrada.")
        ev.id_condicion = data.id_condicion
    ev.id_usuario_evaluador = data.id_usuario_evaluador

    session.add(ev)
    registrar_auditoria(
        session,
        tabla_afectada="EVALUACION_TECNICA",
        tipo_operacion="UPDATE",
        detalle=f"Actualización de evaluación {id_evaluacion} a clasificación {ev.clasificacion_tecnica}",
        id_usuario=data.id_usuario_evaluador,
    )
    session.commit()
    session.refresh(ev)
    cond = session.get(ModelCondicion, ev.id_condicion)
    return EvaluacionResponseDTO(
        id_evaluacion=ev.id_evaluacion,
        fecha_evaluacion=ev.fecha_evaluacion,
        diagnostico=ev.diagnostico,
        clasificacion_tecnica=ev.clasificacion_tecnica,
        id_dispositivo=ev.id_dispositivo,
        id_condicion=ev.id_condicion,
        descripcion_condicion=cond.descripcion_condicion if cond else "",
        id_usuario_evaluador=ev.id_usuario_evaluador,
        nombre_evaluador=evaluador.nombre,
    )


@dispositivos.post("/transferencias", status_code=status.HTTP_201_CREATED, response_model=TransferenciaResponseDTO)
def registrar_transferencia(data: TransferenciaCreateDTO, session: SessionDep):
    if data.id_centro_origen == data.id_centro_destino:
        raise HTTPException(
            status_code=400,
            detail="Violación de RN-03: El centro de origen y el centro de destino no pueden ser el mismo.",
        )

    if data.estado_transferencia not in ESTADOS_TRANSFERENCIA_VALIDOS:
        raise HTTPException(
            status_code=400,
            detail=f"Estado de transferencia inválido. Use: {', '.join(ESTADOS_TRANSFERENCIA_VALIDOS)}",
        )

    disp = session.get(ModelDispositivo, data.id_dispositivo)
    if not disp:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado.")
    objeto = session.get(ModelObjeto, disp.id_objeto)

    c_orig = session.get(ModelCentro, data.id_centro_origen)
    c_dest = session.get(ModelCentro, data.id_centro_destino)
    if not c_orig or not c_dest:
        raise HTTPException(status_code=404, detail="Centro de origen o destino no existe.")

    mov = ModelTransferenciaMovimiento(
        fecha_movimiento=datetime.now(timezone.utc),
        estado_transferencia=data.estado_transferencia,
        id_centro_origen=data.id_centro_origen,
        id_centro_destino=data.id_centro_destino,
        id_dispositivo=data.id_dispositivo,
    )
    session.add(mov)

    if data.estado_transferencia == "Entregado":
        _ajustar_inventario(session, data.id_centro_origen, disp.id_categoria, delta=-1)
        _ajustar_inventario(session, data.id_centro_destino, disp.id_categoria, delta=1)
        _agregar_estado_historial(
            session,
            id_dispositivo=data.id_dispositivo,
            orden_estado=5,
            observacion=f"Transferencia entregada de {c_orig.nombre_centro} a {c_dest.nombre_centro}",
        )
    else:
        _agregar_estado_historial(
            session,
            id_dispositivo=data.id_dispositivo,
            orden_estado=4,
            observacion=f"En tránsito desde {c_orig.nombre_centro} hacia {c_dest.nombre_centro}",
        )

    registrar_auditoria(
        session,
        tabla_afectada="TRANSFERENCIA_MOVIMIENTO",
        tipo_operacion="INSERT",
        detalle=f"Transferencia de equipo {disp.num_serie}: {c_orig.codigo_centro} -> {c_dest.codigo_centro} ({data.estado_transferencia})",
        id_usuario=data.id_usuario,
    )
    session.commit()
    session.refresh(mov)
    return TransferenciaResponseDTO(
        id_movimiento=mov.id_movimiento,
        fecha_movimiento=mov.fecha_movimiento,
        estado_transferencia=mov.estado_transferencia,
        id_centro_origen=mov.id_centro_origen,
        nombre_centro_origen=c_orig.nombre_centro,
        codigo_centro_origen=c_orig.codigo_centro,
        id_centro_destino=mov.id_centro_destino,
        nombre_centro_destino=c_dest.nombre_centro,
        codigo_centro_destino=c_dest.codigo_centro,
        id_dispositivo=mov.id_dispositivo,
        num_serie=disp.num_serie,
        nombre_objeto=objeto.nombre_objeto if objeto else "",
        marca=objeto.marca if objeto else "",
        modelo=objeto.modelo if objeto else "",
    )


@dispositivos.put("/transferencias/{id_movimiento}", response_model=TransferenciaResponseDTO)
def actualizar_estado_transferencia(
    id_movimiento: UUID,
    data: TransferenciaUpdateDTO,
    session: SessionDep,
):
    mov = session.get(ModelTransferenciaMovimiento, id_movimiento)
    if not mov:
        raise HTTPException(status_code=404, detail="Transferencia no encontrada.")

    if data.estado_transferencia not in ESTADOS_TRANSFERENCIA_VALIDOS:
        raise HTTPException(status_code=400, detail="Estado de transferencia inválido.")

    estado_anterior = mov.estado_transferencia
    mov.estado_transferencia = data.estado_transferencia
    session.add(mov)

    disp = session.get(ModelDispositivo, mov.id_dispositivo)
    objeto = session.get(ModelObjeto, disp.id_objeto) if disp else None
    c_orig = session.get(ModelCentro, mov.id_centro_origen)
    c_dest = session.get(ModelCentro, mov.id_centro_destino)

    if estado_anterior != "Entregado" and data.estado_transferencia == "Entregado" and disp:
        _ajustar_inventario(session, mov.id_centro_origen, disp.id_categoria, delta=-1)
        _ajustar_inventario(session, mov.id_centro_destino, disp.id_categoria, delta=1)
        _agregar_estado_historial(
            session,
            id_dispositivo=disp.id_dispositivo,
            orden_estado=5,
            observacion=f"Recepción confirmada en {c_dest.nombre_centro if c_dest else 'destino'}",
        )

    registrar_auditoria(
        session,
        tabla_afectada="TRANSFERENCIA_MOVIMIENTO",
        tipo_operacion="UPDATE",
        detalle=f"Movimiento {id_movimiento} actualizado de '{estado_anterior}' a '{data.estado_transferencia}'",
        id_usuario=data.id_usuario,
    )
    session.commit()
    session.refresh(mov)
    return TransferenciaResponseDTO(
        id_movimiento=mov.id_movimiento,
        fecha_movimiento=mov.fecha_movimiento,
        estado_transferencia=mov.estado_transferencia,
        id_centro_origen=mov.id_centro_origen,
        nombre_centro_origen=c_orig.nombre_centro if c_orig else "",
        codigo_centro_origen=c_orig.codigo_centro if c_orig else "",
        id_centro_destino=mov.id_centro_destino,
        nombre_centro_destino=c_dest.nombre_centro if c_dest else "",
        codigo_centro_destino=c_dest.codigo_centro if c_dest else "",
        id_dispositivo=mov.id_dispositivo,
        num_serie=disp.num_serie if disp else "",
        nombre_objeto=objeto.nombre_objeto if objeto else "",
        marca=objeto.marca if objeto else "",
        modelo=objeto.modelo if objeto else "",
    )


@dispositivos.post("/tratamientos", status_code=status.HTTP_201_CREATED, response_model=TratamientoResponseDTO)
def cerrar_trazabilidad_con_tratamiento(
    session: SessionDep,
    id_dispositivo: UUID = Form(...),
    resultado: str = Form(...),
    destino: str = Form(...),
    id_usuario: Optional[UUID] = Form(None),
    archivo_evidencia: Optional[UploadFile] = File(None),
    tipo_archivo_manual: Optional[str] = Form("PDF"),
    url_archivo_manual: Optional[str] = Form(None),
):
    disp = session.get(ModelDispositivo, id_dispositivo)
    if not disp:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado.")

    existente = session.exec(
        select(ModelTratamiento).where(ModelTratamiento.id_dispositivo == id_dispositivo)
    ).first()
    if existente:
        raise HTTPException(
            status_code=400,
            detail="Este dispositivo ya tiene un tratamiento y cierre de trazabilidad registrado.",
        )

    ev = session.exec(
        select(ModelEvaluacionTecnica).where(ModelEvaluacionTecnica.id_dispositivo == id_dispositivo)
    ).first()
    if ev and ev.clasificacion_tecnica == "Disposicion Final":
        palabras_beneficiario = (
            "donacion",
            "donación",
            "beneficiario",
            "escuela",
            "colegio",
            "fundacion",
            "fundación",
        )
        texto_check = f"{resultado} {destino}".lower()
        if any(p in texto_check for p in palabras_beneficiario):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Violación de RN-04: Un dispositivo clasificado como 'Disposicion Final' no puede asignarse a una entidad beneficiaria o donación.",
            )

    if not destino.strip() or not resultado.strip():
        raise HTTPException(
            status_code=400,
            detail="Violación de RN-08: El cierre de trazabilidad requiere especificar resultado y destino final.",
        )

    if archivo_evidencia and archivo_evidencia.filename:
        try:
            nombre_archivo, tipo_archivo, url_archivo = upload_evidence_file(
                file_obj=archivo_evidencia.file,
                filename=archivo_evidencia.filename,
                content_type=archivo_evidencia.content_type or "application/octet-stream",
            )
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve))
        except RuntimeError as re_err:
            raise HTTPException(status_code=502, detail=str(re_err))
    else:
        tipo_archivo = (tipo_archivo_manual or "PDF").upper()
        if tipo_archivo not in ("PDF", "JPG", "PNG", "DOCX"):
            raise HTTPException(
                status_code=400,
                detail="El tipo de archivo debe ser PDF, JPG, PNG o DOCX.",
            )
        nombre_archivo = f"acta_cierre_{disp.num_serie.lower()}.{tipo_archivo.lower()}"
        url_archivo = (
            url_archivo_manual.strip()
            if url_archivo_manual and url_archivo_manual.strip()
            else f"{BACKEND_BASE_URL}/uploads/{nombre_archivo}"
        )

    ahora = datetime.now(timezone.utc)
    nuevo_trat = ModelTratamiento(
        resultado=resultado.strip(),
        destino=destino.strip(),
        fecha_cierre=ahora,
        id_dispositivo=id_dispositivo,
    )
    session.add(nuevo_trat)
    session.flush()

    nueva_evidencia = ModelEvidencia(
        nombre_archivo=nombre_archivo,
        tipo_archivo=tipo_archivo,
        url_archivo=url_archivo,
        id_tratamiento=nuevo_trat.id_tratamiento,
    )
    session.add(nueva_evidencia)

    _agregar_estado_historial(
        session,
        id_dispositivo=id_dispositivo,
        orden_estado=6,
        observacion=f"Trazabilidad cerrada. Resultado: {resultado.strip()} | Destino: {destino.strip()}",
    )

    registrar_auditoria(
        session,
        tabla_afectada="TRATAMIENTO",
        tipo_operacion="INSERT",
        detalle=f"Cierre de trazabilidad de equipo {disp.num_serie} en destino '{destino.strip()}' con evidencia {tipo_archivo}",
        id_usuario=id_usuario,
    )
    session.commit()
    session.refresh(nuevo_trat)
    session.refresh(nueva_evidencia)

    return TratamientoResponseDTO(
        id_tratamiento=nuevo_trat.id_tratamiento,
        resultado=nuevo_trat.resultado,
        destino=nuevo_trat.destino,
        fecha_cierre=nuevo_trat.fecha_cierre,
        id_dispositivo=nuevo_trat.id_dispositivo,
        evidencias=[EvidenciaResponseDTO.model_validate(nueva_evidencia)],
    )

from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID
from fastapi import APIRouter, HTTPException, status
from sqlmodel import select, desc
from MyDbContext import SessionDep
from models.model_catalogs import ModelCentro, ModelCategoria, ModelObjeto, ModelEstadoCatalogo
from models.model_users import ModelUsuario
from models.model_traceability import (
    ModelSolicitud,
    ModelLote,
    ModelDispositivo,
    ModelEvaluacionTecnica,
    ModelHistorialEstados,
    ModelTratamiento,
    ModelInventario,
)
from models.model_network import (
    ModelNodo,
    ModelArista,
    ModelEscenario,
    ModelIndicador,
    ModelAlerta,
    ModelAuditoria,
)
from dtos.dto_common import MessageResponseDTO
from dtos.dto_network import (
    NodoCreateDTO,
    NodoResponseDTO,
    AristaCreateDTO,
    AristaResponseDTO,
    EscenarioResponseDTO,
    IndicadorResponseDTO,
    AlertaCreateDTO,
    AlertaUpdateDTO,
    AlertaResponseDTO,
    AuditoriaResponseDTO,
    MaxFlowRequestDTO,
    MaxFlowResponseDTO,
    ComparacionEscenarioDTO,
    GrafoResumenResponseDTO,
    DashboardKPIsDTO,
    CentroEstadoResumenDTO,
    CategoriaClasificacionResumenDTO,
    DispositivoPendienteDTO,
    DashboardResponseDTO,
)
from services.flow_service import edmonds_karp_max_flow, get_formalized_business_rules

red = APIRouter(prefix="/red", tags=["Modelo Matemático de Red y Reportes"])

CRITICIDAD_MAP = {
    "baja": "Baja",
    "media": "Media",
    "alta": "Alta",
    "critica": "Critica",
    "crítica": "Critica",
}
ESTADOS_ALERTA_VALIDOS = {"Activa", "En Atencion", "Resuelta"}


def _build_nodes_and_edges(session: SessionDep):
    centros_map = {c.id_centro: c for c in session.exec(select(ModelCentro)).all()}
    nodos_raw = session.exec(select(ModelNodo)).all()
    aristas_raw = session.exec(select(ModelArista)).all()

    nodes_dto = []
    nodes_dict = []
    node_label_map = {}

    for n in nodos_raw:
        c = centros_map.get(n.id_centro) if n.id_centro else None
        nombre_c = c.nombre_centro if c else n.tipo_nodo
        codigo_c = c.codigo_centro if c else str(n.id_nodo)[:8]
        node_label_map[n.id_nodo] = f"{codigo_c} - {nombre_c}" if c else n.tipo_nodo

        dto = NodoResponseDTO(
            id_nodo=n.id_nodo,
            id_centro=n.id_centro,
            nombre_centro=nombre_c,
            codigo_centro=codigo_c,
            tipo_nodo=n.tipo_nodo,
            capacidad_nodo=float(n.capacidad_nodo),
        )
        nodes_dto.append(dto)
        nodes_dict.append(dto.model_dump())

    edges_dto = []
    edges_dict = []
    for a in aristas_raw:
        dto = AristaResponseDTO(
            id_arista=a.id_arista,
            distancia_km=float(a.distancia_km),
            tiempo_estimado_min=a.tiempo_estimado_min,
            id_nodo_origen=a.id_nodo_origen,
            nombre_origen=node_label_map.get(a.id_nodo_origen, str(a.id_nodo_origen)[:8]),
            id_nodo_destino=a.id_nodo_destino,
            nombre_destino=node_label_map.get(a.id_nodo_destino, str(a.id_nodo_destino)[:8]),
        )
        edges_dto.append(dto)
        edges_dict.append(dto.model_dump())

    return nodes_dto, edges_dto, nodes_dict, edges_dict


@red.get("/grafo", response_model=GrafoResumenResponseDTO)
def obtener_grafo_y_flujo(session: SessionDep):
    nodes_dto, edges_dto, nodes_dict, edges_dict = _build_nodes_and_edges(session)
    escenarios = session.exec(select(ModelEscenario)).all()
    indicadores = session.exec(select(ModelIndicador)).all()

    flujo_base = edmonds_karp_max_flow(nodes_dict, edges_dict, factor_capacidad=1.0)
    flujo_expansion = edmonds_karp_max_flow(nodes_dict, edges_dict, factor_capacidad=1.35)
    flujo_contingencia = edmonds_karp_max_flow(nodes_dict, edges_dict, factor_capacidad=0.70)

    return GrafoResumenResponseDTO(
        nodos=nodes_dto,
        aristas=edges_dto,
        escenarios=[EscenarioResponseDTO.model_validate(e) for e in escenarios],
        indicadores=[
            IndicadorResponseDTO(
                id_indicador=i.id_indicador,
                nombre_indicador=i.nombre_indicador,
                valor_meta=float(i.valor_meta),
                valor_actual=float(i.valor_actual),
                periodo=i.periodo,
                id_escenario=i.id_escenario,
            )
            for i in indicadores
        ],
        analisis_flujo_actual=MaxFlowResponseDTO.model_validate(flujo_base),
        comparacion_escenarios=[
            ComparacionEscenarioDTO(
                nombre="Escenario 1: Capacidad Operativa Base (100%)",
                factor=1.0,
                flujo_maximo=flujo_base["flujo_maximo"],
                aristas_saturadas=sum(1 for a in flujo_base["flujo_por_arista"] if a["saturada"]),
                capacidad_corte_minimo=flujo_base["corte_minimo"]["capacidad_corte"],
            ),
            ComparacionEscenarioDTO(
                nombre="Escenario 2: Ampliación de Flota y Turnos (+35%)",
                factor=1.35,
                flujo_maximo=flujo_expansion["flujo_maximo"],
                aristas_saturadas=sum(1 for a in flujo_expansion["flujo_por_arista"] if a["saturada"]),
                capacidad_corte_minimo=flujo_expansion["corte_minimo"]["capacidad_corte"],
            ),
            ComparacionEscenarioDTO(
                nombre="Escenario 3: Restricción / Cuello de Botella Vial (-30%)",
                factor=0.70,
                flujo_maximo=flujo_contingencia["flujo_maximo"],
                aristas_saturadas=sum(1 for a in flujo_contingencia["flujo_por_arista"] if a["saturada"]),
                capacidad_corte_minimo=flujo_contingencia["corte_minimo"]["capacidad_corte"],
            ),
        ],
        reglas_discretas=get_formalized_business_rules(),
    )


@red.post("/flujo-maximo", response_model=MaxFlowResponseDTO)
def ejecutar_simulacion_flujo(data: MaxFlowRequestDTO, session: SessionDep):
    _, _, nodes_dict, edges_dict = _build_nodes_and_edges(session)

    resultado = edmonds_karp_max_flow(
        nodes_dict,
        edges_dict,
        source_id=str(data.id_nodo_origen) if data.id_nodo_origen else None,
        sink_id=str(data.id_nodo_sumidero) if data.id_nodo_sumidero else None,
        factor_capacidad=data.factor_capacidad,
    )

    if data.guardar_escenario:
        codigo = (
            data.codigo_escenario.strip()
            if data.codigo_escenario and data.codigo_escenario.strip()
            else f"ESC-FLOW-{datetime.now().strftime('%H%M%S')}"
        )
        res_texto = (
            f"Flujo máximo: {resultado['flujo_maximo']} t/periodo "
            f"(Factor {data.factor_capacidad}x, Corte mín: {resultado['corte_minimo']['capacidad_corte']})"
        )[:150]

        existente = session.exec(
            select(ModelEscenario).where(ModelEscenario.codigo_escenario == codigo)
        ).first()
        if existente:
            existente.resultado = res_texto
            session.add(existente)
            esc_obj = existente
        else:
            esc_obj = ModelEscenario(codigo_escenario=codigo, resultado=res_texto)
            session.add(esc_obj)
        session.commit()
        session.refresh(esc_obj)
        resultado["escenario_guardado"] = EscenarioResponseDTO.model_validate(esc_obj).model_dump()

    return MaxFlowResponseDTO.model_validate(resultado)


@red.post("/nodos", status_code=status.HTTP_201_CREATED, response_model=NodoResponseDTO)
def crear_nodo(data: NodoCreateDTO, session: SessionDep):
    centro = None
    if data.id_centro is not None:
        centro = session.get(ModelCentro, data.id_centro)
        if not centro:
            raise HTTPException(status_code=404, detail="Centro asociado no encontrado.")

    nuevo = ModelNodo(
        id_centro=data.id_centro,
        tipo_nodo=data.tipo_nodo.strip(),
        capacidad_nodo=Decimal(str(round(data.capacidad_nodo, 2))),
    )
    session.add(nuevo)
    session.commit()
    session.refresh(nuevo)
    return NodoResponseDTO(
        id_nodo=nuevo.id_nodo,
        id_centro=nuevo.id_centro,
        nombre_centro=centro.nombre_centro if centro else nuevo.tipo_nodo,
        codigo_centro=centro.codigo_centro if centro else str(nuevo.id_nodo)[:8],
        tipo_nodo=nuevo.tipo_nodo,
        capacidad_nodo=float(nuevo.capacidad_nodo),
    )


@red.delete("/nodos/{id_nodo}", response_model=MessageResponseDTO)
def eliminar_nodo(id_nodo: UUID, session: SessionDep):
    nodo = session.get(ModelNodo, id_nodo)
    if not nodo:
        raise HTTPException(status_code=404, detail="Nodo no encontrado.")
    try:
        session.delete(nodo)
        session.commit()
        return MessageResponseDTO(message="Nodo eliminado correctamente.")
    except Exception:
        session.rollback()
        raise HTTPException(
            status_code=409,
            detail="No se puede eliminar el nodo porque tiene aristas conectadas.",
        )


@red.post("/aristas", status_code=status.HTTP_201_CREATED, response_model=AristaResponseDTO)
def crear_arista(data: AristaCreateDTO, session: SessionDep):
    if data.id_nodo_origen == data.id_nodo_destino:
        raise HTTPException(
            status_code=400,
            detail="El nodo origen y destino deben ser distintos.",
        )

    n_orig = session.get(ModelNodo, data.id_nodo_origen)
    n_dest = session.get(ModelNodo, data.id_nodo_destino)
    if not n_orig or not n_dest:
        raise HTTPException(status_code=404, detail="Nodo origen o destino no existe.")

    nueva = ModelArista(
        distancia_km=Decimal(str(round(data.distancia_km, 2))),
        tiempo_estimado_min=data.tiempo_estimado_min,
        id_nodo_origen=data.id_nodo_origen,
        id_nodo_destino=data.id_nodo_destino,
    )
    session.add(nueva)
    session.commit()
    session.refresh(nueva)
    return AristaResponseDTO(
        id_arista=nueva.id_arista,
        distancia_km=float(nueva.distancia_km),
        tiempo_estimado_min=nueva.tiempo_estimado_min,
        id_nodo_origen=nueva.id_nodo_origen,
        nombre_origen=n_orig.tipo_nodo,
        id_nodo_destino=nueva.id_nodo_destino,
        nombre_destino=n_dest.tipo_nodo,
    )


@red.delete("/aristas/{id_arista}", response_model=MessageResponseDTO)
def eliminar_arista(id_arista: UUID, session: SessionDep):
    arista = session.get(ModelArista, id_arista)
    if not arista:
        raise HTTPException(status_code=404, detail="Arista no encontrada.")
    session.delete(arista)
    session.commit()
    return MessageResponseDTO(message="Arista eliminada correctamente.")


@red.get("/dashboard", response_model=DashboardResponseDTO)
def obtener_dashboard_y_consultas_sql(session: SessionDep):
    dispositivos_all = session.exec(select(ModelDispositivo)).all()
    tratamientos_all = session.exec(select(ModelTratamiento)).all()
    evaluaciones_all = session.exec(select(ModelEvaluacionTecnica)).all()
    solicitudes_all = session.exec(select(ModelSolicitud)).all()
    lotes_all = session.exec(select(ModelLote)).all()
    centros_all = session.exec(select(ModelCentro)).all()
    categorias_all = session.exec(select(ModelCategoria)).all()
    objetos_all = session.exec(select(ModelObjeto)).all()
    estados_all = session.exec(select(ModelEstadoCatalogo)).all()
    historiales_all = session.exec(select(ModelHistorialEstados)).all()
    inventarios_all = session.exec(select(ModelInventario)).all()
    alertas_all = session.exec(select(ModelAlerta).order_by(desc(ModelAlerta.fecha_generacion))).all()
    auditorias_all = session.exec(
        select(ModelAuditoria).order_by(desc(ModelAuditoria.fecha_accion)).limit(25)
    ).all()
    usuarios_map = {u.id_usuario: u.nombre for u in session.exec(select(ModelUsuario)).all()}

    centros_map = {c.id_centro: c for c in centros_all}
    categorias_map = {cat.id_categoria: cat.nombre_categoria for cat in categorias_all}
    objetos_map = {obj.id_objeto: obj for obj in objetos_all}
    estados_map = {e.id_estado: e.nombre_estado for e in estados_all}
    lotes_map = {l.id_lote: l for l in lotes_all}
    sols_map = {s.id_solicitud: s for s in solicitudes_all}
    eval_por_disp = {ev.id_dispositivo: ev for ev in evaluaciones_all}

    ultimo_estado_disp = {}
    for h in sorted(historiales_all, key=lambda x: (str(x.id_dispositivo), x.id_secuencia)):
        ultimo_estado_disp[h.id_dispositivo] = h.id_estado

    agrupado_centro_estado = {}
    for d in dispositivos_all:
        lote = lotes_map.get(d.id_lote)
        sol = sols_map.get(lote.id_solicitud) if lote else None
        centro = centros_map.get(sol.id_centro) if sol else None
        id_est = ultimo_estado_disp.get(d.id_dispositivo)
        nombre_est = estados_map.get(id_est, "Recibido en Centro") if id_est else "Recibido en Centro"
        key = (
            centro.codigo_centro if centro else "SIN-CEN",
            centro.nombre_centro if centro else "Sin Centro",
            nombre_est,
        )
        agrupado_centro_estado[key] = agrupado_centro_estado.get(key, 0) + 1

    consulta_2_centro_estado = [
        CentroEstadoResumenDTO(
            codigo_centro=k[0],
            nombre_centro=k[1],
            estado_actual=k[2],
            cantidad_dispositivos=cant,
        )
        for k, cant in sorted(agrupado_centro_estado.items(), key=lambda x: (x[0][1], -x[1]))
    ]

    agrupado_cat_clasif = {}
    for d in dispositivos_all:
        nom_cat = categorias_map.get(d.id_categoria, "Sin Categoría")
        ev = eval_por_disp.get(d.id_dispositivo)
        clasif = ev.clasificacion_tecnica if ev else "PENDIENTE DE EVALUAR"
        key = (nom_cat, clasif)
        agrupado_cat_clasif[key] = agrupado_cat_clasif.get(key, 0) + 1

    consulta_3_categoria_clasificacion = [
        CategoriaClasificacionResumenDTO(
            nombre_categoria=k[0],
            clasificacion_asignada=k[1],
            total_dispositivos=cant,
        )
        for k, cant in sorted(agrupado_cat_clasif.items(), key=lambda x: (x[0][0], -x[1]))
    ]

    total_ingresados = len(dispositivos_all)
    total_cerrados = len(tratamientos_all)
    pct_cerrada = round((total_cerrados / total_ingresados) * 100.0, 2) if total_ingresados > 0 else 0.0

    consulta_5_pendientes = []
    for d in sorted(dispositivos_all, key=lambda x: x.fecha_registro, reverse=True):
        if d.id_dispositivo not in eval_por_disp:
            lote = lotes_map.get(d.id_lote)
            sol = sols_map.get(lote.id_solicitud) if lote else None
            centro = centros_map.get(sol.id_centro) if sol else None
            obj = objetos_map.get(d.id_objeto)
            consulta_5_pendientes.append(
                DispositivoPendienteDTO(
                    id_dispositivo=d.id_dispositivo,
                    num_serie=d.num_serie,
                    nombre_objeto=obj.nombre_objeto if obj else "",
                    marca=obj.marca if obj else "",
                    modelo=obj.modelo if obj else "",
                    nombre_categoria=categorias_map.get(d.id_categoria, ""),
                    codigo_lote=lote.codigo_lote if lote else "",
                    centro_recepcion=centro.nombre_centro if centro else "",
                )
            )

    conteo_clasificaciones = {
        "Reutilizacion": 0,
        "Reacondicionamiento": 0,
        "Reciclaje": 0,
        "Disposicion Final": 0,
    }
    for ev in evaluaciones_all:
        if ev.clasificacion_tecnica in conteo_clasificaciones:
            conteo_clasificaciones[ev.clasificacion_tecnica] += 1

    return DashboardResponseDTO(
        kpis=DashboardKPIsDTO(
            total_dispositivos=total_ingresados,
            dispositivos_evaluados=len(evaluaciones_all),
            dispositivos_pendientes_evaluar=len(consulta_5_pendientes),
            dispositivos_cerrados=total_cerrados,
            porcentaje_trazabilidad_cerrada=pct_cerrada,
            total_solicitudes=len(solicitudes_all),
            total_lotes=len(lotes_all),
            stock_total_inventario=sum(i.stock_actual for i in inventarios_all),
            alertas_activas=sum(1 for a in alertas_all if a.estado_alerta != "Resuelta"),
        ),
        distribucion_clasificacion=conteo_clasificaciones,
        consulta_2_centro_estado=consulta_2_centro_estado,
        consulta_3_categoria_clasificacion=consulta_3_categoria_clasificacion,
        consulta_5_pendientes_evaluacion=consulta_5_pendientes,
        alertas=[
            AlertaResponseDTO(
                id_alerta=a.id_alerta,
                fecha_generacion=a.fecha_generacion,
                nivel_criticidad=a.nivel_criticidad,
                mensaje=a.mensaje,
                estado_alerta=a.estado_alerta,
                id_centro=a.id_centro,
                nombre_centro=(
                    centros_map[a.id_centro].nombre_centro if a.id_centro in centros_map else ""
                ),
            )
            for a in alertas_all
        ],
        auditoria=[
            AuditoriaResponseDTO(
                id_auditoria=aud.id_auditoria,
                fecha_accion=aud.fecha_accion,
                tabla_afectada=aud.tabla_afectada,
                tipo_operacion=aud.tipo_operacion,
                detalle=aud.detalle,
                id_usuario=aud.id_usuario,
                nombre_usuario=(
                    usuarios_map.get(aud.id_usuario, "Sistema") if aud.id_usuario else "Sistema"
                ),
            )
            for aud in auditorias_all
        ],
    )


@red.post("/alertas", status_code=status.HTTP_201_CREATED, response_model=AlertaResponseDTO)
def crear_alerta(data: AlertaCreateDTO, session: SessionDep):
    crit_norm = CRITICIDAD_MAP.get(data.nivel_criticidad.strip().lower())
    if not crit_norm:
        raise HTTPException(status_code=400, detail="Criticidad inválida (Baja, Media, Alta, Critica).")
    if data.estado_alerta not in ESTADOS_ALERTA_VALIDOS:
        raise HTTPException(
            status_code=400,
            detail="Estado de alerta inválido (Activa, En Atencion, Resuelta).",
        )

    centro = session.get(ModelCentro, data.id_centro)
    if not centro:
        raise HTTPException(status_code=404, detail="Centro asociado no encontrado.")

    alerta = ModelAlerta(
        fecha_generacion=datetime.now(timezone.utc),
        nivel_criticidad=crit_norm,
        mensaje=data.mensaje.strip(),
        estado_alerta=data.estado_alerta,
        id_centro=data.id_centro,
    )
    session.add(alerta)
    session.commit()
    session.refresh(alerta)
    return AlertaResponseDTO(
        id_alerta=alerta.id_alerta,
        fecha_generacion=alerta.fecha_generacion,
        nivel_criticidad=alerta.nivel_criticidad,
        mensaje=alerta.mensaje,
        estado_alerta=alerta.estado_alerta,
        id_centro=alerta.id_centro,
        nombre_centro=centro.nombre_centro,
    )


@red.put("/alertas/{id_alerta}", response_model=AlertaResponseDTO)
def actualizar_alerta(id_alerta: UUID, data: AlertaUpdateDTO, session: SessionDep):
    alerta = session.get(ModelAlerta, id_alerta)
    if not alerta:
        raise HTTPException(status_code=404, detail="Alerta no encontrada.")
    if data.estado_alerta not in ESTADOS_ALERTA_VALIDOS:
        raise HTTPException(status_code=400, detail="Estado de alerta inválido.")
    alerta.estado_alerta = data.estado_alerta
    if data.nivel_criticidad is not None:
        crit_norm = CRITICIDAD_MAP.get(data.nivel_criticidad.strip().lower())
        if not crit_norm:
            raise HTTPException(status_code=400, detail="Criticidad inválida.")
        alerta.nivel_criticidad = crit_norm
    if data.mensaje is not None:
        alerta.mensaje = data.mensaje.strip()
    session.add(alerta)
    session.commit()
    session.refresh(alerta)
    centro = session.get(ModelCentro, alerta.id_centro)
    return AlertaResponseDTO(
        id_alerta=alerta.id_alerta,
        fecha_generacion=alerta.fecha_generacion,
        nivel_criticidad=alerta.nivel_criticidad,
        mensaje=alerta.mensaje,
        estado_alerta=alerta.estado_alerta,
        id_centro=alerta.id_centro,
        nombre_centro=centro.nombre_centro if centro else "",
    )


@red.delete("/alertas/{id_alerta}", response_model=MessageResponseDTO)
def eliminar_alerta(id_alerta: UUID, session: SessionDep):
    alerta = session.get(ModelAlerta, id_alerta)
    if not alerta:
        raise HTTPException(status_code=404, detail="Alerta no encontrada.")
    session.delete(alerta)
    session.commit()
    return MessageResponseDTO(message="Alerta eliminada correctamente.")

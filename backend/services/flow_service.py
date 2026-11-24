from collections import deque
from typing import Dict, List, Any, Optional


def compute_edge_capacity(
    cap_origen: float,
    cap_destino: float,
    distancia_km: float,
    tiempo_min: int,
    factor: float = 1.0,
) -> float:
    """
    Calcula la capacidad efectiva de transferencia c(u,v) en la arista dirigida (u -> v)
    en función de la capacidad operativa de los nodos y el factor logístico de tiempo/distancia.
    """
    base_cap = min(cap_origen, cap_destino)
    efficiency = min(1.25, max(0.35, 60.0 / max(25.0, float(tiempo_min))))
    capacity = round(base_cap * efficiency * factor, 2)
    return max(1.0, capacity)


def edmonds_karp_max_flow(
    nodes: List[Dict[str, Any]],
    edges: List[Dict[str, Any]],
    source_id: Optional[str] = None,
    sink_id: Optional[str] = None,
    factor_capacidad: float = 1.0,
) -> Dict[str, Any]:
    """
    Implementación del algoritmo de Edmonds-Karp (Ford-Fulkerson con BFS) compatible con UUIDs
    para calcular el flujo máximo, flujo por arista, aristas saturadas (cuellos de botella)
    y el corte mínimo (S, T) sobre la red logística de EcoRAEE Cloud.
    """
    if not nodes:
        return {
            "nodo_origen": None,
            "nodo_sumidero": None,
            "factor_capacidad": factor_capacidad,
            "flujo_maximo": 0.0,
            "flujo_por_arista": [],
            "corte_minimo": {
                "conjunto_S": [],
                "conjunto_T": [],
                "aristas_criticas": [],
                "capacidad_corte": 0.0,
            },
            "rutas_aumentantes": [],
        }

    node_map: Dict[str, Dict[str, Any]] = {str(n["id_nodo"]): {**n, "id_nodo": str(n["id_nodo"])} for n in nodes}
    ordered_node_ids = [str(n["id_nodo"]) for n in nodes]

    src = str(source_id) if source_id is not None else None
    snk = str(sink_id) if sink_id is not None else None

    if src is None or src not in node_map:
        src = ordered_node_ids[0]
    if snk is None or snk not in node_map:
        snk = ordered_node_ids[-1]

    adj: Dict[str, List[str]] = {nid: [] for nid in ordered_node_ids}
    capacity: Dict[tuple, float] = {}
    flow: Dict[tuple, float] = {}
    edge_meta: Dict[tuple, Dict[str, Any]] = {}

    for e in edges:
        u = str(e["id_nodo_origen"])
        v = str(e["id_nodo_destino"])
        if u not in node_map or v not in node_map:
            continue

        cap_u = float(node_map[u]["capacidad_nodo"])
        cap_v = float(node_map[v]["capacidad_nodo"])
        dist = float(e["distancia_km"])
        t_min = int(e["tiempo_estimado_min"])

        c_uv = compute_edge_capacity(cap_u, cap_v, dist, t_min, factor_capacidad)

        if v not in adj[u]:
            adj[u].append(v)
        if u not in adj[v]:
            adj[v].append(u)

        capacity[(u, v)] = capacity.get((u, v), 0.0) + c_uv
        capacity.setdefault((v, u), 0.0)
        flow[(u, v)] = 0.0
        flow.setdefault((v, u), 0.0)
        edge_meta[(u, v)] = {
            "id_arista": str(e["id_arista"]),
            "id_nodo_origen": u,
            "nombre_origen": node_map[u].get("nombre_centro") or node_map[u]["tipo_nodo"],
            "id_nodo_destino": v,
            "nombre_destino": node_map[v].get("nombre_centro") or node_map[v]["tipo_nodo"],
            "distancia_km": dist,
            "tiempo_estimado_min": t_min,
            "capacidad": round(c_uv, 2),
        }

    max_flow = 0.0
    augmenting_paths = []

    if src != snk:
        while True:
            parent: Dict[str, Optional[str]] = {nid: None for nid in ordered_node_ids}
            parent[src] = src
            queue = deque([src])

            while queue and parent[snk] is None:
                u = queue.popleft()
                for v in adj[u]:
                    residual = capacity.get((u, v), 0.0) - flow.get((u, v), 0.0)
                    if parent[v] is None and residual > 1e-6:
                        parent[v] = u
                        queue.append(v)

            if parent[snk] is None:
                break

            path_nodes: List[str] = []
            curr = snk
            path_flow = float("inf")
            while curr != src:
                prev = parent[curr]
                assert prev is not None
                residual = capacity[(prev, curr)] - flow[(prev, curr)]
                path_flow = min(path_flow, residual)
                path_nodes.append(curr)
                curr = prev
            path_nodes.append(src)
            path_nodes.reverse()

            curr = snk
            while curr != src:
                prev = parent[curr]
                assert prev is not None
                flow[(prev, curr)] += path_flow
                flow[(curr, prev)] -= path_flow
                curr = prev

            max_flow = round(max_flow + path_flow, 2)
            augmenting_paths.append({
                "camino_nodos": path_nodes,
                "camino_nombres": [
                    node_map[nid].get("nombre_centro") or node_map[nid]["tipo_nodo"]
                    for nid in path_nodes
                ],
                "flujo_aportado": round(path_flow, 2),
            })

    visited = {src}
    q = deque([src])
    while q:
        u = q.popleft()
        for v in adj[u]:
            residual = capacity.get((u, v), 0.0) - flow.get((u, v), 0.0)
            if v not in visited and residual > 1e-6:
                visited.add(v)
                q.append(v)

    set_S = [nid for nid in ordered_node_ids if nid in visited]
    set_T = [nid for nid in ordered_node_ids if nid not in visited]

    flujo_por_arista = []
    aristas_criticas = []
    capacidad_corte = 0.0

    for (u, v), meta in edge_meta.items():
        f_uv = round(max(0.0, flow.get((u, v), 0.0)), 2)
        c_uv = meta["capacidad"]
        pct = round((f_uv / c_uv) * 100.0, 1) if c_uv > 0 else 0.0
        saturada = abs(c_uv - f_uv) <= 0.05

        item = {
            **meta,
            "flujo": f_uv,
            "holgura": round(max(0.0, c_uv - f_uv), 2),
            "porcentaje_uso": pct,
            "saturada": saturada,
            "en_corte_minimo": (u in visited and v not in visited),
        }
        flujo_por_arista.append(item)

        if u in visited and v not in visited:
            aristas_criticas.append(item)
            capacidad_corte = round(capacidad_corte + c_uv, 2)

    return {
        "nodo_origen": node_map[src],
        "nodo_sumidero": node_map[snk],
        "factor_capacidad": factor_capacidad,
        "flujo_maximo": round(max_flow, 2),
        "flujo_por_arista": flujo_por_arista,
        "corte_minimo": {
            "conjunto_S": [
                {"id_nodo": nid, "tipo_nodo": node_map[nid]["tipo_nodo"], "nombre_centro": node_map[nid].get("nombre_centro")}
                for nid in set_S
            ],
            "conjunto_T": [
                {"id_nodo": nid, "tipo_nodo": node_map[nid]["tipo_nodo"], "nombre_centro": node_map[nid].get("nombre_centro")}
                for nid in set_T
            ],
            "aristas_criticas": aristas_criticas,
            "capacidad_corte": capacidad_corte,
        },
        "rutas_aumentantes": augmenting_paths,
    }


def get_formalized_business_rules() -> List[Dict[str, Any]]:
    """
    RF-MD-01: Cinco reglas de negocio formalizadas mediante lógica proposicional,
    operadores booleanos y tablas de verdad asociadas a las restricciones de EcoRAEE Cloud.
    """
    return [
        {
            "codigo": "RN-01",
            "titulo": "Identificación única (UUID + Serie) y catálogo controlado de Objetos/Categorías",
            "proposiciones": {
                "p": "El dispositivo posee UUID único y número de serie único (num_serie)",
                "q": "El objeto y categoría existen previamente en las tablas OBJETO y CATEGORIA de la BD",
                "r": "Se genera el estado inicial secuencial (id_secuencia = 1) en HISTORIAL_ESTADOS",
            },
            "formula": "(p ∧ q) → r",
            "implementacion_sql_api": "UNIQUEIDENTIFIER PK + FK_DISPOSITIVO_OBJETO + FK_DISPOSITIVO_CATEGORIA + DTO estrictos",
        },
        {
            "codigo": "RN-02",
            "titulo": "Autorización de evaluación técnica por rol",
            "proposiciones": {
                "p": "El usuario intenta registrar o modificar una EVALUACION_TECNICA",
                "q": "El usuario tiene rol 'Técnico Evaluador RAEE', 'Tecnico Clasificador' o 'Administrador del Sistema'",
            },
            "formula": "p → q",
            "implementacion_sql_api": "Validación de rol en endpoint POST/PUT /dispositivos/evaluaciones y FK_EVAL_USUARIO",
        },
        {
            "codigo": "RN-03",
            "titulo": "Validación de transferencia entre centros distintos",
            "proposiciones": {
                "p": "Existe centro de origen válido (id_centro_origen UUID)",
                "q": "Existe centro de destino válido (id_centro_destino UUID)",
                "r": "El centro de origen es distinto del centro de destino (origen ≠ destino)",
            },
            "formula": "TransferenciaValida ↔ (p ∧ q ∧ r)",
            "implementacion_sql_api": "CK_MOV_CENTROS_DISTINTOS (id_centro_origen <> id_centro_destino)",
        },
        {
            "codigo": "RN-04",
            "titulo": "Restricción de asignación para equipos en Disposición Final",
            "proposiciones": {
                "p": "La clasificación técnica es 'Disposicion Final'",
                "q": "El destino de tratamiento es donación o beneficiario educativo",
            },
            "formula": "p → ¬q",
            "implementacion_sql_api": "Validación en POST /dispositivos/tratamientos impidiendo asignar a beneficiario",
        },
        {
            "codigo": "RN-08",
            "titulo": "Cierre de trazabilidad con tratamiento y evidencia en AWS S3",
            "proposiciones": {
                "p": "Existe registro de TRATAMIENTO con destino final y fecha de cierre",
                "q": "Existe EVIDENCIA en formato permitido (PDF, JPG, PNG, DOCX) almacenada en S3/Local",
                "r": "El dispositivo pasa al estado 'Cerrado / Trazabilidad Completa'",
            },
            "formula": "(p ∧ q) ↔ r",
            "implementacion_sql_api": "AWS S3 boto3 + actualización atómica de HISTORIAL_ESTADOS",
        },
    ]

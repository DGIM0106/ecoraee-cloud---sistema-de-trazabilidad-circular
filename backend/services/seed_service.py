from datetime import datetime, timezone
from decimal import Decimal
from sqlmodel import Session, select
from MyDbContext import engine
from models import (
    ModelOrganizacion,
    ModelRol,
    ModelUsuario,
    ModelTipoCentro,
    ModelCentro,
    ModelCategoria,
    ModelObjeto,
    ModelCondicion,
    ModelEstadoCatalogo,
    ModelSolicitud,
    ModelLote,
    ModelDispositivo,
    ModelHistorialEstados,
    ModelInventario,
    ModelNodo,
    ModelArista,
)


def seed_initial_data() -> None:
    """
    Inicializa los catálogos base con UUID únicamente si la base de datos está vacía
    (útil al conectar por primera vez a SQL Server local o AWS RDS SQL Server).
    """
    with Session(engine) as session:
        # Si ya existen roles, la base de datos ya fue inicializada
        if session.exec(select(ModelRol)).first() is not None:
            return

        # 1. Roles
        rol_admin = ModelRol(
            nombre_rol="Administrador del Sistema",
            descripcion="Control total de usuarios, catálogos, auditoría y configuración",
        )
        rol_operador = ModelRol(
            nombre_rol="Operador de Centro de Acopio",
            descripcion="Recepción, registro de solicitudes, lotes e inventario inicial",
        )
        rol_tecnico = ModelRol(
            nombre_rol="Tecnico Clasificador",
            descripcion="Diagnóstico técnico y clasificación (Reutilización, Reciclaje, etc.)",
        )
        rol_logistico = ModelRol(
            nombre_rol="Coordinador Logístico de Flujo",
            descripcion="Planificación de transferencias, simulación de red y despacho",
        )
        rol_gestor = ModelRol(
            nombre_rol="Gestor de Reacondicionamiento",
            descripcion="Procesamiento circular, remediación y cierre final con evidencias",
        )
        session.add_all([rol_admin, rol_operador, rol_tecnico, rol_logistico, rol_gestor])

        # 2. Organizaciones
        org_emgirs = ModelOrganizacion(
            ruc="1790012345001",
            razon_social="Empresa Pública Metropolitana de Gestión Integral (EMGIRS-EP)",
            direccion="Av. Amazonas y República, Quito",
            telefono="02-3987000",
        )
        org_uide = ModelOrganizacion(
            ruc="1791234567001",
            razon_social="Universidad Internacional del Ecuador (UIDE) - Campus Verde",
            direccion="Av. Simón Bolívar y Av. Jorge Fernández, Quito",
            telefono="02-2985600",
        )
        org_ecotrans = ModelOrganizacion(
            ruc="1798765432001",
            razon_social="EcoTrans Logística Especializada S.A.",
            direccion="Panamericana Norte Km 14.5, Calderón",
            telefono="02-2821900",
        )
        session.add_all([org_emgirs, org_uide, org_ecotrans])

        # 3. Tipos de Centro
        tc_acopio = ModelTipoCentro(nombre_tipo="Centro de Acopio Primario")
        tc_clasif = ModelTipoCentro(nombre_tipo="Planta de Clasificación")
        tc_taller = ModelTipoCentro(nombre_tipo="Taller Reacondicionamiento")
        tc_reciclaje = ModelTipoCentro(nombre_tipo="Planta de Reciclaje y Disposición")
        session.add_all([tc_acopio, tc_clasif, tc_taller, tc_reciclaje])

        # 4. Condiciones Físicas
        cond_1 = ModelCondicion(descripcion_condicion="Excelente / Reutilización Directa")
        cond_2 = ModelCondicion(descripcion_condicion="Reparable con Reemplazo de Componentes Menores")
        cond_3 = ModelCondicion(descripcion_condicion="Inoperativo con Componentes Críticos Recuperables")
        cond_4 = ModelCondicion(descripcion_condicion="Dañado Severo / Desensamble y Reciclaje")
        cond_5 = ModelCondicion(descripcion_condicion="Residuo Peligroso / Disposición Final Controlada")
        session.add_all([cond_1, cond_2, cond_3, cond_4, cond_5])

        # 5. Estados de Trazabilidad (orden 1..6)
        est_1 = ModelEstadoCatalogo(orden=1, nombre_estado="Recibido en Centro")
        est_2 = ModelEstadoCatalogo(orden=2, nombre_estado="En Evaluación")
        est_3 = ModelEstadoCatalogo(orden=3, nombre_estado="Evaluado / Clasificado")
        est_4 = ModelEstadoCatalogo(orden=4, nombre_estado="En Tránsito")
        est_5 = ModelEstadoCatalogo(orden=5, nombre_estado="Recibido en Destino")
        est_6 = ModelEstadoCatalogo(orden=6, nombre_estado="Cerrado / Trazabilidad Completa")
        session.add_all([est_1, est_2, est_3, est_4, est_5, est_6])

        session.flush()

        # 6. Usuarios Iniciales
        u_admin = ModelUsuario(
            nombre="Anthony Romo",
            correo="anthony.romo@ecoraee.ec",
            id_organizacion=org_uide.id_organizacion,
            id_rol=rol_admin.id_rol,
        )
        u_tecnico = ModelUsuario(
            nombre="Ing. Carlos Mendoza",
            correo="carlos.mendoza@ecoraee.ec",
            id_organizacion=org_emgirs.id_organizacion,
            id_rol=rol_tecnico.id_rol,
        )
        u_operador = ModelUsuario(
            nombre="Elena Valencia",
            correo="elena.valencia@ecoraee.ec",
            id_organizacion=org_uide.id_organizacion,
            id_rol=rol_operador.id_rol,
        )
        u_logistico = ModelUsuario(
            nombre="Santiago Paredes",
            correo="santiago.paredes@ecoraee.ec",
            id_organizacion=org_ecotrans.id_organizacion,
            id_rol=rol_logistico.id_rol,
        )
        session.add_all([u_admin, u_tecnico, u_operador, u_logistico])

        # 7. Centros
        c_norte = ModelCentro(
            codigo_centro="C-NOR-01",
            nombre_centro="Centro Acopio Norte (UIDE)",
            direccion="Av. Simón Bolívar y Av. Manuel Córdova Galarza",
            ciudad="Quito Norte",
            capacidad_max_ton=Decimal("45.00"),
            id_tipo_centro=tc_acopio.id_tipo_centro,
        )
        c_sur = ModelCentro(
            codigo_centro="C-SUR-02",
            nombre_centro="Centro Acopio Sur (Quitumbe)",
            direccion="Av. Cóndor Ñan y Quitumbe Ñan",
            ciudad="Quito Sur",
            capacidad_max_ton=Decimal("50.00"),
            id_tipo_centro=tc_acopio.id_tipo_centro,
        )
        c_clasif = ModelCentro(
            codigo_centro="C-CLA-03",
            nombre_centro="Planta de Clasificación Calderón",
            direccion="Panamericana Norte Km 15, Calderón",
            ciudad="Calderón",
            capacidad_max_ton=Decimal("75.00"),
            id_tipo_centro=tc_clasif.id_tipo_centro,
        )
        c_taller = ModelCentro(
            codigo_centro="T-REA-04",
            nombre_centro="Taller de Reacondicionamiento UIDE",
            direccion="Bloque Laboratorios C-2, UIDE",
            ciudad="Quito",
            capacidad_max_ton=Decimal("30.00"),
            id_tipo_centro=tc_taller.id_tipo_centro,
        )
        c_reciclaje = ModelCentro(
            codigo_centro="P-REC-05",
            nombre_centro="Planta de Reciclaje y Disposición Pifo",
            direccion="Parque Industrial Pifo, Lote 14",
            ciudad="Pifo",
            capacidad_max_ton=Decimal("120.00"),
            id_tipo_centro=tc_reciclaje.id_tipo_centro,
        )
        session.add_all([c_norte, c_sur, c_clasif, c_taller, c_reciclaje])

        # 8. Categorías RAEE (Catálogo controlado en BD)
        cat_tic = ModelCategoria(
            codigo_categoria="CAT-TIC",
            nombre_categoria="Informática y Telecomunicaciones (TIC)",
            descripcion="Laptops, computadoras de escritorio, servidores, routers y teléfonos",
        )
        cat_consumo = ModelCategoria(
            codigo_categoria="CAT-CON",
            nombre_categoria="Aparatos Electrónicos de Consumo",
            descripcion="Monitores, televisores, proyectores y equipos de audio/video",
        )
        cat_blanca = ModelCategoria(
            codigo_categoria="CAT-LB",
            nombre_categoria="Electrodomésticos y Línea Blanca",
            descripcion="Microondas, refrigeradoras, lavadoras y pequeños electrodomésticos",
        )
        cat_impresion = ModelCategoria(
            codigo_categoria="CAT-IMP",
            nombre_categoria="Equipos de Impresión y Oficina",
            descripcion="Impresoras láser, multifuncionales, escáneres y UPS",
        )
        session.add_all([cat_tic, cat_consumo, cat_blanca, cat_impresion])
        session.flush()

        # 9. Objetos RAEE (Catálogo controlado en BD, asociados a Categorías)
        obj_laptop_dell = ModelObjeto(
            codigo_objeto="OBJ-LAP-DELL7490",
            nombre_objeto="Laptop Empresarial Dell Latitude 7490",
            marca="Dell",
            modelo="Latitude 7490",
            descripcion="Portátil corporativa 14 pulgadas",
            peso_estimado_kg=Decimal("1.45"),
            id_categoria=cat_tic.id_categoria,
        )
        obj_laptop_lenovo = ModelObjeto(
            codigo_objeto="OBJ-LAP-LENT480",
            nombre_objeto="Laptop Lenovo ThinkPad T480",
            marca="Lenovo",
            modelo="ThinkPad T480",
            descripcion="Portátil profesional serie ThinkPad",
            peso_estimado_kg=Decimal("1.65"),
            id_categoria=cat_tic.id_categoria,
        )
        obj_switch_cisco = ModelObjeto(
            codigo_objeto="OBJ-NET-CISCO2960",
            nombre_objeto="Switch de Red Cisco Catalyst 2960-X",
            marca="Cisco",
            modelo="Catalyst 2960-X",
            descripcion="Switch administrable 24 puertos Gigabit",
            peso_estimado_kg=Decimal("3.80"),
            id_categoria=cat_tic.id_categoria,
        )
        obj_monitor_dell = ModelObjeto(
            codigo_objeto="OBJ-MON-DELLU2419",
            nombre_objeto="Monitor IPS Dell UltraSharp 24",
            marca="Dell",
            modelo="UltraSharp U2419H",
            descripcion="Monitor LED IPS Full HD 24 pulgadas",
            peso_estimado_kg=Decimal("4.80"),
            id_categoria=cat_consumo.id_categoria,
        )
        obj_impresora_hp = ModelObjeto(
            codigo_objeto="OBJ-IMP-HPM404",
            nombre_objeto="Impresora Láser HP LaserJet Pro M404n",
            marca="HP",
            modelo="LaserJet Pro M404n",
            descripcion="Impresora láser monocromática de oficina",
            peso_estimado_kg=Decimal("8.22"),
            id_categoria=cat_impresion.id_categoria,
        )
        session.add_all([
            obj_laptop_dell,
            obj_laptop_lenovo,
            obj_switch_cisco,
            obj_monitor_dell,
            obj_impresora_hp,
        ])
        session.flush()

        # 10. Solicitud, Lote, Dispositivo de muestra e Inventario
        sol_1 = ModelSolicitud(
            codigo_solicitud="SOL-2026-001",
            fecha_solicitud=datetime.now(timezone.utc),
            estado_recoleccion="En Recoleccion",
            id_centro=c_norte.id_centro,
        )
        session.add(sol_1)
        session.flush()

        lote_1 = ModelLote(
            codigo_lote="LOT-2026-01",
            fecha_creacion=datetime.now(timezone.utc),
            id_solicitud=sol_1.id_solicitud,
        )
        session.add(lote_1)
        session.flush()

        disp_1 = ModelDispositivo(
            num_serie="SN-DELL-7490-001",
            id_objeto=obj_laptop_dell.id_objeto,
            id_categoria=cat_tic.id_categoria,
            id_lote=lote_1.id_lote,
        )
        session.add(disp_1)
        session.flush()

        session.add(
            ModelHistorialEstados(
                id_dispositivo=disp_1.id_dispositivo,
                id_secuencia=1,
                id_estado=est_1.id_estado,
                fecha_cambio=datetime.now(timezone.utc),
                observacion="Ingreso inicial de equipo desde catálogo de BD",
            )
        )
        session.add(
            ModelInventario(
                stock_actual=1,
                fecha_actualizacion=datetime.now(timezone.utc),
                id_centro=c_norte.id_centro,
                id_categoria=cat_tic.id_categoria,
            )
        )

        # 11. Nodos y Aristas para el grafo Edmonds-Karp
        n1 = ModelNodo(id_centro=c_norte.id_centro, tipo_nodo="ORIGEN_ACOPIO", capacidad_nodo=Decimal("45.00"))
        n2 = ModelNodo(id_centro=c_sur.id_centro, tipo_nodo="ORIGEN_ACOPIO", capacidad_nodo=Decimal("50.00"))
        n3 = ModelNodo(id_centro=c_clasif.id_centro, tipo_nodo="INTERMEDIO_CLASIFICACION", capacidad_nodo=Decimal("75.00"))
        n4 = ModelNodo(id_centro=c_taller.id_centro, tipo_nodo="SUMIDERO_CIRCULAR", capacidad_nodo=Decimal("30.00"))
        n5 = ModelNodo(id_centro=c_reciclaje.id_centro, tipo_nodo="SUMIDERO_DISPOSICION", capacidad_nodo=Decimal("120.00"))
        session.add_all([n1, n2, n3, n4, n5])
        session.flush()

        session.add_all([
            ModelArista(distancia_km=Decimal("18.50"), tiempo_estimado_min=35, id_nodo_origen=n1.id_nodo, id_nodo_destino=n3.id_nodo),
            ModelArista(distancia_km=Decimal("28.00"), tiempo_estimado_min=50, id_nodo_origen=n2.id_nodo, id_nodo_destino=n3.id_nodo),
            ModelArista(distancia_km=Decimal("22.00"), tiempo_estimado_min=40, id_nodo_origen=n3.id_nodo, id_nodo_destino=n4.id_nodo),
            ModelArista(distancia_km=Decimal("32.50"), tiempo_estimado_min=55, id_nodo_origen=n3.id_nodo, id_nodo_destino=n5.id_nodo),
            ModelArista(distancia_km=Decimal("26.00"), tiempo_estimado_min=45, id_nodo_origen=n1.id_nodo, id_nodo_destino=n4.id_nodo),
        ])

        session.commit()

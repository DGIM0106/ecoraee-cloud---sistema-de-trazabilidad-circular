from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, HTTPException, Query, status
from sqlmodel import select
from MyDbContext import SessionDep
from models.model_catalogs import (
    ModelTipoCentro,
    ModelCentro,
    ModelCategoria,
    ModelObjeto,
    ModelCondicion,
    ModelEstadoCatalogo,
)
from models.model_users import ModelOrganizacion, ModelRol
from models.model_traceability import ModelInventario
from dtos.dto_common import MessageResponseDTO
from dtos.dto_catalogs import (
    TipoCentroResponseDTO,
    CentroCreateDTO,
    CentroUpdateDTO,
    CentroResponseDTO,
    CategoriaCreateDTO,
    CategoriaUpdateDTO,
    CategoriaResponseDTO,
    ObjetoCreateDTO,
    ObjetoUpdateDTO,
    ObjetoResponseDTO,
    CondicionResponseDTO,
    EstadoCatalogoResponseDTO,
    CatalogosResumenResponseDTO,
    InventarioUpdateDTO,
    InventarioAjusteDTO,
    InventarioResponseDTO,
)
from dtos.dto_users import OrganizacionResponseDTO, RolResponseDTO
from services.audit_service import registrar_auditoria

catalogos = APIRouter(prefix="/catalogos", tags=["Catálogos, Objetos e Inventario"])


def _to_centro_dto(c: ModelCentro, tipo_map: dict) -> CentroResponseDTO:
    return CentroResponseDTO(
        id_centro=c.id_centro,
        codigo_centro=c.codigo_centro,
        nombre_centro=c.nombre_centro,
        direccion=c.direccion,
        ciudad=c.ciudad,
        capacidad_max_ton=float(c.capacidad_max_ton),
        id_tipo_centro=c.id_tipo_centro,
        nombre_tipo_centro=tipo_map.get(c.id_tipo_centro, "General"),
    )


def _to_objeto_dto(obj: ModelObjeto, cat_map: dict) -> ObjetoResponseDTO:
    cat = cat_map.get(obj.id_categoria)
    return ObjetoResponseDTO(
        id_objeto=obj.id_objeto,
        codigo_objeto=obj.codigo_objeto,
        nombre_objeto=obj.nombre_objeto,
        marca=obj.marca,
        modelo=obj.modelo,
        descripcion=obj.descripcion,
        peso_estimado_kg=float(obj.peso_estimado_kg) if obj.peso_estimado_kg is not None else None,
        id_categoria=obj.id_categoria,
        nombre_categoria=cat.nombre_categoria if cat else "Sin Categoría",
        codigo_categoria=cat.codigo_categoria if cat else "",
    )


@catalogos.get("/resumen", response_model=CatalogosResumenResponseDTO)
def obtener_todos_catalogos(session: SessionDep):
    tipos_centro = session.exec(select(ModelTipoCentro)).all()
    tipo_map = {t.id_tipo_centro: t.nombre_tipo for t in tipos_centro}

    centros_raw = session.exec(select(ModelCentro)).all()
    centros = [_to_centro_dto(c, tipo_map) for c in centros_raw]

    categorias_raw = session.exec(select(ModelCategoria)).all()
    cat_map = {c.id_categoria: c for c in categorias_raw}

    objetos_raw = session.exec(select(ModelObjeto)).all()
    conteo_obj_por_cat = {}
    for o in objetos_raw:
        conteo_obj_por_cat[o.id_categoria] = conteo_obj_por_cat.get(o.id_categoria, 0) + 1

    categorias = [
        CategoriaResponseDTO(
            id_categoria=c.id_categoria,
            codigo_categoria=c.codigo_categoria,
            nombre_categoria=c.nombre_categoria,
            descripcion=c.descripcion,
            total_objetos=conteo_obj_por_cat.get(c.id_categoria, 0),
        )
        for c in categorias_raw
    ]
    objetos = [_to_objeto_dto(o, cat_map) for o in objetos_raw]

    estados = session.exec(select(ModelEstadoCatalogo).order_by(ModelEstadoCatalogo.orden)).all()

    return CatalogosResumenResponseDTO(
        tipos_centro=[TipoCentroResponseDTO.model_validate(t) for t in tipos_centro],
        centros=centros,
        categorias=categorias,
        objetos=objetos,
        condiciones=[
            CondicionResponseDTO.model_validate(c)
            for c in session.exec(select(ModelCondicion)).all()
        ],
        estados_catalogo=[EstadoCatalogoResponseDTO.model_validate(e) for e in estados],
        organizaciones=[
            OrganizacionResponseDTO.model_validate(o)
            for o in session.exec(select(ModelOrganizacion)).all()
        ],
        roles=[
            RolResponseDTO.model_validate(r)
            for r in session.exec(select(ModelRol)).all()
        ],
    )


# --- CENTROS ---

@catalogos.get("/centros", response_model=List[CentroResponseDTO])
def listar_centros(session: SessionDep):
    tipos = {t.id_tipo_centro: t.nombre_tipo for t in session.exec(select(ModelTipoCentro)).all()}
    centros = session.exec(select(ModelCentro)).all()
    return [_to_centro_dto(c, tipos) for c in centros]


@catalogos.post("/centros", status_code=status.HTTP_201_CREATED, response_model=CentroResponseDTO)
def crear_centro(data: CentroCreateDTO, session: SessionDep):
    existente = session.exec(
        select(ModelCentro).where(ModelCentro.codigo_centro == data.codigo_centro.strip())
    ).first()
    if existente:
        raise HTTPException(status_code=400, detail="El código de centro ya existe.")

    tipo = session.get(ModelTipoCentro, data.id_tipo_centro)
    if not tipo:
        raise HTTPException(status_code=404, detail="Tipo de centro no encontrado.")

    nuevo = ModelCentro(
        codigo_centro=data.codigo_centro.strip(),
        nombre_centro=data.nombre_centro.strip(),
        direccion=data.direccion.strip(),
        ciudad=data.ciudad.strip() if data.ciudad else "Quito",
        capacidad_max_ton=Decimal(str(round(data.capacidad_max_ton, 2))),
        id_tipo_centro=data.id_tipo_centro,
    )
    session.add(nuevo)
    session.commit()
    session.refresh(nuevo)
    return _to_centro_dto(nuevo, {tipo.id_tipo_centro: tipo.nombre_tipo})


@catalogos.put("/centros/{id_centro}", response_model=CentroResponseDTO)
def actualizar_centro(id_centro: UUID, data: CentroUpdateDTO, session: SessionDep):
    centro = session.get(ModelCentro, id_centro)
    if not centro:
        raise HTTPException(status_code=404, detail="Centro no encontrado.")

    if data.codigo_centro is not None:
        centro.codigo_centro = data.codigo_centro.strip()
    if data.nombre_centro is not None:
        centro.nombre_centro = data.nombre_centro.strip()
    if data.direccion is not None:
        centro.direccion = data.direccion.strip()
    if data.ciudad is not None:
        centro.ciudad = data.ciudad.strip()
    if data.capacidad_max_ton is not None:
        centro.capacidad_max_ton = Decimal(str(round(data.capacidad_max_ton, 2)))
    if data.id_tipo_centro is not None:
        if not session.get(ModelTipoCentro, data.id_tipo_centro):
            raise HTTPException(status_code=404, detail="Tipo de centro no encontrado.")
        centro.id_tipo_centro = data.id_tipo_centro

    session.add(centro)
    session.commit()
    session.refresh(centro)
    tipo = session.get(ModelTipoCentro, centro.id_tipo_centro)
    return _to_centro_dto(centro, {centro.id_tipo_centro: tipo.nombre_tipo if tipo else "General"})


@catalogos.delete("/centros/{id_centro}", response_model=MessageResponseDTO)
def eliminar_centro(id_centro: UUID, session: SessionDep):
    centro = session.get(ModelCentro, id_centro)
    if not centro:
        raise HTTPException(status_code=404, detail="Centro no encontrado.")
    try:
        session.delete(centro)
        session.commit()
        return MessageResponseDTO(message="Centro eliminado correctamente.")
    except Exception:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede eliminar el centro porque tiene solicitudes, inventario o transferencias asociadas.",
        )


# --- CATEGORÍAS (Solo gestionadas en BD) ---

@catalogos.get("/categorias", response_model=List[CategoriaResponseDTO])
def listar_categorias(session: SessionDep):
    categorias = session.exec(select(ModelCategoria)).all()
    objetos = session.exec(select(ModelObjeto)).all()
    conteo = {}
    for o in objetos:
        conteo[o.id_categoria] = conteo.get(o.id_categoria, 0) + 1

    return [
        CategoriaResponseDTO(
            id_categoria=c.id_categoria,
            codigo_categoria=c.codigo_categoria,
            nombre_categoria=c.nombre_categoria,
            descripcion=c.descripcion,
            total_objetos=conteo.get(c.id_categoria, 0),
        )
        for c in categorias
    ]


@catalogos.post("/categorias", status_code=status.HTTP_201_CREATED, response_model=CategoriaResponseDTO)
def crear_categoria(data: CategoriaCreateDTO, session: SessionDep):
    codigo_clean = data.codigo_categoria.strip().upper()
    nombre_clean = data.nombre_categoria.strip()

    if session.exec(select(ModelCategoria).where(ModelCategoria.codigo_categoria == codigo_clean)).first():
        raise HTTPException(status_code=400, detail=f"El código de categoría '{codigo_clean}' ya existe.")
    if session.exec(select(ModelCategoria).where(ModelCategoria.nombre_categoria == nombre_clean)).first():
        raise HTTPException(status_code=400, detail=f"La categoría '{nombre_clean}' ya existe.")

    cat = ModelCategoria(
        codigo_categoria=codigo_clean,
        nombre_categoria=nombre_clean,
        descripcion=data.descripcion.strip() if data.descripcion else None,
    )
    session.add(cat)
    registrar_auditoria(
        session,
        tabla_afectada="CATEGORIA",
        tipo_operacion="INSERT",
        detalle=f"Creación de categoría {cat.codigo_categoria} - {cat.nombre_categoria}",
    )
    session.commit()
    session.refresh(cat)
    return CategoriaResponseDTO(
        id_categoria=cat.id_categoria,
        codigo_categoria=cat.codigo_categoria,
        nombre_categoria=cat.nombre_categoria,
        descripcion=cat.descripcion,
        total_objetos=0,
    )


@catalogos.put("/categorias/{id_categoria}", response_model=CategoriaResponseDTO)
def actualizar_categoria(id_categoria: UUID, data: CategoriaUpdateDTO, session: SessionDep):
    cat = session.get(ModelCategoria, id_categoria)
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada.")

    if data.codigo_categoria is not None:
        codigo_clean = data.codigo_categoria.strip().upper()
        dup = session.exec(
            select(ModelCategoria).where(
                ModelCategoria.codigo_categoria == codigo_clean,
                ModelCategoria.id_categoria != id_categoria,
            )
        ).first()
        if dup:
            raise HTTPException(status_code=400, detail="Ese código de categoría ya pertenece a otra categoría.")
        cat.codigo_categoria = codigo_clean

    if data.nombre_categoria is not None:
        nombre_clean = data.nombre_categoria.strip()
        dup = session.exec(
            select(ModelCategoria).where(
                ModelCategoria.nombre_categoria == nombre_clean,
                ModelCategoria.id_categoria != id_categoria,
            )
        ).first()
        if dup:
            raise HTTPException(status_code=400, detail="Ese nombre de categoría ya existe.")
        cat.nombre_categoria = nombre_clean

    if data.descripcion is not None:
        cat.descripcion = data.descripcion.strip()

    session.add(cat)
    registrar_auditoria(
        session,
        tabla_afectada="CATEGORIA",
        tipo_operacion="UPDATE",
        detalle=f"Actualización de categoría {cat.codigo_categoria} - {cat.nombre_categoria}",
    )
    session.commit()
    session.refresh(cat)

    total_obj = len(
        session.exec(select(ModelObjeto).where(ModelObjeto.id_categoria == id_categoria)).all()
    )
    return CategoriaResponseDTO(
        id_categoria=cat.id_categoria,
        codigo_categoria=cat.codigo_categoria,
        nombre_categoria=cat.nombre_categoria,
        descripcion=cat.descripcion,
        total_objetos=total_obj,
    )


@catalogos.delete("/categorias/{id_categoria}", response_model=MessageResponseDTO)
def eliminar_categoria(id_categoria: UUID, session: SessionDep):
    cat = session.get(ModelCategoria, id_categoria)
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada.")
    try:
        nombre = cat.nombre_categoria
        session.delete(cat)
        registrar_auditoria(
            session,
            tabla_afectada="CATEGORIA",
            tipo_operacion="DELETE",
            detalle=f"Eliminación de categoría {nombre}",
        )
        session.commit()
        return MessageResponseDTO(message="Categoría eliminada correctamente.")
    except Exception:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede eliminar la categoría porque tiene objetos, dispositivos o inventario asociados.",
        )


# --- OBJETOS RAEE (Catálogo controlado en BD) ---

@catalogos.get("/objetos", response_model=List[ObjetoResponseDTO])
def listar_objetos(
    session: SessionDep,
    id_categoria: Optional[UUID] = Query(default=None),
):
    cat_map = {c.id_categoria: c for c in session.exec(select(ModelCategoria)).all()}
    stmt = select(ModelObjeto)
    if id_categoria is not None:
        stmt = stmt.where(ModelObjeto.id_categoria == id_categoria)
    objetos = session.exec(stmt).all()
    return [_to_objeto_dto(o, cat_map) for o in objetos]


@catalogos.post("/objetos", status_code=status.HTTP_201_CREATED, response_model=ObjetoResponseDTO)
def crear_objeto(data: ObjetoCreateDTO, session: SessionDep):
    cat = session.get(ModelCategoria, data.id_categoria)
    if not cat:
        raise HTTPException(
            status_code=404,
            detail="La categoría seleccionada no existe en la base de datos.",
        )

    codigo_clean = data.codigo_objeto.strip().upper()
    nombre_clean = data.nombre_objeto.strip()

    if session.exec(select(ModelObjeto).where(ModelObjeto.codigo_objeto == codigo_clean)).first():
        raise HTTPException(status_code=400, detail=f"El código de objeto '{codigo_clean}' ya existe.")
    if session.exec(select(ModelObjeto).where(ModelObjeto.nombre_objeto == nombre_clean)).first():
        raise HTTPException(status_code=400, detail=f"El objeto '{nombre_clean}' ya existe.")

    obj = ModelObjeto(
        codigo_objeto=codigo_clean,
        nombre_objeto=nombre_clean,
        marca=data.marca.strip(),
        modelo=data.modelo.strip(),
        descripcion=data.descripcion.strip() if data.descripcion else None,
        peso_estimado_kg=(
            Decimal(str(round(data.peso_estimado_kg, 2)))
            if data.peso_estimado_kg is not None
            else None
        ),
        id_categoria=data.id_categoria,
    )
    session.add(obj)
    registrar_auditoria(
        session,
        tabla_afectada="OBJETO",
        tipo_operacion="INSERT",
        detalle=f"Creación de objeto de catálogo {obj.codigo_objeto}: {obj.nombre_objeto} ({obj.marca} {obj.modelo})",
    )
    session.commit()
    session.refresh(obj)
    return _to_objeto_dto(obj, {cat.id_categoria: cat})


@catalogos.put("/objetos/{id_objeto}", response_model=ObjetoResponseDTO)
def actualizar_objeto(id_objeto: UUID, data: ObjetoUpdateDTO, session: SessionDep):
    obj = session.get(ModelObjeto, id_objeto)
    if not obj:
        raise HTTPException(status_code=404, detail="Objeto no encontrado.")

    if data.codigo_objeto is not None:
        codigo_clean = data.codigo_objeto.strip().upper()
        dup = session.exec(
            select(ModelObjeto).where(
                ModelObjeto.codigo_objeto == codigo_clean,
                ModelObjeto.id_objeto != id_objeto,
            )
        ).first()
        if dup:
            raise HTTPException(status_code=400, detail="Ese código de objeto ya existe.")
        obj.codigo_objeto = codigo_clean

    if data.nombre_objeto is not None:
        nombre_clean = data.nombre_objeto.strip()
        dup = session.exec(
            select(ModelObjeto).where(
                ModelObjeto.nombre_objeto == nombre_clean,
                ModelObjeto.id_objeto != id_objeto,
            )
        ).first()
        if dup:
            raise HTTPException(status_code=400, detail="Ese nombre de objeto ya existe.")
        obj.nombre_objeto = nombre_clean

    if data.marca is not None:
        obj.marca = data.marca.strip()
    if data.modelo is not None:
        obj.modelo = data.modelo.strip()
    if data.descripcion is not None:
        obj.descripcion = data.descripcion.strip()
    if data.peso_estimado_kg is not None:
        obj.peso_estimado_kg = Decimal(str(round(data.peso_estimado_kg, 2)))
    if data.id_categoria is not None:
        if not session.get(ModelCategoria, data.id_categoria):
            raise HTTPException(status_code=404, detail="La categoría seleccionada no existe.")
        obj.id_categoria = data.id_categoria

    session.add(obj)
    registrar_auditoria(
        session,
        tabla_afectada="OBJETO",
        tipo_operacion="UPDATE",
        detalle=f"Actualización de objeto de catálogo {obj.codigo_objeto} ({obj.nombre_objeto})",
    )
    session.commit()
    session.refresh(obj)
    cat = session.get(ModelCategoria, obj.id_categoria)
    return _to_objeto_dto(obj, {cat.id_categoria: cat} if cat else {})


@catalogos.delete("/objetos/{id_objeto}", response_model=MessageResponseDTO)
def eliminar_objeto(id_objeto: UUID, session: SessionDep):
    obj = session.get(ModelObjeto, id_objeto)
    if not obj:
        raise HTTPException(status_code=404, detail="Objeto no encontrado.")
    try:
        nombre = obj.nombre_objeto
        session.delete(obj)
        registrar_auditoria(
            session,
            tabla_afectada="OBJETO",
            tipo_operacion="DELETE",
            detalle=f"Eliminación de objeto de catálogo {nombre}",
        )
        session.commit()
        return MessageResponseDTO(message="Objeto eliminado correctamente.")
    except Exception:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede eliminar el objeto porque tiene dispositivos RAEE registrados.",
        )


# --- INVENTARIO ---

@catalogos.get("/inventario", response_model=List[InventarioResponseDTO])
def listar_inventario(session: SessionDep):
    centros = {c.id_centro: c for c in session.exec(select(ModelCentro)).all()}
    categorias = {cat.id_categoria: cat for cat in session.exec(select(ModelCategoria)).all()}
    items = session.exec(select(ModelInventario)).all()

    resultado = []
    for inv in items:
        c = centros.get(inv.id_centro)
        cat = categorias.get(inv.id_categoria)
        resultado.append(
            InventarioResponseDTO(
                id_inventario=inv.id_inventario,
                stock_actual=inv.stock_actual,
                fecha_actualizacion=inv.fecha_actualizacion,
                id_centro=inv.id_centro,
                codigo_centro=c.codigo_centro if c else "",
                nombre_centro=c.nombre_centro if c else "Centro desconocido",
                id_categoria=inv.id_categoria,
                nombre_categoria=cat.nombre_categoria if cat else "Categoría desconocida",
            )
        )
    return resultado


@catalogos.post("/inventario", response_model=InventarioResponseDTO)
def actualizar_o_crear_inventario(data: InventarioUpdateDTO, session: SessionDep):
    centro = session.get(ModelCentro, data.id_centro)
    if not centro:
        raise HTTPException(status_code=404, detail="Centro no encontrado.")
    cat = session.get(ModelCategoria, data.id_categoria)
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada.")

    existente = session.exec(
        select(ModelInventario).where(
            ModelInventario.id_centro == data.id_centro,
            ModelInventario.id_categoria == data.id_categoria,
        )
    ).first()

    ahora = datetime.now(timezone.utc)
    if existente:
        existente.stock_actual = data.stock_actual
        existente.fecha_actualizacion = ahora
        session.add(existente)
        op = "UPDATE"
        obj = existente
    else:
        obj = ModelInventario(
            stock_actual=data.stock_actual,
            fecha_actualizacion=ahora,
            id_centro=data.id_centro,
            id_categoria=data.id_categoria,
        )
        session.add(obj)
        op = "INSERT"

    registrar_auditoria(
        session,
        tabla_afectada="INVENTARIO",
        tipo_operacion=op,
        detalle=f"Actualización de inventario en {centro.codigo_centro}, categoría {cat.nombre_categoria} a stock={data.stock_actual}",
        id_usuario=data.id_usuario,
    )
    session.commit()
    session.refresh(obj)
    return InventarioResponseDTO(
        id_inventario=obj.id_inventario,
        stock_actual=obj.stock_actual,
        fecha_actualizacion=obj.fecha_actualizacion,
        id_centro=obj.id_centro,
        codigo_centro=centro.codigo_centro,
        nombre_centro=centro.nombre_centro,
        id_categoria=obj.id_categoria,
        nombre_categoria=cat.nombre_categoria,
    )


@catalogos.post("/inventario/ajuste", response_model=InventarioResponseDTO)
def ajustar_inventario_delta(data: InventarioAjusteDTO, session: SessionDep):
    centro = session.get(ModelCentro, data.id_centro)
    if not centro:
        raise HTTPException(status_code=404, detail="Centro no encontrado.")
    cat = session.get(ModelCategoria, data.id_categoria)
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada.")

    existente = session.exec(
        select(ModelInventario).where(
            ModelInventario.id_centro == data.id_centro,
            ModelInventario.id_categoria == data.id_categoria,
        )
    ).first()

    ahora = datetime.now(timezone.utc)
    if existente:
        nuevo_stock = max(0, existente.stock_actual + data.cantidad)
        existente.stock_actual = nuevo_stock
        existente.fecha_actualizacion = ahora
        session.add(existente)
        op = "UPDATE"
        obj = existente
    else:
        obj = ModelInventario(
            stock_actual=max(0, data.cantidad),
            fecha_actualizacion=ahora,
            id_centro=data.id_centro,
            id_categoria=data.id_categoria,
        )
        session.add(obj)
        op = "INSERT"

    registrar_auditoria(
        session,
        tabla_afectada="INVENTARIO",
        tipo_operacion=op,
        detalle=f"Ajuste ({data.cantidad:+d}) en {centro.codigo_centro} / {cat.nombre_categoria} -> stock={obj.stock_actual}",
        id_usuario=data.id_usuario,
    )
    session.commit()
    session.refresh(obj)
    return InventarioResponseDTO(
        id_inventario=obj.id_inventario,
        stock_actual=obj.stock_actual,
        fecha_actualizacion=obj.fecha_actualizacion,
        id_centro=obj.id_centro,
        codigo_centro=centro.codigo_centro,
        nombre_centro=centro.nombre_centro,
        id_categoria=obj.id_categoria,
        nombre_categoria=cat.nombre_categoria,
    )

from typing import List
from uuid import UUID
from fastapi import APIRouter, HTTPException, status
from sqlmodel import select
from MyDbContext import SessionDep
from models.model_users import ModelOrganizacion, ModelRol, ModelUsuario
from dtos.dto_common import MessageResponseDTO
from dtos.dto_users import (
    OrganizacionCreateDTO,
    OrganizacionUpdateDTO,
    OrganizacionResponseDTO,
    RolResponseDTO,
    UsuarioLoginDTO,
    UsuarioCreateDTO,
    UsuarioUpdateDTO,
    UsuarioResponseDTO,
    LoginResponseDTO,
)
from services.audit_service import registrar_auditoria

auth = APIRouter(prefix="/auth", tags=["Autenticación y Usuarios"])


def _to_usuario_dto(session: SessionDep, user: ModelUsuario) -> UsuarioResponseDTO:
    rol = session.get(ModelRol, user.id_rol)
    org = session.get(ModelOrganizacion, user.id_organizacion)
    return UsuarioResponseDTO(
        id_usuario=user.id_usuario,
        nombre=user.nombre,
        correo=user.correo,
        id_rol=user.id_rol,
        nombre_rol=rol.nombre_rol if rol else "Sin Rol",
        id_organizacion=user.id_organizacion,
        razon_social=org.razon_social if org else "Sin Organización",
        ruc=org.ruc if org else "",
    )


@auth.get("/users", response_model=List[UsuarioResponseDTO])
def listar_usuarios(session: SessionDep):
    users = session.exec(select(ModelUsuario)).all()
    return [_to_usuario_dto(session, u) for u in users]


@auth.post("/login", response_model=LoginResponseDTO)
def login_usuario(session: SessionDep, data: UsuarioLoginDTO):
    correo_clean = data.correo.strip().lower()
    users = session.exec(select(ModelUsuario)).all()
    user = next((u for u in users if u.correo.lower() == correo_clean), None)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El correo ingresado no se encuentra registrado en EcoRAEE Cloud.",
        )

    return LoginResponseDTO(
        message="Inicio de sesión exitoso",
        user=_to_usuario_dto(session, user),
    )


def _crear_usuario_impl(session: SessionDep, data: UsuarioCreateDTO) -> UsuarioResponseDTO:
    correo_clean = data.correo.strip().lower()
    existente = session.exec(
        select(ModelUsuario).where(ModelUsuario.correo == correo_clean)
    ).first()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya se encuentra registrado.",
        )

    org = session.get(ModelOrganizacion, data.id_organizacion)
    if not org:
        raise HTTPException(status_code=404, detail="La organización seleccionada no existe.")

    rol = session.get(ModelRol, data.id_rol)
    if not rol:
        raise HTTPException(status_code=404, detail="El rol seleccionado no existe.")

    nuevo = ModelUsuario(
        nombre=data.nombre.strip(),
        correo=correo_clean,
        id_organizacion=data.id_organizacion,
        id_rol=data.id_rol,
    )
    session.add(nuevo)
    session.commit()
    session.refresh(nuevo)

    registrar_auditoria(
        session,
        tabla_afectada="USUARIO",
        tipo_operacion="INSERT",
        detalle=f"Registro de usuario {nuevo.nombre} ({nuevo.correo}) con rol {rol.nombre_rol}",
        id_usuario=nuevo.id_usuario,
    )
    session.commit()

    return _to_usuario_dto(session, nuevo)


@auth.post("/register", status_code=status.HTTP_201_CREATED, response_model=UsuarioResponseDTO)
def registrar_usuario(session: SessionDep, data: UsuarioCreateDTO):
    return _crear_usuario_impl(session, data)


@auth.post("/users", status_code=status.HTTP_201_CREATED, response_model=UsuarioResponseDTO)
def crear_usuario(session: SessionDep, data: UsuarioCreateDTO):
    return _crear_usuario_impl(session, data)


@auth.put("/users/{id_usuario}", response_model=UsuarioResponseDTO)
def actualizar_usuario(id_usuario: UUID, data: UsuarioUpdateDTO, session: SessionDep):
    user = session.get(ModelUsuario, id_usuario)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    if data.nombre is not None:
        user.nombre = data.nombre.strip()
    if data.correo is not None:
        correo_clean = data.correo.strip().lower()
        otro = session.exec(
            select(ModelUsuario).where(
                ModelUsuario.correo == correo_clean,
                ModelUsuario.id_usuario != id_usuario,
            )
        ).first()
        if otro:
            raise HTTPException(status_code=400, detail="Ese correo ya pertenece a otro usuario.")
        user.correo = correo_clean
    if data.id_organizacion is not None:
        if not session.get(ModelOrganizacion, data.id_organizacion):
            raise HTTPException(status_code=404, detail="Organización no encontrada.")
        user.id_organizacion = data.id_organizacion
    if data.id_rol is not None:
        if not session.get(ModelRol, data.id_rol):
            raise HTTPException(status_code=404, detail="Rol no encontrado.")
        user.id_rol = data.id_rol

    session.add(user)
    registrar_auditoria(
        session,
        tabla_afectada="USUARIO",
        tipo_operacion="UPDATE",
        detalle=f"Actualización de datos del usuario {user.nombre} (UUID {id_usuario})",
        id_usuario=id_usuario,
    )
    session.commit()
    session.refresh(user)
    return _to_usuario_dto(session, user)


@auth.delete("/users/{id_usuario}", response_model=MessageResponseDTO)
def eliminar_usuario(id_usuario: UUID, session: SessionDep):
    user = session.get(ModelUsuario, id_usuario)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    try:
        nombre = user.nombre
        session.delete(user)
        session.commit()
        return MessageResponseDTO(message=f"Usuario '{nombre}' eliminado correctamente.")
    except Exception:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede eliminar este usuario porque tiene evaluaciones o registros de auditoría asociados.",
        )


@auth.get("/roles", response_model=List[RolResponseDTO])
def listar_roles(session: SessionDep):
    return session.exec(select(ModelRol)).all()


@auth.get("/organizaciones", response_model=List[OrganizacionResponseDTO])
def listar_organizaciones(session: SessionDep):
    return session.exec(select(ModelOrganizacion)).all()


@auth.post("/organizaciones", status_code=status.HTTP_201_CREATED, response_model=OrganizacionResponseDTO)
def crear_organizacion(data: OrganizacionCreateDTO, session: SessionDep):
    ruc = data.ruc.strip()
    if len(ruc) != 13 or not ruc.isdigit():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El RUC debe tener exactamente 13 dígitos numéricos (CK_ORGANIZACION_RUC).",
        )
    existente = session.exec(
        select(ModelOrganizacion).where(ModelOrganizacion.ruc == ruc)
    ).first()
    if existente:
        raise HTTPException(status_code=400, detail="Ya existe una organización con ese RUC.")

    org = ModelOrganizacion(
        ruc=ruc,
        razon_social=data.razon_social.strip(),
        direccion=data.direccion.strip() if data.direccion else None,
        telefono=data.telefono.strip() if data.telefono else None,
    )
    session.add(org)
    session.commit()
    session.refresh(org)
    return org


@auth.put("/organizaciones/{id_organizacion}", response_model=OrganizacionResponseDTO)
def actualizar_organizacion(id_organizacion: UUID, data: OrganizacionUpdateDTO, session: SessionDep):
    org = session.get(ModelOrganizacion, id_organizacion)
    if not org:
        raise HTTPException(status_code=404, detail="Organización no encontrada.")

    if data.ruc is not None:
        ruc = data.ruc.strip()
        if len(ruc) != 13 or not ruc.isdigit():
            raise HTTPException(status_code=400, detail="El RUC debe tener exactamente 13 dígitos.")
        org.ruc = ruc
    if data.razon_social is not None:
        org.razon_social = data.razon_social.strip()
    if data.direccion is not None:
        org.direccion = data.direccion.strip()
    if data.telefono is not None:
        org.telefono = data.telefono.strip()

    session.add(org)
    session.commit()
    session.refresh(org)
    return org


@auth.delete("/organizaciones/{id_organizacion}", response_model=MessageResponseDTO)
def eliminar_organizacion(id_organizacion: UUID, session: SessionDep):
    org = session.get(ModelOrganizacion, id_organizacion)
    if not org:
        raise HTTPException(status_code=404, detail="Organización no encontrada.")
    try:
        session.delete(org)
        session.commit()
        return MessageResponseDTO(message="Organización eliminada correctamente.")
    except Exception:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede eliminar la organización porque tiene usuarios asociados.",
        )

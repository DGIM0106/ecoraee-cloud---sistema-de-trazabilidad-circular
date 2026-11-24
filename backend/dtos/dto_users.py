from typing import Optional
from uuid import UUID
from pydantic import Field
from dtos.dto_common import BaseDTO


class OrganizacionCreateDTO(BaseDTO):
    ruc: str = Field(..., min_length=13, max_length=13)
    razon_social: str = Field(..., min_length=2, max_length=150)
    direccion: Optional[str] = Field(default=None, max_length=200)
    telefono: Optional[str] = Field(default=None, max_length=30)


class OrganizacionUpdateDTO(BaseDTO):
    ruc: Optional[str] = Field(default=None, min_length=13, max_length=13)
    razon_social: Optional[str] = Field(default=None, min_length=2, max_length=150)
    direccion: Optional[str] = Field(default=None, max_length=200)
    telefono: Optional[str] = Field(default=None, max_length=30)


class OrganizacionResponseDTO(BaseDTO):
    id_organizacion: UUID
    ruc: str
    razon_social: str
    direccion: Optional[str] = None
    telefono: Optional[str] = None


class RolResponseDTO(BaseDTO):
    id_rol: UUID
    nombre_rol: str
    descripcion: Optional[str] = None


class UsuarioLoginDTO(BaseDTO):
    correo: str = Field(..., min_length=3, max_length=100)


class UsuarioCreateDTO(BaseDTO):
    nombre: str = Field(..., min_length=2, max_length=100)
    correo: str = Field(..., min_length=5, max_length=100)
    id_organizacion: UUID
    id_rol: UUID


class UsuarioUpdateDTO(BaseDTO):
    nombre: Optional[str] = Field(default=None, min_length=2, max_length=100)
    correo: Optional[str] = Field(default=None, min_length=5, max_length=100)
    id_organizacion: Optional[UUID] = None
    id_rol: Optional[UUID] = None


class UsuarioResponseDTO(BaseDTO):
    id_usuario: UUID
    nombre: str
    correo: str
    id_rol: UUID
    nombre_rol: str
    id_organizacion: UUID
    razon_social: str
    ruc: str


class LoginResponseDTO(BaseDTO):
    message: str
    user: UsuarioResponseDTO

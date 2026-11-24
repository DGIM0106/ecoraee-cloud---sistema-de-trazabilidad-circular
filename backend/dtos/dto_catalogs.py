from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import Field
from dtos.dto_common import BaseDTO
from dtos.dto_users import OrganizacionResponseDTO, RolResponseDTO


class TipoCentroResponseDTO(BaseDTO):
    id_tipo_centro: UUID
    nombre_tipo: str


class CentroCreateDTO(BaseDTO):
    codigo_centro: str = Field(..., min_length=2, max_length=20)
    nombre_centro: str = Field(..., min_length=2, max_length=120)
    direccion: str = Field(..., min_length=2, max_length=200)
    ciudad: Optional[str] = Field(default="Quito", max_length=80)
    capacidad_max_ton: float = Field(default=50.0, gt=0)
    id_tipo_centro: UUID


class CentroUpdateDTO(BaseDTO):
    codigo_centro: Optional[str] = Field(default=None, min_length=2, max_length=20)
    nombre_centro: Optional[str] = Field(default=None, min_length=2, max_length=120)
    direccion: Optional[str] = Field(default=None, min_length=2, max_length=200)
    ciudad: Optional[str] = Field(default=None, max_length=80)
    capacidad_max_ton: Optional[float] = Field(default=None, gt=0)
    id_tipo_centro: Optional[UUID] = None


class CentroResponseDTO(BaseDTO):
    id_centro: UUID
    codigo_centro: str
    nombre_centro: str
    direccion: str
    ciudad: Optional[str] = None
    capacidad_max_ton: float
    id_tipo_centro: UUID
    nombre_tipo_centro: str


class CategoriaCreateDTO(BaseDTO):
    codigo_categoria: str = Field(..., min_length=2, max_length=30)
    nombre_categoria: str = Field(..., min_length=2, max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=250)


class CategoriaUpdateDTO(BaseDTO):
    codigo_categoria: Optional[str] = Field(default=None, min_length=2, max_length=30)
    nombre_categoria: Optional[str] = Field(default=None, min_length=2, max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=250)


class CategoriaResponseDTO(BaseDTO):
    id_categoria: UUID
    codigo_categoria: str
    nombre_categoria: str
    descripcion: Optional[str] = None
    total_objetos: int = 0


class ObjetoCreateDTO(BaseDTO):
    codigo_objeto: str = Field(..., min_length=2, max_length=30)
    nombre_objeto: str = Field(..., min_length=2, max_length=120)
    marca: str = Field(..., min_length=1, max_length=50)
    modelo: str = Field(..., min_length=1, max_length=60)
    descripcion: Optional[str] = Field(default=None, max_length=250)
    peso_estimado_kg: Optional[float] = Field(default=None, gt=0)
    id_categoria: UUID


class ObjetoUpdateDTO(BaseDTO):
    codigo_objeto: Optional[str] = Field(default=None, min_length=2, max_length=30)
    nombre_objeto: Optional[str] = Field(default=None, min_length=2, max_length=120)
    marca: Optional[str] = Field(default=None, min_length=1, max_length=50)
    modelo: Optional[str] = Field(default=None, min_length=1, max_length=60)
    descripcion: Optional[str] = Field(default=None, max_length=250)
    peso_estimado_kg: Optional[float] = Field(default=None, gt=0)
    id_categoria: Optional[UUID] = None


class ObjetoResponseDTO(BaseDTO):
    id_objeto: UUID
    codigo_objeto: str
    nombre_objeto: str
    marca: str
    modelo: str
    descripcion: Optional[str] = None
    peso_estimado_kg: Optional[float] = None
    id_categoria: UUID
    nombre_categoria: str
    codigo_categoria: str = ""


class CondicionResponseDTO(BaseDTO):
    id_condicion: UUID
    descripcion_condicion: str


class EstadoCatalogoResponseDTO(BaseDTO):
    id_estado: UUID
    orden: int
    nombre_estado: str


class CatalogosResumenResponseDTO(BaseDTO):
    tipos_centro: List[TipoCentroResponseDTO]
    centros: List[CentroResponseDTO]
    categorias: List[CategoriaResponseDTO]
    objetos: List[ObjetoResponseDTO]
    condiciones: List[CondicionResponseDTO]
    estados_catalogo: List[EstadoCatalogoResponseDTO]
    organizaciones: List[OrganizacionResponseDTO]
    roles: List[RolResponseDTO]


class InventarioUpdateDTO(BaseDTO):
    stock_actual: int = Field(..., ge=0)
    id_centro: UUID
    id_categoria: UUID
    id_usuario: Optional[UUID] = None


class InventarioAjusteDTO(BaseDTO):
    cantidad: int
    id_centro: UUID
    id_categoria: UUID
    id_usuario: Optional[UUID] = None


class InventarioResponseDTO(BaseDTO):
    id_inventario: UUID
    stock_actual: int
    fecha_actualizacion: datetime
    id_centro: UUID
    codigo_centro: str
    nombre_centro: str
    id_categoria: UUID
    nombre_categoria: str

from pydantic import BaseModel, ConfigDict


class BaseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)


class MessageResponseDTO(BaseDTO):
    message: str

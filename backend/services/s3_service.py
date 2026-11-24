import os
import uuid
import shutil
from typing import BinaryIO, Tuple, Dict, Any
from urllib.parse import urlparse
from dotenv import load_dotenv

try:
    import boto3
    from botocore.exceptions import BotoCoreError, ClientError
except ImportError:
    boto3 = None
    BotoCoreError = Exception
    ClientError = Exception

load_dotenv()

USE_LOCAL_STORAGE = os.getenv("USE_LOCAL_STORAGE", "true").lower() == "true"
BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://localhost:8000").rstrip("/")

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "").strip()
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "").strip()
AWS_SESSION_TOKEN = os.getenv("AWS_SESSION_TOKEN", "").strip()
AWS_REGION = os.getenv("AWS_REGION", "us-east-1").strip()
AWS_BUCKET_EVIDENCIAS = os.getenv("AWS_BUCKET_EVIDENCIAS", "ecoraee-cloud-evidencias").strip()
S3_PREFIX = os.getenv("S3_PREFIX", "evidencias").strip().strip("/")
S3_PUBLIC_BASE_URL = os.getenv("S3_PUBLIC_BASE_URL", "").strip().rstrip("/")
S3_USE_PRESIGNED_URLS = os.getenv("S3_USE_PRESIGNED_URLS", "false").lower() == "true"
S3_PRESIGNED_EXPIRATION = int(os.getenv("S3_PRESIGNED_EXPIRATION", "86400"))

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {
    ".pdf": "PDF",
    ".jpg": "JPG",
    ".jpeg": "JPG",
    ".png": "PNG",
    ".docx": "DOCX",
}


def get_storage_status() -> Dict[str, Any]:
    return {
        "mode": "local" if USE_LOCAL_STORAGE else "aws_s3",
        "bucket": None if USE_LOCAL_STORAGE else AWS_BUCKET_EVIDENCIAS,
        "region": None if USE_LOCAL_STORAGE else AWS_REGION,
        "auth_mode": (
            "local_disk"
            if USE_LOCAL_STORAGE
            else ("explicit_keys" if AWS_ACCESS_KEY_ID else "iam_instance_role")
        ),
    }


def get_s3_client():
    """
    Crea el cliente boto3 para AWS S3.
    - Si se definen AWS_ACCESS_KEY_ID y AWS_SECRET_ACCESS_KEY (y opcionalmente AWS_SESSION_TOKEN
      para AWS Academy / Learner Lab), usa esas credenciales.
    - Si están vacías en EC2, boto3 toma automáticamente el IAM Role asignado a la instancia EC2.
    """
    if boto3 is None:
        raise RuntimeError("boto3 no está instalado. Ejecuta 'pip install boto3'.")

    client_kwargs: Dict[str, Any] = {"region_name": AWS_REGION}
    if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
        client_kwargs["aws_access_key_id"] = AWS_ACCESS_KEY_ID
        client_kwargs["aws_secret_access_key"] = AWS_SECRET_ACCESS_KEY
        if AWS_SESSION_TOKEN:
            client_kwargs["aws_session_token"] = AWS_SESSION_TOKEN

    return boto3.client("s3", **client_kwargs)


def detect_tipo_archivo(filename: str) -> Tuple[str, str]:
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"Extensión '{ext}' no permitida. Solo se aceptan PDF, JPG, PNG, DOCX."
        )
    return ALLOWED_EXTENSIONS[ext], ext


def upload_evidence_file(
    file_obj: BinaryIO,
    filename: str,
    content_type: str,
) -> Tuple[str, str, str]:
    """
    Sube un archivo de evidencia a almacenamiento local (desarrollo) o AWS S3 (producción).
    Retorna: (nombre_archivo_seguro, tipo_archivo, url_archivo)
    """
    tipo_archivo, ext = detect_tipo_archivo(filename)
    unique_filename = f"evidencia_{uuid.uuid4()}{ext}"

    file_obj.seek(0)

    if USE_LOCAL_STORAGE:
        local_path = os.path.join(UPLOAD_DIR, unique_filename)
        with open(local_path, "wb") as out_file:
            shutil.copyfileobj(file_obj, out_file)
        file_url = f"{BACKEND_BASE_URL}/uploads/{unique_filename}"
        return unique_filename, tipo_archivo, file_url

    s3_key = f"{S3_PREFIX}/{unique_filename}" if S3_PREFIX else unique_filename
    s3_client = get_s3_client()
    try:
        s3_client.upload_fileobj(
            file_obj,
            AWS_BUCKET_EVIDENCIAS,
            s3_key,
            ExtraArgs={"ContentType": content_type or "application/octet-stream"},
        )
    except (BotoCoreError, ClientError) as exc:
        raise RuntimeError(f"Error al subir evidencia a AWS S3 ({AWS_BUCKET_EVIDENCIAS}): {exc}") from exc

    if S3_USE_PRESIGNED_URLS:
        file_url = s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": AWS_BUCKET_EVIDENCIAS, "Key": s3_key},
            ExpiresIn=S3_PRESIGNED_EXPIRATION,
        )
    elif S3_PUBLIC_BASE_URL:
        file_url = f"{S3_PUBLIC_BASE_URL}/{s3_key}"
    else:
        file_url = f"https://{AWS_BUCKET_EVIDENCIAS}.s3.{AWS_REGION}.amazonaws.com/{s3_key}"

    return unique_filename, tipo_archivo, file_url


def delete_evidence_file(file_url: str) -> bool:
    if not file_url:
        return False

    try:
        parsed = urlparse(file_url)
        clean_path = parsed.path.lstrip("/")

        if USE_LOCAL_STORAGE or "/uploads/" in file_url:
            filename = os.path.basename(clean_path)
            local_path = os.path.join(UPLOAD_DIR, filename)
            if os.path.exists(local_path):
                os.remove(local_path)
            return True

        s3_key = clean_path
        s3_client = get_s3_client()
        s3_client.delete_object(Bucket=AWS_BUCKET_EVIDENCIAS, Key=s3_key)
        return True
    except Exception as e:
        print(f"Error al eliminar archivo de evidencia ({file_url}): {e}")
        return False

# Guía de Despliegue en AWS — EcoRAEE Cloud (RDS SQL Server + EC2 + S3)

Esta guía explica paso a paso cómo desplegar **EcoRAEE Cloud** (arquitectura con **DTOs**, **UUIDs** y **catálogos controlados de Categorías y Objetos en base de datos**) en Amazon Web Services utilizando:

- **AWS RDS for SQL Server** — Base de datos relacional (`EcoRAEE_DB`) con claves primarias `UNIQUEIDENTIFIER` (UUID).
- **AWS EC2 (Ubuntu 22.04 / 24.04)** — Servidor Backend **FastAPI + Gunicorn/Uvicorn + Nginx**.
- **AWS S3 Bucket (Evidencias)** — Almacenamiento de actas y archivos PDF/JPG/PNG/DOCX mediante `boto3`.
- **AWS S3 Bucket (Frontend estático)** — Alojamiento del Frontend **React + Vite + TypeScript**.

> **Nota importante:** El archivo `backend/MyDbContext.py` no requiere ninguna modificación para AWS RDS, ya que lee automáticamente la variable de entorno `DATABASE_URL` desde `backend/.env`.

---

## Arquitectura en AWS

```mermaid
flowchart LR
    U["Usuario (Navegador)"] --> S3F["AWS S3 Bucket (Frontend React/Vite)"]
    S3F -->|REST API JSON DTOs| EC2["AWS EC2 (Nginx :80 -> FastAPI :8000)"]
    EC2 -->|pyodbc ODBC Driver 17 :1433| RDS["AWS RDS SQL Server (EcoRAEE_DB - UUID)"]
    EC2 -->|boto3 S3 API| S3E["AWS S3 Bucket (Evidencias RAEE)"]
```

---

## Paso 1: Crear y Configurar AWS RDS for SQL Server

1. Ingresa a la consola de AWS y abre **Amazon RDS** → **Create database**.
2. Selecciona:
   - **Engine type:** `Microsoft SQL Server`
   - **Edition:** `SQL Server Express Edition` (incluida en Free Tier / AWS Academy)
   - **DB instance identifier:** `ecoraee-sqlserver`
   - **Master username:** `admin`
   - **Master password:** define una contraseña segura (evita caracteres especiales como `@`, `#`, `/` o codifícalos en URL-encode si los usas).
   - **Instance configuration:** `db.t3.micro` (o `db.t3.small`).
   - **Connectivity:**
     - **Public access:** `Yes` solo si te conectarás desde SSMS/Azure Data Studio en tu PC para crear la BD `EcoRAEE_DB` (luego puedes restringirlo únicamente al Security Group de tu EC2).
     - **VPC Security Group:** crea uno nuevo llamado `ecoraee-rds-sg`.
3. Espera a que el estado sea **Available** y copia el **Endpoint** (ejemplo: `ecoraee-sqlserver.xxxxxxxxxxxx.us-east-1.rds.amazonaws.com`).
4. En **Security Groups → `ecoraee-rds-sg` → Inbound rules**, agrega:
   - **Type:** `MS SQL` (TCP `1433`)
   - **Source:** Security Group de tu EC2 (`ecoraee-ec2-sg`) — y temporalmente tu IP pública si crearás la BD desde tu PC.
5. Conéctate al endpoint con **SQL Server Management Studio (SSMS)** o **Azure Data Studio** usando `admin` y tu contraseña, y crea la base de datos:
   ```sql
   CREATE DATABASE EcoRAEE_DB;
   GO
   ```
   - **Opción A (Automática con SQLModel):** Al iniciar FastAPI, `MyDbContext.create_all_tables` creará todas las tablas con `UNIQUEIDENTIFIER`. Luego puedes llamar a `POST /seed` (desde `/docs` o `curl -X POST http://localhost/seed`) para poblar los catálogos iniciales con UUID si la BD está vacía.
   - **Opción B (Manual con Script DDL):** Ejecuta el archivo `database/EcoRAEE_UUID_SQLServer.sql` sobre `EcoRAEE_DB`.

---

## Paso 2: Crear los Buckets de AWS S3

### 2.1 Bucket para Evidencias (`ecoraee-cloud-evidencias`)

1. Abre **Amazon S3** → **Create bucket**.
2. **Bucket name:** un nombre único global, por ejemplo `ecoraee-cloud-evidencias-tuempresa`.
3. **Region:** `us-east-1` (misma región que tu EC2 y RDS).
4. **Acceso a los archivos:**
   - **Opción recomendada (Privado + Presigned URLs):** deja activado *Block all public access* y en el `.env` del backend pon `S3_USE_PRESIGNED_URLS=true`. Así las evidencias se descargan con enlaces firmados temporales sin hacer público el bucket.
   - **Opción pública (solo lectura):** desactiva *Block all public access* y agrega una Bucket Policy de `s3:GetObject` para `arn:aws:s3:::TU-BUCKET-EVIDENCIAS/*`, dejando `S3_USE_PRESIGNED_URLS=false`.
5. Configura **Permissions → CORS** del bucket de evidencias:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
       "AllowedOrigins": ["*"],
       "ExposeHeaders": ["ETag"]
     }
   ]
   ```

### 2.2 Bucket para Frontend React (`ecoraee-cloud-frontend`)

1. Crea otro bucket, por ejemplo `ecoraee-cloud-frontend-tuempresa` en `us-east-1`.
2. Desactiva **Block all public access** (necesario para S3 Static Website Hosting).
3. En **Properties → Static website hosting**, haz clic en **Edit** → **Enable**:
   - **Index document:** `index.html`
   - **Error document:** `index.html` *(muy importante para que las rutas de React Router como `/catalogos` o `/dispositivos` funcionen al recargar)*.
4. En **Permissions → Bucket policy**, pega (reemplazando `TU-BUCKET-FRONTEND`):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::TU-BUCKET-FRONTEND/*"
       }
     ]
   }
   ```
5. Copia el **Bucket website endpoint** (ejemplo: `http://ecoraee-cloud-frontend-tuempresa.s3-website-us-east-1.amazonaws.com`).

---

## Paso 3: Crear y Configurar la Instancia AWS EC2 (Backend FastAPI)

1. Abre **EC2** → **Launch instance**:
   - **Name:** `ecoraee-backend-ec2`
   - **AMI:** `Ubuntu Server 22.04 LTS` o `24.04 LTS` (64-bit x86)
   - **Instance type:** `t3.small` o `t3.micro`
   - **Key pair:** crea o selecciona tu `.pem`
   - **Security Group (`ecoraee-ec2-sg`) — Inbound rules:**
     - `SSH (22)` → Tu IP
     - `HTTP (80)` → `0.0.0.0/0`
     - `HTTPS (443)` → `0.0.0.0/0` (opcional si luego agregas dominio/Certbot)
   - **IAM Instance Profile (Recomendado):** asigna un IAM Role con permisos `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` sobre tu bucket de evidencias (en **AWS Academy** selecciona `LabInstanceProfile`).
2. Conéctate por SSH a tu EC2:
   ```bash
   ssh -i tu-llave.pem ubuntu@TU_IP_PUBLICA_EC2
   ```
3. Clona el proyecto en `/opt/ecoraee`:
   ```bash
   sudo mkdir -p /opt/ecoraee
   sudo chown -R ubuntu:ubuntu /opt/ecoraee
   git clone https://github.com/TU_USUARIO/TU_REPO.git /opt/ecoraee
   ```
4. Crea el archivo `/opt/ecoraee/backend/.env` basado en `backend/.env.example`:
   ```env
   # AWS RDS SQL Server (MyDbContext.py lee esta variable automáticamente)
   DATABASE_URL=mssql+pyodbc://admin:TU_PASSWORD@ecoraee-sqlserver.xxxxxxxxxxxx.us-east-1.rds.amazonaws.com:1433/EcoRAEE_DB?driver=ODBC+Driver+17+for+SQL+Server&Encrypt=yes&TrustServerCertificate=yes

   # Orígenes permitidos (URL de tu bucket S3 del frontend)
   CORS_ORIGINS=http://ecoraee-cloud-frontend-tuempresa.s3-website-us-east-1.amazonaws.com,http://localhost:3000

   BACKEND_BASE_URL=http://TU_IP_PUBLICA_EC2

   # Desactivar almacenamiento local para usar AWS S3
   USE_LOCAL_STORAGE=false
   AWS_REGION=us-east-1
   AWS_BUCKET_EVIDENCIAS=ecoraee-cloud-evidencias-tuempresa
   S3_PREFIX=evidencias

   # Si tu EC2 tiene IAM Role (o LabInstanceProfile), deja estas 3 líneas vacías.
   # Si usas credenciales temporales de AWS Academy, complétalas aquí:
   AWS_ACCESS_KEY_ID=
   AWS_SECRET_ACCESS_KEY=
   AWS_SESSION_TOKEN=

   # true si el bucket de evidencias es privado (recomendado); false si es público
   S3_USE_PRESIGNED_URLS=true
   S3_PRESIGNED_EXPIRATION=86400
   ```
5. Ejecuta el script de aprovisionamiento incluido en el repositorio:
   ```bash
   chmod +x /opt/ecoraee/deploy/setup_ec2.sh
   /opt/ecoraee/deploy/setup_ec2.sh
   ```
   Este script instala:
   - `msodbcsql17` (Microsoft ODBC Driver 17 for SQL Server) y `unixodbc-dev`.
   - Entorno virtual `venv` e instalación de `backend/requirements.txt`.
   - Servicio `systemd` (`ecoraee-backend.service`) ejecutando Gunicorn + UvicornWorker.
   - Proxy inverso **Nginx** exponiendo la API en el puerto `80`.
6. Verifica que el backend esté sano y conectado a RDS y S3:
   ```bash
   curl http://localhost/health
   ```
   Debes ver `"status": "healthy"`, `"database": "connected"` y `"mode": "aws_s3"`.
   También puedes abrir en el navegador la documentación Swagger de todos los DTOs y UUIDs en:
   `http://TU_IP_PUBLICA_EC2/docs`

---

## Paso 4: Compilar y Subir el Frontend React al Bucket S3

En tu máquina local (dentro de la carpeta `frontend/`):

1. Crea el archivo `frontend/.env.production`:
   ```env
   VITE_API_URL=http://TU_IP_PUBLICA_EC2
   ```
2. Instala dependencias y genera el bundle de producción:
   ```bash
   cd frontend
   npm install
   npm run build
   ```
3. Sube la carpeta `frontend/dist` a tu bucket S3 del frontend:
   - **Con AWS CLI:**
     ```bash
     aws s3 sync dist/ s3://ecoraee-cloud-frontend-tuempresa --delete
     ```
   - **O manualmente:** desde la consola de AWS S3, entra al bucket del frontend y sube todo el contenido de `frontend/dist/`.
4. Abre tu aplicación en el navegador usando el endpoint del bucket S3:
   `http://ecoraee-cloud-frontend-tuempresa.s3-website-us-east-1.amazonaws.com`

---

## Paso 5: Pruebas de Verificación Post-Despliegue

1. **Verificar `/health`:** Confirmar conexión a RDS SQL Server y modo `aws_s3`.
2. **Catálogos en BD (`/catalogos`):**
   - Crea una nueva **Categoría** (se genera un UUID en `CATEGORIA`).
   - Crea un nuevo **Objeto RAEE** asociado a esa categoría (se genera un UUID en `OBJETO`).
3. **Dispositivos (`/dispositivos`):**
   - Pulsa **Registrar Nuevo RAEE** y verifica que tanto la Categoría como el Objeto solo pueden seleccionarse de los registros guardados en la base de datos (sin entrada libre).
4. **Evidencias en S3:**
   - Cierra un dispositivo adjuntando un archivo `.pdf` o `.png`.
   - Verifica en el bucket `ecoraee-cloud-evidencias` que el archivo aparezca dentro de `evidencias/evidencia_<uuid>.<ext>` y que el enlace en la trazabilidad abra correctamente.

---

## Troubleshooting Común

| Problema | Causa probable | Solución |
| --- | --- | --- |
| `Can't open lib 'ODBC Driver 17 for SQL Server'` | Falta el driver ODBC de Microsoft en Ubuntu | Ejecuta `/opt/ecoraee/deploy/setup_ec2.sh` o verifica `odbcinst -q -d`. |
| Timeout conectando a RDS | Security Group de RDS no permite puerto `1433` desde EC2 | Agrega una regla Inbound TCP `1433` en `ecoraee-rds-sg` con origen `ecoraee-ec2-sg`. |
| Error `CORS` en el navegador | La URL del bucket S3 no está en `CORS_ORIGINS` | Agrega el endpoint exacto (sin `/` al final) en `backend/.env` y reinicia: `sudo systemctl restart ecoraee-backend`. |
| Error `403 / AccessDenied` al subir a S3 | EC2 sin IAM Role o token de AWS Academy expirado | Adjunta `LabInstanceProfile` a la EC2 o actualiza `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` y `AWS_SESSION_TOKEN` en `.env`. |
| Ver logs en tiempo real en EC2 | Diagnóstico de errores del backend | `sudo journalctl -u ecoraee-backend -f` |

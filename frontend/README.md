# EcoRAEE Cloud – Sistema de Trazabilidad Circular de RAEE
### Proyecto Integrador (Parte II: Desarrollo Local Integrado & Alistamiento AWS)

---

## 🌿 Identidad Visual del Sistema
- **Paleta de Colores:** Fondo blanco y lienzo ultra-limpio pastel (`#FFFFFF`, `#F8FAF9`), verde oscuro pastel institucional (`#274C3D`), acentos suaves verde menta/salvia (`#EBF2EE`, `#C5D8CF`) y bordes refinados (`#D6E3DC`).
- **Diseño UX/UI:** Bordes pronunciados (`rounded-3xl`, `rounded-2xl`), sombras suaves, tipografía legible (*Plus Jakarta Sans*), tablas limpias con estados visuales y navegación fluida sin interfaces oscuras recargadas.

---

## 📁 Estructura del Proyecto (Frontend y Backend Separados)

```text
EcoRAEE_Cloud/
│
├── frontend/                          # APLICACIÓN FRONTEND (React 19 + TypeScript + Tailwind)
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts              # Cliente Axios (http://localhost:8000 con mock fallback activo)
│   │   ├── components/
│   │   │   ├── atoms/
│   │   │   │   ├── Avatar.tsx         # Avatares con iniciales y anillos en verde pastel
│   │   │   │   ├── Button.tsx         # Botones primarios (#274C3D), secundarios y outline
│   │   │   │   └── Input.tsx          # Inputs limpios con foco en verde pastel
│   │   │   ├── molecules/
│   │   │   │   └── FormField.tsx      # Contenedor de formulario con etiquetas y validaciones
│   │   │   └── organisms/
│   │   │       └── NavBar.tsx         # Barra superior con navegación, logo y cambio de rol
│   │   ├── context/
│   │   │   └── AuthContext.tsx        # Sesión y cambio rápido entre los 5 roles / integrantes
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx      # KPIs, 04_consultas.sql (Centro, Categoría, Pendientes), Alertas
│   │   │   ├── DispositivosPage.tsx   # CRUD RAEE, Evaluación Técnica, Transferencia, Cierre y Línea de Tiempo
│   │   │   ├── SolicitudesLotesPage.tsx # Solicitudes de retiro, Lotes, Centros de acopio y Stock
│   │   │   ├── RedFlujoPage.tsx       # Edmonds-Karp (Flujo Máximo / Min-Cut), Grafo SVG y Reglas Discretas
│   │   │   ├── UsuariosOrgPage.tsx    # Usuarios, Organizaciones (RUC 13 dígitos) y Roles RBAC
│   │   │   └── AuthPage.tsx           # Selector rápido de personas / roles y autenticación
│   │   ├── types/
│   │   │   └── index.ts               # Modelos de datos TypeScript (23 entidades relacionales)
│   │   ├── App.tsx                    # Enrutamiento con react-router-dom
│   │   ├── main.tsx                   # Punto de entrada React 19
│   │   └── index.css                  # Tailwind CSS y variables de color
│   ├── index.html
│   └── package.json
│
├── backend/                           # API REST BACKEND (Python + FastAPI + SQLModel)
│   ├── app/
│   │   └── routers/
│   │       ├── router_users.py        # RBAC, Usuarios, Roles y Organizaciones
│   │       ├── router_catalogs.py     # Centros, Categorías, Condiciones e Inventario
│   │       ├── router_solicitudes.py  # Solicitudes de recolección y Lotes
│   │       ├── router_dispositivos.py # CRUD Dispositivos, Diagnóstico, Transferencias y Cierre
│   │       └── router_network.py      # Simulador Edmonds-Karp, Topología y Dashboard analítico
│   ├── models/
│   │   ├── model_users.py             # Modelos de Usuarios, Roles y Organizaciones
│   │   ├── model_catalogs.py          # Modelos de Centros, Categorías y Condiciones
│   │   ├── model_traceability.py      # Modelos de Solicitudes, Lotes, Dispositivos y Tratamiento
│   │   └── model_network.py           # Modelos de Nodos, Aristas, Escenarios y Auditoría
│   ├── services/
│   │   ├── audit_service.py           # Registro automático en tabla AUDITORIA
│   │   ├── flow_service.py            # Algoritmo Edmonds-Karp y formalización matemática
│   │   └── s3_service.py              # Almacenamiento de actas/evidencias (preparado para AWS S3)
│   ├── uploads/                       # Directorio local para actas y fotos
│   ├── MyDbContext.py                 # Conexión SQL Server / SQLModel con fallback seguro
│   ├── main.py                        # Instancia FastAPI, CORS y montaje de routers
│   └── requirements.txt               # Dependencias Python
│
└── database/                          # BASE DE DATOS RELACIONAL (SQL Server)
    └── EcoRAEE_Schema_DDL_DML.sql     # Script SQL Server oficial (DDL 3FN, claves, restricciones y mock data)
```

---

## 💻 Paso a Paso: Cómo Copiar a VS Code y Correr Localmente

### 1. Clonar o Copiar los Archivos a tu Máquina
Crea una carpeta en tu computadora, por ejemplo `EcoRAEE_Cloud`, y copia adentro las carpetas `backend/`, `frontend/` y `database/`.

Abre la carpeta en **VS Code**:
```bash
code EcoRAEE_Cloud
```

---

### 2. Base de Datos (Microsoft SQL Server)
1. Abre **SQL Server Management Studio (SSMS)** o Azure Data Studio.
2. Conéctate a tu instancia local (`localhost` o `.\SQLEXPRESS`).
3. Abre el archivo `database/EcoRAEE_Schema_DDL_DML.sql` y ejecútalo (**F5**).
4. El script creará la base de datos `EcoRAEE_DB`, todas sus 23 tablas normalizadas en 3FN, restricciones de integridad referencial, índices y cargará los datos de prueba iniciales.

---

### 3. Levantar el Backend (Python + FastAPI)
Abre una terminal en VS Code y dirígete a la carpeta `backend`:
```bash
cd backend
```

1. **Crear y activar el entorno virtual:**
   - **En Windows:**
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\activate
     ```
   - **En macOS / Linux:**
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

2. **Instalar dependencias:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Iniciar el servidor FastAPI:**
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   - La API quedará escuchando en: `http://localhost:8000`
   - Documentación interactiva Swagger UI: `http://localhost:8000/docs`

---

### 4. Levantar el Frontend (React + Vite)
Abre **una segunda terminal** en VS Code y ve a la carpeta raíz o `frontend`:
```bash
cd frontend
npm install
npm run dev
```
- La aplicación abrirá en: `http://localhost:5173` o `http://localhost:3000`
- Puedes navegar de inmediato entre todos los módulos, registrar dispositivos, evaluar diagnósticos técnicos, simular la red de flujo y cambiar entre los 5 roles predefinidos.

---

## ☁️ Guía de Alistamiento para Subir a AWS

La arquitectura de EcoRAEE Cloud fue diseñada con desacoplamiento modular para migrar sin fricción a Amazon Web Services:

### 1. Base de Datos: Amazon RDS para SQL Server
1. En la consola de AWS, dirígete a **Amazon RDS** -> **Create database**.
2. Selecciona **Microsoft SQL Server** (Edición *Express* o *Web* para optimizar costos universitarios).
3. Configura el identificador de la BD (`ecoraee-db`), usuario maestro y contraseña.
4. En **VPC Security Groups**, habilita una regla de entrada (*Inbound Rule*) para el puerto `1433` permitiendo la conexión de tu backend.
5. Conéctate desde SSMS al *Endpoint* de RDS y ejecuta `database/EcoRAEE_Schema_DDL_DML.sql`.
6. En tu archivo `.env` del backend, actualiza la cadena:
   ```env
   DATABASE_URL="mssql+pyodbc://admin_user:password@ecoraee-db.cxxxxx.us-east-1.rds.amazonaws.com:1433/EcoRAEE_DB?driver=ODBC+Driver+17+for+SQL+Server"
   ```

### 2. Almacenamiento de Evidencias: Amazon S3
1. Crea un bucket en **Amazon S3**, por ejemplo `ecoraee-evidencias-prod`.
2. Habilita acceso seguro y genera una política IAM para el usuario de la aplicación.
3. El servicio `backend/services/s3_service.py` ya incluye la lógica de integración con `boto3`. Configura en el `.env` del backend:
   ```env
   AWS_ACCESS_KEY_ID="tu_access_key"
   AWS_SECRET_ACCESS_KEY="tu_secret_key"
   AWS_S3_BUCKET_NAME="ecoraee-evidencias-prod"
   AWS_REGION="us-east-1"
   ```

### 3. Backend: AWS App Runner o Amazon ECS
- **AWS App Runner** es la opción más sencilla para FastAPI:
  1. Conecta tu repositorio de GitHub.
  2. Configura el comando de compilación: `pip install -r backend/requirements.txt`.
  3. Configura el comando de inicio: `uvicorn main:app --host 0.0.0.0 --port 8000`.
  4. Agrega las variables de entorno (`DATABASE_URL`, credenciales AWS).
  5. App Runner te proporcionará una URL HTTPS pública (ej. `https://api.ecoraee.awsapprunner.com`).

### 4. Frontend: AWS Amplify o Amazon S3 + CloudFront
1. Genera los archivos de producción con:
   ```bash
   npm run build
   ```
2. La carpeta `dist/` resultante contiene la SPA estática lista para hospedar.
3. En **AWS Amplify Hosting**, conecta tu repositorio de frontend o arrastra la carpeta `dist/`.
4. Define la variable de entorno `VITE_API_URL` apuntando a la URL HTTPS de tu backend en App Runner.

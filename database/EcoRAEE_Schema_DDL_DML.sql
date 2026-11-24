-- ============================================================================
-- PROYECTO INTEGRADOR QUINTO SEMESTRE: EcoRAEE Cloud
-- Universidad Internacional del Ecuador (UIDE) / Arizona State University (ASU)
-- SCRIPT COMPLETO DE BASE DE DATOS PARA MICROSOFT SQL SERVER (DDL Y DML)
-- Componente: Sistemas de Gestión de Bases de Datos (RF-BD-01 al RF-BD-07)
-- ============================================================================

-- 1. CREACIÓN DE LA BASE DE DATOS (Opcional si ya existe en tu instancia)
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'EcoRAEE_DB')
BEGIN
    CREATE DATABASE EcoRAEE_DB;
END
GO

USE EcoRAEE_DB;
GO

-- ============================================================================
-- 2. DDL: DEFINICIÓN DE TABLAS, CLAVES Y RESTRICCIONES (NORMALIZADO A 3FN)
-- ============================================================================

-- Tabla de Roles del Sistema
IF OBJECT_ID(N'dbo.Roles', N'U') IS NOT NULL DROP TABLE dbo.Roles;
CREATE TABLE dbo.Roles (
    id_rol INT IDENTITY(1,1) PRIMARY KEY,
    codigo_rol NVARCHAR(30) NOT NULL UNIQUE,
    nombre_rol NVARCHAR(80) NOT NULL,
    descripcion NVARCHAR(200) NULL,
    CONSTRAINT CHK_RolCodigo CHECK (codigo_rol IN ('GENERADOR', 'OPERADOR_CENTRO', 'TECNICO_EVALUADOR', 'COORDINADOR_LOGISTICO', 'REACONDICIONADOR', 'ADMINISTRADOR'))
);
GO

-- Tabla de Usuarios / Actores (RN-07)
IF OBJECT_ID(N'dbo.Usuarios', N'U') IS NOT NULL DROP TABLE dbo.Usuarios;
CREATE TABLE dbo.Usuarios (
    id_usuario INT IDENTITY(1,1) PRIMARY KEY,
    nombre_completo NVARCHAR(150) NOT NULL,
    email NVARCHAR(120) NOT NULL UNIQUE,
    id_rol INT NOT NULL,
    organizacion NVARCHAR(120) NOT NULL,
    telefono NVARCHAR(25) NULL,
    activo BIT NOT NULL DEFAULT 1,
    fecha_registro DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_Usuarios_Roles FOREIGN KEY (id_rol) REFERENCES dbo.Roles(id_rol)
);
GO

-- Tabla de Centros de Acopio, Talleres y Gestores
IF OBJECT_ID(N'dbo.CentrosAcopio', N'U') IS NOT NULL DROP TABLE dbo.CentrosAcopio;
CREATE TABLE dbo.CentrosAcopio (
    id_centro INT IDENTITY(1,1) PRIMARY KEY,
    nombre_centro NVARCHAR(150) NOT NULL,
    tipo_centro NVARCHAR(40) NOT NULL,
    ciudad NVARCHAR(80) NOT NULL,
    direccion NVARCHAR(250) NOT NULL,
    capacidad_maxima_kg DECIMAL(10,2) NOT NULL,
    capacidad_ocupada_kg DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    responsable_id INT NOT NULL,
    activo BIT NOT NULL DEFAULT 1,
    CONSTRAINT CHK_TipoCentro CHECK (tipo_centro IN ('ACOPIO_PRIMARIO', 'CENTRO_CLASIFICACION', 'TALLER_REACONDICIONAMIENTO', 'GESTOR_RECICLAJE', 'DISPOSICION_CONTROLADA')),
    CONSTRAINT CHK_CapacidadValida CHECK (capacidad_maxima_kg > 0 AND capacidad_ocupada_kg >= 0 AND capacidad_ocupada_kg <= capacidad_maxima_kg * 1.5),
    CONSTRAINT FK_Centros_Responsable FOREIGN KEY (responsable_id) REFERENCES dbo.Usuarios(id_usuario)
);
GO

-- Tabla de Categorías de Residuos Electrónicos
IF OBJECT_ID(N'dbo.CategoriasRAEE', N'U') IS NOT NULL DROP TABLE dbo.CategoriasRAEE;
CREATE TABLE dbo.CategoriasRAEE (
    id_categoria INT IDENTITY(1,1) PRIMARY KEY,
    codigo_categoria NVARCHAR(30) NOT NULL UNIQUE,
    nombre_categoria NVARCHAR(100) NOT NULL,
    tiempo_vida_util_estimado_anos INT NULL
);
GO

-- Tabla de Lotes de RAEE (Agrupaciones logísticas)
IF OBJECT_ID(N'dbo.LotesRAEE', N'U') IS NOT NULL DROP TABLE dbo.LotesRAEE;
CREATE TABLE dbo.LotesRAEE (
    id_lote INT IDENTITY(1,1) PRIMARY KEY,
    codigo_lote NVARCHAR(50) NOT NULL UNIQUE,
    descripcion NVARCHAR(250) NOT NULL,
    id_centro_origen INT NOT NULL,
    id_centro_destino INT NOT NULL,
    peso_total_kg DECIMAL(10,2) NOT NULL,
    cantidad_equipos INT NOT NULL,
    estado_lote NVARCHAR(30) NOT NULL DEFAULT 'EN_PREPARACION',
    fecha_creacion DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    fecha_despacho DATETIME2(0) NULL,
    fecha_recepcion DATETIME2(0) NULL,
    CONSTRAINT CHK_LoteEstado CHECK (estado_lote IN ('EN_PREPARACION', 'EN_TRANSITO', 'RECIBIDO', 'PROCESADO')),
    CONSTRAINT CHK_LotePeso CHECK (peso_total_kg > 0 AND cantidad_equipos >= 1),
    CONSTRAINT FK_Lote_Origen FOREIGN KEY (id_centro_origen) REFERENCES dbo.CentrosAcopio(id_centro),
    CONSTRAINT FK_Lote_Destino FOREIGN KEY (id_centro_destino) REFERENCES dbo.CentrosAcopio(id_centro)
);
GO

-- Tabla de Dispositivos RAEE (Núcleo de Trazabilidad RN-01 a RN-08)
IF OBJECT_ID(N'dbo.DispositivosRAEE', N'U') IS NOT NULL DROP TABLE dbo.DispositivosRAEE;
CREATE TABLE dbo.DispositivosRAEE (
    id_dispositivo INT IDENTITY(101,1) PRIMARY KEY,
    codigo_qr NVARCHAR(50) NOT NULL UNIQUE,
    nombre_equipo NVARCHAR(150) NOT NULL,
    id_categoria INT NOT NULL,
    marca NVARCHAR(60) NOT NULL,
    modelo NVARCHAR(80) NOT NULL,
    numero_serie NVARCHAR(100) NOT NULL,
    peso_kg DECIMAL(8,2) NOT NULL,
    condicion NVARCHAR(30) NOT NULL,
    clasificacion NVARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
    estado NVARCHAR(30) NOT NULL DEFAULT 'REGISTRADO',
    id_centro_actual INT NOT NULL,
    generador_nombre NVARCHAR(120) NOT NULL,
    id_lote INT NULL,
    observaciones NVARCHAR(500) NULL,
    evidencia_url NVARCHAR(300) NULL,
    fecha_ingreso DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    fecha_actualizacion DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT CHK_CondicionFisica CHECK (condicion IN ('FUNCIONAL', 'DANADO_LEVE', 'INOPERATIVO', 'OBSOLETO', 'DESMANTELADO')),
    CONSTRAINT CHK_ClasificacionTecnica CHECK (clasificacion IN ('PENDIENTE', 'REUTILIZABLE', 'RECICLABLE', 'NO_RECUPERABLE')),
    CONSTRAINT CHK_EstadoTrazabilidad CHECK (estado IN ('REGISTRADO', 'RECOLECTADO', 'EVALUADO', 'REACONDICIONAMIENTO', 'RECICLAJE', 'DISPOSICION', 'CERRADO')),
    CONSTRAINT CHK_PesoPositivo CHECK (peso_kg > 0),
    CONSTRAINT FK_Dispositivos_Categoria FOREIGN KEY (id_categoria) REFERENCES dbo.CategoriasRAEE(id_categoria),
    CONSTRAINT FK_Dispositivos_Centro FOREIGN KEY (id_centro_actual) REFERENCES dbo.CentrosAcopio(id_centro),
    CONSTRAINT FK_Dispositivos_Lote FOREIGN KEY (id_lote) REFERENCES dbo.LotesRAEE(id_lote)
);
GO

-- Tabla de Evaluaciones Técnicas (RN-02: Solo técnico autorizado)
IF OBJECT_ID(N'dbo.EvaluacionesTecnicas', N'U') IS NOT NULL DROP TABLE dbo.EvaluacionesTecnicas;
CREATE TABLE dbo.EvaluacionesTecnicas (
    id_evaluacion INT IDENTITY(1,1) PRIMARY KEY,
    id_dispositivo INT NOT NULL,
    id_tecnico INT NOT NULL,
    diagnostico NVARCHAR(MAX) NOT NULL,
    clasificacion_resultado NVARCHAR(30) NOT NULL,
    requiere_reparacion BIT NOT NULL DEFAULT 0,
    costo_estimado_reparacion_usd DECIMAL(8,2) NULL,
    aprobado BIT NOT NULL DEFAULT 1,
    fecha_evaluacion DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT CHK_ClasificacionResultado CHECK (clasificacion_resultado IN ('REUTILIZABLE', 'RECICLABLE', 'NO_RECUPERABLE')),
    CONSTRAINT FK_Eval_Dispositivo FOREIGN KEY (id_dispositivo) REFERENCES dbo.DispositivosRAEE(id_dispositivo),
    CONSTRAINT FK_Eval_Tecnico FOREIGN KEY (id_tecnico) REFERENCES dbo.Usuarios(id_usuario)
);
GO

-- Tabla de Transferencias de Inventario (RN-05 & RN-06 Atómicas)
IF OBJECT_ID(N'dbo.TransferenciasInventario', N'U') IS NOT NULL DROP TABLE dbo.TransferenciasInventario;
CREATE TABLE dbo.TransferenciasInventario (
    id_transferencia INT IDENTITY(1,1) PRIMARY KEY,
    id_lote INT NOT NULL,
    id_origen INT NOT NULL,
    id_destino INT NOT NULL,
    peso_kg DECIMAL(10,2) NOT NULL,
    fecha_salida DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    fecha_llegada_estimada NVARCHAR(50) NULL,
    transportista NVARCHAR(120) NOT NULL,
    estado NVARCHAR(30) NOT NULL DEFAULT 'EN_RUTA',
    evidencia_guia NVARCHAR(200) NULL,
    CONSTRAINT CHK_TransfEstado CHECK (estado IN ('PROGRAMADA', 'EN_RUTA', 'ENTREGADA', 'REVERTIDA')),
    CONSTRAINT FK_Transf_Lote FOREIGN KEY (id_lote) REFERENCES dbo.LotesRAEE(id_lote),
    CONSTRAINT FK_Transf_Origen FOREIGN KEY (id_origen) REFERENCES dbo.CentrosAcopio(id_centro),
    CONSTRAINT FK_Transf_Destino FOREIGN KEY (id_destino) REFERENCES dbo.CentrosAcopio(id_centro)
);
GO

-- Tabla de Historial y Auditoría de Trazabilidad (RN-01 & RN-08)
IF OBJECT_ID(N'dbo.HistorialTrazabilidad', N'U') IS NOT NULL DROP TABLE dbo.HistorialTrazabilidad;
CREATE TABLE dbo.HistorialTrazabilidad (
    id_evento INT IDENTITY(1,1) PRIMARY KEY,
    id_dispositivo INT NOT NULL,
    estado_anterior NVARCHAR(30) NOT NULL,
    estado_nuevo NVARCHAR(30) NOT NULL,
    ubicacion NVARCHAR(150) NOT NULL,
    responsable NVARCHAR(120) NOT NULL,
    descripcion NVARCHAR(500) NOT NULL,
    fecha_hora DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    evidencia_ref NVARCHAR(200) NULL,
    CONSTRAINT FK_Historial_Dispositivo FOREIGN KEY (id_dispositivo) REFERENCES dbo.DispositivosRAEE(id_dispositivo)
);
GO

-- Tablas para Modelo Matemático de Red G=(V,E) (RF-MD-03)
IF OBJECT_ID(N'dbo.AristasCapacidadRed', N'U') IS NOT NULL DROP TABLE dbo.AristasCapacidadRed;
IF OBJECT_ID(N'dbo.NodosRedLogistica', N'U') IS NOT NULL DROP TABLE dbo.NodosRedLogistica;

CREATE TABLE dbo.NodosRedLogistica (
    id_nodo NVARCHAR(20) PRIMARY KEY,
    nombre_nodo NVARCHAR(100) NOT NULL,
    tipo_nodo NVARCHAR(40) NOT NULL,
    capacidad_max_kg DECIMAL(10,2) NOT NULL,
    coord_x INT NOT NULL,
    coord_y INT NOT NULL
);

CREATE TABLE dbo.AristasCapacidadRed (
    id_arista NVARCHAR(20) PRIMARY KEY,
    nodo_origen NVARCHAR(20) NOT NULL,
    nodo_destino NVARCHAR(20) NOT NULL,
    capacidad_kg DECIMAL(10,2) NOT NULL,
    flujo_actual_kg DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    CONSTRAINT FK_Arista_Origen FOREIGN KEY (nodo_origen) REFERENCES dbo.NodosRedLogistica(id_nodo),
    CONSTRAINT FK_Arista_Destino FOREIGN KEY (nodo_destino) REFERENCES dbo.NodosRedLogistica(id_nodo),
    CONSTRAINT CHK_CapacidadArista CHECK (capacidad_kg > 0 AND flujo_actual_kg >= 0)
);
GO

-- ============================================================================
-- 3. ÍNDICES NO AGRUPADOS PARA OPTIMIZACIÓN DE CONSULTAS (RF-BD-06)
-- ============================================================================
CREATE NONCLUSTERED INDEX IX_Dispositivos_Estado 
ON dbo.DispositivosRAEE (estado) 
INCLUDE (nombre_equipo, id_categoria, peso_kg, id_centro_actual);
GO

CREATE NONCLUSTERED INDEX IX_Dispositivos_Centro 
ON dbo.DispositivosRAEE (id_centro_actual, estado);
GO

CREATE NONCLUSTERED INDEX IX_Historial_Dispositivo 
ON dbo.HistorialTrazabilidad (id_dispositivo, fecha_hora DESC);
GO

-- ============================================================================
-- 4. VISTAS PARA ANÁLISIS Y TRAZABILIDAD (RF-BD-04)
-- ============================================================================

-- Vista 1: Trazabilidad Completa del Dispositivo
IF OBJECT_ID(N'dbo.vw_TrazabilidadCompleta', N'V') IS NOT NULL DROP VIEW dbo.vw_TrazabilidadCompleta;
GO
CREATE VIEW dbo.vw_TrazabilidadCompleta AS
SELECT 
    d.id_dispositivo,
    d.codigo_qr,
    d.nombre_equipo,
    c.nombre_categoria,
    d.marca,
    d.modelo,
    d.numero_serie,
    d.peso_kg,
    d.condicion,
    d.clasificacion,
    d.estado AS estado_actual,
    ca.nombre_centro AS centro_actual,
    d.generador_nombre,
    d.fecha_ingreso,
    d.fecha_actualizacion,
    l.codigo_lote,
    COUNT(h.id_evento) AS total_eventos_historial
FROM dbo.DispositivosRAEE d
INNER JOIN dbo.CategoriasRAEE c ON d.id_categoria = c.id_categoria
INNER JOIN dbo.CentrosAcopio ca ON d.id_centro_actual = ca.id_centro
LEFT JOIN dbo.LotesRAEE l ON d.id_lote = l.id_lote
LEFT JOIN dbo.HistorialTrazabilidad h ON d.id_dispositivo = h.id_dispositivo
GROUP BY 
    d.id_dispositivo, d.codigo_qr, d.nombre_equipo, c.nombre_categoria,
    d.marca, d.modelo, d.numero_serie, d.peso_kg, d.condicion,
    d.clasificacion, d.estado, ca.nombre_centro, d.generador_nombre,
    d.fecha_ingreso, d.fecha_actualizacion, l.codigo_lote;
GO

-- Vista 2: Métricas de Economía Circular (Indicadores clave)
IF OBJECT_ID(N'dbo.vw_MetricasEconomiaCircular', N'V') IS NOT NULL DROP VIEW dbo.vw_MetricasEconomiaCircular;
GO
CREATE VIEW dbo.vw_MetricasEconomiaCircular AS
SELECT 
    COUNT(id_dispositivo) AS total_equipos,
    SUM(peso_kg) AS total_kg_gestionados,
    SUM(CASE WHEN clasificacion = 'REUTILIZABLE' THEN peso_kg ELSE 0 END) AS kg_reutilizables,
    SUM(CASE WHEN clasificacion = 'RECICLABLE' THEN peso_kg ELSE 0 END) AS kg_reciclables,
    SUM(CASE WHEN clasificacion = 'NO_RECUPERABLE' THEN peso_kg ELSE 0 END) AS kg_disposicion_segura,
    ROUND(
        (SUM(CASE WHEN clasificacion IN ('REUTILIZABLE', 'RECICLABLE') THEN peso_kg ELSE 0 END) / NULLIF(SUM(peso_kg), 0)) * 100, 
        2
    ) AS tasa_circularidad_pct,
    ROUND(SUM(peso_kg) * 1.44, 2) AS co2_evitado_kg_estimado
FROM dbo.DispositivosRAEE;
GO

-- ============================================================================
-- 5. PROCEDIMIENTOS ALMACENADOS CON TRANSACCIONES ACID (RF-BD-05 & RF-BD-07)
-- ============================================================================

-- Procedimiento 1: Evaluación Técnica y Transición Segura de Estado
IF OBJECT_ID(N'dbo.sp_RegistrarEvaluacionRAEE', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_RegistrarEvaluacionRAEE;
GO
CREATE PROCEDURE dbo.sp_RegistrarEvaluacionRAEE
    @p_id_dispositivo INT,
    @p_id_tecnico INT,
    @p_diagnostico NVARCHAR(MAX),
    @p_clasificacion NVARCHAR(30),
    @p_requiere_reparacion BIT = 0,
    @p_costo_reparacion DECIMAL(8,2) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. Validar existencia de técnico y rol
        DECLARE @rolTecnico NVARCHAR(30);
        SELECT @rolTecnico = r.codigo_rol 
        FROM dbo.Usuarios u 
        INNER JOIN dbo.Roles r ON u.id_rol = r.id_rol 
        WHERE u.id_usuario = @p_id_tecnico;

        IF @rolTecnico NOT IN ('TECNICO_EVALUADOR', 'ADMINISTRADOR')
        BEGIN
            THROW 51000, 'RN-02 Violada: Solo un técnico autorizado puede registrar una evaluación técnica.', 1;
        END

        -- 2. Determinar nuevo estado según clasificación técnica
        DECLARE @nuevoEstado NVARCHAR(30);
        IF @p_clasificacion = 'REUTILIZABLE' SET @nuevoEstado = 'REACONDICIONAMIENTO';
        ELSE IF @p_clasificacion = 'RECICLABLE' SET @nuevoEstado = 'RECICLAJE';
        ELSE SET @nuevoEstado = 'DISPOSICION';

        -- 3. Insertar registro en EvaluacionesTecnicas
        INSERT INTO dbo.EvaluacionesTecnicas (
            id_dispositivo, id_tecnico, diagnostico, clasificacion_resultado,
            requiere_reparacion, costo_estimado_reparacion_usd, fecha_evaluacion
        )
        VALUES (
            @p_id_dispositivo, @p_id_tecnico, @p_diagnostico, @p_clasificacion,
            @p_requiere_reparacion, @p_costo_reparacion, SYSDATETIME()
        );

        -- 4. Actualizar el Dispositivo RAEE
        UPDATE dbo.DispositivosRAEE
        SET clasificacion = @p_clasificacion,
            estado = @nuevoEstado,
            fecha_actualizacion = SYSDATETIME()
        WHERE id_dispositivo = @p_id_dispositivo;

        -- 5. Registrar evento de auditoría en HistorialTrazabilidad
        INSERT INTO dbo.HistorialTrazabilidad (
            id_dispositivo, estado_anterior, estado_nuevo, ubicacion,
            responsable, descripcion, fecha_hora
        )
        VALUES (
            @p_id_dispositivo, 'RECOLECTADO', @nuevoEstado, 'Laboratorio de Diagnóstico',
            (SELECT nombre_completo FROM dbo.Usuarios WHERE id_usuario = @p_id_tecnico),
            CONCAT('Evaluación Técnica registrada: ', @p_clasificacion, '. Diagnóstico: ', @p_diagnostico),
            SYSDATETIME()
        );

        COMMIT TRANSACTION;
        PRINT 'Evaluación registrada con éxito y estado actualizado atómicamente.';
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- Procedimiento 2: Transferencia Atómica de Lotes con Control de Capacidad (RN-05 & RN-06)
IF OBJECT_ID(N'dbo.sp_TransferirLoteConCapacidad', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_TransferirLoteConCapacidad;
GO
CREATE PROCEDURE dbo.sp_TransferirLoteConCapacidad
    @p_id_lote INT,
    @p_id_origen INT,
    @p_id_destino INT,
    @p_peso_kg DECIMAL(10,2),
    @p_transportista NVARCHAR(120)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        -- Validar capacidad disponible en el destino
        DECLARE @capMaxima DECIMAL(10,2), @capOcupada DECIMAL(10,2), @capDisponible DECIMAL(10,2);
        SELECT @capMaxima = capacidad_maxima_kg, @capOcupada = capacidad_ocupada_kg 
        FROM dbo.CentrosAcopio 
        WHERE id_centro = @p_id_destino;

        SET @capDisponible = @capMaxima - @capOcupada;

        IF @p_peso_kg > @capDisponible
        BEGIN
            THROW 52000, 'RN-05 Violada: La cantidad a transferir supera la capacidad disponible del centro destino. Operación revertida.', 1;
        END

        -- Actualización atómica en el origen y destino (RN-06)
        UPDATE dbo.CentrosAcopio 
        SET capacidad_ocupada_kg = CASE WHEN capacidad_ocupada_kg - @p_peso_kg < 0 THEN 0 ELSE capacidad_ocupada_kg - @p_peso_kg END
        WHERE id_centro = @p_id_origen;

        UPDATE dbo.CentrosAcopio 
        SET capacidad_ocupada_kg = capacidad_ocupada_kg + @p_peso_kg
        WHERE id_centro = @p_id_destino;

        -- Actualizar estado del lote
        UPDATE dbo.LotesRAEE
        SET estado_lote = 'EN_TRANSITO',
            id_centro_destino = @p_id_destino,
            fecha_despacho = SYSDATETIME()
        WHERE id_lote = @p_id_lote;

        -- Registrar registro de transferencia
        INSERT INTO dbo.TransferenciasInventario (
            id_lote, id_origen, id_destino, peso_kg, fecha_salida, transportista, estado
        )
        VALUES (
            @p_id_lote, @p_id_origen, @p_id_destino, @p_peso_kg, SYSDATETIME(), @p_transportista, 'EN_RUTA'
        );

        COMMIT TRANSACTION;
        PRINT 'Transferencia atómica ejecutada exitosamente.';
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- ============================================================================
-- 6. DISPARADOR (TRIGGER) PARA AUDITORÍA AUTOMÁTICA DE CAMBIOS (RF-BD-05)
-- ============================================================================
IF OBJECT_ID(N'dbo.trg_AuditTrazabilidadDispositivo', N'TR') IS NOT NULL DROP TRIGGER dbo.trg_AuditTrazabilidadDispositivo;
GO
CREATE TRIGGER dbo.trg_AuditTrazabilidadDispositivo
ON dbo.DispositivosRAEE
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF UPDATE(estado)
    BEGIN
        INSERT INTO dbo.HistorialTrazabilidad (
            id_dispositivo, estado_anterior, estado_nuevo, ubicacion,
            responsable, descripcion, fecha_hora
        )
        SELECT 
            i.id_dispositivo,
            d.estado AS estado_anterior,
            i.estado AS estado_nuevo,
            ISNULL(ca.nombre_centro, 'Ubicación Desconocida'),
            'Sistema Automatizado EcoRAEE',
            CONCAT('Cambio de estado disparado por actualización en tabla DispositivosRAEE: ', d.estado, ' -> ', i.estado),
            SYSDATETIME()
        FROM inserted i
        INNER JOIN deleted d ON i.id_dispositivo = d.id_dispositivo
        LEFT JOIN dbo.CentrosAcopio ca ON i.id_centro_actual = ca.id_centro
        WHERE i.estado <> d.estado;
    END
END;
GO

-- ============================================================================
-- 7. DML: INSERCIÓN DE DATOS DE PRUEBA (MOCK DATA)
-- ============================================================================

-- Roles
INSERT INTO dbo.Roles (codigo_rol, nombre_rol, descripcion) VALUES
('ADMINISTRADOR', 'Administrador General', 'Gestión integral del sistema y parámetros'),
('TECNICO_EVALUADOR', 'Técnico de Diagnóstico', 'Evaluación de condición física y clasificación'),
('OPERADOR_CENTRO', 'Operador de Acopio', 'Recepción de residuos y administración de stock'),
('COORDINADOR_LOGISTICO', 'Coordinador de Red', 'Planificación de rutas y análisis de flujo'),
('REACONDICIONADOR', 'Técnico de Taller', 'Reparación y puesta a punto de equipos'),
('GENERADOR', 'Generador Institucional', 'Entrega de residuos de tecnología');

-- Usuarios
INSERT INTO dbo.Usuarios (nombre_completo, email, id_rol, organizacion, telefono) VALUES
('Ing. Carlos Mendoza', 'cmendoza@ecoraee.edu.ec', 1, 'UIDE - Escuela de Sistemas', '+593 99 123 4567'),
('Dra. Elena Villacís', 'evillacis@ecoraee.edu.ec', 2, 'Lab Electrónica Circular', '+593 98 456 7890'),
('Marcos Benítez', 'mbenitez@ecoraee.edu.ec', 3, 'UIDE Campus Norte', '+593 97 234 5678'),
('Sofía Carvajal', 'scarvajal@ecoraee.edu.ec', 4, 'Red EcoLogística Quito', '+593 96 345 6789'),
('TecnoAndina S.A.', 'contacto@tecnoandina.com.ec', 6, 'Empresa Generadora', '+593 2 299 1000');

-- Centros de Acopio
INSERT INTO dbo.CentrosAcopio (nombre_centro, tipo_centro, ciudad, direccion, capacidad_maxima_kg, capacidad_ocupada_kg, responsable_id) VALUES
('UIDE Campus Norte - Punto Limpio', 'ACOPIO_PRIMARIO', 'Quito', 'Av. Simón Bolívar y Av. Manuel Córdova Galarza', 2500.00, 1420.00, 3),
('Punto Verde La Carolina', 'CENTRO_CLASIFICACION', 'Quito', 'Av. Amazonas y Av. República', 4000.00, 2890.00, 4),
('Taller ReacondicionaTech UIDE', 'TALLER_REACONDICIONAMIENTO', 'Quito', 'Edificio Laboratorios Bloque C-2', 1800.00, 950.00, 2),
('Planta de Reciclaje MetalRAEE', 'GESTOR_RECICLAJE', 'Latacunga', 'Parque Industrial Sur Lote 14', 8000.00, 4600.00, 1),
('Depósito de Disposición Segura Calderón', 'DISPOSICION_CONTROLADA', 'Quito', 'Sector Calderón - Vía a Guayllabamba', 5000.00, 1120.00, 1);

-- Categorías RAEE
INSERT INTO dbo.CategoriasRAEE (codigo_categoria, nombre_categoria, tiempo_vida_util_estimado_anos) VALUES
('INFORMATICA_TELECOM', 'Equipos Informáticos y Telecomunicaciones', 5),
('CONSUMO_AUDIO_VIDEO', 'Aparatos Electrónicos de Consumo', 7),
('LINEA_BLANCA', 'Grandes y Pequeños Electrodomésticos', 10),
('HERRAMIENTAS_ELEC', 'Herramientas Eléctricas y Electrónicas', 8),
('EQUIPOS_MEDICOS', 'Aparatos Médicos y de Laboratorio', 6);

-- Lotes
INSERT INTO dbo.LotesRAEE (codigo_lote, descripcion, id_centro_origen, id_centro_destino, peso_total_kg, cantidad_equipos, estado_lote) VALUES
('LOTE-2026-001', 'Lote Laptops y Monitores para Reacondicionamiento', 1, 3, 64.50, 18, 'RECIBIDO'),
('LOTE-2026-002', 'Lote Chasis y Servidores desmantelados para reciclaje de metales', 2, 4, 380.00, 24, 'EN_TRANSITO'),
('LOTE-2026-003', 'Residuos Peligrosos y Celdas Químicas para celda de seguridad', 2, 5, 145.00, 9, 'PROCESADO');

-- Dispositivos RAEE
INSERT INTO dbo.DispositivosRAEE (
    codigo_qr, nombre_equipo, id_categoria, marca, modelo, numero_serie,
    peso_kg, condicion, clasificacion, estado, id_centro_actual, generador_nombre, id_lote, observaciones
) VALUES
('RAEE-2026-00101', 'Laptop ThinkPad L14 Gen 2', 1, 'Lenovo', 'ThinkPad L14', 'PF2K890M', 1.65, 'DANADO_LEVE', 'REUTILIZABLE', 'REACONDICIONAMIENTO', 3, 'TecnoAndina S.A.', 1, 'Placa y pantalla operativas. Requiere disco SSD.'),
('RAEE-2026-00102', 'Monitor UltraSharp 24"', 2, 'Dell', 'U2419H', 'CN08W7-74261', 4.80, 'FUNCIONAL', 'REUTILIZABLE', 'REACONDICIONAMIENTO', 3, 'Facultad de Arquitectura UIDE', 1, 'Panel IPS intacto. Limpieza preventiva.'),
('RAEE-2026-00103', 'Servidor PowerEdge R430 1U', 1, 'Dell', 'PowerEdge R430', '9XJ7KD2', 16.50, 'OBSOLETO', 'RECICLABLE', 'RECICLAJE', 4, 'DataCenter Andes', 2, 'Recuperación de cobre y aluminio.'),
('RAEE-2026-00104', 'Smartphone Redmi Note 10', 1, 'Xiaomi', 'M2101K7AG', '86654305128', 0.18, 'INOPERATIVO', 'RECICLABLE', 'EVALUADO', 2, 'Estudiante Santiago Vega', NULL, 'Cortocircuito en placa principal.'),
('RAEE-2026-00105', 'Impresora LaserJet Pro M404n', 1, 'HP', 'LaserJet M404n', 'VNB3B08219', 8.22, 'DANADO_LEVE', 'REUTILIZABLE', 'RECOLECTADO', 1, 'Dirección Financiera UIDE', NULL, 'Atasco de rodillo de papel.'),
('RAEE-2026-00106', 'Batería Plomo-Ácido 12V 100Ah', 5, 'CSB Battery', 'GPL 121000', 'CSB-2022-881', 31.00, 'DESMANTELADO', 'NO_RECUPERABLE', 'DISPOSICION', 5, 'Hospital Metropolitano', 3, 'Neutralizado y enviado a celda controlada.'),
('RAEE-2026-00107', 'PC OptiPlex 7050 SFF', 1, 'Dell', 'OptiPlex 7050', '8GH4TY1', 5.26, 'FUNCIONAL', 'REUTILIZABLE', 'CERRADO', 3, 'Laboratorios Computación', NULL, 'Donado a Escuela Rural San José de Minas.');

-- Historial de Trazabilidad
INSERT INTO dbo.HistorialTrazabilidad (id_dispositivo, estado_anterior, estado_nuevo, ubicacion, responsable, descripcion) VALUES
(101, 'REGISTRADO', 'RECOLECTADO', 'UIDE Campus Norte - Punto Limpio', 'Marcos Benítez', 'Recepción física y pesaje del equipo.'),
(101, 'RECOLECTADO', 'EVALUADO', 'Taller ReacondicionaTech UIDE', 'Dra. Elena Villacís', 'Diagnóstico técnico: placa madre operativa, apto para reutilización social.'),
(101, 'EVALUADO', 'REACONDICIONAMIENTO', 'Taller ReacondicionaTech UIDE', 'Dra. Elena Villacís', 'Asignación a banco de pruebas para mantenimiento de hardware.');

-- Nodos de la Red Logística (RF-MD-03)
INSERT INTO dbo.NodosRedLogistica (id_nodo, nombre_nodo, tipo_nodo, capacidad_max_kg, coord_x, coord_y) VALUES
('S_GEN', 'Generadores (Fuente)', 'FUENTE_GENERADORES', 10000.00, 60, 200),
('C1_UIDE', 'C1: UIDE Campus Norte', 'ACOPIO_PRIMARIO', 2500.00, 240, 110),
('C2_CAROLINA', 'C2: Punto La Carolina', 'CENTRO_CLASIFICACION', 4000.00, 240, 290),
('C3_TALLER', 'C3: Taller ReacondicionaTech', 'TALLER_REACONDICIONAMIENTO', 1800.00, 480, 90),
('C4_RECICLA', 'C4: Planta MetalRAEE', 'GESTOR_RECICLAJE', 4500.00, 480, 220),
('C5_DISP', 'C5: Celda Calderón', 'DISPOSICION_CONTROLADA', 2000.00, 480, 340),
('T_DEST', 'Economía Circular (Sumidero)', 'SUMIDERO_BENEFICIARIOS', 12000.00, 720, 200);

-- Aristas con Capacidades (RF-MD-03)
INSERT INTO dbo.AristasCapacidadRed (id_arista, nodo_origen, nodo_destino, capacidad_kg, flujo_actual_kg) VALUES
('E1', 'S_GEN', 'C1_UIDE', 2200.00, 0.00),
('E2', 'S_GEN', 'C2_CAROLINA', 3500.00, 0.00),
('E3', 'C1_UIDE', 'C3_TALLER', 1200.00, 0.00),
('E4', 'C1_UIDE', 'C2_CAROLINA', 1000.00, 0.00),
('E5', 'C2_CAROLINA', 'C3_TALLER', 600.00, 0.00),
('E6', 'C2_CAROLINA', 'C4_RECICLA', 2400.00, 0.00),
('E7', 'C2_CAROLINA', 'C5_DISP', 1000.00, 0.00),
('E8', 'C3_TALLER', 'T_DEST', 1600.00, 0.00),
('E9', 'C4_RECICLA', 'T_DEST', 2200.00, 0.00),
('E10', 'C5_DISP', 'T_DEST', 900.00, 0.00);

PRINT 'Script SQL Server ejecutado exitosamente. Tablas, Vistas, Procedimientos, Triggers e Inserts cargados.';
GO

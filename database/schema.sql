CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE postulante (
    id_postulante UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_postulante VARCHAR(60) NOT NULL,
    apellido_paterno_postulante VARCHAR(60) NOT NULL, -- Agregar en diagrama
    apellido_materno_postulante VARCHAR(60) NOT NULL, -- Agregar en diagrama
    correo_electronico VARCHAR(100) NOT NULL UNIQUE,
    contrasena VARCHAR(255) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    sexo VARCHAR(20) CHECK (sexo IN ('Masculino','Femenino','Otro')),
    descripcion VARCHAR(600) NOT NULL,
    pais VARCHAR(100) NOT NULL,
    estado VARCHAR(100) NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    colonia VARCHAR(100) NOT NULL,
    calle VARCHAR(100) NOT NULL,
    codigo_postal VARCHAR(100) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    foto_perfil VARCHAR(255),
    fecha_registro TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    estado_cuenta VARCHAR(20) DEFAULT 'ACTIVA', --Activa, Suspendida --- CHECK (estado_cuenta IN ('Activa','Suspendida', 'Eliminada'))
    curp VARCHAR(18) NOT NULL UNIQUE,
    rfc VARCHAR(13) NOT NULL UNIQUE,
    token_version INT DEFAULT 0
);

CREATE TABLE empleador (
    id_empleador UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_empresa VARCHAR(60) NOT NULL UNIQUE,
    correo_electronico VARCHAR(100) NOT NULL UNIQUE,
    contrasena VARCHAR(255) NOT NULL,
    pais VARCHAR(100) NOT NULL,
    estado VARCHAR(100) NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    colonia VARCHAR(100) NOT NULL,
    calle VARCHAR(100) NOT NULL,
    codigo_postal VARCHAR(100) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    foto_perfil VARCHAR(255),
    fecha_registro TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    estado_cuenta VARCHAR(20) DEFAULT 'ACTIVA', --Activa, Suspendida
    rfc VARCHAR(12) NOT NULL UNIQUE,
    descripcion VARCHAR(400),
    token_version INT DEFAULT 0
);

CREATE TABLE administrador (
    id_administrador UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(50) NOT NULL,
    contrasena VARCHAR(255) NOT NULL,
    correo_electronico VARCHAR(100) NOT NULL UNIQUE,
    foto_perfil VARCHAR(255),
    token_version INT DEFAULT 0
);

CREATE TABLE categorias (
    id_categoria UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(150) NOT NULL
);

CREATE TABLE anuncios (
    id_anuncio UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo VARCHAR(150) NOT NULL,
    descripcion VARCHAR(600) NOT NULL,
    tipo_anuncio VARCHAR(20) NOT NULL,
    urgencia VARCHAR(30) DEFAULT 'Normal',
    edad VARCHAR(60) DEFAULT 'Sin especificar',
    educacion VARCHAR(80) DEFAULT 'Sin especificar',
    estado VARCHAR(100) NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    colonia VARCHAR(100) NOT NULL,
    calle VARCHAR(100) NOT NULL,
    codigo_postal VARCHAR(100) NOT NULL,
    img VARCHAR(255),
    salario DECIMAL(10,2) NOT NULL, 
    modalidad VARCHAR(20) NOT NULL, 
    fecha_publicacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    estado_anuncio VARCHAR(40) NOT NULL, 
    id_empleador UUID NOT NULL,
  
    vistas INT DEFAULT 0,
    CONSTRAINT fk_anuncios_empleador FOREIGN KEY (id_empleador) REFERENCES Empleador(id_empleador)
    
);

CREATE TABLE cv (
    id_cv UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_postulante UUID NOT NULL,
    archivo_cv VARCHAR(255)  NOT NULL, --ArchivoPv
    visible_empresas BOOLEAN  NOT NULL,
    fecha_subida TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP ,
    ultima_actualizacion TIMESTAMPTZ,
    CONSTRAINT fk_cv_postulante FOREIGN KEY (id_postulante) REFERENCES Postulante(id_postulante)
);

CREATE TABLE mensajes_soporte (
    id_soporte UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asunto VARCHAR(50)  NOT NULL,
    mensaje VARCHAR(400)  NOT NULL,
    fecha TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20)  NOT NULL, --Resuelto, Recibido, Working on it 
    id_postulante UUID  NOT NULL,
    CONSTRAINT fk_soporte_postulante FOREIGN KEY (id_postulante) REFERENCES Postulante(id_postulante)
);

CREATE TABLE historial (
    id_historial UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_postulante UUID  NOT NULL ,
    id_anuncio UUID  NOT NULL,
    fecha_visto TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id_postulante, id_anuncio),
    CONSTRAINT fk_historial_postulante FOREIGN KEY (id_postulante) REFERENCES Postulante(id_postulante),
    CONSTRAINT fk_historial_anuncio FOREIGN KEY (id_anuncio) REFERENCES Anuncios(id_anuncio)
);



CREATE TABLE reporte (
    id_reporte UUID PRIMARY KEY DEFAULT gen_random_uuid(),  --Id del reporte
    motivo VARCHAR(50) NOT NULL, 
    descripcion VARCHAR(300) NOT NULL,
    fecha_reporte TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) NOT NULL, --Pendiente, En revisión, Finalizado, Arreglado
    id_postulante UUID, -- Id de quien creó el reporte
    id_empleador UUID, -- Id de quien creó el reporte
    CONSTRAINT fk_reporte_postulante FOREIGN KEY (id_postulante) REFERENCES Postulante(id_postulante),
    CONSTRAINT fk_reporte_empleador FOREIGN KEY (id_empleador) REFERENCES Empleador(id_empleador),

    CONSTRAINT chk_reportante 
        CHECK (
            (id_postulante IS NOT NULL AND id_empleador IS NULL)
            OR
            (id_postulante IS NULL AND id_empleador IS NOT NULL)
        )
);


CREATE TABLE reporte_a_empleador (
    id_reporte UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empleador_reportado UUID NOT NULL, --Reportado
    FOREIGN KEY (id_reporte) REFERENCES Reporte(id_reporte),
    FOREIGN KEY (id_empleador_reportado) REFERENCES Empleador(id_empleador)
);

CREATE TABLE reporte_a_postulante (
    id_reporte UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_postulante_reportado UUID NOT NULL, -- Reportado
    FOREIGN KEY (id_reporte) REFERENCES Reporte(id_reporte),
    FOREIGN KEY (id_postulante_reportado) REFERENCES Postulante(id_postulante)
);

CREATE TABLE reporte_a_anuncio (
    id_reporte UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_anuncio UUID NOT NULL, --Reportado
    FOREIGN KEY (id_reporte) REFERENCES Reporte(id_reporte),
    FOREIGN KEY (id_anuncio) REFERENCES Anuncios(id_anuncio)
);


CREATE TABLE valoracion (
    id_valoracion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comentario VARCHAR(255),
    puntuacion INT CHECK (puntuacion IS NULL OR puntuacion BETWEEN 1 AND 5),
    fecha_valoracion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE imagenes (
    id_imagen UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_anuncio UUID  NOT NULL,
    url_imagen VARCHAR(255) NOT NULL, --urlImagen en diagrama
    CONSTRAINT fk_imagenes_anuncio FOREIGN KEY (id_anuncio) REFERENCES Anuncios(id_anuncio)
);


CREATE TABLE seguimiento (
    id_seguimiento UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_categoria UUID  NOT NULL,
    id_postulante UUID  NOT NULL,
    UNIQUE (id_categoria, id_postulante),
    CONSTRAINT fk_seguimiento_categoria FOREIGN KEY (id_categoria) REFERENCES Categorias(id_categoria),
    CONSTRAINT fk_seguimiento_postulante FOREIGN KEY (id_postulante) REFERENCES Postulante(id_postulante)
);

CREATE TABLE categoriaAnuncio (
    id_categoria_anuncio UUID PRIMARY KEY DEFAULT gen_random_uuid(), --Agregar a diagrama
    id_categoria UUID  NOT NULL,
    id_anuncio UUID  NOT NULL,
    CONSTRAINT fk_catanuncio_categoria FOREIGN KEY (id_categoria) REFERENCES Categorias(id_categoria),
    CONSTRAINT fk_catanuncio_anuncio FOREIGN KEY (id_anuncio) REFERENCES Anuncios(id_anuncio)
);

CREATE TABLE favoritos (
    id_favoritos UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_postulante UUID  NOT NULL,
    id_anuncio UUID  NOT NULL,
    fecha_guardado TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id_postulante, id_anuncio),
    CONSTRAINT fk_favoritos_postulante FOREIGN KEY (id_postulante) REFERENCES Postulante(id_postulante),
    CONSTRAINT fk_favoritos_anuncio FOREIGN KEY (id_anuncio) REFERENCES Anuncios(id_anuncio)
);

CREATE TABLE postulante_valoracion (
    id_pv UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_valoracion UUID  NOT NULL,
    id_postulante UUID  NOT NULL,
    id_empleador UUID  NOT NULL,
    CONSTRAINT fk_pv_valoracion FOREIGN KEY (id_valoracion) REFERENCES Valoracion(id_valoracion),
    CONSTRAINT fk_pv_postulante FOREIGN KEY (id_postulante) REFERENCES Postulante(id_postulante),
    CONSTRAINT fk_pv_empleador FOREIGN KEY (id_empleador) REFERENCES Empleador(id_empleador) ON DELETE CASCADE,
    CONSTRAINT unique_postulante_empleador UNIQUE (id_postulante, id_empleador)
);

CREATE TABLE anuncio_valoracion (
    id_av UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_valoracion UUID  NOT NULL,
    id_anuncio UUID  NOT NULL,
    CONSTRAINT fk_av_valoracion FOREIGN KEY (id_valoracion) REFERENCES Valoracion(id_valoracion),
    CONSTRAINT fk_av_anuncio FOREIGN KEY (id_anuncio) REFERENCES Anuncios(id_anuncio)
);

CREATE TABLE empleador_valoracion (
    id_ev UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empleador UUID  NOT NULL,
    id_valoracion UUID  NOT NULL,
    id_postulante UUID  NOT NULL,
    CONSTRAINT fk_ev_empleador FOREIGN KEY (id_empleador) REFERENCES Empleador(id_empleador),
    CONSTRAINT fk_ev_valoracion FOREIGN KEY (id_valoracion) REFERENCES Valoracion(id_valoracion),
    CONSTRAINT fk_ev_postulante FOREIGN KEY (id_postulante) REFERENCES Postulante(id_postulante) ON DELETE CASCADE,
    CONSTRAINT unique_empleador_postulante UNIQUE (id_empleador, id_postulante)
);

CREATE TABLE postulacion (
    id_postulacion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_postulante UUID  NOT NULL,
    id_anuncio UUID  NOT NULL,
    estado VARCHAR(20)  NOT NULL, --En revisión, Rechazada, --Aceptada, el empleador se pondrá en contacto contigo
    fecha_postulacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id_postulante, id_anuncio),
    CONSTRAINT fk_postulacion_postulante FOREIGN KEY (id_postulante) REFERENCES Postulante(id_postulante),
    CONSTRAINT fk_postulacion_anuncio FOREIGN KEY (id_anuncio) REFERENCES Anuncios(id_anuncio)
);

CREATE TABLE resolucion_reporte (
    id_resolucion UUID PRIMARY KEY DEFAULT gen_random_uuid(), --Agregar a diagrama
    id_administrador UUID  NOT NULL,
    id_reporte UUID  NOT NULL,
    fecha_resolucion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_reporte),
    CONSTRAINT fk_resolucion_admin FOREIGN KEY (id_administrador) REFERENCES Administrador(id_administrador),
    CONSTRAINT fk_resolucion_reporte FOREIGN KEY (id_reporte) REFERENCES Reporte(id_reporte)
);

CREATE TABLE password_resets (
  id SERIAL PRIMARY KEY,
  correo_electronico VARCHAR(100) NOT NULL,
  token TEXT NOT NULL,
  expires BIGINT NOT NULL,
  user_type TEXT NOT NULL
);

CREATE TABLE historial_cambios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_postulante UUID,
  id_empleador UUID,
  campo VARCHAR(50),
  valor_anterior TEXT,
  valor_nuevo TEXT,
  fecha_cambio TIMESTAMP DEFAULT NOW()
);

CREATE TABLE servicios (
  id_servicio UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(160) NOT NULL,
  description VARCHAR(400),
  categoria VARCHAR(60),
  presupuesto VARCHAR(60),
  ubicacion TEXT,
  estado VARCHAR(100),
  ciudad VARCHAR(100),
  colonia VARCHAR(100),
  calle VARCHAR(150),
  codigo_postal VARCHAR(10),
  modalidad VARCHAR(50),
  urgencia VARCHAR(50),
  es_borrador BOOLEAN DEFAULT false,
  autor_id UUID,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (autor_id) REFERENCES postulante(id_postulante)
);
docker exec -it chambee_db psql -U postgres chambee_db


ALTER TABLE postulante ADD COLUMN IF NOT EXISTS token_version INT DEFAULT 0;
ALTER TABLE empleador ADD COLUMN IF NOT EXISTS token_version INT DEFAULT 0;
ALTER TABLE administrador ADD COLUMN IF NOT EXISTS token_version INT DEFAULT 0;
ALTER TABLE postulante ADD COLUMN IF NOT EXISTS descripcion VARCHAR(600) NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS servicios (
  id_servicio UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(160) NOT NULL,
  description VARCHAR(400),
  categoria VARCHAR(60),
  presupuesto VARCHAR(60),
  ubicacion TEXT,
  estado VARCHAR(100),
  ciudad VARCHAR(100),
  colonia VARCHAR(100),
  calle VARCHAR(150),
  codigo_postal VARCHAR(10),
  modalidad VARCHAR(50),
  urgencia VARCHAR(50),
  es_borrador BOOLEAN DEFAULT false,
  autor_id UUID,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (autor_id) REFERENCES postulante(id_postulante)
);
ALTER TABLE postulante ALTER COLUMN descripcion SET DEFAULT '';
 UPDATE postulante
SET estado_cuenta = 'ACTIVA'
WHERE estado_cuenta IS NULL;

ALTER TABLE empleador_valoracion
  ADD COLUMN id_postulante UUID NOT NULL,
  ADD CONSTRAINT fk_ev_postulante FOREIGN KEY (id_postulante) REFERENCES Postulante(id_postulante) ON DELETE CASCADE,
  ADD CONSTRAINT unique_empleador_postulante UNIQUE (id_empleador, id_postulante);

  ALTER TABLE empleador_valoracion ALTER COLUMN id_postulante SET NOT NULL;

  ALTER TABLE valoracion DROP CONSTRAINT valoracion_puntuacion_check;
ALTER TABLE valoracion ALTER COLUMN puntuacion DROP NOT NULL;
ALTER TABLE valoracion ADD CONSTRAINT valoracion_puntuacion_check CHECK (puntuacion IS NULL OR puntuacion BETWEEN 1 AND 5);

CREATE TABLE public.administrador (
    id_administrador uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre character varying(50) NOT NULL,
    contrasena character varying(255) NOT NULL,
    correo_electronico character varying(100) NOT NULL,
    foto_perfil character varying(255),
    token_version integer DEFAULT 0,
    
    CONSTRAINT administrador_pkey PRIMARY KEY (id_administrador),
    CONSTRAINT administrador_correo_electronico_key UNIQUE (correo_electronico)
);

INSERT INTO public.administrador (nombre, correo_electronico, contrasena) VALUES 
('Oscar', 'oscaradmin@chambee.com', '$2a$12$yDgb6WV7b1RZocxhx0zepOiTceDaXluOhSO.jZip/yWNKCBy9PVNu'),
('Anshelo', 'ansheloadmin@chambee.com', '$2a$12$yDgb6WV7b1RZocxhx0zepOiTceDaXluOhSO.jZip/yWNKCBy9PVNu'),
('Abraham', 'abrahamadmin@chambee.com', '$2a$12$yDgb6WV7b1RZocxhx0zepOiTceDaXluOhSO.jZip/yWNKCBy9PVNu'),
('Karina', 'karinaadmin@chambee.com', '$2a$12$yDgb6WV7b1RZocxhx0zepOiTceDaXluOhSO.jZip/yWNKCBy9PVNu'),
('Cuanary', 'cuanaryadmin@chambee.com', '$2a$12$yDgb6WV7b1RZocxhx0zepOiTceDaXluOhSO.jZip/yWNKCBy9PVNu');
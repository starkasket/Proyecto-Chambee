CREATE TABLE password_resets (
  id SERIAL PRIMARY KEY,
  correo_electronico VARCHAR(100) NOT NULL,
  token TEXT NOT NULL,
  expires BIGINT NOT NULL,
  user_type TEXT NOT NULL
);


ALTER TABLE anuncios
ADD COLUMN IF NOT EXISTS urgencia VARCHAR(30) DEFAULT 'Normal',
ADD COLUMN IF NOT EXISTS edad VARCHAR(60) DEFAULT 'Sin especificar',
ADD COLUMN IF NOT EXISTS educacion VARCHAR(80) DEFAULT 'Sin especificar';

ALTER TABLE anuncios
ALTER COLUMN descripcion TYPE VARCHAR(600);


CREATE TABLE historial_cambios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_postulante UUID,
  id_empleador UUID,
  campo VARCHAR(50),
  valor_anterior TEXT,
  valor_nuevo TEXT,
  fecha_cambio TIMESTAMP DEFAULT NOW()
);

ALTER TABLE historial_cambios
ADD COLUMN IF NOT EXISTS id_empleador UUID



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
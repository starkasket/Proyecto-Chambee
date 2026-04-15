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




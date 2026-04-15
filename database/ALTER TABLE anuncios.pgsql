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




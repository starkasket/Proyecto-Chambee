-- =====================================================
-- MIGRACION: Agregar columnas de ubicacion faltantes
-- Descripcion: Agrega numero_exterior, direccion_formateada,
--              latitud y longitud a las tablas postulante y empleador,
--              y a la tabla servicios.
-- =====================================================

-- ===== TABLA: postulante =====
ALTER TABLE postulante
  ADD COLUMN IF NOT EXISTS numero_exterior VARCHAR(20),
  ADD COLUMN IF NOT EXISTS direccion_formateada TEXT,
  ADD COLUMN IF NOT EXISTS latitud DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitud DOUBLE PRECISION;

-- ===== TABLA: empleador =====
ALTER TABLE empleador
  ADD COLUMN IF NOT EXISTS numero_exterior VARCHAR(20),
  ADD COLUMN IF NOT EXISTS direccion_formateada TEXT,
  ADD COLUMN IF NOT EXISTS latitud DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitud DOUBLE PRECISION;

-- ===== TABLA: servicios =====
ALTER TABLE servicios
  ADD COLUMN IF NOT EXISTS numero_exterior VARCHAR(20),
  ADD COLUMN IF NOT EXISTS direccion_formateada TEXT,
  ADD COLUMN IF NOT EXISTS latitud DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitud DOUBLE PRECISION;

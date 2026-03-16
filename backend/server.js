const express = require("express");
const cors = require("cors"); 
const { Pool } = require("pg");
require("dotenv").config({ path: '../.env' });

const app = express();

app.use(cors({ origin: "http://localhost:4200" }));
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

app.get("/", (req, res) => {
  res.send("servidor de chambee, funcionando correctamente y al 100%");
});

// --- REGISTRO DE EMPLEADORES ---
app.post("/empleadores/registro", async (req, res) => {
  const {
    nombre_empresa, correo, password, telefono,
    descripcion, rfc, pais, estado, ciudad,
    colonia, calle, cp
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO empleadores 
        (nombre_empresa, correo, password, telefono, descripcion, rfc, pais, estado, ciudad, colonia, calle, cp)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id, nombre_empresa, correo`,
      [nombre_empresa, correo, password, telefono, descripcion, rfc, pais, estado, ciudad, colonia, calle, cp]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- REGISTRO DE POSTULANTES ---
app.post("/postulantes/registro", async (req, res) => {
  const {
    nombre, apellido_paterno, apellido_materno,
    fecha_nacimiento, correo_electronico, sexo,
    contrasena, rfc, curp, pais, estado,
    ciudad, colonia, calle, codigo_postal
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO postulantes 
        (nombre, apellido_paterno, apellido_materno, fecha_nacimiento, correo_electronico, sexo, contrasena, rfc, curp, pais, estado, ciudad, colonia, calle, codigo_postal)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING id, nombre, correo_electronico`,
      [nombre, apellido_paterno, apellido_materno, fecha_nacimiento, correo_electronico, sexo, contrasena, rfc, curp, pais, estado, ciudad, colonia, calle, codigo_postal]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- LOGIN REAL (CONECTADO A LA DB) ---
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  console.log("Intento de login con:", email);

  try {
    // 1. Buscamos primero en postulantes 
    const postulante = await pool.query(
      "SELECT id, nombre, correo_electronico FROM postulantes WHERE correo_electronico = $1 AND contrasena = $2",
      [email, password]
    );

    if (postulante.rows.length > 0) {
      console.log("¡Login exitoso para Postulante:", postulante.rows[0].nombre);
      return res.json({ 
        message: "¡Login exitoso!", 
        user: postulante.rows[0],
        tipo: 'postulante'
      });
    }

    // 2. Si no es postulante, buscamos en empleadores
    const empleador = await pool.query(
      "SELECT id, nombre_empresa, correo FROM empleadores WHERE correo = $1 AND password = $2",
      [email, password]
    );

    if (empleador.rows.length > 0) {
      console.log("¡Login exitoso para Empleador:", empleador.rows[0].nombre_empresa);
      return res.json({ 
        message: "¡Login exitoso!", 
        user: empleador.rows[0],
        tipo: 'empleador'
      });
    }

    // 3. Si no está en ninguno
    res.status(401).json({ message: "Usuario o contraseña incorrectos" });

  } catch (err) {
    console.error("Error en el servidor:", err.message);
    res.status(500).json({ error: "No se pudo conectar con la base de datos" });
  }

  
});

app.listen(3000, "0.0.0.0", () => console.log("Servidor corriendo en puerto 3000"));
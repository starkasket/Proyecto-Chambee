const express = require("express");
const cors = require("cors"); 
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
// const jwt = require("jsonwebtoken")
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

// Revistar estado del backend (funcionando o no)
app.get("/", (req, res) => {
  res.send("servidor de chambee, funcionando correctamente y al 100%");
});




// --- REGISTRO DE POSTULANTES ---
app.post("/postulantes/registro", async (req, res) => {
  const {
   nombre_postulante, apellido_paterno_postulante,
   apellido_materno_postulante, correo_electronico, contrasena, 
   fecha_nacimiento, sexo, pais, estado, ciudad, colonia, calle, 
   codigo_postal, telefono, foto_perfil, estado_cuenta, curp, rfc 
  } = req.body;

  try {
    // Hashing password 
   const hashedPassword = await bcrypt.hash(contrasena, 10);
    const query = `INSERT INTO postulante (
        nombre_postulante, apellido_paterno_postulante, 
        apellido_materno_postulante, correo_electronico, contrasena, 
        fecha_nacimiento, sexo, pais, estado, ciudad, colonia, calle, 
        codigo_postal, telefono, foto_perfil, estado_cuenta, curp, rfc
        )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       RETURNING *`;
    
       const values = [
        nombre_postulante, apellido_paterno_postulante, 
        apellido_materno_postulante, correo_electronico, hashedPassword, 
        fecha_nacimiento, sexo, pais, estado, ciudad, colonia, calle, 
        codigo_postal, telefono, foto_perfil, estado_cuenta, curp, rfc
      ]; 
      
      const result = await pool.query(query, values);
      // No regresa contraseña al frontend
      // const { contrasena, ...user } = result.rows[0];
    res.status(201).json(result.rows[0]);
    console.log("Postulante creado correctamente!!!!!!");
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});


// --- REGISTRO DE EMPLEADORES ---
app.post("/empleadores/registro", async (req, res) => {
  const {
    nombre_empresa, correo_electronico, contrasena, pais,
    estado, ciudad, colonia, calle, codigo_postal, telefono, 
    rfc, descripcion
  } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(contrasena, 10);
    const query = `INSERT INTO empleador (
      nombre_empresa, correo_electronico, contrasena, pais,
      estado, ciudad, colonia, calle, codigo_postal, telefono, 
      rfc, descripcion
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *`;

    const values = [
      nombre_empresa, correo_electronico, hashedPassword, pais,
      estado, ciudad, colonia, calle, codigo_postal, telefono, 
      rfc, descripcion
    ];

    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// LOGIN VERIFICATION 
// --- LOGIN REAL (CONECTADO A LA DB) ---
app.post("/login", async (req, res) => {
  const { correo_electronico, contrasena } = req.body;
  console.log("Intento de inicio de sesión con:", correo_electronico);

  try {
    let usuario = null;

    const postulanteQuery = 
    `SELECT 
    id_postulante AS id, correo_electronico AS correo, contrasena, 'postulante' AS rol 
    FROM postulante 
    WHERE correo_electronico = $1`

    const postulanteResult = await pool.query(postulanteQuery, [correo_electronico])

    if (postulanteResult.rows.length > 0) {
      usuario = postulanteResult.rows[0];
    }

    if (!usuario) {
      const empleadorQuery = 
      `SELECT 
      id_empleador AS id, correo_electronico AS correo, contrasena, 'empleador' AS rol
      FROM empleador
      WHERE correo_electronico = $1`;

      const empleadorResult = await pool.query(empleadorQuery, [correo_electronico]);

      if (empleadorResult.rows.length > 0) {
        usuario = empleadorResult.rows[0];
      }
    }

    
    if (!usuario) {
      const adminQuery = `
      SELECT 
      id_administrador AS id, correo_electronico AS correo, contrasena, 'administrador' AS rol
      FROM administrador
      WHERE correo_electronico = $1 `;

      const adminResult = await pool.query(adminQuery, [correo_electronico]);

      if (adminResult.rows.length > 0) {
        usuario = adminResult.rows[0]
      }
    }

    if (!usuario) {
      return res.status(401).json({ error: "Usuario no encontrado"});
    }

    const validPassword = await bcrypt.compare(contrasena, usuario.contrasena);
    
    if (!validPassword) {
      return res.status(401).json({ error: "Contraseña incorrecta"})
    }

    /*const token = jwt.sign({
      id: usuario.id,
      rol: usuario.rol,
      correo: usuario.correo
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h"}
  );*/

  const { contrasena: _, ...usuarioSinContrasena } = usuario
  res.json({
    message: "Inicio de sesión exitoso",
    user: usuarioSinContrasena
  });

  } catch (err) {
    console.error("Error en el servidor:", err.message);
    res.status(500).json({ error: "No se pudo conectar con la base de datos" });
  }

  
});

app.listen(3000, "0.0.0.0", () => console.log("Servidor corriendo en puerto 3000"));
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");

const nodemailer = require("nodemailer");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = express();

app.use(cors({ origin: "http://localhost:4200" }));
app.use(express.json());

/* ===== CONEXIÓN A BASE DE DATOS ===== */
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

/* ===== CONFIGURACIÓN DE CORREO ===== */
const correoDestino = process.env.EMAIL_TO || process.env.EMAIL_USER;
const hasEmailConfig = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

const transporter = hasEmailConfig
  ? nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })
  : null;

if (!hasEmailConfig) {
  console.error("Configuracion de correo incompleta. Revisa EMAIL_USER y EMAIL_PASS en backend/.env");
} else {
  transporter.verify((error) => {
    if (error) {
      console.log("Error en correo:", error.message);
    } else {
      console.log("Servidor de correo listo");
    }
  });
}

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ error: "Token requerido" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido" });
  }
};

const authorizeRoles = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({ error: "No tienes permiso" });
    }
    next();
  };
};

/* ===== ENDPOINT DE PRUEBA ===== */
app.get("/", (req, res) => {
  res.send("Servidor Chambee funcionando correctamente");
});

/* ===== REGISTRO DE POSTULANTES ===== */
app.post("/postulantes/registro", async (req, res) => {
  const {
    nombre_postulante, apellido_paterno_postulante,
    apellido_materno_postulante, correo_electronico, contrasena,
    fecha_nacimiento, sexo, pais, estado, ciudad, colonia, calle,
    codigo_postal, telefono, foto_perfil, estado_cuenta, curp, rfc
  } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(contrasena, 10);

    const query = `INSERT INTO postulante (
      nombre_postulante, apellido_paterno_postulante,
      apellido_materno_postulante, correo_electronico, contrasena,
      fecha_nacimiento, sexo, pais, estado, ciudad, colonia, calle,
      codigo_postal, telefono, foto_perfil, estado_cuenta, curp, rfc
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
    RETURNING id_postulante AS id, nombre_postulante AS nombre, correo_electronico AS correo, estado_cuenta`;

    const values = [
      nombre_postulante, apellido_paterno_postulante,
      apellido_materno_postulante, correo_electronico, hashedPassword,
      fecha_nacimiento, sexo, pais, estado, ciudad, colonia, calle,
      codigo_postal, telefono, foto_perfil, estado_cuenta, curp, rfc
    ];

    const result = await pool.query(query, values);

    const user = { ...result.rows[0], rol: "postulante" };

    res.status(201).json({ message: "Cuenta creada correctamente", user });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

/* ===== REGISTRO DE EMPLEADORES ===== */
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
    RETURNING id_empleador AS id, nombre_empresa AS nombre, correo_electronico AS correo, estado`;

    const values = [
      nombre_empresa, correo_electronico, hashedPassword, pais,
      estado, ciudad, colonia, calle, codigo_postal, telefono,
      rfc, descripcion
    ];

    const result = await pool.query(query, values);

    const user = { ...result.rows[0], rol: "empleador" };

    res.status(201).json({ message: "Cuenta creada correctamente", user });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===== PERFIL DE EMPLEADOR ===== */

// GET — sin verifyToken para que el frontend pueda cargar el perfil
app.get("/empleadores/:id/perfil", async (req, res) => {
  const { id } = req.params;

  try {
    const query = `SELECT
      id_empleador,
      nombre_empresa,
      correo_electronico,
      pais,
      estado,
      ciudad,
      colonia,
      calle,
      codigo_postal,
      telefono,
      rfc,
      descripcion,
      foto_perfil
    FROM empleador
    WHERE id_empleador = $1`;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Empleador no encontrado" });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener perfil del empleador" });
  }
});

// GET mi-perfil — con token porque usa req.user.id
app.get("/mi-perfil", verifyToken, async (req, res) => {
  try {
    const id = req.user.id;
    const rol = req.user.rol;

    let query = "";

    if (rol === "empleador") {
      query = `SELECT
        id_empleador,
        nombre_empresa,
        correo_electronico,
        pais,
        estado,
        ciudad,
        colonia,
        calle,
        codigo_postal,
        telefono,
        rfc,
        descripcion,
        foto_perfil
      FROM empleador
      WHERE id_empleador = $1`;
    } else if (rol === "postulante") {
      query = "SELECT * FROM postulante WHERE id_postulante = $1";
    } else if (rol === "administrador") {
      query = "SELECT * FROM administrador WHERE id_administrador = $1";
    }

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error("Error en /mi-perfil:", err);
    res.status(500).json({ error: "Error al obtener perfil" });
  }
});

// PUT — guarda foto_perfil junto con los demás campos
app.put("/empleadores/:id/perfil", async (req, res) => {
  const { id } = req.params;
  const {
    nombre_empresa,
    correo_electronico,
    pais,
    estado,
    ciudad,
    colonia,
    calle,
    codigo_postal,
    telefono,
    rfc,
    descripcion,
    foto_perfil,
  } = req.body;

  try {
    const query = `UPDATE empleador
      SET nombre_empresa     = $1,
          correo_electronico = $2,
          pais               = $3,
          estado             = $4,
          ciudad             = $5,
          colonia            = $6,
          calle              = $7,
          codigo_postal      = $8,
          telefono           = $9,
          rfc                = $10,
          descripcion        = $11,
          foto_perfil        = $12
      WHERE id_empleador = $13
      RETURNING
        id_empleador,
        nombre_empresa,
        correo_electronico,
        pais,
        estado,
        ciudad,
        colonia,
        calle,
        codigo_postal,
        telefono,
        rfc,
        descripcion,
        foto_perfil`;

    const values = [
      nombre_empresa,
      correo_electronico,
      pais,
      estado,
      ciudad,
      colonia,
      calle,
      codigo_postal,
      telefono,
      rfc,
      descripcion,
      foto_perfil,
      id,
    ];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Empleador no encontrado" });
    }

    res.json({
      message: "Perfil actualizado correctamente",
      perfil: result.rows[0],
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar perfil del empleador" });
  }
});

/* ===== ANUNCIOS ===== */
app.get("/empleadores/:id/anuncios", async (req, res) => {
  const { id } = req.params;

  try {
    const query = `SELECT
      id_anuncio,
      titulo,
      descripcion,
      tipo_anuncio,
      estado,
      ciudad,
      colonia,
      calle,
      codigo_postal,
      salario,
      modalidad,
      fecha_publicacion,
      estado_anuncio,
      vistas
    FROM anuncios
    WHERE id_empleador = $1
    ORDER BY fecha_publicacion DESC NULLS LAST`;

    const result = await pool.query(query, [id]);
    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener anuncios del empleador" });
  }
});

app.post("/empleadores/:id/anuncios", async (req, res) => {
  const { id } = req.params;
  const {
    titulo, descripcion, tipo_anuncio, estado, ciudad,
    colonia, calle, codigo_postal, salario, modalidad, estado_anuncio,
  } = req.body;

  try {
    const query = `INSERT INTO anuncios (
      titulo, descripcion, tipo_anuncio, estado, ciudad,
      colonia, calle, codigo_postal, salario, modalidad,
      estado_anuncio, id_empleador, vistas
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,0)
    RETURNING
      id_anuncio, titulo, descripcion, tipo_anuncio, estado,
      ciudad, colonia, calle, codigo_postal, salario, modalidad,
      fecha_publicacion, estado_anuncio, vistas`;

    const values = [
      titulo, descripcion, tipo_anuncio, estado, ciudad,
      colonia, calle, codigo_postal, salario, modalidad,
      estado_anuncio, id,
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      message: "Oferta laboral creada correctamente",
      anuncio: result.rows[0],
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear la oferta laboral" });
  }
});

app.get("/anuncios", async (_req, res) => {
  try {
    const query = `SELECT
      a.id_anuncio,
      a.titulo,
      a.descripcion,
      a.tipo_anuncio,
      a.estado,
      a.ciudad,
      a.colonia,
      a.calle,
      a.codigo_postal,
      a.salario,
      a.modalidad,
      a.fecha_publicacion,
      a.estado_anuncio,
      a.vistas,
      e.nombre_empresa,
      e.descripcion AS descripcion_empresa
    FROM anuncios a
    INNER JOIN empleador e ON e.id_empleador = a.id_empleador
    WHERE a.estado_anuncio = 'ACTIVO'
    ORDER BY a.fecha_publicacion DESC NULLS LAST`;

    const result = await pool.query(query);
    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener anuncios publicos" });
  }
});

/* ===== LOGIN ===== */
app.post("/login", async (req, res) => {
  const { correo_electronico, contrasena } = req.body;

  try {
    let usuario = null;

    const postulante = await pool.query(
      `SELECT id_postulante AS id, nombre_postulante as nombre, correo_electronico AS correo, contrasena, 'postulante' AS rol
       FROM postulante WHERE correo_electronico = $1`,
      [correo_electronico]
    );
    if (postulante.rows.length > 0) usuario = postulante.rows[0];

    if (!usuario) {
      const empleador = await pool.query(
        `SELECT id_empleador AS id, nombre_empresa as nombre, correo_electronico AS correo, contrasena, 'empleador' AS rol
         FROM empleador WHERE correo_electronico = $1`,
        [correo_electronico]
      );
      if (empleador.rows.length > 0) usuario = empleador.rows[0];
    }

    if (!usuario) {
      const admin = await pool.query(
        `SELECT id_administrador AS id, correo_electronico AS correo, contrasena, 'administrador' AS rol
         FROM administrador WHERE correo_electronico = $1`,
        [correo_electronico]
      );
      if (admin.rows.length > 0) usuario = admin.rows[0];
    }

    if (!usuario) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }

    const validPassword = await bcrypt.compare(contrasena, usuario.contrasena);

    if (!validPassword) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    const { contrasena: _, ...user } = usuario;

    const token = jwt.sign(
      { id: user.id, correo: user.correo, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ message: "Inicio de sesión exitoso", token, user });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en servidor" });
  }
});

/* ===== SOPORTE ===== */
app.post("/api/support", async (req, res) => {
  const { nombreCompleto, empresa, correo, telefono, asunto, detalles } = req.body;

  try {
    if (!transporter || !correoDestino) {
      return res.status(500).json({ error: "Configuracion de correo no disponible" });
    }

    if (!nombreCompleto || !correo || !telefono || !asunto || !detalles) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: correoDestino,
      replyTo: correo,
      subject: `Soporte: ${asunto || "Nuevo mensaje"}`,
      html: `
        <h2>Nuevo reporte</h2>
        <p><b>Nombre:</b> ${nombreCompleto}</p>
        <p><b>Empresa:</b> ${empresa || "No proporcionada"}</p>
        <p><b>Correo:</b> ${correo}</p>
        <p><b>Teléfono:</b> ${telefono}</p>
        <p><b>Asunto:</b> ${asunto}</p>
        <p><b>Mensaje:</b></p>
        <p>${detalles}</p>
      `
    });

    console.log("Correo enviado correctamente");
    res.json({ ok: true });

  } catch (error) {
    console.error("Error enviando correo:", error);
    res.status(500).json({ error: "Error enviando correo" });
  }
});

/* ===== INICIAR SERVIDOR ===== */
app.listen(3000, "0.0.0.0", () => {
  console.log("Servidor corriendo en http://localhost:3000");
});
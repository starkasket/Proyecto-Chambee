const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");
const crypto = require("crypto");

const nodemailer = require("nodemailer");
const { decode } = require("punycode");
const { log } = require("console");
const axios = require("axios");
const { text } = require("stream/consumers");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:4200",
    methods: ["GET", "POST"]
  }
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log('Un usuario se conectó a WebSockets:', socket.id);

  socket.on('joinRoom', (employerId) => {
    socket.join(employerId);
    console.log(`Empleador unido a su sala de notificaciones: ${employerId}`);
  });

  socket.on('disconnect', () => {
    console.log('Usuario desconectado de WebSockets');
  });
});

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

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token requerido" })
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    let table = "";
    let idField = "";
    let selectFields = "token_version, estado_cuenta";

    if (decoded.rol === "postulante") {
      table = "postulante";
      idField = "id_postulante";
    } else if (decoded.rol === "empleador") {
      table = "empleador";
      idField = "id_empleador";
    } else if (decoded.rol === "administrador") {
      table = "administrador";
      idField = "id_administrador";
      selectFields = "token_version, NULL AS estado_cuenta";
    } else {
      return res.status(401).json({ error: "Rol no válido" });
    }

    const result = await pool.query(
      `SELECT ${selectFields} FROM ${table} WHERE ${idField} = $1`, [decoded.id]
    );

    if (!result.rows.length) {
      return res.status(401).json({ error: "Usuario no válido" });
    }

    if (result.rows[0].estado_cuenta === 'ELIMINADA') {
      return res.status(401).json({
        error: "Cuenta eliminada"
      });
    }

    const currentVersion = result.rows[0].token_version;

    const tokenVersion = decoded.tokenVersion !== undefined ? decoded.tokenVersion : 0;
    if (tokenVersion !== currentVersion) {
      return res.status(401).json({ error: "Sesión expirada" })
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido" })
  }
}

const authorizeRoles = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({ error: "No tienes permiso" })
    }
    next();
  }
}

const LIMITES_CAMBIO = {
  nombre_postulante: 1,
  apellido_paterno_postulante: 1,
  apellido_materno_postulante: 1,
  fecha_nacimiento: 1,
  sexo: 1
};

const CATEGORIAS_BASE = [
  { nombre: "Tecnología / TI", descripcion: "Vacantes de desarrollo, soporte, datos e infraestructura." },
  { nombre: "Administración / Oficina", descripcion: "Puestos administrativos, recepción y operaciones de oficina." },
  { nombre: "Ventas", descripcion: "Roles comerciales, prospección y cierre de ventas." },
  { nombre: "Atención al cliente", descripcion: "Soporte, seguimiento y servicio directo al cliente." },
  { nombre: "Marketing / Publicidad", descripcion: "Contenido, campañas, redes sociales y posicionamiento." },
  { nombre: "Diseño", descripcion: "Vacantes creativas de diseño gráfico, UX/UI y multimedia." },
  { nombre: "Educación / Docencia", descripcion: "Roles de enseñanza, capacitación y acompañamiento académico." },
  { nombre: "Salud / Medicina", descripcion: "Puestos clínicos, de enfermería y servicios de salud." },
  { nombre: "Ingeniería", descripcion: "Vacantes de ingeniería industrial, civil, mecánica y afines." },
  { nombre: "Construcción / Obra", descripcion: "Trabajos de obra, supervisión y mantenimiento estructural." },
  { nombre: "Manufactura / Producción", descripcion: "Operaciones de planta, líneas de producción y calidad." },
  { nombre: "Logística / Transporte", descripcion: "Distribución, almacén, rutas y movilidad." },
  { nombre: "Restaurantes / Gastronomía", descripcion: "Cocina, meseros, barra y operación restaurantera." },
  { nombre: "Turismo / Hotelería", descripcion: "Recepción, hospedaje, tours y atención al visitante." },
  { nombre: "Servicios de limpieza", descripcion: "Limpieza domestica, comercial e industrial." },
  { nombre: "Seguridad / Vigilancia", descripcion: "Monitoreo, vigilancia y prevención." },
  { nombre: "Recursos Humanos", descripcion: "Reclutamiento, nómina, cultura y administración de personal." },
  { nombre: "Finanzas / Contabilidad", descripcion: "Contabilidad, tesorería, análisis y administración financiera." },
  { nombre: "Legal / Derecho", descripcion: "Asuntos jurídicos, contratos y cumplimiento." },
  { nombre: "Agricultura / Ganadería", descripcion: "Producción agropecuaria, campo y cadena primaria." },
  { nombre: "Servicios técnicos / Mantenimiento", descripcion: "Soporte técnico, reparación e instalaciones." }
];

async function ensureCategoriasBase(client = pool) {
  const renombres = [
    ["Tecnologia / TI", "Tecnología / TI"],
    ["Administracion / Oficina", "Administración / Oficina"],
    ["Atencion al cliente", "Atención al cliente"],
    ["Diseno", "Diseño"],
    ["Educacion / Docencia", "Educación / Docencia"],
    ["Ingenieria", "Ingeniería"],
    ["Construccion / Obra", "Construcción / Obra"],
    ["Manufactura / Produccion", "Manufactura / Producción"],
    ["Logistica / Transporte", "Logística / Transporte"],
    ["Restaurantes / Gastronomia", "Restaurantes / Gastronomía"],
    ["Turismo / Hoteleria", "Turismo / Hotelería"],
    ["Agricultura / Ganaderia", "Agricultura / Ganadería"],
    ["Servicios tecnicos / Mantenimiento", "Servicios técnicos / Mantenimiento"]
  ];

  for (const [anterior, nuevo] of renombres) {
    await client.query(
      `UPDATE categorias
       SET nombre = $2
       WHERE nombre = $1`,
      [anterior, nuevo]
    );
  }

  for (const categoria of CATEGORIAS_BASE) {
    await client.query(
      `INSERT INTO categorias (nombre, descripcion)
       VALUES ($1, $2)
       ON CONFLICT (nombre) DO NOTHING`,
      [categoria.nombre, categoria.descripcion]
    );
  }
}

async function obtenerCategoriasPorNombre(nombres = [], client = pool) {
  const nombresNormalizados = [...new Set(
    nombres
      .filter((item) => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
  )];

  if (!nombresNormalizados.length) {
    return [];
  }

  const result = await client.query(
    `SELECT id_categoria, nombre
     FROM categorias
     WHERE LOWER(nombre) = ANY($1::text[])`,
    [nombresNormalizados.map((nombre) => nombre.toLowerCase())]
  );

  return result.rows;
}

/* ===== ENDPOINT DE PRUEBA ===== */
app.get("/", (req, res) => {
  res.send("Servidor Chambee funcionando correctamente");
});

app.get("/categorias", async (_req, res) => {
  try {
    await ensureCategoriasBase();
    const result = await pool.query(
      `SELECT id_categoria, nombre, descripcion
       FROM categorias
       ORDER BY nombre ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener categorias" });
  }
});

/* ===== REGISTRO DE POSTULANTES ===== */
app.post("/postulantes/registro", async (req, res) => {
  const {
    nombre_postulante, apellido_paterno_postulante,
    apellido_materno_postulante, correo_electronico, contrasena,
    fecha_nacimiento, sexo, pais, estado, ciudad, colonia, calle,
    numero_exterior, codigo_postal, direccion_formateada, latitud,
    longitud, telefono, foto_perfil, curp, rfc
  } = req.body;

  const estado_cuenta = 'ACTIVA';
  try {
    const emailCheck = await pool.query(
      `SELECT 'postulante' AS tipo FROM postulante WHERE correo_electronico = $1
       UNION SELECT 'empleador' FROM empleador WHERE correo_electronico = $1
       UNION SELECT 'administrador' FROM administrador WHERE correo_electronico = $1`,
      [correo_electronico]
    );
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: "No se pudo crear la cuenta. Revisa tus datos.", duplicateField: "correo_electronico" });
    }

    const rfcCheck = await pool.query(
      `SELECT 'postulante' AS tipo FROM postulante WHERE rfc = $1
       UNION SELECT 'empleador' FROM empleador WHERE rfc = $1`,
       [rfc]
    );
    if (rfcCheck.rows.length > 0) {
      return res.status(400).json({ error: "No se pudo crear la cuenta. Revisa tus datos.", duplicateField: "rfc" });
    }

    const curpCheck = await pool.query(
      `SELECT 'postulante' AS tipo FROM postulante WHERE curp = $1`,
       [curp]
    );
    if (curpCheck.rows.length > 0) {
      return res.status(400).json({ error: "No se pudo crear la cuenta. Revisa tus datos.", duplicateField: "curp" });
    }

    const apimarketKey = process.env.APIMARKET_KEY;
    if (!apimarketKey) {
      console.warn("APIMARKET_KEY no está configurada en las variables de entorno. Se omitirá la validación.");
    } else if (curp) {
      try {
        const headers = {
          "Authorization": `Bearer ${apimarketKey}`,
          "Accept": "application/json",
          "Content-Type": "application/json"
        };
        if (process.env.APIMARKET_SANDBOX === "true") {
          headers["x-sandbox"] = "true";
        }

        const apiResponse = await axios.post(
          "https://apimarket.mx/api/renapo/grupo/valida-curp",
          { curp: curp.toUpperCase() },
          { headers, timeout: 10000 }
        );

        const apiData = apiResponse.data;

        if (apiData && (apiData.status === 402 || apiData.status === 500 || apiData.status === 503)) {
          console.warn("APIMarket no disponible para validar CURP (status:", apiData.status, "), se omite la validación:", apiData.message);
        } else if (!apiData || !apiData.success || apiData.status !== 200) {
          console.error("CURP inválida según APIMarket:", apiData);
          return res.status(400).json({ error: "La CURP proporcionada no es válida. Verifica que esté escrita correctamente." });
        }
      } catch (apiErr) {
        console.warn("No se pudo contactar APIMarket para validar la CURP, se omite la validación:", apiErr.response?.data || apiErr.message);
      }
    } else {
      return res.status(400).json({ error: "La CURP es obligatoria para el registro de postulante." });
    }

    if (apimarketKey && rfc) {
      try {
        const rfcHeaders = {
          "Authorization": `Bearer ${apimarketKey}`,
          "Accept": "application/json",
          "Content-Type": "application/json"
        };
        if (process.env.APIMARKET_SANDBOX === "true") {
          rfcHeaders["x-sandbox"] = "true";
        }

        const rfcResponse = await axios.post(
          "https://apimarket.mx/api/sat/grupo/validar-rfc",
          { rfc: rfc.toUpperCase() },
          { headers: rfcHeaders, timeout: 10000 }
        );

        const rfcData = rfcResponse.data;
        if (rfcData && (rfcData.status === 402 || rfcData.status === 500 || rfcData.status === 503)) {
          console.warn("APIMarket no disponible para validar RFC (status:", rfcData.status, "), se omite la validación:", rfcData.message);
        } else if (!rfcData || !rfcData.success || rfcData.status !== 200) {
          console.error("RFC inválido según APIMarket:", rfcData);
          return res.status(400).json({ error: "El RFC proporcionado no es válido. Verifica que esté escrito correctamente." });
        } else if (rfcData.data && rfcData.data.existeRfc === false) {
          return res.status(400).json({ error: "El RFC proporcionado no está registrado en el SAT." });
        }
      } catch (rfcErr) {
        console.warn("No se pudo contactar APIMarket para validar el RFC, se omite la validación:", rfcErr.response?.data || rfcErr.message);
      }
    } else if (!rfc) {
      return res.status(400).json({ error: "El RFC es obligatorio para el registro de postulante." });
    }

    const hashedPassword = await bcrypt.hash(contrasena, 10);

    if (latitud === null || latitud === undefined || longitud === null || longitud === undefined) {
      return res.status(400).json({ error: "La ubicación es obligatoria." });
    }

    const query = `INSERT INTO postulante (
      nombre_postulante, apellido_paterno_postulante,
      apellido_materno_postulante, correo_electronico, contrasena,
      fecha_nacimiento, sexo, pais, estado, ciudad, colonia, calle,
      numero_exterior, codigo_postal, direccion_formateada, latitud,
      longitud, telefono, foto_perfil, estado_cuenta, curp, rfc
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18, $19, $20, $21, $22)
    RETURNING id_postulante AS id, nombre_postulante AS nombre, correo_electronico AS correo, estado_cuenta, token_version`;

    const values = [
      nombre_postulante, apellido_paterno_postulante,
      apellido_materno_postulante, correo_electronico, hashedPassword,
      fecha_nacimiento, sexo, pais, estado, ciudad, colonia, calle,
      numero_exterior, codigo_postal, direccion_formateada, latitud,
      longitud, telefono, foto_perfil, estado_cuenta, curp, rfc
    ];

    const result = await pool.query(query, values);
    const user = { ...result.rows[0], rol: "postulante" };

    const token = jwt.sign(
      { id: user.id, correo: user.correo, rol: user.rol, tokenVersion: user.token_version },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({ message: "Cuenta creada correctamente", token, user });

  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      if (err.detail && err.detail.includes('curp')) return res.status(400).json({ error: "No se pudo crear la cuenta. Revisa tus datos.", duplicateField: "curp" });
      if (err.detail && err.detail.includes('rfc')) return res.status(400).json({ error: "No se pudo crear la cuenta. Revisa tus datos.", duplicateField: "rfc" });
      if (err.detail && err.detail.includes('correo_electronico')) return res.status(400).json({ error: "No se pudo crear la cuenta. Revisa tus datos.", duplicateField: "correo_electronico" });
    }
    res.status(500).json({ error: err.message });
  }
});

/* ===== REGISTRO DE EMPLEADORES ===== */
app.post("/empleadores/registro", async (req, res) => {
  const {
    nombre_empresa, correo_electronico, contrasena, pais,
    estado, ciudad, colonia, calle, numero_exterior, codigo_postal,
    direccion_formateada, latitud, longitud, telefono,
    rfc, descripcion
  } = req.body;

  const estado_cuenta = "ACTIVA";
  try {
    const emailCheck = await pool.query(
      `SELECT 'postulante' AS tipo FROM postulante WHERE correo_electronico = $1
       UNION SELECT 'empleador' FROM empleador WHERE correo_electronico = $1
       UNION SELECT 'administrador' FROM administrador WHERE correo_electronico = $1`,
      [correo_electronico]
    );
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: "No se pudo crear la cuenta. Revisa tus datos.", duplicateField: "correo_electronico" });
    }

    const rfcCheck = await pool.query(
      `SELECT 'postulante' AS tipo FROM postulante WHERE rfc = $1
       UNION SELECT 'empleador' FROM empleador WHERE rfc = $1`,
       [rfc]
    );
    if (rfcCheck.rows.length > 0) {
      return res.status(400).json({ error: "No se pudo crear la cuenta. Revisa tus datos.", duplicateField: "rfc" });
    }

    const empresaCheck = await pool.query(
      `SELECT 'empleador' AS tipo FROM empleador WHERE nombre_empresa = $1`,
       [nombre_empresa]
    );
    if (empresaCheck.rows.length > 0) {
      return res.status(400).json({ error: "No se pudo crear la cuenta. Revisa tus datos.", duplicateField: "nombre_empresa" });
    }

    const apimarketKey = process.env.APIMARKET_KEY;
    if (apimarketKey && rfc) {
      try {
        const rfcHeaders = {
          "Authorization": `Bearer ${apimarketKey}`,
          "Accept": "application/json",
          "Content-Type": "application/json"
        };
        if (process.env.APIMARKET_SANDBOX === "true") {
          rfcHeaders["x-sandbox"] = "true";
        }

        const rfcResponse = await axios.post(
          "https://apimarket.mx/api/sat/grupo/validar-rfc",
          { rfc: rfc.toUpperCase() },
          { headers: rfcHeaders, timeout: 10000 }
        );

        const rfcData = rfcResponse.data;
        if (!rfcData || !rfcData.success || rfcData.status !== 200) {
          return res.status(400).json({ error: "No se pudo crear la cuenta. Revisa tus datos.", duplicateField: "rfc" });
        }
        if (rfcData.data && rfcData.data.existeRfc === false) {
          return res.status(400).json({ error: "No se pudo crear la cuenta. Revisa tus datos.", duplicateField: "rfc" });
        }
      } catch (rfcErr) {
        return res.status(400).json({ error: "La RFC no es válida o no pudo ser validada.", duplicateField: "rfc" });
      }
    } else if (!rfc) {
      return res.status(400).json({ error: "El RFC es obligatorio para el registro de empleador." });
    }

    const hashedPassword = await bcrypt.hash(contrasena, 10);

    if (latitud === null || latitud === undefined || longitud === null || longitud === undefined) {
      return res.status(400).json({ error: "La ubicación es obligatoria." });
    }

    const query = `INSERT INTO empleador (
      nombre_empresa, correo_electronico, contrasena, pais,
      estado, ciudad, colonia, calle, numero_exterior, codigo_postal, 
      direccion_formateada, latitud, longitud, telefono,
      rfc, descripcion
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16 )
    RETURNING id_empleador AS id, nombre_empresa AS nombre, correo_electronico AS correo, estado, token_version`;

    const values = [
      nombre_empresa, correo_electronico, hashedPassword, pais,
      estado, ciudad, colonia, calle, numero_exterior, codigo_postal,
      direccion_formateada, latitud, longitud, telefono,
      rfc, descripcion
    ];

    const result = await pool.query(query, values);
    const user = { ...result.rows[0], rol: "empleador" };

    const token = jwt.sign(
      { id: user.id, correo: user.correo, rol: user.rol, tokenVersion: user.token_version },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({ message: "Cuenta creada correctamente", token, user });

  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      if (err.detail && err.detail.includes('rfc')) return res.status(400).json({ error: "No se pudo crear la cuenta. Revisa tus datos.", duplicateField: "rfc" });
      if (err.detail && err.detail.includes('correo_electronico')) return res.status(400).json({ error: "No se pudo crear la cuenta. Revisa tus datos.", duplicateField: "correo_electronico" });
      if (err.detail && err.detail.includes('nombre_empresa')) return res.status(400).json({ error: "No se pudo crear la cuenta. Revisa tus datos.", duplicateField: "nombre_empresa" });
    }
    res.status(500).json({ error: err.message });
  }
});

/* ===== PERFIL DE EMPLEADOR ===== */
app.get("/empleadores/:id/perfil", verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    if (req.user.rol !== "empleador" || String(req.user.id) !== String(id)) {
      return res.status(403).json({ error: "No autorizado" })
    }

    const query = `SELECT
      id_empleador, nombre_empresa, correo_electronico, pais, estado, ciudad,
      colonia, calle, codigo_postal, telefono, rfc, descripcion, foto_perfil,
      latitud, longitud, numero_exterior, direccion_formateada
    FROM empleador
    WHERE id_empleador = $1`;

    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Empleador no encontrado" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener perfil del empleador" });
  }
});

app.put("/empleadores/:id/perfil", verifyToken, async (req, res) => {
  const { id } = req.params;
  const {
    nombre_empresa, correo_electronico, pais, estado, ciudad,
    colonia, calle, codigo_postal, telefono, rfc, descripcion,
    foto_perfil, latitud, longitud, numero_exterior, direccion_formateada
  } = req.body;

  try {
    if (req.user.rol !== "empleador" || String(req.user.id) !== String(id)) {
      return res.status(403).json({ error: "No autorizado" })
    }

    const query = `UPDATE empleador
      SET nombre_empresa = $1, correo_electronico = $2, pais = $3, estado = $4,
          ciudad = $5, colonia = $6, calle = $7, codigo_postal = $8,
          telefono = $9, rfc = $10, descripcion = $11, foto_perfil = $12
      WHERE id_empleador = $13
      RETURNING id_empleador, nombre_empresa, correo_electronico, pais, estado, ciudad,
                colonia, calle, codigo_postal, telefono, rfc, descripcion, foto_perfil`;

    const values = [
      nombre_empresa, correo_electronico, pais, estado, ciudad, colonia, calle,
      codigo_postal, telefono, rfc, descripcion, foto_perfil, id,
    ];

    const result = await pool.query(query, values);
    if (result.rows.length === 0) return res.status(404).json({ error: "Empleador no encontrado" });

    res.json({ message: "Perfil actualizado correctamente", perfil: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar perfil del empleador" });
  }
});

app.get("/mi-perfil", verifyToken, async (req, res) => {
  try {
    const id = req.user.id;
    const rol = req.user.rol;
    let query = "";

    if (rol === "empleador") {
      query = `SELECT id_empleador, nombre_empresa, correo_electronico, pais, estado, ciudad,
        colonia, calle, codigo_postal, telefono, rfc, descripcion, foto_perfil
      FROM empleador WHERE id_empleador = $1`;
    } else if (rol === "postulante") {
      query = `SELECT 
        p.id_postulante, p.nombre_postulante, p.apellido_paterno_postulante, p.apellido_materno_postulante, 
        p.correo_electronico, p.fecha_nacimiento, p.sexo, p.pais, p.estado, p.ciudad, p.colonia, 
        p.calle, p.numero_exterior, p.codigo_postal, p.direccion_formateada, p.latitud, p.longitud, p.telefono, p.foto_perfil, p.curp, p.rfc, c.visible_empresas, 
        p.fecha_registro, c.archivo_cv
      FROM postulante p
      LEFT JOIN cv c ON c.id_postulante = p.id_postulante
      WHERE p.id_postulante = $1`;
    } else if (rol === "administrador") {
      query = "SELECT * FROM administrador WHERE id_administrador = $1";
    }

    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });

    let responseData = result.rows[0];

    if (rol === "empleador") {
      const ratingsRes = await pool.query(`
        SELECT COALESCE(AVG(v.puntuacion), 0)::numeric(3,1) AS promedio_valoracion,
               COUNT(v.id_valoracion)::int AS total_valoraciones
        FROM empleador_valoracion ev
        JOIN valoracion v ON ev.id_valoracion = v.id_valoracion
        JOIN postulante p ON p.id_postulante = ev.id_postulante
        WHERE ev.id_empleador = $1 AND p.estado_cuenta = 'ACTIVA'
      `, [id]);

      const reviewsRes = await pool.query(`
        SELECT v.id_valoracion, v.puntuacion, v.comentario, v.fecha_valoracion,
               p.nombre_postulante, p.foto_perfil AS foto_postulante, ev.id_postulante
        FROM empleador_valoracion ev
        JOIN valoracion v ON ev.id_valoracion = v.id_valoracion
        JOIN postulante p ON ev.id_postulante = p.id_postulante
        WHERE ev.id_empleador = $1 AND p.estado_cuenta = 'ACTIVA'
        ORDER BY v.fecha_valoracion DESC
      `, [id]);

      responseData = {
        ...responseData,
        promedio_valoracion: parseFloat(ratingsRes.rows[0]?.promedio_valoracion || 0),
        total_valoraciones: ratingsRes.rows[0]?.total_valoraciones || 0,
        valoraciones_recibidas: reviewsRes.rows
      };
    }

    if (rol === "postulante") {
      const ratingsRes = await pool.query(`
        SELECT COALESCE(AVG(v.puntuacion), 0)::numeric(3,1) AS promedio_valoracion,
               COUNT(v.id_valoracion)::int AS total_valoraciones
        FROM postulante_valoracion pv
        JOIN valoracion v ON pv.id_valoracion = v.id_valoracion
        JOIN empleador e ON e.id_empleador = pv.id_empleador
        WHERE pv.id_postulante = $1 AND e.estado_cuenta = 'ACTIVA'
      `, [id]);

      const reviewsRes = await pool.query(`
        SELECT v.id_valoracion, v.puntuacion, v.comentario, v.fecha_valoracion,
               e.nombre_empresa, e.foto_perfil AS foto_empresa, pv.id_empleador
        FROM postulante_valoracion pv
        JOIN valoracion v ON pv.id_valoracion = v.id_valoracion
        JOIN empleador e ON pv.id_empleador = e.id_empleador
        WHERE pv.id_postulante = $1 AND e.estado_cuenta = 'ACTIVA'
        ORDER BY v.fecha_valoracion DESC
      `, [id]);

      responseData = {
        ...responseData,
        promedio_valoracion: parseFloat(ratingsRes.rows[0]?.promedio_valoracion || 0),
        total_valoraciones: ratingsRes.rows[0]?.total_valoraciones || 0,
        valoraciones_recibidas: reviewsRes.rows
      };
    }

    res.json(responseData);
  } catch (err) {
    console.error("Error en /mi-perfil:", err);
    res.status(500).json({ error: "Error al obtener perfil" });
  }
});

app.get("/postulantes/:id", verifyToken, authorizeRoles("empleador", "postulante", "administrador"), async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.rol === "postulante" && req.user.id !== id) {
      return res.status(403).json({ error: "No autorizado para ver este perfil" });
    }

    const esPropioOAdmin = (req.user.rol === "postulante" && req.user.id === id) || req.user.rol === "administrador";

    const query = `SELECT 
      p.id_postulante, p.nombre_postulante, p.apellido_paterno_postulante, p.apellido_materno_postulante, 
      p.correo_electronico, p.fecha_nacimiento, p.sexo, p.pais, p.estado, p.ciudad, p.telefono, 
      p.foto_perfil, p.fecha_registro,
      CASE
        WHEN $2 = true THEN c.archivo_cv
        WHEN c.visible_empresas = true THEN c.archivo_cv
        ELSE NULL
      END AS archivo_cv
    FROM postulante p
    LEFT JOIN cv c ON c.id_postulante = p.id_postulante
    WHERE p.id_postulante = $1 AND p.estado_cuenta = 'ACTIVA'`;

    const result = await pool.query(query, [id, esPropioOAdmin]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Postulante no encontrado" });

    const ratingsRes = await pool.query(`
      SELECT COALESCE(AVG(v.puntuacion), 0)::numeric(3,1) AS promedio_valoracion,
             COUNT(v.id_valoracion)::int AS total_valoraciones
      FROM postulante_valoracion pv
      JOIN valoracion v ON pv.id_valoracion = v.id_valoracion
      JOIN empleador e ON e.id_empleador = pv.id_empleador
      WHERE pv.id_postulante = $1 AND e.estado_cuenta = 'ACTIVA'
    `, [id]);

    const reviewsRes = await pool.query(`
      SELECT v.id_valoracion, v.puntuacion, v.comentario, v.fecha_valoracion,
             e.nombre_empresa, e.foto_perfil AS foto_empresa, pv.id_empleador
      FROM postulante_valoracion pv
      JOIN valoracion v ON pv.id_valoracion = v.id_valoracion
      JOIN empleador e ON pv.id_empleador = e.id_empleador
      WHERE pv.id_postulante = $1 AND e.estado_cuenta = 'ACTIVA'
      ORDER BY v.fecha_valoracion DESC
    `, [id]);

    let valoracion_propia = null;
    if (req.user.rol === "empleador") {
      const ownRatingRes = await pool.query(`
        SELECT v.puntuacion FROM postulante_valoracion pv
        JOIN valoracion v ON pv.id_valoracion = v.id_valoracion
        WHERE pv.id_postulante = $1 AND pv.id_empleador = $2
      `, [id, req.user.id]);
      if (ownRatingRes.rows.length > 0) valoracion_propia = ownRatingRes.rows[0].puntuacion;
    }

    res.json({
      ...result.rows[0],
      promedio_valoracion: parseFloat(ratingsRes.rows[0]?.promedio_valoracion || 0),
      total_valoraciones: ratingsRes.rows[0]?.total_valoraciones || 0,
      valoracion_propia,
      valoraciones_recibidas: reviewsRes.rows
    });
  } catch (err) {
    console.error("Error en GET /postulantes/:id", err);
    res.status(500).json({ error: "Error al obtener perfil del postulante" });
  }
});

app.get("/postulantes/:id/postulaciones", verifyToken, authorizeRoles("postulante", "administrador"), async (req, res) => {
  const { id } = req.params;
  if (req.user.rol === "postulante" && req.user.id !== id) {
    return res.status(403).json({ error: "No autorizado para ver estas postulaciones" });
  }

  try {
    const query = `SELECT
      po.id_postulacion, po.id_postulante, po.id_anuncio, po.estado AS estado_postulacion, po.fecha_postulacion,
      a.titulo AS vacante, a.descripcion AS resumen, a.ciudad, a.estado,
      e.nombre_empresa, e.foto_perfil AS foto_empresa,
      (SELECT COUNT(*) FROM postulacion p2 WHERE p2.id_anuncio = po.id_anuncio) AS postulantes_count,
      CASE WHEN c.visible_empresas = true THEN c.archivo_cv ELSE NULL END AS archivo_cv
    FROM postulacion po
    INNER JOIN anuncios a ON a.id_anuncio = po.id_anuncio
    INNER JOIN empleador e ON e.id_empleador = a.id_empleador
    LEFT JOIN cv c ON c.id_postulante = po.id_postulante
    WHERE po.id_postulante = $1
    ORDER BY po.fecha_postulacion DESC`;

    const result = await pool.query(query, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener postulaciones del postulante" });
  }
});

app.post("/postulantes/:id/valoracion", verifyToken, authorizeRoles("empleador"), async (req, res) => {
  const { id } = req.params;
  const { puntuacion, comentario } = req.body;
  const id_empleador = req.user.id;

  if (puntuacion === undefined || puntuacion < 1 || puntuacion > 5) {
    return res.status(400).json({ error: "La puntuación debe estar entre 1 y 5 estrellas" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const checkRes = await client.query(`SELECT pv.id_valoracion FROM postulante_valoracion pv WHERE pv.id_postulante = $1 AND pv.id_empleador = $2`, [id, id_empleador]);

    let id_valoracion;
    if (checkRes.rows.length > 0) {
      id_valoracion = checkRes.rows[0].id_valoracion;
      await client.query(
        `UPDATE valoracion SET puntuacion = $1, comentario = $2, fecha_valoracion = CURRENT_TIMESTAMP WHERE id_valoracion = $3`,
        [puntuacion, comentario || null, id_valoracion]
      );
    } else {
      const insertValRes = await client.query(
        `INSERT INTO valoracion (puntuacion, comentario) VALUES ($1, $2) RETURNING id_valoracion`,
        [puntuacion, comentario || null]
      );
      id_valoracion = insertValRes.rows[0].id_valoracion;
      await client.query(
        `INSERT INTO postulante_valoracion (id_valoracion, id_postulante, id_empleador) VALUES ($1, $2, $3)`,
        [id_valoracion, id, id_empleador]
      );
    }

    await client.query("COMMIT");

    const updatedStatsRes = await pool.query(`
      SELECT COALESCE(AVG(v.puntuacion), 0)::numeric(3,1) AS promedio_valoracion, COUNT(v.id_valoracion)::int AS total_valoraciones
      FROM postulante_valoracion pv
      JOIN valoracion v ON pv.id_valoracion = v.id_valoracion
      JOIN empleador e ON e.id_empleador = pv.id_empleador
      WHERE pv.id_postulante = $1 AND e.estado_cuenta = 'ACTIVA'
    `, [id]);

    const updatedReviewsRes = await pool.query(`
      SELECT v.id_valoracion, v.puntuacion, v.comentario, v.fecha_valoracion, e.nombre_empresa, e.foto_perfil AS foto_empresa, pv.id_empleador
      FROM postulante_valoracion pv
      JOIN valoracion v ON pv.id_valoracion = v.id_valoracion
      JOIN empleador e ON pv.id_empleador = e.id_empleador
      WHERE pv.id_postulante = $1 AND e.estado_cuenta = 'ACTIVA'
      ORDER BY v.fecha_valoracion DESC
    `, [id]);

    res.json({
      message: "Valoración guardada correctamente",
      promedio_valoracion: parseFloat(updatedStatsRes.rows[0]?.promedio_valoracion || 0),
      total_valoraciones: updatedStatsRes.rows[0]?.total_valoraciones || 0,
      valoraciones_recibidas: updatedReviewsRes.rows
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error al registrar valoración del postulante:", err);
    res.status(500).json({ error: "Error interno al calificar al postulante" });
  } finally {
    client.release();
  }
});

app.get("/postulantes", verifyToken, authorizeRoles("empleador", "administrador"), async (req, res) => {
  try {
    const esAdmin = req.user.rol === "administrador";
    const result = await pool.query(`SELECT
      p.id_postulante, p.nombre_postulante, p.apellido_paterno_postulante, p.apellido_materno_postulante,
      p.correo_electronico, p.telefono, p.foto_perfil, p.descripcion,
      CASE 
        WHEN $1 = true THEN c.archivo_cv
        WHEN c.visible_empresas = true THEN c.archivo_cv
        ELSE NULL 
      END AS archivo_cv
    FROM postulante p
    LEFT JOIN cv c ON c.id_postulante = p.id_postulante
    WHERE p.estado_cuenta = 'ACTIVA'
    ORDER BY p.fecha_registro DESC`, [esAdmin]);

    const postulantes = result.rows.map((p) => ({
      ...p,
      nombre_completo: `${p.nombre_postulante || ''} ${p.apellido_paterno_postulante || ''}`.trim()
    }));

    res.json(postulantes);
  } catch (err) {
    console.error("Error en GET /postulantes", err);
    res.status(500).json({ error: "Error al obtener postulantes" });
  }
});

app.get("/empleadores", verifyToken, authorizeRoles("administrador"), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id_empleador, nombre_empresa, correo_electronico, pais, estado, ciudad, colonia, calle, codigo_postal, 
        telefono, foto_perfil, fecha_registro, estado_cuenta, rfc, descripcion
      FROM empleador
      WHERE estado_cuenta = 'ACTIVA'
      ORDER BY fecha_registro DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error en GET /empleadores", err);
    res.status(500).json({ error: "Error al obtener empleadores" });
  }
});

async function puedeCambiarCampo(id, campo) {
  const diasLimite = LIMITES_CAMBIO[campo];
  if (!diasLimite) return true;

  const result = await pool.query(`
    SELECT fecha_cambio FROM historial_cambios WHERE id_postulante = $1 AND campo = $2 ORDER BY fecha_cambio DESC LIMIT 1
  `, [id, campo]);

  if (result.rows.length === 0) return true;
  const lastDate = new Date(result.rows[0].fecha_cambio);
  return ((new Date() - lastDate) / (1000 * 60)) >= diasLimite;
}

async function guardarHistorial(id, campo, anterior, nuevo) {
  await pool.query(`
    INSERT INTO historial_cambios (id_postulante, campo, valor_anterior, valor_nuevo)
    VALUES ($1, $2, $3, $4)
  `, [id, campo, anterior, nuevo]);
}

app.put("/mi-perfil", verifyToken, async (req, res) => {
  try {
    const id = req.user.id;
    const rol = req.user.rol;
    const datos = req.body;

    let query = "";
    let values = [];

    if (rol === "empleador") {
      query = `UPDATE empleador
        SET nombre_empresa = $1, correo_electronico = $2, pais = $3, estado = $4,
            ciudad = $5, colonia = $6, calle = $7, codigo_postal = $8,
            telefono = $9, rfc = $10, descripcion = $11, foto_perfil = $12
        WHERE id_empleador = $13 RETURNING *`;
      values = [
        datos.nombre_empresa, datos.correo_electronico, datos.pais, datos.estado,
        datos.ciudad, datos.colonia, datos.calle, datos.codigo_postal,
        datos.telefono, datos.rfc, datos.descripcion, datos.foto_perfil, id
      ];
    } else if (rol === "postulante") {
      const actual = await pool.query("SELECT * FROM postulante WHERE id_postulante = $1", [id]);
      const perfilActual = actual.rows[0];
      const camposSensibles = ["nombre_postulante", "apellido_paterno_postulante", "apellido_materno_postulante", "fecha_nacimiento", "sexo"];

      for (const campo of camposSensibles) {
        let valorActualCmp = perfilActual[campo];
        if (campo === "fecha_nacimiento" && valorActualCmp instanceof Date) valorActualCmp = valorActualCmp.toISOString().split("T")[0];
        if (datos[campo] !== undefined && String(datos[campo]) !== String(valorActualCmp ?? "")) {
          const permitido = await puedeCambiarCampo(id, campo);
          if (!permitido) return res.status(400).json({ message: `No puedes cambiar ${campo} todavía. Intenta más tarde.` });
        }
      }

      query = `UPDATE postulante
        SET nombre_postulante = COALESCE($1, nombre_postulante),
            apellido_paterno_postulante = COALESCE($2, apellido_paterno_postulante),
            apellido_materno_postulante = COALESCE($3, apellido_materno_postulante),
            correo_electronico = COALESCE($4, correo_electronico),
            fecha_nacimiento = COALESCE($5, fecha_nacimiento),
            sexo = COALESCE($6, sexo),
            pais = COALESCE($7, pais),
            estado = COALESCE($8, estado),
            ciudad = COALESCE($9, ciudad),
            colonia = COALESCE($10, colonia),
            calle = COALESCE($11, calle),
            codigo_postal = COALESCE($12, codigo_postal),
            telefono = COALESCE($13, telefono),
            curp = COALESCE($14, curp),
            rfc = COALESCE($15, rfc),
            foto_perfil = COALESCE($16, foto_perfil),
            descripcion = COALESCE($17, descripcion)
        WHERE id_postulante = $18 RETURNING *`;

      values = [
        datos.nombre_postulante || null, datos.apellido_paterno_postulante || null, datos.apellido_materno_postulante || null,
        datos.correo_electronico || null, datos.fecha_nacimiento || null, datos.sexo || null,
        datos.pais || null, datos.estado || null, datos.ciudad || null, datos.colonia || null,
        datos.calle || null, datos.codigo_postal || null, datos.telefono || null,
        datos.curp || null, datos.rfc || null, datos.foto_perfil || null, datos.descripcion || null, id
      ];

      if (datos.archivo_cv) {
        const checkCv = await pool.query("SELECT id_cv FROM cv WHERE id_postulante = $1", [id]);
        if (checkCv.rows.length > 0) {
          await pool.query("UPDATE cv SET archivo_cv = $1, ultima_actualizacion = NOW() WHERE id_postulante = $2", [datos.archivo_cv, id]);
        } else {
          await pool.query("INSERT INTO cv (id_postulante, archivo_cv, visible_empresas, fecha_subida, ultima_actualizacion) VALUES ($1, $2, true, NOW(), NOW())", [id, datos.archivo_cv]);
        }
      }

      for (const campo of camposSensibles) {
        if (datos[campo] !== undefined) {
          let valorActualHist = perfilActual[campo];
          if (campo === "fecha_nacimiento" && valorActualHist instanceof Date) valorActualHist = valorActualHist.toISOString().split("T")[0];
          if (String(datos[campo]) !== String(valorActualHist ?? "")) {
            await guardarHistorial(id, campo, valorActualHist, datos[campo]);
          }
        }
      }
    }

    if (!query) return res.status(400).json({ error: "Rol no identificado" });
    const result = await pool.query(query, values);
    res.json({ message: "Perfil actualizado correctamente", perfil: result.rows[0] });

  } catch (err) {
    console.error("Error detallado en PUT /mi-perfil:", err);
    res.status(500).json({ error: "Error al actualizar perfil", detalle: err.message });
  }
});

app.get("/empleadores/:id/anuncios", verifyToken, authorizeRoles("empleador"), async (req, res) => {
  const { id } = req.params;
  if (String(req.user.id) !== String(id)) return res.status(403).json({ error: "No autorizado" });

  try {
    const query = `SELECT
      a.id_anuncio, a.titulo, a.descripcion, a.tipo_anuncio, a.urgencia, a.edad, a.educacion,
      (SELECT i.url_imagen FROM imagenes i WHERE i.id_anuncio = a.id_anuncio LIMIT 1) AS img,
      (SELECT COALESCE(ARRAY_AGG(i2.url_imagen ORDER BY i2.id_imagen), ARRAY[]::VARCHAR[]) FROM imagenes i2 WHERE i2.id_anuncio = a.id_anuncio) AS images,
      a.estado, a.ciudad, a.colonia, a.calle, a.codigo_postal, a.salario, a.moneda, a.periodo_pago, a.modalidad, a.fecha_publicacion,
      a.estado_anuncio, a.vistas, a.id_empleador, COUNT(DISTINCT po.id_postulacion) AS postulaciones_count,
      COALESCE(ARRAY_AGG(DISTINCT c.nombre) FILTER (WHERE c.nombre IS NOT NULL), ARRAY[]::VARCHAR[]) AS categorias
    FROM anuncios a
    LEFT JOIN postulacion po ON po.id_anuncio = a.id_anuncio
    LEFT JOIN categoriaAnuncio ca ON ca.id_anuncio = a.id_anuncio
    LEFT JOIN categorias c ON c.id_categoria = ca.id_categoria
    LEFT JOIN empleador e ON e.id_empleador = a.id_empleador
    WHERE a.id_empleador = $1 AND e.estado_cuenta = 'ACTIVA' AND a.estado_anuncio != 'ELIMINADO'
    GROUP BY a.id_anuncio ORDER BY a.fecha_publicacion DESC NULLS LAST`;

    const result = await pool.query(query, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener anuncios del empleador" });
  }
});

app.get("/empleadores/:id/postulaciones", verifyToken, authorizeRoles("empleador"), async (req, res) => {
  const { id } = req.params;
  if (String(req.user.id) !== String(id)) return res.status(403).json({ error: "No autorizado" });

  try {
    const query = `SELECT
      po.id_postulacion, po.id_postulante, po.id_anuncio, po.estado AS estado_postulacion, po.fecha_postulacion,
      p.nombre_postulante, p.apellido_paterno_postulante, p.apellido_materno_postulante, p.correo_electronico,
      p.telefono, p.foto_perfil, p.descripcion AS perfil_postulante,
      CASE WHEN c.visible_empresas = true THEN c.archivo_cv ELSE NULL END AS archivo_cv,
      a.titulo AS vacante
    FROM postulacion po
    INNER JOIN postulante p ON p.id_postulante = po.id_postulante
    INNER JOIN anuncios a ON a.id_anuncio = po.id_anuncio
    LEFT JOIN cv c ON c.id_postulante = p.id_postulante
    WHERE a.id_empleador = $1 AND p.estado_cuenta = 'ACTIVA'
    ORDER BY po.fecha_postulacion DESC`;

    const result = await pool.query(query, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener postulaciones" });
  }
});

/* ===== CREAR VACANTE (MODIFICADO PARA SOPORTAR MONEDA Y PERIODO_PAGO) ===== */
app.post("/empleadores/:id/anuncios", verifyToken, authorizeRoles("empleador"), async (req, res) => {
  const { id } = req.params;
  if (String(req.user.id) !== String(id)) return res.status(403).json({ error: "No autorizado" });

  const {
    titulo, descripcion, tipo_anuncio, urgencia = "Normal", edad = "Sin especificar",
    educacion = "Sin especificar", img, imgs = [], images: imagesBody = [],
    estado, ciudad, colonia, calle, numero_exterior, codigo_postal,
    latitud, longitud, direccion_formateada, salario, moneda = "MXN", periodo_pago = "Mensual",
    modalidad, estado_anuncio = "ACTIVO", etiquetas = []
  } = req.body;

  if (!titulo || !descripcion || !estado || !ciudad || salario === null || salario === undefined || !modalidad) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }

  if (latitud === null || latitud === undefined || longitud === null || longitud === undefined) {
    return res.status(400).json({ error: "La ubicación del anuncio es obligatoria" });
  }

  const latitudNumero = parseFloat(latitud);
  const longitudNumero = parseFloat(longitud);
  const salarioNumero = parseFloat(salario);

  if (isNaN(latitudNumero) || isNaN(longitudNumero)) {
    return res.status(400).json({ error: "Coordenadas inválidas" });
  }

  if (isNaN(salarioNumero) || salarioNumero <= 0) return res.status(400).json({ error: "Salario inválido" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await ensureCategoriasBase(client);

    const query = `INSERT INTO anuncios (
      titulo, descripcion, tipo_anuncio, urgencia, edad, educacion, estado, ciudad, colonia, calle, numero_exterior, codigo_postal, latitud, longitud, direccion_formateada, salario, moneda, periodo_pago, modalidad, estado_anuncio, id_empleador, vistas
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,0) RETURNING *`;
    
    const values = [
      titulo, descripcion, tipo_anuncio, urgencia, edad, educacion, estado, ciudad, colonia || null, calle || null, numero_exterior || null, codigo_postal || null, latitudNumero, longitudNumero, direccion_formateada, salarioNumero, moneda, periodo_pago, modalidad, estado_anuncio, id
    ];
    
    const result = await client.query(query, values);
    const anuncio = result.rows[0];
    const imagenesPayload = Array.isArray(imgs) && imgs.length ? imgs : imagesBody;
    const imagenesNormalizadas = [...new Set(
      [img, ...(Array.isArray(imagenesPayload) ? imagenesPayload : [])]
        .filter((url) => typeof url === "string")
        .map((url) => url.trim())
        .filter(Boolean)
    )];

    for (const url of imagenesNormalizadas) {
      await client.query(`INSERT INTO imagenes (id_anuncio, url_imagen) VALUES ($1, $2)`, [anuncio.id_anuncio, url]);
    }
    const categorias = await obtenerCategoriasPorNombre(etiquetas, client);
    for (const categoria of categorias) await client.query(`INSERT INTO categoriaAnuncio (id_categoria, id_anuncio) VALUES ($1, $2)`, [categoria.id_categoria, anuncio.id_anuncio]);

    await client.query("COMMIT");
    const imagenesRows = await client.query(`SELECT url_imagen FROM imagenes WHERE id_anuncio = $1 ORDER BY id_imagen`, [anuncio.id_anuncio]);
    const images = imagenesRows.rows.map(r => r.url_imagen);
    res.status(201).json({ message: "Oferta creada", anuncio: { ...anuncio, img: images[0] || null, images, categorias: categorias.map(c => c.nombre) } });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Error al crear oferta", detail: err.message });
  } finally {
    client.release();
  }
});

app.get("/empleadores/:id/anuncios/:anuncioId", verifyToken, authorizeRoles("empleador"), async (req, res) => {
  const { id, anuncioId } = req.params;
  if (String(req.user.id) !== String(id)) return res.status(403).json({ error: "No autorizado" });

  try {
    const result = await pool.query(`SELECT
        a.id_anuncio, a.titulo, a.descripcion, a.tipo_anuncio, a.urgencia, a.edad, a.educacion, a.estado, a.ciudad, a.colonia, a.calle, a.codigo_postal, a.salario, a.moneda, a.periodo_pago, a.modalidad, a.fecha_publicacion, a.estado_anuncio, a.vistas, id_empleador,
        COALESCE(ARRAY_AGG(DISTINCT c.nombre) FILTER (WHERE c.nombre IS NOT NULL), ARRAY[]::VARCHAR[]) AS categorias
      FROM anuncios a
      LEFT JOIN categoriaAnuncio ca ON ca.id_anuncio = a.id_anuncio
      LEFT JOIN categorias c ON c.id_categoria = ca.id_categoria
      LEFT JOIN empleador e ON e.id_empleador = a.id_empleador
      WHERE a.id_empleador = $1 AND a.id_anuncio = $2 AND e.estado_cuenta = 'ACTIVA' GROUP BY a.id_anuncio`, [id, anuncioId]);

    if (!result.rows.length) return res.status(404).json({ error: "Vacante no encontrada" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener la vacante" });
  }
});

/* ===== EDITAR VACANTE (MODIFICADO PARA SOPORTAR MONEDA Y PERIODO_PAGO) ===== */
app.put("/empleadores/:id/anuncios/:anuncioId", verifyToken, authorizeRoles("empleador"), async (req, res) => {
  const { id, anuncioId } = req.params;
  if (String(req.user.id) !== String(id)) return res.status(403).json({ error: "No autorizado" });
  
  const {
    titulo, descripcion, tipo_anuncio, urgencia = 'Normal', edad = 'Sin especificar',
    educacion = 'Sin especificar', img, estado, ciudad, colonia, calle, codigo_postal,
    salario, moneda = 'MXN', periodo_pago = 'Mensual', modalidad, etiquetas = []
  } = req.body;

  if (!titulo || !descripcion || !estado || !ciudad || !colonia || !calle || !codigo_postal || salario === null || salario === undefined || !modalidad) return res.status(400).json({ error: "Faltan campos" });
  const salarioNumero = parseFloat(salario);
  if (isNaN(salarioNumero) || salarioNumero <= 0) return res.status(400).json({ error: "Salario inválido" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await ensureCategoriasBase(client);

    const updateResult = await client.query(`UPDATE anuncios
       SET titulo = $1, descripcion = $2, tipo_anuncio = $3, urgencia = $4, edad = $5, educacion = $6, estado = $7, ciudad = $8, colonia = $9, calle = $10, codigo_postal = $11, salario = $12, moneda = $13, periodo_pago = $14, modalidad = $15
       WHERE id_empleador = $16 AND id_anuncio = $17 RETURNING *`, [titulo, descripcion, tipo_anuncio, urgencia, edad, educacion, estado, ciudad, colonia, calle, codigo_postal, salarioNumero, moneda, periodo_pago, modalidad, id, anuncioId]);

    if (!updateResult.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Vacante no encontrada" });
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "img")) {
      await client.query("DELETE FROM imagenes WHERE id_anuncio = $1", [anuncioId]);
      if (img) await client.query(`INSERT INTO imagenes (id_anuncio, url_imagen) VALUES ($1, $2)`, [anuncioId, img]);
    }

    await client.query("DELETE FROM categoriaAnuncio WHERE id_anuncio = $1", [anuncioId]);
    const categorias = await obtenerCategoriasPorNombre(etiquetas, client);
    for (const categoria of categorias) await client.query(`INSERT INTO categoriaAnuncio (id_categoria, id_anuncio) VALUES ($1, $2)`, [categoria.id_categoria, anuncioId]);

    await client.query("COMMIT");
    res.json({ message: "Vacante actualizada", anuncio: { ...updateResult.rows[0], img: img || null, categorias: categorias.map(c => c.nombre) } });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Error al actualizar", detail: err.message });
  } finally {
    client.release();
  }
});

app.patch("/empleadores/:id/anuncios/:anuncioId/estado", verifyToken, authorizeRoles("empleador"), async (req, res) => {
  const { id, anuncioId } = req.params;
  const { estado_anuncio } = req.body;
  const estadosPermitidos = ["ACTIVO", "BORRADOR", "OCULTO", "ELIMINADO"];
  if (String(req.user.id) !== String(id)) return res.status(403).json({ error: "No autorizado" });
  if (!estado_anuncio || !estadosPermitidos.includes(estado_anuncio)) return res.status(400).json({ error: "Estado no válido" });

  try {
    const result = await pool.query(`UPDATE anuncios SET estado_anuncio = $1 WHERE id_empleador = $2 AND id_anuncio = $3 RETURNING id_anuncio, estado_anuncio`, [estado_anuncio, id, anuncioId]);
    if (!result.rows.length) return res.status(404).json({ error: "Vacante no encontrada." });
    res.json({ message: "Estado actualizado", anuncio: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar estado" });
  }
});

app.get("/anuncios", async (_req, res) => {
  try {
    const query = `SELECT
      a.*, (SELECT i.url_imagen FROM imagenes i WHERE i.id_anuncio = a.id_anuncio LIMIT 1) AS img,
      (SELECT COALESCE(ARRAY_AGG(i2.url_imagen ORDER BY i2.id_imagen), ARRAY[]::VARCHAR[]) FROM imagenes i2 WHERE i2.id_anuncio = a.id_anuncio) AS images,
      e.nombre_empresa, e.descripcion AS descripcion_empresa, e.foto_perfil AS foto_empresa,
      COUNT(DISTINCT po.id_postulacion) AS postulaciones_count,
      (SELECT COALESCE(ARRAY_AGG(p.foto_perfil), ARRAY[]::VARCHAR[]) FROM (SELECT pp.foto_perfil FROM postulacion po2 JOIN postulante pp ON pp.id_postulante = po2.id_postulante WHERE po2.id_anuncio = a.id_anuncio AND pp.foto_perfil IS NOT NULL LIMIT 3) p) AS postulantes_fotos,
      COALESCE(ARRAY_AGG(DISTINCT c.nombre) FILTER (WHERE c.nombre IS NOT NULL), ARRAY[]::VARCHAR[]) AS categorias
    FROM anuncios a
    INNER JOIN empleador e ON e.id_empleador = a.id_empleador
    LEFT JOIN postulacion po ON po.id_anuncio = a.id_anuncio
    LEFT JOIN categoriaAnuncio ca ON ca.id_anuncio = a.id_anuncio
    LEFT JOIN categorias c ON c.id_categoria = ca.id_categoria
    WHERE a.estado_anuncio = 'ACTIVO' AND e.estado_cuenta = 'ACTIVA'
    GROUP BY a.id_anuncio, e.nombre_empresa, e.descripcion, e.foto_perfil
    ORDER BY a.fecha_publicacion DESC NULLS LAST`;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener anuncios" });
  }
});

app.post("/anuncios/:id/vista", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "UPDATE anuncios SET vistas = vistas + 1 WHERE id_anuncio = $1 RETURNING vistas",
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Anuncio no encontrado" });
    res.json({ message: "Vista registrada", vistas: result.rows[0].vistas });
  } catch (err) {
    res.status(500).json({ error: "Error al registrar vista" });
  }
});

app.get("/busqueda", async (req, res) => {
  try {
    const { tipo = "", ordenar = "fecha" } = req.query;
    const filtrosEmpleos = construirFiltroEmpleos(req.query);
    const filtrosServicios = construirFiltroServicios(req.query);

    let empleos = { rows: [] };
    let servicios = { rows: [] };

    if (tipo === "" || tipo === "empleo") {
      empleos = await pool.query(
        consultaEmpleos(filtrosEmpleos.where),
        filtrosEmpleos.valores
      );
    }

    if (tipo === "" || tipo === "servicio") {
      servicios = await pool.query(
        consultaServicios(filtrosServicios.where),
        filtrosServicios.valores
      );
    }

    let resultados = normalizarResultados(
      empleos.rows,
      servicios.rows
    );

    resultados = ordenarResultados(
      resultados,
      ordenar
    );

    res.json(resultados);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Error en búsqueda"
    });
  }
});

function construirFiltroEmpleos(query) {
  const {
    q = "",
    modalidad = "",
    ciudad = "",
    categoriaEmpleo = ""
  } = query;

  const valores = [];
  let where = ` a.estado_anuncio='ACTIVO' AND e.estado_cuenta='ACTIVA' `;

  if (q) {
    const texto = `%${q.toLowerCase()}%`;
    valores.push(texto);
    where += ` 
            AND(LOWER(a.titulo) LIKE $${valores.length}
                OR LOWER(a.descripcion) LIKE $${valores.length}
                OR LOWER(e.nombre_empresa) LIKE $${valores.length})`;
  }

  if (modalidad) {
    valores.push(modalidad);
    where += ` AND a.modalidad=$${valores.length}`;
  }

  if (ciudad) {
    valores.push(ciudad);
    where += ` AND a.ciudad=$${valores.length}`;
  }

  if (categoriaEmpleo) {
    valores.push(categoriaEmpleo);
    where += ` 
        AND EXISTS(SELECT 1 FROM categoriaAnuncio ca2
            INNER JOIN categorias c2
            ON c2.id_categoria=ca2.id_categoria
            WHERE
            ca2.id_anuncio=a.id_anuncio
            AND
            c2.nombre=$${valores.length})`;

  }

  return { where, valores };
}

function construirFiltroServicios(query) {
  const {
    q = "",
    cobertura = "",
    ciudad = "",
    categoriaServicio = ""
  } = query;

  const valores = [];
  let where = `s.es_borrador=false AND p.estado_cuenta='ACTIVA'`;

  if (q) {
    const texto = `%${q.toLowerCase()}%`;
    valores.push(texto);
    where += ` AND (
        LOWER(s.title) LIKE $${valores.length}
        OR LOWER(s.description) LIKE $${valores.length}
        OR LOWER(s.categoria) LIKE $${valores.length}
        OR LOWER(p.nombre_postulante) LIKE $${valores.length}
        OR LOWER(p.apellido_paterno_postulante) LIKE $${valores.length}
        ) `;
  }

  if (cobertura) {
    valores.push(cobertura);
    where += ` AND s.modalidad=$${valores.length} `;
  }

  if (ciudad) {
    valores.push(ciudad);
    where += ` AND s.ciudad=$${valores.length} `;
  }
  if (categoriaServicio) {
    valores.push(categoriaServicio);
    where += ` AND s.categoria=$${valores.length}`;
  }

  return { where, valores };
}

function normalizarResultados(empleos, servicios) {
  const empleosNormalizados = empleos.map(e => ({ ...e, tipo: 'empleo' }));

  const serviciosNormalizados = servicios.map(s => ({
    ...s, tipo: 'servicio',
    titulo: s.title,
    descripcion: s.description,
    salario: s.presupuesto,
    nombre_empresa:
      `${s.nombre_postulante} ${s.apellido_paterno_postulante}`,
    img: s.img || s.foto_perfil || null // ← Corrección aplicada aquí
  }));

  return [
    ...empleosNormalizados, ...serviciosNormalizados
  ];
}

function ordenarResultados(resultados, ordenar) {
  if (ordenar === "fecha") {
    resultados.sort((a, b) => {
      const fechaA = new Date(
        a.fecha_publicacion || a.fecha_creacion
      );

      const fechaB = new Date(
        b.fecha_publicacion || b.fecha_creacion
      );

      return fechaB - fechaA;
    });
  }

  if (ordenar === "salario") {
    resultados.sort((a, b) => {
      const salarioA = Number(a.salario || 0);
      const salarioB = Number(b.salario || 0);
      return salarioB - salarioA;
    });
  }
  return resultados;
}

function consultaEmpleos(where) {
  const SQL_EMPLEOS = `SELECT a.*, (SELECT i.url_imagen FROM imagenes i WHERE i.id_anuncio=a.id_anuncio LIMIT 1) AS img,
        e.nombre_empresa, e.descripcion AS descripcion_empresa, e.foto_perfil AS foto_empresa,
        COUNT(DISTINCT po.id_postulacion) AS postulaciones_count,
        COALESCE(
          ARRAY_AGG(DISTINCT c.nombre)
          FILTER(WHERE c.nombre IS NOT NULL),
          ARRAY[]::VARCHAR[]
        ) AS categorias
      FROM anuncios a
      INNER JOIN empleador e ON e.id_empleador=a.id_empleador
      LEFT JOIN postulacion po ON po.id_anuncio=a.id_anuncio
      LEFT JOIN categoriaAnuncio ca ON ca.id_anuncio=a.id_anuncio
      LEFT JOIN categorias c ON c.id_categoria=ca.id_categoria
      WHERE
      %WHERE%
      GROUP BY 
      a.id_anuncio,
      e.nombre_empresa,
      e.descripcion,
      e.foto_perfil`;

  return SQL_EMPLEOS.replace("%WHERE%", where);
}

function consultaServicios(where) {
  const SQL_SERVICIOS = `SELECT s.*, p.nombre_postulante,
        p.apellido_paterno_postulante,
        p.apellido_materno_postulante,
        p.foto_perfil
        FROM servicios s
        INNER JOIN postulante p
        ON p.id_postulante=s.autor_id
        WHERE 
        %WHERE%`;
  return SQL_SERVICIOS.replace("%WHERE%", where);;
}

app.get("/empresas/:id/perfil-publico", verifyToken, authorizeRoles("postulante", "administrador"), async (req, res) => {
  const { id } = req.params;
  try {
    const perfilResult = await pool.query(`SELECT
        e.id_empleador, e.nombre_empresa, e.estado, e.ciudad, e.calle, e.descripcion, e.foto_perfil, COUNT(a.id_anuncio)::int AS vacantes_activas
      FROM empleador e
      LEFT JOIN anuncios a ON a.id_empleador = e.id_empleador AND a.estado_anuncio = 'ACTIVO'
      WHERE e.id_empleador = $1 AND e.estado_cuenta = 'ACTIVA'
      GROUP BY e.id_empleador, e.nombre_empresa, e.estado, e.ciudad, e.calle, e.descripcion, e.foto_perfil`, [id]);

    if (!perfilResult.rows.length) return res.status(404).json({ error: "Empresa no encontrada" });

    const anunciosResult = await pool.query(`SELECT
        a.id_anuncio, a.titulo, a.descripcion, a.urgencia, a.estado, a.ciudad, a.calle,
        (SELECT i.url_imagen FROM imagenes i WHERE i.id_anuncio = a.id_anuncio LIMIT 1) AS img,
        (SELECT COALESCE(ARRAY_AGG(i2.url_imagen ORDER BY i2.id_imagen), ARRAY[]::VARCHAR[]) FROM imagenes i2 WHERE i2.id_anuncio = a.id_anuncio) AS images,
        a.salario, a.moneda, a.periodo_pago, a.modalidad, a.fecha_publicacion, a.vistas,
        COALESCE(ARRAY_AGG(DISTINCT c.nombre) FILTER (WHERE c.nombre IS NOT NULL), ARRAY[]::VARCHAR[]) AS categorias
      FROM anuncios a
      LEFT JOIN categoriaAnuncio ca ON ca.id_anuncio = a.id_anuncio
      LEFT JOIN categorias c ON c.id_categoria = ca.id_categoria
      WHERE a.id_empleador = $1 AND a.estado_anuncio = 'ACTIVO'
      GROUP BY a.id_anuncio ORDER BY a.fecha_publicacion DESC NULLS LAST`, [id]);

    const ratingsRes = await pool.query(`SELECT COALESCE(AVG(v.puntuacion), 0)::numeric(3,1) AS promedio_valoracion, COUNT(v.id_valoracion)::int AS total_valoraciones FROM empleador_valoracion ev JOIN valoracion v ON ev.id_valoracion = v.id_valoracion JOIN postulante p ON p.id_postulante = ev.id_postulante WHERE ev.id_empleador = $1 AND p.estado_cuenta = 'ACTIVA'`, [id]);
    const reviewsRes = await pool.query(`SELECT v.id_valoracion, v.puntuacion, v.comentario, v.fecha_valoracion, p.nombre_postulante, p.foto_perfil AS foto_postulante, ev.id_postulante AS autor_id FROM empleador_valoracion ev JOIN valoracion v ON ev.id_valoracion = v.id_valoracion JOIN postulante p ON ev.id_postulante = p.id_postulante WHERE ev.id_empleador = $1 AND p.estado_cuenta = 'ACTIVA' ORDER BY v.fecha_valoracion DESC`, [id]);

    let valoracion_propia = null;
    const ownRatingRes = await pool.query(`SELECT v.puntuacion FROM empleador_valoracion ev JOIN valoracion v ON ev.id_valoracion = v.id_valoracion WHERE ev.id_empleador = $1 AND ev.id_postulante = $2`, [id, req.user.id]);
    if (ownRatingRes.rows.length > 0) valoracion_propia = ownRatingRes.rows[0].puntuacion;

    res.json({ perfil: { ...perfilResult.rows[0], promedio_valoracion: parseFloat(ratingsRes.rows[0]?.promedio_valoracion || 0), total_valoraciones: ratingsRes.rows[0]?.total_valoraciones || 0, valoracion_propia }, anuncios: anunciosResult.rows, valoraciones_recibidas: reviewsRes.rows });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener perfil público" });
  }
});

app.post("/empleadores/:id/valoracion", verifyToken, authorizeRoles("postulante"), async (req, res) => {
  const { id } = req.params;
  const { puntuacion, comentario } = req.body;
  const id_postulante = req.user.id;
  if (puntuacion !== undefined && (puntuacion < 1 || puntuacion > 5)) return res.status(400).json({ error: "Puntuación entre 1 y 5" });
  if (!puntuacion && !comentario?.trim()) return res.status(400).json({ error: "Debes enviar calificación o comentario" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const checkRes = await client.query(`SELECT ev.id_valoracion FROM empleador_valoracion ev WHERE ev.id_empleador = $1 AND ev.id_postulante = $2`, [id, id_postulante]);

    let id_valoracion;
    if (checkRes.rows.length > 0) {
      id_valoracion = checkRes.rows[0].id_valoracion;
      const updateFields = []; const updateValues = []; let paramIndex = 1;
      if (puntuacion) { updateFields.push(`puntuacion = $${paramIndex++}`); updateValues.push(puntuacion); }
      if (comentario?.trim()) { updateFields.push(`comentario = $${paramIndex++}`); updateValues.push(comentario.trim()); }
      updateFields.push(`fecha_valoracion = CURRENT_TIMESTAMP`); updateValues.push(id_valoracion);
      await client.query(`UPDATE valoracion SET ${updateFields.join(', ')} WHERE id_valoracion = $${paramIndex}`, updateValues);
    } else {
      const insertValRes = await client.query(`INSERT INTO valoracion (puntuacion, comentario) VALUES ($1, $2) RETURNING id_valoracion`, [puntuacion || null, comentario?.trim() || null]);
      id_valoracion = insertValRes.rows[0].id_valoracion;
      await client.query(`INSERT INTO empleador_valoracion (id_valoracion, id_empleador, id_postulante) VALUES ($1, $2, $3)`, [id_valoracion, id, id_postulante]);
    }
    await client.query("COMMIT");

    const updatedStatsRes = await pool.query(`SELECT COALESCE(AVG(v.puntuacion), 0)::numeric(3,1) AS promedio_valoracion, COUNT(v.id_valoracion)::int AS total_valoraciones FROM empleador_valoracion ev JOIN valoracion v ON ev.id_valoracion = v.id_valoracion JOIN postulante p ON p.id_postulante = ev.id_postulante WHERE ev.id_empleador = $1 AND p.estado_cuenta = 'ACTIVA'`, [id]);
    const updatedReviewsRes = await pool.query(`SELECT v.id_valoracion, v.puntuacion, v.comentario, v.fecha_valoracion, p.nombre_postulante, p.foto_perfil AS foto_postulante, ev.id_postulante AS autor_id FROM empleador_valoracion ev JOIN valoracion v ON ev.id_valoracion = v.id_valoracion JOIN postulante p ON ev.id_postulante = p.id_postulante WHERE ev.id_empleador = $1 AND p.estado_cuenta = 'ACTIVA' ORDER BY v.fecha_valoracion DESC`, [id]);
    res.json({ message: "Valoración guardada", promedio_valoracion: parseFloat(updatedStatsRes.rows[0]?.promedio_valoracion || 0), total_valoraciones: updatedStatsRes.rows[0]?.total_valoraciones || 0, valoraciones_recibidas: updatedReviewsRes.rows });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Error al calificar" });
  } finally {
    client.release();
  }
});

app.delete("/valoraciones/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const rol = req.user.rol;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let autorizado = false;
    const pvCheck = await client.query(`SELECT id_postulante, id_empleador FROM postulante_valoracion WHERE id_valoracion = $1`, [id]);
    if (pvCheck.rows.length > 0) {
      const row = pvCheck.rows[0];
      if ((rol === "empleador" && row.id_empleador === userId) || (rol === "postulante" && row.id_postulante === userId)) {
        autorizado = true; await client.query(`DELETE FROM postulante_valoracion WHERE id_valoracion = $1`, [id]);
      }
    }
    const evCheck = await client.query(`SELECT id_postulante, id_empleador FROM empleador_valoracion WHERE id_valoracion = $1`, [id]);
    if (evCheck.rows.length > 0) {
      const row = evCheck.rows[0];
      if ((rol === "postulante" && row.id_postulante === userId) || (rol === "empleador" && row.id_empleador === userId)) {
        autorizado = true; await client.query(`DELETE FROM empleador_valoracion WHERE id_valoracion = $1`, [id]);
      }
    }
    if (!autorizado) { await client.query("ROLLBACK"); return res.status(403).json({ error: "Sin permiso" }); }
    await client.query(`DELETE FROM valoracion WHERE id_valoracion = $1`, [id]);
    await client.query("COMMIT");
    res.json({ message: "Valoración eliminada" });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Error al eliminar" });
  } finally {
    client.release();
  }
});

app.post("/anuncios/:idAnuncio/postular", verifyToken, authorizeRoles("postulante"), async (req, res) => {
  const { idAnuncio } = req.params;
  const idPostulante = req.user.id;
  try {
    const checkAnuncio = await pool.query("SELECT id_anuncio, id_empleador, titulo FROM anuncios WHERE id_anuncio = $1", [idAnuncio]);
    if (checkAnuncio.rows.length === 0) return res.status(404).json({ error: "Vacante no encontrada" });
    const idEmpleador = checkAnuncio.rows[0].id_empleador;
    const tituloVacante = checkAnuncio.rows[0].titulo;

    const result = await pool.query(`INSERT INTO postulacion (id_postulante, id_anuncio, estado) VALUES ($1, $2, 'En revisión') RETURNING *`, [idPostulante, idAnuncio]);

    const userQuery = await pool.query("SELECT nombre_postulante FROM postulante WHERE id_postulante = $1", [idPostulante]);
    const nombrePostulante = userQuery.rows[0]?.nombre_postulante || 'Un candidato';

    const tituloPostulacion = '¡Nueva postulación!';
    const mensajePostulacion = `${nombrePostulante} acaba de aplicar a tu vacante: ${tituloVacante}`;

    await pool.query(
      `INSERT INTO notificaciones (id_empleador, titulo, mensaje, tipo) VALUES ($1, $2, $3, $4)`,
      [idEmpleador, tituloPostulacion, mensajePostulacion, 'NUEVA_POSTULACION']
    );

    const io = req.app.get('io');
    io.to(idEmpleador).emit('new_application', { titulo: tituloPostulacion, mensaje: mensajePostulacion, id_postulante: idPostulante });

    res.status(201).json({ message: "Postulacion enviada", postulacion: result.rows[0] });
  } catch (err) {
    if (err.code === "23505") return res.status(400).json({ error: "Ya te has postulado a esta vacante." });
    res.status(500).json({ error: "Error al postular" });
  }
});

app.get("/favoritos", verifyToken, authorizeRoles("postulante"), async (req, res) => {
  try {
    const query = `SELECT
      f.id_favoritos, f.fecha_guardado, a.id_anuncio, (SELECT i.url_imagen FROM imagenes i WHERE i.id_anuncio = a.id_anuncio LIMIT 1) AS img,
      (SELECT COALESCE(ARRAY_AGG(i2.url_imagen ORDER BY i2.id_imagen), ARRAY[]::VARCHAR[]) FROM imagenes i2 WHERE i2.id_anuncio = a.id_anuncio) AS images,
      a.titulo, a.descripcion, a.urgencia, a.edad, a.educacion, a.estado, a.ciudad, a.colonia, a.calle, a.codigo_postal, a.salario, a.moneda, a.periodo_pago, a.modalidad, a.fecha_publicacion, a.estado_anuncio, a.vistas,
      e.nombre_empresa, e.descripcion AS descripcion_empresa, e.foto_perfil AS foto_empresa,
      COALESCE(ARRAY_AGG(DISTINCT c.nombre) FILTER (WHERE c.nombre IS NOT NULL), ARRAY[]::VARCHAR[]) AS categorias
    FROM favoritos f
    INNER JOIN anuncios a ON a.id_anuncio = f.id_anuncio
    INNER JOIN empleador e ON e.id_empleador = a.id_empleador
    LEFT JOIN categoriaAnuncio ca ON ca.id_anuncio = a.id_anuncio
    LEFT JOIN categorias c ON c.id_categoria = ca.id_categoria
    WHERE f.id_postulante = $1 and e.estado_cuenta = 'ACTIVA'
    GROUP BY f.id_favoritos, a.id_anuncio, e.nombre_empresa, e.descripcion, e.foto_perfil
    ORDER BY f.fecha_guardado DESC`;

    const result = await pool.query(query, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener favoritos" });
  }
});

app.get("/anuncios/:idAnuncio/favorito", verifyToken, authorizeRoles("postulante"), async (req, res) => {
  const { idAnuncio } = req.params;
  try {
    const result = await pool.query(`SELECT id_favoritos FROM favoritos WHERE id_postulante = $1 AND id_anuncio = $2`, [req.user.id, idAnuncio]);
    res.json({ favorito: result.rows.length > 0 });
  } catch (err) {
    res.status(500).json({ error: "Error al revisar favorito" });
  }
});

app.post("/anuncios/:idAnuncio/favoritos", verifyToken, authorizeRoles("postulante"), async (req, res) => {
  const { idAnuncio } = req.params;
  try {
    const checkAnuncio = await pool.query("SELECT id_anuncio FROM anuncios WHERE id_anuncio = $1", [idAnuncio]);
    if (checkAnuncio.rows.length === 0) return res.status(404).json({ error: "Vacante no encontrada" });

    const result = await pool.query(`INSERT INTO favoritos (id_postulante, id_anuncio) VALUES ($1, $2) ON CONFLICT (id_postulante, id_anuncio) DO NOTHING RETURNING *`, [req.user.id, idAnuncio]);
    res.status(result.rows.length ? 201 : 200).json({ message: "Vacante guardada", favorito: true });
  } catch (err) {
    res.status(500).json({ error: "Error al guardar favorito" });
  }
});

app.delete("/anuncios/:idAnuncio/favoritos", verifyToken, authorizeRoles("postulante"), async (req, res) => {
  const { idAnuncio } = req.params;
  try {
    await pool.query(`DELETE FROM favoritos WHERE id_postulante = $1 AND id_anuncio = $2`, [req.user.id, idAnuncio]);
    res.json({ message: "Vacante eliminada", favorito: false });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar favorito" });
  }
});

app.get("/mi-etiquetas", verifyToken, async (req, res) => {
  try {
    await ensureCategoriasBase();
    const result = await pool.query(`SELECT c.id_categoria, c.nombre FROM seguimiento s INNER JOIN categorias c ON c.id_categoria = s.id_categoria WHERE s.id_postulante = $1 ORDER BY c.nombre ASC`, [req.user.id]);
    res.json({ etiquetas: result.rows.map((row) => row.nombre), categorias: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener intereses" });
  }
});

app.put("/mi-etiquetas", verifyToken, authorizeRoles("postulante"), async (req, res) => {
  const etiquetas = Array.isArray(req.body?.etiquetas) ? req.body.etiquetas : [];
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await ensureCategoriasBase(client);
    await client.query("DELETE FROM seguimiento WHERE id_postulante = $1", [req.user.id]);
    const categorias = await obtenerCategoriasPorNombre(etiquetas, client);
    for (const categoria of categorias) {
      await client.query(`INSERT INTO seguimiento (id_categoria, id_postulante) VALUES ($1, $2) ON CONFLICT (id_categoria, id_postulante) DO NOTHING`, [categoria.id_categoria, req.user.id]);
    }
    await client.query("COMMIT");
    res.json({ message: "Intereses actualizados", etiquetas: categorias.map(c => c.nombre) });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Error al guardar intereses" });
  } finally {
    client.release();
  }
});

/* ===== LOGIN ===== */
app.post("/login", async (req, res) => {
  const { correo_electronico, contrasena } = req.body;
  try {
    let usuario = null;
    const postulante = await pool.query(`SELECT id_postulante AS id, nombre_postulante as nombre, correo_electronico AS correo, contrasena, token_version, estado_cuenta, suspendido_hasta, 'postulante' AS rol FROM postulante WHERE correo_electronico = $1`, [correo_electronico]);
    if (postulante.rows.length > 0) usuario = postulante.rows[0];

    if (!usuario) {
      const empleador = await pool.query(`SELECT id_empleador AS id, nombre_empresa as nombre, correo_electronico AS correo, contrasena, token_version, estado_cuenta, suspendido_hasta, 'empleador' AS rol FROM empleador WHERE correo_electronico = $1`, [correo_electronico]);
      if (empleador.rows.length > 0) usuario = empleador.rows[0];
    }

    if (!usuario) {
      const admin = await pool.query(`SELECT id_administrador AS id, nombre, correo_electronico AS correo, contrasena, token_version, 'administrador' AS rol FROM administrador WHERE correo_electronico = $1`, [correo_electronico]);
      if (admin.rows.length > 0) usuario = admin.rows[0];
    }

    if (!usuario) return res.status(401).json({ error: "Usuario no encontrado" });
    if (usuario.estado_cuenta === 'ELIMINADA') return res.status(401).json({ error: "Usuario no encontrado" });

    if (usuario.suspendido_hasta) {
      const fechaFin = new Date(usuario.suspendido_hasta);
      const ahora = new Date();

      if (fechaFin > ahora) {
        return res.status(403).json({
          error: 'cuenta_suspendida',
          suspendido_hasta: usuario.suspendido_hasta
        });
      } else {
        const tabla = usuario.rol === 'postulante' ? 'postulante' : 'empleador';
        const idCampo = usuario.rol === 'postulante' ? 'id_postulante' : 'id_empleador';
        await pool.query(`UPDATE ${tabla} SET suspendido_hasta = NULL WHERE ${idCampo} = $1`, [usuario.id]);
      }
    }

    const validPassword = await bcrypt.compare(contrasena, usuario.contrasena);
    if (!validPassword) return res.status(401).json({ error: "Contraseña incorrecta" });

    const { contrasena: _, ...user } = usuario;
    const token = jwt.sign({ id: user.id, correo: user.correo, rol: user.rol, tokenVersion: user.token_version }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ message: "Inicio de sesión exitoso", token, user });
  } catch (err) {
    res.status(500).json({ error: "Error en servidor" });
  }
});

/* ===== SOPORTE ===== */
app.post("/api/support", async (req, res) => {
  const { nombreCompleto, empresa, correo, telefono, asunto, detalles } = req.body;
  try {
    if (!transporter || !correoDestino) return res.status(500).json({ error: "Configuracion de correo no disponible" });
    if (!nombreCompleto || !correo || !telefono || !asunto || !detalles) return res.status(400).json({ error: "Faltan campos obligatorios" });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: correoDestino,
      replyTo: correo,
      subject: `Soporte: ${asunto || "Nuevo mensaje"}`,
      html: `<h2>Nuevo reporte</h2><p><b>Nombre:</b> ${nombreCompleto}</p><p><b>Empresa:</b> ${empresa || "No proporcionada"}</p><p><b>Correo:</b> ${correo}</p><p><b>Teléfono:</b> ${telefono}</p><p><b>Asunto:</b> ${asunto}</p><p><b>Mensaje:</b></p><p>${detalles}</p>`
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Error enviando correo" });
  }
});

app.delete('/postulantes/eliminar-cuenta', verifyToken, async (req, res) => {
  try {
    await pool.query(`UPDATE postulante SET estado_cuenta = 'ELIMINADA', token_version = token_version + 1 WHERE id_postulante = $1`, [req.user.id]);
    res.status(200).json({ mensaje: 'Cuenta eliminada' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al eliminar la cuenta' });
  }
});

app.delete('/empleadores/eliminar-cuenta', verifyToken, async (req, res) => {
  try {
    await pool.query(`UPDATE empleador SET estado_cuenta = 'ELIMINADA', token_version = token_version + 1 WHERE id_empleador = $1`, [req.user.id]);
    res.status(200).json({ mensaje: 'Cuenta eliminada' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al eliminar la cuenta' });
  }
});

app.post("/auth/forgot-password", async (req, res) => {
  const { correo_electronico } = req.body;
  if (!transporter) return res.json({ message: "Modo desarrollo: email no enviado" });

  const postulante = await pool.query("SELECT * FROM postulante WHERE correo_electronico = $1 AND estado_cuenta = 'ACTIVA'", [correo_electronico]);
  const empleador = await pool.query("SELECT * FROM empleador WHERE correo_electronico = $1 AND estado_cuenta = 'ACTIVA'", [correo_electronico]);
  const admin = await pool.query("SELECT * FROM administrador WHERE correo_electronico = $1", [correo_electronico]);

  const user = postulante.rows[0] || empleador.rows[0] || admin.rows[0];
  let userType = null;
  if (postulante.rows.length) userType = "postulante";
  if (empleador.rows.length) userType = "empleador";
  if (admin.rows.length) userType = "admin";
  if (!user) return res.json({ message: "Si el correo existe, recibirás instrucciones" });

  const token = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const expires = Date.now() + 1000 * 60 * 15;

  await pool.query("DELETE FROM password_resets WHERE correo_electronico = $1", [correo_electronico]);
  await pool.query("INSERT INTO password_resets (correo_electronico, token, expires, user_type) VALUES ($1, $2, $3, $4)", [correo_electronico, hashedToken, expires, userType]);

  const resetLink = `http://localhost:4200/reset-password/${token}`;
  await transporter.sendMail({
    to: correo_electronico,
    subject: "Restablecimiento de contraseña - Chambee",
    html: `<h3>Recuperación de contraseña</h3><p>Haz clic en el siguiente enlace:</p><a href="${resetLink}">${resetLink}</a><p>Este enlace expira en 15 minutos</p>`
  });
  res.json({ message: "Si el correo existe, recibirás instrucciones" });
});

app.post("/auth/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: "Datos incompletos" });

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const result = await pool.query("Select * from password_resets WHERE token = $1", [hashedToken]);
    if (!result.rows.length) return res.status(400).json({ error: "Token inválido" });

    const resetData = result.rows[0];
    if (Date.now() > resetData.expires) return res.status(400).json({ error: "Token expirado" });

    const { correo_electronico, user_type } = resetData;
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    let table = "";
    if (user_type === "postulante") table = "postulante";
    if (user_type === "empleador") table = "empleador";
    if (user_type === "admin") table = "administrador";
    if (!table) return res.status(400).json({ error: "Tipo de usuario inválido" });

    await pool.query(`UPDATE ${table} SET contrasena = $1, token_version = token_version + 1 WHERE correo_electronico = $2`, [hashedPassword, correo_electronico]);
    await pool.query("DELETE FROM password_resets WHERE token = $1", [hashedToken]);
    res.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.get("/auth/validate-reset-token/:token", async (req, res) => {
  try {
    const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");
    const result = await pool.query("SELECT * FROM password_resets WHERE token = $1", [hashedToken]);
    if (!result.rows.length || Date.now() > result.rows[0].expires) return res.status(400).json({ valid: false });
    res.json({ valid: true });
  } catch (error) {
    res.status(500).json({ valid: false });
  }
});

/* ===== ACTUALIZAR CV DEL POSTULANTE ===== */
app.put("/mi-perfil/cv", verifyToken, authorizeRoles("postulante"), async (req, res) => {
  try {
    const { archivo_cv } = req.body;
    const id = req.user.id;
    if (!archivo_cv || typeof archivo_cv !== "string") return res.status(400).json({ error: "URL del CV no válida" });

    const existing = await pool.query(`SELECT id_cv FROM cv WHERE id_postulante = $1`, [id]);
    if (existing.rows.length > 0) {
      await pool.query(`UPDATE cv SET archivo_cv = $1, ultima_actualizacion = NOW() WHERE id_postulante = $2`, [archivo_cv, id]);
    } else {
      await pool.query(`INSERT INTO cv (id_postulante, archivo_cv, visible_empresas, fecha_subida, ultima_actualizacion) VALUES ($1, $2, true, NOW(), NOW())`, [id, archivo_cv]);
    }
    res.json({ message: "CV actualizado", archivo_cv });
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar CV" });
  }
});

/* ===== TOGGLE VISIBILIDAD CV ===== */
app.patch("/mi-perfil/cv/visibilidad", verifyToken, authorizeRoles("postulante"), async (req, res) => {
  try {
    const { visible_empresas } = req.body;
    const id = req.user.id;
    if (typeof visible_empresas !== "boolean") return res.status(400).json({ error: "visible_empresas debe ser true o false" });

    const existing = await pool.query("SELECT id_cv FROM cv WHERE id_postulante = $1", [id]);
    if (existing.rows.length === 0) {
      await pool.query(`INSERT INTO cv (id_postulante, archivo_cv, visible_empresas, fecha_subida, ultima_actualizacion) VALUES ($1, $2, $3, NOW(), NOW())`, [id, "", visible_empresas]);
    } else {
      await pool.query("UPDATE cv SET visible_empresas = $1, ultima_actualizacion = NOW() WHERE id_postulante = $2", [visible_empresas, id]);
    }
    res.json({ message: `CV ahora es ${visible_empresas ? "público" : "privado"}`, visible_empresas });
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar visibilidad" });
  }
});

/* ===== SERVICIOS (OFICIOS) ===== */
app.post("/servicios", verifyToken, authorizeRoles("postulante"), async (req, res) => {
  const { title, description, categoria, presupuesto, ubicacion, estado, ciudad, colonia, calle, numero_exterior, codigo_postal, direccion_formateada, latitud, longitud, cobertura, disponibilidad, img, esBorrador, autorId } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO servicios (title, description, categoria, presupuesto, ubicacion, estado, ciudad, colonia, calle, numero_exterior, codigo_postal, direccion_formateada, latitud, longitud, modalidad, urgencia, img, es_borrador, autor_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
      [title, description, categoria, presupuesto, ubicacion, estado, ciudad, colonia, calle, numero_exterior, codigo_postal, direccion_formateada, latitud, longitud, cobertura, disponibilidad, img, esBorrador, autorId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/servicios/:autorId", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`SELECT *, modalidad AS cobertura, urgencia AS disponibilidad FROM servicios WHERE autor_id = $1 ORDER BY fecha_creacion DESC`, [req.params.autorId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/servicio-detalle/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, p.nombre_postulante, p.apellido_paterno_postulante, p.foto_perfil AS foto_autor,
              p.correo_electronico, p.telefono
       FROM servicios s
       INNER JOIN postulante p ON p.id_postulante = s.autor_id
       WHERE s.id_servicio = $1`,
      [req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Servicio no encontrado" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/servicios-publicos", async (_req, res) => {
  try {
    const result = await pool.query(`SELECT s .* FROM servicios s INNER JOIN postulante p ON p.id_postulante = s.autor_id WHERE s.es_borrador = false AND p.estado_cuenta='ACTIVA' ORDER BY fecha_creacion DESC`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/servicios/:id", verifyToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM servicios WHERE id_servicio = $1 RETURNING *', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Servicio no encontrado' });
    res.status(200).json({ mensaje: 'Servicio eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Hubo un error al eliminar' });
  }
});

app.put("/servicios/:id", verifyToken, async (req, res) => {
  try {
    const { title, description, cobertura, disponibilidad, categoria, presupuesto, ubicacion, estado, ciudad, colonia, calle, codigo_postal, img } = req.body;
    const result = await pool.query(
      `UPDATE servicios SET title = $1, description = $2, modalidad = $3, urgencia = $4, categoria = $5, presupuesto = $6, ubicacion = $7, estado = $8, ciudad = $9, colonia = $10, calle = $11, codigo_postal = $12, img = $13 WHERE id_servicio = $14 RETURNING *`,
      [title, description, cobertura, disponibilidad, categoria, presupuesto, ubicacion, estado, ciudad, colonia, calle, codigo_postal, img, req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Servicio no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Hubo un error al actualizar' });
  }
});

app.patch("/servicios/:id/publicar", verifyToken, authorizeRoles("postulante"), async (req, res) => {
  try {
    const result = await pool.query(`UPDATE servicios SET es_borrador = false WHERE id_servicio = $1 AND autor_id = $2 RETURNING *`, [req.params.id, req.user.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Servicio no encontrado o no autorizado" });
    res.json({ mensaje: "Servicio publicado", servicio: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Error al publicar" });
  }
});

/* ===== ACEPTAR POSTULANTE ===== */
app.patch("/empleadores/postulantes/:idPostulante/aceptar", verifyToken, authorizeRoles("empleador"), async (req, res) => {
  const { idPostulante } = req.params;
  const idEmpleador = req.user.id;

  try {
    await pool.query(`
      UPDATE postulacion SET estado = 'Aceptado' WHERE id_postulante = $1 AND id_anuncio IN (SELECT id_anuncio FROM anuncios WHERE id_empleador = $2)
    `, [idPostulante, idEmpleador]);

    const empresaQuery = await pool.query("SELECT nombre_empresa FROM empleador WHERE id_empleador = $1", [idEmpleador]);
    const nombreEmpresa = empresaQuery.rows[0]?.nombre_empresa || 'Una empresa';

    const titulo = '¡Felicidades!';
    const mensaje = `La empresa ${nombreEmpresa} ha aceptado tu perfil y quiere darle seguimiento a tu postulación.`;

    await pool.query(
      `INSERT INTO notificaciones (id_postulante, titulo, mensaje, tipo) VALUES ($1, $2, $3, $4)`,
      [idPostulante, titulo, mensaje, 'SEGUIMIENTO_ACEPTADO']
    );

    const io = req.app.get('io');
    io.to(idPostulante).emit('application_accepted', { titulo, mensaje });
    res.json({ message: "Postulante aceptado y notificado" });
  } catch (err) {
    res.status(500).json({ error: "Error interno al aceptar al postulante" });
  }
});

app.post('/reportes', verifyToken, async (req, res) => {
  const { motivo, descripcion, id_postulante_reportado } = req.body;
  const id_empleador = req.user.id;
  try {
    await pool.query('BEGIN');
    if (req.user.rol !== 'empleador') return res.status(403).json({ error: 'Solo empleadores.' });

    const reporteResult = await pool.query(`INSERT INTO reporte (motivo, descripcion, estado, id_empleador) VALUES ($1, $2,'Pendiente',$3) RETURNING id_reporte`, [motivo, descripcion, id_empleador]);
    const idReporte = reporteResult.rows[0].id_reporte;

    await pool.query(`INSERT INTO reporte_a_postulante (id_reporte, id_postulante_reportado) VALUES ($1, $2)`, [idReporte, id_postulante_reportado]);
    await pool.query('COMMIT');
    res.status(201).json({ mensaje: 'Reporte creado', id_reporte: idReporte });
  } catch (error) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: 'Error al crear reporte' });
  }
});

app.get('/reportes/perfiles', verifyToken, authorizeRoles('administrador'), async (req, res) => {
  try {
    const query = `
      SELECT
        rep.id_reporte, rep.motivo, rep.descripcion, rep.estado, rep.fecha_reporte,
        rap.id_postulante_reportado AS id_postulante_reportado,
        p.nombre_postulante,
        p.apellido_paterno_postulante,
        p.apellido_materno_postulante,
        CASE WHEN p.suspendido_hasta > CURRENT_TIMESTAMP THEN true ELSE false END AS suspendido
      FROM public.reporte_a_postulante rap
      INNER JOIN public.reporte rep ON rap.id_reporte = rep.id_reporte
      INNER JOIN public.postulante p ON rap.id_postulante_reportado::text = p.id_postulante::text

      UNION ALL

      SELECT
        rep.id_reporte, rep.motivo, rep.descripcion, rep.estado, rep.fecha_reporte,
        rae.id_empleador_reportado AS id_postulante_reportado,
        e.nombre_empresa AS nombre_postulante,
        '' AS apellido_paterno_postulante,
        '' AS apellido_materno_postulante,
        CASE WHEN e.suspendido_hasta > CURRENT_TIMESTAMP THEN true ELSE false END AS suspendido
      FROM public.reporte_a_empleador rae
      INNER JOIN public.reporte rep ON rae.id_reporte = rep.id_reporte
      INNER JOIN public.empleador e ON rae.id_empleador_reportado::text = e.id_empleador::text

      ORDER BY fecha_reporte DESC;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener reportes de perfiles:', err);
    res.status(500).json({ error: "Error al obtener la lista de reportes." });
  }
});

app.delete('/reportes/:idReporte', verifyToken, authorizeRoles('administrador'), async (req, res) => {
  const { idReporte } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM reporte_a_postulante WHERE id_reporte = $1', [idReporte]);
    await client.query('DELETE FROM reporte_a_empleador WHERE id_reporte = $1', [idReporte]);
    await client.query('DELETE FROM reporte_a_anuncio WHERE id_reporte = $1', [idReporte]);
    await client.query('DELETE FROM reporte WHERE id_reporte = $1', [idReporte]);

    await client.query('COMMIT');
    res.json({ message: 'Reporte eliminado correctamente de la base de datos' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar el reporte:', err);
    res.status(500).json({ error: 'Hubo un error al eliminar el reporte' });
  } finally {
    client.release();
  }
});

app.post('/reportes/empleador', verifyToken, async (req, res) => {
  const { motivo, descripcion, id_empleador_reportado } = req.body;
  const id_postulante = req.user.id;
  try {
    await pool.query('BEGIN');
    if (req.user.rol !== 'postulante') return res.status(403).json({ error: 'Solo postulantes.' });

    const reporteResult = await pool.query(`INSERT INTO reporte (motivo, descripcion, estado, id_postulante) VALUES ($1, $2, 'Pendiente', $3) RETURNING id_reporte`, [motivo, descripcion, id_postulante]);
    const idReporte = reporteResult.rows[0].id_reporte;

    await pool.query(`INSERT INTO reporte_a_empleador (id_reporte, id_empleador_reportado) VALUES ($1, $2)`, [idReporte, id_empleador_reportado]);
    await pool.query('COMMIT');
    res.status(201).json({ mensaje: 'Reporte creado' });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: 'Error al crear reporte' });
  }
});

/* ===== NOTIFICACIONES ===== */
app.get("/notificaciones", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const rol = req.user.rol;
    let query = "";

    if (rol === "postulante") {
      query = `SELECT * FROM notificaciones WHERE id_postulante = $1 ORDER BY fecha_creacion DESC LIMIT 50`;
    } else if (rol === "empleador") {
      query = `SELECT * FROM notificaciones WHERE id_empleador = $1 ORDER BY fecha_creacion DESC LIMIT 50`;
    } else {
      return res.status(403).json({ error: "Rol no válido para ver notificaciones" });
    }

    const result = await pool.query(query, [userId]);

    const notificacionesFormateadas = result.rows.map(n => ({
      id: n.id_notificacion,
      title: n.titulo,
      message: n.mensaje,
      time: n.fecha_creacion,
      read: n.leida,
      tipo: n.tipo,
      applicantId: n.id_postulante
    }));

    res.json(notificacionesFormateadas);
  } catch (err) {
    console.error("Error al obtener notificaciones:", err);
    res.status(500).json({ error: "Error al obtener notificaciones" });
  }
});

app.put("/notificaciones/marcar-leidas", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const rol = req.user.rol;
    let query = "";

    if (rol === "postulante") {
      query = `UPDATE notificaciones SET leida = true WHERE id_postulante = $1 AND leida = false`;
    } else if (rol === "empleador") {
      query = `UPDATE notificaciones SET leida = true WHERE id_empleador = $1 AND leida = false`;
    } else {
      return res.status(403).json({ error: "Rol no válido" });
    }

    await pool.query(query, [userId]);
    res.json({ message: "Notificaciones marcadas como leídas" });
  } catch (err) {
    console.error("Error al actualizar notificaciones:", err);
    res.status(500).json({ error: "Error al actualizar notificaciones" });
  }
});

app.put("/usuarios/:id/suspender", verifyToken, authorizeRoles("administrador"), async (req, res) => {
  const { id } = req.params;
  const { dias_suspension } = req.body;

  try {
    const dias = dias_suspension === 0 ? 36500 : dias_suspension;

    let result = await pool.query(`
      UPDATE postulante 
      SET suspendido_hasta = NOW() + INTERVAL '${dias} days' 
      WHERE id_postulante = $1
    `, [id]);

    if (result.rowCount === 0) {
      result = await pool.query(`
        UPDATE empleador 
        SET suspendido_hasta = NOW() + INTERVAL '${dias} days' 
        WHERE id_empleador = $1
      `, [id]);
    }

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'No se encontró el postulante ni el empleador con ese ID' });
    }

    res.json({ success: true, message: 'Cuenta suspendida correctamente' });
  } catch (error) {
    console.error('Error al suspender:', error);
    res.status(500).json({ error: 'Error al suspender la cuenta' });
  }
});

app.put("/usuarios/:id/reactivar", verifyToken, authorizeRoles("administrador"), async (req, res) => {
  const { id } = req.params;

  try {
    let result = await pool.query(`
      UPDATE postulante 
      SET suspendido_hasta = NULL 
      WHERE id_postulante = $1
    `, [id]);

    if (result.rowCount === 0) {
      result = await pool.query(`
        UPDATE empleador 
        SET suspendido_hasta = NULL 
        WHERE id_empleador = $1
      `, [id]);
    }

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'No se encontró el postulante ni el empleador con ese ID' });
    }

    res.json({ success: true, message: 'Cuenta reactivada correctamente' });
  } catch (error) {
    console.error('Error al reactivar:', error);
    res.status(500).json({ error: 'Error al reactivar la cuenta' });
  }
});

/* ===== MIGRACIÓN DE BASE DE DATOS DINÁMICA ===== */
async function ensureDatabaseSchema() {
  try {
    await pool.query("ALTER TABLE valoracion ALTER COLUMN comentario DROP NOT NULL");

    try {
      await pool.query(`ALTER TABLE reporte DROP CONSTRAINT IF EXISTS fk_reporte_postulante`);
      await pool.query(`ALTER TABLE reporte DROP CONSTRAINT IF EXISTS fk_reporte_empleador`);
    } catch (e) {
      console.warn("[db] Aviso al eliminar FK de reporte:", e.message);
    }

    const tablasAArreglar = [
      { tabla: 'reporte', columna: 'id_postulante' },
      { tabla: 'reporte', columna: 'id_empleador' },
      { tabla: 'reporte_a_anuncio', columna: 'id_anuncio' }
    ];

    for (const item of tablasAArreglar) {
      try {
        await pool.query(`ALTER TABLE ${item.tabla} ALTER COLUMN ${item.columna} TYPE VARCHAR(255) USING ${item.columna}::text::VARCHAR`);
      } catch (e) {
        console.error(`[db] Error arreglando ${item.columna} en ${item.tabla}:`, e.message);
      }
    }

    await pool.query(`ALTER TABLE postulante ADD COLUMN IF NOT EXISTS suspendido_hasta TIMESTAMP;`);
    await pool.query(`ALTER TABLE empleador ADD COLUMN IF NOT EXISTS suspendido_hasta TIMESTAMP;`);

    await pool.query(`ALTER TABLE postulante ADD COLUMN IF NOT EXISTS numero_exterior VARCHAR(20)`);
    await pool.query(`ALTER TABLE postulante ADD COLUMN IF NOT EXISTS direccion_formateada VARCHAR(300)`);
    await pool.query(`ALTER TABLE postulante ADD COLUMN IF NOT EXISTS latitud DOUBLE PRECISION`);
    await pool.query(`ALTER TABLE postulante ADD COLUMN IF NOT EXISTS longitud DOUBLE PRECISION`);
    await pool.query(`ALTER TABLE empleador ADD COLUMN IF NOT EXISTS numero_exterior VARCHAR(20)`);
    await pool.query(`ALTER TABLE empleador ADD COLUMN IF NOT EXISTS direccion_formateada VARCHAR(300)`);
    await pool.query(`ALTER TABLE empleador ADD COLUMN IF NOT EXISTS latitud DOUBLE PRECISION`);
    await pool.query(`ALTER TABLE empleador ADD COLUMN IF NOT EXISTS longitud DOUBLE PRECISION`);

    // ================= MONEDA Y PERIODO EN ANUNCIOS =================
    await pool.query(`ALTER TABLE anuncios ADD COLUMN IF NOT EXISTS moneda VARCHAR(10) DEFAULT 'MXN';`);
    await pool.query(`ALTER TABLE anuncios ADD COLUMN IF NOT EXISTS periodo_pago VARCHAR(20) DEFAULT 'Mensual';`);
    // =================================================================

    const typeEmp = await pool.query("SELECT data_type FROM information_schema.columns WHERE table_name = 'empleador' AND column_name = 'id_empleador'");
    const empDataType = typeEmp.rows[0]?.data_type || 'VARCHAR(255)';

    const typePost = await pool.query("SELECT data_type FROM information_schema.columns WHERE table_name = 'postulante' AND column_name = 'id_postulante'");
    const postDataType = typePost.rows[0]?.data_type || 'VARCHAR(255)';

    await pool.query(`ALTER TABLE postulante_valoracion ADD COLUMN IF NOT EXISTS id_empleador ${empDataType}`);
    await pool.query(`ALTER TABLE empleador_valoracion ADD COLUMN IF NOT EXISTS id_postulante ${postDataType}`);

    await pool.query(`ALTER TABLE servicios ADD COLUMN IF NOT EXISTS img VARCHAR(255)`);
    await pool.query(`ALTER TABLE servicios ADD COLUMN IF NOT EXISTS latitud DOUBLE PRECISION`);
    await pool.query(`ALTER TABLE servicios ADD COLUMN IF NOT EXISTS longitud DOUBLE PRECISION`);
    await pool.query(`ALTER TABLE servicios ADD COLUMN IF NOT EXISTS numero_exterior VARCHAR(20)`);
    await pool.query(`ALTER TABLE servicios ADD COLUMN IF NOT EXISTS direccion_formateada VARCHAR(300)`);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 
          FROM pg_constraint 
          WHERE conname = 'unique_postulante_empleador'
        ) THEN
          ALTER TABLE postulante_valoracion 
          ADD CONSTRAINT unique_postulante_empleador UNIQUE (id_postulante, id_empleador);
        END IF;
      END;
      $$;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notificaciones (
        id_notificacion SERIAL PRIMARY KEY,
        id_postulante UUID REFERENCES postulante(id_postulante) ON DELETE CASCADE,
        id_empleador UUID REFERENCES empleador(id_empleador) ON DELETE CASCADE,
        titulo VARCHAR(100) NOT NULL,
        mensaje TEXT NOT NULL,
        leida BOOLEAN DEFAULT FALSE,
        tipo VARCHAR(50), 
        fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CHECK (
            (id_postulante IS NOT NULL AND id_empleador IS NULL) OR 
            (id_postulante IS NULL AND id_empleador IS NOT NULL)
        )
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS comentarios_anuncio (
        id_comentario UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        id_anuncio UUID NOT NULL,
        id_postulante UUID NOT NULL,
        texto VARCHAR(500) NOT NULL,
        fecha_comentario TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_comentario_anuncio FOREIGN KEY (id_anuncio) REFERENCES anuncios(id_anuncio) ON DELETE CASCADE,
        CONSTRAINT fk_comentario_postulante FOREIGN KEY (id_postulante) REFERENCES postulante(id_postulante) ON DELETE CASCADE
      );
    `);

    console.log("[db] Estructura de base de datos verificada y actualizada correctamente.");
  } catch (err) {
    console.error("[db] Error al verificar/actualizar la estructura de la base de datos:", err.message);
  }
}

app.post('/reportes/anuncios', async (req, res) => {
  try {
    const { id_anuncio, id_postulante, motivo, detalle } = req.body;

    await pool.query('BEGIN');

    const reporteQuery = `
            INSERT INTO public.reporte (motivo, descripcion, estado, id_postulante)
            VALUES ($1, $2, 'Pendiente', $3) RETURNING *;
        `;
    const reporteValues = [motivo, detalle, id_postulante];
    const reporteResult = await pool.query(reporteQuery, reporteValues);
    const nuevoReporte = reporteResult.rows[0];

    const anuncioQuery = `
            INSERT INTO public.reporte_a_anuncio (id_reporte, id_anuncio)
            VALUES ($1, $2);
        `;
    await pool.query(anuncioQuery, [nuevoReporte.id_reporte, id_anuncio]);

    await pool.query('COMMIT');

    nuevoReporte.id_anuncio = id_anuncio;
    res.status(200).json({ mensaje: 'Reporte creado con éxito', reporte: nuevoReporte });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error al crear reporte:', error);
    res.status(500).json({ error: 'Error interno al guardar el reporte' });
  }
});

app.get('/reportes/anuncios', async (req, res) => {
  try {
    const query = `
            SELECT 
                r.id_reporte,
                r.id_anuncio,
                a.titulo,
                rep.motivo AS razon,
                rep.descripcion AS descripcion,
                rep.fecha_reporte
            FROM public.reporte_a_anuncio r
            INNER JOIN public.reporte rep ON r.id_reporte = rep.id_reporte
            INNER JOIN public.anuncios a ON r.id_anuncio::text = a.id_anuncio::text
            ORDER BY rep.fecha_reporte DESC;
        `;
    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error al obtener reportes de anuncios:', error);
    res.status(500).json({ error: 'Error interno al obtener los reportes' });
  }
});

app.delete('/anuncios/:idAnuncio', verifyToken, authorizeRoles("administrador", "empleador"), async (req, res) => {
  const { idAnuncio } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const anuncioInfo = await client.query('SELECT id_empleador, titulo FROM anuncios WHERE id_anuncio = $1', [idAnuncio]);

    if (anuncioInfo.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'El anuncio no existe o ya fue eliminado.' });
    }

    const { id_empleador, titulo } = anuncioInfo.rows[0];

    await client.query('DELETE FROM reporte_a_anuncio WHERE id_anuncio = $1', [idAnuncio]);
    await client.query('DELETE FROM categoriaAnuncio WHERE id_anuncio = $1', [idAnuncio]);
    await client.query('DELETE FROM imagenes WHERE id_anuncio = $1', [idAnuncio]);
    await client.query('DELETE FROM favoritos WHERE id_anuncio = $1', [idAnuncio]);
    await client.query('DELETE FROM postulacion WHERE id_anuncio = $1', [idAnuncio]);

    await client.query('DELETE FROM anuncios WHERE id_anuncio = $1', [idAnuncio]);

    const tituloNotificacion = 'Anuncio eliminado por el administrador';
    const mensajeNotificacion = `Su anuncio "${titulo}" se ha borrado por incumplimiento de normas.`;

    await client.query(
      `INSERT INTO notificaciones (id_empleador, titulo, mensaje, tipo) VALUES ($1, $2, $3, $4)`,
      [id_empleador, tituloNotificacion, mensajeNotificacion, 'ANUNCIO_ELIMINADO']
    );

    const io = req.app.get('io');
    io.to(id_empleador).emit('anuncio_eliminado', { titulo: tituloNotificacion, mensaje: mensajeNotificacion });

    await client.query('COMMIT');
    res.status(200).json({ mensaje: 'Anuncio eliminado correctamente y notificación enviada al empleador.' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar el anuncio de la BD:', error);
    res.status(500).json({ error: 'Hubo un problema al intentar eliminar el anuncio en el servidor.' });
  } finally {
    client.release();
  }
});

app.get('/reportes/perfiles', async (req, res) => {
  try {
    res.status(200).json([]);
  } catch (error) {
    console.error('Error al obtener reportes de perfiles:', error);
    res.status(500).json({ error: 'Error interno al obtener los reportes de perfiles' });
  }
});

app.delete('/admin/usuarios/:id', verifyToken, authorizeRoles('administrador'), async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    
    const borrarSeguro = async (query, params) => {
        try { 
            await client.query('SAVEPOINT sp_borrar');
            await client.query(query, params); 
            await client.query('RELEASE SAVEPOINT sp_borrar');
        } catch (error) { 
            await client.query('ROLLBACK TO SAVEPOINT sp_borrar');
            console.warn(`[Aviso] Omitiendo tabla inexistente:`, error.message); 
        }
    };

    try {
        await client.query('BEGIN');

        const checkPostulante = await client.query('SELECT id_postulante FROM postulante WHERE id_postulante = $1', [id]);
        
        if (checkPostulante.rowCount > 0) {
            await borrarSeguro('DELETE FROM notificaciones WHERE id_postulante = $1', [id]);
            await borrarSeguro('DELETE FROM cv WHERE id_postulante = $1', [id]);
            await borrarSeguro('DELETE FROM favoritos WHERE id_postulante = $1', [id]);
            await borrarSeguro('DELETE FROM postulacion WHERE id_postulante = $1', [id]);
            await borrarSeguro('DELETE FROM servicios WHERE autor_id = $1', [id]);
            await borrarSeguro('DELETE FROM historial_cambios WHERE id_postulante = $1', [id]);
            await borrarSeguro('DELETE FROM seguimiento WHERE id_postulante = $1', [id]);
            
            await borrarSeguro('DELETE FROM reporte_a_postulante WHERE id_postulante_reportado = $1', [id]);
            await borrarSeguro('DELETE FROM reporte_a_empleador WHERE id_reporte IN (SELECT id_reporte FROM reporte WHERE id_postulante = $1)', [id]);
            await borrarSeguro('DELETE FROM reporte_a_anuncio WHERE id_reporte IN (SELECT id_reporte FROM reporte WHERE id_postulante = $1)', [id]);
            await borrarSeguro('DELETE FROM reporte WHERE id_postulante = $1', [id]);
            
            await borrarSeguro('DELETE FROM postulante_valoracion WHERE id_postulante = $1', [id]);
            await borrarSeguro('DELETE FROM empleador_valoracion WHERE id_postulante = $1', [id]);
            
            await client.query('DELETE FROM postulante WHERE id_postulante = $1', [id]);
            
            await client.query('COMMIT');
            return res.status(200).json({ mensaje: 'Perfil de postulante eliminado permanentemente.' });
        }

        const checkEmpleador = await client.query('SELECT id_empleador FROM empleador WHERE id_empleador = $1', [id]);
        
        if (checkEmpleador.rowCount > 0) {
            await borrarSeguro('DELETE FROM notificaciones WHERE id_empleador = $1', [id]);

            const anuncios = await client.query('SELECT id_anuncio FROM anuncios WHERE id_empleador = $1', [id]);
            for (const anuncio of anuncios.rows) {
                await borrarSeguro('DELETE FROM imagenes WHERE id_anuncio = $1', [anuncio.id_anuncio]);
                await borrarSeguro('DELETE FROM categoriaAnuncio WHERE id_anuncio = $1', [anuncio.id_anuncio]);
                await borrarSeguro('DELETE FROM favoritos WHERE id_anuncio = $1', [anuncio.id_anuncio]);
                await borrarSeguro('DELETE FROM postulacion WHERE id_anuncio = $1', [anuncio.id_anuncio]);
                await borrarSeguro('DELETE FROM reporte_a_anuncio WHERE id_anuncio = $1', [anuncio.id_anuncio]);
            }
            await borrarSeguro('DELETE FROM anuncios WHERE id_empleador = $1', [id]);
            
            await borrarSeguro('DELETE FROM reporte_a_empleador WHERE id_empleador_reportado = $1', [id]);
            await borrarSeguro('DELETE FROM reporte_a_postulante WHERE id_reporte IN (SELECT id_reporte FROM reporte WHERE id_empleador = $1)', [id]);
            await borrarSeguro('DELETE FROM reporte WHERE id_empleador = $1', [id]);
            
            await borrarSeguro('DELETE FROM empleador_valoracion WHERE id_empleador = $1', [id]);
            await borrarSeguro('DELETE FROM postulante_valoracion WHERE id_empleador = $1', [id]);
            
            await client.query('DELETE FROM empleador WHERE id_empleador = $1', [id]);

            await client.query('COMMIT');
            return res.status(200).json({ mensaje: 'Perfil de empresa eliminado permanentemente.' });
        }

        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'No se encontró ningún usuario con ese ID.' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al eliminar usuario de la BD:', error);
        res.status(500).json({ error: 'Hubo un error interno al intentar borrar la cuenta.' });
    } finally {
        client.release();
    }
});

/* ===== COMENTARIOS DE ANUNCIOS ===== */
app.get("/comentarios/:idAnuncio", async (req, res) => {
  try {
    const query = `
      SELECT c.id_comentario, c.texto, c.fecha_comentario, c.id_postulante,
             p.nombre_postulante, p.apellido_paterno_postulante
      FROM comentarios_anuncio c
      INNER JOIN postulante p ON p.id_postulante = c.id_postulante
      WHERE c.id_anuncio = $1 AND p.estado_cuenta = 'ACTIVA'
      ORDER BY c.fecha_comentario DESC
    `;
    const result = await pool.query(query, [req.params.idAnuncio]);
    res.json(result.rows);
  } catch (err) {
    console.error("Error en GET /comentarios:", err);
    res.status(500).json({ error: "Error al obtener comentarios" });
  }
});

app.post("/comentarios", verifyToken, authorizeRoles("postulante"), async (req, res) => {
  const { id_anuncio, texto } = req.body;
  const id_postulante = req.user.id;
  if (!texto || !texto.trim()) return res.status(400).json({ error: "El comentario no puede estar vacío" });

  try {
    const result = await pool.query(
      `INSERT INTO comentarios_anuncio (id_anuncio, id_postulante, texto) VALUES ($1, $2, $3) RETURNING *`,
      [id_anuncio, id_postulante, texto.trim()]
    );

    const postulanteRes = await pool.query(
      `SELECT nombre_postulante, apellido_paterno_postulante FROM postulante WHERE id_postulante = $1`,
      [id_postulante]
    );

    res.status(201).json({ ...result.rows[0], ...postulanteRes.rows[0] });
  } catch (err) {
    console.error("Error en POST /comentarios:", err);
    res.status(500).json({ error: "Error al crear comentario" });
  }
});

app.put("/comentarios/:idComentario", verifyToken, authorizeRoles("postulante"), async (req, res) => {
  const { texto } = req.body;
  const id_postulante = req.user.id;
  if (!texto || !texto.trim()) return res.status(400).json({ error: "El comentario no puede estar vacío" });

  try {
    const result = await pool.query(
      `UPDATE comentarios_anuncio SET texto = $1 WHERE id_comentario = $2 AND id_postulante = $3 RETURNING *`,
      [texto.trim(), req.params.idComentario, id_postulante]
    );
    if (result.rows.length === 0) return res.status(403).json({ error: "No autorizado o comentario no encontrado" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error en PUT /comentarios:", err);
    res.status(500).json({ error: "Error al editar comentario" });
  }
});

app.delete("/comentarios/:idComentario", verifyToken, authorizeRoles("postulante"), async (req, res) => {
  const id_postulante = req.user.id;
  try {
    const result = await pool.query(
      `DELETE FROM comentarios_anuncio WHERE id_comentario = $1 AND id_postulante = $2 RETURNING *`,
      [req.params.idComentario, id_postulante]
    );
    if (result.rows.length === 0) return res.status(403).json({ error: "No autorizado o comentario no encontrado" });
    res.json({ message: "Comentario eliminado" });
  } catch (err) {
    console.error("Error en DELETE /comentarios:", err);
    res.status(500).json({ error: "Error al eliminar comentario" });
  }
});

/* ===== INICIAR SERVIDOR ===== */
server.listen(3000, "0.0.0.0", async () => {
  console.log("Servidor corriendo en http://localhost:3000");
  await ensureDatabaseSchema();
});
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");
const crypto = require("crypto");

const nodemailer = require("nodemailer");
const { decode } = require("punycode");

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

// Si EMAIL_TO no existe, usa EMAIL_USER como destino por compatibilidad.
const correoDestino = process.env.EMAIL_TO || process.env.EMAIL_USER;
const hasEmailConfig = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

// Configuración de Nodemailer
const transporter = hasEmailConfig
  ? nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })
  : null;

// Verifica conexión con Gmail
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

    if (decoded.rol === "postulante") {
      table = "postulante";
      idField = "id_postulante"
    }

    if (decoded.rol === "empleador") {
      table = "empleador";
      idField = "id_empleador"
    }

    if (decoded.rol === "administrador") {
      table = "administrador";
      idField = "id_administrador"
    }

    const result = await pool.query(
      `SELECT token_version FROM ${table} WHERE ${idField} = $1`, [decoded.id]
    );

    if (!result.rows.length) {
      return res.status(401).json({ error: "Usuario no válido" });
    }

    const currentVersion = result.rows[0].token_version;

    if (decoded.tokenVersion !== currentVersion) {
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
  res.send("Servidor Chambee funcionando correctamente ");
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

    const user = {
      ...result.rows[0],
      rol: "postulante"
    };

    const token = jwt.sign(
      {
        id: user.id,
        correo: user.correo,
        rol: user.rol
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Cuenta creada correctamente",
      token,
      user
    });


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

    const user = {
      ...result.rows[0],
      rol: "empleador"
    };

    const token = jwt.sign(
      {
        id: user.id,
        correo: user.correo,
        rol: user.rol
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Cuenta creada correctamente",
      token,
      user
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===== PERFIL DE EMPLEADOR ===== */
/* EN DESUSO; TBD*/
/*
app.get("/empleadores/:id/perfil", verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    
    if (req.user.rol !== "empleador" || req.user.id != id) {
      return res.status(403).json({ error: "No autorizado" })
    }

    // Perfil completo del empleador para la vista "Mi Perfil" en frontend.
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
      descripcion
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
*/

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
      query = `SELECT 
        p.id_postulante, 
  p.nombre_postulante, 
  p.apellido_paterno_postulante,
  p.apellido_materno_postulante, 
  p.correo_electronico, 
  p.fecha_nacimiento, 
  p.sexo, 
  p.pais,
  p.estado, 
  p.ciudad, 
  p.colonia, 
  p.calle, 
  p.codigo_postal,
  p.telefono, 
  p.foto_perfil,
  p.curp, 
  p.rfc,
  p.fecha_registro,
  c.archivo_cv
FROM postulante p
LEFT JOIN cv c ON c.id_postulante = p.id_postulante
WHERE p.id_postulante = $1`;
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

async function puedeCambiarCampo(id, campo) {
  const diasLimite = LIMITES_CAMBIO[campo];
  if (!diasLimite) return true;

  const result = await pool.query(`
    SELECT fecha_cambio 
    FROM historial_cambios
    WHERE id_postulante = $1 AND campo = $2
    ORDER BY fecha_cambio DESC
    LIMIT 1
  `, [id, campo]);

  if (result.rows.length === 0) return true;

  const lastDate = new Date(result.rows[0].fecha_cambio);
  const ahora = new Date();

  const diffMin = (ahora - lastDate) / (1000 * 60)

  return diffMin >= diasLimite

 /*  const diffDias = (ahora - lastDate) / (1000 * 60 * 60 * 24);

  return diffDias >= diasLimite; */
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
    }
    else if (rol === "postulante") {

      const actual = await pool.query(
        "SELECT * FROM postulante WHERE id_postulante = $1",
        [id]
      );

      const perfilActual = actual.rows[0];

      const camposSensibles = [
        "nombre_postulante",
        "apellido_paterno_postulante",
        "apellido_materno_postulante",
        "fecha_nacimiento",
        "sexo"
      ];

      for (const campo of camposSensibles) {
        // Normalizar fecha_nacimiento: la BD devuelve un objeto Date, el frontend manda string ISO
        let valorActualCmp = perfilActual[campo];
        if (campo === "fecha_nacimiento" && valorActualCmp instanceof Date) {
          valorActualCmp = valorActualCmp.toISOString().split("T")[0];
        }

        if (
          datos[campo] !== undefined &&
          String(datos[campo]) !== String(valorActualCmp ?? "")
        ) {
          const permitido = await puedeCambiarCampo(id, campo);

          if (!permitido) {
            return res.status(400).json({
              message: `No puedes cambiar ${campo} todavía. Intenta más tarde.`
            });
          }
        }
      }

      // Usamos COALESCE para que si un dato no viene en el body, se quede el que ya estaba en la BD
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
            foto_perfil = COALESCE($16, foto_perfil)
        WHERE id_postulante = $17
        RETURNING *`;

      values = [
        datos.nombre_postulante || null,          // $1
        datos.apellido_paterno_postulante || null, // $2
        datos.apellido_materno_postulante || null, // $3
        datos.correo_electronico || null,          // $4
        datos.fecha_nacimiento || null,            // $5
        datos.sexo || null,                        // $6
        datos.pais || null,                        // $7
        datos.estado || null,                      // $8
        datos.ciudad || null,                      // $9
        datos.colonia || null,                     // $10
        datos.calle || null,                       // $11
        datos.codigo_postal || null,               // $12
        datos.telefono || null,                    // $13
        datos.curp || null,                        // $14
        datos.rfc || null,                         // $15
        datos.foto_perfil || null,                 // $16
        id                                         // $17 (el WHERE)
      ];

      // Si también envías el archivo_cv en esta misma petición, actualizamos la tabla cv
      if (datos.archivo_cv) {
        const checkCv = await pool.query("SELECT id_cv FROM cv WHERE id_postulante = $1", [id]);
        if (checkCv.rows.length > 0) {
          await pool.query("UPDATE cv SET archivo_cv = $1, ultima_actualizacion = NOW() WHERE id_postulante = $2", [datos.archivo_cv, id]);
        } else {
          await pool.query("INSERT INTO cv (id_postulante, archivo_cv, visible_empresas, fecha_subida, ultima_actualizacion) VALUES ($1, $2, true, NOW(), NOW())", [id, datos.archivo_cv]);
        }
      }


      // Guardar historial de cambios en campos sensibles
      for (const campo of camposSensibles) {
        if (datos[campo] !== undefined) {
          let valorActualHist = perfilActual[campo];
          if (campo === "fecha_nacimiento" && valorActualHist instanceof Date) {
            valorActualHist = valorActualHist.toISOString().split("T")[0];
          }

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

/* EN DESUSO; TBD */

/*
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
    foto_perfil
  } = req.body;

  try {
    // Se actualizan solo los campos editables visibles en la vista de perfil.
    const query = `UPDATE empleador
      SET nombre_empresa = $1,
          correo_electronico = $2,
          pais = $3,
          estado = $4,
          ciudad = $5,
          colonia = $6,
          calle = $7,
          codigo_postal = $8,
          telefono = $9,
          rfc = $10,
          descripcion = $11,
          foto_perfil = $12
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
*/

app.get("/empleadores/:id/anuncios", verifyToken, authorizeRoles("empleador"), async (req, res) => {
  const { id } = req.params;

  if (String(req.user.id) !== String(id)) {
    return res.status(403).json({ error: "No autorizado para ver estas vacantes" });
  }

  try {
    // El home y el perfil del empleador reutilizan esta lista resumida.
    const query = `SELECT
      a.id_anuncio,
      a.titulo,
      a.descripcion,
      a.tipo_anuncio,
      a.urgencia,
      a.edad,
      a.educacion,
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
      COALESCE(
        ARRAY_AGG(DISTINCT c.nombre) FILTER (WHERE c.nombre IS NOT NULL),
        ARRAY[]::VARCHAR[]
      ) AS categorias
    FROM anuncios a
    LEFT JOIN categoriaAnuncio ca ON ca.id_anuncio = a.id_anuncio
    LEFT JOIN categorias c ON c.id_categoria = ca.id_categoria
    WHERE a.id_empleador = $1
    GROUP BY a.id_anuncio
    ORDER BY a.fecha_publicacion DESC NULLS LAST`;

    const result = await pool.query(query, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener anuncios del empleador" });
  }
});

app.post("/empleadores/:id/anuncios", verifyToken, authorizeRoles("empleador"), async (req, res) => {
  const { id } = req.params;
  if (String(req.user.id) !== String(id)) {
    return res.status(403).json({ error: "No autorizado para crear vacantes en esta cuenta" });
  }
  const {
    titulo,
    descripcion,
    tipo_anuncio,
    urgencia = "Normal",
    edad = "Sin especificar",
    educacion = "Sin especificar",
    estado,
    ciudad,
    colonia,
    calle,
    codigo_postal,
    salario,
    modalidad,
    estado_anuncio = "ACTIVO",
    etiquetas = []
  } = req.body;

  // Validar campos requeridos
  if (!titulo || !descripcion || !estado || !ciudad || !colonia || !calle || !codigo_postal || salario === null || salario === undefined || !modalidad) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }

  // Convertir salario a número válido
  const salarioNumero = parseFloat(salario);
  if (isNaN(salarioNumero) || salarioNumero <= 0) {
    return res.status(400).json({ error: "El salario debe ser un número válido mayor a 0" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await ensureCategoriasBase(client);

    // Se crea una oferta laboral ligada al empleador autenticado.
    const query = `INSERT INTO anuncios (
      titulo, descripcion, tipo_anuncio, urgencia, edad, educacion,
      estado, ciudad, colonia, calle, codigo_postal, salario, modalidad,
      estado_anuncio, id_empleador, vistas
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,0)
    RETURNING *`;

    const values = [
      titulo,
      descripcion,
      tipo_anuncio,
      urgencia,
      edad,
      educacion,
      estado,
      ciudad,
      colonia,
      calle,
      codigo_postal,
      salarioNumero,
      modalidad,
      estado_anuncio,
      id,
    ];

    const result = await client.query(query, values);
    const anuncio = result.rows[0];

    const categorias = await obtenerCategoriasPorNombre(etiquetas, client);

    for (const categoria of categorias) {
      await client.query(
        `INSERT INTO categoriaAnuncio (id_categoria, id_anuncio)
         VALUES ($1, $2)`,
        [categoria.id_categoria, anuncio.id_anuncio]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "Oferta laboral creada correctamente",
      anuncio: {
        ...anuncio,
        categorias: categorias.map((categoria) => categoria.nombre)
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({
      error: "Error al crear la oferta laboral",
      detail: err.message,
    });
  } finally {
    client.release();
  }
});

app.get("/empleadores/:id/anuncios/:anuncioId", verifyToken, authorizeRoles("empleador"), async (req, res) => {
  const { id, anuncioId } = req.params;

  if (String(req.user.id) !== String(id)) {
    return res.status(403).json({ error: "No autorizado para ver esta vacante" });
  }

  try {
    const result = await pool.query(
      `SELECT
        a.id_anuncio,
        a.titulo,
        a.descripcion,
        a.tipo_anuncio,
        a.urgencia,
        a.edad,
        a.educacion,
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
        COALESCE(
          ARRAY_AGG(DISTINCT c.nombre) FILTER (WHERE c.nombre IS NOT NULL),
          ARRAY[]::VARCHAR[]
        ) AS categorias
      FROM anuncios a
      LEFT JOIN categoriaAnuncio ca ON ca.id_anuncio = a.id_anuncio
      LEFT JOIN categorias c ON c.id_categoria = ca.id_categoria
      WHERE a.id_empleador = $1 AND a.id_anuncio = $2
      GROUP BY a.id_anuncio`,
      [id, anuncioId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Vacante no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener la vacante" });
  }
});

app.put("/empleadores/:id/anuncios/:anuncioId", verifyToken, authorizeRoles("empleador"), async (req, res) => {
  const { id, anuncioId } = req.params;
  if (String(req.user.id) !== String(id)) {
    return res.status(403).json({ error: "No autorizado para editar esta vacante" });
  }
  const {
    titulo,
    descripcion,
    tipo_anuncio,
    urgencia = 'Normal',
    edad = 'Sin especificar',
    educacion = 'Sin especificar',
    estado,
    ciudad,
    colonia,
    calle,
    codigo_postal,
    salario,
    modalidad,
    etiquetas = []
  } = req.body;

  // Validar campos requeridos
  if (!titulo || !descripcion || !estado || !ciudad || !colonia || !calle || !codigo_postal || salario === null || salario === undefined || !modalidad) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }

  // Convertir salario a número válido
  const salarioNumero = parseFloat(salario);
  if (isNaN(salarioNumero) || salarioNumero <= 0) {
    return res.status(400).json({ error: "El salario debe ser un número válido mayor a 0" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await ensureCategoriasBase(client);

    const updateResult = await client.query(
      `UPDATE anuncios
       SET titulo = $1,
           descripcion = $2,
           tipo_anuncio = $3,
           urgencia = $4,
           edad = $5,
           educacion = $6,
           estado = $7,
           ciudad = $8,
           colonia = $9,
           calle = $10,
           codigo_postal = $11,
           salario = $12,
           modalidad = $13
       WHERE id_empleador = $14 AND id_anuncio = $15
       RETURNING
         id_anuncio,
         titulo,
         descripcion,
         tipo_anuncio,
         urgencia,
         edad,
         educacion,
         estado,
         ciudad,
         colonia,
         calle,
         codigo_postal,
         salario,
         modalidad,
         fecha_publicacion,
         estado_anuncio,
         vistas`,
      [
        titulo,
        descripcion,
        tipo_anuncio,
        urgencia,
        edad,
        educacion,
        estado,
        ciudad,
        colonia,
        calle,
        codigo_postal,
        salarioNumero,
        modalidad,
        id,
        anuncioId
      ]
    );

    if (!updateResult.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Vacante no encontrada" });
    }

    await client.query(
      "DELETE FROM categoriaAnuncio WHERE id_anuncio = $1",
      [anuncioId]
    );

    const categorias = await obtenerCategoriasPorNombre(etiquetas, client);

    for (const categoria of categorias) {
      await client.query(
        `INSERT INTO categoriaAnuncio (id_categoria, id_anuncio)
         VALUES ($1, $2)`,
        [categoria.id_categoria, anuncioId]
      );
    }

    await client.query("COMMIT");

    res.json({
      message: "Vacante actualizada correctamente",
      anuncio: {
        ...updateResult.rows[0],
        categorias: categorias.map((categoria) => categoria.nombre)
      }
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Error al actualizar la vacante", detail: err.message });
  } finally {
    client.release();
  }
});

app.patch("/empleadores/:id/anuncios/:anuncioId/estado", verifyToken, authorizeRoles("empleador"), async (req, res) => {
  const { id, anuncioId } = req.params;
  const { estado_anuncio } = req.body;
  const estadosPermitidos = ["ACTIVO", "BORRADOR", "OCULTO"];

  if (String(req.user.id) !== String(id)) {
    return res.status(403).json({ error: "No autorizado para cambiar esta vacante" });
  }

  if (!estado_anuncio || !estadosPermitidos.includes(estado_anuncio)) {
    return res.status(400).json({ error: "Estado de anuncio no válido. Debe ser: ACTIVO, BORRADOR, OCULTO" });
  }

  try {
    const result = await pool.query(
      `UPDATE anuncios
       SET estado_anuncio = $1
       WHERE id_empleador = $2 AND id_anuncio = $3
       RETURNING id_anuncio, estado_anuncio`,
      [estado_anuncio, id, anuncioId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Vacante no encontrada. Verifique que el ID sea válido." });
    }

    res.json({
      message: "Estado de vacante actualizado correctamente",
      anuncio: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar el estado de la vacante", detail: err.message });
  }
});


/* ===== LOGIN ===== */
app.get("/anuncios", async (_req, res) => {
  try {
    const query = `SELECT
      a.*,
      e.nombre_empresa,
      e.descripcion AS descripcion_empresa,
      e.foto_perfil AS foto_empresa,
      COALESCE(
        ARRAY_AGG(DISTINCT c.nombre) FILTER (WHERE c.nombre IS NOT NULL),
        ARRAY[]::VARCHAR[]
      ) AS categorias
    FROM anuncios a
    INNER JOIN empleador e ON e.id_empleador = a.id_empleador
    LEFT JOIN categoriaAnuncio ca ON ca.id_anuncio = a.id_anuncio
    LEFT JOIN categorias c ON c.id_categoria = ca.id_categoria
    WHERE a.estado_anuncio = 'ACTIVO'
    GROUP BY a.id_anuncio, e.nombre_empresa, e.descripcion, e.foto_perfil
    ORDER BY a.fecha_publicacion DESC NULLS LAST`;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener anuncios" });
  }
});

app.post("/anuncios/:idAnuncio/postular", verifyToken, authorizeRoles("postulante"), async (req, res) => {
  const { idAnuncio } = req.params;
  const idPostulante = req.user.id;

  try {
    // 1. Verificar que el anuncio exista
    const checkAnuncio = await pool.query(
      "SELECT id_anuncio FROM anuncios WHERE id_anuncio = $1",
      [idAnuncio]
    );

    if (checkAnuncio.rows.length === 0) {
      return res.status(404).json({ error: "Vacante no encontrada" });
    }

    // 2. Insertar la postulación
    const query = `
      INSERT INTO postulacion (id_postulante, id_anuncio, estado)
      VALUES ($1, $2, 'En revisión')
      RETURNING *`;

    const result = await pool.query(query, [idPostulante, idAnuncio]);

    res.status(201).json({
      message: "Postulacion enviada con exito",
      postulacion: result.rows[0]
    });

  } catch (err) {
    // Si ya existe la postulación (Unique constraint error: 23505)
    if (err.code === "23505") {
      return res.status(400).json({ error: "Ya te has postulado a esta vacante anteriormente." });
    }

    console.error("Error al postular:", err);
    res.status(500).json({ error: "Error interno al procesar la postulacion", detail: err.message });
  }
});

app.get("/favoritos", verifyToken, authorizeRoles("postulante"), async (req, res) => {
  try {
    const query = `SELECT
      f.id_favoritos,
      f.fecha_guardado,
      a.id_anuncio,
      a.titulo,
      a.descripcion,
      a.urgencia,
      a.edad,
      a.educacion,
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
      e.descripcion AS descripcion_empresa,
      e.foto_perfil AS foto_empresa,
      COALESCE(
        ARRAY_AGG(DISTINCT c.nombre) FILTER (WHERE c.nombre IS NOT NULL),
        ARRAY[]::VARCHAR[]
      ) AS categorias
    FROM favoritos f
    INNER JOIN anuncios a ON a.id_anuncio = f.id_anuncio
    INNER JOIN empleador e ON e.id_empleador = a.id_empleador
    LEFT JOIN categoriaAnuncio ca ON ca.id_anuncio = a.id_anuncio
    LEFT JOIN categorias c ON c.id_categoria = ca.id_categoria
    WHERE f.id_postulante = $1
    GROUP BY f.id_favoritos, a.id_anuncio, e.nombre_empresa, e.descripcion, e.foto_perfil
    ORDER BY f.fecha_guardado DESC`;

    const result = await pool.query(query, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener favoritos:", err);
    res.status(500).json({ error: "Error al obtener favoritos" });
  }
});

app.get("/anuncios/:idAnuncio/favorito", verifyToken, authorizeRoles("postulante"), async (req, res) => {
  const { idAnuncio } = req.params;

  try {
    const result = await pool.query(
      `SELECT id_favoritos
       FROM favoritos
       WHERE id_postulante = $1 AND id_anuncio = $2`,
      [req.user.id, idAnuncio]
    );

    res.json({ favorito: result.rows.length > 0 });
  } catch (err) {
    console.error("Error al revisar favorito:", err);
    res.status(500).json({ error: "Error al revisar favorito" });
  }
});

app.post("/anuncios/:idAnuncio/favoritos", verifyToken, authorizeRoles("postulante"), async (req, res) => {
  const { idAnuncio } = req.params;

  try {
    const checkAnuncio = await pool.query(
      "SELECT id_anuncio FROM anuncios WHERE id_anuncio = $1",
      [idAnuncio]
    );

    if (checkAnuncio.rows.length === 0) {
      return res.status(404).json({ error: "Vacante no encontrada" });
    }

    const result = await pool.query(
      `INSERT INTO favoritos (id_postulante, id_anuncio)
       VALUES ($1, $2)
       ON CONFLICT (id_postulante, id_anuncio) DO NOTHING
       RETURNING *`,
      [req.user.id, idAnuncio]
    );

    res.status(result.rows.length ? 201 : 200).json({
      message: "Vacante guardada en favoritos",
      favorito: true
    });
  } catch (err) {
    console.error("Error al guardar favorito:", err);
    res.status(500).json({ error: "Error al guardar favorito" });
  }
});

app.delete("/anuncios/:idAnuncio/favoritos", verifyToken, authorizeRoles("postulante"), async (req, res) => {
  const { idAnuncio } = req.params;

  try {
    await pool.query(
      `DELETE FROM favoritos
       WHERE id_postulante = $1 AND id_anuncio = $2`,
      [req.user.id, idAnuncio]
    );

    res.json({
      message: "Vacante eliminada de favoritos",
      favorito: false
    });
  } catch (err) {
    console.error("Error al eliminar favorito:", err);
    res.status(500).json({ error: "Error al eliminar favorito" });
  }
});

app.get("/mi-etiquetas", verifyToken, authorizeRoles("postulante"), async (req, res) => {

  try {
    await ensureCategoriasBase();

    const result = await pool.query(
      `SELECT c.id_categoria, c.nombre
       FROM seguimiento s
       INNER JOIN categorias c ON c.id_categoria = s.id_categoria
       WHERE s.id_postulante = $1
       ORDER BY c.nombre ASC`,
      [req.user.id]
    );

    res.json({
      etiquetas: result.rows.map((row) => row.nombre),
      categorias: result.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener intereses del postulante" });
  }
});

app.put("/mi-etiquetas", verifyToken, authorizeRoles("postulante"), async (req, res) => {
  const etiquetas = Array.isArray(req.body?.etiquetas) ? req.body.etiquetas : [];
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await ensureCategoriasBase(client);

    await client.query(
      "DELETE FROM seguimiento WHERE id_postulante = $1",
      [req.user.id]
    );

    const categorias = await obtenerCategoriasPorNombre(etiquetas, client);

    for (const categoria of categorias) {
      await client.query(
        `INSERT INTO seguimiento (id_categoria, id_postulante)
         VALUES ($1, $2)
         ON CONFLICT (id_categoria, id_postulante) DO NOTHING`,
        [categoria.id_categoria, req.user.id]
      );
    }

    await client.query("COMMIT");

    res.json({
      message: "Intereses actualizados correctamente",
      etiquetas: categorias.map((categoria) => categoria.nombre)
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
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
    const postulante = await pool.query(
      `SELECT id_postulante AS id, nombre_postulante as nombre, correo_electronico AS correo, contrasena, token_version, 'postulante' AS rol
       FROM postulante WHERE correo_electronico = $1`,
      [correo_electronico]
    );

    if (postulante.rows.length > 0) usuario = postulante.rows[0];

    if (!usuario) {
      const empleador = await pool.query(
        `SELECT id_empleador AS id, nombre_empresa as nombre, correo_electronico AS correo, contrasena, token_version, 'empleador' AS rol
         FROM empleador WHERE correo_electronico = $1`,
        [correo_electronico]
      );

      if (empleador.rows.length > 0) usuario = empleador.rows[0];
    }

    if (!usuario) {
      const admin = await pool.query(
        `SELECT id_administrador AS id, correo_electronico AS correo, contrasena, token_version, 'administrador' AS rol
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
      {
        id: user.id,
        correo: user.correo,
        rol: user.rol,
        tokenVersion: user.token_version
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Inicio de sesión exitoso",
      token,
      user
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en servidor" });
  }

});



/* ===== SOPORTE (ENVÍO DE CORREO) ===== */
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

app.post("/auth/forgot-password", async (req, res) => {
  const { correo_electronico } = req.body;

  if (!transporter) {
    console.log("Email no configurado");
    return res.json({ message: "Modo desarrollo: email no enviado" });
  }

  const postulante = await pool.query("SELECT * FROM postulante WHERE correo_electronico = $1", [correo_electronico]);
  const empleador = await pool.query("SELECT * FROM empleador WHERE correo_electronico = $1", [correo_electronico]);
  const admin = await pool.query("SELECT * FROM administrador WHERE correo_electronico = $1", [correo_electronico]);

  const user = postulante.rows[0] || empleador.rows[0] || admin.rows[0];

  let userType = null;

  if (postulante.rows.length) userType = "postulante";
  if (empleador.rows.length) userType = "empleador";
  if (admin.rows.length) userType = "admin";

  if (!user) {
    return res.json({ message: "Si el correo existe, recibirás instrucciones" })
  }

  const token = crypto.randomBytes(32).toString("hex");

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const expires = Date.now() + 1000 * 60 * 15;


  await pool.query(
    "DELETE FROM password_resets WHERE correo_electronico = $1",
    [correo_electronico]
  );

  await pool.query(
    "INSERT INTO password_resets (correo_electronico, token, expires, user_type) VALUES ($1, $2, $3, $4)",
    [correo_electronico, hashedToken, expires, userType]
  );

  const resetLink = `http://localhost:4200/reset-password/${token}`

  await transporter.sendMail({
    to: correo_electronico,
    subject: "Restablecimiento de contraseña - Chambee",
    html: `
      <h3>Recuperación de contraseña</h3>
      <p>Haz clic en el siguiente enlace:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>Este enlace expira en 15 minutos</p>
    `
  });

  res.json({ message: "Si el correo existe, recibirás instrucciones" })

});


app.post("/auth/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const result = await pool.query(
      "Select * from password_resets WHERE token = $1", [hashedToken]
    );

    if (!result.rows.length) {
      return res.status(400).json({ error: "Token inválido" });
    }

    const resetData = result.rows[0];

    if (Date.now() > resetData.expires) {
      return res.status(400).json({ error: "Token expirado" });
    }

    const { correo_electronico, user_type } = resetData;

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    let table = "";

    if (user_type === "postulante") table = "postulante";
    if (user_type === "empleador") table = "empleador";
    if (user_type === "admin") table = "administrador";

    if (!table) {
      return res.status(400).json({ error: "Tipo de usuario inválido" });
    }

    await pool.query(
      `UPDATE ${table} SET contrasena = $1, token_version = token_version + 1
       WHERE correo_electronico = $2`,
      [hashedPassword, correo_electronico]
    );


    await pool.query(
      "DELETE FROM password_resets WHERE token = $1",
      [hashedToken]
    );
    res.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error("ERROR EN RESET PASSWORD:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
})


app.get("/auth/validate-reset-token/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const result = await pool.query(
      "SELECT * FROM password_resets WHERE token = $1",
      [hashedToken]
    );

    if (!result.rows.length) {
      return res.status(400).json({ valid: false });
    }

    const resetData = result.rows[0];

    if (Date.now() > resetData.expires) {
      return res.status(400).json({ valid: false });
    }

    res.json({ valid: true });

  } catch (error) {
    console.error(error);
    res.status(500).json({ valid: false });
  }
});


/* ===== ACTUALIZAR CV DEL POSTULANTE  ===== */
app.put("/mi-perfil/cv", verifyToken, authorizeRoles("postulante"), async (req, res) => {
  try {
    const { archivo_cv } = req.body;
    const id = req.user.id;

    if (!archivo_cv || typeof archivo_cv !== "string") {
      return res.status(400).json({ error: "URL del CV no válida" });
    }

    const existing = await pool.query(
      `SELECT id_cv FROM cv WHERE id_postulante = $1`, [id]
    );

    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE cv 
         SET archivo_cv = $1, ultima_actualizacion = NOW() 
         WHERE id_postulante = $2`,
        [archivo_cv, id]
      );
    } else {
      await pool.query(
        `INSERT INTO cv (id_postulante, archivo_cv, visible_empresas, fecha_subida, ultima_actualizacion)
         VALUES ($1, $2, true, NOW(), NOW())`,
        [id, archivo_cv]
      );
    }

    res.json({ message: "CV actualizado correctamente", archivo_cv });

  } catch (err) {
    console.error("Error en PUT /mi-perfil/cv:", err);
    res.status(500).json({ error: "Error al actualizar CV" });
  }
});
/* ===== SERVICIOS (OFICIOS) ===== */
app.post("/servicios", verifyToken, authorizeRoles("postulante"), async (req, res) => {
  const {
    title, description, categoria, presupuesto,
    ubicacion, estado, ciudad, colonia, calle,
    codigo_postal, modalidad, urgencia, esBorrador, autorId
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO servicios 
        (title, description, categoria, presupuesto, ubicacion, estado,
         ciudad, colonia, calle, codigo_postal, modalidad, urgencia,
         es_borrador, autor_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [title, description, categoria, presupuesto, ubicacion,
       estado, ciudad, colonia, calle, codigo_postal,
       modalidad, urgencia, esBorrador, autorId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("[servicios] POST error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/servicios/:autorId", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM servicios WHERE autor_id = $1 ORDER BY fecha_creacion DESC`,
      [req.params.autorId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// GET /servicios-publicos — todos los servicios publicados (sin auth)
app.get("/servicios-publicos", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM servicios WHERE es_borrador = false ORDER BY fecha_creacion DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
/* ===== INICIAR SERVIDOR ===== */
app.listen(3000, "0.0.0.0", () => {
  console.log("Servidor corriendo en http://localhost:3000");
});



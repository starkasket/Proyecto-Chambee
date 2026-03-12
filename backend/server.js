const express = require("express");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const cors = require("cors");
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
  res.send("jagbsdhdhwhgsgndfgnfbgnherdbfg hdnfrstgja");
});

// Empleados BD
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

app.listen(3000, "0.0.0.0", () => console.log("Servidor corriendo en puerto 3000"));
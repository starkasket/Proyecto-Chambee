const express = require("express");
const cors = require("cors"); 
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
app.use(cors());
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

app.get("/usuarios", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json(err.message);
  }
});


app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  console.log("Intento de login con:", email);

  try {

    if (email === "test@chambee.com" && password === "123456") {
      res.json({ message: "¡Login exitoso!", token: "un-token-falso-para-probar" });
    } else {
      res.status(401).json({ message: "Usuario o contraseña incorrectos" });
    }
  } catch (err) {
    res.status(500).json(err.message);
  }
});

app.listen(3000, "0.0.0.0", () => console.log("Servidor corriendo en puerto 3000"));
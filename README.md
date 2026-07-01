#  ChamBee

Plataforma web bidireccional de empleo que conecta a personas en búsqueda de trabajo (postulantes) con empresas y negocios que requieren talento (empleadores), en Guanajuato.

##  Características

- **Doble rol de usuario**: postulantes y empleadores, cada uno con su propio flujo.
- **Publicación de ofertas de empleo** por parte de empleadores.
- **Proceso de postulación** a ofertas publicadas.
- **Publicación de anuncios de servicio** por parte de postulantes (freelance/servicios independientes).
- **Sistema de comentarios y calificación** entre usuarios.
- **Gestión de perfil**: postulantes administran su información personal y CV; empleadores administran la información de su empresa.
- **Carga de CV e imágenes de perfil** a través de Cloudinary.
- **Autenticación** mediante JWT.

##  Tecnologías Utilizadas


**Vista (Frontend)**  Angular 17 + Bootstrap 5  Interfaz de usuario, enrutamiento, consumo de API REST 
**Controlador (Backend)** Node.js 20 + Express  Lógica de negocio, validaciones, endpoints REST, autenticación JWT 
**Modelo (Base de datos)**  PostgreSQL 16  Persistencia de datos, relaciones, integridad referencial 
**Almacenamiento de archivos**  Cloudinary  CVs en PDF e imágenes de perfil 
**Contenedores**  Docker / Docker Compose  Orquestación del entorno de desarrollo local 

Arquitectura: **Modelo-Vista-Controlador (MVC)** en tres capas independientes comunicadas vía API REST.

##  Estructura del Proyecto


```
Proyecto-Chambee/
│
├── .github/
│   └── instructions/
│
├── backend/                          # Node.js + Express
│   ├── node_modules/
│   ├── .env
│   ├── package.json
│   ├── package-lock.json
│   └── server.js
│
├── database/
│   ├── schema.sql
│   └── ALTER TABLE anuncios.pgsql
│
├── frontend/                         # Angular
│   ├── .angular/
│   ├── .vscode/
│   ├── dist/
│   ├── node_modules/
│   └── src/
│       └── app/
│           ├── components/
│           ├── interceptors/
│           └── pages/
│               ├── admin-dashboard/
│               ├── borrador-servicio/
│               ├── company-public-profile/
│               └── crear-servicio/
│
├── docker-compose.yml
└── README.md
```

##  Instalación y Ejecución

### Prerrequisitos

- [Git](https://git-scm.com/downloads)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Paso 1: Obtener el repositorio

```bash
git clone https://github.com/starkasket/Proyecto-Chambee.git
cd Proyecto-Chambee
```

### Paso 2: Levantar el proyecto con Docker Compose

Docker se encarga de levantar y conectar automáticamente la base de datos, el backend y el frontend.

```bash
docker compose up --build
```

En otra terminal, conéctate a la carpeta del proyecto y carga el esquema de la base de datos:

```bash
docker exec -i chambee_db psql -U postgres -d chambee_db < ./database/schema.sql
```

Esto construirá las imágenes del backend y frontend, levantará PostgreSQL, y conectará los tres servicios en una red interna de Docker.

### Paso 3: Acceder a la aplicación

|

 **Frontend (Angular)**  http://localhost:4200  4200 
 **Backend (API REST)**  http://localhost:3000  3000 
 **Base de datos (PostgreSQL)**  localhost:5432  5432 

### Detener el proyecto

```bash
docker compose down
```

##  Equipo Chambee —  Jacko

- Oscar Josué Durán Licea
- Edgar Abraham Rubio González
- Cuanary Jorge Miguel Romero Almanza
- Josué Yael López Castillo
- Karina Lisette Diosdado Murillo




## 🤝 Soporte

Si encuentras algún problema o tienes sugerencias, abre un issue en el repositorio del proyecto.

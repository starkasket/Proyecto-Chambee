--
-- PostgreSQL database dump
--

\restrict dKkD4S2GYfvQS5sX3DDQ8VP12fXrFO0DCHGKpkpMDfNuWi1q0z5JdO9ET1pB3om

-- Dumped from database version 16.13 (Debian 16.13-1.pgdg13+1)
-- Dumped by pg_dump version 16.13 (Debian 16.13-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: administrador; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.administrador (
    id_administrador uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre character varying(50) NOT NULL,
    contrasena character varying(255) NOT NULL,
    correo_electronico character varying(100) NOT NULL,
    foto_perfil character varying(255),
    token_version integer DEFAULT 0
);


ALTER TABLE public.administrador OWNER TO postgres;

--
-- Name: anuncio_valoracion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.anuncio_valoracion (
    id_av uuid DEFAULT gen_random_uuid() NOT NULL,
    id_valoracion uuid NOT NULL,
    id_anuncio uuid NOT NULL
);


ALTER TABLE public.anuncio_valoracion OWNER TO postgres;

--
-- Name: anuncios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.anuncios (
    id_anuncio uuid DEFAULT gen_random_uuid() NOT NULL,
    titulo character varying(150) NOT NULL,
    descripcion character varying(400) NOT NULL,
    tipo_anuncio character varying(20) NOT NULL,
    estado character varying(100) NOT NULL,
    ciudad character varying(100) NOT NULL,
    colonia character varying(100) NOT NULL,
    calle character varying(100) NOT NULL,
    codigo_postal character varying(100) NOT NULL,
    salario numeric(10,2) NOT NULL,
    modalidad character varying(20) NOT NULL,
    fecha_publicacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    estado_anuncio character varying(40) NOT NULL,
    id_empleador uuid NOT NULL,
    vistas integer DEFAULT 0,
    estatus character varying(20) DEFAULT 'Publicado'::character varying,
    urgencia character varying(30),
    edad character varying(60),
    educacion character varying(30) DEFAULT 'Sin especificar'::character varying
);


ALTER TABLE public.anuncios OWNER TO postgres;

--
-- Name: categoriaanuncio; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categoriaanuncio (
    id_categoria_anuncio uuid DEFAULT gen_random_uuid() NOT NULL,
    id_categoria uuid NOT NULL,
    id_anuncio uuid NOT NULL
);


ALTER TABLE public.categoriaanuncio OWNER TO postgres;

--
-- Name: categorias; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categorias (
    id_categoria uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion character varying(150) NOT NULL
);


ALTER TABLE public.categorias OWNER TO postgres;

--
-- Name: comentarios_vacante; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.comentarios_vacante (
    id_comentario uuid DEFAULT gen_random_uuid() NOT NULL,
    id_anuncio uuid NOT NULL,
    id_postulante uuid NOT NULL,
    texto character varying(1000) NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.comentarios_vacante OWNER TO postgres;

--
-- Name: cv; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cv (
    id_cv uuid DEFAULT gen_random_uuid() NOT NULL,
    id_postulante uuid NOT NULL,
    archivo_cv character varying(255) NOT NULL,
    visible_empresas boolean NOT NULL,
    fecha_subida timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    ultima_actualizacion timestamp with time zone
);


ALTER TABLE public.cv OWNER TO postgres;

--
-- Name: empleador; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.empleador (
    id_empleador uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre_empresa character varying(60) NOT NULL,
    correo_electronico character varying(100) NOT NULL,
    contrasena character varying(255) NOT NULL,
    pais character varying(100) NOT NULL,
    estado character varying(100) NOT NULL,
    ciudad character varying(100) NOT NULL,
    colonia character varying(100) NOT NULL,
    calle character varying(100) NOT NULL,
    codigo_postal character varying(100) NOT NULL,
    telefono character varying(20) NOT NULL,
    foto_perfil character varying(255),
    fecha_registro timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    estado_cuenta character varying(20) DEFAULT 'ACTIVA'::character varying,
    rfc character varying(12) NOT NULL,
    descripcion character varying(255),
    token_version integer DEFAULT 0
);


ALTER TABLE public.empleador OWNER TO postgres;

--
-- Name: empleador_valoracion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.empleador_valoracion (
    id_ev uuid DEFAULT gen_random_uuid() NOT NULL,
    id_empleador uuid NOT NULL,
    id_valoracion uuid NOT NULL
);


ALTER TABLE public.empleador_valoracion OWNER TO postgres;

--
-- Name: favoritos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.favoritos (
    id_favoritos uuid DEFAULT gen_random_uuid() NOT NULL,
    id_postulante uuid NOT NULL,
    id_anuncio uuid NOT NULL,
    fecha_guardado timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.favoritos OWNER TO postgres;

--
-- Name: historial; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.historial (
    id_historial uuid DEFAULT gen_random_uuid() NOT NULL,
    id_postulante uuid NOT NULL,
    id_anuncio uuid NOT NULL,
    fecha_visto timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.historial OWNER TO postgres;

--
-- Name: imagenes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.imagenes (
    id_imagen uuid DEFAULT gen_random_uuid() NOT NULL,
    id_anuncio uuid NOT NULL,
    url_imagen character varying(255) NOT NULL
);


ALTER TABLE public.imagenes OWNER TO postgres;

--
-- Name: mensajes_soporte; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mensajes_soporte (
    id_soporte uuid DEFAULT gen_random_uuid() NOT NULL,
    asunto character varying(50) NOT NULL,
    mensaje character varying(400) NOT NULL,
    fecha timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    estado character varying(20) NOT NULL,
    id_postulante uuid NOT NULL
);


ALTER TABLE public.mensajes_soporte OWNER TO postgres;

--
-- Name: postulacion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.postulacion (
    id_postulacion uuid DEFAULT gen_random_uuid() NOT NULL,
    id_postulante uuid NOT NULL,
    id_anuncio uuid NOT NULL,
    estado character varying(20) NOT NULL,
    fecha_postulacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.postulacion OWNER TO postgres;

--
-- Name: postulante; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.postulante (
    id_postulante uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre_postulante character varying(60) NOT NULL,
    apellido_paterno_postulante character varying(60) NOT NULL,
    apellido_materno_postulante character varying(60) NOT NULL,
    correo_electronico character varying(100) NOT NULL,
    contrasena character varying(255) NOT NULL,
    fecha_nacimiento date NOT NULL,
    sexo character varying(20),
    pais character varying(100) NOT NULL,
    estado character varying(100) NOT NULL,
    ciudad character varying(100) NOT NULL,
    colonia character varying(100) NOT NULL,
    calle character varying(100) NOT NULL,
    codigo_postal character varying(100) NOT NULL,
    telefono character varying(20) NOT NULL,
    foto_perfil character varying(255),
    fecha_registro timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    estado_cuenta character varying(20) DEFAULT 'ACTIVA'::character varying,
    curp character varying(18) NOT NULL,
    rfc character varying(13) NOT NULL,
    token_version integer DEFAULT 0,
    descripcion character varying(600) DEFAULT ''::character varying NOT NULL,
    CONSTRAINT postulante_sexo_check CHECK (((sexo)::text = ANY ((ARRAY['Masculino'::character varying, 'Femenino'::character varying, 'Otro'::character varying])::text[])))
);


ALTER TABLE public.postulante OWNER TO postgres;

--
-- Name: postulante_valoracion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.postulante_valoracion (
    id_pv uuid DEFAULT gen_random_uuid() NOT NULL,
    id_valoracion uuid NOT NULL,
    id_postulante uuid NOT NULL,
    id_empleador uuid
);


ALTER TABLE public.postulante_valoracion OWNER TO postgres;

--
-- Name: reporte; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reporte (
    id_reporte uuid DEFAULT gen_random_uuid() NOT NULL,
    motivo character varying(50) NOT NULL,
    descripcion character varying(300) NOT NULL,
    fecha_reporte timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    estado character varying(20) NOT NULL,
    id_postulante uuid,
    id_empleador uuid,
    CONSTRAINT chk_reportante CHECK ((((id_postulante IS NOT NULL) AND (id_empleador IS NULL)) OR ((id_postulante IS NULL) AND (id_empleador IS NOT NULL))))
);


ALTER TABLE public.reporte OWNER TO postgres;

--
-- Name: reporte_a_anuncio; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reporte_a_anuncio (
    id_reporte uuid DEFAULT gen_random_uuid() NOT NULL,
    id_anuncio uuid NOT NULL
);


ALTER TABLE public.reporte_a_anuncio OWNER TO postgres;

--
-- Name: reporte_a_empleador; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reporte_a_empleador (
    id_reporte uuid DEFAULT gen_random_uuid() NOT NULL,
    id_empleador_reportado uuid NOT NULL
);


ALTER TABLE public.reporte_a_empleador OWNER TO postgres;

--
-- Name: reporte_a_postulante; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reporte_a_postulante (
    id_reporte uuid DEFAULT gen_random_uuid() NOT NULL,
    id_postulante_reportado uuid NOT NULL
);


ALTER TABLE public.reporte_a_postulante OWNER TO postgres;

--
-- Name: resolucion_reporte; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.resolucion_reporte (
    id_resolucion uuid DEFAULT gen_random_uuid() NOT NULL,
    id_administrador uuid NOT NULL,
    id_reporte uuid NOT NULL,
    fecha_resolucion timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.resolucion_reporte OWNER TO postgres;

--
-- Name: seguimiento; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.seguimiento (
    id_seguimiento uuid DEFAULT gen_random_uuid() NOT NULL,
    id_categoria uuid NOT NULL,
    id_postulante uuid NOT NULL
);


ALTER TABLE public.seguimiento OWNER TO postgres;

--
-- Name: servicios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.servicios (
    id_servicio uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(160) NOT NULL,
    description character varying(400),
    categoria character varying(60),
    presupuesto character varying(60),
    ubicacion text,
    estado character varying(100),
    ciudad character varying(100),
    colonia character varying(100),
    calle character varying(150),
    codigo_postal character varying(10),
    modalidad character varying(50),
    urgencia character varying(50),
    es_borrador boolean DEFAULT false,
    autor_id uuid,
    fecha_creacion timestamp without time zone DEFAULT now()
);


ALTER TABLE public.servicios OWNER TO postgres;

--
-- Name: valoracion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.valoracion (
    id_valoracion uuid DEFAULT gen_random_uuid() NOT NULL,
    comentario character varying(255),
    puntuacion integer NOT NULL,
    fecha_valoracion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valoracion_puntuacion_check CHECK (((puntuacion >= 1) AND (puntuacion <= 5)))
);


ALTER TABLE public.valoracion OWNER TO postgres;

--
-- Name: administrador administrador_correo_electronico_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.administrador
    ADD CONSTRAINT administrador_correo_electronico_key UNIQUE (correo_electronico);


--
-- Name: administrador administrador_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.administrador
    ADD CONSTRAINT administrador_pkey PRIMARY KEY (id_administrador);


--
-- Name: anuncio_valoracion anuncio_valoracion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anuncio_valoracion
    ADD CONSTRAINT anuncio_valoracion_pkey PRIMARY KEY (id_av);


--
-- Name: anuncios anuncios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anuncios
    ADD CONSTRAINT anuncios_pkey PRIMARY KEY (id_anuncio);


--
-- Name: categoriaanuncio categoriaanuncio_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categoriaanuncio
    ADD CONSTRAINT categoriaanuncio_pkey PRIMARY KEY (id_categoria_anuncio);


--
-- Name: categorias categorias_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_nombre_key UNIQUE (nombre);


--
-- Name: categorias categorias_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_pkey PRIMARY KEY (id_categoria);


--
-- Name: comentarios_vacante comentarios_vacante_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comentarios_vacante
    ADD CONSTRAINT comentarios_vacante_pkey PRIMARY KEY (id_comentario);


--
-- Name: cv cv_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cv
    ADD CONSTRAINT cv_pkey PRIMARY KEY (id_cv);


--
-- Name: empleador empleador_correo_electronico_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empleador
    ADD CONSTRAINT empleador_correo_electronico_key UNIQUE (correo_electronico);


--
-- Name: empleador empleador_nombre_empresa_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empleador
    ADD CONSTRAINT empleador_nombre_empresa_key UNIQUE (nombre_empresa);


--
-- Name: empleador empleador_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empleador
    ADD CONSTRAINT empleador_pkey PRIMARY KEY (id_empleador);


--
-- Name: empleador empleador_rfc_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empleador
    ADD CONSTRAINT empleador_rfc_key UNIQUE (rfc);


--
-- Name: empleador_valoracion empleador_valoracion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empleador_valoracion
    ADD CONSTRAINT empleador_valoracion_pkey PRIMARY KEY (id_ev);


--
-- Name: favoritos favoritos_id_postulante_id_anuncio_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.favoritos
    ADD CONSTRAINT favoritos_id_postulante_id_anuncio_key UNIQUE (id_postulante, id_anuncio);


--
-- Name: favoritos favoritos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.favoritos
    ADD CONSTRAINT favoritos_pkey PRIMARY KEY (id_favoritos);


--
-- Name: historial historial_id_postulante_id_anuncio_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial
    ADD CONSTRAINT historial_id_postulante_id_anuncio_key UNIQUE (id_postulante, id_anuncio);


--
-- Name: historial historial_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial
    ADD CONSTRAINT historial_pkey PRIMARY KEY (id_historial);


--
-- Name: imagenes imagenes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.imagenes
    ADD CONSTRAINT imagenes_pkey PRIMARY KEY (id_imagen);


--
-- Name: mensajes_soporte mensajes_soporte_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mensajes_soporte
    ADD CONSTRAINT mensajes_soporte_pkey PRIMARY KEY (id_soporte);


--
-- Name: postulacion postulacion_id_postulante_id_anuncio_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.postulacion
    ADD CONSTRAINT postulacion_id_postulante_id_anuncio_key UNIQUE (id_postulante, id_anuncio);


--
-- Name: postulacion postulacion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.postulacion
    ADD CONSTRAINT postulacion_pkey PRIMARY KEY (id_postulacion);


--
-- Name: postulante postulante_correo_electronico_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.postulante
    ADD CONSTRAINT postulante_correo_electronico_key UNIQUE (correo_electronico);


--
-- Name: postulante postulante_curp_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.postulante
    ADD CONSTRAINT postulante_curp_key UNIQUE (curp);


--
-- Name: postulante postulante_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.postulante
    ADD CONSTRAINT postulante_pkey PRIMARY KEY (id_postulante);


--
-- Name: postulante postulante_rfc_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.postulante
    ADD CONSTRAINT postulante_rfc_key UNIQUE (rfc);


--
-- Name: postulante_valoracion postulante_valoracion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.postulante_valoracion
    ADD CONSTRAINT postulante_valoracion_pkey PRIMARY KEY (id_pv);


--
-- Name: reporte_a_anuncio reporte_a_anuncio_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reporte_a_anuncio
    ADD CONSTRAINT reporte_a_anuncio_pkey PRIMARY KEY (id_reporte);


--
-- Name: reporte_a_empleador reporte_a_empleador_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reporte_a_empleador
    ADD CONSTRAINT reporte_a_empleador_pkey PRIMARY KEY (id_reporte);


--
-- Name: reporte_a_postulante reporte_a_postulante_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reporte_a_postulante
    ADD CONSTRAINT reporte_a_postulante_pkey PRIMARY KEY (id_reporte);


--
-- Name: reporte reporte_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reporte
    ADD CONSTRAINT reporte_pkey PRIMARY KEY (id_reporte);


--
-- Name: resolucion_reporte resolucion_reporte_id_reporte_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resolucion_reporte
    ADD CONSTRAINT resolucion_reporte_id_reporte_key UNIQUE (id_reporte);


--
-- Name: resolucion_reporte resolucion_reporte_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resolucion_reporte
    ADD CONSTRAINT resolucion_reporte_pkey PRIMARY KEY (id_resolucion);


--
-- Name: seguimiento seguimiento_id_categoria_id_postulante_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seguimiento
    ADD CONSTRAINT seguimiento_id_categoria_id_postulante_key UNIQUE (id_categoria, id_postulante);


--
-- Name: seguimiento seguimiento_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seguimiento
    ADD CONSTRAINT seguimiento_pkey PRIMARY KEY (id_seguimiento);


--
-- Name: servicios servicios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicios
    ADD CONSTRAINT servicios_pkey PRIMARY KEY (id_servicio);


--
-- Name: postulante_valoracion unique_postulante_empleador; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.postulante_valoracion
    ADD CONSTRAINT unique_postulante_empleador UNIQUE (id_postulante, id_empleador);


--
-- Name: valoracion valoracion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.valoracion
    ADD CONSTRAINT valoracion_pkey PRIMARY KEY (id_valoracion);


--
-- Name: anuncios fk_anuncios_empleador; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anuncios
    ADD CONSTRAINT fk_anuncios_empleador FOREIGN KEY (id_empleador) REFERENCES public.empleador(id_empleador);


--
-- Name: anuncio_valoracion fk_av_anuncio; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anuncio_valoracion
    ADD CONSTRAINT fk_av_anuncio FOREIGN KEY (id_anuncio) REFERENCES public.anuncios(id_anuncio);


--
-- Name: anuncio_valoracion fk_av_valoracion; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anuncio_valoracion
    ADD CONSTRAINT fk_av_valoracion FOREIGN KEY (id_valoracion) REFERENCES public.valoracion(id_valoracion);


--
-- Name: categoriaanuncio fk_catanuncio_anuncio; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categoriaanuncio
    ADD CONSTRAINT fk_catanuncio_anuncio FOREIGN KEY (id_anuncio) REFERENCES public.anuncios(id_anuncio);


--
-- Name: categoriaanuncio fk_catanuncio_categoria; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categoriaanuncio
    ADD CONSTRAINT fk_catanuncio_categoria FOREIGN KEY (id_categoria) REFERENCES public.categorias(id_categoria);


--
-- Name: comentarios_vacante fk_comentario_anuncio; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comentarios_vacante
    ADD CONSTRAINT fk_comentario_anuncio FOREIGN KEY (id_anuncio) REFERENCES public.anuncios(id_anuncio) ON DELETE CASCADE;


--
-- Name: comentarios_vacante fk_comentario_postulante; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comentarios_vacante
    ADD CONSTRAINT fk_comentario_postulante FOREIGN KEY (id_postulante) REFERENCES public.postulante(id_postulante) ON DELETE CASCADE;


--
-- Name: cv fk_cv_postulante; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cv
    ADD CONSTRAINT fk_cv_postulante FOREIGN KEY (id_postulante) REFERENCES public.postulante(id_postulante);


--
-- Name: empleador_valoracion fk_ev_empleador; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empleador_valoracion
    ADD CONSTRAINT fk_ev_empleador FOREIGN KEY (id_empleador) REFERENCES public.empleador(id_empleador);


--
-- Name: empleador_valoracion fk_ev_valoracion; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empleador_valoracion
    ADD CONSTRAINT fk_ev_valoracion FOREIGN KEY (id_valoracion) REFERENCES public.valoracion(id_valoracion);


--
-- Name: favoritos fk_favoritos_anuncio; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.favoritos
    ADD CONSTRAINT fk_favoritos_anuncio FOREIGN KEY (id_anuncio) REFERENCES public.anuncios(id_anuncio);


--
-- Name: favoritos fk_favoritos_postulante; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.favoritos
    ADD CONSTRAINT fk_favoritos_postulante FOREIGN KEY (id_postulante) REFERENCES public.postulante(id_postulante);


--
-- Name: historial fk_historial_anuncio; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial
    ADD CONSTRAINT fk_historial_anuncio FOREIGN KEY (id_anuncio) REFERENCES public.anuncios(id_anuncio);


--
-- Name: historial fk_historial_postulante; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial
    ADD CONSTRAINT fk_historial_postulante FOREIGN KEY (id_postulante) REFERENCES public.postulante(id_postulante);


--
-- Name: imagenes fk_imagenes_anuncio; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.imagenes
    ADD CONSTRAINT fk_imagenes_anuncio FOREIGN KEY (id_anuncio) REFERENCES public.anuncios(id_anuncio);


--
-- Name: postulacion fk_postulacion_anuncio; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.postulacion
    ADD CONSTRAINT fk_postulacion_anuncio FOREIGN KEY (id_anuncio) REFERENCES public.anuncios(id_anuncio);


--
-- Name: postulacion fk_postulacion_postulante; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.postulacion
    ADD CONSTRAINT fk_postulacion_postulante FOREIGN KEY (id_postulante) REFERENCES public.postulante(id_postulante);


--
-- Name: postulante_valoracion fk_pv_postulante; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.postulante_valoracion
    ADD CONSTRAINT fk_pv_postulante FOREIGN KEY (id_postulante) REFERENCES public.postulante(id_postulante);


--
-- Name: postulante_valoracion fk_pv_valoracion; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.postulante_valoracion
    ADD CONSTRAINT fk_pv_valoracion FOREIGN KEY (id_valoracion) REFERENCES public.valoracion(id_valoracion);


--
-- Name: reporte fk_reporte_empleador; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reporte
    ADD CONSTRAINT fk_reporte_empleador FOREIGN KEY (id_empleador) REFERENCES public.empleador(id_empleador);


--
-- Name: reporte fk_reporte_postulante; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reporte
    ADD CONSTRAINT fk_reporte_postulante FOREIGN KEY (id_postulante) REFERENCES public.postulante(id_postulante);


--
-- Name: resolucion_reporte fk_resolucion_admin; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resolucion_reporte
    ADD CONSTRAINT fk_resolucion_admin FOREIGN KEY (id_administrador) REFERENCES public.administrador(id_administrador);


--
-- Name: resolucion_reporte fk_resolucion_reporte; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resolucion_reporte
    ADD CONSTRAINT fk_resolucion_reporte FOREIGN KEY (id_reporte) REFERENCES public.reporte(id_reporte);


--
-- Name: seguimiento fk_seguimiento_categoria; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seguimiento
    ADD CONSTRAINT fk_seguimiento_categoria FOREIGN KEY (id_categoria) REFERENCES public.categorias(id_categoria);


--
-- Name: seguimiento fk_seguimiento_postulante; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seguimiento
    ADD CONSTRAINT fk_seguimiento_postulante FOREIGN KEY (id_postulante) REFERENCES public.postulante(id_postulante);


--
-- Name: mensajes_soporte fk_soporte_postulante; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mensajes_soporte
    ADD CONSTRAINT fk_soporte_postulante FOREIGN KEY (id_postulante) REFERENCES public.postulante(id_postulante);


--
-- Name: postulante_valoracion postulante_valoracion_id_empleador_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.postulante_valoracion
    ADD CONSTRAINT postulante_valoracion_id_empleador_fkey FOREIGN KEY (id_empleador) REFERENCES public.empleador(id_empleador) ON DELETE CASCADE;


--
-- Name: reporte_a_anuncio reporte_a_anuncio_id_anuncio_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reporte_a_anuncio
    ADD CONSTRAINT reporte_a_anuncio_id_anuncio_fkey FOREIGN KEY (id_anuncio) REFERENCES public.anuncios(id_anuncio);


--
-- Name: reporte_a_anuncio reporte_a_anuncio_id_reporte_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reporte_a_anuncio
    ADD CONSTRAINT reporte_a_anuncio_id_reporte_fkey FOREIGN KEY (id_reporte) REFERENCES public.reporte(id_reporte);


--
-- Name: reporte_a_empleador reporte_a_empleador_id_empleador_reportado_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reporte_a_empleador
    ADD CONSTRAINT reporte_a_empleador_id_empleador_reportado_fkey FOREIGN KEY (id_empleador_reportado) REFERENCES public.empleador(id_empleador);


--
-- Name: reporte_a_empleador reporte_a_empleador_id_reporte_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reporte_a_empleador
    ADD CONSTRAINT reporte_a_empleador_id_reporte_fkey FOREIGN KEY (id_reporte) REFERENCES public.reporte(id_reporte);


--
-- Name: reporte_a_postulante reporte_a_postulante_id_postulante_reportado_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reporte_a_postulante
    ADD CONSTRAINT reporte_a_postulante_id_postulante_reportado_fkey FOREIGN KEY (id_postulante_reportado) REFERENCES public.postulante(id_postulante);


--
-- Name: reporte_a_postulante reporte_a_postulante_id_reporte_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reporte_a_postulante
    ADD CONSTRAINT reporte_a_postulante_id_reporte_fkey FOREIGN KEY (id_reporte) REFERENCES public.reporte(id_reporte);


--
-- Name: servicios servicios_autor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicios
    ADD CONSTRAINT servicios_autor_id_fkey FOREIGN KEY (autor_id) REFERENCES public.postulante(id_postulante);


--
-- PostgreSQL database dump complete
--

\unrestrict dKkD4S2GYfvQS5sX3DDQ8VP12fXrFO0DCHGKpkpMDfNuWi1q0z5JdO9ET1pB3om


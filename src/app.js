const express = require("express");
const path = require("node:path");
const expressLayouts = require("express-ejs-layouts");
const morgan = require("morgan");
const { crearControladorReservas } = require("./controladores/reservas");
const { crearRouterReservas } = require("./rutas/reservas");
const { crearControladorApiReservas } = require("./controladores/api-reservas");
const { crearRouterApiReservas } = require("./rutas/api-reservas");
const { esRutaApi, manejarErrores } = require("./middleware/errores");
const { crearMiddlewareSolicitudes } = require("./middleware/solicitudes");
const {
  prepararAreaReservas,
  validarReserva,
} = require("./middleware/reservas");

function crearApp(servicioReservas, configuracion) {
  const app = express();

  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "..", "views"));
  app.set("layout", "layouts/main");

  const { identificarSolicitud, medirDuracion } = crearMiddlewareSolicitudes();

  app.use(morgan(configuracion.formatoMorgan));
  app.use(identificarSolicitud);
  app.use(medirDuracion);
  app.use(expressLayouts);
  app.use(express.static(path.join(__dirname, "..", "public")));
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());

  const controladorReservas = crearControladorReservas(servicioReservas);

  app.get("/", controladorReservas.inicio);
  app.get("/estado", controladorReservas.estado);

  const reservasRouter = crearRouterReservas(
    controladorReservas,
    prepararAreaReservas,
    validarReserva,
  );

  app.use("/reservas", reservasRouter);
  app.use(
    "/api/reservas",
    crearRouterApiReservas(crearControladorApiReservas(servicioReservas)),
  );

  app.use((req, res) => {
    if (esRutaApi(req)) {
      return res.status(404).json({ error: "La ruta solicitada no existe." });
    }
    res.status(404).render("no-encontrado", {
      titulo: "Página no encontrada",
      mensaje: "La dirección solicitada no existe.",
    });
  });

  app.use(manejarErrores);

  return app;
}

module.exports = { crearApp };

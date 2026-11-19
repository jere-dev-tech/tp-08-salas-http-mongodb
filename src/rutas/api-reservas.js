const express = require("express");
const { validarReserva } = require("../middleware/reservas");

function crearRouterApiReservas(controlador) {
  const router = express.Router();
  router.get("/", controlador.listar);
  router.get("/:id", controlador.detalle);
  router.post("/", validarReserva, controlador.crear);
  return router;
}

module.exports = { crearRouterApiReservas };

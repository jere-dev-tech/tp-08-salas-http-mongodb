const mongoose = require("mongoose");
const { ErrorEntrada, ErrorNoEncontrado } = require("../errores");
const { salasPermitidas } = require("../modelos/opciones-reserva");
const { diagnosticarError } = require("../config/base-datos");

function esRutaApi(req) {
  return /^\/api(?:\/|\?|$)/i.test(req.originalUrl);
}

function manejarErrores(error, req, res, next) {
  if (res.headersSent) return next(error);

  let estado = 500;
  let mensaje = "Ocurrió un error interno. Intente nuevamente más tarde.";
  if (error instanceof ErrorEntrada) {
    estado = 400;
    mensaje = error.message;
  } else if (error instanceof ErrorNoEncontrado) {
    estado = 404;
    mensaje = error.message;
  } else if (
    error instanceof mongoose.Error.ValidationError ||
    error instanceof mongoose.Error.CastError
  ) {
    estado = 400;
    mensaje = "Los datos de la reserva no son válidos.";
  } else if (
    [
      "entity.parse.failed",
      "entity.too.large",
      "request.aborted",
      "request.size.invalid",
      "charset.unsupported",
      "encoding.unsupported",
      "parameters.too.many",
    ].includes(error.type) ||
    error instanceof URIError
  ) {
    estado = 400;
    mensaje = "El cuerpo o la dirección de la solicitud no son válidos.";
  }

  if (estado === 500) {
    console.error(`Falló una operación: ${diagnosticarError(error)}.`);
  }
  if (esRutaApi(req)) return res.status(estado).json({ error: mensaje });

  if (
    estado === 400 &&
    req.method === "POST" &&
    /^\/reservas\/?(?:\?|$)/i.test(req.originalUrl)
  ) {
    return res.status(400).render("reservas/nueva", {
      titulo: "Nueva reserva",
      seccion: "Reservas de salas",
      salasPermitidas,
      error: mensaje,
      valores: res.locals.valoresReserva ?? {},
    });
  }

  res.status(estado).render("no-encontrado", {
    estadoHttp: estado,
    titulo: estado === 404 ? "Reserva no encontrada" : "Error en la solicitud",
    mensaje,
  });
}

module.exports = { esRutaApi, manejarErrores };

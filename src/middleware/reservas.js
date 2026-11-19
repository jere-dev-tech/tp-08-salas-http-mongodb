const {
  salasPermitidas,
  turnosPermitidos,
} = require("../modelos/opciones-reserva");
const { ErrorEntrada } = require("../errores");

function prepararAreaReservas(req, res, next) {
  res.locals.seccion = "Reservas de salas";
  res.locals.salasPermitidas = salasPermitidas;
  next();
}

function validarReserva(req, res, next) {
  const cuerpo = req.body;
  if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)) {
    return next(new ErrorEntrada("Debe enviar los seis campos de la reserva."));
  }

  const camposTexto = ["estudiante", "email", "sala", "fecha", "turno"];
  const valores = {};
  for (const campo of camposTexto) {
    valores[campo] =
      typeof cuerpo[campo] === "string" ? cuerpo[campo].trim() : "";
  }
  valores.personas =
    typeof cuerpo.personas === "string" || typeof cuerpo.personas === "number"
      ? cuerpo.personas
      : "";
  res.locals.valoresReserva = valores;

  // Solo el formulario urlencoded transporta números como texto.
  let personas = cuerpo.personas;
  if (
    req.is("application/x-www-form-urlencoded") &&
    typeof personas === "string" &&
    /^\d+$/.test(personas.trim())
  ) {
    personas = Number(personas.trim());
  }

  let error;
  if (camposTexto.some((campo) => typeof cuerpo[campo] !== "string")) {
    error = "Los campos de texto deben ser cadenas de caracteres.";
  } else if (camposTexto.some((campo) => !valores[campo])) {
    error = "Todos los campos son obligatorios.";
  } else if (!salasPermitidas.includes(valores.sala)) {
    error = "La sala seleccionada no está permitida.";
  } else if (!turnosPermitidos.includes(valores.turno)) {
    error = "El turno seleccionado no está permitido.";
  } else if (
    typeof personas !== "number" ||
    !Number.isInteger(personas) ||
    personas < 1 ||
    personas > 6
  ) {
    error = "La cantidad de personas debe ser un número entero entre 1 y 6.";
  } else if (!valores.email.includes("@")) {
    error = "El email debe contener @.";
  }

  if (error) return next(new ErrorEntrada(error));

  req.reservaValidada = {
    estudiante: valores.estudiante,
    email: valores.email,
    sala: valores.sala,
    fecha: valores.fecha,
    turno: valores.turno,
    personas,
  };

  next();
}

module.exports = { prepararAreaReservas, validarReserva };

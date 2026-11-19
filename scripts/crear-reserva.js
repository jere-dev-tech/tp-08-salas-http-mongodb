const {
  conectarBaseDatos,
  cerrarBaseDatos,
  diagnosticarError,
} = require("../src/config/base-datos");
const Reserva = require("../src/modelos/reserva");

async function crearReserva() {
  const datos = {
    estudiante: "estudiante de ejemplo",
    email: "estudiante@example.invalid",
    sala: "Sala Norte",
    fecha: "2026-11-23",
    turno: "Mañana",
    personas: 3,
  };

  try {
    await conectarBaseDatos();
    const reserva = await Reserva.create(datos);
    console.log(`Reserva guardada. _id confirmado: ${reserva._id.toString()}`);
  } catch (error) {
    if (error.name === "ValidationError") {
      const campos = [
        "estudiante",
        "email",
        "sala",
        "fecha",
        "turno",
        "personas",
      ].filter((campo) => error.errors?.[campo]);
      console.error(
        `Reserva rechazada: ValidationError. Revisar campos: ${campos.join(", ")}.`,
      );
    } else {
      console.error(
        `No se confirmó la escritura: ${diagnosticarError(error)}.`,
      );
    }
    process.exitCode = 1;
  } finally {
    try {
      await cerrarBaseDatos();
    } catch (error) {
      console.error(`Falló el cierre: ${diagnosticarError(error)}.`);
      process.exitCode = 1;
    }
  }
}

crearReserva();

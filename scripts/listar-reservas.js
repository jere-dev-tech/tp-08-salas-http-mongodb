const {
  conectarBaseDatos,
  cerrarBaseDatos,
  diagnosticarError,
} = require("../src/config/base-datos");
const Reserva = require("../src/modelos/reserva");

async function listarReservas() {
  try {
    await conectarBaseDatos();
    const reservas = await Reserva.find();

    if (reservas.length > 0) {
      console.table(
        reservas.map((reserva) => ({
          _id: reserva._id.toString(),
          estudiante: reserva.estudiante,
          email: reserva.email,
          sala: reserva.sala,
          fecha: reserva.fecha,
          turno: reserva.turno,
          personas: reserva.personas,
        })),
      );
    }
    console.log(`Cantidad de reservas recuperadas: ${reservas.length}`);
  } catch (error) {
    console.error(`Falló la consulta: ${diagnosticarError(error)}.`);
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

listarReservas();

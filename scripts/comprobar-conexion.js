const {
  conectarBaseDatos,
  cerrarBaseDatos,
  diagnosticarError,
} = require("../src/config/base-datos");

async function comprobarConexion() {
  try {
    await conectarBaseDatos();
    console.log("Conexión con MongoDB confirmada. No se crearon reservas.");
  } catch (error) {
    console.error(`Falló la conexión: ${diagnosticarError(error)}.`);
    process.exitCode = 1;
  } finally {
    try {
      await cerrarBaseDatos();
      console.log("Recursos de MongoDB cerrados.");
    } catch (error) {
      console.error(`Falló el cierre: ${diagnosticarError(error)}.`);
      process.exitCode = 1;
    }
  }
}

comprobarConexion();

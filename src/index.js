const { once } = require("node:events");
const { crearApp } = require("./app");
const { crearServicioReservas } = require("./servicios/reservas");
const { leerConfiguracion } = require("./config/entorno");

const {
  conectarBaseDatos,
  cerrarBaseDatos,
  diagnosticarError,
} = require("./config/base-datos");

async function iniciarServidor({
  conectar = conectarBaseDatos,
  cerrar = cerrarBaseDatos,
  crearAplicacion = crearApp,
} = {}) {
  const configuracion = leerConfiguracion();
  let servidor;
  let cierre;

  function cerrarServidor() {
    if (cierre) return cierre;
    cierre = (async () => {
      try {
        if (servidor) {
          await new Promise((resolve, reject) => {
            servidor.close((error) => (error ? reject(error) : resolve()));
          });
        }
      } finally {
        try {
          await cerrar();
        } finally {
          process.removeListener("SIGINT", manejarSenal);
          process.removeListener("SIGTERM", manejarSenal);
        }
      }
    })();
    return cierre;
  }

  function manejarSenal() {
    cerrarServidor().catch((error) => {
      console.error(`Falló el cierre: ${diagnosticarError(error)}.`);
      process.exitCode = 1;
    });
  }

  try {
    await conectar();
    const app = crearAplicacion(crearServicioReservas(), configuracion);
    servidor = app.listen(configuracion.puerto);
    await once(servidor, "listening");
    process.once("SIGINT", manejarSenal);
    process.once("SIGTERM", manejarSenal);
    console.log(
      `Servidor disponible en http://localhost:${configuracion.puerto}`,
    );
    return { servidor, cerrarServidor };
  } catch (error) {
    try {
      await cerrarServidor();
    } catch (errorCierre) {
      console.error(`Falló el cierre: ${diagnosticarError(errorCierre)}.`);
    }
    throw error;
  }
}

if (require.main === module) {
  iniciarServidor().catch((error) => {
    console.error(
      `No se pudo iniciar el servidor: ${diagnosticarError(error)}.`,
    );
    process.exitCode = 1;
  });
}

module.exports = { iniciarServidor };

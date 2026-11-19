const dns = require("node:dns");
const mongoose = require("mongoose");
const { leerMongoUri } = require("./entorno");

async function conectarBaseDatos() {
  const uri = leerMongoUri();
  dns.setServers(["8.8.8.8", "1.1.1.1"]);

  await mongoose.connect(uri, {
    dbName: "reservas_salas_u8",
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });
}

async function cerrarBaseDatos() {
  await mongoose.disconnect();
}

function diagnosticarError(error) {
  const nombres = new Set([
    "Error",
    "MongooseError",
    "MongooseServerSelectionError",
    "MongoServerSelectionError",
    "MongoServerError",
    "MongoNetworkError",
    "MongoNetworkTimeoutError",
    "MongoParseError",
  ]);
  const codigosDns = new Set([
    "ENOTFOUND",
    "ENODATA",
    "ESERVFAIL",
    "ETIMEOUT",
    "ECONNREFUSED",
    "EAI_AGAIN",
    "ECANCELLED",
  ]);
  const operacionesDns = new Set([
    "querySrv",
    "queryTxt",
    "queryA",
    "queryAaaa",
    "getaddrinfo",
  ]);
  const detalles = [];
  const pendientes = [error];
  const visitados = new Set();

  while (pendientes.length > 0) {
    const actual = pendientes.shift();
    if (!actual || typeof actual !== "object" || visitados.has(actual)) {
      continue;
    }
    visitados.add(actual);

    if (nombres.has(actual.name)) detalles.push(`tipo=${actual.name}`);
    if (Number.isSafeInteger(actual.code) && actual.code >= 0) {
      detalles.push(`código=${actual.code}`);
    }
    if (
      typeof actual.message === "string" &&
      /bad auth|authentication failed|authentication failure|unable to authenticate/i.test(
        actual.message,
      )
    ) {
      detalles.push("autenticación rechazada");
    }
    if (
      typeof actual.message === "string" &&
      actual.message.startsWith("MONGODB_URI")
    ) {
      detalles.push("configuración de MONGODB_URI inválida o ausente");
    }
    if (
      typeof actual.message === "string" &&
      actual.message.startsWith("PORT")
    ) {
      detalles.push("configuración de PORT inválida");
    }
    if (codigosDns.has(actual.code)) detalles.push(`DNS=${actual.code}`);
    if (operacionesDns.has(actual.syscall)) {
      detalles.push(`operación=${actual.syscall}`);
    }
    if (actual.code === 18)
      detalles.push("autenticación rechazada (código 18)");
    if (actual.code === 13) detalles.push("acceso no autorizado (código 13)");

    pendientes.push(actual.cause, actual.reason, actual.error);
    if (actual.servers instanceof Map) {
      pendientes.push(...actual.servers.values());
    }
  }

  // Solo se muestran valores reconocidos, nunca message, stack, host ni URI.
  return [...new Set(detalles)].join("; ") || "error sin código reconocido";
}

module.exports = {
  conectarBaseDatos,
  cerrarBaseDatos,
  diagnosticarError,
};

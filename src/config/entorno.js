function leerConfiguracion() {
  const puertoTexto = process.env.PORT ?? "3000";
  const puerto = Number(puertoTexto);

  if (
    puertoTexto === "" ||
    /[^0-9]/.test(puertoTexto) ||
    !Number.isInteger(puerto) ||
    puerto < 1 ||
    puerto > 65535
  ) {
    throw new Error(
      "PORT inválido: debe ser un número entero entre 1 y 65535, sin espacios ni decimales.",
    );
  }

  const entorno = process.env.NODE_ENV ?? "development";
  const formatoMorgan = entorno === "production" ? "combined" : "dev";

  return { puerto, entorno, formatoMorgan };
}

function leerMongoUri() {
  const uri = process.env.MONGODB_URI?.trim();

  if (!uri) {
    throw new Error(
      "MONGODB_URI es obligatoria para iniciar el servidor y los programas de MongoDB.",
    );
  }

  if (!/^mongodb(?:\+srv)?:\/\/\S+$/.test(uri)) {
    throw new Error(
      "MONGODB_URI inválida: debe comenzar con mongodb:// o mongodb+srv:// y no contener espacios.",
    );
  }

  return uri;
}

module.exports = { leerConfiguracion, leerMongoUri };

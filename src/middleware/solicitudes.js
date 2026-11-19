function crearMiddlewareSolicitudes() {
  let contadorSolicitudes = 0;

  function identificarSolicitud(req, res, next) {
    contadorSolicitudes += 1;
    const numeroFormateado = String(contadorSolicitudes).padStart(4, "0");

    res.locals.solicitudId = `BIB-${numeroFormateado}`;
    next();
  }

  function medirDuracion(req, res, next) {
    const tiempoInicial = Date.now();

    res.on("finish", () => {
      const duracion = Date.now() - tiempoInicial;

      console.log(
        `${res.locals.solicitudId} ${req.method} ${req.originalUrl} ` +
          `${res.statusCode} ${duracion} ms`,
      );
    });

    next();
  }

  return { identificarSolicitud, medirDuracion };
}

module.exports = { crearMiddlewareSolicitudes };

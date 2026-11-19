function crearControladorReservas(servicio) {
  async function inicio(req, res) {
    res.render("inicio", {
      titulo: "Reservas de salas de estudio",
      cantidadReservas: await servicio.contar(),
    });
  }

  async function estado(req, res) {
    res.json({
      servicio: "activo",
      reservas: await servicio.contar(),
      solicitudId: res.locals.solicitudId,
    });
  }

  async function listar(req, res) {
    res.render("reservas/lista", {
      titulo: "Reservas",
      reservas: await servicio.listar(),
    });
  }

  function nueva(req, res) {
    res.render("reservas/nueva", {
      titulo: "Nueva reserva",
      salasPermitidas: res.locals.salasPermitidas,
      error: null,
      valores: {},
    });
  }

  async function detalle(req, res) {
    const reserva = await servicio.buscarPorId(req.params.id);

    res.render("reservas/detalle", {
      titulo: `Reserva de ${reserva.estudiante}`,
      reserva,
    });
  }

  async function crear(req, res) {
    await servicio.crear(req.reservaValidada);

    res.redirect("/reservas");
  }

  return { inicio, estado, listar, nueva, detalle, crear };
}

module.exports = { crearControladorReservas };

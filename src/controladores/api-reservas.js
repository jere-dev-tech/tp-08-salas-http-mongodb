const { ErrorEntrada } = require("../errores");

function crearControladorApiReservas(servicio) {
  async function listar(req, res) {
    if (Object.keys(req.query).some((campo) => campo !== "sala")) {
      throw new ErrorEntrada("El único filtro admitido es sala.");
    }
    res.json(await servicio.listar(req.query.sala));
  }

  async function detalle(req, res) {
    res.json(await servicio.buscarPorId(req.params.id));
  }

  async function crear(req, res) {
    const reserva = await servicio.crear(req.reservaValidada);
    res.location(`/api/reservas/${reserva.id}`).status(201).json(reserva);
  }

  return { listar, detalle, crear };
}

module.exports = { crearControladorApiReservas };

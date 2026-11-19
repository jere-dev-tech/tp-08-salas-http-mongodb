const Reserva = require("../modelos/reserva");
const { ErrorEntrada, ErrorNoEncontrado } = require("../errores");

function representarReserva(documento) {
  return {
    id: documento._id.toString(),
    estudiante: documento.estudiante,
    email: documento.email,
    sala: documento.sala,
    fecha: documento.fecha,
    turno: documento.turno,
    personas: documento.personas,
    estado: documento.estado,
  };
}

function crearServicioReservas(modelo = Reserva) {
  async function listar(sala) {
    if (sala !== undefined && typeof sala !== "string") {
      throw new ErrorEntrada("El filtro sala debe ser un único texto.");
    }
    const criterio = sala === undefined ? {} : { sala };
    const documentos = await modelo.find(criterio);
    return documentos.map(representarReserva);
  }

  async function buscarPorId(id) {
    if (typeof id !== "string" || !/^[a-f\d]{24}$/i.test(id)) {
      throw new ErrorEntrada("El ID debe ser un ObjectId válido.");
    }
    const documento = await modelo.findById(id);
    if (!documento) {
      throw new ErrorNoEncontrado("La reserva solicitada no existe.");
    }
    return representarReserva(documento);
  }

  async function contar() {
    return await modelo.countDocuments({});
  }

  async function crear(datos) {
    const documento = await modelo.create({
      estudiante: datos.estudiante,
      email: datos.email,
      sala: datos.sala,
      fecha: datos.fecha,
      turno: datos.turno,
      personas: datos.personas,
    });
    return representarReserva(documento);
  }

  return { listar, buscarPorId, contar, crear };
}

module.exports = { crearServicioReservas };

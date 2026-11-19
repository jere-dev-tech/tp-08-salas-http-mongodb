const mongoose = require("mongoose");
const { salasPermitidas, turnosPermitidos } = require("./opciones-reserva");

const reservaSchema = new mongoose.Schema(
  {
    estudiante: { type: String, required: true, trim: true, cast: false },
    email: {
      type: String,
      required: true,
      trim: true,
      cast: false,
      match: /@/,
    },
    sala: {
      type: String,
      required: true,
      trim: true,
      cast: false,
      enum: salasPermitidas,
    },
    fecha: { type: String, required: true, trim: true, cast: false },
    turno: {
      type: String,
      required: true,
      trim: true,
      cast: false,
      enum: turnosPermitidos,
    },
    personas: {
      type: Number,
      required: true,
      cast: false,
      // Rechazar incluso objetos con _id antes del casting de Mongoose.
      set(valor) {
        if (valor != null && typeof valor !== "number") {
          throw new Error("personas debe ser un número.");
        }
        return valor;
      },
      min: 1,
      max: 6,
      validate: {
        validator: Number.isInteger,
        message: "La cantidad de personas debe ser un número entero.",
      },
    },
    estado: {
      type: String,
      cast: false,
      enum: ["pendiente", "confirmada"],
      default: "pendiente",
    },
  },
  // Consultar una colección vacía no debe crear colecciones ni índices.
  { autoCreate: false, autoIndex: false },
);

module.exports = mongoose.model("Reserva", reservaSchema, "reservas");

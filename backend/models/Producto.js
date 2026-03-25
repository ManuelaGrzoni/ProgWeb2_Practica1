const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  precio: { type: Number, required: true, min: 0 },
  descripcion: { type: String, required: true, trim: true },
  imagen: { type: String },
  categoria: { type: String, required: true, default: 'Otros' },
  plataforma: { type: String, default: 'Otro' },
  activo: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Producto', productoSchema);

const mongoose = require('mongoose');

const ordenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
      quantity: { type: Number, required: true },
    },
  ],
  totalPrice: { type: Number, required: true },
  status: { type: String, default: 'Pendiente' }, // Pendiente, Completada, Cancelada
}, { timestamps: true });

module.exports = mongoose.model('Orden', ordenSchema);
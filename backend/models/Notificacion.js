const mongoose = require('mongoose');

const notificacionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['pedido', 'chat', 'sistema'], 
    default: 'sistema' 
  },
  read: { type: Boolean, default: false },
  link: { type: String }, // Opcional: enlace a donde llevar al hacer clic
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Notificacion', notificacionSchema);

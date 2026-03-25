require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Conexión a MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/productos';
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => console.error('❌ Error al conectar a MongoDB:', err));

// Rutas
app.use('/auth', require('./routes/auth'));
app.use('/productos', require('./routes/productos'));
app.use('/carrito', require('./routes/carrito'));
app.use('/ordenes', require('./routes/ordenes'));
app.use('/notificaciones', require('./routes/notificaciones'));
app.use('/usuarios', require('./routes/usuarios'));

// Modelo de Mensaje para el Chat (Socket.io)
const MensajeSchema = new mongoose.Schema({
  text: String,
  username: String,
  roomId: String,
  visto: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
  userId: mongoose.Schema.Types.ObjectId
});

// Si el modelo ya existe (por ejemplo, por test_agg.js), usarlo, si no, crearlo.
const Mensaje = mongoose.models.Mensaje || mongoose.model('Mensaje', MensajeSchema);

// Socket.io configuración
io.on('connection', (socket) => {
  console.log('✅ Nuevo cliente conectado al chat:', socket.id);

  // Unirse a una sala específica
  socket.on('joinRoom', async ({ roomId }) => {
    socket.join(roomId);
    console.log(`Cliente se unió a la sala: ${roomId}`);

    try {
      // Cargar historial de mensajes de la sala
      const historial = await Mensaje.find({ roomId }).sort({ timestamp: 1 });
      socket.emit('historial', historial);
    } catch (err) {
      console.error('Error al cargar historial:', err);
    }
  });

  // Recibir mensaje y guardarlo
  socket.on('mensaje', async (data) => {
    try {
      const nuevoMensaje = new Mensaje({
        text: data.text,
        username: data.username,
        roomId: data.roomId,
        userId: data.userId
      });

      await nuevoMensaje.save();

      // Emitir el mensaje a todos en la sala
      io.to(data.roomId).emit('mensaje', nuevoMensaje);
    } catch (err) {
      console.error('Error al guardar mensaje:', err);
    }
  });

  // Marcar mensajes como vistos
  socket.on('marcarVisto', async ({ roomId, userId }) => {
    try {
      await Mensaje.updateMany(
        { roomId, visto: false, userId: { $ne: userId } },
        { $set: { visto: true } }
      );
      
      // Notificar a la sala que los mensajes fueron leídos
      io.to(roomId).emit('mensajesVistos', { 
        roomId, 
        timestamp: new Date()
      });
    } catch (err) {
      console.error('Error al actualizar vistos:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ Cliente desconectado:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor backend escuchando en http://localhost:${PORT}`);
});

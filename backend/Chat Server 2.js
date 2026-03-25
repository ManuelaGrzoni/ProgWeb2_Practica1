const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require("socket.io");
const jwt = require('jsonwebtoken');

// Cargar variables de entorno (buscar .env en el directorio actual)
dotenv.config({ path: path.join(__dirname, '.env') });

process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

// Importar rutas y modelos
const carritoRoutes = require('./routes/carrito');
const authRoutes = require('./routes/auth');
const productosRoutes = require('./routes/productos');
const usuariosRoutes = require('./routes/usuarios');
const ordenesRoutes = require('./routes/ordenes');
const notificacionesRoutes = require('./routes/notificaciones');
const Usuario = require('./models/Usuario');
const Notificacion = require('./models/Notificacion');
const multer = require('multer');
const fs = require('fs');

const mensajeSchema = new mongoose.Schema({
  text: { type: String, required: false, trim: true },
  imageUrl: { type: String, required: false }, // Optional field for images
  username: { type: String, required: true, trim: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  roomId: { type: String, required: true }, // For support, roomId is the regular user's ID
  timestamp: { type: Date, required: true },
  visto: { type: Boolean, default: false } // Para control del admin (mensajes nuevos vs viejos)
});

const Mensaje = mongoose.model('Mensaje', mensajeSchema);

// Crear aplicación Express
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Rutas de API
app.use('/auth', authRoutes);
app.use('/productos', productosRoutes);
app.use('/carrito', carritoRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/ordenes', ordenesRoutes);
app.use('/notificaciones', notificacionesRoutes);

// Configuración de Multer para el chat
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads/chat');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Endpoint para subir imágenes al chat
app.post('/chat/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se subió ninguna imagen' });
  const imageUrl = `/uploads/chat/${req.file.filename}`;
  res.json({ imageUrl });
});

const FRONTEND_DIST = path.join(__dirname, '..', 'frontend', 'dist');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

app.use(express.static(FRONTEND_DIST));
app.use('/uploads', express.static(UPLOADS_DIR));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/socket.io')) return next();
  res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
});

// Middleware de autenticación para Socket.io
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('authentication_error'));
    }

    // Verificar el token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Buscar el usuario en la base de datos
    const usuario = await Usuario.findById(decoded.id).select('-password');

    if (!usuario) {
      return next(new Error('authentication_error'));
    }

    // Guardar datos del usuario en el socket
    socket.userId = usuario._id;
    socket.username = usuario.username;
    socket.userRole = usuario.role;

    next();
  } catch (error) {
    console.error('Error en autenticación de socket:', error);
    return next(new Error('authentication_error'));
  }
});

// Socket.io para el chat en tiempo real
io.on('connection', async (socket) => {
  const isUserAdmin = socket.userRole === 'administrador';
  console.log(`✅ Usuario conectado: ${socket.username} (${socket.userId}) - Rol: ${socket.userRole}`);

  // Cada usuario se une a su propia sala privada para recibir respuestas
  socket.join(socket.userId.toString());

  // Si es administrador, se une a la sala de admins para recibir notificaciones de nuevos tickets
  if (isUserAdmin) {
    socket.join('admins');
  }

  // No enviamos historial de mensajes a usuarios regulares por privacidad/seguridad
  // según la solicitud: "que los usuarios no vean chats antiguos solo los admins"
  try {
    if (isUserAdmin) {
       console.log(`[Socket] Admin connected: ${socket.username}`);
    } else {
       // Opcional: podrías enviar un mensaje de bienvenida aquí
       console.log(`[Socket] User connected: ${socket.username}`);
    }
  } catch (error) {
    console.error('Error en conexión inicial:', error);
  }

  // Evento para que el admin cargue una conversación específica
  socket.on('get_conversation', async (targetUserId) => {
    if (!isUserAdmin) return;
    try {
      // Unirse a la sala del usuario para recibir mensajes en tiempo real
      if (socket.currentChatRoom) {
        socket.leave(socket.currentChatRoom);
      }
      socket.currentChatRoom = targetUserId;
      socket.join(targetUserId);
      console.log(`[Socket] Admin ${socket.username} se unió a la sala ${targetUserId}`);

      // Al cargar la conversación, marcamos como vistos los mensajes del usuario
      await Mensaje.updateMany(
        { roomId: targetUserId, visto: false, userId: { $ne: socket.userId } },
        { visto: true }
      );

      const historial = await Mensaje.find({ roomId: targetUserId })
        .sort({ timestamp: -1 })
        .limit(50)
        .lean();
      socket.emit('message_history', { userId: targetUserId, messages: historial.reverse() });
      
      // Notificar al admin que la lista ha cambiado (mensajes ahora leídos)
      const unreadList = await getUnreadConversations();
      socket.emit('conversations_list', unreadList);
    } catch (error) {
      console.error('Error al obtener conversación:', error);
    }
  });

  async function getUnreadConversations() {
    const list = await Mensaje.aggregate([
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: "$roomId",
          lastMessage: { $first: "$text" },
          lastTimestamp: { $first: "$timestamp" },
          messages: { $push: { username: "$username", userId: "$userId", visto: "$visto" } },
          unreadCount: { 
            $sum: { 
              $cond: [
                { $and: [{ $eq: ["$visto", false] }, { $ne: ["$username", socket.username] }] }, 
                1, 
                0
              ] 
            } 
          }
        }
      },
      { $sort: { lastTimestamp: -1 } }
    ]);

    return list.map((item) => {
      const customerName = item.messages.find(m => m.username !== socket.username)?.username || item.messages[0]?.username || 'Usuario Desconocido';
      return {
        _id: item._id,
        lastMessage: item.lastMessage,
        lastTimestamp: item.lastTimestamp,
        username: customerName,
        unreadCount: item.unreadCount
      };
    });
  }

  socket.on('get_conversations_list', async () => {
    if (!isUserAdmin) return;
    try {
      const refinedList = await getUnreadConversations();
      socket.emit('conversations_list', refinedList);
    } catch (error) {
      console.error('Error al obtener lista de conversaciones:', error);
    }
  });

  // Recibir mensaje de chat
  socket.on('chat_message', async (data) => {
    try {
      // Determinar el roomId
      let roomId = socket.userId.toString();
      
      // Si el admin responde, usa el targetUserId enviado
      if (isUserAdmin && data.targetUserId) {
        roomId = data.targetUserId;
      }

      const nuevoMensaje = new Mensaje({
        text: data.text || '',
        imageUrl: data.imageUrl || null,
        username: socket.username,
        userId: socket.userId,
        roomId: roomId,
        timestamp: new Date()
      });

      await nuevoMensaje.save();

      const mensajeParaEmitir = {
        text: nuevoMensaje.text,
        imageUrl: nuevoMensaje.imageUrl,
        username: nuevoMensaje.username,
        userId: nuevoMensaje.userId.toString(),
        roomId: nuevoMensaje.roomId,
        timestamp: nuevoMensaje.timestamp,
        _id: nuevoMensaje._id
      };

      // Emitir al usuario (que está en la sala con su ID)
      io.to(roomId).emit('chat_message', mensajeParaEmitir);
      
      // Si el usuario envió el mensaje, notificar a los admins
      if (!isUserAdmin) {
        io.to('admins').emit('new_ticket_message', mensajeParaEmitir);
      }

      console.log(`💬 Mensaje de ${socket.username} en sala ${roomId}: ${data.text}`);

      // Crear Notificación si el destinatario no es el administrador respondiendo (o viceversa)
      // Si el admin envía, notificar al usuario. Si el usuario envía, notificar a los admins (opcional, ya tienen sala especial)
      if (isUserAdmin) {
        // Notificar al usuario regular
        await new Notificacion({
          userId: roomId, // En el chat, roomId es el userId del cliente
          title: 'Nuevo mensaje de soporte',
          message: data.text || 'Has recibido una imagen',
          type: 'chat',
          link: '/soporte'
        }).save();
        io.to(roomId).emit('notification', { title: 'Soporte', message: 'Nuevo mensaje' });
      } else {
        // Notificar a administradores
        // Opcionalmente podemos enviar una notificación a todos los usuarios con rol admin
        // Pero por ahora solo marcamos que hay un nuevo ticket.
      }
    } catch (error) {
      console.error('Error al guardar mensaje:', error);
      socket.emit('error', { message: 'Error al enviar mensaje' });
    }
  });

  // Usuario está escribiendo
  socket.on('typing', (data) => {
    socket.broadcast.emit('user_typing', {
      username: socket.username,
      userId: socket.userId
    });
  });

  // Usuario dejó de escribir
  socket.on('stop_typing', () => {
    socket.broadcast.emit('user_stop_typing', {
      username: socket.username,
      userId: socket.userId
    });
  });

  // Usuario se desconecta
  socket.on('disconnect', () => {
    console.log(`❌ Usuario desconectado: ${socket.username}`);

    socket.broadcast.emit('user_disconnected', {
      username: socket.username,
      userId: socket.userId
    });
  });
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: err.message || 'Error interno del servidor'
  });
});

// Configuración de puerto y MongoDB
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/productos';

// Conexión a MongoDB y arranque del servidor
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Conectado a MongoDB');
    server.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`💬 Chat disponible en http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Error al conectar a MongoDB:', err);
    process.exit(1);
  });

module.exports = app;

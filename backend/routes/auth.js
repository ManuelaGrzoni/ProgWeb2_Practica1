const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Usuario = require("../models/Usuario");
const { authenticate } = require("../middlewares/auth");
const multer = require("multer");
const path = require("path");

// Configuración de multer para fotos de perfil
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, "profile-" + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) return cb(null, true);
    cb(new Error("Solo se permiten imágenes"));
  }
});

// Función para generar JWT
const generarToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "7d" // El token expira en 7 días
  });
};

// POST /auth/registro - Registrar nuevo usuario
router.post("/registro", async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;

    // Validar campos requeridos
    if (!username || !email || !password) {
      return res.status(400).json({
        error: "Por favor proporciona username, email y password."
      });
    }

    // Verificar si el usuario ya existe
    const usuarioExistente = await Usuario.findOne({
      $or: [{ email }, { username }]
    });

    if (usuarioExistente) {
      return res.status(400).json({
        error: "El usuario o email ya está registrado."
      });
    }

    // Crear nuevo usuario
    const nuevoUsuario = new Usuario({
      username,
      email,
      password,
      role: role || "usuario" // Por defecto es "usuario"
    });

    await nuevoUsuario.save();

    // Generar token
    const token = generarToken(nuevoUsuario._id);

    res.status(201).json({
      mensaje: "Usuario registrado exitosamente",
      token,
      usuario: {
        id: nuevoUsuario._id,
        username: nuevoUsuario.username,
        email: nuevoUsuario.email,
        role: nuevoUsuario.role
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /auth/login - Iniciar sesión
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validar campos requeridos
    if (!email || !password) {
      return res.status(400).json({
        error: "Por favor proporciona email y password."
      });
    }

    // Buscar usuario por email
    const usuario = await Usuario.findOne({ email });

    if (!usuario) {
      return res.status(401).json({
        error: "Credenciales inválidas."
      });
    }

    // Verificar contraseña
    const passwordValida = await usuario.compararPassword(password);

    if (!passwordValida) {
      return res.status(401).json({
        error: "Credenciales inválidas."
      });
    }

    // Generar token
    const token = generarToken(usuario._id);

    res.json({
      mensaje: "Inicio de sesión exitoso",
      token,
      usuario: {
        id: usuario._id,
        username: usuario.username,
        email: usuario.email,
        role: usuario.role
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /auth/perfil - Obtener perfil del usuario autenticado
router.get("/perfil", async (req, res, next) => {
  try {
    // Obtener token del header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Acceso denegado. Token no proporcionado."
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const usuario = await Usuario.findById(decoded.id).select("-password");

    if (!usuario) {
      return res.status(404).json({
        error: "Usuario no encontrado."
      });
    }

    res.json({ usuario });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Token inválido." });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expirado." });
    }
    next(error);
  }
});

// PUT /auth/perfil - Actualizar perfil del usuario autenticado
router.put("/perfil", authenticate, upload.single("foto"), async (req, res, next) => {
  try {
    const usuario = await Usuario.findById(req.usuario.id);

    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const { username, notificationsConfig, phone, addresses, email } = req.body;
    if (username) usuario.username = username;
    if (phone) usuario.phone = phone;
    if (email && req.usuario?.role === 'administrador') {
      usuario.email = email;
    }
    
    if (addresses) {
      try {
        usuario.addresses = typeof addresses === 'string' ? JSON.parse(addresses) : addresses;
      } catch (e) {
        console.error("Error parsing addresses in /auth/perfil", e);
      }
    }
    
    // Si envían la config de notificaciones como JSON string (desde multipart/form-data o JSON puro)
    if (notificationsConfig) {
      try {
        usuario.notificationsConfig = typeof notificationsConfig === 'string' 
          ? JSON.parse(notificationsConfig) 
          : notificationsConfig;
      } catch (e) {
        console.error("Error parsing notificationsConfig", e);
      }
    }

    if (req.file) {
      usuario.profilePicture = `/uploads/${req.file.filename}`;
    }

    await usuario.save();

    res.json({
      mensaje: "Perfil actualizado correctamente",
      usuario
    });
  } catch (error) {
    next(error);
  }
});

// POST /auth/direcciones - Agregar dirección
router.post("/direcciones", authenticate, async (req, res, next) => {
  try {
    const { name, street, city, state, zip, lat, lng, isDefault } = req.body;
    const usuario = await Usuario.findById(req.usuario.id);
    
    if (isDefault) {
      usuario.addresses.forEach(a => a.isDefault = false);
    }
    
    usuario.addresses.push({ name, street, city, state, zip, lat, lng, isDefault });
    await usuario.save();
    res.json({ mensaje: "Dirección agregada", addresses: usuario.addresses });
  } catch (error) {
    next(error);
  }
});

// DELETE /auth/direcciones/:id - Eliminar dirección
router.delete("/direcciones/:id", authenticate, async (req, res, next) => {
  try {
    const usuario = await Usuario.findById(req.usuario.id);
    usuario.addresses = usuario.addresses.filter(a => a._id.toString() !== req.params.id);
    await usuario.save();
    res.json({ mensaje: "Dirección eliminada", addresses: usuario.addresses });
  } catch (error) {
    next(error);
  }
});

// POST /auth/metodos-pago - Agregar método de pago
router.post("/metodos-pago", authenticate, async (req, res, next) => {
  try {
    const { type, last4, expiry, cardholder, isDefault } = req.body;
    const usuario = await Usuario.findById(req.usuario.id);
    
    if (isDefault) {
      usuario.paymentMethods.forEach(m => m.isDefault = false);
    }
    
    usuario.paymentMethods.push({ type, last4, expiry, cardholder, isDefault });
    await usuario.save();
    res.json({ mensaje: "Método de pago agregado", paymentMethods: usuario.paymentMethods });
  } catch (error) {
    next(error);
  }
});

// DELETE /auth/metodos-pago/:id - Eliminar método de pago
router.delete("/metodos-pago/:id", authenticate, async (req, res, next) => {
  try {
    const usuario = await Usuario.findById(req.usuario.id);
    usuario.paymentMethods = usuario.paymentMethods.filter(m => m._id.toString() !== req.params.id);
    await usuario.save();
    res.json({ mensaje: "Método de pago eliminado", paymentMethods: usuario.paymentMethods });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

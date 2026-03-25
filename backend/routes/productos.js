const express = require("express");
const router = express.Router();
const Producto = require("../models/Producto");
const { authenticate, authorize } = require("../middlewares/auth");
const multer = require("multer");
const path = require("path");

// Configuración de multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Solo se permiten imágenes (jpeg, jpg, png, webp)"));
  }
});

// GET /productos - Obtener todos los productos (usuarios y administradores)
router.get("/", async (req, res, next) => {
  try {
    const productos = await Producto.find().sort({ createdAt: -1 });
    res.json(productos);
  } catch (err) {
    next(err);
  }
});

// GET /productos/:id - Obtener un producto por ID (usuarios y administradores)
router.get("/:id", async (req, res, next) => {
  try {
    const producto = await Producto.findById(req.params.id);
    if (!producto) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.json(producto);
  } catch (err) {
    next(err);
  }
});

// POST /productos - Crear nuevo producto (solo administradores)
router.post("/", authenticate, authorize("administrador"), upload.single("imagen"), async (req, res, next) => {
  try {
    console.log("Creando producto - body:", req.body);
    console.log("Creando producto - file:", req.file);
    
    const datosProducto = { ...req.body };
    if (req.file) {
      datosProducto.imagen = `/uploads/${req.file.filename}`;
    }
    
    // Convertir tipos ya que FormData envía todo como string
    if (datosProducto.precio) datosProducto.precio = Number(datosProducto.precio);
    if (datosProducto.activo !== undefined) datosProducto.activo = datosProducto.activo === "true" || datosProducto.activo === true;

    const nuevo = new Producto(datosProducto);
    await nuevo.save();
    res.status(201).json(nuevo);
  } catch (err) {
    console.error("Error al crear producto:", err);
    next(err);
  }
});

// PUT /productos/:id - Actualizar producto (solo administradores)
router.put("/:id", authenticate, authorize("administrador"), upload.single("imagen"), async (req, res, next) => {
  try {
    console.log("Actualizando producto - body:", req.body);
    console.log("Actualizando producto - file:", req.file);

    const datosProducto = { ...req.body };
    if (req.file) {
      datosProducto.imagen = `/uploads/${req.file.filename}`;
    }

    // Convertir tipos
    if (datosProducto.precio) datosProducto.precio = Number(datosProducto.precio);
    if (datosProducto.activo !== undefined) datosProducto.activo = datosProducto.activo === "true" || datosProducto.activo === true;

    const actualizado = await Producto.findByIdAndUpdate(
      req.params.id,
      datosProducto,
      { new: true, runValidators: true }
    );
    if (!actualizado) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.json(actualizado);
  } catch (err) {
    console.error("Error al actualizar producto:", err);
    next(err);
  }
});

// DELETE /productos/:id - Eliminar producto (solo administradores)
router.delete("/:id", authenticate, authorize("administrador"), async (req, res, next) => {
  try {
    const eliminado = await Producto.findByIdAndDelete(req.params.id);
    if (!eliminado) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.json({ mensaje: "Producto eliminado exitosamente" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

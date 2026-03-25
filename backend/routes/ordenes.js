const express = require('express');
const router = express.Router();
const Carrito = require('../models/Carrito');
const Notificacion = require('../models/Notificacion');
const Orden = require('../models/Orden');
const { authenticate, authorize } = require('../middlewares/auth');

// GET /ordenes - Obtener todas las órdenes (solo administradores)
router.get('/', authenticate, authorize('administrador'), async (req, res, next) => {
  try {
    const ordenes = await Orden.find()
      .populate('userId', 'username email profilePicture')
      .populate('items.productId', 'nombre precio')
      .sort({ createdAt: -1 });
    res.json(ordenes);
  } catch (err) {
    next(err);
  }
});

// GET /ordenes/mis-ordenes - Obtener órdenes del usuario autenticado
router.get('/mis-ordenes', authenticate, async (req, res, next) => {
  try {
    const ordenes = await Orden.find({ userId: req.usuario.id })
      .populate('items.productId', 'nombre precio')
      .sort({ createdAt: -1 });
    res.json(ordenes);
  } catch (err) {
    next(err);
  }
});

// POST /ordenes - Crear pedido (Checkout)
router.post('/', authenticate, async (req, res, next) => {
  try {
    console.log('Backend recibió pedido:', req.body);
    const { items, totalPrice } = req.body; // items: [ { productId, quantity } ]
    
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'El pedido está vacío' });
    }

    // Rechazar pedidos con productos de demostración (mock)
    const tieneMock = items.some(i => !i.productId || String(i.productId).length < 5);
    if (tieneMock) {
      return res.status(400).json({ error: 'No se pueden comprar productos de demostración. Por favor, crea un producto real desde el catálogo para probar el Checkout.' });
    }

    const nuevaOrden = new Orden({
      userId: req.usuario.id,
      items,
      totalPrice: totalPrice || 0,
      status: 'Pendiente'
    });

    await nuevaOrden.save();

    // Crear notificación para el usuario
    await new Notificacion({
      userId: req.usuario.id,
      title: 'Pedido Realizado',
      message: `Tu pedido por ${Number(totalPrice || 0).toFixed(2)}€ ha sido registrado.`,
      type: 'pedido',
      link: '/perfil'
    }).save();

    res.status(201).json(nuevaOrden);
  } catch (err) {
    next(err);
  }
});

// PATCH /ordenes/:id/status - Actualizar estado (Admin)
router.patch('/:id/status', authenticate, authorize('administrador'), async (req, res, next) => {
  try {
    const { status } = req.body;
    const orden = await Orden.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!orden) return res.status(404).json({ error: 'Orden no encontrada' });

    // Notificar al usuario sobre el cambio de estado
    await new Notificacion({
      userId: orden.userId,
      title: 'Estado de Pedido Actualizado',
      message: `Tu pedido ahora está: ${status}`,
      type: 'pedido',
      link: '/perfil'
    }).save();

    res.json(orden);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

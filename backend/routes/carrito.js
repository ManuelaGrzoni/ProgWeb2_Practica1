const express = require('express');
const Carrito = require('../models/Carrito');
const Producto = require('../models/Producto');
const router = express.Router();

const { authenticate } = require('../middlewares/auth');

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const carrito = await Carrito.findOne({ userId: req.usuario.id }).populate('items.productId');
    if (!carrito) return res.json({ items: [] });

    const items = (carrito.items || [])
      .map((i) => ({ product: i.productId, quantity: i.quantity }))
      .filter((i) => i.product);

    res.json({ items });
  } catch (error) {
    console.error('Error al obtener carrito:', error);
    res.status(500).json({ error: 'Error al obtener carrito' });
  }
});

// Añadir producto al carrito
router.post('/add', async (req, res) => {
  const { productId, quantity } = req.body;

  try {
    const qty = Math.max(1, Number(quantity || 1));
    const producto = await Producto.findById(productId);
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });

    // Buscar el carrito del usuario
    let carrito = await Carrito.findOne({ userId: req.usuario.id });

    // Si no existe el carrito, crearlo
    if (!carrito) {
      carrito = new Carrito({ userId: req.usuario.id, items: [] });
    }

    // Verificar si el producto ya está en el carrito
    const itemIndex = carrito.items.findIndex(item => item.productId.toString() === productId);

    if (itemIndex > -1) {
      // Si el producto ya está en el carrito, actualizar la cantidad
      carrito.items[itemIndex].quantity += qty;
    } else {
      // Si el producto no está en el carrito, añadirlo
      carrito.items.push({ productId, quantity: qty });
    }

    // Guardar el carrito actualizado
    await carrito.save();
    const actualizado = await Carrito.findById(carrito._id).populate('items.productId');
    const items = (actualizado.items || [])
      .map((i) => ({ product: i.productId, quantity: i.quantity }))
      .filter((i) => i.product);
    res.json({ items });
  } catch (error) {
    console.error('Error al añadir producto al carrito:', error);
    res.status(500).json({ error: 'Error al añadir producto al carrito' });
  }
});

router.patch('/item/:productId', async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;

  try {
    const qty = Number(quantity);
    if (Number.isNaN(qty)) return res.status(400).json({ error: 'Cantidad inválida' });

    let carrito = await Carrito.findOne({ userId: req.usuario.id });
    if (!carrito) carrito = new Carrito({ userId: req.usuario.id, items: [] });

    const itemIndex = carrito.items.findIndex(item => item.productId.toString() === productId);
    if (itemIndex === -1) return res.status(404).json({ error: 'Producto no está en el carrito' });

    if (qty <= 0) {
      carrito.items.splice(itemIndex, 1);
    } else {
      carrito.items[itemIndex].quantity = qty;
    }

    await carrito.save();

    const actualizado = await Carrito.findById(carrito._id).populate('items.productId');
    const items = (actualizado.items || [])
      .map((i) => ({ product: i.productId, quantity: i.quantity }))
      .filter((i) => i.product);
    res.json({ items });
  } catch (error) {
    console.error('Error al actualizar carrito:', error);
    res.status(500).json({ error: 'Error al actualizar carrito' });
  }
});

router.delete('/item/:productId', async (req, res) => {
  const { productId } = req.params;

  try {
    const carrito = await Carrito.findOne({ userId: req.usuario.id });
    if (!carrito) return res.json({ items: [] });

    carrito.items = carrito.items.filter((item) => item.productId.toString() !== productId);
    await carrito.save();

    const actualizado = await Carrito.findById(carrito._id).populate('items.productId');
    const items = (actualizado.items || [])
      .map((i) => ({ product: i.productId, quantity: i.quantity }))
      .filter((i) => i.product);
    res.json({ items });
  } catch (error) {
    console.error('Error al eliminar del carrito:', error);
    res.status(500).json({ error: 'Error al eliminar del carrito' });
  }
});

router.delete('/', async (req, res) => {
  try {
    let carrito = await Carrito.findOne({ userId: req.usuario.id });
    if (!carrito) carrito = new Carrito({ userId: req.usuario.id, items: [] });

    carrito.items = [];
    await carrito.save();
    res.json({ items: [] });
  } catch (error) {
    console.error('Error al vaciar carrito:', error);
    res.status(500).json({ error: 'Error al vaciar carrito' });
  }
});

module.exports = router;

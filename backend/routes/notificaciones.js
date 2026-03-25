const express = require('express');
const router = express.Router();
const Notificacion = require('../models/Notificacion');
const { authenticate } = require('../middlewares/auth');

// GET /notificaciones - Obtener notificaciones del usuario
router.get('/', authenticate, async (req, res, next) => {
  try {
    const notifs = await Notificacion.find({ userId: req.usuario._id })
      .sort({ timestamp: -1 })
      .limit(50);
    res.json(notifs);
  } catch (error) {
    next(error);
  }
});

// PATCH /notificaciones/:id/leida - Marcar como leída
router.patch('/:id/leida', authenticate, async (req, res, next) => {
  try {
    const notif = await Notificacion.findOneAndUpdate(
      { _id: req.params.id, userId: req.usuario._id },
      { read: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ error: 'Notificación no encontrada' });
    res.json(notif);
  } catch (error) {
    next(error);
  }
});

// PATCH /notificaciones/leer-todas - Marcar todas como leídas
router.patch('/leer-todas', authenticate, async (req, res, next) => {
  try {
    await Notificacion.updateMany(
      { userId: req.usuario._id, read: false },
      { read: true }
    );
    res.json({ mensaje: 'Todas las notificaciones marcadas como leídas' });
  } catch (error) {
    next(error);
  }
});

// DELETE /notificaciones/:id - Eliminar notificación
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await Notificacion.deleteOne({ _id: req.params.id, userId: req.usuario._id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Notificación no encontrada' });
    res.json({ mensaje: 'Notificación eliminada' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

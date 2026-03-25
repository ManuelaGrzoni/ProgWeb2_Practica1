const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario');
const { authenticate, authorize } = require('../middlewares/auth');

router.use(authenticate);
router.use(authorize('administrador'));

router.get('/', async (req, res, next) => {
  try {
    const usuarios = await Usuario.find().select('-password').sort({ createdAt: -1 });
    res.json(usuarios);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const usuario = await Usuario.findById(req.params.id).select('-password');
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(usuario);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;
    const usuario = new Usuario({ username, email, password, role });
    await usuario.save();
    res.status(201).json(usuario.toJSON());
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { username, email, password, role, phone, addresses, profilePicture } = req.body;
    const usuario = await Usuario.findById(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (typeof username === 'string') usuario.username = username;
    if (typeof email === 'string') usuario.email = email;
    if (typeof role === 'string') usuario.role = role;
    if (typeof password === 'string' && password.length > 0) usuario.password = password;
    if (typeof phone === 'string') usuario.phone = phone;
    if (typeof profilePicture === 'string') usuario.profilePicture = profilePicture;
    if (Array.isArray(addresses)) usuario.addresses = addresses;

    await usuario.save();
    res.json(usuario.toJSON());
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const eliminado = await Usuario.findByIdAndDelete(req.params.id).select('-password');
    if (!eliminado) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ mensaje: 'Usuario eliminado' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

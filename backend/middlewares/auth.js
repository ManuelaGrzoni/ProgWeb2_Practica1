const jwt = require("jsonwebtoken");
const Usuario = require("../models/Usuario");

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Acceso denegado. No se proporcionó token de autenticación."
      });
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const usuario = await Usuario.findById(decoded.id).select("-password");

    if (!usuario) {
      return res.status(401).json({
        error: "Token inválido. Usuario no encontrado."
      });
    }

    req.usuario = usuario;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Token inválido." });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expirado." });
    }
    return res.status(500).json({ error: "Error en la autenticación." });
  }
};

const authorize = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        error: "Debe estar autenticado para acceder a este recurso."
      });
    }

    if (!rolesPermitidos.includes(req.usuario.role)) {
      return res.status(403).json({
        error: `Acceso denegado. Se requiere rol: ${rolesPermitidos.join(" o ")}.`
      });
    }

    next();
  };
};

module.exports = { authenticate, authorize };

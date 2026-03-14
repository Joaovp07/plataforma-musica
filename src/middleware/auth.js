// src/middleware/auth.js
// Middleware de autenticação — verifica o JWT em rotas protegidas

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protege rotas que exigem autenticação.
 * Lê o token do header Authorization: Bearer <token>
 * e injeta o usuário autenticado em req.user.
 */
const protect = async (req, res, next) => {
  try {
    // 1. Extrai o token do header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Acesso negado. Token não fornecido.',
      });
    }

    const token = authHeader.split(' ')[1];

    // 2. Verifica e decodifica o token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      const message =
        err.name === 'TokenExpiredError'
          ? 'Token expirado. Faça login novamente.'
          : 'Token inválido.';
      return res.status(401).json({ success: false, message });
    }

    // 3. Busca o usuário no banco (garante que ainda existe)
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado.',
      });
    }

    // 4. Injeta o usuário na requisição
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { protect };

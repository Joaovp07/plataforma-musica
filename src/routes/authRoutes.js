// src/routes/authRoutes.js
// Definição das rotas de autenticação com validações

const express = require('express');
const { body } = require('express-validator');
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// -------------------------------------------------------
// Validações reutilizáveis
// -------------------------------------------------------
const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Nome é obrigatório.')
    .isLength({ min: 2, max: 100 }).withMessage('Nome deve ter entre 2 e 100 caracteres.'),

  body('email')
    .trim()
    .notEmpty().withMessage('E-mail é obrigatório.')
    .isEmail().withMessage('Formato de e-mail inválido.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Senha é obrigatória.')
    .isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres.'),
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('E-mail é obrigatório.')
    .isEmail().withMessage('Formato de e-mail inválido.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Senha é obrigatória.'),
];

// -------------------------------------------------------
// Rotas públicas (não exigem autenticação)
// -------------------------------------------------------
// POST /api/auth/register — Cria nova conta
router.post('/register', registerValidation, register);

// POST /api/auth/login — Faz login e retorna JWT
router.post('/login', loginValidation, login);

// -------------------------------------------------------
// Rotas privadas (exigem token JWT válido)
// -------------------------------------------------------
// GET /api/auth/me — Retorna dados do usuário logado
router.get('/me', protect, getMe);

module.exports = router;

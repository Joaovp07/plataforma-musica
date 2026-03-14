// src/controllers/authController.js
// Lógica de negócio para autenticação: registro e login

const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');

// -------------------------------------------------------
// Utilitário: Gera um JWT assinado com o ID do usuário
// -------------------------------------------------------
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// -------------------------------------------------------
// POST /api/auth/register
// Cria um novo usuário
// -------------------------------------------------------
const register = async (req, res, next) => {
  try {
    // 1. Valida os dados de entrada (via express-validator)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos.',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const { name, email, password } = req.body;

    // 2. Verifica se o e-mail já está cadastrado
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'E-mail já cadastrado.',
      });
    }

    // 3. Cria o usuário (o hash da senha é feito no hook pre-save do model)
    const user = await User.create({ name, email, password });

    // 4. Gera o token JWT
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Conta criada com sucesso!',
      data: { user, token },
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------
// POST /api/auth/login
// Autentica um usuário existente
// -------------------------------------------------------
const login = async (req, res, next) => {
  try {
    // 1. Valida os dados de entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos.',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const { email, password } = req.body;

    // 2. Busca usuário pelo e-mail incluindo a senha (select: false no schema)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      // Mensagem genérica para não revelar se o e-mail existe
      return res.status(401).json({
        success: false,
        message: 'E-mail ou senha inválidos.',
      });
    }

    // 3. Compara a senha fornecida com o hash armazenado
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'E-mail ou senha inválidos.',
      });
    }

    // 4. Gera e retorna o token JWT
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login realizado com sucesso!',
      data: { user, token },
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------
// GET /api/auth/me
// Retorna os dados do usuário autenticado
// -------------------------------------------------------
const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    data: { user: req.user },
  });
};

module.exports = { register, login, getMe };

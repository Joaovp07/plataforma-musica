// src/routes/musicRoutes.js
// Definição das rotas de músicas — todas exigem autenticação

const express = require('express');
const { body } = require('express-validator');
const {
  uploadMusic,
  listMyMusic,
  getMusicById,
  deleteMusic,
  streamMusic,
} = require('../controllers/musicController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Todas as rotas aqui exigem autenticação
router.use(protect);

// -------------------------------------------------------
// Validação dos metadados enviados junto com o arquivo
// -------------------------------------------------------
const uploadValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Título é obrigatório.')
    .isLength({ max: 200 }).withMessage('Título deve ter no máximo 200 caracteres.'),

  body('artist')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Artista deve ter no máximo 200 caracteres.'),

  body('album')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Álbum deve ter no máximo 200 caracteres.'),

  body('genre')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Gênero deve ter no máximo 100 caracteres.'),
];

// -------------------------------------------------------
// Rotas
// -------------------------------------------------------

// POST /api/music/upload — Faz upload de uma música
// O multer processa o arquivo no campo "music" do form-data
router.post(
  '/upload',
  upload.single('music'), // Campo do arquivo no multipart/form-data
  uploadValidation,
  uploadMusic
);

// GET /api/music — Lista todas as músicas do usuário logado
// Query params: ?page=1&limit=20
router.get('/', listMyMusic);

// GET /api/music/:id — Retorna os detalhes de uma música
router.get('/:id', getMusicById);

// GET /api/music/:id/stream — Faz streaming/download do arquivo de áudio
router.get('/:id/stream', streamMusic);

// DELETE /api/music/:id — Exclui a música e o arquivo do disco
router.delete('/:id', deleteMusic);

module.exports = router;

// src/controllers/musicController.js
// Lógica de negócio para upload, listagem e exclusão de músicas

const fs = require('fs');
const path = require('path');
const { validationResult } = require('express-validator');
const Music = require('../models/Music');

// -------------------------------------------------------
// POST /api/music/upload
// Recebe o arquivo de música e salva os metadados no banco
// -------------------------------------------------------
const uploadMusic = async (req, res, next) => {
  try {
    // 1. Valida erros do express-validator (metadados)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Remove o arquivo do disco se a validação falhar
      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos.',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    // 2. Verifica se o arquivo foi enviado
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Arquivo de música não enviado. Use o campo "music".',
      });
    }

    const { title, artist, album, genre } = req.body;
    const { filename, originalname, mimetype, size, path: filePath } = req.file;

    // 3. Salva os metadados no banco de dados
    const music = await Music.create({
      title,
      artist,
      album,
      genre,
      filename,
      originalName: originalname,
      mimetype,
      size,
      path: filePath,
      owner: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Música enviada com sucesso!',
      data: { music },
    });
  } catch (error) {
    // Em caso de erro no banco, remove o arquivo já salvo no disco
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    next(error);
  }
};

// -------------------------------------------------------
// GET /api/music
// Lista todas as músicas do usuário autenticado
// -------------------------------------------------------
const listMyMusic = async (req, res, next) => {
  try {
    // Parâmetros de paginação (padrão: página 1, 20 itens por página)
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    // Busca somente as músicas do usuário logado
    const [musics, total] = await Promise.all([
      Music.find({ owner: req.user._id })
        .sort({ createdAt: -1 }) // Mais recentes primeiro
        .skip(skip)
        .limit(limit)
        .select('-path'), // Não expõe o caminho físico do arquivo
      Music.countDocuments({ owner: req.user._id }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        musics,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------
// GET /api/music/:id
// Retorna os detalhes de uma música específica do usuário
// -------------------------------------------------------
const getMusicById = async (req, res, next) => {
  try {
    const music = await Music.findOne({
      _id: req.params.id,
      owner: req.user._id,
    }).select('-path');

    if (!music) {
      return res.status(404).json({
        success: false,
        message: 'Música não encontrada.',
      });
    }

    res.status(200).json({
      success: true,
      data: { music },
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------
// DELETE /api/music/:id
// Remove a música do banco E o arquivo do disco
// -------------------------------------------------------
const deleteMusic = async (req, res, next) => {
  try {
    // Busca garantindo que a música pertence ao usuário logado
    const music = await Music.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!music) {
      return res.status(404).json({
        success: false,
        message: 'Música não encontrada.',
      });
    }

    // 1. Remove o arquivo físico do disco
    const filePath = path.resolve(music.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // 2. Remove o registro do banco de dados
    await music.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Música excluída com sucesso.',
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------
// GET /api/music/:id/stream
// Faz streaming do arquivo de áudio (download/reprodução)
// -------------------------------------------------------
const streamMusic = async (req, res, next) => {
  try {
    const music = await Music.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!music) {
      return res.status(404).json({
        success: false,
        message: 'Música não encontrada.',
      });
    }

    const filePath = path.resolve(music.path);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Arquivo de áudio não encontrado no servidor.',
      });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Suporte a Range Requests (permite seek/scrubbing no player)
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const fileStream = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': music.mimetype,
      });

      fileStream.pipe(res);
    } else {
      // Envio completo do arquivo
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': music.mimetype,
        'Content-Disposition': `inline; filename="${music.originalName}"`,
      });

      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    next(error);
  }
};

module.exports = { uploadMusic, listMyMusic, getMusicById, deleteMusic, streamMusic };

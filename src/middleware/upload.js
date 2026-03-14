// src/middleware/upload.js
// Configuração do Multer para upload de arquivos de música

const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Tipos MIME aceitos para arquivos de áudio
const ALLOWED_MIME_TYPES = [
  'audio/mpeg',       // .mp3
  'audio/mp4',        // .m4a
  'audio/wav',        // .wav
  'audio/wave',
  'audio/x-wav',
  'audio/ogg',        // .ogg
  'audio/flac',       // .flac
  'audio/x-flac',
  'audio/aac',        // .aac
];

// -------------------------------------------------------
// Configuração do storage: salva na pasta local
// -------------------------------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads/music');

    // Cria o diretório automaticamente se não existir
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    // Gera nome único com UUID para evitar colisões e preservar extensão original
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

// -------------------------------------------------------
// Filtro: rejeita arquivos que não são áudio
// -------------------------------------------------------
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true); // Aceita o arquivo
  } else {
    const error = new Error(
      `Tipo de arquivo não suportado: ${file.mimetype}. ` +
        'Formatos aceitos: MP3, MP4, WAV, OGG, FLAC, AAC.'
    );
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

// -------------------------------------------------------
// Instância do Multer com as configurações acima
// -------------------------------------------------------
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 50) * 1024 * 1024, // Converte MB para bytes
    files: 1, // Apenas 1 arquivo por vez
  },
});

module.exports = upload;

// src/models/Music.js
// Model da música — armazena metadados do arquivo e referência ao usuário dono

const mongoose = require('mongoose');

const musicSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Título é obrigatório'],
      trim: true,
      maxlength: [200, 'Título deve ter no máximo 200 caracteres'],
    },
    artist: {
      type: String,
      trim: true,
      maxlength: [200, 'Nome do artista deve ter no máximo 200 caracteres'],
      default: 'Desconhecido',
    },
    album: {
      type: String,
      trim: true,
      maxlength: [200, 'Nome do álbum deve ter no máximo 200 caracteres'],
    },
    genre: {
      type: String,
      trim: true,
      maxlength: [100, 'Gênero deve ter no máximo 100 caracteres'],
    },
    // Informações do arquivo físico
    filename: {
      type: String,
      required: true, // Nome gerado pelo servidor (UUID)
    },
    originalName: {
      type: String,
      required: true, // Nome original do arquivo enviado pelo usuário
    },
    mimetype: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true, // Tamanho em bytes
    },
    path: {
      type: String,
      required: true, // Caminho relativo no servidor
    },
    duration: {
      type: Number, // Duração em segundos (opcional, pode ser preenchido depois)
    },
    // Referência ao usuário dono da música
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Índice composto para buscas eficientes por dono
musicSchema.index({ owner: 1, createdAt: -1 });

// Remove campos internos ao serializar
musicSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Music', musicSchema);

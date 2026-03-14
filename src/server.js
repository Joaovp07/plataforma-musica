// src/server.js
// Ponto de entrada da aplicação — configura e inicia o servidor Express

require('dotenv').config(); // Carrega variáveis de ambiente do .env

const express = require('express');
const cors = require('cors');
const path = require('path');

const connectDB = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const musicRoutes = require('./routes/musicRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// -------------------------------------------------------
// 1. Conecta ao banco de dados
// -------------------------------------------------------
connectDB();

// -------------------------------------------------------
// 2. Middlewares globais
// -------------------------------------------------------

// Habilita CORS para requisições de outras origens (frontend, apps mobile etc.)
app.use(cors());

// Parseia JSON no body das requisições
app.use(express.json());

// Parseia dados de formulários URL-encoded
app.use(express.urlencoded({ extended: true }));

// -------------------------------------------------------
// 3. Rota de saúde (health check) — útil para monitoramento
// -------------------------------------------------------
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API Music Platform está online 🎵',
    timestamp: new Date().toISOString(),
  });
});

// -------------------------------------------------------
// 4. Rotas da API
// -------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/music', musicRoutes);

// -------------------------------------------------------
// 5. Rota 404 — nenhuma rota correspondente
// -------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
  });
});

// -------------------------------------------------------
// 6. Middleware de tratamento de erros
// DEVE ser o último middleware registrado
// -------------------------------------------------------
app.use(errorHandler);

// -------------------------------------------------------
// 7. Inicia o servidor
// -------------------------------------------------------
app.listen(PORT, () => {
  console.log(`
  ┌────────────────────────────────────────┐
  │   🎵 Music Platform API                │
  │   Ambiente : ${process.env.NODE_ENV || 'development'}               │
  │   Porta    : ${PORT}                          │
  │   URL      : http://localhost:${PORT}       │
  └────────────────────────────────────────┘
  `);
});

module.exports = app;

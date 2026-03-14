// src/middleware/errorHandler.js
// Middleware centralizado de tratamento de erros

/**
 * Captura todos os erros não tratados nas rotas e retorna
 * uma resposta JSON padronizada.
 * Deve ser registrado APÓS todas as rotas no server.js.
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Erro interno do servidor';

  // Erro de ID inválido do MongoDB (CastError)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'ID inválido.';
  }

  // Erro de campo duplicado no MongoDB (unique)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `O valor do campo '${field}' já está em uso.`;
  }

  // Erros de validação do Mongoose
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  }

  // Erros do Multer (upload de arquivos)
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    message = `Arquivo muito grande. Tamanho máximo: ${process.env.MAX_FILE_SIZE_MB || 50}MB.`;
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    statusCode = 400;
    message = 'Campo de arquivo inesperado. Use o campo "music".';
  }

  // Log detalhado apenas em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Erro:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;

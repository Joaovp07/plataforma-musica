// src/config/database.js
// Configuração e conexão com o MongoDB via Mongoose

const mongoose = require('mongoose');

/**
 * Conecta ao banco de dados MongoDB.
 * Usa a URI definida em MONGODB_URI no arquivo .env.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Opções recomendadas para evitar warnings do Mongoose
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`✅ MongoDB conectado: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Erro ao conectar ao MongoDB: ${error.message}`);
    process.exit(1); // Encerra o processo se não conseguir conectar
  }
};

// Eventos de conexão para monitoramento
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB desconectado.');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 MongoDB reconectado.');
});

module.exports = connectDB;

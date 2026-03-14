# 🎵 Music Platform API

Backend de uma plataforma de upload de músicas construída com **Node.js**, **Express** e **MongoDB**.

---

## 🚀 Como rodar o projeto

### Pré-requisitos

- [Node.js](https://nodejs.org/) v18+
- [MongoDB](https://www.mongodb.com/try/download/community) rodando localmente **ou** uma URI do [MongoDB Atlas](https://www.mongodb.com/atlas)

### 1. Clone e instale as dependências

```bash
git clone <url-do-repositorio>
cd music-platform
npm install
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/music_platform
JWT_SECRET=troque_por_uma_chave_forte_e_aleatoria
JWT_EXPIRES_IN=7d
UPLOAD_DIR=uploads/music
MAX_FILE_SIZE_MB=50
```

> ⚠️ **Nunca commite o arquivo `.env` com dados reais!**

### 3. Inicie o servidor

```bash
# Produção
npm start

# Desenvolvimento (com hot-reload)
npm run dev
```

O servidor estará disponível em `http://localhost:3000`.

---

## 📁 Estrutura do projeto

```
music-platform/
├── src/
│   ├── config/
│   │   └── database.js        # Conexão com MongoDB
│   ├── controllers/
│   │   ├── authController.js  # Lógica de registro e login
│   │   └── musicController.js # Lógica de upload, listagem e exclusão
│   ├── middleware/
│   │   ├── auth.js            # Verificação do JWT (proteção de rotas)
│   │   ├── errorHandler.js    # Tratamento centralizado de erros
│   │   └── upload.js          # Configuração do Multer
│   ├── models/
│   │   ├── User.js            # Schema do usuário
│   │   └── Music.js           # Schema da música
│   ├── routes/
│   │   ├── authRoutes.js      # Rotas /api/auth
│   │   └── musicRoutes.js     # Rotas /api/music
│   └── server.js              # Entry point da aplicação
├── uploads/
│   └── music/                 # Arquivos de música armazenados aqui
├── .env.example
├── .gitignore
└── package.json
```

---

## 📡 Endpoints da API

### Autenticação — `/api/auth`

| Método | Rota              | Autenticação | Descrição                        |
|--------|-------------------|:------------:|----------------------------------|
| POST   | `/register`       | ❌           | Cria uma nova conta              |
| POST   | `/login`          | ❌           | Faz login e retorna um JWT       |
| GET    | `/me`             | ✅           | Retorna dados do usuário logado  |

### Músicas — `/api/music`

| Método | Rota              | Autenticação | Descrição                              |
|--------|-------------------|:------------:|----------------------------------------|
| POST   | `/upload`         | ✅           | Faz upload de uma música               |
| GET    | `/`               | ✅           | Lista suas músicas (paginada)          |
| GET    | `/:id`            | ✅           | Detalhes de uma música                 |
| GET    | `/:id/stream`     | ✅           | Streaming/download do arquivo          |
| DELETE | `/:id`            | ✅           | Exclui a música e o arquivo do disco   |

---

## 🧪 Exemplos de uso com cURL

### Registrar usuário
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"João Silva","email":"joao@email.com","password":"senha123"}'
```

### Fazer login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"joao@email.com","password":"senha123"}'
```

### Upload de música (substitua `<TOKEN>` pelo JWT retornado no login)
```bash
curl -X POST http://localhost:3000/api/music/upload \
  -H "Authorization: Bearer <TOKEN>" \
  -F "music=@/caminho/para/musica.mp3" \
  -F "title=Nome da Música" \
  -F "artist=Nome do Artista" \
  -F "album=Nome do Álbum" \
  -F "genre=Rock"
```

### Listar músicas
```bash
curl http://localhost:3000/api/music \
  -H "Authorization: Bearer <TOKEN>"
```

### Listar músicas com paginação
```bash
curl "http://localhost:3000/api/music?page=1&limit=10" \
  -H "Authorization: Bearer <TOKEN>"
```

### Excluir uma música
```bash
curl -X DELETE http://localhost:3000/api/music/<MUSIC_ID> \
  -H "Authorization: Bearer <TOKEN>"
```

---

## 🎵 Formatos de áudio aceitos

MP3, MP4/M4A, WAV, OGG, FLAC, AAC

---

## 🔒 Segurança

- Senhas são hasheadas com **bcryptjs** (salt rounds: 12)
- Autenticação via **JWT** com expiração configurável
- O campo `password` nunca é retornado nas respostas da API
- Usuários só podem ver e excluir suas próprias músicas
- Validação de tipo MIME para rejeitar arquivos não-áudio

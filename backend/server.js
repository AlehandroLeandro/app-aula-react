require('dotenv').config();
const { createApp } = require('./app');
const { abrirBanco } = require('./db');

const { JWT_SECRET, DB_FILE = 'app.db' } = process.env;
const PORT = process.env.PORT || 3000;
if (!JWT_SECRET) {
  console.error('JWT_SECRET não definido. Crie backend/.env (veja .env.example).');
  process.exit(1);
}

createApp({ db: abrirBanco(DB_FILE), jwtSecret: JWT_SECRET }).listen(PORT, () => {
  console.log(`Backend ouvindo na porta ${PORT}`);
});

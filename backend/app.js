const express = require('express');
const { ErroApi } = require('./erros');
const { authRoutes } = require('./auth-routes');

// Monta o app sem subir porta. Rotas futuras (Imagem) usam exigirToken({ db, jwtSecret }).
function createApp({ db, jwtSecret }) {
  const app = express();
  app.use(express.json());

  app.use('/auth', authRoutes({ db, jwtSecret }));

  app.use((req, res, next) => next(new ErroApi(404, 'NAO_ENCONTRADA', 'Rota não encontrada.')));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    let { status, codigo, message } = err;
    if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
      status = 400; codigo = 'DADOS_INVALIDOS'; message = 'O corpo da requisição é inválido.';
    } else if (!codigo) {
      console.error(err);
      status = 500; codigo = 'ERRO_INTERNO'; message = 'Erro interno do servidor.';
    }
    res.status(status).json({ erro: { codigo, mensagem: message } });
  });

  return app;
}

module.exports = { createApp };

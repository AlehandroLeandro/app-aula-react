const express = require('express');
const jwt = require('jsonwebtoken');
const { ErroApi } = require('./erros');
const { exigirToken } = require('./auth-middleware');

const dadosInvalidos = (msg) => new ErroApi(400, 'DADOS_INVALIDOS', msg);

function lerCredenciais(body) {
  const { nome, senha } = body && typeof body === 'object' ? body : {};
  if (typeof nome !== 'string' || typeof senha !== 'string') {
    throw dadosInvalidos('Informe nome e senha.');
  }
  return { nome: nome.trim(), senha };
}

function authRoutes({ db, jwtSecret }) {
  const router = express.Router();
  const emitir = (u) => ({
    token: jwt.sign({ sub: u.id }, jwtSecret, { expiresIn: '7d' }),
    usuario: { id: u.id, nome: u.nome },
  });

  router.post('/cadastro', (req, res) => {
    const { nome, senha } = lerCredenciais(req.body);
    if (nome.length < 2 || nome.length > 30) throw dadosInvalidos('O nome deve ter de 2 a 30 caracteres.');
    if (senha.length < 4) throw dadosInvalidos('A senha deve ter pelo menos 4 caracteres.');
    if (db.prepare('SELECT 1 FROM usuarios WHERE nome = ?').get(nome)) {
      throw new ErroApi(409, 'NOME_EM_USO', 'Este nome já está em uso.');
    }
    const { lastInsertRowid } = db.prepare('INSERT INTO usuarios (nome, senha) VALUES (?, ?)').run(nome, senha);
    res.status(201).json(emitir({ id: Number(lastInsertRowid), nome }));
  });

  router.post('/login', (req, res) => {
    const { nome, senha } = lerCredenciais(req.body);
    const u = db.prepare('SELECT id, nome, senha FROM usuarios WHERE nome = ?').get(nome);
    if (!u || u.senha !== senha) {
      throw new ErroApi(401, 'CREDENCIAIS_INVALIDAS', 'Nome ou senha incorretos.');
    }
    res.json(emitir(u));
  });

  router.get('/eu', exigirToken({ db, jwtSecret }), (req, res) => {
    res.json({ usuario: req.usuario });
  });

  return router;
}

module.exports = { authRoutes };

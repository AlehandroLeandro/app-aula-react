const express = require('express');
const multer = require('multer');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { ErroApi } = require('./erros');
const { exigirToken } = require('./auth-middleware');

const LIMITE_BYTES = 5 * 1024 * 1024;

// O tipo vem dos bytes, nunca do mimetype informado pelo cliente.
function tipoPelosBytes(b) {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { tipo: 'image/jpeg', ext: '.jpg' };
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { tipo: 'image/png', ext: '.png' };
  }
  return null;
}

function imagemDaLinha(l) {
  return {
    id: l.id,
    descricao: l.descricao,
    favorita: Boolean(l.favorita),
    criadaEm: l.criada_em,
    urlArquivo: `/imagens/${l.id}/arquivo`,
  };
}

// Memória em vez de disco: se der 413/415/502, nada chegou a ser gravado.
const receberFoto = multer({ storage: multer.memoryStorage(), limits: { fileSize: LIMITE_BYTES, files: 1 } }).single('foto');

function imagensRoutes({ db, jwtSecret, descritor, uploadsDir }) {
  const router = express.Router();

  const lerFoto = (req, res, next) => receberFoto(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return next(new ErroApi(413, 'ARQUIVO_GRANDE', 'A Imagem deve ter no máximo 5 MB.'));
    if (err instanceof multer.MulterError) return next(new ErroApi(400, 'DADOS_INVALIDOS', 'Envie a Imagem no campo "foto".'));
    next(err);
  });

  router.post('/', exigirToken({ db, jwtSecret }), lerFoto, async (req, res) => {
    if (!req.file) throw new ErroApi(400, 'DADOS_INVALIDOS', 'Envie a Imagem no campo "foto".');
    const bytes = req.file.buffer;
    const formato = tipoPelosBytes(bytes);
    if (!formato) throw new ErroApi(415, 'TIPO_INVALIDO', 'A Imagem deve ser JPEG ou PNG.');

    let descricao;
    try {
      descricao = await descritor(bytes, formato.tipo);
    } catch {
      descricao = '';
    }
    descricao = typeof descricao === 'string' ? descricao.trim() : '';
    if (!descricao) throw new ErroApi(502, 'FALHA_NA_DESCRICAO', 'Não foi possível gerar a Descrição. Tente de novo.');

    fs.mkdirSync(uploadsDir, { recursive: true });
    const nomeArquivo = randomUUID() + formato.ext;
    const caminho = path.join(uploadsDir, nomeArquivo);
    fs.writeFileSync(caminho, bytes);
    try {
      const criadaEm = new Date().toISOString();
      const { lastInsertRowid } = db.prepare(
        'INSERT INTO imagens (usuario_id, caminho, tipo, descricao, favorita, criada_em) VALUES (?, ?, ?, ?, 0, ?)',
      ).run(req.usuario.id, nomeArquivo, formato.tipo, descricao, criadaEm);
      res.status(201).json(imagemDaLinha({ id: Number(lastInsertRowid), descricao, favorita: 0, criada_em: criadaEm }));
    } catch (e) {
      fs.rmSync(caminho, { force: true });
      throw e;
    }
  });

  const auth = exigirToken({ db, jwtSecret });

  // Linha do dono ou 404 (inexistente, de outro Usuário ou id não numérico).
  const linhaDoDono = (req) => {
    const linha = /^\d+$/.test(req.params.id)
      ? db.prepare('SELECT * FROM imagens WHERE id = ? AND usuario_id = ?').get(Number(req.params.id), req.usuario.id)
      : undefined;
    if (!linha) throw new ErroApi(404, 'NAO_ENCONTRADA', 'Imagem não encontrada.');
    return linha;
  };

  router.get('/', auth, (req, res) => {
    const linhas = db.prepare('SELECT * FROM imagens WHERE usuario_id = ? ORDER BY criada_em DESC, id DESC').all(req.usuario.id);
    res.json(linhas.map(imagemDaLinha));
  });

  router.get('/:id', auth, (req, res) => res.json(imagemDaLinha(linhaDoDono(req))));

  router.get('/:id/arquivo', auth, (req, res, next) => {
    const linha = linhaDoDono(req);
    res.type(linha.tipo).sendFile(path.join(uploadsDir, linha.caminho), { dotfiles: 'allow' }, (err) => {
      if (err && !res.headersSent) next(new ErroApi(404, 'NAO_ENCONTRADA', 'Imagem não encontrada.'));
    });
  });

  router.put('/:id/favorita', auth, (req, res) => {
    const linha = linhaDoDono(req);
    const favorita = req.body?.favorita;
    if (typeof favorita !== 'boolean') throw new ErroApi(400, 'DADOS_INVALIDOS', 'Envie "favorita" como true ou false.');
    db.prepare('UPDATE imagens SET favorita = ? WHERE id = ?').run(favorita ? 1 : 0, linha.id);
    res.json(imagemDaLinha({ ...linha, favorita }));
  });

  router.delete('/:id', auth, (req, res) => {
    const linha = linhaDoDono(req);
    db.prepare('DELETE FROM imagens WHERE id = ?').run(linha.id);
    fs.rmSync(path.join(uploadsDir, linha.caminho), { force: true });
    res.status(204).end();
  });

  return router;
}

module.exports = { imagensRoutes };

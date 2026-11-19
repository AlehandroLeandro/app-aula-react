const { DatabaseSync } = require('node:sqlite');

// Abre o banco (arquivo ou ':memory:') e cria as tabelas de Usuários e Imagens se não existir.
function abrirBanco(arquivo = ':memory:') {
  const db = new DatabaseSync(arquivo);
  db.exec(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE COLLATE NOCASE,
    senha TEXT NOT NULL
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS imagens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    caminho TEXT NOT NULL,
    tipo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    favorita INTEGER NOT NULL DEFAULT 0,
    criada_em TEXT NOT NULL
  )`);
  return db;
}

module.exports = { abrirBanco };

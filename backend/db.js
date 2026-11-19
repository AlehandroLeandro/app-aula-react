const { DatabaseSync } = require('node:sqlite');

// Abre o banco (arquivo ou ':memory:') e cria a tabela de Usuários se não existir.
function abrirBanco(arquivo = ':memory:') {
  const db = new DatabaseSync(arquivo);
  db.exec(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE COLLATE NOCASE,
    senha TEXT NOT NULL
  )`);
  return db;
}

module.exports = { abrirBanco };

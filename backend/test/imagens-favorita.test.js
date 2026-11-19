const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');
const { createApp } = require('../app');
const { abrirBanco } = require('../db');

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(50, 1)]);

// Dois Usuários, banco em memória e uploads em pasta temporária; Ana já tem uma Imagem.
async function preparar() {
  const uploadsDir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'uploads-')), 'uploads');
  const db = abrirBanco(':memory:');
  const app = createApp({ db, jwtSecret: 's', descritor: async () => 'Uma foto.', uploadsDir });
  const cad = async (nome) => (await request(app).post('/auth/cadastro').send({ nome, senha: '1234' })).body.token;
  const ana = await cad('Ana');
  const bia = await cad('Bia');
  const com = (m, url, token) => request(app)[m](url).set('Authorization', `Bearer ${token}`);
  const img = (await com('post', '/imagens', ana).attach('foto', JPEG, { filename: 'f', contentType: 'image/jpeg' })).body;
  const favorita = async (token = ana) => (await com('get', `/imagens/${img.id}`, token)).body.favorita;
  return { app, ana, bia, com, img, favorita };
}

const erro = (r, status, codigo) => { assert.strictEqual(r.status, status); assert.strictEqual(r.body.erro.codigo, codigo); };

test('PUT favorita sem token dá 401 NAO_AUTENTICADO', async () => {
  const t = await preparar();
  erro(await request(t.app).put(`/imagens/${t.img.id}/favorita`).send({ favorita: true }), 401, 'NAO_AUTENTICADO');
  assert.strictEqual(await t.favorita(), false);
});

test('true marca (idempotente) e false desmarca; GET lista e detalhe refletem', async () => {
  const t = await preparar();
  const url = `/imagens/${t.img.id}/favorita`;
  for (let i = 0; i < 2; i++) {
    const r = await t.com('put', url, t.ana).send({ favorita: true });
    assert.strictEqual(r.status, 200);
    assert.deepStrictEqual(r.body, { ...t.img, favorita: true });
  }
  assert.strictEqual(await t.favorita(), true);
  assert.strictEqual((await t.com('get', '/imagens', t.ana)).body[0].favorita, true);
  const r = await t.com('put', url, t.ana).send({ favorita: false });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.favorita, false);
  assert.strictEqual(await t.favorita(), false);
});

test('corpo inválido dá 400 DADOS_INVALIDOS e não altera a Imagem', async () => {
  const t = await preparar();
  const url = `/imagens/${t.img.id}/favorita`;
  await t.com('put', url, t.ana).send({ favorita: true });
  for (const corpo of [{}, { favorita: 'true' }, { favorita: 1 }, { favorita: null }, { favorita: 0 }]) {
    erro(await t.com('put', url, t.ana).send(corpo), 400, 'DADOS_INVALIDOS');
  }
  erro(await t.com('put', url, t.ana), 400, 'DADOS_INVALIDOS');
  assert.strictEqual(await t.favorita(), true);
});

test('Imagem inexistente, de outro Usuário ou id não numérico dá 404 e nada muda', async () => {
  const t = await preparar();
  erro(await t.com('put', `/imagens/${t.img.id}/favorita`, t.bia).send({ favorita: true }), 404, 'NAO_ENCONTRADA');
  erro(await t.com('put', '/imagens/9999/favorita', t.ana).send({ favorita: true }), 404, 'NAO_ENCONTRADA');
  erro(await t.com('put', '/imagens/abc/favorita', t.ana).send({ favorita: true }), 404, 'NAO_ENCONTRADA');
  assert.strictEqual(await t.favorita(), false);
});

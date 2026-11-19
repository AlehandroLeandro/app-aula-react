const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');
const { createApp } = require('../app');
const { abrirBanco } = require('../db');

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(50, 1)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(50, 2)]);

// Dois Usuários, banco em memória e uploads em pasta temporária própria.
async function preparar() {
  const uploadsDir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'uploads-')), 'uploads');
  const db = abrirBanco(':memory:');
  const app = createApp({ db, jwtSecret: 's', descritor: async () => 'Uma foto.', uploadsDir });
  const cad = async (nome) => (await request(app).post('/auth/cadastro').send({ nome, senha: '1234' })).body.token;
  const ana = await cad('Ana');
  const bia = await cad('Bia');
  const enviar = async (token, buf, tipo) =>
    (await request(app).post('/imagens').set('Authorization', `Bearer ${token}`)
      .attach('foto', buf, { filename: 'f', contentType: tipo })).body;
  const com = (m, url, token) => request(app)[m](url).set('Authorization', `Bearer ${token}`);
  return { app, db, uploadsDir, ana, bia, enviar, com };
}

const erro404 = (r) => { assert.strictEqual(r.status, 404); assert.strictEqual(r.body.erro.codigo, 'NAO_ENCONTRADA'); };

test('as 4 rotas dão 401 NAO_AUTENTICADO sem token', async () => {
  const t = await preparar();
  for (const [m, url] of [['get', '/imagens'], ['get', '/imagens/1'], ['get', '/imagens/1/arquivo'], ['delete', '/imagens/1']]) {
    const r = await request(t.app)[m](url);
    assert.strictEqual(r.status, 401);
    assert.strictEqual(r.body.erro.codigo, 'NAO_AUTENTICADO');
  }
});

test('listagem: só do dono, criadaEm decrescente (desempate por id), [] se vazio', async () => {
  const t = await preparar();
  assert.deepStrictEqual((await t.com('get', '/imagens', t.ana)).body, []);
  const a1 = await t.enviar(t.ana, JPEG, 'image/jpeg');
  const a2 = await t.enviar(t.ana, PNG, 'image/png');
  const b1 = await t.enviar(t.bia, JPEG, 'image/jpeg');
  t.db.prepare('UPDATE imagens SET criada_em = ? WHERE id = ?').run('2020-01-01T00:00:00.000Z', a1.id);
  t.db.prepare('UPDATE imagens SET criada_em = ? WHERE id = ?').run('2021-01-01T00:00:00.000Z', a2.id);
  const lista = (await t.com('get', '/imagens', t.ana)).body;
  assert.deepStrictEqual(lista.map((i) => i.id), [a2.id, a1.id]);
  assert.deepStrictEqual(Object.keys(lista[0]).sort(), ['criadaEm', 'descricao', 'favorita', 'id', 'urlArquivo']);
  assert.deepStrictEqual((await t.com('get', '/imagens', t.bia)).body.map((i) => i.id), [b1.id]);

  // mesma criadaEm: id decrescente
  t.db.prepare('UPDATE imagens SET criada_em = ?').run('2022-01-01T00:00:00.000Z');
  assert.deepStrictEqual((await t.com('get', '/imagens', t.ana)).body.map((i) => i.id), [a2.id, a1.id]);
});

test('detalhe: 200 do dono; 404 inexistente, de outro Usuário e id não numérico', async () => {
  const t = await preparar();
  const img = await t.enviar(t.ana, JPEG, 'image/jpeg');
  const r = await t.com('get', `/imagens/${img.id}`, t.ana);
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.body, img);
  erro404(await t.com('get', '/imagens/9999', t.ana));
  erro404(await t.com('get', `/imagens/${img.id}`, t.bia));
  erro404(await t.com('get', '/imagens/abc', t.ana));
});

test('arquivo: bytes com Content-Type correto; 404 nos 3 casos', async () => {
  const t = await preparar();
  const j = await t.enviar(t.ana, JPEG, 'image/jpeg');
  const p = await t.enviar(t.ana, PNG, 'image/png');
  const bin = (res, cb) => { const c = []; res.on("data", (d) => c.push(d)); res.on("end", () => cb(null, Buffer.concat(c))); };
  const rj = await t.com("get", j.urlArquivo, t.ana).parse(bin);
  assert.strictEqual(rj.status, 200);
  assert.match(rj.headers['content-type'], /^image\/jpeg/);
  assert.deepStrictEqual(rj.body, JPEG);
  const rp = await t.com("get", p.urlArquivo, t.ana).parse(bin);
  assert.match(rp.headers['content-type'], /^image\/png/);
  assert.deepStrictEqual(rp.body, PNG);
  erro404(await t.com('get', '/imagens/9999/arquivo', t.ana));
  erro404(await t.com('get', j.urlArquivo, t.bia));
  erro404(await t.com('get', '/imagens/abc/arquivo', t.ana));
});

test('DELETE do dono: 204, apaga registro e arquivo, GET seguinte 404', async () => {
  const t = await preparar();
  const img = await t.enviar(t.ana, JPEG, 'image/jpeg');
  const r = await t.com('delete', `/imagens/${img.id}`, t.ana);
  assert.strictEqual(r.status, 204);
  assert.strictEqual(r.text, '');
  assert.strictEqual(t.db.prepare('SELECT * FROM imagens').all().length, 0);
  assert.deepStrictEqual(fs.readdirSync(t.uploadsDir), []);
  erro404(await t.com('get', `/imagens/${img.id}`, t.ana));
  erro404(await t.com('delete', `/imagens/${img.id}`, t.ana));
});

test('DELETE de arquivo já ausente em disco ainda apaga o registro', async () => {
  const t = await preparar();
  const img = await t.enviar(t.ana, JPEG, 'image/jpeg');
  for (const f of fs.readdirSync(t.uploadsDir)) fs.rmSync(path.join(t.uploadsDir, f));
  assert.strictEqual((await t.com('delete', `/imagens/${img.id}`, t.ana)).status, 204);
  assert.strictEqual(t.db.prepare('SELECT * FROM imagens').all().length, 0);
});

test('DELETE de outro Usuário, inexistente ou não numérico: 404 e nada apagado', async () => {
  const t = await preparar();
  const img = await t.enviar(t.ana, JPEG, 'image/jpeg');
  erro404(await t.com('delete', `/imagens/${img.id}`, t.bia));
  erro404(await t.com('delete', '/imagens/9999', t.bia));
  erro404(await t.com('delete', '/imagens/abc', t.ana));
  assert.strictEqual(t.db.prepare('SELECT * FROM imagens').all().length, 1);
  assert.strictEqual(fs.readdirSync(t.uploadsDir).length, 1);
  assert.strictEqual((await t.com('get', `/imagens/${img.id}`, t.ana)).status, 200);
});

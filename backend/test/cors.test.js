const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../app');
const { abrirBanco } = require('../db');

const novoApp = () => createApp({ db: abrirBanco(':memory:'), jwtSecret: 'segredo-de-teste' });

test('rota comum devolve Access-Control-Allow-Origin *', async () => {
  const res = await request(novoApp()).post('/auth/cadastro').send({ nome: 'Ana', senha: '1234' });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.headers['access-control-allow-origin'], '*');
});

test('preflight OPTIONS responde 204 com os headers de CORS', async () => {
  const res = await request(novoApp())
    .options('/imagens')
    .set('Origin', 'http://localhost:8081')
    .set('Access-Control-Request-Method', 'POST')
    .set('Access-Control-Request-Headers', 'Authorization, Content-Type');
  assert.strictEqual(res.status, 204);
  assert.strictEqual(res.headers['access-control-allow-origin'], '*');
  assert.match(res.headers['access-control-allow-headers'], /Authorization/);
  assert.match(res.headers['access-control-allow-headers'], /Content-Type/);
  for (const m of ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']) {
    assert.match(res.headers['access-control-allow-methods'], new RegExp(m));
  }
});

const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../app');
const { abrirBanco } = require('../db');

const SEGREDO = 'segredo-de-teste';
const novoApp = () => createApp({ db: abrirBanco(':memory:'), jwtSecret: SEGREDO });
const cadastrar = (app, body) => request(app).post('/auth/cadastro').send(body);

function esperaErro(res, status, codigo) {
  assert.strictEqual(res.status, status);
  assert.strictEqual(res.body.erro.codigo, codigo);
  assert.strictEqual(typeof res.body.erro.mensagem, 'string');
  assert.deepStrictEqual(Object.keys(res.body), ['erro']);
}

test('cadastro válido devolve 201 com token e usuario sem senha', async () => {
  const res = await cadastrar(novoApp(), { nome: '  Ana  ', senha: '1234' });
  assert.strictEqual(res.status, 201);
  assert.ok(res.body.token);
  assert.deepStrictEqual(res.body.usuario, { id: 1, nome: 'Ana' });
});

test('nome repetido com outra caixa dá 409 NOME_EM_USO', async () => {
  const app = novoApp();
  await cadastrar(app, { nome: 'ana', senha: '1234' });
  esperaErro(await cadastrar(app, { nome: 'Ana', senha: '1234' }), 409, 'NOME_EM_USO');
});

test('validação do cadastro dá 400 DADOS_INVALIDOS', async () => {
  const app = novoApp();
  const ruins = [
    { nome: 'a', senha: '1234' },
    { nome: ' a ', senha: '1234' },
    { nome: 'a'.repeat(31), senha: '1234' },
    { nome: 'Ana', senha: '123' },
    { nome: 5, senha: '1234' },
    { nome: 'Ana', senha: 1234 },
    {},
  ];
  for (const body of ruins) esperaErro(await cadastrar(app, body), 400, 'DADOS_INVALIDOS');
  esperaErro(await request(app).post('/auth/cadastro'), 400, 'DADOS_INVALIDOS');
  esperaErro(await request(app).post('/auth/login').send({ nome: 'Ana' }), 400, 'DADOS_INVALIDOS');
});

test('nome com 30 caracteres é aceito', async () => {
  const res = await cadastrar(novoApp(), { nome: 'a'.repeat(30), senha: '1234' });
  assert.strictEqual(res.status, 201);
});

test('login com outra caixa e senha correta dá 200', async () => {
  const app = novoApp();
  await cadastrar(app, { nome: 'Ana', senha: '1234' });
  const res = await request(app).post('/auth/login').send({ nome: 'ANA', senha: '1234' });
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.token);
  assert.deepStrictEqual(res.body.usuario, { id: 1, nome: 'Ana' });
});

test('login com senha errada ou nome inexistente dá 401 com a mesma mensagem', async () => {
  const app = novoApp();
  await cadastrar(app, { nome: 'Ana', senha: '1234' });
  const a = await request(app).post('/auth/login').send({ nome: 'Ana', senha: 'xxxx' });
  const b = await request(app).post('/auth/login').send({ nome: 'Bia', senha: '1234' });
  esperaErro(a, 401, 'CREDENCIAIS_INVALIDAS');
  esperaErro(b, 401, 'CREDENCIAIS_INVALIDAS');
  assert.strictEqual(a.body.erro.mensagem, b.body.erro.mensagem);
});

test('GET /auth/eu com token válido devolve o usuario', async () => {
  const app = novoApp();
  const { body } = await cadastrar(app, { nome: 'Ana', senha: '1234' });
  const res = await request(app).get('/auth/eu').set('Authorization', `Bearer ${body.token}`);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, { usuario: { id: 1, nome: 'Ana' } });
});

test('token expira em 7 dias', async () => {
  const { body } = await cadastrar(novoApp(), { nome: 'Ana', senha: '1234' });
  const { iat, exp } = jwt.decode(body.token);
  assert.strictEqual(exp - iat, 7 * 24 * 3600);
});

test('GET /auth/eu sem token, malformado, outro segredo ou vencido dá 401', async () => {
  const app = novoApp();
  const get = (h) => (h ? request(app).get('/auth/eu').set('Authorization', h) : request(app).get('/auth/eu'));
  esperaErro(await get(), 401, 'NAO_AUTENTICADO');
  esperaErro(await get('Bearer lixo'), 401, 'NAO_AUTENTICADO');
  esperaErro(await get('Token abc'), 401, 'NAO_AUTENTICADO');
  esperaErro(await get(`Bearer ${jwt.sign({ sub: 1 }, 'outro')}`), 401, 'NAO_AUTENTICADO');
  esperaErro(await get(`Bearer ${jwt.sign({ sub: 1 }, SEGREDO, { expiresIn: -10 })}`), 401, 'NAO_AUTENTICADO');
});

test('JSON malformado dá 400 e rota inexistente dá 404 no formato de erro', async () => {
  const app = novoApp();
  const ruim = await request(app).post('/auth/cadastro').set('Content-Type', 'application/json').send('{nome:');
  esperaErro(ruim, 400, 'DADOS_INVALIDOS');
  esperaErro(await request(app).get('/nada'), 404, 'NAO_ENCONTRADA');
});

test('erro inesperado dá 500 ERRO_INTERNO', async () => {
  const db = abrirBanco(':memory:');
  const app = createApp({ db, jwtSecret: SEGREDO });
  db.exec('DROP TABLE usuarios');
  const log = console.error;
  console.error = () => {};
  const res = await cadastrar(app, { nome: 'Ana', senha: '1234' });
  console.error = log;
  esperaErro(res, 500, 'ERRO_INTERNO');
});

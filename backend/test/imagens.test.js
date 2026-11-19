const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');
const { createApp } = require('../app');
const { abrirBanco } = require('../db');
const { descrever, PROMPT } = require('../descritor');

const SEGREDO = 'segredo-de-teste';
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(100)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(100)]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png)$/;

// Cada teste tem banco em memória e pasta de uploads própria (dentro de um diretório temporário).
async function preparar(descritor = async () => '  Um cachorro caramelo.  ') {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'uploads-'));
  const uploadsDir = path.join(raiz, 'uploads'); // não existe ainda
  const db = abrirBanco(':memory:');
  const app = createApp({ db, jwtSecret: SEGREDO, descritor, uploadsDir });
  const cad = await request(app).post('/auth/cadastro').send({ nome: 'Ana', senha: '1234' });
  const arquivos = () => (fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : []);
  const linhas = () => db.prepare('SELECT * FROM imagens').all();
  const enviar = (buf, { token = cad.body.token, nome = 'foto.jpg', tipo = 'image/jpeg', campo = 'foto' } = {}) => {
    const r = request(app).post('/imagens');
    if (token) r.set('Authorization', `Bearer ${token}`);
    return buf ? r.attach(campo, buf, { filename: nome, contentType: tipo }) : r;
  };
  return { app, db, enviar, arquivos, linhas, uploadsDir, usuario: cad.body.usuario, token: cad.body.token };
}

function esperaErro(res, status, codigo) {
  assert.strictEqual(res.status, status);
  assert.strictEqual(res.body.erro.codigo, codigo);
  assert.strictEqual(typeof res.body.erro.mensagem, 'string');
}

test('sem token dá 401 NAO_AUTENTICADO e nada é salvo', async () => {
  const t = await preparar();
  esperaErro(await t.enviar(JPEG, { token: null }), 401, 'NAO_AUTENTICADO');
  assert.deepStrictEqual(t.arquivos(), []);
  assert.strictEqual(t.linhas().length, 0);
});

test('sem campo foto dá 400 DADOS_INVALIDOS', async () => {
  const t = await preparar();
  esperaErro(await t.enviar(null), 400, 'DADOS_INVALIDOS');
  esperaErro(await t.enviar(JPEG, { campo: 'outra' }), 400, 'DADOS_INVALIDOS');
  assert.strictEqual(t.linhas().length, 0);
});

test('acima de 5 MB dá 413 ARQUIVO_GRANDE e nada fica em disco nem no banco', async () => {
  const t = await preparar();
  const grande = Buffer.concat([JPEG, Buffer.alloc(5 * 1024 * 1024)]);
  esperaErro(await t.enviar(grande), 413, 'ARQUIVO_GRANDE');
  assert.deepStrictEqual(t.arquivos(), []);
  assert.strictEqual(t.linhas().length, 0);
});

test('não JPEG/PNG dá 415 TIPO_INVALIDO, mesmo com mimetype mentindo', async () => {
  const t = await preparar();
  esperaErro(await t.enviar(Buffer.from('%PDF-1.4 texto'), { tipo: 'image/jpeg', nome: 'a.jpg' }), 415, 'TIPO_INVALIDO');
  esperaErro(await t.enviar(Buffer.from('GIF89a....'), { tipo: 'image/png', nome: 'a.png' }), 415, 'TIPO_INVALIDO');
  assert.deepStrictEqual(t.arquivos(), []);
  assert.strictEqual(t.linhas().length, 0);
});

test('envio válido (JPEG e PNG) dá 201 no formato do contrato, ligado ao Usuário', async () => {
  const chamadas = [];
  const t = await preparar(async (bytes, tipo) => { chamadas.push({ n: bytes.length, tipo }); return '  Um cachorro caramelo.  '; });
  const res = await t.enviar(JPEG);
  assert.strictEqual(res.status, 201);
  assert.deepStrictEqual(Object.keys(res.body).sort(), ['criadaEm', 'descricao', 'favorita', 'id', 'urlArquivo']);
  assert.strictEqual(res.body.descricao, 'Um cachorro caramelo.');
  assert.strictEqual(res.body.favorita, false);
  assert.strictEqual(res.body.urlArquivo, `/imagens/${res.body.id}/arquivo`);
  assert.strictEqual(new Date(res.body.criadaEm).toISOString(), res.body.criadaEm);

  const [linha] = t.linhas();
  assert.strictEqual(linha.usuario_id, t.usuario.id);
  assert.strictEqual(linha.tipo, 'image/jpeg');
  assert.strictEqual(linha.favorita, 0);
  assert.match(linha.caminho, UUID);
  assert.deepStrictEqual(fs.readFileSync(path.join(t.uploadsDir, linha.caminho)), JPEG);

  const png = await t.enviar(PNG, { nome: 'a.png', tipo: 'image/png' });
  assert.strictEqual(png.status, 201);
  assert.deepStrictEqual(chamadas.map((c) => c.tipo), ['image/jpeg', 'image/png']);
  assert.strictEqual(t.arquivos().length, 2);
});

test('a pasta de uploads é criada automaticamente', async () => {
  const t = await preparar();
  assert.strictEqual(fs.existsSync(t.uploadsDir), false);
  assert.strictEqual((await t.enviar(PNG, { tipo: 'image/png' })).status, 201);
  assert.strictEqual(fs.existsSync(t.uploadsDir), true);
});

for (const [nome, descritor] of [
  ['erro', async () => { throw new Error('boom'); }],
  ['texto vazio', async () => '   '],
  ['tempo esgotado', async () => { throw new Error('Tempo esgotado'); }],
]) {
  test(`descritor com ${nome} dá 502 FALHA_NA_DESCRICAO sem arquivo nem linha`, async () => {
    const t = await preparar(descritor);
    esperaErro(await t.enviar(JPEG), 502, 'FALHA_NA_DESCRICAO');
    assert.deepStrictEqual(t.arquivos(), []);
    assert.strictEqual(t.linhas().length, 0);
  });
}

test('falha ao gravar no banco apaga o arquivo e dá 500 sem vazar detalhes', async () => {
  const t = await preparar();
  t.db.exec('DROP TABLE imagens');
  const log = console.error; console.error = () => {};
  const res = await t.enviar(JPEG);
  console.error = log;
  esperaErro(res, 500, 'ERRO_INTERNO');
  assert.deepStrictEqual(t.arquivos(), []);
});

test('a chave do Gemini não aparece em respostas nem logs', async () => {
  const chave = 'CHAVE-SECRETA-123';
  const antes = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = chave;
  const logs = [];
  const orig = { log: console.log, error: console.error, warn: console.warn };
  console.log = console.error = console.warn = (...a) => logs.push(a.join(' '));
  try {
    const t = await preparar(async () => { throw new Error(`falhou com key=${chave}`); });
    const res = await t.enviar(JPEG);
    assert.strictEqual(res.status, 502);
    assert.ok(!JSON.stringify(res.body).includes(chave));
    assert.ok(!res.text.includes(chave));
  } finally {
    Object.assign(console, orig);
    if (antes === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = antes;
  }
  assert.ok(!logs.join('\n').includes(chave));
});

test('descritor: usa o prompt do contrato, o modelo padrão e apara o texto', async () => {
  let recebido;
  const cliente = { models: { generateContent: async (p) => { recebido = p; return { text: '  Texto.\n' }; } } };
  delete process.env.GEMINI_MODEL;
  assert.strictEqual(await descrever(PNG, 'image/png', { cliente }), 'Texto.');
  assert.strictEqual(recebido.model, 'gemini-2.5-flash');
  const partes = recebido.contents[0].parts;
  assert.strictEqual(partes[0].inlineData.mimeType, 'image/png');
  assert.strictEqual(partes[0].inlineData.data, PNG.toString('base64'));
  assert.strictEqual(partes[1].text, 'Descreva em português do Brasil, em 2 a 4 frases, o que aparece nesta imagem. Responda só com o texto da descrição, sem markdown.');
  assert.strictEqual(PROMPT, partes[1].text);
});

test('descritor: vazio, erro e tempo esgotado rejeitam', async () => {
  const com = (generateContent) => ({ models: { generateContent } });
  await assert.rejects(descrever(JPEG, 'image/jpeg', { cliente: com(async () => ({ text: '  ' })) }));
  await assert.rejects(descrever(JPEG, 'image/jpeg', { cliente: com(async () => { throw new Error('x'); }) }));
  await assert.rejects(
    descrever(JPEG, 'image/jpeg', { cliente: com(() => new Promise(() => {})), timeoutMs: 20 }),
    /Tempo esgotado/,
  );
});

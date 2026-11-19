// Smoke test de ponta a ponta contra um servidor já rodando (usa o Gemini real).
// Uso: npm run smoke   (base: SMOKE_API_URL, padrão http://localhost:3000)
const fs = require('node:fs');
const path = require('node:path');

const BASE = (process.env.SMOKE_API_URL || 'http://localhost:3000').replace(/\/+$/, '');

async function chamar(metodo, rota, { json, form, token } = {}) {
  const headers = {};
  let body;
  if (json !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(json); }
  if (form) body = form;
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(BASE + rota, { method: metodo, headers, body });
  } catch {
    console.error(`FALHOU: não conseguiu conectar em ${BASE}`);
    process.exit(1);
  }
  const texto = await res.text();
  let corpo = texto;
  try { corpo = JSON.parse(texto); } catch { /* corpo não-JSON */ }
  return { status: res.status, corpo };
}

async function etapa(nome, fn) {
  try {
    await fn();
    console.log(`OK     ${nome}`);
  } catch (e) {
    console.log(`FALHOU ${nome}`);
    console.log(`  motivo: ${e.message}`);
    if (e.resposta) console.log(`  resposta (${e.resposta.status}): ${JSON.stringify(e.resposta.corpo)}`);
    process.exit(1);
  }
}

function exigir(cond, msg, resposta) {
  if (!cond) throw Object.assign(new Error(msg), { resposta });
}

async function main() {
  console.log(`Smoke test em ${BASE}`);
  const nome = `smoke-${Date.now()}`;
  const senha = 'smoke1234';
  let token, id, descricao, r;

  await etapa('1. POST /auth/cadastro -> 201', async () => {
    r = await chamar('POST', '/auth/cadastro', { json: { nome, senha } });
    exigir(r.status === 201, `esperado 201, veio ${r.status}`, r);
  });
  await etapa('2. POST /auth/login -> 200 com token', async () => {
    r = await chamar('POST', '/auth/login', { json: { nome, senha } });
    exigir(r.status === 200, `esperado 200, veio ${r.status}`, r);
    token = r.corpo?.token;
    exigir(typeof token === 'string' && token, 'resposta sem token', r);
  });
  await etapa('3. POST /imagens com a foto de exemplo -> 201', async () => {
    const bytes = fs.readFileSync(path.join(__dirname, 'foto-exemplo.jpg'));
    const form = new FormData();
    form.append('foto', new Blob([bytes], { type: 'image/jpeg' }), 'foto-exemplo.jpg');
    r = await chamar('POST', '/imagens', { form, token });
    exigir(r.status === 201, `esperado 201, veio ${r.status}`, r);
    id = r.corpo?.id;
    descricao = r.corpo?.descricao;
  });
  await etapa('4. Descrição não vazia', async () => {
    exigir(typeof descricao === 'string' && descricao.trim(), 'descricao vazia', r);
  });
  await etapa('5. GET /imagens contém a Imagem', async () => {
    r = await chamar('GET', '/imagens', { token });
    exigir(r.status === 200 && Array.isArray(r.corpo) && r.corpo.some((i) => i.id === id), 'Imagem não está na lista', r);
  });
  await etapa('6. PUT /imagens/:id/favorita -> 200 com favorita true', async () => {
    r = await chamar('PUT', `/imagens/${id}/favorita`, { json: { favorita: true }, token });
    exigir(r.status === 200 && r.corpo?.favorita === true, 'esperado 200 com favorita true', r);
  });
  await etapa('7. GET /imagens mostra a Imagem favorita', async () => {
    r = await chamar('GET', '/imagens', { token });
    const i = Array.isArray(r.corpo) && r.corpo.find((x) => x.id === id);
    exigir(i && i.favorita === true, 'Imagem sem favorita true na lista', r);
  });
  await etapa('8. DELETE /imagens/:id -> 204', async () => {
    r = await chamar('DELETE', `/imagens/${id}`, { token });
    exigir(r.status === 204, `esperado 204, veio ${r.status}`, r);
  });
  await etapa('9. GET /imagens/:id -> 404', async () => {
    r = await chamar('GET', `/imagens/${id}`, { token });
    exigir(r.status === 404, `esperado 404, veio ${r.status}`, r);
  });

  console.log(`\nDescrição recebida: ${descricao}`);
  console.log('Smoke test concluído: todas as etapas passaram.');
}

main();

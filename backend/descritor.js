const { GoogleGenAI } = require('@google/genai');

const PROMPT = 'Descreva em português do Brasil, em 2 a 4 frases, o que aparece nesta imagem. Responda só com o texto da descrição, sem markdown.';
const TEMPO_LIMITE_MS = 30_000;

let clientePadrao;
function obterCliente() {
  clientePadrao ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return clientePadrao;
}

// Único ponto de contato com o Gemini: bytes + tipo ("image/jpeg" | "image/png") -> texto da Descrição.
// Lança erro se falhar, estourar o tempo ou vier vazio. `cliente` e `timeoutMs` existem para testes.
async function descrever(bytes, tipo, { cliente = obterCliente(), timeoutMs = TEMPO_LIMITE_MS } = {}) {
  const controle = new AbortController();
  let timer;
  const esgotado = new Promise((_, rej) => {
    timer = setTimeout(() => { controle.abort(); rej(new Error('Tempo esgotado ao gerar a Descrição.')); }, timeoutMs);
  });
  try {
    const chamada = cliente.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [
        { inlineData: { mimeType: tipo, data: Buffer.from(bytes).toString('base64') } },
        { text: PROMPT },
      ] }],
      config: { abortSignal: controle.signal },
    });
    chamada.catch(() => {}); // evita rejeição não tratada se o tempo vencer primeiro
    const resposta = await Promise.race([chamada, esgotado]);
    const texto = (resposta.text ?? '').trim();
    if (!texto) throw new Error('O Gemini devolveu uma Descrição vazia.');
    return texto;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { descrever, PROMPT };

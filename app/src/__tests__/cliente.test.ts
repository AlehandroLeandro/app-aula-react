import { cadastrar, definirToken, entrar, enviarImagem, ErroApi } from '../api/cliente';

const fetchFalso = jest.fn();
beforeEach(() => {
  fetchFalso.mockReset();
  globalThis.fetch = fetchFalso as unknown as typeof fetch;
  process.env.EXPO_PUBLIC_API_URL = 'http://api.teste';
  definirToken(null);
});

const resposta = (status: number, corpo: unknown) => ({ ok: status < 400, status, json: async () => corpo });

it('envia o corpo e a base da URL, e devolve token e usuário', async () => {
  fetchFalso.mockResolvedValue(resposta(201, { token: 't', usuario: { id: 1, nome: 'A' } }));
  const r = await cadastrar('A', '1234');
  expect(r.token).toBe('t');
  expect(fetchFalso.mock.calls[0][0]).toBe('http://api.teste/auth/cadastro');
  expect(fetchFalso.mock.calls[0][1].body).toBe(JSON.stringify({ nome: 'A', senha: '1234' }));
});

it('envia Bearer só quando há token', async () => {
  fetchFalso.mockResolvedValue(resposta(200, { token: 't', usuario: { id: 1, nome: 'A' } }));
  await entrar('A', '1234');
  expect(fetchFalso.mock.calls[0][1].headers.Authorization).toBeUndefined();
  definirToken('abc');
  await entrar('A', '1234');
  expect(fetchFalso.mock.calls[1][1].headers.Authorization).toBe('Bearer abc');
});

it('transforma erro do backend em ErroApi com codigo e mensagem', async () => {
  fetchFalso.mockResolvedValue(resposta(401, { erro: { codigo: 'CREDENCIAIS_INVALIDAS', mensagem: 'Nome ou senha incorretos.' } }));
  await expect(entrar('A', 'x')).rejects.toMatchObject({ codigo: 'CREDENCIAIS_INVALIDAS', message: 'Nome ou senha incorretos.' });
});

it('transforma falha de rede em mensagem amigável', async () => {
  fetchFalso.mockRejectedValue(new TypeError('Network request failed'));
  const erro = await entrar('A', 'x').catch((e) => e);
  expect(erro).toBeInstanceOf(ErroApi);
  expect(erro.message).toBe('Não foi possível conectar ao servidor.');
});

describe('enviarImagem', () => {
  const foto = { uri: 'file:///f.jpg', tipo: 'image/jpeg', nome: 'f.jpg' };
  const imagem = { id: 1, descricao: 'Um gato.', favorita: false, criadaEm: '2026-11-18T14:03:00.000Z', urlArquivo: '/imagens/1/arquivo' };

  it('envia multipart no campo foto, com token e sem Content-Type manual', async () => {
    fetchFalso.mockResolvedValue(resposta(201, imagem));
    definirToken('abc');
    expect(await enviarImagem(foto)).toEqual(imagem);
    const [url, opcoes] = fetchFalso.mock.calls[0];
    expect(url).toBe('http://api.teste/imagens');
    expect(opcoes.method).toBe('POST');
    expect(opcoes.body).toBeInstanceOf(FormData);
    expect(opcoes.body.get('foto')).toBeTruthy();
    expect(opcoes.headers.Authorization).toBe('Bearer abc');
    expect(opcoes.headers['Content-Type']).toBeUndefined();
  });

  it('transforma erro do backend em ErroApi', async () => {
    fetchFalso.mockResolvedValue(resposta(502, { erro: { codigo: 'FALHA_NA_DESCRICAO', mensagem: 'Não foi possível descrever.' } }));
    await expect(enviarImagem(foto)).rejects.toMatchObject({ codigo: 'FALHA_NA_DESCRICAO', message: 'Não foi possível descrever.' });
  });

  it('desiste após 60 s sem resposta', async () => {
    jest.useFakeTimers();
    try {
      fetchFalso.mockImplementation(
        (_url: string, opcoes: { signal: AbortSignal }) =>
          new Promise((_, rejeitar) => opcoes.signal.addEventListener('abort', () => rejeitar(new Error('abortado')))),
      );
      const pendente = enviarImagem(foto).catch((e) => e);
      await jest.advanceTimersByTimeAsync(59_999);
      expect(fetchFalso.mock.calls[0][1].signal.aborted).toBe(false);
      await jest.advanceTimersByTimeAsync(1);
      const erro = await pendente;
      expect(erro).toBeInstanceOf(ErroApi);
      expect(erro.message).toBe('O servidor demorou para responder. Tente de novo.');
    } finally {
      jest.useRealTimers();
    }
  });
});

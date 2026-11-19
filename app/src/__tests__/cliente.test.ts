import { cadastrar, definirToken, entrar, ErroApi } from '../api/cliente';

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

import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import * as api from '../api/cliente';
import { ErroApi } from '../api/cliente';
import { salvarSessao, SESSAO } from '../testes/sessao';

jest.mock('../api/cliente', () => ({ ...jest.requireActual('../api/cliente'), eu: jest.fn(), definirToken: jest.fn() }));

const euFalso = jest.mocked(api.eu);
const appDir = './src/app';
const CHAVE = '@descritor/sessao';

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

describe('sessão ao abrir', () => {
  it('com sessão salva e 200 mostra as abas, usando o token salvo', async () => {
    await salvarSessao();
    euFalso.mockResolvedValue({ usuario: SESSAO.usuario });
    await renderRouter(appDir, { initialUrl: '/' });
    expect(await screen.findByRole('header', { name: 'Minhas imagens' })).toBeOnTheScreen();
    expect(api.definirToken).toHaveBeenCalledWith('tok');
    expect(euFalso).toHaveBeenCalledTimes(1);
  });

  it('mostra o carregamento enquanto valida, sem piscar o login', async () => {
    await salvarSessao();
    let concluir: (v: { usuario: typeof SESSAO.usuario }) => void = () => {};
    euFalso.mockReturnValue(new Promise((r) => (concluir = r)));
    await renderRouter(appDir, { initialUrl: '/' });
    expect(await screen.findByLabelText('Carregando')).toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: 'Login' })).toBeNull();
    await act(async () => concluir({ usuario: SESSAO.usuario }));
    expect(await screen.findByRole('header', { name: 'Minhas imagens' })).toBeOnTheScreen();
  });

  it('401 apaga a sessão e mostra o login', async () => {
    await salvarSessao();
    euFalso.mockRejectedValue(new ErroApi('NAO_AUTENTICADO', 'Faça login.'));
    await renderRouter(appDir, { initialUrl: '/' });
    expect(await screen.findByRole('header', { name: 'Login' })).toBeOnTheScreen();
    expect(await AsyncStorage.getItem(CHAVE)).toBeNull();
  });

  it('falha de rede mantém a sessão e "Tentar de novo" repete a validação', async () => {
    await salvarSessao();
    euFalso.mockRejectedValueOnce(new ErroApi('SEM_CONEXAO', 'sem rede'));
    await renderRouter(appDir, { initialUrl: '/' });
    expect(await screen.findByText('Não foi possível validar sua sessão.')).toBeOnTheScreen();
    expect(await AsyncStorage.getItem(CHAVE)).not.toBeNull();

    euFalso.mockResolvedValue({ usuario: SESSAO.usuario });
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('header', { name: 'Minhas imagens' })).toBeOnTheScreen();
    expect(euFalso).toHaveBeenCalledTimes(2);
  });

  it('valor inválido apaga a chave e mostra o login', async () => {
    await salvarSessao('{nao-json');
    await renderRouter(appDir, { initialUrl: '/' });
    expect(await screen.findByRole('header', { name: 'Login' })).toBeOnTheScreen();
    expect(await AsyncStorage.getItem(CHAVE)).toBeNull();
    expect(euFalso).not.toHaveBeenCalled();
  });
});

describe('proteção de rotas', () => {
  it.each(['/', '/favoritos', '/item/3'])('sem sessão, %s leva ao login', async (url) => {
    await renderRouter(appDir, { initialUrl: url });
    expect(await screen.findByRole('header', { name: 'Login' })).toBeOnTheScreen();
  });

  it.each(['/login', '/cadastro'])('com sessão, %s leva às abas', async (url) => {
    await salvarSessao();
    euFalso.mockResolvedValue({ usuario: SESSAO.usuario });
    await renderRouter(appDir, { initialUrl: url });
    expect(await screen.findByRole('header', { name: 'Minhas imagens' })).toBeOnTheScreen();
  });
});

describe('configurações', () => {
  it('mostra o nome e Sair apaga a sessão e leva ao login', async () => {
    await salvarSessao();
    euFalso.mockResolvedValue({ usuario: SESSAO.usuario });
    await renderRouter(appDir, { initialUrl: '/configuracoes' });
    expect(await screen.findByText('Alehandro')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Sair' }));
    expect(await screen.findByRole('header', { name: 'Login' })).toBeOnTheScreen();
    expect(await AsyncStorage.getItem(CHAVE)).toBeNull();
    expect(api.definirToken).toHaveBeenLastCalledWith(null);
  });
});

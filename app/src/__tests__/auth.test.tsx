import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { ErroApi } from '../api/cliente';
import * as api from '../api/cliente';

// Cliente falso que segue o contrato (mesmos nomes de função e formato de erro).
jest.mock('../api/cliente', () => {
  const real = jest.requireActual('../api/cliente');
  return { ...real, entrar: jest.fn(), cadastrar: jest.fn(), definirToken: jest.fn(), listarImagens: jest.fn().mockResolvedValue([]) };
});

const entrarFalso = jest.mocked(api.entrar);
const cadastrarFalso = jest.mocked(api.cadastrar);
const appDir = './src/app';
const ok = { token: 'tok', usuario: { id: 1, nome: 'Alehandro' } };

async function preencher(nome: string, senha: string, botao: string) {
  await fireEvent.changeText(screen.getByLabelText('Nome'), nome);
  await fireEvent.changeText(screen.getByLabelText('Senha'), senha);
  await fireEvent.press(screen.getByRole('button', { name: botao }));
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

describe('cadastro', () => {
  it('valida nome e senha antes de enviar', async () => {
    await renderRouter(appDir, { initialUrl: '/cadastro' });
    await preencher(' a ', '123', 'Criar conta');
    expect(await screen.findByText('O nome deve ter de 2 a 30 caracteres.')).toBeOnTheScreen();
    expect(await screen.findByText('A senha deve ter pelo menos 4 caracteres.')).toBeOnTheScreen();
    expect(cadastrarFalso).not.toHaveBeenCalled();
  });

  it('mostra a mensagem do backend em 409 NOME_EM_USO', async () => {
    cadastrarFalso.mockRejectedValue(new ErroApi('NOME_EM_USO', 'Esse nome já está em uso.'));
    await renderRouter(appDir, { initialUrl: '/cadastro' });
    await preencher('Alehandro', 'senha1', 'Criar conta');
    expect(await screen.findByText('Esse nome já está em uso.')).toBeOnTheScreen();
  });

  it('com sucesso vai para as abas, enviando o nome sem espaços nas pontas', async () => {
    cadastrarFalso.mockResolvedValue(ok);
    await renderRouter(appDir, { initialUrl: '/cadastro' });
    await preencher('  Alehandro ', 'senha1', 'Criar conta');
    expect(cadastrarFalso).toHaveBeenCalledWith('Alehandro', 'senha1');
    expect(await screen.findByRole('header', { name: 'Minhas imagens' })).toBeOnTheScreen();
    expect(JSON.parse((await AsyncStorage.getItem('@descritor/sessao')) ?? 'null')).toEqual(ok);
  });
});

describe('login', () => {
  it('mostra a mensagem do backend em 401 CREDENCIAIS_INVALIDAS', async () => {
    entrarFalso.mockRejectedValue(new ErroApi('CREDENCIAIS_INVALIDAS', 'Nome ou senha incorretos.'));
    await renderRouter(appDir, { initialUrl: '/login' });
    await preencher('Alehandro', 'errada', 'Entrar');
    expect(await screen.findByText('Nome ou senha incorretos.')).toBeOnTheScreen();
  });

  it('não envia de novo enquanto carrega', async () => {
    let concluir: (v: typeof ok) => void = () => {};
    entrarFalso.mockReturnValue(new Promise((r) => (concluir = r)));
    await renderRouter(appDir, { initialUrl: '/login' });
    await preencher('Alehandro', 'senha1', 'Entrar');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(entrarFalso).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeBusy();
    await act(async () => concluir(ok));
  });

  it('com sucesso vai para as abas', async () => {
    entrarFalso.mockResolvedValue(ok);
    await renderRouter(appDir, { initialUrl: '/login' });
    await preencher('Alehandro', 'senha1', 'Entrar');
    expect(await screen.findByRole('header', { name: 'Minhas imagens' })).toBeOnTheScreen();
    expect(JSON.parse((await AsyncStorage.getItem('@descritor/sessao')) ?? 'null')).toEqual(ok);
  });

  it('liga ao cadastro e volta', async () => {
    await renderRouter(appDir, { initialUrl: '/login' });
    await fireEvent.press(await screen.findByText('Não tem conta? Cadastre-se'));
    expect(await screen.findByRole('header', { name: 'Cadastro' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Já tem conta? Entre'));
    expect(await screen.findByRole('header', { name: 'Login' })).toBeOnTheScreen();
  });
});

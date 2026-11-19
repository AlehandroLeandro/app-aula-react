import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import * as api from '../api/cliente';
import { salvarSessao, SESSAO } from '../testes/sessao';

jest.mock('../api/cliente', () => ({ ...jest.requireActual('../api/cliente'), eu: jest.fn(), definirToken: jest.fn() }));

const appDir = './src/app';

describe('navegação', () => {
  beforeEach(async () => {
    await salvarSessao();
    jest.mocked(api.eu).mockResolvedValue({ usuario: SESSAO.usuario });
  });

  it('troca entre abas pela barra de abas', async () => {
    await renderRouter(appDir, { initialUrl: '/' });
    expect(screen.getByRole('header', { name: 'Minhas imagens' })).toBeOnTheScreen();

    await act(async () => fireEvent.press(screen.getByText('Favoritos')));
    expect(await screen.findByRole('header', { name: 'Favoritos' })).toBeOnTheScreen();
  });

  it('mostra as quatro abas na ordem', async () => {
    await renderRouter(appDir, { initialUrl: '/' });
    const rotulos = screen.getAllByLabelText(/, tab, \d of 4$/).map((aba) => aba.props.accessibilityLabel);
    expect(rotulos).toEqual([
      'Minhas imagens, tab, 1 of 4',
      'Enviar, tab, 2 of 4',
      'Favoritos, tab, 3 of 4',
      'Configurações, tab, 4 of 4',
    ]);
  });

  it('abre os detalhes com o id da rota', async () => {
    await renderRouter(appDir, { initialUrl: '/' });
    await act(async () => router.push('/item/42'));
    expect(screen.getByRole('header', { name: 'Detalhes da Imagem' })).toBeOnTheScreen();
    expect(screen.getByText('42')).toBeOnTheScreen();
  });

  it('login não mostra a barra de abas', async () => {
    await AsyncStorage.clear();
    await renderRouter(appDir, { initialUrl: '/login' });
    expect(screen.getByRole('header', { name: 'Login' })).toBeOnTheScreen();
    expect(screen.queryByLabelText(/, tab, \d of 4$/)).toBeNull();
  });
});

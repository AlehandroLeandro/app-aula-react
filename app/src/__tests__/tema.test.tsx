import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { MensagemErro } from '../componentes/MensagemErro';
import { render } from '@testing-library/react-native';
import { TemaProvider } from '../tema/tema';
import * as api from '../api/cliente';
import { salvarSessao, SESSAO } from '../testes/sessao';

jest.mock('../api/cliente', () => ({ ...jest.requireActual('../api/cliente'), eu: jest.fn(), definirToken: jest.fn(), listarImagens: jest.fn().mockResolvedValue([]) }));

const appDir = './src/app';
const CHAVE = '@descritor/tema';

beforeEach(async () => {
  await AsyncStorage.clear();
  await salvarSessao();
  jest.mocked(api.eu).mockResolvedValue({ usuario: SESSAO.usuario });
});

async function abrirConfiguracoes() {
  const render = await renderRouter(appDir, { initialUrl: '/configuracoes' });
  await screen.findByRole('header', { name: 'Configurações' });
  return render;
}

describe('tema', () => {
  it('sem valor salvo segue o tema do sistema', async () => {
    await abrirConfiguracoes();
    expect(screen.getByLabelText('Claro')).toBeSelected();
    expect(await AsyncStorage.getItem(CHAVE)).toBeNull();
  });

  it('valor inválido não quebra o app e segue o sistema', async () => {
    await AsyncStorage.setItem(CHAVE, 'roxo');
    await abrirConfiguracoes();
    expect(screen.getByLabelText('Claro')).toBeSelected();
  });

  it('Minhas imagens mostra o estado vazio', async () => {
    await renderRouter(appDir, { initialUrl: '/' });
    expect(await screen.findByText('Você ainda não enviou nenhuma Imagem')).toBeOnTheScreen();
  });

  it('trocar o tema em Configurações grava a escolha e um novo render lê o valor salvo', async () => {
    const primeiro = await abrirConfiguracoes();
    await fireEvent.press(screen.getByText('Escuro'));
    expect(await AsyncStorage.getItem(CHAVE)).toBe('escuro');

    await primeiro.unmount();
    await abrirConfiguracoes();
    expect(screen.getByLabelText('Escuro')).toBeSelected();
  });
});

describe('mensagem de erro', () => {
  it('chama a função ao tocar em "Tentar de novo"', async () => {
    const aoTentar = jest.fn();
    await render(
      <TemaProvider>
        <MensagemErro onTentarDeNovo={aoTentar} />
      </TemaProvider>,
    );
    await fireEvent.press(await screen.findByText('Tentar de novo'));
    expect(aoTentar).toHaveBeenCalledTimes(1);
  });
});

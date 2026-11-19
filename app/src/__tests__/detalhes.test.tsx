import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Alert, type AlertButton } from 'react-native';

import * as api from '../api/cliente';
import { ErroApi, type ImagemApi } from '../api/cliente';
import { salvarSessao, SESSAO } from '../testes/sessao';

jest.mock('../api/cliente', () => ({
  ...jest.requireActual('../api/cliente'),
  eu: jest.fn(),
  definirToken: jest.fn(),
  listarImagens: jest.fn(),
  obterImagem: jest.fn(),
  removerImagem: jest.fn(),
}));

const obterFalso = jest.mocked(api.obterImagem);
const removerFalso = jest.mocked(api.removerImagem);
const appDir = './src/app';
const imagem: ImagemApi = {
  id: 12,
  descricao: 'Um cachorro caramelo deitado em um sofá azul, olhando para a câmera com ar sonolento.',
  favorita: false,
  criadaEm: '2026-11-18T14:03:00',
  urlArquivo: '/imagens/12/arquivo',
};
const outra: ImagemApi = { ...imagem, id: 7, descricao: 'Uma praia ao entardecer.' };

const botoesDoAlerta = (alerta: jest.SpyInstance): AlertButton[] => alerta.mock.calls[0][2] as AlertButton[];

beforeEach(async () => {
  jest.clearAllMocks();
  process.env.EXPO_PUBLIC_API_URL = 'http://api.teste';
  await salvarSessao();
  jest.mocked(api.eu).mockResolvedValue({ usuario: SESSAO.usuario });
  jest.mocked(api.listarImagens).mockResolvedValue([outra, imagem]);
  obterFalso.mockResolvedValue(imagem);
});

it('carrega pelo id da rota e mostra foto com token, Descrição completa e data', async () => {
  await renderRouter(appDir, { initialUrl: '/item/12' });
  expect(await screen.findByText(imagem.descricao)).toBeOnTheScreen();
  expect(obterFalso).toHaveBeenCalledWith('12');
  expect(screen.getByText('18/11/2026 14:03')).toBeOnTheScreen();
  expect(screen.getByLabelText('Foto da Imagem').props.source).toEqual({
    uri: 'http://api.teste/imagens/12/arquivo',
    headers: { Authorization: 'Bearer tok' },
  });
});

it('mostra o indicador e, em falha, a mensagem com Tentar de novo', async () => {
  obterFalso.mockRejectedValueOnce(new ErroApi('SEM_CONEXAO', 'Não foi possível conectar ao servidor.'));
  await renderRouter(appDir, { initialUrl: '/item/12' });
  expect(await screen.findByText('Não foi possível conectar ao servidor.')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
  expect(await screen.findByText(imagem.descricao)).toBeOnTheScreen();
  expect(obterFalso).toHaveBeenCalledTimes(2);
});

it('404 mostra "Imagem não encontrada" e Voltar', async () => {
  obterFalso.mockRejectedValue(new ErroApi('NAO_ENCONTRADA', 'Imagem não encontrada.'));
  await renderRouter(appDir, { initialUrl: '/' });
  await act(async () => router.push('/item/99'));
  expect(await screen.findByText('Imagem não encontrada')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
  expect(await screen.findByRole('header', { name: 'Minhas imagens' })).toBeOnTheScreen();
});

it('Remover pede confirmação e Cancelar não chama a API', async () => {
  const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await renderRouter(appDir, { initialUrl: '/item/12' });
  await screen.findByText(imagem.descricao);
  await fireEvent.press(screen.getByRole('button', { name: 'Remover' }));
  expect(alerta.mock.calls[0][0]).toBe('Remover esta Imagem?');
  expect(alerta.mock.calls[0][1]).toBe('Não dá para desfazer.');
  const cancelar = botoesDoAlerta(alerta).find((b) => b.text === 'Cancelar');
  await act(async () => cancelar?.onPress?.());
  expect(removerFalso).not.toHaveBeenCalled();
  expect(screen.getByText(imagem.descricao)).toBeOnTheScreen();
});

it('confirmar remove: 204, sai da lista e volta à tela anterior', async () => {
  const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  removerFalso.mockResolvedValue(undefined);
  await renderRouter(appDir, { initialUrl: '/' });
  await fireEvent.press(await screen.findByLabelText(`Abrir imagem: ${imagem.descricao}`));
  await screen.findByLabelText('Foto da Imagem');
  await fireEvent.press(screen.getByRole('button', { name: 'Remover' }));
  const remover = botoesDoAlerta(alerta).find((b) => b.text === 'Remover');
  await act(async () => remover?.onPress?.());

  expect(removerFalso).toHaveBeenCalledWith(12);
  expect(await screen.findByRole('header', { name: 'Minhas imagens' })).toBeOnTheScreen();
  expect(screen.queryByText(imagem.descricao)).toBeNull();
  expect(screen.getByText(outra.descricao)).toBeOnTheScreen();
});

it('erro no DELETE mostra a mensagem do backend e a Imagem continua na lista', async () => {
  const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  removerFalso.mockRejectedValue(new ErroApi('ERRO_INTERNO', 'Não foi possível remover agora.'));
  await renderRouter(appDir, { initialUrl: '/' });
  await fireEvent.press(await screen.findByLabelText(`Abrir imagem: ${imagem.descricao}`));
  await screen.findByLabelText('Foto da Imagem');
  await fireEvent.press(screen.getByRole('button', { name: 'Remover' }));
  const remover = botoesDoAlerta(alerta).find((b) => b.text === 'Remover');
  await act(async () => remover?.onPress?.());

  expect(await screen.findByText('Não foi possível remover agora.')).toBeOnTheScreen();
  await act(async () => router.back());
  expect(await screen.findByLabelText(`Abrir imagem: ${imagem.descricao}`)).toBeOnTheScreen();
});

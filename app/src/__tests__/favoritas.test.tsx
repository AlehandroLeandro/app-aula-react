import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import * as api from '../api/cliente';
import { ErroApi, type ImagemApi } from '../api/cliente';
import { salvarSessao, SESSAO } from '../testes/sessao';

jest.mock('../api/cliente', () => ({
  ...jest.requireActual('../api/cliente'),
  eu: jest.fn(),
  definirToken: jest.fn(),
  listarImagens: jest.fn(),
  obterImagem: jest.fn(),
  definirFavorita: jest.fn(),
}));

const favoritaFalso = jest.mocked(api.definirFavorita);
const appDir = './src/app';
const nova = (id: number, descricao: string, favorita = false): ImagemApi => ({
  id,
  descricao,
  favorita,
  criadaEm: '2026-11-18T14:03:00',
  urlArquivo: `/imagens/${id}/arquivo`,
});
const cafe = nova(2, 'Uma xícara de Café.', true);
const cachorro = nova(1, 'Um cachorro caramelo.');
const praia = nova(3, 'Uma praia ao entardecer.', true);

beforeEach(async () => {
  jest.clearAllMocks();
  process.env.EXPO_PUBLIC_API_URL = 'http://api.teste';
  await salvarSessao();
  jest.mocked(api.eu).mockResolvedValue({ usuario: SESSAO.usuario });
  jest.mocked(api.listarImagens).mockResolvedValue([praia, cafe, cachorro]);
  jest.mocked(api.obterImagem).mockImplementation(async (id) => [praia, cafe, cachorro].find((i) => String(i.id) === String(id))!);
  favoritaFalso.mockImplementation(async (id, favorita) => ({ ...nova(Number(id), 'x'), favorita }));
});


it('cartão tem estrela cheia ou vazada e tocar nela não abre os detalhes', async () => {
  await renderRouter(appDir, { initialUrl: '/' });
  await screen.findByText(cachorro.descricao);
  expect(screen.getAllByLabelText('Desmarcar como Favorita')).toHaveLength(2);
  expect(screen.getAllByLabelText('Marcar como Favorita')).toHaveLength(1);
  await fireEvent.press(screen.getByLabelText('Marcar como Favorita'));
  expect(favoritaFalso).toHaveBeenCalledWith(1, true);
  expect(api.obterImagem).not.toHaveBeenCalled();
});

it('troca é otimista: aparece antes da resposta do PUT', async () => {
  let concluir: (v: ImagemApi) => void = () => {};
  favoritaFalso.mockReturnValue(new Promise((r) => (concluir = r)));
  await renderRouter(appDir, { initialUrl: '/' });
  await screen.findByText(cachorro.descricao);
  await fireEvent.press(screen.getByLabelText('Marcar como Favorita'));
  expect(screen.queryByLabelText('Marcar como Favorita')).toBeNull();
  expect(screen.getAllByLabelText('Desmarcar como Favorita')).toHaveLength(3);
  await act(async () => concluir({ ...cachorro, favorita: true }));
  expect(screen.getAllByLabelText('Desmarcar como Favorita')).toHaveLength(3);
});

it('erro no PUT desfaz a marca e mostra a mensagem do backend', async () => {
  favoritaFalso.mockRejectedValue(new ErroApi('NAO_ENCONTRADA', 'Imagem não encontrada.'));
  await renderRouter(appDir, { initialUrl: '/' });
  await screen.findByText(cachorro.descricao);
  await fireEvent.press(screen.getByLabelText('Marcar como Favorita'));
  expect(await screen.findByText('Imagem não encontrada.')).toBeOnTheScreen();
  expect(screen.getByLabelText('Marcar como Favorita')).toBeOnTheScreen();
  expect(screen.getAllByLabelText('Desmarcar como Favorita')).toHaveLength(2);
});

it('detalhes mostram a estrela e trocar vale também para a lista', async () => {
  await renderRouter(appDir, { initialUrl: '/' });
  await fireEvent.press(await screen.findByLabelText(`Abrir imagem: ${cachorro.descricao}`));
  await screen.findByLabelText('Foto da Imagem');
  await fireEvent.press(screen.getByLabelText('Marcar como Favorita'));
  expect(favoritaFalso).toHaveBeenCalledWith(1, true);
  expect(await screen.findByLabelText('Desmarcar como Favorita')).toBeOnTheScreen();
  await act(async () => router.back());
  await waitFor(() => expect(screen.getAllByLabelText('Desmarcar como Favorita')).toHaveLength(3));
});

it('erro nos detalhes desfaz e mostra a mensagem', async () => {
  favoritaFalso.mockRejectedValue(new ErroApi('ERRO_INTERNO', 'Não foi possível favoritar agora.'));
  await renderRouter(appDir, { initialUrl: '/item/1' });
  await fireEvent.press(await screen.findByLabelText('Marcar como Favorita'));
  expect(await screen.findByText('Não foi possível favoritar agora.')).toBeOnTheScreen();
  expect(screen.getByLabelText('Marcar como Favorita')).toBeOnTheScreen();
});

it('aba Favoritos mostra só as Favoritas, na ordem da lista', async () => {
  await renderRouter(appDir, { initialUrl: '/favoritos' });
  await screen.findByText(praia.descricao);
  expect(screen.queryByText(cachorro.descricao)).toBeNull();
  const textos = screen.getAllByLabelText(/^Abrir imagem:/).map((c) => c.props.accessibilityLabel);
  expect(textos).toEqual([`Abrir imagem: ${praia.descricao}`, `Abrir imagem: ${cafe.descricao}`]);
});

it('desmarcar na aba Favoritos remove o cartão na hora', async () => {
  await renderRouter(appDir, { initialUrl: '/favoritos' });
  await screen.findByText(praia.descricao);
  await fireEvent.press(screen.getAllByLabelText('Desmarcar como Favorita')[0]);
  expect(favoritaFalso).toHaveBeenCalledWith(3, false);
  expect(screen.queryByText(praia.descricao)).toBeNull();
  expect(screen.getByText(cafe.descricao)).toBeOnTheScreen();
});

it('sem Favoritas mostra o texto de vazio', async () => {
  jest.mocked(api.listarImagens).mockResolvedValue([cachorro]);
  await renderRouter(appDir, { initialUrl: '/favoritos' });
  expect(
    await screen.findByText('Nenhuma Imagem favorita ainda. Toque na estrela de uma Imagem para favoritar.'),
  ).toBeOnTheScreen();
});

it('pull-to-refresh na aba Favoritos recarrega pelo provedor', async () => {
  await renderRouter(appDir, { initialUrl: '/favoritos' });
  await screen.findByText(praia.descricao);
  expect(api.listarImagens).toHaveBeenCalledTimes(1);
  const { refreshControl } = screen.getByTestId('lista-favoritos').props;
  await act(async () => refreshControl.props.onRefresh());
  expect(api.listarImagens).toHaveBeenCalledTimes(2);
});

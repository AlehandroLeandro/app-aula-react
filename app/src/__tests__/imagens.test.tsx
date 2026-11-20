import { File } from 'expo-file-system';
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
  obterImagem: jest.fn(() => new Promise(() => {})),
}));

const listarFalso = jest.mocked(api.listarImagens);
const appDir = './src/app';
const nova = (id: number, descricao: string, extra: Partial<ImagemApi> = {}): ImagemApi => ({
  id,
  descricao,
  favorita: false,
  criadaEm: '2026-11-18T14:03:00',
  urlArquivo: `/imagens/${id}/arquivo`,
  ...extra,
});
const cafe = nova(2, 'Uma xícara de Café sobre a mesa de madeira.', { favorita: true });
const cachorro = nova(1, 'Um cachorro caramelo deitado em um sofá azul.');

async function abrir() {
  await renderRouter(appDir, { initialUrl: '/' });
}

beforeEach(async () => {
  jest.clearAllMocks();
  process.env.EXPO_PUBLIC_API_URL = 'http://api.teste';
  await salvarSessao();
  jest.mocked(api.eu).mockResolvedValue({ usuario: SESSAO.usuario });
  listarFalso.mockResolvedValue([cafe, cachorro]);
});

it('mostra o indicador enquanto carrega e depois a lista com miniatura, data, Favorita e 2 linhas', async () => {
  let concluir: (v: ImagemApi[]) => void = () => {};
  listarFalso.mockReturnValue(new Promise((r) => (concluir = r)));
  await abrir();
  expect(await screen.findByLabelText('Carregando')).toBeOnTheScreen();
  await act(async () => concluir([cafe, cachorro]));

  expect(await screen.findByText(cafe.descricao)).toBeOnTheScreen();
  expect(screen.getByText(cachorro.descricao)).toBeOnTheScreen();
  expect(screen.getAllByText('18/11/2026 14:03')).toHaveLength(2);
  expect(screen.getAllByLabelText('Desmarcar como Favorita')).toHaveLength(1);
  expect(screen.getAllByLabelText('Marcar como Favorita')).toHaveLength(1);
  expect(screen.getByText(cafe.descricao).props.numberOfLines).toBe(2);
  const miniatura = screen.getAllByLabelText('Miniatura da imagem')[0];
  expect(miniatura.props.source).toEqual({
    uri: expect.stringContaining('file:///cache/'),
  });
  expect(File.downloadFileAsync).toHaveBeenCalledWith(
    'http://api.teste/imagens/2/arquivo',
    expect.anything(),
    expect.objectContaining({ headers: { Authorization: 'Bearer tok' } }),
  );
});

it('toque no cartão abre os detalhes da Imagem', async () => {
  await abrir();
  await fireEvent.press(await screen.findByLabelText(`Abrir imagem: ${cafe.descricao}`));
  await waitFor(() => expect(api.obterImagem).toHaveBeenCalledWith('2'));
});

it('busca ignora caixa e acentos e filtra enquanto digita', async () => {
  await abrir();
  await screen.findByText(cafe.descricao);
  await fireEvent.changeText(screen.getByLabelText('Buscar'), 'cafe');
  expect(screen.getByText(cafe.descricao)).toBeOnTheScreen();
  expect(screen.queryByText(cachorro.descricao)).toBeNull();
  await fireEvent.changeText(screen.getByLabelText('Buscar'), 'SOFA');
  expect(screen.getByText(cachorro.descricao)).toBeOnTheScreen();
  expect(screen.queryByText(cafe.descricao)).toBeNull();
});

it('busca sem resultado mostra o termo', async () => {
  await abrir();
  await screen.findByText(cafe.descricao);
  await fireEvent.changeText(screen.getByLabelText('Buscar'), 'girafa');
  expect(screen.getByText('Nenhuma Imagem encontrada para "girafa"')).toBeOnTheScreen();
});

it('sem Imagens mostra o vazio com botão que leva à aba Enviar', async () => {
  listarFalso.mockResolvedValue([]);
  await abrir();
  expect(await screen.findByText('Você ainda não enviou nenhuma Imagem')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Enviar uma Imagem' }));
  expect(await screen.findByRole('header', { name: 'Enviar' })).toBeOnTheScreen();
});

it('pull-to-refresh busca a lista de novo e não recarrega ao focar a aba', async () => {
  await abrir();
  await screen.findByText(cafe.descricao);
  expect(listarFalso).toHaveBeenCalledTimes(1);

  const outra = nova(3, 'Uma praia ao entardecer.');
  listarFalso.mockResolvedValue([outra, cafe, cachorro]);
  const { refreshControl } = screen.getByTestId('lista-imagens').props;
  await act(async () => refreshControl.props.onRefresh());
  expect(listarFalso).toHaveBeenCalledTimes(2);
  expect(await screen.findByText(outra.descricao)).toBeOnTheScreen();

  await act(async () => router.navigate('/favoritos'));
  await act(async () => router.navigate('/'));
  expect(listarFalso).toHaveBeenCalledTimes(2);
});

it('erro mostra mensagem amigável e Tentar de novo repete a carga', async () => {
  listarFalso.mockRejectedValueOnce(new ErroApi('SEM_CONEXAO', 'Não foi possível conectar ao servidor.'));
  await abrir();
  expect(await screen.findByText('Não foi possível conectar ao servidor.')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
  expect(await screen.findByText(cafe.descricao)).toBeOnTheScreen();
  expect(listarFalso).toHaveBeenCalledTimes(2);
});

it('ao Sair limpa a lista e outro Usuário carrega a própria', async () => {
  await abrir();
  await screen.findByText(cafe.descricao);
  await act(async () => router.navigate('/configuracoes'));
  await fireEvent.press(await screen.findByRole('button', { name: 'Sair' }));
  expect(await screen.findByRole('header', { name: 'Login' })).toBeOnTheScreen();
  expect(screen.queryByText(cafe.descricao)).toBeNull();
});

import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import * as ImagePicker from 'expo-image-picker';

import * as api from '../api/cliente';
import { ErroApi } from '../api/cliente';
import { salvarSessao, SESSAO } from '../testes/sessao';

jest.mock('../api/cliente', () => ({
  ...jest.requireActual('../api/cliente'),
  eu: jest.fn(),
  definirToken: jest.fn(),
  enviarImagem: jest.fn(),
  obterImagem: jest.fn(() => new Promise(() => {})),
  listarImagens: jest.fn(),
}));
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

const picker = jest.mocked(ImagePicker);
const enviarFalso = jest.mocked(api.enviarImagem);
const appDir = './src/app';
const imagem = { id: 12, descricao: 'Um cachorro caramelo.', favorita: false, criadaEm: '2026-11-18T14:03:00.000Z', urlArquivo: '/imagens/12/arquivo' };
const escolhida = { canceled: false, assets: [{ uri: 'file:///foto.jpg', mimeType: 'image/jpeg', fileName: 'foto.jpg' }] } as ImagePicker.ImagePickerResult;
const concedida = { granted: true } as ImagePicker.PermissionResponse;
const negada = { granted: false } as ImagePicker.PermissionResponse;

async function abrir() {
  await renderRouter(appDir, { initialUrl: '/enviar' });
}
const tocar = (nome: string) => fireEvent.press(screen.getByRole('button', { name: nome }));

beforeEach(async () => {
  jest.clearAllMocks();
  await salvarSessao();
  jest.mocked(api.eu).mockResolvedValue({ usuario: SESSAO.usuario });
  jest.mocked(api.listarImagens).mockResolvedValue([]);
  picker.requestCameraPermissionsAsync.mockResolvedValue(concedida);
  picker.requestMediaLibraryPermissionsAsync.mockResolvedValue(concedida);
  picker.launchCameraAsync.mockResolvedValue(escolhida);
  picker.launchImageLibraryAsync.mockResolvedValue(escolhida);
});

it('mostra os dois botões e não pede permissão antes do toque', async () => {
  await abrir();
  expect(await screen.findByRole('button', { name: 'Tirar foto' })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Escolher da galeria' })).toBeOnTheScreen();
  expect(picker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
  expect(picker.requestMediaLibraryPermissionsAsync).not.toHaveBeenCalled();
});

it('mostra a prévia da foto da galeria com qualidade 0,7 e permite trocar', async () => {
  await abrir();
  await tocar('Escolher da galeria');
  expect(await screen.findByLabelText('Prévia da foto')).toBeOnTheScreen();
  expect(picker.launchImageLibraryAsync).toHaveBeenCalledWith(expect.objectContaining({ quality: 0.7 }));
  await tocar('Tirar foto');
  expect(picker.launchCameraAsync).toHaveBeenCalledWith(expect.objectContaining({ quality: 0.7 }));
  expect(screen.getByLabelText('Prévia da foto')).toBeOnTheScreen();
});

it('permissão negada mostra a mensagem e o outro botão continua ativo', async () => {
  picker.requestCameraPermissionsAsync.mockResolvedValue(negada);
  await abrir();
  await tocar('Tirar foto');
  expect(await screen.findByText('Permita o acesso à câmera nas configurações do celular')).toBeOnTheScreen();
  expect(picker.launchCameraAsync).not.toHaveBeenCalled();
  await tocar('Escolher da galeria');
  expect(await screen.findByLabelText('Prévia da foto')).toBeOnTheScreen();
});

it('permissão da galeria negada mostra a mensagem equivalente', async () => {
  picker.requestMediaLibraryPermissionsAsync.mockResolvedValue(negada);
  await abrir();
  await tocar('Escolher da galeria');
  expect(await screen.findByText('Permita o acesso à galeria nas configurações do celular')).toBeOnTheScreen();
});

it('mostra carregamento, não reenvia e exibe a Descrição com Ver detalhes', async () => {
  let concluir: (v: typeof imagem) => void = () => {};
  enviarFalso.mockReturnValue(new Promise((r) => (concluir = r)));
  await abrir();
  await tocar('Escolher da galeria');
  await screen.findByLabelText('Prévia da foto');
  await tocar('Descrever');
  expect(screen.getByLabelText('Descrevendo a foto')).toBeOnTheScreen();
  await tocar('Descrever');
  expect(enviarFalso).toHaveBeenCalledTimes(1);
  expect(enviarFalso).toHaveBeenCalledWith({ uri: 'file:///foto.jpg', tipo: 'image/jpeg', nome: 'foto.jpg' });

  await act(async () => concluir(imagem));
  expect(await screen.findByText('Um cachorro caramelo.')).toBeOnTheScreen();
  expect(screen.getByLabelText('Prévia da foto')).toBeOnTheScreen();
  await tocar('Ver detalhes');
  await waitFor(() => expect(api.obterImagem).toHaveBeenCalledWith('12'));
});

it('Enviar outra volta ao estado inicial', async () => {
  enviarFalso.mockResolvedValue(imagem);
  await abrir();
  await tocar('Escolher da galeria');
  await screen.findByLabelText('Prévia da foto');
  await tocar('Descrever');
  await screen.findByText('Um cachorro caramelo.');
  await tocar('Enviar outra');
  expect(screen.queryByLabelText('Prévia da foto')).toBeNull();
  expect(screen.queryByText('Um cachorro caramelo.')).toBeNull();
  expect(screen.getByRole('button', { name: 'Tirar foto' })).toBeOnTheScreen();
});

it('erro mostra a mensagem e Tentar de novo reenvia a mesma foto', async () => {
  enviarFalso.mockRejectedValueOnce(new ErroApi('FALHA_NA_DESCRICAO', 'Não foi possível descrever a foto.'));
  enviarFalso.mockResolvedValueOnce(imagem);
  await abrir();
  await tocar('Tirar foto');
  await screen.findByLabelText('Prévia da foto');
  await tocar('Descrever');
  expect(await screen.findByText('Não foi possível descrever a foto.')).toBeOnTheScreen();
  await tocar('Tentar de novo');
  expect(await screen.findByText('Um cachorro caramelo.')).toBeOnTheScreen();
  expect(enviarFalso).toHaveBeenCalledTimes(2);
  expect(enviarFalso.mock.calls[1][0]).toEqual(enviarFalso.mock.calls[0][0]);
});

it('a Imagem enviada aparece no topo de Minhas imagens', async () => {
  const antiga = { ...imagem, id: 5, descricao: 'Imagem antiga.' };
  jest.mocked(api.listarImagens).mockResolvedValue([antiga]);
  enviarFalso.mockResolvedValue(imagem);
  await abrir();
  await tocar('Escolher da galeria');
  await screen.findByLabelText('Prévia da foto');
  await tocar('Descrever');
  await screen.findByText('Ver detalhes');
  await act(async () => router.navigate('/'));
  const cartoes = await screen.findAllByLabelText(/^Abrir imagem:/);
  expect(cartoes.map((c) => c.props.accessibilityLabel)).toEqual(['Abrir imagem: Um cachorro caramelo.', 'Abrir imagem: Imagem antiga.']);
  expect(api.listarImagens).toHaveBeenCalledTimes(1);
});

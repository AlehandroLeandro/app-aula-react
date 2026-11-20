import { File } from 'expo-file-system';
import { Platform } from 'react-native';

// Único módulo que fala com o backend. Nenhuma tela chama fetch diretamente.

export type UsuarioApi = { id: number; nome: string };
export type ImagemApi = {
  id: number;
  descricao: string;
  favorita: boolean;
  criadaEm: string;
  urlArquivo: string;
};
export type FotoParaEnviar = { uri: string; tipo: string; nome: string };
export type RespostaAuth = { token: string; usuario: UsuarioApi };

export class ErroApi extends Error {
  codigo: string;
  detalhe?: string;

  constructor(codigo: string, mensagem: string, detalhe?: string) {
    super(mensagem);
    this.codigo = codigo;
    this.detalhe = detalhe;
  }
}

const MENSAGEM_REDE = 'Não foi possível conectar ao servidor.';
const MENSAGEM_TEMPO = 'O servidor demorou para responder. Tente de novo.';
const TEMPO_ENVIO_MS = 60_000;
const MENSAGEM_GENERICA = 'Algo deu errado. Tente novamente.';

let token: string | null = null;

// A sessão chama isto sempre que o token muda; todas as chamadas seguintes enviam o Bearer.
export function definirToken(novo: string | null) {
  token = novo;
}

type Opcoes = { corpo?: unknown; multipart?: FormData; tempoMs?: number };

async function requisicao<T>(metodo: 'GET' | 'POST' | 'PUT' | 'DELETE', caminho: string, { corpo, multipart, tempoMs }: Opcoes = {}): Promise<T> {
  const base = process.env.EXPO_PUBLIC_API_URL ?? '';
  const headers: Record<string, string> = {};
  // No multipart o Content-Type fica de fora: o fetch põe o boundary sozinho.
  if (!multipart) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const controle = new AbortController();
  const temporizador = tempoMs ? setTimeout(() => controle.abort(), tempoMs) : undefined;

  let resposta: Response;
  try {
    resposta = await fetch(`${base}${caminho}`, {
      method: metodo,
      headers,
      body: multipart ?? (corpo === undefined ? undefined : JSON.stringify(corpo)),
      signal: controle.signal,
    });
  } catch (e) {
    // Diagnóstico: o erro real do fetch aparece no terminal do Expo e na tela de envio.
    const detalhe = `${metodo} ${base}${caminho} -> ${String(e)}`;
    console.warn('[api] falha de rede:', detalhe);
    throw controle.signal.aborted ? new ErroApi('TEMPO_ESGOTADO', MENSAGEM_TEMPO, detalhe) : new ErroApi('SEM_CONEXAO', MENSAGEM_REDE, detalhe);
  } finally {
    clearTimeout(temporizador);
  }

  let dados: unknown = null;
  // 204 não tem corpo; nos demais casos um corpo vazio ou que não é JSON também vira null.
  if (resposta.status !== 204) {
    try {
      dados = await resposta.json();
    } catch {
      // corpo vazio ou que não é JSON
    }
  }

  if (!resposta.ok) {
    const erro = (dados as { erro?: { codigo?: string; mensagem?: string } } | null)?.erro;
    throw new ErroApi(erro?.codigo ?? 'ERRO_DESCONHECIDO', erro?.mensagem ?? MENSAGEM_GENERICA);
  }
  return dados as T;
}

export function cadastrar(nome: string, senha: string) {
  return requisicao<RespostaAuth>('POST', '/auth/cadastro', { corpo: { nome, senha } });
}

export function entrar(nome: string, senha: string) {
  return requisicao<RespostaAuth>('POST', '/auth/login', { corpo: { nome, senha } });
}

// Usado pela issue #7 para validar a sessão salva.
export function eu() {
  return requisicao<{ usuario: UsuarioApi }>('GET', '/auth/eu');
}

// Envia a foto (campo `foto`) e só responde depois da Descrição pronta; desiste em 60 s.
export async function enviarImagem(foto: FotoParaEnviar) {
  const formulario = new FormData();
  if (Platform.OS === 'web') {
    // No navegador o arquivo é um Blob lido da uri.
    formulario.append('foto', await (await fetch(foto.uri)).blob(), foto.nome);
  } else {
    // No celular o fetch do Expo não aceita { uri, name, type }; o File do expo-file-system é suportado.
    formulario.append('foto', new File(foto.uri) as unknown as Blob);
  }
  return requisicao<ImagemApi>('POST', '/imagens', { multipart: formulario, tempoMs: TEMPO_ENVIO_MS });
}

export function listarImagens() {
  return requisicao<ImagemApi[]>('GET', '/imagens');
}

export function obterImagem(id: number | string) {
  return requisicao<ImagemApi>('GET', `/imagens/${id}`);
}

// Responde 204 sem corpo.
export async function removerImagem(id: number | string): Promise<void> {
  await requisicao<null>('DELETE', `/imagens/${id}`);
}

export function definirFavorita(id: number | string, favorita: boolean) {
  return requisicao<ImagemApi>('PUT', `/imagens/${id}/favorita`, { corpo: { favorita } });
}

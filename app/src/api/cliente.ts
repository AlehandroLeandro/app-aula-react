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

  constructor(codigo: string, mensagem: string) {
    super(mensagem);
    this.codigo = codigo;
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

async function requisicao<T>(metodo: 'GET' | 'POST', caminho: string, { corpo, multipart, tempoMs }: Opcoes = {}): Promise<T> {
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
  } catch {
    throw controle.signal.aborted ? new ErroApi('TEMPO_ESGOTADO', MENSAGEM_TEMPO) : new ErroApi('SEM_CONEXAO', MENSAGEM_REDE);
  } finally {
    clearTimeout(temporizador);
  }

  let dados: unknown = null;
  try {
    dados = await resposta.json();
  } catch {
    // corpo vazio ou que não é JSON
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
export function enviarImagem(foto: FotoParaEnviar) {
  const formulario = new FormData();
  // No React Native o arquivo é descrito por { uri, name, type }.
  formulario.append('foto', { uri: foto.uri, name: foto.nome, type: foto.tipo } as unknown as Blob);
  return requisicao<ImagemApi>('POST', '/imagens', { multipart: formulario, tempoMs: TEMPO_ENVIO_MS });
}

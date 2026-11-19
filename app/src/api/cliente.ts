// Único módulo que fala com o backend. Nenhuma tela chama fetch diretamente.

export type UsuarioApi = { id: number; nome: string };
export type RespostaAuth = { token: string; usuario: UsuarioApi };

export class ErroApi extends Error {
  codigo: string;

  constructor(codigo: string, mensagem: string) {
    super(mensagem);
    this.codigo = codigo;
  }
}

const MENSAGEM_REDE = 'Não foi possível conectar ao servidor.';
const MENSAGEM_GENERICA = 'Algo deu errado. Tente novamente.';

let token: string | null = null;

// A sessão chama isto sempre que o token muda; todas as chamadas seguintes enviam o Bearer.
export function definirToken(novo: string | null) {
  token = novo;
}

async function requisicao<T>(metodo: 'GET' | 'POST', caminho: string, corpo?: unknown): Promise<T> {
  const base = process.env.EXPO_PUBLIC_API_URL ?? '';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let resposta: Response;
  try {
    resposta = await fetch(`${base}${caminho}`, {
      method: metodo,
      headers,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
  } catch {
    throw new ErroApi('SEM_CONEXAO', MENSAGEM_REDE);
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
  return requisicao<RespostaAuth>('POST', '/auth/cadastro', { nome, senha });
}

export function entrar(nome: string, senha: string) {
  return requisicao<RespostaAuth>('POST', '/auth/login', { nome, senha });
}

// Usado pela issue #7 para validar a sessão salva.
export function eu() {
  return requisicao<{ usuario: UsuarioApi }>('GET', '/auth/eu');
}

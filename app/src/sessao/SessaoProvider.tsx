import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as api from '../api/cliente';
import type { UsuarioApi } from '../api/cliente';

export const CHAVE_SESSAO = '@descritor/sessao';

type Estado = 'carregando' | 'erro' | 'pronto';

type Sessao = {
  usuario: UsuarioApi | null;
  token: string | null;
  estado: Estado;
  entrar: (nome: string, senha: string) => Promise<void>;
  cadastrar: (nome: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
  revalidar: () => void;
};

type Salva = { token: string; usuario: UsuarioApi };

const Contexto = createContext<Sessao | null>(null);

function lerSalva(texto: string | null): Salva | null {
  if (!texto) return null;
  try {
    const v = JSON.parse(texto);
    if (typeof v?.token === 'string' && typeof v?.usuario?.id === 'number' && typeof v?.usuario?.nome === 'string') {
      return { token: v.token, usuario: { id: v.usuario.id, nome: v.usuario.nome } };
    }
  } catch {
    // JSON inválido: tratado como sem sessão
  }
  return null;
}

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Salva | null>(null);
  const [estado, setEstado] = useState<Estado>('carregando');
  const [tentativa, setTentativa] = useState(0);

  const limpar = useCallback(async () => {
    api.definirToken(null);
    setSessao(null);
    await AsyncStorage.removeItem(CHAVE_SESSAO);
  }, []);

  const guardar = useCallback(async (resposta: api.RespostaAuth) => {
    api.definirToken(resposta.token);
    await AsyncStorage.setItem(CHAVE_SESSAO, JSON.stringify({ token: resposta.token, usuario: resposta.usuario }));
    setSessao({ token: resposta.token, usuario: resposta.usuario });
  }, []);

  // Ao abrir: lê a sessão salva e valida o token em GET /auth/eu.
  useEffect(() => {
    let ativo = true;
    (async () => {
      setEstado('carregando');
      const salva = lerSalva(await AsyncStorage.getItem(CHAVE_SESSAO));
      if (!salva) {
        await limpar();
        if (ativo) setEstado('pronto');
        return;
      }
      api.definirToken(salva.token);
      try {
        const { usuario } = await api.eu();
        if (!ativo) return;
        setSessao({ token: salva.token, usuario });
        setEstado('pronto');
      } catch (e) {
        if (!ativo) return;
        if (e instanceof api.ErroApi && e.codigo === 'NAO_AUTENTICADO') {
          await limpar();
          if (ativo) setEstado('pronto');
        } else {
          setEstado('erro'); // falha de rede: mantém a sessão salva
        }
      }
    })();
    return () => {
      ativo = false;
    };
  }, [tentativa, limpar]);

  const entrar = useCallback(
    async (nome: string, senha: string) => guardar(await api.entrar(nome, senha)),
    [guardar],
  );
  const cadastrar = useCallback(
    async (nome: string, senha: string) => guardar(await api.cadastrar(nome, senha)),
    [guardar],
  );
  const revalidar = useCallback(() => setTentativa((n) => n + 1), []);

  const valor = useMemo(
    () => ({ usuario: sessao?.usuario ?? null, token: sessao?.token ?? null, estado, entrar, cadastrar, sair: limpar, revalidar }),
    [sessao, estado, entrar, cadastrar, limpar, revalidar],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSessao(): Sessao {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useSessao deve ser usado dentro de SessaoProvider');
  return contexto;
}

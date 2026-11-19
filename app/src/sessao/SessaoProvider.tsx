import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import * as api from '../api/cliente';
import type { UsuarioApi } from '../api/cliente';

type Sessao = {
  usuario: UsuarioApi | null;
  token: string | null;
  entrar: (nome: string, senha: string) => Promise<void>;
  cadastrar: (nome: string, senha: string) => Promise<void>;
};

const Contexto = createContext<Sessao | null>(null);

// Por enquanto a sessão vive só em memória (a persistência e o "sair" ficam para a issue #7).
export function SessaoProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioApi | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const guardar = useCallback((resposta: api.RespostaAuth) => {
    api.definirToken(resposta.token);
    setToken(resposta.token);
    setUsuario(resposta.usuario);
  }, []);

  const entrar = useCallback(
    async (nome: string, senha: string) => guardar(await api.entrar(nome, senha)),
    [guardar],
  );
  const cadastrar = useCallback(
    async (nome: string, senha: string) => guardar(await api.cadastrar(nome, senha)),
    [guardar],
  );

  const valor = useMemo(() => ({ usuario, token, entrar, cadastrar }), [usuario, token, entrar, cadastrar]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSessao(): Sessao {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useSessao deve ser usado dentro de SessaoProvider');
  return contexto;
}

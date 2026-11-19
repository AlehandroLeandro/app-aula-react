import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as api from '../api/cliente';
import type { ImagemApi } from '../api/cliente';
import { useSessao } from '../sessao/SessaoProvider';

type Imagens = {
  // null enquanto a primeira carga não terminou
  imagens: ImagemApi[] | null;
  erro: string | null;
  atualizando: boolean;
  recarregar: () => Promise<void>;
  adicionar: (nova: ImagemApi) => void;
  remover: (id: number) => void;
  erroFavorita: string | null;
  alternarFavorita: (id: number, favorita: boolean) => Promise<void>;
};

const Contexto = createContext<Imagens | null>(null);

export function ImagensProvider({ children }: { children: ReactNode }) {
  const { usuario } = useSessao();
  const idUsuario = usuario?.id ?? null;
  const [imagens, setImagens] = useState<ImagemApi[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [erroFavorita, setErroFavorita] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  // Respostas de uma sessão anterior (ou de uma carga já substituída) são descartadas.
  const geracao = useRef(0);

  const recarregar = useCallback(async () => {
    const minha = ++geracao.current;
    setErro(null);
    setAtualizando(true);
    try {
      const lista = await api.listarImagens();
      if (minha === geracao.current) setImagens(lista);
    } catch (e) {
      if (minha === geracao.current) setErro(e instanceof api.ErroApi ? e.message : 'Algo deu errado. Tente novamente.');
    } finally {
      if (minha === geracao.current) setAtualizando(false);
    }
  }, []);

  useEffect(() => {
    if (idUsuario === null) {
      geracao.current++;
      setImagens(null);
      setErro(null);
      setErroFavorita(null);
      setAtualizando(false);
      return;
    }
    void recarregar();
  }, [idUsuario, recarregar]);

  const adicionar = useCallback((nova: ImagemApi) => setImagens((atual) => [nova, ...(atual ?? [])]), []);
  const remover = useCallback(
    (id: number) => setImagens((atual) => (atual ? atual.filter((i) => i.id !== id) : atual)),
    [],
  );

  const marcar = (id: number, favorita: boolean) =>
    setImagens((atual) => (atual ? atual.map((i) => (i.id === id ? { ...i, favorita } : i)) : atual));

  // Otimista: troca antes da chamada e desfaz se o servidor falhar.
  const alternarFavorita = useCallback(async (id: number, favorita: boolean) => {
    setErroFavorita(null);
    marcar(id, favorita);
    try {
      await api.definirFavorita(id, favorita);
    } catch (e) {
      marcar(id, !favorita);
      setErroFavorita(e instanceof api.ErroApi ? e.message : 'Algo deu errado. Tente novamente.');
    }
  }, []);

  const valor = useMemo(
    () => ({ imagens, erro, atualizando, recarregar, adicionar, remover, erroFavorita, alternarFavorita }),
    [imagens, erro, atualizando, recarregar, adicionar, remover, erroFavorita, alternarFavorita],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useImagens(): Imagens {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useImagens deve ser usado dentro de ImagensProvider');
  return contexto;
}

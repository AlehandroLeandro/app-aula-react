import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

export const CHAVE_TEMA = '@descritor/tema';

export type NomeTema = 'claro' | 'escuro';

// Único ponto de definição de cores do app.
export const cores = {
  claro: {
    fundo: '#F7F7FA',
    superficie: '#FFFFFF',
    texto: '#16161D',
    textoSecundario: '#5B5B6B',
    borda: '#D9D9E3',
    primaria: '#4F46E5',
    textoSobrePrimaria: '#FFFFFF',
    desabilitado: '#C7C7D1',
    textoDesabilitado: '#6B6B78',
    erro: '#B3261E',
    favorita: '#B7791F',
  },
  escuro: {
    fundo: '#0F0F14',
    superficie: '#1B1B24',
    texto: '#F2F2F7',
    textoSecundario: '#A8A8B8',
    borda: '#33333F',
    primaria: '#818CF8',
    textoSobrePrimaria: '#0F0F14',
    desabilitado: '#33333F',
    textoDesabilitado: '#8A8A99',
    erro: '#F2B8B5',
    favorita: '#F6C453',
  },
} as const;

export type Cores = { [K in keyof (typeof cores)['claro']]: string };

type TemaContexto = {
  nome: NomeTema;
  cores: Cores;
  trocarTema: (nome: NomeTema) => void;
};

const Contexto = createContext<TemaContexto | null>(null);

function ehNomeTema(valor: string | null): valor is NomeTema {
  return valor === 'claro' || valor === 'escuro';
}

export function TemaProvider({ children }: { children: ReactNode }) {
  const sistema = useColorScheme();
  const [escolha, setEscolha] = useState<NomeTema | null>(null);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    let ativo = true;
    AsyncStorage.getItem(CHAVE_TEMA)
      .then((valor) => {
        if (ativo && ehNomeTema(valor)) setEscolha(valor);
      })
      .catch(() => {})
      .finally(() => {
        if (ativo) setCarregado(true);
      });
    return () => {
      ativo = false;
    };
  }, []);

  const trocarTema = useCallback((nome: NomeTema) => {
    setEscolha(nome);
    AsyncStorage.setItem(CHAVE_TEMA, nome).catch(() => {});
  }, []);

  const nome: NomeTema = escolha ?? (sistema === 'dark' ? 'escuro' : 'claro');
  const valor = useMemo(() => ({ nome, cores: cores[nome], trocarTema }), [nome, trocarTema]);

  if (!carregado) return null;
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useTema(): TemaContexto {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useTema deve ser usado dentro de TemaProvider');
  return contexto;
}

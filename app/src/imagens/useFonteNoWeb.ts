import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';

type Fonte = { uri: string; headers?: Record<string, string> };

// A foto fica atrás do token, mas o <Image> nem sempre envia `headers` (web ignora; no celular
// a miniatura ficava em branco). Baixamos a foto com o token e exibimos a cópia local:
// blob URL no web, arquivo em cache no celular.
//
// Cache em memória por foto+token: a lista, os favoritos e os detalhes compartilham o mesmo
// download (uma requisição só, e nada é baixado de novo ao voltar para a tela).
const cache = new Map<string, Promise<string>>();

function baixarNoWeb(uri: string, autorizacao: string): Promise<string> {
  return fetch(uri, { headers: { Authorization: autorizacao } })
    .then((r) => (r.ok ? r.blob() : Promise.reject(new Error('foto'))))
    .then((blob) => URL.createObjectURL(blob));
}

async function baixarNoCelular(uri: string, autorizacao: string, chave: string): Promise<string> {
  const arquivo = new File(Paths.cache, `foto-${chave.replace(/[^a-z0-9]/gi, '_')}.img`);
  if (arquivo.exists) return arquivo.uri;
  return (await File.downloadFileAsync(uri, arquivo, { headers: { Authorization: autorizacao }, idempotent: true })).uri;
}

function obter(uri: string, autorizacao: string): Promise<string> {
  // O token entra na chave: outro usuário no mesmo aparelho não reaproveita a foto.
  const chave = `${uri}|${autorizacao.slice(-16)}`;
  let p = cache.get(chave);
  if (!p) {
    p = Platform.OS === 'web' ? baixarNoWeb(uri, autorizacao) : baixarNoCelular(uri, autorizacao, chave);
    p.catch(() => cache.delete(chave)); // falhou: tenta de novo na próxima vez
    cache.set(chave, p);
  }
  return p;
}

export function useFonteNoWeb(fonte: Fonte): Fonte {
  const { uri } = fonte;
  const autorizacao = fonte.headers?.Authorization;
  const [local, setLocal] = useState<string | null>(null);

  useEffect(() => {
    if (!autorizacao) return;
    let ativo = true;
    setLocal(null);
    obter(uri, autorizacao).then((u) => ativo && setLocal(u)).catch(() => {});
    return () => {
      ativo = false;
    };
  }, [uri, autorizacao]);

  if (!autorizacao) return fonte;
  return { uri: local ?? '' };
}

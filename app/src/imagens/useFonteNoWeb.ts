import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

type Fonte = { uri: string; headers?: Record<string, string> };

// O react-native-web ignora `headers` do <Image>. No web baixamos a foto com o token
// e usamos um blob URL; no celular a fonte passa direto, sem mudança.
export function useFonteNoWeb(fonte: Fonte): Fonte {
  const { uri } = fonte;
  const autorizacao = fonte.headers?.Authorization;
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const web = Platform.OS === 'web' && !!autorizacao;

  useEffect(() => {
    if (!web) return;
    let ativo = true;
    let criada: string | null = null;
    setBlobUrl(null);
    fetch(uri, { headers: { Authorization: autorizacao as string } })
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error('foto'))))
      .then((blob) => {
        if (!ativo) return;
        criada = URL.createObjectURL(blob);
        setBlobUrl(criada);
      })
      .catch(() => {});
    return () => {
      ativo = false;
      if (criada) URL.revokeObjectURL(criada);
    };
  }, [web, uri, autorizacao]);

  if (!web) return fonte;
  return { uri: blobUrl ?? '' };
}

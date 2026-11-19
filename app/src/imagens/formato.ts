import type { ImagemApi } from '../api/cliente';

// A foto fica atrás do token: a `source` do <Image> leva o Authorization em `headers`.
export function fonteDaFoto(imagem: ImagemApi, token: string | null) {
  const uri = `${process.env.EXPO_PUBLIC_API_URL ?? ''}${imagem.urlArquivo}`;
  return token ? { uri, headers: { Authorization: `Bearer ${token}` } } : { uri };
}

const dois = (n: number) => String(n).padStart(2, '0');

// "18/11/2026 14:03" (fuso do aparelho)
export function formatarData(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()} ${dois(d.getHours())}:${dois(d.getMinutes())}`;
}

// Minúsculas e sem acentos, para a busca ("cafe" acha "Café").
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

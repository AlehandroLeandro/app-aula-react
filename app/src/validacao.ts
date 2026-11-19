// Mesmas regras do backend, repetidas aqui para avisar antes de enviar.
export function erroNome(nome: string): string | null {
  const tamanho = nome.trim().length;
  return tamanho < 2 || tamanho > 30 ? 'O nome deve ter de 2 a 30 caracteres.' : null;
}

export function erroSenha(senha: string): string | null {
  return senha.length < 4 ? 'A senha deve ter pelo menos 4 caracteres.' : null;
}

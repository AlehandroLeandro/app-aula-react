import { router } from 'expo-router';
import { FormularioConta } from '../../componentes/FormularioConta';
import { useSessao } from '../../sessao/SessaoProvider';

export default function LoginScreen() {
  const { entrar } = useSessao();
  return (
    <FormularioConta
      titulo="Login"
      botao="Entrar"
      linkTexto="Não tem conta? Cadastre-se"
      linkDestino="/cadastro"
      enviar={entrar}
      aoConcluir={() => router.replace('/')}
    />
  );
}

import { router } from 'expo-router';
import { FormularioConta } from '../../componentes/FormularioConta';
import { useSessao } from '../../sessao/SessaoProvider';

export default function CadastroScreen() {
  const { cadastrar } = useSessao();
  return (
    <FormularioConta
      titulo="Cadastro"
      botao="Criar conta"
      linkTexto="Já tem conta? Entre"
      linkDestino="/login"
      enviar={cadastrar}
      aoConcluir={() => router.replace('/')}
    />
  );
}

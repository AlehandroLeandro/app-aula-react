import { Redirect, Stack } from 'expo-router';
import { useSessao } from '../../sessao/SessaoProvider';
import { useTema } from '../../tema/tema';

export default function AuthLayout() {
  const { cores } = useTema();
  const { usuario } = useSessao();
  if (usuario) return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.fundo } }} />;
}

import { Stack } from 'expo-router';
import { useTema } from '../../tema/tema';

export default function AuthLayout() {
  const { cores } = useTema();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.fundo } }} />;
}

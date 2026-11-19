import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="item/[id]" options={{ headerShown: true, title: 'Detalhes da Imagem' }} />
    </Stack>
  );
}

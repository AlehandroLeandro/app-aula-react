import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TemaProvider, useTema } from '../tema/tema';

function Navegacao() {
  const { nome, cores } = useTema();
  return (
    <>
      <StatusBar style={nome === 'escuro' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.fundo } }}>
        <Stack.Screen
          name="item/[id]"
          options={{
            headerShown: true,
            title: 'Detalhes da Imagem',
            headerStyle: { backgroundColor: cores.superficie },
            headerTintColor: cores.texto,
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <TemaProvider>
      <Navegacao />
    </TemaProvider>
  );
}

import { Redirect, Tabs } from 'expo-router';
import { useSessao } from '../../sessao/SessaoProvider';
import { useTema } from '../../tema/tema';

export default function TabsLayout() {
  const { cores } = useTema();
  const { usuario } = useSessao();
  if (!usuario) return <Redirect href="/login" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: cores.fundo },
        tabBarStyle: { backgroundColor: cores.superficie, borderTopColor: cores.borda },
        tabBarActiveTintColor: cores.primaria,
        tabBarInactiveTintColor: cores.textoSecundario,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Minhas imagens' }} />
      <Tabs.Screen name="enviar" options={{ title: 'Enviar' }} />
      <Tabs.Screen name="favoritos" options={{ title: 'Favoritos' }} />
      <Tabs.Screen name="configuracoes" options={{ title: 'Configurações' }} />
    </Tabs>
  );
}

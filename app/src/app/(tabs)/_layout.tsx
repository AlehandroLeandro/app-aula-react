import { Tabs } from 'expo-router';
import { useTema } from '../../tema/tema';

export default function TabsLayout() {
  const { cores } = useTema();
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

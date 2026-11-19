import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Carregando } from '../componentes/Carregando';
import { MensagemErro } from '../componentes/MensagemErro';
import { SessaoProvider, useSessao } from '../sessao/SessaoProvider';
import { TemaProvider, useTema } from '../tema/tema';

function Navegacao() {
  const { nome, cores } = useTema();
  const { estado, revalidar } = useSessao();
  if (estado === 'carregando') return <Carregando />;
  if (estado === 'erro') {
    return <MensagemErro mensagem="Não foi possível validar sua sessão." onTentarDeNovo={revalidar} />;
  }
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
      <SessaoProvider>
        <Navegacao />
      </SessaoProvider>
    </TemaProvider>
  );
}

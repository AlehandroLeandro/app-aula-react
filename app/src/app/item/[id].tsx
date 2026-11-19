import { Redirect, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSessao } from '../../sessao/SessaoProvider';
import { useTema } from '../../tema/tema';

export default function DetalhesDaImagemScreen() {
  const { cores } = useTema();
  const { usuario } = useSessao();
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!usuario) return <Redirect href="/login" />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cores.fundo }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: cores.texto }]}>Detalhes da Imagem</Text>
      <Text style={{ color: cores.texto }}>{id}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: '700' },
});

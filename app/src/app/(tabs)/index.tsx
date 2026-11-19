import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EstadoVazio } from '../../componentes/EstadoVazio';
import { useTema } from '../../tema/tema';

export default function MinhasImagensScreen() {
  const { cores } = useTema();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cores.fundo }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: cores.texto }]}>Minhas imagens</Text>
      <EstadoVazio mensagem="Você ainda não enviou nenhuma imagem." />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: '700' },
});

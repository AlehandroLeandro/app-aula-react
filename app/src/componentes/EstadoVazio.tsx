import { StyleSheet, Text, View } from 'react-native';
import { useTema } from '../tema/tema';

export function EstadoVazio({ mensagem }: { mensagem: string }) {
  const { cores } = useTema();
  return (
    <View style={styles.centro}>
      <Text style={[styles.texto, { color: cores.textoSecundario }]}>{mensagem}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  texto: { fontSize: 16, textAlign: 'center' },
});

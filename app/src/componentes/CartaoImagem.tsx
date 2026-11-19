import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTema } from '../tema/tema';

type Props = {
  fonteMiniatura: { uri: string; headers?: Record<string, string> };
  descricao: string;
  data: string;
  favorita?: boolean;
  onPress: () => void;
};

export function CartaoImagem({ fonteMiniatura, descricao, data, favorita = false, onPress }: Props) {
  const { cores } = useTema();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir imagem: ${descricao}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.cartao,
        { backgroundColor: cores.superficie, borderColor: cores.borda },
        pressed && styles.pressionado,
      ]}
    >
      <Image
        accessibilityLabel="Miniatura da imagem"
        source={fonteMiniatura}
        style={[styles.miniatura, { backgroundColor: cores.borda }]}
      />
      <View style={styles.corpo}>
        <Text numberOfLines={2} style={[styles.descricao, { color: cores.texto }]}>{descricao}</Text>
        <View style={styles.rodape}>
          <Text style={[styles.data, { color: cores.textoSecundario }]}>{data}</Text>
          {favorita ? (
            <Text accessibilityLabel="Favorita" style={[styles.marca, { color: cores.favorita }]}>★ Favorita</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cartao: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  pressionado: { opacity: 0.8 },
  miniatura: { width: 72, height: 72, borderRadius: 8 },
  corpo: { flex: 1, gap: 6, justifyContent: 'center' },
  descricao: { fontSize: 15 },
  rodape: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  data: { fontSize: 13 },
  marca: { fontSize: 13, fontWeight: '600' },
});

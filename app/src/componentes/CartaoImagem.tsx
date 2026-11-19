import { Image, StyleSheet, Text, View } from 'react-native';
import { useTema } from '../tema/tema';

type Props = {
  uriMiniatura: string;
  descricao: string;
  favorita?: boolean;
};

export function CartaoImagem({ uriMiniatura, descricao, favorita = false }: Props) {
  const { cores } = useTema();
  return (
    <View style={[styles.cartao, { backgroundColor: cores.superficie, borderColor: cores.borda }]}>
      <Image
        accessibilityLabel="Miniatura da imagem"
        source={{ uri: uriMiniatura }}
        style={[styles.miniatura, { backgroundColor: cores.borda }]}
      />
      <View style={styles.corpo}>
        <Text numberOfLines={3} style={[styles.descricao, { color: cores.texto }]}>{descricao}</Text>
        {favorita ? (
          <Text accessibilityLabel="Favorita" style={[styles.marca, { color: cores.favorita }]}>★ Favorita</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  miniatura: { width: 72, height: 72, borderRadius: 8 },
  corpo: { flex: 1, gap: 6, justifyContent: 'center' },
  descricao: { fontSize: 15 },
  marca: { fontSize: 13, fontWeight: '600' },
});

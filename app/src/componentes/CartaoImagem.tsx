import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTema } from '../tema/tema';
import { EstrelaFavorita } from './EstrelaFavorita';

type Props = {
  fonteMiniatura: { uri: string; headers?: Record<string, string> };
  descricao: string;
  data: string;
  favorita?: boolean;
  onPress: () => void;
  onAlternarFavorita: () => void;
};

export function CartaoImagem({ fonteMiniatura, descricao, data, favorita = false, onPress, onAlternarFavorita }: Props) {
  const { cores } = useTema();
  return (
    <View style={styles.raiz}>
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
        </View>
      </View>
    </Pressable>
      <View style={styles.estrela}>
        <EstrelaFavorita favorita={favorita} onAlternar={onAlternarFavorita} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { position: 'relative' },
  // Irmã do cartão (não filha): o toque na estrela não chega ao Pressable que abre os detalhes.
  estrela: { position: 'absolute', right: 4, bottom: 4 },
  cartao: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  pressionado: { opacity: 0.8 },
  miniatura: { width: 72, height: 72, borderRadius: 8 },
  corpo: { flex: 1, gap: 6, justifyContent: 'center' },
  descricao: { fontSize: 15 },
  rodape: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 44 },
  data: { fontSize: 13 },
});

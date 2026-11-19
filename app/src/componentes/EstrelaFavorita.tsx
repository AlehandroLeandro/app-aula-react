import { Pressable, StyleSheet, Text } from 'react-native';
import { useTema } from '../tema/tema';

type Props = { favorita: boolean; onAlternar: () => void };

// Área de toque de 48x48; cheia = Favorita, vazada = não Favorita.
export function EstrelaFavorita({ favorita, onAlternar }: Props) {
  const { cores } = useTema();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={favorita ? 'Desmarcar como Favorita' : 'Marcar como Favorita'}
      accessibilityState={{ selected: favorita }}
      onPress={onAlternar}
      style={({ pressed }) => [styles.area, pressed && styles.pressionada]}
    >
      <Text style={[styles.estrela, { color: cores.favorita }]}>{favorita ? '★' : '☆'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  area: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  pressionada: { opacity: 0.6 },
  estrela: { fontSize: 28 },
});

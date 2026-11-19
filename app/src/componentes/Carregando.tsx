import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTema } from '../tema/tema';

export function Carregando() {
  const { cores } = useTema();
  return (
    <View accessibilityLabel="Carregando" style={styles.centro}>
      <ActivityIndicator size="large" color={cores.primaria} />
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

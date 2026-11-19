import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTema } from '../../tema/tema';

export default function LoginScreen() {
  const { cores } = useTema();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cores.fundo }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: cores.texto }]}>Login</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: '700' },
});

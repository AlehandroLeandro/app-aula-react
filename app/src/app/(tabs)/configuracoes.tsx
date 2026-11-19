import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BotaoGrande } from '../../componentes/BotaoGrande';
import { useTema } from '../../tema/tema';

export default function ConfiguracoesScreen() {
  const { cores, nome, trocarTema } = useTema();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cores.fundo }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: cores.texto }]}>Configurações</Text>
      <Text style={[styles.rotulo, { color: cores.textoSecundario }]}>Tema</Text>
      <View style={styles.opcoes}>
        <BotaoGrande titulo="Claro" variante={nome === 'claro' ? 'primario' : 'secundario'} selecionado={nome === 'claro'} onPress={() => trocarTema('claro')} />
        <BotaoGrande titulo="Escuro" variante={nome === 'escuro' ? 'primario' : 'secundario'} selecionado={nome === 'escuro'} onPress={() => trocarTema('escuro')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  rotulo: { marginTop: 24, marginBottom: 8, fontSize: 16 },
  opcoes: { gap: 12 },
  title: { fontSize: 24, fontWeight: '700' },
});

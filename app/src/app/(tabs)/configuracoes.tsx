import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BotaoGrande } from '../../componentes/BotaoGrande';
import { useSessao } from '../../sessao/SessaoProvider';
import { useTema } from '../../tema/tema';

export default function ConfiguracoesScreen() {
  const { cores, nome, trocarTema } = useTema();
  const { usuario, sair } = useSessao();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cores.fundo }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: cores.texto }]}>Configurações</Text>
      <Text style={[styles.rotulo, { color: cores.textoSecundario }]}>Usuário</Text>
      <Text style={{ color: cores.texto, fontSize: 18 }}>{usuario?.nome}</Text>
      <Text style={[styles.rotulo, { color: cores.textoSecundario }]}>Tema</Text>
      <View style={styles.opcoes}>
        <BotaoGrande titulo="Claro" variante={nome === 'claro' ? 'primario' : 'secundario'} selecionado={nome === 'claro'} onPress={() => trocarTema('claro')} />
        <BotaoGrande titulo="Escuro" variante={nome === 'escuro' ? 'primario' : 'secundario'} selecionado={nome === 'escuro'} onPress={() => trocarTema('escuro')} />
      </View>
      <View style={styles.sair}>
        <BotaoGrande titulo="Sair" variante="secundario" onPress={sair} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  rotulo: { marginTop: 24, marginBottom: 8, fontSize: 16 },
  sair: { marginTop: 32 },
  opcoes: { gap: 12 },
  title: { fontSize: 24, fontWeight: '700' },
});

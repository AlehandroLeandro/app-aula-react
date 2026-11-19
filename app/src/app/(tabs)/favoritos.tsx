import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CartaoImagem } from '../../componentes/CartaoImagem';
import { Carregando } from '../../componentes/Carregando';
import { EstadoVazio } from '../../componentes/EstadoVazio';
import { MensagemErro } from '../../componentes/MensagemErro';
import { fonteDaFoto, formatarData } from '../../imagens/formato';
import { useImagens } from '../../imagens/ImagensProvider';
import { useSessao } from '../../sessao/SessaoProvider';
import { useTema } from '../../tema/tema';

export default function FavoritosScreen() {
  const { cores } = useTema();
  const { token } = useSessao();
  const { imagens, erro, atualizando, recarregar, erroFavorita, alternarFavorita } = useImagens();
  const favoritas = useMemo(() => (imagens ?? []).filter((i) => i.favorita === true), [imagens]);

  const titulo = <Text accessibilityRole="header" style={[styles.title, { color: cores.texto }]}>Favoritos</Text>;

  if (imagens === null) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: cores.fundo }]}>
        {titulo}
        {erro ? <MensagemErro mensagem={erro} onTentarDeNovo={() => void recarregar()} /> : <Carregando />}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cores.fundo }]}>
      {titulo}
      {erro ? <Text accessibilityRole="alert" style={[styles.aviso, { color: cores.erro }]}>{erro}</Text> : null}
      {erroFavorita ? <Text accessibilityRole="alert" style={[styles.aviso, { color: cores.erro }]}>{erroFavorita}</Text> : null}
      <FlatList
        testID="lista-favoritos"
        data={favoritas}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.lista}
        refreshing={atualizando}
        onRefresh={() => void recarregar()}
        renderItem={({ item }) => (
          <CartaoImagem
            fonteMiniatura={fonteDaFoto(item, token)}
            descricao={item.descricao}
            data={formatarData(item.criadaEm)}
            favorita={item.favorita}
            onAlternarFavorita={() => void alternarFavorita(item.id, !item.favorita)}
            onPress={() => router.push(`/item/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <EstadoVazio mensagem="Nenhuma Imagem favorita ainda. Toque na estrela de uma Imagem para favoritar." />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  aviso: { fontSize: 14 },
  lista: { gap: 12, flexGrow: 1 },
});

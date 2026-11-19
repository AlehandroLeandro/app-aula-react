import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BotaoGrande } from '../../componentes/BotaoGrande';
import { CampoTexto } from '../../componentes/CampoTexto';
import { CartaoImagem } from '../../componentes/CartaoImagem';
import { Carregando } from '../../componentes/Carregando';
import { EstadoVazio } from '../../componentes/EstadoVazio';
import { MensagemErro } from '../../componentes/MensagemErro';
import { fonteDaFoto, formatarData, normalizar } from '../../imagens/formato';
import { useImagens } from '../../imagens/ImagensProvider';
import { useSessao } from '../../sessao/SessaoProvider';
import { useTema } from '../../tema/tema';

export default function MinhasImagensScreen() {
  const { cores } = useTema();
  const { token } = useSessao();
  const { imagens, erro, atualizando, recarregar } = useImagens();
  const [busca, setBusca] = useState('');

  const termo = busca.trim();
  const visiveis = useMemo(() => {
    if (!imagens) return [];
    if (!termo) return imagens;
    const alvo = normalizar(termo);
    return imagens.filter((i) => normalizar(i.descricao).includes(alvo));
  }, [imagens, termo]);

  const titulo = (
    <Text accessibilityRole="header" style={[styles.title, { color: cores.texto }]}>Minhas imagens</Text>
  );

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
      {imagens.length > 0 ? <CampoTexto rotulo="Buscar" value={busca} onChangeText={setBusca} /> : null}
      {erro ? <Text accessibilityRole="alert" style={[styles.aviso, { color: cores.erro }]}>{erro}</Text> : null}
      <FlatList
        testID="lista-imagens"
        data={visiveis}
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
            onPress={() => router.push(`/item/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          imagens.length === 0 ? (
            <View style={styles.vazio}>
              <EstadoVazio mensagem="Você ainda não enviou nenhuma Imagem" />
              <BotaoGrande titulo="Enviar uma Imagem" onPress={() => router.navigate('/enviar')} />
            </View>
          ) : (
            <EstadoVazio mensagem={`Nenhuma Imagem encontrada para "${termo}"`} />
          )
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
  vazio: { flex: 1, gap: 16 },
});

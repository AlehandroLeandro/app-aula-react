import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErroApi, obterImagem, removerImagem, type ImagemApi } from '../../api/cliente';
import { BotaoGrande } from '../../componentes/BotaoGrande';
import { Carregando } from '../../componentes/Carregando';
import { confirmar } from '../../componentes/confirmar';
import { EstrelaFavorita } from '../../componentes/EstrelaFavorita';
import { MensagemErro } from '../../componentes/MensagemErro';
import { fonteDaFoto, formatarData } from '../../imagens/formato';
import { useFonteNoWeb } from '../../imagens/useFonteNoWeb';
import { useImagens } from '../../imagens/ImagensProvider';
import { useSessao } from '../../sessao/SessaoProvider';
import { useTema } from '../../tema/tema';

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'nao-encontrada' }
  | { tipo: 'pronto'; imagem: ImagemApi };

const voltar = () => (router.canGoBack() ? router.back() : router.replace('/'));

function FotoDaImagem({ fonte, fundo }: { fonte: { uri: string; headers?: Record<string, string> }; fundo: string }) {
  return (
    <Image
      accessibilityLabel="Foto da Imagem"
      source={useFonteNoWeb(fonte)}
      style={[styles.foto, { backgroundColor: fundo }]}
      resizeMode="contain"
    />
  );
}

export default function DetalhesDaImagemScreen() {
  const { cores } = useTema();
  const { usuario, token } = useSessao();
  const { imagens, remover, erroFavorita, alternarFavorita } = useImagens();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' });
  const [tentativa, setTentativa] = useState(0);
  const [removendo, setRemovendo] = useState(false);
  const [erroRemover, setErroRemover] = useState<string | null>(null);

  useEffect(() => {
    if (!usuario) return;
    let ativo = true;
    setEstado({ tipo: 'carregando' });
    obterImagem(id)
      .then((imagem) => ativo && setEstado({ tipo: 'pronto', imagem }))
      .catch((e) => {
        if (!ativo) return;
        if (e instanceof ErroApi && e.codigo === 'NAO_ENCONTRADA') setEstado({ tipo: 'nao-encontrada' });
        else setEstado({ tipo: 'erro', mensagem: e instanceof ErroApi ? e.message : 'Algo deu errado. Tente novamente.' });
      });
    return () => {
      ativo = false;
    };
  }, [id, tentativa, usuario]);

  const confirmarRemocao = useCallback(
    async (imagem: ImagemApi) => {
      setErroRemover(null);
      setRemovendo(true);
      try {
        await removerImagem(imagem.id);
        remover(imagem.id);
        voltar();
      } catch (e) {
        setErroRemover(e instanceof ErroApi ? e.message : 'Algo deu errado. Tente novamente.');
        setRemovendo(false);
      }
    },
    [remover],
  );

  if (!usuario) return <Redirect href="/login" />;

  const corpo = () => {
    if (estado.tipo === 'carregando') return <Carregando />;
    if (estado.tipo === 'erro') {
      return <MensagemErro mensagem={estado.mensagem} onTentarDeNovo={() => setTentativa((n) => n + 1)} />;
    }
    if (estado.tipo === 'nao-encontrada') {
      return (
        <View style={styles.centro}>
          <Text accessibilityRole="alert" style={[styles.mensagem, { color: cores.texto }]}>Imagem não encontrada</Text>
          <BotaoGrande titulo="Voltar" onPress={voltar} />
        </View>
      );
    }
    const { imagem } = estado;
    // O provedor é a fonte da marca, para lista, detalhes e Favoritos concordarem.
    const favorita = imagens?.find((i) => i.id === imagem.id)?.favorita ?? imagem.favorita;
    return (
      <ScrollView contentContainerStyle={styles.conteudo}>
        <FotoDaImagem fonte={fonteDaFoto(imagem, token)} fundo={cores.borda} />
        <Text style={[styles.descricao, { color: cores.texto }]}>{imagem.descricao}</Text>
        <View style={styles.linha}>
          <Text style={{ color: cores.textoSecundario }}>{formatarData(imagem.criadaEm)}</Text>
          <EstrelaFavorita favorita={favorita} onAlternar={() => void alternarFavorita(imagem.id, !favorita)} />
        </View>
        {erroFavorita ? <Text accessibilityRole="alert" style={[styles.mensagem, { color: cores.erro }]}>{erroFavorita}</Text> : null}
        {erroRemover ? <Text accessibilityRole="alert" style={[styles.mensagem, { color: cores.erro }]}>{erroRemover}</Text> : null}
        <BotaoGrande
          titulo="Remover"
          variante="secundario"
          carregando={removendo}
          onPress={() => {
            void confirmar('Remover esta Imagem?', 'Não dá para desfazer.', 'Remover').then((sim) => {
              if (sim) void confirmarRemocao(imagem);
            });
          }}
        />
      </ScrollView>
    );
  };

  return <SafeAreaView edges={['bottom']} style={[styles.container, { backgroundColor: cores.fundo }]}>{corpo()}</SafeAreaView>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  conteudo: { padding: 24, gap: 16 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  foto: { width: '100%', aspectRatio: 1, borderRadius: 12 },
  descricao: { fontSize: 16, lineHeight: 24 },
  mensagem: { fontSize: 16 },
  linha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});

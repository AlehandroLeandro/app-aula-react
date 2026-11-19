import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { enviarImagem, ErroApi, type FotoParaEnviar, type ImagemApi } from '../../api/cliente';
import { BotaoGrande } from '../../componentes/BotaoGrande';
import { useTema } from '../../tema/tema';

type Origem = 'camera' | 'galeria';
type Estado = 'escolhendo' | 'enviando' | 'concluido';

const MENSAGEM_PERMISSAO: Record<Origem, string> = {
  camera: 'Permita o acesso à câmera nas configurações do celular',
  galeria: 'Permita o acesso à galeria nas configurações do celular',
};
const OPCOES: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7 };

export default function EnviarScreen() {
  const { cores } = useTema();
  const [foto, setFoto] = useState<FotoParaEnviar | null>(null);
  const [estado, setEstado] = useState<Estado>('escolhendo');
  const [imagem, setImagem] = useState<ImagemApi | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function escolher(origem: Origem) {
    setAviso(null);
    setErro(null);
    const camera = origem === 'camera';
    // A permissão só é pedida aqui, ao tocar no botão.
    const permissao = camera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      setAviso(MENSAGEM_PERMISSAO[origem]);
      return;
    }
    const resultado = camera
      ? await ImagePicker.launchCameraAsync(OPCOES)
      : await ImagePicker.launchImageLibraryAsync(OPCOES);
    const ativo = resultado.canceled ? undefined : resultado.assets[0];
    if (!ativo) return;
    setFoto({ uri: ativo.uri, tipo: ativo.mimeType ?? 'image/jpeg', nome: ativo.fileName ?? 'foto.jpg' });
  }

  async function descrever() {
    if (!foto || estado === 'enviando') return;
    setErro(null);
    setEstado('enviando');
    try {
      setImagem(await enviarImagem(foto));
      setEstado('concluido');
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Algo deu errado. Tente novamente.');
      setEstado('escolhendo');
    }
  }

  function enviarOutra() {
    setFoto(null);
    setImagem(null);
    setErro(null);
    setAviso(null);
    setEstado('escolhendo');
  }

  const enviando = estado === 'enviando';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cores.fundo }]}>
      <ScrollView contentContainerStyle={styles.conteudo}>
        <Text accessibilityRole="header" style={[styles.title, { color: cores.texto }]}>Enviar</Text>

        {foto ? (
          <Image
            accessibilityLabel="Prévia da foto"
            source={{ uri: foto.uri }}
            style={[styles.previa, { backgroundColor: cores.borda }]}
            resizeMode="cover"
          />
        ) : null}

        {estado === 'concluido' && imagem ? (
          <>
            <Text style={[styles.descricao, { color: cores.texto }]}>{imagem.descricao}</Text>
            <BotaoGrande titulo="Ver detalhes" onPress={() => router.push(`/item/${imagem.id}`)} />
            <BotaoGrande titulo="Enviar outra" variante="secundario" onPress={enviarOutra} />
          </>
        ) : (
          <>
            {aviso ? <Text accessibilityRole="alert" style={[styles.mensagem, { color: cores.erro }]}>{aviso}</Text> : null}
            {erro ? <Text accessibilityRole="alert" style={[styles.mensagem, { color: cores.erro }]}>{erro}</Text> : null}

            {enviando ? (
              <View accessibilityLabel="Descrevendo a foto" style={styles.carregando}>
                <ActivityIndicator size="large" color={cores.primaria} />
                <Text style={{ color: cores.textoSecundario }}>Descrevendo a foto...</Text>
              </View>
            ) : null}

            {foto ? (
              <BotaoGrande
                titulo={erro ? 'Tentar de novo' : 'Descrever'}
                carregando={enviando}
                onPress={() => void descrever()}
              />
            ) : null}
            <BotaoGrande
              titulo={'Tirar foto'}
              variante="secundario"
              desabilitado={enviando}
              onPress={() => void escolher('camera')}
            />
            <BotaoGrande
              titulo={'Escolher da galeria'}
              variante="secundario"
              desabilitado={enviando}
              onPress={() => void escolher('galeria')}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  conteudo: { padding: 24, gap: 16 },
  title: { fontSize: 24, fontWeight: '700' },
  previa: { width: '100%', aspectRatio: 1, borderRadius: 12 },
  descricao: { fontSize: 16, lineHeight: 24 },
  mensagem: { fontSize: 16 },
  carregando: { alignItems: 'center', gap: 8, padding: 8 },
});

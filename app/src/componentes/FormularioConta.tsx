import { Link, type Href } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErroApi } from '../api/cliente';
import { erroNome, erroSenha } from '../validacao';
import { useTema } from '../tema/tema';
import { BotaoGrande } from './BotaoGrande';
import { CampoTexto } from './CampoTexto';

type Props = {
  titulo: string;
  botao: string;
  linkTexto: string;
  linkDestino: Href;
  enviar: (nome: string, senha: string) => Promise<void>;
  aoConcluir: () => void;
};

// Corpo comum do Login e do Cadastro: campos, validação local, carregando e erro do servidor.
export function FormularioConta({ titulo, botao, linkTexto, linkDestino, enviar, aoConcluir }: Props) {
  const { cores } = useTema();
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [erros, setErros] = useState<{ nome: string | null; senha: string | null }>({ nome: null, senha: null });
  const [erroServidor, setErroServidor] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function aoEnviar() {
    if (carregando) return;
    const novos = { nome: erroNome(nome), senha: erroSenha(senha) };
    setErros(novos);
    setErroServidor(null);
    if (novos.nome || novos.senha) return;

    setCarregando(true);
    try {
      await enviar(nome.trim(), senha);
      aoConcluir();
    } catch (e) {
      setErroServidor(e instanceof ErroApi ? e.message : 'Algo deu errado. Tente novamente.');
      setCarregando(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cores.fundo }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
          <Text accessibilityRole="header" style={[styles.titulo, { color: cores.texto }]}>{titulo}</Text>
          <CampoTexto rotulo="Nome" value={nome} onChangeText={setNome} autoCapitalize="none" editable={!carregando} erro={erros.nome} />
          <CampoTexto rotulo="Senha" value={senha} onChangeText={setSenha} secureTextEntry autoCapitalize="none" editable={!carregando} erro={erros.senha} />
          {erroServidor ? <Text accessibilityRole="alert" style={[styles.erroServidor, { color: cores.erro }]}>{erroServidor}</Text> : null}
          <BotaoGrande titulo={botao} onPress={() => void aoEnviar()} carregando={carregando} />
          <Link href={linkDestino} replace style={[styles.link, { color: cores.primaria }]}>{linkTexto}</Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  conteudo: { padding: 24, gap: 16 },
  titulo: { fontSize: 24, fontWeight: '700' },
  erroServidor: { fontSize: 16 },
  link: { fontSize: 16, fontWeight: '600', textAlign: 'center', paddingVertical: 12 },
});

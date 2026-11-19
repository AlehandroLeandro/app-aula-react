import { StyleSheet, Text, View } from 'react-native';
import { useTema } from '../tema/tema';
import { BotaoGrande } from './BotaoGrande';

type Props = {
  mensagem?: string;
  onTentarDeNovo: () => void;
};

export function MensagemErro({ mensagem = 'Algo deu errado. Tente novamente.', onTentarDeNovo }: Props) {
  const { cores } = useTema();
  return (
    <View style={styles.centro}>
      <Text accessibilityRole="alert" style={[styles.texto, { color: cores.erro }]}>{mensagem}</Text>
      <BotaoGrande titulo="Tentar de novo" onPress={onTentarDeNovo} />
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  texto: { fontSize: 16, textAlign: 'center' },
});

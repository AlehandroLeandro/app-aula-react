import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { useTema } from '../tema/tema';

type Props = {
  titulo: string;
  onPress: () => void;
  desabilitado?: boolean;
  carregando?: boolean;
  variante?: 'primario' | 'secundario';
  selecionado?: boolean;
};

export function BotaoGrande({ titulo, onPress, desabilitado = false, carregando = false, variante = 'primario', selecionado }: Props) {
  const { cores } = useTema();
  const inativo = desabilitado || carregando;
  const primario = variante === 'primario';
  const fundo = desabilitado ? cores.desabilitado : primario ? cores.primaria : cores.superficie;
  const texto = desabilitado ? cores.textoDesabilitado : primario ? cores.textoSobrePrimaria : cores.texto;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ disabled: inativo, busy: carregando, selected: selecionado }}
      disabled={inativo}
      onPress={onPress}
      style={({ pressed }) => [
        styles.botao,
        { backgroundColor: fundo, borderColor: primario ? fundo : cores.borda },
        pressed && styles.pressionado,
      ]}
    >
      {carregando ? <ActivityIndicator color={texto} /> : <Text style={[styles.texto, { color: texto }]}>{titulo}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    minHeight: 48,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressionado: { opacity: 0.8 },
  texto: { fontSize: 16, fontWeight: '600' },
});

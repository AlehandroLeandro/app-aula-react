import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useTema } from '../tema/tema';

type Props = Pick<TextInputProps, 'value' | 'onChangeText' | 'secureTextEntry' | 'autoCapitalize' | 'editable' | 'onSubmitEditing'> & {
  rotulo: string;
  erro?: string | null;
};

export function CampoTexto({ rotulo, erro, ...resto }: Props) {
  const { cores } = useTema();
  return (
    <View style={styles.grupo}>
      <Text style={[styles.rotulo, { color: cores.texto }]}>{rotulo}</Text>
      <TextInput
        accessibilityLabel={rotulo}
        autoCorrect={false}
        placeholderTextColor={cores.textoSecundario}
        style={[styles.campo, { color: cores.texto, backgroundColor: cores.superficie, borderColor: erro ? cores.erro : cores.borda }]}
        {...resto}
      />
      {erro ? <Text accessibilityRole="alert" style={[styles.erro, { color: cores.erro }]}>{erro}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grupo: { gap: 6 },
  rotulo: { fontSize: 14, fontWeight: '600' },
  campo: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 16 },
  erro: { fontSize: 14 },
});

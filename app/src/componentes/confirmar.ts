import { Alert, Platform } from 'react-native';

// Alert com botões não funciona no react-native-web; lá usamos window.confirm.
export function confirmar(titulo: string, mensagem: string, rotuloConfirmar: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${titulo}\n${mensagem}`));
  return new Promise((resolver) => {
    Alert.alert(
      titulo,
      mensagem,
      [
        { text: 'Cancelar', style: 'cancel', onPress: () => resolver(false) },
        { text: rotuloConfirmar, style: 'destructive', onPress: () => resolver(true) },
      ],
      { cancelable: true, onDismiss: () => resolver(false) },
    );
  });
}

import AsyncStorage from '@react-native-async-storage/async-storage';

export const SESSAO = { token: 'tok', usuario: { id: 1, nome: 'Alehandro' } };

export async function salvarSessao(valor: unknown = SESSAO) {
  await AsyncStorage.setItem('@descritor/sessao', typeof valor === 'string' ? valor : JSON.stringify(valor));
}

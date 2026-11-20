jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Baixa a foto "para o cache": devolve um arquivo local fictício e guarda o cabeçalho enviado.
jest.mock('expo-file-system', () => {
  class File {
    uri: string;
    exists = false;
    constructor(...partes: unknown[]) {
      this.uri = `file:///cache/${partes.map((p) => (typeof p === 'string' ? p : '')).join('')}`;
    }
    static downloadFileAsync = jest.fn(async (_url: string, destino: { uri: string }) => destino);
  }
  return { File, Paths: { cache: {} } };
});

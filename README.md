# Descritor de Imagens

App de celular (Expo / React Native) em que o Usuário cria uma conta, tira uma foto ou escolhe uma da galeria e recebe uma Descrição da Imagem gerada pelo Gemini. O Usuário pode marcar Imagens como Favoritas, e sessão, Imagens, Favoritas e tema (claro/escuro) continuam ao reabrir o app. O backend (Express + SQLite) fica em `backend/` e o app em `app/`.

## Pré-requisitos

- Node.js 22.5 ou superior (testado com 22.22) e npm.
- Expo Go instalado no celular (com câmera).
- Uma conta Google, para criar a chave da API do Gemini.
- Celular e computador na mesma rede Wi-Fi.

## 1. Chave do Gemini

1. Acesse <https://aistudio.google.com/apikey> e entre com a conta Google.
2. Crie uma chave de API e copie o valor (não compartilhe nem commite).
3. Limites da cota: <https://ai.google.dev/gemini-api/docs/rate-limits> e o painel do AI Studio.

## 2. Backend

```bash
cd backend
cp .env.example .env
```

Edite `backend/.env`:

| Variável | O que colocar |
| --- | --- |
| `PORT` | Porta (padrão 3000 se vazio) |
| `JWT_SECRET` | Obrigatório. Gere com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `GEMINI_API_KEY` | A chave do passo 1 |
| `GEMINI_MODEL` | Deixe vazio para usar o padrão (`gemini-3.5-flash-lite`) ou informe um modelo atual |

Atenção: modelos antigos (como `gemini-2.5-flash`) foram descontinuados para novos usuários e outros podem ser descontinuados no futuro. Um erro 503 "high demand" é transitório: tente de novo em instantes.

Suba o servidor:

```bash
npm install
npm start
```

Deve aparecer `Backend ouvindo na porta 3000`. Deixe esse terminal aberto.

## 3. App

Descubra o IP da máquina na rede local:

- Linux: `hostname -I` (ou `ip a`)
- macOS: `ipconfig getifaddr en0`
- Windows: `ipconfig` (campo "Endereço IPv4")

Em outro terminal:

```bash
cd app
cp .env.example .env
# edite app/.env: EXPO_PUBLIC_API_URL=http://<IP-da-máquina>:3000
npm install
npx expo start
```

Abra o Expo Go no celular e escaneie o QR code mostrado no terminal (no iOS, pela câmera do sistema). Aceite as permissões de câmera e galeria quando pedidas. O `app/.env` não é versionado (está no `.gitignore`).

## 4. Testes

```bash
cd app && npm test          # testes do app (Jest)
cd backend && npm test      # testes do backend (node --test)
cd backend && npm run smoke # ponta a ponta contra o servidor rodando (usa o Gemini real)
```

O `smoke` usa `SMOKE_API_URL` como base (padrão `http://localhost:3000`); suba o backend antes com `npm start`.

## 5. Roteiro de demonstração (1min30)

| Tempo | Passo |
| --- | --- |
| 0:00 | Abrir o app, criar conta / entrar |
| 0:15 | Aba de envio: tirar uma foto com a câmera |
| 0:30 | Aguardar e mostrar a Descrição gerada |
| 0:45 | Favoritar a Imagem (estrela) |
| 0:55 | Abrir a aba Favoritos e mostrar a Imagem |
| 1:05 | Em Configurações, trocar o tema para escuro |
| 1:10 | Fechar o app por completo e abrir de novo |
| 1:15 | Mostrar que a sessão (sem novo login), as Imagens, as Favoritas e o tema continuam |

## 6. Onde está cada trecho

| Assunto | Arquivo |
| --- | --- |
| Chamada da API (`fetch`, URL base via `EXPO_PUBLIC_API_URL`) | `app/src/api/cliente.ts` (função `requisicao`) |
| `useEffect` buscando dados | `app/src/app/item/[id].tsx` (`obterImagem`); também `app/src/imagens/ImagensProvider.tsx` |
| `FlatList` | `app/src/app/(tabs)/index.tsx` e `app/src/app/(tabs)/favoritos.tsx` |
| Passagem do id pela rota | `router.push(`/item/${item.id}`)` em `app/src/app/(tabs)/index.tsx`; leitura com `useLocalSearchParams` em `app/src/app/item/[id].tsx` |
| AsyncStorage (sessão) | `app/src/sessao/SessaoProvider.tsx` |
| AsyncStorage (tema) | `app/src/tema/tema.tsx` |
| Câmera e galeria | `app/src/app/(tabs)/enviar.tsx` |

## Problemas comuns

- **O app não conecta ao backend:** confirme que celular e PC estão na mesma rede e que o firewall libera a porta 3000.
- **O IP mudou:** atualize `EXPO_PUBLIC_API_URL` em `app/.env`.
- **Alterei o `app/.env` e nada mudou:** o Expo só lê o `.env` ao iniciar; reinicie com `npx expo start -c`.
- **`JWT_SECRET não definido`:** crie `backend/.env` a partir do `.env.example`.
- **Erro ao gerar a Descrição:** veja o log do backend; confira a chave, o modelo e a cota (passo 1).

## Dashboard (Next.js + Firebase/OPC UA)

Real-time dashboard to visualize variables from a didactic level-control plant and a boolean signal page. Built with Next.js (App Router), React, TypeScript, Chart.js, Firebase, and OPC UA.

### Routes
- `/` Main dashboard (PV, SP, MV, CV, error, status)
- `/signal` Boolean signal page with a styled checkbox that mirrors a boolean value
- `/setpoint` Numeric setpoint page to read/write SP

### Data sources
- Firebase Realtime Database (client-side)
- OPC UA server (via Next API route)
- Mock (for testing)
- C# bridge (static pages only): static UIs communicate via JS ⇄ C# messages

### Environment variables
General (dashboard): see `README_PORTUGUES.md` for detailed list

Boolean signal (/signal):
- `NEXT_PUBLIC_BOOL_DEFAULT_SOURCE` = `firebase` | `opcua` | `mock`
- `NEXT_PUBLIC_BOOL_FIREBASE_PATH` = `plant/bool`
- `NEXT_PUBLIC_BOOL_FIREBASE_CMD_PATH` = `plant/bool_cmd`
- `NEXT_PUBLIC_BOOL_OPCUA_ENDPOINT` = `opc.tcp://host:4840` (optional if same as general)
- `NEXT_PUBLIC_BOOL_OPCUA_NODE_ID` = `ns=2;s=BOOL`
- `NEXT_PUBLIC_BOOL_POLL_MS` = `1000`

### Getting started
- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`; Start: `npm start`
- Visit: http://localhost:3000 and http://localhost:3000/signal

### Nota importante — Manter versão estática em sincronia
Este repositório possui um clone estático da tela `/signal` em `public/signal_static/` (HTML/CSS/JS puro) para visualização sem Next.js.

ATENÇÃO: Sempre que houver qualquer mudança visual ou comportamental na página `/signal` (estilos, textos, layout ou lógica do toggle), a mesma alteração deve ser replicada na versão estática, mantendo consistência entre:
- App Next.js: `src/app/signal/page.tsx` e `src/app/signal/signal.module.css`
- Versão estática: `public/signal_static/index.html`, `public/signal_static/styles.css`, `public/signal_static/main.js`

Caso a IA esteja realizando alterações: antes de concluir a tarefa, verifique e espelhe as alterações correspondentes nos arquivos da versão estática. Se um recurso não for aplicável no ambiente estático (por exemplo, `/api/opcua` em hospedagem estática), documente a limitação no comentário do commit e ajuste a UI (desabilitar botão, alterar dica) quando apropriado.

### Aba de Configurações Avançadas (obrigatória em toda interface)
Toda interface (tela/página) criada neste projeto deve incluir uma seção de “Configurações avançadas” para parametrização de comunicação e comportamento em tempo de execução. Padrões recomendados:
- Firebase: caminho de leitura (ex.: `bool`, `plant`), caminho de comando/escrita (ex.: `bool_cmd`).
- OPC UA: endpoint (ex.: `opc.tcp://host:4840`), NodeId(s) relevantes (ex.: `ns=2;s=BOOL`), e intervalo de polling (ms).
- Dicas e limitações: quando não houver backend disponível (ex.: hospedagem estática), informar e desabilitar recursos indisponíveis.

Para a IA: sempre que criar ou alterar uma UI, inclua/atualize essa aba de Configurações na tela correspondente e, se houver versão estática, replique a mesma seção em `public/<nome>_static/`.

### Páginas estáticas e ponte JS ⇄ C# (Vuplex)
As versões estáticas em `public/*_static/` SEMPRE se comunicam exclusivamente via ponte com C# (por exemplo, Unity + Vuplex WebView), usando mensagens JSON. Elas não acessam diretamente Firebase nem OPC UA. Exemplo de pastas:
- `public/signal_static/` → `index.html`, `main.js`, `vuplex-bridge.js`
- `public/setpoint_static/` → `index.html`, `main.js`, `vuplex-bridge.js`

Esquema de mensagens (resumo):
- JS → C#: `readBool` | `writeBool` | `readNumber` | `writeNumber` com payload `{ key, value? }`
- C# → JS: `valueBool` | `valueNumber` com payload `{ key, value, t? }`

O app host (C#) deve:
- Interceptar mensagens JS, fazer IO real (Firebase/OPC UA), e responder com os eventos `value*`.
- Opcionalmente enviar push periódico, ou JS pode solicitar via `read*` com polling.

### Recent updates (2025-09-15)
- Fixed Vercel/ESLint issues:
	- prefer-const in `src/app/Dashboard.tsx`
	- removed `any` cast in `next.config.ts` when extending `config.externals`
- New `/signal` page with source selection (Firebase/OPCUA/Mock) and boolean parsing
- Updated docs for new env variables

---

## Security and environment variables

Sensitive files are not tracked. Follow these steps to configure your local env safely:

1) Create your local env file
- Copy `.env.example` to `.env.local` and fill the values for Firebase and/or OPC UA.
- `.env.local` is ignored by Git.

2) Firebase (client)
- Fill: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_DATABASE_URL`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`.
- Set `NEXT_PUBLIC_FIREBASE_PATH` (e.g. `plant`).

3) OPC UA
- Set `NEXT_PUBLIC_OPCUA_ENDPOINT` and `NEXT_PUBLIC_OPCUA_NODE_IDS`.
- Optionally map names via `NEXT_PUBLIC_OPCUA_NODE_MAP` and adjust `NEXT_PUBLIC_OPCUA_POLL_MS`.
- You may also set server defaults `OPCUA_ENDPOINT` and `OPCUA_NODE_IDS`.

4) Boolean signal (/signal)
- `NEXT_PUBLIC_BOOL_DEFAULT_SOURCE`, `NEXT_PUBLIC_BOOL_FIREBASE_PATH`, `NEXT_PUBLIC_BOOL_FIREBASE_CMD_PATH`, `NEXT_PUBLIC_BOOL_OPCUA_ENDPOINT`, `NEXT_PUBLIC_BOOL_OPCUA_NODE_ID`, `NEXT_PUBLIC_BOOL_POLL_MS`.

5) Arduino secrets
- Use `ArduinoBKP/esp32_signal/Config.sample.h` as a template.
- Copy to `ArduinoBKP/esp32_signal/Config.h` and fill Wi‑Fi + Firebase keys. `Config.h` is git‑ignored.

6) Local private backups (not committed)
- The `secrets/` folder (ignored) contains private backups you can use locally:
	- `secrets/.env.local.backup`
	- `secrets/esp32_Config.h.backup`

For production (e.g., Vercel), create the same variables in the project settings UI.

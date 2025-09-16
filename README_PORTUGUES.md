# Dashboard de Controle de Nível (Next.js + Firebase/OPC UA)

Este projeto é um dashboard em Next.js para visualizar 6 variáveis de uma planta didática de controle de nível:
- PV (Process Variable)
- SP (Setpoint)
- MV (Manipulated Variable / Ação de Controle)
- CV (Control Variable / Saída)
- error (Erro = SP - PV)
- status (texto/estado)

Suporta duas fontes de dados:
1) Firebase Realtime Database (cliente)
2) Servidor OPC UA (direto, via rota de API no servidor Next)
3) Mock (para teste)

## 1) Requisitos
- Node.js 18+ recomendado
- Acesso ao Firebase (caso vá usar)
- Endpoint e NodeIds do servidor OPC UA (caso vá usar)

## 2) Configuração de ambiente
Copie o arquivo `.env.example` para `.env.local` e preencha:

Firebase (modo cliente):
- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_DATABASE_URL
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- NEXT_PUBLIC_FIREBASE_APP_ID
- NEXT_PUBLIC_FIREBASE_PATH (ex.: `plant`)

OPC UA (modo direto):
- NEXT_PUBLIC_OPCUA_ENDPOINT (ex.: `opc.tcp://192.168.0.10:4840`)
- NEXT_PUBLIC_OPCUA_NODE_IDS (ex.: `ns=2;s=PV,ns=2;s=SP,ns=2;s=MV,ns=2;s=CV,ns=2;s=ERROR,ns=2;s=STATUS`)
- NEXT_PUBLIC_OPCUA_NODE_MAP (ex.: `pv,sp,mv,cv,error,status`)
- NEXT_PUBLIC_OPCUA_POLL_MS (ex.: `1000`)

Defaults no servidor (opcionais):
- OPCUA_ENDPOINT
- OPCUA_NODE_IDS

Fonte padrão:
- NEXT_PUBLIC_DEFAULT_SOURCE=firebase ou opcua

Sinal booleano (/signal):
- NEXT_PUBLIC_BOOL_DEFAULT_SOURCE=firebase | opcua | mock (opcional; padrão firebase)
- NEXT_PUBLIC_BOOL_FIREBASE_PATH=plant/bool (caminho no Realtime Database)
- NEXT_PUBLIC_BOOL_FIREBASE_CMD_PATH=plant/bool_cmd (caminho do comando para escrita)
- NEXT_PUBLIC_BOOL_OPCUA_ENDPOINT=opc.tcp://host:4840 (se diferente do geral)
- NEXT_PUBLIC_BOOL_OPCUA_NODE_ID=ns=2;s=BOOL (NodeId booleano)
- NEXT_PUBLIC_BOOL_POLL_MS=1000 (intervalo de polling em ms)

## 3) Rodando localmente
- Instale dependências: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`; Start: `npm start`

Acesse: http://localhost:3000

No topo da página, você pode alternar entre as fontes “Firebase” e “OPC UA direto”.

## 4) Estrutura principal
- `src/app/Dashboard.tsx`: UI do dashboard, gráfico e cartões de valores
- `src/app/api/opcua/route.ts`: rota de API que lê do servidor OPC UA usando `node-opcua`
- `src/lib/firebase.ts`: inicialização do Firebase
- `src/lib/chart.ts`: registro do Chart.js e adaptor de datas
- `src/types/plant.ts`: tipos das variáveis da planta
 - `src/app/signal/page.tsx`: página de um único sinal booleano com seleção de fonte

## 5) Observações
- O acesso OPC UA roda no runtime Node do Next (server). Ajuste firewalls/ACLs.
- Para produção na Vercel, garanta que o projeto use runtime Node.js para a rota `/api/opcua` (já configurado).
- Se suas chaves/NodeIds mudarem, atualize o `.env.local` e reinicie o servidor.

## 6) Sugeridas melhorias
- Autenticação e controle de acesso
- Persistência histórica (ex.: InfluxDB) e agregações
- Alarmes/notifications quando PV ultrapassar limites

---

Qualquer dúvida, ajuste as variáveis de ambiente conforme sua topologia.

## Atualizações recentes

Data: 2025-09-15

- Correções de build na Vercel:
	- Ajuste ESLint em `src/app/Dashboard.tsx` (prefer-const em `status` e `t0`).
	- Remoção de `any` em `next.config.ts` ao estender `config.externals`.
	- Lint e build verificados localmente com sucesso.
- Nova rota `/signal`:
	- Checkbox estilizado que espelha um valor booleano.
	- Seleção de fonte: Firebase, OPC UA ou Mock.
	- Suporte a parsing de valores booleanos comuns (true/false, 1/0, "1"/"0", "true"/"false").
	- Limpeza adequada de timers/listeners ao trocar a fonte.
- Documentação atualizada com novas variáveis de ambiente do sinal booleano.

Como acessar: `https://<seu-deploy>.vercel.app/signal`

---

## 7) Segurança e variáveis de ambiente (passo a passo)

Arquivos sensíveis NÃO são versionados por padrão. Esta seção explica como preparar seu ambiente local e de produção.

1. Copie o template de variáveis
	- Duplique `.env.example` para `.env.local` e preencha os valores reais.
	- Nunca comite `.env.local` (está no `.gitignore`).

2. Preencha as chaves do Firebase (se for usar Firebase)
	- `NEXT_PUBLIC_FIREBASE_API_KEY`
	- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
	- `NEXT_PUBLIC_FIREBASE_DATABASE_URL`
	- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
	- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
	- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
	- `NEXT_PUBLIC_FIREBASE_APP_ID`
	- Ajuste `NEXT_PUBLIC_FIREBASE_PATH` conforme o nó base do RTDB (ex.: `plant`).

3. Configure OPC UA (se for usar OPC UA)
	- `NEXT_PUBLIC_OPCUA_ENDPOINT` (ex.: `opc.tcp://IP_DO_SERVIDOR:4840`)
	- `NEXT_PUBLIC_OPCUA_NODE_IDS` (ex.: `ns=2;s=PV,ns=2;s=SP,...`)
	- `NEXT_PUBLIC_OPCUA_NODE_MAP` (ordem: `pv,sp,mv,cv,error,status`)
	- `NEXT_PUBLIC_OPCUA_POLL_MS` (ex.: `1000`)
	- Opcionalmente, defina `OPCUA_ENDPOINT` e `OPCUA_NODE_IDS` no servidor.

4. Sinal booleano (/signal)
	- `NEXT_PUBLIC_BOOL_DEFAULT_SOURCE` = `firebase` | `opcua` | `mock`
	- `NEXT_PUBLIC_BOOL_FIREBASE_PATH` = `bool`
	- `NEXT_PUBLIC_BOOL_FIREBASE_CMD_PATH` = `bool_cmd`
	- `NEXT_PUBLIC_BOOL_OPCUA_ENDPOINT` (se diferente do geral)
	- `NEXT_PUBLIC_BOOL_OPCUA_NODE_ID` (ex.: `ns=2;s=BOOL`)
	- `NEXT_PUBLIC_BOOL_POLL_MS` = `1000`

5. Arduino (ESP32) – NÃO versione segredos
	- Use `ArduinoBKP/esp32_signal/Config.sample.h` como base.
	- Copie para `ArduinoBKP/esp32_signal/Config.h` e preencha:
	  - `WIFI_SSID`, `WIFI_PASSWORD`
	  - `FIREBASE_API_KEY`, `FIREBASE_DB_URL`
	  - `BOOL_STATE_PATH` e `BOOL_COMMAND_PATH`
	- `Config.h` está no `.gitignore` e não será comitado.

6. Backup local (opcional, não versionado)
	- Há uma pasta privada `secrets/` (ignoradas pelo Git) para backups locais:
	  - `secrets/.env.local.backup` — espelho do seu `.env.local` atual
	  - `secrets/esp32_Config.h.backup` — espelho do seu `Config.h`
	- Use-a para guardar seus valores com segurança localmente.

7. Deploy
	- Em provedores como Vercel, crie as mesmas variáveis no painel do projeto (Settings → Environment Variables).
	- Repita os pares nome/valor exatamente como no `.env.example`.

Checklist rápido:
 - [ ] `.env.local` criado a partir de `.env.example`
 - [ ] Variáveis do Firebase e/ou OPC UA preenchidas
 - [ ] `Config.h` criado a partir de `Config.sample.h` no projeto Arduino
 - [ ] Nada sensível sendo comitado (Git deve ignorar)

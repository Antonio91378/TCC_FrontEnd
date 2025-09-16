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

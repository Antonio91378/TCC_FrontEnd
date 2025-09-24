# SetPoint estático (bridge)

Comunicação exclusiva via ponte JS ⇄ C# (Vuplex). Sem acesso direto a Firebase/OPC UA.

Arquivos:
- index.html
- main.js
- vuplex-bridge.js

Mensagens e protocolo: consulte `../../docs/bridge-messages.md`.

Chave padrão:
- sp (setpoint)

Fluxo:
- JS pede `readNumber { key }` e recebe `valueNumber` para refletir na UI.
- Ao clicar em "Aplicar", envia `writeNumber { key, value }`.

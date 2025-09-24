# Dashboard estático (bridge)

Esta versão do dashboard usa exclusivamente a ponte JS ⇄ C# (Vuplex). Não acessa diretamente Firebase/OPC UA.

Arquivos:
- index.html
- styles.css
- main.js
- vuplex-bridge.js

Mensagens e protocolo: consulte `../../docs/bridge-messages.md`.

Chaves padrão:
- pv, sp, mv, cv, error, status

Fluxo:
- Periodicamente solicita `readNumber { key }` para cada variável e `readText { key }` para status, ou recebe `value*` por push do host.

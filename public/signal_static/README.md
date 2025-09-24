# Sinal estático (bridge)

Esta página estática se comunica exclusivamente via ponte JS ⇄ C# (Vuplex). Não acessa diretamente Firebase/OPC UA.

Arquivos:
- index.html
- styles.css
- main.js
- vuplex-bridge.js

Mensagens e protocolo: consulte `../../docs/bridge-messages.md`.

Chaves usadas por padrão:
- bool (estado booleano)

Fluxo:
- JS solicita periodicamente `readBool { key }` ou recebe `valueBool` por push.
- Ao alternar o toggle, envia `writeBool { key, value }`.

Para integrar no C#:
- Intercepte as mensagens recebidas do WebView e responda com `valueBool` conforme o backend real (Firebase, OPC UA, etc.).

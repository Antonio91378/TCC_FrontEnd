# Protocolo de mensagens (JS ⇄ C#)

As páginas estáticas usam uma ponte de mensagens entre JavaScript e C# (ex.: Unity + Vuplex WebView).

Resumo de mensagens:

JS → C#
- readBool { key }
- writeBool { key, value: boolean }
- readNumber { key }
- writeNumber { key, value: number }
- readText { key }

C# → JS
- valueBool { key, value: boolean, t?: number }
- valueNumber { key, value: number, t?: number }
- valueText { key, value: string, t?: number }

Observações:
- `key` define o identificador do sinal (ex.: "bool", "sp", "pv").
- `t` (timestamp) é opcional; se ausente, o cliente usa `Date.now()`.
- O host (C#) pode enviar atualizações (push) sem polling; o cliente também pode requisitar periodicamente com `read*`.
- O formato da mensagem é JSON serializado via `window.vuplex.postMessage(JSON.stringify(message))`.

## Exemplo de C# (pseudocódigo com Vuplex)

```csharp
webView.MessageEmitted += (sender, eventArgs) => {
  var json = eventArgs.Value; // string JSON
  var msg = JsonUtility.FromJson<Message>(json);
  switch (msg.type) {
    case "readNumber":
      double val = MeuProvider.LerNumero(msg.payload.key);
      var resp = new { type = "valueNumber", payload = new { key = msg.payload.key, value = val, t = DateTimeOffset.Now.ToUnixTimeMilliseconds() } };
      webView.PostMessage(JsonUtility.ToJson(resp));
      break;
    case "writeNumber":
      MeuProvider.EscreverNumero(msg.payload.key, msg.payload.value);
      break;
    case "readBool":
      bool b = MeuProvider.LerBool(msg.payload.key);
      var respB = new { type = "valueBool", payload = new { key = msg.payload.key, value = b } };
      webView.PostMessage(JsonUtility.ToJson(respB));
      break;
    case "writeBool":
      MeuProvider.EscreverBool(msg.payload.key, msg.payload.value);
      break;
    case "readText":
      string s = MeuProvider.LerTexto(msg.payload.key);
      var respT = new { type = "valueText", payload = new { key = msg.payload.key, value = s } };
      webView.PostMessage(JsonUtility.ToJson(respT));
      break;
  }
};
```

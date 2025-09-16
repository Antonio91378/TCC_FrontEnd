# ESP32 LED + Firebase Boolean Mirror

This sketch turns an ESP32 into a boolean signal source for your frontend. It:
- Connects to Wi-Fi
- Authenticates to Firebase RTDB (anonymous by default)
- Publishes current LED state to a boolean path
- Optionally reads a cloud command to set the LED

OPC UA: Direct OPC UA client on ESP32 is uncommon. Recommended bridge:
ESP32 (Firebase) <-> Next.js API/server <-> OPC UA Server

## Files
- `esp32_signal.ino` — main sketch (clean structure)
- `Config.h` — central configuration (Wi-Fi, GPIO, Firebase, paths)

## Dependencies (Arduino IDE)
Install via Library Manager:
- "Firebase ESP Client" by mobizt

Board: ESP32 (use the ESP32 core by Espressif in Board Manager)

## Configure
Edit `Config.h`:
- WIFI_SSID / WIFI_PASSWORD
- LED_PIN (default 2)
- FIREBASE_API_KEY, FIREBASE_DB_URL (RTDB url)
- BOOL_STATE_PATH (default "bool")
- BOOL_COMMAND_PATH (default "bool_cmd")
- READ_COMMAND_FROM_CLOUD (1 to allow remote control)

If using email/password auth, set FIREBASE_USE_EMAIL_AUTH=1 and fill credentials.

## Firebase Rules example (dev)
For quick tests, allow read/write on the chosen paths. Harden for production.
```
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

## How it maps to the frontend
- Frontend `/signal` supports Firebase/OPCUA/Mock data sources.
- Set `NEXT_PUBLIC_BOOL_FIREBASE_PATH` to the same `BOOL_STATE_PATH` you configured.
- For cloud-controlled LED, write `true`/`false` to `BOOL_COMMAND_PATH` in RTDB.

## Build & Upload
1. Select your ESP32 board and port
2. Verify and upload `esp32_signal.ino`
3. Open Serial Monitor (115200) to check logs

### Upload (Arduino IDE 2.x) + Troubleshooting
- Board: select `ESP32 Dev Module` (or `DOIT ESP32 DEVKIT V1` if disponível)
- Port (Windows): não use `COM1`. Plugue o ESP32 e escolha a nova porta que aparecer (ex.: `COM5`/`COM7`).
- Drivers: instale o driver correto do seu conversor USB‑Serial
  - CP2102/CP210x: "Silicon Labs CP210x USB to UART" (site da Silicon Labs)
  - CH340: "CH340 USB‑Serial" (WCH)
- Cabo USB: use cabo de dados (não apenas carga) e evite hubs ruins.
- Feche o Serial Monitor antes de fazer upload.
- Upload Speed: se houver falhas, teste `115200` em Tools > Upload Speed.
- Erros "Failed to connect" / "No serial data received":
  1) Confirme a porta correta (não `COM1`).
  2) Tente o modo manual de bootloader:
     - Segure o botão `BOOT` (GPIO0)
     - Pressione e solte `EN` (reset)
     - Mantenha `BOOT` pressionado até o IDE mostrar "Connecting..." (vários pontos)
     - Solte `BOOT` quando iniciar a escrita ("Writing at 0x...")
  3) Troque o cabo USB e porta do PC se necessário.
  4) Em algumas placas, reduzir a velocidade de upload ajuda.

// Config.sample.h - Template sem segredos para o ESP32 LED + Firebase
// Copie para Config.h e preencha valores reais. NUNCA versione Config.h.

#pragma once

// ---------- Wi-Fi ----------
#define WIFI_SSID           "SEU_WIFI_SSID"
#define WIFI_PASSWORD       "SUA_SENHA_WIFI"

// ---------- LED GPIO ----------
#ifndef LED_BUILTIN
  #define LED_BUILTIN 2
#endif
#define LED_PIN             LED_BUILTIN
#define LED_ACTIVE_HIGH     1

// ---------- Comportamento ----------
#define READ_COMMAND_FROM_CLOUD 1
#define STATE_PUBLISH_MS    1000
#define COMMAND_POLL_MS     1000

// ---------- Firebase (Realtime Database) ----------
// Biblioteca: "Firebase ESP Client" por mobizt
#define FIREBASE_API_KEY    "SUA_API_KEY"
#define FIREBASE_DB_URL     "https://SEU-PROJETO-default-rtdb.firebaseio.com"

// Paths em RTDB
#define BOOL_STATE_PATH     "bool"
#define BOOL_COMMAND_PATH   "bool_cmd"

// Auth anônima (recomendado quando regras permitirem)
#define FIREBASE_USE_EMAIL_AUTH 0
#define FIREBASE_USER_EMAIL     ""
#define FIREBASE_USER_PASSWORD  ""

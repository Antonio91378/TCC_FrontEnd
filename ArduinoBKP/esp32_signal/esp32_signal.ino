/*
  esp32_signal.ino - ESP32 LED + Firebase RTDB boolean mirror

  Features:
  - Connects to Wi-Fi
  - Authenticates to Firebase (anonymous by default)
  - Publishes current LED state to BOOL_STATE_PATH periodically
  - Optionally reads a command from BOOL_COMMAND_PATH to set LED
  - Simple debounced button (optional placeholder) can be added later

  Clean-code oriented: distinct functions for connectivity/Firebase/IO
*/

#include <Arduino.h>
#include "Config.h"

#include <WiFi.h>

// Firebase ESP Client by mobizt
#include <Firebase_ESP_Client.h>
// Provide the token generation process info.
#include "addons/TokenHelper.h"
// Provide the RTDB payload printing info and other helper functions.
#include "addons/RTDBHelper.h"

// ---- Globals ----
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig fbConfig;

unsigned long lastStatePublishMs = 0;
unsigned long lastCommandPollMs = 0;

bool ledState = false;  // tracked logical LED state

// ---- Utility: LED ----
void setLed(bool on) {
  ledState = on;
  if (LED_ACTIVE_HIGH) {
    digitalWrite(LED_PIN, on ? HIGH : LOW);
  } else {
    digitalWrite(LED_PIN, on ? LOW : HIGH);
  }
}

// ---- Connectivity ----
void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("[WiFi] Connecting");
  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 60) {
    delay(500);
    Serial.print(".");
    retries++;
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("[WiFi] Connected: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("[WiFi] Failed to connect");
  }
}

// ---- Firebase ----
bool ensureFirebaseReady() {
  if (!Firebase.ready()) return false;
  return true;
}

void initFirebase() {
  fbConfig.api_key = FIREBASE_API_KEY;
  fbConfig.database_url = FIREBASE_DB_URL;

  if (FIREBASE_USE_EMAIL_AUTH) {
    auth.user.email = FIREBASE_USER_EMAIL;
    auth.user.password = FIREBASE_USER_PASSWORD;
  }

  // Anonymous sign-in when not using email auth
  fbConfig.signer.tokens.legacy_token = ""; // ensure not using legacy key

  // Reconnect WiFi if disconnected
  Firebase.reconnectWiFi(true);

  // Optional: callbacks for token status
  fbConfig.token_status_callback = tokenStatusCallback;

  Firebase.begin(&fbConfig, &auth);

  // For anonymous, trigger sign-up
  if (!FIREBASE_USE_EMAIL_AUTH && (auth.token.uid.length() == 0)) {
    Serial.println("[Firebase] Signing up anonymously...");
    if (Firebase.signUp(&fbConfig, &auth, "", "")) {
      Serial.println("[Firebase] Anonymous sign-up: OK");
    } else {
      Serial.printf("[Firebase] Anonymous sign-up failed: %s\n", fbConfig.signer.signupError.message.c_str());
    }
  }
}

// Publish current LED state to RTDB
void publishStateIfDue() {
  const unsigned long now = millis();
  if (now - lastStatePublishMs < STATE_PUBLISH_MS) return;
  lastStatePublishMs = now;

  if (!ensureFirebaseReady()) return;

  bool ok = Firebase.RTDB.setBool(&fbdo, "/" BOOL_STATE_PATH, ledState);
  if (!ok) {
    Serial.printf("[RTDB] setBool %s: %s\n", BOOL_STATE_PATH, fbdo.errorReason().c_str());
  } else {
    Serial.printf("[RTDB] Published %s = %s\n", BOOL_STATE_PATH, ledState ? "true" : "false");
  }
}

// Read desired state from RTDB (optional)
void pollCommandIfDue() {
  if (!READ_COMMAND_FROM_CLOUD) return;
  const unsigned long now = millis();
  if (now - lastCommandPollMs < COMMAND_POLL_MS) return;
  lastCommandPollMs = now;

  if (!ensureFirebaseReady()) return;

  if (Firebase.RTDB.getBool(&fbdo, "/" BOOL_COMMAND_PATH)) {
    bool desired = fbdo.boolData();
    setLed(desired);
    Serial.printf("[RTDB] Command %s = %s\n", BOOL_COMMAND_PATH, desired ? "true" : "false");
  } else {
    // Not an error if key missing; print only on actual error code
    if (fbdo.httpCode() > 0 && fbdo.httpCode() != 404) {
      Serial.printf("[RTDB] getBool %s error: %s\n", BOOL_COMMAND_PATH, fbdo.errorReason().c_str());
    }
  }
}

// ---- Arduino lifecycle ----
void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println();
  Serial.println("ESP32 LED + Firebase RTDB");

  pinMode(LED_PIN, OUTPUT);
  setLed(false);

  connectWifi();
  initFirebase();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWifi();
  }

  publishStateIfDue();
  pollCommandIfDue();

  delay(10);
}

/*
  OPC UA notes:
  - Direct OPC UA client on ESP32 is uncommon; recommended approach is to bridge:
    ESP32 (Firebase) <-> Next.js API <-> OPC UA server
  - The frontend already fetches boolean from OPC UA through /api/opcua.
  - To mirror ESP32 state to OPC UA, implement a small backend job that reads from Firebase and writes to OPC UA node.
*/

## Dashboard (Next.js + Firebase/OPC UA)

Real-time dashboard to visualize variables from a didactic level-control plant and a boolean signal page. Built with Next.js (App Router), React, TypeScript, Chart.js, Firebase, and OPC UA.

### Routes
- `/` Main dashboard (PV, SP, MV, CV, error, status)
- `/signal` Boolean signal page with a styled checkbox that mirrors a boolean value

### Data sources
- Firebase Realtime Database (client-side)
- OPC UA server (via Next API route)
- Mock (for testing)

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

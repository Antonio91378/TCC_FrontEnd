"use client";
import { useEffect, useRef, useState } from "react";
import styles from "./signal.module.css";

type Source = "firebase" | "opcua" | "mock";

// Lazy Firebase import to avoid SSR issues
let firebaseLoaded = false as boolean;
async function importFirebase() {
  if (!firebaseLoaded) {
    await import("firebase/app");
    await import("firebase/database");
    firebaseLoaded = true;
  }
}

export default function SignalPage() {
  const [source, setSource] = useState<Source>((process.env.NEXT_PUBLIC_BOOL_DEFAULT_SOURCE as Source) || "firebase");
  const [value, setValue] = useState<boolean | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [sending, setSending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (unsubRef.current) unsubRef.current();
    };
  }, []);

  useEffect(() => {
    (async () => {
      // cleanup previous
      if (timerRef.current) clearInterval(timerRef.current);
      if (unsubRef.current) unsubRef.current();
      timerRef.current = null;
      unsubRef.current = null;
      setValue(null);
      setLastUpdate(null);

      if (source === "firebase") {
        await importFirebase();
        const { getFirebaseDb } = await import("@/lib/firebase");
        const { ref, onValue } = await import("firebase/database");
        const db = getFirebaseDb();
        const path = process.env.NEXT_PUBLIC_BOOL_FIREBASE_PATH || "bool";
        const r = ref(db, path);
        const unsub = onValue(r, (snap) => {
          const raw = snap.val();
          const v = typeof raw === "boolean" ? raw : raw === 1 || raw === "1" || raw === "true";
          setValue(Boolean(v));
          setLastUpdate(Date.now());
        });
        unsubRef.current = () => unsub();
      } else if (source === "opcua") {
        const endpoint = process.env.NEXT_PUBLIC_BOOL_OPCUA_ENDPOINT || process.env.NEXT_PUBLIC_OPCUA_ENDPOINT;
        const nodeId = process.env.NEXT_PUBLIC_BOOL_OPCUA_NODE_ID;
        const pollMs = Number(process.env.NEXT_PUBLIC_BOOL_POLL_MS || process.env.NEXT_PUBLIC_OPCUA_POLL_MS || 1000);
        if (!endpoint || !nodeId) return;
        const url = `/api/opcua?endpoint=${encodeURIComponent(endpoint)}&ids=${encodeURIComponent(nodeId)}`;
        const poll = async () => {
          try {
            const res = await fetch(url, { cache: "no-store" });
            const json = await res.json();
            const map: Record<string, unknown> = json.values ?? {};
            const raw = map[nodeId];
            const v = typeof raw === "boolean" ? raw : raw === 1 || raw === "1" || raw === "true";
            setValue(Boolean(v));
            setLastUpdate(Number(json.t ?? Date.now()));
          } catch {}
        };
        await poll();
        timerRef.current = setInterval(poll, pollMs);
      } else {
        // mock
        let v = false;
        const tick = () => { v = !v; setValue(v); setLastUpdate(Date.now()); };
        tick();
        timerRef.current = setInterval(tick, 1500);
      }
    })();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (unsubRef.current) unsubRef.current();
    };
  }, [source, resetKey]);

  const checked = value === true;

  const canToggle = (source === "firebase" || source === "opcua") && value !== null && !sending;

  async function handleToggle() {
    if (!canToggle) return;
    const next = !checked;
    if (source === 'firebase') return sendFirebaseCommand(next);
    if (source === 'opcua') return sendOpcUaCommand(next);
  }

  async function sendFirebaseCommand(next: boolean) {
    try {
      setSending(true);
      await importFirebase();
      const { getFirebaseDb } = await import("@/lib/firebase");
      const { ref, set } = await import("firebase/database");
      const db = getFirebaseDb();
      const cmdPath = process.env.NEXT_PUBLIC_BOOL_FIREBASE_CMD_PATH || "bool_cmd";
      await set(ref(db, cmdPath), next);
      // Mirror to OPC UA if configured
      const endpoint = process.env.NEXT_PUBLIC_BOOL_OPCUA_ENDPOINT || process.env.NEXT_PUBLIC_OPCUA_ENDPOINT;
      const nodeId = process.env.NEXT_PUBLIC_BOOL_OPCUA_NODE_ID;
      if (endpoint && nodeId) {
        await fetch('/api/opcua', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ endpoint, nodeId, value: next }),
        });
      }
    } catch {}
    finally {
      setSending(false);
    }
  }

  async function sendOpcUaCommand(next: boolean) {
    try {
      setSending(true);
      const endpoint = process.env.NEXT_PUBLIC_BOOL_OPCUA_ENDPOINT || process.env.NEXT_PUBLIC_OPCUA_ENDPOINT;
      const nodeId = process.env.NEXT_PUBLIC_BOOL_OPCUA_NODE_ID;
      if (!endpoint || !nodeId) return;
      await fetch('/api/opcua', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ endpoint, nodeId, value: next }),
      });
      // Mirror to Firebase so ESP32 reacts
      await importFirebase();
      const { getFirebaseDb } = await import("@/lib/firebase");
      const { ref, set } = await import("firebase/database");
      const db = getFirebaseDb();
      const cmdPath = process.env.NEXT_PUBLIC_BOOL_FIREBASE_CMD_PATH || "bool_cmd";
      await set(ref(db, cmdPath), next);
    } catch {}
    finally {
      setSending(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.wrapper}>
      <h1 className={styles.title}>Sinal Booleano</h1>
      <div className={styles.toolbar}>
        <strong>Fonte:</strong>
        <div className={styles.segment}>
          <button className={styles.segBtn} onClick={() => setSource("firebase")} disabled={source === "firebase"}>Firebase</button>
          <button className={styles.segBtn} onClick={() => setSource("opcua")} disabled={source === "opcua"}>OPC UA</button>
          <button className={styles.segBtn} onClick={() => setSource("mock")} disabled={source === "mock"}>Mock</button>
        </div>
        <span aria-hidden className={styles.spacer} />
        <button className={styles.ghostBtn}
          onClick={() => { setResetKey((k) => k + 1); setValue(null); setLastUpdate(null); }}
          title="Resetar leitura"
        >Resetar</button>
        <span className={styles.time}>
          {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : "—"}
        </span>
      </div>

      <div className={styles.panel}>
        <div className={styles.switchRow}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
            <span
              role="switch"
              aria-checked={checked}
              aria-busy={sending || undefined}
              aria-disabled={!canToggle || undefined}
              tabIndex={canToggle ? 0 : -1}
              className={`${styles.switch} ${checked ? styles.on : ''} ${canToggle ? styles.switchClickable : styles.switchDisabled}`}
              onClick={handleToggle}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleToggle(); } }}
              title={
                source === 'mock'
                  ? 'Somente leitura no modo Mock'
                  : value === null
                    ? 'Aguardando leitura…'
                    : 'Clique para alternar'
              }
            >
              <span className={styles.knob} />
            </span>
            <input type="checkbox" checked={checked} readOnly style={{ display: 'none' }} />
            <span className={styles.stateLabel}>
              {sending ? 'Enviando…' : checked ? 'Ligado' : value === null ? 'Aguarde…' : 'Desligado'}
            </span>
          </div>

          <span className={styles.hint}>
            {source === 'firebase'
              ? `Clique no toggle para enviar (${process.env.NEXT_PUBLIC_BOOL_FIREBASE_CMD_PATH || 'bool_cmd'})`
              : source === 'opcua'
                ? `Clique no toggle para enviar (OPC UA: ${process.env.NEXT_PUBLIC_BOOL_OPCUA_NODE_ID || 'nodeId?'})`
                : 'Modo Mock: o valor alterna automaticamente'}
          </span>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.label}>Valor</div>
          <div className={styles.value}>{value === null ? "—" : String(checked)}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.label}>Fonte</div>
          <div className={styles.value}>{source}</div>
        </div>
      </div>
      </div>
    </div>
  );
}

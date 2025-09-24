"use client";
import { useEffect, useState } from "react";
import styles from "../signal/signal.module.css";

// Reutiliza o mesmo visual da página /signal
// Página para escrever um SetPoint numérico via Firebase ou OPC UA.

type Source = "firebase" | "opcua" | "mock";

let firebaseLoaded = false as boolean;
async function importFirebase() {
  if (!firebaseLoaded) {
    await import("firebase/app");
    await import("firebase/database");
    firebaseLoaded = true;
  }
}

export default function SetpointPage() {
  const [source, setSource] = useState<Source>((process.env.NEXT_PUBLIC_SP_DEFAULT_SOURCE as Source) || "firebase");
  const [value, setValue] = useState<number | null>(null);
  const [draft, setDraft] = useState<string>("");
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    let unsub: (() => void) | null = null;

    async function start() {
      setValue(null);
      setLastUpdate(null);

      if (source === "firebase") {
        await importFirebase();
        const { getFirebaseDb } = await import("@/lib/firebase");
        const { ref, onValue } = await import("firebase/database");
        const db = getFirebaseDb();
        const path = process.env.NEXT_PUBLIC_SP_FIREBASE_PATH || "sp";
        const r = ref(db, path);
        unsub = onValue(r, (snap) => {
          const raw = snap.val();
          const n = Number(raw);
          setValue(Number.isFinite(n) ? n : null);
          setDraft(Number.isFinite(n) ? String(n) : "");
          setLastUpdate(Date.now());
        });
      } else if (source === "opcua") {
        const endpoint = process.env.NEXT_PUBLIC_SP_OPCUA_ENDPOINT || process.env.NEXT_PUBLIC_OPCUA_ENDPOINT;
        const nodeId = process.env.NEXT_PUBLIC_SP_OPCUA_NODE_ID;
        const pollMs = Number(process.env.NEXT_PUBLIC_SP_POLL_MS || process.env.NEXT_PUBLIC_OPCUA_POLL_MS || 1000);
        if (!endpoint || !nodeId) return;
        const url = `/api/opcua?endpoint=${encodeURIComponent(endpoint)}&ids=${encodeURIComponent(nodeId)}`;
        const poll = async () => {
          try {
            const res = await fetch(url, { cache: "no-store" });
            const json = await res.json();
            const map: Record<string, unknown> = json.values ?? {};
            const raw = map[nodeId];
            const n = Number(raw);
            setValue(Number.isFinite(n) ? n : null);
            setDraft(Number.isFinite(n) ? String(n) : "");
            setLastUpdate(Number(json.t ?? Date.now()));
          } catch {}
        };
        await poll();
        timer = setInterval(poll, pollMs);
      } else {
        // mock value with a simple ramp
        let n = 50;
        const tick = () => { n = (n >= 80) ? 30 : n + 1; setValue(n); setDraft(String(n)); setLastUpdate(Date.now()); };
        tick();
        timer = setInterval(tick, 1000);
      }
    }

    start();
    return () => { if (timer) clearInterval(timer); if (unsub) unsub(); };
  }, [source]);

  async function writeFirebase() {
    try {
      setSending(true);
      await importFirebase();
      const { getFirebaseDb } = await import("@/lib/firebase");
      const { ref, set } = await import("firebase/database");
      const db = getFirebaseDb();
      const path = process.env.NEXT_PUBLIC_SP_FIREBASE_PATH || "sp";
      const n = Number(draft);
      if (!Number.isFinite(n)) return;
      await set(ref(db, path), n);
      // opcional: refletir em comando auxiliar
      const cmdPath = process.env.NEXT_PUBLIC_SP_FIREBASE_CMD_PATH;
      if (cmdPath) await set(ref(db, cmdPath), n);
    } finally { setSending(false); }
  }

  async function writeOpcua() {
    try {
      setSending(true);
      const endpoint = process.env.NEXT_PUBLIC_SP_OPCUA_ENDPOINT || process.env.NEXT_PUBLIC_OPCUA_ENDPOINT;
      const nodeId = process.env.NEXT_PUBLIC_SP_OPCUA_NODE_ID;
      const n = Number(draft);
      if (!endpoint || !nodeId || !Number.isFinite(n)) return;
      await fetch('/api/opcua', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ endpoint, nodeId, value: n, dataType: 'double' }),
      });
    } finally { setSending(false); }
  }

  const canWrite = !sending && draft.trim().length > 0 && Number.isFinite(Number(draft));

  return (
    <div className={styles.page}>
      <div className={styles.wrapper}>
        <h1 className={styles.title}>SetPoint</h1>
        <div className={styles.toolbar}>
          <strong>Fonte:</strong>
          <div className={styles.segment}>
            <button className={styles.segBtn} onClick={() => setSource("firebase")} disabled={source === "firebase"}>Firebase</button>
            <button className={styles.segBtn} onClick={() => setSource("opcua")} disabled={source === "opcua"}>OPC UA</button>
            <button className={styles.segBtn} onClick={() => setSource("mock")} disabled={source === "mock"}>Mock</button>
          </div>
          <span aria-hidden className={styles.spacer} />
          <span className={styles.time}>{lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : "—"}</span>
        </div>

        <div className={styles.panel}>
          <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
            <label>
              <span style={{fontSize:12, opacity:.75}}>Novo SP</span><br/>
              <input type="number" inputMode="decimal" step="0.1" value={draft} onChange={(e) => setDraft(e.target.value)} style={{ padding:'8px 10px', borderRadius:8, border:'1px solid #2a2a2e', background:'#0d0f13', color:'white', minWidth:160 }} />
            </label>
            <button className={styles.primaryBtn} disabled={!canWrite} onClick={() => source==='firebase' ? writeFirebase() : source==='opcua' ? writeOpcua() : undefined}>
              {sending ? 'Enviando…' : 'Aplicar'}
            </button>
            <span className={styles.hint}>
              {source === 'firebase' ? `Escreve em ${process.env.NEXT_PUBLIC_SP_FIREBASE_PATH || 'sp'}` : source === 'opcua' ? `Escreve em OPC UA (${process.env.NEXT_PUBLIC_SP_OPCUA_NODE_ID || 'nodeId?'})` : 'Mock: leitura/apresentação apenas'}
            </span>
          </div>
        </div>

        <div className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.label}>SP atual</div>
            <div className={styles.value}>{value ?? '—'}</div>
          </div>
          <div className={styles.card}>
            <div className={styles.label}>Fonte</div>
            <div className={styles.value}>{source}</div>
          </div>
        </div>

        <details style={{marginTop:16, opacity:.85}}>
          <summary>Configurações avançadas</summary>
          <div style={{display:'grid', gap:8, marginTop:8, gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))'}}>
            <label>Firebase path (leitura/escrita)
              <input type="text" defaultValue={process.env.NEXT_PUBLIC_SP_FIREBASE_PATH || 'sp'} readOnly />
            </label>
            <label>Firebase cmd path (opcional)
              <input type="text" defaultValue={process.env.NEXT_PUBLIC_SP_FIREBASE_CMD_PATH || ''} readOnly />
            </label>
            <label>OPC UA endpoint
              <input type="text" defaultValue={process.env.NEXT_PUBLIC_SP_OPCUA_ENDPOINT || process.env.NEXT_PUBLIC_OPCUA_ENDPOINT || 'opc.tcp://host:4840'} readOnly />
            </label>
            <label>OPC UA nodeId (SP)
              <input type="text" defaultValue={process.env.NEXT_PUBLIC_SP_OPCUA_NODE_ID || 'ns=2;s=SP'} readOnly />
            </label>
            <label>OPC UA poll (ms)
              <input type="number" defaultValue={String(process.env.NEXT_PUBLIC_SP_POLL_MS || process.env.NEXT_PUBLIC_OPCUA_POLL_MS || 1000)} readOnly />
            </label>
          </div>
        </details>
      </div>
    </div>
  );
}

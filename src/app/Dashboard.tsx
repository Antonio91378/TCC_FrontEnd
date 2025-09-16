"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { ensureChartRegistered } from '@/lib/chart';
import type { PlantSample, PlantVars } from '@/types/plant';
import { z } from 'zod';
import type { ChartData, ChartOptions } from 'chart.js';

// Firebase imports lazily to avoid SSR issues when not used
let firebaseLoaded = false as boolean;
async function importFirebase() {
  if (!firebaseLoaded) {
    await import('firebase/app');
    await import('firebase/database');
    firebaseLoaded = true;
  }
}

type Source = 'firebase' | 'opcua' | 'mock';

const firebaseSchema = z.object({
  pv: z.number().nullable().optional(),
  sp: z.number().nullable().optional(),
  mv: z.number().nullable().optional(),
  cv: z.number().nullable().optional(),
  error: z.number().nullable().optional(),
  status: z.string().nullable().optional(),
});

export default function Dashboard() {
  ensureChartRegistered();
  const [source, setSource] = useState<Source>((process.env.NEXT_PUBLIC_DEFAULT_SOURCE as Source) || 'firebase');
  const [samples, setSamples] = useState<PlantSample[]>([]);
  const [latest, setLatest] = useState<PlantVars | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Cleanup timer on source switch/unmount
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
  let unsub: (() => void) | null = null;
    (async () => {
      // Clear previous
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;

  if (source === 'firebase') {
        await importFirebase();
        const { getFirebaseDb } = await import('@/lib/firebase');
        const { ref, onValue } = await import('firebase/database');
        const db = getFirebaseDb();
        const r = ref(db, process.env.NEXT_PUBLIC_FIREBASE_PATH || 'plant');
        unsub = onValue(r, (snap) => {
          const data = snap.val() || {};
          const parsed = firebaseSchema.safeParse(data);
          if (!parsed.success) return;
          const vars = parsed.data as PlantVars;
          const t = Date.now();
          setLatest(vars);
          setSamples((prev) => [...prev.slice(-600), { t, ...vars }]);
        });
      } else if (source === 'opcua') {
        const endpoint = process.env.NEXT_PUBLIC_OPCUA_ENDPOINT;
        const ids = process.env.NEXT_PUBLIC_OPCUA_NODE_IDS;
        const pollMs = Number(process.env.NEXT_PUBLIC_OPCUA_POLL_MS || 1000);
        if (!endpoint || !ids) return;
        const url = `/api/opcua?endpoint=${encodeURIComponent(endpoint)}&ids=${encodeURIComponent(ids)}`;
        const poll = async () => {
          try {
            const res = await fetch(url, { cache: 'no-store' });
            const json = await res.json();
            const map: Record<string, unknown> = json.values ?? {};
            const t: number = json.t ?? Date.now();
            // Map node ids to canonical names via env mapping
            const names = (process.env.NEXT_PUBLIC_OPCUA_NODE_MAP || '').split(',');
            const out: Record<string, unknown> = {};
            const idList = (ids || '').split(',');
            idList.forEach((id, i) => {
              const name = names[i] || `var${i+1}`;
              out[name] = map[id] ?? null;
            });
            const vars: PlantVars = {
              pv: Number(out.pv ?? out.PV ?? out.pv1 ?? null),
              sp: Number(out.sp ?? out.SP ?? null),
              mv: Number(out.mv ?? out.MV ?? null),
              cv: Number(out.cv ?? out.CV ?? null),
              error: Number(out.error ?? out.err ?? null),
              status: String(out.status ?? ''),
            };
            setLatest(vars);
            setSamples((prev) => [...prev.slice(-600), { t, ...vars }]);
          } catch {
            // swallow
          }
        };
        await poll();
        timerRef.current = setInterval(poll, pollMs);
      } else if (source === 'mock') {
        // Simple mock process: SP step changes, PV follows with first-order lag, MV proportional to error
        let pv = 20;
        let sp = 50;
        let mv = 0;
        let cv = 0;
        let status = 'MOCK';
        const dt = 1.0; // seconds
        const tau = 5.0; // time constant
        let t0 = Date.now();
        const tick = () => {
          const now = Date.now();
          const seconds = Math.floor((now - t0) / 1000);
          // Step changes every 15s
          if (seconds % 15 === 0) {
            sp = 30 + (Math.floor(seconds / 15) % 3) * 20; // 30, 50, 70
          }
          const error = sp - pv;
          mv = 0.8 * error; // P-only controller mock
          // Process: first-order response towards MV with some noise
          pv = pv + (-(pv - mv) / tau) * dt + (Math.random() - 0.5) * 0.3;
          cv = mv; // assume CV ~ MV
          const vars: PlantVars = {
            pv: Number(pv.toFixed(2)),
            sp: Number(sp.toFixed(2)),
            mv: Number(mv.toFixed(2)),
            cv: Number(cv.toFixed(2)),
            error: Number(error.toFixed(2)),
            status,
          };
          setLatest(vars);
          setSamples((prev) => [...prev.slice(-600), { t: now, ...vars }]);
        };
        tick();
        timerRef.current = setInterval(tick, 1000);
      }
    })();
    return () => {
      if (unsub) unsub();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [source, resetKey]);

  const data: ChartData<'line', Array<number | null>, number> = useMemo(() => {
    const labels = samples.map((s) => s.t);
    return {
      labels,
      datasets: [
        { label: 'PV', data: samples.map((s) => s.pv), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.2)', tension: 0.2 },
        { label: 'SP', data: samples.map((s) => s.sp), borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.2)', tension: 0.2 },
        { label: 'MV', data: samples.map((s) => s.mv), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.2)', tension: 0.2 },
        { label: 'CV', data: samples.map((s) => s.cv), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.2)', tension: 0.2 },
      ],
    };
  }, [samples]);

  const options: ChartOptions<'line'> = useMemo(() => ({
    responsive: true,
    animation: false,
    scales: {
      x: {
        type: 'time' as const,
        time: { unit: 'second' as const },
        ticks: { maxRotation: 0 },
      },
      y: { beginAtZero: true }
    },
    plugins: { legend: { position: 'bottom' as const } }
  }), []);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <strong>Fonte:</strong>
        <button onClick={() => setSource('firebase')} disabled={source==='firebase'}>Firebase</button>
  <button onClick={() => setSource('opcua')} disabled={source==='opcua'}>OPC UA direto</button>
  <button onClick={() => setSource('mock')} disabled={source==='mock'}>Mock</button>
        <span aria-hidden style={{ width: 1, height: 24, borderLeft: '1px solid #333', margin: '0 8px' }} />
        <button
          onClick={() => {
            // Clear all data and force reset of data source and chart
            setSamples([]);
            setLatest(null);
            setResetKey((k) => k + 1);
          }}
          title="Limpar série e resetar gráfico"
        >
          Limpar
        </button>
        <span style={{ marginLeft: 'auto', opacity: 0.7 }}>amostras: {samples.length}</span>
      </div>

      <div style={{ background: '#111', padding: 12, borderRadius: 8 }}>
        <Line key={resetKey} data={data} options={options} height={80} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 12 }}>
    {(['pv','sp','mv','cv','error','status'] as const).map((k) => (
          <div key={k} style={{ border: '1px solid #333', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{k.toUpperCase()}</div>
            <div style={{ fontSize: 20 }}>
      {latest?.[k] ?? '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

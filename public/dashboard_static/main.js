// Permite que o C# altere a fonte de dados dinamicamente
window.onApproachChanged = function(approach) {
  if (approach === "OpcUa") {
    if (typeof startBridge === "function") startBridge();
    setApproachIndicator("OPC UA");
  } else if (approach === "Firebase") {
    setApproachIndicator("Firebase");
  } else {
    if (typeof startMock === "function") startMock();
    setApproachIndicator("Mock");
  }
};

function setApproachIndicator(label) {
  if (typeof els !== 'undefined' && els.sourceBox) els.sourceBox.textContent = label;
}
(function(){
  // Static dashboard using Chart.js and JS ⇄ C# bridge
  const els = {
  // btnBridge e btnMock removidos: fonte de dados agora é controlada pelo StatusManager
    btnLimpar: document.getElementById('btnLimpar'),
    counter: document.getElementById('counter'),
    chartCanvas: document.getElementById('chart'),
    pv: document.getElementById('pv'), sp: document.getElementById('sp'), mv: document.getElementById('mv'), cv: document.getElementById('cv'), error: document.getElementById('error'), status: document.getElementById('status'),
    keyPv: document.getElementById('keyPv'), keySp: document.getElementById('keySp'), keyMv: document.getElementById('keyMv'), keyCv: document.getElementById('keyCv'), keyErr: document.getElementById('keyErr'), keyStatus: document.getElementById('keyStatus'),
    cfgPoll: document.getElementById('cfgPoll'),
  };

  const state = { source: 'bridge', samples: [], timer: null, chart: null };

  // Função global chamada pelo C# via ponte Vuplex
  window.onFirebaseUpdate = function(path, data) {
    if (state.source !== 'bridge') return; // Só atualiza se a fonte for ponte C#
    if (typeof data === "string") {
      try { data = JSON.parse(data); } catch {}
    }
    // Espera-se que data seja um objeto com as chaves pv, sp, mv, cv, error, status, t
    if (path === "signal" || path === "planta") {
      const now = data.t || Date.now();
      const sample = {
        t: now,
        pv: Number(data.pv),
        sp: Number(data.sp),
        mv: Number(data.mv),
        cv: Number(data.cv),
        error: Number(data.error),
        status: data.status || '',
      };
      setLatest(sample);
      pushSample(sample);
    }
  };


  function fmt(n){ return n == null ? '—' : String(n); }
  function setLatest(v){ els.pv.textContent = fmt(v.pv); els.sp.textContent = fmt(v.sp); els.mv.textContent = fmt(v.mv); els.cv.textContent = fmt(v.cv); els.error.textContent = fmt(v.error); els.status.textContent = v.status ?? '—'; }
  function setCounter(){ els.counter.textContent = `amostras: ${state.samples.length}`; }

  function buildChart(){
    const ctx = els.chartCanvas.getContext('2d');
    const cfg = {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          { label: 'PV', data: [], borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.2)', tension: 0.2 },
          { label: 'SP', data: [], borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.2)', tension: 0.2 },
          { label: 'MV', data: [], borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.2)', tension: 0.2 },
          { label: 'CV', data: [], borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.2)', tension: 0.2 },
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { intersect: false, mode: 'index' },
        scales: { x: { ticks: { maxRotation: 0 } }, y: { beginAtZero: true } },
        plugins: { legend: { position: 'bottom' } }
      }
    };
    state.chart = new Chart(ctx, cfg);
  }

  function pushSample(sample){
    state.samples.push(sample);
    if (state.samples.length > 600) state.samples.shift();
    setCounter();
    const chart = state.chart;
    chart.data.labels = state.samples.map(s => new Date(s.t).toLocaleTimeString());
    chart.data.datasets[0].data = state.samples.map(s => s.pv);
    chart.data.datasets[1].data = state.samples.map(s => s.sp);
    chart.data.datasets[2].data = state.samples.map(s => s.mv);
    chart.data.datasets[3].data = state.samples.map(s => s.cv);
    chart.update('none');
  }

  function startMock(){
    clearInterval(state.timer); state.samples = []; setCounter();
    state.source = 'mock';
    let pv = 20, sp = 50, mv = 0, cv = 0; const dt = 1, tau = 5; const t0 = Date.now();
    const tick = () => {
      const now = Date.now(); const seconds = Math.floor((now - t0)/1000);
      if (seconds % 15 === 0) sp = 30 + (Math.floor(seconds/15) % 3) * 20;
      const error = sp - pv; mv = 0.8 * error; pv = pv + (-(pv - mv)/tau) * dt + (Math.random()-0.5)*0.3; cv = mv;
      const sample = { t: now, pv: +pv.toFixed(2), sp: +sp.toFixed(2), mv: +mv.toFixed(2), cv: +cv.toFixed(2), error: +error.toFixed(2), status: 'MOCK' };
      setLatest(sample); pushSample(sample);
    };
    tick(); state.timer = setInterval(tick, 1000);
  }

  function startBridge(){
    clearInterval(state.timer); state.samples = []; setCounter();
    state.source = 'bridge';
    const keys = { pv: els.keyPv.value || 'pv', sp: els.keySp.value || 'sp', mv: els.keyMv.value || 'mv', cv: els.keyCv.value || 'cv', error: els.keyErr.value || 'error', status: els.keyStatus.value || 'status' };
    // Listen to C# messages
    if (window.VuplexBridge && window.VuplexBridge.onMessage){
      window.VuplexBridge.onMessage((msg) => {
        if (!msg || typeof msg !== 'object') return;
        if (msg.type === 'valueNumber' && msg.payload) {
          // Expect payload { key, value, t? }
          const { key, value, t } = msg.payload;
          const now = t || Date.now();
          // We'll reconstruct a sample with whichever keys we have; maintain last knowns
          const last = state.samples[state.samples.length-1] || { pv:null, sp:null, mv:null, cv:null, error:null, status:'' };
          const cur = { ...last };
          if (key === keys.pv) cur.pv = Number(value);
          if (key === keys.sp) cur.sp = Number(value);
          if (key === keys.mv) cur.mv = Number(value);
          if (key === keys.cv) cur.cv = Number(value);
          if (key === keys.error) cur.error = Number(value);
          cur.t = now;
          setLatest({ ...cur, status: last.status });
          pushSample(cur);
        }
        if (msg.type === 'valueText' && msg.payload) {
          const { key, value } = msg.payload;
          if (key === keys.status) {
            const last = state.samples[state.samples.length-1] || { pv:null, sp:null, mv:null, cv:null, error:null, t:Date.now() };
            setLatest({ ...last, status: String(value) });
          }
        }
      });
    }
    // Poll via read requests (host may also push proactively)
    const pollMs = Number(els.cfgPoll.value || '1000');
    state.timer = setInterval(() => {
      if (!(window.VuplexBridge && window.VuplexBridge.postMessage)) return;
      for (const k of Object.values(keys)) {
        window.VuplexBridge.postMessage({ type: 'readNumber', payload: { key: k } });
      }
      window.VuplexBridge.postMessage({ type: 'readText', payload: { key: keys.status } });
    }, pollMs);
  }

  // Wire
  // Removido: seleção de fonte de dados agora é feita pelo StatusManager
  els.btnLimpar.addEventListener('click', () => { state.samples = []; setCounter(); if (state.chart) { state.chart.data.labels = []; for (const ds of state.chart.data.datasets) ds.data = []; state.chart.update('none'); } });

  // Defaults
  els.keyPv.value = 'pv'; els.keySp.value = 'sp'; els.keyMv.value = 'mv'; els.keyCv.value = 'cv'; els.keyErr.value = 'error'; els.keyStatus.value = 'status'; els.cfgPoll.value = '1000';

  buildChart();
  if (window.VuplexBridge && window.VuplexBridge.postMessage) startBridge(); else startMock();
})();

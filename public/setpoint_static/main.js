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
// Função global chamada pelo C# via ponte Vuplex
window.onFirebaseUpdate = function(path, data) {
  if (state.source !== 'bridge') return;
  if (typeof data === "string") {
    try { data = JSON.parse(data); } catch {}
  }
  if (path === "setpoint") {
    // Espera-se que data.value seja um número
    const n = Number(data.value);
    if (Number.isFinite(n)) setValue(n);
    setTime(data.t || Date.now());
    if (!els.inputSp.value) els.inputSp.value = String(n);
  }
};
(function(){
  // Static SetPoint page using JS ⇄ C# bridge (Vuplex). See bridge-messages.md.
  const els = {
  // btnBridge e btnMock removidos: fonte de dados agora é controlada pelo StatusManager
    time: document.getElementById('time'),
    inputSp: document.getElementById('inputSp'),
    btnApply: document.getElementById('btnApply'),
    valueBox: document.getElementById('valueBox'),
    sourceBox: document.getElementById('sourceBox'),
    cfgFirebasePath: document.getElementById('cfgFirebasePath'),
    cfgFirebaseCmd: document.getElementById('cfgFirebaseCmd'),
    cfgEndpoint: document.getElementById('cfgEndpoint'),
    cfgNodeId: document.getElementById('cfgNodeId'),
    cfgPoll: document.getElementById('cfgPoll'),
    hint: document.getElementById('hint'),
  };

  const state = { source: 'bridge', value: null, sending: false, timer: null };

  function setValue(n){ state.value = n; els.valueBox.textContent = (n==null? '—' : String(n)); }
  function setTime(t){ els.time.textContent = t ? new Date(t).toLocaleTimeString() : '—'; }
  function setSending(s){ state.sending = s; els.btnApply.disabled = s || !canWrite(); }
  function canWrite(){ const n = Number(els.inputSp.value); return Number.isFinite(n); }
  function updateSource(){
    // Não faz mais nada: fonte de dados é controlada externamente
  }

  function startMock(){
    state.source = 'mock';
    updateSource();
    clearInterval(state.timer);
    let n = 50; setValue(n); setTime(Date.now());
    state.timer = setInterval(() => { n = (n>=80?30:n+1); setValue(n); setTime(Date.now()); }, 1000);
  }

  function startBridge(){
    state.source = 'bridge';
    updateSource();
    clearInterval(state.timer);
    const key = els.cfgFirebasePath.value || 'sp';
    if (window.VuplexBridge && window.VuplexBridge.onMessage) {
      window.VuplexBridge.onMessage((msg) => {
        if (!msg || typeof msg !== 'object') return;
        if (msg.type === 'valueNumber' && msg.payload && msg.payload.key === key) {
          const n = Number(msg.payload.value); if (Number.isFinite(n)) setValue(n);
          setTime(msg.payload.t || Date.now());
          if (!els.inputSp.value) els.inputSp.value = String(n);
        }
      });
    }
    if (window.VuplexBridge && window.VuplexBridge.postMessage) {
      window.VuplexBridge.postMessage({ type: 'readNumber', payload: { key } });
    }
    const pollMs = Number(els.cfgPoll.value || '1000');
    state.timer = setInterval(() => {
      if (window.VuplexBridge && window.VuplexBridge.postMessage) {
        window.VuplexBridge.postMessage({ type: 'readNumber', payload: { key } });
      }
    }, pollMs);
  }

  async function apply(){
    if (!canWrite()) return;
    const n = Number(els.inputSp.value);
    setSending(true);
    try {
      if (state.source === 'bridge') {
        const key = els.cfgFirebasePath.value || 'sp';
        if (window.VuplexBridge && window.VuplexBridge.postMessage) {
          window.VuplexBridge.postMessage({ type: 'writeNumber', payload: { key, value: n } });
        } else { alert('Ponte C# indisponível.'); }
      }
    } finally { setSending(false); }
  }

  // Wire
  els.inputSp.addEventListener('input', () => { els.btnApply.disabled = !canWrite(); });
  els.btnApply.addEventListener('click', apply);
  // Removido: seleção de fonte de dados agora é feita pelo StatusManager

  // Defaults
  els.cfgFirebasePath.value = 'sp';
  els.cfgFirebaseCmd.value = 'sp_cmd';
  els.cfgPoll.value = '1000';

  if (window.VuplexBridge && window.VuplexBridge.postMessage) startBridge();
  else startMock();
})();

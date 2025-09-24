(function(){
  // Static SetPoint page using JS ⇄ C# bridge (Vuplex). See bridge-messages.md.
  const els = {
  btnBridge: document.getElementById('btnBridge'),
    btnMock: document.getElementById('btnMock'),
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
    els.sourceBox.textContent = state.source;
    els.hint.textContent = state.source==='bridge' ? `Comunicando via ponte C# (key: ${els.cfgFirebasePath.value||'sp'})` : 'Mock';
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
  els.btnMock.addEventListener('click', startMock);
  els.btnBridge.addEventListener('click', startBridge);

  // Defaults
  els.cfgFirebasePath.value = 'sp';
  els.cfgFirebaseCmd.value = 'sp_cmd';
  els.cfgPoll.value = '1000';

  if (window.VuplexBridge && window.VuplexBridge.postMessage) startBridge();
  else startMock();
})();

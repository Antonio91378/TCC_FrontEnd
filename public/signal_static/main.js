// Permite que o C# altere a fonte de dados dinamicamente
window.onApproachChanged = function(approach) {
  if (approach === "OpcUa") {
    if (typeof startBridge === "function") startBridge();
    setApproachIndicator("OPC UA");
  } else if (approach === "Firebase") {
    // Apenas responde a window.onFirebaseUpdate
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
    if (path === "signal") {
      // Espera-se que data.value seja booleano ou equivalente
      const v = typeof data.value === 'boolean' ? data.value : (data.value === 1 || data.value === '1' || data.value === 'true');
      setValue(Boolean(v));
      setLastUpdate(data.t || Date.now());
    }
  };
(function(){
  /**
   * Versão estática de /signal adaptada para ponte JS ⇄ C# (Vuplex).
   * Modos: bridge (C#), mock
   * A comunicação real deve ser implementada pelo app host (Unity/C#), ver bridge-messages.md.
   */

  const els = {
  // btnBridge e btnMock removidos: fonte de dados agora é controlada pelo StatusManager
    btnReset: document.getElementById('btnReset'),
    switch: document.getElementById('switch'),
    stateLabel: document.getElementById('stateLabel'),
    valueBox: document.getElementById('valueBox'),
    sourceBox: document.getElementById('sourceBox'),
    time: document.getElementById('time'),
    hiddenCheckbox: document.getElementById('hiddenCheckbox'),
    hint: document.getElementById('hint'),
    cfgFirebasePath: document.getElementById('cfgFirebasePath'),
    cfgFirebaseCmd: document.getElementById('cfgFirebaseCmd'),
    cfgEndpoint: document.getElementById('cfgEndpoint'),
    cfgNodeId: document.getElementById('cfgNodeId'),
    cfgPoll: document.getElementById('cfgPoll'),
  };

  const state = {
    source: 'bridge',
    value: null,
    lastUpdate: null,
    sending: false,
    timer: null,
  };

  function formatTime(t){
    try { return new Date(t).toLocaleTimeString(); } catch { return '—'; }
  }

  function setDisabled(btn, disabled){
    if (!btn) return;
    if (disabled) btn.setAttribute('disabled','');
    else btn.removeAttribute('disabled');
  }

  function updateToolbar(){
    // Não faz mais nada: fonte de dados é controlada externamente
  }

  function setValue(v){
    state.value = v;
    els.valueBox.textContent = v === null ? '—' : String(Boolean(v));
    const checked = v === true;
    els.switch.setAttribute('aria-checked', String(checked));
    if (checked) els.switch.classList.add('on'); else els.switch.classList.remove('on');
    refreshSwitchInteractivity();
  }

  function setLastUpdate(t){
    state.lastUpdate = t;
    els.time.textContent = t ? formatTime(t) : '—';
  }

  function setSending(s){
    state.sending = s;
    els.switch.setAttribute('aria-busy', s ? 'true' : 'false');
    refreshSwitchInteractivity();
  }

  function canToggle(){
    return (state.source === 'bridge') && state.value !== null && !state.sending;
  }

  function refreshSwitchInteractivity(){
    const allowed = canToggle();
    if (allowed) {
      els.switch.classList.remove('switchDisabled');
      els.switch.classList.add('switchClickable');
      els.switch.setAttribute('tabindex','0');
      els.switch.setAttribute('aria-disabled','false');
    } else {
      els.switch.classList.add('switchDisabled');
      els.switch.classList.remove('switchClickable');
      els.switch.setAttribute('tabindex','-1');
      els.switch.setAttribute('aria-disabled','true');
    }
    const checked = state.value === true;
    els.stateLabel.textContent = state.sending ? 'Enviando…' : checked ? 'Ligado' : state.value === null ? 'Aguarde…' : 'Desligado';
    els.hint.textContent = state.source === 'bridge' ? `Comunicando via ponte C# (key: ${els.cfgFirebasePath.value||'bool'})`
      : 'Modo Mock: o valor alterna automaticamente';
  }

  function clearTimers(){
    if (state.timer) clearInterval(state.timer);
    state.timer = null;
  }

  function reset(){
    clearTimers();
    setValue(null);
    setLastUpdate(null);
    refreshSwitchInteractivity();
  }

  function startMock(){
    reset();
    state.source = 'mock';
    updateToolbar();
    let v = false;
    const tick = () => { v = !v; setValue(v); setLastUpdate(Date.now()); };
    tick();
    state.timer = setInterval(tick, 1500);
  }
  
  function startBridge(){
    reset();
    state.source = 'bridge';
    updateToolbar();
    const key = els.cfgFirebasePath.value || 'bool';
    // Subscribe to messages from C#
    if (window.VuplexBridge && window.VuplexBridge.onMessage) {
      window.VuplexBridge.onMessage((msg) => {
        if (!msg || typeof msg !== 'object') return;
        if (msg.type === 'valueBool' && msg.payload && msg.payload.key === key) {
          const raw = msg.payload.value;
          const v = typeof raw === 'boolean' ? raw : (raw === 1 || raw === '1' || raw === 'true');
          setValue(Boolean(v));
          setLastUpdate(msg.payload.t || Date.now());
        }
      });
    }
    // Initial read request
    if (window.VuplexBridge && window.VuplexBridge.postMessage) {
      window.VuplexBridge.postMessage({ type: 'readBool', payload: { key } });
    }
    // Optional polling from JS (C# também pode enviar push)
    const pollMs = Number(els.cfgPoll.value || '1000');
    state.timer = setInterval(() => {
      if (window.VuplexBridge && window.VuplexBridge.postMessage) {
        window.VuplexBridge.postMessage({ type: 'readBool', payload: { key } });
      }
    }, pollMs);
  }

  async function sendBridgeCommand(next){
    try {
      setSending(true);
      const key = els.cfgFirebasePath.value || 'bool';
      if (window.VuplexBridge && window.VuplexBridge.postMessage) {
        window.VuplexBridge.postMessage({ type: 'writeBool', payload: { key, value: !!next } });
      } else {
        alert('Ponte C# indisponível.');
      }
    } finally { setSending(false); }
  }

  function onToggle(){
    if (!canToggle()) return;
    const next = !(state.value === true);
    if (state.source === 'bridge') return sendBridgeCommand(next);
  }

  // Wire events
  // Removido: seleção de fonte de dados agora é feita pelo StatusManager
  els.btnReset.addEventListener('click', () => { reset(); setValue(null); setLastUpdate(null); });
  els.switch.addEventListener('click', onToggle);
  els.switch.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); }});

  // Defaults
  els.cfgFirebasePath.value = 'bool';
  els.cfgFirebaseCmd.value = 'bool_cmd';
  els.cfgPoll.value = '1000';

  // Start in bridge if available, else mock
  if (window.VuplexBridge && window.VuplexBridge.postMessage) startBridge();
  else startMock();
})();

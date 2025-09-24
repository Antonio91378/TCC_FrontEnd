// Minimal helper for Vuplex WebView messaging per https://support.vuplex.com/articles/how-to-send-messages-from-javascript-to-c-sharp
// This wrapper no-ops in regular browsers but works in Unity / Vuplex.
window.VuplexBridge = (function(){
  function postMessage(message){
    try {
      if (window.vuplex && window.vuplex.postMessage) {
        window.vuplex.postMessage(JSON.stringify(message));
        return true;
      }
      // Backwards-compat API
      if (window.vuplex && window.vuplex.postMessage) {
        window.vuplex.postMessage(message);
        return true;
      }
      return false;
    } catch(e){
      console.warn('VuplexBridge postMessage failed', e);
      return false;
    }
  }
  function onMessage(handler){
    try {
      if (window.vuplex && window.vuplex.addEventListener) {
        window.vuplex.addEventListener('message', (event) => {
          try {
            const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            handler(data);
          } catch { handler(event.data); }
        });
        return true;
      }
      return false;
    } catch(e){
      console.warn('VuplexBridge onMessage failed', e);
      return false;
    }
  }
  return { postMessage, onMessage };
})();

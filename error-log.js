/* Bounce Service Info - page error tracking.
   Records browser errors and failed data loads (which page, which user, what failed) for Admin -> System Health.
   At most 8 reports per page visit, no repeats; nothing about the data itself is sent. */
(function () {
  if (window.__bsiErrLog) return; window.__bsiErrLog = true;
  var URL_ = 'https://fuslpeyhpmofzijrotkb.supabase.co/rest/v1/rpc/log_client_error';
  var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1c2xwZXlocG1vZnppanJvdGtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NDg0NDgsImV4cCI6MjA5NDMyNDQ0OH0.IGtWV-bus0Tc1i3z7hWuFZEda06q8L31YyBgiOFujbs';
  var sent = 0, seen = {};
  var origFetch = window.fetch ? window.fetch.bind(window) : null;
  function email() { try { return (JSON.parse(localStorage.getItem('sb_session') || '{}').email) || null; } catch (e) { return null; } }
  function page() { var p = (location.pathname.split('/').pop() || 'index.html'); return p + (p === 'index.html' && location.hash ? location.hash : ''); }
  function report(kind, message, detail) {
    try {
      message = String(message || '').slice(0, 500); if (!message) return;
      var k = kind + '|' + message; if (seen[k] || sent >= 8 || !origFetch) return; seen[k] = 1; sent++;
      origFetch(URL_, { method: 'POST', keepalive: true, headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_page: page(), p_kind: kind, p_message: message, p_detail: detail ? String(detail).slice(0, 2000) : null,
          p_email: email(), p_url: location.href.split('?')[0].slice(0, 500), p_ua: navigator.userAgent.slice(0, 300) }) }).catch(function () {});
    } catch (e) {}
  }
  window.addEventListener('error', function (e) {
    if (e && e.message) report('script', e.message, (e.filename || '').split('/').pop() + ':' + (e.lineno || '') + ':' + (e.colno || '') + (e.error && e.error.stack ? '\n' + e.error.stack : ''));
  });
  window.addEventListener('unhandledrejection', function (e) {
    var r = e && e.reason; report('promise', (r && (r.message || r)) || 'Unhandled promise rejection', r && r.stack);
  });
  // failed data loads: Supabase calls that error or return 5xx / timeout (not the error log itself)
  if (origFetch) window.fetch = function (input, init) {
    var u = typeof input === 'string' ? input : (input && input.url) || '';
    var isSb = u.indexOf('supabase.co') >= 0 && u.indexOf('log_client_error') < 0;
    var p = origFetch(input, init);
    if (!isSb) return p;
    var what = u.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
    return p.then(function (res) {
      if (res.status >= 500 || res.status === 408) {
        res.clone().text().then(function (t) { report('data', 'HTTP ' + res.status + ' ' + what, t.slice(0, 600)); }).catch(function () {});
      }
      return res;
    }, function (err) { report('data', 'Network error ' + what, err && err.message); throw err; });
  };
})();

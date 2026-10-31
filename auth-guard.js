// auth-guard.js — session check with 1-day expiry + permission-based sidebar
// 27 Oct 2026 (security): any request to our database that carries the PUBLIC (anon) key is sent with the logged-in
// user's token instead, so the database can stop answering the public key. Installed first, before any page code runs.
(function(){
  if (window.__sbUserTokenFetch) return; window.__sbUserTokenFetch = true;
  var SBU = 'https://fuslpeyhpmofzijrotkb.supabase.co';
  function role(t){ try { return JSON.parse(atob(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role; } catch(e){ return null; } }
  function expMs(t){ try { var p = JSON.parse(atob(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))); return p.exp ? p.exp*1000 : 0; } catch(e){ return 0; } }
  function sess(){ try { return JSON.parse(localStorage.getItem('sb_session') || '{}'); } catch(e){ return {}; } }
  // 31 Oct 2026: ONE renewal at a time across every tab and frame (shared lock in localStorage). Parallel renewals with
  // the same refresh token made Supabase flag "refresh_token_already_used" and cancel the whole session.
  function fresh(t){ return t && expMs(t) > Date.now() + 60000; }
  function sleep(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
  var ANONK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1c2xwZXlocG1vZnppanJvdGtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NDg0NDgsImV4cCI6MjA5NDMyNDQ0OH0.IGtWV-bus0Tc1i3z7hWuFZEda06q8L31YyBgiOFujbs';
  async function renew(){
    var LOCK = 'sb_refresh_lock', me = Math.random().toString(36).slice(2);
    for (var i = 0; i < 50; i++) {
      var s = sess();
      if (!s.access_token) return { refused: true };
      if (fresh(s.access_token)) return { token: s.access_token };
      if (!s.refresh_token) return { refused: true };
      var l = null; try { l = JSON.parse(localStorage.getItem(LOCK) || 'null'); } catch(e) {}
      if (!l || Date.now() - l.at > 15000) {
        localStorage.setItem(LOCK, JSON.stringify({ id: me, at: Date.now() }));
        await sleep(80);
        var l2 = null; try { l2 = JSON.parse(localStorage.getItem(LOCK) || 'null'); } catch(e) {}
        if (l2 && l2.id === me) {
          var s2 = sess();
          if (fresh(s2.access_token)) { localStorage.removeItem(LOCK); return { token: s2.access_token }; }
          try {
            var r = await origFetch(SBU + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: ANONK, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: s2.refresh_token }) });
            if (r.ok) {
              var d = await r.json(); var ns = Object.assign({}, sess(), { access_token: d.access_token, refresh_token: d.refresh_token || s2.refresh_token });
              localStorage.setItem('sb_session', JSON.stringify(ns));
              try { sessionStorage.setItem('sb_session_bak', JSON.stringify(ns)); } catch(e) {}
              localStorage.removeItem(LOCK); return { token: d.access_token };
            }
            localStorage.removeItem(LOCK);
            if (r.status >= 400 && r.status < 500 && r.status !== 429) { var c = sess(); return fresh(c.access_token) ? { token: c.access_token } : { refused: true }; }
          } catch(e) { localStorage.removeItem(LOCK); }
          await sleep(3000);                                  // server or network trouble: wait, then try again
          continue;
        }
      }
      await sleep(400);                                       // another tab/frame is renewing: wait for its token
    }
    var c3 = sess(); return fresh(c3.access_token) ? { token: c3.access_token } : { transient: true };
  }
  window.__sbRenew = renew;
  var kicked = false;
  async function userToken(){
    var s = sess(); if (!s.access_token || !s.expires_at || s.expires_at < Date.now()) return null;
    if (fresh(s.access_token)) return s.access_token;
    var res = await renew();
    if (res.token) return res.token;
    if (res.refused && !kicked) {
      // the session is dead (refused by the login server): clear it first, so the portal shows the sign-in screen
      // instead of reloading in a loop (31 Oct 2026)
      kicked = true;
      try { localStorage.removeItem('sb_session'); sessionStorage.removeItem('sb_session_bak'); sessionStorage.removeItem('sb_session'); localStorage.removeItem('sb_refresh_lock'); } catch(e) {}
      try { (window.top || window).location.href = '/bounce-service-info/index.html'; } catch(e) {}
    }
    return null;
  }
  var origFetch = window.fetch.bind(window), anonKey = null;
  window.fetch = async function(input, init){
    try {
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      if (url.indexOf(SBU + '/rest/v1/') === 0 || url.indexOf(SBU + '/functions/v1/') === 0) {
        var h = new Headers((init && init.headers) || (input && input.headers) || {});
        var a = h.get('Authorization') || h.get('authorization') || '';
        var tok = a.replace(/^Bearer\s+/i, '');
        if (tok && role(tok) === 'anon') {
          anonKey = anonKey || h.get('apikey') || tok;
          var ut = await userToken();
          if (ut && role(ut) !== 'anon') {
            h.set('Authorization', 'Bearer ' + ut);
            if (typeof input === 'string') init = Object.assign({}, init || {}, { headers: h });
            else input = new Request(input, { headers: h });
          }
        }
      }
    } catch(e) {}
    return origFetch(input, init);
  };
})();
(function() {
  // One-time cleanup: an earlier version of hub-audit.html registered its
  // service worker with no explicit scope, which defaults to the site root —
  // meaning it silently intercepted every page on the whole site, not just
  // hub-audit.html. Remove any registration whose scope isn't narrowed to
  // hub-audit.html specifically; a correctly-scoped SW re-registers itself
  // fine from hub-audit.html on next visit there.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(regs) {
      regs.forEach(function(reg) {
        if (reg.scope.indexOf('hub-audit.html') === -1) reg.unregister().catch(function() {});
      });
    }).catch(function() {});
  }

  const SB_URL  = 'https://fuslpeyhpmofzijrotkb.supabase.co';
  const SB_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1c2xwZXlocG1vZnppanJvdGtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NDg0NDgsImV4cCI6MjA5NDMyNDQ0OH0.IGtWV-bus0Tc1i3z7hWuFZEda06q8L31YyBgiOFujbs';
  const EDGE    = 'https://fuslpeyhpmofzijrotkb.supabase.co/functions/v1/auth-user';

  function getSession() {
    try { return JSON.parse(localStorage.getItem('sb_session') || '{}'); } catch(e) { return {}; }
  }
  function redirectLogin() {
    localStorage.removeItem('sb_session');
    window.location.replace('login.html');
  }

  // NOTE on expires_at: this field is a separate app-level policy marker (end of
  // day / ~24hr from login, set by index.html and login.html) used to decide when
  // to force a full re-login. It is NOT the real cryptographic expiry of the
  // access_token itself, which Supabase sets independently (~1hr by default) and
  // encodes in the JWT's own "exp" claim. Conflating the two was the original bug:
  // a fetch attaching Authorization: Bearer <access_token> would get a 401 once
  // the real ~1hr expiry passed, even though expires_at (end of day) said the
  // session still had hours left, so nothing ever refreshed it. The fix decodes
  // the real exp straight from the token on every check, and never touches or
  // repurposes expires_at, which keeps its original end-of-day meaning intact for
  // the rest of the app.
  function realExpiryMs(jwt) {
    try {
      const payload = JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload.exp ? payload.exp * 1000 : null;
    } catch (e) { return null; }
  }

  async function refreshToken(refreshTk) {
    // 31 Oct 2026: shared single renewer (see top of file). Returns the session, null if refused, or {transient:true}.
    const res = await window.__sbRenew();
    if (res.token) return getSession();
    if (res.refused) return null;
    return { transient: true };
  }

  // Returns a token guaranteed cryptographically valid for at least another 90s,
  // refreshing first if the cached one is expired or about to be. Any dashboard
  // code that attaches a per-user Authorization header (instead of just the anon
  // key) should call this rather than reading the cached token directly.
  async function getValidToken() {
    let sess = getSession();
    if (!sess.access_token) return null;
    const realExp = realExpiryMs(sess.access_token);
    if (!realExp || realExp < Date.now() + 90*1000) {
      if (!sess.refresh_token) { redirectLogin(); return null; }
      const refreshed = await refreshToken(sess.refresh_token);
      if (refreshed && refreshed.transient) return sess.access_token;   // could not reach the server: stay signed in, try again on the next call
      if (refreshed) return refreshed.access_token;
      // Refresh definitively failed (network-blip null is handled by the fallback
      // above via a truthy refresh_token check failing later calls too, but a
      // real rejection from the server -- e.g. reuse-detection revoking the whole
      // refresh chain -- means this session can never recover on its own).
      // Silently returning the stale/expired access_token here used to let every
      // subsequent authenticated call fail for an unrelated, confusing reason
      // (e.g. Storage rejecting the JWT with a generic 400) instead of surfacing
      // the real problem, sometimes for 20+ minutes before anyone noticed.
      // Force a clean re-login instead so the failure is immediate and legible.
      redirectLogin();
      return null;
    }
    return sess.access_token;
  }

  (async function() {
    let sess = getSession();
    if (!sess.access_token) { redirectLogin(); return; }
    // This check is the original end-of-day/24hr force-logout policy — unrelated
    // to the token's own real cryptographic expiry, left exactly as it was.
    // Daily sign-in (27 Oct 2026): once the session's end-of-day cut-off has passed, sign in again with the password.
    // (No silent renewal here any more; the hourly token refresh during the day is unchanged.)
    if (!sess.expires_at || sess.expires_at < Date.now()) { redirectLogin(); return; }

    // Load permissions from allowed_users
    let perms = null;
    let role   = 'viewer';
    try {
      const r = await fetch(`${SB_URL}/rest/v1/allowed_users?email=eq.${encodeURIComponent(sess.email)}&select=permissions,role,needs_reset`, {
        headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${sess.access_token}` }
      });
      const d = await r.json();
      if (d?.[0]) {
        perms = d[0].permissions;
        role  = d[0].role;
        // If admin reset password, force re-login
        if (d[0].needs_reset) { redirectLogin(); return; }
      }
    } catch(e) {}

    window.authGetEmail     = () => sess.email || '';
    window.authIsAdmin      = () => role === 'admin';
    window.authGetToken     = () => getSession().access_token || ''; // last-known cached token, no refresh check
    window.authGetValidToken = getValidToken; // async — refreshes first if the cached token is expired/expiring
    window.authPerms        = () => perms || {};
    window.authLogout       = () => { localStorage.removeItem('sb_session'); redirectLogin(); };
    window.dispatchEvent(new Event('auth-ready'));

    // Proactively refresh in the background every 10min so a tab left open all
    // day doesn't rely on some fetch happening to notice expiry first.
    setInterval(() => { getValidToken().catch(() => {}); }, 10*60*1000);

    // Apply permissions to sidebar — hide dashboards user can't access
    function applyPerms() {
      if (!perms) return;
      const map = {
        'dashboard': 'rmc', 'fleet': 'fleet_km', 'parts': 'parts_testing',
        'tyre': 'wear_tear', 'msl': 'msl_dashboard', 'oos': 'oos',
        'savings': 'cost_savings'
      };
      document.querySelectorAll('.sb-item[data-view]').forEach(el => {
        const view = el.dataset.view;
        const key  = map[view];
        if (key && perms[key] === false) el.style.display = 'none';
      });
      // Show/hide admin link
      const adminLink = document.getElementById('admin-link');
      if (adminLink) adminLink.style.display = role === 'admin' ? '' : 'none';
    }

    // Apply after DOM ready
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyPerms);
    else applyPerms();
    window.addEventListener('auth-perms-updated', applyPerms);
  })();
})();

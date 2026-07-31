// auth-guard.js — session check with 1-day expiry + permission-based sidebar
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

  async function refreshToken(refreshTk) {
    try {
      const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST', headers: { 'apikey': SB_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshTk })
      });
      if (!r.ok) return null;
      const d = await r.json();
      const s = { access_token: d.access_token, refresh_token: d.refresh_token, email: d.user?.email, expires_at: Date.now() + 24*60*60*1000 };
      localStorage.setItem('sb_session', JSON.stringify(s));
      return s;
    } catch(e) { return null; }
  }

  (async function() {
    let sess = getSession();
    if (!sess.access_token) { redirectLogin(); return; }
    if (sess.expires_at < Date.now()) {
      if (!sess.refresh_token) { redirectLogin(); return; }
      sess = await refreshToken(sess.refresh_token);
      if (!sess) { redirectLogin(); return; }
    }

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

    window.authGetEmail  = () => sess.email || '';
    window.authIsAdmin   = () => role === 'admin';
    window.authGetToken  = () => sess.access_token || '';
    window.authPerms     = () => perms || {};
    window.authLogout    = () => { localStorage.removeItem('sb_session'); redirectLogin(); };
    window.dispatchEvent(new Event('auth-ready'));

    // Apply permissions to sidebar — hide dashboards user can't access
    function applyPerms() {
      if (!perms) return;
      const map = {
        'dashboard': 'rmc', 'fleet': 'fleet_km', 'parts': 'parts_testing',
        'tyre': 'wear_tear', 'hub': 'hub_control_tower', 'msl': 'msl_dashboard', 'oos': 'oos',
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

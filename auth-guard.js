(function() {
  const ADMIN  = 'nithish@bounceshare.com';
  const SB_URL = 'https://fuslpeyhpmofzijrotkb.supabase.co';
  const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1c2xwZXlocG1vZnppanJvdGtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NDg0NDgsImV4cCI6MjA5NDMyNDQ0OH0.IGtWV-bus0Tc1i3z7hWuFZEda06q8L31YyBgiOFujbs';

  // Read session
  let session = null;
  try { session = JSON.parse(localStorage.getItem('sb_session') || sessionStorage.getItem('sb_session') || 'null'); } catch(e) {}

  // No session → login
  if (!session?.email) { window.location.href = 'login.html'; return; }

  // Expired → login
  if (session.expires_at && Date.now() > session.expires_at) {
    localStorage.clear(); sessionStorage.clear();
    window.location.href = 'login.html'; return;
  }

  // Expose helpers
  window.authGetEmail = () => session.email || '';
  window.authIsAdmin  = () => session.email?.toLowerCase() === ADMIN;
  const DEFAULT_PERMS = { rmc:true, fleet_km:true, parts_testing:true, wear_tear:true, hub_control_tower:true, msl_dashboard:false, hub_tv:false };
  window.authPerms    = () => Object.assign({}, DEFAULT_PERMS, session.permissions || {});
  window.authLogout   = () => { localStorage.clear(); sessionStorage.clear(); window.location.href = 'login.html'; };

  // Apply permissions + sync from DB in background
  document.addEventListener('DOMContentLoaded', () => {
    const p = session.permissions || { rmc:true, fleet_km:true, parts_testing:true, wear_tear:true, hub_control_tower:true };
    applyPerms(p);
    const el = document.getElementById('sb-user-email');
    if (el) el.textContent = session.email;

    // Background sync — update permissions but never logout on failure
    fetch(`${SB_URL}/rest/v1/allowed_users?email=eq.${encodeURIComponent(session.email.toLowerCase())}&select=permissions,role,is_active`, {
      headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
    }).then(r => r.json()).then(rows => {
      if (!Array.isArray(rows) || !rows.length) return;
      if (rows[0].is_active === false) {
        localStorage.clear(); sessionStorage.clear();
        window.location.href = 'login.html'; return;
      }
      const fresh = Object.assign({}, DEFAULT_PERMS, rows[0].permissions || {});
      session.permissions = fresh;
      session.role = rows[0].role;
      localStorage.setItem('sb_session', JSON.stringify(session));
      sessionStorage.setItem('sb_session', JSON.stringify(session));
      applyPerms(fresh);
    }).catch(() => {}); // network error — keep current session
  });

  function applyPerms(p) {
    // Hide sidebar items by data-tab (unified index.html)
    const hideTab = (tab) => document.querySelectorAll(`.sb-item[data-tab="${tab}"]`).forEach(e => e.style.display='none');
    if (!p.rmc)               hideTab('dashboard');
    if (!p.fleet_km)          hideTab('fleet');
    if (!p.parts_testing)     hideTab('parts');
    if (!p.wear_tear)         hideTab('tyre');
    if (!p.hub_control_tower) hideTab('hub');
    if (!p.msl_dashboard)     hideTab('msl');
    if (!p.hub_tv)             hideTab('hub-tv');
    // Also support old-style href links (individual pages still in repo)
    const hideHref = (href) => document.querySelectorAll(`a[href="${href}"]`).forEach(e => e.style.display='none');
    if (!p.rmc)               hideHref('dashboard.html');
    if (!p.fleet_km)          hideHref('fleet-km.html');
    if (!p.parts_testing)     hideHref('parts-testing.html');
    if (!p.wear_tear)         hideHref('tyre-analysis.html');
    if (!p.hub_control_tower) hideHref('hub-control-tower.html');
    if (!p.msl_dashboard)     hideHref('msl-dashboard.html');
    if (!p.hub_tv)             hideHref('hub-tv.html');
    // Notify index page if open
    window.dispatchEvent(new Event('auth-perms-updated'));
  }
})();

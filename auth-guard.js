(function() {
  const ADMIN   = 'nithish@bounceshare.com';
  const SB_URL  = 'https://fuslpeyhpmofzijrotkb.supabase.co';
  const SB_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1c2xwZXlocG1vZnppanJvdGtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NDg0NDgsImV4cCI6MjA5NDMyNDQ0OH0.IGtWV-bus0Tc1i3z7hWuFZEda06q8L31YyBgiOFujbs';

  let session = null;
  try {
    const raw = localStorage.getItem('sb_session') || sessionStorage.getItem('sb_session');
    session = JSON.parse(raw || 'null');
    // Also check SDK storage key
    if (!session?.email) {
      const sdkKey = Object.keys(localStorage).find(k => k.includes('supabase') || k.includes('sb-'));
      if (sdkKey) {
        const sdkData = JSON.parse(localStorage.getItem(sdkKey) || 'null');
        const email = sdkData?.user?.email;
        const at    = sdkData?.access_token;
        if (email && at) {
          session = { email, access_token: at, permissions: { rmc:true, fleet_km:true, parts_testing:true } };
          localStorage.setItem('sb_session', JSON.stringify(session));
        }
      }
    }
  } catch(e) {}

  if (!session?.email) { window.location.href = 'login.html'; return; }

  // Check 7-day session expiry
  if (session.expires_at && Date.now() > session.expires_at) {
    localStorage.clear(); sessionStorage.clear();
    window.location.href = 'login.html';
    return;
  }

  // Sync permissions from DB — only logout if explicitly revoked
  const emailLower = session.email.toLowerCase();
  fetch(`${SB_URL}/rest/v1/allowed_users?email=eq.${encodeURIComponent(emailLower)}&select=permissions,role,is_active`, {
    headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
  }).then(r => r.json()).then(rows => {
    if (!Array.isArray(rows)) return; // unexpected response — keep cached session
    if (rows.length > 0 && rows[0].is_active === false) {
      // Explicitly revoked — force logout
      localStorage.clear(); sessionStorage.clear();
      window.location.href = 'login.html';
      return;
    }
    if (!rows.length) return; // not found — keep cached session, don't logout
    const fresh = rows[0].permissions || { rmc:true, fleet_km:true, parts_testing:true };
    session.permissions = fresh;
    session.role = rows[0].role;
    const s = JSON.stringify(session);
    localStorage.setItem('sb_session', s);
    sessionStorage.setItem('sb_session', s);
    applyPerms(fresh);
  }).catch(() => {
    applyPerms(session.permissions || { rmc:true, fleet_km:true, parts_testing:true });
  });

  function applyPerms(p) {
    if (!p.rmc)           document.querySelectorAll('a[href="dashboard.html"]').forEach(e=>e.style.display='none');
    if (!p.fleet_km)      document.querySelectorAll('a[href="fleet-km.html"]').forEach(e=>e.style.display='none');
    if (!p.parts_testing) document.querySelectorAll('a[href="parts-testing.html"]').forEach(e=>e.style.display='none');
  }

  window.authGetEmail = () => session.email || '';
  window.authIsAdmin  = () => (session.email||'').toLowerCase() === ADMIN;
  window.authPerms    = () => session.permissions || { rmc:true, fleet_km:true, parts_testing:true };
  window.authLogout   = () => { localStorage.clear(); sessionStorage.clear(); window.location.href = 'login.html'; };

  document.addEventListener('DOMContentLoaded', () => {
    // Apply cached permissions immediately (fresh will overwrite if different)
    applyPerms(session.permissions || { rmc:true, fleet_km:true, parts_testing:true });
    // Also redirect if user lands on a page they don't have access to
    const page = location.pathname.split('/').pop();
    const p = session.permissions || {};
    if (page === 'dashboard.html'   && p.rmc           === false) window.location.href = 'login.html';
    if (page === 'fleet-km.html'    && p.fleet_km      === false) window.location.href = 'login.html';
    if (page === 'parts-testing.html' && p.parts_testing === false) window.location.href = 'login.html';
    const el = document.getElementById('sb-user-email');
    if (el) el.textContent = session.email;
  });
})();

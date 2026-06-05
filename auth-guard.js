(function() {
  const ADMIN = 'nithish@bounceshare.com';

  let session = null;
  try {
    // Check new SDK session first, then fall back to old custom session
    const raw = localStorage.getItem('sb_session') || sessionStorage.getItem('sb_session');
    session = JSON.parse(raw || 'null');
    // Also check SDK's own storage key
    if (!session?.email) {
      const sdkRaw = localStorage.getItem('sb-fuslpeyhpmofzijrotkb-auth-token');
      if (sdkRaw) {
        const sdkSess = JSON.parse(sdkRaw);
        if (sdkSess?.user?.email) {
          session = { email: sdkSess.user.email, access_token: sdkSess.access_token,
            permissions: { rmc:true, fleet_km:true, parts_testing:true } };
        }
      }
    }
  } catch(e) {}

  if (!session || !session.email) {
    window.location.href = 'login.html';
    return;
  }

  // Keep session alive in both storages
  try {
    const s = JSON.stringify(session);
    localStorage.setItem('sb_session', s);
    sessionStorage.setItem('sb_session', s);
  } catch(e) {}

  window.authGetEmail = () => session.email || '';
  window.authIsAdmin  = () => (session.email||'').toLowerCase() === ADMIN;
  window.authPerms    = () => session.permissions || {rmc:true,fleet_km:true,parts_testing:true};
  window.authLogout   = () => {
    localStorage.removeItem('sb_session');
    sessionStorage.removeItem('sb_session');
    window.location.href = 'login.html';
  };

  document.addEventListener('DOMContentLoaded', () => {
    const p = session.permissions || {rmc:true,fleet_km:true,parts_testing:true};
    if (!p.rmc)          document.querySelectorAll('a[href="dashboard.html"]').forEach(e=>e.style.display='none');
    if (!p.fleet_km)     document.querySelectorAll('a[href="fleet-km.html"]').forEach(e=>e.style.display='none');
    if (!p.parts_testing)document.querySelectorAll('a[href="parts-testing.html"]').forEach(e=>e.style.display='none');
    const al = document.getElementById('admin-link');
    if (al && (session.email||'').toLowerCase()===ADMIN) al.style.display='block';
    const el = document.getElementById('sb-user-email');
    if (el) el.textContent = session.email;
  });
})();

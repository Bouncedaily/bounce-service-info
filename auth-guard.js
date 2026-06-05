(function() {
  const ADMIN = 'nithish@bounceshare.com';

  let session = null;
  try {
    const raw = localStorage.getItem('sb_session') || sessionStorage.getItem('sb_session');
    session = JSON.parse(raw || 'null');
    // Also check SDK storage key
    if (!session?.email) {
      const sdkKey = Object.keys(localStorage).find(k => k.includes('supabase') || k.includes('sb-'));
      if (sdkKey) {
        const sdkRaw = localStorage.getItem(sdkKey);
        const sdkData = JSON.parse(sdkRaw || 'null');
        if (sdkData?.user?.email || sdkData?.access_token) {
          const email = sdkData?.user?.email;
          const at = sdkData?.access_token;
          if (email && at) {
            session = { email, access_token: at, permissions: { rmc:true, fleet_km:true, parts_testing:true } };
            localStorage.setItem('sb_session', JSON.stringify(session));
          }
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
    localStorage.clear();
    sessionStorage.clear();
    // Also sign out from Supabase SDK if available
    if (window.supabase) {
      try {
        const sb = window.supabase.createClient(
          'https://fuslpeyhpmofzijrotkb.supabase.co',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1c2xwZXlocG1vZnppanJvdGtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NDg0NDgsImV4cCI6MjA5NDMyNDQ0OH0.IGtWV-bus0Tc1i3z7hWuFZEda06q8L31YyBgiOFujbs'
        );
        sb.auth.signOut().finally(() => { window.location.href = 'login.html'; });
        return;
      } catch(e) {}
    }
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

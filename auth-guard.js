(function() {
  const ADMIN = 'nithish@bounceshare.com';

  let session = null;
  try { session = JSON.parse(localStorage.getItem('sb_session') || 'null'); } catch(e) {}

  if (!session || !session.email) {
    window.location.href = 'login.html';
    return;
  }

  window.authGetEmail = () => session.email || '';
  window.authIsAdmin  = () => (session.email||'').toLowerCase() === ADMIN;
  window.authPerms    = () => session.permissions || {rmc:true,fleet_km:true,parts_testing:true};
  window.authLogout   = () => { localStorage.removeItem('sb_session'); window.location.href = 'login.html'; };

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

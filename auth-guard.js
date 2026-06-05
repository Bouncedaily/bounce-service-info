(function() {
  const ADMIN = 'nithish@bounceshare.com';
  const LOGIN = 'login.html';

  let session = null;
  try { session = JSON.parse(localStorage.getItem('sb_session') || 'null'); } catch(e) {}

  if (!session || !session.email) {
    window.location.href = LOGIN;
    return;
  }

  window.authGetEmail = () => session.email || '';
  window.authGetName  = () => session.name  || session.email || '';
  window.authIsAdmin  = () => (session.email || '').toLowerCase() === ADMIN;
  window.authPerms    = () => session.permissions || { rmc:true, fleet_km:true, parts_testing:true };
  window.authLogout   = () => {
    localStorage.removeItem('sb_session');
    window.location.href = LOGIN;
  };

  document.addEventListener('DOMContentLoaded', () => {
    const p = session.permissions || { rmc:true, fleet_km:true, parts_testing:true };
    if (!p.rmc) document.querySelectorAll('a[href="dashboard.html"]').forEach(el => el.style.display='none');
    if (!p.fleet_km) document.querySelectorAll('a[href="fleet-km.html"]').forEach(el => el.style.display='none');
    if (!p.parts_testing) document.querySelectorAll('a[href="parts-testing.html"]').forEach(el => el.style.display='none');
    const adminLink = document.getElementById('admin-link');
    if (adminLink && (session.email||'').toLowerCase() === ADMIN) adminLink.style.display = 'block';
    const emailEl = document.getElementById('sb-user-email');
    if (emailEl) emailEl.textContent = session.email || '';
  });
})();

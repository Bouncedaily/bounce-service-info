(function() {
  const SB_URL = 'https://fuslpeyhpmofzijrotkb.supabase.co';
  const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1c2xwZXlocG1vZnppanJvdGtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NDg0NDgsImV4cCI6MjA5NDMyNDQ0OH0.IGtWV-bus0Tc1i3z7hWuFZEda06q8L31YyBgiOFujbs';
  const ADMIN   = 'nithish@bounceshare.com';
  const LOGIN   = 'login.html';

  let session = null;
  try { session = JSON.parse(localStorage.getItem('sb_session') || 'null'); } catch(e) {}

  if (!session?.access_token) {
    window.location.href = LOGIN;
    return;
  }

  // Expose helpers
  window.authGetEmail = () => session.email || '';
  window.authGetName  = () => session.name  || session.email || '';
  window.authIsAdmin  = () => (session.email || '').toLowerCase() === ADMIN;
  window.authPerms    = () => session.permissions || { rmc: true, fleet_km: true, parts_testing: true };
  window.authLogout   = () => {
    fetch(`${SB_URL}/auth/v1/logout`, {
      method: 'POST',
      headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${session.access_token}` }
    }).catch(() => {});
    localStorage.removeItem('sb_session');
    window.location.href = LOGIN;
  };

  // Verify token in background
  fetch(`${SB_URL}/auth/v1/user`, {
    headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${session.access_token}` }
  }).then(r => {
    if (!r.ok) {
      localStorage.removeItem('sb_session');
      window.location.href = LOGIN;
    }
  }).catch(() => {});
})();

// Apply sidebar permissions after DOM loads
document.addEventListener('DOMContentLoaded', () => {
  if (!session) return;
  const p = session.permissions || { rmc:true, fleet_km:true, parts_testing:true };
  
  // Hide sidebar items user doesn't have access to
  if (!p.rmc) {
    document.querySelectorAll('a[href="dashboard.html"]').forEach(el => el.style.display='none');
  }
  if (!p.fleet_km) {
    document.querySelectorAll('a[href="fleet-km.html"]').forEach(el => el.style.display='none');
  }
  if (!p.parts_testing) {
    document.querySelectorAll('a[href="parts-testing.html"]').forEach(el => el.style.display='none');
  }

  // Show admin link only for admin
  const adminLink = document.getElementById('admin-link');
  if (adminLink && session.email?.toLowerCase() === 'nithish@bounceshare.com') {
    adminLink.style.display = 'block';
  }

  // Show user email
  const emailEl = document.getElementById('sb-user-email');
  if (emailEl) emailEl.textContent = session.email || '';
});

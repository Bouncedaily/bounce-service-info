(function() {
  const SB_URL = 'https://fuslpeyhpmofzijrotkb.supabase.co';
  const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1c2xwZXlocG1vZnppanJvdGtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NDg0NDgsImV4cCI6MjA5NDMyNDQ0OH0.IGtWV-bus0Tc1i3z7hWuFZEda06q8L31YyBgiOFujbs';
  const ADMIN_EMAIL = 'nithish@bounceshare.com';

  const stored = localStorage.getItem('sb_session');
  if (!stored) { window.location.href = 'login.html'; return; }

  let session;
  try { session = JSON.parse(stored); } catch(e) { window.location.href = 'login.html'; return; }
  if (!session?.access_token) { window.location.href = 'login.html'; return; }

  // Verify token in background — redirect if expired
  fetch(`${SB_URL}/auth/v1/user`, {
    headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${session.access_token}` }
  }).then(r => {
    if (!r.ok) {
      localStorage.removeItem('sb_session');
      window.location.href = 'login.html';
    }
  }).catch(() => {});

  // Expose helpers
  window.authGetEmail = () => session.email || '';
  window.authGetName  = () => session.name || session.email || '';
  window.authIsAdmin  = () => session.email?.toLowerCase() === ADMIN_EMAIL;
  window.authLogout   = () => {
    fetch(`${SB_URL}/auth/v1/logout`, {
      method: 'POST',
      headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${session.access_token}` }
    }).catch(() => {});
    localStorage.removeItem('sb_session');
    window.location.href = 'login.html';
  };
})();

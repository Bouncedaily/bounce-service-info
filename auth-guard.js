// auth-guard.js — session check with 1-day expiry
(function() {
  const SB_URL = 'https://fuslpeyhpmofzijrotkb.supabase.co';
  const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1c2xwZXlocG1vZnppanJvdGtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NDg0NDgsImV4cCI6MjA5NDMyNDQ0OH0.IGtWV-bus0Tc1i3z7hWuFZEda06q8L31YyBgiOFujbs';

  function getSession() {
    try { return JSON.parse(localStorage.getItem('sb_session') || '{}'); } catch(e) { return {}; }
  }

  function clearSession() {
    localStorage.removeItem('sb_session');
  }

  function redirectLogin() {
    clearSession();
    const base = window.location.pathname.replace(/\/[^\/]*$/, '/');
    window.location.replace(base + 'login.html');
  }

  async function refreshToken(refreshTk) {
    try {
      const res = await fetch(`${SB_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { 'apikey': SB_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshTk })
      });
      if (!res.ok) return null;
      const data = await res.json();
      const session = {
        access_token:  data.access_token,
        refresh_token: data.refresh_token,
        email:         data.user?.email,
        expires_at:    Date.now() + 24 * 60 * 60 * 1000
      };
      localStorage.setItem('sb_session', JSON.stringify(session));
      return session;
    } catch(e) { return null; }
  }

  (async function() {
    const sess = getSession();

    if (!sess.access_token) { redirectLogin(); return; }

    // Expired — try refresh
    if (sess.expires_at < Date.now()) {
      if (!sess.refresh_token) { redirectLogin(); return; }
      const refreshed = await refreshToken(sess.refresh_token);
      if (!refreshed) { redirectLogin(); return; }
    }

    // Expose helpers to window
    window.authGetEmail  = () => getSession().email || '';
    window.authIsAdmin   = () => {
      const email = getSession().email || '';
      const adminEmails = ['nithish@bounceshare.com'];
      return adminEmails.includes(email);
    };
    window.authGetToken  = () => getSession().access_token || '';
    window.authLogout    = () => { clearSession(); redirectLogin(); };
  })();
})();

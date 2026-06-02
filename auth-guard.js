// auth-guard.js — include at top of every protected page
(function() {
  const SB_URL = 'https://fuslpeyhpmofzijrotkb.supabase.co';
  const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1c2xwZXlocG1vZnppanJvdGtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NDg0NDgsImV4cCI6MjA5NDMyNDQ0OH0.IGtWV-bus0Tc1i3z7hWuFZEda06q8L31YyBgiOFujbs';
  const ALLOWED = ['nithish@bounceshare.com', 'vamsee@bounceshare.com'];
  const LOGIN_URL = '/login.html';

  async function checkAuth() {
    const stored = localStorage.getItem('sb_session');
    if (!stored) { redirect(); return; }

    let session;
    try { session = JSON.parse(stored); } catch(e) { redirect(); return; }
    if (!session?.access_token) { redirect(); return; }

    // Check allowed email locally first (fast)
    if (session.email && !ALLOWED.includes(session.email.toLowerCase())) {
      localStorage.removeItem('sb_session');
      redirect();
      return;
    }

    // Verify token with Supabase
    try {
      const res = await fetch(`${SB_URL}/auth/v1/user`, {
        headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${session.access_token}` }
      });
      if (!res.ok) {
        // Try refresh
        if (session.refresh_token) {
          const refreshed = await refreshToken(session.refresh_token);
          if (refreshed) return; // success
        }
        localStorage.removeItem('sb_session');
        redirect();
      }
    } catch(e) {
      // Network error — allow through (cached session)
    }
  }

  async function refreshToken(refresh_token) {
    try {
      const res = await fetch(`${SB_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { 'apikey': SB_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token })
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.access_token) {
        const existing = JSON.parse(localStorage.getItem('sb_session') || '{}');
        localStorage.setItem('sb_session', JSON.stringify({
          ...existing,
          access_token: data.access_token,
          refresh_token: data.refresh_token || refresh_token
        }));
        return true;
      }
    } catch(e) {}
    return false;
  }

  function redirect() {
    window.location.href = LOGIN_URL + '?next=' + encodeURIComponent(window.location.pathname);
  }

  // Expose logout globally
  window.authLogout = function() {
    const session = JSON.parse(localStorage.getItem('sb_session') || '{}');
    // Invalidate session on Supabase
    if (session.access_token) {
      fetch(`${SB_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${session.access_token}` }
      }).catch(() => {});
    }
    localStorage.removeItem('sb_session');
    window.location.href = LOGIN_URL;
  };

  // Expose current user email
  window.authGetEmail = function() {
    try {
      const session = JSON.parse(localStorage.getItem('sb_session') || '{}');
      return session.email || '';
    } catch(e) { return ''; }
  };

  checkAuth();
})();

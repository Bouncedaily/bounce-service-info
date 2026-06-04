// Auth temporarily bypassed — login system ready but disabled due to rate limits
// TODO: re-enable by restoring the session check below

window.authGetEmail = () => {
  const s = JSON.parse(localStorage.getItem('sb_session') || '{}');
  return s.email || 'nithish@bounceshare.com';
};
window.authGetName  = () => 'Nithish';
window.authIsAdmin  = () => true;
window.authLogout   = () => { localStorage.removeItem('sb_session'); window.location.href = 'login.html'; };

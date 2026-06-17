// auth-guard.js — auth disabled, open access
(function() {
  window.authGetEmail = () => '';
  window.authIsAdmin  = () => true;
  window.authPerms    = () => ({
    rmc: true, fleet_km: true, parts_testing: true,
    wear_tear: true, hub_control_tower: true,
    msl_dashboard: true, hub_tv: true
  });
  window.authLogout = () => {};
})();

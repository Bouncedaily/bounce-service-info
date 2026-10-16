import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Runs on a schedule. Checks every scheduled job and every data-freshness check
// (both editable in Admin), and emails people with the "Sync alerts" role ONLY when
// something newly breaks or recovers. Calling it repeatedly never re-sends the same alert.
const PORTAL = 'https://bouncedaily.github.io/bounce-service-info/#admin';

function esc(s: string) { return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as Record<string,string>)[c]); }
function list(items: { detail: string }[], color: string) {
  return '<ul style="padding-left:18px;margin:6px 0 16px">' + items.map((i) => `<li style="margin:4px 0;color:${color}">${esc(i.detail)}</li>`).join('') + '</ul>';
}

Deno.serve(async () => {
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data, error } = await sb.rpc('_impl_sync_alert_scan');
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const newP = (data.new_problems || []) as { item: string; detail: string }[];
  const rec = (data.recovered || []) as { item: string; detail: string }[];
  const open = (data.open_problems || []) as { item: string; detail: string }[];
  const to = (data.recipients || []) as string[];
  if ((!newP.length && !rec.length) || !to.length) {
    return new Response(JSON.stringify({ sent: false, new_problems: newP.length, recovered: rec.length, open: open.length }), { status: 200 });
  }

  const subject = newP.length
    ? `⚠️ Service Info: ${newP.length} sync problem${newP.length > 1 ? 's' : ''}`
    : `✅ Service Info: ${rec.length} sync problem${rec.length > 1 ? 's' : ''} fixed`;
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:620px;font-size:14px;color:#0f172a">
    ${newP.length ? '<h3 style="margin:0 0 4px;color:#b91c1c">New problems</h3>' + list(newP, '#7f1d1d') : ''}
    ${rec.length ? '<h3 style="margin:0 0 4px;color:#15803d">Back to normal</h3>' + list(rec, '#14532d') : ''}
    ${open.length > newP.length ? `<p style="color:#64748b;font-size:12px">${open.length} problem(s) open in total.</p>` : ''}
    <p><a href="${PORTAL}" style="background:#dc2626;color:#fff;text-decoration:none;padding:9px 16px;border-radius:6px;font-weight:600">Open Admin → System Health &amp; Syncs</a></p>
    <p style="color:#94a3b8;font-size:11px">You get this because you have the "Sync alerts" role in Service Info. Change it in Admin → Roles.</p></div>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Bounce Service Info <audits@bounceshare.com>', to, subject, html }),
  });
  const out = await res.json().catch(() => ({}));
  return new Response(JSON.stringify({ sent: res.ok, to, new_problems: newP.length, recovered: rec.length, provider: out }), { status: res.ok ? 200 : 500 });
});

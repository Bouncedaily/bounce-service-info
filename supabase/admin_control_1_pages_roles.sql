-- ════════════════════════════════════════════════════════════════════
-- Admin-controlled portal: pages/sidebar (1) and roles (2)
-- ════════════════════════════════════════════════════════════════════

-- ── 1. PAGES ─────────────────────────────────────────────────────────
create table if not exists public.portal_pages (
  key          text primary key check (key ~ '^[a-z0-9_]+$'),
  label        text not null,
  description  text,
  file         text not null check (file ~ '^[A-Za-z0-9._/-]+\.html$'),
  icon         text not null default 'ti-layout-dashboard',
  icon_bg      text default '#f1f5f9',
  icon_color   text default '#334155',
  section      text not null default 'Analytics',
  sort_order   int  not null default 100,
  perm_keys    text[] not null default '{}',   -- any one of these grants access; empty = every signed-in user
  visible      boolean not null default true,  -- false = hidden from everyone (retired / not ready)
  admin_only   boolean not null default false,
  show_on_home boolean not null default true,
  updated_at   timestamptz not null default now(),
  updated_by   text
);
alter table public.portal_pages enable row level security;
drop policy if exists portal_pages_read on public.portal_pages;
create policy portal_pages_read on public.portal_pages for select to anon, authenticated using (true);
-- no write policies: changes go through admin_upsert_page / admin_delete_page

insert into public.portal_pages (key,label,description,file,icon,icon_bg,icon_color,sort_order,perm_keys,admin_only,show_on_home) values
 ('serviceoverview','Service Overview','OOS flow, inflow/outflow, technician productivity, and RMC cost vs same period last month','service-overview.html','ti-layout-dashboard','#fef2f2','#f53b3b',10,'{service_overview}',false,true),
 ('fleet','Fleet KM Analysis','Bike performance & service cost breakdown by odometer cohort','fleet-km.html','ti-motorbike','#f0fdf4','#16a34a',20,'{fleet_km}',false,true),
 ('parts','Parts Testing','Test vs OEM part performance tracker — beading, suspension, tyres','parts-testing.html','ti-test-pipe','#faf5ff','#7c3aed',30,'{parts_testing}',false,true),
 ('tyre','Wear & Tear','Detailed wear & tear analysis across parts, hubs, and models','tyre-analysis.html','ti-chart-dots','#fff7ed','#d97706',40,'{wear_tear}',false,true),
 ('msl','Parts Dashboard','Minimum Stock Level tracker — parts shortages across all hubs','msl-dashboard.html','ti-package','#fef2f2','#dc2626',50,'{msl_dashboard}',false,true),
 ('savings','Cost Savings','Refurbishment, shared manpower, scrap sale & supplier chargeback savings','cost-savings.html','ti-pig-money','#ecfdf5','#059669',60,'{cost_savings}',false,true),
 ('scrap','Bounce Back','Auto-generated scrap tracking, refurb funnel, vendor sales & movement logging by hub','scrap.html','ti-recycle','#fef2f2','#dc2626',70,'{scrap}',false,true),
 ('oos','OOS Dashboard','Fleet OOS status — aging buckets, repair categories, inflow & outflow','oos-dashboard.html','ti-alert-triangle','#fef2f2','#dc2626',80,'{oos}',false,true),
 ('hubaudit','Hub Audit Dashboard','Network performance, CAPAs & flagged submissions','hub-audit-dashboard.html','ti-clipboard-check','#f0f9ff','#0369a1',90,'{hub_audit}',false,true),
 ('hubleaderboard','Hub Leaderboard','Every hub ranked best to worst on availability, speed, parts & quality','hub-leaderboard.html','ti-trophy','#fef3c7','#b45309',100,'{hub_leaderboard}',false,true),
 ('toolstracker','Tools Tracker','Which hubs have the tools they need, tool audits & what to send','tools-tracker.html','ti-tools','#e0f2fe','#0369a1',110,'{tools_tracker,tools_audit}',false,true),
 ('brakecampaign','Brake Campaign','Brake-overdue bikes, WhatsApp blast files & visit tracking','brake-campaign.html','ti-brand-whatsapp','#fee2e2','#b91c1c',120,'{brake_campaign}',false,true),
 ('rmcdash','RMC Dashboard','Service cost from the DMS billing export: A / P / C split, net service cost, per bike & per km','rmc-dashboard.html','ti-report-money','#eef2ff','#1F3864',130,'{rmc_cost}',false,true),
 ('standup','Standup','Daily service ops — OOS, inflow/outflow & productivity by hub','standup.html','ti-presentation','#f1f5f9','#334155',140,'{standup}',false,true),
 ('tech','Technician Productivity','Jobs, labour hours & output per technician and hub','tech-productivity.html','ti-tools','#fff7ed','#d97706',150,'{tech}',false,true),
 ('jcreview','HO Approval','Job cards waiting for HO approval — parts, cost, warranty & ageing','ho-approval-queue.html','ti-clipboard-search','#eff6ff','#2563eb',160,'{jcreview}',false,true),
 ('feedback','Customer Feedback','Rider ratings by city & hub, with raw feedback and comments','customer-feedback.html','ti-star','#fef9c3','#ca8a04',170,'{feedback}',false,true),
 ('leakage','Damage Leakage','Physical-damage charge & collection leakage by city, hub & executive','leakage.html','ti-cash-off','#fef2f2','#dc2626',180,'{leakage}',false,true),
 ('admin','Admin','Manage users, pages, roles and scheduled syncs','admin.html','ti-shield','#fef2f2','#dc2626',1000,'{}',true,true)
on conflict (key) do nothing;
update public.portal_pages set section='Admin' where key='admin';

create or replace function public.admin_upsert_page(p jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare k text := lower(trim(p->>'key'));
begin
  if not public.is_calling_user_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  if k is null or k !~ '^[a-z0-9_]+$' then raise exception 'Page key must be lowercase letters, numbers or _'; end if;
  if coalesce(p->>'label','')='' then raise exception 'Label is required'; end if;
  if coalesce(p->>'file','') !~ '^[A-Za-z0-9._/-]+\.html$' then raise exception 'File must be an .html file name, e.g. my-page.html'; end if;
  if k='admin' and (coalesce((p->>'visible')::boolean,true)=false or coalesce((p->>'admin_only')::boolean,true)=false) then
    raise exception 'The Admin page must stay visible and admin-only'; end if;
  insert into portal_pages as t (key,label,description,file,icon,icon_bg,icon_color,section,sort_order,perm_keys,visible,admin_only,show_on_home,updated_at,updated_by)
  values (k, p->>'label', nullif(p->>'description',''), p->>'file',
          coalesce(nullif(p->>'icon',''),'ti-layout-dashboard'), coalesce(nullif(p->>'icon_bg',''),'#f1f5f9'), coalesce(nullif(p->>'icon_color',''),'#334155'),
          coalesce(nullif(p->>'section',''),'Analytics'), coalesce((p->>'sort_order')::int,100),
          coalesce(array(select lower(trim(x)) from jsonb_array_elements_text(coalesce(p->'perm_keys','[]'::jsonb)) x where trim(x)<>''),'{}'),
          coalesce((p->>'visible')::boolean,true), coalesce((p->>'admin_only')::boolean,false), coalesce((p->>'show_on_home')::boolean,true),
          now(), auth.email())
  on conflict (key) do update set label=excluded.label, description=excluded.description, file=excluded.file, icon=excluded.icon,
    icon_bg=excluded.icon_bg, icon_color=excluded.icon_color, section=excluded.section, sort_order=excluded.sort_order,
    perm_keys=excluded.perm_keys, visible=excluded.visible, admin_only=excluded.admin_only, show_on_home=excluded.show_on_home,
    updated_at=now(), updated_by=auth.email();
  insert into permission_audit_log(actor_email,target_email,action,details) values (coalesce(auth.email(),'?'), 'page:'||k, 'upsert_page', p);
  return (select to_jsonb(t) from portal_pages t where key=k);
end $$;

create or replace function public.admin_delete_page(p_key text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_calling_user_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  if p_key='admin' then raise exception 'The Admin page cannot be deleted'; end if;
  delete from portal_pages where key=p_key;
  insert into permission_audit_log(actor_email,target_email,action,details) values (coalesce(auth.email(),'?'), 'page:'||p_key, 'delete_page', null);
end $$;

-- ── 2. ROLES ─────────────────────────────────────────────────────────
create table if not exists public.portal_roles (
  key         text primary key check (key ~ '^[a-z0-9_]+$'),
  label       text not null,
  description text,
  built_in    boolean not null default false   -- used by code; can't be deleted
);
create table if not exists public.user_roles (
  email      text not null,
  role_key   text not null references public.portal_roles(key) on delete cascade,
  granted_by text,
  granted_at timestamptz not null default now(),
  primary key (email, role_key)
);
alter table public.portal_roles enable row level security;
alter table public.user_roles  enable row level security;
drop policy if exists portal_roles_read on public.portal_roles;
create policy portal_roles_read on public.portal_roles for select to authenticated using (true);
drop policy if exists user_roles_read on public.user_roles;
create policy user_roles_read on public.user_roles for select to authenticated
  using (lower(email) = lower(coalesce(auth.email(),'')) or public.is_calling_user_admin());

insert into public.portal_roles (key,label,description,built_in) values
 ('msl_sync','MSL: Sync now','Can press "Sync now" on the Parts (MSL) dashboard',true),
 ('msl_new_view','MSL: new view','Sees the redesigned Parts (MSL) dashboard instead of the old one',true),
 ('scrap_power_user','Bounce Back: power user','Can edit scrap vendors, vendor rates, sales and hub scrap triggers',true),
 ('scrap_weight_admin','Bounce Back: weights admin','Can edit scrap part weights and refurb part categories',true),
 ('scrap_approver','Bounce Back: approver','Approves scrap sales',true),
 ('scrap_mark_paid','Bounce Back: mark Paid','Can mark scrap batches as Paid',true),
 ('ho_decider','HO Approval: decide','Can record HO approval decisions',true),
 ('sync_alerts','Sync alerts','Gets an email when a scheduled sync fails or its data goes stale',true)
on conflict (key) do nothing;

insert into public.user_roles (email, role_key, granted_by) values
 ('nithish@bounceshare.com','msl_sync','migration'),
 ('senthilkumar.t@bounceshare.com','msl_sync','migration'),
 ('nithish@bounceshare.com','msl_new_view','migration'),
 ('senthilkumar.t@bounceshare.com','msl_new_view','migration'),
 ('nithish@bounceshare.com','scrap_power_user','migration'),
 ('chandra.shekar@bounceshare.com','scrap_power_user','migration'),
 ('nithish@bounceshare.com','scrap_weight_admin','migration'),
 ('nithish@bounceshare.com','scrap_approver','migration'),
 ('nithish@bounceshare.com','scrap_mark_paid','migration'),
 ('nithish@bounceshare.com','ho_decider','migration'),
 ('nithish@bounceshare.com','sync_alerts','migration')
on conflict do nothing;

create or replace function public.has_role(p_role text)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from user_roles r
    join allowed_users au on lower(au.email) = lower(r.email) and au.is_active = true
    where lower(r.email) = lower(coalesce(auth.email(),'')) and r.role_key = p_role);
$$;

create or replace function public.my_roles()
returns text[] language sql stable security definer set search_path=public as $$
  select coalesce(array_agg(r.role_key order by r.role_key), '{}')
  from user_roles r join allowed_users au on lower(au.email)=lower(r.email) and au.is_active
  where lower(r.email) = lower(coalesce(auth.email(),''));
$$;

-- Same function names and signatures as before, so every policy and RPC that uses them keeps working.
create or replace function public.is_nithish() returns boolean language sql stable security definer set search_path=public
  as $$ select public.has_role('ho_decider') $$;
create or replace function public.scrap_can_mark_paid() returns boolean language sql stable security definer set search_path=public
  as $$ select public.has_role('scrap_mark_paid') $$;
create or replace function public.scrap_is_approver() returns boolean language sql stable security definer set search_path=public
  as $$ select public.has_role('scrap_approver') $$;
create or replace function public.scrap_is_power_user() returns boolean language sql stable security definer set search_path=public
  as $$ select public.has_role('scrap_power_user') $$;
create or replace function public.scrap_is_weight_admin() returns boolean language sql stable security definer set search_path=public
  as $$ select public.has_role('scrap_weight_admin') $$;
create or replace function public._msl_sync_caller() returns text language plpgsql stable security definer set search_path=public as $$
begin
  if coalesce(auth.role(),'')='anon' or auth.uid() is null then return null; end if;
  if public.has_role('msl_sync') then return lower(auth.email()); end if;
  return null;
end $$;

create or replace function public.admin_set_user_role(p_email text, p_role text, p_grant boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_calling_user_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  if p_grant then
    if not exists (select 1 from allowed_users where lower(email)=lower(p_email)) then raise exception 'Not an allowed user: %', p_email; end if;
    insert into user_roles(email,role_key,granted_by) values (lower(trim(p_email)), p_role, auth.email()) on conflict do nothing;
  else
    delete from user_roles where lower(email)=lower(p_email) and role_key=p_role;
  end if;
  insert into permission_audit_log(actor_email,target_email,action,details)
  values (coalesce(auth.email(),'?'), lower(p_email), case when p_grant then 'grant_role' else 'revoke_role' end, jsonb_build_object('role',p_role));
end $$;

create or replace function public.admin_upsert_role(p_key text, p_label text, p_description text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_calling_user_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  if p_key !~ '^[a-z0-9_]+$' then raise exception 'Role key must be lowercase letters, numbers or _'; end if;
  insert into portal_roles(key,label,description) values (p_key,p_label,nullif(p_description,''))
  on conflict (key) do update set label=excluded.label, description=excluded.description;
end $$;

create or replace function public.admin_delete_role(p_key text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_calling_user_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  if exists (select 1 from portal_roles where key=p_key and built_in) then raise exception 'Built-in roles are used by the dashboards and cannot be deleted'; end if;
  delete from portal_roles where key=p_key;
end $$;

revoke all on function public.admin_upsert_page(jsonb), public.admin_delete_page(text), public.admin_set_user_role(text,text,boolean),
  public.admin_upsert_role(text,text,text), public.admin_delete_role(text) from public, anon;
grant execute on function public.admin_upsert_page(jsonb), public.admin_delete_page(text), public.admin_set_user_role(text,text,boolean),
  public.admin_upsert_role(text,text,text), public.admin_delete_role(text), public.has_role(text), public.my_roles() to authenticated;

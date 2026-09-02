-- Starlight Growth Core
-- Canonical portfolio-wide contact, program membership, and capture-event ledger.

create schema if not exists growth;

revoke all on schema growth from public, anon, authenticated;
grant usage on schema growth to service_role;

create table if not exists growth.programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  brand text not null,
  name text not null,
  kind text not null check (kind in ('newsletter', 'waitlist', 'lead_magnet', 'application', 'event', 'interest')),
  default_membership_status text not null check (default_membership_status in ('subscribed', 'waitlisted', 'applied')),
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (slug = lower(btrim(slug)) and slug ~ '^[a-z0-9][a-z0-9-]{1,79}$'),
  check (char_length(brand) between 1 and 80),
  check (char_length(name) between 1 and 160)
);

create table if not exists growth.contacts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  first_source text,
  last_source text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email = lower(btrim(email))),
  check (char_length(email) between 3 and 254),
  check (name is null or char_length(name) <= 120),
  check (first_source is null or char_length(first_source) <= 120),
  check (last_source is null or char_length(last_source) <= 120)
);

create table if not exists growth.memberships (
  contact_id uuid not null references growth.contacts(id) on delete cascade,
  program_id uuid not null references growth.programs(id) on delete restrict,
  status text not null check (status in ('subscribed', 'waitlisted', 'applied', 'unsubscribed', 'bounced', 'suppressed')),
  source text,
  intention text,
  referrer text,
  page_path text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  consent_basis text not null default 'form_submission',
  consent_version text not null default 'v1',
  consented_at timestamptz not null default now(),
  first_joined_at timestamptz not null default now(),
  last_joined_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (contact_id, program_id),
  check (source is null or char_length(source) <= 120),
  check (intention is null or char_length(intention) <= 500),
  check (referrer is null or char_length(referrer) <= 2048),
  check (page_path is null or char_length(page_path) <= 2048),
  check (utm_source is null or char_length(utm_source) <= 120),
  check (utm_medium is null or char_length(utm_medium) <= 120),
  check (utm_campaign is null or char_length(utm_campaign) <= 120),
  check (utm_content is null or char_length(utm_content) <= 120),
  check (utm_term is null or char_length(utm_term) <= 120),
  check (char_length(consent_basis) between 1 and 80),
  check (char_length(consent_version) between 1 and 80),
  check (pg_column_size(metadata) <= 16384)
);

create table if not exists growth.capture_events (
  id bigint generated always as identity primary key,
  request_id uuid not null unique,
  contact_id uuid not null references growth.contacts(id) on delete cascade,
  program_id uuid not null references growth.programs(id) on delete restrict,
  event_type text not null check (event_type in ('joined', 'reconfirmed', 'resubscribed')),
  source text,
  origin text,
  email_hash text not null,
  ip_hash text,
  user_agent_hash text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz not null default now(),
  check (source is null or char_length(source) <= 120),
  check (origin is null or char_length(origin) <= 255),
  check (email_hash ~ '^[0-9a-f]{64}$'),
  check (ip_hash is null or ip_hash ~ '^[0-9a-f]{64}$'),
  check (user_agent_hash is null or user_agent_hash ~ '^[0-9a-f]{64}$'),
  check (pg_column_size(metadata) <= 16384)
);

create index if not exists growth_memberships_program_status_idx
  on growth.memberships (program_id, status, last_joined_at desc);
create index if not exists growth_contacts_last_seen_idx
  on growth.contacts (last_seen_at desc);
create index if not exists growth_capture_events_program_time_idx
  on growth.capture_events (program_id, occurred_at desc);
create index if not exists growth_capture_events_email_time_idx
  on growth.capture_events (email_hash, program_id, occurred_at desc);
create index if not exists growth_capture_events_ip_time_idx
  on growth.capture_events (ip_hash, occurred_at desc)
  where ip_hash is not null;

alter table growth.programs enable row level security;
alter table growth.contacts enable row level security;
alter table growth.memberships enable row level security;
alter table growth.capture_events enable row level security;

revoke all on all tables in schema growth from public, anon, authenticated;
revoke all on all sequences in schema growth from public, anon, authenticated;
grant select, insert, update, delete on all tables in schema growth to service_role;
grant usage, select on all sequences in schema growth to service_role;

alter default privileges for role postgres in schema growth
  revoke all on tables from public, anon, authenticated;
alter default privileges for role postgres in schema growth
  revoke all on sequences from public, anon, authenticated;
alter default privileges for role postgres in schema growth
  revoke all on functions from public, anon, authenticated;
alter default privileges for role postgres in schema growth
  grant select, insert, update, delete on tables to service_role;
alter default privileges for role postgres in schema growth
  grant usage, select on sequences to service_role;
alter default privileges for role postgres in schema growth
  grant execute on functions to service_role;

insert into growth.programs (slug, brand, name, kind, default_membership_status)
values
  ('frankx-newsletter', 'FrankX', 'FrankX Newsletter', 'newsletter', 'subscribed'),
  ('frankx-creation-chronicles', 'FrankX', 'Creation Chronicles', 'newsletter', 'subscribed'),
  ('frankx-ai-architect', 'FrankX', 'AI Architect', 'newsletter', 'subscribed'),
  ('frankx-founder-stack', 'FrankX', 'Founder Stack', 'lead_magnet', 'subscribed'),
  ('frankx-operator-scorecard', 'FrankX', 'Operator Scorecard', 'lead_magnet', 'subscribed'),
  ('frankx-inner-circle', 'FrankX', 'Inner Circle', 'waitlist', 'waitlisted'),
  ('frankx-music-lab', 'FrankX', 'Music Lab', 'lead_magnet', 'subscribed'),
  ('frankx-arcanea', 'FrankX', 'Arcanea Updates', 'newsletter', 'subscribed'),
  ('frankx-investor', 'FrankX', 'Investor Updates', 'newsletter', 'subscribed'),
  ('frankx-courses-waitlist', 'FrankX', 'Courses Waitlist', 'waitlist', 'waitlisted'),
  ('frankx-ikigai-branding', 'FrankX', 'Ikigai Branding', 'lead_magnet', 'subscribed'),
  ('frankx-premium-packs', 'FrankX', 'Premium Agent Packs', 'waitlist', 'waitlisted'),
  ('frankx-mvu-tallinn-2026', 'FrankX', 'MVU Tallinn 2026', 'event', 'waitlisted'),
  ('frankx-mvu-porto-2027', 'FrankX', 'MVU Porto 2027', 'event', 'waitlisted'),
  ('frankx-all', 'FrankX', 'All FrankX Topics', 'newsletter', 'subscribed'),
  ('arcanea-newsletter', 'Arcanea', 'Arcanea Newsletter', 'newsletter', 'subscribed'),
  ('arcanea-founding-circle', 'Arcanea', 'Arcanea Founding Circle', 'waitlist', 'waitlisted'),
  ('gencreator-starter-kit', 'GenCreator', 'Creator Starter Kit', 'lead_magnet', 'subscribed'),
  ('gencreator-creator-scan', 'GenCreator', 'Creator Intelligence Scan', 'lead_magnet', 'subscribed'),
  ('gencreator-install-waitlist', 'GenCreator', 'Install Waitlist', 'waitlist', 'waitlisted'),
  ('gencreator-cohort-intake', 'GenCreator', 'Cohort Intake', 'application', 'applied'),
  ('gencreator-research-replication', 'GenCreator', 'Research Replication', 'application', 'applied'),
  ('gencreator-general-interest', 'GenCreator', 'General Interest', 'interest', 'waitlisted')
on conflict (slug) do update
set brand = excluded.brand,
    name = excluded.name,
    kind = excluded.kind,
    default_membership_status = excluded.default_membership_status,
    updated_at = now();

create or replace function public.capture_growth_lead(
  p_email text,
  p_program_slug text,
  p_request_id uuid,
  p_name text default null,
  p_source text default null,
  p_intention text default null,
  p_referrer text default null,
  p_page_path text default null,
  p_utm_source text default null,
  p_utm_medium text default null,
  p_utm_campaign text default null,
  p_utm_content text default null,
  p_utm_term text default null,
  p_origin text default null,
  p_ip_hash text default null,
  p_user_agent_hash text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_consent_version text default 'v1'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_program_slug text := lower(btrim(coalesce(p_program_slug, '')));
  v_program_id uuid;
  v_membership_status text;
  v_contact_id uuid;
  v_previous_status text;
  v_email_hash text;
  v_is_new_contact boolean;
  v_is_new_membership boolean;
  v_event_type text;
  v_metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
begin
  if exists (select 1 from growth.capture_events where request_id = p_request_id) then
    return jsonb_build_object('accepted', true, 'duplicate_request', true);
  end if;

  if char_length(v_email) < 3
     or char_length(v_email) > 254
     or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    return jsonb_build_object('accepted', false, 'reason', 'invalid_email');
  end if;

  select id, default_membership_status
  into v_program_id, v_membership_status
  from growth.programs
  where slug = v_program_slug and status = 'active';

  if not found then
    return jsonb_build_object('accepted', false, 'reason', 'invalid_program');
  end if;

  if jsonb_typeof(v_metadata) <> 'object' or pg_column_size(v_metadata) > 16384 then
    v_metadata := '{}'::jsonb;
  end if;

  v_email_hash := encode(extensions.digest(v_email, 'sha256'), 'hex');

  if p_ip_hash is not null and (
    select count(*)
    from growth.capture_events
    where ip_hash = p_ip_hash
      and occurred_at >= now() - interval '10 minutes'
  ) >= 120 then
    return jsonb_build_object('accepted', false, 'reason', 'rate_limited', 'retry_after', 600);
  end if;

  if (
    select count(*)
    from growth.capture_events
    where email_hash = v_email_hash
      and program_id = v_program_id
      and occurred_at >= now() - interval '1 hour'
  ) >= 10 then
    return jsonb_build_object('accepted', false, 'reason', 'rate_limited', 'retry_after', 3600);
  end if;

  select id into v_contact_id
  from growth.contacts
  where email = v_email;
  v_is_new_contact := not found;

  insert into growth.contacts as c (
    email, name, first_source, last_source, first_seen_at, last_seen_at, created_at, updated_at
  ) values (
    v_email,
    left(nullif(btrim(p_name), ''), 120),
    left(nullif(btrim(p_source), ''), 120),
    left(nullif(btrim(p_source), ''), 120),
    now(), now(), now(), now()
  )
  on conflict (email) do update
  set name = coalesce(excluded.name, c.name),
      last_source = coalesce(excluded.last_source, c.last_source),
      last_seen_at = now(),
      updated_at = now()
  returning id into v_contact_id;

  select status into v_previous_status
  from growth.memberships
  where contact_id = v_contact_id and program_id = v_program_id;
  v_is_new_membership := not found;

  insert into growth.memberships as m (
    contact_id,
    program_id,
    status,
    source,
    intention,
    referrer,
    page_path,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    consent_basis,
    consent_version,
    consented_at,
    first_joined_at,
    last_joined_at,
    metadata,
    created_at,
    updated_at
  ) values (
    v_contact_id,
    v_program_id,
    v_membership_status,
    left(nullif(btrim(p_source), ''), 120),
    left(nullif(btrim(p_intention), ''), 500),
    left(nullif(btrim(p_referrer), ''), 2048),
    left(nullif(btrim(p_page_path), ''), 2048),
    left(nullif(btrim(p_utm_source), ''), 120),
    left(nullif(btrim(p_utm_medium), ''), 120),
    left(nullif(btrim(p_utm_campaign), ''), 120),
    left(nullif(btrim(p_utm_content), ''), 120),
    left(nullif(btrim(p_utm_term), ''), 120),
    'form_submission',
    left(coalesce(nullif(btrim(p_consent_version), ''), 'v1'), 80),
    now(), now(), now(), v_metadata, now(), now()
  )
  on conflict (contact_id, program_id) do update
  set status = excluded.status,
      source = coalesce(excluded.source, m.source),
      intention = coalesce(excluded.intention, m.intention),
      referrer = coalesce(excluded.referrer, m.referrer),
      page_path = coalesce(excluded.page_path, m.page_path),
      utm_source = coalesce(excluded.utm_source, m.utm_source),
      utm_medium = coalesce(excluded.utm_medium, m.utm_medium),
      utm_campaign = coalesce(excluded.utm_campaign, m.utm_campaign),
      utm_content = coalesce(excluded.utm_content, m.utm_content),
      utm_term = coalesce(excluded.utm_term, m.utm_term),
      consent_basis = excluded.consent_basis,
      consent_version = excluded.consent_version,
      consented_at = now(),
      last_joined_at = now(),
      metadata = m.metadata || excluded.metadata,
      updated_at = now();

  v_event_type := case
    when v_is_new_membership then 'joined'
    when v_previous_status = 'unsubscribed' then 'resubscribed'
    else 'reconfirmed'
  end;

  insert into growth.capture_events (
    request_id,
    contact_id,
    program_id,
    event_type,
    source,
    origin,
    email_hash,
    ip_hash,
    user_agent_hash,
    metadata,
    occurred_at
  ) values (
    p_request_id,
    v_contact_id,
    v_program_id,
    v_event_type,
    left(nullif(btrim(p_source), ''), 120),
    left(nullif(btrim(p_origin), ''), 255),
    v_email_hash,
    case when p_ip_hash ~ '^[0-9a-f]{64}$' then p_ip_hash else null end,
    case when p_user_agent_hash ~ '^[0-9a-f]{64}$' then p_user_agent_hash else null end,
    v_metadata,
    now()
  )
  on conflict (request_id) do nothing;

  return jsonb_build_object(
    'accepted', true,
    'new_contact', v_is_new_contact,
    'new_membership', v_is_new_membership,
    'membership_status', v_membership_status
  );
end;
$$;

revoke all on function public.capture_growth_lead(
  text, text, uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb, text
) from public, anon, authenticated;
grant execute on function public.capture_growth_lead(
  text, text, uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb, text
) to service_role;

comment on schema growth is 'Private Starlight Growth Core data plane; accessed only through server-mediated RPCs.';
comment on table growth.contacts is 'Canonical portfolio contact identity keyed by normalized email.';
comment on table growth.memberships is 'A contact may join multiple brand programs without overwriting prior attribution.';
comment on table growth.capture_events is 'Append-only, idempotent form-capture evidence; raw IP and user-agent values are never stored.';
comment on function public.capture_growth_lead is 'Validated, rate-limited, idempotent Growth Core capture entrypoint for service_role callers.';

-- Explicit deny policies make the intended server-only access model visible to
-- Supabase's linter. service_role bypasses RLS and is the only granted caller.

create index if not exists growth_capture_events_contact_idx
  on growth.capture_events (contact_id);

create policy "deny client access to growth programs"
  on growth.programs
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "deny client access to growth contacts"
  on growth.contacts
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "deny client access to growth memberships"
  on growth.memberships
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "deny client access to growth capture events"
  on growth.capture_events
  for all
  to anon, authenticated
  using (false)
  with check (false);

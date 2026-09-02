# Starlight Growth Core

One portfolio-wide capture plane for FrankX, Arcanea, and GenCreator. Product sites keep their own forms and lifecycle email; this service owns canonical contact identity, program membership, attribution, consent evidence, and capture history.

## Runtime

- Postgres project: `Starlight Platform` (`eu-central-1`)
- Function: `growth-capture`
- Tables: private `growth` schema; RLS enabled; no anonymous or authenticated grants
- Public surface: one origin/program-allowlisted Edge Function
- Storage behavior: fail closed. A site must not show success if the canonical write fails.
- Privacy: raw IP addresses and user-agent strings are never stored. The function writes keyed SHA-256 hashes for abuse control.

## Programs

The migration seeds independently queryable memberships for every current FrankX list type plus:

- `arcanea-newsletter`
- `arcanea-founding-circle`
- `gencreator-starter-kit`
- `gencreator-creator-scan`
- `gencreator-install-waitlist`
- `gencreator-cohort-intake`
- `gencreator-research-replication`
- `gencreator-general-interest`

A contact is unique portfolio-wide by normalized email. Memberships are unique by contact and program, so joining one waitlist never overwrites another source or intent.

## Capture contract

`POST /functions/v1/growth-capture`

```json
{
  "email": "founder@example.com",
  "name": "Founder",
  "program": "arcanea-founding-circle",
  "source": "pricing_founding_circle",
  "page_path": "/pricing",
  "utm_source": "newsletter",
  "metadata": {}
}
```

The endpoint also accepts `intention`, `referrer`, all five common UTM fields, `request_id`, `consent_version`, and honeypot fields named `website` or `company`.

## Release order

1. Apply the migration.
2. Deploy `growth-capture` with JWT verification disabled; custom origin/program validation is implemented in the handler because anonymous waitlist forms do not have user JWTs.
3. Verify GET health, rejection paths, a synthetic capture, database evidence, and cleanup.
4. Wire site routes and forms through preview deployments.
5. Promote only after CI and end-to-end capture receipts pass.

Rollback is additive: point site routes back to the prior provider, then delete the isolated function/schema only after exporting any real capture data.

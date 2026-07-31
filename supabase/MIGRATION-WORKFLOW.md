# Supabase migration workflow

The production migration ledger is `production-migrations.json`. The current
database and the archive were compared on 2026-07-31.

Some early RC12 and verification migrations exist only in Supabase's remote
history. They are deliberately marked `historical_remote_only` instead of
being recreated with approximate SQL. The current database baseline is the
authoritative starting state for those entries.

For every new database change:

```text
supabase migration new <descriptive_name>
```

Place only the reviewed DDL in that generated file. Apply and test it on a
development branch before production. Never put `service_role` or secret keys
in the storefront, and never expose a `SECURITY DEFINER` function to `PUBLIC`
by default.

Before release, verify:

- every table in an exposed schema has RLS enabled;
- authenticated policies include an ownership or admin predicate;
- update policies include both `USING` and `WITH CHECK`;
- service-only tables have no anonymous policy;
- privileged functions have explicit execute grants;
- public webhooks or Edge Functions authenticate requests or implement an
  intentional narrow public protocol with validation and rate limiting.

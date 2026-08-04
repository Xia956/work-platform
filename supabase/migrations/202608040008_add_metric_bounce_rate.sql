alter table public.metric_snapshots
  add column if not exists bounce_rate numeric(6,3)
  check (bounce_rate between 0 and 100);

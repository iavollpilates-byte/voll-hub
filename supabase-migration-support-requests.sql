-- Support requests: user reports and suggestions (admin reads in CMS)
create table if not exists support_requests (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('error', 'suggestion')),
  message text not null,
  user_name text default '',
  user_whatsapp text default '',
  created_at timestamptz default now()
);

-- Optional: RLS so only service_role can insert/select (default is no RLS = full access for service_role)
-- alter table support_requests enable row level security;
-- create policy "Service role only" on support_requests for all using (false);

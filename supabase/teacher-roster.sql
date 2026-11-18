-- Imported teacher records are separate from login approvals.
create table public.nt_teacher_roster (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.nt_schools(id),
  full_name text not null check (length(trim(full_name)) between 1 and 120),
  email text not null check (length(email) <= 254 and email = lower(trim(email)) and position('@' in email) > 1),
  unique (school_id, email)
);

alter table public.nt_teacher_roster enable row level security;
revoke all on public.nt_teacher_roster from public, anon, authenticated;
grant select, insert on public.nt_teacher_roster to authenticated;

create policy teacher_roster_read on public.nt_teacher_roster for select to authenticated
  using (nilatext_private.is_admin(school_id));
create policy teacher_roster_add on public.nt_teacher_roster for insert to authenticated
  with check (nilatext_private.is_admin(school_id));

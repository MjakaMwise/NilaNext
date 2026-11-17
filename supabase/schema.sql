-- Nilatext: tenant-isolated school management. Apply once to a fresh project.
create schema if not exists nilatext_private;
revoke all on schema nilatext_private from public, anon;
grant usage on schema nilatext_private to authenticated;

create table public.nt_schools (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 2 and 120),
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table public.nt_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 school_id uuid not null references public.nt_schools(id),
 role text not null check(role in ('admin','teacher','parent','student')),
 display_name text not null check(length(trim(display_name)) between 1 and 100), email text not null,
 unique(school_id,user_id), unique(school_id,email)
);
create table public.nt_classes (
 id uuid primary key default gen_random_uuid(), school_id uuid not null references public.nt_schools(id),
 name text not null check(length(trim(name)) between 1 and 60), teacher_id uuid,
 unique(school_id,id),unique(school_id,name),
 foreign key(school_id,teacher_id) references public.nt_profiles(school_id,user_id)
);
create table public.nt_terms (
 id uuid primary key default gen_random_uuid(),school_id uuid not null references public.nt_schools(id),
 year integer not null check(year between 2020 and 2100),number integer not null check(number between 1 and 3),
 unique(school_id,id),unique(school_id,year,number)
);
create table public.nt_students (
 id uuid primary key default gen_random_uuid(),school_id uuid not null references public.nt_schools(id),
 class_id uuid not null,admission_no text not null check(length(trim(admission_no)) between 1 and 30),
 full_name text not null check(length(trim(full_name)) between 1 and 120),guardian_name text not null default '',guardian_phone text not null default '',
 active boolean not null default true,created_at timestamptz not null default now(),
 unique(school_id,id),unique(school_id,admission_no),foreign key(school_id,class_id) references public.nt_classes(school_id,id)
);
create table public.nt_student_links (
 school_id uuid not null, user_id uuid not null,student_id uuid not null,
 primary key(user_id,student_id),foreign key(school_id,user_id) references public.nt_profiles(school_id,user_id) on delete cascade,
 foreign key(school_id,student_id) references public.nt_students(school_id,id)
);
create table public.nt_invites (
 id uuid primary key default gen_random_uuid(),school_id uuid not null references public.nt_schools(id),
 email text not null check(email = lower(trim(email)) and position('@' in email)>1),
 role text not null check(role in ('teacher','parent','student')),student_id uuid,
 created_at timestamptz not null default now(),accepted_at timestamptz,
 unique(school_id,email),foreign key(school_id,student_id) references public.nt_students(school_id,id),
 check((role in ('parent','student') and student_id is not null) or (role='teacher' and student_id is null))
);
create table public.nt_marks (
 school_id uuid not null, student_id uuid not null,term_id uuid not null,
 subject text not null check(subject in ('Mathematics','English','Integrated Science','Kiswahili','Humanities')),
 score numeric(5,2) not null check(score between 0 and 100),updated_at timestamptz not null default now(),
 primary key(student_id,term_id,subject),foreign key(school_id,student_id) references public.nt_students(school_id,id),
 foreign key(school_id,term_id) references public.nt_terms(school_id,id)
);
create table public.nt_attendance (
 school_id uuid not null,student_id uuid not null,day date not null,status text not null check(status in ('Present','Absent','Late')),
 primary key(student_id,day),foreign key(school_id,student_id) references public.nt_students(school_id,id)
);
create table public.nt_invoices (
 id uuid primary key default gen_random_uuid(),school_id uuid not null,student_id uuid not null,term_id uuid not null,
 amount numeric(12,2) not null check(amount>0),description text not null default 'Term tuition',created_at timestamptz not null default now(),
 unique(school_id,id),unique(student_id,term_id),foreign key(school_id,student_id) references public.nt_students(school_id,id),
 foreign key(school_id,term_id) references public.nt_terms(school_id,id)
);
create table public.nt_payments (
 id uuid primary key default gen_random_uuid(),school_id uuid not null,invoice_id uuid not null,
 amount numeric(12,2) not null check(amount>0),reference text not null check(length(trim(reference)) between 1 and 100),
 request_id uuid not null unique,received_at timestamptz not null default now(),received_by uuid not null default auth.uid() references auth.users(id),
 foreign key(school_id,invoice_id) references public.nt_invoices(school_id,id),unique(school_id,reference)
);
create table public.nt_notes (
 id uuid primary key default gen_random_uuid(),school_id uuid not null references public.nt_schools(id),
 body text not null check(length(trim(body)) between 1 and 500),author_id uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now()
);

-- Internal authorization helpers avoid recursive policies. They accept no user ID,
-- always derive the caller from auth.uid(), and expose no records.
create function nilatext_private.is_member(sid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.nt_profiles where user_id=auth.uid() and school_id=sid)
$$;
create function nilatext_private.is_admin(sid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.nt_profiles where user_id=auth.uid() and school_id=sid and role='admin')
$$;
create function nilatext_private.is_staff(sid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.nt_profiles where user_id=auth.uid() and school_id=sid and role in ('admin','teacher'))
$$;
create function nilatext_private.can_teach(cid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.nt_classes c join public.nt_profiles p on p.school_id=c.school_id
 where c.id=cid and p.user_id=auth.uid() and (p.role='admin' or (p.role='teacher' and c.teacher_id=auth.uid())))
$$;
create function nilatext_private.can_read_student(stid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.nt_students s join public.nt_classes c on c.id=s.class_id
 join public.nt_profiles p on p.school_id=s.school_id where s.id=stid and p.user_id=auth.uid()
 and (p.role='admin' or (p.role='teacher' and c.teacher_id=auth.uid()) or exists(select 1 from public.nt_student_links l where l.student_id=s.id and l.user_id=auth.uid())))
$$;
create function nilatext_private.can_edit_student(stid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.nt_students s where s.id=stid and nilatext_private.can_teach(s.class_id))
$$;

-- Atomic bootstrap only creates a new tenant for the authenticated caller. It
-- cannot grant access to an existing school. Profile roles are never self-editable.
create function nilatext_private.create_school(school_name text,person_name text) returns uuid language plpgsql security definer set search_path='' as $$
 declare sid uuid; uid uuid:=auth.uid(); mail text;
 begin
 if uid is null then raise exception 'Sign in first'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 if exists(select 1 from public.nt_profiles where user_id=uid) then raise exception 'You already belong to a school'; end if;
 select lower(email) into mail from auth.users where id=uid and email_confirmed_at is not null;
 if mail is null then raise exception 'Confirm your email first'; end if;
 insert into public.nt_schools(name,created_by) values(trim(school_name),uid) returning id into sid;
 insert into public.nt_profiles(user_id,school_id,role,display_name,email) values(uid,sid,'admin',trim(person_name),mail);
 insert into public.nt_terms(school_id,year,number) select sid,extract(year from current_date)::int,n from generate_series(1,3)n;
 return sid;
 end $$;
create function public.nt_create_school(school_name text,person_name text) returns uuid language sql security invoker set search_path='' as $$
 select nilatext_private.create_school(school_name,person_name)
$$;
create function nilatext_private.accept_invite(person_name text) returns uuid language plpgsql security definer set search_path='' as $$
 declare uid uuid:=auth.uid(); mail text; inv public.nt_invites;
 begin
 if uid is null then raise exception 'Sign in first'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 if exists(select 1 from public.nt_profiles where user_id=uid) then raise exception 'You already belong to a school'; end if;
 select lower(email) into mail from auth.users where id=uid and email_confirmed_at is not null;
 if mail is null then raise exception 'Confirm your email first'; end if;
 select * into inv from public.nt_invites where email=mail and accepted_at is null order by created_at desc limit 1 for update;
 if inv.id is null then raise exception 'No pending access invitation for your email. Ask your school administrator.'; end if;
 insert into public.nt_profiles(user_id,school_id,role,display_name,email) values(uid,inv.school_id,inv.role,trim(person_name),mail);
 if inv.student_id is not null then insert into public.nt_student_links(school_id,user_id,student_id) values(inv.school_id,uid,inv.student_id); end if;
 update public.nt_invites set accepted_at=now() where id=inv.id;
 return inv.school_id;
 end $$;
create function public.nt_accept_invite(person_name text) returns uuid language sql security invoker set search_path='' as $$
 select nilatext_private.accept_invite(person_name)
$$;

-- Payments are append-only and lock their invoice to prevent concurrent overpayment.
create function nilatext_private.validate_payment() returns trigger language plpgsql security definer set search_path='' as $$
 declare billed numeric; paid numeric;
 begin
 if auth.uid() is null or not nilatext_private.is_admin(new.school_id) then raise exception 'Administrator access required'; end if;
 new.received_by:=auth.uid(); new.received_at:=now();
 select amount into billed from public.nt_invoices where id=new.invoice_id and school_id=new.school_id for update;
 if billed is null then raise exception 'Invoice not found'; end if;
 select coalesce(sum(amount),0) into paid from public.nt_payments where invoice_id=new.invoice_id;
 if paid+new.amount>billed then raise exception 'Payment exceeds the remaining invoice balance'; end if;
 return new;
 end $$;
create trigger nt_payment_validate before insert on public.nt_payments for each row execute function nilatext_private.validate_payment();

-- Prevent altering an invoice after posting; no update or delete privileges exist.
-- Supporting indexes cover tenant filters, relationships and policy predicates.
create index nt_schools_created_by_idx on public.nt_schools(created_by);
create index nt_profiles_school_idx on public.nt_profiles(school_id);
create index nt_classes_teacher_idx on public.nt_classes(teacher_id);
create index nt_students_class_idx on public.nt_students(school_id,class_id);
create index nt_links_student_idx on public.nt_student_links(school_id,student_id);
create index nt_invites_student_idx on public.nt_invites(school_id,student_id);
create index nt_invites_email_idx on public.nt_invites(email) where accepted_at is null;
create index nt_marks_term_idx on public.nt_marks(school_id,term_id);
create index nt_marks_student_idx on public.nt_marks(school_id,student_id);
create index nt_attendance_school_day_idx on public.nt_attendance(school_id,day);
create index nt_attendance_student_idx on public.nt_attendance(school_id,student_id);
create index nt_invoices_term_idx on public.nt_invoices(school_id,term_id);
create index nt_invoices_student_idx on public.nt_invoices(school_id,student_id);
create index nt_payments_invoice_idx on public.nt_payments(school_id,invoice_id);
create index nt_payments_author_idx on public.nt_payments(received_by);
create index nt_notes_author_idx on public.nt_notes(author_id);
create index nt_notes_school_idx on public.nt_notes(school_id,created_at desc);

alter table public.nt_schools enable row level security;
alter table public.nt_profiles enable row level security;
alter table public.nt_classes enable row level security;
alter table public.nt_terms enable row level security;
alter table public.nt_students enable row level security;
alter table public.nt_student_links enable row level security;
alter table public.nt_invites enable row level security;
alter table public.nt_marks enable row level security;
alter table public.nt_attendance enable row level security;
alter table public.nt_invoices enable row level security;
alter table public.nt_payments enable row level security;
alter table public.nt_notes enable row level security;

create policy school_read on public.nt_schools for select to authenticated using(nilatext_private.is_member(id));
create policy school_edit on public.nt_schools for update to authenticated using(nilatext_private.is_admin(id)) with check(nilatext_private.is_admin(id));
create policy profile_read on public.nt_profiles for select to authenticated using(user_id=(select auth.uid()) or nilatext_private.is_admin(school_id));
create policy class_read on public.nt_classes for select to authenticated using(nilatext_private.is_member(school_id));
create policy class_add on public.nt_classes for insert to authenticated with check(nilatext_private.is_admin(school_id));
create policy class_edit on public.nt_classes for update to authenticated using(nilatext_private.is_admin(school_id)) with check(nilatext_private.is_admin(school_id));
create policy term_read on public.nt_terms for select to authenticated using(nilatext_private.is_member(school_id));
create policy term_add on public.nt_terms for insert to authenticated with check(nilatext_private.is_admin(school_id));
create policy student_read on public.nt_students for select to authenticated using(nilatext_private.can_read_student(id));
create policy student_add on public.nt_students for insert to authenticated with check(nilatext_private.is_admin(school_id));
create policy student_edit on public.nt_students for update to authenticated using(nilatext_private.is_admin(school_id)) with check(nilatext_private.is_admin(school_id));
create policy link_read on public.nt_student_links for select to authenticated using(user_id=(select auth.uid()) or nilatext_private.is_admin(school_id));
create policy link_add on public.nt_student_links for insert to authenticated with check(nilatext_private.is_admin(school_id));
create policy invite_read on public.nt_invites for select to authenticated using(nilatext_private.is_admin(school_id));
create policy invite_add on public.nt_invites for insert to authenticated with check(nilatext_private.is_admin(school_id) and accepted_at is null);
create policy marks_read on public.nt_marks for select to authenticated using(nilatext_private.can_read_student(student_id));
create policy marks_add on public.nt_marks for insert to authenticated with check(nilatext_private.can_edit_student(student_id));
create policy marks_edit on public.nt_marks for update to authenticated using(nilatext_private.can_edit_student(student_id)) with check(nilatext_private.can_edit_student(student_id));
create policy attendance_read on public.nt_attendance for select to authenticated using(nilatext_private.can_read_student(student_id));
create policy attendance_add on public.nt_attendance for insert to authenticated with check(nilatext_private.can_edit_student(student_id));
create policy attendance_edit on public.nt_attendance for update to authenticated using(nilatext_private.can_edit_student(student_id)) with check(nilatext_private.can_edit_student(student_id));
create policy invoice_read on public.nt_invoices for select to authenticated using(nilatext_private.is_admin(school_id) or (not nilatext_private.is_staff(school_id) and nilatext_private.can_read_student(student_id)));
create policy invoice_add on public.nt_invoices for insert to authenticated with check(nilatext_private.is_admin(school_id));
create policy payment_read on public.nt_payments for select to authenticated using(exists(select 1 from public.nt_invoices i where i.id=invoice_id));
create policy payment_add on public.nt_payments for insert to authenticated with check(nilatext_private.is_admin(school_id));
create policy note_read on public.nt_notes for select to authenticated using(nilatext_private.is_staff(school_id));
create policy note_add on public.nt_notes for insert to authenticated with check(author_id=(select auth.uid()) and nilatext_private.is_staff(school_id));

revoke all on public.nt_schools,public.nt_profiles,public.nt_classes,public.nt_terms,public.nt_students,public.nt_student_links,public.nt_invites,public.nt_marks,public.nt_attendance,public.nt_invoices,public.nt_payments,public.nt_notes from anon,authenticated;
grant select on public.nt_schools,public.nt_profiles,public.nt_classes,public.nt_terms,public.nt_students,public.nt_student_links,public.nt_invites,public.nt_marks,public.nt_attendance,public.nt_invoices,public.nt_payments,public.nt_notes to authenticated;
grant update(name) on public.nt_schools to authenticated;
grant insert,update on public.nt_classes,public.nt_students,public.nt_marks,public.nt_attendance to authenticated;
grant insert on public.nt_terms,public.nt_student_links,public.nt_invites,public.nt_invoices,public.nt_payments,public.nt_notes to authenticated;
revoke all on all functions in schema nilatext_private from public,anon,authenticated;
grant execute on function nilatext_private.is_member(uuid),nilatext_private.is_admin(uuid),nilatext_private.is_staff(uuid),nilatext_private.can_teach(uuid),nilatext_private.can_read_student(uuid),nilatext_private.can_edit_student(uuid),nilatext_private.create_school(text,text),nilatext_private.accept_invite(text) to authenticated;
revoke all on function public.nt_create_school(text,text),public.nt_accept_invite(text) from public,anon;
grant execute on function public.nt_create_school(text,text),public.nt_accept_invite(text) to authenticated;

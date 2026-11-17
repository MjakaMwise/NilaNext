begin;

create table public.nt_departments (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.nt_schools(id),
 name text not null check (length(trim(name)) between 1 and 100),
 unique (school_id, id), unique (school_id, name)
);

create table public.nt_subjects (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null,
 department_id uuid not null,
 name text not null check (length(trim(name)) between 1 and 100),
 unique (school_id, id), unique (school_id, name),
 foreign key (school_id, department_id) references public.nt_departments(school_id, id)
);

create table public.nt_offerings (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null,
 term_id uuid not null,
 class_id uuid not null,
 subject_id uuid not null,
 teacher_id uuid,
 elective boolean not null default false,
 unique (school_id, id), unique (school_id, term_id, class_id, subject_id),
 foreign key (school_id, term_id) references public.nt_terms(school_id, id),
 foreign key (school_id, class_id) references public.nt_classes(school_id, id),
 foreign key (school_id, subject_id) references public.nt_subjects(school_id, id),
 foreign key (school_id, teacher_id) references public.nt_profiles(school_id, user_id) on delete set null (teacher_id)
);

create table public.nt_elective_enrolments (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null,
 offering_id uuid not null,
 student_id uuid not null,
 unique (offering_id, student_id),
 foreign key (school_id, offering_id) references public.nt_offerings(school_id, id),
 foreign key (school_id, student_id) references public.nt_students(school_id, id)
);

create table public.nt_lessons (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null,
 offering_id uuid not null,
 weekday integer not null check (weekday between 1 and 7),
 starts_at time not null,
 ends_at time not null check (ends_at > starts_at),
 room text not null default '' check (length(room) <= 100),
 unique (school_id, id),
 foreign key (school_id, offering_id) references public.nt_offerings(school_id, id)
);

create table public.nt_lesson_attendance (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null,
 lesson_id uuid not null,
 student_id uuid not null,
 day date not null,
 status text not null check (status in ('Present', 'Absent', 'Late')),
 unique (lesson_id, day, student_id),
 foreign key (school_id, lesson_id) references public.nt_lessons(school_id, id),
 foreign key (school_id, student_id) references public.nt_students(school_id, id)
);

create table public.nt_assignments (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null,
 offering_id uuid not null,
 title text not null check (length(trim(title)) between 1 and 150),
 instructions text not null check (length(trim(instructions)) between 1 and 10000),
 due_on date not null,
 unique (school_id, id),
 foreign key (school_id, offering_id) references public.nt_offerings(school_id, id)
);

create table public.nt_assignment_submissions (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null,
 assignment_id uuid not null,
 student_id uuid not null,
 response text not null check (length(trim(response)) between 1 and 10000),
 submitted_at timestamptz not null default now(),
 unique (assignment_id, student_id),
 foreign key (school_id, assignment_id) references public.nt_assignments(school_id, id),
 foreign key (school_id, student_id) references public.nt_students(school_id, id)
);

create index nt_offerings_teacher on public.nt_offerings(school_id, teacher_id);
create index nt_offerings_subject on public.nt_offerings(school_id, subject_id);
create index nt_enrolments_student on public.nt_elective_enrolments(school_id, student_id);
create index nt_lessons_offering on public.nt_lessons(school_id, offering_id);
create index nt_assignments_offering on public.nt_assignments(school_id, offering_id);

-- All lookups derive the caller from the authenticated session.
create function nilatext_private.on_offering_roster(oid uuid, learner uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists (
  select 1 from public.nt_offerings o
  join public.nt_students s on s.school_id = o.school_id and s.class_id = o.class_id
  where o.id = oid and s.id = learner and s.active and (
   not o.elective or exists (
    select 1 from public.nt_elective_enrolments e where e.offering_id = oid and e.student_id = learner
   )
  )
 )
$$;

create function nilatext_private.manages_offering(oid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists (
  select 1 from public.nt_offerings o
  join public.nt_profiles p on p.school_id = o.school_id and p.user_id = auth.uid()
  where o.id = oid and (p.role = 'admin' or (p.role = 'teacher' and o.teacher_id = p.user_id))
 )
$$;

create function nilatext_private.sees_offering(oid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select nilatext_private.manages_offering(oid) or exists (
  select 1 from public.nt_offerings o
  join public.nt_profiles p on p.school_id = o.school_id and p.user_id = auth.uid()
  join public.nt_student_links l on l.school_id = p.school_id and l.user_id = p.user_id
  where o.id = oid and p.role in ('parent', 'student')
    and nilatext_private.on_offering_roster(oid, l.student_id)
 )
$$;

create function nilatext_private.offering_roster(oid uuid)
returns table(id uuid, full_name text, admission_no text)
language sql stable security definer set search_path = '' as $$
 select s.id, s.full_name, s.admission_no
 from public.nt_offerings o
 join public.nt_students s on s.school_id = o.school_id and s.class_id = o.class_id
 where o.id = oid and nilatext_private.manages_offering(oid)
   and nilatext_private.on_offering_roster(oid, s.id)
 order by s.full_name, s.id
$$;

create function public.nt_offering_roster(oid uuid)
returns table(id uuid, full_name text, admission_no text)
language sql stable security invoker set search_path = '' as $$
 select * from nilatext_private.offering_roster(oid)
$$;

create function nilatext_private.lesson_access(lid uuid, learner uuid, lesson_day date, writing boolean)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists (
  select 1 from public.nt_lessons l
  where l.id = lid and (
   (not writing and (nilatext_private.manages_offering(l.offering_id) or exists (
    select 1 from public.nt_student_links s
    join public.nt_profiles p on p.school_id = s.school_id and p.user_id = s.user_id
    where s.school_id = l.school_id and s.student_id = learner and s.user_id = auth.uid()
   )))
   or (writing and extract(isodow from lesson_day) = l.weekday
    and nilatext_private.manages_offering(l.offering_id)
    and nilatext_private.on_offering_roster(l.offering_id, learner))
  )
 )
$$;

create function nilatext_private.submission_access(aid uuid, learner uuid, writing boolean)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists (
  select 1 from public.nt_assignments a
  where a.id = aid and (
   (not writing and nilatext_private.manages_offering(a.offering_id))
   or exists (
    select 1 from public.nt_student_links l
    join public.nt_profiles p on p.school_id = l.school_id and p.user_id = l.user_id
    where l.school_id = a.school_id and l.student_id = learner and l.user_id = auth.uid()
    and ((not writing and p.role in ('parent', 'student')) or
      (writing and p.role = 'student' and nilatext_private.on_offering_roster(a.offering_id, learner)))
   )
  )
 )
$$;

create function nilatext_private.validate_offering() returns trigger
language plpgsql set search_path = '' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(new.school_id::text, 481));
 if new.teacher_id is not null and not exists (
  select 1 from public.nt_profiles p
  where p.school_id = new.school_id and p.user_id = new.teacher_id and p.role = 'teacher'
 ) then
  raise exception 'Select a registered teacher';
 end if;
 if tg_op = 'UPDATE' and new.teacher_id is not null and exists (
  select 1 from public.nt_lessons own
  join public.nt_lessons booked on booked.school_id = own.school_id
    and booked.weekday = own.weekday and booked.starts_at < own.ends_at and own.starts_at < booked.ends_at
  join public.nt_offerings o on o.id = booked.offering_id
  where own.offering_id = new.id and o.id <> new.id and o.term_id = new.term_id and o.teacher_id = new.teacher_id
 ) then
  raise exception 'This teacher already has a lesson at that time';
 end if;
 return new;
end
$$;

create function nilatext_private.validate_enrolment() returns trigger
language plpgsql set search_path = '' as $$
begin
 if not exists (
  select 1 from public.nt_offerings o
  join public.nt_students s on s.school_id = o.school_id and s.class_id = o.class_id
  where o.id = new.offering_id and o.elective and s.id = new.student_id and s.active
 ) then
  raise exception 'Select an active learner in this elective’s class';
 end if;
 return new;
end
$$;

create function nilatext_private.validate_lesson() returns trigger
language plpgsql set search_path = '' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(new.school_id::text, 481));
 if tg_op = 'UPDATE' and old.weekday <> new.weekday and exists (
  select 1 from public.nt_lesson_attendance a where a.lesson_id = old.id
 ) then
  raise exception 'The weekday cannot change after attendance has been recorded';
 end if;
 if exists (
  select 1 from public.nt_lessons l
  join public.nt_offerings booked on booked.id = l.offering_id
  join public.nt_offerings proposed on proposed.id = new.offering_id
  where l.school_id = new.school_id and l.id <> new.id and booked.term_id = proposed.term_id
   and l.weekday = new.weekday and l.starts_at < new.ends_at and new.starts_at < l.ends_at
   and (booked.class_id = proposed.class_id or booked.teacher_id = proposed.teacher_id
    or (trim(new.room) <> '' and lower(trim(l.room)) = lower(trim(new.room))))
 ) then
  raise exception 'This lesson overlaps another booking for the class, teacher, or room';
 end if;
 return new;
end
$$;

create trigger validate_offering before insert or update on public.nt_offerings
 for each row execute function nilatext_private.validate_offering();
create trigger validate_enrolment before insert on public.nt_elective_enrolments
 for each row execute function nilatext_private.validate_enrolment();
create trigger validate_lesson before insert or update on public.nt_lessons
 for each row execute function nilatext_private.validate_lesson();

revoke execute on function nilatext_private.on_offering_roster(uuid, uuid),
 nilatext_private.manages_offering(uuid), nilatext_private.sees_offering(uuid),
 nilatext_private.offering_roster(uuid), nilatext_private.lesson_access(uuid, uuid, date, boolean),
 nilatext_private.submission_access(uuid, uuid, boolean), public.nt_offering_roster(uuid)
 from public, anon, authenticated;
revoke execute on function nilatext_private.validate_offering(), nilatext_private.validate_enrolment(),
 nilatext_private.validate_lesson() from public, anon, authenticated;
grant execute on function nilatext_private.manages_offering(uuid), nilatext_private.sees_offering(uuid),
 nilatext_private.offering_roster(uuid), nilatext_private.lesson_access(uuid, uuid, date, boolean),
 nilatext_private.submission_access(uuid, uuid, boolean), public.nt_offering_roster(uuid) to authenticated;

do $$
declare t text;
begin
 foreach t in array array['nt_departments','nt_subjects','nt_offerings','nt_elective_enrolments','nt_lessons','nt_lesson_attendance','nt_assignments','nt_assignment_submissions']
 loop
  execute format('alter table public.%I enable row level security', t);
  execute format('revoke all on public.%I from public, anon, authenticated', t);
  execute format('grant select, insert on public.%I to authenticated', t);
 end loop;
 foreach t in array array['nt_departments','nt_subjects','nt_offerings','nt_elective_enrolments','nt_lessons']
 loop
  execute format('create policy admin_read on public.%I for select to authenticated using (nilatext_private.is_admin(school_id))', t);
  execute format('create policy admin_add on public.%I for insert to authenticated with check (nilatext_private.is_admin(school_id))', t);
 end loop;
end
$$;

create policy department_read on public.nt_departments for select to authenticated using (nilatext_private.is_member(school_id));
create policy subject_read on public.nt_subjects for select to authenticated using (nilatext_private.is_member(school_id));
create policy offering_read on public.nt_offerings for select to authenticated using (nilatext_private.sees_offering(id));
create policy lesson_read on public.nt_lessons for select to authenticated using (nilatext_private.sees_offering(offering_id));
create policy enrolment_family_read on public.nt_elective_enrolments for select to authenticated using (
 exists (select 1 from public.nt_student_links l
   where l.school_id = nt_elective_enrolments.school_id and l.user_id = auth.uid()
     and l.student_id = nt_elective_enrolments.student_id)
);
create policy enrolment_remove on public.nt_elective_enrolments for delete to authenticated using (nilatext_private.is_admin(school_id));
grant delete on public.nt_elective_enrolments to authenticated;

grant update (teacher_id) on public.nt_offerings to authenticated;
create policy offering_edit on public.nt_offerings for update to authenticated using (nilatext_private.is_admin(school_id)) with check (nilatext_private.is_admin(school_id));
grant update (name) on public.nt_departments, public.nt_subjects to authenticated;
grant update (weekday, starts_at, ends_at, room) on public.nt_lessons to authenticated;
create policy department_edit on public.nt_departments for update to authenticated using (nilatext_private.is_admin(school_id)) with check (nilatext_private.is_admin(school_id));
create policy subject_edit on public.nt_subjects for update to authenticated using (nilatext_private.is_admin(school_id)) with check (nilatext_private.is_admin(school_id));
create policy lesson_edit on public.nt_lessons for update to authenticated using (nilatext_private.is_admin(school_id)) with check (nilatext_private.is_admin(school_id));
grant delete on public.nt_lessons to authenticated;
create policy lesson_remove on public.nt_lessons for delete to authenticated using (nilatext_private.is_admin(school_id));

create policy lesson_attendance_read on public.nt_lesson_attendance for select to authenticated using (nilatext_private.lesson_access(lesson_id, student_id, day, false));
create policy lesson_attendance_add on public.nt_lesson_attendance for insert to authenticated with check (nilatext_private.lesson_access(lesson_id, student_id, day, true));
create policy lesson_attendance_edit on public.nt_lesson_attendance for update to authenticated
 using (nilatext_private.lesson_access(lesson_id, student_id, day, true))
 with check (nilatext_private.lesson_access(lesson_id, student_id, day, true));
grant update (school_id, lesson_id, student_id, day, status) on public.nt_lesson_attendance to authenticated;

create policy assignment_read on public.nt_assignments for select to authenticated using (nilatext_private.sees_offering(offering_id));
create policy assignment_add on public.nt_assignments for insert to authenticated with check (nilatext_private.manages_offering(offering_id));
create policy assignment_edit on public.nt_assignments for update to authenticated using (nilatext_private.manages_offering(offering_id)) with check (nilatext_private.manages_offering(offering_id));
create policy assignment_remove on public.nt_assignments for delete to authenticated using (nilatext_private.manages_offering(offering_id));
grant update (title, instructions, due_on), delete on public.nt_assignments to authenticated;

create policy submission_read on public.nt_assignment_submissions for select to authenticated
 using (nilatext_private.submission_access(assignment_id, student_id, false));
create policy submission_add on public.nt_assignment_submissions for insert to authenticated
 with check (nilatext_private.submission_access(assignment_id, student_id, true));
revoke insert on public.nt_assignment_submissions from authenticated;
grant insert (school_id, assignment_id, student_id, response) on public.nt_assignment_submissions to authenticated;

commit;

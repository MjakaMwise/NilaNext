-- Existing classes and teacher records remain usable after this migration.
alter table public.nt_classes
  add column level text check (length(trim(level)) between 1 and 60),
  add column stream text check (length(trim(stream)) between 1 and 30),
  add check (stream is null or level is not null);

create unique index nt_classes_level_stream_key
  on public.nt_classes(school_id, lower(level), lower(coalesce(stream, ''))) where level is not null;

alter table public.nt_teacher_roster
  alter column email drop not null,
  add column tsc_no text check (length(trim(tsc_no)) between 1 and 40),
  add check (email is not null or tsc_no is not null),
  add unique (school_id, id),
  add unique (school_id, tsc_no);

alter table public.nt_invites
  add column teacher_roster_id uuid,
  add foreign key (school_id, teacher_roster_id) references public.nt_teacher_roster(school_id, id),
  add check (teacher_roster_id is null or role = 'teacher'),
  add unique (school_id, teacher_roster_id);

create table public.nt_assessments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  term_id uuid not null,
  name text not null check (length(trim(name)) between 1 and 60),
  sort_order integer not null default 1 check (sort_order > 0),
  unique (school_id, term_id, id),
  foreign key (school_id, term_id) references public.nt_terms(school_id, id)
);
create unique index nt_assessment_names on public.nt_assessments(school_id, term_id, lower(name));
alter table public.nt_offerings add unique (school_id, term_id, id);

create table public.nt_assessment_results (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  term_id uuid not null,
  assessment_id uuid not null,
  offering_id uuid not null,
  student_id uuid not null,
  score numeric(5,2) not null check (score between 0 and 100),
  unique (assessment_id, offering_id, student_id),
  foreign key (school_id, term_id, assessment_id) references public.nt_assessments(school_id, term_id, id),
  foreign key (school_id, term_id, offering_id) references public.nt_offerings(school_id, term_id, id),
  foreign key (school_id, student_id) references public.nt_students(school_id, id)
);
create index nt_assessment_results_school_term on public.nt_assessment_results(school_id, term_id);
create index nt_assessment_results_student on public.nt_assessment_results(school_id, student_id);
create index nt_assessment_results_offering on public.nt_assessment_results(school_id, term_id, offering_id);

create function nilatext_private.can_write_assessment_result(oid uuid, learner uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select nilatext_private.manages_offering(oid) and nilatext_private.on_offering_roster(oid, learner)
$$;
revoke all on function nilatext_private.can_write_assessment_result(uuid, uuid) from public, anon, authenticated;
grant execute on function nilatext_private.can_write_assessment_result(uuid, uuid) to authenticated;

alter table public.nt_assessments enable row level security;
alter table public.nt_assessment_results enable row level security;
revoke all on public.nt_assessments, public.nt_assessment_results from public, anon, authenticated;
grant select, insert on public.nt_assessments, public.nt_assessment_results to authenticated;
grant update on public.nt_assessment_results to authenticated;

create policy assessment_read on public.nt_assessments for select to authenticated
  using (nilatext_private.is_member(school_id));
create policy assessment_create on public.nt_assessments for insert to authenticated
  with check (nilatext_private.is_admin(school_id));
create policy assessment_result_read on public.nt_assessment_results for select to authenticated
  using (nilatext_private.manages_offering(offering_id) or
    (not nilatext_private.is_staff(school_id) and nilatext_private.can_read_student(student_id)));
create policy assessment_result_add on public.nt_assessment_results for insert to authenticated
  with check (nilatext_private.can_write_assessment_result(offering_id, student_id));
create policy assessment_result_edit on public.nt_assessment_results for update to authenticated
  using (nilatext_private.can_write_assessment_result(offering_id, student_id))
  with check (nilatext_private.can_write_assessment_result(offering_id, student_id));

alter table public.nt_classes
  add column teacher_roster_id uuid,
  add foreign key (school_id, teacher_roster_id) references public.nt_teacher_roster(school_id, id);
create index nt_classes_teacher_roster on public.nt_classes(school_id, teacher_roster_id)
  where teacher_roster_id is not null;

create function nilatext_private.link_roster_teacher_to_classes()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.accepted_at is null and new.accepted_at is not null and new.teacher_roster_id is not null then
    update public.nt_classes c set teacher_id = p.user_id
    from public.nt_profiles p
    where c.school_id = new.school_id and c.teacher_roster_id = new.teacher_roster_id
      and p.school_id = new.school_id and p.email = new.email and p.role = 'teacher';
  end if;
  return new;
end
$$;
revoke all on function nilatext_private.link_roster_teacher_to_classes() from public, anon, authenticated;
create trigger nt_link_roster_teacher_after_join
  after update of accepted_at on public.nt_invites
  for each row execute function nilatext_private.link_roster_teacher_to_classes();

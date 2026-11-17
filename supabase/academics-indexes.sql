begin;
create index nt_submissions_school_assignment on public.nt_assignment_submissions(school_id, assignment_id);
create index nt_submissions_school_student on public.nt_assignment_submissions(school_id, student_id);
create index nt_enrolments_school_offering on public.nt_elective_enrolments(school_id, offering_id);
create index nt_lesson_attendance_school_lesson on public.nt_lesson_attendance(school_id, lesson_id, day);
create index nt_lesson_attendance_school_student on public.nt_lesson_attendance(school_id, student_id);
create index nt_offerings_school_class on public.nt_offerings(school_id, class_id);
create index nt_subjects_school_department on public.nt_subjects(school_id, department_id);

drop policy admin_read on public.nt_departments;
drop policy admin_read on public.nt_subjects;
drop policy admin_read on public.nt_offerings;
drop policy admin_read on public.nt_lessons;
drop policy admin_read on public.nt_elective_enrolments;

-- The direct administrator check also supports INSERT ... RETURNING.
alter policy offering_read on public.nt_offerings
 using (nilatext_private.is_admin(school_id) or nilatext_private.sees_offering(id));
alter policy lesson_read on public.nt_lessons
 using (nilatext_private.is_admin(school_id) or nilatext_private.sees_offering(offering_id));
alter policy enrolment_family_read on public.nt_elective_enrolments using (
 nilatext_private.is_admin(school_id) or exists (
   select 1 from public.nt_student_links l
   where l.school_id = nt_elective_enrolments.school_id and l.user_id = (select auth.uid())
     and l.student_id = nt_elective_enrolments.student_id
 )
);
commit;

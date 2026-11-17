-- Live integration test. All fixture accounts and records roll back.
begin;
select set_config('nt_test.admin',gen_random_uuid()::text,true),set_config('nt_test.teacher',gen_random_uuid()::text,true),set_config('nt_test.parent',gen_random_uuid()::text,true),set_config('nt_test.student',gen_random_uuid()::text,true),set_config('nt_test.outsider',gen_random_uuid()::text,true);
insert into auth.users(id,email,email_confirmed_at) select current_setting('nt_test.'||r)::uuid,'nilatext-'||r||'-'||current_setting('nt_test.admin')||'@example.invalid',now() from unnest(array['admin','teacher','parent','student','outsider'])r;
select set_config('request.jwt.claim.sub',current_setting('nt_test.admin'),true);
set local role authenticated;
select set_config('nt_test.school',public.nt_create_school('Integration Test School','Test Admin')::text,true);
insert into public.nt_classes(school_id,name) values(current_setting('nt_test.school')::uuid,'Grade 8A') returning set_config('nt_test.class',id::text,true);
select set_config('nt_test.term',id::text,true) from public.nt_terms where school_id=current_setting('nt_test.school')::uuid and number=1;
insert into public.nt_students(school_id,class_id,admission_no,full_name) values(current_setting('nt_test.school')::uuid,current_setting('nt_test.class')::uuid,'TEST001','Test Learner') returning set_config('nt_test.learner',id::text,true);
insert into public.nt_students(school_id,class_id,admission_no,full_name) values(current_setting('nt_test.school')::uuid,current_setting('nt_test.class')::uuid,'TEST002','Unlinked Learner') returning set_config('nt_test.unlinked',id::text,true);
insert into public.nt_invites(school_id,email,role,student_id) select current_setting('nt_test.school')::uuid,'nilatext-'||r||'-'||current_setting('nt_test.admin')||'@example.invalid',r,case when r='teacher' then null else current_setting('nt_test.learner')::uuid end from unnest(array['teacher','parent','student'])r;
insert into public.nt_invoices(school_id,student_id,term_id,amount) values(current_setting('nt_test.school')::uuid,current_setting('nt_test.learner')::uuid,current_setting('nt_test.term')::uuid,25000) returning set_config('nt_test.invoice',id::text,true);
insert into public.nt_payments(school_id,invoice_id,amount,reference,request_id) values(current_setting('nt_test.school')::uuid,current_setting('nt_test.invoice')::uuid,10000,'TEST-RECEIPT',gen_random_uuid());
do $$begin
 begin
 insert into public.nt_payments(school_id,invoice_id,amount,reference,request_id) values(current_setting('nt_test.school')::uuid,current_setting('nt_test.invoice')::uuid,15000.01,'OVERPAY',gen_random_uuid());
 raise exception 'FAIL: overpayment was accepted';
 exception when others then if sqlerrm not like '%exceeds the remaining%' then raise; end if; end;
end$$;
-- Teacher joins only through an email-bound invitation.
select set_config('request.jwt.claim.sub',current_setting('nt_test.teacher'),true);
select public.nt_accept_invite('Test Teacher');
do $$begin
 if (select count(*) from public.nt_students)<>0 then raise exception 'FAIL: unassigned teacher can read learners';end if;
 if (select count(*) from public.nt_invoices)<>0 then raise exception 'FAIL: teacher can read invoices';end if;
end$$;
-- A subject teacher can teach a class independently of the class teacher appointment.
select set_config('request.jwt.claim.sub',current_setting('nt_test.admin'),true);
insert into public.nt_departments(school_id,name)
values(current_setting('nt_test.school')::uuid,'Languages')
returning set_config('nt_test.department',id::text,true);
insert into public.nt_subjects(school_id,department_id,name)
values(current_setting('nt_test.school')::uuid,current_setting('nt_test.department')::uuid,'French')
returning set_config('nt_test.subject',id::text,true);
insert into public.nt_offerings(school_id,term_id,class_id,subject_id,teacher_id,elective)
values(current_setting('nt_test.school')::uuid,current_setting('nt_test.term')::uuid,current_setting('nt_test.class')::uuid,current_setting('nt_test.subject')::uuid,current_setting('nt_test.teacher')::uuid,true)
returning set_config('nt_test.offering',id::text,true);
insert into public.nt_elective_enrolments(school_id,offering_id,student_id)
values(current_setting('nt_test.school')::uuid,current_setting('nt_test.offering')::uuid,current_setting('nt_test.learner')::uuid);
insert into public.nt_lessons(school_id,offering_id,weekday,starts_at,ends_at,room)
values(current_setting('nt_test.school')::uuid,current_setting('nt_test.offering')::uuid,1,'09:00','10:00','Room A')
returning set_config('nt_test.lesson',id::text,true);
do $$begin
 begin
  insert into public.nt_lessons(school_id,offering_id,weekday,starts_at,ends_at,room)
  values(current_setting('nt_test.school')::uuid,current_setting('nt_test.offering')::uuid,1,'09:30','10:30','Room B');
  raise exception 'FAIL: overlapping lesson was accepted';
 exception when raise_exception then if sqlerrm not like 'This lesson overlaps%' then raise; end if; end;
end$$;
select set_config('request.jwt.claim.sub',current_setting('nt_test.teacher'),true);
do $$begin
 if (select count(*) from public.nt_offering_roster(current_setting('nt_test.offering')::uuid))<>1 then raise exception 'FAIL: elective roster';end if;
 if (select count(*) from public.nt_students)<>0 then raise exception 'FAIL: elective assignment broadened class access';end if;
 if (select count(*) from public.nt_lessons)<>1 then raise exception 'FAIL: assigned teacher cannot see timetable';end if;
 begin
  insert into public.nt_lesson_attendance(school_id,lesson_id,student_id,day,status)
  values(current_setting('nt_test.school')::uuid,current_setting('nt_test.lesson')::uuid,current_setting('nt_test.unlinked')::uuid,'2026-11-16','Present');
  raise exception 'FAIL: attendance accepted for learner outside elective';
 exception when insufficient_privilege then null;end;
end$$;
insert into public.nt_lesson_attendance(school_id,lesson_id,student_id,day,status)
values(current_setting('nt_test.school')::uuid,current_setting('nt_test.lesson')::uuid,current_setting('nt_test.learner')::uuid,'2026-11-16','Present')
on conflict(lesson_id,day,student_id) do update set status=excluded.status;
insert into public.nt_lesson_attendance(school_id,lesson_id,student_id,day,status)
values(current_setting('nt_test.school')::uuid,current_setting('nt_test.lesson')::uuid,current_setting('nt_test.learner')::uuid,'2026-11-16','Late')
on conflict(lesson_id,day,student_id) do update set status=excluded.status;
insert into public.nt_assignments(school_id,offering_id,title,instructions,due_on)
values(current_setting('nt_test.school')::uuid,current_setting('nt_test.offering')::uuid,'Introduction','Write a paragraph.','2026-11-30')
returning set_config('nt_test.assignment',id::text,true);
select set_config('request.jwt.claim.sub',current_setting('nt_test.admin'),true);
update public.nt_classes set teacher_id=current_setting('nt_test.teacher')::uuid where id=current_setting('nt_test.class')::uuid;
select set_config('request.jwt.claim.sub',current_setting('nt_test.teacher'),true);
insert into public.nt_marks(school_id,student_id,term_id,subject,score) values(current_setting('nt_test.school')::uuid,current_setting('nt_test.learner')::uuid,current_setting('nt_test.term')::uuid,'Mathematics',84);
insert into public.nt_marks(school_id,student_id,term_id,subject,score) values(current_setting('nt_test.school')::uuid,current_setting('nt_test.learner')::uuid,current_setting('nt_test.term')::uuid,'Mathematics',88) on conflict(student_id,term_id,subject) do update set score=excluded.score;
insert into public.nt_attendance(school_id,student_id,day,status) values(current_setting('nt_test.school')::uuid,current_setting('nt_test.learner')::uuid,current_date,'Present');
do $$begin
 if (select count(*) from public.nt_students)<>2 then raise exception 'FAIL: assigned teacher cannot read class';end if;
 if (select score from public.nt_marks where student_id=current_setting('nt_test.learner')::uuid)<>88 then raise exception 'FAIL: teacher upsert did not persist';end if;
 begin update public.nt_profiles set role='admin' where user_id=auth.uid();raise exception 'FAIL: self escalation permitted';exception when insufficient_privilege then null;end;
end$$;
-- Linked parent can read one learner, marks, attendance and fees, cannot write.
select set_config('request.jwt.claim.sub',current_setting('nt_test.parent'),true);
select public.nt_accept_invite('Test Parent');
do $$begin
 if (select count(*) from public.nt_students)<>1 then raise exception 'FAIL: parent learner scoping';end if;
 if (select count(*) from public.nt_marks)<>1 then raise exception 'FAIL: parent marks scoping';end if;
 if (select count(*) from public.nt_attendance)<>1 then raise exception 'FAIL: parent attendance scoping';end if;
 if (select count(*) from public.nt_invoices)<>1 or (select count(*) from public.nt_payments)<>1 then raise exception 'FAIL: parent cannot read fees';end if;
 begin insert into public.nt_marks(school_id,student_id,term_id,subject,score) values(current_setting('nt_test.school')::uuid,current_setting('nt_test.learner')::uuid,current_setting('nt_test.term')::uuid,'English',100);raise exception 'FAIL: parent could alter marks';exception when insufficient_privilege then null;end;
 begin insert into public.nt_student_links(school_id,user_id,student_id) values(current_setting('nt_test.school')::uuid,auth.uid(),current_setting('nt_test.unlinked')::uuid);raise exception 'FAIL: parent self-linked another learner';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub',current_setting('nt_test.student'),true);
select public.nt_accept_invite('Test Student');
do $$begin if (select count(*) from public.nt_students)<>1 then raise exception 'FAIL: student learner scoping';end if;end$$;
insert into public.nt_assignment_submissions(school_id,assignment_id,student_id,response)
values(current_setting('nt_test.school')::uuid,current_setting('nt_test.assignment')::uuid,current_setting('nt_test.learner')::uuid,'Bonjour!')
returning id;
do $$begin
 if (select count(*) from public.nt_assignments)<>1 then raise exception 'FAIL: student assignment visibility';end if;
 if (select status from public.nt_lesson_attendance) is distinct from 'Late' then raise exception 'FAIL: lesson attendance upsert';end if;
 if (select count(*) from public.nt_offering_roster(current_setting('nt_test.offering')::uuid))<>0 then raise exception 'FAIL: student can read roster';end if;
 begin
  insert into public.nt_assignment_submissions(school_id,assignment_id,student_id,response)
  values(current_setting('nt_test.school')::uuid,current_setting('nt_test.assignment')::uuid,current_setting('nt_test.unlinked')::uuid,'Unauthorized');
  raise exception 'FAIL: student submitted for another learner';
 exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub',current_setting('nt_test.teacher'),true);
do $$begin if (select response from public.nt_assignment_submissions) is distinct from 'Bonjour!' then raise exception 'FAIL: teacher cannot see work';end if;end$$;
-- Different school tenant has no access, even with the other school's IDs.
select set_config('request.jwt.claim.sub',current_setting('nt_test.outsider'),true);
select public.nt_create_school('Other School','Other Admin');
do $$begin
 if (select count(*) from public.nt_students)<>0 then raise exception 'FAIL: cross tenant learner exposure';end if;
 if (select count(*) from public.nt_assignments)<>0 or (select count(*) from public.nt_assignment_submissions)<>0 then raise exception 'FAIL: cross tenant assignments';end if;
 if (select count(*) from public.nt_marks)<>0 then raise exception 'FAIL: cross tenant marks exposure';end if;
 begin insert into public.nt_students(school_id,class_id,admission_no,full_name) values(current_setting('nt_test.school')::uuid,current_setting('nt_test.class')::uuid,'BAD','Intruder');raise exception 'FAIL: cross tenant insert permitted';exception when insufficient_privilege then null;end;
 begin perform public.nt_revoke_member(current_setting('nt_test.teacher')::uuid);raise exception 'FAIL: cross tenant revocation permitted';exception when others then if sqlerrm not like '%only revoke non-administrator%' then raise;end if;end;
end$$;
-- Revocation is enforced immediately even if the old JWT has not expired.
select set_config('request.jwt.claim.sub',current_setting('nt_test.admin'),true);
select public.nt_revoke_member(current_setting('nt_test.teacher')::uuid);
select set_config('request.jwt.claim.sub',current_setting('nt_test.teacher'),true);
do $$begin if (select count(*) from public.nt_students)<>0 then raise exception 'FAIL: revoked teacher retained access';end if;end$$;
reset role;
set local role anon;
do $$begin
 begin perform count(*) from public.nt_students;raise exception 'FAIL: anon reads learners';exception when insufficient_privilege then null;end;
 begin perform public.nt_create_school('Unauthorized School','Nobody');raise exception 'FAIL: anon bootstrap';exception when insufficient_privilege then null;end;
end$$;
reset role;
select 'PASS: administrator bootstrap, teacher assignment, mark upsert, attendance, parent/student scoping, finance, overpayment, curriculum, elective rosters, lesson conflicts, assignment submissions, tenant isolation, escalation denial, revocation, anonymous denial' as result;
rollback;

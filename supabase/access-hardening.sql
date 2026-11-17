create index nt_classes_school_teacher_idx on public.nt_classes(school_id,teacher_id);
create index nt_links_school_user_idx on public.nt_student_links(school_id,user_id);
-- Admin read is independent of a lookup of a newly inserted learner in RETURNING.
alter policy student_read on public.nt_students using(nilatext_private.is_admin(school_id) or nilatext_private.can_read_student(id));
create function nilatext_private.revoke_member(member_id uuid) returns void language plpgsql security definer set search_path='' as $$
 declare me public.nt_profiles; target public.nt_profiles;
 begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 select * into me from public.nt_profiles where user_id=auth.uid();
 select * into target from public.nt_profiles where user_id=member_id;
 if me.role is distinct from 'admin' or target.school_id is distinct from me.school_id or target.role='admin' or target.user_id=me.user_id then raise exception 'You can only revoke non-administrator accounts in your school'; end if;
 if target.user_id is null then raise exception 'Member not found'; end if;
 update public.nt_classes set teacher_id=null where school_id=me.school_id and teacher_id=member_id;
 delete from public.nt_invites where school_id=me.school_id and email=target.email;
 delete from public.nt_profiles where user_id=member_id;
 end $$;
create function public.nt_revoke_member(member_id uuid) returns void language sql security invoker set search_path='' as $$
 select nilatext_private.revoke_member(member_id)
$$;
revoke all on function nilatext_private.revoke_member(uuid),public.nt_revoke_member(uuid) from public,anon,authenticated;
grant execute on function nilatext_private.revoke_member(uuid),public.nt_revoke_member(uuid) to authenticated;
create policy invite_revoke on public.nt_invites for delete to authenticated using(nilatext_private.is_admin(school_id) and accepted_at is null);
grant delete on public.nt_invites to authenticated;

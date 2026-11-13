-- Static post-migration assertions. Run only after the migration in an isolated DB.
do $$
begin
  if to_regclass('public.mcs_profile_private') is null then raise exception 'mcs_profile_private missing'; end if;
  if to_regclass('public.mcs_blocks') is null then raise exception 'mcs_blocks missing'; end if;
  if to_regclass('public.mcs_reports') is null then raise exception 'mcs_reports missing'; end if;
  if to_regprocedure('public.mcs_can_message(text)') is null then raise exception 'mcs_can_message missing'; end if;
  if to_regprocedure('public.mcs_can_view_conversation(text)') is null then raise exception 'mcs_can_view_conversation missing'; end if;
  if exists(select 1 from pg_policies where schemaname='public' and tablename='mcs_convos' and policyname='mcs_convos_update_participant') then raise exception 'unsafe convo update policy remains'; end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='mcs_convos' and policyname='mcs_convos_insert_authorized') then raise exception 'authorized convo insert policy missing'; end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='mcs_friendships' and policyname='mcs_friendships_insert_accept_request') then raise exception 'friendship acceptance policy missing'; end if;
  if not exists(select 1 from pg_trigger where tgname='mcs_blocks_cleanup_relationships' and not tgisinternal) then raise exception 'block cleanup trigger missing'; end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='mcs_friend_requests' and policyname='mcs_friend_requests_insert_own' and with_check like '%mcs_blocks%') then raise exception 'friend request block guard missing'; end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='mcs_follows' and policyname='mcs_follows_insert_own' and with_check like '%mcs_blocks%') then raise exception 'follow block guard missing'; end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='mcs_reports' and policyname='mcs_reports_insert_own' and with_check like '%status%') then raise exception 'report status guard missing'; end if;
  if exists(select 1 from public.mcs_profiles where payload ?| array['email','birthdate','phone','legal_name','parent_code','guardian_ids','pc_msg_policy','pc_purchases','pc_spend_limit_cents','pc_follow_requests']) then raise exception 'private profile fields remain in public payload'; end if;
  if (select prosecdef from pg_proc where oid='public.mcs_current_pid()'::regprocedure) then raise exception 'mcs_current_pid should be SECURITY INVOKER'; end if;
  if has_function_privilege('anon','public.mcs_handle_new_user()','EXECUTE') then raise exception 'anon can execute mcs_handle_new_user'; end if;
  if has_function_privilege('authenticated','public.mcs_handle_new_user()','EXECUTE') then raise exception 'authenticated can execute mcs_handle_new_user'; end if;
end;
$$;

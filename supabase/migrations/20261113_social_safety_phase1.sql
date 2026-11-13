-- Main Character Social: social safety phase 1
-- Draft only. Apply to an isolated database first; do not run directly on production.
begin;

create table if not exists public.mcs_profile_private (
  pid text primary key references public.mcs_profiles(id) on delete cascade,
  private_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.mcs_profile_private enable row level security;
revoke all on public.mcs_profile_private from anon, authenticated;
grant select, insert, update, delete on public.mcs_profile_private to authenticated;

drop policy if exists mcs_profile_private_select_own on public.mcs_profile_private;
create policy mcs_profile_private_select_own on public.mcs_profile_private for select to authenticated using (pid = public.mcs_current_pid());
drop policy if exists mcs_profile_private_insert_own on public.mcs_profile_private;
create policy mcs_profile_private_insert_own on public.mcs_profile_private for insert to authenticated with check (pid = public.mcs_current_pid());
drop policy if exists mcs_profile_private_update_own on public.mcs_profile_private;
create policy mcs_profile_private_update_own on public.mcs_profile_private for update to authenticated using (pid = public.mcs_current_pid()) with check (pid = public.mcs_current_pid());
drop policy if exists mcs_profile_private_delete_own on public.mcs_profile_private;
create policy mcs_profile_private_delete_own on public.mcs_profile_private for delete to authenticated using (pid = public.mcs_current_pid());
drop trigger if exists mcs_profile_private_touch_updated_at on public.mcs_profile_private;
create trigger mcs_profile_private_touch_updated_at before update on public.mcs_profile_private for each row execute function public.mcs_touch_updated_at();

insert into public.mcs_profile_private (pid, private_payload)
select p.id, jsonb_strip_nulls(jsonb_build_object(
  'email',p.payload->'email','birthdate',p.payload->'birthdate','phone',p.payload->'phone',
  'legal_name',p.payload->'legal_name','parent_code',p.payload->'parent_code',
  'guardian_ids',p.payload->'guardian_ids','pc_msg_policy',p.payload->'pc_msg_policy',
  'pc_purchases',p.payload->'pc_purchases','pc_spend_limit_cents',p.payload->'pc_spend_limit_cents',
  'pc_follow_requests',p.payload->'pc_follow_requests'
))
from public.mcs_profiles p
where p.payload ?| array['email','birthdate','phone','legal_name','parent_code','guardian_ids','pc_msg_policy','pc_purchases','pc_spend_limit_cents','pc_follow_requests']
on conflict(pid) do update set private_payload=coalesce(public.mcs_profile_private.private_payload,'{}'::jsonb)||excluded.private_payload;

create or replace function public.mcs_scrub_profile_payload()
returns trigger language plpgsql security definer
set search_path to 'pg_catalog','public'
as $function$
declare v_dob date; v_age integer; v_band text;
begin
  if jsonb_typeof(coalesce(new.payload,'{}'::jsonb)) <> 'object' then new.payload := '{}'::jsonb; end if;
  new.payload := new.payload - array['email','birthdate','phone','legal_name','parent_code','guardian_ids','pc_msg_policy','pc_purchases','pc_spend_limit_cents','pc_follow_requests']::text[];
  select date_of_birth into v_dob from public.mcs_user_private where pid=new.id;
  if v_dob is null then v_band := 'unknown';
  else
    v_age := extract(year from age(current_date,v_dob))::integer;
    v_band := case when v_age<16 then 'under16' when v_age<18 then 'minor' else 'adult' end;
  end if;
  new.payload := jsonb_set(new.payload,'{age_band}',to_jsonb(v_band),true);
  return new;
end;
$function$;
drop trigger if exists mcs_profiles_scrub_private_payload on public.mcs_profiles;
create trigger mcs_profiles_scrub_private_payload before insert or update of payload on public.mcs_profiles for each row execute function public.mcs_scrub_profile_payload();

update public.mcs_profiles set payload=coalesce(payload,'{}'::jsonb)
where payload ?| array['email','birthdate','phone','legal_name','parent_code','guardian_ids','pc_msg_policy','pc_purchases','pc_spend_limit_cents','pc_follow_requests']
   or not (payload ? 'age_band');

create or replace function public.mcs_guard_date_of_birth_change()
returns trigger language plpgsql set search_path to 'pg_catalog','public'
as $function$
begin
  if old.date_of_birth is not null and new.date_of_birth is distinct from old.date_of_birth then
    raise exception 'date_of_birth cannot be changed directly; contact support' using errcode='42501';
  end if;
  return new;
end;
$function$;
drop trigger if exists mcs_user_private_guard_dob on public.mcs_user_private;
create trigger mcs_user_private_guard_dob before update of date_of_birth on public.mcs_user_private for each row execute function public.mcs_guard_date_of_birth_change();

create or replace function public.mcs_sync_profile_age_band()
returns trigger language plpgsql security definer set search_path to 'pg_catalog','public'
as $function$
begin
  if new.date_of_birth is distinct from old.date_of_birth then
    update public.mcs_profiles set payload=coalesce(payload,'{}'::jsonb) where id=new.pid;
  end if;
  return new;
end;
$function$;
drop trigger if exists mcs_user_private_sync_age_band on public.mcs_user_private;
create trigger mcs_user_private_sync_age_band after update of date_of_birth on public.mcs_user_private for each row execute function public.mcs_sync_profile_age_band();

update public.mcs_profiles
set payload=payload-array['email','birthdate','phone','legal_name','parent_code','guardian_ids','pc_msg_policy','pc_purchases','pc_spend_limit_cents','pc_follow_requests']::text[]
where payload ?| array['email','birthdate','phone','legal_name','parent_code','guardian_ids','pc_msg_policy','pc_purchases','pc_spend_limit_cents','pc_follow_requests'];

create table if not exists public.mcs_blocks (
  blocker_pid text not null references public.mcs_profiles(id) on delete cascade,
  blocked_pid text not null references public.mcs_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(blocker_pid,blocked_pid),
  constraint mcs_blocks_no_self check(blocker_pid<>blocked_pid)
);
create index if not exists mcs_blocks_blocked_pid_idx on public.mcs_blocks(blocked_pid,blocker_pid);
alter table public.mcs_blocks enable row level security;
revoke all on public.mcs_blocks from anon,authenticated;
grant select,insert,update,delete on public.mcs_blocks to authenticated;
drop policy if exists mcs_blocks_select_own on public.mcs_blocks;
create policy mcs_blocks_select_own on public.mcs_blocks for select to authenticated using(blocker_pid=public.mcs_current_pid());
drop policy if exists mcs_blocks_insert_own on public.mcs_blocks;
create policy mcs_blocks_insert_own on public.mcs_blocks for insert to authenticated with check(blocker_pid=public.mcs_current_pid() and blocked_pid<>public.mcs_current_pid());
drop policy if exists mcs_blocks_update_own on public.mcs_blocks;
create policy mcs_blocks_update_own on public.mcs_blocks for update to authenticated using(blocker_pid=public.mcs_current_pid()) with check(blocker_pid=public.mcs_current_pid() and blocked_pid<>public.mcs_current_pid());
drop policy if exists mcs_blocks_delete_own on public.mcs_blocks;
create policy mcs_blocks_delete_own on public.mcs_blocks for delete to authenticated using(blocker_pid=public.mcs_current_pid());

create or replace function public.mcs_can_view_conversation(p_convo_id text)
returns boolean language plpgsql stable security definer
set search_path to 'pg_catalog','public'
as $function$
declare v_me text:=public.mcs_current_pid(); v_members jsonb; v_peer text; v_me_dob date; v_peer_dob date; v_me_age integer; v_peer_age integer;
begin
  if v_me is null or p_convo_id is null then return false; end if;
  select members into v_members from public.mcs_convos where id=p_convo_id;
  if v_members is null or jsonb_typeof(v_members)<>'array' or jsonb_array_length(v_members)<>2
     or not (v_members @> jsonb_build_array(v_me)) then return false; end if;
  select peer.pid into v_peer from jsonb_array_elements_text(v_members) as peer(pid)
  where peer.pid<>v_me limit 1;
  if v_peer is null then return false; end if;
  if exists(select 1 from public.mcs_blocks b where (b.blocker_pid=v_me and b.blocked_pid=v_peer) or (b.blocker_pid=v_peer and b.blocked_pid=v_me)) then return false; end if;
  select date_of_birth into v_me_dob from public.mcs_user_private where pid=v_me;
  select date_of_birth into v_peer_dob from public.mcs_user_private where pid=v_peer;
  if v_me_dob is null or v_peer_dob is null then return false; end if;
  v_me_age:=extract(year from age(current_date,v_me_dob))::integer;
  v_peer_age:=extract(year from age(current_date,v_peer_dob))::integer;
  if (v_me_age<18) is distinct from (v_peer_age<18) then return false; end if;
  return true;
end;
$function$;

create or replace function public.mcs_can_message(p_target_pid text)
returns boolean language plpgsql stable security definer
set search_path to 'pg_catalog','public'
as $function$
declare v_me text:=public.mcs_current_pid(); v_me_dob date; v_target_dob date; v_me_age integer; v_target_age integer; v_me_policy text; v_target_policy text;
begin
  if v_me is null or p_target_pid is null or p_target_pid=v_me then return false; end if;
  -- Check friendship first so this RPC does not reveal age compatibility for arbitrary profiles.
  if not exists(select 1 from public.mcs_friendships f where least(f.a_pid,f.b_pid)=least(v_me,p_target_pid) and greatest(f.a_pid,f.b_pid)=greatest(v_me,p_target_pid)) then return false; end if;
  if exists(select 1 from public.mcs_blocks b where (b.blocker_pid=v_me and b.blocked_pid=p_target_pid) or (b.blocker_pid=p_target_pid and b.blocked_pid=v_me)) then return false; end if;
  select date_of_birth into v_me_dob from public.mcs_user_private where pid=v_me;
  select date_of_birth into v_target_dob from public.mcs_user_private where pid=p_target_pid;
  if v_me_dob is null or v_target_dob is null then return false; end if;
  v_me_age:=extract(year from age(current_date,v_me_dob))::integer;
  v_target_age:=extract(year from age(current_date,v_target_dob))::integer;
  if v_me_age<16 or v_target_age<16 or ((v_me_age<18) is distinct from (v_target_age<18)) then return false; end if;
  select coalesce(private_payload->>'pc_msg_policy','friends') into v_me_policy from public.mcs_profile_private where pid=v_me;
  select coalesce(private_payload->>'pc_msg_policy','friends') into v_target_policy from public.mcs_profile_private where pid=p_target_pid;
  if coalesce(v_me_policy,'friends')<>'friends' or coalesce(v_target_policy,'friends')<>'friends' then return false; end if;
  return true;
end;
$function$;
revoke all on function public.mcs_can_view_conversation(text) from public,anon;
revoke all on function public.mcs_can_message(text) from public,anon;
grant execute on function public.mcs_can_view_conversation(text) to authenticated;
grant execute on function public.mcs_can_message(text) to authenticated;

drop policy if exists mcs_convos_update_participant on public.mcs_convos;
drop policy if exists mcs_convos_insert_participant on public.mcs_convos;
create policy mcs_convos_insert_authorized on public.mcs_convos for insert to authenticated with check (
  jsonb_typeof(members)='array' and jsonb_array_length(members)=2
  and members @> jsonb_build_array(public.mcs_current_pid())
  and exists(select 1 from jsonb_array_elements_text(members) as peer(pid)
    where peer.pid<>public.mcs_current_pid() and public.mcs_can_message(peer.pid))
);
drop policy if exists mcs_convos_select_participant on public.mcs_convos;
create policy mcs_convos_select_participant on public.mcs_convos for select to authenticated using (
  members @> jsonb_build_array(public.mcs_current_pid())
  and exists(select 1 from jsonb_array_elements_text(members) as peer(pid)
    where peer.pid<>public.mcs_current_pid() and public.mcs_can_view_conversation(id))
);

drop policy if exists mcs_messages_select_participant on public.mcs_messages;
create policy mcs_messages_select_participant on public.mcs_messages for select to authenticated using (
  exists(select 1 from public.mcs_convos c where c.id=mcs_messages.convo_id
    and c.members @> jsonb_build_array(public.mcs_current_pid())
    and exists(select 1 from jsonb_array_elements_text(c.members) as peer(pid)
      where peer.pid<>public.mcs_current_pid() and public.mcs_can_view_conversation(c.id)))
);
drop policy if exists mcs_messages_insert_sender on public.mcs_messages;
create policy mcs_messages_insert_sender on public.mcs_messages for insert to authenticated with check (
  from_pid=public.mcs_current_pid()
  and exists(select 1 from public.mcs_convos c where c.id=mcs_messages.convo_id
    and c.members @> jsonb_build_array(public.mcs_current_pid())
    and exists(select 1 from jsonb_array_elements_text(c.members) as peer(pid)
      where peer.pid<>public.mcs_current_pid() and public.mcs_can_message(peer.pid)))
);
drop policy if exists mcs_messages_update_sender on public.mcs_messages;
create policy mcs_messages_update_sender on public.mcs_messages for update to authenticated using (
  from_pid=public.mcs_current_pid()
  and exists(select 1 from public.mcs_convos c where c.id=mcs_messages.convo_id
    and c.members @> jsonb_build_array(public.mcs_current_pid())
    and exists(select 1 from jsonb_array_elements_text(c.members) as peer(pid)
      where peer.pid<>public.mcs_current_pid() and public.mcs_can_view_conversation(c.id)))
) with check (
  from_pid=public.mcs_current_pid()
  and exists(select 1 from public.mcs_convos c where c.id=mcs_messages.convo_id
    and c.members @> jsonb_build_array(public.mcs_current_pid())
    and exists(select 1 from jsonb_array_elements_text(c.members) as peer(pid)
      where peer.pid<>public.mcs_current_pid() and public.mcs_can_view_conversation(c.id)))
);
drop policy if exists mcs_messages_delete_sender on public.mcs_messages;
create policy mcs_messages_delete_sender on public.mcs_messages for delete to authenticated using (
  from_pid=public.mcs_current_pid()
  and exists(select 1 from public.mcs_convos c where c.id=mcs_messages.convo_id
    and c.members @> jsonb_build_array(public.mcs_current_pid()))
);

create or replace function public.mcs_canonicalize_friendship()
returns trigger language plpgsql set search_path to 'pg_catalog','public'
as $function$
declare v_swap text;
begin
  if new.a_pid=new.b_pid then raise exception 'A profile cannot friend itself' using errcode='23514'; end if;
  if new.a_pid>new.b_pid then v_swap:=new.a_pid; new.a_pid:=new.b_pid; new.b_pid:=v_swap; end if;
  return new;
end;
$function$;
drop trigger if exists mcs_friendships_canonicalize on public.mcs_friendships;
create trigger mcs_friendships_canonicalize before insert or update of a_pid,b_pid on public.mcs_friendships for each row execute function public.mcs_canonicalize_friendship();
create unique index if not exists mcs_friendships_pair_unique on public.mcs_friendships(least(a_pid,b_pid),greatest(a_pid,b_pid));

drop policy if exists mcs_friendships_insert_involved on public.mcs_friendships;
create policy mcs_friendships_insert_accept_request on public.mcs_friendships for insert to authenticated with check (
  (a_pid=public.mcs_current_pid() or b_pid=public.mcs_current_pid())
  and exists(select 1 from public.mcs_friend_requests r
    where r.to_pid=public.mcs_current_pid() and r.from_pid<>public.mcs_current_pid()
      and least(r.from_pid,r.to_pid)=least(mcs_friendships.a_pid,mcs_friendships.b_pid)
      and greatest(r.from_pid,r.to_pid)=greatest(mcs_friendships.a_pid,mcs_friendships.b_pid))
);

create or replace function public.mcs_guard_social_endpoints()
returns trigger language plpgsql set search_path to 'pg_catalog','public'
as $function$
begin
  if new.from_pid is distinct from old.from_pid or new.to_pid is distinct from old.to_pid then
    raise exception 'Relationship endpoints cannot be changed' using errcode='42501';
  end if;
  return new;
end;
$function$;
drop trigger if exists mcs_follows_guard_endpoints on public.mcs_follows;
create trigger mcs_follows_guard_endpoints before update of from_pid,to_pid on public.mcs_follows for each row execute function public.mcs_guard_social_endpoints();
drop trigger if exists mcs_follow_requests_guard_endpoints on public.mcs_follow_requests;
create trigger mcs_follow_requests_guard_endpoints before update of from_pid,to_pid on public.mcs_follow_requests for each row execute function public.mcs_guard_social_endpoints();
drop trigger if exists mcs_friend_requests_guard_endpoints on public.mcs_friend_requests;
create trigger mcs_friend_requests_guard_endpoints before update of from_pid,to_pid on public.mcs_friend_requests for each row execute function public.mcs_guard_social_endpoints();

drop policy if exists mcs_follows_update_involved on public.mcs_follows;
create policy mcs_follows_update_recipient on public.mcs_follows for update to authenticated using(to_pid=public.mcs_current_pid()) with check(to_pid=public.mcs_current_pid());
drop policy if exists mcs_follow_requests_update_involved on public.mcs_follow_requests;
create policy mcs_follow_requests_update_recipient on public.mcs_follow_requests for update to authenticated using(to_pid=public.mcs_current_pid()) with check(to_pid=public.mcs_current_pid());
drop policy if exists mcs_friend_requests_update_involved on public.mcs_friend_requests;
create policy mcs_friend_requests_update_recipient on public.mcs_friend_requests for update to authenticated using(to_pid=public.mcs_current_pid()) with check(to_pid=public.mcs_current_pid());

drop policy if exists mcs_follows_insert_own on public.mcs_follows;
create policy mcs_follows_insert_own on public.mcs_follows for insert to authenticated with check(
  from_pid=public.mcs_current_pid() and to_pid<>public.mcs_current_pid()
  and not exists(select 1 from public.mcs_blocks b where
    (b.blocker_pid=from_pid and b.blocked_pid=to_pid) or (b.blocker_pid=to_pid and b.blocked_pid=from_pid))
);
drop policy if exists mcs_follow_requests_insert_own on public.mcs_follow_requests;
create policy mcs_follow_requests_insert_own on public.mcs_follow_requests for insert to authenticated with check(
  from_pid=public.mcs_current_pid() and to_pid<>public.mcs_current_pid()
  and not exists(select 1 from public.mcs_blocks b where
    (b.blocker_pid=from_pid and b.blocked_pid=to_pid) or (b.blocker_pid=to_pid and b.blocked_pid=from_pid))
);
drop policy if exists mcs_friend_requests_insert_own on public.mcs_friend_requests;
create policy mcs_friend_requests_insert_own on public.mcs_friend_requests for insert to authenticated with check(
  from_pid=public.mcs_current_pid() and to_pid<>public.mcs_current_pid()
  and not exists(select 1 from public.mcs_blocks b where
    (b.blocker_pid=from_pid and b.blocked_pid=to_pid) or (b.blocker_pid=to_pid and b.blocked_pid=from_pid))
);

create or replace function public.mcs_on_block()
returns trigger language plpgsql security definer
set search_path to 'pg_catalog','public'
as $function$
begin
  delete from public.mcs_follows
    where (from_pid=new.blocker_pid and to_pid=new.blocked_pid)
       or (from_pid=new.blocked_pid and to_pid=new.blocker_pid);
  delete from public.mcs_follow_requests
    where (from_pid=new.blocker_pid and to_pid=new.blocked_pid)
       or (from_pid=new.blocked_pid and to_pid=new.blocker_pid);
  delete from public.mcs_friend_requests
    where (from_pid=new.blocker_pid and to_pid=new.blocked_pid)
       or (from_pid=new.blocked_pid and to_pid=new.blocker_pid);
  delete from public.mcs_friendships
    where least(a_pid,b_pid)=least(new.blocker_pid,new.blocked_pid)
      and greatest(a_pid,b_pid)=greatest(new.blocker_pid,new.blocked_pid);
  return new;
end;
$function$;
drop trigger if exists mcs_blocks_cleanup_relationships on public.mcs_blocks;
create trigger mcs_blocks_cleanup_relationships after insert on public.mcs_blocks
for each row execute function public.mcs_on_block();
revoke all on function public.mcs_on_block() from public,anon,authenticated;

create table if not exists public.mcs_reports (
  id text primary key,
  reporter_pid text not null references public.mcs_profiles(id) on delete cascade,
  reported_pid text references public.mcs_profiles(id) on delete set null,
  target_type text not null,
  target_id text not null,
  reason text not null,
  details text,
  status text not null default 'open',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists mcs_reports_reporter_created_idx on public.mcs_reports(reporter_pid,created_at desc);
create index if not exists mcs_reports_target_idx on public.mcs_reports(reported_pid,created_at desc);
alter table public.mcs_reports enable row level security;
revoke all on public.mcs_reports from anon,authenticated;
grant select,insert on public.mcs_reports to authenticated;
drop policy if exists mcs_reports_select_own on public.mcs_reports;
create policy mcs_reports_select_own on public.mcs_reports for select to authenticated using(reporter_pid=public.mcs_current_pid());
drop policy if exists mcs_reports_insert_own on public.mcs_reports;
create policy mcs_reports_insert_own on public.mcs_reports for insert to authenticated with check(reporter_pid=public.mcs_current_pid() and (reported_pid is null or reported_pid<>public.mcs_current_pid()) and status='open');

create or replace function public.mcs_current_pid()
returns text language sql stable security invoker
set search_path to 'pg_catalog','public'
as $function$
  select pid from public.mcs_account_links where auth_user_id=auth.uid()
$function$;
revoke all on function public.mcs_current_pid() from public,anon;
grant execute on function public.mcs_current_pid() to authenticated;
revoke all on function public.mcs_handle_new_user() from public,anon,authenticated;
revoke all on function public.mcs_scrub_profile_payload() from public,anon,authenticated;
revoke all on function public.mcs_guard_date_of_birth_change() from public,anon,authenticated;
revoke all on function public.mcs_sync_profile_age_band() from public,anon,authenticated;
revoke all on function public.mcs_canonicalize_friendship() from public,anon,authenticated;
revoke all on function public.mcs_guard_social_endpoints() from public,anon,authenticated;
revoke all on function public.mcs_touch_updated_at() from public,anon,authenticated;
revoke all on function public.mcs_lock_profile_tier() from public,anon,authenticated;
alter function public.mcs_handle_new_user() set search_path to 'pg_catalog','public';
alter function public.mcs_touch_updated_at() set search_path to 'pg_catalog','public';
alter function public.mcs_lock_profile_tier() set search_path to 'pg_catalog','public';

commit;

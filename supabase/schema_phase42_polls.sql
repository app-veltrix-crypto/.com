-- Phase 42 · polls in chat (run once in the Supabase SQL editor)
-- Adds two functions used by the paperclip → Poll option:
--   chat_send_real_poll : delivers a poll to another real user
--   chat_vote_real_poll : copies your vote onto the other person's copy of the poll
-- Nothing existing is changed.

create or replace function public.chat_send_real_poll(p_to uuid, p_id text, p_poll jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid(); nm text; un text; ph text; cid text; mid text; dis boolean;
  t bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  q text := btrim(coalesce(p_poll->>'q','')); opts jsonb; d jsonb;
  sender_admin boolean; target_admin boolean;
begin
  if me is null or not public.session_ok() then raise exception 'session revoked'; end if;
  if p_to is null or p_to = me or coalesce(p_id,'') = '' or q = '' or length(q) > 255
     or jsonb_typeof(p_poll->'opts') <> 'array'
     or jsonb_array_length(p_poll->'opts') not between 2 and 12 then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', 'o' || n, 't', left(btrim(o->>'t'), 100)) order by n), '[]'::jsonb)
    into opts
    from jsonb_array_elements(p_poll->'opts') with ordinality as x(o, n)
   where btrim(coalesce(o->>'t','')) <> '';
  if jsonb_array_length(opts) < 2 then return jsonb_build_object('ok', false, 'reason', 'invalid'); end if;
  select coalesce(is_admin,false) into sender_admin from public.profiles where id = me;
  select coalesce(is_admin,false) into target_admin from public.profiles where id = p_to;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if coalesce(sender_admin,false) and coalesce(target_admin,false) then
    return jsonb_build_object('ok', false, 'reason', 'not_allowed');
  end if;
  select coalesce(nullif(btrim(full_name),''),'Veltrix user'), coalesce(profile_username,''),
         case when length(coalesce(profile_image,'')) < 120000 then coalesce(profile_image,'') else '' end
    into nm, un, ph from public.profiles where id = me;
  cid := 'real-' || me::text;
  select coalesce((select (data->>'disappear')::boolean from public.conversations where user_id = me and contact_id = 'real-' || p_to::text), false)
      or coalesce((select (data->>'disappear')::boolean from public.conversations where user_id = p_to and contact_id = cid), false)
    into dis;
  mid := 'rx-' || left(p_id, 40) || '-' || substr(md5(me::text), 1, 6);
  d := jsonb_build_object(
         'id', mid, 'from', 'them', 't', t, 'type', 'poll',
         'text', left('📊 ' || q, 4000),
         'poll', jsonb_build_object('q', q, 'opts', opts, 'multi', coalesce((p_poll->>'multi')::boolean, false)),
         'votes', jsonb_build_object('me', '[]'::jsonb, 'them', '[]'::jsonb),
         'mediaOwner', me::text, 'mediaId', p_id)
       || case when dis then jsonb_build_object('exp', t + 86400000) else '{}'::jsonb end;
  perform set_config('veltrix.real_chat', '1', true);
  insert into public.conversations(user_id, contact_id, data)
  values (p_to, cid, jsonb_strip_nulls(jsonb_build_object('name', nm, 'username', nullif(un,''), 'photo', nullif(ph,''))) || case when dis then jsonb_build_object('disappear', true) else '{}'::jsonb end)
  on conflict (user_id, contact_id) do update
    set data = public.conversations.data
               || jsonb_strip_nulls(jsonb_build_object('name', nm, 'username', nullif(un,''), 'photo', nullif(ph,''))) || case when dis then jsonb_build_object('disappear', true) else '{}'::jsonb end;
  insert into public.messages(id, user_id, contact_id, t, data) values (mid, p_to, cid, t, d)
  on conflict (id) do nothing;
  return jsonb_build_object('ok', true, 'id', mid);
end $$;
revoke execute on function public.chat_send_real_poll(uuid,text,jsonb) from public, anon;
grant  execute on function public.chat_send_real_poll(uuid,text,jsonb) to authenticated;

-- p_from_me = true : you voted on a poll YOU sent (p_id = your message id)
-- p_from_me = false: you voted on a poll you RECEIVED (p_id = the sender's original message id)
create or replace function public.chat_vote_real_poll(p_to uuid, p_id text, p_from_me boolean, p_votes jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); tid text; n integer; v jsonb;
begin
  if me is null or not public.session_ok() then raise exception 'session revoked'; end if;
  if p_to is null or p_to = me or coalesce(p_id,'') = '' or jsonb_typeof(p_votes) is distinct from 'array' or jsonb_array_length(p_votes) > 12 then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v from jsonb_array_elements_text(p_votes) x where x ~ '^o[0-9]{1,2}$';
  tid := case when p_from_me then 'rx-' || left(p_id, 40) || '-' || substr(md5(me::text), 1, 6) else p_id end;
  perform set_config('veltrix.real_chat', '1', true);
  update public.messages
     set data = jsonb_set(data, '{votes}', coalesce(data->'votes', '{}'::jsonb) || jsonb_build_object('them', v))
   where id = tid and user_id = p_to and contact_id = 'real-' || me::text and data->>'type' = 'poll';
  get diagnostics n = row_count;
  return jsonb_build_object('ok', n > 0);
end $$;
revoke execute on function public.chat_vote_real_poll(uuid,text,boolean,jsonb) from public, anon;
grant  execute on function public.chat_vote_real_poll(uuid,text,boolean,jsonb) to authenticated;

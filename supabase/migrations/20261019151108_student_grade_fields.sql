begin;
alter table public.contact_messages add column role text not null default '' check(role in ('','Speaker','Teacher','Student','Parent'));
alter table public.contact_messages add column grade smallint check(grade between 1 and 12);
alter table public.contact_messages add constraint contact_grade_matches_role check((role='Student' and grade is not null) or (role<>'Student' and grade is null));
update public.event_settings set form_fields=(select jsonb_agg(case when item->>'key'='role' then item||'{"options":["Speaker","Teacher","Student","Parent"],"required":true,"enabled":true}'::jsonb when item->>'key'='grade' then item||'{"type":"range","options":[],"required":true,"enabled":true}'::jsonb else item end order by ord) from jsonb_array_elements(form_fields) with ordinality as entries(item,ord)),version=version+1 where id=1;
create or replace function private.validate_answers(p_fields jsonb,p_answers jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare f jsonb; v text;
begin
 if jsonb_typeof(p_answers)<>'object' or length(p_answers::text)>40000 then raise exception 'INVALID_FORM'; end if;
 for f in select value from jsonb_array_elements(p_fields) loop
  if coalesce((f->>'enabled')::boolean,false) then
   if f->>'key'='grade' and lower(coalesce(p_answers->>'role',''))<>'student' then continue; end if;
   if p_answers ? (f->>'key') and jsonb_typeof(p_answers->(f->>'key'))<>'string' then raise exception 'INVALID_FORM'; end if;
   v:=btrim(coalesce(p_answers->>(f->>'key'),''));
   if coalesce((f->>'required')::boolean,false) and v='' then raise exception 'REQUIRED_FIELD'; end if;
   if length(v)>(case when f->>'type'='textarea' then 4000 else 320 end) then raise exception 'INVALID_FORM'; end if;
   if v<>'' and f->>'type'='range' and v!~'^Grade ([1-9]|1[0-2])$' then raise exception 'INVALID_GRADE'; end if;
   if v<>'' and f->>'type'='select' and not exists(select 1 from jsonb_array_elements_text(f->'options') o where o=v) then raise exception 'INVALID_OPTION'; end if;
   if v<>'' and f->>'type'='email' and v!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'INVALID_EMAIL'; end if;
   if v<>'' and f->>'type'='tel' and v!~'^\+?[0-9 ().-]{7,30}$' then raise exception 'INVALID_PHONE'; end if;
  end if;
 end loop;
 if length(btrim(coalesce(p_answers->>'name','')))<2 or btrim(coalesce(p_answers->>'email',''))='' then raise exception 'REQUIRED_FIELD'; end if;
end $$;

create or replace function public.save_event_settings(p_actor uuid,p_settings jsonb) returns integer language plpgsql security invoker set search_path='' as $$
declare cfg public.event_settings; fields jsonb; f jsonb;
begin
 perform private.assert_admin(p_actor);
 select * into cfg from public.event_settings where id=1 for update;
 if cfg.version<>(p_settings->>'version')::integer then raise exception 'SETTINGS_CONFLICT'; end if;
 fields:=p_settings->'fields';
 if jsonb_typeof(fields)<>'array' or jsonb_array_length(fields) not between 5 and 25 then raise exception 'INVALID_FIELDS'; end if;
 if (select count(distinct value->>'key') from jsonb_array_elements(fields))<>jsonb_array_length(fields) then raise exception 'INVALID_FIELDS'; end if;
 for f in select value from jsonb_array_elements(fields) loop
  if f->>'key'!~'^[a-z][a-z0-9_]{0,39}$' or f->>'type' not in ('text','email','tel','select','textarea','range') or length(f->>'label') not between 1 and 100 then raise exception 'INVALID_FIELDS'; end if;
 end loop;
 if exists(select 1 from unnest(array['name','email','phone','role','grade']) k where not exists(select 1 from jsonb_array_elements(fields) item where item->>'key'=k)) then raise exception 'INVALID_FIELDS'; end if;
 if exists(select 1 from jsonb_array_elements(fields) item where item->>'key' in ('name','email') and (not (item->>'enabled')::boolean or not (item->>'required')::boolean)) then raise exception 'INVALID_FIELDS'; end if;
 if (p_settings->>'maxSeats')::integer<cfg.registered_count then raise exception 'CAPACITY_BELOW_REGISTRATIONS'; end if;
 update public.event_settings set event_name=p_settings->>'eventName',date_label=p_settings->>'date',time_label=p_settings->>'time',venue=p_settings->>'venue',location=p_settings->>'location',max_seats=(p_settings->>'maxSeats')::integer,registration_open=(p_settings->>'registrationOpen')::boolean,form_fields=fields,content=p_settings->'content',version=version+1,updated_at=now() where id=1 returning * into cfg;
 insert into public.admin_audit(actor_id,action,details) values(p_actor,'settings.updated',jsonb_build_object('version',cfg.version,'maxSeats',cfg.max_seats,'registrationOpen',cfg.registration_open));
 return cfg.version;
end $$;


commit;

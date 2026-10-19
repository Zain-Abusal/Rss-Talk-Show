begin;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table public.admin_sessions (
 id uuid primary key, expires_at timestamptz not null, revoked_at timestamptz,
 created_at timestamptz not null default now()
);
create table public.event_settings (
 id smallint primary key default 1 check(id=1),
 event_name text not null default 'RSS Talk Show' check(length(event_name) between 1 and 100),
 date_label text not null default 'To be announced', time_label text not null default 'To be confirmed',
 venue text not null default 'Venue to be announced', location text not null default 'Details coming soon',
 max_seats integer not null default 50 check(max_seats between 0 and 100000),
 registered_count integer not null default 0 check(registered_count>=0 and registered_count<=max_seats),
 registration_open boolean not null default false,
 form_fields jsonb not null default '[]'::jsonb check(jsonb_typeof(form_fields)='array'),
 content jsonb not null default '{}'::jsonb check(jsonb_typeof(content)='object'),
 version integer not null default 1 check(version>0), updated_at timestamptz not null default now()
);
create table public.tickets (
 id uuid primary key default gen_random_uuid(),
 ticket_number text not null unique default ('RSS-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,16))),
 qr_token text not null unique default encode(extensions.gen_random_bytes(32),'hex') check(qr_token ~ '^[a-f0-9]{64}$'),
 request_id uuid not null unique,
 name text not null check(length(name) between 2 and 320),
 email text not null check(length(email)<=320 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 phone text not null default '', role text not null default '', grade text not null default '',
 answers jsonb not null check(jsonb_typeof(answers)='object'),
 status text not null default 'registered' check(status in ('registered','checked_in','cancelled')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 checked_in_at timestamptz, checked_in_by uuid references public.admin_sessions(id) on delete set null,
 check(status<>'checked_in' or checked_in_at is not null)
);
create unique index tickets_active_email on public.tickets(lower(email)) where status<>'cancelled';
create index tickets_created_at on public.tickets(created_at desc);
create index tickets_status_created on public.tickets(status,created_at desc);
create index tickets_checked_in_by on public.tickets(checked_in_by) where checked_in_by is not null;
create table public.admin_audit (
 id uuid primary key default gen_random_uuid(), actor_id uuid references public.admin_sessions(id) on delete set null,
 action text not null, ticket_id uuid references public.tickets(id) on delete set null,
 details jsonb not null default '{}', created_at timestamptz not null default now()
);
create index admin_audit_created on public.admin_audit(created_at desc);
create index admin_audit_actor on public.admin_audit(actor_id);
create index admin_audit_ticket on public.admin_audit(ticket_id) where ticket_id is not null;
create table public.contact_messages (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 150),
 email text not null check(length(email)<=320), question text not null check(length(question) between 10 and 4000),
 status text not null default 'new' check(status in ('new','read','resolved')), created_at timestamptz not null default now()
);
create index contact_messages_created on public.contact_messages(created_at desc);
create table private.request_limits (
 key text primary key, window_started timestamptz not null default now(), hits integer not null default 1
);
create index request_limits_window on private.request_limits(window_started);

alter table public.admin_sessions enable row level security;
alter table public.event_settings enable row level security;
alter table public.tickets enable row level security;
alter table public.admin_audit enable row level security;
alter table public.contact_messages enable row level security;
alter table private.request_limits enable row level security;
-- No anonymous/authenticated policies: all data access goes through authorized server handlers.
revoke all on public.admin_sessions,public.event_settings,public.tickets,public.admin_audit,public.contact_messages from public,anon,authenticated;
grant all on public.admin_sessions,public.event_settings,public.tickets,public.admin_audit,public.contact_messages,private.request_limits to service_role;

create function private.assert_admin(p_actor uuid) returns void language plpgsql security invoker set search_path='' as $$
begin
 if p_actor is null or not exists(select 1 from public.admin_sessions where id=p_actor and revoked_at is null and expires_at>now()) then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
end $$;

create function private.validate_answers(p_fields jsonb,p_answers jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare f jsonb; v text;
begin
 if jsonb_typeof(p_answers)<>'object' or length(p_answers::text)>40000 then raise exception 'INVALID_FORM'; end if;
 for f in select value from jsonb_array_elements(p_fields) loop
  if coalesce((f->>'enabled')::boolean,false) then
   if p_answers ? (f->>'key') and jsonb_typeof(p_answers->(f->>'key'))<>'string' then raise exception 'INVALID_FORM'; end if;
   v:=btrim(coalesce(p_answers->>(f->>'key'),''));
   if coalesce((f->>'required')::boolean,false) and v='' then raise exception 'REQUIRED_FIELD'; end if;
   if length(v)>(case when f->>'type'='textarea' then 4000 else 320 end) then raise exception 'INVALID_FORM'; end if;
   if v<>'' and f->>'type'='select' and not exists(select 1 from jsonb_array_elements_text(f->'options') o where o=v) then raise exception 'INVALID_OPTION'; end if;
   if v<>'' and f->>'type'='email' and v!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'INVALID_EMAIL'; end if;
   if v<>'' and f->>'type'='tel' and v!~'^\+?[0-9 ().-]{7,30}$' then raise exception 'INVALID_PHONE'; end if;
  end if;
 end loop;
 if length(btrim(coalesce(p_answers->>'name','')))<2 or btrim(coalesce(p_answers->>'email',''))='' then raise exception 'REQUIRED_FIELD'; end if;
end $$;

create function private.enforce_capacity() returns trigger language plpgsql security invoker set search_path='' as $$
declare delta integer:=0;
begin
 if TG_OP='INSERT' then delta:=case when NEW.status<>'cancelled' then 1 else 0 end;
 elsif TG_OP='DELETE' then delta:=case when OLD.status<>'cancelled' then -1 else 0 end;
 else delta:=(case when NEW.status<>'cancelled' then 1 else 0 end)-(case when OLD.status<>'cancelled' then 1 else 0 end);
 end if;
 if delta<>0 then
  update public.event_settings set registered_count=registered_count+delta where id=1 and registered_count+delta between 0 and max_seats;
  if not found then raise exception 'SOLD_OUT'; end if;
 end if;
 if TG_OP='DELETE' then return OLD; end if;
 NEW.updated_at:=now();return NEW;
end $$;
create trigger tickets_capacity before insert or update of status or delete on public.tickets for each row execute function private.enforce_capacity();

create function public.register_ticket(p_request_id uuid,p_answers jsonb,p_form_version integer) returns jsonb language plpgsql security invoker set search_path='' set lock_timeout='5s' as $$
declare cfg public.event_settings; t public.tickets;
begin
 select * into cfg from public.event_settings where id=1 for update;
 select * into t from public.tickets where request_id=p_request_id;
 if found then
  if t.answers<>p_answers then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  return to_jsonb(t);
 end if;
 if cfg.version<>p_form_version then raise exception 'FORM_CHANGED'; end if;
 if not cfg.registration_open then raise exception 'REGISTRATION_CLOSED'; end if;
 if cfg.registered_count>=cfg.max_seats then raise exception 'SOLD_OUT'; end if;
 perform private.validate_answers(cfg.form_fields,p_answers);
 insert into public.tickets(request_id,name,email,phone,role,grade,answers)
 values(p_request_id,btrim(p_answers->>'name'),lower(btrim(p_answers->>'email')),coalesce(p_answers->>'phone',''),coalesce(p_answers->>'role',''),coalesce(p_answers->>'grade',''),p_answers) returning * into t;
 return to_jsonb(t);
end $$;

create function public.save_event_settings(p_actor uuid,p_settings jsonb) returns integer language plpgsql security invoker set search_path='' as $$
declare cfg public.event_settings; fields jsonb; f jsonb;
begin
 perform private.assert_admin(p_actor);
 select * into cfg from public.event_settings where id=1 for update;
 if cfg.version<>(p_settings->>'version')::integer then raise exception 'SETTINGS_CONFLICT'; end if;
 fields:=p_settings->'fields';
 if jsonb_typeof(fields)<>'array' or jsonb_array_length(fields) not between 5 and 25 then raise exception 'INVALID_FIELDS'; end if;
 if (select count(distinct value->>'key') from jsonb_array_elements(fields))<>jsonb_array_length(fields) then raise exception 'INVALID_FIELDS'; end if;
 for f in select value from jsonb_array_elements(fields) loop
  if f->>'key'!~'^[a-z][a-z0-9_]{0,39}$' or f->>'type' not in ('text','email','tel','select','textarea') or length(f->>'label') not between 1 and 100 then raise exception 'INVALID_FIELDS'; end if;
 end loop;
 if exists(select 1 from unnest(array['name','email','phone','role','grade']) k where not exists(select 1 from jsonb_array_elements(fields) item where item->>'key'=k)) then raise exception 'INVALID_FIELDS'; end if;
 if exists(select 1 from jsonb_array_elements(fields) item where item->>'key' in ('name','email') and (not (item->>'enabled')::boolean or not (item->>'required')::boolean)) then raise exception 'INVALID_FIELDS'; end if;
 if (p_settings->>'maxSeats')::integer<cfg.registered_count then raise exception 'CAPACITY_BELOW_REGISTRATIONS'; end if;
 update public.event_settings set event_name=p_settings->>'eventName',date_label=p_settings->>'date',time_label=p_settings->>'time',venue=p_settings->>'venue',location=p_settings->>'location',max_seats=(p_settings->>'maxSeats')::integer,registration_open=(p_settings->>'registrationOpen')::boolean,form_fields=fields,content=p_settings->'content',version=version+1,updated_at=now() where id=1 returning * into cfg;
 insert into public.admin_audit(actor_id,action,details) values(p_actor,'settings.updated',jsonb_build_object('version',cfg.version,'maxSeats',cfg.max_seats,'registrationOpen',cfg.registration_open));
 return cfg.version;
end $$;

create function public.admin_update_ticket(p_actor uuid,p_id uuid,p_values jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare t public.tickets; cfg public.event_settings;
begin
 perform private.assert_admin(p_actor);
 -- Lock order matches registration: event row before ticket row.
 select * into cfg from public.event_settings where id=1 for update;
 select * into t from public.tickets where id=p_id for update;
 if not found then raise exception 'TICKET_NOT_FOUND'; end if;
 -- Hiding/removing a form field must not erase previously collected answers.
 p_values:=jsonb_set(p_values,'{answers}',t.answers||(p_values->'answers'));
 perform private.validate_answers(cfg.form_fields,p_values->'answers');
 if p_values->>'status' not in ('registered','checked_in','cancelled') then raise exception 'INVALID_STATUS'; end if;
 if p_values->>'status'='checked_in' and t.status<>'checked_in' then raise exception 'USE_CHECK_IN'; end if;
 update public.tickets set name=btrim(p_values->'answers'->>'name'),email=lower(btrim(p_values->'answers'->>'email')),phone=coalesce(p_values->'answers'->>'phone',''),role=coalesce(p_values->'answers'->>'role',''),grade=coalesce(p_values->'answers'->>'grade',''),answers=p_values->'answers',status=p_values->>'status',checked_in_at=case when p_values->>'status'='checked_in' then checked_in_at else null end,checked_in_by=case when p_values->>'status'='checked_in' then checked_in_by else null end,updated_at=now() where id=p_id returning * into t;
 insert into public.admin_audit(actor_id,action,ticket_id,details) values(p_actor,'ticket.updated',t.id,jsonb_build_object('status',t.status));
 return to_jsonb(t)-'qr_token'-'request_id';
end $$;

create function public.validate_ticket(p_actor uuid,p_code text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare t public.tickets; result text;
begin
 perform private.assert_admin(p_actor);
 update public.tickets set status='checked_in',checked_in_at=now(),checked_in_by=p_actor where (qr_token=p_code or ticket_number=p_code) and status='registered' returning * into t;
 if found then result:='checked_in';
 else
  select * into t from public.tickets where qr_token=p_code or ticket_number=p_code;
  result:=case when not found then 'invalid' when t.status='cancelled' then 'cancelled' else 'already_checked_in' end;
 end if;
 insert into public.admin_audit(actor_id,action,ticket_id,details) values(p_actor,'ticket.scan',t.id,jsonb_build_object('result',result));
 return jsonb_build_object('result',result,'ticket',case when t.id is null then null else jsonb_build_object('id',t.id,'ticketNumber',t.ticket_number,'name',t.name,'role',t.role,'grade',t.grade,'checkedInAt',t.checked_in_at) end);
end $$;

create function public.consume_rate_limit(p_key text,p_limit integer,p_window_seconds integer) returns boolean language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 if length(p_key)>128 or p_limit not between 1 and 10000 or p_window_seconds not between 1 and 86400 then raise exception 'INVALID_LIMIT'; end if;
 insert into private.request_limits(key) values(p_key) on conflict(key) do update set hits=case when private.request_limits.window_started<now()-make_interval(secs=>p_window_seconds) then 1 else private.request_limits.hits+1 end,window_started=case when private.request_limits.window_started<now()-make_interval(secs=>p_window_seconds) then now() else private.request_limits.window_started end returning hits into n;
 delete from private.request_limits where window_started<now()-interval '2 days';
 return n<=p_limit;
end $$;

revoke all on all functions in schema private from public,anon,authenticated;
grant execute on all functions in schema private to service_role;
revoke all on function public.register_ticket(uuid,jsonb,integer),public.save_event_settings(uuid,jsonb),public.admin_update_ticket(uuid,uuid,jsonb),public.validate_ticket(uuid,text),public.consume_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.register_ticket(uuid,jsonb,integer),public.save_event_settings(uuid,jsonb),public.admin_update_ticket(uuid,uuid,jsonb),public.validate_ticket(uuid,text),public.consume_rate_limit(text,integer,integer) to service_role;
insert into public.event_settings(id,form_fields,content) values(1,'[{"key":"name","label":"Full name","type":"text","required":true,"enabled":true,"placeholder":"Your full name","options":[]},{"key":"email","label":"Email address","type":"email","required":true,"enabled":true,"placeholder":"you@example.com","options":[]},{"key":"phone","label":"Phone number","type":"tel","required":true,"enabled":true,"placeholder":"+971 50 123 4567","options":[]},{"key":"role","label":"Role","type":"select","required":true,"enabled":true,"placeholder":"Select your role","options":["Student","Parent","Staff","Guest"]},{"key":"grade","label":"Grade","type":"select","required":true,"enabled":true,"placeholder":"Select your grade","options":["Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12","Not applicable"]}]'::jsonb,'{"home":{"title":"Every Voice\nHas a Story","description":"A platform for meaningful conversations, new perspectives, and ideas that matter.","exploreLabel":"Explore the Show","ticketsLabel":"Get Tickets","teamTitle":"Meet the Team"},"about":{"title":"What Is RSS Talk?","description":"RSS Talk is a school-organized talk show designed to bring together students, experts and changemakers for meaningful conversations. It aims to create a space where ideas are shared, perspectives are explored and every voice is heard.","hostTitle":"Who Is This Hosted By?","hostDescription":"RSS Talk is proudly hosted by our school’s media team, in collaboration with the student council and faculty, to create an engaging and impactful event for the school community.","expectTitle":"What Can You Expect?","whyTitle":"Why Join Us?","whyDescription":"Because great conversations inspire change. RSS Talk gives you the chance to learn from different voices, gain new insights and be part of a community that values open dialogue and fresh ideas.","schedule":[{"title":"Opening Remarks","time":"Time TBC"},{"title":"Guest Discussion","time":"Time TBC"},{"title":"Audience Q&A","time":"Time TBC"},{"title":"Closing Remarks","time":"Time TBC"}]},"tickets":{"title":"Be Part of the\nConversation","description":"Join us for an inspiring talk show filled with meaningful discussions, new ideas and fresh perspectives. Secure your spot today!","ctaTitle":"Get Your Ticket","ctaDescription":"Reserve your place and download your personal QR ticket after registration.","registerLabel":"Register Now"},"contact":{"title":"Questions? Let’s Talk","description":"Have a question about the event, tickets or anything else? Get in touch. We’re here to help!","nameLabel":"Name","emailLabel":"Email","questionLabel":"Your Question","submitLabel":"Send Message","faqs":[{"question":"How can I register for the event?","answer":"Visit Tickets and choose Register Now. When registration is open, complete the form and save your personal QR ticket."},{"question":"Is there an age limit to attend?","answer":"Attendance guidelines will be shared once confirmed by the event team."},{"question":"Will there be seating available?","answer":"Registration closes automatically when the configured seat limit is reached."},{"question":"How will I receive my ticket?","answer":"Your ticket is available immediately after registration. Download or save the ticket page. Email delivery is not currently provided."}]},"register":{"title":"Your place in the conversation","description":"Complete your details to reserve a seat at RSS Talk Show.","submitLabel":"Reserve my seat"},"thankYou":{"title":"Thank you for registering","description":"Your seat is reserved. Save your personal ticket and present its QR code at the entrance.","nextTitle":"Keep your ticket ready","nextDescription":"Download your ticket or save its private link. Each ticket can be checked in once. Contact the event team if you need to update your details."},"team":[{"name":"Team Member 1","role":"Media Team"},{"name":"Team Member 2","role":"Media Team"},{"name":"Team Member 3","role":"Media Team"}],"registrationFaqs":[{"question":"Does this form reserve a real seat?","answer":"When registration is open, a successful registration reserves one seat and creates a personal QR ticket."},{"question":"When and where is the show?","answer":"The event date, time and venue are shown above and will be updated by the event team."},{"question":"What happens when all seats are taken?","answer":"The registration form closes automatically. Cancelled tickets release their seats, and the team can update capacity."}],"footer":"RSS Talk Show · Every voice has a story."}'::jsonb);
commit;

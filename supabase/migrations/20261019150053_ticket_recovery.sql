begin;
-- The API rate-limits both source IP and email. Neither role can call this directly.
create function public.recover_ticket(p_email text,p_phone text) returns text
language sql stable security invoker set search_path='' as $$
 select qr_token from public.tickets
 where lower(email)=lower(btrim(p_email)) and status<>'cancelled'
 and length(regexp_replace(p_phone,'[^0-9]','','g')) between 7 and 30
 and regexp_replace(phone,'[^0-9]','','g')=regexp_replace(p_phone,'[^0-9]','','g')
 limit 1;
$$;
revoke all on function public.recover_ticket(text,text) from public,anon,authenticated;
grant execute on function public.recover_ticket(text,text) to service_role;
update public.event_settings set content=content||'{"recover":{"title":"Find your ticket","description":"Enter the email address and phone number you used to register. We’ll show your original ticket and QR code.","submitLabel":"Find my ticket"}}'::jsonb;
commit;

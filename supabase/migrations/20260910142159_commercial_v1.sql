create extension if not exists btree_gist;

create type public.profile_role as enum ('owner','barber','receptionist','platform_admin');
create type public.appointment_status as enum ('scheduled','confirmed','completed','cancelled','no_show');
create type public.cash_type as enum ('income','expense');
create type public.reminder_type as enum ('birthday','return','appointment');
create type public.reminder_status as enum ('pending','sent','dismissed');
create type public.subscription_status as enum ('trial','active','overdue','suspended','cancelled');

create table public.barbershops (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
  logo_url text, phone text, address text, instagram text, whatsapp_message text,
  opening_time time not null default '09:00', closing_time time not null default '19:00',
  break_start time, break_end time, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint barbershops_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint barbershops_hours_valid check (opening_time < closing_time),
  constraint barbershops_break_valid check (break_start is null or break_end is null or break_start < break_end)
);
create table public.profiles (
  id uuid primary key default gen_random_uuid(), auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  barbershop_id uuid references public.barbershops(id) on delete cascade, name text not null,
  role public.profile_role not null default 'barber', active boolean not null default true, created_at timestamptz not null default now(),
  constraint profiles_platform_scope check ((role='platform_admin' and barbershop_id is null) or (role<>'platform_admin' and barbershop_id is not null))
);
create table public.professionals (
  id uuid primary key default gen_random_uuid(), barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null, name text not null, phone text, active boolean not null default true,
  created_at timestamptz not null default now(), unique(barbershop_id,id)
);
create table public.services (
  id uuid primary key default gen_random_uuid(), barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  name text not null, description text, duration_minutes integer not null, price numeric(12,2) not null,
  active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint services_duration_valid check (duration_minutes between 5 and 720), constraint services_price_valid check (price >= 0), unique(barbershop_id,id)
);
create table public.clients (
  id uuid primary key default gen_random_uuid(), barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  name text not null, phone text not null, phone_normalized text not null, birth_date date, last_visit date,
  whatsapp_opt_in boolean not null default false, whatsapp_opt_in_at timestamptz, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(barbershop_id,phone_normalized), unique(barbershop_id,id),
  constraint clients_phone_normalized check (phone_normalized ~ '^[0-9]{10,15}$'),
  constraint clients_optin_timestamp check (not whatsapp_opt_in or whatsapp_opt_in_at is not null)
);
create table public.business_hours (
  id uuid primary key default gen_random_uuid(), barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), is_open boolean not null default true,
  opening_time time, closing_time time, break_start time, break_end time,
  unique(barbershop_id,weekday), constraint business_hours_open_valid check (not is_open or (opening_time is not null and closing_time is not null and opening_time < closing_time)),
  constraint business_hours_break_valid check (break_start is null or break_end is null or break_start < break_end)
);
create table public.schedule_exceptions (
  id uuid primary key default gen_random_uuid(), barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  professional_id uuid references public.professionals(id) on delete cascade, exception_date date not null,
  start_time time, end_time time, is_closed boolean not null default true, reason text, created_at timestamptz not null default now(),
  constraint schedule_exceptions_range check (is_closed or (start_time is not null and end_time is not null and start_time < end_time))
);
create table public.appointments (
  id uuid primary key default gen_random_uuid(), barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  client_id uuid not null, professional_id uuid not null, appointment_date date not null,
  start_time time not null, end_time time not null, duration_minutes integer not null, total numeric(12,2) not null,
  status public.appointment_status not null default 'scheduled', notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint appointments_client_fk foreign key(barbershop_id,client_id) references public.clients(barbershop_id,id),
  constraint appointments_professional_fk foreign key(barbershop_id,professional_id) references public.professionals(barbershop_id,id),
  constraint appointments_time_valid check (start_time < end_time), constraint appointments_duration_valid check (duration_minutes between 5 and 720),
  constraint appointments_total_valid check (total >= 0)
);
alter table public.appointments add constraint appointments_no_overlap
  exclude using gist (professional_id with =, tsrange(appointment_date + start_time, appointment_date + end_time, '[)') with &&)
  where (status in ('scheduled','confirmed'));
create table public.appointment_services (
  id uuid primary key default gen_random_uuid(), appointment_id uuid not null references public.appointments(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null, service_name_snapshot text not null,
  price_snapshot numeric(12,2) not null check(price_snapshot>=0), duration_snapshot integer not null check(duration_snapshot>0), created_at timestamptz not null default now()
);
create table public.cash_transactions (
  id uuid primary key default gen_random_uuid(), barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null, type public.cash_type not null,
  description text not null, amount numeric(12,2) not null check(amount>0), category text not null,
  payment_method text, transaction_date date not null default current_date, created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index cash_one_income_per_appointment on public.cash_transactions(appointment_id) where appointment_id is not null and type='income';
create table public.reminders (
  id uuid primary key default gen_random_uuid(), barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade, type public.reminder_type not null,
  scheduled_for date not null, status public.reminder_status not null default 'pending', sent_at timestamptz, created_at timestamptz not null default now(),
  unique(client_id,type,scheduled_for)
);
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(), barbershop_id uuid not null unique references public.barbershops(id) on delete cascade,
  plan text not null default 'pro', status public.subscription_status not null default 'trial', started_at timestamptz not null default now(),
  trial_ends_at timestamptz, current_period_end timestamptz, cancelled_at timestamptz, created_at timestamptz not null default now()
);

create index profiles_barbershop_idx on public.profiles(barbershop_id);
create index professionals_barbershop_active_idx on public.professionals(barbershop_id,active);
create index services_barbershop_active_idx on public.services(barbershop_id,active);
create index clients_barbershop_name_idx on public.clients(barbershop_id,name);
create index appointments_shop_date_idx on public.appointments(barbershop_id,appointment_date,status);
create index appointments_client_idx on public.appointments(client_id);
create index appointment_services_service_idx on public.appointment_services(service_id);
create index cash_shop_date_idx on public.cash_transactions(barbershop_id,transaction_date);
create index reminders_shop_schedule_idx on public.reminders(barbershop_id,status,scheduled_for);
create index schedule_exceptions_shop_date_idx on public.schedule_exceptions(barbershop_id,exception_date);
create index appointment_services_appointment_idx on public.appointment_services(appointment_id);
create index appointments_shop_client_idx on public.appointments(barbershop_id,client_id);
create index appointments_shop_professional_idx on public.appointments(barbershop_id,professional_id);
create index cash_created_by_idx on public.cash_transactions(created_by);
create index professionals_profile_idx on public.professionals(profile_id);
create index schedule_exceptions_professional_idx on public.schedule_exceptions(professional_id);

create schema if not exists private;
create or replace function private.is_tenant_member(target uuid) returns boolean language sql stable security definer set search_path='' as $$
  select (select auth.uid()) is not null and exists(select 1 from public.profiles p where p.auth_user_id=(select auth.uid()) and p.active and (p.barbershop_id=target or p.role='platform_admin'));
$$;
revoke all on function private.is_tenant_member(uuid) from public,anon,authenticated;

alter table public.barbershops enable row level security;
alter table public.profiles enable row level security;
alter table public.professionals enable row level security;
alter table public.services enable row level security;
alter table public.clients enable row level security;
alter table public.business_hours enable row level security;
alter table public.schedule_exceptions enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_services enable row level security;
alter table public.cash_transactions enable row level security;
alter table public.reminders enable row level security;
alter table public.subscriptions enable row level security;

create policy profiles_self_select on public.profiles for select to authenticated using (auth_user_id=(select auth.uid()) or (select private.is_tenant_member(barbershop_id)));
create policy profiles_tenant_insert on public.profiles for insert to authenticated with check ((select private.is_tenant_member(barbershop_id)));
create policy profiles_tenant_update on public.profiles for update to authenticated using ((select private.is_tenant_member(barbershop_id))) with check ((select private.is_tenant_member(barbershop_id)));
create policy profiles_tenant_delete on public.profiles for delete to authenticated using ((select private.is_tenant_member(barbershop_id)));
create policy barbershops_tenant_all on public.barbershops for all to authenticated using ((select private.is_tenant_member(id))) with check ((select private.is_tenant_member(id)));
create policy professionals_tenant_all on public.professionals for all to authenticated using ((select private.is_tenant_member(barbershop_id))) with check ((select private.is_tenant_member(barbershop_id)));
create policy services_tenant_all on public.services for all to authenticated using ((select private.is_tenant_member(barbershop_id))) with check ((select private.is_tenant_member(barbershop_id)));
create policy clients_tenant_all on public.clients for all to authenticated using ((select private.is_tenant_member(barbershop_id))) with check ((select private.is_tenant_member(barbershop_id)));
create policy hours_tenant_all on public.business_hours for all to authenticated using ((select private.is_tenant_member(barbershop_id))) with check ((select private.is_tenant_member(barbershop_id)));
create policy exceptions_tenant_all on public.schedule_exceptions for all to authenticated using ((select private.is_tenant_member(barbershop_id))) with check ((select private.is_tenant_member(barbershop_id)));
create policy appointments_tenant_all on public.appointments for all to authenticated using ((select private.is_tenant_member(barbershop_id))) with check ((select private.is_tenant_member(barbershop_id)));
create policy appointment_services_tenant_all on public.appointment_services for all to authenticated using (exists(select 1 from public.appointments a where a.id=appointment_id and (select private.is_tenant_member(a.barbershop_id)))) with check (exists(select 1 from public.appointments a where a.id=appointment_id and (select private.is_tenant_member(a.barbershop_id))));
create policy cash_tenant_all on public.cash_transactions for all to authenticated using ((select private.is_tenant_member(barbershop_id))) with check ((select private.is_tenant_member(barbershop_id)));
create policy reminders_tenant_all on public.reminders for all to authenticated using ((select private.is_tenant_member(barbershop_id))) with check ((select private.is_tenant_member(barbershop_id)));
create policy subscriptions_tenant_select on public.subscriptions for select to authenticated using ((select private.is_tenant_member(barbershop_id)));

grant usage on schema public to anon,authenticated;
grant select,insert,update,delete on all tables in schema public to authenticated;

create or replace function public.get_public_shop(shop_slug text)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('shop',to_jsonb(b),'services',coalesce((select jsonb_agg(s order by s.name) from public.services s where s.barbershop_id=b.id and s.active),'[]'::jsonb),'professionals',coalesce((select jsonb_agg(p order by p.name) from public.professionals p where p.barbershop_id=b.id and p.active),'[]'::jsonb),'hours',coalesce((select jsonb_agg(h order by h.weekday) from public.business_hours h where h.barbershop_id=b.id),'[]'::jsonb))
 from public.barbershops b join public.subscriptions sub on sub.barbershop_id=b.id where b.slug=lower(shop_slug) and b.active and sub.status in ('trial','active');
$$;
revoke all on function public.get_public_shop(text) from public;
grant execute on function public.get_public_shop(text) to anon,authenticated;

create or replace function public.get_available_slots(shop_slug text, professional uuid, service_ids uuid[], appt_date date)
returns table(slot time) language sql stable security definer set search_path='' as $$
 with context as (
   select b.id shop_id,h.opening_time,h.closing_time,h.break_start,h.break_end,sum(s.duration_minutes)::int duration
   from public.barbershops b join public.subscriptions sub on sub.barbershop_id=b.id
   join public.business_hours h on h.barbershop_id=b.id and h.weekday=extract(dow from appt_date)::int and h.is_open
   join public.services s on s.barbershop_id=b.id and s.id=any(service_ids) and s.active
   where b.slug=lower(shop_slug) and b.active and sub.status in ('trial','active')
   group by b.id,h.opening_time,h.closing_time,h.break_start,h.break_end
 ), slots as (
   select c.*,g::time slot,(g+(c.duration||' minutes')::interval)::time slot_end
   from context c cross join lateral generate_series(appt_date+c.opening_time,appt_date+c.closing_time-(c.duration||' minutes')::interval,interval '15 minutes') g
 )
 select s.slot from slots s where
   (s.break_start is null or s.break_end is null or s.slot_end<=s.break_start or s.slot>=s.break_end)
   and not exists(select 1 from public.appointments a where a.professional_id=professional and a.appointment_date=appt_date and a.status in ('scheduled','confirmed') and s.slot<a.end_time and a.start_time<s.slot_end)
   and not exists(select 1 from public.schedule_exceptions e where e.barbershop_id=s.shop_id and e.exception_date=appt_date and (e.professional_id is null or e.professional_id=professional) and (e.is_closed or (s.slot<e.end_time and e.start_time<s.slot_end)))
 order by s.slot;
$$;
revoke all on function public.get_available_slots(text,uuid,uuid[],date) from public;
grant execute on function public.get_available_slots(text,uuid,uuid[],date) to anon,authenticated;

create or replace function public.create_public_appointment(shop_slug text, client_name text, client_phone text, client_birth date, opt_in boolean, professional uuid, service_ids uuid[], appt_date date, appt_start time, appt_notes text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_shop uuid; v_client uuid; v_duration int; v_total numeric(12,2); v_end time; v_appt uuid; v_phone text;
begin
 v_phone:=regexp_replace(client_phone,'\D','','g');
 if length(trim(client_name))<2 or v_phone !~ '^[0-9]{10,15}$' or appt_date<current_date then raise exception 'Dados de agendamento inválidos' using errcode='22023'; end if;
 select b.id into v_shop from public.barbershops b join public.subscriptions s on s.barbershop_id=b.id where b.slug=lower(shop_slug) and b.active and s.status in ('trial','active');
 if v_shop is null then raise exception 'Barbearia indisponível' using errcode='P0001'; end if;
 if not exists(select 1 from public.professionals p where p.id=professional and p.barbershop_id=v_shop and p.active) then raise exception 'Profissional inválido' using errcode='22023'; end if;
 select sum(s.duration_minutes)::int,sum(s.price) into v_duration,v_total from public.services s where s.id=any(service_ids) and s.barbershop_id=v_shop and s.active;
 if v_duration is null or (select count(*) from public.services s where s.id=any(service_ids) and s.barbershop_id=v_shop and s.active)<>cardinality(service_ids) then raise exception 'Serviço inválido' using errcode='22023'; end if;
 v_end:=appt_start+(v_duration||' minutes')::interval;
 insert into public.clients(barbershop_id,name,phone,phone_normalized,birth_date,whatsapp_opt_in,whatsapp_opt_in_at)
 values(v_shop,trim(client_name),client_phone,v_phone,client_birth,coalesce(opt_in,false),case when opt_in then now() end)
 on conflict(barbershop_id,phone_normalized) do update set name=excluded.name,birth_date=coalesce(excluded.birth_date,public.clients.birth_date),whatsapp_opt_in=excluded.whatsapp_opt_in,whatsapp_opt_in_at=case when excluded.whatsapp_opt_in then coalesce(public.clients.whatsapp_opt_in_at,now()) end,updated_at=now()
 returning id into v_client;
 insert into public.appointments(barbershop_id,client_id,professional_id,appointment_date,start_time,end_time,duration_minutes,total,notes)
 values(v_shop,v_client,professional,appt_date,appt_start,v_end,v_duration,v_total,appt_notes) returning id into v_appt;
 insert into public.appointment_services(appointment_id,service_id,service_name_snapshot,price_snapshot,duration_snapshot)
 select v_appt,s.id,s.name,s.price,s.duration_minutes from public.services s where s.id=any(service_ids) and s.barbershop_id=v_shop;
 return v_appt;
exception when exclusion_violation then raise exception 'Este horário acabou de ser reservado. Escolha outro horário.' using errcode='23P01';
end; $$;
revoke all on function public.create_public_appointment(text,text,text,date,boolean,uuid,uuid[],date,time,text) from public;
grant execute on function public.create_public_appointment(text,text,text,date,boolean,uuid,uuid[],date,time,text) to anon,authenticated;

create or replace function public.complete_appointment(target_appointment uuid, paid_amount numeric, paid_method text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare a public.appointments; c_name text; tx uuid; actor uuid;
begin
 select * into a from public.appointments where id=target_appointment for update;
 if a.id is null or not (select private.is_tenant_member(a.barbershop_id)) then raise exception 'Acesso negado' using errcode='42501'; end if;
 select id into tx from public.cash_transactions where appointment_id=a.id and type='income'; if tx is not null then return tx; end if;
 if paid_amount<=0 or paid_method not in ('Pix','Dinheiro','Débito','Crédito') then raise exception 'Pagamento inválido' using errcode='22023'; end if;
 select name into c_name from public.clients where id=a.client_id;
 select id into actor from public.profiles where auth_user_id=(select auth.uid()) and active limit 1;
 update public.appointments set status='completed',total=paid_amount,updated_at=now() where id=a.id;
 update public.clients set last_visit=a.appointment_date,updated_at=now() where id=a.client_id;
 insert into public.cash_transactions(barbershop_id,appointment_id,type,description,amount,category,payment_method,transaction_date,created_by)
 values(a.barbershop_id,a.id,'income','Atendimento — '||c_name,paid_amount,'Serviços',paid_method,a.appointment_date,actor) returning id into tx;
 insert into public.reminders(barbershop_id,client_id,type,scheduled_for) values(a.barbershop_id,a.client_id,'return',a.appointment_date+20) on conflict do nothing;
 return tx;
end; $$;
revoke all on function public.complete_appointment(uuid,numeric,text) from public,anon;
grant execute on function public.complete_appointment(uuid,numeric,text) to authenticated;

insert into public.barbershops(name,slug,logo_url,phone,address,instagram,whatsapp_message,opening_time,closing_time,break_start,break_end)
values('PALAZZO STUDIO BARBER','palazzo','palazzo-logo.jpg','5565992788465','Endereço a confirmar','@Palazzobarber_','Olá! Bem-vindo à PALAZZO STUDIO BARBER. Agende seu horário pelo nosso sistema oficial.','09:00','19:00','12:00','13:00');
insert into public.subscriptions(barbershop_id,plan,status,trial_ends_at,current_period_end) select id,'pro','trial',now()+interval '30 days',now()+interval '30 days' from public.barbershops where slug='palazzo';
insert into public.business_hours(barbershop_id,weekday,is_open,opening_time,closing_time,break_start,break_end)
select b.id,d,d between 1 and 6,case when d between 1 and 6 then '09:00'::time end,case when d between 1 and 6 then '19:00'::time end,case when d between 1 and 6 then '12:00'::time end,case when d between 1 and 6 then '13:00'::time end from public.barbershops b cross join generate_series(0,6) d where b.slug='palazzo';
insert into public.services(barbershop_id,name,description,duration_minutes,price) select id,x.name,x.description,x.duration,x.price from public.barbershops cross join (values ('Corte Clássico','Acabamento preciso e finalização.',30,45),('Barba Premium','Toalha quente, desenho e hidratação.',30,35),('Corte + Barba','A experiência completa Palazzo.',60,70),('Progressiva','Alinhamento e cuidado profissional.',60,90),('Sobrancelha','Detalhe que transforma o resultado.',15,20)) x(name,description,duration,price) where slug='palazzo';
insert into public.professionals(barbershop_id,name,active) select id,'Pedro',true from public.barbershops where slug='palazzo';

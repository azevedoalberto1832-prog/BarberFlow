alter table public.services
  add column return_interval_days integer default 20,
  add constraint services_return_interval_valid
    check (return_interval_days is null or return_interval_days between 1 and 365);

comment on column public.services.return_interval_days is
  'Dias após um atendimento para sugerir retorno. NULL desativa o lembrete para o serviço.';

create or replace function public.complete_appointment(
  target_appointment uuid,
  paid_amount numeric,
  paid_method text
)
returns uuid
language plpgsql
security invoker
set search_path=''
as $$
declare
  a public.appointments;
  c_name text;
  tx uuid;
  actor uuid;
  return_days integer;
begin
  select * into a
  from public.appointments
  where id=target_appointment
  for update;

  if a.id is null then
    raise exception 'Agendamento não encontrado ou acesso negado' using errcode='42501';
  end if;

  if a.status in ('cancelled','no_show') then
    raise exception 'Agendamento cancelado ou marcado como falta não pode ser concluído' using errcode='22023';
  end if;

  select id into tx
  from public.cash_transactions
  where appointment_id=a.id and type='income';

  if tx is not null then
    return tx;
  end if;

  if paid_amount<=0 or paid_method not in ('Pix','Dinheiro','Débito','Crédito') then
    raise exception 'Pagamento inválido' using errcode='22023';
  end if;

  select name into c_name from public.clients where id=a.client_id;
  select id into actor from public.profiles where auth_user_id=(select auth.uid()) and active limit 1;
  select min(s.return_interval_days) into return_days
  from public.appointment_services aps
  join public.services s on s.id=aps.service_id
  where aps.appointment_id=a.id and s.return_interval_days is not null;

  update public.appointments
  set status='completed',total=paid_amount,updated_at=now()
  where id=a.id;

  update public.clients
  set last_visit=a.appointment_date,updated_at=now()
  where id=a.client_id;

  insert into public.cash_transactions(
    barbershop_id,appointment_id,type,description,amount,category,
    payment_method,transaction_date,created_by
  ) values (
    a.barbershop_id,a.id,'income','Atendimento — '||c_name,paid_amount,
    'Serviços',paid_method,a.appointment_date,actor
  ) returning id into tx;

  delete from public.reminders
  where barbershop_id=a.barbershop_id
    and client_id=a.client_id
    and type='return'
    and status='pending';

  if return_days is not null then
    insert into public.reminders(barbershop_id,client_id,type,scheduled_for)
    values(a.barbershop_id,a.client_id,'return',a.appointment_date+return_days)
    on conflict do nothing;
  end if;

  return tx;
end;
$$;

revoke all on function public.complete_appointment(uuid,numeric,text) from public,anon;
grant execute on function public.complete_appointment(uuid,numeric,text) to authenticated;

with latest_completed as (
  select distinct on (a.client_id)
    a.barbershop_id,
    a.client_id,
    a.appointment_date,
    min(s.return_interval_days) as return_days
  from public.appointments a
  join public.appointment_services aps on aps.appointment_id=a.id
  join public.services s on s.id=aps.service_id
  where a.status='completed' and s.return_interval_days is not null
  group by a.id,a.barbershop_id,a.client_id,a.appointment_date,a.start_time
  order by a.client_id,a.appointment_date desc,a.start_time desc
)
update public.reminders r
set scheduled_for=latest_completed.appointment_date+latest_completed.return_days
from latest_completed
where r.barbershop_id=latest_completed.barbershop_id
  and r.client_id=latest_completed.client_id
  and r.type='return'
  and r.status='pending';

alter table public.services
  alter column return_interval_days set default 30;

update public.services
set return_interval_days = 30,
    updated_at = now()
where return_interval_days = 20;

with latest_completed as (
  select distinct on (a.client_id)
    a.barbershop_id,
    a.client_id,
    a.appointment_date,
    min(s.return_interval_days) as return_days
  from public.appointments a
  join public.appointment_services aps on aps.appointment_id = a.id
  join public.services s on s.id = aps.service_id
  where a.status = 'completed'
    and s.return_interval_days is not null
  group by a.id, a.barbershop_id, a.client_id, a.appointment_date, a.start_time
  order by a.client_id, a.appointment_date desc, a.start_time desc
)
update public.reminders r
set scheduled_for = latest_completed.appointment_date + latest_completed.return_days
from latest_completed
where r.barbershop_id = latest_completed.barbershop_id
  and r.client_id = latest_completed.client_id
  and r.type = 'return'
  and r.status = 'pending';

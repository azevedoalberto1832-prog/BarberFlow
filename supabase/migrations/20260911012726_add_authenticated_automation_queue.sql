alter table public.automation_runs
  add column attempt_count integer not null default 0,
  add column worker_id text,
  add column lease_token uuid,
  add column lease_expires_at timestamptz,
  add constraint automation_runs_attempt_count_valid check (attempt_count between 0 and 100),
  add constraint automation_runs_lease_state_valid check (
    (status = 'processing' and worker_id is not null and lease_token is not null and lease_expires_at is not null)
    or status <> 'processing'
  );

create index automation_runs_expired_lease_idx
  on public.automation_runs (lease_expires_at)
  where status = 'processing';

create unique index whatsapp_messages_outbound_run_uidx
  on public.whatsapp_messages (barbershop_id, automation_run_id)
  where direction = 'outbound' and automation_run_id is not null;

create or replace function public.claim_automation_runs(
  requested_worker_id text,
  requested_batch_size integer default 10,
  requested_lease_seconds integer default 300
)
returns table(item jsonb)
language plpgsql
security definer
set search_path = ''
as $$
declare
  safe_batch_size integer := least(greatest(coalesce(requested_batch_size, 10), 1), 50);
  safe_lease_seconds integer := least(greatest(coalesce(requested_lease_seconds, 300), 60), 1800);
begin
  if nullif(btrim(requested_worker_id), '') is null or length(requested_worker_id) > 100 then
    raise exception 'Identificador do worker inválido' using errcode = '22023';
  end if;

  update public.automation_runs ar
  set status = 'failed',
      finished_at = now(),
      error_message = 'Limite de tentativas excedido após expiração do processamento',
      lease_expires_at = null
  where ar.status = 'processing'
    and ar.lease_expires_at < now()
    and ar.attempt_count >= 3;

  update public.automation_runs ar
  set status = 'queued',
      started_at = null,
      worker_id = null,
      lease_token = null,
      lease_expires_at = null,
      error_message = 'Processamento expirado; execução recolocada na fila'
  where ar.status = 'processing'
    and ar.lease_expires_at < now()
    and ar.attempt_count < 3;

  return query
  with candidates as materialized (
    select ar.id
    from public.automation_runs ar
    join public.automation_rules rule on rule.id = ar.rule_id
    join public.barbershops shop on shop.id = ar.barbershop_id
    left join public.clients client
      on client.barbershop_id = ar.barbershop_id and client.id = ar.client_id
    where ar.status = 'queued'
      and ar.scheduled_for <= now()
      and ar.attempt_count < 3
      and rule.active
      and shop.active
      and exists (
        select 1
        from public.subscriptions subscription
        where subscription.barbershop_id = ar.barbershop_id
          and (
            subscription.status = 'active'
            or (
              subscription.status = 'trial'
              and (subscription.trial_ends_at is null or subscription.trial_ends_at > now())
            )
          )
      )
      and (
        rule.channel <> 'whatsapp'
        or (
          client.id is not null
          and client.whatsapp_opt_in
          and exists (
            select 1
            from public.whatsapp_connections connection
            where connection.barbershop_id = ar.barbershop_id
              and connection.status = 'connected'
          )
        )
      )
    order by ar.scheduled_for, ar.created_at
    for update of ar skip locked
    limit safe_batch_size
  ), claimed as (
    update public.automation_runs ar
    set status = 'processing',
        started_at = now(),
        finished_at = null,
        error_message = null,
        attempt_count = ar.attempt_count + 1,
        worker_id = btrim(requested_worker_id),
        lease_token = gen_random_uuid(),
        lease_expires_at = now() + make_interval(secs => safe_lease_seconds)
    from candidates
    where ar.id = candidates.id
    returning ar.*
  )
  select jsonb_build_object(
    'id', claimed.id,
    'leaseToken', claimed.lease_token,
    'scheduledFor', claimed.scheduled_for,
    'attempt', claimed.attempt_count,
    'leaseExpiresAt', claimed.lease_expires_at,
    'tenant', jsonb_build_object(
      'id', shop.id,
      'slug', shop.slug,
      'name', shop.name
    ),
    'rule', jsonb_build_object(
      'id', rule.id,
      'name', rule.name,
      'trigger', rule.trigger_type,
      'channel', rule.channel,
      'templateBody', rule.template_body,
      'conditions', rule.conditions
    ),
    'client', case
      when client.id is null then null
      else jsonb_build_object(
        'id', client.id,
        'name', client.name,
        'phone', client.phone_normalized,
        'whatsappOptIn', client.whatsapp_opt_in
      )
    end,
    'payload', claimed.payload
  ) as item
  from claimed
  join public.barbershops shop on shop.id = claimed.barbershop_id
  join public.automation_rules rule on rule.id = claimed.rule_id
  left join public.clients client
    on client.barbershop_id = claimed.barbershop_id and client.id = claimed.client_id
  order by claimed.scheduled_for, claimed.created_at;
end;
$$;

create or replace function public.finish_automation_run(
  target_run_id uuid,
  claimed_lease_token uuid,
  outcome text,
  provider_message_id text default null,
  failure_message text default null,
  message_preview text default null,
  retry_after_seconds integer default 300
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.automation_runs;
  target_channel text;
  final_status text;
  safe_retry_seconds integer := least(greatest(coalesce(retry_after_seconds, 300), 60), 3600);
begin
  if outcome not in ('sent', 'failed', 'retry') then
    raise exception 'Resultado de automação inválido' using errcode = '22023';
  end if;

  select ar.* into target
  from public.automation_runs ar
  where ar.id = target_run_id
  for update;

  if target.id is null then
    raise exception 'Execução de automação não encontrada' using errcode = 'P0002';
  end if;

  if target.lease_token is distinct from claimed_lease_token then
    raise exception 'Lease inválido ou substituído por outro processamento' using errcode = '42501';
  end if;

  if target.status in ('sent', 'failed') then
    return jsonb_build_object(
      'id', target.id,
      'status', target.status,
      'alreadyCompleted', true
    );
  end if;

  if target.status <> 'processing' or target.lease_expires_at < now() then
    raise exception 'Execução não está em processamento ou o lease expirou' using errcode = '55000';
  end if;

  if outcome = 'retry' and target.attempt_count < 3 then
    update public.automation_runs
    set status = 'queued',
        scheduled_for = now() + make_interval(secs => safe_retry_seconds),
        started_at = null,
        worker_id = null,
        lease_token = null,
        lease_expires_at = null,
        error_message = left(coalesce(failure_message, 'Nova tentativa solicitada pelo worker'), 1000)
    where id = target.id;

    return jsonb_build_object(
      'id', target.id,
      'status', 'queued',
      'retryAt', now() + make_interval(secs => safe_retry_seconds),
      'alreadyCompleted', false
    );
  end if;

  final_status := case when outcome = 'sent' then 'sent' else 'failed' end;

  update public.automation_runs
  set status = final_status,
      finished_at = now(),
      lease_expires_at = null,
      error_message = case
        when final_status = 'failed' then left(coalesce(failure_message, 'Falha informada pelo worker'), 1000)
        else null
      end
  where id = target.id;

  select rule.channel into target_channel
  from public.automation_rules rule
  where rule.id = target.rule_id;

  if final_status = 'sent' and target_channel = 'whatsapp' then
    insert into public.whatsapp_messages (
      barbershop_id,
      client_id,
      automation_run_id,
      provider_message_id,
      direction,
      body_preview,
      status,
      sent_at
    ) values (
      target.barbershop_id,
      target.client_id,
      target.id,
      nullif(left(provider_message_id, 255), ''),
      'outbound',
      nullif(left(message_preview, 500), ''),
      'sent',
      now()
    )
    on conflict (barbershop_id, automation_run_id)
      where direction = 'outbound' and automation_run_id is not null
    do update set
      provider_message_id = excluded.provider_message_id,
      body_preview = excluded.body_preview,
      status = 'sent',
      sent_at = excluded.sent_at;
  end if;

  return jsonb_build_object(
    'id', target.id,
    'status', final_status,
    'alreadyCompleted', false
  );
end;
$$;

comment on function public.claim_automation_runs(text, integer, integer) is
  'Reserva de forma transacional execuções vencidas para um worker autenticado, com lease e SKIP LOCKED.';

comment on function public.finish_automation_run(uuid, uuid, text, text, text, text, integer) is
  'Finaliza, falha ou reagenda uma execução usando o lease emitido no claim.';

revoke all on function public.claim_automation_runs(text, integer, integer) from public, anon, authenticated;
revoke all on function public.finish_automation_run(uuid, uuid, text, text, text, text, integer) from public, anon, authenticated;
grant execute on function public.claim_automation_runs(text, integer, integer) to service_role;
grant execute on function public.finish_automation_run(uuid, uuid, text, text, text, text, integer) to service_role;

create or replace function public.get_whatsapp_delivery_context(
  target_run_id uuid,
  claimed_lease_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  context jsonb;
begin
  select jsonb_build_object(
    'runId', run.id,
    'barbershopId', run.barbershop_id,
    'clientId', client.id,
    'recipient', case
      when client.phone_normalized like '55%' then client.phone_normalized
      else coalesce(nullif(rule.conditions ->> 'country_code', ''), '55') || client.phone_normalized
    end,
    'phoneNumberId', connection.phone_number_id,
    'graphApiVersion', connection.graph_api_version,
    'accessToken', secret.decrypted_secret,
    'templateName', nullif(rule.conditions ->> 'meta_template_name', ''),
    'templateLanguage', coalesce(nullif(rule.conditions ->> 'meta_template_language', ''), 'pt_BR'),
    'messagePreview', rule.template_body
  ) into context
  from public.automation_runs run
  join public.automation_rules rule on rule.id = run.rule_id
  join public.barbershops shop on shop.id = run.barbershop_id and shop.active
  join public.clients client
    on client.barbershop_id = run.barbershop_id
    and client.id = run.client_id
    and client.whatsapp_opt_in
  join public.whatsapp_connections connection
    on connection.barbershop_id = run.barbershop_id
    and connection.status = 'connected'
  join vault.decrypted_secrets secret
    on secret.id::text = connection.secret_reference
  where run.id = target_run_id
    and run.status = 'processing'
    and run.lease_token = claimed_lease_token
    and run.lease_expires_at >= now()
    and rule.active
    and rule.channel = 'whatsapp'
    and nullif(rule.conditions ->> 'meta_template_name', '') is not null
    and exists (
      select 1
      from public.subscriptions subscription
      where subscription.barbershop_id = run.barbershop_id
        and (
          subscription.status = 'active'
          or (
            subscription.status = 'trial'
            and (subscription.trial_ends_at is null or subscription.trial_ends_at > now())
          )
        )
    );

  if context is null then
    raise exception 'Execução não está pronta para envio pelo WhatsApp' using errcode = '55000';
  end if;

  return context;
end;
$$;

comment on function public.get_whatsapp_delivery_context(uuid, uuid) is
  'Entrega contexto e token somente ao serviço de envio e normaliza o destinatário com o DDI definido na regra (55 por padrão).';

revoke all on function public.get_whatsapp_delivery_context(uuid, uuid) from public, anon, authenticated;
grant execute on function public.get_whatsapp_delivery_context(uuid, uuid) to service_role;

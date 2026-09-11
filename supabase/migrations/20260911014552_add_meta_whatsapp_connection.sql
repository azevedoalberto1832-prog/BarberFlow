alter table public.whatsapp_connections
  add column graph_api_version text not null default 'v26.0',
  add column display_phone_number text,
  add column verified_name text,
  add column quality_rating text,
  add column last_error text,
  add constraint whatsapp_connections_graph_version_valid
    check (graph_api_version ~ '^v[0-9]+\.[0-9]+$');

create unique index whatsapp_connections_phone_number_uidx
  on public.whatsapp_connections (phone_number_id)
  where phone_number_id is not null;

comment on column public.whatsapp_connections.secret_reference is
  'UUID do token criptografado no Supabase Vault. O token nunca é armazenado nesta tabela.';

create or replace function public.store_meta_whatsapp_connection(
  actor_auth_user_id uuid,
  target_barbershop_id uuid,
  meta_business_account_id text,
  meta_phone_number_id text,
  meta_access_token text,
  meta_display_phone_number text default null,
  meta_verified_name text default null,
  meta_quality_rating text default null,
  meta_graph_api_version text default 'v26.0'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  vault_secret_id uuid;
  vault_secret_name text := 'chrona-meta-whatsapp-' || target_barbershop_id::text;
  connection public.whatsapp_connections;
begin
  if not exists (
    select 1
    from public.profiles profile
    where profile.auth_user_id = actor_auth_user_id
      and profile.active
      and (
        profile.role = 'platform_admin'
        or (profile.barbershop_id = target_barbershop_id and profile.role = 'owner')
      )
  ) then
    raise exception 'Somente o proprietário pode configurar o WhatsApp oficial' using errcode = '42501';
  end if;

  if coalesce(meta_business_account_id, '') !~ '^[0-9]{5,30}$'
    or coalesce(meta_phone_number_id, '') !~ '^[0-9]{5,30}$'
    or coalesce(length(meta_access_token), 0) < 20
    or length(meta_access_token) > 4096
    or coalesce(meta_graph_api_version, '') !~ '^v[0-9]+\.[0-9]+$'
  then
    raise exception 'Dados da conexão Meta inválidos' using errcode = '22023';
  end if;

  select secret.id into vault_secret_id
  from vault.secrets secret
  where secret.name = vault_secret_name;

  if vault_secret_id is null then
    select vault.create_secret(
      meta_access_token,
      vault_secret_name,
      'Token Meta Cloud API do tenant ' || target_barbershop_id::text,
      null
    ) into vault_secret_id;
  else
    perform vault.update_secret(
      vault_secret_id,
      meta_access_token,
      vault_secret_name,
      'Token Meta Cloud API do tenant ' || target_barbershop_id::text,
      null
    );
  end if;

  insert into public.whatsapp_connections (
    barbershop_id,
    provider,
    phone_number_id,
    business_account_id,
    secret_reference,
    status,
    verified_at,
    graph_api_version,
    display_phone_number,
    verified_name,
    quality_rating,
    last_error
  ) values (
    target_barbershop_id,
    'meta_cloud',
    meta_phone_number_id,
    meta_business_account_id,
    vault_secret_id::text,
    'connected',
    now(),
    meta_graph_api_version,
    nullif(left(meta_display_phone_number, 50), ''),
    nullif(left(meta_verified_name, 255), ''),
    nullif(left(meta_quality_rating, 50), ''),
    null
  )
  on conflict (barbershop_id) do update set
    provider = excluded.provider,
    phone_number_id = excluded.phone_number_id,
    business_account_id = excluded.business_account_id,
    secret_reference = excluded.secret_reference,
    status = excluded.status,
    verified_at = excluded.verified_at,
    graph_api_version = excluded.graph_api_version,
    display_phone_number = excluded.display_phone_number,
    verified_name = excluded.verified_name,
    quality_rating = excluded.quality_rating,
    last_error = null,
    updated_at = now()
  returning * into connection;

  return jsonb_build_object(
    'id', connection.id,
    'barbershopId', connection.barbershop_id,
    'status', connection.status,
    'phoneNumberId', connection.phone_number_id,
    'businessAccountId', connection.business_account_id,
    'displayPhoneNumber', connection.display_phone_number,
    'verifiedName', connection.verified_name,
    'qualityRating', connection.quality_rating,
    'verifiedAt', connection.verified_at,
    'graphApiVersion', connection.graph_api_version
  );
end;
$$;

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
    'recipient', client.phone_normalized,
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

comment on function public.store_meta_whatsapp_connection(uuid, uuid, text, text, text, text, text, text, text) is
  'Armazena no Vault um token Meta previamente validado por uma Edge Function e retorna apenas dados não sensíveis.';

comment on function public.get_whatsapp_delivery_context(uuid, uuid) is
  'Entrega contexto e token somente ao serviço de envio, após revalidar lease, consentimento, regra, tenant e assinatura.';

revoke all on function public.store_meta_whatsapp_connection(uuid, uuid, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.get_whatsapp_delivery_context(uuid, uuid) from public, anon, authenticated;
grant execute on function public.store_meta_whatsapp_connection(uuid, uuid, text, text, text, text, text, text, text) to service_role;
grant execute on function public.get_whatsapp_delivery_context(uuid, uuid) to service_role;

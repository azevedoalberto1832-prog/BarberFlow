create index crm_stages_shop_pipeline_idx
  on public.crm_stages (barbershop_id, pipeline_id);

create index crm_opportunities_shop_client_idx
  on public.crm_opportunities (barbershop_id, client_id);

create index automation_runs_shop_client_idx
  on public.automation_runs (barbershop_id, client_id);

create index automation_runs_rule_idx
  on public.automation_runs (rule_id);

create index integration_events_shop_idx
  on public.integration_events (barbershop_id);

create index whatsapp_messages_shop_client_idx
  on public.whatsapp_messages (barbershop_id, client_id);

create index whatsapp_messages_shop_run_idx
  on public.whatsapp_messages (barbershop_id, automation_run_id);

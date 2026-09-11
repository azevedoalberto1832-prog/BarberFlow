# Chrona — arquitetura CRM e automações

## Responsabilidades

- Agenda é a fonte da verdade dos atendimentos.
- CRM organiza relacionamento e próximas ações sem duplicar clientes.
- Automação transforma eventos em execuções idempotentes.
- WhatsApp é canal de entrega; nunca substitui a persistência no Chrona.
- n8n será o orquestrador externo com acesso mínimo.

## Fluxo

```text
evento Chrona → regra do tenant → execução deduplicada → consentimento e plano
→ n8n → WhatsApp Business Platform → webhook → histórico → resultado no CRM
```

## Segurança

- Todas as entidades comerciais usam `barbershop_id` e RLS.
- Tokens da Meta e segredos do n8n não ficam no navegador; o banco guarda somente referências ao cofre de segredos.
- Históricos de execução, mensagens e webhooks são somente leitura para o tenant.
- `deduplication_key` impede mensagens repetidas em reprocessamentos.
- `whatsapp_opt_in` e opt-out devem ser verificados antes de cada envio.

## Próximas implementações

1. CRUD do pipeline e oportunidades.
2. Período de retorno configurável por serviço.
3. Endpoint autenticado para o n8n consumir a fila.
4. Cofre de segredos e Meta Cloud API.
5. Webhook assinado para entrega e leitura.
6. Opt-out, janela de 24 horas e templates aprovados.
7. Métricas de conversão e reativação.

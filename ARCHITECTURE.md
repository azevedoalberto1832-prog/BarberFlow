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
- O endpoint do n8n usa uma credencial exclusiva no servidor; ela não concede acesso direto às tabelas.
- A retirada da fila usa lease, limite de tentativas e `SKIP LOCKED` para impedir processamento simultâneo da mesma execução.

## Próximas implementações

O CRUD de pipelines, etapas e oportunidades já está disponível no painel administrativo, com próximas ações, valor estimado e estados de ganho ou perda. Cada serviço também possui um período próprio de retorno, com padrão de 30 dias; ao concluir o atendimento, a menor janela configurada entre os serviços realizados agenda o próximo contato do cliente. O endpoint autenticado da fila já está pronto para o n8n reservar e finalizar execuções.

1. Cofre de segredos e Meta Cloud API.
2. Webhook assinado para entrega e leitura.
3. Opt-out, janela de 24 horas e templates aprovados.
4. Métricas de conversão e reativação.

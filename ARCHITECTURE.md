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
- Tokens da Meta são validados por uma Edge Function e criptografados no Supabase Vault; a tabela operacional guarda somente a referência do segredo.
- O token pode ser informado pelo proprietário em um formulário autenticado, mas não é persistido nem devolvido ao navegador.
- Históricos de execução, mensagens e webhooks são somente leitura para o tenant.
- `deduplication_key` impede mensagens repetidas em reprocessamentos.
- `whatsapp_opt_in` e opt-out devem ser verificados antes de cada envio.
- O endpoint do n8n usa uma credencial exclusiva no servidor; ela não concede acesso direto às tabelas.
- A retirada da fila usa lease, limite de tentativas e `SKIP LOCKED` para impedir processamento simultâneo da mesma execução.

## Próximas implementações

O CRUD de pipelines, etapas e oportunidades já está disponível no painel administrativo, com próximas ações, valor estimado e estados de ganho ou perda. Cada serviço também possui um período próprio de retorno, com padrão de 20 dias; ao concluir o atendimento, a menor janela configurada entre os serviços realizados agenda o próximo contato do cliente. O n8n já pode reservar execuções e solicitar o envio de templates pela Meta Cloud API sem receber o token do tenant.

Os números obedecem a três escopos: cada tenant possui um remetente Meta próprio, o responsável do tenant recebe alertas internos e o administrador da plataforma recebe alertas de assinatura. A matriz universal contém confirmação do agendamento, lembretes de 15 minutos para cliente e responsável, aniversário, retorno após 20 dias, agenda pessoal e vencimento do plano em 7, 3, 1 e 0 dias. O gatilho de criação do tenant replica essa matriz para empresas futuras.

Os lembretes Meta agora distinguem cliente e responsável da empresa. Cada tenant recebe regras inativas para avisar ambos 15 minutos antes do atendimento e uma regra de agenda pessoal recorrente. A preparação da fila é idempotente, respeita fuso horário, consentimento, assinatura e mudanças no agendamento. A ligação operacional dos templates e do número oficial está documentada em `docs/META_REMINDERS.md`. O webhook assinado, o registro de entrega/leitura/falha e a arquitetura do chatbot universal já estão implementados; o fluxo completo está em `docs/WHATSAPP_CHATBOT.md`.

1. Configurar os segredos do aplicativo Meta e validar o webhook.
2. Aprovar e vincular os templates de cada tenant.
3. Implementar o processador da máquina de estados e ativar o piloto controlado.
4. Adicionar métricas de conversão, reativação e custo por tenant.

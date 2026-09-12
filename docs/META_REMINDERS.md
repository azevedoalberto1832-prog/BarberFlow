# Lembretes Meta universais

## Escopos de número

A Chrona separa remetente e destinatário para evitar mistura entre empresas:

- cada `whatsapp_connections.barbershop_id` representa o número oficial de um único tenant;
- `client` recebe mensagens no número e com o consentimento do cadastro daquele tenant;
- `owner` recebe avisos internos no número definido em `tenant_notification_settings`;
- `platform_admin` recebe alertas de planos no número global definido em `platform_notification_settings`.

Uma mensagem só pode sair quando a empresa, a regra, o consentimento, o telefone, a conexão Meta, o template aprovado e o lease da fila são válidos. O alerta de vencimento de plano continua elegível mesmo no instante em que a assinatura vence.

## Matriz replicada

Todo tenant existente e todo tenant novo recebe as mesmas sete regras, inicialmente desligadas:

| Chave | Destinatário | Momento |
| --- | --- | --- |
| `appointment_created_client` | Cliente | Assim que o horário é criado |
| `appointment_client_15m` | Cliente | 15 minutos antes |
| `appointment_owner_15m` | Responsável | 15 minutos antes |
| `client_birthday` | Cliente | No aniversário, às 09h |
| `client_return_20d` | Cliente | 20 dias após o serviço concluído |
| `owner_personal_reminder` | Responsável | Data definida; repetição opcional |
| `platform_subscription_expiring` | Admin Chrona | 7, 3, 1 e 0 dias antes do vencimento |

As regras só devem ser ativadas depois que `conditions.meta_template_name` receber o nome real do template aprovado na Meta.

## Retorno e agenda pessoal

Ao concluir um atendimento, `complete_appointment` agenda o retorno usando o menor `return_interval_days` entre os serviços realizados. O padrão universal é 20 dias. Quando a mensagem de retorno é confirmada, o lembrete muda de `pending` para `sent`.

`personal_reminders` guarda um aviso pontual ou recorrente. Para repetir a cada dois dias, use `repeat_every_days = 2`. A ocorrência seguinte só avança depois que a atual entra na fila, e a chave de deduplicação impede cópias.

## Preparação e envio

```text
n8n consulta automation-queue
  → generate_all_automation_runs prepara todos os eventos
  → deduplication_key impede cópias
  → claim_automation_runs valida tenant e destinatário e reserva os itens
  → n8n monta os componentes do template
  → whatsapp-send envia pela Meta Cloud API do tenant
  → finish_automation_run registra sucesso, falha ou nova tentativa
```

O mesmo ciclo cancela lembretes de 15 minutos ainda não enviados quando o agendamento muda ou deixa de estar agendado/confirmado. A confirmação inicial usa uma chave própria e não é cancelada por esse ajuste.

O worker deve consultar a fila pelo menos uma vez por minuto usando `action: "claim"`. A resposta inclui `generated`, `recipient`, `client`, `rule` e `payload`, sem expor o token da Meta ao n8n.

# Lembretes Meta por tenant

## Objetivo

A Chrona prepara lembretes de WhatsApp para dois tipos de destinatário sem misturar dados entre empresas:

- `client`: usa o número e o consentimento do cadastro do cliente.
- `owner`: usa o responsável definido em `tenant_notification_settings`.

Nenhuma mensagem é liberada apenas por existir na fila. O envio exige, ao mesmo tempo:

1. tenant e assinatura ativos;
2. regra de automação ativa;
3. destinatário com telefone válido e consentimento;
4. conexão Meta validada;
5. nome de template Meta aprovado na regra;
6. execução reservada com lease válido.

## Regras replicadas

Cada tenant recebe três regras desligadas por padrão:

| Chave | Destinatário | Agenda |
| --- | --- | --- |
| `appointment_client_15m` | Cliente do agendamento | 15 minutos antes |
| `appointment_owner_15m` | Responsável da empresa | 15 minutos antes |
| `owner_personal_reminder` | Responsável da empresa | Data definida; repetição opcional |

As regras só serão ativadas depois que os nomes reais dos templates aprovados forem gravados em `conditions.meta_template_name`.

## Agenda pessoal

`personal_reminders` guarda um aviso pontual ou recorrente. Para a recorrência de dois dias, `repeat_every_days = 2`. Quando uma ocorrência entra na fila, `next_run_at` avança exatamente dois dias. Avisos pontuais são pausados depois da primeira ocorrência criada.

## Preparação e envio

```text
n8n consulta automation-queue
  → generate_due_automation_runs prepara até 48 horas de agenda
  → deduplication_key impede cópias
  → claim_automation_runs reserva os itens vencidos
  → n8n monta os componentes do template
  → whatsapp-send envia pela Meta Cloud API
  → finish_automation_run registra sucesso, falha ou nova tentativa
```

O mesmo ciclo cancela lembretes ainda não enviados quando o agendamento muda de horário ou deixa de estar agendado/confirmado.

## Configuração prevista para a ligação Meta

O worker deve consultar a fila pelo menos uma vez por minuto usando `action: "claim"`. A resposta agora inclui `generated`, `recipient`, `client`, `rule` e `payload`. O campo `payload` fornece os dados necessários para preencher as variáveis aprovadas do template sem expor o token da Meta ao n8n.

Os nomes dos templates, a ordem exata dos componentes e a conexão com o número oficial serão definidos somente após a aprovação/configuração na Meta.

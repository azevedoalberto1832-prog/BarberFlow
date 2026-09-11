# Meta Cloud API no Chrona

O Chrona usa a Graph API `v26.0` e mantém um token permanente separado para cada tenant. O token é validado pela Meta antes de ser criptografado no Supabase Vault. A tabela operacional guarda apenas a referência do segredo.

## Dados necessários

- ID da conta do WhatsApp Business (WABA).
- ID do número de telefone cadastrado na Cloud API.
- Token permanente de um usuário do sistema com as permissões necessárias do WhatsApp Business.

No painel do tenant, abra **Automações → WhatsApp oficial**, informe os três valores e escolha **Conectar com a Meta**. O token é enviado diretamente à Edge Function autenticada, não é salvo no navegador e nunca é retornado pela API.

## Envio por template

O endpoint interno de envio é:

`https://qcjjqdkjfvnbslbpnrgk.supabase.co/functions/v1/whatsapp-send`

Ele aceita somente uma execução já reservada pela fila. O nome e o idioma do template vêm da regra do Chrona (`conditions.meta_template_name` e `conditions.meta_template_language`), e o n8n fornece apenas os componentes variáveis aprovados pela Meta.

```json
{
  "runId": "uuid-da-execucao",
  "leaseToken": "uuid-do-lease",
  "components": []
}
```

Use no header a mesma credencial privada `x-chrona-automation-key` da fila. Em sucesso, o Chrona salva o `providerMessageId` e finaliza a execução. Erros temporários da Meta são reagendados; erros definitivos encerram a execução como falha.

## Controles aplicados antes de enviar

- Tenant e assinatura ativos.
- Regra ativa e canal WhatsApp.
- Template Meta configurado na regra.
- Cliente com consentimento para WhatsApp.
- Conexão validada e token presente no Vault.
- Lease válido da execução reservada pelo n8n.

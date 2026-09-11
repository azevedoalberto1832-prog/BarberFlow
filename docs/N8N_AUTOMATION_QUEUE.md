# Fila de automações do Chrona

O n8n consome a fila por uma única Edge Function. A credencial fica no header `x-chrona-automation-key`; ela não deve ser enviada ao navegador nem salva no workflow exportado.

## Endpoint

`https://qcjjqdkjfvnbslbpnrgk.supabase.co/functions/v1/automation-queue`

O segredo de produção é configurado como `CHRONA_N8N_KEY`. A cópia local gerada durante a implantação fica em `supabase/.temp/n8n.env`, que não é versionada.

## Verificar conexão

```bash
curl "$CHRONA_AUTOMATION_URL" \
  -H "x-chrona-automation-key: $CHRONA_N8N_KEY"
```

## Reservar execuções

Use o identificador único da execução do n8n como `workerId`.

```json
{
  "action": "claim",
  "workerId": "n8n-execution-123",
  "batchSize": 10,
  "leaseSeconds": 300
}
```

Cada item retorna um `leaseToken`. A reserva impede consumo duplicado e expira caso o worker pare. Depois de três tentativas expiradas, a execução é marcada como falha.

## Concluir, falhar ou tentar novamente

```json
{
  "action": "complete",
  "runId": "uuid-da-execucao",
  "leaseToken": "uuid-do-lease",
  "outcome": "sent",
  "providerMessageId": "wamid...",
  "messagePreview": "Prévia sem dados sensíveis"
}
```

`outcome` aceita `sent`, `failed` ou `retry`. Em `retry`, `retryAfterSeconds` pode variar de 60 a 3600 segundos.

Somente regras ativas, tenants com assinatura válida e clientes com consentimento são liberados. Mensagens de WhatsApp também exigem uma conexão marcada como `connected`.

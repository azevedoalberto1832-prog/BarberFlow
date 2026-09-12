# Chatbot universal de agendamento — Chrona

## Objetivo

Uma única máquina de atendimento atende todos os tenants. O `phone_number_id` que recebe o webhook identifica a empresa; serviços, profissionais, horários, textos e destinatários são resolvidos com o `barbershop_id` correspondente. Nenhum fluxo contém dados fixos de uma marca.

## Cobrança Meta

O padrão da Chrona é **tenant-direct**: cada empresa conecta sua própria WhatsApp Business Account (WABA) e mantém a forma de pagamento no Meta Business Manager associado. A coluna `billing_responsibility` permite uma futura operação `platform`, mas esse modelo exige que a Chrona pague e refature as mensagens.

Referências oficiais:

- [Preços da Plataforma do WhatsApp Business](https://whatsappbusiness.com/pt-br/products/platform-pricing/)
- [Termos da Meta para o WhatsApp Business](https://www.whatsapp.com/legal/meta-terms-whatsapp-business?lang=pt)
- [Política de Mensagens do WhatsApp Business](https://business.whatsapp.com/policy/preview?lang=pt_BR)

## Fluxo universal

```text
mensagem recebida
  → validar assinatura Meta
  → identificar tenant pelo phone_number_id
  → localizar/abrir conversa pelo tenant + telefone do cliente
  → serviço → profissional → data → horário
  → nome → consentimento → confirmação
  → criar agendamento na agenda Chrona
  → responder confirmação
  → fallback controlado ou atendimento humano
```

As 11 etapas ficam em `chatbot_flow_steps` e são replicadas no gatilho de criação de tenant. `tenant_chatbot_settings` nasce com `enabled=false`, evitando respostas antes de a conexão Meta ser concluída.

## Dados que mudam por tenant

- `phone_number_id`, WABA e segredo no Vault;
- nome, texto de boas-vindas e responsável;
- serviços, profissionais, horários e indisponibilidades;
- números de clientes, consentimento e histórico;
- templates Meta aprovados e idioma.

O algoritmo, os estados, o fallback, o handoff humano e as regras de segurança permanecem universais.

## Persistência e segurança

- `whatsapp_conversations` mantém o estado isolado por tenant e telefone.
- `chatbot_outbox` é uma fila idempotente de respostas.
- `process_meta_whatsapp_event` deduplica eventos, registra entrega/leitura/falha, tarifação e opt-out.
- O webhook público aceita apenas payloads com assinatura HMAC do `META_APP_SECRET`.
- `CHRONA_META_WEBHOOK_VERIFY_TOKEN` valida a inscrição do webhook na Meta.
- Segredos ficam somente nas Edge Functions; nunca no navegador.
- Fora da janela de atendimento de 24 horas, somente templates aprovados podem iniciar mensagens.
- Após duas respostas não compreendidas, o fluxo muda para atendimento humano e avisa o responsável.

## Ativação por tenant

1. Adicionar forma de pagamento na WABA responsável pela cobrança.
2. Conectar WABA, `phone_number_id` e token permanente pelo painel autenticado.
3. Cadastrar o callback `https://qcjjqdkjfvnbslbpnrgk.supabase.co/functions/v1/whatsapp-webhook` na Meta.
4. Configurar os dois segredos da Edge Function.
5. Aprovar os templates de confirmação e lembrete.
6. Testar em número controlado e só então marcar `tenant_chatbot_settings.enabled=true`.

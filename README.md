# Chrona — SaaS multi-tenant de agendamento

**Chrona** é uma plataforma única de agendamento e gestão para negócios que trabalham com atendimento por horário.

A **PALAZZO STUDIO BARBER** é o primeiro tenant real e a **Nayara Lash Designer** é o tenant fictício de validação multi-segmento. Cada identidade permanece na página pública, enquanto infraestrutura, autenticação, planos e administração pertencem à Chrona.

## Funcionalidades

- Catálogo público de serviços e contato por WhatsApp.
- Agendamento autônomo em quatro passos, com soma de preço/duração e bloqueio de conflitos.
- Área administrativa responsiva: dashboard, agenda, clientes, caixa, lembretes, serviços e configurações.
- Lembretes de aniversário e retorno após 20 dias.
- Persistência operacional no Supabase/PostgreSQL; o navegador não é a fonte da verdade.
- Autenticação administrativa, isolamento multi-tenant por RLS e controle de assinatura.
- Conclusão de atendimento com lançamento idempotente no caixa.
- CRUD persistente de clientes, serviços, profissionais, movimentações e configurações.

## Arquitetura e evolução

A aplicação usa um único banco multi-tenant no Supabase. Cada registro operacional pertence a um estabelecimento e as políticas RLS aplicam o isolamento no banco. O tenant público é selecionado por `?tenant=<slug>`; Palazzo e Nayara usam o mesmo código e dados isolados. CRM e automação oficial de WhatsApp entram somente depois dessa validação.

## Execução local

Sirva a pasta com qualquer servidor HTTP estático, por exemplo `npx serve .`.

# Chrona — SaaS multi-tenant de agendamento

**Chrona** é uma plataforma única de agendamento e gestão para negócios que trabalham com atendimento por horário.

A **PALAZZO STUDIO BARBER** é o primeiro tenant real. Sua identidade permanece na página pública, enquanto infraestrutura, autenticação, planos e administração pertencem à Chrona.

## Funcionalidades

- Catálogo público de serviços e contato por WhatsApp.
- Agendamento autônomo em quatro passos, com soma de preço/duração e bloqueio de conflitos.
- Área administrativa responsiva: dashboard, agenda, clientes, caixa, lembretes, serviços e configurações.
- Lembretes de aniversário e retorno após 20 dias.
- Persistência local (`localStorage`) para uso imediato como demonstração.

## Arquitetura e evolução

A demo não exige backend. Dados, regras de disponibilidade e renderização estão separados em funções, facilitando a migração para React e um repositório remoto. Próximas etapas sugeridas: autenticação por estabelecimento, Supabase/Postgres com RLS, notificações oficiais do WhatsApp, confirmação/cancelamento por link, múltiplas unidades, CRM e relatórios avançados.

## Execução local

Sirva a pasta com qualquer servidor HTTP estático, por exemplo `npx serve .`.

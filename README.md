# PALAZZO STUDIO BARBER — BarberFlow

Demo pública de agendamento e gestão personalizada para a **PALAZZO STUDIO BARBER**.

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

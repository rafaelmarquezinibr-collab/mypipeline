# mypipeline

Funil de vendas pessoal: leads, pipeline de negócios, lembretes de próximas ações e dashboards.

**Regra central:** nenhum lead ou negócio fica sem próxima ação com data. Criar, converter, mudar de etapa
ou concluir a última ação de um negócio sempre pede o próximo passo. O que escapa aparece em destaque na tela
**Hoje** e no resumo diário.

## Telas

- **Hoje**: ações atrasadas, de hoje e dos próximos 7 dias; leads e negócios sem próxima ação; negócios parados
  além do limite da etapa.
- **Pipeline**: kanban por etapa (arrastar ou "Mover para…"), com valor por coluna e alerta de próxima ação.
- **Leads**: lista com as etapas Novo, Tentativa de conexão, Contato estabelecido, Visita/consulta agendada,
  Visita/consulta realizada; conversão em negócio.
- **Dashboard**: valor e quantidade por etapa, funil de conversão, tempo médio por etapa, ganhos por mês, leads por etapa.
- **Ajustes**: etapas (nome, cor, ordem, limite de dias), canais de lembrete, link da agenda, importação do HubSpot.

## Stack

Next.js 16 (App Router, server actions), Postgres no Supabase (acesso direto com `postgres`), Tailwind 4.
Login por senha única (`APP_PASSWORD`), sessão em cookie assinado. Instalável no celular como PWA.

## Rodar localmente

```bash
cp .env.example .env.local   # preencha DATABASE_URL, APP_PASSWORD, SESSION_SECRET
npm install
npm run db:migrate
npm run dev
```

## Deploy (Vercel + Supabase)

1. **Supabase**: crie um projeto (região São Paulo). Em *Project Settings > Database*, copie a connection string.
   Rode as migrações uma vez da sua máquina: `DATABASE_URL="<string de conexão>" npm run db:migrate`.
2. **Vercel**: *Add New > Project*, importe este repositório e preencha as variáveis do `.env.example`
   (use a URL do *Transaction pooler*, porta 6543, em `DATABASE_URL`).
3. **Lembretes a cada 5 minutos**: o cron gratuito da Vercel roda só 1x por dia, então o agendamento fica no Supabase.
   Em *Database > Extensions*, ative `pg_cron` e `pg_net`, e rode no SQL Editor:

   ```sql
   select cron.schedule('lembretes-funil', '*/5 * * * *', $$
     select net.http_get(
       url := 'https://SEU-APP.vercel.app/api/cron/lembretes',
       headers := '{"Authorization": "Bearer SEU_CRON_SECRET"}'::jsonb
     )
   $$);
   ```

## Lembretes

O endpoint `/api/cron/lembretes` envia:

- aviso X minutos antes de cada ação (padrão 30, ajustável);
- cobrança das ações atrasadas a cada 3 horas, das 8h às 20h, até concluir ou adiar;
- resumo diário no horário configurado (padrão 8h), com o que vence hoje, atrasadas, itens sem próxima ação e parados.

Canais (cada um liga sozinho quando as variáveis existem; teste em *Ajustes*):

- **Celular**: gere as chaves com `npx web-push generate-vapid-keys`. No iPhone, adicione o app à Tela de Início
  pelo Safari (Compartilhar > Adicionar à Tela de Início), abra por lá e toque em *Ativar neste aparelho*.
- **E-mail**: crie uma chave em resend.com.
- **WhatsApp**: siga o passo a passo do CallMeBot (mandar uma mensagem para o número deles e receber a apikey).
  É gratuito e serve para mandar mensagens para o seu próprio número.

## Agenda do Outlook

Em *Ajustes* aparece um link `.../api/calendario?token=...`. No Outlook: *Adicionar calendário > Assinar da Web*.
As próximas ações aparecem como eventos (o Outlook atualiza assinaturas periodicamente, não na hora).
Trazer reuniões do Outlook para dentro do app exige Microsoft Graph e fica para uma próxima etapa.

## Importar do HubSpot

*Ajustes > Importar do HubSpot*: envie o CSV de Negócios ou de Leads/Contatos exportado do HubSpot.
Para negócios, a tela pede o mapeamento das etapas do HubSpot para as etapas locais. Reimportar atualiza
pelo ID do HubSpot sem duplicar.

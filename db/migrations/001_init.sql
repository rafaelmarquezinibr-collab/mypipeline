-- Etapas do pipeline de negócios (configuráveis)
create table stages (
  id serial primary key,
  name text not null,
  position int not null,
  -- alerta quando um negócio fica mais que N dias na etapa sem avançar
  max_days int not null default 7,
  color text not null default '#6366f1'
);

insert into stages (name, position, max_days, color) values
  ('Descoberta', 1, 7, '#0ea5e9'),
  ('Apresentação', 2, 7, '#6366f1'),
  ('Formatação de proposta', 3, 5, '#8b5cf6'),
  ('Piloto', 4, 30, '#f59e0b'),
  ('Negociação', 5, 10, '#f97316'),
  ('Fechamento', 6, 7, '#10b981');

create table leads (
  id serial primary key,
  name text not null,
  company text,
  email text,
  phone text,
  source text,
  -- novo | tentativa | contato | agendado | realizado | descartado | convertido
  status text not null default 'novo',
  notes text,
  hubspot_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table deals (
  id serial primary key,
  title text not null,
  company text,
  contact_name text,
  email text,
  phone text,
  value numeric(14,2) not null default 0,
  stage_id int not null references stages(id),
  -- aberto | ganho | perdido
  status text not null default 'aberto',
  lost_reason text,
  lead_id int references leads(id) on delete set null,
  expected_close date,
  notes text,
  hubspot_id text unique,
  stage_entered_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index deals_stage_idx on deals(stage_id) where status = 'aberto';

-- Histórico de etapas, base para conversão e tempo por etapa
create table stage_history (
  id serial primary key,
  deal_id int not null references deals(id) on delete cascade,
  from_stage_id int references stages(id),
  to_stage_id int references stages(id),
  changed_at timestamptz not null default now()
);
create index stage_history_deal_idx on stage_history(deal_id);

-- Próximas ações (o coração dos lembretes)
create table tasks (
  id serial primary key,
  title text not null,
  due_at timestamptz not null,
  deal_id int references deals(id) on delete cascade,
  lead_id int references leads(id) on delete cascade,
  done_at timestamptz,
  -- quando o lembrete "está chegando" foi enviado
  notified_at timestamptz,
  -- último aviso de atraso
  overdue_notified_at timestamptz,
  created_at timestamptz not null default now()
);
create index tasks_open_idx on tasks(due_at) where done_at is null;

-- Notas e registros de atividade
create table notes (
  id serial primary key,
  body text not null,
  deal_id int references deals(id) on delete cascade,
  lead_id int references leads(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table push_subscriptions (
  id serial primary key,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create table settings (
  key text primary key,
  value text not null
);
insert into settings (key, value) values
  ('remind_minutes_before', '30'),
  ('channels', 'push,email,whatsapp'),
  ('daily_digest_hour', '8');

-- Canais de lembrete escolhidos para cada ação (ex.: 'email,whatsapp').
-- Vazio = usa os canais padrão dos Ajustes.
alter table tasks add column if not exists channels text;

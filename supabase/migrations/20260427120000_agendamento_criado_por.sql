-- Distingue agendamentos criados pela IA (Ana Julia via tool) dos
-- criados manualmente pelo painel (gestor/atendente). Lembretes de
-- confirmacao (cron de 6h/3h/30min) so disparam para criadoPor='ia',
-- porque a IA tem contexto da conversa pra responder follow-ups.
-- Manuais ficam mudos: secretaria liga se precisar confirmar.

CREATE TYPE agendamento_origem AS ENUM ('ia', 'manual');

ALTER TABLE agendamentos
  ADD COLUMN "criadoPor" agendamento_origem NOT NULL DEFAULT 'manual';

-- Backfill: agendamentos antigos com googleEventId provavelmente vieram
-- da IA (a tool registrar_agendamento sempre sincroniza). Mas como nao
-- temos como ter certeza, deixamos default 'manual' — assim historicos
-- ja existentes nao recebem mais lembretes acidentais.
COMMENT ON COLUMN agendamentos."criadoPor" IS 'Origem do agendamento: ia (Ana Julia) ou manual (painel).';

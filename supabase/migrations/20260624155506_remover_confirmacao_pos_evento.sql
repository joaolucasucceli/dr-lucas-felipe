BEGIN;

-- Normaliza dados antes de remover os status descontinuados do enum.
UPDATE agendamentos
SET status = 'agendado'
WHERE status::text IN ('confirmado', 'realizado');

UPDATE agendamentos
SET status = 'cancelado'
WHERE status::text = 'nao_compareceu';

DROP INDEX IF EXISTS idx_agendamentos_pos_evento_pendente;

ALTER TABLE agendamentos
  DROP COLUMN IF EXISTS "confirmacoesEnviadas",
  DROP COLUMN IF EXISTS "posEventoEnviado";

ALTER TABLE agendamentos
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE TEXT USING status::text;

DROP TYPE IF EXISTS "StatusAgendamento";

CREATE TYPE "StatusAgendamento" AS ENUM (
  'agendado',
  'cancelado',
  'remarcado'
);

ALTER TABLE agendamentos
  ALTER COLUMN status TYPE "StatusAgendamento" USING status::"StatusAgendamento",
  ALTER COLUMN status SET DEFAULT 'agendado';

COMMIT;

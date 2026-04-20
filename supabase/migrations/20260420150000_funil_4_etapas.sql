-- JLAU-588: Simplificar funil do kanban para 4 etapas
--
-- Funil final: acolhimento -> qualificacao -> agendamento -> consulta_agendada
--
-- Complemento da JLAU-584 (aba Chat removida). Sistema 100% autonomo.
-- Google Calendar passa a ser a fonte da verdade pos-reuniao agendada.
--
-- Antes de aplicar, conferir:
--
--   SELECT "statusFunil", count(*) FROM leads GROUP BY 1;
--   SELECT etapa, count(*) FROM conversas GROUP BY 1;
--   SELECT count(*) FROM leads WHERE "motivoPerda" IS NOT NULL;

BEGIN;

-- 1. Migrar leads nos status removidos para consulta_agendada
--    (antes de recriar o enum, precisamos nao ter linhas invalidas)
UPDATE leads
SET "statusFunil" = 'consulta_agendada'::"StatusFunil"
WHERE "statusFunil"::text IN (
  'consulta_realizada',
  'sinal_pago',
  'procedimento_agendado',
  'concluido',
  'perdido'
);

-- 2. Migrar conversas.etapa idem
UPDATE conversas
SET etapa = 'consulta_agendada'::"EtapaConversa"
WHERE etapa::text IN (
  'consulta_realizada',
  'sinal_pago',
  'procedimento_agendado',
  'concluido',
  'perdido'
);

-- 3. Recriar StatusFunil sem os 5 valores (PG nao permite DROP VALUE direto)
ALTER TABLE leads ALTER COLUMN "statusFunil" DROP DEFAULT;

CREATE TYPE "StatusFunil_new" AS ENUM (
  'acolhimento',
  'qualificacao',
  'agendamento',
  'consulta_agendada'
);

ALTER TABLE leads
  ALTER COLUMN "statusFunil" TYPE "StatusFunil_new"
  USING "statusFunil"::text::"StatusFunil_new";

DROP TYPE "StatusFunil";
ALTER TYPE "StatusFunil_new" RENAME TO "StatusFunil";

ALTER TABLE leads ALTER COLUMN "statusFunil" SET DEFAULT 'acolhimento'::"StatusFunil";

-- 4. Recriar EtapaConversa idem
ALTER TABLE conversas ALTER COLUMN etapa DROP DEFAULT;

CREATE TYPE "EtapaConversa_new" AS ENUM (
  'acolhimento',
  'qualificacao',
  'agendamento',
  'consulta_agendada'
);

ALTER TABLE conversas
  ALTER COLUMN etapa TYPE "EtapaConversa_new"
  USING etapa::text::"EtapaConversa_new";

DROP TYPE "EtapaConversa";
ALTER TYPE "EtapaConversa_new" RENAME TO "EtapaConversa";

ALTER TABLE conversas ALTER COLUMN etapa SET DEFAULT 'acolhimento'::"EtapaConversa";

-- 5. Dropar coluna motivoPerda (sem mais status "perdido")
ALTER TABLE leads DROP COLUMN IF EXISTS "motivoPerda";

COMMIT;

-- JLAU-584: Simplificar enum ModoConversa removendo o valor "hibrido"
--
-- Contexto: sistema e 100% autonomo. Chat foi removido. A IA so tem dois estados
-- por conversa: "ia" (respondendo) ou "humano" (pausada). O valor "hibrido" nao
-- foi usado em producao nem no codigo.
--
-- Antes de aplicar, verificar se existem conversas com modoConversa = 'hibrido':
--
--   SELECT id, "leadId", "modoConversa" FROM conversas WHERE "modoConversa" = 'hibrido';
--
-- Se houver, migrar para 'ia' antes do ALTER (para nao perder o lead):
--
--   UPDATE conversas SET "modoConversa" = 'ia' WHERE "modoConversa" = 'hibrido';

-- Postgres nao permite remover valores de um enum direto. Caminho seguro:
-- 1. Criar novo enum sem o valor
-- 2. Migrar a coluna pra usar o novo enum
-- 3. Dropar o enum antigo
-- 4. Renomear o novo para o nome original

BEGIN;

-- Proteger: se houver algum registro com hibrido, migra pra ia
UPDATE conversas SET "modoConversa" = 'ia' WHERE "modoConversa"::text = 'hibrido';

-- Criar novo enum
CREATE TYPE "ModoConversa_new" AS ENUM ('ia', 'humano');

-- Dropar DEFAULT antes de trocar o tipo (PG nao converte default automaticamente)
ALTER TABLE conversas ALTER COLUMN "modoConversa" DROP DEFAULT;

-- Migrar a coluna
ALTER TABLE conversas
  ALTER COLUMN "modoConversa" TYPE "ModoConversa_new"
  USING "modoConversa"::text::"ModoConversa_new";

-- Dropar enum antigo e renomear
DROP TYPE "ModoConversa";
ALTER TYPE "ModoConversa_new" RENAME TO "ModoConversa";

-- Restaurar DEFAULT com o novo tipo
ALTER TABLE conversas ALTER COLUMN "modoConversa" SET DEFAULT 'ia'::"ModoConversa";

COMMIT;

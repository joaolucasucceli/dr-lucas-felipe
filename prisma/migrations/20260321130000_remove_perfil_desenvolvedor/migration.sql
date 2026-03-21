-- Migrar usuários com perfil desenvolvedor → gestor antes de remover o enum
UPDATE "usuarios" SET "perfil" = 'gestor' WHERE "perfil" = 'desenvolvedor';

-- Recriar o enum Perfil sem o valor 'desenvolvedor'
-- (PostgreSQL não suporta DROP VALUE em enums)
ALTER TYPE "Perfil" RENAME TO "Perfil_old";
CREATE TYPE "Perfil" AS ENUM ('gestor', 'atendente');
ALTER TABLE "usuarios" ALTER COLUMN "perfil" TYPE "Perfil" USING "perfil"::text::"Perfil";
DROP TYPE "Perfil_old";

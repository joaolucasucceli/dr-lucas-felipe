/*
  Warnings:

  - Changed the type of `tipo` on the `mensagens_whatsapp` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "TipoMensagem" AS ENUM ('texto', 'audio', 'imagem', 'documento', 'video');

-- AlterTable
ALTER TABLE "mensagens_whatsapp" DROP COLUMN "tipo",
ADD COLUMN     "tipo" "TipoMensagem" NOT NULL;

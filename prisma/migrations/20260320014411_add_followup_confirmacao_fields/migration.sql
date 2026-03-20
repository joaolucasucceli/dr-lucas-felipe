-- AlterTable
ALTER TABLE "agendamentos" ADD COLUMN     "confirmacoesEnviadas" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "conversas" ADD COLUMN     "encerradaEm" TIMESTAMP(3),
ADD COLUMN     "followUpEnviados" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "ultimaMensagemEm" TIMESTAMP(3);

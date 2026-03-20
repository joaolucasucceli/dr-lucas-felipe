-- AlterTable
ALTER TABLE "agendamentos" ADD COLUMN     "duracao" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "googleEventUrl" TEXT,
ADD COLUMN     "sincronizado" BOOLEAN NOT NULL DEFAULT false;

-- CreateEnum
CREATE TYPE "StatusSprint" AS ENUM ('planejada', 'em_andamento', 'concluida');

-- CreateTable
CREATE TABLE "sprints" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "status" "StatusSprint" NOT NULL DEFAULT 'planejada',
    "dataInicio" TIMESTAMP(3),
    "dataFim" TIMESTAMP(3),
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "deletadoEm" TIMESTAMP(3),

    CONSTRAINT "sprints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sprint_itens" (
    "id" TEXT NOT NULL,
    "sprintId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "concluido" BOOLEAN NOT NULL DEFAULT false,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sprint_itens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sprint_itens_sprintId_idx" ON "sprint_itens"("sprintId");

-- AddForeignKey
ALTER TABLE "sprint_itens" ADD CONSTRAINT "sprint_itens_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "sprints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

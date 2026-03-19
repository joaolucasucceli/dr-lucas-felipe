-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('gestor', 'atendente', 'desenvolvedor');

-- CreateEnum
CREATE TYPE "TipoUsuario" AS ENUM ('humano', 'ia');

-- CreateEnum
CREATE TYPE "StatusFunil" AS ENUM ('primeiro_atendimento', 'qualificacao', 'agendamento', 'consulta_agendada', 'consulta_realizada', 'sinal_pago', 'procedimento_agendado', 'concluido', 'perdido');

-- CreateEnum
CREATE TYPE "EtapaConversa" AS ENUM ('primeiro_atendimento', 'qualificacao', 'agendamento', 'consulta_agendada', 'consulta_realizada', 'sinal_pago', 'procedimento_agendado', 'concluido', 'perdido');

-- CreateEnum
CREATE TYPE "StatusAgendamento" AS ENUM ('agendado', 'confirmado', 'cancelado', 'realizado', 'remarcado');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL,
    "tipo" "TipoUsuario" NOT NULL DEFAULT 'humano',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "deletadoEm" TIMESTAMP(3),

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "email" TEXT,
    "procedimentoInteresse" TEXT,
    "statusFunil" "StatusFunil" NOT NULL DEFAULT 'primeiro_atendimento',
    "origem" TEXT,
    "sobreOPaciente" TEXT,
    "responsavelId" TEXT,
    "arquivado" BOOLEAN NOT NULL DEFAULT false,
    "arquivadoEm" TIMESTAMP(3),
    "consentimentoLgpd" BOOLEAN NOT NULL DEFAULT false,
    "consentimentoLgpdEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "deletadoEm" TIMESTAMP(3),

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversas" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "etapa" "EtapaConversa" NOT NULL DEFAULT 'primeiro_atendimento',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensagens_whatsapp" (
    "id" TEXT NOT NULL,
    "conversaId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "messageIdWhatsapp" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "remetente" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensagens_whatsapp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agendamentos" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "procedimentoId" TEXT,
    "dataHora" TIMESTAMP(3) NOT NULL,
    "status" "StatusAgendamento" NOT NULL DEFAULT 'agendado',
    "googleEventId" TEXT,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agendamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedimentos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT,
    "valorBase" DECIMAL(65,30),
    "duracaoMin" INTEGER NOT NULL,
    "posOperatorio" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "deletadoEm" TIMESTAMP(3),

    CONSTRAINT "procedimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fotos_lead" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "descricao" TEXT,
    "tipoAnalise" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fotos_lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT,
    "dadosAntes" JSONB,
    "dadosDepois" JSONB,
    "ip" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "leads_whatsapp_key" ON "leads"("whatsapp");

-- CreateIndex
CREATE INDEX "leads_responsavelId_idx" ON "leads"("responsavelId");

-- CreateIndex
CREATE INDEX "leads_statusFunil_idx" ON "leads"("statusFunil");

-- CreateIndex
CREATE INDEX "leads_criadoEm_idx" ON "leads"("criadoEm");

-- CreateIndex
CREATE INDEX "conversas_leadId_idx" ON "conversas"("leadId");

-- CreateIndex
CREATE INDEX "conversas_etapa_idx" ON "conversas"("etapa");

-- CreateIndex
CREATE UNIQUE INDEX "mensagens_whatsapp_messageIdWhatsapp_key" ON "mensagens_whatsapp"("messageIdWhatsapp");

-- CreateIndex
CREATE INDEX "mensagens_whatsapp_leadId_idx" ON "mensagens_whatsapp"("leadId");

-- CreateIndex
CREATE INDEX "mensagens_whatsapp_conversaId_idx" ON "mensagens_whatsapp"("conversaId");

-- CreateIndex
CREATE INDEX "mensagens_whatsapp_criadoEm_idx" ON "mensagens_whatsapp"("criadoEm");

-- CreateIndex
CREATE INDEX "agendamentos_leadId_idx" ON "agendamentos"("leadId");

-- CreateIndex
CREATE INDEX "agendamentos_criadoEm_idx" ON "agendamentos"("criadoEm");

-- CreateIndex
CREATE INDEX "agendamentos_dataHora_idx" ON "agendamentos"("dataHora");

-- CreateIndex
CREATE INDEX "fotos_lead_leadId_idx" ON "fotos_lead"("leadId");

-- CreateIndex
CREATE INDEX "audit_logs_entidade_entidadeId_idx" ON "audit_logs"("entidade", "entidadeId");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversas" ADD CONSTRAINT "conversas_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens_whatsapp" ADD CONSTRAINT "mensagens_whatsapp_conversaId_fkey" FOREIGN KEY ("conversaId") REFERENCES "conversas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens_whatsapp" ADD CONSTRAINT "mensagens_whatsapp_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_procedimentoId_fkey" FOREIGN KEY ("procedimentoId") REFERENCES "procedimentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fotos_lead" ADD CONSTRAINT "fotos_lead_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

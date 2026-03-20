-- CreateTable
CREATE TABLE "config_whatsapp" (
    "id" TEXT NOT NULL,
    "uazapiUrl" TEXT NOT NULL,
    "adminToken" TEXT NOT NULL,
    "instanceId" TEXT,
    "instanceToken" TEXT,
    "numeroWhatsapp" TEXT,
    "webhookUrl" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "config_whatsapp_pkey" PRIMARY KEY ("id")
);

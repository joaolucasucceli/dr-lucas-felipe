CREATE TABLE IF NOT EXISTS "anexos_contato" (
  "id" text PRIMARY KEY,
  "contatoId" text NOT NULL REFERENCES "contatos"("id") ON DELETE CASCADE,
  "tipo" text NOT NULL DEFAULT 'orcamento',
  "origem" text NOT NULL DEFAULT 'orcamento_exato',
  "titulo" text NOT NULL,
  "descricao" text,
  "url" text NOT NULL,
  "storageBucket" text,
  "storagePath" text,
  "nomeArquivo" text NOT NULL,
  "mimeType" text NOT NULL DEFAULT 'application/pdf',
  "tamanhoBytes" bigint,
  "valor" numeric(12, 2),
  "procedimento" text,
  "eventoOrcamentoId" text REFERENCES "eventos_orcamento_pendente"("id") ON DELETE SET NULL,
  "criadoEm" timestamptz NOT NULL DEFAULT now(),
  "atualizadoEm" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "anexos_contato_tipo_check" CHECK ("tipo" IN ('orcamento')),
  CONSTRAINT "anexos_contato_origem_check" CHECK ("origem" IN ('orcamento_exato'))
);

ALTER TABLE "anexos_contato" ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS "idx_anexos_contato_contatoId_criadoEm"
  ON "anexos_contato"("contatoId", "criadoEm" DESC);

CREATE INDEX IF NOT EXISTS "idx_anexos_contato_eventoOrcamentoId"
  ON "anexos_contato"("eventoOrcamentoId");

CREATE UNIQUE INDEX IF NOT EXISTS "idx_anexos_contato_eventoOrcamentoId_unique"
  ON "anexos_contato"("eventoOrcamentoId")
  WHERE "eventoOrcamentoId" IS NOT NULL;

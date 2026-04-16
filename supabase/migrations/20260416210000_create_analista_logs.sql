-- JLAU-571 Fase 1 (Shadow Mode)
-- Tabela para auditoria do agente Analista IA.
-- Na Fase 1 a coluna `aplicado` sempre fica false (so loga, nao escreve).
-- Na Fase 2 (take over), passa a true quando a Analista aplica diferencas no CRM.

CREATE TABLE IF NOT EXISTS analista_logs (
  id text PRIMARY KEY,
  "leadId" text NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  "conversaId" text REFERENCES conversas(id) ON DELETE SET NULL,

  "historicoMensagens" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "estadoAtualLead" jsonb,
  output jsonb,
  divergencias jsonb NOT NULL DEFAULT '[]'::jsonb,

  aplicado boolean NOT NULL DEFAULT false,
  "confiancaGeral" real,
  erro text,

  "criadoEm" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analista_logs_leadId ON analista_logs("leadId");
CREATE INDEX IF NOT EXISTS idx_analista_logs_criadoEm ON analista_logs("criadoEm" DESC);
CREATE INDEX IF NOT EXISTS idx_analista_logs_aplicado ON analista_logs(aplicado);

COMMENT ON TABLE analista_logs IS 'Auditoria do agente Analista IA (JLAU-571). Fase 1 = shadow mode.';
COMMENT ON COLUMN analista_logs.divergencias IS 'Campos onde a Analista discordou do estado atual do lead.';
COMMENT ON COLUMN analista_logs."confiancaGeral" IS 'Score 0-1 da confianca da Analista na analise.';

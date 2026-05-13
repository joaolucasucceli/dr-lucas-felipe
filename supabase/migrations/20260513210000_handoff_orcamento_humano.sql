-- Handoff humano de orcamento (Dr. Lucas).
-- Origem: audios Dr. Lucas 12/05 20:15/20:50 BRT. Pediu que cada caso seja
-- avaliado por ele (nao valor fixo via IA) — IA sinaliza, ele responde
-- direto, IA retoma. Detalhe da arquitetura: base-de-conhecimento/
-- sessoes/2026-05-13-arquitetura-handoff-orcamento-dr-lucas.md
--
-- Mudancas:
--  1. coluna `aguardandoOrcamentoHumano` em contatos (bool, default false)
--  2. tabela `eventos_orcamento_pendente` (fila + auditoria)
--  3. indice parcial pra "abertos"

ALTER TABLE contatos
  ADD COLUMN IF NOT EXISTS "aguardandoOrcamentoHumano" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE contatos
  ADD COLUMN IF NOT EXISTS "aguardandoOrcamentoDesde" TIMESTAMPTZ NULL;

CREATE TABLE IF NOT EXISTS eventos_orcamento_pendente (
  id TEXT PRIMARY KEY,
  "contatoId" TEXT NOT NULL REFERENCES contatos(id) ON DELETE CASCADE,
  "conversaId" TEXT REFERENCES conversas(id) ON DELETE SET NULL,
  "resumoCaso" TEXT NOT NULL,
  prioridade TEXT NOT NULL DEFAULT 'normal' CHECK (prioridade IN ('normal','urgente')),
  "criadoEm" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "respondidoEm" TIMESTAMPTZ NULL,
  "canceladoEm" TIMESTAMPTZ NULL,
  observacoes TEXT NULL,
  "notificacaoEnviadaEm" TIMESTAMPTZ NULL
);

-- Fila aberta: pra cron de timeout/lembrete + UI /painel/orcamentos-pendentes
CREATE INDEX IF NOT EXISTS idx_orc_pendente_aberto
  ON eventos_orcamento_pendente ("contatoId")
  WHERE "respondidoEm" IS NULL AND "canceladoEm" IS NULL;

-- Por data de criacao pra listar do mais antigo (fura primeiro)
CREATE INDEX IF NOT EXISTS idx_orc_pendente_data
  ON eventos_orcamento_pendente ("criadoEm")
  WHERE "respondidoEm" IS NULL AND "canceladoEm" IS NULL;

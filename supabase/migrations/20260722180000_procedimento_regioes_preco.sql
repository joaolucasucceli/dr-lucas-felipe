-- Preco por REGIAO do procedimento.
--
-- Motivo (Dr. Lucas, audio de 14/07/2026): a estimativa que a Ana enviava era a
-- faixa GENERICA do procedimento (mini lipo R$ 8k a 11k) e nao distinguia
-- abdome de flancos — "esse valor nao e de acordo". A faixa por procedimento
-- (procedimentos.valorBaseMinBrl/MaxBrl) nao tem granularidade suficiente:
-- regiao e o que muda o preco.
--
-- Esta tabela e a fonte de valor por regiao. Uso: referencia interna para o
-- Dr. Lucas definir o orcamento (vai no resumo do caso que ele recebe no
-- WhatsApp). A Ana Julia NUNCA envia esses valores ao paciente — desde
-- 22/07/2026 ela nao recebe valor nenhum pela tool de procedimentos.

CREATE TABLE IF NOT EXISTS procedimento_regioes (
  id text PRIMARY KEY,
  "procedimentoId" text NOT NULL REFERENCES procedimentos(id) ON DELETE CASCADE,
  -- Chave estavel de src/lib/procedimentos/regioes.ts (abdome, flancos, ...).
  regiao text NOT NULL,
  "valorMinBrl" numeric(10,2) NOT NULL,
  "valorMaxBrl" numeric(10,2) NOT NULL,
  observacao text,
  ativo boolean NOT NULL DEFAULT true,
  "criadoEm" timestamptz NOT NULL DEFAULT now(),
  "atualizadoEm" timestamptz NOT NULL DEFAULT now(),
  "deletadoEm" timestamptz,

  CONSTRAINT procedimento_regioes_faixa_valida
    CHECK ("valorMinBrl" > 0 AND "valorMaxBrl" >= "valorMinBrl")
);

-- Uma faixa por (procedimento, regiao) entre os registros vivos. Indice
-- parcial em vez de UNIQUE simples pra permitir recriar apos soft delete.
CREATE UNIQUE INDEX IF NOT EXISTS procedimento_regioes_unico_vivo
  ON procedimento_regioes ("procedimentoId", regiao)
  WHERE "deletadoEm" IS NULL;

CREATE INDEX IF NOT EXISTS procedimento_regioes_procedimento_idx
  ON procedimento_regioes ("procedimentoId")
  WHERE "deletadoEm" IS NULL;

COMMENT ON TABLE procedimento_regioes IS
  'Faixa de valor por regiao anatomica. Referencia interna do Dr. Lucas ao definir orcamento; nunca enviada ao paciente pela Ana Julia.';
COMMENT ON COLUMN procedimento_regioes.regiao IS
  'Chave de src/lib/procedimentos/regioes.ts (abdome, flancos, gluteo, bracos, costas, coxas, culote, papada, mamas, pernas, axilas).';

-- JLU-167: P2 (pedido Dr. Lucas 25/05/2026) — orcamento como FAIXA, nao valor fechado.
-- Adiciona valorBaseMinBrl + valorBaseMaxBrl em procedimentos.
-- Ana Julia vai citar "R$ X a R$ Y" + "valor exato o Dr. Lucas confirma na avaliacao".
-- valorEstimadoBrl mantido por 1 semana como fallback (deprecar depois).

ALTER TABLE procedimentos
  ADD COLUMN IF NOT EXISTS "valorBaseMinBrl" numeric(10,2),
  ADD COLUMN IF NOT EXISTS "valorBaseMaxBrl" numeric(10,2);

-- Garante coerencia: se preencher um, preenche o outro; e max >= min.
ALTER TABLE procedimentos
  DROP CONSTRAINT IF EXISTS procedimentos_faixa_coerente_chk;
ALTER TABLE procedimentos
  ADD CONSTRAINT procedimentos_faixa_coerente_chk CHECK (
    ("valorBaseMinBrl" IS NULL AND "valorBaseMaxBrl" IS NULL)
    OR
    ("valorBaseMinBrl" IS NOT NULL AND "valorBaseMaxBrl" IS NOT NULL
     AND "valorBaseMaxBrl" >= "valorBaseMinBrl"
     AND "valorBaseMinBrl" > 0)
  );

COMMENT ON COLUMN procedimentos."valorBaseMinBrl" IS 'JLU-167: piso da faixa de orcamento da Ana Julia. Se NULL, sem faixa (procedimento sem orcamento publico).';
COMMENT ON COLUMN procedimentos."valorBaseMaxBrl" IS 'JLU-167: teto da faixa de orcamento da Ana Julia. Sempre >= valorBaseMinBrl.';

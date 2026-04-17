-- JLAU-579: Remover coluna valorBase de procedimentos
--
-- Decisao do Dr. Lucas: preco fica 100% off-sistema, definido na consulta.
-- Antes de aplicar, exportar valores atuais para backup:
--
--   SELECT id, nome, "valorBase"
--   FROM procedimentos
--   WHERE "valorBase" IS NOT NULL;
--
-- Salvar o resultado do SELECT fora do sistema (email, planilha) antes do DROP.
-- Acao destrutiva: nao ha como recuperar os valores depois deste ALTER.

ALTER TABLE procedimentos DROP COLUMN IF EXISTS "valorBase";

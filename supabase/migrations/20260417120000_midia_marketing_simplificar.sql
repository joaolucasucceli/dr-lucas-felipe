-- JLAU-570: simplificar midia_marketing para apenas descricao + arquivo.
-- A IA escolhe qual midia enviar baseada APENAS na descricao.
-- Sem categoria, tipo, procedimento ou titulo.

ALTER TABLE midia_marketing DROP COLUMN IF EXISTS titulo;
ALTER TABLE midia_marketing DROP COLUMN IF EXISTS categoria;
ALTER TABLE midia_marketing DROP COLUMN IF EXISTS procedimento;
ALTER TABLE midia_marketing DROP COLUMN IF EXISTS tipo;

-- `descricao` passa a ser obrigatoria (era opcional).
ALTER TABLE midia_marketing ALTER COLUMN descricao SET NOT NULL;

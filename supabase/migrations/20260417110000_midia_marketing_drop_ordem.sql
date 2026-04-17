-- JLAU-570: remove coluna `ordem` de midia_marketing.
-- A selecao nao e mais por ordem — a IA escolhe por descricao.

ALTER TABLE midia_marketing DROP COLUMN IF EXISTS ordem;

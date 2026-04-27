-- JLAU-1039: simplifica midia_marketing removendo coluna `ativo`.
-- Mesmo padrao de Usuarios e Base de Conhecimento: se existe esta ativa,
-- excluir = soft-delete via deletadoEm.

ALTER TABLE midia_marketing DROP COLUMN IF EXISTS ativo;

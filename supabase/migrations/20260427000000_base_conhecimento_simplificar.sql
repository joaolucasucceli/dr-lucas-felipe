-- JLAU-1002: simplifica base_conhecimento para apenas titulo + conteudo.
-- Drop secao (overhead categorico desnecessario), ordem (sem proposito),
-- ativo (mesmo padrao da Usuarios: existe = ativo, excluir = soft-delete via deletadoEm).

ALTER TABLE base_conhecimento DROP COLUMN IF EXISTS secao;
ALTER TABLE base_conhecimento DROP COLUMN IF EXISTS ordem;
ALTER TABLE base_conhecimento DROP COLUMN IF EXISTS ativo;

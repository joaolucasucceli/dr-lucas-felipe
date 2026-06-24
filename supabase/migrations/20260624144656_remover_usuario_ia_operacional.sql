-- OPE-77: remove a Ana Julia como usuario operacional.
-- A IA continua existindo como agente via conversas.modoConversa = 'ia'.
-- contatos.responsavelId passa a representar apenas responsavel humano.

BEGIN;

UPDATE contatos c
SET
  "responsavelId" = NULL,
  "atualizadoEm" = NOW()
FROM usuarios u
WHERE c."responsavelId" = u.id
  AND u.tipo = 'ia'
  AND c."deletadoEm" IS NULL;

UPDATE usuarios
SET
  ativo = FALSE,
  "deletadoEm" = COALESCE("deletadoEm", NOW()),
  "atualizadoEm" = NOW()
WHERE tipo = 'ia'
  AND "deletadoEm" IS NULL;

COMMIT;

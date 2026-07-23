-- Orcamento respondido vira dado, nao recado.
--
-- Auditoria de 23/07/2026 (OPE-426): valor e URL do PDF eram gravados como prosa
-- em `observacoes` ("Valor informado pelo Dr. Lucas: R$ 10.000,00. PDF: https://...")
-- e arrancados de volta por regex em `loop.ts`. Dado de negocio lido por
-- expressao regular nao e fonte de verdade.
--
-- Quatro colunas, o minimo para o portao de vigencia (OPE-427) e para reenviar o
-- PDF como documento (OPE-428). Deliberadamente NAO criadas, por ja existirem:
--   - caminho/bucket do storage -> `anexos_contato` (registrarAnexoOrcamento)
--   - procedimento              -> `contatos.procedimentoInteresse`
--   - atendimento de origem     -> `conversaId`, ja nesta tabela
ALTER TABLE eventos_orcamento_pendente
  ADD COLUMN IF NOT EXISTS "valorCentavos" integer,
  ADD COLUMN IF NOT EXISTS "pdfUrl" text,
  ADD COLUMN IF NOT EXISTS "nomeArquivo" text,
  ADD COLUMN IF NOT EXISTS "validoAte" timestamptz;

COMMENT ON COLUMN eventos_orcamento_pendente."valorCentavos" IS
  'Valor definido pelo Dr. Lucas, em centavos. Substitui o parsing por regex de `observacoes`.';
COMMENT ON COLUMN eventos_orcamento_pendente."pdfUrl" IS
  'URL publica do PDF no storage. Usada para reenviar o documento — nunca para colar link no texto da conversa.';
COMMENT ON COLUMN eventos_orcamento_pendente."validoAte" IS
  'Fim da validade (respondidoEm + VALIDADE_PADRAO_DIAS de src/lib/orcamento/gerar.tsx). Depois disso o orcamento nao entra mais no contexto do agente.';

-- Backfill do historico. Extrai o que der de `observacoes`; o que nao der fica
-- NULL de proposito — campo vazio se ve, chute se acredita.
UPDATE eventos_orcamento_pendente
SET
  "valorCentavos" = COALESCE(
    "valorCentavos",
    NULLIF(
      regexp_replace(
        COALESCE(substring(observacoes FROM 'R\$\s*([\d.]+,\d{2})'), ''),
        '[^0-9]', '', 'g'
      ),
      ''
    )::integer
  ),
  "pdfUrl" = COALESCE("pdfUrl", substring(observacoes FROM 'https?://[^\s,)]+')),
  "validoAte" = COALESCE("validoAte", "respondidoEm" + interval '15 days')
WHERE "respondidoEm" IS NOT NULL;

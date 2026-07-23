-- Uma conversa aberta por contato = um atendimento por vez.
--
-- Auditoria de 23/07/2026 (OPE-425): o webhook pegava a ultima conversa do
-- contato IGNORANDO `encerradaEm`. Conversa encerrada pelo auto-close (6h/6h)
-- ou pelo follow-up de 48h nunca dava origem a outra — o paciente sumia por
-- semanas, voltava, e caia na mesma conversa com o historico inteiro e o
-- orcamento vencido colados no contexto do agente.
--
-- O codigo agora resolve o atendimento por `src/lib/conversas/atendimento.ts`:
-- conversa aberta se existir, senao abre uma nova. Este indice e a garantia no
-- banco de que duas mensagens simultaneas do mesmo contato nao abrem dois
-- atendimentos paralelos — sem ele a regra vive so na aplicacao.

-- Passo 1: se algum contato ja tem mais de uma conversa aberta (possivel no
-- modelo antigo, que nao tinha trava nenhuma), encerra as mais antigas e mantem
-- a mais recente. `encerradaEm` recebe a data da ultima mensagem da conversa
-- (ou a data de criacao, quando ela nunca recebeu mensagem) para nao inventar
-- atividade que nao houve.
WITH ranqueadas AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "contatoId"
      ORDER BY "criadoEm" DESC
    ) AS posicao
  FROM conversas
  WHERE "encerradaEm" IS NULL
)
UPDATE conversas c
SET
  "encerradaEm" = COALESCE(c."ultimaMensagemEm", c."criadoEm"),
  "atualizadoEm" = now()
FROM ranqueadas r
WHERE c.id = r.id
  AND r.posicao > 1;

-- Passo 2: a trava.
CREATE UNIQUE INDEX IF NOT EXISTS conversas_uma_aberta_por_contato
  ON conversas ("contatoId")
  WHERE "encerradaEm" IS NULL;

COMMENT ON INDEX conversas_uma_aberta_por_contato IS
  'Um atendimento por vez: no maximo uma conversa aberta por contato. Conversa encerrada nao volta a receber mensagem — a proxima abre atendimento novo (src/lib/conversas/atendimento.ts).';

-- Indexes de performance pra colunas filtradas frequentemente em produção.
-- Auditoria 2026-04-28: hoje queries são fast pq volume é baixo, mas
-- degradam exponencialmente conforme contatos/mensagens/agendamentos
-- crescem. Defesa proativa.

-- mensagens_whatsapp: painel /contatos/[id] faz JOIN constante por
-- contatoId+conversaId. Sem index, full scan.
CREATE INDEX IF NOT EXISTS idx_mensagens_whatsapp_contatoId
  ON mensagens_whatsapp("contatoId");

CREATE INDEX IF NOT EXISTS idx_mensagens_whatsapp_conversaId
  ON mensagens_whatsapp("conversaId");

-- agendamentos: cron de confirmação + /agenda + /dashboard fazem
-- range query por dataHora com filtro de status. Index composto cobre
-- ambos os casos.
CREATE INDEX IF NOT EXISTS idx_agendamentos_dataHora
  ON agendamentos("dataHora" DESC);

CREATE INDEX IF NOT EXISTS idx_agendamentos_status
  ON agendamentos(status);

CREATE INDEX IF NOT EXISTS idx_agendamentos_contatoId
  ON agendamentos("contatoId");

-- conversas: loop da Ana Júlia busca conversa ativa por contatoId
-- a cada turno.
CREATE INDEX IF NOT EXISTS idx_conversas_contatoId
  ON conversas("contatoId");

-- contatos: filtro deletadoEm IS NULL em ~95% das queries. Index
-- parcial é menor e mais rápido que index full.
CREATE INDEX IF NOT EXISTS idx_contatos_naoDeletados
  ON contatos(id) WHERE "deletadoEm" IS NULL;

-- analista_logs: cleanup query precisa filtrar por criadoEm <= cutoff.
CREATE INDEX IF NOT EXISTS idx_analista_logs_criadoEm
  ON analista_logs("criadoEm" DESC);

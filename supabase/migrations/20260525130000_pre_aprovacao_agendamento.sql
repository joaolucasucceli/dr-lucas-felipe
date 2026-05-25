-- JLU-170 v2 (B 25/05/2026): modo pre-aprovacao opcional de agendamento.
-- Pedido literal do Dr. Lucas: "antes de serem passadas datas e horarios aos
-- pacientes, a equipe entre em contato comigo para alinhamento previo".
--
-- Fluxo:
--   1. Gestor (Lucas) liga a flag em /configuracoes/comportamento-ia
--   2. Quando Ana Julia for agendar, em vez de registrar_agendamento direto,
--      chama solicitar_aprovacao_horario. Cria registro pendente + manda
--      WhatsApp pro Lucas com link de aprovacao.
--   3. Lucas abre /aprovacoes-pendentes e aprova/sugere outro/cancela.
--   4. Sistema processa: aprovado vira agendamento real + IA notifica paciente.

-- 1. Flag por usuario (Lucas eh gestor; pode ser usada por qualquer gestor futuro)
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS "exigirAprovacaoAgendamento" boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN usuarios."exigirAprovacaoAgendamento" IS
  'JLU-170 v2: se true, Ana Julia NAO agenda direto — solicita aprovacao previa do gestor via /aprovacoes-pendentes antes de criar agendamento real.';

-- 2. Tabela de aprovacoes pendentes
CREATE TABLE IF NOT EXISTS aprovacoes_agendamento (
  id              text PRIMARY KEY,
  "contatoId"     text NOT NULL REFERENCES contatos(id) ON DELETE CASCADE,
  "conversaId"    text,
  "dataHora"      timestamptz NOT NULL,
  "procedimentoId" text REFERENCES procedimentos(id) ON DELETE SET NULL,
  email           text NOT NULL,
  observacao      text,
  status          text NOT NULL DEFAULT 'aguardando' CHECK (status IN ('aguardando','aprovado','rejeitado','cancelado','expirado')),
  "criadoEm"      timestamptz NOT NULL DEFAULT now(),
  "respondidoEm"  timestamptz,
  "respondidoPor" text REFERENCES usuarios(id) ON DELETE SET NULL,
  "motivoRejeicao" text,
  "agendamentoCriadoId" text REFERENCES agendamentos(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_aprovacoes_agendamento_status
  ON aprovacoes_agendamento(status, "criadoEm" DESC);

CREATE INDEX IF NOT EXISTS idx_aprovacoes_agendamento_contato
  ON aprovacoes_agendamento("contatoId");

COMMENT ON TABLE aprovacoes_agendamento IS
  'JLU-170 v2: solicitacoes de agendamento aguardando aprovacao do gestor (fluxo pre-aprovacao opcional). Quando aprovada, vira agendamento real.';

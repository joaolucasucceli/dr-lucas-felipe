-- Pos-evento: cron dispara 1h apos `dataHora` do agendamento e a Ana Julia
-- pergunta se o paciente compareceu. Se "sim", encerra a conversa (IA para
-- de responder). Se "nao", reabre fluxo de remarcacao. Sem isso a IA fica
-- empurrando venda mesmo depois da reuniao acontecida.
--
-- Status `realizado` ja existia no enum (vide JLAU-588). Adicionamos
-- `nao_compareceu` pra distinguir do `cancelado` (paciente cancelou ANTES;
-- aqui ele simplesmente nao apareceu).

-- ALTER TYPE ADD VALUE nao pode estar dentro de transacao no Postgres,
-- entao separamos em comandos independentes (Supabase aplica sem BEGIN).
ALTER TYPE "StatusAgendamento" ADD VALUE IF NOT EXISTS 'nao_compareceu';

-- Marca quando o cron `/api/cron/pos-evento` ja enviou o lembrete pos-reuniao.
-- IS NULL = ainda nao enviado. NOT NULL = ja enviou, nao repetir.
ALTER TABLE agendamentos
  ADD COLUMN IF NOT EXISTS "posEventoEnviado" TIMESTAMPTZ NULL;

-- Indice pra o cron filtrar agendamentos pendentes de pos-evento sem scan
-- da tabela inteira. Cobre o query do cron: status IN (...) AND
-- posEventoEnviado IS NULL AND dataHora + 1h < now().
CREATE INDEX IF NOT EXISTS idx_agendamentos_pos_evento_pendente
  ON agendamentos("dataHora")
  WHERE "posEventoEnviado" IS NULL
    AND status IN ('agendado', 'confirmado', 'remarcado');

-- Flag em conversas pra IA parar de responder definitivo (apos paciente
-- confirmar presenca na avaliacao). Diferente de `encerradaEm` (auto-close
-- por silencio de 24h), que ainda permite re-engajamento. iaResponde=false
-- significa "esse paciente ja foi atendido, IA encerrou a venda".
ALTER TABLE conversas
  ADD COLUMN IF NOT EXISTS "iaResponde" BOOLEAN NOT NULL DEFAULT true;

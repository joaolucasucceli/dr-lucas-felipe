-- Migration: adicionar coluna tipo na tabela agendamentos com enum TipoAgendamento.
-- Permite categorizar agendamentos (diagnostico, consulta, procedimento, retorno, pos-op).
-- Detectado em JLAU-987 ao construir fluxo de criar agendamento manual via /agenda.

BEGIN;

CREATE TYPE "TipoAgendamento" AS ENUM (
  'diagnostico',
  'consulta_online',
  'consulta_presencial',
  'procedimento',
  'retorno',
  'pos_operatorio'
);

ALTER TABLE agendamentos
  ADD COLUMN tipo "TipoAgendamento" NOT NULL DEFAULT 'consulta_online';

-- Backfill: agendamentos com procedimentoId provavelmente sao execucao do procedimento.
UPDATE agendamentos
  SET tipo = 'procedimento'
  WHERE "procedimentoId" IS NOT NULL;

CREATE INDEX agendamentos_tipo_idx ON agendamentos(tipo);

COMMIT;

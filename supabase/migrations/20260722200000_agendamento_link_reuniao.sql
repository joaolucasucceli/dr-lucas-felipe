-- Link do Google Meet da reuniao de diagnostico.
--
-- Auditoria de 22/07/2026: os 14 eventos ja criados no calendario ATENDIMENTOS
-- estavam TODOS sem videochamada. `criarEvento` nunca pediu conferenceData, e
-- sem `conferenceDataVersion: 1` o Google ignora o campo mesmo se enviado.
-- Resultado: a "reuniao de diagnostico online" nao tinha por onde entrar.
--
-- Persistir o link resolve tambem o sintoma que o Dr. Lucas reportou (paciente
-- sem confirmacao): mesmo que o convite por email nao chegue, a Ana Julia manda
-- o link pelo WhatsApp.
ALTER TABLE agendamentos
  ADD COLUMN IF NOT EXISTS "linkReuniao" text;

COMMENT ON COLUMN agendamentos."linkReuniao" IS
  'Link do Google Meet da reuniao de diagnostico. Enviado pela Ana Julia no WhatsApp alem do convite por email.';

ALTER TYPE "StatusFunil" ADD VALUE IF NOT EXISTS 'orcamento' AFTER 'qualificacao';
ALTER TYPE "StatusFunil" ADD VALUE IF NOT EXISTS 'atendimento_humano' AFTER 'consulta_agendada';

ALTER TYPE "EtapaConversa" ADD VALUE IF NOT EXISTS 'orcamento' AFTER 'qualificacao';
ALTER TYPE "EtapaConversa" ADD VALUE IF NOT EXISTS 'atendimento_humano' AFTER 'consulta_agendada';

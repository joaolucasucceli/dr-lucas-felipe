-- Migration: corrigir nomes das FK constraints geradas em lowercase pela migration
-- 20260421000000_unificar_contatos.sql (JLAU-603).
-- PostgreSQL converte identifiers nao-quotados para lowercase, mas o codigo
-- TypeScript usa hints em camelCase (ex: !contatos_responsavelId_fkey) e o
-- Supabase REST faz match literal do nome — entao todas as queries com JOIN
-- estavam falhando 500.
-- Detectado e corrigido em JLAU-977.
--
-- Probes confirmados antes desta migration (scripts/check-all-fks.ts):
--   contatos.contatos_responsavelid_fkey                ✓ existente (renomear)
--   agendamentos.agendamentos_contatoid_fkey            ✓ existente (renomear)
--   conversas.conversas_contatoid_fkey                  ✓ existente (renomear)
--   mensagens_whatsapp.mensagens_whatsapp_contatoid_fkey ✓ existente (renomear)
--   prontuarios.prontuarios_contatoid_fkey              ✓ existente (renomear)
--   analista_logs.analista_logs_contatoid_fkey          ✓ existente (renomear)
--   fotos_contato.fotos_contato_contatoId_fkey          ✓ ja em camelCase, nao alterar

BEGIN;

ALTER TABLE contatos
  RENAME CONSTRAINT contatos_responsavelid_fkey TO "contatos_responsavelId_fkey";

ALTER TABLE agendamentos
  RENAME CONSTRAINT agendamentos_contatoid_fkey TO "agendamentos_contatoId_fkey";

ALTER TABLE conversas
  RENAME CONSTRAINT conversas_contatoid_fkey TO "conversas_contatoId_fkey";

ALTER TABLE mensagens_whatsapp
  RENAME CONSTRAINT mensagens_whatsapp_contatoid_fkey TO "mensagens_whatsapp_contatoId_fkey";

ALTER TABLE prontuarios
  RENAME CONSTRAINT prontuarios_contatoid_fkey TO "prontuarios_contatoId_fkey";

ALTER TABLE analista_logs
  RENAME CONSTRAINT analista_logs_contatoid_fkey TO "analista_logs_contatoId_fkey";

COMMIT;

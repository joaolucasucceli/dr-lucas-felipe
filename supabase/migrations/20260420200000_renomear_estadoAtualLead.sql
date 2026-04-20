-- JLAU-608 follow-up: renomear coluna legada estadoAtualLead -> estadoAtualContato
-- em analista_logs. Nome antigo vinha de antes da unificacao leads+pacientes->contatos.
-- Rename em Postgres e metadata-only: instantaneo, sem rewrite de tabela.

ALTER TABLE analista_logs RENAME COLUMN "estadoAtualLead" TO "estadoAtualContato";

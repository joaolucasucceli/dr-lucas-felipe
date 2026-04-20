-- Migration: Unificar leads + pacientes em contatos (JLAU-603)
-- Um contato tem tipo='lead' ou 'paciente'. A transicao nao cria registro novo,
-- apenas muda o tipo e popula os campos especificos de paciente.

BEGIN;

-- 1. Enum TipoContato
CREATE TYPE "TipoContato" AS ENUM ('lead', 'paciente');

-- 2. Tabela contatos (supertipo lead + paciente)
CREATE TABLE contatos (
  id text PRIMARY KEY,
  tipo "TipoContato" NOT NULL DEFAULT 'lead',

  -- campos comuns
  nome text NOT NULL,
  whatsapp text,
  email text,
  origem text,
  "consentimentoLgpd" boolean NOT NULL DEFAULT false,
  "consentimentoLgpdEm" timestamptz,
  "deletadoEm" timestamptz,
  "criadoEm" timestamptz NOT NULL DEFAULT now(),
  "atualizadoEm" timestamptz NOT NULL DEFAULT now(),
  arquivado boolean NOT NULL DEFAULT false,
  "arquivadoEm" timestamptz,

  -- funil (lead)
  "statusFunil" "StatusFunil",
  "responsavelId" text,
  "procedimentoInteresse" text,
  "sobreOPaciente" text,
  "ehRetorno" boolean NOT NULL DEFAULT false,
  "cicloAtual" int NOT NULL DEFAULT 1,
  "ciclosCompletos" int NOT NULL DEFAULT 0,
  "ultimaMovimentacaoEm" timestamptz,

  -- paciente
  cpf text,
  "dataNascimento" date,
  endereco text,
  cidade text,
  estado text,
  sexo text,
  "contatoEmergencia" text,
  "contatoEmergenciaTel" text,
  "promovidoEm" timestamptz,

  CONSTRAINT contatos_responsavelId_fkey
    FOREIGN KEY ("responsavelId") REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX contatos_whatsapp_unique
  ON contatos(whatsapp)
  WHERE whatsapp IS NOT NULL AND "deletadoEm" IS NULL;
CREATE INDEX contatos_tipo_idx ON contatos(tipo);
CREATE INDEX "contatos_statusFunil_idx" ON contatos("statusFunil") WHERE tipo = 'lead';
CREATE INDEX "contatos_responsavelId_idx" ON contatos("responsavelId");

-- 3. Migrar leads -> contatos (tipo='lead')
INSERT INTO contatos (
  id, tipo, nome, whatsapp, email, origem,
  "consentimentoLgpd", "consentimentoLgpdEm", "deletadoEm",
  "criadoEm", "atualizadoEm", arquivado, "arquivadoEm",
  "statusFunil", "responsavelId", "procedimentoInteresse", "sobreOPaciente",
  "ehRetorno", "cicloAtual", "ciclosCompletos", "ultimaMovimentacaoEm"
)
SELECT
  id, 'lead'::"TipoContato", nome, whatsapp, email, origem,
  "consentimentoLgpd", "consentimentoLgpdEm", "deletadoEm",
  "criadoEm", "atualizadoEm", arquivado, "arquivadoEm",
  "statusFunil", "responsavelId", "procedimentoInteresse", "sobreOPaciente",
  "ehRetorno", "cicloAtual", "ciclosCompletos", "ultimaMovimentacaoEm"
FROM leads;

-- 4. Pacientes com leadOrigemId: promover o contato existente pra tipo='paciente'
UPDATE contatos c
SET
  tipo = 'paciente'::"TipoContato",
  cpf = p.cpf,
  "dataNascimento" = p."dataNascimento",
  endereco = p.endereco,
  cidade = p.cidade,
  estado = p.estado,
  sexo = p.sexo,
  "contatoEmergencia" = p."contatoEmergencia",
  "contatoEmergenciaTel" = p."contatoEmergenciaTel",
  "sobreOPaciente" = TRIM(
    COALESCE(c."sobreOPaciente", '') ||
    CASE
      WHEN p.observacoes IS NOT NULL AND p.observacoes != '' THEN
        CASE
          WHEN c."sobreOPaciente" IS NOT NULL AND c."sobreOPaciente" != '' THEN E'\n' || p.observacoes
          ELSE p.observacoes
        END
      ELSE ''
    END
  ),
  arquivado = NOT p.ativo,
  "promovidoEm" = p."criadoEm",
  "atualizadoEm" = now()
FROM pacientes p
WHERE p."leadOrigemId" = c.id;

-- 5. Pacientes sem leadOrigemId (ou com lead orfao): criar contato direto
INSERT INTO contatos (
  id, tipo, nome, whatsapp, email,
  "consentimentoLgpd", "consentimentoLgpdEm",
  "sobreOPaciente",
  cpf, "dataNascimento", endereco, cidade, estado, sexo,
  "contatoEmergencia", "contatoEmergenciaTel", arquivado,
  "deletadoEm", "criadoEm", "atualizadoEm", "promovidoEm"
)
SELECT
  p.id, 'paciente'::"TipoContato", p.nome, p.whatsapp, p.email,
  p."consentimentoLgpd", p."consentimentoLgpdEm",
  p.observacoes,
  p.cpf, p."dataNascimento", p.endereco, p.cidade, p.estado, p.sexo,
  p."contatoEmergencia", p."contatoEmergenciaTel", NOT p.ativo,
  p."deletadoEm", p."criadoEm", p."atualizadoEm", p."criadoEm"
FROM pacientes p
WHERE NOT EXISTS (
  SELECT 1 FROM contatos c
  WHERE p."leadOrigemId" IS NOT NULL AND c.id = p."leadOrigemId"
);

-- 6. Prontuarios: repontar pra contatos
ALTER TABLE prontuarios ADD COLUMN "contatoId" text;

UPDATE prontuarios pr
SET "contatoId" = COALESCE(p."leadOrigemId", p.id)
FROM pacientes p
WHERE pr."pacienteId" = p.id;

ALTER TABLE prontuarios ALTER COLUMN "contatoId" SET NOT NULL;
ALTER TABLE prontuarios
  ADD CONSTRAINT prontuarios_contatoId_fkey
  FOREIGN KEY ("contatoId") REFERENCES contatos(id) ON DELETE CASCADE;
ALTER TABLE prontuarios DROP CONSTRAINT IF EXISTS prontuarios_pacienteId_fkey;
ALTER TABLE prontuarios DROP COLUMN "pacienteId";

CREATE INDEX "prontuarios_contatoId_idx" ON prontuarios("contatoId");

-- 7. fotos_contato unificada
CREATE TABLE fotos_contato (
  id text PRIMARY KEY,
  "contatoId" text NOT NULL REFERENCES contatos(id) ON DELETE CASCADE,
  url text NOT NULL,
  categoria text NOT NULL DEFAULT 'geral',
  descricao text,
  ciclo int,
  "tipoAnalise" text,
  "dataRegistro" timestamptz,
  "criadoEm" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "fotos_contato_contatoId_idx" ON fotos_contato("contatoId");

-- Migrar fotos_lead
INSERT INTO fotos_contato (
  id, "contatoId", url, categoria, descricao, ciclo, "tipoAnalise", "criadoEm"
)
SELECT id, "leadId", url, 'geral', descricao, ciclo, "tipoAnalise", "criadoEm"
FROM fotos_lead;

-- Migrar fotos_prontuario
INSERT INTO fotos_contato (
  id, "contatoId", url, categoria, descricao, "dataRegistro", "criadoEm"
)
SELECT fp.id, pr."contatoId", fp.url,
  COALESCE(fp."tipoFoto", 'geral'),
  fp.descricao, fp."dataRegistro", fp."criadoEm"
FROM fotos_prontuario fp
JOIN prontuarios pr ON fp."prontuarioId" = pr.id;

-- 8. Reapontar FKs das demais tabelas

-- conversas
ALTER TABLE conversas RENAME COLUMN "leadId" TO "contatoId";
ALTER TABLE conversas DROP CONSTRAINT IF EXISTS conversas_leadId_fkey;
ALTER TABLE conversas
  ADD CONSTRAINT conversas_contatoId_fkey
  FOREIGN KEY ("contatoId") REFERENCES contatos(id) ON DELETE CASCADE;

-- mensagens_whatsapp
ALTER TABLE mensagens_whatsapp RENAME COLUMN "leadId" TO "contatoId";
ALTER TABLE mensagens_whatsapp DROP CONSTRAINT IF EXISTS mensagens_whatsapp_leadId_fkey;
ALTER TABLE mensagens_whatsapp
  ADD CONSTRAINT mensagens_whatsapp_contatoId_fkey
  FOREIGN KEY ("contatoId") REFERENCES contatos(id) ON DELETE CASCADE;

-- agendamentos
ALTER TABLE agendamentos RENAME COLUMN "leadId" TO "contatoId";
ALTER TABLE agendamentos DROP CONSTRAINT IF EXISTS agendamentos_leadId_fkey;
ALTER TABLE agendamentos
  ADD CONSTRAINT agendamentos_contatoId_fkey
  FOREIGN KEY ("contatoId") REFERENCES contatos(id) ON DELETE CASCADE;

-- analista_logs
ALTER TABLE analista_logs RENAME COLUMN "leadId" TO "contatoId";
ALTER TABLE analista_logs DROP CONSTRAINT IF EXISTS analista_logs_leadId_fkey;
ALTER TABLE analista_logs
  ADD CONSTRAINT analista_logs_contatoId_fkey
  FOREIGN KEY ("contatoId") REFERENCES contatos(id) ON DELETE CASCADE;

-- 9. Dropar tabelas antigas
DROP TABLE IF EXISTS agendamentos_paciente CASCADE;
DROP TABLE IF EXISTS fotos_lead CASCADE;
DROP TABLE IF EXISTS fotos_prontuario CASCADE;
DROP TABLE IF EXISTS pacientes CASCADE;
DROP TABLE IF EXISTS leads CASCADE;

COMMIT;

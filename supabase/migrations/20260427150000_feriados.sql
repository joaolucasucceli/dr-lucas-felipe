-- Tabela de feriados pra bloquear criacao de agendamento em datas
-- nao-uteis. Usada tanto pelo POST manual quanto pelo consultar_agenda
-- da IA (filtra slots automaticamente).

CREATE TABLE feriados (
  id text PRIMARY KEY,
  data date NOT NULL UNIQUE,
  nome text NOT NULL,
  "criadoEm" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_feriados_data ON feriados (data);

-- Seed feriados nacionais brasileiros 2026 + 2027.
-- Pascoa 2026 = 05/04; Pascoa 2027 = 28/03.
-- Datas moveis derivadas: Carnaval (-47d), Sexta-feira Santa (-2d),
-- Corpus Christi (+60d).
INSERT INTO feriados (id, data, nome) VALUES
  -- 2026
  ('fer-2026-01-01', '2026-01-01', 'Confraternizacao Universal'),
  ('fer-2026-02-17', '2026-02-17', 'Carnaval'),
  ('fer-2026-04-03', '2026-04-03', 'Sexta-feira Santa'),
  ('fer-2026-04-21', '2026-04-21', 'Tiradentes'),
  ('fer-2026-05-01', '2026-05-01', 'Dia do Trabalho'),
  ('fer-2026-06-04', '2026-06-04', 'Corpus Christi'),
  ('fer-2026-09-07', '2026-09-07', 'Independencia do Brasil'),
  ('fer-2026-10-12', '2026-10-12', 'Nossa Senhora Aparecida'),
  ('fer-2026-11-02', '2026-11-02', 'Finados'),
  ('fer-2026-11-15', '2026-11-15', 'Proclamacao da Republica'),
  ('fer-2026-12-25', '2026-12-25', 'Natal'),
  -- 2027
  ('fer-2027-01-01', '2027-01-01', 'Confraternizacao Universal'),
  ('fer-2027-02-09', '2027-02-09', 'Carnaval'),
  ('fer-2027-03-26', '2027-03-26', 'Sexta-feira Santa'),
  ('fer-2027-04-21', '2027-04-21', 'Tiradentes'),
  ('fer-2027-05-01', '2027-05-01', 'Dia do Trabalho'),
  ('fer-2027-05-27', '2027-05-27', 'Corpus Christi'),
  ('fer-2027-09-07', '2027-09-07', 'Independencia do Brasil'),
  ('fer-2027-10-12', '2027-10-12', 'Nossa Senhora Aparecida'),
  ('fer-2027-11-02', '2027-11-02', 'Finados'),
  ('fer-2027-11-15', '2027-11-15', 'Proclamacao da Republica'),
  ('fer-2027-12-25', '2027-12-25', 'Natal');

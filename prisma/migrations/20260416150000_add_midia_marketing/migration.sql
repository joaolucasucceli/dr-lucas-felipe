CREATE TABLE IF NOT EXISTS midia_marketing (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT NOT NULL,
  procedimento TEXT,
  url TEXT NOT NULL,
  tipo TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE,
  "criadoEm" TIMESTAMPTZ DEFAULT NOW(),
  "atualizadoEm" TIMESTAMPTZ DEFAULT NOW(),
  "deletadoEm" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS midia_marketing_categoria_ativo_idx ON midia_marketing (categoria, ativo);

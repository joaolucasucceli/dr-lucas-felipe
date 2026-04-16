import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const maxDuration = 60

function autorizar(req: NextRequest) {
  const secret = process.env.ADMIN_CLEANUP_SECRET
  if (!secret) return false
  return req.headers.get("x-admin-secret") === secret
}

function gerarId(prefix: string, i: number) {
  return `${prefix}-${String(i).padStart(2, "0")}`
}

const SEED: Array<{
  id: string
  titulo: string
  categoria: string
  procedimento: string | null
  url: string
  tipo: string
}> = [
  // Reels (4 vídeos)
  ...Array.from({ length: 4 }, (_, i) => ({
    id: gerarId("midia-reel", i + 1),
    titulo: `Reel Dr. Lucas #${i + 1}`,
    categoria: "reels",
    procedimento: null,
    url: `/videos/reel-${String(i + 1).padStart(2, "0")}.mp4`,
    tipo: "video",
  })),
  // Lipo abdome e flancos (13 fotos)
  ...Array.from({ length: 13 }, (_, i) => ({
    id: gerarId("midia-lipo-abd", i + 1),
    titulo: `Resultado Lipo Abdome #${i + 1}`,
    categoria: "antes-depois",
    procedimento: "Mini Lipo",
    url: `/images/resultados/lipo-abdome-flancos/${String(i + 1).padStart(2, "0")}.jpeg`,
    tipo: "imagem",
  })),
  // Preenchimento glúteo (4 fotos)
  ...Array.from({ length: 4 }, (_, i) => ({
    id: gerarId("midia-gluteo", i + 1),
    titulo: `Resultado Preenchimento Glúteo #${i + 1}`,
    categoria: "antes-depois",
    procedimento: "Lipo Enxertia Glútea",
    url: `/images/resultados/preenchimento-gluteo/${String(i + 1).padStart(2, "0")}.jpeg`,
    tipo: "imagem",
  })),
  // Lipo braços (1 foto)
  {
    id: "midia-bracos-01",
    titulo: "Resultado Lipo de Braços #1",
    categoria: "antes-depois",
    procedimento: "Mini Lipo",
    url: "/images/resultados/lipo-bracos/01.jpeg",
    tipo: "imagem",
  },
  // Preenchimento panturrilha (1 foto)
  {
    id: "midia-panturrilha-01",
    titulo: "Resultado Preenchimento Panturrilha #1",
    categoria: "antes-depois",
    procedimento: "PMMA",
    url: "/images/resultados/preenchimento-panturrilha/01.jpeg",
    tipo: "imagem",
  },
]

export async function POST(req: NextRequest) {
  if (!autorizar(req)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
  }

  // Aplicar migration (CREATE TABLE se nao existe)
  await prisma.$executeRawUnsafe(`
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
  `)

  const resultados = []
  for (const item of SEED) {
    const r = await prisma.midiaMarketing.upsert({
      where: { id: item.id },
      update: { ...item, ativo: true, deletadoEm: null },
      create: { ...item, ordem: 0 },
    })
    resultados.push({ id: r.id, titulo: r.titulo })
  }

  return NextResponse.json({
    ok: true,
    total: resultados.length,
    sincronizados: resultados.slice(0, 5),
  })
}

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const maxDuration = 30

function autorizar(req: NextRequest) {
  const secret = process.env.ADMIN_CLEANUP_SECRET
  if (!secret) return false
  return req.headers.get("x-admin-secret") === secret
}

const PROCEDIMENTOS = [
  {
    id: "proc-mini-lipo",
    nome: "Mini Lipo",
    tipo: "Cirúrgico",
    descricao: "Lipoaspiração de pequenas áreas com anestesia local",
    valorBase: 8000,
    duracaoMin: 120,
    posOperatorio:
      "Uso de cinta compressiva por 30 dias. Repouso relativo por 7 dias. Drenagem linfática recomendada.",
  },
  {
    id: "proc-lipo-glutea",
    nome: "Lipo Enxertia Glútea",
    tipo: "Cirúrgico",
    descricao:
      "Lipoaspiração com transferência de gordura para glúteos (Brazilian Butt Lift)",
    valorBase: 15000,
    duracaoMin: 180,
    posOperatorio:
      "Evitar sentar diretamente por 15 dias. Cinta compressiva por 45 dias. Drenagem linfática obrigatória.",
  },
  {
    id: "proc-pmma",
    nome: "PMMA",
    tipo: "Estético",
    descricao: "Preenchimento com polimetilmetacrilato para volumização",
    valorBase: 3000,
    duracaoMin: 60,
    posOperatorio:
      "Evitar exercícios intensos por 48h. Massagear a região conforme orientação.",
  },
]

export async function POST(req: NextRequest) {
  if (!autorizar(req)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
  }

  const resultados = []
  for (const proc of PROCEDIMENTOS) {
    const r = await prisma.procedimento.upsert({
      where: { id: proc.id },
      update: {
        nome: proc.nome,
        tipo: proc.tipo,
        descricao: proc.descricao,
        valorBase: proc.valorBase,
        duracaoMin: proc.duracaoMin,
        posOperatorio: proc.posOperatorio,
        ativo: true,
        deletadoEm: null,
      },
      create: proc,
    })
    resultados.push({ id: r.id, nome: r.nome })
  }

  return NextResponse.json({ ok: true, sincronizados: resultados })
}

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const maxDuration = 30

function autorizar(req: NextRequest) {
  const secret = process.env.ADMIN_CLEANUP_SECRET
  if (!secret) return false
  return req.headers.get("x-admin-secret") === secret
}

const PROTOCOLOS = [
  {
    id: "bc-proto-lipofit",
    titulo: "Protocolo LIPO FIT — preparação + lipoaspiração",
    conteudo:
      "O LIPO FIT é um protocolo integrado do Dr. Lucas para pacientes acima do peso ideal: primeiro emagrecemos, depois esculpimos. Objetivo: mais segurança, melhores resultados estéticos e menor risco cirúrgico. Indicado para IMC acima do ideal, gordura difusa e quem busca melhor resultado na lipoaspiração. Etapas: 1) Avaliação inicial (anamnese, bioimpedância, exames, metas). 2) Fase de emagrecimento — LIPO FIT CUT (plano alimentar, estratégias farmacológicas, atividade física, acompanhamento). 3) Preparo cirúrgico (reavaliação, exames, planejamento). 4) Lipoaspiração — LIPO SCULPT (definição, contorno harmônico, alta precisão). 5) Pós-operatório (drenagem linfática, malha compressiva, acompanhamento, manutenção do peso). Diferenciais: abordagem completa, maior segurança, resultados naturais e redução de complicações.",
    secao: "procedimentos",
    ordem: 2,
  },
  {
    id: "bc-proto-lipobutt",
    titulo: "Protocolo LIPOBUTT — lipoaspiração + preenchimento glúteo com PMMA",
    conteudo:
      "O LIPOBUTT é um protocolo combinado do Dr. Lucas que associa lipoaspiração para escultura corporal com preenchimento glúteo definitivo com PMMA (polimetilmetacrilato). Remodela o corpo por completo: definição, volume, projeção e estímulo de colágeno. Indicações: gordura localizada, desejo de definição corporal, baixa projeção glútea, flacidez leve a moderada e busca por resultado duradouro. Etapas: 1) Planejamento (avaliação global, marcação e vetores). 2) Lipoaspiração (aspiração estratégica para harmonização). 3) Preenchimento com PMMA (aplicação profunda, técnica segura para volume e sustentação). Diferenciais: abordagem global, resultado imediato e progressivo, estímulo de colágeno e glúteo definitivo.",
    secao: "procedimentos",
    ordem: 3,
  },
]

export async function POST(req: NextRequest) {
  if (!autorizar(req)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
  }

  const resultados = []
  for (const proto of PROTOCOLOS) {
    const r = await prisma.baseConhecimento.upsert({
      where: { id: proto.id },
      update: { ...proto, ativo: true, deletadoEm: null },
      create: proto,
    })
    resultados.push({ id: r.id, titulo: r.titulo })
  }

  return NextResponse.json({ ok: true, sincronizados: resultados })
}

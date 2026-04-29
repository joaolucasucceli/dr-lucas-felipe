import { NextResponse } from "next/server"

// Sistema 100% autonomo — agendamentos sao criados EXCLUSIVAMENTE pela
// Ana Julia via WhatsApp atraves de POST /api/agente/registrar-agendamento.
// Este endpoint manual foi descontinuado pra forcar todo lead pelo funil
// da IA. Edicao/remarcacao/cancelamento manual continuam disponiveis em
// /api/agendamentos/[id] (PATCH/DELETE) pra uso operacional do gestor.
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Criacao manual de agendamento foi descontinuada. Os agendamentos sao feitos exclusivamente pela Ana Julia via WhatsApp.",
    },
    { status: 410 }
  )
}

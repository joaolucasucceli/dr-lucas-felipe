import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Criacao manual de atendimento foi descontinuada. Leads entram pelo WhatsApp/site e pacientes podem ser criados em Contatos.",
    },
    { status: 410 }
  )
}

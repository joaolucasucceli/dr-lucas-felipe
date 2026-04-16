import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"
import { configurarWebhook, configurarPrivacidade } from "@/lib/uazapi"
import { agora } from "@/lib/db-utils"
import { z } from "zod"

const schema = z.object({
  configId: z.string().min(1),
})

export async function POST(req: Request) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const body = await req.json().catch(() => null)
  const parse = schema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json({ error: "configId obrigatório" }, { status: 400 })
  }

  const { data: config } = await supabaseAdmin
    .from("config_whatsapp")
    .select("id, uazapiUrl, instanceToken")
    .eq("id", parse.data.configId)
    .maybeSingle()

  if (!config) {
    return NextResponse.json({ error: "Instância não encontrada" }, { status: 404 })
  }

  if (!config.instanceToken) {
    return NextResponse.json(
      { error: "Instância sem token — conecte primeiro via QR Code" },
      { status: 400 }
    )
  }

  const baseUrl = (process.env.NEXTAUTH_URL || "http://localhost:3000").trim()
  const webhookUrl = `${baseUrl}/api/webhooks/whatsapp`

  try {
    const webhookToken = process.env.WEBHOOK_SECRET || process.env.API_SECRET || ""
    await configurarWebhook(config.uazapiUrl, config.instanceToken, webhookUrl, webhookToken)
    await supabaseAdmin
      .from("config_whatsapp")
      .update({ webhookUrl, atualizadoEm: agora() })
      .eq("id", config.id)

    try {
      await configurarPrivacidade(config.uazapiUrl, config.instanceToken)
    } catch (privErr) {
      console.error("[reconfigure-webhook] Falha ao configurar privacidade:", privErr instanceof Error ? privErr.message : privErr)
    }

    return NextResponse.json({ sucesso: true, webhookUrl })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao reconfigurar webhook" },
      { status: 500 }
    )
  }
}

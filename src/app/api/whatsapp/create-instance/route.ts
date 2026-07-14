import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"
import { criarInstancia, configurarWebhook, obterQrCode, configurarPrivacidade } from "@/lib/uazapi"
import { agora } from "@/lib/db-utils"

export async function POST(_request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { data: config } = await supabaseAdmin
    .from("config_whatsapp")
    .select("id, uazapiUrl, adminToken, instanceToken")
    .order("criadoEm", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!config) {
    return NextResponse.json(
      { error: "Configure as credenciais primeiro" },
      { status: 400 }
    )
  }

  let instanceToken = config.instanceToken

  if (!instanceToken) {
    const resultado = await criarInstancia(
      config.uazapiUrl,
      config.adminToken,
      "dr-lucas"
    )

    if (!resultado.ok) {
      return NextResponse.json(
        { error: resultado.erro || "Erro ao criar instância" },
        { status: 500 }
      )
    }

    instanceToken = resultado.instanceToken || ""

    await supabaseAdmin
      .from("config_whatsapp")
      .update({ instanceToken, atualizadoEm: agora() })
      .eq("id", config.id)
  }

  try {
    const baseUrl = (process.env.NEXTAUTH_URL || "http://localhost:3000").trim()
    const webhookUrl = `${baseUrl}/api/webhooks/whatsapp`
    let webhookConfigurado = false

    try {
      const webhookToken = process.env.WEBHOOK_SECRET || process.env.API_SECRET || ""
      await configurarWebhook(config.uazapiUrl, instanceToken, webhookUrl, webhookToken)
      await supabaseAdmin
        .from("config_whatsapp")
        .update({ webhookUrl, atualizadoEm: agora() })
        .eq("id", config.id)
      webhookConfigurado = true
    } catch (webhookErr) {
      console.error("[create-instance] Falha ao configurar webhook:", webhookErr instanceof Error ? webhookErr.message : webhookErr)
    }

    const { qrcode } = await obterQrCode(config.uazapiUrl, instanceToken)

    try {
      await configurarPrivacidade(config.uazapiUrl, instanceToken)
    } catch (privErr) {
      console.error("[create-instance] Falha ao configurar privacidade:", privErr instanceof Error ? privErr.message : privErr)
    }

    return NextResponse.json({ sucesso: true, qrcode, webhookConfigurado })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao conectar instância" },
      { status: 500 }
    )
  }
}

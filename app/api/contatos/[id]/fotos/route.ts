import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth } from "@/lib/auth-helpers"
import { criarId } from "@/lib/db-utils"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { id } = await params

  const { data: contato } = await supabaseAdmin
    .from("contatos")
    .select("id")
    .eq("id", id)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!contato) {
    return NextResponse.json({ error: "Contato não encontrado" }, { status: 404 })
  }

  const { data: fotos, error } = await supabaseAdmin
    .from("fotos_contato")
    .select("*")
    .eq("contatoId", id)
    .order("criadoEm", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ dados: fotos ?? [] })
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { id } = await params

  const { data: contato } = await supabaseAdmin
    .from("contatos")
    .select("id")
    .eq("id", id)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!contato) {
    return NextResponse.json({ error: "Contato não encontrado" }, { status: 404 })
  }

  const formData = await request.formData()
  const arquivo = formData.get("arquivo") as File | null
  const descricao = formData.get("descricao") as string | null
  const categoria = (formData.get("categoria") as string | null) ?? "geral"
  const tipoAnalise = formData.get("tipoAnalise") as string | null

  if (!arquivo) {
    return NextResponse.json({ error: "Arquivo é obrigatório" }, { status: 400 })
  }

  const tiposPermitidos = ["image/jpeg", "image/png", "image/webp"]
  if (!tiposPermitidos.includes(arquivo.type)) {
    return NextResponse.json(
      { error: "Tipo de arquivo não permitido. Use JPEG, PNG ou WebP" },
      { status: 400 }
    )
  }

  if (arquivo.size > 10 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Arquivo muito grande. Máximo 10MB" },
      { status: 400 }
    )
  }

  const ext = arquivo.name.split(".").pop() || "jpg"
  const nomeArquivo = `${id}/${criarId()}.${ext}`

  const buffer = Buffer.from(await arquivo.arrayBuffer())

  const { error: uploadError } = await supabaseAdmin.storage
    .from("fotos-leads")
    .upload(nomeArquivo, buffer, {
      contentType: arquivo.type,
    })

  if (uploadError) {
    return NextResponse.json(
      { error: "Erro ao fazer upload da foto" },
      { status: 500 }
    )
  }

  const { data: urlData } = supabaseAdmin.storage
    .from("fotos-leads")
    .getPublicUrl(nomeArquivo)

  const { data: foto, error: insertError } = await supabaseAdmin
    .from("fotos_contato")
    .insert({
      id: criarId(),
      contatoId: id,
      url: urlData.publicUrl,
      categoria,
      descricao,
      tipoAnalise,
    })
    .select("*")
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(foto, { status: 201 })
}

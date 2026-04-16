import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"
import { registrarAuditLog } from "@/lib/audit"
import { criarId, agora } from "@/lib/db-utils"

type RouteParams = { params: Promise<{ id: string }> }

const BUCKET = "fotos-prontuario"
const MAX_SIZE = 10 * 1024 * 1024
const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"]
const TIPOS_FOTO_VALIDOS = ["pre_operatorio", "pos_operatorio", "acompanhamento"]

async function buscarProntuario(pacienteId: string) {
  const { data: paciente } = await supabaseAdmin
    .from("pacientes")
    .select("id")
    .eq("id", pacienteId)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!paciente) return null

  const { data: prontuario } = await supabaseAdmin
    .from("prontuarios")
    .select("id")
    .eq("pacienteId", pacienteId)
    .maybeSingle()

  return prontuario
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params

  const prontuario = await buscarProntuario(id)
  if (!prontuario) {
    return NextResponse.json({ error: "Prontuário não encontrado" }, { status: 404 })
  }

  const { data: fotos, error } = await supabaseAdmin
    .from("fotos_prontuario")
    .select("*")
    .eq("prontuarioId", prontuario.id)
    .order("dataRegistro", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ dados: fotos ?? [] })
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params

  const prontuario = await buscarProntuario(id)
  if (!prontuario) {
    return NextResponse.json({ error: "Prontuário não encontrado" }, { status: 404 })
  }

  const formData = await request.formData()
  const arquivo = formData.get("arquivo") as File | null
  const descricao = formData.get("descricao") as string | null
  const tipoFoto = formData.get("tipoFoto") as string | null

  if (!arquivo) {
    return NextResponse.json({ error: "Arquivo é obrigatório" }, { status: 400 })
  }

  if (!TIPOS_PERMITIDOS.includes(arquivo.type)) {
    return NextResponse.json(
      { error: "Tipo de arquivo não permitido. Use JPEG, PNG ou WebP" },
      { status: 400 }
    )
  }

  if (arquivo.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Arquivo muito grande. Máximo 10MB" },
      { status: 400 }
    )
  }

  if (tipoFoto && !TIPOS_FOTO_VALIDOS.includes(tipoFoto)) {
    return NextResponse.json(
      { error: "Tipo de foto inválido" },
      { status: 400 }
    )
  }

  const ext = arquivo.name.split(".").pop() || "jpg"
  const nomeArquivo = `${prontuario.id}/${criarId()}.${ext}`

  const buffer = Buffer.from(await arquivo.arrayBuffer())

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
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
    .from(BUCKET)
    .getPublicUrl(nomeArquivo)

  const { data: foto, error: insertError } = await supabaseAdmin
    .from("fotos_prontuario")
    .insert({
      id: criarId(),
      prontuarioId: prontuario.id,
      url: urlData.publicUrl,
      descricao: descricao?.trim() || null,
      tipoFoto: tipoFoto || null,
      dataRegistro: agora(),
    })
    .select("*")
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  await registrarAuditLog({
    usuarioId: auth.session.user.id,
    acao: "criar",
    entidade: "FotoProntuario",
    entidadeId: foto.id,
    dadosDepois: foto as unknown as Record<string, unknown>,
  })

  return NextResponse.json(foto, { status: 201 })
}

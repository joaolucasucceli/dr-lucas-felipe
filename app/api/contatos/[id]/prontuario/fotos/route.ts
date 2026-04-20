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
const CATEGORIAS_MEDICAS = ["pre_operatorio", "pos_operatorio", "acompanhamento"]

async function assertPaciente(contatoId: string) {
  const { data: contato } = await supabaseAdmin
    .from("contatos")
    .select("id, tipo")
    .eq("id", contatoId)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!contato) return null
  if (contato.tipo !== "paciente") return null
  return contato
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params

  const paciente = await assertPaciente(id)
  if (!paciente) {
    return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 })
  }

  const { data: fotos, error } = await supabaseAdmin
    .from("fotos_contato")
    .select("*")
    .eq("contatoId", id)
    .in("categoria", CATEGORIAS_MEDICAS)
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

  const paciente = await assertPaciente(id)
  if (!paciente) {
    return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 })
  }

  const formData = await request.formData()
  const arquivo = formData.get("arquivo") as File | null
  const descricao = formData.get("descricao") as string | null
  const tipoFoto = (formData.get("tipoFoto") as string | null) ?? "acompanhamento"

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

  if (!CATEGORIAS_MEDICAS.includes(tipoFoto)) {
    return NextResponse.json({ error: "Tipo de foto inválido" }, { status: 400 })
  }

  const ext = arquivo.name.split(".").pop() || "jpg"
  const nomeArquivo = `${id}/${criarId()}.${ext}`

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
    .from("fotos_contato")
    .insert({
      id: criarId(),
      contatoId: id,
      url: urlData.publicUrl,
      descricao: descricao?.trim() || null,
      categoria: tipoFoto,
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

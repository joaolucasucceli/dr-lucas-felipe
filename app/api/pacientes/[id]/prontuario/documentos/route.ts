import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"
import { registrarAuditLog } from "@/lib/audit"
import { criarId } from "@/lib/db-utils"

type RouteParams = { params: Promise<{ id: string }> }

const BUCKET = "documentos-prontuario"
const MAX_SIZE = 15 * 1024 * 1024
const TIPOS_PERMITIDOS = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]

const TIPOS_DOCUMENTO_VALIDOS = [
  "exame_laboratorial",
  "laudo",
  "termo_consentimento",
  "receita",
  "atestado",
  "outro",
] as const

type TipoDocumento = (typeof TIPOS_DOCUMENTO_VALIDOS)[number]

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

  const { data: documentos, error } = await supabaseAdmin
    .from("documentos_prontuario")
    .select("*")
    .eq("prontuarioId", prontuario.id)
    .order("criadoEm", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ dados: documentos ?? [] })
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
  const tipo = formData.get("tipo") as string | null
  const nome = formData.get("nome") as string | null
  const descricao = formData.get("descricao") as string | null

  if (!arquivo) {
    return NextResponse.json({ error: "Arquivo é obrigatório" }, { status: 400 })
  }

  if (!tipo || !TIPOS_DOCUMENTO_VALIDOS.includes(tipo as TipoDocumento)) {
    return NextResponse.json({ error: "Tipo de documento inválido" }, { status: 400 })
  }

  if (!nome?.trim()) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 })
  }

  if (!TIPOS_PERMITIDOS.includes(arquivo.type)) {
    return NextResponse.json(
      { error: "Tipo de arquivo não permitido. Use PDF, JPEG, PNG ou WebP" },
      { status: 400 }
    )
  }

  if (arquivo.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Arquivo muito grande. Máximo 15MB" },
      { status: 400 }
    )
  }

  const ext = arquivo.name.split(".").pop() || "pdf"
  const storagePath = `${prontuario.id}/${criarId()}.${ext}`

  const buffer = Buffer.from(await arquivo.arrayBuffer())

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: arquivo.type,
    })

  if (uploadError) {
    return NextResponse.json(
      { error: "Erro ao fazer upload do documento" },
      { status: 500 }
    )
  }

  const { data: documento, error: insertError } = await supabaseAdmin
    .from("documentos_prontuario")
    .insert({
      id: criarId(),
      prontuarioId: prontuario.id,
      tipo: tipo as TipoDocumento,
      nome: nome.trim(),
      descricao: descricao?.trim() || null,
      storagePath,
      tamanhoBytes: arquivo.size,
      mimeType: arquivo.type,
    })
    .select("*")
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  await registrarAuditLog({
    usuarioId: auth.session.user.id,
    acao: "criar",
    entidade: "DocumentoProntuario",
    entidadeId: documento.id,
    dadosDepois: documento as unknown as Record<string, unknown>,
  })

  return NextResponse.json(documento, { status: 201 })
}

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createId } from "@paralleldrive/cuid2"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { registrarAuditLog } from "@/lib/audit"
import { supabaseAdmin } from "@/lib/supabase"

type RouteParams = { params: Promise<{ id: string }> }

const BUCKET = "documentos-prontuario"
const MAX_SIZE = 15 * 1024 * 1024 // 15MB
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
]

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params

  const prontuario = await prisma.prontuario.findFirst({
    where: { paciente: { id, deletadoEm: null } },
    select: { id: true },
  })

  if (!prontuario) {
    return NextResponse.json({ error: "Prontuário não encontrado" }, { status: 404 })
  }

  const documentos = await prisma.documentoProntuario.findMany({
    where: { prontuarioId: prontuario.id },
    orderBy: { criadoEm: "desc" },
  })

  return NextResponse.json({ dados: documentos })
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params

  const prontuario = await prisma.prontuario.findFirst({
    where: { paciente: { id, deletadoEm: null } },
    select: { id: true },
  })

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

  if (!tipo || !TIPOS_DOCUMENTO_VALIDOS.includes(tipo)) {
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
  const storagePath = `${prontuario.id}/${createId()}.${ext}`

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

  const documento = await prisma.documentoProntuario.create({
    data: {
      prontuarioId: prontuario.id,
      tipo: tipo as "exame_laboratorial" | "laudo" | "termo_consentimento" | "receita" | "atestado" | "outro",
      nome: nome.trim(),
      descricao: descricao?.trim() || null,
      storagePath,
      tamanhoBytes: arquivo.size,
      mimeType: arquivo.type,
    },
  })

  await registrarAuditLog({
    usuarioId: auth.session.user.id,
    acao: "criar",
    entidade: "DocumentoProntuario",
    entidadeId: documento.id,
    dadosDepois: documento as unknown as Record<string, unknown>,
  })

  return NextResponse.json(documento, { status: 201 })
}

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth, requireAnyRole } from "@/lib/auth-helpers"
import { criarContatoSchema, tipoContatoSchema } from "@/lib/validations/contato"
import { criarId, agora } from "@/lib/db-utils"

const SELECT_CONTATO =
  "id, tipo, nome, whatsapp, email, procedimentoInteresse, statusFunil, origem, arquivado, cpf, criadoEm, promovidoEm, " +
  "responsavel:usuarios!contatos_responsavelId_fkey(id, nome), " +
  "prontuario:prontuarios(id, numero)"

export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { searchParams } = request.nextUrl
  const pagina = Number(searchParams.get("pagina") || "1")
  const porPagina = Number(searchParams.get("porPagina") || "10")
  const tipoParam = searchParams.get("tipo")
  const statusFunil = searchParams.get("statusFunil")
  const procedimentoInteresse = searchParams.get("procedimentoInteresse")
  const responsavelId = searchParams.get("responsavelId")
  const origem = searchParams.get("origem")
  const arquivado = searchParams.get("arquivado")
  const busca = searchParams.get("busca")

  // Atendente só vê contatos tipo lead; gestor vê tudo
  const perfil = auth.session.user.perfil
  let tipoFiltro: "lead" | "paciente" | null = null
  if (tipoParam) {
    const parsed = tipoContatoSchema.safeParse(tipoParam)
    if (parsed.success) tipoFiltro = parsed.data
  }
  if (perfil === "atendente") tipoFiltro = "lead"

  let query = supabaseAdmin
    .from("contatos")
    .select(SELECT_CONTATO, { count: "exact" })
    .is("deletadoEm", null)
    .eq("arquivado", arquivado === "true")

  if (tipoFiltro) query = query.eq("tipo", tipoFiltro)
  if (statusFunil) query = query.eq("statusFunil", statusFunil as never)
  if (procedimentoInteresse) query = query.eq("procedimentoInteresse", procedimentoInteresse)
  if (responsavelId) query = query.eq("responsavelId", responsavelId)
  if (origem) query = query.eq("origem", origem)
  if (busca) {
    query = query.or(`nome.ilike.%${busca}%,whatsapp.ilike.%${busca}%`)
  }
  const inicio = (pagina - 1) * porPagina
  const fim = inicio + porPagina - 1

  const { data, count, error } = await query
    .order("criadoEm", { ascending: false })
    .range(inicio, fim)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    dados: data ?? [],
    total: count ?? 0,
    pagina,
    porPagina,
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(["gestor", "atendente"])
  if (auth.error) return auth.error

  const body = await request.json()
  const parsed = criarContatoSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { whatsapp, consentimentoLgpd, tipo: tipoSolicitado, ...resto } = parsed.data

  const { data: existente } = await supabaseAdmin
    .from("contatos")
    .select("id")
    .eq("whatsapp", whatsapp)
    .is("deletadoEm", null)
    .maybeSingle()

  if (existente) {
    return NextResponse.json(
      { error: "WhatsApp já cadastrado" },
      { status: 409 }
    )
  }

  const tsAgora = agora()

  const insertData = {
    id: criarId(),
    tipo: "lead" as const, // sempre cria como lead; promove logo apos se preciso
    whatsapp,
    atualizadoEm: tsAgora,
    consentimentoLgpd: consentimentoLgpd ?? false,
    consentimentoLgpdEm: consentimentoLgpd ? tsAgora : null,
    ...resto,
    responsavelId: resto.responsavelId ?? null,
  } as never

  const { data: contato, error } = await supabaseAdmin
    .from("contatos")
    .insert(insertData)
    .select(
      "id, tipo, nome, whatsapp, email, procedimentoInteresse, statusFunil, origem, criadoEm"
    )
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Se foi criado como paciente, promove na sequencia (cria prontuario +
  // anamnese vazia via promoverContatoPaciente).
  if (tipoSolicitado === "paciente") {
    const { promoverContatoPaciente } = await import(
      "@/lib/contatos/promover-paciente"
    )
    try {
      await promoverContatoPaciente(contato.id, auth.session.user.id)
      const { data: contatoPaciente } = await supabaseAdmin
        .from("contatos")
        .select(
          "id, tipo, nome, whatsapp, email, procedimentoInteresse, statusFunil, origem, criadoEm"
        )
        .eq("id", contato.id)
        .single()
      return NextResponse.json(contatoPaciente ?? contato, { status: 201 })
    } catch (err) {
      console.error("[Contatos] Falha ao promover apos criar:", err)
      // Contato ja foi criado como lead — devolve assim mesmo, gestor
      // pode promover manualmente depois.
    }
  }

  return NextResponse.json(contato, { status: 201 })
}

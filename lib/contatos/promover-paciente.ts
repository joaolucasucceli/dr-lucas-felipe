import { supabaseAdmin } from "@/lib/supabase"
import { registrarAuditLog } from "@/lib/audit"
import { criarId, agora } from "@/lib/db-utils"

interface ResultadoPromocao {
  contato: {
    id: string
    nome: string
    whatsapp: string | null
    tipo: "lead" | "paciente"
  }
  jaEraPaciente: boolean
}

/** Promove um contato de tipo="lead" pra tipo="paciente" mantendo o mesmo id.
 *  Cria prontuario + anamnese vazia. Marca categoria das fotos existentes.
 *  Idempotente: se ja era paciente, retorna jaEraPaciente=true. */
export async function promoverContatoPaciente(
  contatoId: string,
  usuarioId: string
): Promise<ResultadoPromocao> {
  const { data: contato, error: contatoError } = await supabaseAdmin
    .from("contatos")
    .select("id, nome, whatsapp, tipo")
    .eq("id", contatoId)
    .is("deletadoEm", null)
    .single()

  if (contatoError || !contato) {
    throw new Error(`Contato ${contatoId} não encontrado: ${contatoError?.message ?? "não existe"}`)
  }

  if (contato.tipo === "paciente") {
    return {
      contato: { id: contato.id, nome: contato.nome, whatsapp: contato.whatsapp, tipo: "paciente" },
      jaEraPaciente: true,
    }
  }

  const { data: ultimoProntuario } = await supabaseAdmin
    .from("prontuarios")
    .select("numero")
    .order("numero", { ascending: false })
    .limit(1)
    .maybeSingle()

  const numeroProntuario = (ultimoProntuario?.numero ?? 0) + 1
  const tsAgora = agora()

  const { error: updateError } = await supabaseAdmin
    .from("contatos")
    .update({
      tipo: "paciente",
      promovidoEm: tsAgora,
      atualizadoEm: tsAgora,
    })
    .eq("id", contatoId)

  if (updateError) {
    throw new Error(`Erro ao promover contato: ${updateError.message}`)
  }

  const prontuarioId = criarId()
  const { error: prontuarioError } = await supabaseAdmin
    .from("prontuarios")
    .insert({
      id: prontuarioId,
      atualizadoEm: tsAgora,
      contatoId,
      numero: numeroProntuario,
    })

  if (prontuarioError) {
    throw new Error(`Erro ao criar prontuário: ${prontuarioError.message}`)
  }

  await supabaseAdmin
    .from("anamneses")
    .insert({
      id: criarId(),
      atualizadoEm: tsAgora,
      prontuarioId,
    })

  await registrarAuditLog({
    usuarioId,
    acao: "promover_contato_paciente",
    entidade: "Contato",
    entidadeId: contatoId,
    dadosAntes: { tipo: "lead", nome: contato.nome },
    dadosDepois: { tipo: "paciente", nome: contato.nome, prontuarioId },
  })

  return {
    contato: { id: contato.id, nome: contato.nome, whatsapp: contato.whatsapp, tipo: "paciente" },
    jaEraPaciente: false,
  }
}

import { supabaseAdmin } from "@/lib/supabase"
import { registrarAuditLog } from "@/lib/audit"
import { criarId, agora } from "@/lib/db-utils"

interface ResultadoConversao {
  paciente: {
    id: string
    nome: string
    whatsapp: string | null
  }
  jaCriado: boolean
}

export async function converterLeadParaPaciente(
  leadId: string,
  usuarioId: string
): Promise<ResultadoConversao> {
  const { data: pacienteExistente } = await supabaseAdmin
    .from("pacientes")
    .select("id, nome, whatsapp")
    .eq("leadOrigemId", leadId)
    .maybeSingle()

  if (pacienteExistente) {
    return { paciente: pacienteExistente, jaCriado: true }
  }

  const { data: lead, error: leadError } = await supabaseAdmin
    .from("leads")
    .select("id, nome, whatsapp, email, consentimentoLgpd, consentimentoLgpdEm, sobreOPaciente")
    .eq("id", leadId)
    .single()

  if (leadError || !lead) {
    throw new Error(`Lead ${leadId} não encontrado: ${leadError?.message ?? "não existe"}`)
  }

  const { data: fotos } = await supabaseAdmin
    .from("fotos_lead")
    .select("url, descricao, criadoEm")
    .eq("leadId", leadId)

  const { data: ultimoProntuario } = await supabaseAdmin
    .from("prontuarios")
    .select("numero")
    .order("numero", { ascending: false })
    .limit(1)
    .maybeSingle()

  const numeroProntuario = (ultimoProntuario?.numero ?? 0) + 1
  const tsAgora = agora()

  const novoPacienteId = criarId()
  const { error: pacienteError } = await supabaseAdmin
    .from("pacientes")
    .insert({
      id: novoPacienteId,
      atualizadoEm: tsAgora,
      nome: lead.nome,
      whatsapp: lead.whatsapp,
      email: lead.email,
      leadOrigemId: lead.id,
      consentimentoLgpd: lead.consentimentoLgpd,
      consentimentoLgpdEm: lead.consentimentoLgpdEm,
      observacoes: lead.sobreOPaciente,
    })

  if (pacienteError) {
    throw new Error(`Erro ao criar paciente: ${pacienteError.message}`)
  }

  const prontuarioId = criarId()
  const { error: prontuarioError } = await supabaseAdmin
    .from("prontuarios")
    .insert({
      id: prontuarioId,
      atualizadoEm: tsAgora,
      pacienteId: novoPacienteId,
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

  if (fotos && fotos.length > 0) {
    await supabaseAdmin
      .from("fotos_prontuario")
      .insert(
        fotos.map((foto) => ({
          id: criarId(),
          prontuarioId,
          url: foto.url,
          descricao: foto.descricao,
          tipoFoto: "pre_operatorio",
          dataRegistro: foto.criadoEm,
        }))
      )
  }

  await supabaseAdmin
    .from("leads")
    .update({
      arquivado: true,
      arquivadoEm: tsAgora,
      atualizadoEm: tsAgora,
    })
    .eq("id", leadId)

  const resultado = {
    id: novoPacienteId,
    nome: lead.nome,
    whatsapp: lead.whatsapp,
  }

  await registrarAuditLog({
    usuarioId,
    acao: "converter_lead_paciente",
    entidade: "Paciente",
    entidadeId: resultado.id,
    dadosAntes: { leadId, leadNome: lead.nome },
    dadosDepois: { pacienteId: resultado.id, pacienteNome: resultado.nome },
  })

  return { paciente: resultado, jaCriado: false }
}

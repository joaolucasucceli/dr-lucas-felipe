import { supabaseAdmin } from "@/lib/supabase"
import { criarId, agora } from "@/lib/db-utils"

export async function sincronizarFunil(
  leadId: string,
  novoStatus: string
): Promise<void> {
  await supabaseAdmin
    .from("leads")
    .update({
      statusFunil: novoStatus as never,
      ultimaMovimentacaoEm: agora(),
      atualizadoEm: agora(),
    })
    .eq("id", leadId)
}

export async function avancarEtapa(
  conversaId: string,
  novaEtapa: string
): Promise<void> {
  await supabaseAdmin
    .from("conversas")
    .update({ etapa: novaEtapa as never, atualizadoEm: agora() })
    .eq("id", conversaId)
}

interface ResultadoNovoCiclo {
  conversaId: string
  cicloAtual: number
  statusAnterior: string
}

export async function abrirNovoCiclo(leadId: string): Promise<ResultadoNovoCiclo> {
  const { data: pacienteVinculado } = await supabaseAdmin
    .from("pacientes")
    .select("id")
    .eq("leadOrigemId", leadId)
    .maybeSingle()

  if (pacienteVinculado) {
    throw new Error(
      `Lead ${leadId} já foi convertido em paciente (${pacienteVinculado.id}). Novo ciclo bloqueado.`
    )
  }

  const { data: lead, error: leadError } = await supabaseAdmin
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .single()

  if (leadError || !lead) {
    throw new Error(`Lead ${leadId} não encontrado`)
  }

  const statusAnterior = lead.statusFunil
  const novoCiclo = lead.cicloAtual + 1
  const dataFormatada = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  })

  const notaRetorno = `\n\n[Ciclo ${novoCiclo} iniciado em ${dataFormatada}]: Paciente retornou via WhatsApp. Status anterior: ${statusAnterior}.`
  const tsAgora = agora()

  const conversaId = criarId()
  const { error: convError } = await supabaseAdmin
    .from("conversas")
    .insert({
      id: conversaId,
      atualizadoEm: tsAgora,
      leadId,
      etapa: "qualificacao",
      ciclo: novoCiclo,
    })

  if (convError) {
    throw new Error(`Erro ao criar nova conversa: ${convError.message}`)
  }

  const { error: updateError } = await supabaseAdmin
    .from("leads")
    .update({
      cicloAtual: novoCiclo,
      ciclosCompletos: lead.ciclosCompletos + 1,
      ehRetorno: true,
      statusFunil: "qualificacao",
      ultimaMovimentacaoEm: tsAgora,
      atualizadoEm: tsAgora,
      arquivado: false,
      arquivadoEm: null,
      sobreOPaciente: lead.sobreOPaciente
        ? `${lead.sobreOPaciente}${notaRetorno}`
        : notaRetorno.trim(),
    })
    .eq("id", leadId)

  if (updateError) {
    throw new Error(`Erro ao atualizar lead: ${updateError.message}`)
  }

  return {
    conversaId,
    cicloAtual: novoCiclo,
    statusAnterior,
  }
}

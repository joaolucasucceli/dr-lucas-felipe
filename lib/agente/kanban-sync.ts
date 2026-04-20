import { supabaseAdmin } from "@/lib/supabase"
import { criarId, agora } from "@/lib/db-utils"

export async function sincronizarFunil(
  contatoId: string,
  novoStatus: string
): Promise<void> {
  await supabaseAdmin
    .from("contatos")
    .update({
      statusFunil: novoStatus as never,
      ultimaMovimentacaoEm: agora(),
      atualizadoEm: agora(),
    })
    .eq("id", contatoId)
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

export async function abrirNovoCiclo(contatoId: string): Promise<ResultadoNovoCiclo> {
  const { data: contato, error: contatoError } = await supabaseAdmin
    .from("contatos")
    .select("*")
    .eq("id", contatoId)
    .is("deletadoEm", null)
    .single()

  if (contatoError || !contato) {
    throw new Error(`Contato ${contatoId} não encontrado`)
  }

  if (contato.tipo === "paciente") {
    throw new Error(
      `Contato ${contatoId} já é paciente. Novo ciclo bloqueado.`
    )
  }

  const statusAnterior = contato.statusFunil ?? "acolhimento"
  const novoCiclo = contato.cicloAtual + 1
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
      contatoId,
      etapa: "qualificacao",
      ciclo: novoCiclo,
    })

  if (convError) {
    throw new Error(`Erro ao criar nova conversa: ${convError.message}`)
  }

  const { error: updateError } = await supabaseAdmin
    .from("contatos")
    .update({
      cicloAtual: novoCiclo,
      ciclosCompletos: contato.ciclosCompletos + 1,
      ehRetorno: true,
      statusFunil: "qualificacao",
      ultimaMovimentacaoEm: tsAgora,
      atualizadoEm: tsAgora,
      arquivado: false,
      arquivadoEm: null,
      sobreOPaciente: contato.sobreOPaciente
        ? `${contato.sobreOPaciente}${notaRetorno}`
        : notaRetorno.trim(),
    })
    .eq("id", contatoId)

  if (updateError) {
    throw new Error(`Erro ao atualizar contato: ${updateError.message}`)
  }

  return {
    conversaId,
    cicloAtual: novoCiclo,
    statusAnterior,
  }
}

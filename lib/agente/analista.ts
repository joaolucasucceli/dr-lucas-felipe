import { openai } from "@/lib/openai"
import { supabaseAdmin } from "@/lib/supabase"
import { criarId } from "@/lib/db-utils"
import { SYSTEM_PROMPT_ANALISTA } from "@/lib/agente/analista-prompt"
import {
  aplicarMudancasAnalista,
  analistaWriteModeAtivo,
} from "@/lib/agente/analista-aplicar"
import type {
  AnalistaOutput,
  Divergencia,
  EstadoAtualLead,
  MensagemHistorico,
} from "@/lib/agente/analista-types"
import type { Json } from "@/lib/types/database"

const MAX_MENSAGENS_HISTORICO = 30

function calcularDivergencias(
  atual: EstadoAtualLead,
  output: AnalistaOutput
): Divergencia[] {
  const divs: Divergencia[] = []

  if (output.nome && output.nome !== atual.nome) {
    divs.push({ campo: "nome", atual: atual.nome, proposto: output.nome })
  }

  if (
    output.procedimentoInteresse &&
    output.procedimentoInteresse !== atual.procedimentoInteresse
  ) {
    divs.push({
      campo: "procedimentoInteresse",
      atual: atual.procedimentoInteresse,
      proposto: output.procedimentoInteresse,
    })
  }

  if (output.etapaCorreta !== "manter" && output.etapaCorreta !== atual.statusFunil) {
    divs.push({
      campo: "statusFunil",
      atual: atual.statusFunil,
      proposto: output.etapaCorreta,
    })
  }

  if (output.sobreOPacienteAdicionar && output.sobreOPacienteAdicionar.trim()) {
    divs.push({
      campo: "sobreOPaciente",
      atual: atual.sobreOPaciente ?? "",
      proposto: `(append) ${output.sobreOPacienteAdicionar}`,
    })
  }

  if (output.agendamentoDetectado) {
    divs.push({
      campo: "agendamento",
      atual: null,
      proposto: output.agendamentoDetectado,
    })
  }

  return divs
}

async function carregarEstadoAtual(leadId: string): Promise<EstadoAtualLead | null> {
  const { data } = await supabaseAdmin
    .from("leads")
    .select("nome, statusFunil, procedimentoInteresse, sobreOPaciente")
    .eq("id", leadId)
    .maybeSingle()
  return data ?? null
}

async function carregarHistorico(
  conversaId: string
): Promise<MensagemHistorico[]> {
  const { data } = await supabaseAdmin
    .from("mensagens_whatsapp")
    .select("remetente, conteudo, criadoEm")
    .eq("conversaId", conversaId)
    .order("criadoEm", { ascending: false })
    .limit(MAX_MENSAGENS_HISTORICO)

  if (!data) return []
  return data.reverse() as MensagemHistorico[]
}

function formatarHistoricoParaPrompt(historico: MensagemHistorico[]): string {
  return historico
    .map((m) => {
      const quem =
        m.remetente === "paciente"
          ? "PACIENTE"
          : m.remetente === "atendente"
            ? "ATENDENTE"
            : "ANA JULIA"
      return `[${quem}] ${m.conteudo}`
    })
    .join("\n")
}

async function chamarAnalistaLLM(
  historico: MensagemHistorico[],
  atual: EstadoAtualLead
): Promise<AnalistaOutput> {
  const userContent = `## Estado atual do lead no CRM

- nome: ${atual.nome}
- statusFunil: ${atual.statusFunil}
- procedimentoInteresse: ${atual.procedimentoInteresse ?? "null"}
- sobreOPaciente (ja registrado): ${atual.sobreOPaciente ?? "(vazio)"}

## Historico da conversa (ordem cronologica)

${formatarHistoricoParaPrompt(historico)}

## Sua tarefa

Retorne APENAS um JSON com a seguinte estrutura:

{
  "nome": string | null,
  "procedimentoInteresse": string | null,
  "qualificacaoComercial": {
    "orcamento": string | null,
    "timing": string | null,
    "decisor": string | null,
    "contraindicacao": string | null,
    "score": number
  },
  "sobreOPacienteAdicionar": string | null,
  "etapaCorreta": "acolhimento" | "qualificacao" | "pre_agendamento" | "verificacao_humana" | "consulta_agendada" | "manter",
  "agendamentoDetectado": { "dataIso": string | null, "hora": string | null, "confianca": number } | null,
  "justificativa": string,
  "confiancaGeral": number
}`

  const resposta = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT_ANALISTA },
      { role: "user", content: userContent },
    ],
    temperature: 0.2,
  })

  const raw = resposta.choices[0]?.message?.content
  if (!raw) throw new Error("Analista retornou resposta vazia")

  return JSON.parse(raw) as AnalistaOutput
}

/**
 * Analisa uma conversa e registra o resultado em analista_logs.
 *
 * Shadow mode (ANALISTA_WRITE_MODE ausente/false): apenas loga, nao escreve.
 * Write mode (ANALISTA_WRITE_MODE=true): aplica as mudancas via
 * `aplicarMudancasAnalista` e marca `aplicado: true` no log.
 */
export async function analisarConversa(params: {
  leadId: string
  conversaId: string | null
}): Promise<void> {
  const { leadId, conversaId } = params

  let historico: MensagemHistorico[] = []
  let estadoAtual: EstadoAtualLead | null = null
  let output: AnalistaOutput | null = null
  let divergencias: Divergencia[] = []
  let erro: string | null = null
  let aplicado = false

  try {
    estadoAtual = await carregarEstadoAtual(leadId)
    if (!estadoAtual) {
      console.warn(`[Analista] Lead ${leadId} nao encontrado`)
      return
    }

    if (conversaId) {
      historico = await carregarHistorico(conversaId)
    }

    if (historico.length === 0) {
      console.log(`[Analista] Conversa ${conversaId} sem historico — skip`)
      return
    }

    output = await chamarAnalistaLLM(historico, estadoAtual)
    divergencias = calcularDivergencias(estadoAtual, output)

    // Fase 2 — aplicar de verdade quando a flag estiver ligada.
    if (analistaWriteModeAtivo() && output && divergencias.length > 0) {
      try {
        const resultado = await aplicarMudancasAnalista({
          leadId,
          conversaId,
          estadoAtual,
          output,
        })
        aplicado = resultado.camposAtualizados.length > 0 || resultado.etapaAvancada !== null
        console.log(`[Analista] Aplicou mudancas em ${leadId}:`, JSON.stringify(resultado))
      } catch (err) {
        console.error("[Analista] Falha ao aplicar mudancas:", err)
        erro = `Aplicacao falhou: ${err instanceof Error ? err.message : String(err)}`
      }
    }
  } catch (err) {
    erro = err instanceof Error ? err.message : String(err)
    console.error("[Analista] Erro na analise:", erro)
  }

  try {
    await supabaseAdmin.from("analista_logs").insert({
      id: criarId(),
      leadId,
      conversaId,
      historicoMensagens: historico as unknown as Json,
      estadoAtualLead: (estadoAtual ?? null) as unknown as Json,
      output: (output ?? null) as unknown as Json,
      divergencias: divergencias as unknown as Json,
      aplicado,
      confiancaGeral: output?.confiancaGeral ?? null,
      erro,
    })
  } catch (err) {
    console.error("[Analista] Erro ao gravar log:", err)
  }
}

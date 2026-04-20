import { BrainCog, ClipboardList, TrendingUp, FileText, AlertTriangle } from "lucide-react"
import { HeroBanner } from "../HeroBanner"
import { FeaturesGrid } from "../FeaturesGrid"
import { ComoUsarSection } from "../ComoUsarSection"
import { DicaImportante } from "../DicaImportante"

export function ModuloEduarda() {
  return (
    <div className="space-y-8">
      <HeroBanner
        icone={<BrainCog />}
        titulo="Eduarda"
        subtitulo="Analista que lê as conversas da Ana Júlia e escreve no CRM"
        gradientClasses="from-violet-600 to-purple-400"
      />

      <FeaturesGrid
        features={[
          {
            icone: <ClipboardList />,
            titulo: "Análise fire-and-forget",
            descricao: "Disparada ao final de cada loop da Ana Júlia. GPT-4o-mini lê histórico + estado do lead e devolve JSON estruturado.",
          },
          {
            icone: <TrendingUp />,
            titulo: "Avança o funil",
            descricao: "Transições permitidas: Acolhimento → Qualificação → Agendamento. Nunca regride etapa, nunca avança pra Reunião Agendada (isso é da Ana Júlia via tool).",
          },
          {
            icone: <FileText />,
            titulo: "Escreve no CRM",
            descricao: "Atualiza nome, procedimentoInteresse, sobreOPaciente (append, nunca sobrescreve), statusFunil e qualificacaoComercial (score 0-100).",
          },
          {
            icone: <AlertTriangle />,
            titulo: "Auditável",
            descricao: "Todas as análises ficam em `analista_logs` com histórico, estado atual, output e divergências aplicadas. Consulte na aba Logs.",
          },
        ]}
      />

      <ComoUsarSection
        passos={[
          { numero: 1, titulo: "Ana Júlia termina a resposta", descricao: "Ao final de cada loop da Ana Júlia, a Eduarda é disparada em fire-and-forget." },
          { numero: 2, titulo: "Carrega contexto", descricao: "Lê os últimos 30 turnos da conversa + estado atual do lead no CRM." },
          { numero: 3, titulo: "Análise LLM", descricao: "GPT-4o-mini devolve JSON com nome, procedimento, qualificação comercial, etapaCorreta e justificativa." },
          { numero: 4, titulo: "Aplica no CRM", descricao: "Se ANALISTA_WRITE_MODE=true e houver divergências, aplica respeitando TRANSICOES_PERMITIDAS (nunca regride, nunca salta pra consulta_agendada)." },
          { numero: 5, titulo: "Auditoria", descricao: "Grava log completo em `analista_logs` com histórico, output e divergências aplicadas." },
        ]}
      />

      <DicaImportante
        texto="Sinais comerciais relevantes (timing, decisor, orçamento, contraindicações) são adicionados no sobreOPaciente com prefixo [sinal:...] ou [desqualificacao:...] pra o atendente humano filtrar depois."
      />

      <div className="space-y-3">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Matriz de score (0-100)
        </h3>
        <p className="text-sm text-muted-foreground">
          Começa em 50 (neutro). Adiciona pontos por timing claro, decisor = paciente, expectativa realista.
          Subtrai por orçamento = só comparando preço, contraindicações declaradas, decisão bloqueada por terceiros, localização inviável.
          Lead só avança qualificação → agendamento se score ≥ 40 e sem contraindicação clara.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-base font-semibold">Modo de operação</h3>
        <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
          <li><strong>Shadow mode</strong> (env `ANALISTA_WRITE_MODE` ausente ou `false`): apenas loga, não escreve</li>
          <li><strong>Write mode</strong> (`ANALISTA_WRITE_MODE=true`): aplica mudanças no lead (padrão em produção)</li>
        </ul>
      </div>
    </div>
  )
}

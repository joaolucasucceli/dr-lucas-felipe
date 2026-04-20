import { MessageCircle, Wrench, Target, ShieldAlert, Cog } from "lucide-react"
import { HeroBanner } from "../HeroBanner"
import { FeaturesGrid } from "../FeaturesGrid"
import { ComoUsarSection } from "../ComoUsarSection"
import { DicaImportante } from "../DicaImportante"

export function ModuloAnaJulia() {
  return (
    <div className="space-y-8">
      <HeroBanner
        icone={<MessageCircle />}
        titulo="Ana Júlia"
        subtitulo="SDR que atende pacientes no WhatsApp via GPT-4o"
        gradientClasses="from-pink-500 to-rose-400"
      />

      <FeaturesGrid
        features={[
          {
            icone: <MessageCircle />,
            titulo: "Conversa no WhatsApp",
            descricao: "Recebe mensagens via webhook Uazapi, responde com GPT-4o segmentando em blocos naturais com delay entre mensagens.",
          },
          {
            icone: <Target />,
            titulo: "Conduz o funil",
            descricao: "Acolhimento → Qualificação → Agendamento → Reunião Agendada. Ela chega até 'Reunião Agendada' via tool de registrar agendamento.",
          },
          {
            icone: <Wrench />,
            titulo: "9 ferramentas",
            descricao: "Consulta paciente, procedimentos, base de conhecimento e agenda; registra e atualiza agendamentos; lista e envia mídias de marketing.",
          },
          {
            icone: <ShieldAlert />,
            titulo: "14 regras absolutas",
            descricao: "Nunca informa preço, nunca admite ser IA, nunca usa emojis, sempre consulta ferramentas antes de responder, separa respostas em blocos com `---`.",
          },
        ]}
      />

      <ComoUsarSection
        passos={[
          { numero: 1, titulo: "Paciente manda mensagem", descricao: "Chega no WhatsApp da clínica via Uazapi." },
          { numero: 2, titulo: "Buffer Redis", descricao: "Webhook agrupa mensagens com debounce de 20s pra evitar respostas fragmentadas." },
          { numero: 3, titulo: "Ana Júlia lê e responde", descricao: "GPT-4o processa o histórico + tools disponíveis e devolve a resposta em blocos separados por '---'." },
          { numero: 4, titulo: "Fecha horário", descricao: "Quando o paciente confirma um horário, a tool `registrar_agendamento` cria o evento no Google Calendar e avança o funil pra Reunião Agendada." },
          { numero: 5, titulo: "Pós-agendamento", descricao: "Ana Júlia continua respondendo dúvidas (localização, pagamento, preparação) consultando a base de conhecimento." },
        ]}
      />

      <div className="space-y-3">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <Wrench className="h-4 w-4" />
          Ferramentas disponíveis
        </h3>
        <div className="rounded-md border overflow-hidden text-sm">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-2 font-medium">Ferramenta</th>
                <th className="text-left p-2 font-medium">Função</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr><td className="p-2 font-mono text-xs">consultar_paciente</td><td className="p-2">Busca lead pelo WhatsApp (cria se não existir)</td></tr>
              <tr><td className="p-2 font-mono text-xs">consultar_procedimentos</td><td className="p-2">Lista procedimentos ativos da clínica</td></tr>
              <tr><td className="p-2 font-mono text-xs">consultar_base_conhecimento</td><td className="p-2">Busca info da clínica (pagamento, pós-operatório, Dr. Lucas etc)</td></tr>
              <tr><td className="p-2 font-mono text-xs">consultar_agenda</td><td className="p-2">Slots livres no Google Calendar (próximos 14 dias)</td></tr>
              <tr><td className="p-2 font-mono text-xs">registrar_agendamento</td><td className="p-2">Cria consulta + evento no Calendar (avança funil)</td></tr>
              <tr><td className="p-2 font-mono text-xs">atualizar_agendamento</td><td className="p-2">Remarca ou cancela consulta existente</td></tr>
              <tr><td className="p-2 font-mono text-xs">registrar_mensagem</td><td className="p-2">Persiste mensagem na conversa (chamado automaticamente)</td></tr>
              <tr><td className="p-2 font-mono text-xs">listar_midias</td><td className="p-2">Lista mídias de marketing disponíveis com descrição</td></tr>
              <tr><td className="p-2 font-mono text-xs">enviar_midia</td><td className="p-2">Envia foto/vídeo escolhida ao paciente</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <DicaImportante
        texto="Ana Júlia não faz data entry estruturado. Ela só conversa. Quem lê o histórico e escreve no CRM (nome, procedimento, sobreOPaciente, avanço de etapa) é a Eduarda — analista que roda em pipeline separado."
      />

      <div className="space-y-3">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <Cog className="h-4 w-4" />
          Configuração
        </h3>
        <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
          <li>WhatsApp: Configurações → WhatsApp (instância Uazapi v2)</li>
          <li>Google Calendar: Configurações → Google Agenda (OAuth + refreshToken)</li>
          <li>Prompt base: `lib/agente/prompt.ts` (edição técnica, não pelo painel)</li>
        </ul>
      </div>
    </div>
  )
}

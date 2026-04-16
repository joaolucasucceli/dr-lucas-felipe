import { Kanban, Columns2, Bot, Hand, Filter, MessageSquare, Clock, Image } from "lucide-react"
import { HeroBanner } from "../HeroBanner"
import { FeaturesGrid } from "../FeaturesGrid"
import { ComoUsarSection } from "../ComoUsarSection"
import { PermissoesCallout } from "../PermissoesCallout"
import { DicaImportante } from "../DicaImportante"

export function ModuloAtendimentos() {
  return (
    <div className="space-y-8">
      <HeroBanner
        icone={<Kanban />}
        titulo="Atendimentos"
        subtitulo="Visualização em kanban do funil de atendimento com 9 etapas"
        gradientClasses="from-orange-500 to-amber-400"
      />

      <FeaturesGrid
        features={[
          {
            icone: <Columns2 />,
            titulo: "9 etapas do funil",
            descricao: "Acolhimento → Qualificação → Agendamento → Consulta Agendada → Consulta Realizada → Sinal Pago → Procedimento Agendado → Concluído → Perdido.",
          },
          {
            icone: <Bot />,
            titulo: "Movimentação automática",
            descricao: "As etapas 1 a 4 são movidas automaticamente pela Ana Júlia conforme o atendimento via WhatsApp avança.",
          },
          {
            icone: <Hand />,
            titulo: "Ação manual (etapas 5–8)",
            descricao: "Consulta Realizada, Sinal Pago, Procedimento Agendado e Concluído exigem ação manual do atendente ou gestor.",
          },
          {
            icone: <Filter />,
            titulo: "Filtros avançados",
            descricao: "Filtre cards por responsável, etapa, procedimento de interesse ou busca por nome do paciente.",
          },
        ]}
      />

      <ComoUsarSection
        passos={[
          {
            numero: 1,
            titulo: "Visualize o funil",
            descricao: "Cada coluna representa uma etapa. O número no cabeçalho mostra a quantidade de leads naquela etapa.",
          },
          {
            numero: 2,
            titulo: "Avance leads manualmente",
            descricao: "Use o menu do card (três pontos) ou arraste para mudar a etapa de um lead nas colunas 5 a 8.",
          },
          {
            numero: 3,
            titulo: "Registre o motivo de perda",
            descricao: "Ao mover um lead para 'Perdido', informe o motivo. Esse dado alimenta os relatórios de perda.",
          },
        ]}
      />

      <FeaturesGrid
        features={[
          {
            icone: <Bot />,
            titulo: "Ana Júlia — Agente IA",
            descricao: "Atendimento autônomo via WhatsApp. Conduz acolhimento, qualificação e agendamento seguindo script fixo com 7 ferramentas integradas.",
          },
          {
            icone: <Clock />,
            titulo: "Debounce inteligente",
            descricao: "Espera 20 segundos após a última mensagem do paciente para responder. Se ele enviar 3 mensagens seguidas, a IA responde tudo junto.",
          },
          {
            icone: <MessageSquare />,
            titulo: "Mensagens humanizadas",
            descricao: "Respostas quebradas em múltiplas mensagens curtas (como humano faria). Sem emojis, sem mencionar erros internos.",
          },
          {
            icone: <Image />,
            titulo: "Mídia via WhatsApp",
            descricao: "A IA processa áudios (Whisper), fotos (GPT-4o-mini vision) e envia mídias de marketing quando o paciente pede referência visual.",
          },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <PermissoesCallout
          permissoes={[
            {
              perfil: "Gestor",
              acesso: "total",
              acoes: ["Move leads entre etapas", "Arquiva e reatribui leads", "Visualiza todos os responsáveis"],
            },
            {
              perfil: "Atendente",
              acesso: "total",
              acoes: ["Move leads nas etapas manuais", "Atualiza informações dos cards"],
            },
          ]}
        />
        <DicaImportante
          texto="A Ana Júlia move leads automaticamente até 'Consulta Agendada' (etapa 4). A partir daí, o time clínico assume o controle manual do funil."
          variante="info"
        />
      </div>
    </div>
  )
}

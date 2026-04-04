import { Kanban, Columns2, Bot, Hand, Filter } from "lucide-react"
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

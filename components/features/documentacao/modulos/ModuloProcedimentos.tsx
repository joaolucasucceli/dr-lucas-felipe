import { Stethoscope, Package, ToggleLeft, Clock } from "lucide-react"
import { HeroBanner } from "../HeroBanner"
import { FeaturesGrid } from "../FeaturesGrid"
import { ComoUsarSection } from "../ComoUsarSection"
import { PermissoesCallout } from "../PermissoesCallout"
import { DicaImportante } from "../DicaImportante"

export function ModuloProcedimentos() {
  return (
    <div className="space-y-8">
      <HeroBanner
        icone={<Stethoscope />}
        titulo="Procedimentos"
        subtitulo="Catálogo de procedimentos da clínica com duração e orientações"
        gradientClasses="from-rose-600 to-pink-400"
      />

      <FeaturesGrid
        features={[
          {
            icone: <Package />,
            titulo: "Catálogo de procedimentos",
            descricao: "Lista com nome, tipo (cirúrgico, estético, minimamente invasivo) e duração estimada em minutos.",
          },
          {
            icone: <ToggleLeft />,
            titulo: "Ativação e desativação",
            descricao: "Procedimentos inativos não aparecem para seleção em leads e agendamentos, sem perder o histórico existente.",
          },
          {
            icone: <Clock />,
            titulo: "Duração e pós-operatório",
            descricao: "Cada procedimento tem duração média e instruções pós-operatórias próprias, usadas para orientar o paciente.",
          },
        ]}
      />

      <ComoUsarSection
        passos={[
          {
            numero: 1,
            titulo: "Visualize o catálogo",
            descricao: "A tabela exibe todos os procedimentos com tipo, duração e status ativo/inativo.",
          },
          {
            numero: 2,
            titulo: "Cadastre um procedimento",
            descricao: "Clique em 'Novo Procedimento', preencha nome, tipo, duração em minutos e instruções pós-operatórias.",
          },
          {
            numero: 3,
            titulo: "Gerencie o status",
            descricao: "Use o menu de ações (três pontos) para editar informações ou ativar/desativar um procedimento.",
          },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <PermissoesCallout
          permissoes={[
            {
              perfil: "Gestor",
              acesso: "total",
              acoes: ["Cria, edita e ativa/desativa procedimentos"],
            },
            {
              perfil: "Atendente",
              acesso: "nenhum",
              acoes: [],
            },
          ]}
        />
        <DicaImportante
          texto="O preço de cada procedimento é definido pelo Dr. Lucas na consulta diagnóstica presencial, caso a caso — o sistema não armazena valor monetário. Desative procedimentos que não são mais realizados em vez de excluí-los, pra preservar o histórico."
          variante="sucesso"
        />
      </div>
    </div>
  )
}

import { Stethoscope, Package, ToggleLeft, DollarSign } from "lucide-react"
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
        subtitulo="Catálogo de procedimentos da clínica com valores e duração"
        gradientClasses="from-rose-600 to-pink-400"
      />

      <FeaturesGrid
        features={[
          {
            icone: <Package />,
            titulo: "Catálogo de procedimentos",
            descricao: "Lista completa com nome, tipo (cirúrgico, estético, minimamente invasivo), valor base e duração estimada em minutos.",
          },
          {
            icone: <ToggleLeft />,
            titulo: "Ativação e desativação",
            descricao: "Procedimentos inativos não aparecem para seleção em leads e agendamentos, sem perder o histórico existente.",
          },
          {
            icone: <DollarSign />,
            titulo: "Valores em BRL",
            descricao: "Cadastre o valor base de cada procedimento em reais para uso em relatórios financeiros e orçamentos.",
          },
        ]}
      />

      <ComoUsarSection
        passos={[
          {
            numero: 1,
            titulo: "Visualize o catálogo",
            descricao: "A tabela exibe todos os procedimentos com tipo, valor base, duração e status ativo/inativo.",
          },
          {
            numero: 2,
            titulo: "Cadastre um procedimento",
            descricao: "Clique em 'Novo Procedimento', preencha nome, tipo, duração em minutos, valor base e instruções pós-operatórias.",
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
              acoes: ["Cria, edita e ativa/desativa procedimentos", "Visualiza valores e histórico"],
            },
            {
              perfil: "Atendente",
              acesso: "nenhum",
              acoes: [],
            },
          ]}
        />
        <DicaImportante
          texto="Desative procedimentos que não são mais realizados em vez de excluí-los. Isso preserva o histórico de agendamentos e relatórios financeiros já gerados."
          variante="sucesso"
        />
      </div>
    </div>
  )
}

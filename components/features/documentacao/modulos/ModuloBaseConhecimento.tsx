import { Brain, BookOpen, Bot, ToggleLeft } from "lucide-react"
import { HeroBanner } from "../HeroBanner"
import { FeaturesGrid } from "../FeaturesGrid"
import { ComoUsarSection } from "../ComoUsarSection"
import { DicaImportante } from "../DicaImportante"

export function ModuloBaseConhecimento() {
  return (
    <div className="space-y-6">
      <HeroBanner
        icone={<Brain />}
        titulo="Base de Conhecimento"
        subtitulo="Informações da clínica que a Ana Júlia consulta quando precisa"
        gradientClasses="from-violet-600 to-purple-400"
      />

      <FeaturesGrid
        features={[
          {
            icone: <BookOpen />,
            titulo: "Artigos por seção",
            descricao: "Clínica, procedimentos, pós-operatório, pagamento e geral. Cada artigo tem título e conteúdo.",
          },
          {
            icone: <Bot />,
            titulo: "Consulta sob demanda",
            descricao: "Ana Júlia busca um artigo só quando o paciente pergunta algo relacionado. Não fica na memória da IA.",
          },
          {
            icone: <ToggleLeft />,
            titulo: "Ativar e desativar",
            descricao: "Desative temporariamente um artigo sem perder o conteúdo. Inativos somem da consulta.",
          },
        ]}
      />

      <ComoUsarSection
        passos={[
          { numero: 1, titulo: "Abra a base", descricao: "No menu, clique em 'Base de Conhecimento'. A tabela lista todos os artigos." },
          { numero: 2, titulo: "Crie um artigo", descricao: "'Novo Artigo': escolha seção, título e conteúdo. A IA passa a consultar imediatamente." },
          { numero: 3, titulo: "Atualize quando mudar", descricao: "Edite quando horário, forma de pagamento ou info da clínica mudar." },
        ]}
      />

      <DicaImportante
        texto="Conteúdo desatualizado = resposta errada. Sempre que algo mudar na clínica (horário, forma de pagamento, localização), edite o artigo correspondente."
        variante="aviso"
      />
    </div>
  )
}

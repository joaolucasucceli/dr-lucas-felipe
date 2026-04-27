import { Brain, BookOpen, Bot, Trash2 } from "lucide-react"
import { HeroBanner } from "../HeroBanner"
import { FeaturesGrid } from "../FeaturesGrid"
import { ComoUsarSection } from "../ComoUsarSection"
import { DicaImportante } from "../DicaImportante"

export function ModuloBaseConhecimento() {
  return (
    <div className="space-y-6">
      <HeroBanner
        icone={<Brain />}
        titulo="Conteúdo em Texto"
        subtitulo="Informações da clínica que a Ana Júlia consulta quando precisa"
        gradientClasses="from-violet-900 to-purple-700"
      />

      <FeaturesGrid
        features={[
          {
            icone: <BookOpen />,
            titulo: "Título e conteúdo",
            descricao: "Cada registro é uma informação simples — um título descritivo e o texto que a Ana Júlia pode usar.",
          },
          {
            icone: <Bot />,
            titulo: "Consulta sob demanda",
            descricao: "Ana Júlia busca por palavra-chave só quando o paciente pergunta algo relacionado. Não fica na memória da IA.",
          },
          {
            icone: <Trash2 />,
            titulo: "Existe ou não existe",
            descricao: "Não há ativar/desativar. Se o registro está aqui, a Ana Júlia usa. Pra parar de usar, exclua.",
          },
        ]}
      />

      <ComoUsarSection
        passos={[
          { numero: 1, titulo: "Abra a aba", descricao: "No menu, abra 'Conteúdo da IA' → aba 'Conteúdo em Texto'. A tabela lista tudo cadastrado." },
          { numero: 2, titulo: "Crie um texto", descricao: "'Novo Texto': preencha título e conteúdo. A Ana Júlia passa a consultar imediatamente." },
          { numero: 3, titulo: "Atualize quando mudar", descricao: "Edite sempre que horário, forma de pagamento ou info da clínica mudar." },
        ]}
      />

      <DicaImportante
        texto="Conteúdo desatualizado = resposta errada. Sempre que algo mudar na clínica (horário, forma de pagamento, localização), edite o registro correspondente."
        variante="aviso"
      />
    </div>
  )
}

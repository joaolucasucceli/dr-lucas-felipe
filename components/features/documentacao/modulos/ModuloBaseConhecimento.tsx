import { Brain, BookOpen, Bot, ToggleLeft } from "lucide-react"
import { HeroBanner } from "../HeroBanner"
import { FeaturesGrid } from "../FeaturesGrid"
import { ComoUsarSection } from "../ComoUsarSection"
import { PermissoesCallout } from "../PermissoesCallout"
import { DicaImportante } from "../DicaImportante"

export function ModuloBaseConhecimento() {
  return (
    <div className="space-y-8">
      <HeroBanner
        icone={<Brain />}
        titulo="Base de Conhecimento"
        subtitulo="Artigos que alimentam o contexto da Ana Júlia no atendimento"
        gradientClasses="from-violet-600 to-purple-400"
      />

      <FeaturesGrid
        features={[
          {
            icone: <BookOpen />,
            titulo: "Artigos por seção",
            descricao: "Organize artigos em seções: clínica, procedimentos, pós-operatório, pagamento e geral. Cada artigo tem título, conteúdo e ordem.",
          },
          {
            icone: <Bot />,
            titulo: "Contexto dinâmico da IA",
            descricao: "Artigos ativos são carregados automaticamente no prompt da Ana Júlia. Quando você atualiza, a IA reflete imediatamente.",
          },
          {
            icone: <ToggleLeft />,
            titulo: "Ativar e desativar",
            descricao: "Desative artigos temporariamente sem perder o conteúdo. Artigos inativos não aparecem no contexto da IA.",
          },
        ]}
      />

      <ComoUsarSection
        passos={[
          {
            numero: 1,
            titulo: "Acesse Base de Conhecimento",
            descricao: "No menu lateral, clique em 'Base de Conhecimento'. A tabela lista todos os artigos por seção.",
          },
          {
            numero: 2,
            titulo: "Crie um artigo",
            descricao: "Clique em 'Novo Artigo', escolha a seção, preencha título e conteúdo. A IA usará esse conteúdo no próximo atendimento.",
          },
          {
            numero: 3,
            titulo: "Gerencie artigos",
            descricao: "Edite, ative/desative ou exclua artigos pelo menu de ações. Mudanças refletem imediatamente no agente.",
          },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <PermissoesCallout
          permissoes={[
            {
              perfil: "Gestor",
              acesso: "total",
              acoes: ["Cria, edita e exclui artigos", "Ativa/desativa artigos"],
            },
            {
              perfil: "Atendente",
              acesso: "nenhum",
              acoes: [],
            },
          ]}
        />
        <DicaImportante
          texto="Mantenha os artigos atualizados com informações reais da clínica. A Ana Júlia responde com base nesse conteúdo — informações desatualizadas geram respostas incorretas."
          variante="aviso"
        />
      </div>
    </div>
  )
}

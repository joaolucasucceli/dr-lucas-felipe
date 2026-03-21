import {
  Sparkles,
  Globe,
  Instagram,
  Megaphone,
  UserCircle,
  Target,
  Star,
  Smartphone,
  MessageSquare,
  LayoutGrid,
  Newspaper,
  BadgeDollarSign,
} from "lucide-react"
import { HeroBanner } from "../HeroBanner"
import { DicaImportante } from "../DicaImportante"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type Categoria = "Marketing" | "IA" | "Clínica" | "Expansão"

interface Sugestao {
  icone: React.ReactNode
  categoria: Categoria
  titulo: string
  descricao: string
  valorDeNegocio: string
}

const corCategoria: Record<Categoria, string> = {
  Marketing: "text-orange-600",
  IA: "text-violet-600",
  Clínica: "text-emerald-600",
  Expansão: "text-blue-600",
}

const dotCategoria: Record<Categoria, string> = {
  Marketing: "bg-orange-500",
  IA: "bg-violet-500",
  Clínica: "bg-emerald-500",
  Expansão: "bg-blue-500",
}

const sugestoes: Sugestao[] = [
  {
    icone: <Globe className="h-6 w-6" />,
    categoria: "Marketing",
    titulo: "Site Institucional Integrado",
    descricao:
      "Landing page profissional da clínica conectada ao sistema. O formulário de contato captura leads diretamente no kanban, sem precisar copiar dados manualmente.",
    valorDeNegocio:
      "Aumenta captação orgânica e elimina perda de leads que chegam pelo site.",
  },
  {
    icone: <Instagram className="h-6 w-6" />,
    categoria: "IA",
    titulo: "Agente IA para Instagram",
    descricao:
      "Uma Ana Júlia dedicada ao Instagram: responde mensagens diretas com a mesma inteligência do WhatsApp, qualifica leads e move pacientes pelo kanban — tudo integrado ao sistema.",
    valorDeNegocio:
      "Atinge pacientes onde eles estão e dobra o alcance do atendimento automatizado sem aumentar a equipe.",
  },
  {
    icone: <Megaphone className="h-6 w-6" />,
    categoria: "Marketing",
    titulo: "Campanhas de Disparo em Massa",
    descricao:
      "Envio de mensagens segmentadas para grupos de pacientes: aniversariantes do mês, inativos, pós-procedimento ou por procedimento de interesse.",
    valorDeNegocio:
      "Reativa pacientes inativos e gera agendamentos espontâneos sem esforço manual.",
  },
  {
    icone: <UserCircle className="h-6 w-6" />,
    categoria: "Expansão",
    titulo: "Portal do Paciente",
    descricao:
      "Área exclusiva onde o paciente acessa histórico de atendimentos, documentos, agendamentos futuros e recebe orientações pós-procedimento.",
    valorDeNegocio:
      "Profissionaliza a experiência e reduz chamadas repetitivas para informações básicas.",
  },
  {
    icone: <Target className="h-6 w-6" />,
    categoria: "Marketing",
    titulo: "Captação via Google Ads & Meta Ads",
    descricao:
      "Leads das campanhas de tráfego pago entram automaticamente no kanban com origem rastreada. O ROI de cada campanha é calculado pelo sistema.",
    valorDeNegocio:
      "Mostra exatamente quanto cada real investido em anúncio gerou de receita.",
  },
  {
    icone: <Star className="h-6 w-6" />,
    categoria: "Clínica",
    titulo: "NPS e Pesquisa de Satisfação",
    descricao:
      "Envio automático de pesquisa de satisfação via WhatsApp após cada procedimento. Dashboard com histórico de NPS, comentários e evolução ao longo do tempo.",
    valorDeNegocio:
      "Identifica pontos de melhoria antes que se tornem reclamações públicas.",
  },
  {
    icone: <Smartphone className="h-6 w-6" />,
    categoria: "Expansão",
    titulo: "App Mobile para Pacientes",
    descricao:
      "Aplicativo nativo para iOS e Android onde o paciente acompanha agendamentos, recebe lembretes, vê histórico de procedimentos e troca documentos com a clínica.",
    valorDeNegocio:
      "Eleva a experiência do paciente e cria um canal direto de comunicação fora do WhatsApp.",
  },
  {
    icone: <MessageSquare className="h-6 w-6" />,
    categoria: "IA",
    titulo: "Chatbot Google Business",
    descricao:
      "Agente IA de atendimento integrado ao Google Meu Negócio. Responde automaticamente dúvidas, coleta dados e encaminha o lead para o kanban.",
    valorDeNegocio:
      "Captura pacientes com alta intenção de compra no exato momento em que pesquisam pelo serviço no Google.",
  },
  {
    icone: <LayoutGrid className="h-6 w-6" />,
    categoria: "Marketing",
    titulo: "Automação de Carrossel Instagram",
    descricao:
      "IA que gera automaticamente carrosséis prontos para postar: sobre os procedimentos da clínica, tendências de mercado estético e conteúdo educativo para o público-alvo.",
    valorDeNegocio:
      "Produz conteúdo profissional sem precisar de agência ou designer — mantém o perfil ativo e com consistência.",
  },
  {
    icone: <Newspaper className="h-6 w-6" />,
    categoria: "Marketing",
    titulo: "Automação de Artigo de Blog",
    descricao:
      "IA que gera artigos otimizados para SEO e os publica automaticamente no site da clínica: sobre procedimentos, saúde, novidades da área e perguntas frequentes.",
    valorDeNegocio:
      "Aumenta o tráfego orgânico do Google e posiciona o Dr. Lucas como referência na especialidade.",
  },
  {
    icone: <BadgeDollarSign className="h-6 w-6" />,
    categoria: "IA",
    titulo: "Agente de Cobrança IA",
    descricao:
      "Agente inteligente que conduz conversas de cobrança via WhatsApp: lembra vencimentos, negocia parcelamentos de forma natural e registra acordos automaticamente no sistema.",
    valorDeNegocio:
      "Reduz inadimplência sem desgaste da equipe e sem constrangimento para o paciente.",
  },
]

export function ModuloSugestoes() {
  return (
    <div className="space-y-8">
      <HeroBanner
        icone={<Sparkles />}
        titulo="Sugestões de Features"
        subtitulo="Funcionalidades disponíveis para implementação — expanda o sistema conforme a clínica cresce"
        gradientClasses="from-violet-600 to-purple-500"
      />

      <div className="rounded-lg border border-violet-100 bg-violet-50 p-4 text-sm text-violet-800">
        <p>
          Abaixo estão funcionalidades que podem ser adicionadas ao sistema em
          sprints futuras. Cada item representa um módulo independente — é
          possível contratar qualquer combinação de acordo com a prioridade da
          clínica.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        {(Object.keys(corCategoria) as Categoria[]).map((cat) => (
          <span key={cat} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${dotCategoria[cat]}`} />
            <span className={`font-medium ${corCategoria[cat]}`}>{cat}</span>
          </span>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sugestoes.map((s) => (
          <Card key={s.titulo} className="border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className={`mt-0.5 shrink-0 ${corCategoria[s.categoria]}`}>
                  {s.icone}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold leading-tight">
                      {s.titulo}
                    </h3>
                    <Badge variant="outline" className="text-[11px]">
                      <span
                        className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${dotCategoria[s.categoria]}`}
                      />
                      <span className={corCategoria[s.categoria]}>
                        {s.categoria}
                      </span>
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {s.descricao}
                  </p>
                  <div className="border-l-2 border-violet-200 pl-3">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-violet-700">
                        Por que contratar:{" "}
                      </span>
                      {s.valorDeNegocio}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <DicaImportante
        texto="Todas as features acima são desenvolvidas sob medida e integradas ao sistema existente. Para discutir prioridades, orçamento e cronograma de implementação, entre em contato com a equipe de desenvolvimento."
        variante="info"
      />
    </div>
  )
}

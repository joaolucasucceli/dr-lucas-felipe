import {
  Sparkles,
  Globe,
  Instagram,
  Megaphone,
  UserCircle,
  Target,
  Star,
  Smartphone,
  Building2,
  HeartPulse,
  ClipboardList,
  MessageSquare,
  FileEdit,
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
    titulo: "Atendimento via Instagram",
    descricao:
      "Ana Júlia expande para responder mensagens diretas do Instagram com a mesma inteligência do WhatsApp. Todos os atendimentos unificados em um único painel.",
    valorDeNegocio:
      "Dobra o alcance do atendimento automatizado sem aumentar a equipe.",
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
    icone: <FileEdit className="h-6 w-6" />,
    categoria: "Clínica",
    titulo: "Prescrições e Laudos Digitais",
    descricao:
      "Emissão de prescrições, atestados e laudos diretamente no sistema, com assinatura digital e envio automático ao paciente via WhatsApp.",
    valorDeNegocio:
      "Elimina papel, agiliza o pós-consulta e eleva a percepção de modernidade da clínica.",
  },
  {
    icone: <Smartphone className="h-6 w-6" />,
    categoria: "Expansão",
    titulo: "App Mobile para a Equipe",
    descricao:
      "Versão mobile nativa do painel para iOS e Android. Atendentes e gestores gerenciam o kanban, agendamentos e leads de qualquer lugar.",
    valorDeNegocio:
      "Acelera o ciclo de resposta sem depender do computador.",
  },
  {
    icone: <Building2 className="h-6 w-6" />,
    categoria: "Expansão",
    titulo: "Multi-clínica",
    descricao:
      "Expansão do sistema para gerenciar múltiplas unidades em um único login. Relatórios consolidados e segmentados por unidade.",
    valorDeNegocio:
      "Prepara a operação para crescimento sem precisar de sistemas separados para cada unidade.",
  },
  {
    icone: <HeartPulse className="h-6 w-6" />,
    categoria: "Clínica",
    titulo: "Integração com Planos de Saúde",
    descricao:
      "Verificação de elegibilidade em tempo real, controle de guias e faturamento automático integrado às principais operadoras.",
    valorDeNegocio:
      "Reduz glosas e transforma horas de trabalho administrativo em minutos.",
  },
  {
    icone: <ClipboardList className="h-6 w-6" />,
    categoria: "Clínica",
    titulo: "Prontuário Eletrônico",
    descricao:
      "Registro clínico completo por paciente: anamnese, evolução, fotos de procedimentos, histórico e documentos anexos tudo em um só lugar.",
    valorDeNegocio:
      "Elimina prontuários físicos e facilita a continuidade do cuidado.",
  },
  {
    icone: <MessageSquare className="h-6 w-6" />,
    categoria: "IA",
    titulo: "Chatbot Google Business",
    descricao:
      "Ana Júlia passa a atender mensagens enviadas pelo Google Meu Negócio, captando leads que pesquisam a clínica diretamente no Google.",
    valorDeNegocio:
      "Captura pacientes com alta intenção de compra no exato momento em que pesquisam pelo serviço.",
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

import {
  Bot,
  Brain,
  Calendar,
  CalendarCheck2,
  Cog,
  Database,
  FileText,
  Inbox,
  KanbanSquare,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
  Wand2,
  Workflow,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type PassoFluxo = {
  id: string
  texto: string
  detalhe?: string
  destaque?: "ia" | "humano" | "externo" | "infra"
  ramo?: { rotulo: string; passos: PassoFluxo[] }[]
}

export type ModuloCard = {
  icone: LucideIcon
  nome: string
  rota: string
  descricao: string
}

export type Slide =
  | {
      tipo: "capa"
      bloco: string
      titulo: string
      subtitulo: string
      data: string
    }
  | {
      tipo: "abertura-bloco"
      bloco: string
      titulo: string
      descricao: string
      destaques: string[]
    }
  | {
      tipo: "arquitetura"
      bloco: string
      titulo: string
      camadas: { nome: string; itens: string[]; cor: string }[]
    }
  | {
      tipo: "modulos"
      bloco: string
      titulo: string
      modulos: ModuloCard[]
    }
  | {
      tipo: "stack"
      bloco: string
      titulo: string
      grupos: { nome: string; itens: { nome: string; uso: string }[] }[]
    }
  | {
      tipo: "pagina"
      bloco: string
      titulo: string
      rota: string
      papel: string
      funcionalidades: string[]
      decisao: string
      icone: LucideIcon
    }
  | {
      tipo: "agente-quem"
      bloco: string
      titulo: string
      atributos: { rotulo: string; valor: string }[]
      pilares: string[]
    }
  | {
      tipo: "dupla-ia"
      bloco: string
      titulo: string
      ana: { titulo: string; modelo: string; papel: string; bullets: string[] }
      analista: { titulo: string; modelo: string; papel: string; bullets: string[] }
    }
  | {
      tipo: "ferramentas"
      bloco: string
      titulo: string
      ferramentas: { nome: string; descricao: string; categoria: "agenda" | "paciente" | "conteudo" | "humano" | "estado" }[]
    }
  | {
      tipo: "fluxograma"
      bloco: string
      titulo: string
      subtitulo: string
      passos: PassoFluxo[]
    }
  | {
      tipo: "encerramento"
      bloco: string
      titulo: string
      subtitulo: string
      perguntas: string[]
    }

export const slides: Slide[] = [
  // ============ BLOCO A · VISÃO GERAL ============
  {
    tipo: "capa",
    bloco: "Abertura",
    titulo: "Central Dr. Lucas",
    subtitulo: "Documentação completa do sistema",
    data: "27 de maio de 2026",
  },
  {
    tipo: "abertura-bloco",
    bloco: "Bloco A · Visão geral",
    titulo: "O que é a Central Dr. Lucas",
    descricao:
      "Um sistema único que cuida de duas pontas conectadas: o atendimento autônomo dos seus pacientes no WhatsApp e o painel de gestão que você usa pra acompanhar tudo em tempo real.",
    destaques: [
      "100% autônomo — a IA conduz todo o funil até a reunião agendada",
      "Entrada única pelo WhatsApp: o site é vitrine institucional, não tem formulário de captura",
      "Agendamentos criados exclusivamente pela Ana Júlia (não tem botão manual)",
      "Pacientes entram pelo WhatsApp e aparecem no kanban automaticamente",
      "Você só intervém quando o sistema pede aprovação (handoff)",
    ],
  },
  {
    tipo: "arquitetura",
    bloco: "Bloco A · Visão geral",
    titulo: "Arquitetura macro — como tudo se conecta",
    camadas: [
      {
        nome: "Canais de entrada",
        cor: "emerald",
        itens: [
          "Paciente no WhatsApp (canal único de captura)",
          "Site público — vitrine institucional, sem formulário (CTA leva pro WhatsApp)",
        ],
      },
      {
        nome: "Gateway de mensageria",
        cor: "blue",
        itens: ["Uazapi v2 — envia/recebe WhatsApp", "Webhook em tempo real"],
      },
      {
        nome: "Cérebro do sistema (Next.js 16)",
        cor: "purple",
        itens: [
          "API Routes do agente (15 endpoints)",
          "Buffer + memória em Redis",
          "Painel de gestão (13 páginas)",
          "Human-in-the-loop (aprovações + handoff)",
          "Realtime via Supabase WebSocket",
        ],
      },
      {
        nome: "Inteligência artificial",
        cor: "amber",
        itens: [
          "GPT-4o (Ana Júlia — SDR)",
          "GPT-4o-mini (Eduarda — Analista de CRM)",
          "Whisper (transcrição de áudio)",
          "GPT-4o-mini visão (descrição de imagens)",
        ],
      },
      {
        nome: "Persistência e integrações",
        cor: "rose",
        itens: [
          "Supabase PostgreSQL (24 tabelas)",
          "Google Calendar API (agenda)",
          "Upstash Redis (buffer 20s + memória 20 msgs)",
        ],
      },
    ],
  },
  {
    tipo: "modulos",
    bloco: "Bloco A · Visão geral",
    titulo: "Módulos do painel — 10 áreas, uma central",
    modulos: [
      {
        icone: Sparkles,
        nome: "Dashboard",
        rota: "/dashboard",
        descricao: "Métricas e visão executiva do funil",
      },
      {
        icone: MessageSquare,
        nome: "Atendimentos",
        rota: "/atendimentos",
        descricao: "Conversas WhatsApp em tempo real",
      },
      {
        icone: KanbanSquare,
        nome: "Funil",
        rota: "/contatos",
        descricao: "Kanban de 4 etapas movido pela IA",
      },
      {
        icone: Calendar,
        nome: "Agenda",
        rota: "/agenda",
        descricao: "Visão da agenda + Google Calendar",
      },
      {
        icone: CalendarCheck2,
        nome: "Consultas Realizadas",
        rota: "/consultas-realizadas",
        descricao: "Histórico cronológico de consultas que aconteceram",
      },
      {
        icone: Users,
        nome: "Contatos",
        rota: "/contatos",
        descricao: "Leads e pacientes (lifecycle integrado)",
      },
      {
        icone: Stethoscope,
        nome: "Procedimentos",
        rota: "/procedimentos",
        descricao: "Catálogo editável de tratamentos",
      },
      {
        icone: FileText,
        nome: "Conteúdo IA",
        rota: "/conteudo-ia",
        descricao: "Textos e mídias que a Ana usa",
      },
      {
        icone: Bot,
        nome: "Equipe IA",
        rota: "/equipe-ia",
        descricao: "Configura Ana Júlia + Eduarda",
      },
      {
        icone: ShieldCheck,
        nome: "Aprovações",
        rota: "/aprovacoes-pendentes",
        descricao: "Você aprova horários sensíveis",
      },
    ],
  },
  {
    tipo: "stack",
    bloco: "Bloco A · Visão geral",
    titulo: "Stack tecnológica — o que está rodando por baixo",
    grupos: [
      {
        nome: "Frontend",
        itens: [
          { nome: "Next.js 16", uso: "Framework principal (App Router + Turbopack)" },
          { nome: "React 19", uso: "Camada de UI" },
          { nome: "shadcn/ui 4", uso: "Componentes padronizados" },
          { nome: "Tailwind CSS 4", uso: "Estilização" },
        ],
      },
      {
        nome: "Backend",
        itens: [
          { nome: "Supabase PostgreSQL", uso: "Banco principal (24 tabelas)" },
          { nome: "NextAuth.js 4", uso: "Autenticação (JWT)" },
          { nome: "Upstash Redis", uso: "Buffer de mensagens + memória" },
          { nome: "API Routes", uso: "83 endpoints internos" },
        ],
      },
      {
        nome: "Inteligência",
        itens: [
          { nome: "OpenAI GPT-4o", uso: "Ana Júlia (SDR conversacional)" },
          { nome: "GPT-4o-mini", uso: "Eduarda (Analista de CRM) + descrição de imagens" },
          { nome: "Whisper", uso: "Transcrição de áudios do paciente" },
        ],
      },
      {
        nome: "Integrações externas",
        itens: [
          { nome: "Uazapi v2", uso: "Gateway WhatsApp (envia/recebe)" },
          { nome: "Google Calendar API", uso: "Agenda do consultório" },
          { nome: "Vercel", uso: "Hospedagem e deploy contínuo" },
        ],
      },
    ],
  },

  // ============ BLOCO B · TOUR PELO PAINEL ============
  {
    tipo: "abertura-bloco",
    bloco: "Bloco B · Tour pelo painel",
    titulo: "Tour pelo painel — uma página de cada vez",
    descricao:
      "A partir daqui vamos percorrer cada uma das páginas do seu painel. Pra cada uma você vê: o papel dela, o que faz, e a decisão por trás da forma como está implementada.",
    destaques: [
      "11 páginas no total",
      "Cada slide: papel + funcionalidades + decisão arquitetural",
      "Você pode pausar em qualquer uma e perguntar o porquê",
    ],
  },
  {
    tipo: "pagina",
    bloco: "Bloco B · Tour pelo painel",
    titulo: "Dashboard",
    rota: "/dashboard",
    icone: Sparkles,
    papel: "Visão executiva — você abre o painel e bate o olho em como o funil está hoje.",
    funcionalidades: [
      "Métricas principais: leads novos, em atendimento, agendados, reuniões realizadas",
      "Gráfico de conversão por etapa do funil",
      "Atendimentos recentes (atalho pra continuar conversa)",
      "Próximos agendamentos do dia",
    ],
    decisao:
      "Dashboard SEM ação direta — todas as métricas linkam pra outras páginas onde a ação acontece. A ideia é separar 'ler' de 'fazer'.",
  },
  {
    tipo: "pagina",
    bloco: "Bloco B · Tour pelo painel",
    titulo: "Atendimentos",
    rota: "/atendimentos",
    icone: MessageSquare,
    papel: "Tempo real — todas as conversas que a Ana Júlia está conduzindo no WhatsApp aparecem aqui.",
    funcionalidades: [
      "Lista de conversas ativas (ordenada por última mensagem)",
      "Visualização da thread completa de cada paciente",
      "Indicador de quem está respondendo (Ana Júlia ou aguardando)",
      "Realtime via Supabase WebSocket — não precisa atualizar",
    ],
    decisao:
      "Você é leitor, não escritor por padrão. A Ana Júlia conduz a conversa. Você acompanha pra entender, e só intervém quando o sistema pede (via aprovações ou handoff).",
  },
  {
    tipo: "pagina",
    bloco: "Bloco B · Tour pelo painel",
    titulo: "Funil Kanban (Contatos)",
    rota: "/contatos",
    icone: KanbanSquare,
    papel: "Visualizar o funil completo em 4 colunas — Acolhimento → Qualificação → Agendamento → Reunião Agendada.",
    funcionalidades: [
      "4 colunas movidas automaticamente pela dupla Ana Júlia + Analista",
      "Card com nome, procedimento de interesse e última mensagem",
      "Filtros por procedimento, etapa, período",
      "Click no card abre detalhe completo do contato (/contatos/[id])",
    ],
    decisao:
      "Funil simplificado pra 4 etapas (não 7 ou 10). Cada etapa tem um critério objetivo: a Analista IA é quem decide quando mover. Você não arrasta card — observa o movimento.",
  },
  {
    tipo: "pagina",
    bloco: "Bloco B · Tour pelo painel",
    titulo: "Detalhe do Contato",
    rota: "/contatos/[id]",
    icone: Users,
    papel: "Ficha completa de cada paciente — histórico, conversa, dados e promoção lead → paciente.",
    funcionalidades: [
      "Campo 'Sobre o paciente' (texto cumulativo, nunca sobrescreve)",
      "Histórico de mensagens completo",
      "Edição com autosave (não precisa clicar em salvar)",
      "Botão 'Promover a paciente' (manual, só você decide quando)",
      "Botão 'Limpar memória' (zera contexto Redis se quiser começar do zero)",
    ],
    decisao:
      "Único lugar do sistema que NÃO usa modal — é página dedicada com autosave. Por quê: é onde você passa mais tempo lendo, então merece tela cheia e edição contínua.",
  },
  {
    tipo: "pagina",
    bloco: "Bloco B · Tour pelo painel",
    titulo: "Agenda",
    rota: "/agenda",
    icone: Calendar,
    papel: "Visão da sua agenda — eventos vindos do Google Calendar + agendamentos criados pela Ana Júlia.",
    funcionalidades: [
      "Visualização em calendário (semana / mês)",
      "Eventos do Google Calendar sincronizados",
      "Agendamentos novos criados pela Ana Júlia aparecem aqui",
      "Reagendar / cancelar agendamento existente",
      "Não tem botão de 'criar agendamento manual' (intencional)",
    ],
    decisao:
      "Sem criação manual de agendamento. Todo agendamento passa pela Ana Júlia (a paciente conversa, ela registra). Isso garante que TODO lead atravessa o funil e não escapa pelo 'agendei direto'.",
  },
  {
    tipo: "pagina",
    bloco: "Bloco B · Tour pelo painel",
    titulo: "Consultas Realizadas",
    rota: "/consultas-realizadas",
    icone: CalendarCheck2,
    papel: "Histórico de consultas que já aconteceram — atalho rápido pro prontuário do paciente sem passar pelo funil.",
    funcionalidades: [
      "Lista cronológica reversa de agendamentos com status 'realizado'",
      "Mostra paciente, procedimento, data/hora e observações do atendimento",
      "Click em qualquer linha abre a ficha do contato (onde mora o prontuário)",
      "Acesso restrito ao gestor (Dr. Lucas)",
    ],
    decisao:
      "Pedido direto do Dr. Lucas (JLU-171). O funil serve pra acompanhar quem está chegando; esta página serve pra acompanhar quem já passou. Atalho que evita ter que filtrar agendamentos por status na agenda.",
  },
  {
    tipo: "pagina",
    bloco: "Bloco B · Tour pelo painel",
    titulo: "Aprovações Pendentes",
    rota: "/aprovacoes-pendentes",
    icone: ShieldCheck,
    papel: "Human-in-the-loop — a Ana Júlia pede aprovação sua antes de fechar horários sensíveis.",
    funcionalidades: [
      "Lista de pedidos da Ana Júlia esperando seu OK",
      "Cada item mostra: paciente, horário pedido, contexto da conversa",
      "Botão 'Aprovar' (Ana Júlia confirma com o paciente)",
      "Botão 'Rejeitar' (Ana Júlia oferece outro horário)",
      "Tempo de resposta visível (pra você não esquecer)",
    ],
    decisao:
      "Configurável: você decide via 'Equipe IA' se a aprovação é obrigatória ou se a IA pode agendar direto. Quando ligada, é o único momento em que o sistema espera você.",
  },
  {
    tipo: "pagina",
    bloco: "Bloco B · Tour pelo painel",
    titulo: "Procedimentos",
    rota: "/procedimentos",
    icone: Stethoscope,
    papel: "Catálogo dos tratamentos que você oferece — é a fonte de verdade que a Ana Júlia consulta.",
    funcionalidades: [
      "Lista de procedimentos com nome, descrição, duração, faixa de preço",
      "Edição via modal (FormDialog)",
      "Mudança aqui afeta a resposta da Ana Júlia em segundos",
      "Status ativo / inativo (controla o que ela oferece)",
    ],
    decisao:
      "Você edita aqui, a IA aprende automaticamente. Não precisa reescrever prompt nem treinar. A Ana Júlia consulta esta tabela toda vez que o paciente pergunta sobre tratamentos.",
  },
  {
    tipo: "pagina",
    bloco: "Bloco B · Tour pelo painel",
    titulo: "Conteúdo IA",
    rota: "/conteudo-ia",
    icone: FileText,
    papel: "Biblioteca de textos e mídias que a Ana Júlia usa pra responder o paciente.",
    funcionalidades: [
      "Aba 'Conteúdo em Texto' — respostas pré-aprovadas (sobre clínica, valores, formas de pagamento)",
      "Aba 'Conteúdo em Mídia' — fotos e vídeos que ela pode enviar (antes/depois, vídeos de procedimentos)",
      "Cada item tem tag/categoria pra busca semântica",
      "Ana Júlia escolhe sozinha o conteúdo certo pra cada momento da conversa",
    ],
    decisao:
      "Tudo que sai pelo WhatsApp em nome da sua clínica passa por aqui. Você controla a comunicação sem mexer em código. É a forma de manter a voz da clínica consistente.",
  },
  {
    tipo: "pagina",
    bloco: "Bloco B · Tour pelo painel",
    titulo: "Equipe IA",
    rota: "/equipe-ia",
    icone: Bot,
    papel: "Configuração das duas IAs — Ana Júlia (SDR que conversa) e Eduarda (Analista de CRM que organiza).",
    funcionalidades: [
      "Aba 'Ana Júlia' — persona, tom de voz, instruções específicas, exigir aprovação de agendamento",
      "Aba 'Eduarda' — modo de escrita (ativo / shadow), regras de movimentação do funil",
      "Limites e travas operacionais",
      "Histórico de mudanças (auditoria)",
    ],
    decisao:
      "Você ajusta o comportamento da IA SEM mexer em código. Mudança aqui = imediata. Por isso a flag 'exigir aprovação' é tão importante: você decide se a Ana fecha sozinha ou se pede seu OK.",
  },
  {
    tipo: "pagina",
    bloco: "Bloco B · Tour pelo painel",
    titulo: "Configurações",
    rota: "/configuracoes/*",
    icone: Cog,
    papel: "Integrações externas e administração — Google, WhatsApp, usuários, comportamento da IA.",
    funcionalidades: [
      "/configuracoes/google-agenda — conectar conta Google + horários de expediente",
      "/configuracoes/whatsapp — credenciais Uazapi + número conectado",
      "/configuracoes/usuarios — quem acessa o painel (gestor / atendente)",
      "/configuracoes/comportamento-ia — regras adicionais e travas",
    ],
    decisao:
      "Cada integração tem sua tela própria. Você troca o número de WhatsApp ou a conta do Google sem precisar de devolutiva técnica — está sempre acessível.",
  },

  // ============ BLOCO C · O AGENTE ANA JÚLIA ============
  {
    tipo: "abertura-bloco",
    bloco: "Bloco C · Ana Júlia",
    titulo: "Conhecendo a Ana Júlia",
    descricao:
      "Agora vamos abrir a 'caixa preta' da IA. Você vai ver quem é Ana Júlia, o que ela sabe fazer, como ela pensa e quais são os processos que ela executa sem você precisar pedir.",
    destaques: [
      "Dois cérebros trabalhando em paralelo (Ana Júlia + Eduarda)",
      "13 ferramentas que a Ana Júlia invoca conforme a conversa pede",
      "4 processos automatizados de ponta a ponta",
      "Buffer + memória inteligente pra parecer humana",
    ],
  },
  {
    tipo: "agente-quem",
    bloco: "Bloco C · Ana Júlia",
    titulo: "Quem é Ana Júlia",
    atributos: [
      { rotulo: "Papel", valor: "SDR (Sales Development Representative)" },
      { rotulo: "Modelo de IA", valor: "OpenAI GPT-4o" },
      { rotulo: "Canal", valor: "Exclusivamente WhatsApp" },
      { rotulo: "Tom de voz", valor: "Atendente humana de clínica de estética" },
      { rotulo: "Trabalha em", valor: "Horário comercial configurável" },
      { rotulo: "Conexão com paciente", valor: "100% via Uazapi v2" },
    ],
    pilares: [
      "Acolhe o paciente sem soar robótica",
      "Qualifica o interesse (qual procedimento, expectativa, urgência)",
      "Apresenta o tratamento certo com base no catálogo de Procedimentos",
      "Conduz até o agendamento — sem deixar o lead esfriar",
      "Reconhece os limites: chama você quando precisa de aprovação humana",
    ],
  },
  {
    tipo: "dupla-ia",
    bloco: "Bloco C · Ana Júlia",
    titulo: "Dupla IA — Ana Júlia + Eduarda trabalhando juntas",
    ana: {
      titulo: "Ana Júlia",
      modelo: "GPT-4o · SDR",
      papel: "Conversa com o paciente no WhatsApp",
      bullets: [
        "Recebe cada mensagem do paciente",
        "Decide o que responder e quais ferramentas chamar",
        "Envia a resposta segmentada via WhatsApp",
        "Pode chamar até 13 ferramentas diferentes",
        "Trabalha de forma síncrona dentro do loop de cada mensagem",
      ],
    },
    analista: {
      titulo: "Eduarda",
      modelo: "GPT-4o-mini · Analista de CRM",
      papel: "Lê o histórico e mantém o cadastro do lead organizado",
      bullets: [
        "Não conversa com o paciente — trabalha em silêncio nos bastidores",
        "Disparada em fire-and-forget após cada loop da Ana Júlia",
        "Lê todo o histórico da conversa + estado atual do lead",
        "Atualiza nome, procedimento de interesse, observações no card",
        "Decide quando mover o card para a próxima coluna do funil",
        "Tem modo 'shadow' (loga sem aplicar) pra testar mudanças com segurança",
      ],
    },
  },
  {
    tipo: "ferramentas",
    bloco: "Bloco C · Ana Júlia",
    titulo: "As 13 ferramentas da Ana Júlia",
    ferramentas: [
      { nome: "consultar_agenda", descricao: "Cruza Google Calendar + expediente e devolve horários livres", categoria: "agenda" },
      { nome: "registrar_agendamento", descricao: "Cria evento no Google Calendar + move card pra 'Reunião Agendada'", categoria: "agenda" },
      { nome: "atualizar_agendamento", descricao: "Reagenda um horário existente", categoria: "agenda" },
      { nome: "confirmar_agendamento", descricao: "Envia mensagem de confirmação D-1 da reunião", categoria: "agenda" },
      { nome: "confirmar_presenca", descricao: "Marca presença no dia da reunião", categoria: "agenda" },
      { nome: "marcar_nao_compareceu", descricao: "Registra no-show e devolve o paciente pro funil", categoria: "agenda" },
      { nome: "consultar_paciente", descricao: "Busca paciente existente (retorno) por WhatsApp ou nome", categoria: "paciente" },
      { nome: "consultar_procedimentos", descricao: "Lista catálogo de procedimentos da clínica", categoria: "paciente" },
      { nome: "buscar_conteudo", descricao: "Procura na biblioteca de Conteúdo IA o texto/mídia certo pro contexto", categoria: "conteudo" },
      { nome: "enviar_midia", descricao: "Envia foto/vídeo da biblioteca pelo WhatsApp", categoria: "conteudo" },
      { nome: "solicitar_aprovacao_horario", descricao: "Pede sua aprovação antes de fechar horário sensível", categoria: "humano" },
      { nome: "solicitar_orcamento_humano", descricao: "Escala pro Dr. Lucas casos que pedem avaliação personalizada", categoria: "humano" },
      { nome: "registrar_mensagem", descricao: "Persiste a mensagem no banco (auditoria + realtime)", categoria: "estado" },
    ],
  },
  {
    tipo: "fluxograma",
    bloco: "Bloco C · Ana Júlia",
    titulo: "Processo 1 — Atendimento de um lead novo",
    subtitulo: "Da primeira mensagem do paciente até a resposta da Ana Júlia",
    passos: [
      { id: "1", texto: "Paciente envia mensagem no WhatsApp", destaque: "externo" },
      { id: "2", texto: "Uazapi v2 recebe a mensagem", detalhe: "Gateway entrega via webhook seguro", destaque: "infra" },
      { id: "3", texto: "POST /api/webhooks/whatsapp", detalhe: "Endpoint do sistema acorda", destaque: "infra" },
      { id: "4", texto: "Detecta tipo do conteúdo", detalhe: "Texto, áudio, imagem ou vídeo", destaque: "infra" },
      {
        id: "5",
        texto: "Processa mídia (se necessário)",
        detalhe: "Áudio → Whisper transcreve · Imagem → GPT-4o-mini descreve",
        destaque: "ia",
      },
      {
        id: "6",
        texto: "Buffer Redis aguarda 20s",
        detalhe: "Evita resposta atropelada quando paciente manda várias mensagens em sequência",
        destaque: "infra",
      },
      { id: "7", texto: "Concatena buffer + carrega memória (últimas 20 msgs)", destaque: "infra" },
      { id: "8", texto: "GPT-4o (Ana Júlia) processa", detalhe: "Decide resposta + quais ferramentas chamar", destaque: "ia" },
      { id: "9", texto: "Resposta segmentada em múltiplas mensagens", detalhe: "Parece digitação humana, não muralha de texto", destaque: "ia" },
      { id: "10", texto: "Uazapi envia com delay aleatório 3-5s entre msgs", destaque: "infra" },
      { id: "11", texto: "Eduarda dispara em background", detalhe: "Lê o histórico, atualiza CRM + move card no funil se for o caso", destaque: "ia" },
    ],
  },
  {
    tipo: "fluxograma",
    bloco: "Bloco C · Ana Júlia",
    titulo: "Processo 2 — Agendamento de avaliação",
    subtitulo: "Como a Ana Júlia fecha um horário sem você apertar nenhum botão",
    passos: [
      { id: "1", texto: "Paciente sinaliza interesse em marcar", destaque: "externo" },
      { id: "2", texto: "Ana Júlia chama consultar_agenda", detalhe: "Cruza Google Calendar + expediente + bloqueios", destaque: "ia" },
      { id: "3", texto: "Apresenta 2-3 horários livres", destaque: "ia" },
      { id: "4", texto: "Paciente escolhe um horário", destaque: "externo" },
      {
        id: "5",
        texto: "Configuração exige aprovação?",
        ramo: [
          {
            rotulo: "SIM",
            passos: [
              { id: "5a-1", texto: "Ana chama solicitar_aprovacao_horario", destaque: "ia" },
              { id: "5a-2", texto: "Dr. Lucas vê em /aprovacoes-pendentes", destaque: "humano" },
              { id: "5a-3", texto: "Aprovado → Ana confirma · Rejeitado → Ana oferece outro horário", destaque: "ia" },
            ],
          },
          {
            rotulo: "NÃO",
            passos: [
              { id: "5b-1", texto: "Ana chama registrar_agendamento direto", destaque: "ia" },
            ],
          },
        ],
      },
      { id: "6", texto: "Evento criado no Google Calendar", destaque: "infra" },
      { id: "7", texto: "Card move para 'Reunião Agendada' no Kanban", destaque: "infra" },
      { id: "8", texto: "Ana Júlia confirma com o paciente + envia detalhes", destaque: "ia" },
      { id: "9", texto: "D-1: Ana Júlia chama confirmar_agendamento automaticamente", detalhe: "Lembrete da véspera sem você fazer nada", destaque: "ia" },
    ],
  },
  {
    tipo: "fluxograma",
    bloco: "Bloco C · Ana Júlia",
    titulo: "Processo 3 — Human-in-the-loop (quando ela chama você)",
    subtitulo: "Os três momentos em que o sistema sabe que não pode decidir sozinho",
    passos: [
      {
        id: "1",
        texto: "Ana Júlia detecta situação fora do escopo automatizável",
        ramo: [
          {
            rotulo: "Horário sensível",
            passos: [
              { id: "1a-1", texto: "Aprovação configurada como obrigatória", destaque: "humano" },
              { id: "1a-2", texto: "Tool: solicitar_aprovacao_horario", destaque: "ia" },
            ],
          },
          {
            rotulo: "Orçamento personalizado",
            passos: [
              { id: "1b-1", texto: "Caso médico exige análise do Dr. Lucas", destaque: "humano" },
              { id: "1b-2", texto: "Tool: solicitar_orcamento_humano", destaque: "ia" },
            ],
          },
          {
            rotulo: "Conversa fora do padrão",
            passos: [
              { id: "1c-1", texto: "Gatilho de handoff detectado", destaque: "humano" },
              { id: "1c-2", texto: "Sistema notifica gestor (notificar_handoff)", destaque: "infra" },
            ],
          },
        ],
      },
      { id: "2", texto: "Aparece em /aprovacoes-pendentes ou no painel", destaque: "infra" },
      { id: "3", texto: "Dr. Lucas decide", destaque: "humano" },
      { id: "4", texto: "Ana Júlia retoma com resposta autorizada", destaque: "ia" },
    ],
  },
  {
    tipo: "fluxograma",
    bloco: "Bloco C · Ana Júlia",
    titulo: "Processo 4 — Buffer + memória (por que ela parece humana)",
    subtitulo: "O truque por trás do tempo de resposta natural",
    passos: [
      {
        id: "1",
        texto: "Paciente manda 5 mensagens em 30 segundos",
        detalhe: "É típico: 'Oi', 'Tudo bem?', 'Queria saber', 'Sobre a lipo', 'Quanto custa?'",
        destaque: "externo",
      },
      {
        id: "2",
        texto: "Buffer Redis: {chat_id}_buf_dr-lucas",
        detalhe: "Acumula as 5 mensagens em vez de responder cada uma",
        destaque: "infra",
      },
      { id: "3", texto: "Espera 20s desde a última mensagem", detalhe: "Debounce — garante que paciente terminou de digitar", destaque: "infra" },
      { id: "4", texto: "Concatena tudo em um único contexto", destaque: "infra" },
      {
        id: "5",
        texto: "Carrega memória: {chat_id}_mem_dr-lucas",
        detalhe: "Últimas 20 mensagens da conversa pra continuidade",
        destaque: "infra",
      },
      { id: "6", texto: "GPT-4o processa tudo junto", detalhe: "Responde como se tivesse lido tudo de uma vez", destaque: "ia" },
      { id: "7", texto: "Resposta sai segmentada com delay 3-5s entre msgs", detalhe: "Parece digitação humana, não dump de texto", destaque: "ia" },
      { id: "8", texto: "Resposta entra na memória pra próxima rodada", destaque: "infra" },
    ],
  },

  // ============ ENCERRAMENTO ============
  {
    tipo: "encerramento",
    bloco: "Encerramento",
    titulo: "É a sua hora",
    subtitulo: "Vamos validar os fluxos juntos e responder qualquer dúvida",
    perguntas: [
      "Algum módulo do painel funciona diferente do que você esperava?",
      "Alguma decisão arquitetural que você quer rever (ex: aprovação obrigatória)?",
      "Quer ajustar o tom da Ana Júlia ou as regras de movimentação do funil?",
      "Existe algum processo seu que não está coberto pelo sistema?",
      "Próximos passos: o que você gostaria de evoluir nos próximos 30 dias?",
    ],
  },
]

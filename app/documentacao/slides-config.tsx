import {
  Calendar,
  Cog,
  FileText,
  KanbanSquare,
  MessageSquare,
  Sparkles,
  Stethoscope,
  Users,
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
    data: "Revisado em junho de 2026",
  },
  {
    tipo: "abertura-bloco",
    bloco: "Bloco A · Visão geral",
    titulo: "O que é a Central Dr. Lucas",
    descricao:
      "Um sistema único que cuida de duas pontas conectadas: o atendimento autônomo dos seus pacientes no WhatsApp e o painel de gestão que você usa pra acompanhar tudo em tempo real.",
    destaques: [
      "100% autônomo — a Ana Júlia conduz todo o funil até a reunião agendada",
      "Entrada pelo WhatsApp: o tráfego pago e o site institucional levam o paciente pro WhatsApp",
      "Agendamentos criados exclusivamente pela Ana Júlia (não tem botão manual)",
      "Pacientes entram pelo WhatsApp e aparecem no kanban automaticamente",
      "Um agente só: a Ana Júlia faz tudo, do primeiro 'oi' ao agendamento",
      "Orçamento: a faixa na hora; o orçamento real (PDF) é o único ponto em que o Dr. Lucas entra — só pra passar o valor",
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
          "Tráfego pago (anúncios) — leva o paciente direto pro WhatsApp",
          "Site institucional — vitrine, sem formulário (o botão leva pro WhatsApp)",
          "WhatsApp — canal único de entrada e captura",
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
          "Painel de gestão (12 páginas)",
          "Orçamento: Ana coleta → Dr. Lucas passa o valor → PDF pra cliente",
          "Realtime via Supabase WebSocket",
        ],
      },
      {
        nome: "Inteligência artificial",
        cor: "amber",
        itens: [
          "GPT-4o (Ana Júlia — o agente único)",
          "Whisper (transcrição de áudio)",
          "GPT-4o-mini (descrição de imagens)",
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
    titulo: "Módulos do painel — áreas principais da central",
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
        descricao: "Kanban de 4 etapas movido pela Ana Júlia",
      },
      {
        icone: Calendar,
        nome: "Agenda",
        rota: "/agenda",
        descricao: "Visão da agenda + Google Calendar",
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
          { nome: "OpenAI GPT-4o", uso: "Ana Júlia (o agente que conversa e organiza)" },
          { nome: "GPT-4o-mini", uso: "Descrição de imagens enviadas pelo paciente" },
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
      "Páginas principais do painel + um slide de rotina diária",
      "Cada slide: papel + funcionalidades + decisão arquitetural",
      "Ao final: como tudo se conecta na sua rotina (manhã, tarde, fim do dia)",
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
      "Você é leitor, não escritor por padrão. A Ana Júlia conduz a conversa. Você acompanha pra entender — o único momento em que o Dr. Lucas entra é no orçamento (e ele só passa o valor).",
  },
  {
    tipo: "pagina",
    bloco: "Bloco B · Tour pelo painel",
    titulo: "Funil Kanban (Contatos)",
    rota: "/contatos",
    icone: KanbanSquare,
    papel: "Visualizar o funil completo em 4 colunas — Acolhimento → Qualificação → Agendamento → Reunião Agendada.",
    funcionalidades: [
      "4 colunas movidas automaticamente pela Ana Júlia",
      "Card com nome, procedimento de interesse e última mensagem",
      "Filtros por procedimento, etapa, período",
      "Click no card abre detalhe completo do contato (/contatos/[id])",
    ],
    decisao:
      "Funil simplificado pra 4 etapas (não 7 ou 10). Cada etapa tem um critério objetivo: a própria Ana Júlia é quem decide quando mover. Você não arrasta card — observa o movimento.",
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
    titulo: "Configurações",
    rota: "/configuracoes/*",
    icone: Cog,
    papel: "Integrações externas e administração — Google, WhatsApp e usuários.",
    funcionalidades: [
      "/configuracoes/google-agenda — conectar conta Google + horários de expediente",
      "/configuracoes/whatsapp — credenciais Uazapi + número conectado",
      "/configuracoes/usuarios — quem acessa o painel (gestor / atendente)",
    ],
    decisao:
      "Cada integração tem sua tela própria. Você troca o número de WhatsApp ou a conta do Google sem precisar de devolutiva técnica — está sempre acessível.",
  },
  {
    tipo: "fluxograma",
    bloco: "Bloco B · Tour pelo painel",
    titulo: "Sua rotina no painel — como aproveitar o sistema no dia a dia",
    subtitulo: "Não precisa ficar com o painel aberto o dia todo. Esses são os momentos em que vale entrar.",
    passos: [
      {
        id: "1",
        texto: "Início do dia — abre /dashboard",
        detalhe: "Bate o olho em: leads novos da noite e os agendamentos do dia",
        destaque: "humano",
      },
      {
        id: "2",
        texto: "Durante o dia — quando quiser dar uma olhada nas conversas",
        detalhe: "/atendimentos mostra tudo em tempo real. Você lê pra entender, não pra responder",
        destaque: "humano",
      },
      {
        id: "3",
        texto: "Após cada consulta — abre /agenda",
        detalhe: "Click no paciente → ficha completa → registra o prontuário no campo 'Sobre o paciente'",
        destaque: "humano",
      },
      {
        id: "4",
        texto: "Manutenção pontual — quando precisar ajustar algo",
        ramo: [
          {
            rotulo: "Novo procedimento",
            passos: [
              { id: "4a-1", texto: "/procedimentos → cadastra com nome, duração, faixa de preço", destaque: "humano" },
              { id: "4a-2", texto: "Ana Júlia passa a oferecer automaticamente em segundos", destaque: "ia" },
            ],
          },
          {
            rotulo: "Resposta da IA esquisita",
            passos: [
              { id: "4b-1", texto: "/conteudo-ia → ajusta texto/mídia que ela está usando", destaque: "humano" },
              { id: "4b-2", texto: "Valida a próxima conversa no WhatsApp antes de mexer em procedimento ou agenda", destaque: "humano" },
            ],
          },
          {
            rotulo: "Promover lead → paciente",
            passos: [
              { id: "4c-1", texto: "/contatos → clica no card → botão 'Promover a paciente'", destaque: "humano" },
              { id: "4c-2", texto: "Sistema preserva ID e histórico — só muda o tipo", destaque: "infra" },
            ],
          },
        ],
      },
    ],
  },

  // ============ BLOCO C · O AGENTE ANA JÚLIA ============
  {
    tipo: "abertura-bloco",
    bloco: "Bloco C · Ana Júlia",
    titulo: "Conhecendo a Ana Júlia",
    descricao:
      "Agora vamos abrir a 'caixa preta' da IA. Você vai ver quem é Ana Júlia, o que ela sabe fazer, como ela pensa e quais são os processos que ela executa sem você precisar pedir.",
    destaques: [
      "Um agente só: a Ana Júlia conduz tudo de ponta a ponta",
      "13 ferramentas que a Ana Júlia invoca conforme a conversa pede",
      "4 processos técnicos de ponta a ponta + cenários reais (Bloco D)",
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
      "Mantém o cadastro e o funil organizados sozinha, ao longo da conversa",
      "Na hora do orçamento, aciona o Dr. Lucas — que só precisa responder o valor",
    ],
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
      { nome: "registrar_mensagem", descricao: "Persiste a mensagem no banco (auditoria + realtime)", categoria: "estado" },
      { nome: "atualizar_lead", descricao: "Atualiza o cadastro (nome, procedimento, observações) e avança o funil — a Ana mantém tudo em dia sozinha", categoria: "estado" },
      { nome: "gerar_orcamento", descricao: "Aciona o Dr. Lucas pra precificar; ele responde o valor e o sistema gera o PDF pra paciente", categoria: "humano" },
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
      { id: "11", texto: "A própria Ana Júlia atualiza o cadastro e move o card no funil", detalhe: "Tudo no mesmo fluxo — um agente só, sem segundo robô nos bastidores", destaque: "ia" },
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
      { id: "5", texto: "Ana Júlia chama registrar_agendamento direto", detalhe: "Sem pedir aprovação — ela fecha sozinha", destaque: "ia" },
      { id: "6", texto: "Evento criado no Google Calendar", destaque: "infra" },
      { id: "7", texto: "Card move para 'Reunião Agendada' no Kanban", destaque: "infra" },
      { id: "8", texto: "Ana Júlia confirma com o paciente + envia detalhes", destaque: "ia" },
      { id: "9", texto: "D-1: Ana Júlia chama confirmar_agendamento automaticamente", detalhe: "Lembrete da véspera sem você fazer nada", destaque: "ia" },
    ],
  },
  {
    tipo: "fluxograma",
    bloco: "Bloco C · Ana Júlia",
    titulo: "Processo 3 — Orçamento (Ana + Dr. Lucas)",
    subtitulo: "O único momento em que o Dr. Lucas entra: ele só passa o valor, a Ana cuida de todo o resto.",
    passos: [
      { id: "1", texto: "Paciente qualificado pede o valor", detalhe: "Já passou por procedimento + região + foto", destaque: "externo" },
      { id: "2", texto: "Ana pergunta: 'posso gerar um orçamento pra você?'", destaque: "ia" },
      { id: "3", texto: "Paciente diz sim → Ana chama gerar_orcamento", destaque: "ia" },
      { id: "4", texto: "Sistema avisa o Dr. Lucas no WhatsApp dele", detalhe: "Manda nome + telefone + resumo do caso", destaque: "infra" },
      { id: "5", texto: "Dr. Lucas responde só 'número - valor'", detalhe: "Ex.: 5545999998888 - 8500. Não precisa fazer mais nada", destaque: "humano" },
      { id: "6", texto: "Sistema gera o PDF do orçamento", detalhe: "Identidade + foto do Dr. Lucas, o procedimento, o valor e a validade", destaque: "infra" },
      { id: "7", texto: "Ana envia o PDF pra paciente e retoma a conversa", destaque: "ia" },
      { id: "8", texto: "Paciente aprova → Ana agenda a avaliação com o Dr. Lucas", destaque: "ia" },
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

  // ============ BLOCO D · CENÁRIOS DE ATENDIMENTO ============
  {
    tipo: "abertura-bloco",
    bloco: "Bloco D · Cenários reais",
    titulo: "Como a Ana Júlia age em cada situação",
    descricao:
      "Até aqui você viu como o sistema funciona por dentro. Agora vamos ver como ele se comporta na prática — em cada fase do funil e nos protocolos especiais (confirmação, no-show, reagendamento, orçamento aproximado).",
    destaques: [
      "As 4 fases do funil pela ótica da Ana Júlia",
      "Como ela conduz a conversa naturalmente, sem caixinhas de 'tipo de paciente'",
      "Protocolos especiais que rodam sozinhos (confirmação D-1, no-show, reagendamento)",
      "Orçamento: a faixa aproximada na hora, ou o orçamento real com PDF via Dr. Lucas",
    ],
  },
  {
    tipo: "fluxograma",
    bloco: "Bloco D · Cenários reais",
    titulo: "O funil em ação — o que a Ana Júlia faz em cada fase",
    subtitulo: "Acolhimento → Qualificação → Agendamento → Reunião Agendada. A própria Ana Júlia decide quando o card avança.",
    passos: [
      {
        id: "1",
        texto: "Fase 1 — Acolhimento (primeiro contato)",
        detalhe: "Cumprimenta com naturalidade · Identifica de onde veio (anúncio? site? indicação?) · Abre espaço pro paciente falar o que precisa",
        destaque: "ia",
      },
      {
        id: "2",
        texto: "Fase 2 — Qualificação",
        detalhe: "Pergunta qual procedimento interessa · Sonda expectativa (resultado desejado) · Mede urgência (pra quando?) · Se necessário, envia conteúdo da biblioteca",
        destaque: "ia",
      },
      {
        id: "3",
        texto: "Fase 3 — Agendamento",
        detalhe: "Chama consultar_agenda → apresenta 2-3 horários · Confirma o escolhido · Fecha direto com registrar_agendamento",
        destaque: "ia",
      },
      {
        id: "4",
        texto: "Fase 4 — Reunião Agendada",
        detalhe: "Manda detalhes (endereço, instruções pré-consulta) · D-1 dispara confirmar_agendamento automático · No dia: confirmar_presenca · Se faltar: marcar_nao_compareceu",
        destaque: "ia",
      },
      {
        id: "5",
        texto: "Ao longo da conversa — cadastro e funil sempre atualizados",
        detalhe: "A própria Ana Júlia atualiza o cadastro do paciente e move o card de fase. Você só vê o kanban se movendo sozinho",
        destaque: "ia",
      },
    ],
  },
  {
    tipo: "fluxograma",
    bloco: "Bloco D · Cenários reais",
    titulo: "Protocolos especiais — o que roda sem você pedir",
    subtitulo: "Comportamentos automáticos da Ana Júlia em situações específicas",
    passos: [
      {
        id: "1",
        texto: "Protocolos que disparam sozinhos",
        ramo: [
          {
            rotulo: "Confirmação D-1",
            passos: [
              { id: "2a-1", texto: "Véspera da consulta às 18h (configurável)", destaque: "infra" },
              { id: "2a-2", texto: "Ana Júlia chama confirmar_agendamento", destaque: "ia" },
              { id: "2a-3", texto: "Manda mensagem perguntando se vai comparecer", destaque: "ia" },
              { id: "2a-4", texto: "Se responder 'não' → tool atualizar_agendamento e oferece remarcar", destaque: "ia" },
            ],
          },
          {
            rotulo: "No-show",
            passos: [
              { id: "2b-1", texto: "Paciente não compareceu no horário marcado", destaque: "externo" },
              { id: "2b-2", texto: "Você marca em /agenda", destaque: "humano" },
              { id: "2b-3", texto: "Tool marcar_nao_compareceu registra + devolve pro funil", destaque: "ia" },
              { id: "2b-4", texto: "Ana Júlia retoma conversa pra entender e tentar reengajar", destaque: "ia" },
            ],
          },
          {
            rotulo: "Reagendamento",
            passos: [
              { id: "2c-1", texto: "Paciente pede pra trocar horário", destaque: "externo" },
              { id: "2c-2", texto: "Ana Júlia chama consultar_agenda novamente", destaque: "ia" },
              { id: "2c-3", texto: "atualizar_agendamento move evento no Google Calendar", destaque: "ia" },
              { id: "2c-4", texto: "Card permanece em 'Reunião Agendada' — só muda data/hora", destaque: "infra" },
            ],
          },
          {
            rotulo: "Só quer preço (orçamento aproximado)",
            passos: [
              { id: "2e-1", texto: "Paciente chega pedindo valor e não quer qualificar", destaque: "externo" },
              { id: "2e-2", texto: "Ana manda a FAIXA aproximada do procedimento", detalhe: "Direto do cadastro — sem PDF e sem acionar o Dr. Lucas", destaque: "ia" },
              { id: "2e-3", texto: "Se a pessoa resolver qualificar → vira orçamento real (Processo 3)", destaque: "ia" },
            ],
          },
        ],
      },
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
      "Quer ajustar o tom da Ana Júlia ou as regras de movimentação do funil?",
      "Existe algum processo seu que não está coberto pelo sistema?",
      "Próximos passos: o que você gostaria de evoluir nos próximos 30 dias?",
    ],
  },
]

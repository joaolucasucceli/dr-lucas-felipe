# Roadmap — Central Dr. Lucas

### Dr. Lucas Felipe Pereira Ferreira | CRM-SP 259815

> Roadmap completo de desenvolvimento do sistema Central Dr. Lucas.
> Cada sprint cobre **todas as camadas**: Banco de Dados, Backend, Frontend, Sistema de Design, Testes Playwright e Responsividade.

---

## Decisões Arquiteturais (Resultados da Auditoria)

Antes de iniciar, estas decisões estão definidas:

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| **Autenticação** | NextAuth.js (Credentials Provider) | Mais controle, sem custo adicional, integra com modelo `Usuario` próprio no Prisma |
| **Tarefas em Segundo Plano** | Vercel Cron + Redis como fila | Volume não justifica BullMQ; cron a cada 15min para follow-ups e confirmações |
| **Tempo Real** | Polling via `useSWR` com `refreshInterval` (10-30s) | WebSocket é over-engineering para este volume; SSE como evolução futura |
| **LGPD** | Soft delete (`deletadoEm`), consentimento, anonimização | Conformidade com legislação brasileira de proteção de dados |
| **Conversa.etapa** | 9 valores (alinhado ao kanban) | Corrige inconsistência do planejamento original (era 4 valores) |
| **Responsividade** | Mobile-first, breakpoints Tailwind padrão | `sm:640px`, `md:768px`, `lg:1024px`, `xl:1280px` |
| **Drag & Drop** | `@hello-pangea/dnd` | Fork mantido do react-beautiful-dnd |
| **Calendário** | `@fullcalendar/react` ou grid Tailwind customizado | Avaliação na Sprint 3 |
| **Gráficos** | `recharts` | Leve, composável, integra bem com Tailwind |

---

## Resumo das Sprints

| Sprint | Nome | Dependências |
|--------|------|-------------|
| **0** | Infraestrutura e Configuração Inicial | Nenhuma |
| **1** | Autenticação, Usuários e Schema Base | Sprint 0 |
| **2** | Procedimentos e Leads (CRUD Principal) | Sprint 1 |
| **3** | Agendamentos + Google Calendar | Sprint 2 |
| **4** | Kanban Visual e Movimentação no Funil | Sprint 2 |
| **5** | Webhook WhatsApp, Buffer e Mídia | Sprint 1 |
| **6** | Agente IA — Núcleo (Ferramentas, Prompt e Memória) | Sprint 3 + Sprint 5 |
| **7** | Follow-ups, Confirmações e Tarefas em Segundo Plano | Sprint 6 |
| **8** | Dashboards com Métricas (Gestor e Atendente) | Sprint 4 + Sprint 6 |
| **9** | Roadmap de Sprints | Sprint 1 |
| **10** | LGPD, Auditoria e Segurança | Sprint 2 |
| **11** | Refinamento, Performance e UX Final | Todas anteriores |
| **12** | Testes E2E Completos, CI/CD e Publicação | Todas anteriores |

**Sprints paralelizáveis:**
- Sprint 4 e Sprint 5 podem rodar simultaneamente
- Sprint 9 e Sprint 10 podem rodar simultaneamente

**Caminho crítico:** `0 → 1 → 2 → 3 → 6 → 7 → 8 → 11 → 12`

---

## Sprint 0 — Infraestrutura e Configuração Inicial do Projeto

**Objetivo:** Criar o repositório, configurar todas as ferramentas e garantir que o pipeline de desenvolvimento funciona de ponta a ponta. Zero funcionalidade de negócio — apenas a base.

### Banco de Dados
- Criar projeto Supabase (região `sa-east-1`)
- Configurar Redis (Upstash serverless ou Railway)
- Arquivo `prisma/schema.prisma` com datasource e generator configurados
- Nenhuma migration ainda — apenas conexão validada

### Backend
- Inicializar projeto: `npx shadcn@latest init --preset b1Ymqvi3U --template next`
- Instalar dependências core: `prisma`, `@prisma/client`, `next-auth`, `@upstash/redis`, `openai`, `zod`
- Criar `lib/prisma.ts` (singleton Prisma Client)
- Criar `lib/redis.ts` (cliente Redis)
- Configurar `.env.local` com todas as variáveis de ambiente (valores de dev)
- Criar `middleware.ts` placeholder (será expandido na Sprint 1)
- Configurar `next.config.js`

### Frontend
- Layout raiz (`app/layout.tsx`) com providers (ThemeProvider, SessionProvider)
- Página de login placeholder (`app/login/page.tsx`)
- Layout do dashboard (`app/(dashboard)/layout.tsx`) com sidebar placeholder
- Página inicial placeholder (`app/(dashboard)/dashboard/page.tsx`)

### Sistema de Design
- Instalar componentes shadcn/ui base:
  - `button`, `input`, `label`, `card`, `badge`, `dialog`, `alert-dialog`
  - `form`, `select`, `textarea`, `table`, `tabs`, `tooltip`
  - `dropdown-menu`, `avatar`, `separator`, `skeleton`, `toast`, `sonner`
- Validar que o preset `b1Ymqvi3U` está aplicado corretamente (theme, cores)

### Testes Playwright
- Instalar Playwright: `npx playwright install`
- Configurar `playwright.config.ts`:
  - `baseURL` apontando para dev server
  - Projetos: `chromium`, `firefox`, `mobile-chrome`
- Teste smoke: `tests/smoke.spec.ts` — acessa `/login`, verifica que a página carrega
- Script no `package.json`: `"test:e2e": "playwright test"`

### Responsividade
- Configurar Tailwind com breakpoints padrão
- Viewport meta tag no layout raiz
- Testar que o skeleton da página renderiza em 320px, 768px e 1280px

### Entrega
Repositório funcional com `npm run dev` rodando, Playwright passando o smoke test, Supabase e Redis conectados.

---

## Sprint 1 — Autenticação, Usuários e Esquema Base

**Objetivo:** Implementar o schema completo do banco, autenticação com NextAuth.js, CRUD de usuários e seed data. Ao final, é possível fazer login e gerenciar usuários.

### Banco de Dados

**Esquema Prisma completo** com correções da auditoria:

Adicionar a **todos os modelos** relevantes:
- `deletadoEm DateTime?` (soft delete)
- `atualizadoEm DateTime @updatedAt` (onde ausente)

**Modelo Lead** — adicionar campos:
- `arquivado Boolean @default(false)`
- `arquivadoEm DateTime?`
- `consentimentoLgpd Boolean @default(false)`
- `consentimentoLgpdEm DateTime?`

**Modelo Conversa** — expandir `etapa` para 9 valores alinhados ao kanban:
```
primeiro_atendimento | qualificacao | agendamento | consulta_agendada |
consulta_realizada | sinal_pago | procedimento_agendado | concluido | perdido
```

**Modelo Agendamento** — adicionar:
- `atualizadoEm DateTime @updatedAt`

**Novo modelo FotoLead:**
```prisma
model FotoLead {
  id          String   @id @default(cuid())
  leadId      String
  lead        Lead     @relation(fields: [leadId], references: [id])
  url         String
  descricao   String?
  tipoAnalise String?  // biotipo | antes | depois
  criadoEm    DateTime @default(now())
}
```

**Novo modelo AuditLog:**
```prisma
model AuditLog {
  id          String   @id @default(cuid())
  usuarioId   String?
  acao        String   // create | update | delete | login | export
  entidade    String   // Lead | Agendamento | Usuario | etc.
  entidadeId  String?
  dadosAntes  Json?
  dadosDepois Json?
  ip          String?
  criadoEm    DateTime @default(now())
}
```

**Indexes:**
```prisma
@@index([leadId])        // em Agendamento, Conversa, MensagemWhatsapp, FotoLead
@@index([conversaId])    // em MensagemWhatsapp
@@index([responsavelId]) // em Lead
@@index([statusFunil])   // em Lead
@@index([criadoEm])      // em Lead, Agendamento, MensagemWhatsapp
@@index([dataHora])      // em Agendamento
@@index([etapa])         // em Conversa
@@index([entidade, entidadeId]) // em AuditLog
```

**Dados iniciais** (`prisma/seed.ts`):
- 3 procedimentos (Mini Lipo, Lipo Enxertia Glútea, PMMA)
- Usuário IA: "Ana Júlia — IA" (perfil: atendente, tipo: ia)
- Usuário Gestor de teste: "Dr. Lucas" (perfil: gestor)
- Usuário Desenvolvedor de teste

**Migration:** `npx prisma migrate dev --name init-schema-completo`

### Backend

**Autenticação (NextAuth.js):**
- `lib/auth.ts` — configuração NextAuth com CredentialsProvider
  - Validar email + senha (bcrypt) contra modelo `Usuario`
  - Session strategy: JWT
  - Callbacks: incluir `perfil`, `tipo`, `id` no token e session
- `app/api/auth/[...nextauth]/route.ts`
- `middleware.ts` — proteger rotas `/(dashboard)/*`, redirecionar para `/login` se não autenticado
- `lib/auth-helpers.ts` — funções `getServerSession`, `requireRole(perfil)`, `requireAnyRole([perfis])`
- `lib/audit.ts` — função `registrarAudit(acao, entidade, entidadeId, dados)` reutilizável

**API de Usuários** (rotas que faltavam no planejamento original):
```
GET    /api/usuarios          — listar (só Gestor)
POST   /api/usuarios          — criar (só Gestor)
GET    /api/usuarios/:id      — detalhe
PATCH  /api/usuarios/:id      — editar (só Gestor)
DELETE /api/usuarios/:id      — soft delete (só Gestor)
```
- Validação com Zod em todos os endpoints
- Senha hashada com bcrypt na criação/edição
- Não permitir deletar o usuário IA
- Audit log em todas as operações

### Frontend

**Página de Login** (`app/login/page.tsx`):
- Formulário com email + senha
- Validação client-side com Zod + React Hook Form
- Mensagem de erro para credenciais inválidas
- Redirect para `/dashboard` após login

**Layout Dashboard** (`app/(dashboard)/layout.tsx`):
- Sidebar com navegação (links variam por perfil)
- Header com nome do usuário, avatar, botão logout
- Sidebar colapsável (ícone hamburger no mobile)

**Página Usuários** (`app/(dashboard)/usuarios/page.tsx`):
- `PageHeader` com título "Usuários" e botão "Novo Usuário"
- `DataTable` listando usuários (nome, email, perfil, tipo, ativo, criado em)
- Modal de criação/edição (`UsuarioForm`)
- `ConfirmDialog` para desativar usuário
- Filtro por perfil e status (ativo/inativo)

**Componentes criados:**
- `components/features/shared/PageHeader.tsx`
- `components/features/shared/DataTable.tsx` (com paginação, filtro, ordenação)
- `components/features/shared/ConfirmDialog.tsx`
- `components/features/shared/EmptyState.tsx`
- `components/features/shared/UserAvatar.tsx`
- `components/features/usuarios/UsuarioForm.tsx`

### Sistema de Design
- Instalar shadcn/ui adicionais: `sheet` (sidebar mobile), `command` (busca), `popover`, `calendar`, `scroll-area`, `switch`, `checkbox`
- Criar componente `LoadingState.tsx` (skeleton genérico para tabelas/cards)
- Criar componente `ErrorState.tsx` (erro genérico com botão de retry)

### Testes Playwright
- `tests/auth.spec.ts`:
  - Login com credenciais válidas → redireciona para dashboard
  - Login com credenciais inválidas → mostra erro
  - Acesso a rota protegida sem login → redireciona para login
  - Logout → redireciona para login
- `tests/usuarios.spec.ts`:
  - Listar usuários
  - Criar usuário com dados válidos
  - Tentar criar com email duplicado → erro
  - Editar usuário
  - Desativar usuário
  - Atendente não vê menu Usuários → acesso negado

### Responsividade
- Sidebar: colapsada por padrão no mobile (`<md`), overlay com `Sheet`
- DataTable: scroll horizontal no mobile, colunas prioritárias visíveis
- Login: card centralizado, ocupa 100% no mobile, max-w-md no desktop
- UsuarioForm: modal fullscreen no mobile, dialog no desktop

### Entrega
Sistema com login funcional, 3 perfis com permissões, CRUD completo de usuários, sidebar navegável e schema do banco completo com todos os campos corrigidos.

---

## Sprint 2 — Procedimentos e Leads (CRUD Principal)

**Objetivo:** Implementar os dois CRUDs de domínio principal — Procedimentos e Leads/Pacientes. Ao final, o gestor pode cadastrar procedimentos e leads manualmente.

### Banco de Dados
- Nenhuma migration nova (schema já criado na Sprint 1)
- Dados iniciais adicional: 5 leads de exemplo com diferentes `statusFunil` para testes visuais

### Backend

**API Procedimentos** (rotas que faltavam no planejamento original):
```
GET    /api/procedimentos          — listar (todos os perfis)
POST   /api/procedimentos          — criar (só Gestor)
GET    /api/procedimentos/:id      — detalhe
PATCH  /api/procedimentos/:id      — editar (só Gestor)
DELETE /api/procedimentos/:id      — soft delete / desativar (só Gestor)
```
- Validação Zod: nome obrigatório, valorBase >= 0, duracaoMin > 0
- Campo `posOperatorio` aceita JSON estruturado
- Audit log

**API Leads** (expandir rotas do planejamento):
```
GET    /api/leads                  — listar com paginação, filtros, busca
POST   /api/leads                  — criar
GET    /api/leads/:id              — detalhe completo (com agendamentos, mensagens)
PATCH  /api/leads/:id              — editar
PATCH  /api/leads/:id/status       — mudar etapa no funil
PATCH  /api/leads/:id/arquivar     — arquivar/desarquivar
POST   /api/leads/:id/fotos        — upload de fotos (Supabase Storage)
GET    /api/leads/:id/fotos        — listar fotos
DELETE /api/leads/:id/fotos/:fotoId — remover foto
```
- Filtros: statusFunil, procedimentoInteresse, responsavelId, origem, arquivado, busca por nome/whatsapp
- `sobreOPaciente`: endpoint PATCH faz **append, nunca overwrite**
- Upload de foto: salvar no Supabase Storage bucket `fotos-leads`, registrar no modelo `FotoLead`
- Validação: whatsapp único (formato E.164)
- Audit log em todas as operações

### Frontend

**Página Procedimentos** (`app/(dashboard)/procedimentos/page.tsx`):
- `PageHeader` + botão "Novo Procedimento"
- `DataTable` com colunas: nome, tipo, valor base, duração, ativo
- Modal `ProcedimentoForm` para criar/editar
- Toggle ativo/inativo inline
- `EmptyState` quando não há procedimentos

**Página Leads** (`app/(dashboard)/leads/page.tsx`):
- `PageHeader` + botão "Novo Lead"
- `DataTable` com colunas: nome, whatsapp, procedimento, etapa, responsável, criado em
- Filtros: etapa (multi-select), procedimento, responsável, origem
- Busca por nome/whatsapp
- Toggle "Mostrar arquivados"
- Click na linha → navega para ficha

**Ficha do Lead** (`app/(dashboard)/leads/[id]/page.tsx`):
- Tabs: **Dados** | **Histórico** | **Fotos**
- Tab Dados: `LeadForm` com todos os campos editáveis, `StatusBadge` da etapa
- Tab Histórico: `LeadHistorico` — timeline de mudanças de status e mensagens (vazio por ora, será populado pelo agente)
- Tab Fotos: galeria com upload, preview, descrição, botão excluir com `ConfirmDialog`

**Componentes criados:**
- `components/features/shared/StatusBadge.tsx` — cores mapeadas para as 9 etapas do kanban + status de agendamento
- `components/features/leads/LeadForm.tsx`
- `components/features/leads/LeadFicha.tsx`
- `components/features/leads/LeadHistorico.tsx`
- `components/features/leads/LeadFotoGaleria.tsx`
- `components/features/procedimentos/ProcedimentoForm.tsx`

### Sistema de Design
- Instalar: `toggle`, `toggle-group`, `aspect-ratio` (galeria de fotos), `progress`
- **StatusBadge**: mapear 9 etapas kanban com cores distintas:

| Etapa | Cor |
|-------|-----|
| Primeiro Atendimento | Cinza |
| Qualificação | Azul |
| Agendamento | Índigo |
| Consulta Agendada | Roxo |
| Consulta Realizada | Verde |
| Sinal Pago | Esmeralda |
| Procedimento Agendado | Âmbar |
| Concluído | Verde escuro |
| Perdido | Vermelho |

### Testes Playwright
- `tests/procedimentos.spec.ts`:
  - CRUD completo (criar, listar, editar, desativar)
  - Validação de campos obrigatórios
  - Atendente não pode criar/editar
- `tests/leads.spec.ts`:
  - Criar lead com dados válidos
  - Buscar lead por nome
  - Filtrar por etapa
  - Editar lead
  - Arquivar e desarquivar
  - Upload de foto (mock file)
  - Visualizar ficha completa

### Responsividade
- DataTable de leads: no mobile, mostrar apenas nome + etapa + procedimento; demais colunas em scroll horizontal
- LeadForm: campos empilhados em coluna única no mobile, 2 colunas no desktop
- Ficha do Lead: tabs ocupam largura total; galeria de fotos 2 colunas no mobile, 4 no desktop
- ProcedimentoForm: dialog no desktop, fullscreen no mobile

### Entrega
CRUD completo de Procedimentos e Leads com fotos. O gestor pode cadastrar os 3 procedimentos, criar leads manualmente, organizar e buscar pacientes. Componentes shared (`StatusBadge`, `DataTable`) reutilizáveis para sprints futuras.

---

## Sprint 3 — Agendamentos + Integração Google Calendar

**Objetivo:** CRUD de agendamentos com sincronização bidirecional com Google Calendar. Ao final, é possível agendar pré-consultas e procedimentos com visualização em calendário.

### Banco de Dados
- Migration: adicionar campo `googleCalendarSyncedAt DateTime?` em Agendamento (controle de sincronização)
- Dados iniciais: 3-5 agendamentos de exemplo vinculados aos leads de teste

### Backend

**Google Calendar** (`lib/google-calendar.ts`):
- Autenticação via Service Account (OAuth2 com refresh token)
- `listarDisponibilidade(dataInicio, dataFim)` — retorna slots livres
- `criarEvento(agendamento)` — cria evento e retorna `googleEventId`
- `atualizarEvento(googleEventId, dados)` — remarcar
- `cancelarEvento(googleEventId)` — cancelar

**API Agendamentos:**
```
GET    /api/agendamentos                    — listar com filtros (tipo, status, período, leadId)
POST   /api/agendamentos                    — criar + criar evento Google Calendar
GET    /api/agendamentos/:id                — detalhe
PATCH  /api/agendamentos/:id                — editar/remarcar + atualizar Google Calendar
PATCH  /api/agendamentos/:id/sinal          — registrar sinal pago
PATCH  /api/agendamentos/:id/realizado      — marcar como realizado (só Atendente/Gestor)
GET    /api/agendamentos/disponibilidade    — consultar slots do Google Calendar
```
- Ao criar: sincronizar com Google Calendar, registrar `googleEventId`
- Ao remarcar: status → `remarcado`, atualizar evento no Calendar
- Ao cancelar: cancelar evento no Calendar
- Ao marcar realizado: atualizar `statusFunil` do Lead para `consulta_realizada`
- Validação: não permitir agendar no passado, validar conflitos de horário
- Audit log em todas as operações

### Frontend

**Página Agendamentos** (`app/(dashboard)/agendamentos/page.tsx`):
- `PageHeader` + botão "Novo Agendamento"
- Tabs: **Calendário** | **Lista**
- Tab Calendário: `AgendaCalendario` (visão mensal e semanal)
- Tab Lista: `DataTable` com colunas: paciente, tipo, procedimento, data, status, sinal pago
- Filtros: tipo (consulta/procedimento), status, período
- Click no agendamento → modal de detalhe/edição

**Componentes criados:**
- `components/features/agendamentos/AgendaCalendario.tsx` — calendário visual com eventos clicáveis
- `components/features/agendamentos/AgendamentoForm.tsx` — formulário com seleção de lead, tipo, procedimento, data/hora (com slots disponíveis do Google Calendar), modalidade
- `components/features/agendamentos/AgendaCard.tsx` — card resumido para uso no dashboard

### Sistema de Design
- Instalar lib de calendário (avaliar `@fullcalendar/react` ou construir com grid Tailwind)
- Cores por tipo de agendamento: consulta (azul), procedimento (verde)
- Cores por status: agendado (azul), remarcado (amarelo), cancelado (vermelho), realizado (verde)

### Testes Playwright
- `tests/agendamentos.spec.ts`:
  - Criar agendamento de pré-consulta
  - Criar agendamento de procedimento
  - Remarcar agendamento
  - Cancelar agendamento
  - Marcar como realizado (verifica que lead muda de etapa)
  - Registrar sinal pago
  - Visualizar em calendário e lista
  - Validação: não agendar no passado
- Mock do Google Calendar API nos testes (interceptar chamadas HTTP)

### Responsividade
- Calendário: no mobile, visão diária por padrão (semanal e mensal muito apertados); swipe para trocar dia
- Lista: scroll horizontal no mobile
- AgendamentoForm: campo de data/hora com `DatePicker` nativo no mobile, popover no desktop
- AgendaCard: largura total no mobile

### Entrega
Sistema completo de agendamentos integrado ao Google Calendar. Gestor/Atendente podem criar, remarcar, cancelar e marcar agendamentos como realizados. Visualização em calendário e lista. Marcar como realizado atualiza automaticamente o funil do lead.

---

## Sprint 4 — Kanban Visual e Movimentação no Funil

**Objetivo:** Implementar o quadro kanban com drag & drop, filtros e badges de alerta. Ao final, o gestor visualiza todo o funil de atendimento e move leads entre etapas.

### Banco de Dados
- Migration: adicionar `ultimaMovimentacaoEm DateTime?` no Lead (para calcular "tempo na etapa")
- Adicionar `motivoPerda String?` no Lead (quando move para "Perdido")

### Backend

**API Kanban** (extender `/api/leads`):
```
GET    /api/leads/kanban        — retorna leads agrupados por statusFunil (otimizado)
PATCH  /api/leads/:id/status    — mover no funil (com validação de permissão por coluna)
```
- Regras de movimentação:
  - Colunas 1-4: movidas pelo agente IA (ou Gestor com override)
  - Colunas 5-8: Atendente ou Gestor
  - Coluna 9 (Perdido): qualquer perfil
  - Atendente só move leads atribuídos a si
- Query otimizada: trazer apenas campos necessários para o card (nome, procedimento, responsável, etapa, ultimaMovimentacaoEm)
- Ao mover para "Perdido": exigir `motivoPerda`
- Ao mover para "Consulta Realizada": verificar que existe agendamento com status `realizado`
- Audit log de todas as movimentações

### Frontend

**Página Kanban** (`app/(dashboard)/kanban/page.tsx`):
- `PageHeader` com título "Kanban" e filtros inline
- `KanbanBoard` — board horizontal com 9 colunas, drag & drop via `@hello-pangea/dnd`
- Filtros: responsável (incluindo "IA" vs "Humano"), procedimento, período
- Contador de leads por coluna no header da coluna

**Componentes criados:**
- `components/features/kanban/KanbanBoard.tsx` — container com scroll horizontal
- `components/features/kanban/KanbanColumn.tsx` — coluna com header (nome, contagem, cor), área droppable
- `components/features/kanban/KanbanCard.tsx` — card do lead com: nome, procedimento, `UserAvatar` do responsável, `StatusBadge`, tempo na etapa, badge de alerta (>3 dias parado)
- `components/features/kanban/KanbanFilters.tsx` — barra de filtros

### Sistema de Design
- Instalar `@hello-pangea/dnd`
- Cores de coluna: cada uma das 9 colunas com cor distinta no header (gradiente sutil)
- Badge de alerta: vermelho pulsante para leads parados >3 dias
- Card: sombra sutil ao arrastar (drag preview)

### Testes Playwright
- `tests/kanban.spec.ts`:
  - Visualizar board com leads distribuídos
  - Filtrar por responsável
  - Mover lead entre colunas (drag & drop ou click + select)
  - Validar que Atendente não move leads de outros
  - Mover para "Perdido" exige motivo
  - Badge de alerta aparece após 3 dias
  - Contagem por coluna está correta

### Responsividade
- Mobile: scroll horizontal livre; colunas com largura fixa `w-72`; snap scroll para navegar entre colunas
- Seletor de coluna no mobile: dropdown para "pular" para uma coluna específica
- Cards: tamanho compacto no mobile (menos informação visível, expandir ao tocar)
- Filtros: drawer no mobile (botão "Filtros" abre sheet lateral)

### Entrega
Kanban visual completo com 9 colunas, drag & drop, filtros, badges de alerta e permissões por perfil. O funil de atendimento está visualizável e gerenciável.

---

## Sprint 5 — Webhook WhatsApp, Buffer e Processamento de Mídia

**Objetivo:** Implementar a infraestrutura do agente IA — webhook, buffer Redis com debounce, processamento de mídia (áudio, imagem, documento) e configuração da instância Uazapi. Ao final, o sistema recebe e processa mensagens do WhatsApp.

### Banco de Dados
- Nenhuma migration nova

### Backend

**Configuração Uazapi** (`lib/uazapi.ts`):
- `testarConexao(url, adminToken)` — GET /instance/list
- `criarInstancia(url, adminToken)` — POST /instance/create
- `configurarWebhook(url, token, webhookUrl)` — POST /webhook/set
- `conectar(url, token)` — GET /instance/connect → QR code base64
- `verificarStatus(url, token)` — GET /instance/status
- `desconectar(url, token, instanceId, adminToken)` — logout + delete
- `enviarMensagem(url, token, numero, mensagem)` — POST para enviar texto
- `enviarDigitando(url, token, chatId, ativo)` — indicador de digitação

**API WhatsApp Config:**
```
POST   /api/whatsapp/test-connection   — testar credenciais
POST   /api/whatsapp/create-instance   — criar instância + QR code
GET    /api/whatsapp/status            — polling de status
POST   /api/whatsapp/disconnect        — desconectar
```

**Webhook** (`app/api/webhooks/whatsapp/route.ts`):
- Validar payload Uazapi (estrutura esperada)
- Filtrar: ignorar mensagens do próprio bot, mensagens de grupo, status updates
- Dedup via `messageIdWhatsapp` (verificar no banco antes de processar)
- Detectar tipo: texto, áudio, imagem, documento, vídeo
- Salvar no buffer Redis: chave `{chatId}_buf_dr-lucas`, TTL 60s

**Buffer Redis** (`lib/agente/buffer.ts`):
- Debounce 20s: ao receber mensagem, agendar processamento em 20s
- Se nova mensagem chega antes dos 20s, resetar timer
- Implementação: Redis sorted set com timestamp + re-trigger via fetch interno com delay
- Concatenar mensagens do buffer ao processar

**Processamento de Mídia** (`lib/agente/processar-midia.ts`):
- Áudio: baixar via URL Uazapi → enviar para Whisper → retornar transcrição
- Imagem: baixar → enviar para GPT-4o-mini (vision) → retornar descrição
- Documento (PDF): extrair texto
- Vídeo: extrair frame + descrição via GPT-4o-mini

**API Auth Interna** (`lib/api-auth.ts`):
- Validar header `x-api-secret` para rotas do agente
- Middleware reutilizável

### Frontend

**Página Config WhatsApp** (`app/(dashboard)/configuracoes/whatsapp/page.tsx`):
- Wizard 4 etapas (Stepper):
  1. **Credenciais**: inputs URL + adminToken, botão "Testar Conexão"
  2. **QR Code**: exibir QR code base64, instruções para escanear
  3. **Status**: polling a cada 5s, mostrar "Conectando..." ou "Conectado" com número
  4. **Gerenciar**: botão "Desconectar" com `ConfirmDialog`
- Status badge no topo: conectado/desconectado
- Só acessível por Gestor e Desenvolvedor

**Componentes criados:**
- `components/features/whatsapp/QRCodeDisplay.tsx`
- `components/features/whatsapp/InstanceStatus.tsx`
- `components/features/whatsapp/WhatsAppWizard.tsx`

### Sistema de Design
- Construir Stepper com `tabs` + estados visuais
- QR Code: card centralizado com borda, loading skeleton enquanto carrega

### Testes Playwright
- `tests/whatsapp-config.spec.ts`:
  - Testar conexão com credenciais válidas (mock API Uazapi)
  - Exibir QR code
  - Polling de status até conectar
  - Desconectar
  - Permissão: Atendente não acessa a página
- `tests/webhook.spec.ts` (teste de API):
  - POST com payload válido → 200
  - POST com payload inválido → 400
  - POST com messageId duplicado → 200 (idempotente, não reprocessa)
  - POST de mensagem de grupo → ignorada

### Responsividade
- WhatsApp Wizard: stepper vertical no mobile (ao invés de horizontal)
- QR Code: centralizado, tamanho responsivo (max 280px)
- Status badge: fixo no topo, visível em qualquer tamanho

### Entrega
Instância WhatsApp configurável via painel. Webhook recebendo e processando mensagens (texto, áudio, imagem). Buffer Redis com debounce funcionando. Nenhuma resposta automática ainda — apenas recepção e processamento.

---

## Sprint 6 — Agente IA — Núcleo (Ferramentas, Prompt e Memória)

**Objetivo:** Implementar o cérebro do agente — as 6 ferramentas, system prompt, memória Redis e o loop de resposta com GPT-4o. Ao final, o agente WhatsApp responde pacientes autonomamente, qualifica leads e agenda pré-consultas.

### Banco de Dados
- Nenhuma migration nova

### Backend

**Ferramentas do Agente** (`lib/agente/ferramentas.ts` + rotas `/api/agente/*`):

1. **`POST /api/agente/consultar-paciente`**
   - Buscar lead por whatsapp
   - Se não existe: criar lead com `statusFunil: primeiro_atendimento`, `responsavelId: id_usuario_ia`
   - Retornar: dados do lead, conversa ativa (se houver), histórico `sobreOPaciente`

2. **`POST /api/agente/registrar-mensagem`**
   - Criar `MensagemWhatsapp` vinculada a conversa e lead
   - Se não há conversa ativa: criar nova `Conversa`
   - Parâmetros: conversaId, leadId, direcao, tipoConteudo, conteudo, midiaUrl, messageIdWhatsapp

3. **`POST /api/agente/consultar-procedimentos`**
   - Retornar procedimentos ativos com descrição, regiões, pós-operatório
   - Filtro opcional por nome/tipo

4. **`POST /api/agente/salvar-qualificacao`**
   - Append em `sobreOPaciente` (nunca sobrescrever)
   - Atualizar `procedimentoInteresse`, `regioesInteresse`
   - Mover lead para `statusFunil: agendamento`
   - Mover conversa para `etapa: agendamento`

5. **`POST /api/agente/registrar-agendamento`**
   - Criar agendamento tipo `consulta`
   - Criar evento no Google Calendar
   - Mover lead para `statusFunil: consulta_agendada`
   - Mover conversa para `etapa: consulta_agendada`

6. **`POST /api/agente/atualizar-agendamento`**
   - Remarcar ou cancelar
   - Atualizar Google Calendar
   - Se cancelado: mover lead de volta para `agendamento`

Todas as rotas validam `x-api-secret`.

**System Prompt** (`lib/agente/prompt.ts`):
- Prompt completo da "Ana Júlia" com:
  - Personalidade, tom, regras de comportamento
  - Definição das 3 etapas do funil (qualificação → agendamento → gestão)
  - Regras por perfil de paciente (seção 5.3 do planejamento)
  - Restrições (nunca informar preço, nunca admitir ser IA, etc.)
  - Formato de resposta (mensagens curtas, fracionadas)
  - Instruções de uso de cada ferramenta

**Memória Redis** (`lib/agente/memoria.ts`):
- Chave: `{chatId}_mem_dr-lucas`
- Armazenar últimas 20 mensagens (role + content)
- Incluir resumo do lead (nome, procedimento, etapa) no contexto
- TTL: 48 horas (conversa ativa)

**Loop de Resposta** (expandir webhook handler):
1. Buffer concatena mensagens
2. `consultar-paciente` → obter contexto
3. Enviar "digitando" via Uazapi
4. Montar mensagens: system prompt + memória + mensagem atual
5. Chamar GPT-4o com function calling (as 6 ferramentas como tools)
6. Executar tool calls retornados
7. Segmentar resposta em mensagens curtas
8. Enviar cada segmento via Uazapi com delay 1s
9. Salvar na memória Redis
10. Registrar mensagens enviadas no banco
11. Parar "digitando"

**Kanban Sync** (`lib/agente/kanban-sync.ts`):
- Função centralizada que atualiza `statusFunil` do Lead e `etapa` da Conversa
- Chamada pelas ferramentas ao avançar no funil

### Frontend
- Nenhuma página nova nesta sprint
- Atualizar `LeadHistorico` na ficha do lead para exibir mensagens da conversa em tempo real (polling com `useSWR` a cada 10s)
- Badge no Kanban card indicando "conversa ativa" (ícone WhatsApp verde)

### Sistema de Design
- Ícone WhatsApp para badge de conversa ativa
- Indicador visual de "IA atendendo" nos cards do kanban
- Balões de chat no LeadHistorico (estilo WhatsApp: verde para enviada, branco para recebida)

### Testes Playwright
- `tests/agente-ferramentas.spec.ts` (testes de API):
  - `consultar-paciente`: lead novo → cria; lead existente → retorna
  - `registrar-mensagem`: cria mensagem, cria conversa se necessário
  - `consultar-procedimentos`: retorna 3 procedimentos
  - `salvar-qualificacao`: append em sobreOPaciente, muda status
  - `registrar-agendamento`: cria agendamento, muda status (mock Google Calendar)
  - `atualizar-agendamento`: remarcar e cancelar
  - Todas as rotas rejeitam sem `x-api-secret`
- `tests/agente-fluxo.spec.ts` (teste de integração):
  - Simular fluxo completo: webhook → qualificação → agendamento
  - Verificar que lead passa pelas etapas corretas no banco

### Responsividade
- LeadHistorico: mensagens em formato chat (balões) responsivo, largura máxima 80% no desktop, 95% no mobile

### Entrega
Agente IA funcional respondendo via WhatsApp. Qualifica pacientes, consulta procedimentos, agenda pré-consultas no Google Calendar. Leads são criados e movidos automaticamente no kanban. Histórico de conversas visível na ficha do lead.

---

## Sprint 7 — Follow-ups, Confirmações e Tarefas em Segundo Plano

**Objetivo:** Implementar follow-ups por silêncio (1h, 6h, 24h), confirmações automáticas de agendamento (6h, 3h, 30min antes) e auto-close de conversas. Ao final, o agente não perde pacientes por silêncio e confirma agendamentos proativamente.

### Banco de Dados
- Migration para adicionar:
  - `Conversa.ultimaMensagemEm DateTime?` (para calcular silêncio)
  - `Conversa.followUpEnviados String[] @default([])` (registrar quais: "1h", "6h", "24h")
  - `Agendamento.confirmacoesEnviadas String[] @default([])` (registrar: "6h", "3h", "30min")

### Backend

**Cron Jobs** (Vercel Cron via `vercel.json`):

1. **`GET /api/cron/follow-ups`** (a cada 15 minutos):
   - Buscar conversas ativas onde `ultimaMensagemEm` excede os limiares
   - 1h sem resposta + "1h" não enviado → enviar follow-up leve
   - 6h sem resposta + "6h" não enviado → enviar follow-up com valor
   - 24h sem resposta + "24h" não enviado → enviar follow-up de encerramento + encerrar conversa
   - Mensagens geradas pelo GPT-4o (com contexto do lead para personalização)
   - Enviar via Uazapi, registrar no banco

2. **`GET /api/cron/confirmacoes`** (a cada 15 minutos):
   - Buscar agendamentos com status `agendado` cuja `dataHora` está nos limiares
   - 6h antes + "6h" não enviado → enviar lembrete
   - 3h antes + "3h" não enviado → enviar confirmação
   - 30min antes + "30min" não enviado → enviar "Daqui a pouco começa!"
   - **Respeitar horário comercial** (seg-sex 8h-18h, sáb 8h-12h) — se fora, agendar para próximo horário válido
   - Timezone: `America/Sao_Paulo`
   - Enviar via Uazapi ao número do lead vinculado

3. **`GET /api/cron/auto-close`** (a cada hora):
   - Conversas com `ultimaMensagemEm` > 24h e follow-up "24h" já enviado → encerrar conversa (`encerradaEm = now()`)

**Segurança dos crons:**
- Validar header `Authorization: Bearer CRON_SECRET` (Vercel Cron envia automaticamente)

**Lógica de horário comercial** (`lib/agente/horario-comercial.ts`):
- `ehHorarioComercial(data: Date): boolean`
- `proximoHorarioComercial(data: Date): Date`

### Frontend
- Indicador visual na ficha do lead: "Follow-up 1h enviado", "Follow-up 6h enviado", etc.
- No Kanban: badge "Aguardando resposta" para leads com follow-up pendente
- Na lista de agendamentos: badge "Confirmação enviada" com horário

### Sistema de Design
- Badges de follow-up: ícones distintos (relógio 1h, sino 6h, porta 24h)
- Badge de confirmação no agendamento

### Testes Playwright
- `tests/cron-followups.spec.ts` (testes de API):
  - Conversa com 1h de silêncio → follow-up enviado
  - Conversa com 6h → segundo follow-up
  - Conversa com 24h → encerramento
  - Follow-up já enviado → não duplica
- `tests/cron-confirmacoes.spec.ts`:
  - Agendamento em 5h → confirmação 6h enviada
  - Agendamento em 2h → confirmação 3h enviada
  - Agendamento em 20min → confirmação 30min enviada
  - Fora de horário comercial → não envia, agenda para próximo horário
- `tests/cron-auto-close.spec.ts`:
  - Conversa com 24h+ e follow-up 24h enviado → encerrada

### Responsividade
- Badges de follow-up: compactos no mobile (apenas ícone, sem texto)
- Timeline de follow-ups na ficha do lead: empilhada verticalmente

### Entrega
Sistema proativo completo. O agente envia follow-ups personalizados por silêncio (1h, 6h, 24h), confirma agendamentos antes da consulta, e fecha conversas abandonadas automaticamente. Tudo respeitando horário comercial de São Paulo.

---

## Sprint 8 — Dashboards com Métricas (Gestor e Atendente)

**Objetivo:** Implementar os dashboards com todas as métricas de sistema e da IA. Ao final, o gestor tem visão completa da operação e o atendente vê sua agenda e leads.

### Banco de Dados
- Nenhuma migration nova (dados já existem, apenas queries de agregação)

### Backend

**API Métricas Sistema** (`GET /api/metricas/sistema`) — só Gestor:
- Total de leads ativos (não arquivados, não deletados)
- Leads criados hoje / esta semana / este mês
- Taxa de conversão por etapa (leads que passaram de cada etapa para a próxima)
- Procedimentos da semana (quantidade por tipo)
- Leads parados há mais de 3 dias (lista com nome, etapa, tempo parado)
- Receita estimada em pipeline (soma de `valorOrcamento` dos leads ativos)
- Distribuição por origem

**API Métricas IA** (`GET /api/metricas/ia`) — só Gestor:
- Atendimentos iniciados hoje / semana / mês (leads criados pelo usuário IA)
- Tempo médio de qualificação (primeiro_atendimento → salvar-qualificacao)
- Taxa de agendamento (leads qualificados que agendaram)
- Taxa de cancelamento e reagendamento
- Mensagens enviadas e recebidas hoje
- Leads IA vs leads manuais
- Follow-ups enviados (1h, 6h, 24h) e taxa de reativação
- Últimas conversas ativas (lista com nome, etapa, última mensagem)

**Métricas Atendente** (embutido nas queries existentes):
- Meus leads ativos (filtro por responsavelId = sessao.userId)
- Agenda do dia (agendamentos de hoje)
- Leads sem movimentação atribuídos a mim

### Frontend

**Dashboard Gestor** (`app/(dashboard)/dashboard/page.tsx`):
- `PageHeader` com título "Dashboard"
- **Seção "Sistema":**
  - `MetricGroup` com 4 `MetricCard`: leads ativos, leads hoje, taxa conversão geral, receita pipeline
  - `ConversionFunnel` — funil visual das 9 etapas com números e percentuais
  - `AlertList` — leads parados >3 dias
- **Seção "Ana Júlia — IA":**
  - `IaMetricsPanel` com cards: atendimentos hoje/semana/mês, tempo médio qualificação, taxa agendamento
  - Gráfico: leads IA vs manuais (bar chart com `recharts`)
  - Lista de últimas conversas ativas
- Polling a cada 30s para dados atualizados (`useSWR` com `refreshInterval`)

**Dashboard Atendente:**
- Condicional no mesmo `page.tsx` (renderiza componentes diferentes baseado no perfil)
- `MetricGroup`: meus leads ativos, agenda hoje, pendências
- `AgendaDia` — lista de agendamentos do dia com horário e paciente
- Lista de leads sem movimentação

**Componentes criados:**
- `components/features/shared/MetricCard.tsx`
- `components/features/shared/MetricGroup.tsx`
- `components/features/dashboard/ConversionFunnel.tsx`
- `components/features/dashboard/IaMetricsPanel.tsx`
- `components/features/dashboard/AlertList.tsx`
- `components/features/dashboard/AgendaDia.tsx`
- `components/features/dashboard/ActivityList.tsx`

### Sistema de Design
- Instalar `recharts`
- MetricCard: ícone + número grande + label + variação percentual (verde/vermelho)
- ConversionFunnel: barras horizontais decrescentes com percentual entre etapas
- Paleta de cores consistente com StatusBadge

### Testes Playwright
- `tests/dashboard-gestor.spec.ts`:
  - Dashboard carrega com métricas corretas
  - Funil de conversão exibe 9 etapas
  - Lista de alertas mostra leads parados
  - Métricas da IA exibem dados
  - Atendente não vê seção IA
- `tests/dashboard-atendente.spec.ts`:
  - Dashboard exibe apenas "meus leads" e "minha agenda"
  - AgendaDia lista agendamentos de hoje
  - Não exibe métricas do sistema

### Responsividade
- MetricGroup: 2 colunas no mobile, 4 no desktop
- ConversionFunnel: vertical no mobile (barras empilhadas), horizontal no desktop
- AgendaDia: lista simples no mobile, cards lado a lado no desktop
- AlertList: cards empilhados no mobile
- IaMetricsPanel: full width no mobile, ao lado do sistema no desktop

### Entrega
Dashboards completos para Gestor e Atendente. Gestor visualiza métricas de sistema e da IA, funil de conversão, alertas de leads parados. Atendente vê sua agenda e seus leads. Dados atualizados via polling.

---

## Sprint 9 — Roadmap de Sprints

**Objetivo:** Implementar o módulo de Roadmap (sprints com checklist) para gestão do desenvolvimento do próprio sistema. Ao final, o time pode gerenciar sprints pelo painel.

### Banco de Dados
- Nenhuma migration nova (Sprint e SprintItem já estão no schema)
- Dados iniciais: 2 sprints de exemplo com itens de checklist

### Backend

**API Sprints:**
```
GET    /api/sprints                      — listar (só Gestor/Dev)
POST   /api/sprints                      — criar
PATCH  /api/sprints/:id                  — editar (nome, descrição, status, datas, ordem)
DELETE /api/sprints/:id                  — deletar (com itens em cascata)
POST   /api/sprints/:id/itens           — adicionar item ao checklist
PATCH  /api/sprints/:id/itens/:itemId   — editar/toggle item
DELETE /api/sprints/:id/itens/:itemId   — remover item
PATCH  /api/sprints/reorder             — reordenar sprints (drag & drop)
```
- Validações: nome obrigatório, datas coerentes (fim >= início)
- Cálculo de progresso: itens concluídos / total itens
- Audit log

### Frontend

**Página Roadmap** (`app/(dashboard)/roadmap/page.tsx`):
- `PageHeader` + botão "Nova Sprint"
- Filtro por status: planejada | em andamento | concluída
- Lista de `SprintCard` com drag & drop para reordenar
- Click no card → expande inline ou abre modal com `SprintChecklist`

**Componentes criados:**
- `components/features/roadmap/SprintCard.tsx` — card com nome, descrição, status badge, barra de progresso, datas, responsável
- `components/features/roadmap/SprintChecklist.tsx` — lista de itens com checkbox, input para adicionar novo item, botão remover
- `components/features/roadmap/SprintForm.tsx` — modal de criação/edição

### Sistema de Design
- Barra de progresso com cores: 0-33% vermelho, 34-66% amarelo, 67-100% verde
- SprintCard: estados visuais distintos por status (borda colorida)

### Testes Playwright
- `tests/roadmap.spec.ts`:
  - Criar sprint com checklist
  - Toggle item de checklist
  - Progresso atualiza corretamente
  - Editar sprint
  - Deletar sprint com confirmação
  - Reordenar sprints
  - Filtrar por status
  - Atendente não acessa Roadmap

### Responsividade
- SprintCards: 1 coluna no mobile, 2 no tablet, 3 no desktop
- SprintChecklist: largura total no mobile
- SprintForm: fullscreen no mobile, dialog no desktop
- Drag & drop de reordenação: funciona por touch no mobile

### Entrega
Módulo Roadmap completo. Gestor e Desenvolvedor podem criar sprints, gerenciar checklists, acompanhar progresso e reordenar prioridades.

---

## Sprint 10 — LGPD, Auditoria e Segurança

**Objetivo:** Implementar conformidade LGPD, exportação/exclusão de dados, audit trail visível e hardening de segurança. Ao final, o sistema está em conformidade com a legislação brasileira de proteção de dados.

### Banco de Dados
- Migration: garantir que `consentimentoLgpd` e `consentimentoLgpdEm` estão preenchidos corretamente
- Índice em `AuditLog.criadoEm` para queries eficientes

### Backend

**LGPD Endpoints:**
```
GET    /api/leads/:id/exportar-dados    — exportar todos os dados do lead em JSON (só Gestor)
POST   /api/leads/:id/solicitar-exclusao — anonimizar dados do lead (soft delete + anonimização)
GET    /api/leads/:id/consentimento     — verificar status do consentimento
PATCH  /api/leads/:id/consentimento     — registrar consentimento
```
- Exportar dados: retorna JSON com lead, agendamentos, mensagens, fotos (URLs)
- Solicitar exclusão: anonimizar campos pessoais (nome → "Anonimizado", whatsapp → hash, email → null), manter dados estatísticos
- Consentimento: registrar data/hora, IP

**Audit Trail visível:**
```
GET    /api/audit-log                    — listar logs com filtros (só Gestor/Dev)
GET    /api/audit-log/:entidade/:id      — logs de uma entidade específica
```
- Filtros: entidade, ação, usuarioId, período
- Paginação

**Segurança:**
- Rate limiting nas rotas de API (via `@upstash/ratelimit`)
- Sanitização de inputs (XSS prevention)
- Headers de segurança no `next.config.js` (CSP, X-Frame-Options, X-Content-Type-Options)
- Validação de CORS
- Verificar que nenhum endpoint retorna campo `senha`

**Atualização do agente:**
- Ao primeiro contato, agente menciona política de privacidade
- Registrar consentimento implícito ao paciente responder

### Frontend

**Ficha do Lead — Tab LGPD:**
- Status do consentimento
- Botão "Exportar Dados" (download JSON)
- Botão "Solicitar Exclusão" com `ConfirmDialog` detalhado (ação irreversível)
- Data/hora do consentimento

**Página Audit Log** (`app/(dashboard)/configuracoes/audit-log/page.tsx`):
- `DataTable` com colunas: data, usuário, ação, entidade, entidadeId
- Filtros: ação, entidade, usuário, período
- Expandir linha para ver dados antes/depois (JSON diff)
- Só acessível por Gestor e Desenvolvedor

### Sistema de Design
- Diff viewer simples para audit log (antes/depois em cores)
- Ícones de ação no audit log (criar, editar, deletar, login, exportar)

### Testes Playwright
- `tests/lgpd.spec.ts`:
  - Exportar dados de um lead → download JSON com dados corretos
  - Solicitar exclusão → dados anonimizados, lead não aparece em buscas normais
  - Consentimento registrado com data/hora
- `tests/audit-log.spec.ts`:
  - Criar lead → audit log registrado
  - Editar lead → audit log com antes/depois
  - Filtrar audit log por entidade
  - Atendente não acessa audit log
- `tests/seguranca.spec.ts`:
  - Rate limiting funciona (muitas requests → 429)
  - Rotas do agente rejeitam sem api-secret
  - Senha nunca retornada em APIs de usuário

### Responsividade
- Audit log: scroll horizontal no mobile, colunas prioritárias (data, ação, entidade)
- LGPD tab na ficha do lead: botões empilhados no mobile
- Diff viewer: scroll vertical no mobile

### Entrega
Sistema em conformidade com LGPD. Exportação e exclusão de dados pessoais funcional. Audit trail completo e visível para gestores. Rate limiting e headers de segurança implementados.

---

## Sprint 11 — Refinamento, Performance e UX Final

**Objetivo:** Refinar toda a experiência do usuário — loading states, error states, empty states, animações, performance, busca global e notificações. Ao final, o sistema tem qualidade de produção.

### Banco de Dados
- Revisar e adicionar índices faltantes baseado em queries lentas observadas
- Otimizar queries N+1 com `include` seletivo no Prisma

### Backend

**Busca Global:**
```
GET /api/busca?q=texto    — busca em leads (nome, whatsapp), agendamentos, procedimentos
```
- Retorna resultados agrupados por tipo com links

**Notificações internas:**
```
GET /api/notificacoes     — eventos recentes relevantes para o usuário logado
```
- Leads sem movimentação atribuídos a mim
- Agendamentos próximos (hoje)
- Novos leads criados pela IA

**Performance:**
- Implementar `revalidate` e `cache` nas rotas de API onde aplicável
- Otimizar query do kanban (apenas campos necessários, paginação por coluna se >50 leads)
- Otimizar queries do dashboard (agregações no SQL, não no JS)

### Frontend

**Loading States** — todos os componentes que buscam dados:
- `Skeleton` do shadcn/ui para DataTable, MetricCard, KanbanBoard, etc.
- `loading.tsx` em cada route group do App Router

**Error States:**
- `ErrorState` component com mensagem amigável + botão "Tentar novamente"
- `error.tsx` em cada route group
- Toast de erro em operações que falham

**Empty States:**
- `EmptyState` component em: leads, kanban (coluna vazia), agendamentos, roadmap
- Ícones contextuais para cada cenário

**Busca Global:**
- `Command` (shadcn/ui) acessível via `Ctrl+K` / `Cmd+K`
- Resultados agrupados: Leads, Agendamentos, Procedimentos
- Navegação por teclado

**Notificações:**
- Ícone sino no header com badge de contagem
- Dropdown com lista de notificações
- Click navega para o item relevante

**Animações e Transições:**
- Transição suave ao mover cards no kanban
- Fade-in em modais
- Toast animado (sonner)
- Hover states em todos os elementos interativos

### Sistema de Design
- Definir padrões de skeleton para cada componente (consistência visual)
- Verificar contraste de cores (acessibilidade WCAG AA)

### Testes Playwright
- `tests/busca-global.spec.ts`:
  - Abrir busca com Ctrl+K
  - Buscar lead por nome → resultado aparece
  - Navegar para resultado
- `tests/loading-error-states.spec.ts`:
  - Simular API lenta → skeleton aparece
  - Simular erro de API → error state com retry
  - Página sem dados → empty state
- `tests/acessibilidade.spec.ts`:
  - Verificar navegação por teclado nas páginas principais
  - Verificar contraste com `@axe-core/playwright`

### Responsividade
- Busca global: fullscreen no mobile (ao invés de popover)
- Notificações: sheet lateral no mobile
- Skeletons: adaptados ao layout mobile de cada componente
- **Verificar TODAS as páginas** em 320px, 375px, 768px, 1024px, 1440px

### Entrega
Sistema com qualidade de produção. Todas as páginas têm loading, error e empty states. Busca global funcional. Notificações no header. Performance otimizada. Acessibilidade básica garantida.

---

## Sprint 12 — Testes E2E Completos, CI/CD e Publicação

**Objetivo:** Cobertura E2E completa, pipeline de CI/CD no GitHub Actions, e deploy em produção na Vercel. Ao final, o sistema está live e testado.

### Banco de Dados
- Migration de produção: verificar que schema está sincronizado
- Dados iniciais de produção: apenas os 3 procedimentos + usuário IA + usuário Dr. Lucas (sem dados de teste)

### Backend

**Verificação de Saúde:**
```
GET /api/health    — verifica banco, Redis, retorna status
```

**Vercel Config** (`vercel.json`):
```json
{
  "crons": [
    { "path": "/api/cron/follow-ups", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/confirmacoes", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/auto-close", "schedule": "0 * * * *" }
  ]
}
```

**GitHub Actions** (`.github/workflows/ci.yml`):
- Trigger: push para `main` e PRs
- Steps: install → lint → type-check → prisma generate → playwright test (com Supabase de teste)
- Deploy: automático para Vercel via integração

### Frontend
- Nenhuma página nova
- Revisão final de todas as páginas

### Sistema de Design
- Revisão final de consistência visual
- Documentar componentes custom em comentários

### Testes Playwright

**Suíte completa de regressão:**

- `tests/fluxo-completo-gestor.spec.ts`:
  - Login como Gestor
  - Criar procedimento
  - Criar lead manualmente
  - Agendar pré-consulta
  - Visualizar no kanban
  - Mover lead para "Consulta Realizada"
  - Verificar métricas no dashboard

- `tests/fluxo-completo-agente.spec.ts`:
  - Simular webhook de nova mensagem
  - Verificar lead criado
  - Simular qualificação completa
  - Simular agendamento
  - Verificar lead no kanban em "Consulta Agendada"

- `tests/fluxo-completo-atendente.spec.ts`:
  - Login como Atendente
  - Ver apenas seus leads
  - Marcar pré-consulta como realizada
  - Verificar restrições de acesso

- `tests/permissoes.spec.ts`:
  - Gestor acessa tudo
  - Atendente não acessa: métricas, roadmap, config WhatsApp, usuários
  - Desenvolvedor acessa tudo + roadmap

- `tests/responsividade.spec.ts`:
  - Todas as páginas em viewport 375px (mobile)
  - Todas as páginas em viewport 768px (tablet)
  - Sidebar colapsada no mobile
  - Kanban scroll horizontal no mobile

- `tests/casos-extremos.spec.ts`:
  - Lead com whatsapp duplicado → erro
  - Agendamento no passado → erro
  - Mensagem WhatsApp duplicada → ignorada
  - Sessão expirada → redirect para login

### Responsividade
- Teste final completo de todas as páginas em todos os breakpoints
- Correções finais de layout

### Entrega
Sistema deployado em produção na Vercel. Suite E2E cobrindo fluxos críticos. CI/CD funcional com testes automáticos em PRs. Cron jobs configurados. **Sistema pronto para uso real.**

---

## Diagrama de Dependências entre Sprints

```
Sprint 0 (Setup)
    │
    ▼
Sprint 1 (Auth + Schema)
    │
    ├──────────────────────┬──────────────────┐
    ▼                      ▼                  ▼
Sprint 2 (Leads/Proc)  Sprint 5 (Webhook)  Sprint 9 (Roadmap)
    │                      │
    ├──────────┐           │
    ▼          ▼           │
Sprint 3    Sprint 4       │
(Agenda)    (Kanban)       │
    │          │           │
    ├──────────┤           │
    │          │           │
    ▼          │           │
Sprint 6 (Agente IA) ◄────┘
    │
    ▼
Sprint 7 (Follow-ups)
    │
    ▼
Sprint 8 (Dashboards) ◄── Sprint 4 (Kanban)
    │
    ▼
Sprint 10 (LGPD) ◄── Sprint 2
    │
    ▼
Sprint 11 (Polish)
    │
    ▼
Sprint 12 (Deploy)
```

---

## Variáveis de Ambiente

```env
# Banco de Dados (Supabase)
DATABASE_URL=
DIRECT_URL=

# Supabase (chaves públicas e privadas)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Redis (Upstash — cache e buffer do agente)
REDIS_URL=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# OpenAI (IA do agente — GPT-4o, Whisper, GPT-4o-mini)
OPENAI_API_KEY=

# Uazapi (gateway WhatsApp)
UAZAPI_BASE_URL=
UAZAPI_ADMIN_TOKEN=

# Google Calendar (integração de agendamentos)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALENDAR_ID=
GOOGLE_REFRESH_TOKEN=

# Autenticação (NextAuth.js)
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# Segurança (chaves internas do sistema)
SISTEMA_API_SECRET=
CRON_SECRET=
```

---

*Central Dr. Lucas — Sistema de Gestão de Atendimento*
*Dr. Lucas Felipe Pereira Ferreira | CRM-SP 259815*

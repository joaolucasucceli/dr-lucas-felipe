/**
 * DOCUMENTAÇÃO CENTRALIZADA — Central Dr. Lucas
 *
 * Este arquivo é a FONTE DE VERDADE da documentação do sistema.
 * Toda sprint, feature ou mudança deve atualizar este conteúdo.
 * O botão "Baixar Documentação" na página /documentacao gera
 * o arquivo .md a partir deste módulo.
 */

export const VERSAO_DOCUMENTACAO = "1.3.0"
export const DATA_ATUALIZACAO = "2026-03-21"

export const DOCUMENTACAO_MD = `# Documentação — Central Dr. Lucas
> Versão ${VERSAO_DOCUMENTACAO} · Atualizado em ${DATA_ATUALIZACAO}

Sistema web para gestão de atendimento da clínica do Dr. Lucas Felipe.
Dois módulos integrados em uma única aplicação Next.js:
- **Painel de Gestão** — kanban, leads, agendamentos, procedimentos, métricas
- **Agente IA WhatsApp (Ana Júlia)** — atendimento autônomo de pacientes via WhatsApp

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 14+ (App Router) |
| UI | shadcn/ui (preset b1Ymqvi3U) |
| Estilização | Tailwind CSS |
| Banco de dados | PostgreSQL via Supabase |
| ORM | Prisma |
| Autenticação | NextAuth.js (Credentials Provider) |
| Cache/Buffer | Redis (Upstash) |
| IA | OpenAI GPT-4o (chat), Whisper (áudio), GPT-4o-mini (visão) |
| WhatsApp | Uazapi (gateway) |
| Calendário | Google Calendar API |
| Deploy | Vercel |
| Testes E2E | Playwright |

---

## Perfis de Usuário

| Perfil | Acesso |
|--------|--------|
| **Gestor** | Total — todas as telas e funcionalidades |
| **Atendente** | Operacional — Dashboard, Atendimentos, Leads, Agendamentos |

> O usuário "Ana Júlia" é do tipo IA com perfil Atendente. Nunca deve ser desativado.

---

## Módulo 1 — Dashboard

Central de métricas e acompanhamento do funil em tempo real.

### Funcionalidades

- **Métricas principais** — Total de leads, agendamentos no período, taxa de conversão e atividade do dia
- **Funil por etapa** — Gráfico de barras com a distribuição dos leads nas 9 etapas
- **Leads por origem** — Distribuição por canal de aquisição (Instagram, indicação, Google, etc.)
- **Alertas e follow-ups** — Leads em alerta por inatividade e follow-ups pendentes

### Como usar

1. Selecione o período (Hoje / Última semana / Último mês / Total) no seletor superior
2. Analise os KPIs nos cards do topo
3. Verifique os widgets de Follow-ups Ativos e Leads em Alerta

### Permissões

| Perfil | Acesso |
|--------|--------|
| Gestor | Total — vê taxa de conversão, atividade da IA e gráfico de origem |
| Atendente | Parcial — vê leads do dia e agendamentos da semana |

> O Dashboard é atualizado a cada acesso. Recarregue para ver dados frescos.

---

## Módulo 2 — Leads

Gestão completa da base de pacientes e potenciais clientes.

### Funcionalidades

- **Busca e filtros** — Filtre por nome, WhatsApp, etapa do funil e status de arquivamento
- **Cadastro de leads** — Crie leads com nome, WhatsApp, procedimento de interesse e origem
- **Exportação CSV** — Exporte a lista filtrada para análise em planilhas
- **Perfil completo** — Histórico de conversas, fotos antes/depois e agendamentos

### Como usar

1. Use os filtros de etapa, status e busca para segmentar a lista
2. Clique em "Novo Lead" para cadastrar (nome e WhatsApp são obrigatórios)
3. Clique em qualquer linha para abrir o perfil completo
4. Com filtros aplicados, clique em "Exportar CSV" para gerar relatório segmentado

### Permissões

| Perfil | Acesso |
|--------|--------|
| Gestor | Total — cria, edita, arquiva, reatribui e exporta |
| Atendente | Total — cria, edita e visualiza |

> **Atenção:** O WhatsApp é único no sistema. A Ana Júlia usa esse campo para identificar o paciente. Nunca cadastre o mesmo número para dois leads.

---

## Módulo 3 — Atendimentos (Kanban)

Visualização em kanban do funil de atendimento com 9 etapas.

### Etapas do Funil

| # | Etapa | Movimentação |
|---|-------|-------------|
| 1 | Primeiro Atendimento | Automática (Ana Júlia) |
| 2 | Qualificação | Automática (Ana Júlia) |
| 3 | Agendamento | Automática (Ana Júlia) |
| 4 | Consulta Agendada | Automática (Ana Júlia) |
| 5 | Consulta Realizada | Manual |
| 6 | Sinal Pago | Manual |
| 7 | Procedimento Agendado | Manual |
| 8 | Concluído | Manual |
| 9 | Perdido | Manual |

### Funcionalidades

- **9 etapas do funil** — Visualização completa da jornada do paciente
- **Movimentação automática** — Etapas 1 a 4 movidas pela Ana Júlia via WhatsApp
- **Ação manual (etapas 5–8)** — Controle manual do time clínico
- **Filtros avançados** — Por responsável, etapa, procedimento ou nome

### Como usar

1. Observe cada coluna representando uma etapa (número no cabeçalho = quantidade de leads)
2. Use o menu do card (três pontos) para mudar a etapa de um lead nas colunas 5 a 8
3. Ao mover para "Perdido", informe o motivo (alimenta relatórios de perda)

### Permissões

| Perfil | Acesso |
|--------|--------|
| Gestor | Total — move, arquiva e reatribui leads |
| Atendente | Total — move e atualiza cards |

> A Ana Júlia move leads automaticamente até "Consulta Agendada" (etapa 4). A partir daí, o time clínico assume.

---

## Módulo 4 — Agendamentos

Agenda integrada com Google Calendar e confirmações automáticas.

### Funcionalidades

- **Visualização em lista** — Tabela filtrável por status, data e paciente
- **Calendário semanal** — Grade visual 8h–20h com slots clicáveis
- **Sincronização Google** — Agendamentos criam eventos automáticos no Google Calendar
- **Confirmações automáticas** — Lembretes via WhatsApp 6h, 3h e 30min antes

### Status de Agendamento

\`agendado\` → \`confirmado\` → \`realizado\` | \`cancelado\` | \`remarcado\`

### Como usar

1. Clique em "Novo Agendamento" e selecione paciente, procedimento, data e horário
2. Alterne entre "Lista" e "Calendário" para diferentes perspectivas
3. Atualize o status conforme o atendimento progride
4. Prefira "Remarcado" a "Cancelado" quando o paciente quer outro horário

### Permissões

| Perfil | Acesso |
|--------|--------|
| Gestor | Total — cria, edita e cancela |
| Atendente | Total — cria, edita e cancela |

> Configure o Google Agenda em Configurações antes de criar agendamentos para garantir sincronização.

---

## Módulo 5 — Procedimentos

Catálogo de procedimentos da clínica com valores e duração.

### Funcionalidades

- **Catálogo** — Nome, tipo, valor base (BRL) e duração em minutos
- **Ativação/desativação** — Inativos não aparecem em leads e agendamentos
- **Instruções pós-operatórias** — Texto livre por procedimento

### Como usar

1. Visualize o catálogo com tipo, valor e status
2. Clique em "Novo Procedimento" para cadastrar
3. Use o menu de ações para editar ou ativar/desativar

### Permissões

| Perfil | Acesso |
|--------|--------|
| Gestor | Total — cria, edita e ativa/desativa |
| Atendente | Sem acesso |

> Desative procedimentos descontinuados em vez de excluir — preserva histórico de agendamentos e relatórios.

---

## Módulo 6 — Ana Júlia (Agente IA)

Painel de desempenho e monitoramento do agente de atendimento IA.

### Arquitetura do Agente

\`\`\`
POST /api/webhooks/whatsapp
  → detectar tipo de conteúdo
  → processar mídia (Whisper/GPT-4o-mini)
  → buffer Redis (debounce 20s, chave: {chat_id}_buf_dr-lucas)
  → concatenar mensagens
  → GPT-4o (system prompt + memória Redis, 20 msgs, chave: {chat_id}_mem_dr-lucas)
  → segmentar resposta
  → enviar via Uazapi (delay 1s entre mensagens)
\`\`\`

### 3 Fases do Atendimento

1. **Qualificação** — Coleta nome, interesse no procedimento e informações do paciente
2. **Agendamento** — Consulta disponibilidade e registra consulta no sistema
3. **Gestão do Agendamento** — Confirmações, remarcações e pós-consulta

### Ferramentas do Agente (6 endpoints)

| Endpoint | Função |
|----------|--------|
| \`/api/agente/salvar-qualificacao\` | Salva dados coletados na qualificação |
| \`/api/agente/consultar-paciente\` | Busca informações do paciente |
| \`/api/agente/consultar-procedimentos\` | Lista procedimentos ativos |
| \`/api/agente/registrar-agendamento\` | Cria agendamento no sistema |
| \`/api/agente/atualizar-agendamento\` | Atualiza status do agendamento |
| \`/api/agente/registrar-mensagem\` | Persiste mensagem no banco |

### Automações CRON

| Automação | Frequência | Descrição |
|-----------|-----------|-----------|
| Follow-ups | A cada hora | Envia 1h, 6h e 24h após última mensagem sem resposta |
| Confirmações | A cada hora | Lembretes 6h, 3h e 30min antes da consulta |
| Auto-close | A cada hora | Fecha conversas inativas por mais de 48h |

### Painel de Métricas

- Mensagens enviadas e recebidas no período
- Leads atendidos, agendamentos marcados
- Follow-ups enviados e taxa de resposta
- Progresso no funil (leads por etapa automatizada)

### Permissões

| Perfil | Acesso |
|--------|--------|
| Gestor | Total — visualiza todas as métricas |
| Atendente | Sem acesso |

> A Ana Júlia opera 24/7. Configure o WhatsApp em Configurações para ela funcionar.

---

## Módulo 7 — Relatórios

Análise de desempenho do negócio com exportação de dados.

### Abas Disponíveis

| Aba | Conteúdo |
|-----|---------|
| **Funil** | Taxa de conversão, tempo médio entre etapas, distribuição por etapa |
| **Agendamentos** | Total, taxa de realização, conversão por procedimento e origem |
| **Atendimento IA** | Volume de mensagens, conversas ativas, efetividade de follow-ups |

### Como usar

1. Selecione a aba desejada
2. Informe data de início e fim e clique em "Gerar Relatório"
3. Use "Exportar CSV" para baixar os dados

### Permissões

| Perfil | Acesso |
|--------|--------|
| Gestor | Total — gera e exporta todos os relatórios |
| Atendente | Sem acesso |

> Períodos superiores a 6 meses podem ter carregamento lento. Prefira exportar e analisar offline.

---

## Módulo 8 — Configurações

Integrações, automações e configurações gerais do sistema.

### Seções

#### Google Agenda
- Integração OAuth 2.0 com Google Calendar
- Criação automática de eventos ao agendar consultas
- Configuração: Configurações → Google Agenda → Autorizar

#### WhatsApp (Uazapi)
- Gateway para recebimento e envio de mensagens pela Ana Júlia
- Configuração: inserir URL + token da Uazapi → escanear QR Code

#### Tipos de Procedimento
- Categorias personalizáveis utilizadas no cadastro de procedimentos
- Gestor pode criar, editar, ativar/desativar e excluir tipos
- Configuração: Configurações → Tipos de Procedimento
- Tipos padrão do sistema: Cirúrgico, Estético, Minimamente Invasivo

#### Automações CRON
- Follow-ups e confirmações executados a cada hora
- Botão "Forçar execução" para testar manualmente

### Permissões

| Perfil | Acesso |
|--------|--------|
| Gestor | Total — configura integrações, automações e tipos de procedimento |
| Atendente | Sem acesso (exceto leitura de tipos para formulários) |

> Sem Google Agenda configurado, agendamentos não sincronizam. Sem WhatsApp conectado, a Ana Júlia fica silenciosa.

---

## Módulo 9 — Usuários e Permissões

Gerenciamento de acesso e perfis dos usuários da plataforma.

### Perfis

| Perfil | Módulos com Acesso |
|--------|-------------------|
| **Gestor** | Dashboard (completo), Atendimentos, Leads, Agendamentos, Procedimentos, Configurações, Ana Júlia, Relatórios, Documentação |
| **Atendente** | Dashboard (simplificado), Atendimentos, Leads, Agendamentos, Documentação |

### Como usar

1. Filtre por perfil e status para localizar usuários
2. Clique em "Novo Usuário" e defina nome, e-mail, senha e perfil
3. Use o menu de ações para editar ou desativar (nunca excluir)

### Permissões

| Perfil | Acesso |
|--------|--------|
| Gestor | Total — cria, edita e desativa usuários |
| Atendente | Sem acesso |

> O usuário "Ana Júlia" (tipo IA) nunca deve ser desativado — a IA para de registrar mensagens no banco.

---

## Modelo de Dados — Referência Rápida

### Lead
\`\`\`
id | nome | whatsapp (único) | email | statusFunil | etapaConversa
origem | sobreOPaciente (append-only) | responsavelId
arquivado | motivoPerda | cicloAtual | ciclosCompletos | ehRetorno
\`\`\`

### Agendamento
\`\`\`
id | leadId | procedimentoId | dataHora | status
googleEventId | duracao (min) | ciclo | confirmacoesEnviadas[]
\`\`\`

### Conversa
\`\`\`
id | leadId | etapa | ciclo | ultimaMensagemEm | followUpEnviados[]
\`\`\`

### MensagemWhatsapp
\`\`\`
id | conversaId | messageIdWhatsapp (único) | tipo | conteudo | remetente
\`\`\`

---

## Segurança da API

- Rotas do painel: validam sessão NextAuth (\`getServerSession\`)
- Rotas do agente (\`/api/agente/*\`): validam header \`x-api-secret\`
- Endpoint webhook: valida payload da Uazapi

---

## Convenções de Código

- Todo código de domínio em **português** (campos, variáveis, labels)
- Estrutura de pastas em **português**
- \`Lead.sobreOPaciente\` — texto cumulativo, nunca sobrescrever, apenas append
- Soft deletes via campo \`deletadoEm\`
- Componentes de UI: usar **apenas shadcn/ui**
- StatusBadge — único componente para cores de status
- ConfirmDialog — único diálogo de confirmação destrutiva
- MetricCard — único card de número/métrica
- DataTable — única tabela com filtro/paginação

---

## Sugestões de Features

Funcionalidades disponíveis para implementação em sprints futuras.
Cada item é um módulo independente — é possível contratar qualquer combinação conforme a prioridade da clínica.

| # | Feature | Categoria | O que faz | Por que contratar |
|---|---------|-----------|-----------|-------------------|
| 1 | Site Institucional Integrado | Marketing | Landing page profissional conectada ao sistema; formulário captura leads direto no kanban | Aumenta captação orgânica e elimina perda de leads do site |
| 2 | Agente IA para Instagram | IA | Ana Júlia equivalente para Instagram DMs: qualifica leads e move pelo kanban integrado | Dobra o alcance do atendimento automatizado sem aumentar equipe |
| 3 | Campanhas de Disparo em Massa | Marketing | Mensagens segmentadas para aniversariantes, inativos, pós-procedimento ou por interesse | Reativa pacientes inativos e gera agendamentos sem esforço manual |
| 4 | Portal do Paciente | Expansão | Área exclusiva do paciente com histórico, documentos e agendamentos | Profissionaliza a experiência e reduz chamadas para informações básicas |
| 5 | Captação via Google Ads & Meta Ads | Marketing | Leads das campanhas entram automaticamente no kanban com ROI por campanha | Mostra exatamente quanto cada real investido gerou de receita |
| 6 | NPS e Pesquisa de Satisfação | Clínica | Pesquisa automática pós-procedimento via WhatsApp com dashboard de NPS | Identifica pontos de melhoria antes que se tornem reclamações |
| 7 | App Mobile para Pacientes | Expansão | App nativo iOS/Android para o paciente ver histórico, agendamentos e documentos | Eleva a experiência do paciente e cria canal direto fora do WhatsApp |
| 8 | Chatbot Google Business | IA | Agente IA no Google Meu Negócio que responde, coleta dados e encaminha ao kanban | Captura pacientes com alta intenção de compra no momento da pesquisa |
| 9 | Automação de Carrossel Instagram | Marketing | IA gera carrosséis prontos para postar sobre procedimentos, tendências e conteúdo educativo | Produz conteúdo profissional sem agência ou designer, com consistência |
| 10 | Automação de Artigo de Blog | Marketing | IA gera artigos SEO e publica automaticamente no site da clínica | Aumenta tráfego orgânico e posiciona o Dr. Lucas como referência |
| 11 | Agente de Cobrança IA | IA | Agente WhatsApp que lembra vencimentos, negocia parcelamentos e registra acordos | Reduz inadimplência sem desgaste da equipe nem constrangimento ao paciente |

---

*Documentação gerada pelo sistema Central Dr. Lucas — ${DATA_ATUALIZACAO}*
`

export const NOME_ARQUIVO_DOWNLOAD = `documentacao-central-dr-lucas-v${VERSAO_DOCUMENTACAO}.md`

/**
 * DOCUMENTAÇÃO CENTRALIZADA — Central Dr. Lucas
 *
 * Este arquivo é a FONTE DE VERDADE da documentação do sistema.
 * Toda sprint, feature ou mudança deve atualizar este conteúdo.
 * O botão "Baixar Documentação" na página /documentacao gera
 * o arquivo .md a partir deste módulo.
 */

export const VERSAO_DOCUMENTACAO = "1.12.0"
export const DATA_ATUALIZACAO = "2026-04-04"

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
| Framework | Next.js 16 (App Router + Turbopack) |
| UI | shadcn/ui 4 (preset b1Ymqvi3U) |
| Estilização | Tailwind CSS 4 |
| Banco de dados | PostgreSQL via Supabase |
| ORM | Prisma 7 |
| Autenticação | NextAuth.js (Credentials Provider) |
| Cache/Buffer | Redis (Upstash) |
| IA | OpenAI GPT-4o (chat), Whisper (áudio), GPT-4o-mini (visão) |
| WhatsApp | Uazapi (gateway) |
| Calendário | Google Calendar API |
| Deploy | Vercel |
| Testes E2E | Playwright |
| Real-time | Supabase Realtime (postgres_changes) |

---

## Atualizações em Tempo Real

O sistema utiliza **Supabase Realtime** para manter os dados atualizados automaticamente em todas as telas, sem necessidade de recarregar a página.

### Como funciona
- Um canal WebSocket conecta o navegador ao banco de dados via Supabase
- Quando qualquer dado é criado, atualizado ou removido, a tela se atualiza automaticamente
- Debounce de 300ms evita múltiplas atualizações simultâneas
- Polling de fallback continua ativo em intervalos maiores (2-5 minutos)

### Tabelas monitoradas em tempo real
| Tabela | Páginas afetadas |
|--------|-----------------|
| leads | Kanban, Dashboard, Lista de Leads, Alertas, Follow-ups |
| mensagens_whatsapp | Notificações |
| agendamentos | Agendamentos, Dashboard, Notificações |
| conversas | Kanban (preview de mensagens) |
| pacientes | Lista de Pacientes, Detalhe do Paciente |

### Notificações automáticas (toasts)
- **Novo lead recebido** — quando um lead é criado (ex: pelo agente IA)
- **Nova mensagem recebida** — quando um paciente envia mensagem via WhatsApp

---

## Perfis de Usuário

| Perfil | Acesso |
|--------|--------|
| **Gestor** | Total — todas as telas e funcionalidades |
| **Atendente** | Operacional — Dashboard, Atendimentos, Leads, Agendamentos |

> O usuário "Ana Júlia" é do tipo IA com perfil Atendente. Nunca deve ser desativado.

---

## Módulo 1 — Dashboard

Dashboard unificado com todas as métricas do sistema em página única com scroll. Substitui as páginas separadas de Ana Júlia e Relatórios.

### Funcionalidades

- **Métricas principais** — Total de leads, novos no período, agendamentos e taxa de conversão (gestor) / leads do dia (atendente)
- **Funil por etapa** — Gráfico de barras com a distribuição dos leads nas 9 etapas do kanban
- **Resumo Ana Júlia** (gestor) — Card compacto com mensagens enviadas, follow-ups e confirmações da IA
- **Leads em alerta** — Leads sem movimentação há 3+ dias com link direto para o perfil
- **Exportar CSV** (gestor) — Botão para exportar leads, agendamentos ou conversas em CSV

### Como usar

1. Selecione o período (Hoje / Última semana / Último mês / Total) no seletor superior
2. Analise os KPIs nos cards do topo
3. Verifique o card de resumo da Ana Júlia e os leads em alerta
4. Use o botão de download para exportar dados em CSV (3 tipos disponíveis)

### Permissões

| Perfil | Acesso |
|--------|--------|
| Gestor | Total — vê taxa de conversão, resumo da IA, leads em alerta e pode exportar CSV |
| Atendente | Parcial — vê leads do dia, funil e leads em alerta |

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
| 1 | Acolhimento | Automática (Ana Júlia) |
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

## Módulo 6 — Pacientes & Prontuário

Gestão completa de pacientes clínicos com prontuário médico estruturado. Módulo exclusivo do Gestor.

### Funcionalidades

- **Cadastro de pacientes** — Dados pessoais, endereço, contato de emergência, consentimento LGPD
- **Conversão Lead → Paciente** — Automática ao concluir funil ou manual via botão. Idempotente e atômica
- **Prontuário médico** — Criado automaticamente com número sequencial ao cadastrar paciente
- **Anamnese estruturada** — 5 seções com autosave: queixa principal, histórico médico, alergias/medicamentos, hábitos de vida, medidas e sinais vitais
- **Evolução clínica** — Timeline cronológica com 6 tipos: consulta, procedimento, retorno, prescrição, intercorrência, observação
- **IMC automático** — Calculado ao informar peso e altura (server-side e client-side)
- **Audit trail completo** — Toda operação de leitura, escrita e exclusão é registrada no AuditLog

### Anamnese — Seções do Formulário

| Seção | Campos |
|-------|--------|
| Queixa Principal | Texto livre com autosave |
| Histórico Médico | Histórico geral, doenças pré-existentes, cirurgias anteriores |
| Alergias e Medicamentos | Alergias, medicamentos em uso |
| Hábitos de Vida | Tabagismo, etilismo, atividade física, gestações, anticoncepcional |
| Medidas e Sinais Vitais | Peso (kg), altura (cm), IMC (auto), pressão arterial, observações |

### Evolução Clínica — Tipos

| Tipo | Descrição |
|------|-----------|
| Consulta | Atendimento clínico regular |
| Procedimento | Registro de procedimento realizado |
| Retorno | Consulta de acompanhamento |
| Prescrição | Prescrição médica |
| Intercorrência | Evento adverso ou complicação |
| Observação | Nota geral no prontuário |

### Conversão Lead → Paciente

1. Quando um lead atinge o status "Concluído" (movido manualmente), o sistema converte automaticamente
2. Também disponível via botão "Converter em Paciente" na página do lead (somente Gestor)
3. A conversão é **idempotente** — se o lead já foi convertido, retorna o paciente existente
4. O lead é **arquivado** automaticamente após a conversão
5. O agente IA (Ana Júlia) **não reabre ciclos** de leads já convertidos em pacientes

### Como usar

1. Acesse "Pacientes" no menu lateral (visível apenas para Gestor)
2. Cadastre manualmente ou aguarde a conversão automática de leads concluídos
3. Clique em um paciente para abrir o detalhe com abas: Dados, Prontuário, Agendamentos, Timeline
4. Na aba **Prontuário**, preencha a anamnese (salva automaticamente) e registre evoluções clínicas
5. Use "Nova Evolução" para registrar consultas, procedimentos e observações
6. Na seção **Sinais Vitais**, registre aferições (PA, FC, temperatura, SpO₂, glicemia) com alertas visuais
7. Em evoluções tipo "Procedimento", clique em **Registrar Detalhes Cirúrgicos** para adicionar a ficha cirúrgica completa
8. Na **Galeria de Fotos**, use o botão **Comparar** para visualizar antes/depois com slider interativo

### Sinais Vitais

Sistema de registro e monitoramento de sinais vitais com alertas visuais por limiar.

| Sinal | Unidade | Normal | Atenção | Crítico |
|-------|---------|--------|---------|---------|
| Pressão Arterial | mmHg | ≤ 130/85 | 131-139/86-89 | ≥ 140/90 |
| Frequência Cardíaca | bpm | 60-100 | <60 ou >100 | <50 ou >120 |
| Temperatura | °C | 36.0-37.5 | >37.5 ou <36 | >38.5 ou <35 |
| SpO₂ | % | ≥ 95% | 90-94% | < 90% |
| Glicemia | mg/dL | 70-100 | >100 | <70 ou >200 |

- Dashboard com último valor de cada tipo + badge colorido (Normal/Atenção/Crítico)
- Tabela histórica com filtro por tipo
- Botão "Registrar" abre formulário com tipo, valor, data/hora e observação

### Comparação de Fotos (Antes × Depois)

Ferramenta visual para comparar fotos pré-operatórias e pós-operatórias do paciente.

- Botão "Comparar" na galeria (ativo quando há pelo menos 1 foto pré-op e 1 pós-op)
- Seleção independente de foto de antes e depois via dropdown
- Slider interativo que revela antes/depois arrastando o divisor
- Zoom com scroll do mouse
- Labels "Antes" e "Depois" fixos na imagem

### Registro Cirúrgico

Ficha cirúrgica detalhada vinculada a evoluções do tipo "Procedimento".

| Campo | Descrição |
|-------|-----------|
| Tipo de Anestesia | Local, Sedação, Geral, Raquidiana, Peridural, Bloqueio Regional |
| Anestesista | Nome do profissional (opcional) |
| Duração | Tempo cirúrgico em minutos |
| Sangramento | Classificação (mínimo, moderado, etc.) |
| Técnica Utilizada | Descrição da técnica cirúrgica (obrigatório) |
| Materiais | Lista de materiais utilizados |
| Complicações | Registro de intercorrências durante o procedimento |
| Orientações Pós-op | Cuidados e orientações ao paciente |
| Marcos de Recuperação | Timeline de milestones com checkbox (ex: retirada de pontos, retorno) |

- Ao expandir uma evolução tipo "Procedimento", o registro cirúrgico é exibido inline
- Se não existe, aparece botão "Registrar Detalhes Cirúrgicos"
- Marcos de recuperação com status: Concluído (verde), Pendente (amarelo), Atrasado (vermelho)

### Documentos do Prontuário

Upload e gestão de documentos clínicos vinculados ao prontuário do paciente.

| Tipo | Descrição |
|------|-----------|
| Exame Laboratorial | Resultados de exames de sangue, imagem, etc. |
| Laudo | Laudos médicos e pareceres |
| Termo de Consentimento | Termos assinados pelo paciente |
| Receita | Prescrições médicas |
| Atestado | Atestados médicos |
| Outro | Documentos não categorizados |

- Upload via botão "Novo Documento" na aba Prontuário
- Visualização em lista com tipo, nome, data e opção de download
- Exclusão com confirmação (soft delete)
- Tipos de arquivo aceitos: PDF, imagens e documentos comuns

### Permissões

| Perfil | Acesso |
|--------|--------|
| Gestor | Total — CRUD completo de pacientes, prontuário, anamnese e evolução |
| Atendente | Sem acesso — módulo não aparece no sidebar |

> Todos os dados de pacientes são sensíveis (LGPD). O módulo registra audit log em toda operação — visualização, edição e exclusão.

---

## Módulo 7 — Ana Júlia (Agente IA)

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
  → enviar via Uazapi (delay aleatório 3-5s entre mensagens)
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

### Métricas

As métricas da Ana Júlia (mensagens, follow-ups, confirmações) estão no **Dashboard** — card "Ana Júlia".

> A Ana Júlia opera 24/7. Configure o WhatsApp em Configurações para ela funcionar.

### Abordagem Proativa (Leads do Site)

Quando um visitante preenche o formulário de captação na landing page:

1. O sistema cria o Lead com \`origem: "site"\` e uma Conversa vinculada
2. Uma mensagem sintética é injetada no buffer Redis do agente
3. A Ana Júlia processa e envia uma mensagem proativa no WhatsApp do lead em ~30 segundos
4. A conversa segue o fluxo normal de qualificação → agendamento

Endpoint público (sem autenticação): \`POST /api/site/captar-lead\`

Proteções:
- Rate limit: 3 submissões por IP por hora
- Honeypot para detecção de bots
- Consentimento LGPD obrigatório
- Dedup por número de WhatsApp (se já existe, sucesso silencioso)

---

## Landing Page (Página de Venda)

Site institucional do Dr. Lucas Felipe (\`/\`) com foco em contorno corporal.

### Seções

1. **Hero** — Foto profissional + CTA WhatsApp
2. **Sobre** — Biografia + diferenciais rápidos
3. **Procedimentos** — 5 cards (Lipo Fracionada, Mini Lipo, Hidrolipo, Lipo com Enxerto Glúteo, Preenchimento Glúteo)
4. **Diferenciais** — 4 cards numerados
5. **Formulário de Captação** — Nome, WhatsApp, procedimento + disparo automático da Ana Júlia
6. **CTA Final** — Foto + botão WhatsApp
7. **Footer** — Links, contato, disclaimer

### Configuração

Todos os dados editáveis (WhatsApp, CRM, Instagram, contato) ficam em:
\`app/(site)/components/site-config.ts\`

---

## Módulo 8 — Exportação de Dados

Exportação de relatórios em CSV, disponível no Dashboard (botão de download).

### Tipos de Exportação

| Tipo | Conteúdo |
|------|---------|
| **Leads** | ID, nome, WhatsApp, e-mail, origem, status no funil, procedimento, datas |
| **Agendamentos** | ID, lead, WhatsApp, procedimento, data/hora, duração, status |
| **Conversas** | ID, lead, total de mensagens, última atualização, encerramento |

### Como usar

1. No Dashboard, clique no ícone de download (canto superior direito)
2. Selecione o tipo de exportação desejado
3. O arquivo CSV será baixado automaticamente

### Permissões

| Perfil | Acesso |
|--------|--------|
| Gestor | Total — exporta todos os tipos |
| Atendente | Sem acesso |

---

## Módulo 9 — Configurações

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

#### Site (Landing Page)
- Dados de contato, WhatsApp, informações do médico e redes sociais exibidos na landing page
- Configuração: Configurações → Site → preencher campos → Salvar
- Campos: número WhatsApp, mensagem padrão, nome/CRM/especialidade do médico, telefone, endereço, cidade, Instagram
- A landing page usa os dados do banco; se não cadastrados, exibe dados de exemplo (fallback)

#### Automações CRON
- Follow-ups e confirmações executados a cada hora
- Botão "Forçar execução" para testar manualmente

### Permissões

| Perfil | Acesso |
|--------|--------|
| Gestor | Total — configura integrações, automações, site e tipos de procedimento |
| Atendente | Sem acesso (exceto leitura de tipos para formulários) |

> Sem Google Agenda configurado, agendamentos não sincronizam. Sem WhatsApp conectado, a Ana Júlia fica silenciosa.

---

## Módulo 10 — Usuários e Permissões

Gerenciamento de acesso e perfis dos usuários da plataforma.

### Perfis

| Perfil | Módulos com Acesso |
|--------|-------------------|
| **Gestor** | Dashboard (completo + resumo IA + export CSV), Atendimentos, Leads, Agendamentos, Procedimentos, Pacientes & Prontuário, Configurações, Documentação |
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

### Paciente
\`\`\`
id | nome | whatsapp | email | cpf (único) | dataNascimento | sexo
endereco | cidade | estado | contatoEmergencia | contatoEmergenciaTel
observacoes | consentimentoLgpd | leadOrigemId (único) | ativo | deletadoEm
\`\`\`

### Prontuario
\`\`\`
id | pacienteId (único) | numero (sequencial)
→ anamnese (1:1) | evolucoes (1:N) | documentos (1:N) | fotos (1:N)
\`\`\`

### Anamnese
\`\`\`
id | prontuarioId (único) | queixaPrincipal | historicoMedico
cirurgiasAnteriores | alergias | medicamentosEmUso | doencasPreExistentes
tabagismo | etilismo | atividadeFisica | gestacoes | anticoncepcional
pesoKg | alturaCm | imc (auto) | pressaoArterial | observacoes
\`\`\`

### Evolucao
\`\`\`
id | prontuarioId | tipo (TipoEvolucao) | dataRegistro | titulo
conteudo | prescricao | orientacoes | procedimentoId | deletadoEm
\`\`\`

### Usuario
\`\`\`
id | nome | email (único) | senha (bcrypt) | perfil (gestor/atendente)
tipo (humano/ia) | ativo | criadoEm | atualizadoEm | deletadoEm
\`\`\`

### Procedimento
\`\`\`
id | nome | tipo | descricao | valorBase (BRL) | duracaoMin
posOperatorio | ativo | criadoEm | atualizadoEm | deletadoEm
\`\`\`

### TipoProcedimento
\`\`\`
id | nome (único) | ativo | criadoEm
\`\`\`

### FotoLead
\`\`\`
id | leadId | url | descricao | tipoAnalise | ciclo | criadoEm
\`\`\`

### DocumentoProntuario
\`\`\`
id | prontuarioId | tipo (exame/laudo/termo/receita/atestado/outro)
nome | descricao | storagePath | tamanhoBytes | mimeType | criadoEm
\`\`\`

### FotoProntuario
\`\`\`
id | prontuarioId | url | descricao | tipoFoto (pre/pos-operatorio)
dataRegistro | criadoEm
\`\`\`

### SinalVital
\`\`\`
id | prontuarioId | tipo (pressao/FC/temp/saturacao/glicemia)
valor | unidade | dataRegistro | observacao | criadoEm
\`\`\`

### RegistroCirurgico
\`\`\`
id | evolucaoId (único) | tipoAnestesia | anestesista | tempoCircurgicoMinutos
sangramento | complicacoes | tecnicaUtilizada | materiaisUtilizados
orientacoesPosOp | marcosRecuperacao (JSON) | criadoEm | atualizadoEm
\`\`\`

### AgendamentoPaciente
\`\`\`
id | pacienteId | procedimentoId | dataHora | status
tipo | observacao | criadoEm | atualizadoEm
\`\`\`

### ConfigGoogleCalendar
\`\`\`
id | clientId | clientSecret | refreshToken | calendarId | ativo
\`\`\`

### ConfigWhatsapp
\`\`\`
id | uazapiUrl | adminToken | instanceId | instanceToken
numeroWhatsapp | webhookUrl | ativo
\`\`\`

### ConfigSite
\`\`\`
id | whatsappNumero | whatsappMensagem | medicoNome | medicoEspecialidade
medicoCrm | instagramUrl | contatoTelefone | contatoEndereco | contatoCidade
ativo | criadoEm | atualizadoEm
\`\`\`

### AuditLog
\`\`\`
id | usuarioId | acao | entidade | entidadeId
dadosAntes (JSON) | dadosDepois (JSON) | ip | criadoEm
\`\`\`

> **Sprint** e **SprintItem** são models internos de roadmap usados apenas na administração do sistema.

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

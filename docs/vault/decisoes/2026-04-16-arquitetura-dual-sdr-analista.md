---
title: Arquitetura dual SDR + Analista IA (Ana Julia + Analista)
date: 2026-04-16
tags:
  - arquitetura
  - agente-ia
  - decisao
status: implementado
linear: JLAU-571
relacionadas:
  - JLAU-567
  - JLAU-570
  - JLAU-573
---

# Arquitetura dual SDR + Analista IA

## Decisao

O agente IA do WhatsApp foi dividido em **duas IAs independentes** rodando em paralelo no mesmo pipeline:

1. **Ana Julia (SDR)** — GPT-4o. Conversa com o paciente. Nao faz data entry.
2. **Analista IA** — GPT-4o-mini. Le a conversa no final de cada ciclo e escreve no CRM.

A decisao substitui o modelo anterior em que a propria Ana Julia era responsavel por chamar ferramentas de escrita (`salvar_qualificacao`) durante a conversa.

## Motivacao

### Problema do modelo single-agent

A Ana Julia operando como SDR **e** operadora de CRM ao mesmo tempo produzia tres classes de falha:

- **Alucinacao de IDs** — quando tinha que preencher `leadId` ou `conversaId` em tool calls sem ver o valor no contexto, inventava strings plausiveis (`lead_abc123`). Corrigido parcialmente com injecao no backend (ver [[feedback_gpt_inventa_ids_em_tool_calls]]), mas evidenciou fragilidade estrutural.
- **Conflito de objetivos no prompt** — prompt tinha que cobrir simultaneamente persona (tom de SDR empatica), estrategia (acolhimento → qualificacao → agendamento), regras de negocio (quando avancar etapa, o que qualifica comercialmente) e formato estruturado (campos obrigatorios do CRM). Qualquer ajuste em uma area degradava outra.
- **Latencia percebida pelo paciente** — tool call de data entry interrompia o fluxo de resposta. Paciente esperava 2-3 segundos a mais por mensagem.

### O que a separacao resolve

- Ana Julia fica **puramente conversacional**. Prompt focado em persona, tom e estrategia. Sem pressao de preencher campos.
- Analista IA roda em **GPT-4o-mini** (mais barato, menor latencia), focada em extracao estruturada com `response_format: json_object`.
- Analista roda em **fire-and-forget** ao final do ciclo da Ana Julia — nao afeta tempo de resposta ao paciente.
- Roll-out via **feature flag** (`ANALISTA_WRITE_MODE`) permitiu validar qualidade da extracao em shadow mode antes de escrever no banco.

## Como funciona

### Fluxo de uma mensagem do paciente

```
1. Webhook Uazapi recebe msg
2. Buffer Redis (debounce 20s) acumula mensagens rapidas
3. Processamento de midia (Whisper pra audio, GPT-4o-mini pra imagem)
4. Ana Julia (GPT-4o) responde — loop com tools de LEITURA (consultar paciente, consultar procedimentos, listar/enviar midias, registrar agendamento humano)
5. Segmentacao + envio via Uazapi com digitando entre mensagens
6. Fire-and-forget: analisarConversa(leadId, conversaId) e disparada
   ↓
7. Analista IA (GPT-4o-mini) le historico + estado atual do lead
8. Extrai JSON estruturado com campos propostos
9. Calcula divergencias entre estado atual e proposto
10. Se ANALISTA_WRITE_MODE=true e ha divergencias:
    - Aplica em leads (nome, procedimento, sobreOPaciente com APPEND)
    - Avanca statusFunil se TRANSICOES_PERMITIDAS autoriza
    - Reatribui responsavel via obterNovoResponsavelPorStatus
11. Grava log em analista_logs (sempre, mesmo em shadow mode)
```

Codigo relevante:
- Disparo: [lib/agente/loop.ts:349-355](../../../lib/agente/loop.ts#L349-L355)
- Chamada Analista: [lib/agente/analista.ts:167-236](../../../lib/agente/analista.ts#L167-L236)
- Escrita no CRM: [lib/agente/analista-aplicar.ts](../../../lib/agente/analista-aplicar.ts)
- Prompt da Analista: [lib/agente/analista-prompt.ts](../../../lib/agente/analista-prompt.ts)

### Ferramentas da Ana Julia (somente LEITURA + acoes operacionais)

| Tool | O que faz | Lado |
|------|-----------|------|
| `consultar_paciente` | Busca dados do lead atual | leitura |
| `consultar_procedimentos` | Lista procedimentos da base | leitura |
| `listar_midias` | Lista midias de marketing disponiveis | leitura |
| `enviar_midia` | Envia foto/video ao paciente via Uazapi | acao operacional |
| `registrar_agendamento` | Registra preferencia de dia/hora (verificacao_humana) | acao operacional |
| `atualizar_agendamento` | Atualiza agendamento existente | acao operacional |
| `registrar_mensagem` | Persiste mensagem no banco | acao operacional |

Removida na Fase 3: `salvar_qualificacao` (JLAU-571 Fase 3, commit do sprint 2026-04-17).

### Campos que a Analista escreve

- `leads.nome` — so se o atual for generico (`WhatsApp 55...`) ou vazio. Nunca sobrescreve nome real.
- `leads.procedimentoInteresse` — sobrescreve se diferente.
- `leads.sobreOPaciente` — **sempre APPEND** (separador `\n---\n`). Nunca sobrescreve.
- `leads.statusFunil` — so avanca respeitando `TRANSICOES_PERMITIDAS` (acolhimento→qualificacao→pre_agendamento→verificacao_humana). Nunca regride.
- `leads.responsavelId` — reatribui via `obterNovoResponsavelPorStatus` quando etapa muda.
- `conversas.etapa` — espelho do statusFunil para a listagem de conversas.

**Nao escreve**: `consulta_agendada` em diante (decisao humana), `perdido` (manual).

## Flag `ANALISTA_WRITE_MODE`

Variavel de ambiente (Vercel) que controla o comportamento:

| Valor | Comportamento |
|-------|---------------|
| ausente/vazia/qualquer_coisa | **Shadow mode** — Analista roda, grava em `analista_logs`, nao escreve no CRM |
| `true` | **Write mode** — Analista aplica mudancas no CRM e marca `aplicado=true` no log |

Lida por `analistaWriteModeAtivo()` em [lib/agente/analista-aplicar.ts:123-125](../../../lib/agente/analista-aplicar.ts#L123-L125). Tem `.trim()` defensivo — `vercel env add` via `echo` grava newline no final (ver [[feedback_vercel_env_newline]] quando existir).

## Roll-out em 3 fases

### Fase 1 — Shadow mode (implementada 2026-04-16, em prod 2026-04-17)

- Analista IA disparada a cada ciclo
- Grava tudo em `analista_logs`
- **Nao escreve** no CRM
- Ana Julia continua operando como antes (com `salvar_qualificacao`)
- Tela `/analista-logs` permite comparar o que a Analista "teria feito" com o que a Ana Julia fez de fato
- Objetivo: validar qualidade da extracao e divergencias antes de confiar

### Fase 2 — Write mode (implementada e em prod 2026-04-17)

- `ANALISTA_WRITE_MODE=true` em producao
- Analista comeca a escrever no CRM quando ha divergencia
- Ana Julia continua tendo `salvar_qualificacao` como fallback (dupla escrita aceita — idempotencia garante que nao cria duplicatas)
- Monitoramento via `/analista-logs` com `aplicado=true`

### Fase 3 — Cleanup (implementada 2026-04-17)

- Removida tool `salvar_qualificacao` da Ana Julia
- Prompt da Ana Julia reescrito com regra explicita: "VOCE NAO FAZ DATA ENTRY"
- Endpoint `/api/agente/salvar-qualificacao` deletado
- `TRANSICOES_PERMITIDAS` migrou integralmente para `analista-aplicar.ts`
- Numero de endpoints da agente: 8 → 7

## Consequencias e trade-offs

### Ganhos

- Prompt da Ana Julia ficou ~40% menor e focado (persona + estrategia + escalacao)
- Latencia da Ana Julia caiu (sem tool calls de escrita no caminho quente)
- Analista independente facilita melhorar qualidade de extracao sem mexer na Ana Julia
- Score comercial 0-100 (ver [[2026-04-17-criterios-comerciais-qualificacao]] quando existir) so foi viavel com IA dedicada
- Rollback rapido: desligar `ANALISTA_WRITE_MODE=true` volta ao shadow mode sem deploy

### Custos

- **Custo OpenAI** — cada ciclo roda duas inferencias (Ana Julia GPT-4o + Analista GPT-4o-mini). Mini e ~10x mais barato, entao overhead e pequeno mas real.
- **Complexidade conceitual** — novo dev precisa entender que sao duas IAs. Mitigado com esta nota + modulo proprio na doc do sistema (ver [JLAU-573 escopo ainda pendente](../../../lib/documentacao/conteudo.ts)).
- **Janela de race condition teorica** — se Ana Julia dispara dois ciclos em rajada rapida, duas Analistas rodam em paralelo para o mesmo lead. Idempotencia de escrita mitiga (so escreve se diferente), mas `sobreOPaciente` pode duplicar texto. Monitorar em producao.
- **Logs dobram** — cada ciclo gera 1 linha em `analista_logs` alem dos logs de mensagens. Esperado ~1 linha por minuto em pico.

### Limitacoes conhecidas

- Analista nao gerencia etapas pos-agendamento (`consulta_agendada` em diante). Atendente humano controla.
- Analista nao marca lead como `perdido` — decisao humana.
- Regressao de etapa nunca acontece automaticamente. Humano decide.

## Alternativas descartadas

### Single agent GPT-4o com tools de escrita (modelo anterior)

Descartado por:
- Alucinacao de IDs em tool calls
- Prompt sobrecarregado conflitando objetivos
- Latencia percebida pelo paciente
- Dificuldade de ajustar regras de qualificacao sem quebrar conversa

### Single agent GPT-4o-mini

Descartado por:
- Mini perde qualidade significativa em conversas empaticas multiturno
- Paciente percebe tom robotico, baixa a taxa de conversao

### Analista como cron batch (nao fire-and-forget)

Descartado por:
- Latencia de minutos ate Analista ver uma conversa nova
- Kanban do gestor desatualizado por alguns minutos
- Fire-and-forget ao final do ciclo tem custo desprezivel e latencia de segundos

## Quando revisitar

Revisitar esta decisao se:

- Custo da Analista passar de 15% do custo total do agente (hoje ~5%)
- Qualidade da extracao cair abaixo de 85% de acerto em auditorias semanais
- OpenAI lancar modelo com custo/qualidade que mude a matematica (ex: GPT-4o-nano com qualidade de mini)
- Volume passar 50 conversas simultaneas — race conditions podem deixar de ser teoricas

## Referencias

- Issue principal: JLAU-571 (Analista IA em 3 fases)
- Issue que documenta: JLAU-573 (esta nota + modulo no painel de doc)
- Criterios comerciais: JLAU-567
- Envio de midia: JLAU-570
- Codigo:
  - [lib/agente/analista.ts](../../../lib/agente/analista.ts)
  - [lib/agente/analista-aplicar.ts](../../../lib/agente/analista-aplicar.ts)
  - [lib/agente/analista-prompt.ts](../../../lib/agente/analista-prompt.ts)
  - [lib/agente/analista-types.ts](../../../lib/agente/analista-types.ts)
  - [supabase/migrations/20260416210000_create_analista_logs.sql](../../../supabase/migrations/20260416210000_create_analista_logs.sql)
- Painel:
  - Rota: `/analista-logs` (Clinica → Analista IA)
  - Componente: `components/features/analista/`

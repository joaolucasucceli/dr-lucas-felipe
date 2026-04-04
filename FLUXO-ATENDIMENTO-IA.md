# Fluxo de Atendimento — Agente IA (Ana Júlia)

## Visão Geral

O agente IA "Ana Júlia" atende pacientes via WhatsApp de forma autônoma, qualificando leads e agendando consultas. O fluxo é controlado por um funil de 9 etapas, ferramentas de ação e um classificador automático de etapa.

---

## Fluxo Completo — Passo a Passo

### 1. Mensagem chega no WhatsApp

```
Paciente → WhatsApp → Uazapi → POST /api/webhooks/whatsapp
```

- Webhook recebe payload do UazapiGO v2
- Cria ou reativa lead (com nome do contato WhatsApp)
- Cria ou reutiliza conversa
- Salva mensagem na tabela `mensagens_whatsapp`
- Adiciona ao buffer Redis
- Chama `POST /api/agente/processar` imediatamente

### 2. Processamento do Agente (`lib/agente/loop.ts`)

```
processar → obterBuffer → consultarPaciente → verificações → GPT-4o → ferramentas → resposta → enviar
```

**Passo a passo:**

1. **Obter buffer** — Lê e limpa mensagens acumuladas no Redis
2. **Obter config WhatsApp** — Busca token e URL do Uazapi no banco
3. **Consultar paciente** — Chama ferramenta `consultar_paciente` para obter contexto do lead
4. **Verificações de silêncio:**
   - Se status é `consulta_realizada`, `sinal_pago` ou `procedimento_agendado` → IA fica em silêncio (humano conduz)
   - Se status é `concluido`, `perdido` ou `arquivado` → Abre novo ciclo de atendimento
   - Se `modoConversa === "humano"` → IA não responde (atendente assumiu)
5. **Enviar "digitando..."** — Indicador visual no WhatsApp
6. **Obter memória** — Últimas 20 mensagens do Redis (chave `{chatId}_mem_dr-lucas`, TTL 48h)
7. **Montar prompt** — System prompt + memória + mensagem atual
8. **Chamar GPT-4o** — Com function calling (até 10 iterações de ferramentas)
9. **Segmentar resposta** — Quebra em mensagens curtas (max 500 chars)
10. **Enviar via Uazapi** — `POST /send/text` com delay aleatório de 3-5s entre mensagens
11. **Registrar no banco** — Salva cada segmento na tabela `mensagens_whatsapp`
12. **Salvar memória** — Adiciona user + assistant ao Redis
13. **Classificar etapa** — Classificador automático avança o funil se necessário

---

## Ferramentas Disponíveis (6 ferramentas)

### `consultar_paciente`
- **Quando:** SEMPRE no início de cada conversa (chamado automaticamente pelo loop)
- **O que faz:** Busca lead pelo WhatsApp, retorna nome, status funil, procedimento de interesse, informações coletadas
- **Endpoint:** `POST /api/agente/consultar-paciente`
- **Se lead não existe:** Cria novo lead com nome do contato WhatsApp

### `consultar_procedimentos`
- **Quando:** Paciente pergunta sobre procedimentos da clínica
- **O que faz:** Lista procedimentos cadastrados com descrição (SEM valores/preços)
- **Endpoint:** `POST /api/agente/consultar-procedimentos`
- **Regra:** OBRIGATÓRIO usar antes de falar sobre procedimentos. Nunca inventar.

### `salvar_qualificacao`
- **Quando:** Coletou informações suficientes (nome, interesse, dados relevantes)
- **O que faz:** Append em `sobreOPaciente` (nunca sobrescreve), atualiza `procedimentoInteresse`
- **Endpoint:** `POST /api/agente/salvar-qualificacao`
- **Parâmetros:** `leadId`, `conversaId`, `sobreOPaciente`, `procedimentoInteresse` (opcional)

### `registrar_mensagem`
- **Quando:** Registrar mensagens importantes no banco
- **O que faz:** Cria registro em `mensagens_whatsapp`
- **Endpoint:** `POST /api/agente/registrar-mensagem`

### `registrar_agendamento`
- **Quando:** Paciente confirma data/horário para consulta
- **O que faz:** Cria agendamento na tabela `agendamentos`
- **Endpoint:** `POST /api/agente/registrar-agendamento`
- **Nota:** Google Calendar sync ainda não implementado (TODO)

### `atualizar_agendamento`
- **Quando:** Paciente quer remarcar ou cancelar
- **O que faz:** Atualiza status ou data do agendamento
- **Endpoint:** `POST /api/agente/atualizar-agendamento`
- **Ações:** `remarcar` (com nova data) ou `cancelar`

---

## Funil de Atendimento — 9 Etapas

### Etapas automáticas (IA conduz)

| Etapa | Status | Ação da IA |
|-------|--------|------------|
| 1 | `primeiro_atendimento` | Se apresentar, perguntar nome, entender interesse |
| 2 | `qualificacao` | Coletar informações detalhadas, usar `salvar_qualificacao` |
| 3 | `agendamento` | Oferecer horários, usar `registrar_agendamento` |
| 4 | `consulta_agendada` | Responder dúvidas, gerenciar remarcação/cancelamento |

### Etapas manuais (humano conduz — IA em silêncio)

| Etapa | Status | Responsável |
|-------|--------|-------------|
| 5 | `consulta_realizada` | Gestor/Atendente |
| 6 | `sinal_pago` | Gestor/Atendente |
| 7 | `procedimento_agendado` | Gestor/Atendente |
| 8 | `concluido` | Gestor/Atendente |
| 9 | `perdido` | Gestor/Atendente |

### Paciente de retorno

Quando o status é `concluido`, `perdido` ou `arquivado` e o paciente manda mensagem novamente:
- IA abre um **novo ciclo** (incrementa `cicloAtual`)
- Reconhece o paciente: "Que bom ter você de volta!"
- Pula qualificação básica (nome já conhecido)
- Vai direto para entender novo interesse

---

## Caminhos Possíveis no Atendimento

### Caminho feliz (novo paciente)
```
Mensagem → primeiro_atendimento → qualificacao → agendamento → consulta_agendada
    ↓              ↓                    ↓               ↓
 IA se          IA coleta           IA agenda       IA gerencia
apresenta      nome, interesse     consulta     remarcação/dúvidas
```

### Caminho com informação imediata
```
Paciente já diz nome e interesse na primeira mensagem
→ IA salva qualificação direto
→ Pula para agendamento
```

### Paciente de retorno
```
Paciente com status concluido/perdido manda mensagem
→ IA abre novo ciclo
→ Reconhece paciente
→ Pergunta novo interesse
→ Segue para agendamento
```

### Atendente assume
```
Atendente clica "Assumir" no painel
→ modoConversa = "humano"
→ responsavelId = atendente
→ IA para de responder
→ Atendente conduz via painel de chat
```

### Devolver para IA
```
Atendente clica "Devolver p/ IA"
→ modoConversa = "ia"
→ responsavelId = Ana Júlia (IA)
→ IA volta a responder
```

### Lead do site (proativo)
```
Formulário do site → POST /api/site/captar-lead
→ Cria lead + conversa + mensagem sintética
→ IA inicia conversa proativamente
→ Menciona procedimento de interesse do formulário
```

---

## Classificador Automático de Etapa (`lib/agente/classificador-etapa.ts`)

Após cada resposta da IA, o classificador:

1. **Check determinístico:** Se existe agendamento com status `agendado` → avança para `consulta_agendada`
2. **Check por IA (GPT-4o-mini):** Analisa as últimas 15 mensagens e classifica em:
   - `primeiro_atendimento` — Apenas saudações
   - `qualificacao` — Paciente compartilhando informações
   - `agendamento` — Discutindo datas/horários
3. **Regra de não-regressão:** Só avança, nunca volta
4. **Limite:** Só opera nas etapas 1-4. A partir de `consulta_agendada`, humano conduz.

---

## Armazenamento

| Dado | Onde | TTL |
|------|------|-----|
| Memória da conversa (últimas 20 msgs) | Redis | 48h |
| Buffer de mensagens (debounce) | Redis | 60s |
| Mensagens permanentes | Supabase (tabela `mensagens_whatsapp`) | Permanente |
| Leads, conversas, agendamentos | Supabase (PostgreSQL) | Permanente |

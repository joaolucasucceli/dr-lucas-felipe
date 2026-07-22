# Central Dr. Lucas

## Como corrigir neste projeto (regra do João, 22/07/2026)

**Correção é na raiz. Não se tampa buraco aqui.** Antes de mudar qualquer linha, ache *por que* o comportamento errado existe e *quantos lugares* o produzem. Se o mesmo comportamento está codificado em dois lugares (script do prompt + código determinístico, por exemplo), a correção certa é criar UMA fonte de verdade e fazer os dois consumirem — não editar os dois e torcer.

Checklist antes de dizer que está resolvido:
- Mapeei todos os pontos que produzem o sintoma, não só o que apareceu no print/relato?
- A mudança elimina a classe do bug ou só a instância? Se a próxima mudança de fluxo recriar o problema, não está resolvido.
- Sobrou exemplo/copy antigo em prompt, descrição de tool ou anti-exemplo ensinando o comportamento removido? (Isso já causou regressão: o LLM re-aprende pelo exemplo.)
- Rodei `npx tsc --noEmit`, `npm run lint`, `npm run build` e uma simulação do fluxo real — não só o typecheck?
- Deixei código morto para trás?

Sistema da clínica do **Dr. Lucas Ferreira** (médico de estética avançada e contorno corporal — NÃO chamá-lo de "cirurgião plástico": ele é pós-graduando em cirurgia plástica, regra explícita do prompt). Cobre site público, dashboard da clínica (agenda, atendimentos, contatos, procedimentos, relatórios) e a **Ana Júlia**, agente único de IA que faz o pré-atendimento via WhatsApp: qualifica (procedimento + região + foto), gera orçamento em PDF e agenda a reunião de diagnóstico.

## Stack e comandos
- Next.js 16.1.7 (App Router) + React 19 + Supabase (`src/lib/supabase.ts`, admin client) + Redis (`src/lib/redis.ts`).
- IA via **OpenAI** (`src/lib/openai.ts`); WhatsApp via **Uazapi** (`src/lib/uazapi.ts`, webhook `src/app/api/webhooks/whatsapp/`); Google Calendar (`src/lib/google-calendar.ts`).
- `npm run dev` (turbopack) / `build` / `lint`. Deploy: Vercel.

## Crons (vercel.json)
- `/api/cron/follow-ups` — de hora em hora.
- `/api/cron/auto-close` — a cada 6 horas.

## Estrutura não-óbvia
- `src/lib/agente/` — o agente inteiro: `loop.ts` (orquestração), `ferramentas.ts` (tools), `prompt.ts` (script fixo da Ana Júlia), buffer, follow-up, handoff, slots de agenda, mídia de marketing.
- **`src/lib/agente/fluxo-qualificacao.ts` é a FONTE ÚNICA do que a Ana pergunta antes do orçamento.** `ETAPAS_QUALIFICACAO` declara as etapas (hoje: região → foto) com pergunta, detector de "já coletei", detector de "acabei de perguntar isso" e template do fato. `prompt.ts` injeta a sequência no system prompt via `descreverEtapasParaPrompt()`; `loop.ts` deriva os fast-paths determinísticos do mesmo array. **Para mudar o fluxo comercial, edite só esse array** — nunca reescreva a sequência à mão no prompt ou espalhe `if` por pergunta no loop. Antes de 22/07/2026 o fluxo estava duplicado nas duas camadas e ninguém conseguia encurtá-lo sem deixar resíduo (foi a causa raiz da "enrolação" reclamada pelo Dr. Lucas).
- `src/lib/contatos/whatsapp.ts` — **normalização BR de números** (nono dígito, prefixo 55, variantes) usada nas rotas de contatos, `consultar-paciente` e webhook. Sempre comparar números via `mesmoNumeroBR`/`gerarVariantesWhatsappBR`, nunca string crua.
- **Contrato de erro das tools:** quando uma tool falha (HTTP != 2xx), `src/lib/agente/ferramentas.ts` retorna o sinal canônico `{ ok: false, error, httpStatus }` para a IA não alucinar sucesso. Manter esse padrão em tools novas.
- **Silenciamento de pacientes:** o loop do agente (`src/lib/agente/loop.ts`) NÃO responde contatos com `tipo === "paciente"` — a Ana só atende leads; paciente convertido sai do atendimento automático (commit de 14/07/2026).
- **Fluxo comercial curto (decisão do Dr. Lucas, 22/07/2026):** do "oi" ao orçamento são apenas região + foto. As perguntas de tempo de incômodo, histórico de procedimento/saúde e principal incômodo foram REMOVIDAS — o Dr. Lucas levanta isso na reunião de diagnóstico. A foto é apresentada como o atalho para o valor ("normalmente eu consigo te passar o valor com uma foto"), não como mais uma etapa, e ela própria é o aceite: não se pede permissão para mandar o caso. A bifurcação "estimativa OU perguntas rápidas" após o nome também saiu; estimativa por faixa sobrou só como fallback de quem recusa a foto.
- **Fluxo de orçamento (blueprint decidido com o João em 19/06/2026):** Caminho A (orçamento real) — qualificação completa → Ana envia o caso ao Dr. Lucas → ele responde `<número> - <valor>` no WhatsApp da clínica → Ana identifica a cliente pela fila `eventos_orcamento_pendente`, gera PDF com a identidade visual dele e, se aprovado, agenda a reunião de diagnóstico. Caminho B (só quer preço) — Ana manda a faixa do cadastro do procedimento (`faixaFormatada`), sem PDF e sem Dr. Lucas. (Blueprint completo estava em `docs/fluxo-orcamento.md`, removido em 14/07/2026 — histórico Git se necessário.)

## Pegadinhas
- Este arquivo + `README.md` são a referência (a pasta `docs/` foi removida em 14/07/2026 — histórico Git se necessário). Os antigos `agents.md`/`CLAUDE.md` foram removidos do repo em 14/07/2026 (commit 3e483a0); não recriar via commit sem alinhamento.
- **FK/Supabase REST:** Postgres guarda nomes de constraint não-quotados em lowercase — hints de JOIN tipo `usuarios!contatos_responsavelId_fkey(...)` fazem match literal e quebram (42P01) se a migration não pôs o nome entre aspas duplas. Conferir o nome real da constraint no banco antes de usar hint camelCase.
- **Google Calendar OAuth:** o redirect da integração de Agenda é `/api/configuracoes/google-agenda/callback` em `dr-lucas-central.vercel.app` (NÃO a rota do NextAuth `/api/auth/callback/google`, nem o domínio `central.drlucasfelipe.com.br`); a URL está hardcoded em `src/app/api/configuracoes/google-agenda/auth-url/route.ts` e precisa bater com o Google Cloud Console (projeto `central-dr-lucas`).
- **Histórico de arquitetura:** o agente já foi dual (Ana Júlia SDR + Analista IA de data entry, decisão de 16/04/2026) para evitar alucinação de IDs e conflito de objetivos no prompt; em 19/06/2026 consolidou-se em agente único (Ana Júlia). Não reintroduzir o modelo dual sem decisão do João.
- **UI:** toda criação/edição abre modal via `src/components/features/shared/FormDialog.tsx`; única exceção é Contato, que tem página própria com autosave.
- Só existe UM tipo de evento agendável pela IA: a reunião de diagnóstico/avaliação online. Consulta presencial, procedimento, retorno e pós-op estão fora do escopo do agente.
- Instagram correto do Dr. Lucas: `dr.lucasferreiraa` (corrigido no site e no prompt em 14/07/2026).
- A resposta de orçamento do Dr. Lucas chega pelo MESMO número da clínica; o webhook identifica a origem por `DR_LUCAS_WHATSAPP_PESSOAL` e faz o parse `<número> - <valor>`.

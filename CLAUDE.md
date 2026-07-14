# Central Dr. Lucas

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
- `src/lib/contatos/whatsapp.ts` — **normalização BR de números** (nono dígito, prefixo 55, variantes) usada nas rotas de contatos, `consultar-paciente` e webhook. Sempre comparar números via `mesmoNumeroBR`/`gerarVariantesWhatsappBR`, nunca string crua.
- **Contrato de erro das tools:** quando uma tool falha (HTTP != 2xx), `src/lib/agente/ferramentas.ts` retorna o sinal canônico `{ ok: false, error, httpStatus }` para a IA não alucinar sucesso. Manter esse padrão em tools novas.
- **Silenciamento de pacientes:** o loop do agente (`src/lib/agente/loop.ts`) NÃO responde contatos com `tipo === "paciente"` — a Ana só atende leads; paciente convertido sai do atendimento automático (commit de 14/07/2026).
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

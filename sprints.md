# Sprints — Central Dr. Lucas

> Cada sprint segue o ciclo completo: auditoria → back-end → front-end → `npm run build` → Playwright → commit → deploy Vercel → smoke test em produção.

---

## Sprint 11 — Testes E2E Completos com Playwright

**Objetivo:** Garantir que todos os 23 arquivos `.spec.ts` existentes passem com 0 falhas, cobrindo todos os fluxos do painel sem o agente IA.

**Contexto:** Os testes já foram escritos em sprints anteriores como parte das specs. Esta sprint executa o ciclo completo: rodar → identificar falhas → corrigir implementação ou teste → rodar novamente até 0 falhas.

---

### Bloco 1 — Autenticação e Controle de Acesso

- [x] Rodar `npx playwright test tests/smoke.spec.ts tests/auth.spec.ts tests/sprint1-acesso.spec.ts`
- [x] Corrigir todas as falhas encontradas
- [x] Garantir: login com credenciais inválidas retorna erro, logout redireciona para `/login`, atendente não acessa `/procedimentos`

### Bloco 2 — Dashboard e Leads

- [x] Rodar `npx playwright test tests/dashboard.spec.ts tests/sprint3-dashboard.spec.ts tests/leads.spec.ts`
- [x] Corrigir todas as falhas encontradas
- [x] Garantir: MetricCards carregam, filtro `?filtro=alerta` aplica automaticamente, CRUD de leads funciona, tabs da ficha (Dados, Histórico, Fotos, Agendamentos) carregam

### Bloco 3 — Atendimentos, Agendamentos e Procedimentos

- [ ] Rodar `npx playwright test tests/atendimentos.spec.ts tests/sprint4-kanban.spec.ts tests/agendamentos.spec.ts tests/sprint5-agendamentos.spec.ts tests/procedimentos.spec.ts tests/sprint6-tipos-procedimento.spec.ts`
- [ ] Corrigir todas as falhas encontradas
- [ ] Garantir: 9 colunas do kanban visíveis, CRUD de agendamentos, banner quando Google não configurado, CRUD de procedimentos com tipos dinâmicos

### Bloco 4 — Configurações e Usuários

- [ ] Rodar `npx playwright test tests/configuracoes.spec.ts tests/whatsapp-config.spec.ts tests/usuarios.spec.ts`
- [ ] Corrigir todas as falhas encontradas
- [ ] Garantir: step indicators no WhatsApp config, countdown do QR, badges numerados no Google Agenda, CRUD de usuários, badge "Você" no usuário atual

### Bloco 5 — Relatórios, UX e Features Avançadas

- [ ] Rodar `npx playwright test tests/relatorios.spec.ts tests/ux-mobile.spec.ts tests/theme-toggle.spec.ts tests/busca-notificacoes.spec.ts tests/lgpd.spec.ts tests/cron-followups.spec.ts`
- [ ] Corrigir todas as falhas encontradas
- [ ] Garantir: busca global (Ctrl+K) funciona, painel de notificações abre, página `/lgpd` acessível sem auth, seção LGPD na ficha do lead, card Automações com "Forçar execução"

### Bloco 6 — Suite Completa

- [ ] Rodar `npx playwright test` (todos os testes exceto `agente-ferramentas.spec.ts`)
- [ ] 0 falhas
- [ ] `npm run build` sem erros
- [ ] Commit e deploy Vercel
- [ ] Smoke test em produção: login → dashboard → kanban → novo lead → agendamento → logout

---

**Arquivos de teste (23 specs):**
- `tests/smoke.spec.ts`
- `tests/auth.spec.ts`
- `tests/sprint1-acesso.spec.ts`
- `tests/dashboard.spec.ts`
- `tests/sprint3-dashboard.spec.ts`
- `tests/leads.spec.ts`
- `tests/atendimentos.spec.ts`
- `tests/sprint4-kanban.spec.ts`
- `tests/agendamentos.spec.ts`
- `tests/sprint5-agendamentos.spec.ts`
- `tests/procedimentos.spec.ts`
- `tests/sprint6-tipos-procedimento.spec.ts`
- `tests/configuracoes.spec.ts`
- `tests/whatsapp-config.spec.ts`
- `tests/usuarios.spec.ts`
- `tests/relatorios.spec.ts`
- `tests/ux-mobile.spec.ts`
- `tests/theme-toggle.spec.ts`
- `tests/busca-notificacoes.spec.ts`
- `tests/lgpd.spec.ts`
- `tests/cron-followups.spec.ts`
- `tests/agente-ferramentas.spec.ts` _(excluído desta sprint — cobre o agente IA)_
- `tests/helpers/db.ts` _(utilitário)_

---

## Histórico de Sprints Concluídas

| Sprint | Status |
|--------|--------|
| Sprint 1 — Controle de Acesso | ✅ Concluída |
| Sprint 2 — Header: Meu Perfil | ✅ Concluída |
| Sprint 3 — Dashboard: Alertas | ✅ Concluída |
| Sprint 4 — Kanban: Layout | ✅ Concluída |
| Sprint 5 — Agendamentos: Google | ✅ Concluída |
| Sprint 6 — Tipos de Procedimento | ✅ Concluída |
| Sprint 7 — Ícones | ✅ Concluída |
| Sprint 8 — Tooltips e Contexto | ✅ Concluída |
| Sprint 9 — Feedback e Confirmações | ✅ Concluída |
| Sprint 10 — Navegação e Persistência | ✅ Concluída |

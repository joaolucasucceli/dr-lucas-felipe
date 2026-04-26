---
title: Padrão de UI — modal pra todas as edições, página própria só pra Contato
date: 2026-04-26
tags: [ui, padrao, modal, formdialog, decisao, refatoracao]
---

# Padrão — modal pra tudo, página só pra Contato

## A regra

Toda criação/edição de entidade no painel deve abrir **modal** usando o componente reutilizável [components/features/shared/FormDialog.tsx](../../../components/features/shared/FormDialog.tsx). **Única exceção:** o **Contato** (lead/paciente) tem página própria em [/contatos/[id]](../../../app/(dashboard)/contatos/%5Bid%5D/page.tsx) com autosave inline via [CampoEditavel](../../../components/features/contatos/CampoEditavel.tsx).

## Por que essa regra existe

Antes da consolidação (issues JLAU-984 → JLAU-989), o sistema tinha fluxo inconsistente:

- "Editar Procedimento" navegava pra `/procedimentos/[id]` (página própria criada em JLAU-984)
- Base de Conhecimento, Mídia Marketing, Usuário, Tipos de Procedimento abriam modal
- Esse mix quebrava previsibilidade — o usuário não sabia se a edição abriria página ou modal antes de clicar

A decisão de **modal exceto Contato** veio porque:

1. **Contato é a entidade central** — tem muitos campos, fotos, anamnese, histórico de WhatsApp e atendimentos. Comporta UI rica de página
2. **Demais entidades têm 1-7 campos** — modal é suficiente e mantém o usuário no contexto da listagem
3. **Padrão único reduz carga cognitiva** — clique em "Editar" sempre faz a mesma coisa

## Larguras do FormDialog

| Largura | Tailwind | Quando usar |
|---|---|---|
| `sm` | sm:max-w-md | Forms minimalistas (1-2 inputs). Ex: TipoProcedimento (só nome) |
| `md` | sm:max-w-lg | Default. Forms normais sem textarea longa. Ex: UsuarioForm |
| `lg` | sm:max-w-2xl | Forms com textarea longa. Ex: ProcedimentoForm, BaseConhecimentoForm |
| `xl` | sm:max-w-4xl | Forms muito densos (raro). Não tem nenhum hoje. |

Usar a largura mínima que comporta o conteúdo — modal apertado força UI ruim, modal exagerado quebra a experiência.

## A exceção da exceção: NovoAtendimentoModal

[components/features/kanban/NovoAtendimentoModal.tsx](../../../components/features/kanban/NovoAtendimentoModal.tsx) **NÃO usa FormDialog** mesmo sendo modal. Por quê?

Não é form de criar/editar entidade — é um **picker**: o usuário busca um contato existente (debounced), seleciona, e confirma "iniciar novo ciclo de atendimento". O fluxo é "buscar → selecionar → confirmar", não "preencher campos → submeter".

`FormDialog` foi construído pra forms com `<form onSubmit>` controlado por `react-hook-form`. Forçar a abstração aqui obrigaria gambiarra (fake form, hidden submit). O `Dialog` raw expressa melhor a intenção do componente.

**Critério prático:** se o conteúdo do modal é um **formulário** (inputs com validação, react-hook-form, onSubmit) → `FormDialog`. Se é **outra coisa** (picker, preview, wizard de múltiplas etapas, listagem com confirmação) → `Dialog` raw é aceitável.

## Estado em 2026-04-26

Padrão consolidado em **100% dos forms de entidade** após JLAU-989:

- ProcedimentoForm — `lg`
- BaseConhecimentoForm — `lg`
- MidiaMarketingForm — `md`
- UsuarioForm — `sm`
- AgendamentoForm — `lg`
- TiposProcedimento (inline) — `sm`

Única página de edição própria: `/contatos/[id]`. Pasta `/procedimentos/[id]/` foi deletada em JLAU-986.

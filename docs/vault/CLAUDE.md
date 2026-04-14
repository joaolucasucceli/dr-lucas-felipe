---
title: "Vault — Dr. Lucas Felipe"
date: 2026-04-14
tags: [vault, dr-lucas-felipe]
---

# Vault — Dr. Lucas Felipe

## O que e este vault

Base de conhecimento compartilhada do projeto **Dr. Lucas Felipe**. Versionado no Git para que toda a equipe tenha acesso.

Sistema de gestao de clinica + agente IA WhatsApp (Ana Julia). Stack: Next.js 16, Prisma 7, PostgreSQL, NextAuth.js, OpenAI GPT-4o, Uazapi, Google Calendar API.

## Estrutura

- `decisoes/` — Decisoes tecnicas e de produto com justificativas
- `aprendizados/` — Licoes aprendidas, erros evitados, descobertas
- `processos/` — Protocolos e fluxos de trabalho do projeto
- `reunioes/` — Atas e notas de reunioes com o cliente
- `pessoas/` — Contatos relevantes ao projeto
- `referencias/` — Material de apoio externo

## Frontmatter padrao

Todo arquivo .md deve ter:

```yaml
---
title: "Titulo descritivo"
date: YYYY-MM-DD
tags: [categoria, topico]
---
```

## Regras

- Usar wikilinks `[[nome-do-arquivo]]` para conectar notas
- Nomes de arquivo em kebab-case (ex: `decisao-migrar-para-supabase.md`)
- Datas absolutas, nunca relativas
- Conteudo em portugues brasileiro
- Codigo pode usar ingles para termos tecnicos

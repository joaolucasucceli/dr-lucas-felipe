---
title: Vercel multi-conta no gh CLI + alias de producao
date: 2026-04-15
tags: [aprendizado, vercel, github, deploy]
---

# Vercel multi-conta no gh CLI + alias de producao

## Problema 1 — Push para repo privado falhando

Tinha 3 contas logadas no `gh CLI` (`lynedesktech`, `joaolucasucceli`, `npi-imoveis`). A ativa era `lynedesktech`, que nao tem acesso ao repo privado `joaolucasucceli/dr-lucas-felipe`. Resultado: `git push` retornava `repository not found` enganosamente.

### Solucao

```bash
gh auth status                        # listar todas as contas
gh auth switch --user joaolucasucceli  # mudar a ativa
git push origin master                # agora funciona
```

## Problema 2 — Dominio errado em codigo hardcoded

Tinha referencias a `https://drlucasfelipe.vercel.app` em 3 arquivos (Google OAuth callbacks). Esse dominio NAO aponta para o projeto atual — o projeto fica em `dr-lucas-central.vercel.app` (alias do team `luna-analisa`). Isso quebrava o OAuth do Google Calendar silenciosamente.

### Como descobri

```bash
vercel whoami
vercel teams ls          # listar teams
vercel switch luna-analisa
vercel ls --all          # ver projetos do team
vercel inspect dr-lucas-central.vercel.app  # ver aliases reais
```

Saida: aliases reais sao `dr-lucas-central.vercel.app` (production), `dr-lucas-felipe-luna-analisa.vercel.app`, `dr-lucas-felipe-git-master-luna-analisa.vercel.app`.

### Padrao a aplicar

URLs hardcoded em codigo sao smell. Preferir `process.env.NEXTAUTH_URL` ou similar. Se hardcoded for inevitavel (callback URL deve ser exata), centralizar em **um lugar so** (`lib/config.ts`).

## Problema 3 — `vercel env ls` exige link local

Pra rodar comandos de env, o repo precisa estar linkado:

```bash
vercel link --yes --project dr-lucas-felipe
vercel env ls
```

Cria pasta `.vercel/` (ja no `.gitignore` por padrao).

## Veja tambem

- [[2026-04-15-sprint-pre-reuniao-dr-lucas]]
- [[2026-04-15-revert-webhook-secret]]

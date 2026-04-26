---
title: "Erro redirect_uri_mismatch ao conectar Google Agenda"
date: 2026-04-20
tags: [incidente, oauth, google, integracao, vercel]
---

# Erro redirect_uri_mismatch ao conectar Google Agenda

## Contexto

Em 20/04/2026 Dr. Lucas (cliente) tentou conectar a Google Agenda no sistema Central Dr. Lucas pela primeira vez. O fluxo de OAuth abriu a tela do Google, autenticou com sua conta `lucaslfpf@gmail.com`, e em seguida recebeu a tela de erro do Google:

> Acesso bloqueado: a solicitacao desse app e invalida
> Error 400: redirect_uri_mismatch

## Sintoma

Apos clicar em "Conectar Google Agenda" no sistema, o Google bloqueou o fluxo e nao retornou ao sistema. A integracao nao foi estabelecida.

## Causa raiz

Havia 3 desalinhamentos entre o que o codigo enviava e o que estava cadastrado no Google Cloud Console (projeto `central-dr-lucas`, credencial OAuth `CENTRALDRLUCAS`):

### 1. Origem JavaScript autorizada com dominio invertido

- Cadastrado: `https://central-dr-lucas.vercel.app`
- Correto: `https://dr-lucas-central.vercel.app`

### 2. URI de redirecionamento com rota errada

- Cadastrado: `https://central.drlucasfelipe.com.br/api/auth/callback/google`
- Essa rota `/api/auth/callback/google` e do NextAuth (login com Google), NAO da integracao de Google Calendar
- A rota correta da integracao de Agenda e `/api/configuracoes/google-agenda/callback`

### 3. Dominio do URI de redirect errado

- Cadastrado: `central.drlucasfelipe.com.br` (dominio customizado que nao esta em uso)
- O sistema roda em `dr-lucas-central.vercel.app`

O codigo em [app/api/configuracoes/google-agenda/auth-url/route.ts:7](../../../app/api/configuracoes/google-agenda/auth-url/route.ts) tem a URL hardcoded:

```
https://dr-lucas-central.vercel.app/api/configuracoes/google-agenda/callback
```

Como nenhum dos URIs cadastrados no Google Cloud Console batia com essa URL (caractere por caractere), o Google bloqueou.

## Solucao aplicada

Correcao feita pelo cliente diretamente no Google Cloud Console, sem alteracao no codigo:

1. Corrigida a "Origem JavaScript autorizada" para `https://dr-lucas-central.vercel.app`
2. Adicionado novo "URI de redirecionamento autorizado": `https://dr-lucas-central.vercel.app/api/configuracoes/google-agenda/callback`
3. Salvo e aguardado ~5 minutos para propagacao

Apos isso o fluxo completou normalmente — status "Conectado" aparece na tela e credenciais OAuth salvas no banco (`config_google_calendar`).

## Ponto de atencao

A URL de callback esta hardcoded no codigo. Se:

- O dominio Vercel mudar
- Um dominio customizado entrar em producao (ex: `central.drlucasfelipe.com.br`)
- For necessario rodar em ambiente de staging/preview

a integracao vai quebrar. Refatorar para usar `process.env.NEXTAUTH_URL` (ou similar) fica como melhoria futura. Nao foi feito agora para nao arriscar mexer em sistema funcionando.

## Aplicavel a outros projetos

Todo projeto que usa OAuth Google (NextAuth + Google, Google Calendar, Gmail, Drive) precisa garantir que as URLs cadastradas no Google Cloud Console batam **exatamente** com as que o codigo envia. Caractere por caractere: protocolo, dominio, porta, path, barra final.

## Checklist de integracao OAuth Google

Para projetos futuros:

1. Confirmar dominio de producao ANTES de cadastrar no Google Cloud Console
2. Cadastrar "Origem JavaScript autorizada" = raiz do dominio (sem path)
3. Cadastrar "URI de redirecionamento" = raiz + path exato do callback definido no codigo
4. Validar em ambiente de staging antes de prod
5. Preferir URLs derivadas de variavel de ambiente (`process.env.NEXTAUTH_URL`) em vez de hardcoded
6. Se tiver dominio customizado + dominio Vercel, cadastrar ambos

## Referencias

- [app/api/configuracoes/google-agenda/auth-url/route.ts](../../../app/api/configuracoes/google-agenda/auth-url/route.ts) — arquivo com a URL hardcoded do redirect
- Credencial OAuth no Google Cloud: projeto `central-dr-lucas`, cliente `CENTRALDRLUCAS`

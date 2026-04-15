---
title: Como baixar reels do Instagram via snapinsta.com.br API
date: 2026-04-15
tags: [aprendizado, instagram, scraping, video]
---

# Como baixar reels do Instagram via snapinsta.com.br API

## Contexto

Precisava baixar 4 reels do Instagram pra hospedar localmente no site (CLIENTE-221). Instagram desde 2024 exige sessao autenticada para qualquer reel.

## O que NAO funciona

| Tool | Motivo |
|------|--------|
| `yt-dlp` sem cookies | Instagram retorna empty media response |
| `yt-dlp --cookies-from-browser firefox` | Firefox nao instalado |
| `yt-dlp --cookies-from-browser chrome` | Chrome 127+ bloqueia copia de cookie DB |
| `yt-dlp --cookies-from-browser edge` | DPAPI decrypt error (Edge 130+) |
| `instaloader` | 403 Forbidden no GraphQL |
| `gallery-dl` | Redireciona para login |

## O que funciona — snapinsta.com.br

A propria pagina HTML expoe os endpoints da WordPress REST API.

### Passos

```bash
# 1. Pegar nonce + cookies da homepage
curl -s https://snapinsta.com.br/ -c /tmp/snapcookies.txt -o /tmp/snap.html
nonce=$(grep -oE 'nonce":"[a-f0-9]+' /tmp/snap.html | head -1 | cut -d'"' -f3)

# 2. Chamar API com nonce (retorna HTML com link dl.php?id=...)
resp=$(curl -s -X POST 'https://snapinsta.com.br/wp-json/visolix/api/download' \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://snapinsta.com.br' \
  -H 'Referer: https://snapinsta.com.br/' \
  -H 'User-Agent: Mozilla/5.0' \
  -H "X-WP-Nonce: $nonce" \
  -b /tmp/snapcookies.txt \
  -d "{\"url\":\"https://www.instagram.com/reel/CODE/\"}")
dl_url=$(echo "$resp" | grep -oE 'dl\.php\?id=[a-f0-9]+' | head -1)

# 3. Baixar via dl.php
curl -sL "https://snapinsta.com.br/wp-content/plugins/visolix-video-downloader/includes/../$dl_url" \
  -H 'Referer: https://snapinsta.com.br/' \
  -H 'User-Agent: Mozilla/5.0' \
  -b /tmp/snapcookies.txt \
  -o "video.mp4"
```

## Notas

- O nonce dura horas, mas e prudente buscar fresco a cada execucao
- Reusar cookies entre chamadas — sao stateful
- A API responde com HTML embutido contendo o link `dl.php?id=xxx`
- Funciona pra reels publicos. Privado nao testei.
- Se o site mudar, o endpoint pode mudar tambem

## Veja tambem

- [[2026-04-15-sprint-pre-reuniao-dr-lucas]]
- CLIENTE-221

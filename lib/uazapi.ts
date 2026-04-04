// Cliente REST para API UazapiGO (gateway WhatsApp)
//
// UazapiGO tem 2 níveis de autenticação:
//   - Admin:    header "Authorization" → endpoints /admin/*
//   - Instância: header "token"         → endpoints /instance/*, /message/*, /chat/*, etc.

type TokenType = "instance" | "admin"

async function uazapiFetch(
  url: string,
  path: string,
  token: string,
  options: RequestInit = {},
  timeoutMs = 10000,
  tokenType: TokenType = "instance"
) {
  const baseUrl = url.replace(/\/$/, "")
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (tokenType === "admin") {
    headers["Authorization"] = token
  } else {
    headers["token"] = token
  }

  // Merge headers adicionais de options
  if (options.headers) {
    const extra = options.headers as Record<string, string>
    Object.assign(headers, extra)
  }

  let res: Response
  try {
    res = await fetch(`${baseUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers,
    })
  } finally {
    clearTimeout(timeout)
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Uazapi ${res.status}: ${body || res.statusText}`)
  }

  const text = await res.text()
  return text ? JSON.parse(text) : null
}

// ── Admin endpoints (Authorization header) ──────────────────────────

/** Lista instâncias existentes — GET /admin/users */
export async function listarInstancias(
  url: string,
  adminToken: string
): Promise<{ ok: boolean; instancias?: Array<{ Name: string; Token: string; Webhook: string; Jid: string }>; erro?: string }> {
  try {
    const data = await uazapiFetch(url, "/admin/users", adminToken, {}, 10000, "admin")
    const lista = Array.isArray(data) ? data : data?.Users || data?.users || []
    return { ok: true, instancias: lista }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : "Erro desconhecido" }
  }
}

/** Cria nova instância — POST /admin/users */
export async function criarInstancia(
  url: string,
  adminToken: string,
  nome: string,
  instanceToken: string,
  webhook?: string
): Promise<{ ok: boolean; erro?: string }> {
  try {
    await uazapiFetch(
      url,
      "/admin/users",
      adminToken,
      {
        method: "POST",
        body: JSON.stringify({
          name: nome,
          token: instanceToken,
          webhook: webhook || "",
          events: "All",
        }),
      },
      15000,
      "admin"
    )
    return { ok: true }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : "Erro desconhecido" }
  }
}

// ── Instance endpoints (token header) ───────────────────────────────

/** Testa conexão com token da instância — GET /instance/status */
export async function testarConexao(
  url: string,
  instanceToken: string
): Promise<{ ok: boolean; erro?: string }> {
  try {
    await uazapiFetch(url, "/instance/status", instanceToken)
    return { ok: true }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : "Erro desconhecido" }
  }
}

/** Configura webhook da instância — POST /webhook/set */
export async function configurarWebhook(
  url: string,
  instanceToken: string,
  webhookUrl: string
): Promise<void> {
  await uazapiFetch(url, "/webhook/set", instanceToken, {
    method: "POST",
    body: JSON.stringify({ url: webhookUrl }),
  }, 15000)
}

/** Inicia conexão e obtém QR code — POST /instance/connect */
export async function obterQrCode(
  url: string,
  instanceToken: string
): Promise<{ qrcode: string }> {
  const data = await uazapiFetch(url, "/instance/connect", instanceToken, {
    method: "POST",
    body: JSON.stringify({}),
  }, 30000)
  return { qrcode: data.instance?.qrcode || data.qrcode || "" }
}

/** Verifica status da instância — GET /instance/status */
export async function verificarStatus(
  url: string,
  instanceToken: string
): Promise<{ status: string; jid?: string }> {
  const data = await uazapiFetch(url, "/instance/status", instanceToken)
  return {
    status: data.instance?.status || (data.status?.connected ? "connected" : "disconnected"),
    jid: data.status?.jid || undefined,
  }
}

/** Desconecta e remove instância — DELETE /instance */
export async function desconectar(
  url: string,
  instanceToken: string
): Promise<void> {
  await uazapiFetch(url, "/instance", instanceToken, {
    method: "DELETE",
  })
}

/** Envia mensagem de texto — POST /message/text */
export async function enviarMensagem(
  url: string,
  instanceToken: string,
  numero: string,
  mensagem: string,
  replyId?: string
): Promise<void> {
  const payload: Record<string, string> = { to: numero, text: mensagem }
  if (replyId) payload.replyid = replyId
  await uazapiFetch(url, "/message/text", instanceToken, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

/** Envia mídia — POST /send/media */
export async function enviarMidia(
  url: string,
  instanceToken: string,
  numero: string,
  mediaUrl: string,
  tipo: "image" | "audio" | "document" | "video" | "ptt",
  legenda?: string,
  replyId?: string,
  nomeDocumento?: string
): Promise<void> {
  const payload: Record<string, string> = {
    to: numero,
    url: mediaUrl,
    type: tipo,
  }
  if (legenda) payload.caption = legenda
  if (replyId) payload.replyid = replyId
  if (nomeDocumento) payload.docName = nomeDocumento
  await uazapiFetch(url, "/send/media", instanceToken, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

/** Envia indicador de digitação — POST /chat/presence */
export async function enviarDigitando(
  url: string,
  instanceToken: string,
  chatId: string,
  ativo: boolean
): Promise<void> {
  await uazapiFetch(url, "/chat/presence", instanceToken, {
    method: "POST",
    body: JSON.stringify({
      chatId,
      presence: ativo ? "composing" : "paused",
    }),
  })
}

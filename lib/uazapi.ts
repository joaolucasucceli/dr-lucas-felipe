// Cliente REST para API UazapiGO (gateway WhatsApp)
//
// Autenticação:
//   - Admin:     header "admintoken" → POST /instance/create, GET /status
//   - Instância: header "token"      → /instance/*, /message/*, /chat/*, etc.

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
    headers["admintoken"] = token
  } else {
    headers["token"] = token
  }

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

// ── Admin endpoints (admintoken header) ─────────────────────────────

/** Valida admin token e obtém status do servidor — GET /status */
export async function validarAdminToken(
  url: string,
  adminToken: string
): Promise<{ ok: boolean; erro?: string }> {
  try {
    // GET /status aceita o admin token via header "token" para health check
    await uazapiFetch(url, "/status", adminToken, {}, 10000, "instance")
    return { ok: true }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : "Erro desconhecido" }
  }
}

/** Cria nova instância — POST /instance/create */
export async function criarInstancia(
  url: string,
  adminToken: string,
  nome: string
): Promise<{ ok: boolean; instanceToken?: string; erro?: string }> {
  try {
    const data = await uazapiFetch(
      url,
      "/instance/create",
      adminToken,
      {
        method: "POST",
        body: JSON.stringify({ Name: nome }),
      },
      15000,
      "admin"
    )
    const instanceToken = data?.token || data?.instance?.token || ""
    return { ok: true, instanceToken }
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

/** Configura webhook da instância — POST /webhook (modo simples) */
export async function configurarWebhook(
  url: string,
  instanceToken: string,
  webhookUrl: string,
  webhookToken?: string
): Promise<void> {
  await uazapiFetch(url, "/webhook", instanceToken, {
    method: "POST",
    body: JSON.stringify({
      url: webhookUrl,
      enabled: true,
      events: ["messages", "messages_update", "connection"],
      excludeMessages: ["wasSentByApi", "isGroupYes"],
      token: webhookToken || "",
    }),
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

/** Envia mensagem de texto — POST /send/text (UazapiGO v2) */
export async function enviarMensagem(
  url: string,
  instanceToken: string,
  numero: string,
  mensagem: string,
  replyId?: string
): Promise<void> {
  const payload: Record<string, string> = { number: numero, text: mensagem }
  if (replyId) payload.replyid = replyId
  await uazapiFetch(url, "/send/text", instanceToken, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

/** Envia mídia — POST /send/media (UazapiGO v2) */
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
    number: numero,
    file: mediaUrl,
    type: tipo,
  }
  if (legenda) payload.text = legenda
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

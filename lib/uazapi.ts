// Cliente REST para API Uazapi (gateway WhatsApp)

async function uazapiFetch(
  url: string,
  path: string,
  token: string,
  options: RequestInit = {},
  timeoutMs = 10000
) {
  const baseUrl = url.replace(/\/$/, "")
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  let res: Response
  try {
    res = await fetch(`${baseUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        token: token,
        ...options.headers,
      },
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

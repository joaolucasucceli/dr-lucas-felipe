// Cliente REST para API Uazapi (gateway WhatsApp)

async function uazapiFetch(
  url: string,
  path: string,
  token: string,
  options: RequestInit = {}
) {
  const baseUrl = url.replace(/\/$/, "")
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })

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
  })
}

/** Inicia conexão e obtém QR code — POST /instance/connect */
export async function obterQrCode(
  url: string,
  instanceToken: string
): Promise<{ qrcode: string }> {
  const data = await uazapiFetch(url, "/instance/connect", instanceToken, {
    method: "POST",
    body: JSON.stringify({}),
  })
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
  mensagem: string
): Promise<void> {
  await uazapiFetch(url, "/message/text", instanceToken, {
    method: "POST",
    body: JSON.stringify({ to: numero, text: mensagem }),
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

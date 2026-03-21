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

/** Testa conexão com credenciais de admin — GET /instance/list */
export async function testarConexao(
  url: string,
  adminToken: string
): Promise<{ ok: boolean; erro?: string }> {
  try {
    await uazapiFetch(url, "/instance/list", adminToken)
    return { ok: true }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : "Erro desconhecido" }
  }
}

/** Cria nova instância — POST /instance/create */
export async function criarInstancia(
  url: string,
  adminToken: string
): Promise<{ id: string; token: string }> {
  const data = await uazapiFetch(url, "/instance/create", adminToken, {
    method: "POST",
    body: JSON.stringify({}),
  })
  return { id: data.id || data.instanceId, token: data.token || data.instanceToken }
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

/** Obtém QR code para conexão — GET /instance/connect */
export async function obterQrCode(
  url: string,
  instanceToken: string
): Promise<{ qrcode: string }> {
  const data = await uazapiFetch(url, "/instance/connect", instanceToken)
  return { qrcode: data.qrcode || data.base64 || "" }
}

/** Verifica status da instância — GET /instance/status */
export async function verificarStatus(
  url: string,
  instanceToken: string
): Promise<{ status: string; jid?: string }> {
  const data = await uazapiFetch(url, "/instance/status", instanceToken)
  return {
    status: data.status || "unknown",
    jid: data.jid || data.user?.id,
  }
}

/** Desconecta instância — DELETE /instance/logout */
export async function desconectar(
  url: string,
  instanceToken: string
): Promise<void> {
  await uazapiFetch(url, "/instance/logout", instanceToken, {
    method: "DELETE",
  })
}

/** Deleta instância — DELETE /instance/delete/{id} */
export async function deletarInstancia(
  url: string,
  instanceId: string,
  adminToken: string
): Promise<void> {
  await uazapiFetch(url, `/instance/delete/${instanceId}`, adminToken, {
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

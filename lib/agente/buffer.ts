import { redis } from "@/lib/redis"

export interface BufferMensagem {
  tipo: string
  conteudo: string
  timestamp: number
  messageId: string
}

const BUFFER_SUFFIX = "_buf_dr-lucas"
const DEBOUNCE_SUFFIX = "_deb_dr-lucas"
const BUFFER_TTL = 300 // segundos — janela maior pra absorver pico de carga / lentidao no /processar
const DEBOUNCE_TTL = 20 // segundos

/** Adiciona mensagem ao buffer Redis */
export async function adicionarAoBuffer(
  chatId: string,
  mensagem: BufferMensagem
): Promise<void> {
  const chave = `${chatId}${BUFFER_SUFFIX}`
  await redis.rpush(chave, JSON.stringify(mensagem))
  await redis.expire(chave, BUFFER_TTL)
}

/** Obtém todas as mensagens do buffer e limpa */
export async function obterELimparBuffer(
  chatId: string
): Promise<BufferMensagem[]> {
  const chave = `${chatId}${BUFFER_SUFFIX}`
  const items = await redis.lrange(chave, 0, -1)
  await redis.del(chave)

  return items.map((item) =>
    typeof item === "string" ? JSON.parse(item) : item
  ) as BufferMensagem[]
}

/** Agenda processamento com debounce de 20s */
export async function agendarProcessamento(chatId: string): Promise<void> {
  const chave = `${chatId}${DEBOUNCE_SUFFIX}`
  await redis.set(chave, "1", { ex: DEBOUNCE_TTL })
}

/** Verifica se o debounce expirou (deve processar) */
export async function deveProcessar(chatId: string): Promise<boolean> {
  const chave = `${chatId}${DEBOUNCE_SUFFIX}`
  const existe = await redis.exists(chave)
  return existe === 0
}

/** JLAU-552: remove a chave de buffer (usado ao deletar lead). */
export async function limparBuffer(chatId: string): Promise<void> {
  const chave = `${chatId}${BUFFER_SUFFIX}`
  await redis.del(chave)
}

/** JLAU-552: remove o lock de debounce (usado ao deletar lead). */
export async function limparDebounce(chatId: string): Promise<void> {
  const chave = `${chatId}${DEBOUNCE_SUFFIX}`
  await redis.del(chave)
}

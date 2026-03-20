import { redis } from "@/lib/redis"

export interface MensagemMemoria {
  role: "user" | "assistant" | "system"
  content: string
}

const MEMORIA_SUFFIX = "_mem_dr-lucas"
const MEMORIA_TTL = 172800 // 48 horas em segundos
const MAX_MENSAGENS = 20

/** Obtém histórico de memória do chat */
export async function obterMemoria(chatId: string): Promise<MensagemMemoria[]> {
  const chave = `${chatId}${MEMORIA_SUFFIX}`
  const items = await redis.lrange(chave, 0, -1)

  return items.map((item) =>
    typeof item === "string" ? JSON.parse(item) : item
  ) as MensagemMemoria[]
}

/** Adiciona uma mensagem à memória (mantém máximo 20) */
export async function adicionarAMemoria(
  chatId: string,
  mensagem: MensagemMemoria
): Promise<void> {
  const chave = `${chatId}${MEMORIA_SUFFIX}`
  await redis.rpush(chave, JSON.stringify(mensagem))
  await redis.ltrim(chave, -MAX_MENSAGENS, -1)
  await redis.expire(chave, MEMORIA_TTL)
}

/** Substitui toda a memória do chat */
export async function salvarMemoria(
  chatId: string,
  mensagens: MensagemMemoria[]
): Promise<void> {
  const chave = `${chatId}${MEMORIA_SUFFIX}`
  await redis.del(chave)

  if (mensagens.length > 0) {
    const items = mensagens.slice(-MAX_MENSAGENS).map((m) => JSON.stringify(m))
    await redis.rpush(chave, ...items)
    await redis.expire(chave, MEMORIA_TTL)
  }
}

/** Limpa memória do chat */
export async function limparMemoria(chatId: string): Promise<void> {
  const chave = `${chatId}${MEMORIA_SUFFIX}`
  await redis.del(chave)
}

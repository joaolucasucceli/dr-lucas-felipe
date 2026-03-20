import { redis } from "@/lib/redis"

const PREFIXO = "rate_login:"
const MAX_TENTATIVAS = 5
const JANELA_SEGUNDOS = 900 // 15 minutos

// Rate limiting desabilitado se Redis não estiver configurado
const REDIS_CONFIGURADO = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
)

function chave(ip: string) {
  return `${PREFIXO}${ip}`
}

export async function checkRateLimit(
  ip: string
): Promise<{ bloqueado: boolean; tentativas: number }> {
  if (!REDIS_CONFIGURADO) return { bloqueado: false, tentativas: 0 }
  const tentativas = await redis.get<number>(chave(ip))
  const count = tentativas ?? 0
  return { bloqueado: count >= MAX_TENTATIVAS, tentativas: count }
}

export async function registrarTentativa(ip: string): Promise<void> {
  if (!REDIS_CONFIGURADO) return
  const k = chave(ip)
  const novoValor = await redis.incr(k)
  if (novoValor === 1) {
    // Primeira tentativa — definir expiração
    await redis.expire(k, JANELA_SEGUNDOS)
  }
}

export async function resetarTentativas(ip: string): Promise<void> {
  if (!REDIS_CONFIGURADO) return
  await redis.del(chave(ip))
}

import { redis } from "@/lib/redis"

// Rate limiting desabilitado se Redis não estiver configurado
const REDIS_CONFIGURADO = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
)

// ==========================================
// Rate Limit Genérico
// ==========================================

interface RateLimitConfig {
  prefixo: string
  maxTentativas: number
  janelaSegundos: number
}

const CONFIGS: Record<string, RateLimitConfig> = {
  login: { prefixo: "rate_login:", maxTentativas: 5, janelaSegundos: 900 },
  paciente: { prefixo: "rate_paciente:", maxTentativas: 100, janelaSegundos: 900 },
  captarSite: { prefixo: "rate_captar:", maxTentativas: 3, janelaSegundos: 3600 },
  // Webhook WhatsApp por numero do remetente. Paciente real digita ~5-15
  // msgs/min em pico de conversa; 30/60s deixa margem confortavel e barra
  // floods de bot/abuso (cada msg vira call OpenAI = $$).
  //
  // ATENCAO (22/07/2026): este limite pega flood RAPIDO, nao loop LENTO. No
  // incidente de 17/07 o outro bot mandava ~13 msgs/min — sempre abaixo de 30
  // — e sustentou isso por 16 horas sem nunca disparar o rate-limit. Quem
  // barra esse caso e o freio do agente (src/lib/agente/circuit-breaker.ts),
  // que limita o que a Ana ENVIA. Os dois se complementam: aqui e por
  // remetente, la e por resposta do agente.
  whatsappWebhook: {
    prefixo: "rate_wa_webhook:",
    maxTentativas: 30,
    janelaSegundos: 60,
  },
}

function chave(prefixo: string, identificador: string) {
  return `${prefixo}${identificador}`
}

async function verificarLimite(
  config: RateLimitConfig,
  identificador: string
): Promise<{ bloqueado: boolean; tentativas: number }> {
  if (!REDIS_CONFIGURADO) return { bloqueado: false, tentativas: 0 }
  const tentativas = await redis.get<number>(chave(config.prefixo, identificador))
  const count = tentativas ?? 0
  return { bloqueado: count >= config.maxTentativas, tentativas: count }
}

async function registrar(
  config: RateLimitConfig,
  identificador: string
): Promise<void> {
  if (!REDIS_CONFIGURADO) return
  const k = chave(config.prefixo, identificador)
  const novoValor = await redis.incr(k)
  if (novoValor === 1) {
    await redis.expire(k, config.janelaSegundos)
  }
}

async function resetar(
  config: RateLimitConfig,
  identificador: string
): Promise<void> {
  if (!REDIS_CONFIGURADO) return
  await redis.del(chave(config.prefixo, identificador))
}

// ==========================================
// Login — API retrocompatível
// ==========================================

export async function checkRateLimit(
  ip: string
): Promise<{ bloqueado: boolean; tentativas: number }> {
  return verificarLimite(CONFIGS.login, ip)
}

export async function registrarTentativa(ip: string): Promise<void> {
  return registrar(CONFIGS.login, ip)
}

export async function resetarTentativas(ip: string): Promise<void> {
  return resetar(CONFIGS.login, ip)
}

// ==========================================
// Paciente — rotas de dados médicos
// ==========================================

export async function checkRateLimitPaciente(
  usuarioId: string
): Promise<{ bloqueado: boolean; tentativas: number }> {
  return verificarLimite(CONFIGS.paciente, usuarioId)
}

export async function registrarTentativaPaciente(usuarioId: string): Promise<void> {
  return registrar(CONFIGS.paciente, usuarioId)
}

// ==========================================
// Captação Site — formulário público da landing page
// ==========================================

export async function checkRateLimitCaptar(
  ip: string
): Promise<{ bloqueado: boolean; tentativas: number }> {
  return verificarLimite(CONFIGS.captarSite, ip)
}

export async function registrarTentativaCaptar(ip: string): Promise<void> {
  return registrar(CONFIGS.captarSite, ip)
}

// ==========================================
// Webhook WhatsApp — por número do remetente
// ==========================================

export async function checkRateLimitWhatsappWebhook(
  numero: string
): Promise<{ bloqueado: boolean; tentativas: number }> {
  return verificarLimite(CONFIGS.whatsappWebhook, numero)
}

export async function registrarTentativaWhatsappWebhook(numero: string): Promise<void> {
  return registrar(CONFIGS.whatsappWebhook, numero)
}

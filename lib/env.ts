/**
 * Validacao centralizada das envs do agente.
 *
 * - `getBaseUrl()`: retorna URL canonica pra internal fetch. Fail-fast em
 *   producao se NEXTAUTH_URL ausente — evita o agente bater em localhost
 *   silenciosamente em prod.
 * - `WEBHOOK_SECRET` agora OBRIGATORIO em producao (2026-05-13). Sem ele, o
 *   webhook do Uazapi vira porta aberta — qualquer payload externo dispara
 *   GPT + WhatsApp pela instancia da clinica. Boot loga ERROR se faltar.
 */

const trim = (v: string | undefined) => (v ?? "").trim()

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  NEXTAUTH_URL: trim(process.env.NEXTAUTH_URL),
  API_SECRET: trim(process.env.API_SECRET),
  WEBHOOK_SECRET: trim(process.env.WEBHOOK_SECRET),
  OPENAI_API_KEY: trim(process.env.OPENAI_API_KEY),
} as const

export const isProd = env.NODE_ENV === "production"

/**
 * URL canonica usada pelo agente em internal fetch (webhook -> /api/agente/processar,
 * loop -> /api/agente/<tool>).
 *
 * Em producao SEM env: lanca erro explicito (fail-fast). Em dev: cai em localhost.
 * Antes desta funcao, qualquer falha em ler NEXTAUTH_URL caia silenciosamente
 * em localhost, deixando o agente "mudo" em producao sem nenhum log.
 */
export function getBaseUrl(): string {
  if (env.NEXTAUTH_URL) return env.NEXTAUTH_URL
  if (isProd) {
    throw new Error(
      "[env] NEXTAUTH_URL nao configurada em PRODUCAO. O agente nao consegue " +
        "chamar internal fetch. Adicione a env no Vercel."
    )
  }
  return "http://localhost:3000"
}

/**
 * Logs de boot — escreve uma vez quando o modulo carrega. Em producao sem
 * envs criticas, deixa rastro evidente nos logs do Vercel.
 */
if (isProd) {
  const obrigatorias: Array<keyof typeof env> = [
    "NEXTAUTH_URL",
    "API_SECRET",
    "OPENAI_API_KEY",
    "WEBHOOK_SECRET",
  ]
  const faltantes = obrigatorias.filter((k) => !env[k])
  if (faltantes.length > 0) {
    console.error(
      `[env] PRODUCAO sem envs obrigatorias:`,
      faltantes.join(", ")
    )
  }
}

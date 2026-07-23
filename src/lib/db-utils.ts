import { createId } from "@paralleldrive/cuid2"

export function criarId(): string {
  return createId()
}

export function agora(): string {
  return new Date().toISOString()
}

/**
 * Converte um timestamp lido do banco em milissegundos de epoch.
 *
 * Metade das colunas de data deste banco e `timestamp WITHOUT time zone`
 * (`conversas.ultimaMensagemEm`, `criadoEm`, `encerradaEm`,
 * `mensagens_whatsapp.criadoEm`), enquanto outras sao `WITH time zone`
 * (`eventos_orcamento_pendente.respondidoEm`). Como `agora()` sempre grava UTC
 * e o banco roda em UTC, o conteudo das naive TAMBEM e UTC — mas elas voltam do
 * PostgREST como `"2026-07-23T20:09:13.437"`, sem `Z`.
 *
 * `new Date()` numa string dessas usa o fuso do PROCESSO, nao o do banco. Em
 * maquina brasileira isso joga o instante 3h para frente; na Vercel (UTC) nao
 * muda nada. Ou seja: qualquer conta de "quanto tempo passou" da resultado
 * diferente conforme onde roda — e passa despercebida em producao ate o dia em
 * que alguem muda a regiao do deploy.
 *
 * Aqui a ausencia de fuso e tratada como UTC, que e o que o dado realmente e.
 * Retorna NaN para entrada invalida — quem chama decide o que fazer.
 */
export function instanteDoBanco(valor: string | null | undefined): number {
  if (!valor) return NaN

  const temFuso = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(valor.trim())
  const normalizado = temFuso ? valor : `${valor.trim().replace(" ", "T")}Z`

  return new Date(normalizado).getTime()
}

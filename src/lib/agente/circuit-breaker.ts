import { redis } from "@/lib/redis"
import type { BufferMensagem } from "@/lib/agente/buffer"

/**
 * FREIO DE EMERGÊNCIA do agente.
 *
 * Incidente de 17/07/2026 que motivou este arquivo: a Ana Júlia trocou
 * ~13.000 mensagens em 16 horas com um número que era um atendimento
 * automático de outra empresa. O bot do outro lado respondia "não consegui
 * entender" a tudo (e mandava mensagens sem texto nenhum); a Ana não
 * conseguia formar resposta e devolvia "Deu uma travadinha aqui, pode me
 * mandar de novo?" — 5.016 vezes. Cada resposta dela era um novo gatilho para
 * o outro bot. Só parou porque o cron de auto-close encerrou a conversa 16h
 * depois. Nada no sistema percebeu.
 *
 * A lição não é "tratar o caso do bot da operadora": é que o agente não tinha
 * NENHUM limite de si mesmo. Qualquer interlocutor que responda automaticamente
 * — outro bot, autoresposta de férias, encaminhamento — reproduz o loop.
 *
 * São três camadas independentes, de propósito. Se uma falhar, a seguinte
 * segura:
 *   1. não responder o que não tem conteúdo (corta a origem)
 *   2. não repetir a mesma resposta indefinidamente (corta o loop)
 *   3. teto de mensagens por janela de tempo (corta qualquer causa futura)
 */

/** Repetições idênticas seguidas antes de desistir. */
const MAX_REPETICOES_IGUAIS = 3

/** Teto de mensagens do agente para o mesmo contato dentro da janela. */
const MAX_ENVIOS_POR_JANELA = 25
const JANELA_ENVIOS_SEGUNDOS = 60 * 60

const TTL_ESTADO_SEGUNDOS = 60 * 60 * 6

function chave(chatId: string): string {
  return `agente:freio:${chatId}`
}

function chaveVolume(chatId: string): string {
  return `agente:freio:vol:${chatId}`
}

/**
 * Contador de volume com INCR atômico.
 *
 * A contagem de repetição tolera corrida (o pior caso é uma mensagem a mais
 * antes de bloquear), mas o teto de volume é a última linha de defesa: precisa
 * valer mesmo com dois processamentos simultâneos do mesmo chat, o que o
 * debounce de 6s reduz mas não elimina.
 */
async function incrementarVolume(chatId: string): Promise<number> {
  try {
    const k = chaveVolume(chatId)
    const valor = await redis.incr(k)
    if (valor === 1) await redis.expire(k, JANELA_ENVIOS_SEGUNDOS)
    return valor
  } catch (err) {
    console.warn("[freio] Falha ao contar volume — liberando envio:", err)
    return 0
  }
}

/** Hash barato e estável — só precisa distinguir textos, não ser seguro. */
function digerir(texto: string): string {
  let h = 0
  const normalizado = texto.trim().toLowerCase()
  for (let i = 0; i < normalizado.length; i++) {
    h = (h * 31 + normalizado.charCodeAt(i)) | 0
  }
  return `${h}:${normalizado.length}`
}

interface EstadoFreio {
  ultimaRespostaHash: string | null
  repeticoes: number
  enviosNaJanela: number
  janelaIniciadaEm: number
}

const ESTADO_INICIAL: EstadoFreio = {
  ultimaRespostaHash: null,
  repeticoes: 0,
  enviosNaJanela: 0,
  janelaIniciadaEm: 0,
}

async function lerEstado(chatId: string): Promise<EstadoFreio> {
  try {
    const bruto = await redis.get<unknown>(chave(chatId))
    if (!bruto) return { ...ESTADO_INICIAL }
    const dados = (typeof bruto === "string" ? JSON.parse(bruto) : bruto) as
      | Partial<EstadoFreio>
      | null
    return {
      ultimaRespostaHash: dados?.ultimaRespostaHash ?? null,
      repeticoes: Number(dados?.repeticoes ?? 0),
      enviosNaJanela: Number(dados?.enviosNaJanela ?? 0),
      janelaIniciadaEm: Number(dados?.janelaIniciadaEm ?? 0),
    }
  } catch (err) {
    console.warn("[freio] Falha ao ler estado — liberando envio:", err)
    return { ...ESTADO_INICIAL }
  }
}

async function gravarEstado(chatId: string, estado: EstadoFreio): Promise<void> {
  try {
    await redis.set(chave(chatId), JSON.stringify(estado), {
      ex: TTL_ESTADO_SEGUNDOS,
    })
  } catch (err) {
    console.warn("[freio] Falha ao gravar estado:", err)
  }
}

export async function limparFreio(chatId: string): Promise<void> {
  try {
    await Promise.all([redis.del(chave(chatId)), redis.del(chaveVolume(chatId))])
  } catch (err) {
    console.warn("[freio] Falha ao limpar estado:", err)
  }
}

/**
 * CAMADA 1 — há algo a responder?
 *
 * Mensagem sem texto e sem mídia não é pergunta: é ruído de protocolo (botão,
 * lista, template que o WhatsApp entrega sem corpo). Das 8.500 mensagens que o
 * outro bot mandou no incidente, 4.573 eram exatamente isso. Responder a elas
 * é o que dava partida no ciclo.
 */
export function bufferTemConteudoUtil(buffer: BufferMensagem[]): boolean {
  return buffer.some((mensagem) => {
    if (mensagem.tipo && mensagem.tipo !== "texto") return true
    return Boolean(mensagem.conteudo && mensagem.conteudo.trim())
  })
}

export type VeredictoFreio =
  | { permitido: true }
  | { permitido: false; motivo: "repeticao" | "volume"; detalhe: string }

/**
 * Decisão pura — sem Redis, sem relógio implícito. Separada do I/O para poder
 * ser testada com o volume real do incidente (5.016 envios) sem depender de
 * infraestrutura.
 */
export function decidirEnvio(
  estado: EstadoFreio,
  textoResposta: string,
  agoraMs: number
): { estado: EstadoFreio; veredicto: VeredictoFreio } {
  const hash = digerir(textoResposta)

  const janelaExpirou =
    estado.janelaIniciadaEm === 0 ||
    agoraMs - estado.janelaIniciadaEm > JANELA_ENVIOS_SEGUNDOS * 1000
  const enviosNaJanela = janelaExpirou ? 1 : estado.enviosNaJanela + 1
  const janelaIniciadaEm = janelaExpirou ? agoraMs : estado.janelaIniciadaEm

  // Resposta diferente zera a contagem: conversa saudável não pode ser
  // penalizada por um trecho repetido lá atrás.
  const repeticoes = estado.ultimaRespostaHash === hash ? estado.repeticoes + 1 : 1

  const novoEstado: EstadoFreio = {
    ultimaRespostaHash: hash,
    repeticoes,
    enviosNaJanela,
    janelaIniciadaEm,
  }

  if (repeticoes > MAX_REPETICOES_IGUAIS) {
    return {
      estado: novoEstado,
      veredicto: {
        permitido: false,
        motivo: "repeticao",
        detalhe: `mesma resposta ${repeticoes}x seguidas`,
      },
    }
  }

  if (enviosNaJanela > MAX_ENVIOS_POR_JANELA) {
    return {
      estado: novoEstado,
      veredicto: {
        permitido: false,
        motivo: "volume",
        detalhe: `${enviosNaJanela} mensagens na ultima hora`,
      },
    }
  }

  return { estado: novoEstado, veredicto: { permitido: true } }
}

/**
 * CAMADAS 2 e 3 — chamado imediatamente ANTES de cada envio ao paciente.
 * Registra o envio e diz se ele ainda pode sair.
 */
export async function avaliarEnvio(
  chatId: string,
  textoResposta: string
): Promise<VeredictoFreio> {
  const [anterior, volume] = await Promise.all([
    lerEstado(chatId),
    incrementarVolume(chatId),
  ])

  const { estado, veredicto } = decidirEnvio(anterior, textoResposta, Date.now())
  await gravarEstado(chatId, estado)

  if (!veredicto.permitido) return veredicto

  // Teto duro, checado com o contador atômico e não com o estado serializado.
  if (volume > MAX_ENVIOS_POR_JANELA) {
    return {
      permitido: false,
      motivo: "volume",
      detalhe: `${volume} mensagens na ultima hora`,
    }
  }

  return veredicto
}

export const ESTADO_FREIO_INICIAL: EstadoFreio = ESTADO_INICIAL
export type { EstadoFreio }

import { openai } from "@/lib/openai"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * A imagem que chegou é mesmo a foto da região que o Dr. Lucas precisa?
 *
 * O único critério do código era o tipo do anexo (`tipo === "imagem"`), nada
 * sobre o conteúdo: print de anúncio, captura de tela, documento ou retrato
 * vestido fechavam a qualificação igual, e depois da OPE-549 passariam a ser
 * enviados ao WhatsApp do Dr. Lucas como "foto do caso".
 *
 * Nota honesta sobre a origem desta issue: ela nasceu de uma leitura errada
 * minha do print de 28/07/2026 — descrevi a imagem enviada como "foto de
 * bancada" olhando a miniatura cortada no WhatsApp. O arquivo original é uma
 * selfie de abdome no espelho, legítima, e a Ana acertou ao aceitá-la. O risco
 * geral continua real; o caso que motivou a issue é que não era exemplo dele.
 *
 * ## Decisões deste arquivo
 *
 * **Fail-open, sempre.** Erro, timeout, resposta estranha ou dúvida do modelo
 * → a foto é ACEITA. Perder um lead porque a foto estava escura é muito pior
 * que deixar passar uma imagem errada de vez em quando: a paciente já venceu a
 * barreira de mandar foto do corpo, e ouvir "manda de novo" sem motivo faz ela
 * desistir. A instrução ao modelo também empurra para o SIM na dúvida.
 *
 * **Nada da imagem é guardado ou repassado.** A resposta é um booleano. O
 * conteúdo visual nunca entra no contexto da conversa — a Ana continua sem ver
 * a foto, e a regra de não comentar detalhe visual segue valendo. Só se grava
 * o veredito em `fotos_contato.tipoAnalise`, para o painel poder separar.
 *
 * **Modelo pequeno e timeout curto.** O processamento inteiro tem 45s de
 * deadline; esta chamada não pode comer a resposta ao paciente.
 */

const TIMEOUT_MS = 8_000
const MODELO = "gpt-4o-mini"

const INSTRUCAO = `Você classifica imagens recebidas por uma clínica de estética corporal.

Responda APENAS com uma palavra: SIM ou NAO.

SIM — a imagem mostra uma região do corpo de uma pessoa (abdome, barriga, flancos, cintura, glúteo, coxas, pernas, braços, costas, papada, mamas), ainda que de longe, de lado, com roupa, com pouca luz ou de má qualidade.

NAO — a imagem claramente NÃO é o corpo de alguém: captura de tela, print de conversa, anúncio, documento, comprovante, paisagem, comida, animal, objeto, ambiente ou foto só do rosto.

Na dúvida, responda SIM.`

export type VereditoFoto = "regiao_corporal" | "nao_corporal" | "indeterminado"

/**
 * Classifica a imagem. Nunca lança: falha vira `indeterminado`, que o chamador
 * trata como aceita.
 */
export async function classificarFotoRecebida(
  url: string
): Promise<VereditoFoto> {
  if (!url) return "indeterminado"

  try {
    const resposta = await openai.chat.completions.create(
      {
        model: MODELO,
        max_tokens: 3,
        temperature: 0,
        messages: [
          { role: "system", content: INSTRUCAO },
          {
            role: "user",
            content: [{ type: "image_url", image_url: { url, detail: "low" } }],
          },
        ],
      },
      { timeout: TIMEOUT_MS }
    )

    const texto = (resposta.choices[0]?.message?.content ?? "")
      .trim()
      .toLowerCase()

    if (texto.startsWith("nao") || texto.startsWith("não")) return "nao_corporal"
    if (texto.startsWith("sim")) return "regiao_corporal"

    console.warn("[classificar-foto] Resposta inesperada do modelo:", texto)
    return "indeterminado"
  } catch (err) {
    console.warn(
      "[classificar-foto] Falha ao classificar — foto sera aceita:",
      err instanceof Error ? err.message : err
    )
    return "indeterminado"
  }
}

/**
 * Classifica as fotos que o contato acabou de mandar e diz se ALGUMA serve
 * como foto da região.
 *
 * O corte por data existe porque o contato pode ter fotos antigas no cadastro;
 * o que interessa é o que chegou nesta rodada. `desdeIso` costuma ser o
 * timestamp do início do processamento menos uma folga.
 */
export async function recebeuFotoDaRegiao(params: {
  contatoId: string
  desdeIso: string
}): Promise<boolean> {
  const { data: fotos, error } = await supabaseAdmin
    .from("fotos_contato")
    .select("id, url, tipoAnalise")
    .eq("contatoId", params.contatoId)
    .gte("criadoEm", params.desdeIso)
    .order("criadoEm", { ascending: false })
    // Duas, não três: o processamento inteiro tem 45s de deadline e cada
    // classificação pode levar até 8s. Em rajada de fotos, o que importa é
    // responder o paciente — não auditar o álbum dele.
    .limit(2)

  if (error || !fotos || fotos.length === 0) {
    // Sem conseguir ler, não bloqueia o fluxo: assume que a foto serve.
    if (error) {
      console.warn("[classificar-foto] Falha ao ler fotos recentes:", error.message)
    }
    return true
  }

  // Em paralelo, não em sequência: duas fotos em série custariam até 16s do
  // deadline de 45s. Assim o custo de tempo é o da foto mais lenta.
  const vereditos = await Promise.all(
    fotos.map(async (foto) => {
      const veredito = await classificarFotoRecebida(foto.url)

      // Guarda o veredito para o painel separar foto de caso de imagem
      // qualquer. Best-effort: falhar aqui não muda a decisão.
      await supabaseAdmin
        .from("fotos_contato")
        .update({ tipoAnalise: veredito })
        .eq("id", foto.id)

      return veredito
    })
  )

  return vereditos.some((veredito) => veredito !== "nao_corporal")
}

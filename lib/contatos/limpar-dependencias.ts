import { createHash } from "crypto"
import { supabaseAdmin } from "@/lib/supabase"
import { limparMemoria } from "@/lib/agente/memoria"
import { limparBuffer, limparDebounce } from "@/lib/agente/buffer"
import { BUCKET_FOTOS_CONTATO } from "@/lib/contatos/constantes"
import { cancelarEvento } from "@/lib/google-calendar"

const WHATSAPP_ANONIMIZADO_REGEX = /^[a-f0-9]{64}(_[a-z0-9]+)?$/
const BUCKET_ATENDIMENTO_MIDIAS = "atendimento-midias"
const BUCKET_FOTOS_PRONTUARIO = "fotos-prontuario"
const BUCKET_DOCUMENTOS_PRONTUARIO = "documentos-prontuario"

type SupabaseError = { message: string } | null

type SupabaseUntyped = {
  from: (table: string) => {
    delete: () => {
      eq: (column: string, value: string) => PromiseLike<{ error: SupabaseError }>
    }
  }
}

function extrairPathDoStorageUrl(url: string, bucket: string): string | null {
  const marker = `/${bucket}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  const rawPath = url.substring(idx + marker.length).split("?")[0]

  try {
    return decodeURIComponent(rawPath)
  } catch {
    return rawPath
  }
}

function adicionarUnico(lista: string[], valor: string | null | undefined) {
  if (valor && !lista.includes(valor)) lista.push(valor)
}

function assertSemErro(etapa: string, error: SupabaseError) {
  if (error) {
    throw new Error(`${etapa}: ${error.message}`)
  }
}

async function listarStoragePathsRecursivo(bucket: string, prefixo: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin.storage.from(bucket).list(prefixo)
  assertSemErro(`listar storage ${bucket}/${prefixo}`, error)

  const paths: string[] = []

  for (const item of data ?? []) {
    const path = `${prefixo}/${item.name}`
    const isPasta = item.id === null && !item.metadata
    if (isPasta) {
      paths.push(...(await listarStoragePathsRecursivo(bucket, path)))
    } else {
      paths.push(path)
    }
  }

  return paths
}

async function removerStorage(bucket: string, paths: string[], etapa: string) {
  const pathsUnicos = [...new Set(paths.filter(Boolean))]
  if (pathsUnicos.length === 0) return 0

  const { error } = await supabaseAdmin.storage.from(bucket).remove(pathsUnicos)
  assertSemErro(etapa, error)
  return pathsUnicos.length
}

async function deletarPorContato(
  tabela:
    | "mensagens_whatsapp"
    | "fotos_contato"
    | "conversas"
    | "agendamentos"
    | "eventos_orcamento_pendente"
    | "analista_logs",
  contatoId: string
) {
  const { error } = await supabaseAdmin.from(tabela).delete().eq("contatoId", contatoId)
  assertSemErro(`deletar ${tabela}`, error)
}

async function deletarPorProntuario(
  tabela: "anamneses" | "evolucoes" | "sinais_vitais" | "documentos_prontuario",
  prontuarioIds: string[]
) {
  if (prontuarioIds.length === 0) return
  const { error } = await supabaseAdmin.from(tabela).delete().in("prontuarioId", prontuarioIds)
  assertSemErro(`deletar ${tabela}`, error)
}

async function deletarPorEvolucao(tabela: "registros_cirurgicos", evolucaoIds: string[]) {
  if (evolucaoIds.length === 0) return
  const { error } = await supabaseAdmin.from(tabela).delete().in("evolucaoId", evolucaoIds)
  assertSemErro(`deletar ${tabela}`, error)
}

async function deletarTabelaSemTipoPorContato(tabela: string, contatoId: string) {
  const supabaseUntyped = supabaseAdmin as unknown as SupabaseUntyped
  const { error } = await supabaseUntyped.from(tabela).delete().eq("contatoId", contatoId)
  assertSemErro(`deletar ${tabela}`, error)
}

async function contarPorContato(
  tabela:
    | "mensagens_whatsapp"
    | "fotos_contato"
    | "conversas"
    | "agendamentos"
    | "eventos_orcamento_pendente"
    | "analista_logs",
  contatoId: string
) {
  const { count, error } = await supabaseAdmin
    .from(tabela)
    .select("id", { count: "exact", head: true })
    .eq("contatoId", contatoId)

  assertSemErro(`verificar ${tabela}`, error)
  return count ?? 0
}

async function verificarSemDependencias(params: {
  contatoId: string
  prontuarioIds: string[]
}) {
  const { contatoId, prontuarioIds } = params
  const sobras: string[] = []

  for (const tabela of [
    "mensagens_whatsapp",
    "fotos_contato",
    "conversas",
    "agendamentos",
    "eventos_orcamento_pendente",
    "analista_logs",
  ] as const) {
    const count = await contarPorContato(tabela, contatoId)
    if (count > 0) sobras.push(`${tabela}:${count}`)
  }

  if (prontuarioIds.length > 0) {
    const { count, error } = await supabaseAdmin
      .from("prontuarios")
      .select("id", { count: "exact", head: true })
      .in("id", prontuarioIds)
    assertSemErro("verificar prontuarios", error)
    if ((count ?? 0) > 0) sobras.push(`prontuarios:${count}`)
  }

  if (sobras.length > 0) {
    throw new Error(`Limpeza incompleta para contato ${contatoId}: ${sobras.join(", ")}`)
  }
}

/**
 * Apaga fisicamente todas as dependencias operacionais de um contato/paciente.
 * Nao toca no registro de contatos; quem chama faz o soft-delete e anonimiza WhatsApp.
 */
export async function limparDependenciasDoContato(params: {
  contatoId: string
  chatId: string | null
}): Promise<void> {
  const { contatoId, chatId } = params
  const contagens = {
    storageAtendimentoMidias: 0,
    storageFotosContato: 0,
    storageFotosProntuario: 0,
    storageDocumentosProntuario: 0,
    eventosGoogleCancelados: 0,
  }

  const { data: mensagens, error: mensagensError } = await supabaseAdmin
    .from("mensagens_whatsapp")
    .select("id, mediaUrl")
    .eq("contatoId", contatoId)
  assertSemErro("buscar mensagens_whatsapp", mensagensError)

  const { data: fotos, error: fotosError } = await supabaseAdmin
    .from("fotos_contato")
    .select("id, url")
    .eq("contatoId", contatoId)
  assertSemErro("buscar fotos_contato", fotosError)

  const { data: prontuarios, error: prontuariosError } = await supabaseAdmin
    .from("prontuarios")
    .select("id")
    .eq("contatoId", contatoId)
  assertSemErro("buscar prontuarios", prontuariosError)

  const prontuarioIds = (prontuarios ?? []).map((p) => p.id)

  const { data: evolucoes, error: evolucoesError } = prontuarioIds.length
    ? await supabaseAdmin.from("evolucoes").select("id").in("prontuarioId", prontuarioIds)
    : { data: [], error: null }
  assertSemErro("buscar evolucoes", evolucoesError)
  const evolucaoIds = (evolucoes ?? []).map((e) => e.id)

  const { data: documentos, error: documentosError } = prontuarioIds.length
    ? await supabaseAdmin
        .from("documentos_prontuario")
        .select("id, storagePath")
        .in("prontuarioId", prontuarioIds)
    : { data: [], error: null }
  assertSemErro("buscar documentos_prontuario", documentosError)

  const pathsAtendimentoMidias: string[] = []
  const pathsFotosContato: string[] = []
  const pathsFotosProntuario: string[] = []
  const pathsDocumentosProntuario: string[] = []

  for (const mensagem of mensagens ?? []) {
    adicionarUnico(
      pathsAtendimentoMidias,
      mensagem.mediaUrl
        ? extrairPathDoStorageUrl(mensagem.mediaUrl, BUCKET_ATENDIMENTO_MIDIAS)
        : null
    )
  }

  for (const foto of fotos ?? []) {
    adicionarUnico(pathsFotosContato, extrairPathDoStorageUrl(foto.url, BUCKET_FOTOS_CONTATO))
    adicionarUnico(
      pathsFotosProntuario,
      extrairPathDoStorageUrl(foto.url, BUCKET_FOTOS_PRONTUARIO)
    )
    adicionarUnico(
      pathsAtendimentoMidias,
      extrairPathDoStorageUrl(foto.url, BUCKET_ATENDIMENTO_MIDIAS)
    )
  }

  for (const documento of documentos ?? []) {
    adicionarUnico(pathsDocumentosProntuario, documento.storagePath)
  }

  pathsFotosContato.push(...(await listarStoragePathsRecursivo(BUCKET_FOTOS_CONTATO, contatoId)))
  pathsFotosProntuario.push(
    ...(await listarStoragePathsRecursivo(BUCKET_FOTOS_PRONTUARIO, contatoId))
  )
  pathsAtendimentoMidias.push(
    ...(await listarStoragePathsRecursivo(BUCKET_ATENDIMENTO_MIDIAS, `orcamentos/${contatoId}`))
  )

  for (const prontuarioId of prontuarioIds) {
    pathsDocumentosProntuario.push(
      ...(await listarStoragePathsRecursivo(BUCKET_DOCUMENTOS_PRONTUARIO, prontuarioId))
    )
  }

  const { data: agendamentosComEvento, error: agendamentosError } = await supabaseAdmin
    .from("agendamentos")
    .select("googleEventId")
    .eq("contatoId", contatoId)
    .not("googleEventId", "is", null)
  assertSemErro("buscar agendamentos com googleEventId", agendamentosError)

  for (const agendamento of agendamentosComEvento ?? []) {
    if (agendamento.googleEventId) {
      try {
        await cancelarEvento(agendamento.googleEventId)
        contagens.eventosGoogleCancelados++
      } catch (error) {
        throw new Error(
          `cancelar evento Google ${agendamento.googleEventId} falhou: ${String(error)}`
        )
      }
    }
  }

  contagens.storageAtendimentoMidias += await removerStorage(
    BUCKET_ATENDIMENTO_MIDIAS,
    pathsAtendimentoMidias,
    "remover storage atendimento-midias"
  )
  contagens.storageFotosContato += await removerStorage(
    BUCKET_FOTOS_CONTATO,
    pathsFotosContato,
    `remover storage ${BUCKET_FOTOS_CONTATO}`
  )
  contagens.storageFotosProntuario += await removerStorage(
    BUCKET_FOTOS_PRONTUARIO,
    pathsFotosProntuario,
    `remover storage ${BUCKET_FOTOS_PRONTUARIO}`
  )
  contagens.storageDocumentosProntuario += await removerStorage(
    BUCKET_DOCUMENTOS_PRONTUARIO,
    pathsDocumentosProntuario,
    `remover storage ${BUCKET_DOCUMENTOS_PRONTUARIO}`
  )

  await deletarPorEvolucao("registros_cirurgicos", evolucaoIds)
  await deletarPorProntuario("sinais_vitais", prontuarioIds)
  await deletarPorProntuario("anamneses", prontuarioIds)
  await deletarPorProntuario("documentos_prontuario", prontuarioIds)
  await deletarPorProntuario("evolucoes", prontuarioIds)
  await deletarPorContato("eventos_orcamento_pendente", contatoId)
  await deletarTabelaSemTipoPorContato("aprovacoes_agendamento", contatoId)
  await deletarPorContato("analista_logs", contatoId)
  await deletarPorContato("mensagens_whatsapp", contatoId)
  await deletarPorContato("fotos_contato", contatoId)
  await deletarPorContato("conversas", contatoId)
  await deletarPorContato("agendamentos", contatoId)

  if (prontuarioIds.length > 0) {
    const { error } = await supabaseAdmin.from("prontuarios").delete().eq("contatoId", contatoId)
    assertSemErro("deletar prontuarios", error)
  }

  if (chatId) {
    const redisResults = await Promise.allSettled([
      limparMemoria(chatId),
      limparBuffer(chatId),
      limparDebounce(chatId),
    ])

    for (const result of redisResults) {
      if (result.status === "rejected") {
        console.warn("[limparDependenciasDoContato] Redis falhou:", result.reason)
      }
    }
  }

  await verificarSemDependencias({ contatoId, prontuarioIds })

  console.log("[limparDependenciasDoContato] Limpeza concluida", {
    contatoId,
    chatId,
    ...contagens,
    prontuarios: prontuarioIds.length,
  })
}

/**
 * Hash SHA-256 do WhatsApp com sufixo opcional do contatoId.
 * Garante unicidade entre soft-deletes. Idempotente para valores ja anonimizados.
 */
export function anonimizarWhatsapp(whatsapp: string, contatoId?: string): string {
  if (WHATSAPP_ANONIMIZADO_REGEX.test(whatsapp)) return whatsapp
  const hash = createHash("sha256").update(whatsapp).digest("hex")
  return contatoId ? `${hash}_${contatoId.slice(0, 8)}` : hash
}

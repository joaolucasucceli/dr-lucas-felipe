"use client"

export type ApiErrorKind =
  | "not_found"
  | "unauthorized"
  | "forbidden"
  | "validation"
  | "conflict"
  | "gone"
  | "server"
  | "network"
  | "unknown"

export interface ApiErrorInfo {
  kind: ApiErrorKind
  status?: number
  code?: string
  titulo: string
  mensagem: string
  retryable: boolean
  detalhes?: unknown
}

interface ApiErrorPayload {
  error?: string
  message?: string
  code?: string
  detalhes?: unknown
}

interface ApiErrorOptions {
  recurso?: string
  titulo404?: string
  mensagem404?: string
  fallback?: string
}

export class ApiError extends Error {
  info: ApiErrorInfo

  constructor(info: ApiErrorInfo) {
    super(info.mensagem)
    this.name = "ApiError"
    this.info = info
  }
}

function tituloRecurso(recurso?: string) {
  return recurso ? `${recurso} não encontrado` : "Registro não encontrado"
}

function classificarStatus(status: number): ApiErrorKind {
  if (status === 400) return "validation"
  if (status === 401) return "unauthorized"
  if (status === 403) return "forbidden"
  if (status === 404) return "not_found"
  if (status === 409) return "conflict"
  if (status === 410) return "gone"
  if (status >= 500) return "server"
  return "unknown"
}

function infoPorStatus(
  status: number,
  payload: ApiErrorPayload,
  options: ApiErrorOptions = {}
): ApiErrorInfo {
  const kind = classificarStatus(status)
  const mensagemApi = payload.message || payload.error

  if (kind === "not_found") {
    return {
      kind,
      status,
      code: payload.code,
      titulo: options.titulo404 || tituloRecurso(options.recurso),
      mensagem:
        options.mensagem404 ||
        mensagemApi ||
        "Esse registro pode ter sido excluído ou não está mais disponível.",
      retryable: false,
      detalhes: payload.detalhes,
    }
  }

  if (kind === "unauthorized") {
    return {
      kind,
      status,
      code: payload.code,
      titulo: "Sessão expirada",
      mensagem: "Entre novamente para continuar usando o painel.",
      retryable: false,
      detalhes: payload.detalhes,
    }
  }

  if (kind === "forbidden") {
    return {
      kind,
      status,
      code: payload.code,
      titulo: "Sem permissão",
      mensagem: mensagemApi || "Seu usuário não tem acesso a essa informação ou ação.",
      retryable: false,
      detalhes: payload.detalhes,
    }
  }

  if (kind === "gone") {
    return {
      kind,
      status,
      code: payload.code,
      titulo: "Operação descontinuada",
      mensagem: mensagemApi || "Essa operação não está mais disponível no sistema.",
      retryable: false,
      detalhes: payload.detalhes,
    }
  }

  if (kind === "conflict") {
    return {
      kind,
      status,
      code: payload.code,
      titulo: "Conflito de dados",
      mensagem: mensagemApi || "Já existe um registro com esses dados.",
      retryable: false,
      detalhes: payload.detalhes,
    }
  }

  if (kind === "validation") {
    return {
      kind,
      status,
      code: payload.code,
      titulo: "Dados inválidos",
      mensagem: mensagemApi || "Revise os campos informados e tente novamente.",
      retryable: false,
      detalhes: payload.detalhes,
    }
  }

  if (kind === "server") {
    return {
      kind,
      status,
      code: payload.code,
      titulo: "Não foi possível carregar agora",
      mensagem:
        options.fallback ||
        "Pode ter sido uma instabilidade temporária. Tente novamente em alguns segundos.",
      retryable: true,
      detalhes: payload.detalhes,
    }
  }

  return {
    kind,
    status,
    code: payload.code,
    titulo: "Erro inesperado",
    mensagem: mensagemApi || options.fallback || "Não foi possível concluir a operação.",
    retryable: true,
    detalhes: payload.detalhes,
  }
}

async function lerPayloadErro(res: Response): Promise<ApiErrorPayload> {
  try {
    const json = (await res.json()) as unknown
    return json && typeof json === "object" ? (json as ApiErrorPayload) : {}
  } catch {
    return {}
  }
}

export async function lerErroApi(
  res: Response,
  options?: ApiErrorOptions
): Promise<ApiErrorInfo> {
  const payload = await lerPayloadErro(res)
  return infoPorStatus(res.status, payload, options)
}

export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: ApiErrorOptions
): Promise<T> {
  let res: Response

  try {
    res = await fetch(input, init)
  } catch {
    throw new ApiError({
      kind: "network",
      titulo: "Não foi possível conectar",
      mensagem: "Verifique sua conexão e tente novamente.",
      retryable: true,
    })
  }

  if (!res.ok) {
    throw new ApiError(await lerErroApi(res, options))
  }

  return (await res.json()) as T
}

export function normalizarErroApi(
  erro: unknown,
  fallback = "Não foi possível concluir a operação."
): ApiErrorInfo {
  if (erro instanceof ApiError) return erro.info

  if (erro instanceof Error) {
    return {
      kind: "unknown",
      titulo: "Erro inesperado",
      mensagem: erro.message || fallback,
      retryable: true,
    }
  }

  return {
    kind: "unknown",
    titulo: "Erro inesperado",
    mensagem: fallback,
    retryable: true,
  }
}

"use client"

import Link from "next/link"
import { AlertTriangle, FileX, Lock, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ApiErrorInfo } from "@/lib/api-client"

type ErrorStateVariante = "erro" | "nao_encontrado" | "sem_permissao" | "descontinuado"

interface ErrorStateAcao {
  label: string
  href?: string
  onClick?: () => void
  variant?: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link"
}

interface ErrorStateProps {
  titulo?: string
  mensagem?: string
  descricao?: string
  variante?: ErrorStateVariante
  erro?: ApiErrorInfo | null
  acoes?: ErrorStateAcao[]
  onTentar?: () => void
}

export function ErrorState({
  titulo,
  mensagem,
  descricao,
  variante = "erro",
  erro,
  acoes,
  onTentar,
}: ErrorStateProps) {
  const tituloFinal = titulo ?? erro?.titulo
  const mensagemFinal =
    descricao ?? mensagem ?? erro?.mensagem ?? "Ocorreu um erro ao carregar os dados."
  const varianteFinal = erro
    ? erro.kind === "not_found"
      ? "nao_encontrado"
      : erro.kind === "forbidden" || erro.kind === "unauthorized"
        ? "sem_permissao"
        : erro.kind === "gone"
          ? "descontinuado"
          : "erro"
    : variante
  const mostrarTentar = onTentar && (erro ? erro.retryable : true)
  const Icone =
    varianteFinal === "nao_encontrado"
      ? FileX
      : varianteFinal === "sem_permissao"
        ? Lock
        : varianteFinal === "descontinuado"
          ? Trash2
          : AlertTriangle

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icone className="mb-4 h-10 w-10 text-destructive" />
      {tituloFinal && <h2 className="text-base font-semibold">{tituloFinal}</h2>}
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{mensagemFinal}</p>
      {(acoes?.length || mostrarTentar) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {acoes?.map((acao) =>
            acao.href ? (
              <Button key={acao.label} variant={acao.variant ?? "default"} asChild>
                <Link href={acao.href}>{acao.label}</Link>
              </Button>
            ) : (
              <Button
                key={acao.label}
                variant={acao.variant ?? "default"}
                onClick={acao.onClick}
              >
                {acao.label}
              </Button>
            )
          )}
          {mostrarTentar && (
            <Button variant="outline" onClick={onTentar}>
              Tentar novamente
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

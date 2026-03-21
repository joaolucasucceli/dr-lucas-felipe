"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Loader2, Check, AlertCircle } from "lucide-react"

type StatusSalvamento = "idle" | "pendente" | "salvando" | "salvo" | "erro"

interface UseAutosaveParams<T> {
  valor: T
  valorInicial: T
  onSalvar: (valor: T) => Promise<void>
  delay?: number
}

interface UseAutosaveReturn {
  status: StatusSalvamento
}

export function useAutosave<T>({
  valor,
  valorInicial,
  onSalvar,
  delay = 800,
}: UseAutosaveParams<T>): UseAutosaveReturn {
  const [status, setStatus] = useState<StatusSalvamento>("idle")
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const valorInicialRef = useRef(valorInicial)
  const isFirstRender = useRef(true)

  const salvar = useCallback(
    async (v: T) => {
      setStatus("salvando")
      try {
        await onSalvar(v)
        setStatus("salvo")
        setTimeout(() => setStatus("idle"), 2000)
      } catch {
        setStatus("erro")
        setTimeout(() => setStatus("idle"), 3000)
      }
    },
    [onSalvar]
  )

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    if (JSON.stringify(valor) === JSON.stringify(valorInicialRef.current)) {
      return
    }

    setStatus("pendente")

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      salvar(valor)
      valorInicialRef.current = valor
    }, delay)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [valor, delay, salvar])

  return { status }
}

export function IndicadorSalvamento({ status }: { status: StatusSalvamento }) {
  if (status === "idle") return null

  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      {status === "pendente" && (
        <>
          <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
          Não salvo
        </>
      )}
      {status === "salvando" && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          Salvando...
        </>
      )}
      {status === "salvo" && (
        <>
          <Check className="h-3 w-3 text-green-600" />
          Salvo
        </>
      )}
      {status === "erro" && (
        <>
          <AlertCircle className="h-3 w-3 text-red-600" />
          Erro ao salvar
        </>
      )}
    </span>
  )
}

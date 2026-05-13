"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Loader2, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type Estado = "idle" | "dirty" | "salvando" | "salvo" | "erro"

const SEM_VALOR_SELECT = "__SEM_VALOR__"

export interface OpcaoSelect {
  value: string
  label: string
}

interface CampoEditavelProps {
  label: string
  valor: string | null
  onSalvar: (novoValor: string | null) => Promise<void>
  tipo?: "text" | "email" | "tel" | "date" | "textarea" | "select"
  opcoes?: OpcaoSelect[]
  placeholder?: string
  editavel?: boolean
  motivoDesabilitado?: string
  validador?: (valor: string) => string | null
  mascara?: (valor: string) => string
  normalizar?: (valor: string) => string
  textareaRows?: number
  permiteVazio?: boolean
  rotuloVazio?: string
}

export function CampoEditavel({
  label,
  valor,
  onSalvar,
  tipo = "text",
  opcoes,
  placeholder,
  editavel = true,
  motivoDesabilitado,
  validador,
  mascara,
  normalizar,
  textareaRows = 3,
  permiteVazio = true,
  rotuloVazio = "Não informado",
}: CampoEditavelProps) {
  const [valorLocal, setValorLocal] = useState(valor ?? "")
  const [estado, setEstado] = useState<Estado>("idle")
  const [erro, setErro] = useState<string | null>(null)
  const [focado, setFocado] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ultimoSalvoRef = useRef(valor ?? "")
  const estadoRef = useRef<Estado>("idle")
  useEffect(() => {
    estadoRef.current = estado
  }, [estado])

  // Sincronizar com prop externa (realtime) sem atrapalhar edição
  useEffect(() => {
    const novoValor = valor ?? ""
    if (estadoRef.current === "idle" || estadoRef.current === "salvo") {
      setValorLocal(novoValor)
      ultimoSalvoRef.current = novoValor
    }
  }, [valor])

  async function dispararSalvar(valorBruto: string) {
    const normalizado = normalizar ? normalizar(valorBruto) : valorBruto
    const finalParaSalvar = normalizado.trim() === "" ? null : normalizado

    if (validador && finalParaSalvar !== null) {
      const err = validador(finalParaSalvar)
      if (err) {
        setErro(err)
        setEstado("erro")
        return
      }
    }

    if (!permiteVazio && finalParaSalvar === null) {
      setErro("Campo obrigatório")
      setEstado("erro")
      return
    }

    if ((finalParaSalvar ?? "") === ultimoSalvoRef.current) {
      setEstado("idle")
      setErro(null)
      return
    }

    setEstado("salvando")
    setErro(null)
    try {
      await onSalvar(finalParaSalvar)
      ultimoSalvoRef.current = finalParaSalvar ?? ""
      setEstado("salvo")
      setTimeout(() => {
        if (estadoRef.current === "salvo") setEstado("idle")
      }, 1500)
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar")
      setEstado("erro")
    }
  }

  function handleChange(novoBruto: string) {
    setValorLocal(novoBruto)
    setEstado("dirty")
    setErro(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      dispararSalvar(novoBruto)
    }, 800)
  }

  function handleBlur() {
    setFocado(false)
    if (estado === "dirty") {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      dispararSalvar(valorLocal)
    }
  }

  function handleSelectChange(novo: string) {
    const valorReal = novo === SEM_VALOR_SELECT ? "" : novo
    setValorLocal(valorReal)
    setEstado("dirty")
    setErro(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    dispararSalvar(valorReal)
  }

  // Não editável: render como texto puro
  if (!editavel) {
    const display = mascara && valor ? mascara(valor) : (valor ?? rotuloVazio)
    const elem = (
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <div className="text-sm text-foreground/90">{display || rotuloVazio}</div>
      </div>
    )
    if (motivoDesabilitado) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help">{elem}</div>
          </TooltipTrigger>
          <TooltipContent>{motivoDesabilitado}</TooltipContent>
        </Tooltip>
      )
    }
    return elem
  }

  const valorExibido = tipo === "select"
    ? valorLocal
    : (mascara && !focado && valorLocal ? mascara(valorLocal) : valorLocal)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <IndicadorEstado estado={estado} erro={erro} />
      </div>

      {tipo === "textarea" ? (
        <Textarea
          value={valorExibido}
          placeholder={placeholder}
          rows={textareaRows}
          aria-invalid={estado === "erro"}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setFocado(true)}
          onBlur={handleBlur}
        />
      ) : tipo === "select" ? (
        <Select
          value={valorLocal === "" ? SEM_VALOR_SELECT : valorLocal}
          onValueChange={handleSelectChange}
        >
          <SelectTrigger className={cn("w-full", estado === "erro" && "border-destructive")}>
            <SelectValue placeholder={placeholder ?? "Selecione"} />
          </SelectTrigger>
          <SelectContent>
            {permiteVazio && (
              <SelectItem value={SEM_VALOR_SELECT}>{rotuloVazio}</SelectItem>
            )}
            {(opcoes ?? []).map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          type={tipo}
          value={valorExibido}
          placeholder={placeholder}
          aria-invalid={estado === "erro"}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setFocado(true)}
          onBlur={handleBlur}
        />
      )}
    </div>
  )
}

function IndicadorEstado({ estado, erro }: { estado: Estado; erro: string | null }) {
  if (estado === "idle" || estado === "dirty") return null

  if (estado === "salvando") {
    return (
      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Salvando…
      </span>
    )
  }

  if (estado === "salvo") {
    return (
      <span className="flex items-center gap-1 text-[10px] text-emerald-500">
        <Check className="h-3 w-3" />
        Salvo
      </span>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="flex items-center gap-1 text-[10px] text-destructive cursor-help">
          <AlertCircle className="h-3 w-3" />
          Erro
        </span>
      </TooltipTrigger>
      <TooltipContent>{erro || "Erro ao salvar"}</TooltipContent>
    </Tooltip>
  )
}

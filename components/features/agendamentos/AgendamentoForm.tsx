"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Search, X } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FormDialog } from "@/components/features/shared/FormDialog"
import { useProcedimentos } from "@/hooks/use-procedimentos"
import { useContatos } from "@/hooks/use-contatos"
import {
  TIPOS_AGENDAMENTO,
  STATUS_AGENDAMENTO,
  ROTULOS_TIPO_AGENDAMENTO,
  type TipoAgendamento,
  type StatusAgendamento,
} from "@/lib/validations/agendamento"
import { formatarWhatsapp } from "@/lib/format"
import type { AgendamentoAgenda } from "@/hooks/use-agenda"

const ROTULOS_STATUS: Record<StatusAgendamento, string> = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  cancelado: "Cancelado",
  realizado: "Realizado",
  remarcado: "Remarcado",
}

const formSchema = z.object({
  contatoId: z.string().min(1, "Selecione um contato"),
  procedimentoId: z.string().nullable().optional(),
  tipo: z.enum(TIPOS_AGENDAMENTO),
  dataHora: z.string().min(10, "Data/hora obrigatória"),
  duracao: z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === "string" ? parseInt(v, 10) : v))
    .refine((v) => !isNaN(v) && v > 0, "Duração deve ser positiva"),
  observacao: z.string().nullable().optional(),
  status: z.enum(STATUS_AGENDAMENTO),
})

type FormData = z.input<typeof formSchema>

interface AgendamentoFormProps {
  agendamento?: AgendamentoAgenda | null
  aberto: boolean
  onFechar: () => void
  onSucesso: () => void
}

function isoParaInput(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  const hh = String(d.getHours()).padStart(2, "0")
  const mn = String(d.getMinutes()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}T${hh}:${mn}`
}

export function AgendamentoForm({
  agendamento,
  aberto,
  onFechar,
  onSucesso,
}: AgendamentoFormProps) {
  const editando = !!agendamento
  const [buscaContato, setBuscaContato] = useState("")
  const [contatoSelecionado, setContatoSelecionado] = useState<{
    id: string
    nome: string
    whatsapp: string | null
  } | null>(null)
  const [mostrarBusca, setMostrarBusca] = useState(false)

  const { dados: procedimentos } = useProcedimentos({ ativo: "true" })
  const { dados: contatosResultado } = useContatos({
    pagina: 1,
    porPagina: 8,
    busca: buscaContato || undefined,
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema) as never,
    defaultValues: {
      contatoId: "",
      procedimentoId: null,
      tipo: "consulta_online",
      dataHora: "",
      duracao: 60,
      observacao: "",
      status: "agendado",
    },
  })

  const tipoAtual = watch("tipo")
  const procedimentoIdAtual = watch("procedimentoId")
  const contatoIdAtual = watch("contatoId")

  // Reset do form quando abre / quando agendamento muda
  useEffect(() => {
    if (!aberto) return
    if (agendamento) {
      reset({
        contatoId: agendamento.contatoId,
        procedimentoId: agendamento.procedimentoId,
        tipo: agendamento.tipo,
        dataHora: isoParaInput(agendamento.dataHora),
        duracao: agendamento.duracao,
        observacao: agendamento.observacao,
        status: agendamento.status,
      })
      setContatoSelecionado(
        agendamento.contato
          ? {
              id: agendamento.contato.id,
              nome: agendamento.contato.nome,
              whatsapp: agendamento.contato.whatsapp,
            }
          : null
      )
      setMostrarBusca(false)
    } else {
      reset({
        contatoId: "",
        procedimentoId: null,
        tipo: "consulta_online",
        dataHora: "",
        duracao: 60,
        observacao: "",
        status: "agendado",
      })
      setContatoSelecionado(null)
      setBuscaContato("")
      setMostrarBusca(true)
    }
  }, [agendamento, aberto, reset])

  // Quando seleciona um procedimento, herda a duração padrão se ainda for default
  useEffect(() => {
    if (!procedimentoIdAtual) return
    const proc = procedimentos.find((p) => p.id === procedimentoIdAtual)
    if (proc && proc.duracaoMin) {
      setValue("duracao", proc.duracaoMin)
    }
  }, [procedimentoIdAtual, procedimentos, setValue])

  function selecionarContato(c: { id: string; nome: string; whatsapp: string | null }) {
    setContatoSelecionado(c)
    setValue("contatoId", c.id, { shouldValidate: true })
    setBuscaContato("")
    setMostrarBusca(false)
  }

  async function onSubmit(values: FormData) {
    const payload = {
      contatoId: values.contatoId,
      procedimentoId: values.procedimentoId || null,
      tipo: values.tipo,
      dataHora: new Date(values.dataHora).toISOString(),
      duracao: typeof values.duracao === "string" ? parseInt(values.duracao, 10) : values.duracao,
      observacao: values.observacao || null,
      status: values.status,
    }

    try {
      const url = editando ? `/api/agendamentos/${agendamento!.id}` : "/api/agendamentos"
      const method = editando ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const erro = await res.json().catch(() => ({}))
        toast.error(erro.error || "Erro ao salvar agendamento")
        return
      }

      const data = await res.json()
      const sincronizado = data?.sincronizado
      toast.success(
        editando
          ? "Agendamento atualizado"
          : sincronizado === false
            ? "Agendamento criado (sem sincronia Google)"
            : "Agendamento criado e sincronizado com Google Agenda"
      )
      onSucesso()
      onFechar()
    } catch {
      toast.error("Erro ao salvar agendamento")
    }
  }

  const opcoesContatoVisiveis = useMemo(
    () => contatosResultado.slice(0, 8),
    [contatosResultado]
  )

  return (
    <FormDialog
      aberto={aberto}
      onFechar={onFechar}
      titulo="Agendamento"
      editando={editando}
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit(onSubmit)}
      largura="lg"
    >
      {/* Contato */}
      <div className="grid gap-2">
        <Label>Contato</Label>
        {contatoSelecionado && !mostrarBusca ? (
          <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
            <div className="text-sm">
              <span className="font-medium">{contatoSelecionado.nome}</span>
              {contatoSelecionado.whatsapp && (
                <span className="ml-2 text-xs text-muted-foreground">
                  {formatarWhatsapp(contatoSelecionado.whatsapp)}
                </span>
              )}
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setMostrarBusca(true)
                setContatoSelecionado(null)
                setValue("contatoId", "")
              }}
            >
              <X className="h-3.5 w-3.5" />
              Trocar
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={buscaContato}
                onChange={(e) => setBuscaContato(e.target.value)}
                placeholder="Buscar por nome ou WhatsApp..."
                className="pl-8"
              />
            </div>
            {buscaContato && opcoesContatoVisiveis.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-md border bg-popover">
                {opcoesContatoVisiveis.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() =>
                      selecionarContato({
                        id: c.id,
                        nome: c.nome,
                        whatsapp: c.whatsapp,
                      })
                    }
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    <span className="font-medium">{c.nome}</span>
                    {c.whatsapp && (
                      <span className="text-xs text-muted-foreground">
                        {formatarWhatsapp(c.whatsapp)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
            {buscaContato && opcoesContatoVisiveis.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum contato encontrado</p>
            )}
          </div>
        )}
        {errors.contatoId && !contatoIdAtual && (
          <p className="text-xs text-destructive">{errors.contatoId.message}</p>
        )}
      </div>

      {/* Tipo + Data/hora */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Tipo de agendamento</Label>
          <Select
            value={tipoAtual}
            onValueChange={(v) => setValue("tipo", v as TipoAgendamento)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_AGENDAMENTO.map((t) => (
                <SelectItem key={t} value={t}>
                  {ROTULOS_TIPO_AGENDAMENTO[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="ag-data">Data e hora</Label>
          <Input
            id="ag-data"
            type="datetime-local"
            {...register("dataHora")}
          />
          {errors.dataHora && (
            <p className="text-xs text-destructive">{errors.dataHora.message}</p>
          )}
        </div>
      </div>

      {/* Procedimento + Duração */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Procedimento (opcional)</Label>
          <Select
            value={procedimentoIdAtual || "__nenhum__"}
            onValueChange={(v) => setValue("procedimentoId", v === "__nenhum__" ? null : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__nenhum__">Nenhum</SelectItem>
              {procedimentos.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="ag-duracao">Duração (min)</Label>
          <Input
            id="ag-duracao"
            type="number"
            min="5"
            step="5"
            {...register("duracao")}
          />
          {errors.duracao && (
            <p className="text-xs text-destructive">{errors.duracao.message as string}</p>
          )}
        </div>
      </div>

      {/* Status (só edição) */}
      {editando && (
        <div className="grid gap-2">
          <Label>Status</Label>
          <Select
            value={watch("status")}
            onValueChange={(v) => setValue("status", v as StatusAgendamento)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_AGENDAMENTO.map((s) => (
                <SelectItem key={s} value={s}>
                  {ROTULOS_STATUS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Observação */}
      <div className="grid gap-2">
        <Label htmlFor="ag-obs">Observação</Label>
        <Textarea
          id="ag-obs"
          {...register("observacao")}
          placeholder="Notas internas sobre o agendamento (opcional)"
          rows={3}
        />
      </div>
    </FormDialog>
  )
}

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
  STATUS_AGENDAMENTO,
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

// Input nativo type="datetime-local" tem formato MM/DD/AAAA em navegadores
// com locale en-US — confunde usuario brasileiro. Usamos 2 inputs:
// data em texto livre dd/mm/aaaa + hora type="time".
const REGEX_DATA_BR = /^(\d{2})\/(\d{2})\/(\d{4})$/

// Avaliacao online com Dr. Lucas: tipo e duracao sao FIXOS no painel
// (consulta_online + 60min). A clinica so agenda esse tipo via /agenda.
const formSchema = z.object({
  contatoId: z.string().min(1, "Selecione um contato"),
  procedimentoId: z.string().nullable().optional(),
  dataBr: z
    .string()
    .regex(REGEX_DATA_BR, "Use o formato dd/mm/aaaa"),
  hora: z.string().regex(/^\d{2}:\d{2}$/, "Hora obrigatória"),
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

function isoParaDataBr(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function isoParaHora(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  const hh = String(d.getHours()).padStart(2, "0")
  const mn = String(d.getMinutes()).padStart(2, "0")
  return `${hh}:${mn}`
}

function dataBrEHoraParaIso(dataBr: string, hora: string): string | null {
  const m = dataBr.match(REGEX_DATA_BR)
  if (!m) return null
  const [, dd, mm, yyyy] = m
  const hm = hora.match(/^(\d{2}):(\d{2})$/)
  if (!hm) return null
  const [, hh, mn] = hm
  const d = new Date(
    Number(yyyy),
    Number(mm) - 1,
    Number(dd),
    Number(hh),
    Number(mn)
  )
  if (isNaN(d.getTime())) return null
  // Sanity check: campos batem (evita 31/02 virando 03/03)
  if (
    d.getFullYear() !== Number(yyyy) ||
    d.getMonth() !== Number(mm) - 1 ||
    d.getDate() !== Number(dd)
  ) {
    return null
  }
  return d.toISOString()
}

/** Mascara dd/mm/aaaa enquanto o usuario digita. */
function mascararDataBr(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 8)
  if (digitos.length <= 2) return digitos
  if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`
  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`
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
      dataBr: "",
      hora: "",
      observacao: "",
      status: "agendado",
    },
  })

  const procedimentoIdAtual = watch("procedimentoId")
  const contatoIdAtual = watch("contatoId")

  // Reset do form quando abre / quando agendamento muda
  useEffect(() => {
    if (!aberto) return
    if (agendamento) {
      reset({
        contatoId: agendamento.contatoId,
        procedimentoId: agendamento.procedimentoId,
        dataBr: isoParaDataBr(agendamento.dataHora),
        hora: isoParaHora(agendamento.dataHora),
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
        dataBr: "",
        hora: "",
        observacao: "",
        status: "agendado",
      })
      setContatoSelecionado(null)
      setBuscaContato("")
      setMostrarBusca(true)
    }
  }, [agendamento, aberto, reset])

  function selecionarContato(c: { id: string; nome: string; whatsapp: string | null }) {
    setContatoSelecionado(c)
    setValue("contatoId", c.id, { shouldValidate: true })
    setBuscaContato("")
    setMostrarBusca(false)
  }

  async function onSubmit(values: FormData) {
    const dataIso = dataBrEHoraParaIso(values.dataBr, values.hora)
    if (!dataIso) {
      toast.error("Data ou hora inválida")
      return
    }

    // Avaliacao online: tipo e duracao sempre fixos (clinica nao agenda
    // outros tipos pelo painel — Ana Julia tambem so agenda esse).
    const payload = {
      contatoId: values.contatoId,
      procedimentoId: values.procedimentoId || null,
      tipo: "consulta_online" as const,
      dataHora: dataIso,
      duracao: 60,
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

      {/* Data + Hora + Procedimento (informativo) */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="ag-data">Data</Label>
          <Input
            id="ag-data"
            type="text"
            inputMode="numeric"
            placeholder="dd/mm/aaaa"
            maxLength={10}
            {...register("dataBr", {
              onChange: (e) => {
                e.target.value = mascararDataBr(e.target.value)
              },
            })}
          />
          {errors.dataBr && (
            <p className="text-xs text-destructive">{errors.dataBr.message}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="ag-hora">Hora</Label>
          <Input
            id="ag-hora"
            type="time"
            step="60"
            {...register("hora")}
          />
          {errors.hora && (
            <p className="text-xs text-destructive">{errors.hora.message}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label>Procedimento <span className="text-muted-foreground font-normal text-xs">(opcional)</span></Label>
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
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Avaliação online com o Dr. Lucas — duração fixa de 1h.
      </p>

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

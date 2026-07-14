"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FormDialog } from "@/components/features/shared/FormDialog"
import { useProcedimentos } from "@/hooks/use-procedimentos"
import {
  STATUS_AGENDAMENTO,
  type StatusAgendamento,
} from "@/lib/validations/agendamento"
import { formatarWhatsapp } from "@/lib/format"
import { isoParaDataBr, isoParaHora } from "@/lib/agendamento/data-br"
import type { AgendamentoAgenda } from "@/hooks/use-agenda"

const ROTULOS_STATUS: Record<StatusAgendamento, string> = {
  agendado: "Agendado",
  cancelado: "Cancelado",
  remarcado: "Remarcado",
}

// Edicao apenas — agendamentos sao criados exclusivamente pela Ana Julia
// via WhatsApp. Para mudar data/hora use "Reagendar" no menu da agenda.
const formSchema = z.object({
  procedimentoId: z.string().nullable().optional(),
  observacao: z.string().nullable().optional(),
  status: z.enum(STATUS_AGENDAMENTO),
})

type FormData = z.input<typeof formSchema>

interface AgendamentoFormProps {
  agendamento: AgendamentoAgenda | null
  aberto: boolean
  onFechar: () => void
  onSucesso: () => void
}

export function AgendamentoForm({
  agendamento,
  aberto,
  onFechar,
  onSucesso,
}: AgendamentoFormProps) {
  const { dados: procedimentos } = useProcedimentos({})

  const {
    handleSubmit,
    setValue,
    watch,
    reset,
    register,
    formState: { isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema) as never,
    defaultValues: {
      procedimentoId: null,
      observacao: "",
      status: "agendado",
    },
  })

  const procedimentoIdAtual = watch("procedimentoId")

  useEffect(() => {
    if (!aberto || !agendamento) return
    reset({
      procedimentoId: agendamento.procedimentoId,
      observacao: agendamento.observacao,
      status: agendamento.status,
    })
  }, [agendamento, aberto, reset])

  async function onSubmit(values: FormData) {
    if (!agendamento) return

    try {
      const res = await fetch(`/api/agendamentos/${agendamento.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          procedimentoId: values.procedimentoId || null,
          observacao: values.observacao || null,
          status: values.status,
        }),
      })

      if (!res.ok) {
        const erro = await res.json().catch(() => ({}))
        toast.error(erro.error || "Erro ao salvar agendamento")
        return
      }

      toast.success("Agendamento atualizado")
      onSucesso()
      onFechar()
    } catch {
      toast.error("Erro ao salvar agendamento")
    }
  }

  if (!agendamento) return null

  return (
    <FormDialog
      aberto={aberto}
      onFechar={onFechar}
      titulo="Editar agendamento"
      editando
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit(onSubmit)}
      largura="lg"
    >
      <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
        <span className="font-medium">{agendamento.contato?.nome ?? "Paciente"}</span>
        {agendamento.contato?.whatsapp && (
          <span className="ml-2 text-xs text-muted-foreground">
            {formatarWhatsapp(agendamento.contato.whatsapp)}
          </span>
        )}
      </div>

      <div className="rounded-md border bg-muted/30 p-3 text-sm">
        <p className="text-xs font-medium text-muted-foreground mb-1">
          Agendado para
        </p>
        <p>
          {isoParaDataBr(agendamento.dataHora)} às {isoParaHora(agendamento.dataHora)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Pra mudar data/hora, use a opção <strong>Reagendar</strong> no menu da agenda.
        </p>
      </div>

      <div className="grid gap-2">
        <Label>Procedimento de interesse <span className="text-muted-foreground font-normal text-xs">(opcional)</span></Label>
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

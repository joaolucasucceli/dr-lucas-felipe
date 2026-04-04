"use client"

import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const funilConfig: Record<string, { label: string; classes: string; descricao: string }> = {
  acolhimento: { label: "Acolhimento", classes: "bg-zinc-100 text-zinc-800", descricao: "Etapa 1 — Lead acabou de entrar no funil" },
  qualificacao: { label: "Qualificação", classes: "bg-blue-100 text-blue-800", descricao: "Etapa 2 — Agente coletando informações do paciente" },
  agendamento: { label: "Agendamento", classes: "bg-indigo-100 text-indigo-800", descricao: "Etapa 3 — Agente tentando marcar a consulta" },
  consulta_agendada: { label: "Consulta Agendada", classes: "bg-purple-100 text-purple-800", descricao: "Etapa 4 — Consulta marcada, aguardando realização" },
  consulta_realizada: { label: "Consulta Realizada", classes: "bg-green-100 text-green-800", descricao: "Etapa 5 — Consulta aconteceu, aguardando decisão" },
  sinal_pago: { label: "Sinal Pago", classes: "bg-emerald-100 text-emerald-800", descricao: "Etapa 6 — Paciente pagou o sinal do procedimento" },
  procedimento_agendado: { label: "Proc. Agendado", classes: "bg-amber-100 text-amber-800", descricao: "Etapa 7 — Procedimento agendado, próximo da conclusão" },
  concluido: { label: "Concluído", classes: "bg-green-200 text-green-900", descricao: "Etapa 8 — Atendimento concluído com sucesso" },
  perdido: { label: "Perdido", classes: "bg-red-100 text-red-800", descricao: "Lead não convertido — saiu do funil" },
}

const evolucaoConfig: Record<string, { label: string; classes: string; descricao: string }> = {
  consulta: { label: "Consulta", classes: "bg-blue-100 text-blue-800", descricao: "Registro de consulta médica" },
  procedimento: { label: "Procedimento", classes: "bg-purple-100 text-purple-800", descricao: "Registro de procedimento realizado" },
  retorno: { label: "Retorno", classes: "bg-green-100 text-green-800", descricao: "Consulta de retorno pós-procedimento" },
  prescricao: { label: "Prescrição", classes: "bg-amber-100 text-amber-800", descricao: "Prescrição médica emitida" },
  intercorrencia: { label: "Intercorrência", classes: "bg-red-100 text-red-800", descricao: "Intercorrência ou complicação registrada" },
  observacao: { label: "Observação", classes: "bg-zinc-100 text-zinc-800", descricao: "Observação geral sobre o paciente" },
}

const agendamentoConfig: Record<string, { label: string; classes: string; descricao: string }> = {
  agendado: { label: "Agendado", classes: "bg-blue-100 text-blue-800", descricao: "Agendamento confirmado, aguardando a data" },
  confirmado: { label: "Confirmado", classes: "bg-green-100 text-green-800", descricao: "Paciente confirmou presença" },
  cancelado: { label: "Cancelado", classes: "bg-red-100 text-red-800", descricao: "Agendamento foi cancelado" },
  realizado: { label: "Realizado", classes: "bg-emerald-100 text-emerald-800", descricao: "Consulta/procedimento foi realizado" },
  remarcado: { label: "Remarcado", classes: "bg-amber-100 text-amber-800", descricao: "Agendamento foi reagendado para nova data" },
}

interface StatusBadgeProps {
  status: string
  variante?: "funil" | "agendamento" | "evolucao"
  className?: string
}

export function StatusBadge({ status, variante = "funil", className }: StatusBadgeProps) {
  const configs = { funil: funilConfig, agendamento: agendamentoConfig, evolucao: evolucaoConfig }
  const config = configs[variante]
  const item = config[status]

  if (!item) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800",
          className
        )}
      >
        {status}
      </span>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex cursor-default items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
            item.classes,
            className
          )}
        >
          {item.label}
        </span>
      </TooltipTrigger>
      <TooltipContent>{item.descricao}</TooltipContent>
    </Tooltip>
  )
}

export function getStatusFunilLabel(status: string): string {
  return funilConfig[status]?.label || status
}

export function getStatusAgendamentoLabel(status: string): string {
  return agendamentoConfig[status]?.label || status
}

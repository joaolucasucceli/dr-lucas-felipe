"use client"

import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const funilConfig: Record<string, { label: string; classes: string; descricao: string }> = {
  acolhimento: { label: "Acolhimento", classes: "bg-zinc-100 text-zinc-800", descricao: "Etapa 1 — Lead acabou de entrar no funil" },
  qualificacao: { label: "Qualificação", classes: "bg-blue-100 text-blue-800", descricao: "Etapa 2 — Ana Júlia coletando nome, procedimento e qualificação comercial" },
  agendamento: { label: "Agendamento", classes: "bg-indigo-100 text-indigo-800", descricao: "Etapa 3 — Ana Júlia negociando horário com o paciente" },
  consulta_agendada: { label: "Reunião Agendada", classes: "bg-purple-100 text-purple-800", descricao: "Etapa 4 — Horário confirmado e evento no Google Calendar" },
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

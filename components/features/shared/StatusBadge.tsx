"use client"

import { cn } from "@/lib/utils"

const funilConfig: Record<string, { label: string; classes: string }> = {
  primeiro_atendimento: { label: "Primeiro Atendimento", classes: "bg-zinc-100 text-zinc-800" },
  qualificacao: { label: "Qualificação", classes: "bg-blue-100 text-blue-800" },
  agendamento: { label: "Agendamento", classes: "bg-indigo-100 text-indigo-800" },
  consulta_agendada: { label: "Consulta Agendada", classes: "bg-purple-100 text-purple-800" },
  consulta_realizada: { label: "Consulta Realizada", classes: "bg-green-100 text-green-800" },
  sinal_pago: { label: "Sinal Pago", classes: "bg-emerald-100 text-emerald-800" },
  procedimento_agendado: { label: "Procedimento Agendado", classes: "bg-amber-100 text-amber-800" },
  concluido: { label: "Concluído", classes: "bg-green-200 text-green-900" },
  perdido: { label: "Perdido", classes: "bg-red-100 text-red-800" },
}

const agendamentoConfig: Record<string, { label: string; classes: string }> = {
  agendado: { label: "Agendado", classes: "bg-blue-100 text-blue-800" },
  confirmado: { label: "Confirmado", classes: "bg-green-100 text-green-800" },
  cancelado: { label: "Cancelado", classes: "bg-red-100 text-red-800" },
  realizado: { label: "Realizado", classes: "bg-emerald-100 text-emerald-800" },
  remarcado: { label: "Remarcado", classes: "bg-amber-100 text-amber-800" },
}

interface StatusBadgeProps {
  status: string
  variante?: "funil" | "agendamento"
  className?: string
}

export function StatusBadge({ status, variante = "funil", className }: StatusBadgeProps) {
  const config = variante === "funil" ? funilConfig : agendamentoConfig
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
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        item.classes,
        className
      )}
    >
      {item.label}
    </span>
  )
}

export function getStatusFunilLabel(status: string): string {
  return funilConfig[status]?.label || status
}

export function getStatusAgendamentoLabel(status: string): string {
  return agendamentoConfig[status]?.label || status
}

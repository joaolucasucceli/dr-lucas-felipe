"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface UserAvatarProps {
  nome: string
  tamanho?: "sm" | "md" | "lg"
  className?: string
}

function getIniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  if (partes.length === 1) return partes[0][0].toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

function getCorFromNome(nome: string): string {
  const cores = [
    "bg-red-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-purple-500",
    "bg-pink-500",
  ]
  let hash = 0
  for (let i = 0; i < nome.length; i++) {
    hash = nome.charCodeAt(i) + ((hash << 5) - hash)
  }
  return cores[Math.abs(hash) % cores.length]
}

const tamanhos = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-11 w-11 text-base",
}

export function UserAvatar({ nome, tamanho = "md", className }: UserAvatarProps) {
  return (
    <Avatar className={cn(tamanhos[tamanho], className)}>
      <AvatarFallback className={cn(getCorFromNome(nome), "text-white font-medium")}>
        {getIniciais(nome)}
      </AvatarFallback>
    </Avatar>
  )
}

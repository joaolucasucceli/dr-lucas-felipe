"use client"

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import type { RealtimeChannel } from "@supabase/supabase-js"
import { toast } from "sonner"

// Tópicos que os hooks podem escutar
export type Topico = "leads" | "mensagens" | "agendamentos" | "conversas" | "pacientes"

// Mapeamento: nome da tabela Postgres → tópico
const TABELA_PARA_TOPICO: Record<string, Topico> = {
  leads: "leads",
  mensagens_whatsapp: "mensagens",
  agendamentos: "agendamentos",
  conversas: "conversas",
  pacientes: "pacientes",
}

type ListenersMap = Map<Topico, Set<() => void>>

interface RealtimeContexto {
  inscrever: (topico: Topico, callback: () => void) => () => void
}

const RealtimeCtx = createContext<RealtimeContexto | null>(null)

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const listenersRef = useRef<ListenersMap>(new Map())
  const canalRef = useRef<RealtimeChannel | null>(null)
  const debounceTimersRef = useRef<Map<Topico, NodeJS.Timeout>>(new Map())

  const inscrever = useCallback((topico: Topico, callback: () => void) => {
    const map = listenersRef.current
    if (!map.has(topico)) map.set(topico, new Set())
    map.get(topico)!.add(callback)

    return () => {
      map.get(topico)?.delete(callback)
    }
  }, [])

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return

    const supabase = getSupabaseBrowser()

    function notificar(tabela: string, eventType: string, payload: Record<string, unknown>) {
      const topico = TABELA_PARA_TOPICO[tabela]
      if (!topico) return

      // Debounce 300ms por tópico
      const timers = debounceTimersRef.current
      if (timers.has(topico)) clearTimeout(timers.get(topico)!)
      timers.set(
        topico,
        setTimeout(() => {
          listenersRef.current.get(topico)?.forEach((cb) => cb())
          timers.delete(topico)
        }, 300)
      )

      // Toasts para eventos importantes (sem debounce)
      if (eventType === "INSERT" && tabela === "leads") {
        const nome = (payload as Record<string, string>).nome || "Novo lead"
        toast.info("Novo lead recebido!", { description: nome })
      }

      if (
        eventType === "INSERT" &&
        tabela === "mensagens_whatsapp" &&
        (payload as Record<string, string>).remetente === "paciente"
      ) {
        toast.info("Nova mensagem recebida")
      }
    }

    let canal = supabase.channel("central-realtime")

    for (const tabela of Object.keys(TABELA_PARA_TOPICO)) {
      canal = canal.on(
        "postgres_changes" as const,
        { event: "*", schema: "public", table: tabela },
        (payload) => {
          notificar(payload.table, payload.eventType, (payload.new ?? {}) as Record<string, unknown>)
        }
      )
    }

    canal.subscribe()
    canalRef.current = canal

    return () => {
      supabase.removeChannel(canal)
      debounceTimersRef.current.forEach((timer) => clearTimeout(timer))
      debounceTimersRef.current.clear()
    }
  }, [])

  return (
    <RealtimeCtx.Provider value={{ inscrever }}>
      {children}
    </RealtimeCtx.Provider>
  )
}

/**
 * Hook para escutar mudanças em uma tabela específica via Supabase Realtime.
 * Quando a tabela muda, o callback é chamado (com debounce de 300ms).
 */
export function useRealtimeTabela(topico: Topico, callback: () => void) {
  const ctx = useContext(RealtimeCtx)
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (!ctx) return
    const desinscrever = ctx.inscrever(topico, () => callbackRef.current())
    return desinscrever
  }, [ctx, topico])
}

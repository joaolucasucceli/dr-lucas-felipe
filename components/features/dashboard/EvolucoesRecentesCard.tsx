"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Stethoscope, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatarData } from "@/lib/format"

// JLU-171 (E 25/05): dashboard card mostrando as 5 ultimas evolucoes
// medicas registradas (qualquer paciente). Click leva pro prontuario.

interface Evolucao {
  id: string
  titulo: string
  tipo: string
  conteudo: string
  dataRegistro: string
  prontuarioId: string
  prontuario: {
    id: string
    contatoId: string
    contato: { id: string; nome: string } | null
  } | null
}

const TIPO_LABEL: Record<string, string> = {
  consulta: "Consulta",
  retorno: "Retorno",
  pre_operatorio: "Pré-op",
  pos_operatorio: "Pós-op",
  anamnese: "Anamnese",
  procedimento: "Procedimento",
  outro: "Outro",
}

export function EvolucoesRecentesCard() {
  const [evolucoes, setEvolucoes] = useState<Evolucao[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let cancel = false
    fetch("/api/dashboard/evolucoes-recentes")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => {
        if (!cancel) setEvolucoes(j.evolucoes ?? [])
      })
      .catch(() => {
        if (!cancel) setEvolucoes([])
      })
      .finally(() => {
        if (!cancel) setCarregando(false)
      })
    return () => {
      cancel = true
    }
  }, [])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-emerald-500" />
          Evoluções recentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {carregando ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : evolucoes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhuma evolução registrada ainda. Quando você escrever uma evolução no prontuário de um paciente, aparece aqui.
          </p>
        ) : (
          <ul className="space-y-3">
            {evolucoes.map((ev) => {
              const contato = ev.prontuario?.contato
              const linkHref = contato ? `/contatos/${contato.id}` : "#"
              return (
                <li key={ev.id}>
                  <Link
                    href={linkHref}
                    className="group flex items-start justify-between gap-3 rounded-md border border-transparent p-2 -mx-2 transition hover:border-border hover:bg-accent/50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">
                          {contato?.nome ?? "(paciente)"}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {TIPO_LABEL[ev.tipo] ?? ev.tipo}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground truncate">
                        {ev.titulo}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatarData(ev.dataRegistro, "dd/MM/yyyy 'às' HH:mm")}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground mt-1 opacity-0 transition group-hover:opacity-100" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

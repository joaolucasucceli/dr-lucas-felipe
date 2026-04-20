"use client"

import { useState, useEffect, Suspense } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { KanbanView } from "@/components/features/kanban/KanbanView"
import { ContatoForm } from "@/components/features/contatos/ContatoForm"
import { NovoAtendimentoModal } from "@/components/features/kanban/NovoAtendimentoModal"

interface Procedimento {
  id: string
  nome: string
}

export default function AtendimentosPage() {
  const [novoContatoAberto, setNovoLeadAberto] = useState(false)
  const [novoAtendimentoAberto, setNovoAtendimentoAberto] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([])

  useEffect(() => {
    fetch("/api/procedimentos")
      .then((r) => r.json())
      .then((data) => setProcedimentos(data.dados || []))
      .catch(() => {})
  }, [])

  return (
    <div className="h-full">
      <PageHeader
        titulo="Atendimentos"
        descricao="Visualize e gerencie o funil de atendimento"
      >
        <Button
          variant="outline"
          onClick={() => setNovoAtendimentoAberto(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Atendimento
        </Button>
        <Button onClick={() => setNovoLeadAberto(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Lead
        </Button>
      </PageHeader>

      <div className="mt-4">
        <Suspense>
          <KanbanView externalRefresh={refreshKey} />
        </Suspense>
      </div>

      <ContatoForm
        aberto={novoContatoAberto}
        onFechar={() => setNovoLeadAberto(false)}
        onSucesso={() => {
          setNovoLeadAberto(false)
          setRefreshKey((k) => k + 1)
        }}
        procedimentos={procedimentos}
      />

      <NovoAtendimentoModal
        aberto={novoAtendimentoAberto}
        onFechar={() => setNovoAtendimentoAberto(false)}
        onSucesso={() => {
          setNovoAtendimentoAberto(false)
          setRefreshKey((k) => k + 1)
        }}
      />
    </div>
  )
}

"use client"

import { useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { EmptyState } from "@/components/features/shared/EmptyState"
import { ErrorState } from "@/components/features/shared/ErrorState"
import { SprintCard } from "@/components/features/roadmap/SprintCard"
import { SprintForm } from "@/components/features/roadmap/SprintForm"
import { ConfirmDialog } from "@/components/features/shared/ConfirmDialog"
import { useSprints, type Sprint } from "@/hooks/use-sprints"

export default function RoadmapPage() {
  const { data: session } = useSession()
  const [filtroStatus, setFiltroStatus] = useState<string>("todos")
  const [formAberto, setFormAberto] = useState(false)
  const [sprintEditando, setSprintEditando] = useState<Sprint | null>(null)
  const [sprintDeletando, setSprintDeletando] = useState<Sprint | null>(null)

  const statusParam = filtroStatus === "todos" ? undefined : filtroStatus
  const { dados, carregando, erro, recarregar } = useSprints({ status: statusParam })

  const isGestor =
    session?.user?.perfil === "gestor" ||
    session?.user?.perfil === "desenvolvedor"

  function handleEditar(sprint: Sprint) {
    setSprintEditando(sprint)
    setFormAberto(true)
  }

  async function handleConfirmarDeletar() {
    if (!sprintDeletando) return

    try {
      const res = await fetch(`/api/sprints/${sprintDeletando.id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const erro = await res.json()
        toast.error(erro.error || "Erro ao remover sprint")
        return
      }

      toast.success("Sprint removida")
      recarregar()
    } catch {
      toast.error("Erro ao remover sprint")
    } finally {
      setSprintDeletando(null)
    }
  }

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      if (!result.destination) return
      if (result.source.index === result.destination.index) return

      const reordenados = Array.from(dados)
      const [removido] = reordenados.splice(result.source.index, 1)
      reordenados.splice(result.destination.index, 0, removido)

      const itens = reordenados.map((sprint, index) => ({
        id: sprint.id,
        ordem: index,
      }))

      try {
        const res = await fetch("/api/sprints/reorder", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itens }),
        })

        if (!res.ok) {
          toast.error("Erro ao reordenar sprints")
          return
        }

        recarregar()
      } catch {
        toast.error("Erro ao reordenar sprints")
      }
    },
    [dados, recarregar]
  )

  if (erro) {
    return (
      <div>
        <PageHeader titulo="Roadmap" />
        <div className="mt-6">
          <ErrorState mensagem={erro} onTentar={recarregar} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        titulo="Roadmap"
        descricao="Acompanhe o progresso das sprints do projeto"
      >
        {isGestor && (
          <Button
            onClick={() => {
              setSprintEditando(null)
              setFormAberto(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Sprint
          </Button>
        )}
      </PageHeader>

      <div className="mt-6">
        <Tabs value={filtroStatus} onValueChange={setFiltroStatus}>
          <TabsList>
            <TabsTrigger value="todos">Todas</TabsTrigger>
            <TabsTrigger value="planejada">Planejadas</TabsTrigger>
            <TabsTrigger value="em_andamento">Em andamento</TabsTrigger>
            <TabsTrigger value="concluida">Concluídas</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="mt-4">
        {!carregando && dados.length === 0 ? (
          <EmptyState
            titulo="Nenhuma sprint"
            descricao="Crie a primeira sprint do roadmap."
            textoBotao={isGestor ? "Nova Sprint" : undefined}
            onAcao={
              isGestor
                ? () => {
                    setSprintEditando(null)
                    setFormAberto(true)
                  }
                : undefined
            }
          />
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="sprints">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {dados.map((sprint, index) => (
                    <Draggable key={sprint.id} draggableId={sprint.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                        >
                          <SprintCard
                            sprint={sprint}
                            onEditar={handleEditar}
                            onDeletar={setSprintDeletando}
                            onAtualizar={recarregar}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      <SprintForm
        sprint={sprintEditando}
        aberto={formAberto}
        onFechar={() => {
          setFormAberto(false)
          setSprintEditando(null)
        }}
        onSucesso={() => {
          setFormAberto(false)
          setSprintEditando(null)
          recarregar()
        }}
      />

      <ConfirmDialog
        titulo="Remover Sprint"
        descricao={`Tem certeza que deseja remover a sprint "${sprintDeletando?.nome}"? Todos os itens da checklist serão removidos.`}
        aberto={!!sprintDeletando}
        onFechar={() => setSprintDeletando(null)}
        onConfirmar={handleConfirmarDeletar}
        variante="destrutivo"
        textoBotao="Remover"
      />
    </div>
  )
}

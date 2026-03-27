"use client"

import { useState } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Plus, ChevronDown, ChevronUp, Pencil, Trash2, Stethoscope } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/features/shared/StatusBadge"
import { ConfirmDialog } from "@/components/features/shared/ConfirmDialog"
import { FormEvolucao } from "./FormEvolucao"
import { DetalheRegistroCirurgico } from "./DetalheRegistroCirurgico"
import { FormRegistroCirurgico } from "./FormRegistroCirurgico"
import type { Evolucao } from "@/hooks/use-prontuario"

interface TimelineEvolucaoProps {
  evolucoes: Evolucao[]
  pacienteId: string
  onAtualizar: () => void
}

export function TimelineEvolucao({ evolucoes, pacienteId, onAtualizar }: TimelineEvolucaoProps) {
  const [expandido, setExpandido] = useState<string | null>(null)
  const [formAberto, setFormAberto] = useState(false)
  const [editando, setEditando] = useState<Evolucao | null>(null)
  const [confirmExcluir, setConfirmExcluir] = useState<string | null>(null)
  const [regCirurgicoAberto, setRegCirurgicoAberto] = useState<string | null>(null)

  function toggleExpand(id: string) {
    setExpandido(expandido === id ? null : id)
  }

  function handleEditar(evolucao: Evolucao) {
    setEditando(evolucao)
    setFormAberto(true)
  }

  function handleFecharForm() {
    setFormAberto(false)
    setEditando(null)
  }

  async function handleExcluir(evolucaoId: string) {
    try {
      const res = await fetch(
        `/api/pacientes/${pacienteId}/prontuario/evolucoes/${evolucaoId}`,
        { method: "DELETE" }
      )
      if (!res.ok) throw new Error()
      toast.success("Evolução removida")
      onAtualizar()
    } catch {
      toast.error("Erro ao remover evolução")
    } finally {
      setConfirmExcluir(null)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Evolução Clínica</CardTitle>
          <Button size="sm" onClick={() => setFormAberto(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Evolução
          </Button>
        </CardHeader>
        <CardContent>
          {evolucoes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma evolução registrada.
            </p>
          ) : (
            <div className="space-y-3">
              {evolucoes.map((ev) => {
                const isExpanded = expandido === ev.id
                return (
                  <div
                    key={ev.id}
                    className="border rounded-lg p-4 transition-colors hover:bg-muted/50"
                  >
                    <div
                      className="flex items-start justify-between cursor-pointer"
                      onClick={() => toggleExpand(ev.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusBadge status={ev.tipo} variante="evolucao" />
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(ev.dataRegistro), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <h4 className="font-medium text-sm">{ev.titulo}</h4>
                        {!isExpanded && (
                          <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                            {ev.conteudo}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditar(ev)
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            setConfirmExcluir(ev.id)
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t space-y-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Conteúdo</p>
                          <p className="text-sm whitespace-pre-wrap">{ev.conteudo}</p>
                        </div>

                        {ev.prescricao && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Prescrição</p>
                            <p className="text-sm whitespace-pre-wrap">{ev.prescricao}</p>
                          </div>
                        )}

                        {ev.orientacoes && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Orientações</p>
                            <p className="text-sm whitespace-pre-wrap">{ev.orientacoes}</p>
                          </div>
                        )}

                        {ev.procedimento && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Procedimento</p>
                            <p className="text-sm">{ev.procedimento.nome}</p>
                          </div>
                        )}

                        {/* Registro Cirúrgico — só para evoluções tipo "procedimento" */}
                        {ev.tipo === "procedimento" && ev.registroCirurgico && (
                          <DetalheRegistroCirurgico
                            registro={ev.registroCirurgico}
                            pacienteId={pacienteId}
                            evolucaoId={ev.id}
                            onAtualizar={onAtualizar}
                          />
                        )}

                        {ev.tipo === "procedimento" && !ev.registroCirurgico && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={(e) => {
                              e.stopPropagation()
                              setRegCirurgicoAberto(ev.id)
                            }}
                          >
                            <Stethoscope className="mr-2 h-3.5 w-3.5" />
                            Registrar Detalhes Cirúrgicos
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <FormEvolucao
        aberto={formAberto}
        onFechar={handleFecharForm}
        pacienteId={pacienteId}
        evolucao={editando}
        onSalvar={onAtualizar}
      />

      {regCirurgicoAberto && (
        <FormRegistroCirurgico
          aberto={true}
          onFechar={() => setRegCirurgicoAberto(null)}
          pacienteId={pacienteId}
          evolucaoId={regCirurgicoAberto}
          onSalvar={onAtualizar}
        />
      )}

      <ConfirmDialog
        aberto={!!confirmExcluir}
        onFechar={() => setConfirmExcluir(null)}
        onConfirmar={() => confirmExcluir && handleExcluir(confirmExcluir)}
        titulo="Excluir Evolução"
        descricao="Tem certeza que deseja excluir este registro de evolução?"
        textoBotao="Excluir"
        variante="destrutivo"
      />
    </>
  )
}

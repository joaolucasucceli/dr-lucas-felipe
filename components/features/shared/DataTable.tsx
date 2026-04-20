"use client"

import { useState, useMemo } from "react"
import { ArrowUpDown, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ConfirmDialog } from "@/components/features/shared/ConfirmDialog"
import { cn } from "@/lib/utils"

export interface ColunaConfig<T> {
  chave: keyof T | string
  titulo: string
  renderizar?: (item: T) => React.ReactNode
  ordenavel?: boolean
  classesCelula?: string
}

export interface AcaoEmMassa {
  label: string
  icone?: React.ReactNode
  variante?: "destrutivo" | "padrao"
  onClick: (ids: string[]) => Promise<void> | void
  confirmacao?: {
    titulo: string
    descricao: (qtd: number) => string
    textoBotao?: string
  }
}

interface DataTableProps<T> {
  colunas: ColunaConfig<T>[]
  dados: T[]
  total: number
  pagina: number
  porPagina: number
  onPaginaChange: (pagina: number) => void
  onOrdenar?: (campo: string, direcao: "asc" | "desc") => void
  ordenacao?: { campo: string; direcao: "asc" | "desc" }
  carregando?: boolean
  vazio?: React.ReactNode
  mensagemVazio?: string
  filtros?: React.ReactNode
  onLinhaClick?: (item: T) => void
  selecionavel?: boolean
  acoesEmMassa?: AcaoEmMassa[]
  /** Opcional: função que determina se um item pode ser selecionado. Default: todos. */
  podeSelecionar?: (item: T) => boolean
}

export function DataTable<T extends { id?: string }>({
  colunas,
  dados,
  total,
  pagina,
  porPagina,
  onPaginaChange,
  onOrdenar,
  ordenacao,
  carregando,
  vazio,
  mensagemVazio,
  filtros,
  onLinhaClick,
  selecionavel,
  acoesEmMassa,
  podeSelecionar,
}: DataTableProps<T>) {
  const totalPaginas = Math.ceil(total / porPagina)
  const inicio = (pagina - 1) * porPagina + 1
  const fim = Math.min(pagina * porPagina, total)

  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [acaoPendente, setAcaoPendente] = useState<AcaoEmMassa | null>(null)
  const [executando, setExecutando] = useState(false)

  const idsSelecionaveis = useMemo(
    () =>
      dados
        .filter((item) => item.id && (!podeSelecionar || podeSelecionar(item)))
        .map((item) => item.id as string),
    [dados, podeSelecionar]
  )

  const todosSelecionados =
    idsSelecionaveis.length > 0 &&
    idsSelecionaveis.every((id) => selecionados.has(id))
  const algunsSelecionados =
    idsSelecionaveis.some((id) => selecionados.has(id)) && !todosSelecionados

  function toggleTodos() {
    const novo = new Set(selecionados)
    if (todosSelecionados) {
      idsSelecionaveis.forEach((id) => novo.delete(id))
    } else {
      idsSelecionaveis.forEach((id) => novo.add(id))
    }
    setSelecionados(novo)
  }

  function toggleUm(id: string) {
    const novo = new Set(selecionados)
    if (novo.has(id)) novo.delete(id)
    else novo.add(id)
    setSelecionados(novo)
  }

  function limparSelecao() {
    setSelecionados(new Set())
  }

  async function executarAcao(acao: AcaoEmMassa) {
    if (acao.confirmacao) {
      setAcaoPendente(acao)
      return
    }
    await rodarAcao(acao)
  }

  async function rodarAcao(acao: AcaoEmMassa) {
    setExecutando(true)
    try {
      await acao.onClick(Array.from(selecionados))
      setSelecionados(new Set())
    } finally {
      setExecutando(false)
      setAcaoPendente(null)
    }
  }

  const numColunas = (selecionavel ? 1 : 0) + colunas.length
  const qtdSelecionados = selecionados.size

  return (
    <div className="space-y-4">
      {filtros && <div className="flex flex-wrap items-center gap-2">{filtros}</div>}

      {selecionavel && acoesEmMassa && qtdSelecionados > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
          <span className="text-sm font-medium">
            {qtdSelecionados} {qtdSelecionados === 1 ? "selecionado" : "selecionados"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={limparSelecao}
            className="h-7 px-2 text-xs"
          >
            <X className="mr-1 h-3 w-3" />
            Limpar
          </Button>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {acoesEmMassa.map((acao) => (
              <Button
                key={acao.label}
                variant={acao.variante === "destrutivo" ? "destructive" : "outline"}
                size="sm"
                onClick={() => executarAcao(acao)}
                disabled={executando}
              >
                {executando && acaoPendente?.label === acao.label ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  acao.icone && <span className="mr-2">{acao.icone}</span>
                )}
                {acao.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {selecionavel && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      todosSelecionados
                        ? true
                        : algunsSelecionados
                          ? "indeterminate"
                          : false
                    }
                    onCheckedChange={toggleTodos}
                    aria-label="Selecionar todos"
                    disabled={idsSelecionaveis.length === 0}
                  />
                </TableHead>
              )}
              {colunas.map((coluna) => (
                <TableHead
                  key={String(coluna.chave)}
                  className={cn(coluna.classesCelula)}
                >
                  {coluna.ordenavel && onOrdenar ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3 h-8"
                          onClick={() => {
                            const novaDirecao =
                              ordenacao?.campo === String(coluna.chave) &&
                              ordenacao.direcao === "asc"
                                ? "desc"
                                : "asc"
                            onOrdenar(String(coluna.chave), novaDirecao)
                          }}
                        >
                          {coluna.titulo}
                          <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Ordenar por {coluna.titulo}</TooltipContent>
                    </Tooltip>
                  ) : (
                    coluna.titulo
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {carregando ? (
              Array.from({ length: porPagina }).map((_, i) => (
                <TableRow key={i}>
                  {selecionavel && (
                    <TableCell>
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                  )}
                  {colunas.map((coluna) => (
                    <TableCell
                      key={String(coluna.chave)}
                      className={cn(coluna.classesCelula)}
                    >
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : dados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={numColunas} className="h-48">
                  {vazio || (
                    <p className="text-center text-sm text-muted-foreground">
                      {mensagemVazio || "Nenhum registro encontrado."}
                    </p>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              dados.map((item, index) => {
                const id = item.id as string | undefined
                const selecionavelItem =
                  !!id && (!podeSelecionar || podeSelecionar(item))
                const checado = !!id && selecionados.has(id)
                return (
                  <TableRow
                    key={id || index}
                    data-state={checado ? "selected" : undefined}
                    className={cn(
                      onLinhaClick && "cursor-pointer",
                      checado && "bg-primary/5"
                    )}
                    onClick={() => onLinhaClick?.(item)}
                  >
                    {selecionavel && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={checado}
                          onCheckedChange={() => id && toggleUm(id)}
                          disabled={!selecionavelItem}
                          aria-label="Selecionar linha"
                        />
                      </TableCell>
                    )}
                    {colunas.map((coluna) => (
                      <TableCell
                        key={String(coluna.chave)}
                        className={cn(coluna.classesCelula)}
                      >
                        {coluna.renderizar
                          ? coluna.renderizar(item)
                          : String(item[coluna.chave as keyof T] ?? "")}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Mostrando {inicio}–{fim} de {total}
          </span>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPaginaChange(pagina - 1)}
                  disabled={pagina <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Página anterior</TooltipContent>
            </Tooltip>
            <span className="px-2">
              {pagina} / {totalPaginas}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPaginaChange(pagina + 1)}
                  disabled={pagina >= totalPaginas}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Próxima página</TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}

      {acaoPendente?.confirmacao && (
        <ConfirmDialog
          aberto={!!acaoPendente}
          onFechar={() => {
            if (!executando) setAcaoPendente(null)
          }}
          titulo={acaoPendente.confirmacao.titulo}
          descricao={acaoPendente.confirmacao.descricao(qtdSelecionados)}
          variante={acaoPendente.variante}
          textoBotao={acaoPendente.confirmacao.textoBotao}
          carregando={executando}
          onConfirmar={() => rodarAcao(acaoPendente)}
        />
      )}
    </div>
  )
}

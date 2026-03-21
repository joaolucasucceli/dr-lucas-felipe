"use client"

import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export interface ColunaConfig<T> {
  chave: keyof T | string
  titulo: string
  renderizar?: (item: T) => React.ReactNode
  ordenavel?: boolean
  classesCelula?: string
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
}: DataTableProps<T>) {
  const totalPaginas = Math.ceil(total / porPagina)
  const inicio = (pagina - 1) * porPagina + 1
  const fim = Math.min(pagina * porPagina, total)

  function handleOrdenar(campo: string) {
    if (!onOrdenar) return
    const novaDirecao =
      ordenacao?.campo === campo && ordenacao.direcao === "asc" ? "desc" : "asc"
    onOrdenar(campo, novaDirecao)
  }

  return (
    <div className="space-y-4">
      {filtros && <div className="flex flex-wrap items-center gap-2">{filtros}</div>}

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
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
                          onClick={() => handleOrdenar(String(coluna.chave))}
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
                <TableCell colSpan={colunas.length} className="h-48">
                  {vazio || (
                    <p className="text-center text-sm text-muted-foreground">
                      {mensagemVazio || "Nenhum registro encontrado."}
                    </p>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              dados.map((item, index) => (
                <TableRow
                  key={(item.id as string) || index}
                  className={cn(onLinhaClick && "cursor-pointer")}
                  onClick={() => onLinhaClick?.(item)}
                >
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
              ))
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
    </div>
  )
}

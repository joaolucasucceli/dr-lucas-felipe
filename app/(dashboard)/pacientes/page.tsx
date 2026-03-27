"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { DataTable, type ColunaConfig } from "@/components/features/shared/DataTable"
import { EmptyState } from "@/components/features/shared/EmptyState"
import { SkeletonTabela } from "@/components/features/shared/SkeletonTabela"
import { ErrorState } from "@/components/features/shared/ErrorState"
import { PacienteForm } from "@/components/features/pacientes/PacienteForm"
import { usePacientes } from "@/hooks/use-pacientes"

interface Paciente {
  id: string
  nome: string
  whatsapp: string | null
  cpf: string | null
  email: string | null
  ativo: boolean
  criadoEm: string
  leadOrigemId: string | null
}

function mascararCpf(cpf: string | null): string {
  if (!cpf || cpf.length !== 11) return "—"
  return `***.***. ${cpf.slice(6, 9)}-${cpf.slice(9)}`
}

export default function PacientesPage() {
  const router = useRouter()
  const [pagina, setPagina] = useState(1)
  const [busca, setBusca] = useState("")
  const [formAberto, setFormAberto] = useState(false)

  const { dados, total, carregando, erro, recarregar } = usePacientes({
    pagina,
    porPagina: 10,
    busca: busca || undefined,
  })

  const colunas: ColunaConfig<Paciente>[] = [
    { chave: "nome", titulo: "Nome", ordenavel: true },
    {
      chave: "whatsapp",
      titulo: "WhatsApp",
      classesCelula: "hidden sm:table-cell",
      renderizar: (p) => p.whatsapp || "—",
    },
    {
      chave: "cpf",
      titulo: "CPF",
      classesCelula: "hidden md:table-cell",
      renderizar: (p) => mascararCpf(p.cpf),
    },
    {
      chave: "criadoEm",
      titulo: "Cadastro",
      classesCelula: "hidden lg:table-cell",
      renderizar: (p) => new Date(p.criadoEm).toLocaleDateString("pt-BR"),
    },
  ]

  if (erro) {
    return (
      <div>
        <PageHeader titulo="Pacientes" />
        <div className="mt-6">
          <ErrorState mensagem={erro} onTentar={recarregar} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader titulo="Pacientes" descricao="Gerencie os pacientes e prontuários da clínica">
        <Button onClick={() => setFormAberto(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Paciente
        </Button>
      </PageHeader>

      <div className="mt-6">
        {carregando && dados.length === 0 ? (
          <SkeletonTabela linhas={6} colunas={4} />
        ) : !carregando && dados.length === 0 && !busca ? (
          <EmptyState
            titulo="Nenhum paciente"
            descricao="Cadastre o primeiro paciente ou converta um lead concluído."
            textoBotao="Novo Paciente"
            onAcao={() => setFormAberto(true)}
          />
        ) : (
          <DataTable
            colunas={colunas}
            dados={dados}
            total={total}
            pagina={pagina}
            porPagina={10}
            onPaginaChange={setPagina}
            carregando={carregando}
            onLinhaClick={(paciente) => router.push(`/pacientes/${paciente.id}`)}
            filtros={
              <div className="flex items-center gap-3">
                <Input
                  placeholder="Buscar por nome, WhatsApp ou CPF..."
                  value={busca}
                  onChange={(e) => {
                    setBusca(e.target.value)
                    setPagina(1)
                  }}
                  className="w-[300px]"
                />
              </div>
            }
          />
        )}
      </div>

      <PacienteForm
        aberto={formAberto}
        onFechar={() => setFormAberto(false)}
        onSucesso={() => {
          setFormAberto(false)
          recarregar()
        }}
      />
    </div>
  )
}

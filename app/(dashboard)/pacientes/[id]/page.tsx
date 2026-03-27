"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Trash2, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { PageHeader } from "@/components/features/shared/PageHeader"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { LoadingState } from "@/components/features/shared/LoadingState"
import { ErrorState } from "@/components/features/shared/ErrorState"
import { ConfirmDialog } from "@/components/features/shared/ConfirmDialog"
import { useAutosave, IndicadorSalvamento } from "@/hooks/use-autosave"
import { usePaciente } from "@/hooks/use-paciente"
import { useProntuario } from "@/hooks/use-prontuario"
import { FormAnamnese } from "@/components/features/prontuario/FormAnamnese"
import { TimelineEvolucao } from "@/components/features/prontuario/TimelineEvolucao"
import { ListaDocumentos } from "@/components/features/prontuario/ListaDocumentos"
import { GaleriaFotosProntuario } from "@/components/features/prontuario/GaleriaFotosProntuario"
import { SinaisVitais } from "@/components/features/prontuario/SinaisVitais"

export default function PacienteDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { paciente, carregando, erro, recarregar } = usePaciente(id)
  const { prontuario, carregando: carregandoProntuario, recarregar: recarregarProntuario } = useProntuario(id)

  const [confirmExcluir, setConfirmExcluir] = useState(false)

  // Campos editáveis
  const [nome, setNome] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [email, setEmail] = useState("")
  const [cpf, setCpf] = useState("")
  const [dataNascimento, setDataNascimento] = useState("")
  const [sexo, setSexo] = useState("")
  const [endereco, setEndereco] = useState("")
  const [cidade, setCidade] = useState("")
  const [estado, setEstado] = useState("")
  const [contatoEmergencia, setContatoEmergencia] = useState("")
  const [contatoEmergenciaTel, setContatoEmergenciaTel] = useState("")
  const [observacoes, setObservacoes] = useState("")
  const [consentimentoLgpd, setConsentimentoLgpd] = useState(false)

  const initialized = useRef(false)

  useEffect(() => {
    if (paciente && !initialized.current) {
      setNome(paciente.nome)
      setWhatsapp(paciente.whatsapp || "")
      setEmail(paciente.email || "")
      setCpf(paciente.cpf || "")
      setDataNascimento(paciente.dataNascimento ? paciente.dataNascimento.slice(0, 10) : "")
      setSexo(paciente.sexo || "")
      setEndereco(paciente.endereco || "")
      setCidade(paciente.cidade || "")
      setEstado(paciente.estado || "")
      setContatoEmergencia(paciente.contatoEmergencia || "")
      setContatoEmergenciaTel(paciente.contatoEmergenciaTel || "")
      setObservacoes(paciente.observacoes || "")
      setConsentimentoLgpd(paciente.consentimentoLgpd)
      initialized.current = true
    }
  }, [paciente])

  const salvarDados = useCallback(
    async (dados: Record<string, unknown>) => {
      const res = await fetch(`/api/pacientes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erro ao salvar")
      }
    },
    [id]
  )

  const nomeAutosave = useAutosave({
    valor: nome,
    valorInicial: paciente?.nome || "",
    onSalvar: async (v) => salvarDados({ nome: v }),
  })

  const whatsappAutosave = useAutosave({
    valor: whatsapp,
    valorInicial: paciente?.whatsapp || "",
    onSalvar: async (v) => salvarDados({ whatsapp: v || "" }),
  })

  const emailAutosave = useAutosave({
    valor: email,
    valorInicial: paciente?.email || "",
    onSalvar: async (v) => salvarDados({ email: v || "" }),
  })

  async function handleExcluir() {
    try {
      const res = await fetch(`/api/pacientes/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Paciente removido")
      router.push("/pacientes")
    } catch {
      toast.error("Erro ao remover paciente")
    }
  }

  async function salvarCampoManual(campo: string, valor: unknown) {
    try {
      await salvarDados({ [campo]: valor })
      toast.success("Salvo")
    } catch {
      toast.error("Erro ao salvar")
    }
  }

  if (carregando) return <LoadingState />
  if (erro) return <ErrorState mensagem={erro} onTentar={recarregar} />
  if (!paciente) return <ErrorState mensagem="Paciente não encontrado" />

  return (
    <div>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/pacientes">Pacientes</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{paciente.nome}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <PageHeader titulo={paciente.nome} descricao={`Prontuário nº ${paciente.prontuario?.numero ?? "—"}`}>
        {paciente.leadOrigem && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/leads/${paciente.leadOrigem!.id}`)}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Ver Lead Original
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => router.push("/pacientes")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Button variant="destructive" size="sm" onClick={() => setConfirmExcluir(true)}>
          <Trash2 className="mr-2 h-4 w-4" />
          Excluir
        </Button>
      </PageHeader>

      <Tabs defaultValue="dados" className="mt-6">
        <TabsList>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="prontuario">Prontuário</TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Dados Pessoais */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dados Pessoais</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="det-nome">Nome</Label>
                    <IndicadorSalvamento status={nomeAutosave.status} />
                  </div>
                  <Input id="det-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="det-whatsapp">WhatsApp</Label>
                    <IndicadorSalvamento status={whatsappAutosave.status} />
                  </div>
                  <Input id="det-whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="det-email">Email</Label>
                    <IndicadorSalvamento status={emailAutosave.status} />
                  </div>
                  <Input id="det-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="det-cpf">CPF</Label>
                  <Input
                    id="det-cpf"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    onBlur={() => salvarCampoManual("cpf", cpf || "")}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="det-nascimento">Data de Nascimento</Label>
                  <Input
                    id="det-nascimento"
                    type="date"
                    value={dataNascimento}
                    onChange={(e) => setDataNascimento(e.target.value)}
                    onBlur={() => salvarCampoManual("dataNascimento", dataNascimento || "")}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Sexo</Label>
                  <Select
                    value={sexo || "nenhum"}
                    onValueChange={(v) => {
                      const valor = v === "nenhum" ? "" : v
                      setSexo(valor)
                      salvarCampoManual("sexo", valor || null)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nenhum">Não informado</SelectItem>
                      <SelectItem value="feminino">Feminino</SelectItem>
                      <SelectItem value="masculino">Masculino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Endereço e Contato */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Endereço e Contato</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="det-endereco">Endereço</Label>
                  <Input
                    id="det-endereco"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    onBlur={() => salvarCampoManual("endereco", endereco)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="det-cidade">Cidade</Label>
                    <Input
                      id="det-cidade"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      onBlur={() => salvarCampoManual("cidade", cidade)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="det-estado">Estado</Label>
                    <Input
                      id="det-estado"
                      value={estado}
                      onChange={(e) => setEstado(e.target.value)}
                      onBlur={() => salvarCampoManual("estado", estado)}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="det-emergencia">Contato de Emergência</Label>
                  <Input
                    id="det-emergencia"
                    value={contatoEmergencia}
                    onChange={(e) => setContatoEmergencia(e.target.value)}
                    onBlur={() => salvarCampoManual("contatoEmergencia", contatoEmergencia)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="det-emergencia-tel">Tel. Emergência</Label>
                  <Input
                    id="det-emergencia-tel"
                    value={contatoEmergenciaTel}
                    onChange={(e) => setContatoEmergenciaTel(e.target.value)}
                    onBlur={() => salvarCampoManual("contatoEmergenciaTel", contatoEmergenciaTel)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="det-observacoes">Observações</Label>
                  <Textarea
                    id="det-observacoes"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    onBlur={() => salvarCampoManual("observacoes", observacoes)}
                    rows={4}
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Checkbox
                    id="det-lgpd"
                    checked={consentimentoLgpd}
                    onCheckedChange={(v) => {
                      const valor = !!v
                      setConsentimentoLgpd(valor)
                      salvarCampoManual("consentimentoLgpd", valor)
                    }}
                  />
                  <Label htmlFor="det-lgpd" className="text-sm font-normal">
                    Consentimento LGPD
                  </Label>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="prontuario" className="mt-4">
          {carregandoProntuario ? (
            <LoadingState />
          ) : prontuario ? (
            <div className="space-y-6">
              {prontuario.anamnese && (
                <FormAnamnese
                  anamnese={prontuario.anamnese}
                  pacienteId={id}
                  onAtualizar={recarregarProntuario}
                />
              )}
              <SinaisVitais pacienteId={id} />
              <TimelineEvolucao
                evolucoes={prontuario.evolucoes}
                pacienteId={id}
                onAtualizar={recarregarProntuario}
              />
              <ListaDocumentos pacienteId={id} />
              <GaleriaFotosProntuario pacienteId={id} />
            </div>
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Prontuário não encontrado.
              </CardContent>
            </Card>
          )}
        </TabsContent>

      </Tabs>

      <ConfirmDialog
        aberto={confirmExcluir}
        onFechar={() => setConfirmExcluir(false)}
        onConfirmar={handleExcluir}
        titulo="Excluir Paciente"
        descricao={`Tem certeza que deseja excluir ${paciente.nome}? Esta ação pode ser revertida pelo administrador.`}
        textoBotao="Excluir"
        variante="destrutivo"
      />
    </div>
  )
}

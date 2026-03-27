"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { LoadingState } from "@/components/features/shared/LoadingState"
import { ErrorState } from "@/components/features/shared/ErrorState"
import { useConfigSite } from "@/hooks/use-config-site"

export default function SiteConfigPage() {
  const router = useRouter()
  const { configurado, config, carregando, erro, recarregar } = useConfigSite()
  const [salvando, setSalvando] = useState(false)

  const [whatsappNumero, setWhatsappNumero] = useState("")
  const [whatsappMensagem, setWhatsappMensagem] = useState("")
  const [medicoNome, setMedicoNome] = useState("")
  const [medicoEspecialidade, setMedicoEspecialidade] = useState("")
  const [medicoCrm, setMedicoCrm] = useState("")
  const [instagramUrl, setInstagramUrl] = useState("")
  const [contatoTelefone, setContatoTelefone] = useState("")
  const [contatoEndereco, setContatoEndereco] = useState("")
  const [contatoCidade, setContatoCidade] = useState("")

  useEffect(() => {
    if (config) {
      setWhatsappNumero(config.whatsappNumero || "")
      setWhatsappMensagem(config.whatsappMensagem || "")
      setMedicoNome(config.medicoNome || "")
      setMedicoEspecialidade(config.medicoEspecialidade || "")
      setMedicoCrm(config.medicoCrm || "")
      setInstagramUrl(config.instagramUrl || "")
      setContatoTelefone(config.contatoTelefone || "")
      setContatoEndereco(config.contatoEndereco || "")
      setContatoCidade(config.contatoCidade || "")
    }
  }, [config])

  async function handleSalvar() {
    setSalvando(true)
    try {
      const res = await fetch("/api/configuracoes/site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsappNumero: whatsappNumero || undefined,
          whatsappMensagem: whatsappMensagem || undefined,
          medicoNome: medicoNome || undefined,
          medicoEspecialidade: medicoEspecialidade || undefined,
          medicoCrm: medicoCrm || undefined,
          instagramUrl: instagramUrl || undefined,
          contatoTelefone: contatoTelefone || undefined,
          contatoEndereco: contatoEndereco || undefined,
          contatoCidade: contatoCidade || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Erro ao salvar configurações")
        return
      }

      toast.success("Configurações do site salvas")
      recarregar()
    } catch {
      toast.error("Erro ao salvar configurações")
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <div>
        <PageHeader titulo="Configurações do Site" />
        <div className="mt-6"><LoadingState /></div>
      </div>
    )
  }

  if (erro) {
    return (
      <div>
        <PageHeader titulo="Configurações do Site" />
        <div className="mt-6"><ErrorState mensagem={erro} onTentar={recarregar} /></div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        titulo="Configurações do Site"
        descricao="Dados de contato, WhatsApp e informações do médico exibidos na landing page"
      >
        <Button variant="outline" onClick={() => router.push("/configuracoes")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Configurações
        </Button>
      </PageHeader>

      <div className="mt-6 grid gap-6">
        {/* WhatsApp */}
        <Card>
          <CardHeader>
            <CardTitle>WhatsApp</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Número do WhatsApp</Label>
              <Input
                value={whatsappNumero}
                onChange={(e) => setWhatsappNumero(e.target.value)}
                placeholder="5511999999999 (55 + DDD + número)"
              />
              <p className="text-xs text-muted-foreground">
                Formato: 55 + DDD + número (sem espaços ou caracteres especiais)
              </p>
            </div>
            <div className="grid gap-2">
              <Label>Mensagem padrão</Label>
              <Textarea
                value={whatsappMensagem}
                onChange={(e) => setWhatsappMensagem(e.target.value)}
                placeholder="Olá! Gostaria de agendar uma avaliação..."
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                Mensagem pré-preenchida ao clicar nos botões de WhatsApp do site
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Médico */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Médico</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Nome completo</Label>
              <Input
                value={medicoNome}
                onChange={(e) => setMedicoNome(e.target.value)}
                placeholder="Dr. Lucas Felipe P. Ferreira"
              />
            </div>
            <div className="grid gap-2">
              <Label>CRM</Label>
              <Input
                value={medicoCrm}
                onChange={(e) => setMedicoCrm(e.target.value)}
                placeholder="CRM/SP 123456"
              />
            </div>
            <div className="col-span-full grid gap-2">
              <Label>Especialidade</Label>
              <Input
                value={medicoEspecialidade}
                onChange={(e) => setMedicoEspecialidade(e.target.value)}
                placeholder="Medicina Estética — Contorno Corporal"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contato */}
        <Card>
          <CardHeader>
            <CardTitle>Contato e Redes Sociais</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Telefone</Label>
              <Input
                value={contatoTelefone}
                onChange={(e) => setContatoTelefone(e.target.value)}
                placeholder="+55 11 99999-9999"
              />
            </div>
            <div className="grid gap-2">
              <Label>Instagram</Label>
              <Input
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/dr.lucasfelipe"
              />
            </div>
            <div className="grid gap-2">
              <Label>Endereço</Label>
              <Input
                value={contatoEndereco}
                onChange={(e) => setContatoEndereco(e.target.value)}
                placeholder="Av. Paulista, 1000 — Sala 501"
              />
            </div>
            <div className="grid gap-2">
              <Label>Cidade</Label>
              <Input
                value={contatoCidade}
                onChange={(e) => setContatoCidade(e.target.value)}
                placeholder="São Paulo — SP"
              />
            </div>
          </CardContent>
        </Card>

        {/* Salvar */}
        <div className="flex justify-end">
          <Button onClick={handleSalvar} disabled={salvando}>
            {salvando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : configurado ? (
              "Atualizar Configurações"
            ) : (
              "Salvar Configurações"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

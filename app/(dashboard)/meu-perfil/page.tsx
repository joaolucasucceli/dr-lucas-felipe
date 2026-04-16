"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { Loader2, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { UserAvatar } from "@/components/features/shared/UserAvatar"
import { getSupabaseBrowser } from "@/lib/supabase-browser"

export default function MeuPerfilPage() {
  const { data: session, update } = useSession()
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)
  const [senhaAtual, setSenhaAtual] = useState("")
  const [novaSenha, setNovaSenha] = useState("")
  const [confirmarSenha, setConfirmarSenha] = useState("")
  const [salvandoDados, setSalvandoDados] = useState(false)
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [uploadandoFoto, setUploadandoFoto] = useState(false)
  const inputFotoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (session?.user) {
      setNome(session.user.name ?? "")
      setEmail(session.user.email ?? "")
      setFotoUrl(session.user.image ?? null)
    }
  }, [session])

  async function handleUploadFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem excede 5MB")
      return
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem")
      return
    }

    setUploadandoFoto(true)
    try {
      const supabase = getSupabaseBrowser()
      const ext = file.name.split(".").pop() || "jpg"
      const path = `usuarios/${session!.user.id}/avatar.${ext}`

      const { error } = await supabase.storage
        .from("atendimento-midias")
        .upload(path, file, { upsert: true })
      if (error) throw new Error(error.message)

      const { data } = supabase.storage
        .from("atendimento-midias")
        .getPublicUrl(path)

      const url = `${data.publicUrl}?t=${Date.now()}`

      const res = await fetch("/api/usuarios/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fotoUrl: url }),
      })
      if (!res.ok) throw new Error()

      setFotoUrl(url)
      await update()
      toast.success("Foto atualizada")
    } catch {
      toast.error("Erro ao enviar foto")
    } finally {
      setUploadandoFoto(false)
    }
  }

  async function handleSalvarDados(e: React.FormEvent) {
    e.preventDefault()
    setSalvandoDados(true)
    try {
      const res = await fetch("/api/usuarios/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Erro ao salvar dados")
        return
      }
      await update({ name: data.nome, email: data.email })
      toast.success("Dados atualizados com sucesso")
    } catch {
      toast.error("Erro ao salvar dados")
    } finally {
      setSalvandoDados(false)
    }
  }

  async function handleSalvarSenha(e: React.FormEvent) {
    e.preventDefault()
    if (novaSenha !== confirmarSenha) {
      toast.error("As senhas não coincidem")
      return
    }
    setSalvandoSenha(true)
    try {
      const res = await fetch("/api/usuarios/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senhaAtual, novaSenha }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Erro ao alterar senha")
        return
      }
      setSenhaAtual("")
      setNovaSenha("")
      setConfirmarSenha("")
      toast.success("Senha alterada com sucesso")
    } catch {
      toast.error("Erro ao alterar senha")
    } finally {
      setSalvandoSenha(false)
    }
  }

  return (
    <div>
      <PageHeader titulo="Meu Perfil" descricao="Gerencie seus dados pessoais e senha" />

      <div className="mt-6 max-w-lg space-y-6">
        {/* Foto de perfil */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Foto de Perfil</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <div className="relative">
              <UserAvatar
                nome={nome || "U"}
                src={fotoUrl}
                tamanho="lg"
                className="h-20 w-20 text-2xl"
              />
              <button
                type="button"
                onClick={() => inputFotoRef.current?.click()}
                disabled={uploadandoFoto}
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-colors hover:bg-primary/90"
              >
                {uploadandoFoto ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              <input
                ref={inputFotoRef}
                type="file"
                accept="image/*"
                onChange={handleUploadFoto}
                className="hidden"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Clique no ícone para trocar a foto.</p>
              <p>JPG, PNG ou WebP. Máximo 5MB.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados Pessoais</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSalvarDados} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                  minLength={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={salvandoDados}>
                {salvandoDados && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alterar Senha</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSalvarSenha} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="senhaAtual">Senha atual</Label>
                <Input
                  id="senhaAtual"
                  type="password"
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                  required
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="novaSenha">Nova senha</Label>
                <Input
                  id="novaSenha"
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmarSenha">Confirmar nova senha</Label>
                <Input
                  id="confirmarSenha"
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" disabled={salvandoSenha}>
                {salvandoSenha && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Alterar Senha
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

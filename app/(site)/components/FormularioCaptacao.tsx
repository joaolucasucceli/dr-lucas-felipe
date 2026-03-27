"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const PROCEDIMENTOS = [
  "Lipoaspiração Fracionada",
  "Mini Lipo",
  "Hidrolipo",
  "Lipo com Enxerto Glúteo",
  "Preenchimento Glúteo Definitivo",
]

type Estado = "idle" | "enviando" | "sucesso" | "erro"

/** Aplica máscara (XX) XXXXX-XXXX */
function mascaraTelefone(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 11)
  if (digitos.length <= 2) return digitos
  if (digitos.length <= 7) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`
}

/** Remove máscara e adiciona prefixo 55 se necessário */
function normalizarWhatsapp(valor: string): string {
  const digitos = valor.replace(/\D/g, "")
  if (digitos.length >= 12) return digitos
  return `55${digitos}`
}

export function FormularioCaptacao() {
  const [estado, setEstado] = useState<Estado>("idle")
  const [erroMsg, setErroMsg] = useState("")
  const [errosCampo, setErrosCampo] = useState<Record<string, string[]>>({})

  const [nome, setNome] = useState("")
  const [telefone, setTelefone] = useState("")
  const [procedimento, setProcedimento] = useState("")
  const [lgpd, setLgpd] = useState(false)
  const [hp, setHp] = useState("") // honeypot

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErroMsg("")
    setErrosCampo({})
    setEstado("enviando")

    try {
      const res = await fetch("/api/site/captar-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          whatsapp: normalizarWhatsapp(telefone),
          procedimentoInteresse: procedimento,
          consentimentoLgpd: lgpd,
          _hp: hp,
        }),
      })

      if (res.status === 429) {
        setErroMsg("Muitas tentativas. Tente novamente mais tarde.")
        setEstado("erro")
        return
      }

      const data = await res.json()

      if (!res.ok) {
        if (data.detalhes) setErrosCampo(data.detalhes)
        setErroMsg(data.error || "Erro ao enviar. Tente novamente.")
        setEstado("erro")
        return
      }

      setEstado("sucesso")
    } catch {
      setErroMsg("Erro de conexão. Verifique sua internet e tente novamente.")
      setEstado("erro")
    }
  }

  if (estado === "sucesso") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-site-green/20">
          <svg className="h-8 w-8 text-site-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-white">
          Recebemos seu interesse!
        </h3>
        <p className="max-w-sm text-sm leading-relaxed text-white/60">
          Em breve a Ana Júlia vai te chamar no WhatsApp para dar início ao seu
          atendimento personalizado.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Honeypot — invisível para humanos */}
      <input
        type="text"
        name="website"
        value={hp}
        onChange={(e) => setHp(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />

      {/* Nome */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nome" className="text-white/70">
          Seu nome
        </Label>
        <Input
          id="nome"
          type="text"
          required
          minLength={2}
          maxLength={100}
          placeholder="Como podemos te chamar?"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="h-11 rounded-lg border-white/10 bg-white/5 px-4 text-white placeholder:text-white/30 focus-visible:border-site-gold/50 focus-visible:ring-site-gold/30"
        />
        {errosCampo.nome && (
          <span role="alert" className="text-xs text-red-400">{errosCampo.nome[0]}</span>
        )}
      </div>

      {/* WhatsApp */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="whatsapp" className="text-white/70">
          WhatsApp
        </Label>
        <Input
          id="whatsapp"
          type="tel"
          required
          placeholder="(00) 00000-0000"
          value={telefone}
          onChange={(e) => setTelefone(mascaraTelefone(e.target.value))}
          className="h-11 rounded-lg border-white/10 bg-white/5 px-4 text-white placeholder:text-white/30 focus-visible:border-site-gold/50 focus-visible:ring-site-gold/30"
        />
        {errosCampo.whatsapp && (
          <span role="alert" className="text-xs text-red-400">{errosCampo.whatsapp[0]}</span>
        )}
      </div>

      {/* Procedimento */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-white/70">
          Procedimento de interesse
        </Label>
        <Select value={procedimento} onValueChange={setProcedimento}>
          <SelectTrigger className="h-11 w-full rounded-lg border-white/10 bg-white/5 px-4 text-white data-placeholder:text-white/30 focus-visible:border-site-gold/50 focus-visible:ring-site-gold/30">
            <SelectValue placeholder="Selecione o procedimento" />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-site-dark">
            {PROCEDIMENTOS.map((p) => (
              <SelectItem key={p} value={p} className="text-white focus:bg-white/10 focus:text-white">
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errosCampo.procedimentoInteresse && (
          <span role="alert" className="text-xs text-red-400">
            {errosCampo.procedimentoInteresse[0]}
          </span>
        )}
      </div>

      {/* LGPD */}
      <label className="flex items-start gap-3 cursor-pointer">
        <Checkbox
          checked={lgpd}
          onCheckedChange={(checked) => setLgpd(checked === true)}
          className="mt-0.5 border-white/20 bg-white/5 data-[state=checked]:border-site-gold data-[state=checked]:bg-site-gold data-[state=checked]:text-site-dark"
        />
        <span className="text-xs leading-relaxed text-white/50">
          Concordo com a{" "}
          <a
            href="/lgpd"
            target="_blank"
            rel="noopener noreferrer"
            className="text-site-gold underline underline-offset-2 hover:text-site-gold/80"
          >
            Política de Privacidade
          </a>{" "}
          e autorizo o contato via WhatsApp.
        </span>
      </label>
      {errosCampo.consentimentoLgpd && (
        <span role="alert" className="text-xs text-red-400">
          {errosCampo.consentimentoLgpd[0]}
        </span>
      )}

      {/* Erro geral */}
      {erroMsg && (
        <div role="alert" className="rounded-lg border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          {erroMsg}
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        disabled={estado === "enviando" || !lgpd}
        className="mt-1 h-12 rounded-lg bg-site-gold text-sm font-semibold text-site-dark hover:bg-site-gold/90 hover:shadow-lg hover:shadow-site-gold/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {estado === "enviando" ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Enviando...
          </>
        ) : (
          "Quero ser atendido"
        )}
      </Button>
    </form>
  )
}

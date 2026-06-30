"use client"

import { useState, useEffect, useCallback } from "react"
import { fetchJson, normalizarErroApi } from "@/lib/api-client"

interface ConfigWhatsapp {
  uazapiUrl: string
  adminToken: string
  instanceId?: string
}

interface UseConfigWhatsappReturn {
  configurado: boolean
  conectado: boolean
  status: string
  numeroWhatsapp: string | null
  config: ConfigWhatsapp | null
  carregando: boolean
  erro: string | null
  recarregar: () => void
}

export function useConfigWhatsapp(): UseConfigWhatsappReturn {
  const [configurado, setConfigurado] = useState(false)
  const [conectado, setConectado] = useState(false)
  const [status, setStatus] = useState("unconfigured")
  const [numeroWhatsapp, setNumeroWhatsapp] = useState<string | null>(null)
  const [config, setConfig] = useState<ConfigWhatsapp | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const buscar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCarregando(true)
    setErro(null)

    try {
      const json = await fetchJson<{
        configurado: boolean
        ativo: boolean
        status: string
        numeroWhatsapp?: string | null
        config?: ConfigWhatsapp | null
      }>("/api/whatsapp/status", undefined, {
        recurso: "WhatsApp",
        fallback: "Erro ao carregar configuração",
      })
      setConfigurado(json.configurado)
      setConectado(json.ativo)
      setStatus(json.status)
      setNumeroWhatsapp(json.numeroWhatsapp || null)
      setConfig(json.config || null)
    } catch (e) {
      if (!silencioso) {
        setErro(normalizarErroApi(e, "Erro ao carregar configuração").mensagem)
      }
    } finally {
      if (!silencioso) setCarregando(false)
    }
  }, [])

  useEffect(() => {
    buscar()
    const iv = setInterval(() => buscar(true), 60_000)
    return () => clearInterval(iv)
  }, [buscar])

  return {
    configurado,
    conectado,
    status,
    numeroWhatsapp,
    config,
    carregando,
    erro,
    recarregar: buscar,
  }
}

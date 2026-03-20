"use client"

import { useState, useEffect, useCallback } from "react"

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

  const buscar = useCallback(async () => {
    setCarregando(true)
    setErro(null)

    try {
      const res = await fetch("/api/whatsapp/status")

      if (!res.ok) {
        throw new Error("Erro ao carregar configuração")
      }

      const json = await res.json()
      setConfigurado(json.configurado)
      setConectado(json.ativo)
      setStatus(json.status)
      setNumeroWhatsapp(json.numeroWhatsapp || null)
      setConfig(json.config || null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido")
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    buscar()
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

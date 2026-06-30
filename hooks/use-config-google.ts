"use client"

import { useState, useEffect, useCallback } from "react"
import { fetchJson, normalizarErroApi } from "@/lib/api-client"

interface ConfigGoogle {
  id: string
  clientId: string
  clientSecret: string
  conectado: boolean
  calendarId: string | null
  ativo: boolean
  atualizadoEm: string
}

interface UseConfigGoogleReturn {
  configurado: boolean
  config: ConfigGoogle | null
  carregando: boolean
  erro: string | null
  recarregar: () => void
}

export function useConfigGoogle(): UseConfigGoogleReturn {
  const [configurado, setConfigurado] = useState(false)
  const [config, setConfig] = useState<ConfigGoogle | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const buscar = useCallback(async () => {
    setCarregando(true)
    setErro(null)

    try {
      const json = await fetchJson<{ configurado: boolean; config: ConfigGoogle | null }>(
        "/api/configuracoes/google-agenda",
        undefined,
        { recurso: "Configuração", fallback: "Erro ao carregar configuração" }
      )
      setConfigurado(json.configurado)
      setConfig(json.config)
    } catch (e) {
      setErro(normalizarErroApi(e, "Erro ao carregar configuração").mensagem)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    buscar()
  }, [buscar])

  return { configurado, config, carregando, erro, recarregar: buscar }
}

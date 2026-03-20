"use client"

import { useState, useEffect, useCallback } from "react"

interface ConfigGoogle {
  id: string
  clientId: string
  clientSecret: string
  conectado: boolean
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
      const res = await fetch("/api/configuracoes/google-agenda")

      if (!res.ok) {
        throw new Error("Erro ao carregar configuração")
      }

      const json = await res.json()
      setConfigurado(json.configurado)
      setConfig(json.config)
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido")
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    buscar()
  }, [buscar])

  return { configurado, config, carregando, erro, recarregar: buscar }
}

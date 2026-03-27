"use client"

import { useState, useEffect, useCallback } from "react"

interface ConfigSite {
  id: string
  whatsappNumero: string | null
  whatsappMensagem: string | null
  medicoNome: string | null
  medicoEspecialidade: string | null
  medicoCrm: string | null
  instagramUrl: string | null
  contatoTelefone: string | null
  contatoEndereco: string | null
  contatoCidade: string | null
  atualizadoEm: string
}

interface UseConfigSiteReturn {
  configurado: boolean
  config: ConfigSite | null
  carregando: boolean
  erro: string | null
  recarregar: () => void
}

export function useConfigSite(): UseConfigSiteReturn {
  const [configurado, setConfigurado] = useState(false)
  const [config, setConfig] = useState<ConfigSite | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const buscar = useCallback(async () => {
    setCarregando(true)
    setErro(null)

    try {
      const res = await fetch("/api/configuracoes/site")

      if (!res.ok) {
        throw new Error("Erro ao carregar configuração do site")
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

"use client"

import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DOCUMENTACAO_MD, NOME_ARQUIVO_DOWNLOAD } from "@/lib/documentacao/conteudo"

export function BotaoDownloadDoc() {
  function handleDownload() {
    const blob = new Blob([DOCUMENTACAO_MD], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = NOME_ARQUIVO_DOWNLOAD
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleDownload}>
      <Download className="mr-2 h-4 w-4" />
      Baixar Documentação
    </Button>
  )
}

"use client"

import { Bot, MessageSquare, Send, CheckCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface CardResumoAnaJuliaProps {
  mensagensEnviadas: number
  followUpsEnviados: number
  confirmacaoEnviadas: number
}

export function CardResumoAnaJulia({
  mensagensEnviadas,
  followUpsEnviados,
  confirmacaoEnviadas,
}: CardResumoAnaJuliaProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Bot className="h-5 w-5 text-muted-foreground" />
        <CardTitle className="text-base">Ana Júlia</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <MessageSquare className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
            <p className="text-2xl font-bold">{mensagensEnviadas}</p>
            <p className="text-xs text-muted-foreground">Mensagens</p>
          </div>
          <div className="text-center">
            <Send className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
            <p className="text-2xl font-bold">{followUpsEnviados}</p>
            <p className="text-xs text-muted-foreground">Follow-ups</p>
          </div>
          <div className="text-center">
            <CheckCircle className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
            <p className="text-2xl font-bold">{confirmacaoEnviadas}</p>
            <p className="text-xs text-muted-foreground">Confirmações</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

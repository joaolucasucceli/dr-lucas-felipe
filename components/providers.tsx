"use client"

import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { RealtimeProvider } from "@/lib/realtime"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <TooltipProvider>
          <RealtimeProvider>
            {children}
            <Toaster richColors position="top-right" />
          </RealtimeProvider>
        </TooltipProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}

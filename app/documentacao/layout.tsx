import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Documentação · Central Dr. Lucas",
  description: "Apresentação visual do sistema",
}

export default function DocumentacaoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="h-screen w-screen overflow-hidden">{children}</div>
}

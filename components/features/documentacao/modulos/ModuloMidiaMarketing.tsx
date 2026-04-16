import { Film, Upload, Send, Image } from "lucide-react"
import { HeroBanner } from "../HeroBanner"
import { FeaturesGrid } from "../FeaturesGrid"
import { ComoUsarSection } from "../ComoUsarSection"
import { PermissoesCallout } from "../PermissoesCallout"
import { DicaImportante } from "../DicaImportante"

export function ModuloMidiaMarketing() {
  return (
    <div className="space-y-8">
      <HeroBanner
        icone={<Film />}
        titulo="Mídia Marketing"
        subtitulo="Catálogo de mídias que a IA envia para pacientes via WhatsApp"
        gradientClasses="from-amber-600 to-orange-400"
      />

      <FeaturesGrid
        features={[
          {
            icone: <Upload />,
            titulo: "Upload direto",
            descricao: "Envie fotos e vídeos direto do computador. O arquivo é armazenado no Supabase Storage e fica disponível para a IA.",
          },
          {
            icone: <Image />,
            titulo: "4 categorias",
            descricao: "Organize por: Reels (Instagram), Antes e Depois, Depoimentos e Procedimentos. Associe ao procedimento quando aplicável.",
          },
          {
            icone: <Send />,
            titulo: "Envio automático pela IA",
            descricao: "Quando o paciente pedir referência visual, foto de resultado ou vídeo, a Ana Júlia seleciona e envia automaticamente.",
          },
          {
            icone: <Film />,
            titulo: "Preview e lightbox",
            descricao: "Clique no título da mídia para visualizar em tamanho grande. Imagens abrem em lightbox, vídeos com player.",
          },
        ]}
      />

      <ComoUsarSection
        passos={[
          {
            numero: 1,
            titulo: "Acesse Mídia Marketing",
            descricao: "No menu lateral, clique em 'Mídia Marketing'. A tabela lista todas as mídias cadastradas.",
          },
          {
            numero: 2,
            titulo: "Cadastre uma mídia",
            descricao: "Clique em 'Nova Mídia', preencha título, categoria e procedimento (se aplicável). Envie o arquivo pelo botão de upload.",
          },
          {
            numero: 3,
            titulo: "A IA usa automaticamente",
            descricao: "Quando um paciente perguntar 'tem foto de resultado?' ou 'quero ver um vídeo', a Ana Júlia seleciona e envia a mídia adequada.",
          },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <PermissoesCallout
          permissoes={[
            {
              perfil: "Gestor",
              acesso: "total",
              acoes: ["Cadastra, edita e remove mídias", "Faz upload de arquivos", "Ativa/desativa mídias"],
            },
            {
              perfil: "Atendente",
              acesso: "nenhum",
              acoes: [],
            },
          ]}
        />
        <DicaImportante
          texto="Cadastre fotos de antes e depois associadas ao procedimento correto. Isso permite que a IA envie a referência mais relevante quando o paciente perguntar sobre um procedimento específico."
          variante="sucesso"
        />
      </div>
    </div>
  )
}

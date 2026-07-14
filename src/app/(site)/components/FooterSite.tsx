import type { SiteConfigProps } from "./site-config"

interface FooterSiteProps {
  config: SiteConfigProps
}

export function FooterSite({ config }: FooterSiteProps) {
  const anoAtual = new Date().getFullYear()

  return (
    <footer className="border-t border-white/8 bg-[#050505] py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-10 md:grid-cols-3">
          {/* Brand */}
          <div>
            <span className="text-lg font-bold text-white">
              {config.medicoNome}
            </span>
            <p className="mt-1 text-sm text-white/40">
              {config.medicoEspecialidade}
            </p>
            <p className="mt-2 text-xs text-white/30">
              {config.medicoCrm}
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold tracking-wider uppercase text-white/50">
              Links
            </span>
            <a
              href={config.whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white/50 transition-colors hover:text-site-gold"
            >
              WhatsApp
            </a>
            <a
              href={config.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white/50 transition-colors hover:text-site-gold"
            >
              Instagram
            </a>
            <a
              href="/lgpd"
              className="text-sm text-white/50 transition-colors hover:text-site-gold"
            >
              Privacidade
            </a>
          </div>

          {/* Contato */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold tracking-wider uppercase text-white/50">
              Contato
            </span>
            <p className="text-sm text-white/50">
              {config.contatoTelefone}
            </p>
            <p className="text-sm text-white/50">
              {config.contatoEndereco}
            </p>
            <p className="text-sm text-white/50">
              {config.contatoCidade}
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-10 border-t border-white/5 pt-8 text-center">
          <p className="text-xs leading-relaxed text-white/25">
            Os resultados dos procedimentos podem variar de acordo com as
            características individuais de cada paciente. Todas as informações
            contidas neste site são de caráter informativo e não substituem uma
            consulta médica.
          </p>
          <p className="mt-4 text-xs text-white/20">
            &copy; {anoAtual} {config.medicoNome}. Todos os
            direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}

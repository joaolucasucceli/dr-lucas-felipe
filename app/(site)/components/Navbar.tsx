"use client"

import { useState, useEffect } from "react"

const NAV_LINKS = [
  { label: "Sobre", href: "#sobre" },
  { label: "Procedimentos", href: "#procedimentos" },
  { label: "Diferenciais", href: "#diferenciais" },
  { label: "Formulário", href: "#formulario" },
]

interface NavbarProps {
  whatsappLink: string
}

export function Navbar({ whatsappLink }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <>
      {/* Skip to content */}
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:rounded-lg focus:bg-site-green focus:px-4 focus:py-2 focus:text-white"
      >
        Ir para conteúdo
      </a>

      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-site-dark/95 backdrop-blur-md shadow-lg"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          {/* Logo / Nome */}
          <a href="#" className="flex flex-col leading-tight">
            <span className="text-lg font-bold tracking-wide text-white">
              Dr. Lucas Felipe
            </span>
            <span className="text-[11px] font-medium tracking-[0.2em] uppercase text-site-gold">
              Medicina Estética
            </span>
          </a>

          {/* Links Desktop */}
          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-white/70 transition-colors hover:text-site-gold"
              >
                {link.label}
              </a>
            ))}
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-site-green px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-site-green-hover hover:shadow-lg hover:shadow-site-green/25"
            >
              Agende sua avaliação
            </a>
          </div>

          {/* Menu Mobile */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex flex-col gap-1.5 md:hidden"
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
          >
            <span
              className={`h-0.5 w-6 bg-white transition-all ${menuOpen ? "translate-y-2 rotate-45" : ""}`}
            />
            <span
              className={`h-0.5 w-6 bg-white transition-all ${menuOpen ? "opacity-0" : ""}`}
            />
            <span
              className={`h-0.5 w-6 bg-white transition-all ${menuOpen ? "-translate-y-2 -rotate-45" : ""}`}
            />
          </button>
        </div>

        {/* Menu Mobile Dropdown */}
        {menuOpen && (
          <div className="border-t border-white/10 bg-site-dark/95 backdrop-blur-md md:hidden">
            <div className="flex flex-col gap-4 px-6 py-6">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-base font-medium text-white/80 transition-colors hover:text-site-gold"
                >
                  {link.label}
                </a>
              ))}
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 rounded-full bg-site-green px-6 py-3 text-center text-sm font-semibold text-white"
              >
                Agende sua avaliação
              </a>
            </div>
          </div>
        )}
      </nav>
    </>
  )
}

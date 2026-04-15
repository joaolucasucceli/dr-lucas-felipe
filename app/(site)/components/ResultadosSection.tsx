"use client"

import { useState, useCallback, useEffect } from "react"
import Image from "next/image"
import { AnimateOnScroll } from "./AnimateOnScroll"

// ── Tipos e dados ────────────────────────────────────────────────────────────

type Categoria =
  | "todos"
  | "lipo-abdome-flancos"
  | "preenchimento-gluteo"
  | "lipo-bracos"
  | "preenchimento-panturrilha"

interface Resultado {
  imagem: string
  categoria: Exclude<Categoria, "todos">
  label: string
}

const CATEGORIAS: { id: Categoria; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "lipo-abdome-flancos", label: "Lipo Abdome e Flancos" },
  { id: "preenchimento-gluteo", label: "Preenchimento Glúteo" },
  { id: "lipo-bracos", label: "Lipo de Braços" },
  { id: "preenchimento-panturrilha", label: "Preenchimento Panturrilha" },
]

const RESULTADOS: Resultado[] = [
  // Lipo abdome e flancos (13)
  ...Array.from({ length: 13 }, (_, i) => ({
    imagem: `/images/resultados/lipo-abdome-flancos/${String(i + 1).padStart(2, "0")}.jpeg`,
    categoria: "lipo-abdome-flancos" as const,
    label: "Lipo Abdome e Flancos",
  })),
  // Preenchimento glúteo (4)
  ...Array.from({ length: 4 }, (_, i) => ({
    imagem: `/images/resultados/preenchimento-gluteo/${String(i + 1).padStart(2, "0")}.jpeg`,
    categoria: "preenchimento-gluteo" as const,
    label: "Preenchimento Glúteo",
  })),
  // Lipo de braços (1)
  {
    imagem: "/images/resultados/lipo-bracos/01.jpeg",
    categoria: "lipo-bracos" as const,
    label: "Lipo de Braços",
  },
  // Preenchimento panturrilha (1)
  {
    imagem: "/images/resultados/preenchimento-panturrilha/01.jpeg",
    categoria: "preenchimento-panturrilha" as const,
    label: "Preenchimento Panturrilha",
  },
]

// ── Componente ───────────────────────────────────────────────────────────────

export function ResultadosSection() {
  const [filtro, setFiltro] = useState<Categoria>("todos")
  const [lightbox, setLightbox] = useState<string | null>(null)

  const filtrados =
    filtro === "todos"
      ? RESULTADOS
      : RESULTADOS.filter((r) => r.categoria === filtro)

  const fecharLightbox = useCallback(() => setLightbox(null), [])

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") fecharLightbox()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [lightbox, fecharLightbox])

  return (
    <>
      <section
        id="resultados"
        className="relative overflow-hidden bg-site-dark py-24 lg:py-32"
      >
        {/* Background accents */}
        <div className="absolute top-1/2 right-0 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-site-gold/5 blur-[120px]" />

        <div className="relative z-10 mx-auto max-w-7xl px-6">
          {/* Header */}
          <AnimateOnScroll>
            <div className="mb-12 text-center">
              <span className="mb-4 inline-block text-xs font-semibold tracking-[0.25em] uppercase text-site-gold">
                Resultados Reais
              </span>
              <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
                Antes e depois dos nossos{" "}
                <span className="text-site-gold">pacientes</span>
              </h2>
              <p className="mx-auto max-w-2xl text-base leading-relaxed text-white/50">
                Resultados reais de pacientes atendidos pelo Dr. Lucas Ferreira.
                Cada procedimento é personalizado para valorizar a
                individualidade de cada pessoa.
              </p>
            </div>
          </AnimateOnScroll>

          {/* Filter tabs */}
          <div className="mb-10 flex flex-wrap justify-center gap-2">
            {CATEGORIAS.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFiltro(cat.id)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                  filtro === cat.id
                    ? "bg-site-green text-white shadow-lg shadow-site-green/25"
                    : "border border-white/10 bg-white/[0.04] text-white/60 hover:border-site-gold/30 hover:text-white"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Gallery grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtrados.map((resultado, i) => (
              <AnimateOnScroll
                key={resultado.imagem}
                delay={Math.min(i % 3, 3) as 0 | 1 | 2 | 3}
              >
                <button
                  onClick={() => setLightbox(resultado.imagem)}
                  className="group relative w-full overflow-hidden rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-site-gold"
                >
                  <Image
                    src={resultado.imagem}
                    alt={`Resultado — ${resultado.label}`}
                    width={400}
                    height={500}
                    className="h-auto w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <span className="m-4 rounded-full bg-site-gold/90 px-3 py-1 text-xs font-medium text-white">
                      {resultado.label}
                    </span>
                  </div>
                </button>
              </AnimateOnScroll>
            ))}
          </div>

          {/* Videos */}
          <div className="mt-16">
            <AnimateOnScroll>
              <h3 className="mb-8 text-center text-xl font-bold text-white">
                Vídeos dos procedimentos
              </h3>
            </AnimateOnScroll>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { src: "/videos/reel-01.mp4", label: "Procedimento 1" },
                { src: "/videos/reel-02.mp4", label: "Procedimento 2" },
                { src: "/videos/reel-03.mp4", label: "Procedimento 3" },
                { src: "/videos/reel-04.mp4", label: "Procedimento 4" },
              ].map((video) => (
                <AnimateOnScroll key={video.src}>
                  <div className="overflow-hidden rounded-xl bg-white/[0.04]">
                    <video
                      src={video.src}
                      controls
                      preload="metadata"
                      playsInline
                      className="h-auto w-full"
                      aria-label={video.label}
                    >
                      Seu navegador não suporta o elemento de vídeo.
                    </video>
                  </div>
                </AnimateOnScroll>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <p className="mt-12 text-center text-xs leading-relaxed text-white/25">
            Os resultados dos procedimentos podem variar de acordo com as
            características individuais de cada paciente. As imagens acima são
            de pacientes reais e servem como referência, não como garantia de
            resultado.
          </p>
        </div>
      </section>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={fecharLightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Visualização ampliada do resultado"
        >
          <button
            onClick={fecharLightbox}
            className="absolute top-6 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            aria-label="Fechar"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <Image
            src={lightbox}
            alt="Resultado ampliado"
            width={800}
            height={1000}
            className="max-h-[90vh] w-auto rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}

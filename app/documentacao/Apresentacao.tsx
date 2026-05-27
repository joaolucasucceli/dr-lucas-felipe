"use client"

import { useCallback, useEffect, useState } from "react"
import {
  ArrowRight,
  ChevronDown,
  Maximize2,
  Minimize2,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { slides, type PassoFluxo, type Slide } from "./slides-config"

const COR_MAP: Record<string, string> = {
  emerald: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  blue: "border-blue-500/40 bg-blue-500/10 text-blue-300",
  purple: "border-purple-500/40 bg-purple-500/10 text-purple-300",
  amber: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  rose: "border-rose-500/40 bg-rose-500/10 text-rose-300",
}

const CATEGORIA_LABEL: Record<string, { rotulo: string; cor: string }> = {
  agenda: { rotulo: "Agenda", cor: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  paciente: { rotulo: "Paciente", cor: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  conteudo: { rotulo: "Conteúdo", cor: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  humano: { rotulo: "Humano", cor: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  estado: { rotulo: "Estado", cor: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30" },
}

const DESTAQUE_COR: Record<NonNullable<PassoFluxo["destaque"]>, string> = {
  ia: "border-emerald-500/50 bg-emerald-500/10",
  humano: "border-amber-500/50 bg-amber-500/10",
  externo: "border-blue-500/50 bg-blue-500/10",
  infra: "border-zinc-600/50 bg-zinc-800/50",
}

const DESTAQUE_LABEL: Record<NonNullable<PassoFluxo["destaque"]>, string> = {
  ia: "IA",
  humano: "Humano",
  externo: "Externo",
  infra: "Infra",
}

export function Apresentacao() {
  const [atual, setAtual] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)

  const proximo = useCallback(
    () => setAtual((a) => Math.min(a + 1, slides.length - 1)),
    []
  )
  const anterior = useCallback(
    () => setAtual((a) => Math.max(a - 1, 0)),
    []
  )

  const alternarFullscreen = useCallback(() => {
    if (typeof document === "undefined") return
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen()
    } else {
      void document.exitFullscreen()
    }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.key === "ArrowRight" ||
        e.key === "PageDown" ||
        e.key === " " ||
        e.key === "Enter"
      ) {
        e.preventDefault()
        proximo()
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault()
        anterior()
      } else if (e.key === "Home") {
        e.preventDefault()
        setAtual(0)
      } else if (e.key === "End") {
        e.preventDefault()
        setAtual(slides.length - 1)
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault()
        alternarFullscreen()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [proximo, anterior, alternarFullscreen])

  useEffect(() => {
    function onFs() {
      setFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener("fullscreenchange", onFs)
    return () => document.removeEventListener("fullscreenchange", onFs)
  }, [])

  const slide = slides[atual]
  const progresso = ((atual + 1) / slides.length) * 100

  return (
    <div className="flex h-screen w-screen flex-col bg-zinc-950 text-zinc-100">
      <div className="h-1 w-full bg-zinc-900">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-cyan-400 transition-all duration-300"
          style={{ width: `${progresso}%` }}
        />
      </div>

      <main className="flex-1 overflow-hidden">
        <div className="mx-auto flex h-full max-w-7xl flex-col px-12 py-10">
          <div className="mb-6 flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
            <Sparkles className="h-3.5 w-3.5" />
            {slide.bloco}
          </div>
          <div className="flex-1 overflow-y-auto pr-2">
            <RenderSlide slide={slide} />
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-800 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-12 py-3 text-xs text-zinc-400">
          <div className="flex items-center gap-4">
            <span className="font-mono text-base font-semibold text-zinc-100">
              {atual + 1} / {slides.length}
            </span>
            <span className="hidden text-zinc-500 md:inline">{slide.bloco}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={anterior}
              disabled={atual === 0}
              className="rounded border border-zinc-800 px-2 py-1 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Slide anterior"
            >
              ←
            </button>
            <button
              type="button"
              onClick={proximo}
              disabled={atual === slides.length - 1}
              className="rounded border border-zinc-800 px-2 py-1 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Próximo slide"
            >
              →
            </button>
            <button
              type="button"
              onClick={alternarFullscreen}
              className="ml-2 flex items-center gap-1.5 rounded border border-zinc-800 px-2 py-1 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-900"
              aria-label={fullscreen ? "Sair de fullscreen" : "Entrar em fullscreen"}
            >
              {fullscreen ? (
                <Minimize2 className="h-3 w-3" />
              ) : (
                <Maximize2 className="h-3 w-3" />
              )}
              <span className="hidden sm:inline">{fullscreen ? "Sair" : "Tela cheia"}</span>
            </button>
            <span className="ml-3 hidden text-zinc-600 lg:flex lg:items-center lg:gap-2">
              <Kbd>←</Kbd>
              <Kbd>→</Kbd>
              navegar
              <span className="mx-1">·</span>
              <Kbd>F</Kbd> tela cheia
              <span className="mx-1">·</span>
              <Kbd>Home</Kbd>
              <Kbd>End</Kbd> ir ao início/fim
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
      {children}
    </kbd>
  )
}

function RenderSlide({ slide }: { slide: Slide }) {
  switch (slide.tipo) {
    case "capa":
      return <SlideCapa slide={slide} />
    case "abertura-bloco":
      return <SlideAberturaBloco slide={slide} />
    case "arquitetura":
      return <SlideArquitetura slide={slide} />
    case "modulos":
      return <SlideModulos slide={slide} />
    case "stack":
      return <SlideStack slide={slide} />
    case "pagina":
      return <SlidePagina slide={slide} />
    case "agente-quem":
      return <SlideAgenteQuem slide={slide} />
    case "dupla-ia":
      return <SlideDuplaIA slide={slide} />
    case "ferramentas":
      return <SlideFerramentas slide={slide} />
    case "fluxograma":
      return <SlideFluxograma slide={slide} />
    case "encerramento":
      return <SlideEncerramento slide={slide} />
  }
}

function SlideCapa({ slide }: { slide: Extract<Slide, { tipo: "capa" }> }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/5 px-4 py-1.5 text-xs font-medium text-emerald-300">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
        Sistema em produção
      </div>
      <h1 className="bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-400 bg-clip-text text-7xl font-bold tracking-tight text-transparent">
        {slide.titulo}
      </h1>
      <p className="mt-6 text-2xl text-zinc-400">{slide.subtitulo}</p>
      <p className="mt-12 font-mono text-sm text-zinc-500">{slide.data}</p>
    </div>
  )
}

function SlideAberturaBloco({
  slide,
}: {
  slide: Extract<Slide, { tipo: "abertura-bloco" }>
}) {
  return (
    <div className="flex h-full flex-col justify-center">
      <h2 className="bg-gradient-to-br from-zinc-50 to-zinc-300 bg-clip-text text-5xl font-bold tracking-tight text-transparent">
        {slide.titulo}
      </h2>
      <p className="mt-6 max-w-3xl text-xl leading-relaxed text-zinc-400">
        {slide.descricao}
      </p>
      <ul className="mt-12 space-y-3">
        {slide.destaques.map((d, i) => (
          <li key={i} className="flex items-start gap-3 text-lg text-zinc-300">
            <ArrowRight className="mt-1.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
            <span>{d}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SlideArquitetura({
  slide,
}: {
  slide: Extract<Slide, { tipo: "arquitetura" }>
}) {
  return (
    <div>
      <h2 className="text-4xl font-bold tracking-tight text-zinc-50">{slide.titulo}</h2>
      <div className="mt-10 space-y-3">
        {slide.camadas.map((camada, i) => (
          <div key={camada.nome}>
            <div
              className={cn(
                "rounded-xl border p-5",
                COR_MAP[camada.cor] ?? "border-zinc-700 bg-zinc-900"
              )}
            >
              <div className="mb-2 text-xs font-medium uppercase tracking-wider opacity-80">
                Camada {i + 1}
              </div>
              <div className="mb-3 text-lg font-semibold">{camada.nome}</div>
              <div className="flex flex-wrap gap-2">
                {camada.itens.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-current/30 bg-zinc-950/50 px-3 py-1 text-sm"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
            {i < slide.camadas.length - 1 && (
              <div className="flex justify-center py-1">
                <ChevronDown className="h-5 w-5 text-zinc-600" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function SlideModulos({ slide }: { slide: Extract<Slide, { tipo: "modulos" }> }) {
  return (
    <div>
      <h2 className="text-4xl font-bold tracking-tight text-zinc-50">{slide.titulo}</h2>
      <div className="mt-10 grid grid-cols-3 gap-4">
        {slide.modulos.map((mod) => {
          const Icone = mod.icone
          return (
            <div
              key={mod.nome}
              className="group rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition-colors hover:border-emerald-500/40 hover:bg-zinc-900"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <Icone className="h-5 w-5" />
              </div>
              <div className="text-base font-semibold text-zinc-100">{mod.nome}</div>
              <div className="mt-0.5 font-mono text-xs text-zinc-500">{mod.rota}</div>
              <div className="mt-2 text-sm text-zinc-400">{mod.descricao}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SlideStack({ slide }: { slide: Extract<Slide, { tipo: "stack" }> }) {
  return (
    <div>
      <h2 className="text-4xl font-bold tracking-tight text-zinc-50">{slide.titulo}</h2>
      <div className="mt-10 grid grid-cols-2 gap-4">
        {slide.grupos.map((grupo) => (
          <div
            key={grupo.nome}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5"
          >
            <div className="mb-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
              {grupo.nome}
            </div>
            <ul className="space-y-2.5">
              {grupo.itens.map((item) => (
                <li key={item.nome} className="flex items-baseline gap-3">
                  <span className="text-sm font-semibold text-zinc-100">{item.nome}</span>
                  <span className="text-sm text-zinc-400">{item.uso}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

function SlidePagina({ slide }: { slide: Extract<Slide, { tipo: "pagina" }> }) {
  const Icone = slide.icone
  return (
    <div>
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
          <Icone className="h-7 w-7" />
        </div>
        <div>
          <h2 className="text-4xl font-bold tracking-tight text-zinc-50">
            {slide.titulo}
          </h2>
          <div className="mt-1 font-mono text-sm text-zinc-500">{slide.rota}</div>
        </div>
      </div>

      <p className="mt-8 text-lg leading-relaxed text-zinc-300">{slide.papel}</p>

      <div className="mt-8 grid grid-cols-2 gap-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
            O que faz
          </div>
          <ul className="space-y-2">
            {slide.funcionalidades.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-emerald-400" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
          <div className="mb-3 text-xs font-medium uppercase tracking-wider text-amber-300">
            Decisão por trás
          </div>
          <p className="text-sm leading-relaxed text-zinc-200">{slide.decisao}</p>
        </div>
      </div>
    </div>
  )
}

function SlideAgenteQuem({
  slide,
}: {
  slide: Extract<Slide, { tipo: "agente-quem" }>
}) {
  return (
    <div>
      <h2 className="text-4xl font-bold tracking-tight text-zinc-50">{slide.titulo}</h2>

      <div className="mt-10 grid grid-cols-2 gap-3">
        {slide.atributos.map((a) => (
          <div
            key={a.rotulo}
            className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
          >
            <div className="text-xs uppercase tracking-wider text-zinc-500">
              {a.rotulo}
            </div>
            <div className="mt-1 text-base font-semibold text-zinc-100">{a.valor}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
        <div className="mb-3 text-xs font-medium uppercase tracking-wider text-emerald-300">
          O que ela faz
        </div>
        <ul className="space-y-2">
          {slide.pilares.map((p) => (
            <li key={p} className="flex items-start gap-2 text-sm text-zinc-200">
              <ArrowRight className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function SlideDuplaIA({ slide }: { slide: Extract<Slide, { tipo: "dupla-ia" }> }) {
  return (
    <div>
      <h2 className="text-4xl font-bold tracking-tight text-zinc-50">{slide.titulo}</h2>
      <div className="mt-10 grid grid-cols-2 gap-5">
        {[slide.ana, slide.analista].map((agente, i) => (
          <div
            key={agente.titulo}
            className={cn(
              "rounded-xl border p-6",
              i === 0
                ? "border-emerald-500/40 bg-emerald-500/5"
                : "border-purple-500/40 bg-purple-500/5"
            )}
          >
            <div className="mb-1 text-2xl font-bold text-zinc-50">{agente.titulo}</div>
            <div className="font-mono text-xs text-zinc-500">{agente.modelo}</div>
            <div className="mt-3 text-base font-medium text-zinc-300">{agente.papel}</div>
            <ul className="mt-5 space-y-2">
              {agente.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-zinc-300">
                  <span
                    className={cn(
                      "mt-1 h-1 w-1 flex-shrink-0 rounded-full",
                      i === 0 ? "bg-emerald-400" : "bg-purple-400"
                    )}
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

function SlideFerramentas({
  slide,
}: {
  slide: Extract<Slide, { tipo: "ferramentas" }>
}) {
  return (
    <div>
      <h2 className="text-4xl font-bold tracking-tight text-zinc-50">{slide.titulo}</h2>
      <div className="mt-8 grid grid-cols-3 gap-3">
        {slide.ferramentas.map((f) => {
          const cat = CATEGORIA_LABEL[f.categoria]
          return (
            <div
              key={f.nome}
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
            >
              <div className="mb-1 flex items-center justify-between">
                <code className="font-mono text-xs font-semibold text-zinc-100">
                  {f.nome}
                </code>
                <span
                  className={cn(
                    "rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase",
                    cat.cor
                  )}
                >
                  {cat.rotulo}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-zinc-400">{f.descricao}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SlideFluxograma({
  slide,
}: {
  slide: Extract<Slide, { tipo: "fluxograma" }>
}) {
  return (
    <div>
      <h2 className="text-3xl font-bold tracking-tight text-zinc-50">{slide.titulo}</h2>
      <p className="mt-2 text-base text-zinc-400">{slide.subtitulo}</p>
      <div className="mt-8 space-y-1">
        {slide.passos.map((passo, i) => (
          <PassoRender
            key={passo.id}
            passo={passo}
            ultimo={i === slide.passos.length - 1}
          />
        ))}
      </div>
    </div>
  )
}

function PassoRender({ passo, ultimo }: { passo: PassoFluxo; ultimo: boolean }) {
  return (
    <>
      {passo.ramo ? (
        <div>
          <CaixaPasso passo={passo} />
          <div className="grid gap-3 py-2 md:grid-cols-3">
            {passo.ramo.map((r) => (
              <div
                key={r.rotulo}
                className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3"
              >
                <div className="mb-2 text-center text-xs font-bold uppercase tracking-wider text-amber-300">
                  → {r.rotulo}
                </div>
                <div className="space-y-1">
                  {r.passos.map((rp, j) => (
                    <PassoRender
                      key={rp.id}
                      passo={rp}
                      ultimo={j === r.passos.length - 1}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <CaixaPasso passo={passo} />
      )}
      {!ultimo && (
        <div className="flex justify-center py-0.5">
          <ChevronDown className="h-4 w-4 text-zinc-600" />
        </div>
      )}
    </>
  )
}

function CaixaPasso({ passo }: { passo: PassoFluxo }) {
  const corClasse = passo.destaque
    ? DESTAQUE_COR[passo.destaque]
    : "border-zinc-700 bg-zinc-900/50"
  const label = passo.destaque ? DESTAQUE_LABEL[passo.destaque] : null
  return (
    <div className={cn("rounded-lg border px-4 py-2.5", corClasse)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 text-sm font-medium text-zinc-100">{passo.texto}</div>
        {label && (
          <span className="rounded bg-zinc-950/60 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-300">
            {label}
          </span>
        )}
      </div>
      {passo.detalhe && (
        <div className="mt-0.5 text-xs text-zinc-400">{passo.detalhe}</div>
      )}
    </div>
  )
}

function SlideEncerramento({
  slide,
}: {
  slide: Extract<Slide, { tipo: "encerramento" }>
}) {
  return (
    <div className="flex h-full flex-col justify-center">
      <h2 className="bg-gradient-to-br from-emerald-300 via-emerald-200 to-cyan-300 bg-clip-text text-6xl font-bold tracking-tight text-transparent">
        {slide.titulo}
      </h2>
      <p className="mt-4 text-2xl text-zinc-400">{slide.subtitulo}</p>
      <div className="mt-12 max-w-3xl space-y-3">
        {slide.perguntas.map((p, i) => (
          <div
            key={i}
            className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-base text-zinc-300"
          >
            <span className="mr-3 font-mono text-xs text-emerald-400">{i + 1}.</span>
            {p}
          </div>
        ))}
      </div>
    </div>
  )
}

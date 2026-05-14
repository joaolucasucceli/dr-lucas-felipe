import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Atualização do sistema — 14 de maio | Dr. Lucas Ferreira",
  description:
    "Resumo das mudanças entregues no sistema de atendimento WhatsApp do Dr. Lucas Felipe Ferreira.",
  robots: { index: false, follow: false },
}

const whatsappJoao = process.env.NEXT_PUBLIC_JOAO_WHATSAPP ?? "5527981377474"
const linkAjusteHandoff = `https://wa.me/${whatsappJoao}?text=${encodeURIComponent(
  "Olá João, vi a página de atualização. Quero pedir um ajuste sobre o handoff de orçamento: "
)}`
const linkConfirmarTudo = `https://wa.me/${whatsappJoao}?text=${encodeURIComponent(
  "Olá João, vi a página de atualização. Tá tudo certo, pode seguir. Sobre as 2 pendências da minha parte: "
)}`

export default function AtualizacaoPage() {
  return (
    <div className="min-h-screen bg-site-dark text-site-light">
      <div className="mx-auto max-w-3xl px-5 py-12 md:px-8 md:py-16">
        {/* Header */}
        <header className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-site-gold/15 px-3 py-1 text-xs font-medium uppercase tracking-widest text-site-gold">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-site-gold" />
            Atualização do sistema · 14 de maio
          </div>
          <h1 className="mt-4 font-heading text-3xl font-bold leading-tight tracking-tight md:text-4xl">
            Lucas, o sistema avançou bastante. Aqui o resumo, em 5 minutos.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-site-light/70">
            Sem jargão técnico. O que mudou, como a Ana Júlia (sua IA) tá se comportando hoje, o que tá garantido, o que ainda pode dar errado, e as duas coisas que precisam de você pra eu ligar 100%.
          </p>
        </header>

        {/* TLDR */}
        <section className="mb-12 grid gap-3 md:grid-cols-3">
          <Card title="O que está rodando">
            <span className="text-2xl font-semibold text-emerald-400">4 fluxos</span>
            <p className="mt-1 text-sm text-site-light/60">
              completos de atendimento
            </p>
          </Card>
          <Card title="Testes do dia">
            <span className="text-2xl font-semibold text-emerald-400">8 / 8</span>
            <p className="mt-1 text-sm text-site-light/60">
              cenários ponta-a-ponta verde
            </p>
          </Card>
          <Card title="Falta de você">
            <span className="text-2xl font-semibold text-site-gold">2 coisas</span>
            <p className="mt-1 text-sm text-site-light/60">
              que só fecham com você
            </p>
          </Card>
        </section>

        {/* Em 1 parágrafo */}
        <Section number="1" titulo="O que esse sistema faz, em 1 parágrafo">
          <p>
            O paciente manda mensagem no WhatsApp da clínica. A <b className="text-site-light">Ana Júlia</b> atende sozinha: pergunta o que ele quer, manda exemplo antes-e-depois, dá uma faixa de preço dos casos simples, oferece horário pra avaliação online, marca na sua agenda do Google Calendar, lembra antes da reunião e pergunta depois se ele compareceu. Quando o caso é complicado e foge do padrão, ela <b className="text-site-light">chama você direto no seu WhatsApp pessoal</b>, espera você responder, e volta a atender quando o assunto destrava.
          </p>
        </Section>

        {/* 4 cenários */}
        <Section number="2" titulo="Os 4 cenários reais que o sistema cobre">
          {/* Cenário 1 */}
          <CasoCard titulo="Cenário 1 · Paciente novo chega" status="funcionando">
            <p>
              Maria nunca falou com a clínica. Manda &quot;Oi, queria fazer lipo&quot;.
            </p>
            <Conversa
              mensagens={[
                { de: "paciente", txt: "Oi! Queria saber sobre lipoaspiração" },
                {
                  de: "ia",
                  txt:
                    "Oi! Tudo bem? Posso te explicar como funciona aqui. Você consegue me mandar uma foto da região que quer trabalhar? Assim consigo te dar uma ideia melhor.",
                },
                { de: "paciente", txt: "[manda foto] É abdome e flancos" },
                {
                  de: "ia",
                  txt:
                    "Tô vendo aqui. Pra abdome + flancos, temos a oferta Paciente Modelo. Sai por uma faixa de R$ X parcelado em 12x. Posso te explicar o que tá incluso?",
                },
              ]}
            />
            <p>
              Depois ela manda 3 fotos de resultado, segue conversando, e <b className="text-site-light">quando a paciente fica segura, oferece horários da sua agenda real</b> pra avaliação online (consultando o Google Calendar pra não bater com nada que você já tem marcado).
            </p>
          </CasoCard>

          {/* Cenário 2 */}
          <CasoCard titulo="Cenário 2 · O dia da avaliação online" status="funcionando">
            <p>Maria marcou avaliação online pra 15h de quarta. O sistema:</p>
            <ul className="ml-0 list-none space-y-2 pl-0">
              <Bullet>
                <b className="text-site-light">1 dia antes:</b> manda lembrete pedindo confirmação.
              </Bullet>
              <Bullet>
                <b className="text-site-light">Na hora:</b> você e a paciente entram na chamada.
              </Bullet>
              <Bullet>
                <b className="text-site-light">1 hora depois da reunião:</b> a Ana Júlia pergunta na conversa &quot;Maria, conseguiu fazer? Como foi?&quot;.
              </Bullet>
              <Bullet>
                Se a paciente disser <b className="text-site-light">sim</b>, ela <b className="text-site-light">encerra a conversa</b> (a IA não atrapalha mais — você assume daqui).
              </Bullet>
              <Bullet>
                Se disser <b className="text-site-light">não consegui</b>, ela oferece remarcar.
              </Bullet>
            </ul>
            <p className="text-sm text-site-light/55">
              Esse cenário acabou de ser entregue. Antes, depois da avaliação a IA continuava respondendo e às vezes interferia em conversas que você estava tocando direto.
            </p>
          </CasoCard>

          {/* Cenário 3 */}
          <CasoCard titulo="Cenário 3 · Paciente quer preço de caso simples" status="funcionando">
            <p>
              Joana quer abdome + flancos (caso clássico, tá no catálogo Paciente Modelo).
            </p>
            <p>
              A IA consulta a tabela de procedimentos, lê o valor que <b className="text-site-light">você mesmo cadastrou</b> no painel, e responde com a faixa + parcelamento. <b className="text-site-light">Nunca inventa valor.</b> Se algum dia faltar valor cadastrado pra alguma região, ela cai automaticamente no Cenário 4.
            </p>
          </CasoCard>

          {/* Cenário 4 */}
          <CasoCard titulo="Cenário 4 · Caso complexo, IA chama você" status="novo">
            <p>Esse aqui foi o coração do trabalho. Você disse:</p>
            <Quote autor="Você, áudio de 12/05">
              Cada caso é um caso e não adianta valor fixo. Quero que a IA me sinalize no momento do orçamento, eu analiso, defino o valor e ela retoma.
            </Quote>
            <p>
              <b className="text-site-light">Cenário:</b> Maria manda &quot;abdome + flancos + braços, fora do programa paciente modelo, vi outra clínica cobrando R$ 25k, me passa o valor exato hoje&quot;.
            </p>
            <p>
              <b className="text-site-light">O que o sistema faz hoje:</b>
            </p>
            <ul className="ml-0 list-none space-y-2 pl-0">
              <Bullet>
                Reconhece automaticamente que isso é caso complexo (3 regiões juntas, uma região que não tá no combo padrão, comparação com outra clínica, e urgência).
              </Bullet>
              <Bullet>
                Pausa a Ana Júlia. Ela manda só: <i>&quot;Maria, deixa eu já alinhar com o Lucas pra te passar um valor que faça sentido pro seu caso. Te respondo em até algumas horas, pode ser?&quot;</i>
              </Bullet>
              <Bullet>
                Manda mensagem no <b className="text-site-light">seu WhatsApp pessoal</b> com o resumo do caso (regiões, se tem foto, o pedido exato).
              </Bullet>
              <Bullet>
                A IA <b className="text-site-light">fica muda</b> nessa conversa. Mesmo que a paciente continue mandando, ela não responde.
              </Bullet>
              <Bullet>
                Quando você responder a Maria <b className="text-site-light">pelo número da clínica</b>, o sistema detecta e libera a IA pra voltar a atender se a paciente continuar a conversa.
              </Bullet>
            </ul>
            <p className="text-sm text-site-light/55">
              Foi o que deu mais trabalho: o modelo de IA original ignorava a instrução em metade dos casos. Tive que adicionar uma camada extra que detecta o gatilho e <b className="text-site-light">obriga</b> a IA a te chamar. Nos testes, em 100% dos casos qualificados a IA agora te chama.
            </p>
          </CasoCard>
        </Section>

        {/* Garantido vs pode dar errado */}
        <Section number="3" titulo="O que tá garantido e o que ainda pode dar errado">
          <div className="rounded-xl bg-emerald-500/8 p-5 ring-1 ring-emerald-500/20">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-emerald-400">
              O que tá garantido
            </h3>
            <ul className="space-y-2">
              <CheckItem>A IA não inventa preço. Lê só o que você cadastrou.</CheckItem>
              <CheckItem>A IA não inventa horário. Lê só o que tá livre na sua agenda.</CheckItem>
              <CheckItem>A IA não fala como se enxergasse a foto do paciente.</CheckItem>
              <CheckItem>Quando você responde direto ao paciente, a IA percebe e some da conversa.</CheckItem>
              <CheckItem>Se o paciente pede caso complexo, a IA te chama e fica muda esperando.</CheckItem>
              <CheckItem>Quando o paciente comparece na avaliação, a IA encerra a conversa.</CheckItem>
              <CheckItem>Se algo quebra dentro do sistema, a IA diz &quot;deu uma travadinha, manda de novo&quot;.</CheckItem>
            </ul>
          </div>

          <div className="mt-4 rounded-xl bg-site-gold/8 p-5 ring-1 ring-site-gold/30">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-site-gold">
              O que ainda pode dar errado (e o plano)
            </h3>
            <ul className="space-y-2 text-site-light/70">
              <Bullet>
                <b className="text-site-light">Casos de borda do Cenário 4:</b> se a paciente usar uma forma de pedir valor que a gente não previu, a IA pode entrar no fluxo padrão em vez de te chamar. Plano: na call, a gente refina a lista de palavras-chave.
              </Bullet>
              <Bullet>
                <b className="text-site-light">Notificação no seu WhatsApp:</b> ainda falta confirmar o seu número e fazer um teste real (não testamos com o seu número ainda, só com paciente fake).
              </Bullet>
              <Bullet>
                <b className="text-site-light">Tela do painel com orçamentos pendentes:</b> hoje o evento fica no banco mas não tem uma tela visual pra você acompanhar a fila. Fase 2.
              </Bullet>
              <Bullet>
                <b className="text-site-light">Lembrete automático:</b> se você não responder em 4h, a gente quer te re-pingar. Fase 2.
              </Bullet>
            </ul>
          </div>
        </Section>

        {/* Pendências */}
        <Section number="4" titulo="As 2 coisas que dependem de você">
          <div className="space-y-4">
            <Pendencia titulo="1. Confirmar o seu WhatsApp e validar as palavras-chave">
              <Bullet>
                <b className="text-site-light">Qual é o seu número pessoal de WhatsApp?</b> O sistema vai te mandar o ping nesse número quando aparecer caso complexo.
              </Bullet>
              <Bullet>
                <b className="text-site-light">Validar a lista de palavras-chave</b> que devem disparar o ping. Hoje cobrimos: combo de regiões fora do padrão, &quot;fora do paciente modelo&quot;, &quot;lipo de braço&quot;, &quot;papada&quot;, &quot;mamas&quot;, &quot;coxas&quot;, &quot;decidir hoje&quot;, &quot;vi outra clínica cobrando&quot;.
              </Bullet>
              <Bullet>
                <b className="text-site-light">1 teste real ponta a ponta</b> com o seu número (paciente fictício manda → você recebe o ping → responde → paciente recebe).
              </Bullet>
            </Pendencia>

            <Pendencia titulo="2. Descrição clínica de 4 procedimentos novos">
              <p>
                Hidrolipo, Lipo Fit, Lipo Butt e PMMA-áreas estão na tabela com descrição genérica do tipo &quot;descrição completa pendente&quot;. Pra a IA explicar bem cada um quando o paciente perguntar, precisa do texto seu.
              </p>
              <p>
                <b className="text-site-light">Como fechar:</b> 15-20 minutos de áudio seu por WhatsApp explicando cada um — eu transcrevo e salvo no painel.
              </p>
            </Pendencia>
          </div>
        </Section>

        {/* CTA */}
        <section className="mt-12 rounded-2xl bg-gradient-to-br from-site-green/50 to-site-green-hover/30 p-6 ring-1 ring-site-green/40 md:p-8">
          <h3 className="font-heading text-xl font-semibold md:text-2xl">
            Próximo passo
          </h3>
          <p className="mt-2 text-site-light/80">
            Lê isso aí com calma, e quando der me manda um sinal por WhatsApp. Posso resolver os 2 pontos em 15 minutos com você.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <a
              href={linkConfirmarTudo}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 font-medium text-emerald-950 transition hover:bg-emerald-400"
            >
              Tá ok, vamos fechar as pendências
            </a>
            <a
              href={linkAjusteHandoff}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-site-gold/15 px-5 py-3 font-medium text-site-gold ring-1 ring-site-gold/40 transition hover:bg-site-gold/25"
            >
              Quero pedir um ajuste
            </a>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-16 border-t border-site-light/10 pt-6 text-center text-xs text-site-light/40">
          <p>
            Atualização do sistema · 14 de maio de 2026 · sistema em produção · 8 cenários testados verde · página privada gerada pelo João
          </p>
          <Link
            href="/"
            className="mt-2 inline-block text-site-gold/60 hover:text-site-gold"
          >
            ← voltar ao site
          </Link>
        </footer>
      </div>
    </div>
  )
}

/* ============== Componentes internos ============== */

function Section({
  number,
  titulo,
  children,
}: {
  number: string
  titulo: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-12">
      <h2 className="mb-4 font-heading text-2xl font-semibold tracking-tight md:text-3xl">
        <span className="mr-3 text-site-gold">{number}.</span>
        {titulo}
      </h2>
      <div className="space-y-4 text-site-light/75 [&>p]:leading-relaxed">
        {children}
      </div>
    </section>
  )
}

function Card({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl bg-site-dark-alt p-5 ring-1 ring-site-light/10">
      <div className="text-xs font-medium uppercase tracking-widest text-site-light/50">
        {title}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  )
}

function CasoCard({
  titulo,
  status,
  children,
}: {
  titulo: string
  status: "funcionando" | "novo"
  children: React.ReactNode
}) {
  const cor =
    status === "funcionando"
      ? "bg-emerald-500/12 text-emerald-400 ring-emerald-500/30"
      : "bg-site-gold/15 text-site-gold ring-site-gold/40"
  return (
    <div className="mt-4 rounded-xl bg-site-dark-alt p-6 ring-1 ring-site-light/10">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-heading text-lg font-semibold text-site-light md:text-xl">
          {titulo}
        </h3>
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ring-1 ${cor}`}
        >
          {status === "funcionando" ? "funcionando" : "novo · entregue"}
        </span>
      </div>
      <div className="mt-3 space-y-3 text-site-light/75 [&>p]:leading-relaxed">
        {children}
      </div>
    </div>
  )
}

function Conversa({
  mensagens,
}: {
  mensagens: { de: "paciente" | "ia"; txt: string }[]
}) {
  return (
    <div className="my-4 rounded-lg bg-site-dark/60 p-4 ring-1 ring-site-light/5">
      {mensagens.map((m, i) => (
        <div key={i} className="flex gap-3 py-1.5">
          <div
            className={`w-16 shrink-0 pt-0.5 text-[10px] font-semibold uppercase tracking-widest ${
              m.de === "ia" ? "text-site-gold" : "text-site-light/50"
            }`}
          >
            {m.de === "ia" ? "Ana Júlia" : "Paciente"}
          </div>
          <div className="flex-1 text-sm text-site-light/85">{m.txt}</div>
        </div>
      ))}
    </div>
  )
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="relative pl-6 text-site-light/75">
      <span
        aria-hidden
        className="absolute left-0 top-2 inline-block h-1.5 w-1.5 rounded-full bg-site-gold"
      />
      <span className="leading-relaxed">{children}</span>
    </li>
  )
}

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="relative pl-7 text-site-light/85">
      <span
        aria-hidden
        className="absolute left-0 top-0.5 text-emerald-400"
      >
        ✓
      </span>
      <span className="leading-relaxed">{children}</span>
    </li>
  )
}

function Quote({
  autor,
  children,
}: {
  autor: string
  children: React.ReactNode
}) {
  return (
    <div className="my-3 rounded-lg border-l-2 border-site-gold bg-site-dark/40 px-4 py-3 italic text-site-light/85">
      <p>&quot;{children}&quot;</p>
      <p className="mt-2 text-xs not-italic text-site-light/50">— {autor}</p>
    </div>
  )
}

function Pendencia({
  titulo,
  children,
}: {
  titulo: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl bg-site-dark-alt p-6 ring-1 ring-site-gold/30">
      <h3 className="font-heading text-lg font-semibold text-site-light">
        {titulo}
      </h3>
      <div className="mt-3 space-y-2 text-site-light/75">
        <ul className="space-y-2">{children}</ul>
      </div>
    </div>
  )
}

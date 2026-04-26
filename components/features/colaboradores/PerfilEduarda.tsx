import {
  User,
  Stethoscope,
  TrendingUp,
  GitBranch,
  StickyNote,
} from "lucide-react"
import {
  PerfilColaboradorHero,
  SecaoPerfil,
  RotinaDiaria,
  FerramentasGrid,
  JeitaoList,
} from "./PerfilColaborador"

export function PerfilEduarda() {
  return (
    <div className="space-y-8">
      <PerfilColaboradorHero
        nome="Eduarda"
        cargo="Analista de CRM · Apoio comercial"
        iniciais="ED"
        bio="Não conversa diretamente com paciente. O trabalho dela é ler cada conversa da Ana Júlia e manter o cadastro do lead sempre organizado e atualizado — pra que o time saiba em que pé cada atendimento está."
        gradientClasses="from-violet-900 to-purple-700"
      />

      <SecaoPerfil titulo="Como é o dia a dia dela">
        <RotinaDiaria
          passos={[
            {
              numero: 1,
              titulo: "Ana Júlia responde um paciente",
              descricao: "Toda vez que a Ana Júlia termina uma resposta no WhatsApp, a Eduarda é acionada em silêncio — o atendimento nem percebe.",
            },
            {
              numero: 2,
              titulo: "Lê a conversa inteira",
              descricao: "Pega os últimos 30 turnos da conversa e o estado atual do lead no sistema. Lê com calma, como um analista humano leria.",
            },
            {
              numero: 3,
              titulo: "Avalia o que mudou",
              descricao: "Paciente deu o nome? Falou de um procedimento específico? Apareceu sinal de que tá pronto pra fechar — ou sinal de desqualificação? Ela identifica e categoriza.",
            },
            {
              numero: 4,
              titulo: "Atualiza o cadastro",
              descricao: "Escreve no CRM respeitando regras claras: nunca regride uma etapa do funil, nunca salta direto pra 'reunião agendada' (isso quem marca é a Ana Júlia).",
            },
            {
              numero: 5,
              titulo: "Fim. Aguarda a próxima resposta",
              descricao: "Trabalho dela termina. A Ana Júlia segue conversando, e quando tiver nova resposta a Eduarda entra em ação de novo.",
            },
          ]}
        />
      </SecaoPerfil>

      <SecaoPerfil titulo="Ferramentas que ela usa">
        <FerramentasGrid
          ferramentas={[
            {
              icone: <User />,
              nome: "Nome do paciente",
              descricao: "Quando o paciente se apresenta na conversa, ela atualiza o nome oficial no sistema.",
            },
            {
              icone: <Stethoscope />,
              nome: "Procedimento de interesse",
              descricao: "Identifica qual procedimento o paciente quer e marca no cadastro — ajuda o time a preparar a avaliação.",
            },
            {
              icone: <TrendingUp />,
              nome: "Qualificação comercial",
              descricao: "Dá uma nota de 0 a 100 baseada em timing, orçamento, decisor, expectativa. Ajuda a priorizar leads.",
            },
            {
              icone: <GitBranch />,
              nome: "Etapa do funil",
              descricao: "Move o lead entre acolhimento, qualificação e agendamento conforme a conversa evolui.",
            },
            {
              icone: <StickyNote />,
              nome: "Observações sobre o paciente",
              descricao: "Adiciona anotações relevantes no 'sobre o paciente'. Sinais comerciais entram com marcação pra filtrar depois.",
            },
          ]}
        />
      </SecaoPerfil>

      <SecaoPerfil titulo="Como ela se comporta">
        <JeitaoList
          regras={[
            "Só acrescenta informação — nunca apaga ou sobrescreve o que outro anotou antes.",
            "Só avança etapa do funil quando tem evidência clara na conversa. Na dúvida, mantém a etapa atual.",
            "Sinais de venda importantes (timing claro, quem decide, orçamento, contraindicações) entram nas observações com marcação tipo [sinal:...] — fica fácil filtrar pra depois.",
            "Ela não marca avaliação. Marcar avaliação é responsabilidade exclusiva da Ana Júlia — a Eduarda só reconhece depois que a Ana Júlia agendou.",
            "Toda análise dela fica guardada internamente pra auditoria, mesmo que não apareça no painel.",
          ]}
        />
      </SecaoPerfil>
    </div>
  )
}

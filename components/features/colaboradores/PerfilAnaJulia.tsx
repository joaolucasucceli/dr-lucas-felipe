import {
  UserSearch,
  Stethoscope,
  BookOpen,
  CalendarDays,
  CalendarCheck,
  Film,
} from "lucide-react"
import {
  PerfilColaboradorHero,
  SecaoPerfil,
  RotinaDiaria,
  FerramentasGrid,
  JeitaoList,
} from "./PerfilColaborador"

export function PerfilAnaJulia() {
  return (
    <div className="space-y-8">
      <PerfilColaboradorHero
        nome="Ana Júlia"
        cargo="SDR · Atendimento comercial"
        iniciais="AJ"
        bio="Fala com todo paciente que chega no WhatsApp da clínica. Acolhe, tira dúvidas, consulta a agenda e conduz a conversa até fechar a avaliação com o Dr. Lucas."
        gradientClasses="from-pink-500 to-rose-400"
      />

      <SecaoPerfil titulo="Como é o dia a dia dela">
        <RotinaDiaria
          passos={[
            {
              numero: 1,
              titulo: "Paciente manda mensagem",
              descricao: "Chega uma nova conversa no WhatsApp da clínica e ela é notificada imediatamente.",
            },
            {
              numero: 2,
              titulo: "Consulta antes de responder",
              descricao: "Lê o histórico, busca dados do paciente, consulta a base de conhecimento da clínica pra responder com segurança.",
            },
            {
              numero: 3,
              titulo: "Responde como gente",
              descricao: "Escreve em blocos curtos, um depois do outro, com tempo natural entre mensagens — sem aquele jeito robótico de texto gigante.",
            },
            {
              numero: 4,
              titulo: "Fecha a avaliação",
              descricao: "Quando o paciente tá pronto, ela consulta a agenda, propõe um horário e, quando confirma, registra o agendamento no Google Calendar.",
            },
            {
              numero: 5,
              titulo: "Continua por perto",
              descricao: "Depois de marcar, segue respondendo dúvidas de pagamento, localização, preparação pré-avaliação, até o paciente aparecer.",
            },
          ]}
        />
      </SecaoPerfil>

      <SecaoPerfil titulo="Ferramentas que ela usa no dia a dia">
        <FerramentasGrid
          ferramentas={[
            {
              icone: <UserSearch />,
              nome: "Ficha do paciente",
              descricao: "Busca quem tá do outro lado pelo número de WhatsApp. Se não existir, ela cria.",
            },
            {
              icone: <Stethoscope />,
              nome: "Catálogo de procedimentos",
              descricao: "Consulta quais procedimentos a clínica faz e quanto tempo cada um dura.",
            },
            {
              icone: <BookOpen />,
              nome: "Base de conhecimento",
              descricao: "Busca info da clínica quando o paciente pergunta algo específico — localização, pagamento, pós-operatório.",
            },
            {
              icone: <CalendarDays />,
              nome: "Agenda do Dr. Lucas",
              descricao: "Confere os horários livres antes de propor algo — nunca propõe um horário que já tá ocupado.",
            },
            {
              icone: <CalendarCheck />,
              nome: "Marcação e remarcação",
              descricao: "Registra avaliação no Google Calendar. Remarca ou cancela quando o paciente pede.",
            },
            {
              icone: <Film />,
              nome: "Mídias de marketing",
              descricao: "Envia fotos antes/depois, depoimentos ou vídeos quando o paciente pede referência visual.",
            },
          ]}
        />
      </SecaoPerfil>

      <SecaoPerfil titulo="Como ela se comporta">
        <JeitaoList
          regras={[
            "Nunca fala de preço — valor é conversa do Dr. Lucas na avaliação presencial, caso a caso.",
            "Nunca admite ser inteligência artificial — ela é a atendente da clínica, ponto.",
            "Sempre consulta alguma ferramenta antes de afirmar — nada de inventar resposta.",
            "Escreve sem emojis. Transmite acolhimento pelas palavras, não por ícone.",
            "Quebra a resposta em mensagens curtas, com um pequeno intervalo entre elas, imitando o ritmo humano de digitação.",
            "Quem atualiza o cadastro do paciente não é ela — é a Eduarda, que trabalha em paralelo lendo cada conversa.",
          ]}
        />
      </SecaoPerfil>
    </div>
  )
}

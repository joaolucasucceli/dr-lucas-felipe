import { ShieldCheck, Shield, UserPlus, ToggleLeft } from "lucide-react"
import { HeroBanner } from "../HeroBanner"
import { FeaturesGrid } from "../FeaturesGrid"
import { ComoUsarSection } from "../ComoUsarSection"
import { PermissoesCallout } from "../PermissoesCallout"
import { DicaImportante } from "../DicaImportante"

export function ModuloUsuarios() {
  return (
    <div className="space-y-8">
      <HeroBanner
        icone={<ShieldCheck />}
        titulo="Usuários e Permissões"
        subtitulo="Gerenciamento de acesso e perfis dos usuários da plataforma"
        gradientClasses="from-yellow-500 to-amber-400"
      />

      <FeaturesGrid
        features={[
          {
            icone: <Shield />,
            titulo: "Dois perfis de acesso",
            descricao: "Gestor (acesso total ao sistema) e Atendente (módulos operacionais).",
          },
          {
            icone: <UserPlus />,
            titulo: "Cadastro de usuários",
            descricao: "Crie usuários com nome, e-mail, senha e perfil de acesso. Usuários do tipo IA são criados pelo seed do sistema.",
          },
          {
            icone: <ToggleLeft />,
            titulo: "Ativação e desativação",
            descricao: "Desative usuários sem deletar o histórico de atendimentos. Usuários inativos não conseguem fazer login.",
          },
        ]}
      />

      <ComoUsarSection
        passos={[
          {
            numero: 1,
            titulo: "Filtre por perfil",
            descricao: "Use os filtros de Perfil e Status para encontrar usuários específicos na lista.",
          },
          {
            numero: 2,
            titulo: "Crie um usuário",
            descricao: "Clique em 'Novo Usuário', defina nome, e-mail, senha e perfil de acesso. Salve para enviar o acesso ao colaborador.",
          },
          {
            numero: 3,
            titulo: "Desative quando necessário",
            descricao: "Use o menu de ações para editar dados ou desativar o usuário. Nunca exclua — apenas desative para preservar o histórico.",
          },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <PermissoesCallout
          permissoes={[
            {
              perfil: "Gestor",
              acesso: "total",
              acoes: ["Cria, edita e desativa usuários", "Define perfis de acesso"],
            },
            {
              perfil: "Atendente",
              acesso: "nenhum",
              acoes: [],
            },
          ]}
        />
        <DicaImportante
          texto="O usuário 'Ana Júlia' é do tipo IA com perfil Atendente. Ele nunca deve ser desativado — caso contrário, a IA para de registrar mensagens no banco de dados."
          variante="aviso"
        />
      </div>
    </div>
  )
}

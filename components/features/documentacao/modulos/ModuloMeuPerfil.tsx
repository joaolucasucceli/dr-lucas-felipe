import { User, Camera, Lock, Mail } from "lucide-react"
import { HeroBanner } from "../HeroBanner"
import { FeaturesGrid } from "../FeaturesGrid"
import { ComoUsarSection } from "../ComoUsarSection"

export function ModuloMeuPerfil() {
  return (
    <div className="space-y-6">
      <HeroBanner
        icone={<User />}
        titulo="Meu Perfil"
        subtitulo="Seus dados, foto e senha"
        gradientClasses="from-slate-600 to-gray-400"
      />

      <FeaturesGrid
        features={[
          {
            icone: <Camera />,
            titulo: "Foto de perfil",
            descricao: "JPG, PNG ou WebP até 5MB. Aparece no avatar do header.",
          },
          {
            icone: <Mail />,
            titulo: "Dados pessoais",
            descricao: "Atualize nome e e-mail. O nome aparece no header e nas interações do sistema.",
          },
          {
            icone: <Lock />,
            titulo: "Alterar senha",
            descricao: "Mínimo 6 caracteres. Precisa informar a senha atual pra trocar.",
          },
        ]}
      />

      <ComoUsarSection
        passos={[
          { numero: 1, titulo: "Acesse", descricao: "Clique no seu nome no canto superior direito e em 'Meu Perfil'." },
          { numero: 2, titulo: "Atualize a foto", descricao: "No card 'Foto', clique no ícone de câmera e escolha a imagem." },
          { numero: 3, titulo: "Salve mudanças", descricao: "Edite o que precisar e clique 'Salvar'. Pra senha, use o botão 'Alterar Senha'." },
        ]}
      />
    </div>
  )
}

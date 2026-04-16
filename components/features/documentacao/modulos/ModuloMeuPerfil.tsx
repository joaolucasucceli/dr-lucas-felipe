import { User, Camera, Lock, Mail } from "lucide-react"
import { HeroBanner } from "../HeroBanner"
import { FeaturesGrid } from "../FeaturesGrid"
import { ComoUsarSection } from "../ComoUsarSection"

export function ModuloMeuPerfil() {
  return (
    <div className="space-y-8">
      <HeroBanner
        icone={<User />}
        titulo="Meu Perfil"
        subtitulo="Gerencie seus dados pessoais, foto e senha"
        gradientClasses="from-slate-600 to-gray-400"
      />

      <FeaturesGrid
        features={[
          {
            icone: <Camera />,
            titulo: "Foto de perfil",
            descricao: "Envie sua foto e ela aparece no avatar do header. Aceita JPG, PNG ou WebP até 5MB. Troque a qualquer momento.",
          },
          {
            icone: <Mail />,
            titulo: "Dados pessoais",
            descricao: "Atualize seu nome e e-mail. O nome aparece no header e nas interações do sistema.",
          },
          {
            icone: <Lock />,
            titulo: "Alterar senha",
            descricao: "Troque sua senha informando a atual e a nova. Mínimo de 6 caracteres. A nova senha vale no próximo login.",
          },
        ]}
      />

      <ComoUsarSection
        passos={[
          {
            numero: 1,
            titulo: "Acesse Meu Perfil",
            descricao: "Clique no seu nome no canto superior direito e selecione 'Meu Perfil'.",
          },
          {
            numero: 2,
            titulo: "Atualize sua foto",
            descricao: "No card 'Foto de Perfil', clique no ícone de câmera e selecione uma imagem. O avatar atualiza imediatamente.",
          },
          {
            numero: 3,
            titulo: "Salve seus dados",
            descricao: "Edite nome ou e-mail e clique em 'Salvar'. Para alterar a senha, preencha os 3 campos e clique em 'Alterar Senha'.",
          },
        ]}
      />
    </div>
  )
}

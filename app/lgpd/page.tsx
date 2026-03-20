export default function LgpdPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Política de Privacidade
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Última atualização: março de 2026
        </p>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Sobre este documento</h2>
            <p>
              Esta Política de Privacidade descreve como a clínica do Dr. Lucas Felipe
              coleta, utiliza e protege seus dados pessoais em conformidade com a
              Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Dados coletados</h2>
            <p className="mb-2">
              Para prestação dos serviços de atendimento e agendamento, coletamos:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Nome completo</li>
              <li>Número de WhatsApp</li>
              <li>Endereço de e-mail (quando fornecido)</li>
              <li>Histórico de conversas via WhatsApp com o atendente virtual</li>
              <li>Informações sobre procedimentos de interesse</li>
              <li>Fotos e imagens enviadas durante o atendimento</li>
              <li>Dados de agendamentos e consultas realizadas</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Finalidade do tratamento</h2>
            <p className="mb-2">Seus dados são utilizados exclusivamente para:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Realizar e gerenciar agendamentos de consultas e procedimentos</li>
              <li>Enviar confirmações e lembretes de compromissos</li>
              <li>Personalizar o atendimento prestado</li>
              <li>Cumprir obrigações legais e regulatórias</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Base legal</h2>
            <p>
              O tratamento dos dados é realizado com base no consentimento do titular
              (art. 7º, I da LGPD) e na execução de contrato ou procedimentos
              preliminares (art. 7º, V da LGPD).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Compartilhamento</h2>
            <p>
              Seus dados não são vendidos ou compartilhados com terceiros para fins
              comerciais. Podem ser compartilhados apenas com fornecedores de tecnologia
              estritamente necessários para a operação do sistema (hospedagem, banco de dados),
              sob obrigações de confidencialidade.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Retenção dos dados</h2>
            <p>
              Seus dados são mantidos pelo período necessário à prestação dos serviços
              e ao cumprimento de obrigações legais. Após esse período, são anonimizados
              ou excluídos de forma segura.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Seus direitos como titular</h2>
            <p className="mb-2">
              De acordo com a LGPD, você tem os seguintes direitos em relação aos seus dados:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Acesso:</strong> solicitar confirmação e acesso aos seus dados pessoais
              </li>
              <li>
                <strong>Correção:</strong> solicitar a correção de dados incompletos, inexatos ou desatualizados
              </li>
              <li>
                <strong>Exclusão:</strong> solicitar a anonimização ou eliminação dos seus dados
              </li>
              <li>
                <strong>Portabilidade:</strong> receber seus dados em formato estruturado
              </li>
              <li>
                <strong>Revogação do consentimento:</strong> retirar seu consentimento a qualquer momento
              </li>
              <li>
                <strong>Oposição:</strong> opor-se ao tratamento em caso de descumprimento da LGPD
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Como exercer seus direitos</h2>
            <p className="mb-2">
              Para exercer qualquer um dos direitos acima, entre em contato:
            </p>
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="font-medium">Dr. Lucas Felipe — Clínica de Estética</p>
              <p className="mt-1 text-muted-foreground">
                E-mail:{" "}
                <a
                  href="mailto:contato@drlucasfelipe.com.br"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  contato@drlucasfelipe.com.br
                </a>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Responderemos sua solicitação em até 15 dias úteis, conforme previsto na LGPD.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Segurança dos dados</h2>
            <p>
              Adotamos medidas técnicas e organizacionais adequadas para proteger seus dados
              contra acesso não autorizado, destruição, alteração ou divulgação indevida,
              incluindo criptografia em trânsito (TLS) e controle de acesso baseado em perfis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Alterações nesta política</h2>
            <p>
              Esta política pode ser atualizada periodicamente. Notificaremos sobre mudanças
              significativas pelo WhatsApp ou e-mail cadastrado.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

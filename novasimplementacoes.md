# Novas Implementações — Central Dr. Lucas

> Roadmap de funcionalidades futuras para expandir o sistema além das necessidades operacionais imediatas. Documento de referência para apresentação e planejamento estratégico.

---

## 1. Experiência do Paciente

### Portal do Paciente
Área exclusiva onde o próprio paciente consegue agendar consultas, ver seu histórico e confirmar agendamentos — sem precisar passar pelo WhatsApp.

- Link único por paciente enviado via WhatsApp
- Auto-agendamento com seleção de procedimento, data e hora disponível
- Visualização do histórico de consultas e procedimentos realizados
- Upload de exames e documentos

### Confirmação Inteligente de Agendamento
Fluxo automatizado de confirmação antes da consulta.

- Mensagem automática 48h antes: "Confirme sua consulta respondendo SIM ou NÃO"
- Resposta SIM → status muda para `confirmado` automaticamente
- Resposta NÃO → oferta de remarcação com novas datas disponíveis
- Sem resposta em 24h → alerta no painel para a equipe entrar em contato

### Envio de Pré-operatório Automático
Após o agendamento de um procedimento, enviar automaticamente as instruções específicas para o paciente.

- Cadastro de material pré-operatório por tipo de procedimento
- Envio automático via WhatsApp no dia anterior à consulta
- Confirmação de leitura (se possível via leitura de mensagem)

### NPS Pós-consulta
Coleta de satisfação do paciente após realização do procedimento.

- Mensagem automática 24h após status `realizado`: "De 0 a 10, como foi sua experiência?"
- Resposta capturada e armazenada no perfil do lead
- Painel de NPS agregado nos Relatórios
- Alerta automático para notas abaixo de 7

---

## 2. Automação e Inteligência Artificial

### Sugestão de Procedimentos por Histórico
A Ana Júlia ou o painel sugere procedimentos baseados no perfil do paciente.

- Análise do histórico de procedimentos e interesse declarado
- Sugestões personalizadas durante qualificação
- Relatório de procedimentos mais solicitados por perfil de paciente

### Campanha de Reativação de Leads Inativos
Reengajamento automático de leads que pararam no funil.

- Critério configurável: lead sem movimentação há X dias
- Mensagem personalizada via Ana Júlia ou disparo manual em lote
- Rastreamento de taxa de resposta por campanha
- Exclusão automática de leads que optaram por sair

### Relatório de Sentimento das Conversas
Análise qualitativa das interações no WhatsApp.

- Classificação automática de conversas: positivo / neutro / negativo
- Identificação de padrões (objeções mais comuns, dúvidas frequentes)
- Painel semanal com resumo de sentimento para o Gestor
- Alertas para conversas com tom muito negativo

### Transcrição de Consultas
Integração Whisper para capturar informações de consultas.

- Gravação opcional de consulta via app mobile (com consentimento)
- Transcrição automática via Whisper API
- Extração de informações-chave para `sobreOPaciente`
- Geração automática de rascunho de prontuário

---

## 3. Gestão Clínica

### Módulo Financeiro
Controle de receita e faturamento integrado ao sistema.

- Registro de pagamentos por atendimento/procedimento
- Valores realizados vs. valores base dos procedimentos
- Relatório mensal de receita por procedimento, por origem e por período
- Controle de inadimplência (pagamentos pendentes)
- Exportação para Excel e integração com sistemas contábeis

### Prontuário Digital Básico
Registro clínico básico associado ao lead.

- Anamnese estruturada por tipo de procedimento
- Upload de fotos antes/depois com organização por data e procedimento
- Histórico de evolução do paciente
- Controle de acesso: somente Gestor e Atendente veem dados clínicos

### Contratos e Consentimento Digital
Digitalização de documentos obrigatórios.

- Templates de contrato por procedimento
- Assinatura eletrônica via link enviado ao paciente (integração DocuSign ou similar)
- Armazenamento seguro com rastreabilidade
- Alerta quando consentimento não foi coletado antes da consulta

### Gestão de Estoque de Insumos
Controle básico de materiais utilizados por procedimento.

- Cadastro de insumos com quantidade mínima
- Baixa automática ao registrar procedimento realizado
- Alertas de reposição quando abaixo do mínimo
- Relatório de consumo mensal

---

## 4. Relatórios e Analytics Avançados

### Dashboard Executivo
Visão estratégica do negócio em um único painel.

- Crescimento mês a mês (leads, agendamentos, receita)
- Taxa de conversão por etapa do funil comparada ao mês anterior
- Top 5 procedimentos mais realizados
- Previsão de receita baseada em agendamentos confirmados

### Relatório de Performance por Atendente
Acompanhamento individual de cada membro da equipe.

- Leads atendidos, convertidos e perdidos por atendente
- Tempo médio de resposta no WhatsApp
- Taxa de agendamento por lead qualificado
- Ranking semanal/mensal

### Funil Comparativo entre Períodos
Análise de evolução das conversões ao longo do tempo.

- Seleção de dois períodos para comparação lado a lado
- Identificação de etapas com maior queda de conversão
- Exportação de relatório em PDF com gráficos

### Exportação Avançada
Capacidade de exportar dados completos para análise externa.

- Exportação para Excel (.xlsx) de qualquer lista (leads, agendamentos, relatórios)
- Exportação para PDF de relatórios com formatação visual
- API de exportação para integração com ferramentas como Power BI ou Google Sheets

---

## 5. Infraestrutura e Escalabilidade

### Suporte Multi-clínica
Expansão do sistema para gerenciar múltiplas unidades.

- Separação de dados por unidade (schema multi-tenant)
- Usuários podem ter acesso a uma ou mais unidades
- Dashboard consolidado para visão geral de todas as unidades
- Relatórios por unidade e comparativos

### App Mobile / PWA
Acesso ao sistema em dispositivos móveis com experiência nativa.

- Progressive Web App instalável em iOS e Android
- Notificações push para novos leads e agendamentos
- Interface otimizada para telas pequenas
- Modo offline básico para consulta de leads e agendamentos

### Integração com Sistemas de Pagamento
Recebimento integrado diretamente na plataforma.

- Geração de link de pagamento por procedimento (Stone, PagSeguro, Mercado Pago)
- Confirmação automática de pagamento via webhook
- Registro de receita sem entrada manual
- Emissão de recibo digital ao paciente

### Audit Log e Rastreabilidade
Histórico completo de alterações no sistema.

- Registro automático de toda ação relevante (quem fez, o quê, quando)
- Painel de auditoria para o Gestor
- Alertas de ações suspeitas (exclusões em massa, acessos fora do horário)
- Backup automatizado diário com retenção configurável

### Integração com Agenda do Paciente
Envio de convite de calendário diretamente ao paciente.

- Envio automático de `.ics` por e-mail após confirmação do agendamento
- Integração com Google Calendar e Outlook do paciente
- Lembretes automáticos 1 semana, 1 dia e 2 horas antes

---

## Priorização Sugerida para V2

| Prioridade | Feature | Impacto | Esforço |
|-----------|---------|---------|---------|
| Alta | Confirmação inteligente de agendamento | Alto | Médio |
| Alta | NPS pós-consulta | Alto | Baixo |
| Alta | Módulo financeiro básico | Alto | Alto |
| Média | Campanha de reativação | Médio | Médio |
| Média | Dashboard executivo | Alto | Médio |
| Média | Portal do paciente | Alto | Alto |
| Baixa | Multi-clínica | Alto | Muito Alto |
| Baixa | App mobile / PWA | Médio | Alto |

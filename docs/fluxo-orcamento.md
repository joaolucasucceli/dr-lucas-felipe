# Fluxo de Orçamento — Ana Júlia (agente único)

> Blueprint do fluxo de orçamento. Trava o desenho antes de codar. Decidido com o João em 19/06/2026.

## Princípios
- **Um agente só (Ana Júlia).** Tudo que a Eduarda fazia, a Ana faz (cadastro + funil via `atualizar_lead`).
- **Uma reunião só.** Avaliação online = reunião de diagnóstico = reunião de avaliação — é o MESMO evento. O sistema só agenda esse. Outros tipos de evento (consulta presencial, procedimento, retorno, pós-op) **saem** do escopo da IA. Depois que vira paciente, a única coisa é a **ficha + prontuário**.
- **Qualificação =** (1) qual procedimento a pessoa quer, (2) qual região ela mais sente incômodo, (3) foto.

## Caminho A — orçamento real (com PDF)
1. Ana **acolhe → qualifica → gera interesse** com os materiais de marketing.
2. Com a qualificação completa (procedimento + região + foto), Ana pergunta: **"posso gerar um orçamento pra você?"**
3. Se **sim** → Ana envia ao **Dr. Lucas** (WhatsApp pessoal dele): **nome, telefone e resumo do caso** (procedimento, região, nº de fotos).
4. O Dr. Lucas responde no formato **`<número> - <valor>`** (ex.: `554599998888 - 8500`).
5. Ana **identifica a cliente pelo número**, **gera o PDF de orçamento** e **envia pra ela**.
6. Cliente **aprova** → Ana **agenda a reunião de diagnóstico** (= a avaliação online).

## Caminho B — só quer preço (sem qualificar)
1. Pessoa chega pedindo preço e **não quer** qualificar.
2. Ana manda o **valor aproximado** (a **faixa** do cadastro do procedimento — `faixaFormatada`). **Sem PDF, sem Dr. Lucas.**
3. Se a pessoa depois resolver qualificar → entra no **Caminho A** (orçamento real + PDF + agenda).

## O PDF de orçamento
- **Identidade visual do Dr. Lucas** + **foto dele** (`public/images/dr-lucas/`).
- Detalha: **o que a pessoa vai receber** (procedimento/escopo), **o valor** (o que o Dr. Lucas passou), **validade** do orçamento, **formas de pagamento/parcelamento**.
- Gerado on-the-fly e enviado como documento pelo WhatsApp.

## Como o sistema ingere a resposta do Dr. Lucas
- O Dr. Lucas manda `<número> - <valor>` pro **mesmo WhatsApp da clínica** (o número que a paciente usa).
- O webhook reconhece que a mensagem vem do **`DR_LUCAS_WHATSAPP_PESSOAL`**, faz o parse (número → identifica a cliente na fila `eventos_orcamento_pendente`; valor → preço do orçamento), gera o PDF e retoma o atendimento daquela cliente.

## Reaproveitamento (já existe no sistema)
- `eventos_orcamento_pendente` (fila + auditoria), `contatos.aguardandoOrcamentoHumano` (pausa), `notificarDrLucasOrcamento()` (avisa o Dr. Lucas). Falta: parse `<número> - <valor>` no webhook, geração de PDF, e o passo de aprovação → agenda.

## A construir
1. Tool `gerar_orcamento` (Caminho A, passo 3) — enfileira + notifica o Dr. Lucas (reusa a fila).
2. Parser no webhook: detecta msg do Dr. Lucas no formato `<número> - <valor>` → casa com a cliente.
3. Geração de PDF (lib serverless, ex. `@react-pdf/renderer`) com a identidade do Dr. Lucas.
4. Envio do PDF pela Uazapi + retomada do atendimento da cliente.
5. Aprovação da cliente → `registrar_agendamento` (a única reunião).
6. Caminho B: ajuste no prompt/tool pra mandar a faixa (aproximado) sem PDF.
7. Reduzir os tipos de evento a um só (avaliação/diagnóstico) na UI/agente.

## A confirmar com o João
- Formato exato do `<número> - <valor>` do Dr. Lucas (proposta: número só dígitos, separador ` - `, valor em reais).
- Número pessoal do Dr. Lucas completo (DDD + 9 dígitos) pro `DR_LUCAS_WHATSAPP_PESSOAL`.

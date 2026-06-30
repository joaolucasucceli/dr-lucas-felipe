import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer"

/**
 * Documento PDF do orcamento da clinica do Dr. Lucas Ferreira.
 *
 * Renderizado on-the-fly quando o Dr. Lucas responde o valor pelo WhatsApp
 * pessoal dele (formato `<numero> - <valor>`). Identidade visual limpa e
 * profissional: cabecalho com foto do Dr. Lucas, contexto do atendimento,
 * valor em destaque, inclusoes resumidas e proximo passo.
 *
 * Runtime: Node (nao edge). `@react-pdf/renderer` usa APIs de Node.
 */

export interface DadosOrcamento {
  /** Nome da paciente (sem prefixo "WhatsApp ..."). */
  nomePaciente: string
  /** Nome do procedimento de interesse. */
  procedimento: string | null
  /** O que esta incluso (descricao/escopoOferta do procedimento). */
  oQueInclui: string | null
  /** Valor formatado em BRL (ex.: "R$ 8.500,00"). */
  valorFormatado: string
  /** Condicoes de parcelamento, se houver. */
  parcelamento: string | null
  /** Resumo enviado para o Dr. Lucas no pedido de orcamento. */
  resumoCaso?: string | null
  /** Historico estruturado do atendimento no contato. */
  sobreOPaciente?: string | null
  /** Texto comercial original do procedimento/regiao de interesse. */
  procedimentoInteresse?: string | null
  /** Validade em dias (default 7). */
  validadeDias: number
  /** URL absoluta da foto do Dr. Lucas (cabecalho). */
  fotoDrLucasUrl: string
  /** Data de emissao formatada (ex.: "19/06/2026"). */
  dataEmissao: string
  /** Contato da clinica (rodape). */
  contatoClinica?: string
}

const NOME_MEDICO = "Dr. Lucas Ferreira"
const SUBTITULO_MEDICO = "Estética avançada e planejamento corporal"
const PROXIMO_PASSO =
  "Próximo passo: reunião online de diagnóstico com o Dr. Lucas para avaliar seu caso, tirar dúvidas e orientar com segurança antes de qualquer decisão."

// Paleta sobria: azul petroleo + cinzas. PDF claro para leitura e impressao.
const COR_PRIMARIA = "#0f3d54"
const COR_ACENTO = "#1f7a99"
const COR_TEXTO = "#1a1a1a"
const COR_SUAVE = "#5b6b73"
const COR_LINHA = "#e2e8ec"
const COR_FUNDO = "#f4f8fa"

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 44,
    paddingHorizontal: 40,
    fontSize: 10.2,
    color: COR_TEXTO,
    fontFamily: "Helvetica",
    lineHeight: 1.34,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: COR_PRIMARIA,
  },
  foto: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginRight: 14,
    objectFit: "cover",
  },
  headerTexto: {
    flexDirection: "column",
  },
  nomeMedico: {
    fontSize: 17,
    fontFamily: "Helvetica-Bold",
    color: COR_PRIMARIA,
  },
  subtituloMedico: {
    fontSize: 9,
    color: COR_SUAVE,
    marginTop: 2,
  },
  tituloDoc: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: COR_ACENTO,
    marginLeft: "auto",
  },
  metaLinha: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  metaItem: {
    flexDirection: "column",
  },
  metaLabel: {
    fontSize: 7.5,
    color: COR_SUAVE,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaValor: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COR_TEXTO,
    marginTop: 2,
  },
  secao: {
    marginBottom: 11,
  },
  secaoCompacta: {
    marginBottom: 9,
  },
  secaoTitulo: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: COR_ACENTO,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  secaoTexto: {
    fontSize: 10.2,
    color: COR_TEXTO,
  },
  procedimentoCard: {
    backgroundColor: COR_FUNDO,
    borderWidth: 1,
    borderColor: COR_LINHA,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 11,
  },
  procedimentoTexto: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: COR_PRIMARIA,
  },
  caixaValor: {
    backgroundColor: COR_PRIMARIA,
    borderRadius: 8,
    paddingVertical: 13,
    paddingHorizontal: 18,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  caixaValorLabel: {
    fontSize: 9,
    color: "#cfe2ea",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  caixaValorNumero: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },
  lista: {
    marginTop: 1,
  },
  listaItem: {
    flexDirection: "row",
    marginBottom: 4,
  },
  bullet: {
    width: 10,
    fontSize: 10,
    color: COR_ACENTO,
    fontFamily: "Helvetica-Bold",
  },
  bulletTexto: {
    flex: 1,
    fontSize: 10,
    color: COR_TEXTO,
  },
  proximoPasso: {
    backgroundColor: "#eef7fa",
    borderLeftWidth: 3,
    borderLeftColor: COR_ACENTO,
    borderRadius: 6,
    paddingVertical: 9,
    paddingHorizontal: 11,
    marginBottom: 10,
  },
  proximoPassoTexto: {
    fontSize: 10,
    color: COR_PRIMARIA,
    fontFamily: "Helvetica-Bold",
  },
  validade: {
    borderTopWidth: 1,
    borderTopColor: COR_LINHA,
    paddingTop: 8,
  },
  rodape: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COR_LINHA,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rodapeTexto: {
    fontSize: 8,
    color: COR_SUAVE,
  },
})

function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function limparTexto(texto: string | null | undefined): string | null {
  const limpo = texto
    ?.replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/([.!?]){2,}$/g, "$1")
    .trim()

  if (!limpo) {
    return null
  }

  return limpo.replace(/[.;:,\s]+$/g, "").trim()
}

function minusculaInicial(texto: string): string {
  if (!texto) {
    return texto
  }

  return texto.charAt(0).toLocaleLowerCase("pt-BR") + texto.slice(1)
}

function capitalizarInicial(texto: string): string {
  if (!texto) {
    return texto
  }

  return texto.charAt(0).toLocaleUpperCase("pt-BR") + texto.slice(1)
}

function adaptarPrimeiraPessoa(texto: string): string {
  return texto
    .replace(/^não fiz\b/i, "não fez")
    .replace(/^nao fiz\b/i, "não fez")
    .replace(/\bnão tenho\b/gi, "não tem")
    .replace(/\bnao tenho\b/gi, "não tem")
    .replace(/^fiz\b/i, "fez")
    .replace(/^tenho\b/i, "tem")
}

function formatarProcedimento(texto: string | null | undefined): string | null {
  const limpo = limparTexto(texto)
  if (!limpo) {
    return null
  }

  const comRegiao = limpo
    .replace(/\bmini\s*lipo\s+(abd[oô]men|abdome)\b/i, "mini lipo no abdômen")
    .replace(/\blipo\s+(abd[oô]men|abdome)\b/i, "lipo no abdômen")

  return capitalizarInicial(comRegiao)
}

function formatarProcedimentoFrase(
  texto: string | null | undefined
): string | null {
  const formatado = formatarProcedimento(texto)
  return formatado ? minusculaInicial(formatado) : null
}

function extrairFato(texto: string, prefixo: string): string | null {
  const prefixoNorm = normalizarTexto(prefixo)
  const partes = texto
    .split(/\n---\n|\n/g)
    .map((parte) => parte.trim())
    .filter(Boolean)

  for (const parte of partes) {
    const normalizado = normalizarTexto(parte)
    if (normalizado.startsWith(prefixoNorm)) {
      return limparTexto(parte.slice(parte.indexOf(":") + 1)) || null
    }
  }

  return null
}

function montarTextoPreparado(dados: DadosOrcamento): string {
  const fonte = [dados.sobreOPaciente, dados.resumoCaso]
    .filter(Boolean)
    .join("\n")
  const procedimento = formatarProcedimentoFrase(
    dados.procedimentoInteresse || dados.procedimento
  )
  const tempo = extrairFato(fonte, "Tempo de incômodo informado pelo paciente:")
  const historico = extrairFato(
    fonte,
    "Histórico de procedimentos e saúde informado pelo paciente:"
  )
  const incomodo = extrairFato(
    fonte,
    "Principal incômodo informado pelo paciente:"
  )
  const partesContexto = [
    procedimento ? `o foco é ${procedimento}` : null,
    tempo ? `a região incomoda ${minusculaInicial(tempo)}` : null,
    incomodo ? `o principal incômodo é ${minusculaInicial(incomodo)}` : null,
    historico
      ? `você informou que ${adaptarPrimeiraPessoa(minusculaInicial(historico))}`
      : null,
  ].filter(Boolean)

  const frases = [
    `${dados.nomePaciente}, preparei esta proposta com base no que você compartilhou no pré-atendimento com a Ana Júlia.`,
    partesContexto.length
      ? `Considerei que ${partesContexto.join("; ")}.`
      : null,
    `Abaixo estão o valor definido pelo Dr. Lucas, os principais itens inclusos e o próximo passo.`,
  ].filter(Boolean)

  return frases.join(" ")
}

function adicionarUnico(lista: string[], item: string | null): void {
  const limpo = limparTexto(item)
  if (!limpo) {
    return
  }

  if (
    !lista.some(
      (existente) => normalizarTexto(existente) === normalizarTexto(limpo)
    )
  ) {
    lista.push(`${limpo}.`)
  }
}

function montarItensInclusos(dados: DadosOrcamento): string[] {
  const procedimento = formatarProcedimentoFrase(
    dados.procedimentoInteresse || dados.procedimento
  )
  const fonte = normalizarTexto(dados.oQueInclui ?? "")
  const itens: string[] = []

  adicionarUnico(itens, "Avaliação online de diagnóstico com o Dr. Lucas")
  adicionarUnico(
    itens,
    procedimento
      ? `Planejamento individual para ${procedimento}`
      : "Planejamento individual conforme avaliação do caso"
  )
  adicionarUnico(itens, "Orientações de preparo e recuperação")

  if (fonte.includes("retorno") || fonte.includes("acompanh")) {
    adicionarUnico(
      itens,
      "Retornos ou acompanhamento conforme escopo cadastrado"
    )
  }

  if (fonte.includes("correc")) {
    adicionarUnico(itens, "Correções previstas no escopo quando necessárias")
  }

  adicionarUnico(
    itens,
    "Suporte da equipe para dúvidas logísticas antes da reunião"
  )

  return itens.slice(0, 5)
}

export function OrcamentoPDF({ dados }: { dados: DadosOrcamento }) {
  const {
    nomePaciente,
    procedimento,
    valorFormatado,
    parcelamento,
    validadeDias,
    fotoDrLucasUrl,
    dataEmissao,
    contatoClinica,
  } = dados
  const procedimentoFormatado = formatarProcedimento(
    dados.procedimentoInteresse || procedimento
  )
  const itensInclusos = montarItensInclusos(dados)

  return (
    <Document
      title={`Orçamento - ${nomePaciente}`}
      author={NOME_MEDICO}
      subject="Orçamento de procedimento"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={fotoDrLucasUrl} style={styles.foto} />
          <View style={styles.headerTexto}>
            <Text style={styles.nomeMedico}>{NOME_MEDICO}</Text>
            <Text style={styles.subtituloMedico}>{SUBTITULO_MEDICO}</Text>
          </View>
          <Text style={styles.tituloDoc}>Orçamento</Text>
        </View>

        <View style={styles.metaLinha} wrap={false}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Paciente</Text>
            <Text style={styles.metaValor}>{nomePaciente}</Text>
          </View>
          <View style={[styles.metaItem, { alignItems: "flex-end" }]}>
            <Text style={styles.metaLabel}>Emitido em</Text>
            <Text style={styles.metaValor}>{dataEmissao}</Text>
          </View>
        </View>

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Preparado para você</Text>
          <Text style={styles.secaoTexto}>{montarTextoPreparado(dados)}</Text>
        </View>

        {procedimentoFormatado ? (
          <View style={styles.procedimentoCard} wrap={false}>
            <Text style={styles.secaoTitulo}>Procedimento indicado</Text>
            <Text style={styles.procedimentoTexto}>
              {procedimentoFormatado}
            </Text>
          </View>
        ) : null}

        <View style={styles.caixaValor} wrap={false}>
          <Text style={styles.caixaValorLabel}>Valor definido</Text>
          <Text style={styles.caixaValorNumero}>{valorFormatado}</Text>
        </View>

        {parcelamento ? (
          <View style={styles.secaoCompacta} wrap={false}>
            <Text style={styles.secaoTitulo}>Formas de pagamento</Text>
            <Text style={styles.secaoTexto}>{parcelamento}</Text>
          </View>
        ) : null}

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Itens principais inclusos</Text>
          <View style={styles.lista}>
            {itensInclusos.map((item) => (
              <View key={item} style={styles.listaItem} wrap={false}>
                <Text style={styles.bullet}>-</Text>
                <Text style={styles.bulletTexto}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.proximoPasso} wrap={false}>
          <Text style={styles.proximoPassoTexto}>{PROXIMO_PASSO}</Text>
        </View>

        <View style={styles.validade} wrap={false}>
          <Text style={styles.secaoTitulo}>Validade</Text>
          <Text style={styles.secaoTexto}>
            Este orçamento é válido por {validadeDias} dias a partir da data de
            emissão.
          </Text>
        </View>

        <View style={styles.rodape} fixed>
          <Text style={styles.rodapeTexto}>
            {NOME_MEDICO} - Estética avançada
          </Text>
          <Text style={styles.rodapeTexto}>
            {contatoClinica ?? "Atendimento via WhatsApp"}
          </Text>
        </View>
      </Page>
    </Document>
  )
}

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer"

/**
 * Documento PDF do orcamento da clinica do Dr. Lucas Felipe.
 *
 * Renderizado on-the-fly quando o Dr. Lucas responde o valor pelo WhatsApp
 * pessoal dele (formato `<numero> - <valor>`). Identidade visual limpa e
 * profissional — cabecalho com foto do Dr. Lucas, dados do orcamento, rodape
 * com contato da clinica.
 *
 * Runtime: Node (nao edge) — `@react-pdf/renderer` usa APIs de Node.
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
  /** Validade em dias (default 7). */
  validadeDias: number
  /** URL absoluta da foto do Dr. Lucas (cabecalho). */
  fotoDrLucasUrl: string
  /** Data de emissao formatada (ex.: "19/06/2026"). */
  dataEmissao: string
  /** Contato da clinica (rodape). */
  contatoClinica?: string
}

// Paleta sobria — azul petroleo + cinzas. PDF e claro (impressao/leitura),
// independente do tema dark-only do painel.
const COR_PRIMARIA = "#0f3d54"
const COR_ACENTO = "#1f7a99"
const COR_TEXTO = "#1a1a1a"
const COR_SUAVE = "#5b6b73"
const COR_LINHA = "#e2e8ec"

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 44,
    fontSize: 11,
    color: COR_TEXTO,
    fontFamily: "Helvetica",
    lineHeight: 1.5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: COR_PRIMARIA,
  },
  foto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
    objectFit: "cover",
  },
  headerTexto: {
    flexDirection: "column",
  },
  nomeMedico: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: COR_PRIMARIA,
  },
  subtituloMedico: {
    fontSize: 10,
    color: COR_SUAVE,
    marginTop: 2,
  },
  tituloDoc: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: COR_ACENTO,
    marginLeft: "auto",
  },
  metaLinha: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  metaItem: {
    flexDirection: "column",
  },
  metaLabel: {
    fontSize: 8,
    color: COR_SUAVE,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaValor: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: COR_TEXTO,
    marginTop: 2,
  },
  secao: {
    marginBottom: 20,
  },
  secaoTitulo: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COR_ACENTO,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  secaoTexto: {
    fontSize: 11,
    color: COR_TEXTO,
  },
  caixaValor: {
    backgroundColor: COR_PRIMARIA,
    borderRadius: 8,
    paddingVertical: 18,
    paddingHorizontal: 22,
    marginBottom: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  caixaValorLabel: {
    fontSize: 10,
    color: "#cfe2ea",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  caixaValorNumero: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },
  divisor: {
    borderBottomWidth: 1,
    borderBottomColor: COR_LINHA,
    marginVertical: 16,
  },
  rodape: {
    position: "absolute",
    bottom: 28,
    left: 44,
    right: 44,
    paddingTop: 12,
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

export function OrcamentoPDF({ dados }: { dados: DadosOrcamento }) {
  const {
    nomePaciente,
    procedimento,
    oQueInclui,
    valorFormatado,
    parcelamento,
    validadeDias,
    fotoDrLucasUrl,
    dataEmissao,
    contatoClinica,
  } = dados

  return (
    <Document
      title={`Orçamento — ${nomePaciente}`}
      author="Dr. Lucas Felipe"
      subject="Orçamento de procedimento"
    >
      <Page size="A4" style={styles.page}>
        {/* Cabecalho: foto + nome do Dr. Lucas + titulo */}
        <View style={styles.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={fotoDrLucasUrl} style={styles.foto} />
          <View style={styles.headerTexto}>
            <Text style={styles.nomeMedico}>Dr. Lucas Felipe</Text>
            <Text style={styles.subtituloMedico}>
              Estética avançada e planejamento corporal
            </Text>
          </View>
          <Text style={styles.tituloDoc}>Orçamento</Text>
        </View>

        {/* Metadados: paciente + data */}
        <View style={styles.metaLinha}>
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
          <Text style={styles.secaoTexto}>
            {nomePaciente}, este orçamento foi preparado a partir das
            informações que você compartilhou no pré-atendimento com a Ana
            Júlia. A ideia é deixar claro o serviço indicado, o que está
            incluso e o valor definido pelo Dr. Lucas para o seu caso.
          </Text>
        </View>

        {/* Procedimento + o que inclui */}
        {procedimento ? (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Procedimento</Text>
            <Text style={styles.secaoTexto}>{procedimento}</Text>
          </View>
        ) : null}

        {oQueInclui ? (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>O que está incluso</Text>
            <Text style={styles.secaoTexto}>{oQueInclui}</Text>
          </View>
        ) : null}

        <View style={styles.divisor} />

        {/* Caixa de destaque do valor */}
        <View style={styles.caixaValor}>
          <Text style={styles.caixaValorLabel}>Valor</Text>
          <Text style={styles.caixaValorNumero}>{valorFormatado}</Text>
        </View>

        {/* Parcelamento (se houver) */}
        {parcelamento ? (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Formas de pagamento</Text>
            <Text style={styles.secaoTexto}>{parcelamento}</Text>
          </View>
        ) : null}

        {/* Validade */}
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Validade</Text>
          <Text style={styles.secaoTexto}>
            Este orçamento é válido por {validadeDias} dias a partir da data de
            emissão.
          </Text>
        </View>

        {/* Rodape */}
        <View style={styles.rodape} fixed>
          <Text style={styles.rodapeTexto}>
            Dr. Lucas Felipe — Estética avançada
          </Text>
          <Text style={styles.rodapeTexto}>
            {contatoClinica ?? "Atendimento via WhatsApp"}
          </Text>
        </View>
      </Page>
    </Document>
  )
}

/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Atualiza descricao + posOperatorio dos 4 procedimentos pendentes
 * (Hidrolipo, Lipo Fit, Lipo Butt, PMMA - Areas Especificas) com RASCUNHO
 * baseado em conhecimento publico de cirurgia plastica. Marcado claramente
 * como rascunho pra Dr. Lucas validar / ajustar no painel.
 *
 * Substitui a descricao generica antiga "Procedimento realizado pelo Dr.
 * Lucas Ferreira na clinica..." por algo que a Ana Julia consegue citar
 * minimamente quando o paciente perguntar — sem inventar especificidade
 * que so o Dr. Lucas pode definir.
 */
const { Client } = require("pg")
require("dotenv").config({ path: ".env.local" })

const PROCEDIMENTOS = [
  {
    id: "proc-hidrolipo",
    nome: "Hidrolipo",
    descricao: `**O que é**

Variação da lipoaspiração em que se infunde no tecido subcutâneo uma solução de soro com vasoconstritor e anestésico ANTES de aspirar a gordura. A hidrodissecção facilita a remoção, reduz sangramento e dor pós-operatória, e costuma ser indicada pra áreas localizadas com gordura mais firme.

Indicação típica: abdômen, flancos, dorso, culote, papada e regiões adjacentes que tenham gordura localizada.

_(⚠️ Rascunho — texto genérico baseado em literatura. Dr. Lucas vai validar/ajustar com o protocolo dele.)_`,
    posOperatorio: `Cinta modeladora 24h/dia nos primeiros 30 dias (com afrouxamento conforme conforto), drenagem linfática a partir da 1ª semana, retorno a atividades leves em 7-14 dias e exercícios mais intensos a partir de 30-45 dias. Detalhes finais sempre validados na avaliação online com o Dr. Lucas conforme seu caso.

_(⚠️ Rascunho pra validar.)_`,
  },
  {
    id: "proc-lipo-fit",
    nome: "Lipo Fit",
    descricao: `**O que é**

Protocolo de lipoaspiração do Dr. Lucas com foco em modelagem definida — aspiração combinada com técnica que ajuda a desenhar relevos musculares (linhas do abdome, contorno de cintura). Indicação típica: paciente que já tem boa massa muscular e quer dar mais definição.

Como cada caso tem critério próprio (espessura de gordura, qualidade da pele, base muscular), o Dr. Lucas confirma indicação na avaliação online.

_(⚠️ Rascunho — "Lipo Fit" é nome do protocolo da clínica. Dr. Lucas vai validar/ajustar o texto exato.)_`,
    posOperatorio: `Cinta modeladora 24h/dia nos primeiros 30 dias, drenagem linfática a partir da 1ª semana, retorno a atividades leves em 7-14 dias e exercícios mais intensos a partir de 30-45 dias. Detalhes específicos validados na avaliação online.

_(⚠️ Rascunho pra validar.)_`,
  },
  {
    id: "proc-lipo-butt",
    nome: "Lipo Butt",
    descricao: `**O que é**

Lipoaspiração com foco em modelagem do glúteo — aspiração das regiões adjacentes (flancos, lombar, região sacral) pra desenhar o contorno e dar mais projeção visual ao glúteo. **Diferente da lipo com enxerto glúteo**, esse protocolo trabalha o entorno do glúteo, sem transferência de gordura pro músculo.

Pra quem quer adicionar volume na região do glúteo o procedimento indicado é Lipo + Enxerto Glúteo (com transferência de gordura) — o Dr. Lucas avalia o caso na consulta online.

_(⚠️ Rascunho — "Lipo Butt" é nome do protocolo da clínica. Dr. Lucas vai validar/ajustar o texto exato.)_`,
    posOperatorio: `Cinta modeladora 24h/dia nos primeiros 30 dias, drenagem linfática a partir da 1ª semana, evitar pressão direta no glúteo (sentar com almofada) nas primeiras 2-3 semanas, retorno a atividades leves em 7-14 dias. Detalhes específicos validados na avaliação online.

_(⚠️ Rascunho pra validar.)_`,
  },
  {
    id: "proc-pmma-areas-especificas",
    nome: "PMMA — Áreas Específicas",
    descricao: `**O que é**

Preenchimento com PMMA (polimetilmetacrilato — um implante de longa duração) em áreas específicas do corpo e face — como mento, linha mandibular, sulco nasogeniano, malar (maçãs do rosto), região temporal e outras que o Dr. Lucas avalia indicação caso a caso. **Diferente do PMMA glúteo**, que tem protocolo próprio e não é feito aqui.

Indicação: paciente que busca correção de volume em região específica com resultado de longa duração (vs. preenchedores reabsorvíveis como ácido hialurônico).

_(⚠️ Rascunho — Dr. Lucas vai validar e detalhar a lista completa de áreas que ele trata.)_`,
    posOperatorio: `Aplicação ambulatorial. Pode haver inchaço local nos primeiros 3-7 dias, evolução completa do resultado em 30-60 dias. Compressas geladas nas primeiras 24-48h ajudam no desconforto. Detalhes específicos validados pelo Dr. Lucas na avaliação online conforme a área tratada.

_(⚠️ Rascunho pra validar.)_`,
  },
]

;(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL })
  await c.connect()
  try {
    for (const p of PROCEDIMENTOS) {
      const r = await c.query(
        `UPDATE procedimentos
         SET descricao = $1,
             "posOperatorio" = $2,
             "atualizadoEm" = NOW()
         WHERE id = $3
         RETURNING id, nome`,
        [p.descricao, p.posOperatorio, p.id]
      )
      if (r.rows.length === 0) {
        console.log(`❌ ${p.nome} (${p.id}) — nao encontrado, pulando`)
      } else {
        console.log(`✅ ${p.nome} atualizado`)
      }
    }
  } finally {
    await c.end()
  }
})().catch((e) => { console.error(e); process.exit(1) })

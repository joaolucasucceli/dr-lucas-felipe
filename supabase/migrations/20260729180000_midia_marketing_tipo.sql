-- OPE-553: a Ana enviava foto de "antes" e ate foto de mesa cirurgica como se
-- fosse resultado. A tabela nao tinha nada que distinguisse o conteudo da
-- imagem — so descricao livre, que o Dr. Lucas preenche com o procedimento.
--
-- A auditoria das 17 midias (29/07/2026, olhando imagem por imagem) mostrou que
-- a divisao util nao e antes/depois: 12 das 17 JA sao comparativos prontos
-- (antes e depois na mesma imagem, algumas com a marca do Dr. Lucas). O que
-- precisa ser separado e o que NAO pode ir para um lead.

create type "TipoMidiaMarketing" as enum ('comparativo', 'antes', 'pos_operatorio', 'outro');

alter table midia_marketing
  add column tipo "TipoMidiaMarketing" not null default 'outro';

comment on column midia_marketing.tipo is
  'O que a imagem mostra. Só `comparativo` pode ser enviado a lead: é antes/depois na mesma imagem. `antes` e `pos_operatorio` (registro cirúrgico) nunca vão para paciente.';

-- Classificacao das 17 existentes. O criterio e o que a imagem MOSTRA, nao o
-- que a descricao diz — todas as 17 tinham "resultado" na descricao.
update midia_marketing set tipo = 'comparativo' where id in (
  'lwl7k1zqm65ze0gbj1g71724',  -- lipo: 4 fotos, antes em cima / depois embaixo
  'gp8a4kp91vj74qx1d240ez2f',  -- lipo: peca com a marca do Dr. Lucas, "18 dias pos"
  'dj0447sox9287brr1yfr7eq1',  -- lipo: gluteo, antes/depois empilhado
  'u4twnvwawsmzgap8soxyalel',  -- lipo: lateral, antes/depois empilhado
  'i22kwt1mlv80slojhihmuxyu',  -- lipo: com legenda "18 dias pos, ainda com edema"
  'enclqcxsjjk0g719ygy7ai7d',  -- lipo: marcacao cirurgica em cima, resultado embaixo
  'fgzczquyfwbj8qszv5op5jk5',  -- pmma gluteo
  'd8gwobmpb8ckz08le9z3826o',  -- pmma gluteo
  'sqtt1om5hli6mzhrffxdus3t',  -- pmma gluteo
  'pzureervmlid5u2c2sb7khaf',  -- pmma gluteo (marca de terceiro: @biossimetric)
  'c3rqlilh7f8xqdr6uzj53vp2',  -- pmma gluteo (marca de terceiro: Diamond Institute)
  'ajl4g1uhjld30l4vbcpu8e8z'   -- pmma gluteo, com rotulo "Antes"/"Depois"
);

-- Foto de antes isolada. Era o que a Ana mandava como "resultado" e o que o
-- Dr. Lucas reclamou no audio de 28/07.
update midia_marketing set tipo = 'antes' where id in (
  'c5i75cymdob6on73tx5u8vtd',  -- de pe, frontal, na clinica
  'aibydtr19kpz3fg8m1hg6z2i'   -- de costas, mesma paciente
);

-- Registro cirurgico: paciente na mesa, antisseptico, pontos. Nunca vai para
-- lead — nao e prova de resultado, e assusta.
update midia_marketing set tipo = 'pos_operatorio' where id in (
  'yt7ntmmex9c40l4hgaghpt5z',  -- abdome na mesa cirurgica
  'u0d2y6esiz7iq7se28l2ah3c'   -- gluteo na mesa cirurgica
);

-- Composicao que aparenta juntar duas pacientes diferentes. Fica fora do envio
-- ate o Dr. Lucas confirmar o que e.
update midia_marketing set tipo = 'outro' where id = 'ke6kidaqzekivwhf1qa1loll';

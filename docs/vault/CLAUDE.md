# Vault — Central Dr. Lucas

Base de conhecimento do projeto **Central Dr. Lucas Felipe** (sistema web de gestao + agente IA de WhatsApp). Versionado no repositorio em `docs/vault/`.

## Estrutura

- `decisoes/` — decisoes tecnicas e de produto (ADR-like, com justificativa)
- `aprendizados/` — licoes aprendidas, erros evitados, incidentes
- `processos/` — protocolos operacionais e fluxos de trabalho recorrentes
- `reunioes/` — atas de reunioes com Dr. Lucas e equipe
- `pessoas/` — contatos relevantes (cliente, atendentes, fornecedores)
- `referencias/` — material de apoio externo (screenshots, anexos, links externos)

## Regras

- **Nomes em kebab-case**, datas absolutas (`YYYY-MM-DD`), nunca relativas
- **Frontmatter obrigatorio** em toda nota: `title`, `date`, `tags`
- **Wikilinks** `[[nome-do-arquivo]]` para conectar notas
- **Documentacao funcional do SISTEMA** (modulos para usuario final) vive nos componentes `components/features/documentacao/modulos/*` expostos em `/documentacao` — NAO duplicar aqui
- **O que entra no vault**: motivacao de decisoes, contexto de incidentes, padroes validados com o cliente, coisas que CODIGO nao conta

## O que NAO colocar no vault

- Documentacao funcional (ja esta em `components/features/documentacao/modulos/*` e exposta em `/documentacao`)
- Instrucoes do projeto para o Claude (ja estao em `CLAUDE.md` na raiz)
- Informacao que muda rapido (status de issues, progresso de sprint — isso vive no Linear)
- Codigo ou snippets — prefira referenciar arquivo:linha do repo

## Convencao de nomenclatura de arquivos

- Decisoes arquiteturais: `YYYY-MM-DD-nome-curto.md`
- Aprendizados: `YYYY-MM-DD-licao-aprendida.md` ou `YYYY-MM-DD-incidente-X.md`
- Processos: `nome-do-processo.md` (sem data — e vivo)
- Atas: `YYYY-MM-DD-reuniao-assunto.md`
- Referencias externas: livre

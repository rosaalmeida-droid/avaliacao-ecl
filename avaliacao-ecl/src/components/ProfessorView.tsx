# Handoff — App Avaliação ECL (sessão 3 — 14/06/2026)

## URLs e repositórios
- **Produção**: https://avaliacao-ecl.vercel.app/
- **GitHub**: https://github.com/rosaalmeida-droid/avaliacao-ecl
- **Root Directory Vercel**: `avaliacao-ecl` (ficheiros em `avaliacao-ecl/src/`)
- **PINs**: Aluno 1234, Professor 1111, Coordenadora 1006

---

## Estado atual da app (o que está feito)

### Ficha de Produção (ProfessorView.tsx)
- Extração automática via Jina Reader + JSON-LD + HTML
- Botões IA: 🟠 Claude, 🟢 ChatGPT, 📋 Copiar prompt, ✏️ Ver/editar prompt
- Prompt com formato exato da ficha ECL (separador |)
- Extração de: nome, classificação, doses, tempos, alergénicos, ingredientes (com T.PREP estimado), preparação (com PCC/HACCP), empratamento, equipamento, conservação, regeneração, KitchenFlow
- PCC contextual à intenção culinária (tataki → sashimi-grade, não 75ºC)
- 6 módulos KitchenFlow detetados automaticamente
- Nutrição estimada (INSA) por porção
- Export PDF (A4, formato ECL, coluna PCC/HACCP, todas as secções)
- Export Word (via CDN docx)
- Auto-save localStorage (limpo ao voltar, limpo ao submeter novo texto)
- Botão 🗑️ Repor ficha

### Ficheiros em src/
- `ProfessorView.tsx` — 1339 linhas
- `exportFicha.ts` — 494 linhas
- `alergenicos.ts` — 14 alergénicos UE 1169/2011
- `nutricao.ts` — tabela INSA, estimativa por porção
- `types.ts`, `competencias.ts`, `subtecnicas.ts`, `progresso.ts`, `backend.ts`
- `frases_atitudes.ts`, `frases_responsabilidades.ts`, `frases_tecnicas_1.ts`, `frases_tecnicas_2.ts`, `frases_subtecnicas.ts`, `frases.ts`
- `components/`: Login, Header, ui, AlunoView, ComandasView, CoordenadoraView, EditorComanda, ValidacaoView

---

## Especificação Funcional v2 — O que falta implementar

### ARQUITECTURA — Mudança central
O elemento principal passa de **Ficha Técnica** para **Plano de Aula**.

### 1. Plano de Aula
Campos: data, turma, professor, tipo de atividade, receitas associadas, equipas de trabalho, competências a desenvolver, competências a avaliar.
Professor pode criar planos futuros.

### 2. Fichas Técnicas associadas ao Plano
- Criar nova, utilizar existente, duplicar, editar
- Fichas deixam de existir isoladamente

### 3. Base de Dados de Fichas ECL
- Biblioteca permanente de todas as fichas criadas
- Pesquisa por: nome, ingrediente principal, categoria, técnica culinária, UC associada
- Histórico pedagógico (quando usada, em que turma, alterações)

### 4. Extração de receitas com múltiplos componentes
- Identificar cada componente e criar ficha separada
- Ex: Bacalhau → Bacalhau confitado + Puré de grão + Crocante de pele + Molho de coentros = 4 fichas

### 5. Ficha Técnica (melhorias)
- Nutrição sempre por porção (nunca total)
- Número da ficha automático
- Professor associado

### 6. Modelo de Avaliação Atitudinal — 22 competências

**6 PERMANENTES (sempre avaliadas, não removíveis):**
1. Responsabilidade pelas suas ações
2. Sentido de organização
3. Disponibilidade para aprender
4. Respeito pelas regras e normas definidas
5. Respeito pelas normas de higiene e segurança alimentar
6. Respeito pelas normas de segurança e saúde no trabalho

**DEPENDENTES DO CONTEXTO:**
- Trabalho Individual: Autonomia, Iniciativa, Empenho e persistência, Autocontrolo
- Trabalho em Equipa: Cooperação, Escuta ativa, Empatia, Assertividade, Respeito pelo bem-estar dos outros, Flexibilidade e adaptabilidade
- Serviço Real: Cooperação, Comunicação, Resolução de problemas, Flexibilidade, Autocontrolo
- Coordenação: Liderança, Organização, Comunicação, Gestão do tempo, Supervisão

**OPCIONAIS PROFESSOR:** até 2 adicionais por aula
**ESCOLHA ALUNO:** 1 objetivo pessoal por aula ("Hoje quero melhorar a minha autonomia")

**Lista completa das 22:**
A01 Responsabilidade pelas suas ações
A02 Autonomia no âmbito das suas funções
A03 Cuidado com a apresentação pessoal
A04 Iniciativa
A05 Autocontrolo
A06 Assertividade
A07 Empatia
A08 Escuta ativa
A09 Cooperação com a equipa
A10 Empenho e persistência na resolução de problemas
A11 Sentido de organização
A12 Flexibilidade e adaptabilidade
A13 Disponibilidade para aprender
A14 Respeito pelas regras e normas definidas
A15 Respeito pelos princípios da sustentabilidade
A16 Respeito pelas normas de higiene e segurança alimentar
A17 Respeito pelas normas de segurança e saúde no trabalho
A18 Respeito pela sensibilidade e bem-estar dos outros
A19 Autoconfiança
A20 Postura profissional
A21 Sentido crítico
A22 Respeito pelas diferenças individuais

**Fonte:** Referencial 811RA144 — lido integralmente (130 páginas, 14/06/2026)

### 7. Dicionário de Competências
Cada competência tem: definição, o que observar, o que NÃO observar, exemplos positivos, exemplos negativos, exemplo em contexto de cozinha.
Disponível para professor e aluno.

### 8. Progressão — sem limitar por ano
Sistema: Dentro do esperado / Acima do esperado / Necessita reforço
Um aluno de 1º ano pode demonstrar competências de 3º ano.

**Referencial de progressão (Perfil dos Alunos — ANQEP):**
- 10º ano: assiduidade, responsabilidade, respeito material, trabalho em grupo
- 11º ano: autonomia, proatividade, iniciativa, aceitar feedback
- 12º ano: postura ética, hierarquias, comunicação interpessoal, gestão stress

### 9. Histórico e Portefólio
- Todas as avaliações e autoavaliações
- Evolução por competência e por UC
- Portefólio pedagógico completo do aluno

### 10. Distribuição aos Alunos
- Aluno vê: Plano de Aula, receitas, fichas técnicas (PDF), competências a avaliar
- Acesso via app ou Google Classroom

### 11. Requisições Automáticas
- A partir do Plano de Aula, somar ingredientes de todas as fichas
- Gerar lista de compras / requisição
- Futuramente: email automático para compras

### 12. Integração futura KitchenFlow
- Cruzar HACCP, registos operacionais, comportamentos observados
- Evitar duplicação de registos

---

## Decisões técnicas
- **Backend**: Google Sheets (1 spreadsheet/turma, 1 aba/aluno, histórico permanente)
- **Apps Script**: mesmo modelo do KitchenFlow (publicar como Web App)
- **Google Classroom**: professor partilha links diretos, alunos têm contas eclisboa.net
- **localStorage**: só para draft da ficha (limpo automaticamente)
- **Fotos**: opcionais, não obrigatórias
- **Grupos**: definidos pelo professor, não automáticos
- **Modo Concurso**: não avança
- **Cronograma**: usa "Registos HACCP" em vez de "Higienização"

---

## KitchenFlow ECL (referência)
- Produção: https://ecl-haccp-git-main-rosa-almeida-s-projects.vercel.app
- GitHub: vitejs-vite-xzk7rslm
- Sheets: 1I2szs1jSsMBDiKNqlPxQBohJCtUqmnbYuYlxAeVk3nE
- PINs: Aluno 1234, Professor 1111, Coordenadora 1006, Auxiliar 2222


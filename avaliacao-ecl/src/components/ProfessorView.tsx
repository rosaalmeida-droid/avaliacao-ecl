import { getLibrary } from '../libraryService';
import { ImagemDoIngrediente, BancoEmpratamentoJanela } from './BancoEmpratamento';
import React, { useState } from 'react';
import { REGRAS_PERGUNTAS, promptPerguntasDaFicha, lerPerguntasDaIA, type PerguntaTecnica } from '../bancoPerguntas';
import { PerguntasDaFicha } from './PerguntasDaFicha';
import { pedirAIA, iaDiretaDisponivel } from '../ia';
import { fmtData, fmtDataHora, fmtHora, fmtDataCurta, fmtDataLonga, fmtDataRelativa } from '../datas';
import { Comanda, FichaProducao, FAMILIAS_FICHA, FamiliaFicha, TODAS_ETIQUETAS, limparEtiquetas } from '../types';
import { Button, Card, Field } from './ui';
import { addOrUpdateFichaProducao, getFichasProducao, getPlanosAulaPorTurma, buscarFichasSimilares, addOrUpdatePlanoAula, getPlanosAula, eliminarFichaProducaoDefinitivamente, proximoNumeroFicha , publicarNoClassroom , recuperarFichasDoSheets, recuperarFichasDeTodoOLado, fichasDuplicadas, limparFichasDuplicadas, novoIdFicha, fichasComIdRepetido, separarFichasComIdRepetido } from '../backend';
import { EtiquetaLigacaoPlano } from './EtiquetaLigacaoPlano';
import { SeletorIA } from './SeletorIA';
import { encontrarMateriaPrima } from '../materiasPrimasBase';
import { obterComponenteCulinario } from '../compatECL';
import { GuiaProducao } from './GuiaProducao';
import { sugerirSubtecnicas, APARELHOS_QUE_SAO_TECNICAS, lerLinhaDaFicha, type LinhaDaFicha } from '../compatECL';
import { getReferencialUC } from '../referencial811RA144';
import { exportDOCX, exportPDF, gerarHTML } from '../exportFicha';
import { detetarAlergenicos, formatarAlergenicos, Alergenico } from '../alergenicos';
import { calcularNutricao, InfoNutricional } from '../nutricao';
import { normalizarFicha, FICHA_VAZIA, extrairFicha, semPontoFinal, type LinhaIngrediente, type PassoPreparacao, type FichaTecnica } from '../lerFichaDaIA';
const nomeUCRef = (id: string): string => { try { return getReferencialUC(id)?.nome || ''; } catch { return ''; } };

function copiarTexto(texto: string, onSucesso: () => void, onFalha: () => void) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(texto).then(onSucesso).catch(() => {
      // fallback: tentar método antigo
      tentarFallbackCopia(texto, onSucesso, onFalha);
    });
  } else {
    tentarFallbackCopia(texto, onSucesso, onFalha);
  }
}

function tentarFallbackCopia(texto: string, onSucesso: () => void, onFalha: () => void) {
  try {
    const ta = document.createElement('textarea');
    ta.value = texto;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if (ok) onSucesso(); else onFalha();
  } catch {
    onFalha();
  }
}

// Garante que todos os campos texto da ficha são SEMPRE string — nunca array nem outro tipo.
// Previne o crash React #300 quando dados antigos/sujos (localStorage, IA) trazem arrays.

// ============================================================
// Prompt para extração de receita via IA externa
// Formato exato da ficha de produção ECL
// ============================================================

// A lista que vai para a IA sai da biblioteca da escola, agrupada por
// técnica: a IA escolhe do que existe (e vê a técnica de cada subtécnica),
// e o que se acrescenta à biblioteca passa logo a poder ser avaliado.
// Antes era uma lista escrita à mão, com só parte do catálogo.
export function listaCompetenciasParaPrompt(): string {
  let lib: any = null;
  try { lib = getLibrary(); } catch { lib = null; }
  if (!lib?.tecnicas?.length) return 'LISTA DE SUBTÉCNICAS E APARELHOS: (biblioteca ainda a carregar — usa nomes em português)';
  const subsPorTec = new Map<string, any[]>();
  for (const s of (lib.subtecnicas || [])) {
    const l = subsPorTec.get(s.tecnica_id) || []; l.push(s); subsPorTec.set(s.tecnica_id, l);
  }
  const porCat = new Map<string, any[]>();
  for (const t of lib.tecnicas) { const l = porCat.get(t.categoria) || []; l.push(t); porCat.set(t.categoria, l); }
  const linhas: string[] = [
    '─────────────────────────────────────────────────',
    'LISTA DE SUBTÉCNICAS — usa o ID exato; cada uma pertence à TÉCNICA indicada',
    '─────────────────────────────────────────────────',
  ];
  for (const [cat, tecs] of porCat) {
    linhas.push('', cat.toUpperCase() + ':');
    for (const t of tecs) {
      const subs = subsPorTec.get(t.id) || [];
      if (!subs.length) continue;
      linhas.push(`  TÉCNICA ${t.nome}:`);
      for (const s of subs) linhas.push(`    ${s.id} — ${s.nome}`);
    }
  }
  const nivel: Record<number, string> = { 1: 'NÍVEL 1 — Essencial (todos os alunos)', 2: 'NÍVEL 2 — Desenvolvimento (regulares e seletivas)', 3: 'NÍVEL 3 — Especialização (só alunos regulares sem medidas)' };
  linhas.push('', '─────────────────────────────────────────────────',
    'LISTA DE APARELHOS — usa ID exato + nível',
    '(só listar se o aluno PRODUZ o aparelho nesta receita — cozinha ou pastelaria: bechamel, fundos, massas, cremes, marinadas…)',
    '─────────────────────────────────────────────────');
  for (const n of [1, 2, 3]) {
    // O roux é técnica, não aparelho (APARELHOS_QUE_SAO_TECNICAS).
    const aps = (lib.aparelhos || []).filter((a: any) => (a.nivel || 1) === n && !APARELHOS_QUE_SAO_TECNICAS.has(a.id));
    if (!aps.length) continue;
    linhas.push('', nivel[n] + ':');
    for (const a of aps) linhas.push(`  ${a.id} — ${a.nome}`);
  }
  return linhas.join('\n');
}

function gerarPrompt(linkReceita: string, ucId?: string, ucNome?: string, modoProf?: boolean): string {
  const ucContexto = ucId
    ? `\nCONTEXTO PEDAGÓGICO: Esta ficha pertence à UC ${ucId} — ${ucNome || ''}.\nAs técnicas, famílias e competências devem ser específicas desta UC.`
    : '';

  const blocoProf = modoProf ? `

═══════════════════════════════════════════════════
MODO PROFISSIONAL — LÊ ANTES DE TUDO O RESTO
═══════════════════════════════════════════════════

Esta ficha é para uma cozinha pedagógica profissional de nível Secundário (Curso Profissional).
Usa o link como INSPIRAÇÃO — não como receita literal a copiar.

ELEVA a receita para nível profissional:

1. TÉCNICAS — substitui métodos caseiros por técnicas de cozinha clássica:
   - "fritar" → saltear, confitar, poêler ou fritar por imersão (especificar)
   - "cozinhar" → escalfar, branquear, estufar, brasear (o mais correto para o produto)
   - "misturar" → incorporar, homogeneizar, emulsionar (conforme o caso)
   - "deitar" → adicionar, incorporar, verter em fio
   - "mexer" → envolver suavemente, bater em neve, montar
   - "cozer no forno" → assar, gratinar, confitar (temperatura e tempo precisos)

2. CORTES — usa nomenclatura profissional:
   - "picado" → brunoise, chiffonade ou picado fino (especificar)
   - "às rodelas" → em rondelles
   - "em tiras" → em juliana ou em chiffonade
   - "em cubos" → em brunoise (pequeno) ou em macedónia (médio)

3. APRESENTAÇÃO — sugere empratamento profissional com elemento de altura, molho, guarnição

4. CALDOS — NUNCA usar cubos ou caldos comprados — são sempre "produzidos em aula"

5. MASSAS BASE — se a receita usa massa folhada, quebrada, choux, etc.:
   - Coloca-a como ingrediente normal na ficha
   - Adiciona uma nota na OBS: "⚠️ Produzir em aula — criar Ficha Técnica separada para esta massa"

` : '';

  return `Analisa a receita e extrai a informação NO FORMATO EXATO abaixo.
Aplica TODAS as regras obrigatórias antes de responder.${ucContexto}${blocoProf}

═══════════════════════════════════════════════════
REGRAS OBRIGATÓRIAS — LÊ TODAS ANTES DE COMEÇAR
═══════════════════════════════════════════════════

REGRA 0 — PROIBIÇÕES ABSOLUTAS (lê primeiro)
- NUNCA usar HTML em bruto: proibido <br>, <BR>, <b>, <strong>, <table>, <td>, etc.
- NUNCA cortar frases a meio — todas as frases devem terminar com ponto final
- NUNCA truncar conteúdo de tabelas com "..." ou deixar células incompletas
- NUNCA repetir cabeçalhos da app como "GUIA DE APOIO À PRODUÇÃO" ou "ECL 2025/26"
- Para quebras de linha dentro de tabelas: usar apenas \n (nova linha simples)
- Para negrito em tabelas: usar **texto** (markdown), nunca HTML

REGRA 1 — FORMATO
- Usa o separador | entre colunas
- Cada passo de preparação: NUMA SÓ LINHA
- PCC/HACCP na mesma linha do passo, após o último |
- Nº DE DOSES é sempre um número (ex: 4)

REGRA 2 — UNIDADES (CRÍTICO)
Todos os ingredientes em GRAMAS (g) ou MILILITROS (ml).
ÚNICA exceção: OVOS ficam em "un" (incluindo gemas e claras — "3 gemas" → "3 | un | Gemas de ovo").

Conversões obrigatórias:
- "2 cebolas" → "200 | g | Cebola" (média ≈ 100g)
- "1 dente de alho" → "6 | g | Alho"
- "1 lombo de bacalhau" → "200 | g | Bacalhau demolhado"
- "1 filete de peixe" → "150 | g | [espécie]"
- "1 tomate" → "120 | g | Tomate"
- "1 cenoura" → "100 | g | Cenoura"
- "1 batata média" → "150 | g | Batata"
- "1 limão (raspa)" → "12 | g | Raspa de limão"
- "1 limão (sumo)" → "30 | ml | Sumo de limão"
- "1 cs" sólido → "15 | g | [produto]"
- "1 cs" líquido → "15 | ml | [produto]"
- "1 cc" → "5 | g ou ml | [produto]"
- "q.b." → "q.b. | | [produto]"
NÃO usar: un, unidade, dente, ramo, folha, fatia, cabeça (exceto ovos/gemas/claras)

REGRA 3 — NOMES DOS INGREDIENTES
NUNCA usar nomes de marca. Usar sempre o produto genérico:
❌ Knorr, Sidul, Vaqueiro, Mimosa, Riberalves, Gallo
✅ Açúcar, Margarina, Leite, Bacalhau salgado, Azeite
NUNCA usar produtos inexistentes:
❌ Puré de grão → ✅ Grão cozido e passado

REGRA 3B — CALDOS (REGRA DA COZINHA PEDAGÓGICA)
Em cozinha pedagógica os caldos NUNCA se compram — são SEMPRE produzidos em aula.
Quando a receita pede caldo:
→ Ingrediente: "Caldo de galinha (produzido em aula)"
→ OBS: "⚠️ Verificar se existe caldo já produzido. Se não houver, informar o professor antes de iniciar."
Tipos: caldo de galinha | caldo de carne | fumet de peixe | caldo de legumes

REGRA 3C — ÁGUA DE COZEDURA
Ingredientes que produzem água útil → adicionar nota na OBS:
- Bacalhau → "⚠️ Reservar a água de demolha/cozedura"
- Massa/arroz → "⚠️ Reservar a água de cozedura (com amido) — útil para ligar molhos"
- Legumes → "⚠️ Reservar a água de cozedura para caldo de legumes"
- Grão/feijão → "⚠️ Reservar a água de cozedura — rica em proteína e amido"

REGRA 4 — FARINHA
- Bolos, massas montadas, pastelaria → "Farinha de trigo T55"
- Pão, pizza, massas salgadas → "Farinha de trigo T65"
- Por omissão → "Farinha de trigo T65"

REGRA 5 — COMPONENTES
Agrupa os ingredientes por componente quando o prato tem partes distintas:
Ex: "Massa", "Creme", "Cobertura", "Molho", "Guarnição", "Base"
Deixa o campo COMPONENTE vazio se for receita simples.

REGRA 6 — PCC/HACCP
Os PCC devem ser específicos da receita, não genéricos.
Inclui: temperatura exata, tempo, produto de risco.
Exemplos corretos:
- "Temperatura mínima 75°C no centro do produto"
- "Creme pasteleiro: arrefecer de 65°C a 10°C em menos de 2h"
- "Ovos: verificar data de validade — usar ovos frescos do dia"

REGRA 7 — REGISTOS KITCHENFLOW
Inclui APENAS os módulos aplicáveis:
1. Higiene Pessoal — SEMPRE
2. Temperatura de Serviço — se prato quente (min 63°C) ou frio (max 4°C)
3. Controlo de Óleos — APENAS se fritura por imersão
4. Conservação de Produtos — se sobram ingredientes abertos
5. Não Conformidades — SEMPRE
6. Amostra Testemunho — APENAS se serviço a clientes externos

═══════════════════════════════════════════════════
REGRA 8 — FAMÍLIA E ETIQUETAS (CRÍTICO PARA A AVALIAÇÃO)
═══════════════════════════════════════════════════

A FAMÍLIA define as microcompetências e subtécnicas que serão sugeridas ao aluno na avaliação.
Uma escolha errada leva a competências irrelevantes — lê com atenção.

FAMÍLIA PRINCIPAL (obrigatória) — escolhe UMA da lista:
  Preparações Base e Molhos    → fundos, molhos base, manteigas compostas, caldos
  Sopas e Caldos               → sopas simples, cremes, consommés, bisques, gazpacho
  Entradas e Acepipes          → patês, tártaros, mousses salgadas, saladas compostas
  Ovos                         → ovos mexidos, escalfados, omeletes, ovos en cocotte
  Peixes e Mariscos            → filetes, lombos, peixe inteiro, marisco, moluscos
  Carnes, Aves e Caça          → frango, vitela, borrego, pato, porco, caça
  Arrozes                      → risotto, paella, arroz de pato, arroz de marisco, pilaf
  Massas                       → pasta seca, massa fresca, gnocchi, esparguete, lasanha
  Legumes e Vegetarianos       → pratos sem proteína animal como elemento principal
  Acompanhamentos e Guarnições → purés, legumes saltados, batatas, arroz branco
  Panificação                  → pão de trigo, broa, brioche, focaccia, ciabatta, pão especial
  Pastelaria — Massas Base     → massa folhada, choux, quebrada, areada, génoise, biscuit
  Pastelaria — Cremes e Molhos → creme pasteleiro, inglês, chantilly, ganache, coulis, compota
  Pastelaria — Sobremesas Empratadas → sobremesas com vários componentes, tarte empratada, mousse
  Pastelaria — Doçaria e Petit Fours → pastel de nata, macaron, éclair, petit four, doçaria conventual
  Bebidas                      → sumos, bebidas compostas, chás, café, infusões

FAMÍLIA SECUNDÁRIA (opcional) — usa quando o prato combina duas técnicas com PESO EQUIVALENTE:
Exemplos onde usar família secundária:
  - Pastel de Nata → F1: Pastelaria — Massas Base + F2: Pastelaria — Cremes e Molhos
  - Éclair → F1: Pastelaria — Massas Base + F2: Pastelaria — Cremes e Molhos
  - Tarte de frutas → F1: Pastelaria — Massas Base + F2: Pastelaria — Sobremesas Empratadas
  - Arroz de pato → F1: Arrozes + F2: Carnes, Aves e Caça
  - Bacalhau à Brás → F1: Peixes e Mariscos + F2: Ovos
NÃO usar família secundária se uma técnica for claramente secundária (ex: molho de acompanhamento).

ETIQUETAS (opcional, máximo 3) — contexto adicional que acrescenta microcompetências específicas:

  Proteína/ingrediente cruzado:
    Vaca | Porco | Frango | Pato | Borrego | Caça | Peixe branco | Peixe gordo |
    Bacalhau | Marisco | Moluscos | Leguminosas | Queijo | Enchidos

  Técnica/método dominante:
    Forno | Vapor | Vácuo | Fritura | Grelhado | Estufado | Fumado | Fermentado | Cru

  Contexto cultural:
    Cozinha Portuguesa | Pastelaria Portuguesa | Cozinha Internacional |
    Sustentável | Criativa/Vanguarda | Alternativa/Vegan

REGRA DAS ETIQUETAS:
- NUNCA etiquetar o que já está na família (ex: família Peixes → não etiquetar "Peixe")
- Usar etiqueta só quando ACRESCENTA informação (ingrediente cruzado, método especial, contexto cultural)
- Uma ficha simples pode ter zero etiquetas

EXEMPLOS CORRETOS:
  Pudim de Ovos:
    F1: Pastelaria — Sobremesas Empratadas | F2: (nenhuma) | Etiquetas: Forno | Cozinha Portuguesa
  Pastel de Nata:
    F1: Pastelaria — Massas Base | F2: Pastelaria — Cremes e Molhos | Etiquetas: Pastelaria Portuguesa
  Arroz de Pato:
    F1: Arrozes | F2: Carnes, Aves e Caça | Etiquetas: Forno | Cozinha Portuguesa
  Bacalhau à Gomes de Sá:
    F1: Peixes e Mariscos | F2: (nenhuma) | Etiquetas: Bacalhau | Cozinha Portuguesa | Forno
  Caldo Verde:
    F1: Sopas e Caldos | F2: (nenhuma) | Etiquetas: Cozinha Portuguesa
  Génoise com Mousse de Chocolate:
    F1: Pastelaria — Massas Base | F2: Pastelaria — Sobremesas Empratadas | Etiquetas: (nenhuma)

═══════════════════════════════════════════════════
REGRA 9 — SUBTÉCNICAS E APARELHOS DETECTADOS
═══════════════════════════════════════════════════

Esta secção é usada pela aplicação para avaliar o aluno.
Tens DUAS categorias a detetar — são conceitos distintos:

  SUBTÉCNICAS (SUB-xxx) = operações concretas e observáveis que o aluno executa.
    Ex: cortar em brunoise, laminar massa, caramelizar com maçarico, fazer um roux.
    Máximo 8. Escolhe-as pelos PASSOS DA PREPARAÇÃO: cada passo importante do
    prato tem a sua técnica. O roux (branco, louro, escuro) é SEMPRE uma técnica
    (ligar), nunca um aparelho.

  APARELHOS (APP-xxx) = preparações intermédias/bases que o aluno produz
    mas que NÃO são o prato final — são componentes que entram noutros pratos.
    Ex: o aluno faz creme pasteleiro (APP-0009) para rechear um éclair;
        faz massa folhada (APP-0024) antes de montar o pastel de nata;
        faz fundo branco de aves (APP-0029) antes de fazer a sopa.
    Cada aparelho tem NÍVEL de dificuldade (1 a 3).
    Máximo 4. Só incluir se o aluno PRODUZ o aparelho nesta receita.

REGRA CRÍTICA: Não confundir os dois. A técnica é o que o aluno FAZ; o aparelho
é o que FICA FEITO. As técnicas feitas dentro de um aparelho levam o código
desse aparelho. Nunca repetir a mesma coisa como técnica e como aparelho.
  - Molho béchamel (APP-0047) = o aparelho. Técnicas dentro dele: roux branco
    (SUB-MOL-067-001, com APP-0047)…
  - Caramelo seco (SUB-PAP-086-001) = a operação de caramelizar, com APP-0033

PARA CADA TÉCNICA escreve também, para ESTE prato (não genérico):
  FAZES: o que o aluno fez, com o produto — «Escalfar o bacalhau no leite»
  COMO: como se faz, em 1–2 frases curtas que ensinam, com o utensílio certo
        (nome português e, entre parênteses, o francês quando se usa na cozinha) —
        «Derretes a manteiga, juntas a farinha de uma vez e mexes com as varas
        (fouet) em lume brando, 1 a 2 minutos, sem ganhar cor»
  BEM FEITO: o que se vê quando ficou bem — «lascas húmidas, sem pele nem espinhas»
PARA CADA APARELHO escreve:
  COMO: como se faz, curto, com o utensílio — «Juntas o leite quente aos poucos
        ao roux, sempre a bater com as varas (fouet), e cozes 10 minutos em lume brando»
  RESULTADO: como fica o aparelho acabado — «cobre as costas da colher, sem grumos»
O aluno avalia-se por estas frases: têm de ser observáveis e deste prato.

${listaCompetenciasParaPrompt()}
${REGRAS_PERGUNTAS}
═══════════════════════════════════════════════════
FORMATO DE RESPOSTA (manter exatamente)
═══════════════════════════════════════════════════

NOME DO PRATO: [nome sem marcas]
FAMÍLIA PRINCIPAL: [exatamente um valor da lista de famílias]
FAMÍLIA SECUNDÁRIA: [exatamente um valor da lista OU "nenhuma"]
ETIQUETAS: [até 3 etiquetas da lista OU "nenhuma"]
CLASSIFICAÇÃO: [Peixe / Carne / Aves / Sobremesa / Sopa / Entrada / Massa / Vegetariano / Outro]
Nº DE DOSES: [número]
TEMPO DE PREPARAÇÃO: [X min]
TEMPO DE CONFEÇÃO: [X min]
ALERGIÉNICOS: [lista dos 14 alergénicos EU presentes]

INGREDIENTES:
COMPONENTE | QT | UN | PRODUTO | T.PREP | T.CONF | OBS
[aplica REGRAS 2, 3, 3B, 3C, 4, 5 aqui]

PREPARAÇÃO:
NR | DESCRIÇÃO | TEMP | TEMPO | OBS | PCC/HACCP
[aplica REGRA 6 aqui — cada passo numa linha]

EMPRATAMENTO:
[descrição do empratamento profissional]

EQUIPAMENTO NECESSÁRIO:
[lista de equipamentos necessários]

CONSERVAÇÃO:
[temperatura, recipiente, duração]

REGENERAÇÃO:
[como regenerar ou "Não aplicável — consumir imediatamente"]

REGISTOS KITCHENFLOW:
[aplica REGRA 7 — apenas módulos relevantes]

REGRA 10 — REGISTOS KITCHENFLOW OBRIGATÓRIOS POR INGREDIENTE
Analisa cada ingrediente da ficha. Para ingredientes crus, frescos, de origem animal
ou de risco microbiológico, indica o registo KitchenFlow obrigatório.

Formato obrigatório — uma linha por registo, com pipe:
REGISTO: [tipo] | INGREDIENTE: [nome] | MOTIVO: [razão técnica curta]

Tipos de registo válidos:
- Higiene Pessoal — sempre obrigatório
- Temperatura Serviço — se prato quente (≥63°C) ou frio (≤4°C)
- Controlo de Óleos — APENAS se fritura por imersão
- Conservação — se sobram ingredientes abertos de risco
- NãoConformidades — sempre obrigatório

Exemplos:
REGISTO: Higiene Pessoal | INGREDIENTE: todos | MOTIVO: obrigatório antes de qualquer produção
REGISTO: Temperatura Serviço | INGREDIENTE: lombo de porco | MOTIVO: temperatura interna mínima 75°C
REGISTO: Temperatura Serviço | INGREDIENTE: pudim de ovos | MOTIVO: servir frio, máx 4°C
REGISTO: Conservação | INGREDIENTE: leite gordo | MOTIVO: produto lácteo aberto, refrigerar a 0-4°C
REGISTO: NãoConformidades | INGREDIENTE: todos | MOTIVO: registar qualquer desvio detetado

SUBTÉCNICAS DETECTADAS:
[máx 8 subtécnicas da REGRA 9, pelos passos da preparação — operações concretas executadas]
[formato: ID — Nome | APP-XXXX do aparelho onde se faz (ou "-") | COMPONENTE da tabela de ingredientes | FAZES: … | COMO: … | BEM FEITO: …]
[uma por linha | ex: SUB-MOL-067-001 — Roux branco | APP-0047 | Molho béchamel | FAZES: Fazer o roux branco para o béchamel | COMO: Derretes a manteiga, juntas a farinha de uma vez e mexes com as varas (fouet) em lume brando, 1 a 2 minutos, sem ganhar cor | BEM FEITO: praticamente branco, sem sabor a farinha crua, sem grumos]
[o aparelho tem de estar também em APARELHOS DETECTADOS; se a operação não é feita dentro de um aparelho, escreve "-"]
[ou "nenhuma"]

APARELHOS DETECTADOS:
[máx 4 aparelhos da REGRA 9 — só os que o aluno PRODUZ nesta receita, não o prato final]
[formato: APP-XXXX — Nome (Nível N) | COMO: … | RESULTADO: … | ex: APP-0009 — Creme pasteleiro (Nível 1) | COMO: Aqueces o leite, bates as gemas com o açúcar e o amido, juntas o leite aos poucos e cozes a bater com as varas (fouet) até engrossar | RESULTADO: liso, brilhante, sem sabor a farinha]
[ou "nenhum"]

PERGUNTAS DE AUTOAVALIAÇÃO:
[aplica a REGRA 11 — para cada subtécnica e cada aparelho acima, 6 linhas: EXECUCAO e RESULTADO, cada uma em NORMAL, SIMPLES e MUITO SIMPLES]
[formato: ID | EXECUCAO ou RESULTADO | NORMAL ou SIMPLES ou MUITO SIMPLES | pergunta | resposta nível 1 | resposta nível 2 | resposta nível 3 | resposta nível 4]

---
EXEMPLO DE REFERÊNCIA — Pudim de Ovos:

NOME DO PRATO: Pudim de Ovos
FAMÍLIA PRINCIPAL: Pastelaria — Sobremesas Empratadas
FAMÍLIA SECUNDÁRIA: nenhuma
ETIQUETAS: Forno | Cozinha Portuguesa
CLASSIFICAÇÃO: Sobremesa
Nº DE DOSES: 8
TEMPO DE PREPARAÇÃO: 20 min
TEMPO DE CONFEÇÃO: 45 min
ALERGIÉNICOS: Ovos, Leite

INGREDIENTES:
COMPONENTE | QT | UN | PRODUTO | T.PREP | T.CONF | OBS
Caramelo | 200 | g | Açúcar | 2 min | 8 min | Caramelizar até âmbar escuro
Pudim | 6 | un | Ovos inteiros | | |
Pudim | 3 | un | Gemas de ovo | | | Reforça a riqueza e cor
Pudim | 500 | ml | Leite gordo | | | Aquecer sem ferver
Pudim | 200 | g | Açúcar | | |
Pudim | 5 | ml | Extracto de baunilha | | |

PREPARAÇÃO:
NR | DESCRIÇÃO | TEMP | TEMPO | OBS | PCC/HACCP
1 | Caramelizar o açúcar em seco numa frigideira antiaderente até atingir âmbar escuro | Forte | 8 min | Não mexer — agitar apenas a frigideira | Atenção: açúcar a 180°C — risco de queimadura grave
2 | Verter o caramelo na forma untada e distribuir uniformemente | | 2 min | Rodar a forma rapidamente antes de solidificar |
3 | Aquecer o leite com a baunilha sem deixar ferver | Médio | 5 min | |
4 | Bater os ovos inteiros e as gemas com o açúcar até dissolver — não incorporar ar | | 3 min | Evitar espuma — afeta a textura final |
5 | Verter o leite morno em fio sobre os ovos, mexendo constantemente | | 2 min | Temperar devagar para não coagular os ovos |
6 | Passar o creme pelo passador fino e verter na forma caramelizada | | 2 min | Eliminar bolhas de ar da superfície |
7 | Cozer em banho-maria no forno a 160°C durante 45 min | 160°C | 45 min | Cobrir com papel de alumínio a meio | PCC: temperatura interna mínima 72°C — verificar com termómetro
8 | Arrefecer à temperatura ambiente e refrigerar mínimo 4h antes de desenformar | Frio | 4h | Não desenformar quente | PCC: refrigerar a 0-4°C — produto com ovos e leite

EMPRATAMENTO:
Desenformar para prato de apresentação. O caramelo deve escorrer naturalmente pelas laterais. Decorar com ramo de hortelã e caramelo em fio.

EQUIPAMENTO NECESSÁRIO:
Forma de pudim com tampa
Frigideira antiaderente para o caramelo
Termómetro de sonda
Passador fino
Recipiente para banho-maria

CONSERVAÇÃO:
Refrigerar a 0-4°C em recipiente fechado. Consumir em 48h.

REGENERAÇÃO:
Não aplicável — servir frio. Não regenerar.

REGISTOS KITCHENFLOW:
Higiene Pessoal — registar antes de iniciar a produção
Temperatura de Serviço — servir frio, máximo 4°C
Conservação de Produtos — produto com ovos e leite: refrigerar a 0-4°C, consumir em 48h
Não Conformidades — registar qualquer desvio detetado

SUBTÉCNICAS DETECTADAS:
SUB-PAP-086-001 — Caramelo seco | APP-0033 | Caramelo | FAZES: Fazer o caramelo para forrar a forma | BEM FEITO: cor âmbar, sem cristalizar nem queimar
SUB-CHU-046-002 — Cozer em banho-maria no forno | APP-0060 | Pudim | FAZES: Cozer o pudim em banho-maria | BEM FEITO: firme ao toque, sem buracos, a água sem ferver

APARELHOS DETECTADOS:
APP-0060 — Aparelho de pudim de ovos (Nível 1) | RESULTADO: liso, sem espuma, coado
APP-0033 — Caramelo seco (Nível 1) | RESULTADO: âmbar uniforme, espalhado no fundo da forma

---
EXEMPLO DE REFERÊNCIA — Pastel de Nata:

NOME DO PRATO: Pastel de Nata
FAMÍLIA PRINCIPAL: Pastelaria — Massas Base
FAMÍLIA SECUNDÁRIA: Pastelaria — Cremes e Molhos
ETIQUETAS: Pastelaria Portuguesa
CLASSIFICAÇÃO: Sobremesa
Nº DE DOSES: 12
TEMPO DE PREPARAÇÃO: 60 min
TEMPO DE CONFEÇÃO: 15 min
ALERGIÉNICOS: Glúten, Ovos, Leite

INGREDIENTES:
COMPONENTE | QT | UN | PRODUTO | T.PREP | T.CONF | OBS
Massa folhada | 500 | g | Farinha de trigo T65 | | | ⚠️ Produzir massa folhada em aula
Massa folhada | 250 | g | Manteiga em placa | | | Para o tourage — fria
Massa folhada | 10 | g | Sal | | |
Massa folhada | 250 | ml | Água fria | | |
Creme de nata | 500 | ml | Leite gordo | | | Aquecer com a canela e limão
Creme de nata | 6 | un | Gemas de ovo | | |
Creme de nata | 200 | g | Açúcar | | |
Creme de nata | 30 | g | Farinha de trigo T55 | | | Para ligar o creme
Creme de nata | 1 | un | Pau de canela | | |
Creme de nata | 15 | g | Raspa de limão | | |

PREPARAÇÃO:
NR | DESCRIÇÃO | TEMP | TEMPO | OBS | PCC/HACCP
1 | Preparar a détrempe: misturar farinha, sal e água — trabalhar até massa lisa e homogénea | | 10 min | Não desenvolver demasiado o glúten |
2 | Refrigerar a détrempe envolvida em película durante 30 min | 4°C | 30 min | | PCC: temperatura de refrigeração 0-4°C
3 | Executar o tourage: incorporar a manteiga em placa com 3 voltas simples | Frio | 20 min | Manter a massa fria durante todo o processo |
4 | Refrigerar entre cada volta — mínimo 15 min | 4°C | 15 min | | PCC: manteiga não pode derreter — máx 10°C
5 | Aquecer o leite com o pau de canela e raspa de limão sem ferver | Médio | 5 min | |
6 | Bater as gemas com o açúcar e a farinha até obter creme homogéneo | | 3 min | Sem incorporar ar |
7 | Temperar o creme com o leite quente em fio, mexendo constantemente | | 3 min | |
8 | Levar ao lume mexendo até engrossar — creme de nata a 85°C | Médio-forte | 5 min | Mexer continuamente sem parar | PCC: atingir 85°C para pasteurização — verificar com termómetro
9 | Arrefecer rapidamente o creme a menos de 10°C | Frio | 30 min | Banho de gelo ou abatedor | PCC: arrefecer de 65°C a 10°C em menos de 2h
10 | Estender a massa folhada a 3mm — forrar as formas de pastel | | 10 min | Não esticar — pode retrair |
11 | Rechear com o creme de nata até 3/4 da forma | | 5 min | |
12 | Cozer em forno a 250°C durante 12-15 min até a superfície apresentar manchas escuras | 250°C | 15 min | Forno pré-aquecido no máximo | PCC: temperatura interna mínima 75°C

EMPRATAMENTO:
Servir morno ou à temperatura ambiente. Polvilhar com canela em pó e açúcar em pó. Apresentar em papel rendado.

EQUIPAMENTO NECESSÁRIO:
Laminadora ou rolo de pastelaria
Formas de pastel de nata
Termómetro de sonda
Abatedor ou banho de gelo
Passador fino

CONSERVAÇÃO:
Consumir no próprio dia. Não refrigerar a massa cozida — perde crocância.

REGENERAÇÃO:
Aquecer em forno a 200°C durante 3-4 min. Não usar microondas.

REGISTOS KITCHENFLOW:
Higiene Pessoal — registar antes de iniciar a produção
Temperatura de Serviço — servir morno, verificar temperatura
Conservação de Produtos — creme de nata não utilizado: refrigerar a 0-4°C, consumir em 24h
Não Conformidades — registar qualquer desvio detetado

SUBTÉCNICAS DETECTADAS:
SUB-PAP-079-005 — Dobra de massa folhada simples | APP-0024 | Massa folhada | FAZES: Dar as dobras simples à massa folhada | BEM FEITO: camadas regulares, sem a manteiga romper
SUB-PAP-080-004 — Laminar massa folhada clássica | APP-0024 | Massa folhada | FAZES: Laminar a massa e enrolar em rolo | BEM FEITO: espessura igual, rolo apertado e sem ar
SUB-MOL-067-014 — Gelatinização de amido em creme pasteleiro | APP-0009 | Creme de nata | FAZES: Cozer o creme de nata até engrossar | BEM FEITO: engrossa sem grumos, sem sabor a farinha
SUB-CSE-047-013 — Assar massa folhada | - | Massa folhada | FAZES: Assar os pastéis em forno muito quente | BEM FEITO: massa estaladiça, creme com manchas escuras

APARELHOS DETECTADOS:
APP-0024 — Massa folhada clássica (Nível 2) | RESULTADO: folhas separadas ao cortar, sem manteiga à vista
APP-0009 — Creme pasteleiro (Nível 1) | RESULTADO: liso, brilhante, cobre a colher


---
${linkReceita ? `RECEITA A ANALISAR: ${linkReceita}` : 'Analisa com base no teu conhecimento culinário e aplica todas as regras acima.'}`;
}

// ══════════════════════════════════════════════════════════════
// PROMPT UNIFICADO — Ficha Técnica + Guião numa só chamada à IA
// O professor cola o link uma vez e recebe os dois documentos
// ══════════════════════════════════════════════════════════════
// REVERTIDO — o prompt único foi testado e não funciona bem: o guião precisa
// das técnicas/aparelhos que só ficam identificados DEPOIS de gerar a ficha,
// por isso pedir os dois de uma vez obriga a IA a "adivinhar" sem ainda ter
// feito essa detecção. Volta a ser dois passos separados: gera a ficha
// primeiro, depois usa o nome do prato já confirmado para gerar o guião.
function gerarPromptUnificado(linkReceita: string, ucId?: string, ucNome?: string, modoProf?: boolean): string {
  return gerarPrompt(linkReceita, ucId, ucNome, modoProf);
}



// ── Código que estava fora do template (removido) ──


// ── Botão IAs ─────────────────────────────────────────────────
function gerarPromptGuia(nomePrato: string, ucId?: string, ucNome?: string, ficha?: FichaProducao | null): string {
  const refUC = ucId ? getReferencialUC(ucId) : undefined;
  const ucContexto = ucId ? `\nContexto pedagógico: UC ${ucId} — ${ucNome || refUC?.nome || ''}` : '';

  // Contexto oficial real do referencial 811RA144 — Realizações e Critérios de
  // Desempenho desta UC, tal como definidos no documento regulamentar.
  const blocoReferencial = refUC ? `
Referência oficial desta Unidade de Competência (811RA144):
${refUC.realizacoes.slice(0, 4).map(r => `- ${r}`).join('\n')}
` : '';

  // Dados REAIS da Ficha de Produção — sem isto, a IA só tinha o nome do
  // prato e gerava texto genérico (problema identificado em 21/06/2026:
  // "ChatGPT e Claude indicam que a Ficha não está a ser assumida no prompt").
  const blocoFicha = ficha ? `
## FICHA DE PRODUÇÃO REAL — usa SEMPRE estes dados, nunca inventes valores

Ingredientes (${ficha.ingredientes?.length || 0}):
${(ficha.ingredientes || []).map(i => `- ${i.produto}: ${i.qt}${i.un}${i.componente ? ` (${i.componente})` : ''}`).join('\n')}

Preparação:
${(ficha.preparacao || []).map((p, idx) => `${idx + 1}. ${p.descricao || ''}`).join('\n')}

Nº de doses: ${ficha.numPorcoes || '?'} | Tempo preparação: ${ficha.tempoPrep || '?'} | Tempo confeção: ${ficha.tempoConf || '?'}
${(() => {
  // Alergénicos pode chegar como array (esperado) ou string solta (dados
  // antigos sincronizados do Sheets) — nunca assumir .join() sem verificar.
  const al = ficha.alergenicos;
  const texto = Array.isArray(al) ? al.join(', ') : (al || '');
  return texto ? `Alergénicos: ${texto}` : '';
})()}
${ficha.conservacao ? `Conservação: ${ficha.conservacao}` : ''}
${ficha.kitchenflow ? `Pontos HACCP/KitchenFlow: ${ficha.kitchenflow}` : ''}
` : `\n⚠️ Ficha de Produção não disponível neste momento — usa o teu conhecimento culinário sobre "${nomePrato}", mas sinaliza isso no início do Guia.\n`;

  return `# GUIA DE APOIO À PRODUÇÃO — ${nomePrato.toUpperCase()}
${ucContexto}
${blocoReferencial}
${blocoFicha}

Gera um Guia de Apoio à Produção para alunos de 14-16 anos do Curso Profissional de Cozinha e Pastelaria, com base na Ficha de Produção acima.

IMPORTANTE:
- Toda a informação deve referir-se exclusivamente a esta produção: ${nomePrato}
- Não utilizar textos genéricos nem frases feitas
- Não repetir simplesmente o conteúdo da Ficha de Produção
- O objetivo é explicar, formar e contextualizar tecnicamente o aluno, com profundidade real — este é material de estudo profissional, não um resumo superficial
- Usa SEMPRE os ingredientes e a preparação reais da Ficha acima — nunca inventes valores diferentes
- Linguagem clara e direta, adequada a um aluno de 14-16 anos, mas sem perder rigor técnico nem profundidade de conteúdo
- Prefere tabelas, esquemas e listas estruturadas a parágrafos longos e densos — o objetivo é tornar o conteúdo mais fácil de estudar visualmente, sem cortar conteúdo
- Cada secção deve ter desenvolvimento real e completo — não aceitar respostas de 2-3 frases onde o tema pede mais
- Não incluir tarefas de recuperação, planos de recuperação ou avaliação de recuperação — isso vive agora num módulo próprio da app

---
# 1. ENQUADRAMENTO DA PRODUÇÃO

Identifica qual é o ingrediente ou técnica protagonista de ${nomePrato} e desenvolve um enquadramento histórico, gastronómico e profissional centrado nele — não no prato em geral de forma vaga.

Desenvolver com factos concretos (não genéricos):
- origem e história real do ingrediente/técnica protagonista — de onde vem, como chegou à cozinha portuguesa, evolução ao longo do tempo;
- porque se tornou central na cultura gastronómica portuguesa ou na técnica em causa;
- curiosidades técnicas ou históricas específicas;
- importância cultural e identitária;
- porque esta receita usa este ingrediente/técnica desta forma concreta;
- o que distingue esta preparação de outras semelhantes.

Exigência: texto com desenvolvimento real, não um parágrafo curto e genérico. O aluno deve aprender factos concretos, não frases vazias tipo "é um prato tradicional português".

---
# 2. COMPETÊNCIAS DESENVOLVIDAS

## Atitudes
- Organização
- Gestão do tempo
- Trabalho em equipa
- Postura profissional
- Higiene e segurança

## Responsabilidades Técnicas
Listar as responsabilidades técnicas concretas exigidas nesta produção, baseadas no referencial oficial da UC acima, em tabela:
| Responsabilidade | Como se observa nesta produção |
|---|---|

## Ligação aos Conhecimentos da UC/UFCD
Esta subsecção só existe se a ficha técnica se relacionar com os conhecimentos formais da UC/UFCD indicada no início deste guia. Se não se aplicar (ex: a ficha é de outra família técnica), indicar claramente "Esta produção não cobre diretamente os conhecimentos formais desta UC/UFCD — serve de contexto prático para competências transversais."

Se se aplicar, desenvolver obrigatoriamente:
- Que conhecimentos específicos do referencial desta UC/UFCD esta produção ativa ou reforça? (citar os conhecimentos concretos, não de forma genérica)
- Como esta produção serve de evidência prática para esses conhecimentos? O que o aluno demonstra ao produzir este prato que prova que adquiriu esses conhecimentos?
- Existe algum conhecimento da UC que esta produção NÃO cobre? Se sim, indicar o que ficou por evidenciar e como poderia ser complementado (ex: "O conhecimento X desta UC exigiria uma produção diferente, como Y").
- Tabela de cruzamento:

| Conhecimento da UC/UFCD | Ativado nesta produção? | Como se evidencia |
|---|---|---|
| [citar do referencial] | Sim / Parcialmente / Não | [descrição concreta] |

**Síntese pedagógica:** escreve 1 parágrafo a explicar de forma integrada o que esta produção concreta desenvolve no aluno do ponto de vista técnico, organizativo e de conhecimento formal da UC/UFCD, e a sua relevância para o percurso profissional. Liga às competências, responsabilidades técnicas e conhecimentos da UC listados acima. NÃO repetir este texto noutras secções.

---
# 3. HACCP E PONTOS CRÍTICOS DE CONTROLO (PCC)

Tabela com os pontos críticos REAIS desta receita (temperatura, tempo, contaminação cruzada, conservação):
| Etapa | Perigo | Ponto Crítico | Medida de Controlo |
|---|---|---|---|

Depois da tabela, 1 parágrafo de interpretação: porque é que estes pontos são especialmente relevantes nesta produção concreta (não genérico).

---
# 4. RENDIMENTOS E APRESENTAÇÕES COMERCIAIS

Compara pelo menos 2 formas diferentes de apresentar comercialmente este prato (ex: porção individual à la carte vs travessa para buffet vs formato take-away), com rendimento aproximado, vantagens e desvantagens de cada uma. Tabela seguida de interpretação.

---
# 5. CAPACITAÇÃO

OBRIGATÓRIO: antes de responder, pesquisa na internet tabelas de capitações profissionais para esta preparação específica. Consulta fontes como manuais de restauração portuguesa, tabelas de capitações da APHORT, FAO, Escola de Hotelaria e Turismo de Portugal, ou publicações técnicas de gastronomia profissional. Usa os valores encontrados como base — não inventes valores sem fundamento. Indica a fonte consultada.

Indica as quantidades recomendadas desta preparação por pessoa, variando obrigatoriamente em função de três factores: (1) tipo de evento/serviço, (2) papel do ingrediente/prato no menu, (3) número de outras opções disponíveis no mesmo serviço.

Apresenta em duas tabelas:

**Tabela 1 — Por tipo de serviço/evento** (pelo menos 7 contextos, valores concretos em gramas ou unidades):

| Tipo de Serviço/Evento | Papel no menu | Quantidade por pessoa | Justificação técnica |
|---|---|---|---|
| Coffee break de manhã | Peça única | | Ex: pausa sem refeição principal |
| Coffee break de tarde | Peça única | | Ex: menor fome, contexto informal |
| Pequeno-almoço | Acompanhamento | | Ex: partilhado com outros elementos |
| Almoço — prato único | Principal | | Ex: capitação completa |
| Almoço — com 3+ pratos | Acompanhamento/guarnição | | Ex: reduz com mais pratos no menu |
| Jantar de gala (5+ pratos) | Entrada ou sobremesa | | Ex: porções pequenas, menu extenso |
| Cocktail / Finger food | Peça individual | | Ex: 2-3 unidades, circulação contínua |
| Buffet | Livre escolha | | Ex: quantidade média consumida |

**Tabela 2 — Por perfil do público** (para o contexto de almoço/jantar com prato principal):

| Perfil do público | Quantidade por pessoa | Ajuste em % face à base | Justificação |
|---|---|---|---|
| Crianças (até 12 anos) | | -40 a -50% | Necessidades energéticas menores |
| Adolescentes | | -15 a -20% | |
| Adultos misto | | base (100%) | Referência |
| Maioria mulheres | | -10 a -15% | |
| Maioria homens | | +10 a +20% | Maior necessidade calórica média |
| Idosos | | -10 a -15% | Menor apetite, digestão mais lenta |
| Atletas / alta atividade | | +20 a +30% | |

Termina com 2 parágrafos:
1. Os critérios que determinam as capitações nesta preparação específica — liga ao valor energético, à riqueza do ingrediente, ao papel no equilíbrio do menu e ao contexto formal ou informal do serviço.
2. Impacto na requisição: explica como a capitação escolhida afeta diretamente a quantidade de ingredientes a requisitar. Por exemplo: se a ficha técnica tem capitação base de 150g por pessoa mas o evento é um jantar de 5 pratos, a requisição deve ser calculada com 80-100g. Dá um exemplo concreto com esta preparação, com os cálculos (nº pessoas × capitação ajustada = quantidade a requisitar). ATENÇÃO: não escrever aqui sobre competências do aluno — esse conteúdo pertence à secção 2.

---
# 6. EQUILÍBRIO SENSORIAL

OBRIGATÓRIO — preenche EXATAMENTE neste formato (uma linha por sabor, sem alterar):
DOCE: [Forte / Presente / Ligeiro / Ausente]
ÁCIDO: [Forte / Presente / Ligeiro / Ausente]
SALGADO: [Forte / Presente / Ligeiro / Ausente]
AMARGO: [Forte / Presente / Ligeiro / Ausente]
UMAMI: [Forte / Presente / Ligeiro / Ausente]

ATENÇÃO — REGRAS OBRIGATÓRIAS PARA A CLASSIFICAÇÃO:

DOCE:
- NUNCA classificar como "Ausente" em carnes seladas ou assadas — a reação de Maillard e a caramelização das proteínas e açúcares naturais da carne criam sabor doce percetível. Usar no mínimo "Ligeiro".
- Marinadas com vinho, frutas, cebola ou beterraba contribuem para "Presente" ou "Forte".
- Só "Ausente" em preparações sem carne, sem vegetais adocicados, sem caramelização.

UMAMI:
- Carnes (especialmente porco, vaca, frango) têm umami elevado pelos aminoácidos glutamato naturais. Nunca "Ausente" em pratos de carne.
- Peixes, mariscos, cogumelos, tomate, queijo curado — contribuem fortemente para umami.

ÁCIDO:
- Vinhos, sumos cítricos, vinagres, iogurte, tomate — contribuem para "Presente" ou "Forte".
- Marinadas com vinho branco tornam o ácido pelo menos "Ligeiro".

Depois, 1 parágrafo de análise: como estes sabores se equilibram nesta receita concreta e o impacto na experiência gastronómica.
NÃO escrever tabela, NÃO usar markdown com pipes. Apenas as 5 linhas no formato acima, depois o parágrafo.

---
# 7. SUGESTÕES GASTRONÓMICAS

Apenas sugestões — nunca alterar a receita original. Sugere acompanhamentos, harmonizações ou variações, justificando tecnicamente cada uma (elemento ácido, crocante, fresco, aromático, contraste de textura).

---
# 8. SUSTENTABILIDADE

Desenvolve esta secção com profundidade real — NÃO escrever apenas 2-3 frases genéricas. Aborda obrigatoriamente:

**Desperdício e aproveitamento:**
- Que partes do ingrediente principal são habitualmente desperdiçadas e como podem ser aproveitadas?
- Que subprodutos desta produção podem ser reutilizados noutras preparações?
- Que quantidade estimada de desperdício existe nesta produção e como reduzi-la?

**Sazonalidade:**
- Os ingredientes principais são de época nesta estação? Se sim, que vantagens traz (sabor, preço, impacto ambiental)?
- Se não forem sazonais, que alternativas existem?

**Origem e pegada ambiental:**
- De onde vêm os ingredientes principais habitualmente? Local, nacional, importado?
- Qual o impacto ambiental estimado desta produção (transporte, embalagem, refrigeração)?
- Existem fornecedores ou práticas mais sustentáveis para esta preparação específica?

**Na cozinha profissional:**
- Como aplicar princípios de economia circular nesta produção concreta?
- Que práticas concretas pode o aluno adoptar para tornar esta produção mais sustentável?

Apresentar em combinação de texto e tabela. Mínimo 1 parágrafo por ponto + uma tabela resumo prática.

---
# 9. FOOD COST PEDAGÓGICO

O objetivo desta secção é ensinar ao aluno o que é o food cost e como se calcula passo a passo, usando esta produção como caso real. NÃO fazer apenas uma tabela sem explicação — cada passo deve ser explicado.

**Passo 1 — O que é o food cost?**
Explica em linguagem simples o que é o food cost e porque é uma ferramenta essencial de gestão em restauração. Liga ao conceito de margem de lucro.

**Passo 2 — Custo total de matéria-prima**
Com base nos ingredientes desta ficha (usa as quantidades reais), calcula o custo estimado de matéria-prima por dose. Apresenta em tabela:
| Ingrediente | Quantidade (dose) | Preço estimado/kg | Custo por dose |
|---|---|---|---|
(Usa preços de mercado realistas em Portugal — indica fonte ou referência)
**Total matéria-prima por dose:** X€

**Passo 3 — Percentagem de food cost**
Explica a fórmula:
food cost % = (custo de matéria-prima ÷ preço de venda) × 100
Para um restaurante de qualidade média em Portugal, o food cost habitual é de 28-35%.
Calcula o **preço de venda sugerido** para esta dose, com um food cost de 30%.

**Passo 4 — Comparação por apresentação comercial**
Retoma as apresentações da secção 4 e compara o food cost em cada cenário:
| Apresentação | Custo MP | Preço venda sugerido | Food cost % |
|---|---|---|---|

**Passo 5 — Interpretação e decisão**
Qual a apresentação mais vantajosa do ponto de vista do food cost? Em que contexto faz sentido escolher cada uma?

---
# 10. TÉCNICAS E MICROCOMPETÊNCIAS TÉCNICAS

Lista as técnicas culinárias específicas mobilizadas nesta produção (ex: branqueamento, redução, emulsão, ponto de cozedura), cada uma com uma explicação técnica real do que exige e porque é crítica para o resultado final.

---
# 11. CONHECIMENTOS A CONSOLIDAR

Esta secção explica os conceitos que o aluno deve compreender (não só executar) para realizar bem esta produção. NÃO fazer uma lista técnica avançada — o objetivo é tornar o conhecimento visível e compreensível para um aluno de 14-16 anos.

Para cada conhecimento, escreve:
- **O que é** — explicação simples e direta, sem jargão desnecessário
- **Porque importa** — ligação concreta ao que o aluno está a produzir
- **Como se vê na prática** — o que acontece de observável quando esse conhecimento é aplicado bem (ou mal)

Aborda obrigatoriamente (adaptando a esta produção específica):

1. **A ciência por trás da técnica principal** — o que acontece fisicamente/quimicamente quando se aplica o método de confeção principal desta receita? Explica em linguagem acessível o que o calor, o frio, a acidez ou outra variável faz ao ingrediente.

2. **Conservação e segurança alimentar** — que condições específicas este prato exige? O que acontece se não forem respeitadas? Liga à experiência real do aluno.

3. **Textura e aspeto final** — que sinais visuais e táteis indicam que o prato está bem feito? O que o aluno deve observar?

4. **Ligação ao referencial da UC** — indica 2-3 conhecimentos do referencial oficial que esta produção ativa diretamente, em linguagem simples.

Formato: um bloco por conhecimento (título + os 3 pontos acima). Máximo 4-5 conhecimentos, bem explicados, em vez de 10 conceitos superficiais.

---
# 12. QUESTÕES PARA ESTUDO

Gera entre 8 e 10 questões de estudo sobre esta produção concreta.
Mistura: escolha múltipla (a/b/c/d), verdadeiro/falso, e resposta curta.
Cobre: ingredientes, técnica, HACCP e fundamentos teóricos.

FORMATO OBRIGATÓRIO — segue EXATAMENTE esta estrutura:

PERGUNTAS:
1. [Texto da pergunta de escolha múltipla]
a) [Opção]
b) [Opção]
c) [Opção]
d) [Opção]

2. [Texto da pergunta verdadeiro/falso] (Verdadeiro/Falso)

3. [Texto da pergunta de resposta curta] (Resposta curta)

[...continuar até 8-10 questões...]

RESPOSTAS:
1. [letra correta]
2. [Verdadeiro/Falso]
3. [resposta correta em 1-2 frases]
[...uma resposta por linha, numerada...]

NÃO misturar perguntas e respostas. NÃO escrever a resposta a seguir à pergunta.
A palavra PERGUNTAS: e a palavra RESPOSTAS: são obrigatórias como separadores.

---
# 13. CASO PROFISSIONAL FINAL

Cria um cenário profissional realista relacionado com ${nomePrato}, que obrigue o aluno a analisar, justificar e decidir — não apenas responder.

O caso pode envolver, por exemplo:
- escolha entre diferentes apresentações comerciais da matéria-prima principal (ligado à secção 4);
- escolha de fornecedor;
- adaptação ao tipo de serviço (buffet, à la carte, catering);
- gestão de desperdício ou de produção numa situação de imprevisto;
- decisão de food cost sob restrição de orçamento.

Apresentar o cenário em 1-2 parágrafos concretos e terminar com uma pergunta clara que exija ao aluno tomar e justificar uma decisão profissional.

---
# 14. AUTOAVALIAÇÃO DO ALUNO

Gerar entre 5 e 8 questões de reflexão individual sobre esta produção específica, para o aluno responder por si, ligadas ao que realmente aprendeu e onde sentiu mais dificuldade.

---
---
# 15. CULTURA E GASTRONOMIA

PASSO 1 — Identifica a origem do prato.
- É um prato português ou de raiz portuguesa? → Segue as instruções do BLOCO A
- É um prato internacional (japonês, italiano, francês, marroquino, etc.)? → Segue as instruções do BLOCO B

BLOCO A — PRATO PORTUGUÊS:
Contextualizar na cultura e gastronomia portuguesa. Incluir:
- Região de origem e contexto histórico real e concreto
- Variantes regionais e curiosidades gastronómicas específicas
- Festas, épocas ou eventos populares associados ao prato
- Influências de outras culturas na sua história (ex: Descobertas, contacto com Ásia/África)
- Evolução do prato na restauração portuguesa contemporânea
- NÃO inventar citações. Basear em factos amplamente conhecidos da gastronomia portuguesa.

BLOCO B — PRATO INTERNACIONAL:
NÃO escrever sobre Portugal. Contextualizar no país/cultura de origem. Incluir:
- De que país/região/cultura vem este prato e porquê?
- Qual o contexto histórico, social e gastronómico da sua criação?
- O que representa culturalmente na sua cultura de origem (prato do quotidiano, de festa, de cerimónia)?
- Que ingredientes ou técnicas são específicos dessa cultura e porquê?
- Como chegou a Portugal/Europa e como evoluiu?
- O que o aluno português deve saber sobre esta cultura para entender melhor o prato?
- Curiosidades concretas e factos verificáveis sobre a gastronomia desse país.

Escrever em tom narrativo, 2-3 parágrafos com factos concretos. Não escrever frases genéricas como "é um prato muito apreciado". Dar informação real que o aluno aprenda algo novo sobre o mundo.

---
IMPORTANTE: termina com uma secção final "RESUMO" com os pontos-chave de cada secção, de forma esquemática (bullets curtos), para revisão rápida antes da aula prática.`;
}

function BotaoIAs({ link, nomePrato, ucId, ucNome }: { link: string; nomePrato?: string; ucId?: string; ucNome?: string }) {
  const [copiado, setCopiado] = React.useState(false);
  const [copiadoGuia, setCopiadoGuia] = React.useState(false);
  const [mostrarPrompt, setMostrarPrompt] = React.useState(false);
  const [mostrarGuia, setMostrarGuia] = React.useState(false);
  const [promptEditavel, setPromptEditavel] = React.useState('');
  const [guiaEditavel, setGuiaEditavel] = React.useState('');

  const promptFicha = gerarPrompt(link, ucId, ucNome);
  const promptFinal = promptEditavel || promptFicha;
  const guiaFinal = guiaEditavel || gerarPromptGuia(nomePrato || 'Receita', ucId, ucNome);

  // Garantir que os estados são inicializados com os prompts correctos
  React.useEffect(() => {
    setPromptEditavel(''); // reset para usar promptFicha calculado em tempo real
    setGuiaEditavel('');
  }, [link, nomePrato, ucId, ucNome]);

  function copiar(texto: string, setCop: (v: boolean) => void) {
    navigator.clipboard.writeText(texto).then(() => {
      setCop(true); setTimeout(() => setCop(false), 3000);
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = texto;
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCop(true); setTimeout(() => setCop(false), 3000);
    });
  }

  return (
    <div style={{ marginBottom: 10 }}>
      {/* FICHA DE PRODUÇÃO */}
      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--copper)', marginBottom: 6 }}>
        🤖 Extrair Ficha de Produção com IA
      </div>
      <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
        Copie o pedido (prompt), cole-o numa IA com o link da receita e cole o resultado mais abaixo.
      </div>
      <SeletorIA prompt={promptFinal} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <button type="button" className="btn btn-ghost"
          onClick={() => copiar(promptFinal, setCopiado)}
          style={{ background: copiado ? 'var(--copper)' : undefined, color: copiado ? '#fff' : undefined }}>
          {copiado ? '✅ Copiado!' : '📋 Copiar prompt'}
        </button>
        <button type="button" className="btn btn-ghost" style={{ fontSize: 13 }}
          onClick={() => setMostrarPrompt(!mostrarPrompt)}>
          {mostrarPrompt ? '🔼 Esconder' : '✏️ Ver/editar'}
        </button>
      </div>
      {copiado && (
        <div style={{ padding: '8px 12px', background: 'var(--copper-pale)', borderRadius: 8, fontSize: 13, color: 'var(--copper)', marginBottom: 8 }}>
          ✅ Pedido copiado! No ChatGPT, carregue em <strong>Ctrl+V</strong> para colar.
        </div>
      )}
      {mostrarPrompt && (
        <div style={{ marginBottom: 12 }}>
          <textarea className="input" value={promptEditavel}
            onChange={e => setPromptEditavel(e.target.value)}
            style={{ minHeight: 180, fontSize:13, fontFamily: 'monospace' }}/>
          <button type="button" className="btn btn-ghost" style={{ fontSize:13, marginTop: 4 }}
            onClick={() => setPromptEditavel(gerarPrompt(link, ucId, ucNome))}>
            🔄 Repor original
          </button>
        </div>
      )}

      {/* GUIA DE APOIO À PRODUÇÃO */}
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--sage)', marginBottom: 6 }}>
          📚 Gerar Guia de Apoio à Produção
        </div>
        <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
          Depois de criar a ficha, use este pedido para gerar o Guia de Apoio completo, com HACCP, rendimentos, equilíbrio sensorial e questões pedagógicas.
        </div>
        <SeletorIA prompt={guiaFinal} corPrincipal="var(--guia)" />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <button type="button" className="btn btn-ghost"
            onClick={() => copiar(guiaFinal, setCopiadoGuia)}
            style={{ background: copiadoGuia ? 'var(--sage)' : undefined, color: copiadoGuia ? '#fff' : undefined, borderColor: 'var(--sage)' }}>
            {copiadoGuia ? '✅ Copiado!' : '📋 Copiar prompt guia'}
          </button>
          <button type="button" className="btn btn-ghost" style={{ fontSize: 13, borderColor: 'var(--sage)', color: 'var(--sage)' }}
            onClick={() => setMostrarGuia(!mostrarGuia)}>
            {mostrarGuia ? '🔼 Esconder' : '✏️ Ver/editar guia'}
          </button>
        </div>
        {mostrarGuia && (
          <div style={{ marginBottom: 8 }}>
            <textarea className="input" value={guiaEditavel}
              onChange={e => setGuiaEditavel(e.target.value)}
              style={{ minHeight: 180, fontSize:13, fontFamily: 'monospace' }}/>
            <button type="button" className="btn btn-ghost" style={{ fontSize:13, marginTop: 4 }}
              onClick={() => setGuiaEditavel(gerarPromptGuia(nomePrato || 'Receita', ucId, ucNome))}>
              🔄 Repor original
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
function PassoLink({ onContinuar, ucId, ucNome, onAlteracao, nomePratoInicial }: { onContinuar: (texto: string, link: string) => void; ucId?: string; ucNome?: string; onAlteracao?: () => void; nomePratoInicial?: string }) {
  const [link, setLink] = useState(() => {
    try { return localStorage.getItem('ecl_link_draft') || ''; } catch { return ''; }
  });
  const [textoManual, setTextoManual] = useState('');
  const textoManualAtual = textoManual;
  const [nomePrato, setNomePrato] = useState(nomePratoInicial || '');
  const [erro, setErro] = useState('');
  const [fichasSimilares, setFichasSimilares] = useState<any[]>([]);
  const [mostrarSimilares, setMostrarSimilares] = useState(false);
  const [copiadoFicha, setCopiadoFicha] = useState(false);
  const [copiadoGuia, setCopiadoGuia] = useState(false);
  // Modo profissional — eleva técnicas. Fica lembrado neste aparelho: quem
  // escolhe sempre a versão profissional não tem de a escolher todas as vezes.
  const [modoProf, setModoProfEstado] = useState(() => { try { return localStorage.getItem('ecl_modo_prof') === '1'; } catch { return false; } });
  const setModoProf = (v: boolean) => { setModoProfEstado(v); try { localStorage.setItem('ecl_modo_prof', v ? '1' : '0'); } catch { /* */ } };
  const promptUnificado = gerarPromptUnificado(link, ucId, ucNome, modoProf);

  // Prompts calculados em tempo real
  const promptFicha = gerarPrompt(link, ucId, ucNome, modoProf);
  const promptGuia = gerarPromptGuia(nomePrato || 'Receita', ucId, ucNome) + (link ? `\n\nLink da receita: ${link}` : '');

  // Verificar fichas similares quando o nomePrato muda
  React.useEffect(() => {
    if (!nomePrato || nomePrato.length < 4) { setFichasSimilares([]); return; }
    const timer = setTimeout(async () => {
      // Verificar primeiro no localStorage
      const locais = getFichasProducao();
      const nomeLower = nomePrato.toLowerCase();
      const similares = locais.filter(f => {
        const n = (f.nomePrato || '').toLowerCase();
        return n.includes(nomeLower) || nomeLower.includes(n) ||
          nomeLower.split(' ').some(p => p.length > 3 && n.includes(p));
      });
      if (similares.length > 0) {
        setFichasSimilares(similares.slice(0,3));
        setMostrarSimilares(true);
        return;
      }
      // Se não encontrou localmente, procurar no Sheets
      const remotas = await buscarFichasSimilares(nomePrato);
      if (remotas.length > 0) {
        setFichasSimilares(remotas);
        setMostrarSimilares(true);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [nomePrato]);

  // ── Ligação direta à IA e resposta copiada (Rosa, out/2026) ──
  const [aGerar, setAGerar] = useState(false);
  const [avisoIA, setAvisoIA] = useState('');
  const [respostaCopiada, setRespostaCopiada] = useState('');
  const pareceFicha = (t: string) => /NOME DO PRATO:/i.test(t) && /INGREDIENTES:/i.test(t);

  // O pedido é o MESMO do «Copiar prompt». Mas a resposta completa (ficha,
  // registos KitchenFlow, subtécnicas e dezenas de perguntas) não cabia no
  // minuto que o servidor dá à IA: chegava cortada, sem registos nem
  // perguntas (Rosa, out/2026). Agora vai em dois pedidos: 1) a ficha, com os
  // registos e as técnicas; 2) as perguntas, feitas a partir dessa ficha.
  const [etapaIA, setEtapaIA] = useState('');
  async function criarComAIA() {
    setAGerar(true); setAvisoIA(''); setErro(''); setEtapaIA('1/2 — a IA está a criar a ficha, os registos KitchenFlow e as técnicas…');
    const pedido = promptUnificado + (nomePrato ? `\n\nNOME DO PRATO PEDIDO PELO PROFESSOR: ${nomePrato}` : '')
      + '\n\nIMPORTANTE (pedido direto da aplicação): escreve TODAS as secções do formato até APARELHOS DETECTADOS, inclusive '
      + 'REGISTOS KITCHENFLOW, SUBTÉCNICAS DETECTADAS e APARELHOS DETECTADOS. NÃO escrevas agora a secção PERGUNTAS DE AUTOAVALIAÇÃO: '
      + 'vai ser pedida a seguir, num segundo pedido.';
    const r = await pedirAIA(pedido, 14000, { lerLinks: /^https?:\/\//i.test(link.trim()), pensar: true });
    if (!r.ok || !pareceFicha(r.texto)) {
      setAGerar(false); setEtapaIA('');
      setAvisoIA(r.ok
        ? 'A IA respondeu, mas a resposta não tem o formato de uma ficha técnica. Tente outra vez ou use o método de copiar e colar, mais abaixo.'
        : `${r.mensagem} Pode usar o método de copiar e colar, mais abaixo.`);
      return;
    }
    let texto = r.texto.split('PERGUNTAS DE AUTOAVALIA')[0].trimEnd();
    const faltam = [['REGISTOS KITCHENFLOW', 'os registos KitchenFlow'], ['SUBTÉCNICAS DETECTADAS', 'as subtécnicas'], ['APARELHOS DETECTADOS', 'os aparelhos']]
      .filter(([sec]) => !new RegExp(sec.replace('É', '[ÉE]'), 'i').test(texto)).map(([, nome]) => nome);
    // 2.º pedido: as perguntas de autoavaliação, a partir das técnicas da ficha.
    const f = extrairFicha(texto);
    const tecnicas = f.tecnicasDetectadas || [], aparelhos = f.aparelhosDetectados || [];
    let semPerguntas = false;
    if (tecnicas.length || aparelhos.length) {
      setEtapaIA('2/2 — a IA está a escrever as perguntas de autoavaliação…');
      const rp = await pedirAIA(promptPerguntasDaFicha(f.nomePrato, tecnicas, aparelhos, (f.preparacao || []).map(p => p.descricao).filter(Boolean)), 12000);
      if (rp.ok && rp.texto.trim()) texto += '\n\n' + (/PERGUNTAS DE AUTOAVALIA/i.test(rp.texto) ? rp.texto : 'PERGUNTAS DE AUTOAVALIAÇÃO:\n' + rp.texto);
      else semPerguntas = true;
    }
    setAGerar(false); setEtapaIA('');
    if (faltam.length || semPerguntas) {
      try { localStorage.setItem('ecl_aviso_ia_ficha', `A IA não escreveu ${[...faltam, ...(semPerguntas ? ['as perguntas'] : [])].join(', ')}. Confira a ficha; pode usar o botão «Criar as perguntas com a IA» ou o método de copiar e colar.`); } catch { /* */ }
    }
    setTextoManual(texto); carregar(texto);
  }

  // Quando o professor volta à aplicação depois de copiar a resposta da IA,
  // a aplicação deteta-a e pergunta se a deve usar (um toque, sem colar).
  async function lerAreaDeTransferencia(porToque = false) {
    try {
      const t = await navigator.clipboard.readText();
      if (t && pareceFicha(t)) { if (porToque) { setTextoManual(t); carregar(t); } else setRespostaCopiada(t); }
      else if (porToque) setAvisoIA('Não foi encontrada nenhuma ficha técnica copiada. Copie a resposta completa da IA e tente outra vez.');
    } catch { if (porToque) setAvisoIA('O navegador não deixou ler o que foi copiado. Cole a resposta na caixa, mais abaixo.'); }
  }
  React.useEffect(() => {
    const aoVoltar = () => { if (document.visibilityState === 'visible' && !textoManual) lerAreaDeTransferencia(false); };
    window.addEventListener('focus', aoVoltar);
    document.addEventListener('visibilitychange', aoVoltar);
    return () => { window.removeEventListener('focus', aoVoltar); document.removeEventListener('visibilitychange', aoVoltar); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textoManual]);

  function carregar(textoDado?: string) {
    const textoManual = textoDado ?? textoManualAtual;
    if (!textoManual) return;
    // Detectar se colou o PROMPT em vez da RESPOSTA da IA
    const ehPrompt = /\[nome sem marcas\]|\[Peixe \/ Carne|\[lista dos 14 alerg|\[X min\]|Analisa a (página|receita|Ficha)/i.test(textoManual.slice(0, 500));
    if (ehPrompt) {
      setErro('⚠️ Isto parece ser o pedido (prompt) e não o resultado da IA. Cole o texto com a resposta da IA, e não o que enviou.');
      return;
    }
    try { localStorage.removeItem('ecl_ficha_draft'); } catch {}

    // ── Prompt unificado: separar Ficha + Guião pelo marcador ===GUIÃO===
    const separador = '===GUIÃO===';
    let textoFicha = textoManual;
    let textoGuiaoExtraido = '';
    if (textoManual.includes(separador)) {
      const partes = textoManual.split(separador);
      textoFicha = partes[0].trim();
      textoGuiaoExtraido = partes.slice(1).join(separador).trim();
    }

    const textoFinal = textoFicha.includes('NOME DO PRATO:')
      ? textoFicha
      : (nomePrato ? nomePrato + '\n' : '') + textoFicha;

    // Guardar o guião extraído para ser associado à ficha depois de guardar
    if (textoGuiaoExtraido) {
      try { localStorage.setItem('ecl_guiao_pendente', textoGuiaoExtraido); } catch {}
    }
    onContinuar(textoFinal, link);
  }

  return (
    <Card>
      <div className="display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>
        📋 Nova Ficha de Produção
      </div>

      {/* 1. LINK — opcional, só para incluir no prompt da IA */}
      <Field label="Link da receita (opcional)">
        <input className="input" value={link}
          onChange={e => { setLink(e.target.value); setErro(''); onAlteracao?.(); try { localStorage.setItem('ecl_link_draft', e.target.value); } catch {} }}
          placeholder="https://www.pingodoce.pt/receitas/..." />
      </Field>

      {/* 2. NOME DO PRATO */}
      <Field label="Nome do prato *">
        <input className="input" value={nomePrato}
          onChange={e => { setNomePrato(e.target.value); onAlteracao?.(); }}
          placeholder="ex: Sopa Juliana, Bacalhau à Brás..." />
      </Field>

      {/* 3. GERAR COM IA — um único caminho claro */}
      <div style={{ background:'rgba(181,101,29,0.06)', borderRadius:10, padding:'12px 14px', marginBottom:12, border:'1.5px solid rgba(181,101,29,0.2)' }}>
        <div style={{ fontWeight:700, fontSize:14, color:'var(--copper)', marginBottom:4 }}>
          🤖 Passo 1 — Gerar a Ficha de Produção com IA
        </div>
        {/* Selector de modo — fiel ao link ou versão profissional. Vem antes dos
            botões: vale para o botão direto e para o «Copiar prompt». */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button type="button"
            onClick={() => setModoProf(false)}
            style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: `2px solid ${!modoProf ? 'var(--copper)' : 'var(--border)'}`, background: !modoProf ? 'var(--copper)' : '#fff', color: !modoProf ? 'white' : 'rgba(26,23,20,0.6)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            📄 Fiel ao link
          </button>
          <button type="button"
            onClick={() => setModoProf(true)}
            style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: `2px solid ${modoProf ? 'var(--sage)' : 'var(--border)'}`, background: modoProf ? 'var(--sage)' : '#fff', color: modoProf ? 'white' : 'rgba(26,23,20,0.6)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            ⭐ Versão profissional
          </button>
        </div>
        {modoProf && (
          <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(90,122,78,0.08)', border: '1px solid rgba(90,122,78,0.2)', fontSize: 12.5, color: 'var(--sage)', marginBottom: 10 }}>
            A IA vai elevar as técnicas para nível profissional — cortes com nomenclatura clássica, métodos de confeção precisos, massas base assinaladas para produção em aula.
          </div>
        )}

        {/* Ligação direta: a ficha (com as perguntas das técnicas) aparece sem sair da aplicação. */}
        {iaDiretaDisponivel() && (
          <div style={{ marginBottom: 12 }}>
            <button type="button" className="btn btn-primary" disabled={aGerar || (!nomePrato && !link)}
              onClick={criarComAIA} style={{ width: '100%', minHeight: 46 }}>
              {aGerar ? `⏳ ${etapaIA || 'A IA está a criar a ficha…'} (pode demorar até dois minutos)` : `✨ Criar a ficha com a IA, sem sair da aplicação — ${modoProf ? 'versão profissional' : 'fiel ao link'}`}
            </button>
            {!nomePrato && !link && <div style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.55)', marginTop: 4 }}>Escreva primeiro o nome do prato ou o link da receita.</div>}
          </div>
        )}
        {avisoIA && <div style={{ marginBottom: 10, padding: '8px 12px', borderRadius: 8, background: '#fff4e0', color: '#8a5a12', fontSize: 13 }}>{avisoIA}</div>}
        <div style={{ fontSize:13, color:'rgba(26,23,20,0.55)', marginBottom:10 }}>
          Em alternativa: o Claude e o ChatGPT abrem já com o pedido preenchido; no Gemini, o pedido é copiado automaticamente e basta colá-lo com Ctrl+V. Depois de copiar a resposta da IA, volte a esta janela: a aplicação deteta a resposta copiada.
        </div>

        <div style={{ padding:'10px 12px', borderRadius:10, background:'rgba(90,122,78,0.06)',
          border:'1px solid rgba(90,122,78,0.15)', marginBottom:10, fontSize:13, color:'var(--sage)' }}>
          ✨ <strong>Prompt unificado</strong> — a IA gera a Ficha Técnica e o Guião de Apoio numa só resposta.
          Cola o resultado na app: primeiro o bloco da Ficha, depois o bloco do Guião (separados por ===GUIÃO===).
        </div>
        {/* O seletor já tem "Copiar prompt" (é o mesmo prompt): havia um
            segundo botão, "Copiar prompt unificado", que copiava o mesmo. */}
        <SeletorIA prompt={promptUnificado} corPrincipal="var(--copper)" />
        {!nomePrato && (
          <div style={{ marginTop:10, padding:'8px 12px', background:'rgba(90,122,78,0.08)', borderRadius:8, fontSize:13, color:'var(--sage)' }}>
            💡 Preencha o nome do prato, mais acima, para ativar o Guia de Apoio
          </div>
        )}
      </div>

      {/* 4. CAIXA RESULTADO */}
      <div style={{ background:'rgba(181,101,29,0.04)', borderRadius:10, padding:'12px 14px', marginBottom:12, border:'1px solid rgba(181,101,29,0.15)' }}>
        <div style={{ fontWeight:700, fontSize:14, color:'var(--copper)', marginBottom:4 }}>
          📥 Passo 2: cole aqui o resultado da IA
        </div>
        <div style={{ fontSize:13, color:'rgba(26,23,20,0.55)', marginBottom:8 }}>
          Cole o resultado da ficha <strong>ou</strong> do guia. A aplicação deteta automaticamente qual dos dois é.
        </div>
        {respostaCopiada && !textoManual && (
          <div style={{ marginBottom: 8, padding: '10px 12px', borderRadius: 8, background: 'rgba(90,122,78,0.1)', border: '1px solid var(--sage)', fontSize: 13.5 }}>
            <b>Foi encontrada a resposta da IA que copiou.</b> Pretende usá-la?
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button type="button" className="btn btn-primary" onClick={() => { setTextoManual(respostaCopiada); carregar(respostaCopiada); setRespostaCopiada(''); }}>Usar esta resposta</button>
              <button type="button" className="btn btn-ghost" onClick={() => setRespostaCopiada('')}>Não</button>
            </div>
          </div>
        )}
        {!textoManual && !respostaCopiada && (
          <button type="button" className="btn btn-ghost" style={{ width: '100%', marginBottom: 8 }} onClick={() => lerAreaDeTransferencia(true)}>
            📋 Colar a resposta da IA que copiei
          </button>
        )}
        <textarea className="input" value={textoManual}
          onChange={e => { setTextoManual(e.target.value); setErro(''); onAlteracao?.(); }}
          placeholder={'Cole aqui a resposta da IA...\n\nSe usou o pedido unificado, a aplicação separa automaticamente a Ficha Técnica e o Guião de Apoio.\n\nExemplo (Ficha):\nNOME DO PRATO: Mousse de Chocolate\nCLASSIFICAÇÃO: Sobremesa\n...\n\n===GUIÃO===\n## 1. MISE EN PLACE\n...'}
          style={{ minHeight:180, fontSize:13, fontFamily:'monospace', background:'#fff' }} />
        {textoManual && (
          <button type="button" className="btn btn-primary" style={{ width:'100%', marginTop:8 }}
            onClick={() => carregar()}>
            Continuar com este texto →
          </button>
        )}
      </div>

      {erro && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 8 }}>{erro}</div>}

      {/* AVISO DE FICHAS SIMILARES */}
      {mostrarSimilares && fichasSimilares.length > 0 && (
        <div style={{ marginBottom: 12, padding: '12px 14px', background: 'var(--copper-pale)', borderRadius: 12, border: '1.5px solid rgba(181,101,29,0.3)' }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--copper)', marginBottom: 6 }}>
            ⚠️ Já existe uma ficha semelhante
          </div>
          {fichasSimilares.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: '#fff', borderRadius: 8, marginBottom: 6, border: '1px solid var(--border)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{String(f.nomePrato ?? '')}</div>
                <div style={{ fontSize:13.5, color: 'rgba(26,23,20,0.55)' }}>
                  {String(f.classificacao ?? '')}
                  {f.data && ` · ${(() => {
                    const d = new Date(String(f.data).slice(0, 10) + 'T00:00:00');
                    return isNaN(d.getTime())
                      ? String(f.data).slice(0, 10)
                      : d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' });
                  })()}`}
                  {!f.planoAulaId && ' · sem aula associada'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {f.linkFicha && (
                  <button onClick={() => window.open(f.linkFicha, '_blank')} className="btn btn-ghost" style={{ fontSize:13, padding: '5px 10px' }}>Ver →</button>
                )}
                <button onClick={() => {
                  const fichaLocal = getFichasProducao().find(x => x.id === f.id);
                  if (fichaLocal) {
                    const textoSimulado = `NOME DO PRATO: ${fichaLocal.nomePrato}\nCLASSIFICAÇÃO: ${fichaLocal.classificacao}\nNº DE DOSES: ${fichaLocal.numPorcoes}\nTEMPO DE PREPARAÇÃO: ${fichaLocal.tempoPrep}\nTEMPO DE CONFEÇÃO: ${fichaLocal.tempoConf}\nALERGÉNICOS: ${(fichaLocal.alergenicos||[]).join(', ')}\n\nINGREDIENTES:\nCOMPONENTE | QT | UN | PRODUTO | T.PREP | T.CONF | OBS\n${(fichaLocal.ingredientes||[]).map(i => `${i.componente}|${i.qt}|${i.un}|${i.produto}|${i.tPrep}|${i.tConf}|${i.obs}`).join('\n')}\n\nPREPARAÇÃO:\nNR | DESCRIÇÃO | TEMP | TEMPO | OBS | PCC/HACCP\n${(fichaLocal.preparacao||[]).map(p => `${p.num}|${p.descricao}|${p.temperatura}|${p.tempo}|${p.obs}|${p.haccp}`).join('\n')}\n\nEMPRATAMENTO:\n${fichaLocal.empratamento||''}\n\nCONSERVAÇÃO:\n${fichaLocal.conservacao||''}\n\nREGENERAÇÃO:\n${fichaLocal.regeneracao||''}\n\nREGISTOS KITCHENFLOW:\n${fichaLocal.kitchenflow||''}`;
                    setMostrarSimilares(false);
                    onContinuar(textoSimulado, link);
                  }
                }} className="btn btn-ghost" style={{ fontSize:13, padding: '5px 10px', background: 'var(--sage)', color: 'white', border: 'none' }}>
                  Usar esta ficha
                </button>
              </div>
            </div>
          ))}
          <button onClick={() => setMostrarSimilares(false)} style={{ fontSize:13, color: 'rgba(26,23,20,0.4)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4 }}>
            Ignorar e criar nova ficha
          </button>
        </div>
      )}

      <Button block onClick={() => carregar()} disabled={!textoManual && !link}>
        Continuar para a Ficha →
      </Button>
    </Card>
  );
}

// ============================================================
// Passo 2 — Ficha técnica editável (formato ECL)
// ============================================================
function PassoFichaTecnica({
  ficha: fichaInicial,
  textoReceita,
  onContinuar,
  onVoltar,
  ucId = '',
  ucNome = '',
}: {
  ficha: FichaTecnica;
  textoReceita: string;
  onContinuar: (ficha: FichaTecnica) => void;
  onVoltar: () => void;
  ucId?: string;
  ucNome?: string;
}) {
  const [ficha, setFicha] = useState<FichaTecnica>(() => normalizarFicha(fichaInicial));
  const [bancoAberto, setBancoAberto] = useState(false);

  // Auto-save sempre que a ficha muda (só se tem conteúdo)
  React.useEffect(() => {
    if (ficha.nomePrato) {
      try { localStorage.setItem('ecl_ficha_draft', JSON.stringify(ficha)); } catch {}
    }
  }, [ficha]);

  function setF<K extends keyof FichaTecnica>(key: K, value: FichaTecnica[K]) {
    setFicha(prev => ({ ...prev, [key]: value }));
  }

  function setIngrediente(i: number, key: keyof LinhaIngrediente, value: string) {
    setFicha(prev => {
      const novo = [...prev.ingredientes];
      novo[i] = { ...novo[i], [key]: value };
      return { ...prev, ingredientes: novo };
    });
  }

  function addIngrediente() {
    setFicha(prev => ({
      ...prev,
      ingredientes: [...prev.ingredientes, { componente: '', qt: '', un: '', produto: '', tPrep: '', tConf: '', obs: '' }],
    }));
  }

  function removeIngrediente(i: number) {
    setFicha(prev => ({ ...prev, ingredientes: prev.ingredientes.filter((_, idx) => idx !== i) }));
  }

  function setPasso(i: number, key: keyof PassoPreparacao, value: string) {
    setFicha(prev => {
      const novo = [...prev.preparacao];
      novo[i] = { ...novo[i], [key]: value as never };
      return { ...prev, preparacao: novo };
    });
  }

  function addPasso() {
    setFicha(prev => ({
      ...prev,
      preparacao: [...prev.preparacao, { num: prev.preparacao.length + 1, descricao: '', temperatura: '', tempo: '', obs: '', haccp: '' }],
    }));
  }

  function removePasso(i: number) {
    setFicha(prev => ({
      ...prev,
      preparacao: prev.preparacao.filter((_, idx) => idx !== i).map((p, idx) => ({ ...p, num: idx + 1 })),
    }));
  }

  // O que a IA direta não escreveu (registos, técnicas, perguntas): avisa-se aqui, uma vez.
  const [avisoIAFicha] = useState(() => { try { const a = localStorage.getItem('ecl_aviso_ia_ficha') || ''; localStorage.removeItem('ecl_aviso_ia_ficha'); return a; } catch { return ''; } });
  // Subtécnicas detetadas automaticamente
  const subtecnicasDetetadas = sugerirSubtecnicas(textoReceita + ' ' + ficha.nomePrato);

  return (
    <div>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div className="display" style={{ fontSize: 18, fontWeight: 700, flex: 1 }}>
            📋 Passo 2: Ficha de Produção
          </div>
          <button type="button" className="btn btn-ghost" style={{ fontSize:13 }}
            onClick={() => {
              try { localStorage.setItem('ecl_ficha_draft', JSON.stringify(ficha)); } catch {}
              onVoltar();
            }}>
            ← Voltar ao link
          </button>
          <button type="button" className="btn btn-ghost" style={{ fontSize:13, color: 'var(--danger)' }}
            onClick={() => {
              try { localStorage.removeItem('ecl_ficha_draft'); } catch {}
              setFicha(fichaInicial);
            }}>
            🗑️ Repor
          </button>
        </div>
        <div className="muted" style={{ marginBottom: 14 }}>
          Verifica e ajusta os dados extraídos automaticamente. Se os campos estiverem vazios (com [colchetes]), volta ao link e tenta com outra IA.
        </div>
        {avisoIAFicha && (
          <div style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 8, background: '#fff4e0', color: '#8a5a12', fontSize: 13.5, border: '1px solid #f0d49a' }}>
            ⚠️ {avisoIAFicha}
          </div>
        )}

        {/* Cabeçalho */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <Field label="Nome do prato">
            <input className="input" value={ficha.nomePrato} onChange={e => setF('nomePrato', e.target.value)} />
          </Field>
          <Field label="Classificação">
            <input className="input" value={ficha.classificacao} onChange={e => setF('classificacao', e.target.value)} placeholder="ex: Peixe, Sobremesa..." />
          </Field>

          {/* ── Família e Etiquetas ── */}
          <Field label="🍽️ Família principal (obrigatória para avaliação)">
            <select className="input" value={ficha.familia1 || ''} onChange={e => setF('familia1', e.target.value || undefined)}>
              <option value="">— Escolher família —</option>
              {FAMILIAS_FICHA.map((f: FamiliaFicha) => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
          <Field label="🍽️ Família secundária (opcional — quando há duas técnicas equivalentes)">
            <select className="input" value={ficha.familia2 || ''} onChange={e => setF('familia2', e.target.value || undefined)}>
              <option value="">— Nenhuma —</option>
              {FAMILIAS_FICHA.filter((f: FamiliaFicha) => f !== ficha.familia1).map((f: FamiliaFicha) => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
          <Field label="🏷️ Etiquetas (máx. 3 — contexto adicional)">
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {TODAS_ETIQUETAS.map((et: string) => {
                // Compara já limpas: «Cozinha Portuguesa.» (com ponto) é a mesma etiqueta.
                const etqs = limparEtiquetas(ficha.etiquetas);
                const selecionada = etqs.includes(et);
                const limite = etqs.length >= 3;
                return (
                  <button key={et} type="button"
                    onClick={() => {
                      const cur = etqs;
                      if (selecionada) setF('etiquetas', cur.filter((x: string) => x !== et));
                      else if (!limite) setF('etiquetas', [...cur, et]);
                    }}
                    style={{
                      padding:'4px 10px', borderRadius:100, fontSize:13, fontWeight:600,
                      border:`1.5px solid ${selecionada ? 'var(--copper)' : 'var(--border)'}`,
                      background:selecionada ? 'var(--copper-pale)' : '#fff',
                      color:selecionada ? 'var(--copper)' : 'rgba(26,23,20,0.5)',
                      cursor: selecionada || !limite ? 'pointer' : 'not-allowed',
                      opacity: !selecionada && limite ? 0.4 : 1,
                    }}>
                    {selecionada ? '✓ ' : ''}{et}
                  </button>
                );
              })}
            </div>
            {(ficha.etiquetas || []).length > 0 && (
              <div style={{ fontSize:13, color:'var(--copper)', marginTop:6 }}>
                Selecionadas: {limparEtiquetas(ficha.etiquetas).join(' · ') || 'nenhuma'}
              </div>
            )}
          </Field>

          <Field label="Alergénios">
            <input className="input" value={ficha.alergenicos} onChange={e => setF('alergenicos', e.target.value)} />
          </Field>
          <Field label="Nº Porções">
            <input className="input" value={ficha.numPorcoes} onChange={e => setF('numPorcoes', e.target.value)} />
          </Field>
          <Field label="Tempo Preparação">
            <input className="input" value={ficha.tempoPrep} onChange={e => setF('tempoPrep', e.target.value)} placeholder="ex: 30 min" />
          </Field>
          <Field label="Tempo Confeção">
            <input className="input" value={ficha.tempoConf} onChange={e => setF('tempoConf', e.target.value)} placeholder="ex: 45 min" />
          </Field>
        </div>
      </Card>

      {/* Ingredientes */}
      <Card>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Ingredientes</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--charcoal)', color: '#fff' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Componente</th>
                <th style={{ padding: '6px 4px', textAlign: 'left', width: 60 }}>Qt.</th>
                <th style={{ padding: '6px 4px', textAlign: 'left', width: 50 }}>Un.</th>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Produto</th>
                <th style={{ padding: '6px 4px', textAlign: 'left', width: 50 }}>T.Prep</th>
                <th style={{ padding: '6px 4px', textAlign: 'left', width: 50 }}>T.Conf</th>
                <th style={{ padding: '6px 4px', textAlign: 'left' }}>Obs.</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {ficha.ingredientes.map((ing, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '4px 4px' }}>
                    <input className="input" style={{ padding: '4px 6px', fontSize: 13 }}
                      value={ing.componente} onChange={e => setIngrediente(i, 'componente', e.target.value)} />
                  </td>
                  <td style={{ padding: '4px 4px' }}>
                    <input className="input" style={{ padding: '4px 6px', fontSize: 13, width: 55 }}
                      value={ing.qt} onChange={e => setIngrediente(i, 'qt', e.target.value)} />
                  </td>
                  <td style={{ padding: '4px 4px' }}>
                    <input className="input" style={{ padding: '4px 6px', fontSize: 13, width: 45 }}
                      value={ing.un} onChange={e => setIngrediente(i, 'un', e.target.value)} />
                  </td>
                  <td style={{ padding: '4px 4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ImagemDoIngrediente nome={ing.produto} tamanho={30} />
                      <input className="input" style={{ padding: '4px 6px', fontSize: 13, flex: 1, minWidth: 0 }}
                        value={ing.produto} onChange={e => setIngrediente(i, 'produto', e.target.value)} />
                    </div>
                  </td>
                  <td style={{ padding: '4px 4px' }}>
                    <input className="input" style={{ padding: '4px 6px', fontSize: 13, width: 45 }}
                      value={ing.tPrep} onChange={e => setIngrediente(i, 'tPrep', e.target.value)} />
                  </td>
                  <td style={{ padding: '4px 4px' }}>
                    <input className="input" style={{ padding: '4px 6px', fontSize: 13, width: 45 }}
                      value={ing.tConf} onChange={e => setIngrediente(i, 'tConf', e.target.value)} />
                  </td>
                  <td style={{ padding: '4px 4px' }}>
                    <input className="input" style={{ padding: '4px 6px', fontSize: 13 }}
                      value={ing.obs} onChange={e => setIngrediente(i, 'obs', e.target.value)} />
                  </td>
                  <td style={{ padding: '4px 4px' }}>
                    <button onClick={() => removeIngrediente(i)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontWeight: 700 }}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button variant="ghost" onClick={addIngrediente} block>+ Adicionar ingrediente</Button>
      </Card>

      {/* Modo de preparação */}
      <Card>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Modo de Preparação</div>
        {ficha.preparacao.map((passo, i) => (
          <div key={i} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="mono" style={{ fontWeight: 700, fontSize: 16, minWidth: 24 }}>{passo.num}.</span>
              <div style={{ flex: 1 }}>
                <textarea className="input" style={{ minHeight: 64 }}
                  value={passo.descricao}
                  onChange={e => setPasso(i, 'descricao', e.target.value)}
                  placeholder="Descrição do passo..." />
              </div>
              <button onClick={() => removePasso(i)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontWeight: 700, alignSelf: 'flex-start' }}>✕</button>
            </div>
            <div style={{ display: 'flex', gap: 8, paddingLeft: 32 }}>
              <Field label="Temperatura">
                <input className="input" value={passo.temperatura}
                  onChange={e => setPasso(i, 'temperatura', e.target.value)} placeholder="ex: 180ºC" />
              </Field>
              <Field label="Tempo">
                <input className="input" value={passo.tempo}
                  onChange={e => setPasso(i, 'tempo', e.target.value)} placeholder="ex: 20 min" />
              </Field>
              <Field label="Observações">
                <input className="input" value={passo.obs}
                  onChange={e => setPasso(i, 'obs', e.target.value)} />
              </Field>
            </div>
            {(passo.haccp || true) && (
              <div style={{ paddingLeft: 32, marginTop: 4 }}>
                <Field label="⚠️ PCC / Ponto Crítico de Controlo (HACCP)">
                  <input className="input"
                    style={{ borderColor: passo.haccp ? '#B5651D' : undefined, background: passo.haccp ? '#FFF8F0' : undefined }}
                    value={passo.haccp}
                    onChange={e => setPasso(i, 'haccp', e.target.value)}
                    placeholder="ex: Temp. mínima 75ºC no centro, Arrefecer abaixo 10ºC em 2h..." />
                </Field>
              </div>
            )}
          </div>
        ))}
        <Button variant="ghost" onClick={addPasso} block>+ Adicionar passo</Button>
      </Card>

      {/* Empratamento */}
      <Card>
        <Field label="Apresentação / Empratamento">
          <textarea className="input" value={ficha.empratamento}
            onChange={e => setF('empratamento', e.target.value)}
            placeholder="Descreve a apresentação e empratamento..." />
        </Field>
        {/* Banco de imagens (Makro): ervas, flores, micro legumes, frutos vermelhos, embalagens.
            O que se escolhe entra na ficha como ingrediente de «Empratamento» (e vai para a requisição). */}
        {(() => {
          const doEmpratamento = ficha.ingredientes.filter(x => /empratamento/i.test(x.componente || ''));
          return (
            <div style={{ marginTop: 8 }}>
              {doEmpratamento.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  {doEmpratamento.map((x, k) => (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 8px', fontSize: 12.5 }}>
                      <ImagemDoIngrediente nome={x.produto} tamanho={36} /> <span style={{ maxWidth: 180 }}>{x.produto}</span>
                    </div>
                  ))}
                </div>
              )}
              <Button variant="ghost" onClick={() => setBancoAberto(true)}>🖼️ Banco de imagens de empratamento (Makro)</Button>
              {bancoAberto && (
                <BancoEmpratamentoJanela onFechar={() => setBancoAberto(false)}
                  jaEscolhidos={[]}
                  onEscolher={item => {
                    setFicha(prev => prev.ingredientes.some(x => x.produto === item.nome) ? prev : ({
                      ...prev,
                      ingredientes: [...prev.ingredientes.filter(x => x.produto || x.qt), { componente: 'Empratamento', qt: '1', un: 'un', produto: item.nome, tPrep: '', tConf: '', obs: item.embalagem || '' }],
                    }));
                  }} />
              )}
            </div>
          );
        })()}
      </Card>

      {/* Equipamento */}
      <Card>
        <Field label="🔧 Equipamento necessário">
          <textarea className="input" value={ficha.equipamento}
            onChange={e => setF('equipamento', e.target.value)}
            placeholder="ex: Frigideira antiaderente, Termómetro de sonda, Mandolina, Forno combinado..."
            style={{ minHeight: 80 }} />
        </Field>
      </Card>

      {/* Conservação e Regeneração */}
      <Card>
        <Field label="❄️ Conservação">
          <textarea className="input" value={ficha.conservacao}
            onChange={e => setF('conservacao', e.target.value)}
            placeholder="ex: Refrigerar a 0-4ºC, consumir em 24h, tapar com película..."
            style={{ minHeight: 60 }} />
        </Field>
        <Field label="🔥 Regeneração">
          <textarea className="input" value={ficha.regeneracao}
            onChange={e => setF('regeneracao', e.target.value)}
            placeholder="ex: Aquecer em frigideira a lume médio 2-3 min, temperatura mínima 75ºC no centro..."
            style={{ minHeight: 60 }} />
        </Field>
      </Card>

      {/* KitchenFlow */}
      <Card>
        <Field label="📋 Registos KitchenFlow obrigatórios nesta produção">
          <textarea className="input" value={ficha.kitchenflow}
            onChange={e => setF('kitchenflow', e.target.value)}
            placeholder="ex: Temperatura de serviço, Higiene pessoal, Amostra testemunho..."
            style={{ minHeight: 60 }} />
        </Field>
      </Card>

      {/* Rodapé */}
      <Card>
        <div style={{ display: 'flex', gap: 10 }}>
          <Field label="Elaborado por">
            <input className="input" value={ficha.elaboradoPor}
              onChange={e => setF('elaboradoPor', e.target.value)} />
          </Field>
          <Field label="Data">
            <input className="input" value={ficha.data}
              onChange={e => setF('data', e.target.value)} />
          </Field>
        </div>
      </Card>

      {/* Nutrição */}
      {(() => {
        const nutri = calcularNutricao(ficha.ingredientes, parseInt(ficha.numPorcoes) || 1);
        if (nutri.numIngredientesCalculados === 0) return null;
        return (
          <Card>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              Valores Nutricionais Estimados
              <span className="muted" style={{ fontSize:13, fontWeight: 400, marginLeft: 8 }}>
                (por porção · {nutri.numIngredientesCalculados}/{nutri.totalIngredientes} ingredientes calculados)
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {[
                { label: 'Energia', valor: `${nutri.calorias} kcal` },
                { label: 'Proteínas', valor: `${nutri.proteinas} g` },
                { label: 'Gorduras', valor: `${nutri.gorduras} g` },
                { label: 'Hidratos', valor: `${nutri.hidratos} g` },
              ].map(({ label, valor }) => (
                <div key={label} style={{ background: 'var(--cream)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                  <div className="muted" style={{ fontSize:13 }}>{label}</div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--copper)' }}>{valor}</div>
                </div>
              ))}
            </div>
            <div className="muted" style={{ fontSize:13, marginTop: 6 }}>
              ⚠️ Estimativa — verificar com tabela oficial INSA
            </div>
          </Card>
        );
      })()}

      {/* Alergénicos */}
      {ficha.alergenicos && (
        <Card>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Alergénios detetados</div>
          <div style={{ fontSize: 14 }}>{ficha.alergenicos}</div>
          <div className="muted" style={{ fontSize:13, marginTop: 4 }}>
            ⚠️ Verificar sempre — baseado nos ingredientes introduzidos
          </div>
          <Field label="Editar alergénicos">
            <input className="input" value={ficha.alergenicos}
              onChange={e => setF('alergenicos', e.target.value)} />
          </Field>
        </Card>
      )}
      {subtecnicasDetetadas.length > 0 && (
        <Card>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>🔍 Subtécnicas detetadas automaticamente</div>
          <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
            Com base no texto da receita. Serão usadas no passo seguinte para sugerir competências.
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {subtecnicasDetetadas.map((s: { id: string; nome: string }) => (
              <span key={s.id} className="chip suggested">★ {s.nome}</span>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <Button block variant="ghost" onClick={() => {
          // Guardar draft antes de voltar — não perde o trabalho
          try { localStorage.setItem('ecl_ficha_draft', JSON.stringify(ficha)); } catch {}
          onVoltar();
        }}>← Voltar (guarda o rascunho)</Button>
        <div style={{ height: 8 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" onClick={() => {
            const nutri = calcularNutricao(ficha.ingredientes, parseInt(ficha.numPorcoes) || 1);
            const fichaExport = {
              ...ficha,
              nutricao: nutri.numIngredientesCalculados > 0 ? {
                calorias: nutri.calorias,
                proteinas: nutri.proteinas,
                gorduras: nutri.gorduras,
                hidratos: nutri.hidratos,
              } : undefined,
            };
            try { exportPDF(fichaExport as any); }
            catch(e) { alert('Erro ao gerar PDF'); }
          }}>🖨️ PDF</Button>
          <Button variant="ghost" onClick={async () => {
            const nutri = calcularNutricao(ficha.ingredientes, parseInt(ficha.numPorcoes) || 1);
            const fichaExport = {
              ...ficha,
              nutricao: nutri.numIngredientesCalculados > 0 ? {
                calorias: nutri.calorias,
                proteinas: nutri.proteinas,
                gorduras: nutri.gorduras,
                hidratos: nutri.hidratos,
              } : undefined,
            };
            try { await exportDOCX(fichaExport as any); }
            catch(e) { alert('Erro ao gerar Word: ' + String(e)); }
          }}>📄 Word</Button>
        </div>

        {/* TÉCNICAS E APARELHOS — o que o aluno vai avaliar, com as frases
            deste prato. O professor corrige antes de a aula abrir. */}
        {((ficha.tecnicasDetectadas || []).length > 0 || ((ficha as any).aparelhosDetectados || []).length > 0) && (
          <CriteriosDaFicha
            tecnicas={ficha.tecnicasDetectadas || []} aparelhos={(ficha as any).aparelhosDetectados || []}
            onMudar={(tecnicas, aparelhos) => setFicha(f => ({ ...f, tecnicasDetectadas: tecnicas, ...({ aparelhosDetectados: aparelhos } as any) }))} />
        )}

        {/* PERGUNTAS AO ALUNO — escritas pela IA com a ficha; o professor aprova (Rosa, out/2026). */}
        {(ficha.perguntasAuto || []).length > 0 ? (
          <PerguntasDaFicha perguntas={ficha.perguntasAuto || []} prato={ficha.nomePrato}
            quem={ficha.elaboradoPor || 'professor'} onMudar={l => setFicha(f => ({ ...f, perguntasAuto: l }))} />
        ) : ((ficha.tecnicasDetectadas || []).length > 0 || ((ficha as any).aparelhosDetectados || []).length > 0) && (
          <CriarPerguntasDaFicha ficha={ficha} onCriadas={l => setFicha(f => ({ ...f, perguntasAuto: l }))} />
        )}

        {/* Adicionar técnica manualmente */}
        <div style={{ marginBottom: 10 }}>
          <button type="button" className="btn btn-ghost" style={{ fontSize: 13 }}
            onClick={() => {
              const nova = prompt('Nome da técnica/competência a adicionar:');
              if (nova && nova.trim()) {
                setFicha(f => ({ ...f, tecnicasDetectadas: [...(f.tecnicasDetectadas || []), nova.trim()] }));
              }
            }}>
            + Adicionar técnica
          </button>
        </div>

        <div style={{ height: 8 }} />
        <div style={{ position:'sticky', bottom:0, padding:'12px 0', background:'white', borderTop:'1px solid var(--border)' }}>
          <button className="btn btn-primary" style={{ width:'100%', background:'var(--sage)', fontSize:15, padding:'14px', fontWeight:700, borderRadius:10, border:'none', cursor:'pointer', opacity: ficha.nomePrato ? 1 : 0.4 }}
            onClick={() => {
              if (!ficha.nomePrato) return;
              // Normalizar todos os campos antes de continuar — proteção final contra
              // qualquer tipo inesperado (array em vez de string, undefined, etc.)
              const fichaSegura: FichaTecnica = {
                ...ficha,
                nomePrato: String(ficha.nomePrato || ''),
                classificacao: String(ficha.classificacao || ''),
                fichaNum: String(ficha.fichaNum || ''),
                alergenicos: Array.isArray(ficha.alergenicos) ? (ficha.alergenicos as any).join(', ') : String(ficha.alergenicos || ''),
                tempoPrep: String(ficha.tempoPrep || ''),
                tempoConf: String(ficha.tempoConf || ''),
                numPorcoes: String(ficha.numPorcoes || ''),
                empratamento: String(ficha.empratamento || ''),
                elaboradoPor: String(ficha.elaboradoPor || ''),
                data: String(ficha.data || ''),
                equipamento: String(ficha.equipamento || ''),
                conservacao: String(ficha.conservacao || ''),
                regeneracao: String(ficha.regeneracao || ''),
                kitchenflow: String(ficha.kitchenflow || ''),
                familia1: ficha.familia1 || undefined,
                familia2: ficha.familia2 || undefined,
                etiquetas: limparEtiquetas(ficha.etiquetas),
                ingredientes: (ficha.ingredientes || []).map(ing => ({
                  componente: String(ing?.componente ?? ''),
                  qt: String(ing?.qt ?? ''),
                  un: String(ing?.un ?? ''),
                  produto: String(ing?.produto ?? ''),
                  tPrep: String(ing?.tPrep ?? ''),
                  tConf: String(ing?.tConf ?? ''),
                  obs: String(ing?.obs ?? ''),
                })),
                preparacao: (ficha.preparacao || []).map((p, i) => ({
                  num: typeof p?.num === 'number' ? p.num : i + 1,
                  descricao: String(p?.descricao ?? ''),
                  temperatura: String(p?.temperatura ?? ''),
                  tempo: String(p?.tempo ?? ''),
                  obs: String(p?.obs ?? ''),
                  haccp: String(p?.haccp ?? ''),
                })),
                tecnicasDetectadas: Array.isArray(ficha.tecnicasDetectadas) ? ficha.tecnicasDetectadas.map(String) : [],
                perguntasAuto: Array.isArray(ficha.perguntasAuto) ? ficha.perguntasAuto : [],
              };
              onContinuar(fichaSegura);
            }} disabled={!ficha.nomePrato}>
            ✓ Guardar Ficha de Produção
          </button>
          {!ficha.nomePrato && <div style={{ textAlign:'center', fontSize:13, color:'var(--danger)', marginTop:6 }}>Preencha o nome do prato para guardar.</div>}
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// Vista principal do Professor — orquestra os passos
// ============================================================
// ── Ecrã dedicado do Guia — isolado, estado próprio, gravação explícita ──
function EcraGuiaDedicado({ planoId, ucId, ucNome, nomePratoInicial, onAlteracao, onGuardado }: {
  planoId?: string; ucId?: string; ucNome?: string; nomePratoInicial?: string;
  onAlteracao?: () => void; onGuardado?: () => void;
}) {
  // As fichas do plano são as que o plano tem (fichasIds) — também as
  // juntadas da biblioteca. Antes só contavam as criadas dentro do plano,
  // e o guião dizia "Ainda não há nenhuma ficha" num plano com fichas.
  const [fichasDoPlano] = useState<FichaProducao[]>(() => {
    const todas = getFichasProducao();
    if (!planoId) return todas;
    const ids = new Set(getPlanosAula().find(p => p.id === planoId)?.fichasIds || []);
    return todas.filter(f => ids.has(f.id) || (f as any).planoAulaId === planoId)
      .sort((a, b) => (a.criadoEm || '').localeCompare(b.criadoEm || ''));
  });
  // A ficha do guião: a pedida pelo nome; senão a primeira ainda sem guião;
  // senão a última. E o professor pode escolher outra (uma por ficha).
  const [fichaAlvo, setFichaAlvoEstado] = useState<FichaProducao | null>(() =>
    fichasDoPlano.find(f => nomePratoInicial && f.nomePrato === nomePratoInicial && !(f as any).textoGuia)
    || fichasDoPlano.find(f => !(f as any).textoGuia)
    || fichasDoPlano[fichasDoPlano.length - 1] || null);
  const nomePrato = fichaAlvo?.nomePrato || nomePratoInicial || '';
  const [textoGuia, setTextoGuia] = useState((fichaAlvo as any)?.textoGuia || '');
  const [modo, setModo] = useState<'colar' | 'ver'>((fichaAlvo as any)?.textoGuia ? 'ver' : 'colar');
  function escolherFicha(f: FichaProducao) {
    const atual = getFichasProducao().find(x => x.id === f.id) || f;
    setFichaAlvoEstado(atual);
    setTextoGuia((atual as any).textoGuia || '');
    setModo((atual as any).textoGuia ? 'ver' : 'colar');
    setGuardadoOk(false);
  }
  const [guardadoOk, setGuardadoOk] = useState(false);

  if (!fichaAlvo) {
    return (
      <div style={{ padding: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📚</div>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Ainda não há nenhuma ficha</div>
        <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.55)' }}>Crie primeiro uma Ficha de Produção para depois gerar o Guia.</div>
      </div>
    );
  }

  const promptGuiaAtual = gerarPromptGuia(nomePrato || 'Receita', ucId, ucNome, fichaAlvo);

  function guardarGuia() {
    if (!fichaAlvo) return;
    addOrUpdateFichaProducao({ ...fichaAlvo, textoGuia, atualizadoEm: new Date().toISOString() } as any);
    setGuardadoOk(true);
    setTimeout(() => setGuardadoOk(false), 2500);
    onAlteracao?.();
  }

  return (
    <div style={{ background: 'var(--guia-pale)', borderRadius: 16, padding: 16 }}>
      <div className="no-print" style={{ background: 'var(--guia)', borderRadius: 14, padding: '16px 18px', marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: 'white' }}>📚 Guia de Apoio à Produção</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>{nomePrato}</div>
        <EtiquetaLigacaoPlano planoAulaId={(fichaAlvo as any)?.planoAulaId} fichaId={fichaAlvo?.id} sobreEscuro />
      </div>

      {/* Um guião por ficha: com várias fichas, escolhe-se de qual. */}
      {/* Fora de um plano há todas as fichas: escolhe-se numa lista. */}
      {!planoId && fichasDoPlano.length > 1 && (
        <select className="input no-print" value={fichaAlvo.id} style={{ marginBottom: 12 }}
          onChange={e => { const f = fichasDoPlano.find(x => x.id === e.target.value); if (f) escolherFicha(f); }}>
          {fichasDoPlano.map(f => <option key={f.id} value={f.id}>{f.nomePrato}{(f as any).textoGuia ? ' ✓' : ''}</option>)}
        </select>
      )}
      {planoId && fichasDoPlano.length > 1 && (
        <div className="no-print" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {fichasDoPlano.map(f => {
            const ativa = f.id === fichaAlvo.id;
            const temGuia = !!(getFichasProducao().find(x => x.id === f.id) as any)?.textoGuia;
            return (
              <button key={f.id} onClick={() => escolherFicha(f)} style={{
                padding: '7px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                border: `1.5px solid ${ativa ? 'var(--guia)' : 'rgba(26,23,20,0.15)'}`,
                background: ativa ? 'var(--guia)' : '#fff', color: ativa ? '#fff' : 'inherit' }}>
                {temGuia ? '✓ ' : ''}{f.nomePrato}
              </button>
            );
          })}
        </div>
      )}

      <Card>
        <div className="no-print" style={{ fontWeight: 700, fontSize: 14, color: 'var(--sage)', marginBottom: 8 }}>1. Gerar com IA</div>
        <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* O seletor já tem "Copiar prompt": havia um segundo botão igual. */}
          <SeletorIA prompt={promptGuiaAtual} corPrincipal="var(--guia)" />
        </div>

        <div className="no-print" style={{ fontWeight: 700, fontSize: 14, color: 'var(--sage)', marginTop: 16, marginBottom: 8 }}>2. Colar o resultado</div>

        {modo === 'colar' && (
          <div className="no-print">
            <textarea
              value={textoGuia}
              onChange={e => setTextoGuia(e.target.value)}
              placeholder={`Cole aqui o resultado da IA para o Guia de Apoio à Produção de "${nomePrato}"...`}
              style={{ width: '100%', minHeight: 160, borderRadius: 10, border: '1.5px solid var(--border)', padding: 10, fontSize: 13, fontFamily: 'monospace', resize: 'vertical' }}
            />
            {textoGuia && (
              <button onClick={() => setModo('ver')} style={{ marginTop: 8, width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: 'var(--sage)', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                📚 Ver Guia Formatado →
              </button>
            )}
          </div>
        )}

        {modo === 'ver' && textoGuia && (
          <>
            <button onClick={() => setModo('colar')} className="no-print" style={{ marginBottom: 10, padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
              ← Editar texto
            </button>
            <div className="guia-area-impressao" data-rodape={'Guião de Apoio à Produção · ' + nomePrato + (ucId ? ' · ' + ucId : '') + (ucNome ? ' — ' + ucNome : '') + ' · ECL 2025/26'}>
              <GuiaProducao textoGuia={textoGuia} nomePrato={nomePrato} ucId={ucId} ucNome={ucNome} />
            </div>
          </>
        )}

        {/* Gravação EXPLÍCITA — só ao clicar, nunca automática a cada tecla */}
        <button className="btn btn-primary btn-block no-print" style={{ marginTop: 16 }}
          disabled={!textoGuia}
          onClick={guardarGuia}>
          {guardadoOk ? '✅ Guia guardado!' : '💾 Guardar Guia'}
        </button>



        <button className="btn btn-block no-print" style={{ marginTop: 10, background: 'var(--copper)', color: 'white' }}
          onClick={() => {
            if (textoGuia && !guardadoOk) guardarGuia();
            onGuardado?.();
            // Publicação no Classroom disponível na VistaDePlano → botão Publicar
          }}>
          ✓ Concluir Guia
        </button>
      </Card>
    </div>
  );
}

/** Uma ficha guardada, pronta para o editor (abrir uma ficha que já existe). */
function fichaParaOEditor(f: any, nomeProfessor?: string): FichaTecnica {
  return normalizarFicha({
      nomePrato: f.nomePrato, classificacao: f.classificacao,
      fichaNum: f.fichaNum || '', alergenicos: f.alergenicos,
      tempoPrep: f.tempoPrep||'', tempoConf: f.tempoConf||'',
      numPorcoes: f.numPorcoes||'',
      // Se a ficha vier sem ingredientes, mantém-se vazia — mas o
      // professor é avisado. Antes era substituída em silêncio por
      // uma ficha em branco, e as quantidades originais
      // desapareciam sem ninguém perceber porquê.
      ingredientes: (f.ingredientes && f.ingredientes.length > 0)
        ? f.ingredientes as any : FICHA_VAZIA.ingredientes,
      preparacao: (f.preparacao && f.preparacao.length > 0)
        ? f.preparacao as any : FICHA_VAZIA.preparacao,
      empratamento: f.empratamento||'', elaboradoPor: f.elaboradoPor||nomeProfessor||'',
      data: f.data||'', equipamento: f.equipamento||'',
      conservacao: f.conservacao||'', regeneracao: f.regeneracao||'',
      kitchenflow: f.kitchenflow||'',
      familia1: (f as any).familia1 || undefined,
      familia2: (f as any).familia2 || undefined,
      etiquetas: (f as any).etiquetas || [],
      // As técnicas ficam guardadas em «tecnicasSugeridas»: sem isto, a ficha
      // abria sem as técnicas escolhidas (Rosa, out/2026).
      tecnicasDetectadas: (f as any).tecnicasDetectadas?.length ? (f as any).tecnicasDetectadas : (f as any).tecnicasSugeridas || [],
      aparelhosDetectados: (f as any).aparelhosDetectados || [],
      perguntasAuto: (f as any).perguntasAuto || [],
    });
}

export function ProfessorView({ turmaId, nomeProfessor, onAlteracao, onGuardado, planoId, modoGuia, nomePratoInicial, fichaParaEditar, abrirBiblioteca }: {
  turmaId: string;
  nomeProfessor?: string;
  onAlteracao?: () => void;
  onGuardado?: () => void;
  planoId?: string;
  modoGuia?: boolean;
  nomePratoInicial?: string;
  /** Abre logo esta ficha em edição, em vez da biblioteca. */
  fichaParaEditar?: string | null;
  /** Abre na biblioteca completa — todas as fichas, não só as do plano. */
  abrirBiblioteca?: boolean;
}) {
  const [vista, setVista] = useState<'biblioteca' | 'criar' | 'editar'>(
    fichaParaEditar ? 'editar' : 'biblioteca'
  );
  // ID da ficha original quando em modo 'editar' — sem isto, guardar uma
  // edição criava sempre uma ficha NOVA em vez de atualizar a existente
  // (causa real de fichas duplicadas: "Bacalhau", "Bacalhau 2", "Bacalhau 3"...)
  const [fichaEmEdicaoId, setFichaEmEdicaoId] = useState<string | null>(fichaParaEditar ?? null);
  const [textoReceita, setTextoReceita] = useState('');
  const [linkReceita, setLinkReceita] = useState('');
  // Abrir uma ficha que o plano já tem: abre ESSA ficha, com as técnicas.
  // Antes abria o ecrã de criar uma ficha nova, vazio (Rosa, out/2026).
  const fichaAberta = fichaParaEditar ? getFichasProducao().find(f => f.id === fichaParaEditar) : undefined;
  const [ficha, setFicha] = useState<FichaTecnica>(() => fichaAberta ? fichaParaOEditor(fichaAberta, nomeProfessor)
    : { ...FICHA_VAZIA, elaboradoPor: nomeProfessor || FICHA_VAZIA.elaboradoPor });
  const [passo, setPasso] = useState<'link' | 'ficha'>(fichaAberta ? 'ficha' : 'link');
  const [fichasGuardadas, setFichasGuardadas] = useState(() => getFichasProducao());
  // Quando o professor vem do plano com "Ir buscar uma ficha", abre
  // logo na biblioteca completa em vez das fichas deste plano.
  const [mostrarBibliotecaCompleta, setMostrarBibliotecaCompleta] = useState(!!abrirBiblioteca);
  // Modo de seleção múltipla — eliminar várias fichas de uma vez (ponto 9
  // do documento de 21/06/2026, "isto é extremamente moroso" item a item).
  const [modoSelecao, setModoSelecao] = useState(false);
  const [fichasSelecionadasIds, setFichasSelecionadasIds] = useState<Set<string>>(new Set());
  const [guardadoMsg, setGuardadoMsg] = useState('');
  const [ultimaFichaIdGuardada, setUltimaFichaIdGuardada] = useState<string | null>(null);

  // Buscar UC do plano mais recente
  const planos = getPlanosAulaPorTurma(turmaId);
  const planoRecente = planos.find(p => p.ucId) || planos[0];
  const ucId = planoRecente?.ucId || '';
  const ucNome = planoRecente?.ucNome || '';

  function recarregar() { setFichasGuardadas(getFichasProducao()); }

  function guardarFicha(fichaConfirmada: FichaTecnica) {
    try {
      const now = new Date().toISOString();
      // Numeração sequencial robusta — baseada no maior número já usado, não
      // em .length (que descia ao eliminar fichas e podia repetir números).
      const todasFichas = getFichasProducao();
      const proximoNum = proximoNumeroFicha();
      const numeroFormatado = `#${proximoNum}`;

      // Evitar nomes duplicados — só ao criar ficha NOVA (não ao editar uma já existente)
      let nomeFinal = semPontoFinal(fichaConfirmada.nomePrato || '');
      if (vista === 'criar' && nomeFinal) {
        const nomesExistentes = new Set(todasFichas.map(f => (f.nomePrato || '').trim().toLowerCase()));
        if (nomesExistentes.has(nomeFinal.trim().toLowerCase())) {
          let contador = 2;
          let candidato = `${nomeFinal} ${contador}`;
          while (nomesExistentes.has(candidato.trim().toLowerCase())) {
            contador++;
            candidato = `${nomeFinal} ${contador}`;
          }
          nomeFinal = candidato;
        }
      }

      // Normalizar alergenicos — pode vir como string ou array, dependendo da origem
      const alergRaw: any = fichaConfirmada.alergenicos;
      const alergenicosArray: string[] = Array.isArray(alergRaw)
        ? alergRaw
        : (typeof alergRaw === 'string' ? alergRaw.split(',').map(a => a.trim()).filter(Boolean) : []);
      const alergenicosTexto: string = alergenicosArray.join(', ');

      // Gerar HTML formatado da ficha — para o aluno ver/imprimir em qualquer dispositivo
      // sem depender de reler dados estruturados do Sheets (limitação conhecida)
      const htmlCompleto = (() => {
        try {
          return gerarHTML({
            nomePrato: nomeFinal,
            classificacao: semPontoFinal(fichaConfirmada.classificacao || ''),
            fichaNum: fichaConfirmada.fichaNum || numeroFormatado,
            numPorcoes: fichaConfirmada.numPorcoes || '',
            tempoPrep: fichaConfirmada.tempoPrep || '',
            tempoConf: fichaConfirmada.tempoConf || '',
            ingredientes: fichaConfirmada.ingredientes || [],
            preparacao: fichaConfirmada.preparacao || [],
            empratamento: fichaConfirmada.empratamento || '',
            alergenicos: alergenicosTexto,
            equipamento: fichaConfirmada.equipamento || '',
            conservacao: fichaConfirmada.conservacao || '',
            regeneracao: fichaConfirmada.regeneracao || '',
            kitchenflow: fichaConfirmada.kitchenflow || '',
            elaboradoPor: nomeProfessor || fichaConfirmada.elaboradoPor || '',
            data: fichaConfirmada.data || now,
          } as any);
        } catch { return ''; }
      })();

      // Quando estamos a EDITAR uma ficha já existente, reutilizar o ID
      // original — sem isto, "guardar" criava sempre uma ficha NOVA,
      // duplicando (Bacalhau, Bacalhau 2, Bacalhau 3...).
      // Id único — duas fichas criadas no mesmo milissegundo ficavam com
      // o mesmo, e uma apagava a outra aqui e no Sheets.
      const novaFichaId = (vista === 'editar' && fichaEmEdicaoId) ? fichaEmEdicaoId : novoIdFicha();
      const fichaOriginal = vista === 'editar' && fichaEmEdicaoId ? todasFichas.find(f => f.id === fichaEmEdicaoId) : undefined;
      addOrUpdateFichaProducao({
        id: novaFichaId,
        nomePrato: nomeFinal,
        classificacao: fichaConfirmada.classificacao || '',
        fichaNum: fichaOriginal?.fichaNum || fichaConfirmada.fichaNum || numeroFormatado,
        numPorcoes: fichaConfirmada.numPorcoes || '',
        tempoPrep: fichaConfirmada.tempoPrep || '',
        tempoConf: fichaConfirmada.tempoConf || '',
        ingredientes: (fichaConfirmada.ingredientes || []).map((ing, i) => ({
          ...ing, id: `ing_${i}`,
          // Componente culinário preenchido automaticamente — o professor
          // pode sempre corrigir manualmente depois (campo continua editável).
          componente: ing.componente?.trim() || obterComponenteCulinario(encontrarMateriaPrima(ing.produto)?.categoria),
        })),
        preparacao: (fichaConfirmada.preparacao || []).map((p, i) => ({ ...p, id: `passo_${i}` })),
        empratamento: fichaConfirmada.empratamento || '',
        alergenicos: alergenicosArray,
        equipamento: fichaConfirmada.equipamento || '',
        conservacao: fichaConfirmada.conservacao || '',
        regeneracao: fichaConfirmada.regeneracao || '',
        kitchenflow: fichaConfirmada.kitchenflow || '',
        tecnicasSugeridas: fichaConfirmada.tecnicasDetectadas || [],
        ...({ aparelhosDetectados: (fichaConfirmada as any).aparelhosDetectados || [] } as any),
        // As perguntas de autoavaliação das técnicas (as já aprovadas mantêm-se ao editar).
        perguntasAuto: fichaConfirmada.perguntasAuto?.length ? fichaConfirmada.perguntasAuto : ((fichaOriginal as any)?.perguntasAuto || []),
        // A família (obrigatória para a avaliação), a secundária e as
        // etiquetas escolhiam-se no formulário mas não eram guardadas.
        ...({
          familia1: fichaConfirmada.familia1 || (fichaOriginal as any)?.familia1 || undefined,
          familia2: fichaConfirmada.familia2 || (fichaOriginal as any)?.familia2 || undefined,
          etiquetas: limparEtiquetas(Array.isArray(fichaConfirmada.etiquetas) ? fichaConfirmada.etiquetas : ((fichaOriginal as any)?.etiquetas || [])),
        } as any),
        ucsAssociadas: [ucId].filter(Boolean),
        elaboradoPor: nomeProfessor || fichaConfirmada.elaboradoPor || '',
        // A data da ficha é a da aula a que pertence. Sem plano, é a de
        // criação — e em formato de data, não um timestamp completo, que
        // era o que fazia aparecer "2026-09-12T20:15:33.421Z" na lista.
        data: (() => {
          const doPlano = planoId
            ? getPlanosAula().find(x => x.id === planoId)?.data : undefined;
          return doPlano
            || fichaConfirmada.data
            || fichaOriginal?.data
            || now.slice(0, 10);
        })(),
        planoAulaId: planoId || fichaOriginal?.planoAulaId || undefined,
        textoGuia: fichaConfirmada.textoGuia || fichaOriginal?.textoGuia,
        htmlCompleto,
        criadoEm: fichaOriginal?.criadoEm || now,
        atualizadoEm: now,
      });

      // Associar ao plano se existe planoId — usar o ID exacto que acabámos de criar,
      // nunca adivinhar pela posição na lista (podia associar a ficha errada).
      if (planoId) {
        const planos = getPlanosAula();
        const plano = planos.find(p => p.id === planoId);
        if (plano && !(plano.fichasIds || []).includes(novaFichaId)) {
          addOrUpdatePlanoAula({ ...plano, fichasIds: [...plano.fichasIds, novaFichaId], atualizadoEm: now });
        }
      }

      try { localStorage.removeItem('ecl_ficha_draft'); localStorage.removeItem('ecl_link_draft'); } catch {}

      // ── Guião pendente (prompt unificado) — associar automaticamente
      try {
        const guiaoPendente = localStorage.getItem('ecl_guiao_pendente');
        if (guiaoPendente && guiaoPendente.length > 50) {
          const fichaActual = getFichasProducao().find(f => f.id === novaFichaId);
          if (fichaActual) {
            addOrUpdateFichaProducao({ ...fichaActual as any, textoGuia: guiaoPendente, atualizadoEm: new Date().toISOString() } as any);
          }
          localStorage.removeItem('ecl_guiao_pendente');
        }
      } catch {}

      recarregar();
      onGuardado?.();
      setUltimaFichaIdGuardada(novaFichaId);
            // Publicação no Classroom disponível na VistaDePlano → botão Publicar
      const nomeOriginal = fichaConfirmada.nomePrato || '';
      setGuardadoMsg(nomeFinal !== nomeOriginal
        ? `${nomeFinal} (renomeado de "${nomeOriginal}" — já existia uma ficha com esse nome)`
        : (nomeFinal || 'Ficha'));
      setVista('apos_guardar' as any);
    } catch (err) {
      console.error('Erro ao guardar ficha:', err);
      alert('Ocorreu um erro ao guardar a ficha. Os dados não se perderam: tente novamente. Detalhe: ' + String(err));
    }
  }

  function novaFicha() {
    setFicha(FICHA_VAZIA);
    setTextoReceita('');
    setLinkReceita('');
    setFichaEmEdicaoId(null);
    setPasso('link');
    setVista('criar');
  }

  // ── MODO GUIA — atalho directo para a última ficha do plano ──
  if (modoGuia) {
    return <EcraGuiaDedicado planoId={planoId} ucId={ucId} ucNome={ucNome} nomePratoInicial={nomePratoInicial} onAlteracao={onAlteracao} onGuardado={onGuardado} />;
  }

  // ── APÓS GUARDAR ─────────────────────────────────────────
  if ((vista as string) === 'apos_guardar') {
    // Usar o ID exacto que guardámos — nunca adivinhar pela posição na lista
    const ultimaFichaRaw = (ultimaFichaIdGuardada ? fichasGuardadas.find(f => f.id === ultimaFichaIdGuardada) : null) || ficha;
    // Normalizar para exportação — FichaProducao tem alergenicos como array, FichaTecnica como string
    const alergRaw: any = (ultimaFichaRaw as any).alergenicos;
    const ultimaFicha = {
      ...ultimaFichaRaw,
      alergenicos: Array.isArray(alergRaw) ? alergRaw.join(', ') : (alergRaw || ''),
    };
    return (
      <div style={{ padding: 16 }}>
        <div style={{ background: 'var(--sage-pale)', border: '1px solid rgba(90,122,78,0.3)', borderRadius: 14, padding: 20, textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--sage)', marginBottom: 4 }}>Ficha guardada!</div>
          <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.6)' }}>{guardadoMsg}</div>
        </div>

        {/* Imprimir — disponível assim que a ficha é guardada */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => {
            try { exportPDF(ultimaFicha as any); }
            catch (e) { alert('Erro ao gerar PDF'); }
          }}>🖨️ PDF</button>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={async () => {
            try { await exportDOCX(ultimaFicha as any); }
            catch (e) { alert('Erro ao gerar Word: ' + String(e)); }
          }}>📄 Word</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Próximos passos naturais — Guia → Requisição → Voltar */}
          {planoId && (
            <button className="btn btn-primary" style={{ background: 'var(--guia)', fontSize: 14, padding: '12px' }}
              onClick={() => onGuardado?.()}>
              📚 Criar Guia de Apoio →
            </button>
          )}
          {planoId && (
            <button className="btn btn-primary" style={{ background: 'var(--requisicao)', fontSize: 14, padding: '12px' }}
              onClick={() => {
                // Navegar para a requisição deste plano
                onGuardado?.();
                // Sinal para o VistaDePlano abrir directamente o módulo de requisição
                setTimeout(() => {
                  const ev = new CustomEvent('ecl:abrirRequisicao', { detail: { planoId } });
                  window.dispatchEvent(ev);
                }, 100);
              }}>
              🛒 Criar Requisição →
            </button>
          )}
          <button className="btn btn-primary" onClick={novaFicha}>
            + Criar nova Ficha de Produção
          </button>
          <button className="btn" style={{ background: 'var(--sage)', color: 'white' }} onClick={() => setVista('biblioteca')}>
            Ver todas as fichas
          </button>
        </div>
      </div>
    );
  }

  // ── BIBLIOTECA ────────────────────────────────────────────
  if (vista === 'biblioteca') {
    // Por defeito, só mostrar fichas associadas a ESTE plano específico
    // Só as fichas REALMENTE associadas a este plano.
    //
    // O filtro tinha "|| !fPlanoId" — ou seja, incluía também todas as
    // fichas sem plano. Como a maioria das fichas da biblioteca não tem
    // plano associado, apareciam todas em todos os planos: 81 fichas num
    // plano que tinha duas, cada uma marcada "Solta (sem plano)" mesmo a
    // aparecer em "Deste plano".
    //
    // A associação é dupla: a ficha aponta para o plano (planoAulaId) ou
    // o plano aponta para a ficha (fichasIds). Basta uma das duas.
    const fichasDoPlano = planoId
      ? fichasGuardadas.filter(f => {
          if ((f as any).planoAulaId === planoId) return true;
          const plano = getPlanosAula().find(p => p.id === planoId);
          return !!plano?.fichasIds?.includes(f.id);
        })
      : fichasGuardadas;
    const fichasParaMostrar = mostrarBibliotecaCompleta ? fichasGuardadas : fichasDoPlano;

    // Fichas que perderam o conteúdo. Acontecia na leitura do Sheets,
    // que forçava ingredientes e preparação a vazio na primeira vez que
    // a ficha chegava a um aparelho. A leitura já está corrigida, mas o
    // que ficou vazio continua vazio — e o professor abria a ficha e só
    // via o nome.
    const incompletas = fichasParaMostrar.filter(
      (f: any) => !f.ingredientes?.length || !f.preparacao?.length
    );

    return (
      <div style={{ background: 'var(--sage-pale)', borderRadius: 16, padding: 16 }}>
        <div style={{ background: 'var(--sage)', borderRadius: 14, padding: '14px 18px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <h2 className="display" style={{ margin: 0, color: 'white' }}>Fichas de Produção</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Eliminar fichas para sempre é com a coordenadora (Dados e segurança). */}
            <button className="btn btn-primary" onClick={novaFicha} style={{ background: 'white', color: 'var(--sage)' }}>+ Nova ficha</button>
          </div>
        </div>

        {modoSelecao && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--danger-pale)', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600, flex: 1 }}>
              {fichasSelecionadasIds.size} ficha(s) selecionada(s)
            </span>
            <button onClick={() => {
              if (fichasSelecionadasIds.size === 0) return;
              if (confirm(`Eliminar DEFINITIVAMENTE ${fichasSelecionadasIds.size} ficha(s)? Serão apagadas neste aparelho e no arquivo da escola, e esta ação não pode ser desfeita.`)) {
                fichasSelecionadasIds.forEach(id => eliminarFichaProducaoDefinitivamente(id));
                setFichasSelecionadasIds(new Set());
                setModoSelecao(false);
                recarregar();
              }
            }} disabled={fichasSelecionadasIds.size === 0}
              style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'var(--danger)', color: 'white', fontWeight: 700, fontSize: 13, cursor: fichasSelecionadasIds.size === 0 ? 'default' : 'pointer', opacity: fichasSelecionadasIds.size === 0 ? 0.4 : 1 }}>
              🗑️ Eliminar Selecionados
            </button>
          </div>
        )}

        {ucId && (
          <div style={{ padding:'8px 14px', background:'var(--copper-pale)', borderRadius:10, marginBottom:12, fontSize:13, color:'var(--copper)', border:'1px solid rgba(181,101,29,0.2)' }}>
            <strong>UC ativa:</strong> {ucId}{(ucNome || nomeUCRef(ucId)) ? ` — ${ucNome || nomeUCRef(ucId)}` : ''}
          </div>
        )}

        {/* Fichas com o MESMO id — o estrago do bug antigo. Estas não
            são cópias: são fichas diferentes que se sobrepõem, porque
            partilham o identificador. Enquanto assim estiverem, gravar
            uma apaga a outra. */}
        {(() => {
          const repetidos = fichasComIdRepetido();
          if (!repetidos.length) return null;
          const total = repetidos.reduce((s, g) => s + g.fichas.length - 1, 0);
          return (
            <div style={{ background:'#fdf0ef', border:'1.5px solid #c0392b',
              borderRadius:12, padding:15, marginBottom:12 }}>
              <div style={{ fontSize:15, fontWeight:700, color:'#c0392b' }}>
                {total} ficha{total > 1 ? 's' : ''} com o identificador repetido
              </div>
              <div style={{ fontSize:13.5, color:'rgba(26,23,20,0.7)', marginTop:5,
                lineHeight:1.55 }}>
                Não são cópias: são fichas diferentes com o mesmo
                identificador. Enquanto assim estiverem, guardar uma apaga a
                outra.
                <br />
                {repetidos.slice(0, 3).map(g =>
                  g.fichas.map(f => f.nomePrato).join(' / ')).join(' · ')}
              </div>
              <button
                onClick={() => {
                  const r = separarFichasComIdRepetido();
                  alert(
                    `${r.corrigidas} fichas separadas.\n\n` +
                    'Cada uma tem agora um identificador próprio e deixam de se ' +
                    'sobrepor. Verifique se o conteúdo de cada uma está correto.'
                  );
                  recarregar();
                }}
                style={{ marginTop:12, padding:'11px 18px', borderRadius:10, border:'none',
                  background:'#c0392b', color:'#fff', fontSize:14.5, fontWeight:700,
                  cursor:'pointer', fontFamily:'inherit' }}>
                Separar as fichas
              </button>
            </div>
          );
        })()}

        {/* Fichas repetidas — a mesma várias vezes na biblioteca. */}
        {(() => {
          const dup = fichasDuplicadas();
          if (!dup.length) return null;
          const total = dup.reduce((s, g) => s + g.fichas.length - 1, 0);
          return (
            <div style={{ background:'var(--copper-pale)', border:'1px solid var(--copper)',
              borderRadius:12, padding:14, marginBottom:12 }}>
              <div style={{ fontSize:14.5, fontWeight:700, color:'var(--copper)' }}>
                {total} ficha{total > 1 ? 's' : ''} repetida{total > 1 ? 's' : ''}
              </div>
              <div style={{ fontSize:13.5, color:'rgba(26,23,20,0.65)', marginTop:4,
                lineHeight:1.55 }}>
                {dup.slice(0, 4).map(g => `${g.nome} (${g.fichas.length}×)`).join(' · ')}
                {dup.length > 4 && ` e mais ${dup.length - 4}`}
                <br />
                Fica a mais completa de cada uma. Os planos que usavam as
                outras passam a apontar para essa.
              </div>
              <button
                onClick={() => {
                  const r = limparFichasDuplicadas();
                  alert(`Apagadas ${r.apagadas} cópias. Ficaram ${r.mantidas} fichas.`);
                  recarregar();
                }}
                style={{ marginTop:11, padding:'10px 16px', borderRadius:10, border:'none',
                  background:'var(--copper)', color:'#fff', fontSize:14, fontWeight:700,
                  cursor:'pointer', fontFamily:'inherit' }}>
                Juntar as repetidas
              </button>
            </div>
          );
        })()}

        {/* Fichas que perderam o conteúdo — e como as recuperar. */}
        {incompletas.length > 0 && (
          <div style={{ background:'var(--copper-pale)', border:'1px solid var(--copper)',
            borderRadius:12, padding:14, marginBottom:12 }}>
            <div style={{ fontSize:14.5, fontWeight:700, color:'var(--copper)' }}>
              {incompletas.length} ficha{incompletas.length > 1 ? 's' : ''} sem conteúdo
            </div>
            <div style={{ fontSize:13, color:'rgba(26,23,20,0.65)', marginTop:4,
              lineHeight:1.55 }}>
              {incompletas.slice(0, 4).map((f: any) => f.nomePrato).join(' · ')}
              {incompletas.length > 4 && ` e mais ${incompletas.length - 4}`}
              <br />
              Ficaram sem ingredientes ou sem preparação por causa de um erro
              na sincronização, já corrigido. Posso tentar ir buscá-las ao
              arquivo da escola.
            </div>
            <button
              onClick={async () => {
                // Procura em todas as fontes: cópia local, cópia do
                // arranque do ano, e o Sheets.
                const r = await recuperarFichasDeTodoOLado();
                if (r.recuperadas > 0) {
                  alert(
                    `Recuperadas ${r.recuperadas} de ${r.tentadas} fichas.\n\n` +
                    `Onde estavam: ${r.origens.join(', ')}\n\n` +
                    r.nomes.join('\n')
                  );
                  recarregar();
                } else {
                  alert(
                    'Não foi possível recuperar nenhuma.\n\n' +
                    'A aplicação procurou na cópia local, na cópia do início do ano e no ' +
                    'arquivo da escola, mas em nenhum deles estava a versão completa.\n\n' +
                    'Se tiver estas fichas noutro aparelho ou noutro navegador ' +
                    'onde ainda apareçam completas, abra-as aí e guarde-as: ' +
                    'assim ficam guardadas de novo e passam a aparecer aqui.'
                  );
                }
              }}
              style={{ marginTop:11, padding:'10px 16px', borderRadius:10, border:'none',
                background:'var(--copper)', color:'#fff', fontSize:14, fontWeight:700,
                cursor:'pointer', fontFamily:'inherit' }}>
              Tentar recuperar
            </button>
          </div>
        )}

        {planoId && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button
              onClick={() => setMostrarBibliotecaCompleta(false)}
              className={`tab-btn${!mostrarBibliotecaCompleta ? ' active' : ''}`}
              style={{ flex: 1 }}>
              📋 Deste plano ({fichasDoPlano.length})
            </button>
            <button
              onClick={() => setMostrarBibliotecaCompleta(true)}
              className={`tab-btn${mostrarBibliotecaCompleta ? ' active' : ''}`}
              style={{ flex: 1 }}>
              🗂️ + Adicionar ficha existente
            </button>
          </div>
        )}

        {fichasParaMostrar.length === 0 && (
          <Card>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📄</div>
              <div className="display" style={{ fontSize: 18, marginBottom: 6 }}>
                {!planoId ? 'Ainda não há fichas técnicas' : mostrarBibliotecaCompleta ? 'Ainda não há fichas em nenhum plano' : 'Ainda não há fichas neste plano'}
              </div>
              <p className="muted">Uma aula pode ter 1 ou mais fichas de produção.</p>
              <Button onClick={novaFicha}>Criar primeira ficha →</Button>
            </div>
          </Card>
        )}

        {fichasParaMostrar.length > 0 && (
          <div style={{ fontSize:13, color:'rgba(26,23,20,0.5)', marginBottom:10 }}>
            {fichasParaMostrar.length} ficha{fichasParaMostrar.length!==1?'s':''}
            {/* Nos Orçamentos não há plano: são as fichas todas (Rosa, out/2026). */}
            {!planoId ? '' : mostrarBibliotecaCompleta ? ' em toda a aplicação: clique numa ficha para a associar a este plano' : fichasParaMostrar.length !== 1 ? ' associadas a este plano' : ' associada a este plano'}.
          </div>
        )}

        {fichasParaMostrar.map(f => (
          <div key={f.id} className="option-card" onClick={() => {
            if (modoSelecao) {
              setFichasSelecionadasIds(prev => {
                const novo = new Set(prev);
                if (novo.has(f.id)) novo.delete(f.id); else novo.add(f.id);
                return novo;
              });
              return;
            }
            if (mostrarBibliotecaCompleta && planoId) {
              // Associar a ficha existente a este plano, sem duplicar
              const planos = getPlanosAula();
              const plano = planos.find(p => p.id === planoId);
              if (plano && !(plano.fichasIds || []).includes(f.id)) {
                addOrUpdatePlanoAula({ ...plano, fichasIds: [...plano.fichasIds, f.id], atualizadoEm: new Date().toISOString() });
                recarregar();
                onAlteracao?.();
                onGuardado?.(); // avisa o componente pai (VistaDePlano) para recarregar o plano actualizado
              }
              setMostrarBibliotecaCompleta(false);
              setVista('biblioteca');
              return;
            }
            setFicha(fichaParaOEditor(f, nomeProfessor));
            // Avisar quando a ficha chega incompleta. Acontece nas que
            // foram sincronizadas antes de o bug da leitura ser corrigido.
            if (!f.ingredientes?.length || !f.preparacao?.length) {
              alert(
                `A ficha "${f.nomePrato}" veio sem ` +
                (!f.ingredientes?.length && !f.preparacao?.length ? 'ingredientes nem preparação'
                 : !f.ingredientes?.length ? 'ingredientes' : 'preparação') +
                '.\n\nIsto acontece em fichas guardadas antes de uma correção recente. ' +
                'Se tiver a ficha noutro aparelho onde ainda esteja completa, ' +
                'abra-a primeiro nesse aparelho para voltar a sincronizar.'
              );
            }
            setVista('editar');
            setPasso('ficha');
            setFichaEmEdicaoId(f.id);
            // Associar ao plano — mexendo SÓ no plano, nunca na ficha.
            //
            // Antes isto gravava também a ficha, e a gravação envia-a para
            // o Sheets. Bastava abrir uma ficha para a versão que estava na
            // aplicação ir por cima da do Sheets — e se a da aplicação
            // estivesse vazia, destruía a boa.
            //
            // Para ligar uma ficha a um plano basta o plano guardar o id
            // dela. A ficha não precisa de ser tocada.
            if (planoId) {
              const planos = getPlanosAula();
              const plano = planos.find(p => p.id === planoId);
              if (plano && !(plano.fichasIds || []).includes(f.id)) {
                addOrUpdatePlanoAula({ ...plano, fichasIds: [...plano.fichasIds, f.id], atualizadoEm: new Date().toISOString() });
              }
            }
            setVista('editar');
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {modoSelecao && (
                <div style={{ width: 20, height: 20, borderRadius: 5, border: '2px solid var(--copper)', background: fichasSelecionadasIds.has(f.id) ? 'var(--copper)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, color: 'white' }}>
                  {fichasSelecionadasIds.has(f.id) && '✓'}
                </div>
              )}
              {mostrarBibliotecaCompleta && <span style={{ fontSize: 18, color: 'var(--sage)' }}>+</span>}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, display:'flex',
                  alignItems:'center', gap:7, flexWrap:'wrap' }}>
                  {f.nomePrato}
                  {/* Marcar as que estão vazias, para o professor saber antes
                      de abrir e não pensar que a ficha está perdida. */}
                  {(!f.ingredientes?.length || !f.preparacao?.length) && (
                    <span style={{ fontSize:12.5, fontWeight:700, padding:'2px 8px',
                      borderRadius:20, background:'var(--copper-pale)',
                      color:'var(--copper)', border:'1px solid var(--copper)' }}>
                      {!f.ingredientes?.length && !f.preparacao?.length
                        ? 'sem conteúdo'
                        : !f.ingredientes?.length ? 'sem ingredientes' : 'sem preparação'}
                    </span>
                  )}
                </div>
                <div className="muted">
                  {[f.classificacao, `${f.ingredientes?.length || 0} ingrediente${(f.ingredientes?.length || 0) === 1 ? '' : 's'}`, f.numPorcoes ? `${f.numPorcoes} porções` : ''].filter(Boolean).join(' · ')}
                </div>
                {(f.ucsAssociadas || []).length > 0 && <div style={{ fontSize:13, color:'var(--copper)' }}>{(f.ucsAssociadas || [])[0]}</div>}
                <EtiquetaLigacaoPlano planoAulaId={f.planoAulaId} fichaId={f.id} />
              </div>
              <span className="stamp">Ver / Editar</span>

            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── CRIAR / EDITAR ────────────────────────────────────────
  if (passo === 'link') {
    // Verificar se há draft guardado
    let fichaDraft = ficha;
    try {
      const d = localStorage.getItem('ecl_ficha_draft');
      if (d) fichaDraft = normalizarFicha(JSON.parse(d));
    } catch { fichaDraft = ficha; }

    return (
      <PassoLink ucId={ucId} ucNome={ucNome} nomePratoInicial={nomePratoInicial} onContinuar={(texto, link) => {
        setTextoReceita(texto);
        setLinkReceita(link);
        // Sempre tentar extrair — o extrairFicha agora lida com todos os formatos
        const fichaExtraida = normalizarFicha(extrairFicha(texto));
        // Se a extracção encontrou pelo menos o nome, usar
        if (fichaExtraida.nomePrato) {
          setFicha(fichaExtraida);
        } else if (fichaDraft.nomePrato) {
          // Fallback: draft existente
          setFicha(fichaDraft);
        } else {
          setFicha(fichaExtraida);
        }
        setPasso('ficha');
      }} onAlteracao={onAlteracao} />
    );
  }

  return (
    <div>
      {vista === 'criar' && (
        <button className="btn btn-ghost" style={{ marginBottom: 12 }} onClick={() => { try { localStorage.setItem('ecl_ficha_draft', JSON.stringify(ficha)); } catch {} setVista('biblioteca'); }}>← Biblioteca</button>
      )}
      {vista === 'editar' && (
        <button className="btn btn-ghost" style={{ marginBottom: 12 }} onClick={() => setVista('biblioteca')}>← Biblioteca</button>
      )}
      <PassoFichaTecnica
        ficha={ficha}
        textoReceita={textoReceita}
        ucId={ucId}
        ucNome={ucNome}
        onContinuar={(fichaConfirmada) => {
          setFicha(fichaConfirmada);
          guardarFicha(fichaConfirmada);
        }}
        onVoltar={() => {
          // Guardar draft e voltar ao PassoLink — não à biblioteca
          try { localStorage.setItem('ecl_ficha_draft', JSON.stringify(ficha)); } catch {}
          setPasso('link');
        }}
      />
    </div>
  );
}

export default ProfessorView;

// ── As técnicas e os aparelhos da ficha, com as frases deste prato ──
// Cada técnica: o que o aluno fez («Escalfar o bacalhau no leite») e o
// «bem feito» deste prato. Cada aparelho: como fica acabado. As técnicas
// feitas dentro de um aparelho aparecem debaixo dele (Rosa, set/2026).
function CriteriosDaFicha({ tecnicas, aparelhos, onMudar }: {
  tecnicas: string[]; aparelhos: string[]; onMudar: (tecnicas: string[], aparelhos: string[]) => void;
}) {
  const linhaTec = (l: LinhaDaFicha) =>
    [`${l.id}${l.nome ? ' — ' + l.nome : ''}`, l.aparelhoId || '-', l.onde || '-',
      `FAZES: ${l.fazes || ''}`, `COMO: ${l.como || ''}`, `BEM FEITO: ${l.bemFeito || ''}`].join(' | ');
  const linhaApp = (l: LinhaDaFicha) => [`${l.id}${l.nome ? ' — ' + l.nome : ''}`, `COMO: ${l.como || ''}`, `RESULTADO: ${l.resultado || ''}`].join(' | ');
  const tecs = tecnicas.map(lerLinhaDaFicha);
  const apps = aparelhos.map(lerLinhaDaFicha).filter(a => a.id.startsWith('APP-') && !APARELHOS_QUE_SAO_TECNICAS.has(a.id));
  const mudarTec = (i: number, patch: Partial<LinhaDaFicha>) =>
    onMudar(tecs.map((t, k) => k === i ? linhaTec({ ...t, ...patch }) : tecnicas[k]), aparelhos);
  const mudarApp = (id: string, patch: Partial<LinhaDaFicha>) =>
    onMudar(tecnicas, aparelhos.map(l => { const a = lerLinhaDaFicha(l); return a.id === id ? linhaApp({ ...a, ...patch }) : l; }));
  const campo: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '7px 9px', borderRadius: 8,
    border: '1px solid rgba(26,23,20,0.15)', fontSize: 13.5, fontFamily: 'inherit', marginTop: 3 };
  const Tec = ({ t, i }: { t: LinhaDaFicha; i: number }) => (
    <div style={{ background: '#fff', borderRadius: 10, padding: '10px 12px', marginBottom: 6, border: '1px solid rgba(181,101,29,0.2)' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
        <span style={{ flex: 1, fontSize: 12.5, color: 'rgba(26,23,20,0.55)' }}>Técnica · {t.nome || t.id}{t.onde ? ` · ${t.onde}` : ''}</span>
        <button type="button" onClick={() => onMudar(tecnicas.filter((_, k) => k !== i), aparelhos)}
          style={{ border: 'none', background: 'none', color: '#c0392b', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Tirar</button>
      </div>
      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginTop: 4 }}>O que o aluno faz
        <input style={campo} defaultValue={t.fazes || ''} placeholder="Ex.: Escalfar o bacalhau no leite"
          onBlur={e => e.target.value !== (t.fazes || '') && mudarTec(i, { fazes: e.target.value.trim() })} /></label>
      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginTop: 6 }}>Como se faz (curto, com o utensílio)
        <input style={campo} defaultValue={t.como || ''} placeholder="Ex.: mexes com as varas (fouet) em lume brando, sem ganhar cor"
          onBlur={e => e.target.value !== (t.como || '') && mudarTec(i, { como: e.target.value.trim() })} /></label>
      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginTop: 6 }}>Bem feito é (neste prato)
        <input style={campo} defaultValue={t.bemFeito || ''} placeholder="Ex.: lascas húmidas, sem pele nem espinhas"
          onBlur={e => e.target.value !== (t.bemFeito || '') && mudarTec(i, { bemFeito: e.target.value.trim() })} /></label>
    </div>
  );
  const idsApp = new Set(apps.map(a => a.id));
  return (
    <div style={{ background: 'var(--copper-pale)', border: '1px solid rgba(181,101,29,0.2)', borderRadius: 12, padding: 16, marginBottom: 10 }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--copper)', marginBottom: 4 }}>🎯 O que o aluno vai avaliar</div>
      <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.6)', marginBottom: 10 }}>
        O aluno avalia-se por estas frases, e tu validas pelas mesmas. Corrige o que não estiver certo para este prato.
      </div>
      {apps.map(a => (
        <div key={a.id} style={{ borderLeft: '3px solid var(--copper)', paddingLeft: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 14.5, fontWeight: 800 }}>Aparelho · {a.nome || a.id}</div>
          {tecs.map((t, i) => t.aparelhoId === a.id ? <Tec key={i} t={t} i={i} /> : null)}
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700 }}>Como se faz o aparelho
            <input style={campo} defaultValue={a.como || ''} placeholder="Ex.: juntas o leite quente aos poucos, a bater com as varas (fouet)"
              onBlur={e => e.target.value !== (a.como || '') && mudarApp(a.id, { como: e.target.value.trim() })} /></label>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginTop: 6 }}>Como fica acabado
            <input style={campo} defaultValue={a.resultado || ''} placeholder="Ex.: liso, sem grumos, cobre as costas da colher"
              onBlur={e => e.target.value !== (a.resultado || '') && mudarApp(a.id, { resultado: e.target.value.trim() })} /></label>
        </div>
      ))}
      {tecs.some(t => !t.aparelhoId || !idsApp.has(t.aparelhoId)) && (
        <div style={{ fontSize: 14.5, fontWeight: 800, margin: '4px 0 6px' }}>No próprio prato</div>
      )}
      {tecs.map((t, i) => (!t.aparelhoId || !idsApp.has(t.aparelhoId)) ? <Tec key={i} t={t} i={i} /> : null)}
    </div>
  );
}

// ── Fichas sem perguntas ao aluno: pedi-las à IA (só as técnicas) ──
function CriarPerguntasDaFicha({ ficha, onCriadas }: { ficha: FichaTecnica; onCriadas: (l: PerguntaTecnica[]) => void }) {
  const [aCriar, setACriar] = React.useState(false);
  const [manual, setManual] = React.useState('');
  const [colado, setColado] = React.useState('');
  const [aviso, setAviso] = React.useState('');
  const prompt = promptPerguntasDaFicha(ficha.nomePrato, ficha.tecnicasDetectadas || [], (ficha as any).aparelhosDetectados || [],
    (ficha.preparacao || []).map(p => p.descricao).filter(Boolean));
  const usar = (texto: string) => {
    const l = lerPerguntasDaIA(/PERGUNTAS DE AUTOAVALIA/i.test(texto) ? texto : 'PERGUNTAS DE AUTOAVALIAÇÃO:\n' + texto);
    if (!l.length) { setAviso('A resposta não trouxe perguntas no formato pedido. Tente outra vez.'); return false; }
    onCriadas(l); return true;
  };
  return (
    <div style={{ border: '1.5px dashed rgba(107,63,160,0.4)', borderRadius: 12, padding: 12, margin: '12px 0' }}>
      <div style={{ fontWeight: 700, color: '#6B3FA0', marginBottom: 4 }}>Perguntas ao aluno</div>
      <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.6)', marginBottom: 8 }}>
        Esta ficha ainda não tem perguntas de autoavaliação para as técnicas. A IA pode escrevê-las, para o professor aprovar.
      </div>
      <button type="button" className="btn btn-primary" disabled={aCriar}
        onClick={async () => {
          setACriar(true); setAviso('');
          const r = await pedirAIA(prompt, 12000);
          setACriar(false);
          if (r.ok) { usar(r.texto); return; }
          setManual(prompt); setAviso(`${r.mensagem} Pode enviar o pedido a uma IA e colar a resposta abaixo.`);
        }}>{aCriar ? '⏳ A IA está a escrever as perguntas…' : '✨ Criar as perguntas com a IA'}</button>
      {aviso && <div style={{ marginTop: 8, fontSize: 13, color: '#8a5a12' }}>{aviso}</div>}
      {manual && (
        <div style={{ marginTop: 8 }}>
          <SeletorIA prompt={manual} />
          <textarea className="input" value={colado} onChange={e => setColado(e.target.value)} placeholder="Cole aqui a resposta da IA" style={{ minHeight: 90, fontSize: 13 }} />
          <button type="button" className="btn btn-primary" style={{ marginTop: 6 }} disabled={!colado.trim()} onClick={() => { if (usar(colado)) { setManual(''); setColado(''); } }}>Usar esta resposta</button>
        </div>
      )}
    </div>
  );
}

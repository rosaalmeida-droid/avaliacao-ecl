import React, { useState, useMemo, useRef } from 'react';
import { fmtData } from '../datas';
import {
  EntradaManual, CategoriaManual, NivelManual,
  CATEGORIAS_MANUAL, ICONES_CATEGORIA, CORES_NIVEL,
} from '../types';
import {
  getEntradasManual, addEntradaManual, deleteEntradaManual, pesquisarManual,
} from '../backend';
import { exportarGuiaoDocx } from './exportGuiao';
import { CRONOGRAMA_2026_2027, ANO_LETIVO, ModuloCronograma, EQUIVALENCIAS_UFCD_UC } from '../cronograma';
import { getReferencialUC } from '../referencial811RA144';
import { construirMasterPrompt, PromptContext } from '../masterPrompt';
import { abrirIA } from '../abrirIA';
import { getFichasProducao } from '../backend';

const COR_PRIMARIA  = '#1a1714';
const COR_DOURADO   = '#b5651d';
const COR_DOURADO_P = '#fdf0e6';
const COR_IA        = '#6d28d9';
const COR_IA_P      = '#ede9fe';

function gerarId(): string {
  return `manual_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ── Prompt do guião de módulo (formato M16) ────────────────────
// ── Prompts do manual de 50 páginas (5 partes) ───────────────
// Norma ECL: mínimo 50 páginas, 2-3 fichas de trabalho, 5-10 receitas,
// desenvolvimento de projeto, glossário, questionário, fontes reais, índice.

function buildCabecalho(modulo: ModuloCronograma, anoLetivo: string): string {
  const turmaLabel  = modulo.turmaAno === 1 ? '1. Ano' : modulo.turmaAno === 2 ? '2. Ano' : '3. Ano';
  const anosLetivos = modulo.turmaAno === 1 ? '2026-2029' : modulo.turmaAno === 2 ? '2025-2028' : '2024-2027';
  const ref         = modulo.tipo === 'UC' ? '811RA144' : '811183';
  const tipoLabel   = modulo.tipo === 'UC' ? 'UC' : 'UFCD';
  return [
    'ESCOLA DE COMERCIO DE LISBOA',
    'Curso Profissional de Tecnico de Cozinha-Pastelaria',
    turmaLabel + ' | ' + anosLetivos,
    'Referencial ' + ref,
    modulo.disciplina,
    tipoLabel + ' ' + modulo.id.replace('UFCD ', '') + ' - ' + modulo.nome,
    'Carga Horaria: ' + String(modulo.horasPrevistas) + ' horas',
    'Ano Lectivo ' + anoLetivo,
  ].join('\n');
}

function buildContextoManual(modulo: ModuloCronograma, anoLetivo: string): string {
  const ref = modulo.tipo === 'UC' ? '811RA144' : '811183';
  return [
    'Vais construir um MANUAL DO ALUNO completo para a ' + modulo.nome + '.',
    'Curso: Tecnico de Cozinha-Pastelaria | Referencial ' + ref + ' | Escola de Comercio de Lisboa.',
    'Ano letivo: ' + anoLetivo + ' | ' + modulo.disciplina + '.',
    '',
    'NORMA OBRIGATORIA DO MANUAL (cumprir rigorosamente):',
    '- Minimo 50 paginas',
    '- 2 a 3 fichas de trabalho completas (com tabelas para preenchimento)',
    '- 5 a 10 fichas tecnicas de receita (com ingredientes, quantidades para 4 doses, preparacao passo a passo)',
    '- 1 desenvolvimento de projeto (com etapas, criterios de avaliacao, exemplo resolvido)',
    '- Glossario com 12 a 15 termos tecnicos',
    '- Questionario de revisao global (15 questoes por grupos tematicos)',
    '- Bibliografia com fontes REAIS (ANQEP, AHRESP/DGS, Gomes et al. 2015, Maincent-Morel, McGee, Le Cordon Bleu)',
    '- Esquemas/diagramas tecnicos ORIGINAIS (sem fotografias de terceiros)',
    '- Capa + Indice com paginas reais + cabecalho e rodape com numero de pagina',
    '- Limites HACCP reais: refrigeracao 0-4 C, congelacao -18 C, confecao 65 C, regra 2h',
    '',
    'ESTILO:',
    '- Portugues europeu, grafia pre-Acordo (Objectivos, actual, confeccao)',
    '- Texto justificado, tom tecnico-pedagogico',
    '- Caixas de destaque: DICA DO CHEF, CIENCIA NA COZINHA, HACCP, ERROS FREQUENTES, SABIAS QUE, NOTA',
    '- Tabelas com cabecalho colorido e linhas alternadas',
    '- Fontes reais sempre que relevante',
  ].join('\n');
}

function buildPromptGuiao(modulo: ModuloCronograma, anoLetivo: string, parte: number = 1): string {
  const cabecalho  = buildCabecalho(modulo, anoLetivo);
  const contexto   = buildContextoManual(modulo, anoLetivo);

  const partes: Record<number, string[]> = {
    1: [
      contexto,
      '',
      'PARTE 1 DE 5 - Gera APENAS esta parte e para:',
      '- Capa (com dados do cabecalho abaixo)',
      '- Enquadramento no Referencial (tabela: codigo, designacao, componente, ano, nivel, pre-requisitos)',
      '- Objectivos de aprendizagem (8 objectivos em lista)',
      '- Indice provisorio (deixa os numeros de pagina como "..." - serao preenchidos no fim)',
      '- Capitulo 1: Introducao (importancia da UC, valor nutricional/tecnico, historia, enquadramento)',
      '- Capitulo 2: Tecnologia da materia-prima (classificacao, criterios de qualidade/frescura)',
      '- Capitulo 3: Aprovisionamento, conservacao e HACCP (cadeia de frio, riscos, higiene, alergenos)',
      '- Capitulo 4: Pre-preparacao (operacoes, rendimento, aproveitamento, equipamento)',
      '',
      'CABECALHO DO DOCUMENTO:',
      cabecalho,
      '',
      'Escreve "===FIM PARTE 1===" na ultima linha.',
    ],
    2: [
      contexto,
      '',
      'PARTE 2 DE 5 - Continua o manual. Gera APENAS:',
      '- Capitulo 5: Metodos de confeccao (calor humido/seco, pontos de cozedura, temperaturas)',
      '- Capitulo 6: Molhos e guarniciones (molhos-base passo a passo, marinadas, derivados)',
      '- Capitulo 7: Empratamento e analise sensorial (principios, grelha sensorial, harmonizacao)',
      '- Capitulo 8: Sustentabilidade (escolha responsavel, sazonalidade, aproveitamento integral)',
      '- Capitulos 9 a 11: Especializacao da UC (perfis, tradicao, cozinha regional, tabela referencia rapida)',
      '',
      'Mantem o mesmo estilo e formato da Parte 1.',
      'Escreve "===FIM PARTE 2===" na ultima linha.',
    ],
    3: [
      contexto,
      '',
      'PARTE 3 DE 5 - Continua o manual. Gera APENAS:',
      '- Capitulo 12: Fichas de Trabalho (3 fichas completas com tabelas para preenchimento)',
      '  Ficha 1: avaliacao/analise de materia-prima ou tecnica',
      '  Ficha 2: calculo de rendimento e custo',
      '  Ficha 3: comparacao de metodos ou analise sensorial',
      '- Capitulo 13: Desenvolvimento de Projeto',
      '  Tema ligado a UC, etapas detalhadas, criterios de avaliacao com percentagens, exemplo resolvido',
      '',
      'Mantem o mesmo estilo e formato.',
      'Escreve "===FIM PARTE 3===" na ultima linha.',
    ],
    4: [
      contexto,
      '',
      'PARTE 4 DE 5 - Continua o manual. Gera APENAS:',
      '- Capitulo 14: Fichas Tecnicas de Receita (minimo 8 receitas, maximo 14)',
      '  Cada ficha: nome, doses (4), tempo, metodo, lista de ingredientes com quantidades,',
      '  preparacao passo a passo numerado, nota tecnica do chef',
      '  As receitas devem cobrir diferentes metodos de confeccao da UC',
      '',
      'Mantem o mesmo estilo e formato.',
      'Escreve "===FIM PARTE 4===" na ultima linha.',
    ],
    5: [
      contexto,
      '',
      'PARTE 5 DE 5 - Ultima parte. Gera:',
      '- Capitulo 15: Questionario de Revisao Global',
      '  4 grupos tematicos, total de 14 a 16 questoes, linhas de resposta',
      '- Glossario (12 a 15 termos com definicao clara)',
      '- Bibliografia e Fontes (reais: ANQEP, AHRESP/DGS, Gomes et al. 2015, Maincent-Morel, McGee, Le Cordon Bleu, Turismo de Portugal)',
      '- Sintese Final (7 a 10 pontos-chave da UC)',
      '- Anexo A: Modelo de ficha tecnica em branco',
      '- Anexo B: Folha-resumo de temperaturas e regras HACCP (destacavel)',
      '',
      'No fim de tudo, escreve uma linha com o INDICE FINAL actualizado com os numeros de pagina reais.',
      'Escreve "===FIM MANUAL===" na ultima linha.',
    ],
  };

  const linhas = partes[parte] || partes[1];
  return linhas.join('\n');
}

// Geração via Apps Script — manual completo em 5 partes
const GS_URL = 'https://script.google.com/macros/s/AKfycbzBxobzVzxVfoAKC7wiqmKRiKru8z_FM1g7O6sTvRUE9q2QpD3DsTRfkrAFnouA41a1LA/exec';

// ── Chamada via Apps Script (proxy seguro — evita CORS) ──────
async function chamarManualViaGS(prompts: string[]): Promise<string> {
  const resp = await fetch(GS_URL, {
    method: 'POST',
    body: JSON.stringify({ acao: 'gerarManualCompleto', prompts }),
  });
  if (!resp.ok) throw new Error('Erro no servidor: ' + resp.status);
  const data = await resp.json();
  if (!data.ok) throw new Error(data.erro || 'Erro desconhecido');
  return data.texto || '';
}


// ── Construir os 5 prompts do manual ─────────────────────────
// Missões de cada parte do manual (compactas — dentro do limite do Groq)
// Conhecimento específico por tema — injectado nos prompts
function blocoConhecimento(moduloNome: string): string {
  const n = moduloNome.toLowerCase();

  if (n.includes('cozinha tradicional portuguesa') || n.includes('iguarias da cozinha')) {
    return [
      'CONHECIMENTO TECNICO ESPECIFICO — COZINHA TRADICIONAL PORTUGUESA:',
      '',
      'HISTORIA E CONTEXTO CULTURAL (obrigatorio desenvolver em profundidade):',
      '- Influencias arabes (sec VIII-XV): amendoa, arroz, acucar, canela, acafrao, citrinos — quais pratos actuais derivam desta heranca',
      '- Descobrimentos (sec XV-XVI): tomate, batata, milho, feijao, malagueta, piri-piri, especiarias orientais — como transformaram a cozinha portuguesa e europeia',
      '- Docaria conventual: clarificacao do vinho com claras deixava sobra de gemas — conventos criaram pastelaria de gema; lista de doces e o convento de origem de cada um (Pasteis de Belem - Jeronimos, Toucinho-do-ceu - Amarante, Barriga de Freira - Braga)',
      '- O bacalhau: pescarias no Grand Banks desde sec XVI, processo de salga e secagem, 7kg per capita/ano em Portugal, mais de 365 receitas documentadas',
      '- Maria de Lourdes Modesto (1982): Cozinha Tradicional Portuguesa — a primeira codificacao cientifica do receituario',
      '',
      'REGIOES GASTRONOMICAS (desenvolver CADA regiao exaustivamente com min. 1 pagina):',
      '',
      'MINHO E DOURO LITORAL:',
      '- Produtos identitarios: milho (broa, papas, caldo verde), feijao verde, fumeiros (alheira de Mirandela DOP - base de vitela/porco/gordura, chourico, morcela, salpicao)',
      '- Pratos: caldo verde (historia — prato nacional informal, couve galega cortada em juliana fina max 2mm, chourico de rodelas finas, azeite cru no final), rojoes a minhota (pedacos de porco fritos na propria gordura, com cumin e louro), bacalhau com broa (crosta de broa ralada + azeite + alho, forno 180C), papas de sarrabulho (sangue de porco, carnes diversas)',
      '- Vinho verde IGP, azeite DOP Tras-os-Montes',
      '',
      'TRAS-OS-MONTES E ALTO DOURO:',
      '- Produtos: posta mirandesa (raca Mirandesa DOP — grelhar a alta temperatura, nunca bem passada), presunto de Barroso IGP, alheira de Mirandela DOP, amendoa, castanha',
      '- Pratos: posta mirandesa (especificidade — marmoreado unico da raca, grelhar a 250C, servir a 60C interior), sopa transmontana, trutas do Douro, caca (perdiz, lebre, javali)',
      '',
      'BEIRAS:',
      '- Produtos: leitao da Bairrada (raca bisaro, peso ideal 5-7kg), chanfana (cabra velha ou borrego em barro negro), queijo da Serra da Estrela DOP (unico queijo de pasta mole untuosa feito com cardo — Cynara cardunculus)',
      '- Tecnica leitao: salmoura com alho+sal+pimenta+banha, forno de lenha 200-220C, pele estaladiça obtida por escaldao inicial, 3h de cozedura',
      '- Tecnica chanfana: cabra velha marinada em vinho tinto 24h, barro negro pre-aquecido, cozedura lenta 160C por 4-6h',
      '',
      'LISBOA E ESTREMADURA:',
      '- Pratos: bacalhau a Bras (origem nas tabernas do sec XIX — bacalhau desfiado, batata palha, ovos mexidos, azeitonas, salsa), iscas com elas (figado de vitela marinado em vinho branco/alho/louro 24h, frigideira quente), cozido a portuguesa (carnes: vitela/frango/chourico/morcela/farinheira; legumes: cenoura/nabo/couve/feijao; acompanha arroz e caldo)',
      '- Pasteis de Belem: criados em 1837 pelos Jeronimos, receita secreta, crosta folhada + creme de gema + canela',
      '',
      'ALENTEJO:',
      '- Produtos: porco alentejano (raca iberica, montado de azinha e sobreiro, bolota), azeite DOP Alentejo, queijo de Evora DOP, coentros (erva dominante)',
      '- Pratos: acorda alentejana (pao de vespera + alho picado + coentros frescos + azeite + ovo pochado — origem na pobreza pastoril, temperatura critica: agua a 90C para o ovo), migas alentejanas (pao de vespera encharcado em caldo de carne, absorver sem desfazer), ensopado de borrego com pao, sopa de cacao com coentros',
      '- Tecnica acorda: o segredo esta no pao — deve ser de miolo denso, de vespera, molhado com agua quente mas nao fervente para nao cozer o ovo',
      '',
      'ALGARVE:',
      '- Produtos: amendoa (DOP Algarve), figo seco, percebes, lagosta, atum (Sagres, historia das conservas)',
      '- Pratos: cataplana (utensilio de cobre estanhado em forma de amejoa, cozedura a vapor pressurizado — amejoas com presunto: tecnica de abrir as amejoas por calor, nunca antes), caldeirada algarvia (camadas sem mexer), xerem (canjica de milho com conquilhas — origem na cultura de milho algarvia)',
      '- Docaria: morgado de figo e amendoa, Dom Rodrigo (gema + fio de ovos enrolados em papel colorido)',
      '',
      'ACORES E MADEIRA:',
      '- Acores: cozido das Furnas (unico no mundo — panela enterrada junto a fumarolas vulcanicas da Ilha de Sao Miguel, cozedura 6-8h pela caldeira natural a 100C), alcatra terceirense (boi em vinho da Terceira + especiarias + barro', '  poroso), ananas dos Acores DOP (estufa de vidro, 18 meses de crescimento), queijo de Sao Jorge DOP',
      '- Madeira: peixe-espada preto (capturado a mais de 1000m de profundidade — unico peixe com 2 dentes exteriores, sem escamas, textura suave; servido com banana pelo contraste acido/doce), espetada madeirense (carne de vaca no pau de louro verde — o louro aromatiza de dentro para fora), bolo do caco (batata-doce na massa, grelhado em lousa)',
      '',
      'APTIDOES E ATITUDES A DESENVOLVER (segundo o referencial):',
      '- Elaborar fichas tecnicas completas com capitacoes reais (pesos brutos e liquidos, custo por dose, rendimento)',
      '- Preparar mise en place organizada: verificacao de materias-primas, preparacoes previas, organizacao do posto',
      '- Executar confeccoes com rigor tecnico: temperaturas, tempos, texturas, apresentacao',
      '- Empratar com criterios esteticos: proporcao, ponto focal, contraste de cores e texturas, temperatura de servico',
      '- Cumprir HACCP em cada etapa: recepcao 0-4C, armazenagem FEFO, confeccao min 65C, regra 2h, rastreabilidade',
      '- Reducao do desperdicio: aproveitamento de aparas, caldos de cascas, zero desperdicio na brigada',
      '- Trabalho em brigada: comunicacao, divisao de tarefas, respeito pela hierarquia (chef/sous-chef/commis)',
    ].join('\n');
  }

  if (n.includes('peixes') || n.includes('mariscos')) {
    return [
      'CONHECIMENTO TECNICO ESPECIFICO — PEIXES E MARISCOS:',
      '- Classificacao: osseos redondos (robalo, dourada, sardinha, atum), osseos achatados (linguado, pregado, solha), cartilaginosos (cao, raia)',
      '- Cefalopodes: polvo (bater ou congelar para amaciar), lula (remover pena), choco',
      '- Crustaceos: camarao, lagostim, lagosta, sapateira — como extrair a carne, cozedura em agua a ferver',
      '- Bivalves: ameijoa, mexilhao, ostra, vieira — purgar 2h em agua salgada 30g/L, nunca comer fechados apos cozedura',
      '- Frescura: olhos salientes e transparentes, guelras vermelho-vivas, carne firme e elastica, cheiro a mar',
      '- Anisakis: -20C/24h ou confeccao a mais de 60C no interior',
      '- Tamanhos minimos: robalo 36cm, dourada 20cm, sardinha 11cm, linguado 24cm',
      '- Tecnicas de preparacao: esviscerar, escalar, filetar redondo (2 filetes), filetar achatado (4 filetes)',
      '- Rendimentos: sardinha 55%, robalo 45%, linguado 35%, polvo 70% apos cozedura',
    ].join('\n');
  }

  if (n.includes('carnes') || n.includes('aves') || n.includes('caca')) {
    return [
      'CONHECIMENTO TECNICO ESPECIFICO — CARNES, AVES E CACA:',
      '- Bovino: cortes por zona anatomica (cachaço, entrecosto, lombo, vazia, alcatra, chambao), nivel de colagenio por corte',
      '- Suino: lombinho, costeleta, pernil, barriga, cachaço — temperatura interna min 72C (Trichinella)',
      '- Aves: frango (carne branca/escura), pato, peru, codorniz — min 82C interior (Salmonella, Campylobacter)',
      '- Caca: marinadas com zimbro e vinho tinto, maridagem minima 24-48h para amaciar fibras',
      '- Classificacao DOP: Bisaro, Barrosao, Alentejano (porco iberico)',
      '- Maturacao: a seco (14-28 dias, 2-4C, 75% humidade), humida (vacio 7-14 dias)',
    ].join('\n');
  }

  if (n.includes('pastelaria') || n.includes('docaria') || n.includes('cremes') || n.includes('massas')) {
    return [
      'CONHECIMENTO TECNICO ESPECIFICO — PASTELARIA E DOCARIA:',
      '- Farinha: T55 (todo-o-uso), T65 (paes rusticos), T80 (integral) — gluten e sua formacao por hidratacao + trabalho mecanico',
      '- Ovos: funcoes (emulsionante-gema, espumante-clara, coagulante-calor, colorante-carotenoides)',
      '- Acucar: pontos de calda (veia 103C, bola mole 115C, bola dura 120C, caramelo 165-180C)',
      '- Massas base: folhada (27 camadas, manteiga a 18C, laminagem 6 voltas), quebrada (metodo areia), choux (vapor de agua faz expandir), levedada (brioche, croissant)',
      '- Creme pasteleiro: 85C para gelatinizar amido sem coalhar ovo, arrefecer rapidamente a menos de 10C',
      '- Docaria conventual: toucinho-do-ceu, pasteis de Belem, barriga de freira, Dom Rodrigo, morgado de figos',
    ].join('\n');
  }

  return 'Desenvolve o tema desta UC com profundidade tecnica e cientifica, incluindo historia, tecnicas, materias-primas, HACCP e exemplos praticos reais.';
}

function construirMissoesPartes(modulo: ModuloCronograma): string[] {
  const conhecimento = blocoConhecimento(modulo.nome);
  const nome = modulo.id + ' — ' + modulo.nome;

  return [
    // PARTE 1
    'Escreve DIRECTAMENTE o inicio do manual ' + nome + '. Primeira palavra e o inicio do texto real.'
    + '\n\n' + conhecimento + '\n\n'
    + 'CONTEUDO DESTA PARTE (escrever tudo, sem omitir):\n'
    + '1. Nota de apresentacao do manual (2 paragrafos: o que e, para que serve, como usar)\n'
    + '2. Enquadramento no referencial: tabela de 4 colunas (Campo / Descricao / Referencia / Observacoes) com todos os dados da UC\n'
    + '3. 8 objectivos de aprendizagem detalhados — cada um com 1 paragrafo explicativo do que o aluno vai saber fazer\n'
    + '4. Indice geral do manual\n'
    + '5. CAPITULO 1 COMPLETO: Historia e contexto cultural desta UC — desenvolver exaustivamente tudo o que esta descrito no bloco de CONHECIMENTO TECNICO acima para a historia e contexto. Minimo 6 paginas.\n'
    + '6. CAPITULO 2 COMPLETO: Tecnologia das materias-primas desta UC — classificacao, criterios de qualidade, frescura, tabelas de avaliacao. Minimo 6 paginas.\n'
    + 'Em cada capitulo: minimo 2 tabelas de 4 colunas, caixas [DICA DO CHEF] [HACCP] [CIENCIA NA COZINHA] [SABIA QUE], 2 exercicios praticos.',

    // PARTE 2
    'Continua o manual ' + nome + '. Nao repitas o que ja foi escrito. Escreve directamente.'
    + '\n\n' + conhecimento + '\n\n'
    + 'CONTEUDO DESTA PARTE:\n'
    + '1. CAPITULO 3 COMPLETO: Aprovisionamento, recepcao e HACCP\n'
    + '   - Fluxo completo: encomenda->recepcao->armazenagem->preparacao->confeccao->servico\n'
    + '   - Recepcao: temperaturas maximas (refrigerados max 4C, congelados max -15C), documentacao, rastreabilidade (Reg CE 178/2002)\n'
    + '   - Armazenagem: principio FEFO, separacao por categorias, temperaturas por zona\n'
    + '   - HACCP: pontos criticos desta UC, limites criticos reais (refrigeracao 0-4C, congelacao -18C, confeccao 65C, regra 2h, Anisakis -20C/24h)\n'
    + '   - 14 alergenos obrigatorios (Reg UE 1169/2011): lista e gestao de contaminacao cruzada\n'
    + '   - Tabuleiros por cor: azul=pescado, vermelho=carnes, verde=vegetais, branco=prontos a comer, amarelo=aves\n'
    + '   Minimo 6 paginas. Tabelas, caixas [HACCP] [ERROS FREQUENTES].\n'
    + '2. CAPITULO 4 COMPLETO: Pre-preparacao e mise en place\n'
    + '   - Organizacao do posto segundo brigada (chef/sous-chef/commis/estagiario)\n'
    + '   - Operacoes especificas desta UC: lista detalhada com tecnica de cada uma\n'
    + '   - Calculo de rendimento: formula IR=peso liquido/peso bruto x 100; tabela de IR por produto desta UC\n'
    + '   - Calculo de custo por dose: formula completa com exemplo resolvido\n'
    + '   - Equipamentos e utensilios: tabela com nome/funcao/manutencao/HACCP\n'
    + '   Minimo 5 paginas.\n'
    + '3. CAPITULO 5 COMPLETO: Metodos de confeccao\n'
    + '   - Para CADA metodo relevante desta UC: descricao tecnica, ciencia (o que acontece nos proteinas/amido/gorduras), temperatura, tempo, como verificar o ponto, exemplos de pratos portugueses\n'
    + '   - Reaccao de Maillard: o que e, a que temperatura (>140C), como controlar, porque e importante\n'
    + '   - Tabela comparativa de metodos: metodo/temperatura/tempo/resultado/exemplos\n'
    + '   Minimo 8 paginas. Caixas [CIENCIA NA COZINHA] [DICA DO CHEF] em cada metodo.',

    // PARTE 3
    'Continua o manual ' + nome + '. Nao repitas. Escreve directamente.'
    + '\n\n' + conhecimento + '\n\n'
    + 'CONTEUDO DESTA PARTE:\n'
    + '1. CAPITULO 6 COMPLETO: Molhos, fundos e guarnicoes\n'
    + '   - Para cada molho/fundo especifico desta UC: historia, proporcoes exactas para 4 doses, passo a passo numerado, erros comuns e correccoes, variantes e derivados\n'
    + '   - Tabela de molhos: nome/base/proporcoes/aplicacoes/conservacao\n'
    + '   Minimo 5 paginas.\n'
    + '2. CAPITULO 7 COMPLETO: Empratamento e analise sensorial\n'
    + '   - 5 principios: proporcao, ponto focal, contraste de cores e texturas, altura, limpeza\n'
    + '   - Temperaturas de servico por categoria (tabela)\n'
    + '   - Grelha de analise sensorial preenchivel: aspecto/aroma/sabor/textura/temperatura/pontuacao\n'
    + '   - Harmonizacao com vinhos portugueses: 5 exemplos especificos com esta UC\n'
    + '   Minimo 4 paginas.\n'
    + '3. FICHA DE TRABALHO N.1 COMPLETA: Avaliacao e registo de materias-primas\n'
    + '   (tabela com colunas: produto/criterio/valor aceitavel/valor observado/conforme S/N/accao correctiva)\n'
    + '4. FICHA DE TRABALHO N.2 COMPLETA: Calculo de rendimento e custo\n'
    + '   (espaco de calculo, formula IR, tabela para preencher, exercicio guiado com valores em branco)\n'
    + '5. FICHA DE TRABALHO N.3 COMPLETA: Comparacao de metodos e analise sensorial\n'
    + '   (tabela comparativa de 4 metodos x 5 criterios para preenchimento)',

    // PARTE 4
    'Continua o manual ' + nome + '. Nao repitas. Escreve directamente as fichas tecnicas.'
    + '\n\n' + conhecimento + '\n\n'
    + 'CONTEUDO: 10 fichas tecnicas de receita COMPLETAS e ESPECIFICAS desta UC.\n'
    + 'As receitas devem ser emblematicas desta UC, com contexto cultural/regional.\n'
    + 'FORMATO OBRIGATORIO DE CADA FICHA:\n'
    + '| DESIGNACAO | [nome] | CATEGORIA | [categoria] |\n'
    + '| DOSES | 4 | CUSTO APROX. | [valor] |\n'
    + '| TEMPO PREP | [x] min | TEMPO CONFECCAO | [x] min |\n'
    + '| METODO | [metodo] | DIFICULDADE | [nivel] |\n'
    + '| ORIGEM/REGIAO | [regiao] | VARIANTE REGIONAL | [variante] |\n'
    + 'INGREDIENTES: tabela 4 colunas (Ingrediente / Quant.Bruta / Quant.Liquida / Observacoes)\n'
    + 'PREPARACAO: passo a passo numerado com temperaturas e tempos precisos em cada passo\n'
    + 'HACCP: tabela 4 colunas (Etapa / Perigo / Limite Critico / Medida Correctiva)\n'
    + 'NOTA DO CHEF: conselho tecnico, o erro mais comum, como distinguir o resultado certo\n'
    + 'CONTEXTO CULTURAL: de onde vem, historia, porque e importante na gastronomia portuguesa',

    // PARTE 5
    'Continua o manual ' + nome + '. Nao repitas. Escreve directamente.'
    + '\n\nCONTEUDO DESTA PARTE:\n'
    + '1. DESENVOLVIMENTO DE PROJECTO:\n'
    + '   Titulo: projecto ligado a esta UC\n'
    + '   7 etapas com descricao detalhada de cada uma\n'
    + '   Tabela de criterios de avaliacao com ponderacoes em % (total 100%)\n'
    + '   Exemplo resolvido COMPLETO de um projecto (com documentos, calculos, fotos descritas)\n'
    + '2. QUESTIONARIO DE REVISAO GLOBAL:\n'
    + '   4 grupos tematicos (Higiene e HACCP / Tecnicas desta UC / Planificacao / Cultura Gastronomica)\n'
    + '   4 questoes por grupo = 16 questoes total\n'
    + '   Linhas de resposta. Mistura: escolha multipla, verdadeiro/falso, desenvolvimento\n'
    + '3. GLOSSARIO TECNICO: 15 termos especificos desta UC com definicao precisa e aplicacao pratica\n'
    + '4. SINTESE FINAL: 10 pontos-chave desta UC em lista numerada\n'
    + '5. BIBLIOGRAFIA: ANQEP 811183, AHRESP/DGS Codigo Boas Praticas, Reg.CE 852/2004 e 853/2004, Reg.UE 1169/2011, Modesto M.L. (1982), Maincent-Morel, McGee On Food and Cooking, Le Cordon Bleu, Turismo de Portugal\n'
    + '6. ANEXO A: modelo de ficha tecnica em branco para preenchimento em aula\n'
    + '7. ANEXO B: folha-resumo HACCP destacavel (temperaturas, tabuleiros por cor, regra 2h, Anisakis)\n'
    + '8. INDICE FINAL: tabela com todos os capitulos/seccoes e paginas estimadas',
  ];
}

function construirPrompts(modulo: ModuloCronograma, anoLetivo: string): string[] {
  const ref_     = modulo.tipo === 'UC' ? '811RA144' : '811183';
  const turmaNum = modulo.turmaAno || 1;
  const ucIdRef  = modulo.tipo === 'UC' ? modulo.id : (EQUIVALENCIAS_UFCD_UC[modulo.id]?.[0] || null);
  const ref      = ucIdRef ? getReferencialUC(ucIdRef) : null;
  const anoLetivoFixo = '2026-2027';

  // Usar o motor editorial (masterPrompt.ts) — prompt compacto por parte
  const ctx: PromptContext = {
    curso: 'Curso Profissional de Tecnico/a de Cozinha e Restauracao',
    disciplina: modulo.disciplina,
    ufcd: modulo.id + ' — ' + modulo.nome,
    tituloManual: modulo.nome,
    competencias: ref?.realizacoes || [],
    conhecimentos: ref?.conhecimentos || [],
    aptidoes: ref?.criteriosDesempenho || [],
    objetivos: ref?.realizacoes || [],
    totalCapitulos: 5,
    capituloAtual: 1,
    missaoCapitulo: '',
  };

  const missoes = construirMissoesPartes(modulo);
  return missoes.map((missao, i) =>
    construirMasterPrompt({ ...ctx, capituloAtual: i + 1, missaoCapitulo: missao })
  );
}

async function gerarManualCompleto(modulo: ModuloCronograma, anoLetivo: string): Promise<string> {
  const todasFichas = getFichasProducao();
  const ucIdRef = modulo.tipo === 'UC' ? modulo.id : (EQUIVALENCIAS_UFCD_UC[modulo.id]?.[0] || null);
  const fichasUC = todasFichas.filter((f: any) =>
    (f.ucsAssociadas || []).includes(modulo.id) ||
    (ucIdRef ? (f.ucsAssociadas || []).includes(ucIdRef) : false)
  );
  const fichasApp = fichasUC.slice(0, 14).map((f: any) => ({
    nomePrato: f.nomePrato, numPorcoes: f.numPorcoes || '4',
    tempoPrep: f.tempoPrep || '', tempoConf: f.tempoConf || '',
    ingredientes: (f.ingredientes || []).map((i: any) => ({ produto: i.produto || '', quantidade: i.quantidade || '', unidade: i.unidade || '' })),
    preparacao:   (f.preparacao   || []).map((p: any) => ({ descricao: p.descricao || '', haccp: p.haccp || '' })),
    empratamento: f.empratamento || '', alergenicos: f.alergenicos || [],
  }));

  const prompts = construirPrompts(modulo, anoLetivo);
  return await chamarManualViaGS(prompts);
}



// Exportar para Google Doc via modelo oficial ECL
async function exportarParaDrive(modulo: ModuloCronograma, anoLetivo: string, textoGuia: string): Promise<string> {
  const payload = {
    moduloId:        modulo.id,
    moduloNome:      modulo.nome,
    titulo:          modulo.nome.split(' ').slice(-3).join(' '), // titulo curto para capa
    disciplina:      modulo.disciplina,
    horasPrevistas:  modulo.horasPrevistas,
    turmaAno:        modulo.turmaAno,
    anoLetivo:       anoLetivo,
    textoGuia:       textoGuia,
  };
  const resp = await fetch(GS_URL, { method: 'POST', body: JSON.stringify(payload) });
  if (!resp.ok) throw new Error('Erro no servidor: ' + resp.status);
  const data = await resp.json();
  if (!data.ok) throw new Error(data.erro || 'Erro desconhecido');
  return data.url || '';
}

// ── Renderizador simples de markdown para manuais ─────────────
// Não usa o GuiaProducao (que é para fichas de produção).
// Renderiza: títulos H1/H2/H3, tabelas, listas, caixas de destaque, parágrafos.
function RenderizadorManual({ texto }: { texto: string }) {
  if (!texto) return null;
  const linhas = texto.split('\n');
  const elementos: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < linhas.length) {
    const l = linhas[i];

    // H1
    if (l.startsWith('# ') && !l.startsWith('## ')) {
      elementos.push(<h2 key={key++} style={{ fontSize: 18, fontWeight: 800, color: '#00796B',
        borderBottom: '2px solid #00796B', paddingBottom: 6, marginTop: 24, marginBottom: 10 }}>
        {l.slice(2).trim()}
      </h2>);
      i++; continue;
    }
    // H2
    if (l.startsWith('## ') && !l.startsWith('### ')) {
      elementos.push(<h3 key={key++} style={{ fontSize: 15, fontWeight: 700, color: '#00796B',
        marginTop: 18, marginBottom: 6 }}>
        {l.slice(3).trim()}
      </h3>);
      i++; continue;
    }
    // H3
    if (l.startsWith('### ')) {
      elementos.push(<h4 key={key++} style={{ fontSize: 13, fontWeight: 700, color: '#2E2A26',
        marginTop: 12, marginBottom: 4 }}>
        {l.slice(4).trim()}
      </h4>);
      i++; continue;
    }

    // Caixa de destaque (emoji no início)
    const mCaixa = l.match(/^(🎯|💡|✏️|⚠️|🌡️|👨‍🍳|📌|🔬)\s+(.+)$/);
    if (mCaixa) {
      const corBorda = mCaixa[1] === '⚠️' || mCaixa[1] === '🌡️' ? '#c0392b' :
                       mCaixa[1] === '✏️' ? '#4E7A25' : '#00796B';
      const conteudo: string[] = [];
      i++;
      while (i < linhas.length && linhas[i].trim() !== '' && !linhas[i].startsWith('#')) {
        conteudo.push(linhas[i].trim()); i++;
      }
      elementos.push(<div key={key++} style={{ borderLeft: '4px solid ' + corBorda,
        background: '#f0faf8', borderRadius: '0 8px 8px 0', padding: '10px 14px',
        marginBottom: 10 }}>
        <div style={{ fontWeight: 700, color: corBorda, fontSize: 12, marginBottom: 4 }}>
          {mCaixa[1]} {mCaixa[2]}
        </div>
        {conteudo.map((c, ci) => <div key={ci} style={{ fontSize: 12, color: '#2E2A26',
          lineHeight: 1.5 }}>{c.replace(/^[•\-]\s*/, '')}</div>)}
      </div>);
      continue;
    }

    // Tabela markdown
    if (l.startsWith('|') && l.endsWith('|')) {
      const headers = l.split('|').slice(1, -1).map(c => c.trim());
      i++;
      if (i < linhas.length && /^\|[-| ]+\|$/.test(linhas[i])) i++;
      const rows: string[][] = [];
      while (i < linhas.length && linhas[i].startsWith('|')) {
        rows.push(linhas[i].split('|').slice(1, -1).map(c => c.trim()));
        i++;
      }
      elementos.push(<div key={key++} style={{ overflowX: 'auto', marginBottom: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>{headers.map((h, hi) => <th key={hi} style={{ background: '#00796B',
              color: '#fff', padding: '6px 10px', textAlign: 'left', fontWeight: 700 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => <tr key={ri} style={{ background: ri % 2 === 0 ? '#e0f2f1' : '#fff' }}>
              {r.map((c, ci) => <td key={ci} style={{ padding: '5px 10px', borderBottom: '1px solid #b2dfdb' }}>{c}</td>)}
            </tr>)}
          </tbody>
        </table>
      </div>);
      continue;
    }

    // Lista
    if (/^[•\-]\s+/.test(l)) {
      const itens: string[] = [];
      while (i < linhas.length && /^[•\-]\s+/.test(linhas[i])) {
        itens.push(linhas[i].replace(/^[•\-]\s+/, '')); i++;
      }
      elementos.push(<ul key={key++} style={{ paddingLeft: 20, marginBottom: 8 }}>
        {itens.map((it, ii) => <li key={ii} style={{ fontSize: 13, color: '#2E2A26',
          lineHeight: 1.6, marginBottom: 2 }}>{it}</li>)}
      </ul>);
      continue;
    }

    // Separador
    if (/^[-=]{3,}$/.test(l.trim())) {
      elementos.push(<hr key={key++} style={{ border: 'none', borderTop: '1px solid #b2dfdb',
        margin: '12px 0' }} />);
      i++; continue;
    }

    // Parágrafo
    if (l.trim()) {
      elementos.push(<p key={key++} style={{ fontSize: 13, color: '#2E2A26', lineHeight: 1.7,
        marginBottom: 6, textAlign: 'justify' }}>
        {l.replace(/\*\*(.+?)\*\*/g, '**$1**').trim()}
      </p>);
    }
    i++;
  }

  return <div style={{ padding: '4px 0' }}>{elementos}</div>;
}


// ── Card de entrada ────────────────────────────────────────────
function CardManual({ entrada, onAbrir, onEditar, onApagar, modoProf }: {
  entrada: EntradaManual; onAbrir: () => void;
  onEditar?: () => void; onApagar?: () => void; modoProf: boolean;
}) {
  const nivel = CORES_NIVEL[entrada.nivel];
  const icone = ICONES_CATEGORIA[entrada.categoria];
  return (
    <div onClick={onAbrir} style={{
      background: '#fff', borderRadius: 14, border: '1px solid rgba(26,23,20,0.1)',
      padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s',
      marginBottom: 8, boxShadow: '0 1px 4px rgba(26,23,20,0.05)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: COR_DOURADO_P, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 22,
        }}>{icone}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: COR_PRIMARIA, marginBottom: 4 }}>
            {entrada.titulo}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100,
              background: COR_DOURADO_P, color: COR_DOURADO, fontWeight: 600 }}>
              {entrada.categoria}
            </span>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100,
              background: (nivel as any).bg, color: (nivel as any).cor, fontWeight: 600 }}>
              {entrada.nivel}
            </span>
          </div>
          {entrada.palavrasChave.length > 0 && (
            <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.4)' }}>
              🏷️ {entrada.palavrasChave.slice(0, 4).join(' · ')}
            </div>
          )}
        </div>
        <span style={{ fontSize: 20, color: 'rgba(26,23,20,0.2)', alignSelf: 'center' }}>›</span>
      </div>
      {modoProf && (
        <div style={{ display: 'flex', gap: 6, marginTop: 10, paddingTop: 10,
          borderTop: '1px solid rgba(26,23,20,0.06)' }}
          onClick={e => e.stopPropagation()}>
          <button onClick={onEditar} style={{ padding: '5px 12px', borderRadius: 7,
            border: '1px solid rgba(26,23,20,0.15)', background: '#fff',
            color: 'rgba(26,23,20,0.6)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            ✏️ Editar
          </button>
          <button onClick={onApagar} style={{ padding: '5px 12px', borderRadius: 7,
            border: '1px solid rgba(192,57,43,0.3)', background: '#fdf0ef',
            color: '#c0392b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            🗑️ Apagar
          </button>
          <span style={{ fontSize: 11, color: 'rgba(26,23,20,0.3)', alignSelf: 'center', marginLeft: 'auto' }}>
            {fmtData(entrada.criadoEm)}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Formulário de criação/edição ───────────────────────────────
function FormularioManual({ entrada, onGuardar, onCancelar, nomeProfessor }: {
  entrada?: EntradaManual; onGuardar: (e: EntradaManual) => void;
  onCancelar: () => void; nomeProfessor: string;
}) {
  // Seleção de UC/UFCD
  // Anos letivos disponíveis — 3 anteriores + actual + 2 seguintes
  const ANOS = (() => {
    const hoje = new Date();
    const ano  = hoje.getFullYear();
    const mes  = hoje.getMonth() + 1;
    const anoInicio = mes >= 9 ? ano : ano - 1;
    const anos = [];
    for (let i = -3; i <= 2; i++) {
      const a = anoInicio + i;
      anos.push(a + '-' + (a + 1));
    }
    return anos;
  })();
  const [anoLetivo, setAnoLetivo] = useState(ANO_LETIVO);
  const [turmaSel, setTurmaSel] = useState<1 | 2 | 3 | null>(null);
  const [moduloSel, setModuloSel] = useState<ModuloCronograma | null>(null);

  // Campos do formulário
  const [titulo, setTitulo]       = useState(entrada?.titulo || '');
  const [categoria, setCategoria] = useState<CategoriaManual>(entrada?.categoria || 'Higiene e Preparação');
  const [nivel, setNivel]         = useState<NivelManual>(entrada?.nivel || 'Base');
  const [palavras, setPalavras]   = useState(entrada?.palavrasChave.join(', ') || '');
  const [texto, setTexto]         = useState(entrada?.textoGuia || '');
  const [erro, setErro]           = useState('');
  const [gerandoIA, setGerandoIA] = useState(false);
  const [faseIA, setFaseIA]       = useState('');
  // Estados das 5 partes do manual
  const [partes, setPartes]       = useState<{texto: string; estado: 'vazio'|'gerando'|'pronto'|'erro'}[]>(
    Array(5).fill(null).map(() => ({ texto: '', estado: 'vazio' as const }))
  );

  // Módulos filtrados por turma
  const modulosDaTurma = useMemo(() =>
    turmaSel ? CRONOGRAMA_2026_2027.filter(m => m.turmaAno === turmaSel) : [],
    [turmaSel]);

  // Mapa UC/UFCD → CategoriaManual (baseado no referencial real 811RA144 e 811183)
  const CATEGORIA_POR_UC: Partial<Record<string, CategoriaManual>> = {
    'UC03576': 'Métodos de Confeção',
    'UC01999': 'Métodos de Confeção',
    'UC03577': 'Métodos de Confeção',
    'UC02002': 'Métodos de Confeção',
    'UC02003': 'Métodos de Confeção',
    'UC02004': 'Métodos de Confeção',
    'UC02005': 'Pastelaria e Doçaria',
    'UC03578': 'Outro',
    'UC00596': 'Outro',
    'UC03579': 'Conservação e Armazenamento',
    'UC03580': 'Outro',
    'UC03581': 'Métodos de Confeção',
    'UC03582': 'Métodos de Confeção',
    'UC00039': 'Segurança Alimentar',
    'UC03584': 'Segurança Alimentar',
    'UC03585': 'Conservação e Armazenamento',
    'UC03586': 'Pastelaria e Doçaria',
    'UC03588': 'Métodos de Confeção',
    'UC03589': 'Outro',
    'UC03590': 'Métodos de Confeção',
    'UC03591': 'Métodos de Confeção',
    'UC03592': 'Pastelaria e Doçaria',
    'UC03593': 'Pastelaria e Doçaria',
    'UC03595': 'Métodos de Confeção',
    'UC03596': 'Métodos de Confeção',
    'UC00031': 'Outro', 'UC00032': 'Outro', 'UC00034': 'Outro',
    'UC00035': 'Outro', 'UC00038': 'Outro', 'UC00054': 'Outro',
    'UC00056': 'Outro', 'UC00068': 'Outro', 'UC00069': 'Outro',
    'UC00077': 'Outro', 'UC00595': 'Outro',
    'UFCD 12': 'Métodos de Confeção',
    'UFCD 14': 'Métodos de Confeção',
    'UFCD 15': 'Métodos de Confeção',
    'UFCD 16': 'Métodos de Confeção',
    'UFCD 17': 'Métodos de Confeção',
    'UFCD 18': 'Métodos de Confeção',
    'UFCD 19': 'Métodos de Confeção',
    'UFCD 20': 'Pastelaria e Doçaria',
    'UFCD 21.1': 'Pastelaria e Doçaria',
    'UFCD 21.2': 'Pastelaria e Doçaria',
    'UFCD 22.1': 'Pastelaria e Doçaria',
    'UFCD 22.2': 'Pastelaria e Doçaria',
    'UFCD 23': 'Pastelaria e Doçaria',
    'UFCD 01': 'Outro', 'UFCD 04': 'Outro', 'UFCD 07': 'Outro',
    'UFCD 08': 'Outro', 'UFCD 09': 'Outro', 'UFCD 24': 'Outro',
    'UFCD 52': 'Outro', 'UFCD 53.1': 'Outro', 'UFCD 57': 'Outro',
  };

  function selecionarModulo(m: ModuloCronograma) {
    setModuloSel(m);
    setTitulo(m.nome);
    setCategoria((CATEGORIA_POR_UC[m.id] ?? 'Outro') as CategoriaManual);
    setNivel(m.turmaAno === 1 ? 'Base' : m.turmaAno === 2 ? 'Intermédio' : 'Avançado');
    setPalavras(m.nome.split(' ').filter((w: string) => w.length > 4).slice(0, 5).join(', '));
  }

  // Abrir IA externa com o prompt da parte
  async function abrirPromptIA(numParte: number, destino: 'claude' | 'chatgpt' | 'gemini' = 'claude') {
    if (!moduloSel) { setErro('Selecciona um modulo primeiro.'); return; }
    const todosPrompts = construirPrompts(moduloSel, anoLetivo);
    const prompt = todosPrompts[numParte];
    await abrirIA(destino, prompt);
  }

  // Colar resultado de uma parte
  function colarResultadoParte(numParte: number, texto: string) {
    setPartes(prev => prev.map((p, i) =>
      i === numParte ? { texto, estado: texto.trim() ? 'pronto' as const : 'vazio' as const } : p
    ));
  }

  // Juntar todas as partes e guardar
  function juntarEGuardar() {
    const todas = partes.map(p => p.texto).filter(t => t.trim());
    if (todas.length === 0) { setErro('Nenhuma parte gerada ainda.'); return; }
    const textoFinal = todas.join('\n\n');
    setTexto(textoFinal);
    setErro('');
  }

  async function gerarManual() {
    if (!moduloSel) { setErro('Selecciona um modulo do cronograma primeiro.'); return; }
    setGerandoIA(true);
    setFaseIA('A gerar as 5 partes em paralelo…');
    setErro('');
    // As 5 partes são geradas em simultâneo — mostrar contador
    let segundos = 0;
    const intervalo = setInterval(() => {
      segundos += 5;
      setFaseIA('A gerar em paralelo… ' + segundos + 's');
    }, 5000);
    try {
      const resultado = await gerarManualCompleto(moduloSel, anoLetivo);
      clearInterval(intervalo);
      setTexto(t => t ? t + '\n\n' + resultado : resultado);
      setFaseIA('');
    } catch (e: unknown) {
      clearInterval(intervalo);
      const msg = e instanceof Error ? e.message : 'Erro desconhecido';
      setErro('Erro ao gerar o manual: ' + msg);
      setFaseIA('');
    } finally {
      setGerandoIA(false);
    }
  }

  function guardar() {
    if (!titulo.trim()) { setErro('O título é obrigatório.'); return; }
    if (!texto.trim()) { setErro('O conteúdo é obrigatório.'); return; }
    const agora = new Date().toISOString();
    function guardar() {
  if (!titulo.trim()) {
    setErro('O título é obrigatório.');
    return;
  }

  if (!texto.trim()) {
    setErro('O conteúdo é obrigatório.');
    return;
  }

  const agora = new Date().toISOString();

  onGuardar({
    id: entrada?.id || gerarId(),
    titulo: titulo.trim(),
    categoria,
    nivel,
    palavrasChave: palavras
      .split(',')
      .map((p: string) => p.trim())
      .filter(Boolean),
    textoGuia: texto.trim(),

    criadoEm: entrada?.criadoEm || agora,
    atualizadoEm: agora,
    criadoPor: nomeProfessor || 'Professor',
  });
}
  }

  const turmaLabel = (t: 1|2|3) => t === 1 ? '1º CP (UCs)' : t === 2 ? '2º CP (UFCDs)' : '3º CP (UFCDs)';

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button onClick={onCancelar} style={{ background: 'rgba(26,23,20,0.06)',
          border: 'none', borderRadius: 8, padding: '7px 14px',
          cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>← Voltar</button>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18,
          fontWeight: 700, color: COR_PRIMARIA }}>
          {entrada ? 'Editar entrada' : 'Nova entrada do Manual'}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── SECÇÃO: Gerar a partir do cronograma ── */}
        {!entrada && (
          <div style={{ background: COR_IA_P, borderRadius: 14,
            border: `1.5px solid ${COR_IA}30`, padding: '16px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: COR_IA, marginBottom: 12 }}>
              ✨ Gerar guião de módulo com IA
            </div>

            {/* Ano letivo */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(26,23,20,0.5)',
                display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Ano Lectivo
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {ANOS.map(a => (
                  <button key={a} onClick={() => setAnoLetivo(a)} style={{
                    padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
                    fontWeight: 700, border: `2px solid ${anoLetivo === a ? COR_IA : 'rgba(26,23,20,0.15)'}`,
                    background: anoLetivo === a ? COR_IA : '#fff',
                    color: anoLetivo === a ? '#fff' : 'rgba(26,23,20,0.5)',
                  }}>{a}</button>
                ))}
              </div>
            </div>

            {/* Turma */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(26,23,20,0.5)',
                display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Turma
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {([1, 2, 3] as const).map(t => (
                  <button key={t} onClick={() => { setTurmaSel(t); setModuloSel(null); }} style={{
                    flex: 1, padding: '8px 4px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
                    fontWeight: 700, border: `2px solid ${turmaSel === t ? COR_IA : 'rgba(26,23,20,0.1)'}`,
                    background: turmaSel === t ? COR_IA_P : '#fff',
                    color: turmaSel === t ? COR_IA : 'rgba(26,23,20,0.5)',
                  }}>{turmaLabel(t)}</button>
                ))}
              </div>
            </div>

            {/* Lista de módulos */}
            {turmaSel && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(26,23,20,0.5)',
                  display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  UC / UFCD
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4,
                  maxHeight: 220, overflowY: 'auto', borderRadius: 10,
                  border: '1px solid rgba(26,23,20,0.1)', background: '#fff', padding: 6 }}>
                  {modulosDaTurma.map(m => (
                    <button key={m.id} onClick={() => selecionarModulo(m)} style={{
                      textAlign: 'left', padding: '8px 10px', borderRadius: 8,
                      border: `1.5px solid ${moduloSel?.id === m.id ? COR_IA : 'transparent'}`,
                      background: moduloSel?.id === m.id ? COR_IA_P : 'transparent',
                      cursor: 'pointer', fontSize: 12, color: COR_PRIMARIA,
                    }}>
                      <span style={{ fontWeight: 700, color: COR_IA, marginRight: 6 }}>
                        {m.tipo} {m.id.replace('UFCD ', '')}
                      </span>
                      {m.nome}
                      <span style={{ color: 'rgba(26,23,20,0.35)', marginLeft: 6, fontSize: 11 }}>
                        · {m.horasPrevistas}h · {m.disciplina}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sistema de 5 partes — abre IA externa com o prompt */}
            {!moduloSel && (
              <div style={{ fontSize: 12, color: 'rgba(109,40,217,0.4)', textAlign: 'center', padding: 8 }}>
                Selecciona um modulo acima para activar os botoes.
              </div>
            )}
            {moduloSel && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.5)', padding: '6px 0' }}>
                  Carrega em cada parte → o Claude abre com o prompt → copia o resultado → cola abaixo
                </div>
                {[
                  'Parte 1 — Enquadramento, Objectivos e Contexto',
                  'Parte 2 — Materias-Primas, HACCP e Metodos',
                  'Parte 3 — Molhos, Empratamento e Fichas de Trabalho',
                  'Parte 4 — Fichas Tecnicas de Receita',
                  'Parte 5 — Questionario, Glossario e Anexos',
                ].map((label, idx) => {
                  const parte = partes[idx];
                  const temTexto = parte?.texto?.trim();
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button onClick={() => abrirPromptIA(idx, 'claude')}
                          style={{ flex: 1, padding: '9px 12px', borderRadius: 9, border: 'none',
                            background: temTexto ? '#4E7A25' : COR_IA,
                            color: '#fff', fontSize: 12, fontWeight: 700,
                            textAlign: 'left', cursor: 'pointer' }}>
                          {temTexto ? '✅' : '✨'} {label}
                        </button>
                        <button onClick={() => abrirPromptIA(idx, 'chatgpt')}
                          title="Abrir no ChatGPT"
                          style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #10a37f',
                            background: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', color: '#10a37f' }}>
                          GPT
                        </button>
                        <button onClick={() => abrirPromptIA(idx, 'gemini')}
                          title="Abrir no Gemini"
                          style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #4285f4',
                            background: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', color: '#4285f4' }}>
                          ✦
                        </button>
                        {temTexto && (
                          <button onClick={() => colarResultadoParte(idx, '')}
                            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(26,23,20,0.15)',
                              background: '#fff', fontSize: 11, cursor: 'pointer', color: 'rgba(26,23,20,0.5)' }}>
                            🗑
                          </button>
                        )}
                      </div>
                      <textarea
                        placeholder={'Cola aqui o resultado da ' + label + '...'}
                        value={parte?.texto || ''}
                        onChange={e => colarResultadoParte(idx, e.target.value)}
                        style={{ width: '100%', minHeight: temTexto ? 80 : 40, padding: '8px 10px',
                          borderRadius: 8, border: '1px solid rgba(26,23,20,0.15)',
                          fontSize: 11, fontFamily: 'monospace', resize: 'vertical',
                          background: temTexto ? '#f0faf5' : '#fff',
                          boxSizing: 'border-box' }} />
                    </div>
                  );
                })}

                {/* Botão juntar */}
                {partes.some(p => p.texto?.trim()) && (
                  <button
                    onClick={juntarEGuardar}
                    style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                      background: '#1A1714', color: '#fff', fontSize: 14, fontWeight: 700,
                      cursor: 'pointer', marginTop: 4 }}>
                    📄 Juntar e criar documento
                    <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 8 }}>
                      ({partes.filter(p => p.texto?.trim()).length}/5 prontas)
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Título */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(26,23,20,0.6)',
            display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Título
          </label>
          <input value={titulo} onChange={e => setTitulo(e.target.value)}
            placeholder="ex: Planeamento e confeção de carnes, aves e caça"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10,
              border: '1.5px solid rgba(26,23,20,0.15)', fontSize: 14,
              fontFamily: 'var(--font-sans)' }} />
        </div>

        {/* Categoria e Nível */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(26,23,20,0.6)',
              display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Categoria
            </label>
            <select value={categoria} onChange={e => setCategoria(e.target.value as CategoriaManual)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10,
                border: '1.5px solid rgba(26,23,20,0.15)', fontSize: 13,
                background: '#fff', fontFamily: 'var(--font-sans)' }}>
              {CATEGORIAS_MANUAL.map(c => (
                <option key={c} value={c}>{ICONES_CATEGORIA[c]} {c}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(26,23,20,0.6)',
              display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Nível
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['Base', 'Intermédio', 'Avançado'] as NivelManual[]).map(n => {
                const c = CORES_NIVEL[n];
                return (
                  <button key={n} onClick={() => setNivel(n)} style={{
                    flex: 1, padding: '10px 4px', borderRadius: 8, cursor: 'pointer',
                    border: `2px solid ${nivel === n ? (c as any).cor : 'rgba(26,23,20,0.1)'}`,
                    background: nivel === n ? (c as any).bg : '#fff',
                    color: nivel === n ? (c as any).cor : 'rgba(26,23,20,0.5)',
                    fontSize: 11, fontWeight: 700,
                  }}>{n}</button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Palavras-chave */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(26,23,20,0.6)',
            display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Palavras-chave (separadas por vírgula)
          </label>
          <input value={palavras} onChange={e => setPalavras(e.target.value)}
            placeholder="ex: carnes, aves, marinadas, confeção, técnicas"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10,
              border: '1.5px solid rgba(26,23,20,0.15)', fontSize: 13,
              fontFamily: 'var(--font-sans)' }} />
        </div>

        {/* Texto */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(26,23,20,0.6)',
            display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Conteúdo {texto ? '✓' : '— gerado pela IA ou colado manualmente'}
          </label>
          <textarea value={texto} onChange={e => setTexto(e.target.value)}
            rows={texto ? 14 : 6}
            placeholder={'Clica em "✨ Gerar guião com IA" acima, ou cola o texto manualmente.'}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10,
              border: `1.5px solid ${texto ? 'rgba(109,40,217,0.4)' : 'rgba(26,23,20,0.15)'}`,
              fontSize: 12, fontFamily: 'var(--font-mono)', resize: 'vertical', lineHeight: 1.5 }} />
        </div>

        {erro && (
          <div style={{ padding: '10px 14px', background: '#fdf0ef',
            borderRadius: 8, color: '#c0392b', fontSize: 13, fontWeight: 600 }}>
            ⚠️ {erro}
          </div>
        )}

        <button onClick={guardar} style={{
          width: '100%', padding: '14px', borderRadius: 12, border: 'none',
          background: COR_PRIMARIA, color: '#faf7f2', fontSize: 15,
          fontWeight: 700, cursor: 'pointer',
        }}>
          ✓ Guardar no Manual do Cozinheiro
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export function ManualCozinheiro({ modoProf, nomeProfessor }: {
  modoProf: boolean; nomeProfessor?: string;
}) {
  const [pesquisa, setPesquisa]           = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<CategoriaManual | 'Todas'>('Todas');
  const [nivelFiltro, setNivelFiltro]     = useState<NivelManual | 'Todos'>('Todos');
  const [entradas, setEntradas]           = useState<EntradaManual[]>(() => getEntradasManual());
  const [modo, setModo]                   = useState<'lista' | 'ver' | 'criar' | 'editar'>('lista');
  const [entradaAtiva, setEntradaAtiva]   = useState<EntradaManual | null>(null);
  const [confirmarApagar, setConfirmarApagar] = useState<string | null>(null);

  function recarregar() { setEntradas(getEntradasManual()); }

  const resultados = useMemo(() => {
    let r = pesquisa ? pesquisarManual(pesquisa) : getEntradasManual();
    if (categoriaFiltro !== 'Todas') r = r.filter(e => e.categoria === categoriaFiltro);
    if (nivelFiltro !== 'Todos') r = r.filter(e => e.nivel === nivelFiltro);
    return r.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  }, [pesquisa, categoriaFiltro, nivelFiltro, entradas]);

  const porCategoria = useMemo(() => {
    const grupos: Record<string, EntradaManual[]> = {};
    resultados.forEach(e => {
      if (!grupos[e.categoria]) grupos[e.categoria] = [];
      grupos[e.categoria].push(e);
    });
    return grupos;
  }, [resultados]);

  function guardarEntrada(e: EntradaManual) {
    addEntradaManual(e); recarregar(); setModo('ver'); setEntradaAtiva(e);
  }
  function apagar(id: string) {
    deleteEntradaManual(id); recarregar();
    setConfirmarApagar(null); setModo('lista'); setEntradaAtiva(null);
  }

  // ── Vista de uma entrada ────────────────────────────────────
  if (modo === 'ver' && entradaAtiva) {
    const nivel = CORES_NIVEL[entradaAtiva.nivel];
    return (
      <div>
        <div style={{ background: COR_PRIMARIA, borderRadius: 16, padding: '16px 18px', marginBottom: 16 }}>
          <button onClick={() => { setModo('lista'); setEntradaAtiva(null); }}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
              padding: '6px 14px', color: 'rgba(247,241,230,0.7)', fontSize: 12,
              cursor: 'pointer', marginBottom: 12 }}>
            ← Manual do Cozinheiro
          </button>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 100,
              background: 'rgba(255,255,255,0.12)', color: 'rgba(247,241,230,0.8)', fontWeight: 600 }}>
              {ICONES_CATEGORIA[entradaAtiva.categoria]} {entradaAtiva.categoria}
            </span>
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 100,
              background: (nivel as any).bg, color: (nivel as any).cor, fontWeight: 700 }}>
              {entradaAtiva.nivel}
            </span>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20,
            fontWeight: 700, color: '#faf7f2', lineHeight: 1.2 }}>
            {entradaAtiva.titulo}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(247,241,230,0.4)', marginTop: 6 }}>
            {fmtData(entradaAtiva.criadoEm)}
          </div>
          {entradaAtiva.palavrasChave.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {entradaAtiva.palavrasChave.map((p: string, i: number) => (
                <span key={i} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100,
                  background: 'rgba(255,255,255,0.08)', color: 'rgba(247,241,230,0.6)' }}>
                  #{p}
                </span>
              ))}
            </div>
          )}
        </div>
        {modoProf && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button onClick={() => exportarGuiaoDocx(entradaAtiva)} style={{ padding: '8px 16px', borderRadius: 9, border: '1px solid rgba(109,40,217,0.3)', background: '#ede9fe', color: '#6d28d9', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>⬇️ Exportar .docx</button>
            <button onClick={async () => {
              try {
                const resp = await fetch(GS_URL, { method: 'POST', body: JSON.stringify({
                  moduloId: entradaAtiva.palavrasChave[0] || '',
                  moduloNome: entradaAtiva.titulo,
                  titulo: entradaAtiva.titulo,
                  disciplina: entradaAtiva.categoria,
                  horasPrevistas: '',
                  turmaAno: 1,
                  anoLetivo: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
                  textoGuia: entradaAtiva.textoGuia,
                }) });
                const data = await resp.json();
                if (data.ok) window.open(data.url, '_blank');
                else alert('Erro: ' + data.erro);
              } catch(e) { alert('Erro: ' + (e instanceof Error ? e.message : String(e))); }
            }} style={{ padding: '8px 16px', borderRadius: 9, border: '1px solid rgba(0,121,107,0.3)', background: '#e0f2f1', color: '#00796b', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>📄 Guardar no Drive (modelo ECL)</button>
            <button onClick={() => setModo('editar')} style={{ padding: '8px 16px',
              borderRadius: 9, border: '1px solid rgba(26,23,20,0.15)', background: '#fff',
              color: 'rgba(26,23,20,0.7)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              ✏️ Editar
            </button>
            <button onClick={() => setConfirmarApagar(entradaAtiva.id)} style={{ padding: '8px 16px',
              borderRadius: 9, border: '1px solid rgba(192,57,43,0.3)', background: '#fdf0ef',
              color: '#c0392b', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              🗑️ Apagar
            </button>
          </div>
        )}
        <RenderizadorManual texto={entradaAtiva.textoGuia} />
      </div>
    );
  }

  if ((modo === 'criar' || modo === 'editar') && modoProf) {
    return (
      <FormularioManual
        entrada={modo === 'editar' ? entradaAtiva || undefined : undefined}
        onGuardar={guardarEntrada}
        onCancelar={() => setModo(entradaAtiva ? 'ver' : 'lista')}
        nomeProfessor={nomeProfessor || 'Professor'}
      />
    );
  }

  // ── Lista principal ─────────────────────────────────────────
  return (
    <div>
      <div style={{ background: COR_PRIMARIA, borderRadius: 16, padding: '20px 18px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22,
              fontWeight: 700, color: '#faf7f2' }}>📖 Manual do Cozinheiro</div>
            <div style={{ fontSize: 12, color: 'rgba(247,241,230,0.45)', marginTop: 3 }}>
              {entradas.length} {entradas.length === 1 ? 'entrada' : 'entradas'} · Escola de Comércio de Lisboa
            </div>
          </div>
          {modoProf && (
            <button onClick={() => { setEntradaAtiva(null); setModo('criar'); }}
              style={{ padding: '10px 16px', borderRadius: 10, border: 'none',
                background: COR_DOURADO, color: '#fff', fontSize: 13,
                fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
              + Nova entrada
            </button>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%',
            transform: 'translateY(-50%)', fontSize: 16, color: 'rgba(247,241,230,0.4)' }}>🔍</span>
          <input value={pesquisa} onChange={e => setPesquisa(e.target.value)}
            placeholder="Pesquisar no manual…"
            style={{ width: '100%', padding: '11px 12px 11px 38px', borderRadius: 10,
              border: 'none', fontSize: 14, background: 'rgba(255,255,255,0.1)',
              color: '#faf7f2', fontFamily: 'var(--font-sans)' }} />
          {pesquisa && (
            <button onClick={() => setPesquisa('')}
              style={{ position: 'absolute', right: 10, top: '50%',
                transform: 'translateY(-50%)', background: 'none', border: 'none',
                color: 'rgba(247,241,230,0.5)', cursor: 'pointer', fontSize: 16 }}>✕</button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        <button onClick={() => setCategoriaFiltro('Todas')} style={{
          padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600,
          border: `1.5px solid ${categoriaFiltro === 'Todas' ? COR_PRIMARIA : 'rgba(26,23,20,0.1)'}`,
          background: categoriaFiltro === 'Todas' ? COR_PRIMARIA : '#fff',
          color: categoriaFiltro === 'Todas' ? '#fff' : 'rgba(26,23,20,0.5)', cursor: 'pointer',
        }}>Todas</button>
        {CATEGORIAS_MANUAL.filter((c: CategoriaManual) => entradas.some(e => e.categoria === c)).map((c: CategoriaManual) => (
          <button key={c} onClick={() => setCategoriaFiltro(c === categoriaFiltro ? 'Todas' : c)} style={{
            padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600,
            border: `1.5px solid ${categoriaFiltro === c ? COR_DOURADO : 'rgba(26,23,20,0.1)'}`,
            background: categoriaFiltro === c ? COR_DOURADO_P : '#fff',
            color: categoriaFiltro === c ? COR_DOURADO : 'rgba(26,23,20,0.5)', cursor: 'pointer',
          }}>{ICONES_CATEGORIA[c]} {c}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {(['Todos', 'Base', 'Intermédio', 'Avançado'] as const).map(n => {
          const ativo = nivelFiltro === n;
          const c = n !== 'Todos' ? CORES_NIVEL[n] : null;
          return (
            <button key={n} onClick={() => setNivelFiltro(n)} style={{
              padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600,
              border: `1.5px solid ${ativo ? ((c as any)?.cor || COR_PRIMARIA) : 'rgba(26,23,20,0.1)'}`,
              background: ativo ? ((c as any)?.bg || COR_PRIMARIA) : '#fff',
              color: ativo ? ((c as any)?.cor || '#fff') : 'rgba(26,23,20,0.4)', cursor: 'pointer',
            }}>{n}</button>
          );
        })}
      </div>

      {resultados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{entradas.length === 0 ? '📖' : '🔍'}</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
            {entradas.length === 0 ? 'O Manual ainda está vazio' : 'Nenhum resultado encontrado'}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.5)', maxWidth: 280, margin: '0 auto' }}>
            {entradas.length === 0
              ? modoProf ? 'Cria a primeira entrada — escolhe um módulo do cronograma e gera com IA.' : 'O professor ainda não criou entradas.'
              : 'Tenta pesquisar com outras palavras.'}
          </div>
          {modoProf && entradas.length === 0 && (
            <button onClick={() => { setEntradaAtiva(null); setModo('criar'); }}
              style={{ marginTop: 20, padding: '12px 24px', borderRadius: 12, border: 'none',
                background: COR_PRIMARIA, color: '#faf7f2', fontSize: 14,
                fontWeight: 700, cursor: 'pointer' }}>+ Criar primeira entrada</button>
          )}
        </div>
      ) : pesquisa ? (
        <div>
          <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.4)', marginBottom: 10, fontWeight: 600 }}>
            {resultados.length} resultado{resultados.length !== 1 ? 's' : ''} para "{pesquisa}"
          </div>
          {resultados.map(e => (
            <CardManual key={e.id} entrada={e} modoProf={modoProf}
              onAbrir={() => { setEntradaAtiva(e); setModo('ver'); }}
              onEditar={() => { setEntradaAtiva(e); setModo('editar'); }}
              onApagar={() => setConfirmarApagar(e.id)} />
          ))}
        </div>
      ) : (
        <div>
          {Object.entries(porCategoria).map(([cat, items]: [string, EntradaManual[]]) => (
            <div key={cat} style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 20 }}>{ICONES_CATEGORIA[cat as CategoriaManual]}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(26,23,20,0.6)',
                  textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cat}</span>
                <span style={{ fontSize: 12, color: 'rgba(26,23,20,0.3)',
                  background: 'rgba(26,23,20,0.05)', borderRadius: 100, padding: '1px 8px' }}>
                  {items.length}
                </span>
              </div>
              {items.map(e => (
                <CardManual key={e.id} entrada={e} modoProf={modoProf}
                  onAbrir={() => { setEntradaAtiva(e); setModo('ver'); }}
                  onEditar={() => { setEntradaAtiva(e); setModo('editar'); }}
                  onApagar={() => setConfirmarApagar(e.id)} />
              ))}
            </div>
          ))}
        </div>
      )}
      {/* Modal de confirmação de apagar — global, funciona na lista e no detalhe */}
      {confirmarApagar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,23,20,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '24px', maxWidth: 340, width: '100%' }}>
            <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>🗑️</div>
            <div style={{ fontWeight: 700, fontSize: 16, textAlign: 'center', marginBottom: 8 }}>
              Apagar esta entrada?
            </div>
            <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.55)', textAlign: 'center', marginBottom: 20 }}>
              {entradas.find(e => e.id === confirmarApagar)?.titulo || 'Esta entrada'} vai ser removida.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => apagar(confirmarApagar)} style={{ flex: 1, padding: '12px',
                borderRadius: 10, border: 'none', background: '#c0392b',
                color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Apagar</button>
              <button onClick={() => setConfirmarApagar(null)} style={{ flex: 1, padding: '12px',
                borderRadius: 10, border: '1px solid rgba(26,23,20,0.15)', background: '#fff',
                color: 'rgba(26,23,20,0.6)', fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

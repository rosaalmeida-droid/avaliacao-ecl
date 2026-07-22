import React, { useState, useMemo } from 'react';
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


async function gerarManualCompleto(modulo: ModuloCronograma, anoLetivo: string): Promise<string> {
  const ucIdRef = modulo.tipo === 'UC' ? modulo.id : (EQUIVALENCIAS_UFCD_UC[modulo.id]?.[0] || null);
  const ref = ucIdRef ? getReferencialUC(ucIdRef) : null;

  const todasFichas = getFichasProducao();
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

  const ref_ = modulo.tipo === 'UC' ? '811RA144' : '811183';
  const turmaNum = modulo.turmaAno;
  const turma = turmaNum === 1 ? '1. Ano' : turmaNum === 2 ? '2. Ano' : '3. Ano';
  const anos  = turmaNum === 1 ? '2026-2029' : turmaNum === 2 ? '2025-2028' : '2024-2027';

  const cabecalho = ['ESCOLA DE COMERCIO DE LISBOA',
    'Curso Profissional de Tecnico/a de Cozinha e Restauracao',
    turma + ' | ' + anos, 'Referencial ' + ref_, modulo.disciplina,
    modulo.id + ' - ' + modulo.nome,
    'Carga Horaria: ' + modulo.horasPrevistas + ' horas', 'Ano Lectivo ' + anoLetivo,
  ].join('\n');

  const realizacoes   = (ref?.realizacoes           || []).join('\n- ');
  const criterios     = (ref?.criteriosDesempenho   || []).join('\n- ');
  const conhecimentos = (ref?.conhecimentos         || []).join('\n- ');

  const BIB = 'ANQEP 811RA144 | AHRESP/DGS Codigo Boas Praticas | Gomes et al. 2015 APN/DGS | Reg.CE 852/2004 | Maincent-Morel | McGee | Le Cordon Bleu | Modesto M.L. | Turismo de Portugal';
  const HACCP = 'HACCP: refrigeracao 0-4C; congelacao -18C; confeccao min.65C; regra 2h; Anisakis -20C/24h.';

  const ctx = 'MANUAL DO ALUNO — ' + modulo.nome + '\nRef ' + ref_ + ' | ECL'
    + '\nREALIZACOES:\n- ' + (realizacoes || 'ver ref')
    + '\nCRITERIOS:\n- ' + (criterios || 'ver ref')
    + '\nCONHECIMENTOS:\n- ' + (conhecimentos || 'ver ref')
    + '\n' + HACCP + '\nBIBLIOGRAFIA: ' + BIB
    + '\nNORMA: min 50 pag; portugues europeu pre-Acordo; tabelas 4 colunas; fontes reais; NAO usar Parte X de 5.';

  const nomeLower = modulo.nome.toLowerCase();
  let temaEspec = 'Caps 9-11: especializacao profunda desta UC com tabelas e referencias reais.';
  if (nomeLower.includes('tradicional portuguesa') || nomeLower.includes('tradicional port')) {
    temaEspec = 'CRITICO — desenvolve CADA REGIAO com min 2 paginas:\n'
      + 'Cap 9 Norte (Minho, Tras-os-Montes, Douro): caldo verde, rojoes, alheira, lamprea, vinho verde, azeite DOP\n'
      + 'Cap 10 Centro+Lisboa (Beiras, Estremadura, Ribatejo): leitao Bairrada, chanfana, bacalhau Bras, iscas, queijo Serra Estrela DOP\n'
      + 'Cap 11 Sul+Ilhas (Alentejo, Algarve, Acores, Madeira): acorda, migas, cataplana, xerem, espetada, cozido Furnas\n'
      + 'Cada regiao: tabela 4 col (Prato|Ingredientes|Tecnica|Historia) + paragrafo historico + DOP/IGP + exercicio. Nao resumir.';
  } else if (nomeLower.includes('internacional')) {
    temaEspec = 'Caps 9-11: 6 cozinhas internacionais (francesa, italiana, asiatica, espanhola, americana, mediterranica) com tabela e chefs reais cada.';
  } else if (nomeLower.includes('peixes') || nomeLower.includes('mariscos')) {
    temaEspec = 'Caps 9-11: perfis de especies + sazonalidade + cozinha regional do peixe por regiao.';
  } else if (nomeLower.includes('carnes') || nomeLower.includes('aves')) {
    temaEspec = 'Caps 9-11: classificacao cortes + aves e caca + enchidos DOP + temperaturas seguranca.';
  } else if (nomeLower.includes('pastelaria') || nomeLower.includes('docaria')) {
    temaEspec = 'Caps 9-11: pastelaria regional + docaria conventual + pastelaria internacional + mestres referencia.';
  }

  const fichasTexto = fichasApp.length >= 5
    ? '# CAPITULO 14 — FICHAS TECNICAS DE RECEITA\n\nFichas de aula para ' + modulo.id + ':\n\n'
      + fichasApp.map((f: any, i: number) => {
          const ings = (f.ingredientes || []).map((ing: any) => '- ' + ing.quantidade + ' ' + ing.unidade + ' ' + ing.produto).join('\n');
          const prep = (f.preparacao || []).map((p: any, pi: number) => (pi+1) + '. ' + p.descricao + (p.haccp ? ' [HACCP: ' + p.haccp + ']' : '')).join('\n');
          return '## RECEITA ' + (i+1) + ' — ' + f.nomePrato.toUpperCase()
            + '\nDoses: ' + f.numPorcoes + ' | Prep: ' + f.tempoPrep + ' | Conf: ' + f.tempoConf
            + '\n### Ingredientes\n' + ings + '\n### Preparacao\n' + prep
            + (f.empratamento ? '\nEmpratamento: ' + f.empratamento : '')
            + (f.alergenicos?.length ? '\nAlergénios: ' + f.alergenicos.join(', ') : '');
        }).join('\n\n---\n\n')
    : null;

  // ── Sistema de instrução profunda ────────────────────────────
  // Cada competência do referencial é desenvolvida em profundidade
  // O ano letivo é sempre 2026-2027 independentemente do que for passado
  const anoLetivoFixo = '2026-2027';

  const realizacoesStr   = (ref?.realizacoes           || []).map((r: string, i: number) => (i+1) + '. ' + r).join('\n');
  const criteriosStr     = (ref?.criteriosDesempenho   || []).map((r: string, i: number) => '- ' + r).join('\n');
  const conhecimentosStr = (ref?.conhecimentos         || []).map((r: string, i: number) => '- ' + r).join('\n');

  // Detecção de tema para instrução específica
  // nomeLower já declarado acima
  const ePeixes    = nomeLower.includes('peixe') || nomeLower.includes('marisco');
  const eCarnes    = nomeLower.includes('carne') || nomeLower.includes('ave') || nomeLower.includes('caca');
  const ePastelaria= nomeLower.includes('pastelaria') || nomeLower.includes('cremes') || nomeLower.includes('massas');
  const eCozPortuguesa = nomeLower.includes('tradicional portuguesa') || nomeLower.includes('cozinha portuguesa');
  const eCozInternacional = nomeLower.includes('internacional');

  // Bloco de conhecimento específico por tema
  let blocoTema = '';
  if (ePeixes) {
    blocoTema = [
      'CONHECIMENTO ESPECIALIZADO OBRIGATORIO PARA ESTA UC:',
      '',
      'CLASSIFICACAO E BIOLOGIA DO PESCADO:',
      '- Peixes osseos redondos (forma cilindrica, olhos laterais): robalo, dourada, salmao, atum, sardinha, carapau, pargo, linguado nao — explica caracteristicas anatomicas, habitats, epocas de pesca',
      '- Peixes osseos achatados (forma laminar, olhos no dorso): linguado, pregado, solha, rodovalho — explica a metamorfose larvar e porque os olhos migram para o mesmo lado',
      '- Peixes cartilaginosos (esqueleto de cartilagem, sem ossos): cao, raia, tubarao — caracteristicas culinarias distintas, textura, sabor, metodos de preparacao',
      '- Peixes de agua doce: truta, enguia, lampreia (este ultimo migratorio e protegido) — particularidades de conservacao e confeção',
      '- Cefalopodes: polvo, lula, choco, sibila — anatomia (saco de tinta, tentaculos, osso de choco), tecnicas de limpeza especificas, mudancas de textura na confeção',
      '- Crustaceos: camarao, lagostim, lagosta, sapateira, caranguejo — anatomia, como retirar a carne, tecnicas de cozedura',
      '- Bivalves e outros moluscos: amêijoa, mexilhao, ostra, vieira, percebes — como verificar frescura (devem estar fechados), como purgar, como abrir',
      '',
      'CRITERIOS DE FRESCURA E QUALIDADE:',
      '- Peixe fresco: olhos salientes e transparentes (turvo = velho), guelras vermelho-vivas (castanho = deteriorado), escamas aderentes e brilhantes, carne firme e elastica ao toque, cheiro a mar e algas (nunca a amoniaco)',
      '- Tabela de inspecao organoletica completa com pontuacao: cada caracteristica tem criterios precisos de avaliacao de 1 a 5',
      '- Classificacao comercial: categorias Extra, A, B — o que distingue cada uma',
      '- Rotulagem obrigatoria: nome da especie, zona FAO de captura, metodo de producao (pescado/aquacultura), data de embalamento',
      '',
      'ANISAKIS E SEGURANCA ALIMENTAR:',
      '- O que e o Anisakis simplex: parasita nematode presente em peixe cru, causa anisakiase no ser humano',
      '- Especies de risco: sardinha, cavala, arenque, salmao selvagem, bacalhau fresco, robalo — lista completa',
      '- Eliminacao: congelacao a -20C durante minimo 24h (Reg CE 853/2004) OU confeção a temperatura interna superior a 60C',
      '- Estabelecimentos que servem peixe cru (sushi, carpaccio, gravlax) tem obrigacao legal de congelar previamente',
      '',
      'TAMANHOS MINIMOS DE CAPTURA (DGRM/UE):',
      '- Tabela completa: robalo 36cm, dourada 20cm, linguado 24cm, sardinha 11cm, atum rabilho 115cm, lagosta 22cm total — explica porque estes limites existem e o que acontece se forem infringidos',
      '',
      'SAZONALIDADE DO PESCADO PORTUGUES:',
      '- Tabela mes a mes: que especies estao em epoca, quais estao fora de epoca, veducoes de pesca',
      '- Sardinha: defeso de junho a setembro — porque e importante respeitar',
      '- Espada preta: pesca na Madeira, particularidades',
      '',
      'TECNICAS DE PREPARACAO DETALHADAS:',
      '- Esviscerar peixe redondo: incisao ventral, remover visceras, lavar; diferente do peixe achatado',
      '- Filetar peixe redondo: tecnica passo a passo, angulo da faca, aproveitamento de espinhas para caldo',
      '- Filetar peixe achatado: 4 filetes por peixe — tecnica especifica diferente do peixe redondo',
      '- Escalar: quando e porque se usa (quando vai assar inteiro)',
      '- Calcular rendimento: tabela com IR% por especie (ex: sardinha 55%, robalo 45%, linguado 35%)',
      '- Limpar polvo: remover bico, olhos, saco de tinta; bater para amaciar (metodo tradicional vs freezer)',
      '- Limpar lula: separar manto de tentaculos, remover pena transparente, abrir o manto',
      '- Purgar bivalves: agua salgada 30g/l, 2h no frigorifico, renovar agua',
    ].join('\n');
  } else if (eCarnes) {
    blocoTema = [
      'CONHECIMENTO ESPECIALIZADO OBRIGATORIO PARA ESTA UC:',
      '',
      'ANATOMIA E CLASSIFICACAO DE CARNES:',
      '- Bovino: diagrama completo de cortes (cachaço, entrecosto, vazia, lombo, alcatra, ponta de alcatra, chambao, acém, coxao mole/duro, pojadouro) — para cada corte: localizacao anatomica, nivel de colagénio, metodo de confeção ideal, tempo e temperatura',
      '- Suino: lombinho, costeleta, entrecosto, pernil, cachaço, barriga — caracteristicas de cada corte, temperatura interna de seguranca (72C minimo para eliminar Trichinella)',
      '- Ovino/Caprino: cordeiro vs borrego vs carneiro — diferenca de idade e sabor; cortes especificos, especialidades regionais portuguesas',
      '- Aves: frango, peru, pato, ganso, codorniz, pombo — caracteristicas da carne (branca vs escura), temperaturas internas de seguranca (82C para aves, Salmonella e Campylobacter)',
      '- Caca: lebre, coelho, perdiz, faisao, veado, javali — particularidades (maridagem longa, sabor intenso, marinadas com zimbro e vinho tinto)',
      '- Classificacao comercial: categorias de qualidade, raças DOP (Bísaro, Barrosao, Alentejano)',
      '',
      'CRITERIOS DE QUALIDADE E FRESCURA:',
      '- Carne bovina fresca: cor vermelho vivo (nao castanho-acinzentado), textura firme e elastica, gordura de cor creme/amarela conforme raca, odor ligeiro e caracteristico',
      '- Maturacao a seco vs humida: o que acontece ao nivel do colagénio e das enzimas, quantos dias, temperaturas',
      '- Rigor mortis: quando acontece, quanto dura, porque a carne se torna tenra depois',
      '',
      'TECNICAS DE PREPARACAO:',
      '- Desossar uma perna de borrego: passo a passo detalhado',
      '- Frango: como partir em 8 pecas, como preparar suprema, como retirar o lombo',
      '- Lardear e mechar: tecnicas de introducao de gordura em carnes magras (ex: javali, lebre)',
      '- Marinar: funcao tecnica (abrandamento do colagénio, penetracao de sabores), proporcoes, tempos por tipo de carne',
      '- Calcular rendimento: tabela com IR% (ex: frango inteiro 65%, lombo de vaca 85%, perna de borrego com osso 55%)',
    ].join('\n');
  } else if (ePastelaria) {
    blocoTema = [
      'CONHECIMENTO ESPECIALIZADO OBRIGATORIO PARA ESTA UC:',
      '',
      'CIENCIA DOS INGREDIENTES DE PASTELARIA:',
      '- Farinha: tipos (T55, T65, T80, integral), gluten e sua formacao, porque e importante o tipo certo para cada massa',
      '- Ovos: funcoes tecnicas (emulsionante, coagulante, espumante, colorante), diferenca entre usar gema/clara/ovo inteiro, pasteurizacao',
      '- Acucar: tipos (refinado, brun, em po, invertido, isomalt, glucose), pontos de calda (veio, bola mole, bola dura, caramelo), como se formam cristais e como evitar',
      '- Gorduras: manteiga (84% gordura, emulsao agua em gordura), margarina, natas (30% vs 35% gordura), funcao em cada massa',
      '- Fermento: biologico vs quimico vs fisico (ar batido) — mecanismo de cada um, quando usar cada tipo',
      '',
      'MASSAS BASE — TECNICA COMPLETA:',
      '- Massa folhada: 27 camadas de gordura, tecnica de laminagem, quantas voltas, porque sobe, temperatura critica da manteiga (deve estar a 18C), erros comuns e causas',
      '- Massa quebrada doce e salgada: metodo por areia vs metodo por creme, diferenca de textura, porque nao trabalhar em excesso',
      '- Massa choux: porque incha (vapor de agua), proporcao agua:gordura:farinha:ovos, ponto da massa, erros (nao incha, enruga)',
      '- Massa levedada: brioche, croissant — desenvolvimento do gluten, fases de fermentacao, temperatura ideal',
      '- Biscuit, genoise, dacquoise: diferenca entre os tres, tecnicas de incorporacao das claras',
      '',
      'CREMES E MOLHOS DE PASTELARIA:',
      '- Creme pasteleiro: proporcao base, temperatura de cozedura (85C para gelatinizar amido sem coalhar ovo), arrefecimento rapido obrigatorio, variantes (mousseline, diplomatico, chiboust)',
      '- Creme chantilly: natas a 4C, teor de gordura minimo 35%, ponto certo vs excesso (manteiga)',
      '- Ganache: proporcoes chocolate/natas por tipo de cobertura, emulsificacao',
      '- Caramelo seco vs humido: tecnicas, como trabalhar sem cristalizar',
    ].join('\n');
  } else if (eCozPortuguesa) {
    blocoTema = [
      'CONHECIMENTO ESPECIALIZADO OBRIGATORIO PARA ESTA UC:',
      '',
      'HISTORIA E CONTEXTO CULTURAL:',
      '- Influencias arabes (sec VIII-XV): amendoa, arroz, alucar, canela, acafrao — quais pratos de hoje vem desta heranca',
      '- Descobrimentos (sec XV-XVI): tomate, batata, milho, feijao, malagueta do Brasil; especiarias do Oriente (pimenta, cravinho, noz moscada, gengibre) — como mudaram a cozinha europeia e portuguesa',
      '- Doçaria conventual: porque os conventos foram os grandes centros culinarios (clarificacao de vinho com claras, sobra de gemas), lista de doces e o convento/mosteiro de origem de cada um',
      '- O bacalhau: historia das pescarias no Grand Banks desde sec XVI, processo de salga e secagem, porque se tornou o "fiel amigo", consumo atual de 7kg per capita/ano',
      '',
      'REGIOES GASTRONOMICAS — DESENVOLVER CADA UMA EM PROFUNDIDADE:',
      '',
      'MINHO E DOURO LITORAL:',
      '- Produtos identitarios: milho (broa, papas), feijao verde, caldo verde, fumeiros (chouriço, linguiça, morcela, alheira de Mirandela DOP), vinho verde, leitao',
      '- Pratos emblematicos: caldo verde (historia, porque e o prato nacional informal), rojoes a minhota (como se fazem), bacalhau com broa (tecnica da crosta), papas de sarrabulho (o que e o sarrabulho)',
      '- Tecnicas predominantes: cozedura lenta em panela de ferro, fumagem artesanal, aproveitamento total do porco',
      '',
      'TRAS-OS-MONTES E ALTO DOURO:',
      '- Produtos: amendoa, castanha, fumeiros transmontanos (presunto de Barroso IGP, alheira de Mirandela DOP), azeite DOP Tras-os-Montes, posta mirandesa (raça Mirandesa DOP)',
      '- Pratos: posta mirandesa (o que a torna especial — marmoreado da raça, grelhar a alta temperatura), sopa transmontana, trutas do Douro, perdiz e lebre da charneca',
      '- Contexto: regiao de interior frio — cozinha robusta e energetica, uso extensivo da gordura de porco e do azeite',
      '',
      'BEIRAS (BEIRA ALTA, BEIRA BAIXA, BEIRA LITORAL):',
      '- Produtos: queijo da Serra da Estrela DOP (unico queijo de pasta mole e untuosa feito com cardo), leitao da Bairrada (raça bísaro, assado em forno de lenha), chanfana (cabra velha ou borrego em barro com vinho tinto)',
      '- Pratos: leitao da Bairrada (tecnica — salmoura, forno a 200C, pele estaladiça), chanfana de cabra (origem, porque usa cabra velha, barro negro, vinho da regiao), enguias (Aveiro), percebes (litoral)',
      '- Particularidade: zona de transicao entre norte robusto e sul mais suave — maior diversidade de produtos',
      '',
      'ESTREMADURA E RIBATEJO:',
      '- Produtos: frutas de Obidos e Sintra, atum de Setúbal, arroz do Ribatejo, vinho de Bucelas e Colares',
      '- Pratos: caldeirada a fragateira, bacalhau a Bras (origem em Lisboa, tabernas do seculo XIX), iscas com elas (figado de vitela com batatas), cozido a portuguesa (o mais completo — lista de todos os componentes tradicionais)',
      '- Contexto de Lisboa: cidade cosmopolita que absorveu influencias de todo o imperio — diversidade unica',
      '',
      'ALENTEJO:',
      '- Produtos: porco alentejano (raça iberica, montanhas de azinha e sobreiro, DOP), azeite alentejano DOP, ques de evora, ervilhas, cilantro e coentros (herbas dominantes)',
      '- Pratos: acorda alentejana (pao, alho, coentros, azeite, ovo pochado — origem na pobreza, agora considerada alta gastronomia), migas alentejanas (pao de véspera, encharcado em caldo, com carne de porco), ensopado de borrego, sopa de cacao (com coentros — obrigatorio)',
      '- Contexto: regiao quente e seca, tradicao de pastoricio e suinicultura extensiva, cozinha de pastores e lavradores',
      '',
      'ALGARVE:',
      '- Produtos: amendoa (DOP Algarve), figo (doçaria de figo e amendoa), percebes, lagostas, atum (Sagres e Vila Real de Santo Antonio, industria conserveira historica)',
      '- Pratos: cataplana (o utensilio e a tecnica — como funciona, pratos iconicos: amêijoas com presunto, marisco), caldeirada algarvia, xerem (canjica de milho com conquilhas), doces de amendoa (historia arabe)',
      '- Contexto: influencia arabe mais forte no sul — amendoa, figo, citrinos; proximidade ao Mar de Alborao = marisco e atum',
      '',
      'AÇORES E MADEIRA:',
      '- Acores: cozido das Furnas (cozido pelo calor geotermico vulcanico, Ilha de S. Miguel — unico no mundo), alcatra terceirense (boi, vinho da Terceira, especiarias, pote de barro), ananás dos Açores DOP, queijo de S. Jorge DOP',
      '- Madeira: espada com banana (peixe-espada preto — especie profunda, capturado a mais de 1000m, servido com banana por contraste de sabores), espetada madeirense (carne no pau de louro), bolo do caco, ponche madeirense',
      '',
      'TECNICAS TRANSVERSAIS DA COZINHA PORTUGUESA:',
      '- O refogado: base de quase tudo — cebola + alho + azeite + tomate; proporcoes classicas, erros comuns',
      '- Caldeiradas: tecnica de cozedura em camadas sem mexer, a diferenca entre caldeirada de peixe, de polvo e de enguia',
      '- Migas: aproveitamento do pao seco — tecnica de molha do pao, ponto correto',
      '- Bacalhau: os 7 metodos de confeção mais importantes — cozido, assado, a Bras, a Gomes de Sá, a Zé do Pipo, com natas, lagareiro — diferencas tecnicas de cada um',
    ].join('\n');
  } else if (eCozInternacional) {
    blocoTema = [
      'CONHECIMENTO ESPECIALIZADO OBRIGATORIO:',
      'Desenvolve 6 cozinhas internacionais com a mesma profundidade da cozinha portuguesa:',
      '- Francesa: molhos-mae (bechamel, veloute, espanhol, holandes, tomate), brigade de cozinha de Escoffier, haute cuisine vs brasserie vs bistro',
      '- Italiana: massas frescas vs secas, risotto (tecnica do mantecatura), pizza napolitana (farinha 00, fermentacao longa, forno a 450C), diferença entre regioes (norte vs sul)',
      '- Asiatica: tecnicas de wok (fogo alto, movimento constante), sushi (preparacao do arroz, temperatura do peixe), dim sum, curry (bases de especiarias por regiao)',
      '- Espanhola: paella valenciana (tecnica do socarrat), jamon iberico (criacao do porco, processo de cura, categorias), tapas vs raciones, molecular (Ferran Adria)',
      '- Norte-americana e ibero-americana: BBQ (defumacao, tipos de madeira, temperaturas baixas e lentas), ceviche peruano (desnaturacao proteica pelo acido citrico sem calor), mole mexicano (30+ ingredientes)',
      '- Mediterranica: azeite, ervas aromaticas (oregaos, tomilho, rosmaninho, salva), leguminosas, peixe, dieta mediterrânica e evidencia cientifica',
    ].join('\n');
  } else {
    blocoTema = 'Desenvolve o tema desta UC com a mesma profundidade de um manual profissional especializado — cada conceito explicado do ponto de vista tecnico, cientifico e cultural.';
  }

  const INSTRUCOES_GERAIS = [
    'INSTRUCOES GERAIS DE QUALIDADE (aplicar em todas as partes):',
    '',
    '1. PROFUNDIDADE PROFISSIONAL: Cada topico deve ser desenvolvido como um profissional que ensina a outro profissional.',
    '   Nao basta dizer "o peixe deve ser fresco" — tens de dizer COMO avaliar a frescura, QUAIS os criterios especificos, O QUE acontece quando deteriora.',
    '   Nao basta dizer "assar a 180C" — tens de explicar POR QUE essa temperatura, O QUE acontece fisico-quimicamente, COMO saber quando esta pronto.',
    '',
    '2. TABELAS: Usa tabelas de 4 colunas como elemento dominante. Cada capitulo deve ter pelo menos 2 tabelas.',
    '   Exemplos: tabela de especies com caracteristicas; tabela de metodos com parametros; tabela de cortes com aplicacoes.',
    '',
    '3. FICHAS TECNICAS: Minimo 6 fichas tecnicas completas com: nome, doses (4), tempo prep, tempo confeção, metodo,',
    '   ingredientes com quantidades brutas e liquidas, preparacao passo a passo numerado, pontos criticos HACCP, nota do chef.',
    '',
    '4. FICHAS DE TRABALHO: 3 fichas de trabalho com tabelas para preenchimento pelo aluno:',
    '   Ficha 1: avaliacao de materia-prima (criterios de qualidade por produto)',
    '   Ficha 2: calculo de rendimento e custo (formula IR = peso liquido / peso bruto × 100)',
    '   Ficha 3: comparacao de metodos de confeção ou analise sensorial',
    '',
    '5. EXERCICIOS PRATICOS: No minimo 2 exercicios por capitulo — situacoes reais de brigada, calculos, tomadas de decisao.',
    '',
    '6. CAIXAS DE DESTAQUE: Usa caixas de destaque com etiqueta:',
    '   [DICA DO CHEF] para conselhos profissionais',
    '   [CIENCIA NA COZINHA] para explicacoes cientificas',
    '   [HACCP] para pontos criticos de controlo',
    '   [ERROS FREQUENTES] para erros comuns e como evitar',
    '   [SABIA QUE] para curiosidades historicas/culturais',
    '',
    '7. HACCP INTEGRADO: Os limites reais devem aparecer sempre que relevante:',
    '   refrigeracao 0-4C; congelacao -18C; confeção minima 65C no centro termico; regra 2h (zona perigo 5-65C);',
    '   Anisakis: -20C/24h para peixe cru; tabuleiros por cor: azul=pescado, vermelho=carnes, verde=vegetais, branco=prontos.',
    '',
    '8. FONTES REAIS: Cita sempre fontes reais — ANQEP, AHRESP/DGS, Reg CE 852/2004 e 853/2004, Reg UE 1169/2011,',
    '   Maincent-Morel, McGee On Food and Cooking, Le Cordon Bleu, Maria de Lourdes Modesto, Turismo de Portugal.',
    '',
    '9. PORTUGUES EUROPEU pre-Acordo: Objectivos, actual, confeccao, tecnico, confeção, practico.',
    '',
    '10. ANO LECTIVO: Usar sempre 2026-2027.',
  ].join('\n');

  const cabStr = cabecalho;
  const refStr = realizacoesStr;
  const critStr = criteriosStr;
  const conhStr = conhecimentosStr;
  const temaStr = blocoTema;
  const instrStr = INSTRUCOES_GERAIS;

  const prompts = [
    // ── PARTE 1 ─────────────────────────────────────────────
    [
      'Vais escrever a PARTE 1 de 5 de um MANUAL DE FORMACAO PROFISSIONAL (minimo 15 paginas densas).',
      'UC: ' + modulo.nome,
      'Referencial: ' + ref_,
      'Ano lectivo: 2026-2027',
      '',
      'COMPETENCIAS DESTA UC (do referencial oficial ANQEP):',
      'Realizacoes: ' + refStr,
      'Criterios de desempenho: ' + critStr,
      'Conhecimentos/aptidoes: ' + conhStr,
      '',
      temaStr,
      '',
      instrStr,
      '',
      'CONTEUDO DA PARTE 1:',
      '- Pagina de rosto com todos os dados da UC (cabecalho abaixo)',
      '- Nota de apresentacao do manual (contexto profissional, para que serve, como usar)',
      '- Enquadramento no referencial: tabela completa (codigo, designacao, componente, ano, nivel QNQ, horas, pre-requisitos, bloco)',
      '- Objectivos de aprendizagem: desenvolve cada realizacao como objectivo detalhado (nao lista — escreve o que o aluno vai ser capaz de fazer, com precisao tecnica)',
      '- Indice geral do manual (com todos os capitulos e seccoes)',
      '- Capitulo 1: Contexto profissional e cultural — historia, importancia no sector, contexto nacional/internacional, perfil do profissional que domina esta UC',
      '- Capitulo 2: Tecnologia das materias-primas — DESENVOLVE COM TODA A PROFUNDIDADE DO BLOCO DE TEMA ACIMA',
      '   Cada tipo de produto: classificacao completa, caracteristicas, criterios de qualidade, tabela de avaliacao, o que muda na cozinha',
      '- Exercicios praticos em cada capitulo',
      '- Caixas de destaque em cada capitulo',
      '',
      'CABECALHO DO DOCUMENTO:',
      cabStr,
    ].join('\n'),

    // ── PARTE 2 ─────────────────────────────────────────────
    [
      'Vais escrever a PARTE 2 de 5 de um MANUAL DE FORMACAO PROFISSIONAL (minimo 15 paginas densas).',
      'UC: ' + modulo.nome + ' | Ano lectivo: 2026-2027',
      '',
      temaStr,
      '',
      instrStr,
      '',
      'CONTEUDO DA PARTE 2 (continuacao — nao repetir o que foi dito na Parte 1):',
      '- Capitulo 3: Aprovisionamento, recepcao e conservacao',
      '   Fluxo completo: encomenda -> recepcao -> armazenagem -> utilizacao',
      '   Recepcao: o que verificar em cada categoria de produto, documentacao obrigatoria, temperaturas maximas de recepcao',
      '   Armazenagem: principio FEFO, separacao por categorias, temperaturas por zona (congelados/refrigerados/secos)',
      '   HACCP: cadeia de frio completa com temperaturas, perigos por etapa, medidas correctivas',
      '   Rastreabilidade: o que e, documentacao necessaria, porque e obrigatoria (Reg CE 178/2002)',
      '   Alergenios: os 14 alergenios de declaracao obrigatoria (Reg UE 1169/2011), como gerir contaminacao cruzada',
      '- Capitulo 4: Pre-preparacao e mise en place',
      '   Organizacao do posto de trabalho segundo as brigadas',
      '   Operacoes de pre-preparacao especificas DESTA UC (com tecnica detalhada para cada uma)',
      '   Calculo de rendimentos: formula IR, tabela de IR por produto especifico desta UC, exercicio de calculo',
      '   Calculo de custo por dose: formula, exemplo resolvido completo',
      '   Equipamentos e utensilios: tabela com nome, funcao, como usar, como limpar',
      '- Capitulo 5: Metodos de confeção especificos desta UC',
      '   Para CADA metodo relevante: descricao tecnica, o que acontece fisico-quimicamente, temperaturas, tempos,',
      '   pontos de cozedura, como verificar, tabela comparativa, pelo menos 2 exemplos de pratos reais',
      '   Reaccao de Maillard: quando ocorre, a que temperatura, porque e importante, como controlar',
      '- Exercicios praticos em cada capitulo',
      '- Caixas de destaque',
    ].join('\n'),

    // ── PARTE 3 ─────────────────────────────────────────────
    [
      'Vais escrever a PARTE 3 de 5 de um MANUAL DE FORMACAO PROFISSIONAL (minimo 10 paginas densas).',
      'UC: ' + modulo.nome + ' | Ano lectivo: 2026-2027',
      '',
      instrStr,
      '',
      'CONTEUDO DA PARTE 3:',
      '- Capitulo 6: Molhos, fundos e guarniciones especificos desta UC',
      '   Para cada molho/fundo: historia/origem, ingredientes com proporcoes exactas para 4 doses,',
      '   preparacao passo a passo, erros comuns e como corrigir, variantes e aplicacoes',
      '- Capitulo 7: Empratamento e analise sensorial',
      '   5 principios fundamentais do empratamento profissional (com exemplos)',
      '   Temperatura de servico por categoria de prato (tabela)',
      '   Grelha de analise sensorial preenchivel: aspecto, aroma, sabor, textura, temperatura',
      '   Harmonizacao com vinhos portugueses (pelo menos 5 exemplos especificos)',
      '- Capitulo 8: Sustentabilidade, sazonalidade e economia circular',
      '   Tabela de sazonalidade mes a mes (especifica para os produtos desta UC)',
      '   Aproveitamento integral: o que fazer com cada tipo de apara (lista especifica)',
      '   Calculo de desperdicio: formula, exemplo, metas de reducao',
      '   Produtos DOP/IGP relevantes para esta UC: lista com origem, caracteristicas, onde comprar',
      '- FICHA DE TRABALHO N.1: Avaliacao de materias-primas',
      '   (tabela completa para preenchimento pelo aluno, criterios especificos desta UC)',
      '- FICHA DE TRABALHO N.2: Calculo de rendimento e custo',
      '   (com formula, espaco de calculo, exercicio guiado)',
      '- FICHA DE TRABALHO N.3: Comparacao de metodos ou analise sensorial',
      '   (tabela comparativa para preenchimento, espaco de reflexao)',
    ].join('\n'),

    // ── PARTE 4 ─────────────────────────────────────────────
    fichasTexto
      ? '# CAPITULO 14 — FICHAS TECNICAS DE RECEITA\n\nFichas elaboradas em aula para ' + modulo.id + ':\n\n' + fichasTexto
      : [
          'Vais escrever a PARTE 4 de 5 de um MANUAL DE FORMACAO PROFISSIONAL (minimo 12 paginas densas).',
          'UC: ' + modulo.nome + ' | Ano lectivo: 2026-2027',
          '',
          instrStr,
          '',
          'CONTEUDO DA PARTE 4 — FICHAS TECNICAS DE RECEITA:',
          'Elabora 10 fichas tecnicas completas, representativas desta UC.',
          'As receitas devem cobrir diferentes metodos de confeção e diferentes produtos desta UC.',
          'Para receitas da cozinha portuguesa: inclui contexto historico/regional de cada receita.',
          '',
          'FORMATO OBRIGATORIO PARA CADA FICHA:',
          '| DESIGNACAO | [nome] | CATEGORIA | [categoria] |',
          '| N. DE DOSES | 4 | CUSTO APROX. | [valor] |',
          '| TEMPO PREP | [x] min | TEMPO CONFEÇÃO | [x] min |',
          '| METODO | [metodo] | DIFICULDADE | [nivel] |',
          '',
          'INGREDIENTES (tabela com 4 colunas):',
          '| Ingrediente | Quant. Bruta | Quant. Liquida | Observacoes |',
          '',
          'PREPARACAO: lista numerada passo a passo, incluindo temperaturas e tempos precisos',
          '',
          'PONTOS CRITICOS HACCP (tabela):',
          '| Etapa | Perigo | Limite Critico | Medida Correctiva |',
          '',
          'NOTA DO CHEF: conselho tecnico, variante regional, erro mais comum a evitar',
          '',
          'As 10 fichas devem incluir:',
          '- Pelo menos 2 sopas ou entradas',
          '- Pelo menos 4 pratos principais com tecnicas diferentes',
          '- Pelo menos 2 guarniciones ou acompanhamentos',
          '- Pelo menos 2 sobremesas ou doces (se relevante para a UC)',
          '- Mistura de preparacoes classicas e contemporaneas',
        ].join('\n'),

    // ── PARTE 5 ─────────────────────────────────────────────
    [
      'Vais escrever a PARTE 5 de 5 de um MANUAL DE FORMACAO PROFISSIONAL (minimo 10 paginas densas).',
      'UC: ' + modulo.nome + ' | Ano lectivo: 2026-2027',
      '',
      instrStr,
      '',
      'CONTEUDO DA PARTE 5:',
      '- DESENVOLVIMENTO DE PROJECTO (Capitulo 13):',
      '   Titulo do projecto ligado a esta UC',
      '   7 etapas detalhadas com o que fazer em cada uma',
      '   Tabela de criterios de avaliacao com ponderacoes percentuais',
      '   Exemplo resolvido completo de um projecto (com documentos reais)',
      '',
      '- QUESTIONARIO DE REVISAO GLOBAL (Capitulo 15):',
      '   4 grupos tematicos com 4 questoes cada (total 16)',
      '   Grupo 1: Higiene e seguranca alimentar',
      '   Grupo 2: Tecnicas especificas desta UC',
      '   Grupo 3: Planeamento e organizacao',
      '   Grupo 4: Sustentabilidade e qualidade',
      '   Cada questao com linhas de resposta; mistura de escolha multipla e desenvolvimento',
      '',
      '- GLOSSARIO TECNICO (15 termos):',
      '   Termos tecnicos especificos desta UC — definicao precisa e aplicacao pratica',
      '',
      '- SINTESE FINAL:',
      '   10 pontos-chave desta UC em lista clara',
      '   O que o aluno deve saber fazer no fim desta formacao',
      '',
      '- BIBLIOGRAFIA E FONTES:',
      '   Lista completa de fontes reais usadas neste manual',
      '',
      '- ANEXO A: Modelo de ficha tecnica em branco (para usar nas aulas)',
      '- ANEXO B: Folha-resumo de temperaturas HACCP e sazonalidade (destacavel)',
      '- INDICE FINAL: tabela com todos os capitulos e paginas estimadas',
    ].join('\n'),
  ];

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
              background: nivel.bg, color: nivel.cor, fontWeight: 600 }}>
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
    onGuardar({
      id: entrada?.id || gerarId(),
      titulo: titulo.trim(), categoria, nivel,
      palavrasChave: palavras.split(',').map((p: string) => p.trim()).filter(Boolean),
      textoGuia: texto.trim(),
      criadoPor: nomeProfessor,
      criadoEm: entrada?.criadoEm || agora,
      atualizadoEm: agora,
    });
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

            {/* Botao unico — gera o manual completo (5 partes em cadeia no Apps Script) */}
            <button
              onClick={gerarManual}
              disabled={!moduloSel || gerandoIA}
              style={{
                width: '100%', padding: '13px', borderRadius: 10, border: 'none',
                background: !moduloSel || gerandoIA ? 'rgba(109,40,217,0.3)' : COR_IA,
                color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: !moduloSel || gerandoIA ? 'not-allowed' : 'pointer',
              }}>
              {gerandoIA ? ('⏳ ' + faseIA) : '✨ Gerar manual completo (50 pag.)'}
            </button>
            {gerandoIA && (
              <div style={{ fontSize: 11, color: COR_IA, textAlign: 'center', marginTop: 4 }}>
                O manual e gerado em 5 partes — pode demorar 60 a 90 segundos.
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
                    border: `2px solid ${nivel === n ? c.cor : 'rgba(26,23,20,0.1)'}`,
                    background: nivel === n ? c.bg : '#fff',
                    color: nivel === n ? c.cor : 'rgba(26,23,20,0.5)',
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
              background: nivel.bg, color: nivel.cor, fontWeight: 700 }}>
              {entradaAtiva.nivel}
            </span>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20,
            fontWeight: 700, color: '#faf7f2', lineHeight: 1.2 }}>
            {entradaAtiva.titulo}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(247,241,230,0.4)', marginTop: 6 }}>
            {entradaAtiva.criadoPor} · {fmtData(entradaAtiva.criadoEm)}
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
              border: `1.5px solid ${ativo ? (c?.cor || COR_PRIMARIA) : 'rgba(26,23,20,0.1)'}`,
              background: ativo ? (c?.bg || COR_PRIMARIA) : '#fff',
              color: ativo ? (c?.cor || '#fff') : 'rgba(26,23,20,0.4)', cursor: 'pointer',
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

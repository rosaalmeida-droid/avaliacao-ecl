import React, { useState } from 'react';
import { Comanda } from '../types';
import { Button, Card, Field } from './ui';
import { addOrUpdateFichaProducao, getFichasProducao, getPlanosAulaPorTurma, buscarFichasSimilares, addOrUpdatePlanoAula, getPlanosAula } from '../backend';
import { CaixaGuia } from './GuiaProducao';
import { sugerirSubtecnicas } from '../subtecnicas';
import { exportDOCX, exportPDF } from '../exportFicha';
import { detetarAlergenicos, formatarAlergenicos, Alergenico } from '../alergenicos';
import { calcularNutricao, InfoNutricional } from '../nutricao';

// ============================================================
// Tabela de conversão de medidas culinárias para gramas/ml
// ============================================================

// Peso base por medida (em gramas/ml, para ingrediente genérico)
const PESO_MEDIDA: Record<string, number> = {
  'colher de sopa': 15,
  'c.s.': 15,
  'cs': 15,
  'colher de sobremesa': 10,
  'colher de chá': 5,
  'c.c.': 5,
  'cc': 5,
  'copo': 200,
  'chávena': 240,
  'pitada': 1,
  'xícara': 240,
};

// Fator de correção por ingrediente (multiplicar pelo peso base)
const FATOR_INGREDIENTE: Record<string, number> = {
  'farinha': 0.67,        // 1cs farinha ≈ 10g
  'açúcar': 1.0,          // 1cs açúcar ≈ 15g
  'açúcar em pó': 0.8,
  'sal': 1.2,             // 1cs sal ≈ 18g
  'azeite': 0.93,         // 1cs azeite ≈ 14g
  'óleo': 0.93,
  'manteiga': 1.0,        // 1cs manteiga ≈ 15g
  'mel': 1.4,             // 1cs mel ≈ 21g
  'cacau': 0.53,          // 1cs cacau ≈ 8g
  'fermento': 0.6,        // 1cs fermento ≈ 9g
  'maizena': 0.67,
  'amido': 0.67,
  'leite': 1.0,           // líquido = 1g/ml
  'natas': 1.0,
  'água': 1.0,
  'vinagre': 1.0,
  'molho': 1.0,
  'arroz': 0.87,          // 1 copo arroz ≈ 174g
};

const LIMIAR_MANTER_MEDIDA = 20; // abaixo de 20g → manter medida original

function converterMedida(qt: string, un: string, produto: string): { qtFinal: string; unFinal: string; obs: string } {
  const unLower = un.toLowerCase().trim();
  const produtoLower = produto.toLowerCase();

  // q.b. e similares — não converter
  if (/q\.?\s*b\.?|a\s+gosto|conforme|quanto\s+baste/i.test(unLower) || /q\.?\s*b\.?/i.test(qt)) {
    return { qtFinal: 'q.b.', unFinal: '', obs: '' };
  }

  // Verificar se é uma medida conhecida
  const medidaKey = Object.keys(PESO_MEDIDA).find(k => unLower.includes(k));
  if (!medidaKey) return { qtFinal: qt, unFinal: un, obs: '' };

  const pesoPorUnidade = PESO_MEDIDA[medidaKey];

  // Fator de ingrediente
  const fatorKey = Object.keys(FATOR_INGREDIENTE).find(k => produtoLower.includes(k));
  const fator = fatorKey ? FATOR_INGREDIENTE[fatorKey] : 1.0;

  // Quantidade numérica
  const qtNum = parseFloat(qt.replace(',', '.').replace('½', '0.5').replace('¼', '0.25').replace('¾', '0.75')) || 1;
  const gramas = Math.round(qtNum * pesoPorUnidade * fator);

  // Unidade de saída
  const isLiquido = ['leite', 'natas', 'água', 'azeite', 'óleo', 'vinagre', 'molho', 'caldo', 'sumo'].some(l => produtoLower.includes(l));
  const unSaida = isLiquido ? 'ml' : 'g';

  if (gramas < LIMIAR_MANTER_MEDIDA) {
    // Manter medida original, mostrar equivalência como observação
    return { qtFinal: qt, unFinal: un, obs: `≈ ${gramas}${unSaida}` };
  } else {
    // Mostrar em gramas/ml, com medida original como observação
    return { qtFinal: String(gramas), unFinal: unSaida, obs: `(${qt} ${un})` };
  }
}

// ============================================================
// Tipos para a ficha técnica editável
// ============================================================
interface LinhaIngrediente {
  componente: string;  // ex: "Gelado de whisky", "Cremeux", "" (sem agrupamento)
  qt: string;
  un: string;
  produto: string;
  tPrep: string;
  tConf: string;
  obs: string;
}

interface PassoPreparacao {
  num: number;
  descricao: string;
  temperatura: string;
  tempo: string;
  obs: string;
  haccp: string;
}

interface FichaTecnica {
  nomePrato: string;
  classificacao: string;
  fichaNum: string;
  alergenicos: string;
  tempoPrep: string;
  tempoConf: string;
  numPorcoes: string;
  ingredientes: LinhaIngrediente[];
  preparacao: PassoPreparacao[];
  empratamento: string;
  elaboradoPor: string;
  data: string;
  equipamento: string;
  conservacao: string;
  regeneracao: string;
  kitchenflow: string;
  tecnicasDetectadas?: string[];
  textoGuia?: string;       // texto do Guia de Apoio à Produção colado pelo professor
}

const FICHA_VAZIA: FichaTecnica = {
  nomePrato: '',
  classificacao: '',
  fichaNum: '',
  alergenicos: '',
  tempoPrep: '',
  tempoConf: '',
  numPorcoes: '',
  ingredientes: [
    { componente: '', qt: '', un: '', produto: '', tPrep: '', tConf: '', obs: '' }
  ],
  preparacao: [
    { num: 1, descricao: '', temperatura: '', tempo: '', obs: '', haccp: '' }
  ],
  empratamento: '',
  elaboradoPor: 'rosa.almeida@eclisboa.net',
  data: new Date().toLocaleDateString('pt-PT'),
  equipamento: '',
  conservacao: '',
  regeneracao: '',
  kitchenflow: '',
};

// ============================================================
// Extração automática a partir do texto da receita
// ============================================================
function limparTexto(t: string): string {
  return t.replace(/\s+/g, ' ').trim();
}

function extrairFicha(texto: string): FichaTecnica {
  const linhas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 1);

  // -------------------------------------------------------
  // NOME DO PRATO
  // Estratégia: procurar linha em maiúsculas, ou linha curta
  // no início do texto (antes de ingredientes/preparação)
  // -------------------------------------------------------
  let nomePrato = '';
  // Palavras a ignorar como nome (botões/menus comuns em sites)
  const palavrasIgnorar = /^(partilhar|imprimir|guardar|voltar|menu|home|início|pesquisar|receitas|ver mais|fechar|partilhe|login|registar|compartilhar|share|print|save|nome do prato|nome:)$/i;
  const regexTitulo = /^(receita\s+(de\s+)?)?([A-ZÁÉÍÓÚÀÃÕÂÊÎÔÛÇ][^.!?:]{3,60})$/;

  // Primeiro tentar extrair do "Title:" do Jina
  const tituloJina = texto.match(/^Title:\s*(.+)$/m);
  if (tituloJina) nomePrato = tituloJina[1].trim();

  if (!nomePrato) {
    for (const linha of linhas.slice(0, 20)) {
      const limpa = limparTexto(linha);
      if (palavrasIgnorar.test(limpa.trim())) continue;
      if (limpa.startsWith('#')) {
        // Título markdown do Jina
        const semHash = limpa.replace(/^#+\s*/, '').trim();
        if (semHash.length > 3 && semHash.length < 80 && !palavrasIgnorar.test(semHash)) {
          nomePrato = semHash;
          break;
        }
      }
      if (limpa === limpa.toUpperCase() && limpa.length > 3 && limpa.length < 80 && /[A-Z]/.test(limpa) && !palavrasIgnorar.test(limpa)) {
        nomePrato = limpa.charAt(0) + limpa.slice(1).toLowerCase();
        break;
      }
      if (/^receita\s+(de\s+)?/i.test(limpa) && limpa.length < 80) {
        nomePrato = limpa;
        break;
      }
      if (regexTitulo.test(limpa) && !nomePrato && limpa.length < 60 && !palavrasIgnorar.test(limpa)) {
        nomePrato = limpa;
      }
    }
  }

  // Limpar nome — remover "1. ", "#", "Title: " e texto após " — "
  nomePrato = nomePrato
    .replace(/^[\d]+\.\s*/, '')
    .replace(/^#+\s*/, '')
    .replace(/^Title:\s*/i, '')
    .split(' — ')[0]
    .trim()
    .slice(0, 80);

  // -------------------------------------------------------
  // DETETAR SECÇÕES
  // Marcar onde começam ingredientes e preparação
  // -------------------------------------------------------
  const regexSecIngredientes = /ingredientes?|para\s+a?\s*receita|material\s+necessário|você\s+vai\s+precisar/i;
  const regexSecPreparacao = /prepara[çc][ãa]o|modo\s+de\s+prepara|como\s+fazer|confec[çc][ãa]o|método|instru[çc][õo]es|passo\s+a\s+passo|receita/i;
  const regexSecIgnorar = /coment[aá]rios?|avalia[çc][õo]es?|notas?\s+do\s+chef|dicas?|sugest[õo]es?|ver\s+também|produtos?\s+relacionados?/i;

  let idxIngredientes = -1;
  let idxPreparacao = -1;

  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i].toLowerCase();
    if (idxIngredientes === -1 && regexSecIngredientes.test(l) && linhas[i].length < 50) idxIngredientes = i;
    if (idxPreparacao === -1 && regexSecPreparacao.test(l) && linhas[i].length < 60 && i > 0) idxPreparacao = i;
    if (regexSecIgnorar.test(l) && i > Math.max(idxIngredientes, idxPreparacao)) break;
  }

  // Se não encontrou secções, tentar detetar por padrão de conteúdo
  if (idxIngredientes === -1) {
    // Procurar a primeira linha que parece um ingrediente
    for (let i = 0; i < linhas.length; i++) {
      const limpa = limparTexto(linhas[i]);
      if (/^[\d½¼¾]+\s*(kg|g|gr|ml|dl|l|cs|cc|colher|copo|chávena|pitada|dente|ramo|un)/i.test(limpa)) {
        idxIngredientes = Math.max(0, i - 1);
        break;
      }
    }
    if (idxIngredientes === -1) idxIngredientes = 0;
  }
  if (idxPreparacao === -1) idxPreparacao = Math.floor(linhas.length / 2);

  // -------------------------------------------------------
  // DETETAR FORMATO IA (com separador |)
  // Quando o texto vem do Claude/ChatGPT com formato exato
  // -------------------------------------------------------
  const temFormatoIA = texto.includes('NOME DO PRATO:') && texto.includes('INGREDIENTES:');
  
  if (temFormatoIA) {
    // Extrair campos do formato IA
    const extrair = (campo: string) => {
      const m = texto.match(new RegExp(`${campo}:\\s*(.+)`, 'i'));
      return m ? m[1].trim() : '';
    };

    const nomeIA = extrair('NOME DO PRATO');
    const classificacaoIA = extrair('CLASSIFICAÇÃO');
    const dosesIA = texto.match(/N[ºo°]?\s*DE\s*DOSES?:\s*(\d+)/i)?.[1] ||
                    texto.match(/PORÇÕES?:\s*(\d+)/i)?.[1] ||
                    texto.match(/DOSES?:\s*(\d+)/i)?.[1] || '';
    const tPrepIA = extrair('TEMPO DE PREPARAÇÃO');
    const tConfIA = extrair('TEMPO DE CONFEÇÃO');
    const alergenicosIA = extrair('ALERGÉNICOS');

    // Ingredientes com separador |
    const secIngIA = texto.match(/INGREDIENTES:\n([\s\S]*?)(?=\nPREPARAÇÃO:|$)/i);
    const ingredientesIA: LinhaIngrediente[] = [];
    if (secIngIA) {
      const linhasIng = secIngIA[1].split('\n').filter(l => l.trim() && !l.toUpperCase().includes('COMPONENTE') && !l.toUpperCase().startsWith('INGREDIENTE'));
      for (const linha of linhasIng) {
        // Formato com | (formato preferido)
        if (linha.includes('|')) {
          const partes = linha.split('|').map(p => p.trim());
          if (partes.length >= 4 && partes[1]) {
            const qtRaw = partes[1] || '';
            const unRaw = partes[2] || '';
            const produto = partes[3] || '';
            const conv = converterMedida(qtRaw, unRaw, produto);
            ingredientesIA.push({
              componente: partes[0] || '',
              qt: conv.qtFinal,
              un: conv.unFinal,
              produto,
              tPrep: partes[4] || '',
              tConf: partes[5] || '',
              obs: conv.obs || partes[6] || '',
            });
          }
        } else {
          // Formato sem | — parse por regex (ex: "Bacalhau400gBacalhau demolhado10 min5 min⚠️...")
          // Tenta separar: componente + quantidade + unidade + produto + resto
          const m = linha.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|un|cl|dl|L|Kg|G|ML|q\.b\.|q\.b|qb)\s+(.+?)(?:\s+(\d+\s*min|\d+[\-–]\d+\s*h?))?(?:\s+(\d+\s*min|\d+[\-–]\d+\s*min?))?(?:\s+(⚠️.+|[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ].{5,}?))?$/i);
          if (m) {
            const qtRaw = m[2] || '';
            const unRaw = m[3] || '';
            const produto = m[4]?.trim() || '';
            const conv = converterMedida(qtRaw, unRaw, produto);
            ingredientesIA.push({
              componente: m[1]?.trim() || '',
              qt: conv.qtFinal,
              un: conv.unFinal,
              produto,
              tPrep: m[5] || '',
              tConf: m[6] || '',
              obs: conv.obs || m[7] || '',
            });
          } else if (linha.match(/^[A-Za-zÀ-ú]/)) {
            // fallback — linha de ingrediente sem estrutura clara
            // tenta extrair pelo menos o produto e quantidade
            const mSimples = linha.match(/^([A-Za-zÀ-ú ]+?)\s+(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|un|cl|dl|q\.b\.|q\.b|qb)?\s*(.*)/i);
            if (mSimples) {
              ingredientesIA.push({
                componente: '',
                qt: mSimples[2] || '',
                un: mSimples[3] || '',
                produto: mSimples[1]?.trim() || '',
                tPrep: '',
                tConf: '',
                obs: mSimples[4] || '',
              });
            }
          }
        }
      }
    }

    // Preparação — aceita formato com ou sem |
    const secPrepIA = texto.match(/PREPARAÇÃO:\n([\s\S]*?)(?=\nEMPRATAMENTO:|\nEQUIPAMENTO|\nCONSERVAÇÃO:|$)/i);
    const preparacaoIA: PassoPreparacao[] = [];
    if (secPrepIA) {
      const linhasRaw = secPrepIA[1].split('\n').filter(l => l.trim());
      const temPipe = linhasRaw.some(l => l.includes('|'));

      if (temPipe) {
        // Formato com | 
        const linhasPassos: string[] = [];
        for (const linha of linhasRaw) {
          if (/^NR\s*\|/i.test(linha)) continue;
          if (!linha.includes('|')) continue;
          const primeiraColuna = linha.split('|')[0].trim();
          if (/^\d+\.?\s*$/.test(primeiraColuna)) {
            linhasPassos.push(linha);
          } else if (linhasPassos.length > 0) {
            linhasPassos[linhasPassos.length - 1] += ' ' + linha.trim();
          }
        }
        for (const linha of linhasPassos) {
          const partes = linha.split('|').map(p => p.trim());
          if (partes.length >= 2 && partes[1]) {
            preparacaoIA.push({
              num: parseInt(partes[0]) || preparacaoIA.length + 1,
              descricao: partes[1] || '',
              temperatura: partes[2] || '',
              tempo: partes[3] || '',
              obs: partes[4] || '',
              haccp: partes.slice(5).join('|').trim() || '',
            });
          }
        }
      } else {
        // Formato sem | — cada linha começa com número
        let passoActual: PassoPreparacao | null = null;
        for (const linha of linhasRaw) {
          if (/^NR\s+DESCRI/i.test(linha)) continue; // cabeçalho
          const mNum = linha.match(/^(\d+)\s+(.+)/);
          if (mNum) {
            if (passoActual) preparacaoIA.push(passoActual);
            // Extrair PCC/HACCP da linha se presente
            const descCompleta = mNum[2];
            const mHaccp = descCompleta.match(/(.+?)\s+(Temperatura[^.]+\.|PCC[^.]+\.|[A-Z][a-z]+ mínima[^.]+\.)$/);
            passoActual = {
              num: parseInt(mNum[1]),
              descricao: mHaccp ? mHaccp[1].trim() : descCompleta.trim(),
              temperatura: '',
              tempo: '',
              obs: '',
              haccp: mHaccp ? mHaccp[2].trim() : '',
            };
          } else if (passoActual && linha.trim()) {
            // Continuação do passo — pode ser obs ou haccp
            if (linha.includes('°C') || linha.toLowerCase().includes('temperatura') || linha.toLowerCase().includes('pcc')) {
              passoActual.haccp = (passoActual.haccp ? passoActual.haccp + ' ' : '') + linha.trim();
            } else {
              passoActual.obs = (passoActual.obs ? passoActual.obs + ' ' : '') + linha.trim();
            }
          }
        }
        if (passoActual) preparacaoIA.push(passoActual);
      }
    }

    // Campos multilinha — regex mais permissivo
    const empratamentoIA = texto.match(/EMPRATAMENTO:\n([\s\S]*?)(?=\nEQUIPAMENTO|\nCONSERVAÇÃO|\nREGENERAÇÃO|\nREGISTOS|$)/i)?.[1]?.trim() || extrair('EMPRATAMENTO');
    const equipamentoIA = texto.match(/EQUIPAMENTO NECESSÁRIO:\n([\s\S]*?)(?=\nCONSERVAÇÃO|\nREGENERAÇÃO|\nREGISTOS|$)/i)?.[1]?.trim() || '';
    const conservacaoIA = texto.match(/CONSERVAÇÃO:\n([\s\S]*?)(?=\nREGENERAÇÃO|\nREGISTOS|$)/i)?.[1]?.trim() || '';
    const regeneracaoIA = texto.match(/REGENERAÇÃO:\n([\s\S]*?)(?=\nREGISTOS|$)/i)?.[1]?.trim() || '';
    const kitchenflowIA = texto.match(/REGISTOS KITCHENFLOW:\n([\s\S]*?)(?=\nTÉCNICAS|$)/i)?.[1]?.trim() || '';

    // Extrair técnicas detectadas — para ligar às microcompetências
    const secTecnicas = texto.match(/TÉCNICAS DETECTADAS:\n([\s\S]*?)$/i)?.[1]?.trim() || '';
    const tecnicasDetectadas = secTecnicas
      .split('\n')
      .map(l => l.trim().replace(/^[-·•]\s*/, ''))
      .filter(l => l.length > 2 && l.length < 60);

    // Alergénicos automáticos se não vieram da IA
    const produtosListIA = ingredientesIA.map(i => `${i.produto} ${i.obs}`);
    const alergenicosFinais = alergenicosIA || formatarAlergenicos(detetarAlergenicos(produtosListIA));

    return {
      ...FICHA_VAZIA,
      nomePrato: nomeIA,
      classificacao: classificacaoIA,
      numPorcoes: dosesIA,
      tempoPrep: tPrepIA,
      tempoConf: tConfIA,
      alergenicos: alergenicosFinais,
      ingredientes: ingredientesIA.length > 0 ? ingredientesIA : [{ componente: '', qt: '', un: '', produto: '', tPrep: '', tConf: '', obs: '' }],
      preparacao: preparacaoIA.length > 0 ? preparacaoIA : [{ num: 1, descricao: '', temperatura: '', tempo: '', obs: '', haccp: '' }],
      empratamento: empratamentoIA,
      equipamento: equipamentoIA,
      conservacao: conservacaoIA,
      regeneracao: regeneracaoIA,
      kitchenflow: kitchenflowIA,
      tecnicasDetectadas,
    };
  }
  // "sal q.b.", "2 colheres de sopa de azeite"
  // -------------------------------------------------------
  const regexLixo = /cookies?|newsletter|privacidade|copyright|©|todos os direitos|pingo doce|continente|informação nutricional|avalia[çc][ãa]o desta receita|subscrição|obrigatório|nível de ameaça|allothunnus|thunnus|oncorhynchus|salmo salar|pesquisas recentes|ecrã ligado|encomendas via/i;

  const regexQtd = /^([\d.,/½¼¾]+\s*)?(kg|g|gr|mg|l|lt|ml|dl|cl|colher[es]*\s+de\s+(sopa|sobremesa|chá|café)|c\.s\.|c\.c\.|cs|cc|copo[s]?|chávena[s]?|pitada[s]?|q\.?\s*b\.?|un|unidade[s]?|dente[s]?|ramo[s]?|folha[s]?|fatia[s]?|rodela[s]?|cubo[s]?|pacote[s]?|lata[s]?|embalagem|maço[s]?)\s*/i;
  const regexIngSimples = /^([\d.,/½¼¾]+)\s+(.{3,50})$/;
  const regexIngCompleto = /^([\d.,/½¼¾]+\s*(?:kg|g|gr|mg|l|lt|ml|dl|cl|c\.s\.|c\.c\.|cs|cc|colher[es]*\s+de\s+(?:sopa|sobremesa|chá|café)|copo[s]?|chávena[s]?|un|unidade[s]?|dente[s]?|ramo[s]?|folha[s]?|fatia[s]?|pitada[s]?|q\.?\s*b\.?)?)\s+(?:de\s+)?(.{2,60})$/i;

  const ingredientes: LinhaIngrediente[] = [];
  const linhasIngredientes = linhas.slice(idxIngredientes + 1, idxPreparacao);

  for (const linha of linhasIngredientes) {
    const limpa = limparTexto(linha);
    if (limpa.length < 2 || limpa.length > 120) continue;
    if (regexSecIgnorar.test(limpa)) continue;
    if (regexLixo.test(limpa)) continue;
    if (regexSecPreparacao.test(limpa) && limpa.length < 50) break;

    // Linha com bullet/número no início
    const semBullet = limpa.replace(/^[-•·*◦▪▸→✓\d]+[.)]\s*/, '');

    const m = semBullet.match(regexIngCompleto);
    if (m) {
      const parteQt = m[1].trim();
      const produto = m[2].trim();
      const qtMatch = parteQt.match(/^([\d.,/½¼¾]+)\s*(.*)$/);
      const qtRaw = qtMatch ? qtMatch[1] : parteQt;
      const unRaw = qtMatch ? qtMatch[2].trim() : '';
      const conv = converterMedida(qtRaw, unRaw, produto);
      ingredientes.push({
        componente: '',
        qt: conv.qtFinal,
        un: conv.unFinal,
        produto,
        tPrep: '',
        tConf: '',
        obs: conv.obs,
      });
    } else if (semBullet.length > 2 && semBullet.length < 80 && !/^\d+\s*(min|h|hora|°C|º)/i.test(semBullet)) {
      ingredientes.push({
        componente: '',
        qt: 'q.b.',
        un: '',
        produto: semBullet,
        tPrep: '',
        tConf: '',
        obs: '',
      });
    }
  }

  if (ingredientes.length === 0) {
    ingredientes.push({ componente: '', qt: '', un: '', produto: '', tPrep: '', tConf: '', obs: '' });
  }

  // -------------------------------------------------------
  // MODO DE PREPARAÇÃO
  // Detetar passos numerados ou sequência de frases longas
  // -------------------------------------------------------
  const preparacao: PassoPreparacao[] = [];
  const regexMetadados = /^(nome\s+do\s+prato|nº\s+de\s+(doses|porções)|tempo\s+de\s+prepara|tempo\s+de\s+confec|tempo\s+total|ingredientes?|prepara[çc][ãa]o|modo\s+de\s+prepara|apresenta[çc][ãa]o|empratamento)/i;

  const linhasPrep = linhas.slice(idxPreparacao + 1);
  const regexPasso = /^(\d+)[.)]\s*(.+)$/;
  const regexTemp = /(\d{2,3})\s*[°º]?\s*[Cc]/;
  const regexTempo = /(\d+)\s*(min|minuto[s]?|hora[s]?|h\b)/i;

  let passoAtual = '';
  let numPasso = 1;

  for (const linha of linhasPrep) {
    const limpa = limparTexto(linha);
    if (limpa.length < 5) continue;
    if (regexSecIgnorar.test(limpa)) break;
    if (regexLixo.test(limpa)) break;
    if (regexMetadados.test(limpa)) continue;
    if (regexMetadados.test(limpa)) continue;

    const mPasso = limpa.match(regexPasso);
    if (mPasso) {
      if (passoAtual) {
        const mTemp = passoAtual.match(regexTemp);
        const mTempo = passoAtual.match(regexTempo);
        preparacao.push({
          num: numPasso++,
          descricao: passoAtual,
          temperatura: mTemp ? `${mTemp[1]}ºC` : '',
          tempo: mTempo ? `${mTempo[1]} ${mTempo[2]}` : '',
          obs: '',
          haccp: '',
        });
      }
      passoAtual = mPasso[2];
    } else if (limpa.length > 20 && !/^(ingredientes?|prepara)/i.test(limpa)) {
      // Frase longa = parte de um passo
      if (passoAtual) passoAtual += ' ' + limpa;
      else passoAtual = limpa;
      // Se acabou com ponto final = novo passo
      if (limpa.endsWith('.') && passoAtual.length > 40) {
        const mTemp = passoAtual.match(regexTemp);
        const mTempo = passoAtual.match(regexTempo);
        preparacao.push({
          num: numPasso++,
          descricao: passoAtual,
          temperatura: mTemp ? `${mTemp[1]}ºC` : '',
          tempo: mTempo ? `${mTempo[1]} ${mTempo[2]}` : '',
          obs: '',
          haccp: '',
        });
        passoAtual = '';
      }
    }
  }

  // Último passo pendente
  if (passoAtual.length > 10) {
    const mTemp = passoAtual.match(regexTemp);
    const mTempo = passoAtual.match(regexTempo);
    preparacao.push({
      num: numPasso,
      descricao: passoAtual,
      temperatura: mTemp ? `${mTemp[1]}ºC` : '',
      tempo: mTempo ? `${mTempo[1]} ${mTempo[2]}` : '',
      obs: '',
      haccp: '',
    });
  }

  if (preparacao.length === 0) {
    preparacao.push({ num: 1, descricao: '', temperatura: '', tempo: '', obs: '', haccp: '' });
  }

  // -------------------------------------------------------
  // TEMPOS TOTAIS (do texto completo)
  // -------------------------------------------------------
  const regexTotalPrep = /(?:tempo\s+de\s+prepara[çc][ãa]o|prepara[çc][ãa]o)[:\s—–]+(\d+\s*(?:min|h|hora[s]?))/i;
  const regexTotalConf = /(?:tempo\s+de\s+(?:confec[çc][ãa]o|cozedura|cozinhar|forno)|confec[çc][ãa]o)[:\s—–]+(\d+\s*(?:min|h|hora[s]?))/i;
  const regexPorcoes = /(?:dose[s]?|por[çc][õo]es?|pessoas?|serve)[:\s—–]+(\d+)/i;

  const mTPrep = texto.match(regexTotalPrep);
  const mTConf = texto.match(regexTotalConf);
  const mPorc = texto.match(regexPorcoes);

  // Detetar alergénicos automaticamente — usar todos os textos dos ingredientes
  const produtosList = ingredientes.map(i => `${i.produto} ${i.obs}`);
  // Adicionar também texto bruto da secção de ingredientes para não perder nada
  const textoIngredientes = linhas.slice(idxIngredientes, idxPreparacao).join(' ');
  const alergenicosDetectados = detetarAlergenicos([...produtosList, textoIngredientes]);

  return {
    ...FICHA_VAZIA,
    nomePrato,
    ingredientes,
    preparacao,
    alergenicos: formatarAlergenicos(alergenicosDetectados),
    tempoPrep: mTPrep ? mTPrep[1] : '',
    tempoConf: mTConf ? mTConf[1] : '',
    numPorcoes: mPorc ? mPorc[1] : '',
  };
}

// ============================================================
// Prompt para extração de receita via IA externa
// Formato exato da ficha de produção ECL
// ============================================================
function gerarPrompt(linkReceita: string, ucId?: string, ucNome?: string): string {
  const ucContexto = ucId ? `\nCONTEXTO PEDAGÓGICO: Esta ficha pertence à UC ${ucId} — ${ucNome || ''}.\nAs técnicas e competências devem ser específicas desta UC.` : '';
  return `Analisa a receita e extrai a informação NO FORMATO EXATO abaixo.
Aplica TODAS as regras obrigatórias antes de responder.${ucContexto}

═══════════════════════════════════════════════════
REGRAS OBRIGATÓRIAS — LÊ TODAS ANTES DE COMEÇAR
═══════════════════════════════════════════════════

REGRA 1 — FORMATO
- Usa o separador | entre colunas
- Cada passo de preparação: NUMA SÓ LINHA
- PCC/HACCP na mesma linha do passo, após o último |
- Nº DE DOSES é sempre um número (ex: 4)

REGRA 2 — UNIDADES (CRÍTICO)
Todos os ingredientes em GRAMAS (g) ou MILILITROS (ml).
ÚNICA exceção: OVOS ficam em "un".

Conversões obrigatórias:
- "2 cebolas" → "200 | g | Cebola" (média ≈ 100g)
- "1 dente de alho" → "6 | g | Alho"
- "1 cebola grande" → "200 | g | Cebola"
- "1 lombo de bacalhau" → "200 | g | Bacalhau demolhado"
- "1 lombo de salmão" → "180 | g | Salmão fresco"
- "1 filete de peixe" → "150 | g | [espécie]"
- "1 tomate" → "120 | g | Tomate"
- "1 cenoura" → "100 | g | Cenoura"
- "1 batata média" → "150 | g | Batata"
- "1 limão (raspa)" → "12 | g | Raspa de limão"
- "1 limão (sumo)" → "30 | ml | Sumo de limão"
- "1 laranja (raspa)" → "15 | g | Raspa de laranja"
- "1 cs" sólido → "15 | g | [produto]"
- "1 cs" líquido → "15 | ml | [produto]"
- "1 cc" → "5 | g | [produto]" ou "5 | ml"
- "q.b." → "q.b. | | [produto]"
- Gemas: "3 gemas" → "3 | un | Gemas de ovo"
- Claras: "3 claras" → "3 | un | Claras de ovo"
NÃO usar: un, unidade, dente, ramo, folha, fatia, cabeça (exceto ovos/gemas/claras)

REGRA 3 — NOMES DOS INGREDIENTES (CRÍTICO)
NUNCA usar nomes de marca. Usar sempre o produto genérico:
❌ Knorr, Sidul, Vaqueiro, Mimosa, Riberalves, Gallo, Continente, Pingo Doce
✅ Açúcar, Margarina, Leite, Bacalhau salgado, Azeite
NUNCA usar produtos inexistentes:
❌ Puré de grão → ✅ Grão cozido
❌ Legumes assados → ✅ [lista os legumes crus]

REGRA 3B — CALDOS (REGRA DA COZINHA PEDAGÓGICA)
Em cozinha pedagógica os caldos NUNCA se compram — são SEMPRE produzidos em aula.
NUNCA escrever "Caldo de galinha (cubo)" ou "Caldo Knorr" nos ingredientes.
Quando a receita pede caldo:
→ Na coluna PRODUTO escreve: "Caldo de galinha (produzido em aula)"
→ Na coluna OBS escreve: "⚠️ Verificar se existe caldo já produzido na cozinha. Se não houver, informar o professor antes de iniciar."
→ Na PREPARAÇÃO adiciona um passo antes dos outros: "Verificar disponibilidade de caldo de galinha na cozinha. Se necessário, produzir com antecedência."
Tipos de caldo e o que escrever:
- Caldo de galinha → "Caldo de galinha (produzido em aula)"
- Caldo de carne → "Caldo de carne (produzido em aula)"
- Caldo de peixe / fumet → "Fumet de peixe (produzido em aula)"
- Caldo de legumes → "Caldo de legumes (produzido em aula)"

REGRA 3C — ÁGUA DE COZEDURA
Quando a receita tem ingredientes que produzem água de cozedura útil, adicionar nota obrigatória na coluna OBS:
- Bacalhau (qualquer forma) → OBS: "⚠️ Reservar a água de demolha/cozedura — pode servir para ajustar consistência ou como base de caldo"
- Massa/arroz → OBS: "⚠️ Reservar a água de cozedura (com amido) — útil para ligar molhos"
- Batata → OBS: "⚠️ Reservar a água de cozedura se necessário para o puré"
- Legumes → OBS: "⚠️ Reservar a água de cozedura para caldo de legumes"
- Grão/feijão → OBS: "⚠️ Reservar a água de cozedura — rica em proteína e amido"

REGRA 4 — FARINHA
Se a receita não especifica o tipo:
- Bolos, queques, muffins, massas montadas → "Farinha de trigo T55"
- Pão, pizza, massa salgada → "Farinha de trigo T65"
- Com fermento químico → "Farinha de trigo T55"
- Por omissão → "Farinha de trigo T65"

REGRA 5 — ÁGUA
A água pode aparecer na Ficha de Produção normalmente.
Não há restrição aqui — é apenas na Requisição que não aparece.

REGRA 6 — COMPONENTES
Agrupa os ingredientes por preparação/componente:
Ex: "Massa", "Creme", "Cobertura", "Molho", "Guarnição"
Deixa o campo COMPONENTE vazio se for receita simples sem componentes.

REGRA 7 — PCC/HACCP
Os PCC devem ser específicos da receita, não genéricos.
Inclui: temperatura exacta, tempo, produto de risco.
Exemplos corretos:
- "Temperatura mínima 75°C no centro do produto"
- "Creme pasteleiro: arrefecer de 65°C a 10°C em menos de 2h"
- "Ovos: usar ovos frescos do dia, verificar data de validade"
- "Bacalhau: verificar ausência de espinhas após desfiar"

REGRA 8 — REGISTOS KITCHENFLOW
Inclui APENAS os módulos aplicáveis a esta receita:
1. Higiene Pessoal — SEMPRE
2. Temperatura de Serviço — se prato quente (min 63°C) ou frio (max 4°C)
3. Controlo de Óleos — APENAS se fritura por imersão
4. Conservação de Produtos — se sobram ingredientes abertos
5. Não Conformidades — SEMPRE
6. Amostra Testemunho — APENAS se serviço a clientes externos

═══════════════════════════════════════════════════
FORMATO DE RESPOSTA (manter exactamente)
═══════════════════════════════════════════════════

NOME DO PRATO: [nome sem marcas]
CLASSIFICAÇÃO: [Peixe / Carne / Aves / Sobremesa / Sopa / Entrada / Massa / Vegetariano / Outro]
Nº DE DOSES: [número]
TEMPO DE PREPARAÇÃO: [X min]
TEMPO DE CONFEÇÃO: [X min]
ALERGÉNICOS: [lista dos 14 alergénicos EU presentes]

INGREDIENTES:
COMPONENTE | QT | UN | PRODUTO | T.PREP | T.CONF | OBS
[aplica REGRAS 2, 3, 4, 6 aqui]

PREPARAÇÃO:
NR | DESCRIÇÃO | TEMP | TEMPO | OBS | PCC/HACCP
[aplica REGRA 7 aqui — cada passo numa linha]

EMPRATAMENTO:
[descrição do empratamento profissional]

EQUIPAMENTO NECESSÁRIO:
[lista de equipamentos necessários]

CONSERVAÇÃO:
[temperatura, recipiente, duração]

REGENERAÇÃO:
[como regenerar ou "Não aplicável — consumir imediatamente"]

REGISTOS KITCHENFLOW:
[aplica REGRA 8 — apenas módulos relevantes]

TÉCNICAS DETECTADAS:
[Lista APENAS os nomes exactos das microcompetências técnicas usadas nesta receita — máx 8, uma por linha.
IMPORTANTE: Esta secção é usada pela aplicação para sugerir competências ao professor. Usa EXACTAMENTE estes nomes:
Cozer | Escalfar/pochar | Branquear | Saltear | Fritar | Grelhar | Assar | Estufar/guisar | Brasear | Gratinar | Confitar
Juliana | Brunoise | Mirepoix | Chiffonade | Filetar peixe | Escamar peixe | Retirar espinhas | Retirar pele peixe
Porcionar peixe | Cozinhar bacalhau | Preparar marisco | Aparar carne | Desossar | Selar carne | Porcionar carne
Fundo branco | Fundo escuro | Fumet de peixe | Fundo de legumes | Bechamel | Veloute | Reducao de molho | Emulsao quente/fria
Sopa simples | Creme de legumes | Consomme | Bisque | Sopa fria | Ovo escalfado | Omelete
Massa alimenticia seca | Massa fresca/recheada | Creme pasteleiro | Creme ingles | Chantilly | Ganache | Mousse
Massa choux | Massa folhada | Detrempe | Tourage | Massa quebrada/areada
Amassar | Fermentar | Dividir e bolear | Moldar pao | Cozer pao
Organizar posto de trabalho | Controlar temperaturas | Armazenamento refrigerado | Etiquetagem e lote]

---
EXEMPLO DE REFERÊNCIA (Bacalhau à Brás):

NOME DO PRATO: Bacalhau à Brás
CLASSIFICAÇÃO: Peixe
Nº DE DOSES: 4
TEMPO DE PREPARAÇÃO: 30 min
TEMPO DE CONFEÇÃO: 20 min
ALERGÉNICOS: Peixe, Ovos, Glúten

INGREDIENTES:
COMPONENTE | QT | UN | PRODUTO | T.PREP | T.CONF | OBS
Peixe | 500 | g | Bacalhau demolhado | 10 min | | ⚠️ Reservar a água de cozedura
Vegetal | 200 | g | Cebola | 3 min | | Cortar em juliana fina
Gordura | 30 | ml | Azeite virgem extra | | |
Ovo | 4 | un | Ovos | | | Mexer no final fora do lume

PREPARAÇÃO:
NR | DESCRIÇÃO | TEMP | TEMPO | OBS | PCC/HACCP
1 | Demolhar o bacalhau 24h antes em água fria, mudar a água 3 vezes | Frio | 24h | Manter refrigerado | Temperatura de refrigeração 0-4°C durante demolha
2 | Refogar a cebola em juliana no azeite até ficar translúcida | Médio | 8 min | Mexer regularmente |
3 | Adicionar o bacalhau desfiado sem espinhas e envolver | Médio | 5 min | | Verificar ausência de espinhas — risco de engasgamento
4 | Juntar as batatas palha e envolver. Retirar do lume e adicionar os ovos mexidos | Forte→apagar | 2 min | Não cozinhar demasiado os ovos | Ovos devem ficar cremosos — temperatura interna 63°C
5 | Retificar o sal e servir de imediato polvilhado com salsa picada | | | Provar sempre antes de servir |

EMPRATAMENTO:
Servir em prato fundo aquecido, polvilhado com salsa picada e azeitonas pretas. Decorar com rodela de limão.

EQUIPAMENTO NECESSÁRIO:
Frigideira larga antiaderente
Faca de chef e tábua de corte
Tigela para desfiar o bacalhau

CONSERVAÇÃO:
Refrigerar a 0-4°C em recipiente fechado. Consumir nas 24h seguintes.

REGENERAÇÃO:
Aquecer em frigideira antiaderente a lume médio, adicionando um fio de azeite. Temperatura mínima 75°C no centro.

REGISTOS KITCHENFLOW:
Higiene Pessoal — registar antes de iniciar a produção
Temperatura de Serviço — servir quente, mínimo 63°C
Conservação de Produtos — bacalhau ou ovos que sobrem: refrigerar a 0-4°C, consumir em 24h
Não Conformidades — registar qualquer desvio detetado
Amostra Testemunho — se serviço a clientes externos

---
${linkReceita ? `RECEITA A ANALISAR: ${linkReceita}` : 'Analisa com base no teu conhecimento culinário e aplica todas as regras acima.'}`;
}

// ── Código que estava fora do template (removido) ──

// ── Botão IAs ─────────────────────────────────────────────────
function gerarPromptGuia(nomePrato: string, ucId?: string, ucNome?: string): string {
  const ucContexto = ucId ? `\nContexto pedagógico: UC ${ucId} — ${ucNome || ''}` : '';
  return `# GUIA DE APOIO À PRODUÇÃO — ${nomePrato.toUpperCase()}
${ucContexto}

Analisa a Ficha de Produção de "${nomePrato}" e gera um Guia de Apoio à Produção destinado a alunos do Curso Profissional de Cozinha e Pastelaria.

IMPORTANTE:
- Toda a informação deve referir-se exclusivamente a esta produção: ${nomePrato}
- Não utilizar textos genéricos
- Não repetir simplesmente o conteúdo da Ficha de Produção
- O objectivo é explicar, formar e contextualizar tecnicamente o aluno
- Utilizar tabelas sempre que possível
- Linguagem simples, técnica e pedagógica

---
# 1. ENQUADRAMENTO DA PRODUÇÃO
Explicar:
- O que é a preparação
- Qual a sua origem gastronómica
- Em que contexto é normalmente utilizada
- Principais características do produto final

---
# 2. COMPETÊNCIAS DESENVOLVIDAS

## Competências Técnicas
Relacionadas directamente com a produção de ${nomePrato}.

## Atitudes
- Organização
- Gestão do tempo
- Autonomia
- Trabalho em equipa
- Responsabilidade

## Responsabilidades
- HACCP
- Segurança
- Equipamentos
- Conservação

---
# 3. MICROCOMPETÊNCIAS TÉCNICAS
Identificar automaticamente as microcompetências presentes nesta produção.
Explicar brevemente cada uma.

---
# 4. HACCP E PCC
Apresentar em tabela:
| Perigo | PCC | Temperatura crítica | Medida preventiva | Conservação |

---
# 5. RENDIMENTOS
Para cada matéria-prima relevante:
| Produto | Peso comprado | Peso utilizável | Rendimento | Origem das perdas |

---
# 6. CAPACITAÇÃO
Explicar a quantidade por pessoa e justificar o tipo de serviço utilizado.

---
# 7. EQUILÍBRIO SENSORIAL
| Componente | Intensidade | Notas |
| Doce | | |
| Ácido | | |
| Salgado | | |
| Amargo | | |
| Umami | | |

Indicar componentes dominantes, ausentes e pouco representados.

---
# 8. SUGESTÕES GASTRONÓMICAS
Apenas sugestões — nunca alterar a receita.
Justificar tecnicamente cada sugestão.

---
# 9. SUSTENTABILIDADE
- Desperdícios gerados
- Possíveis reaproveitamentos
- Técnicas de valorização de subprodutos

---
# 10. FOOD COST PEDAGÓGICO
- Ingredientes mais caros
- Ingredientes com maior desperdício
- Impacto dos rendimentos no custo final

---
# 11. CONHECIMENTOS A CONSOLIDAR
Lista dos principais conhecimentos que o aluno deve dominar após executar esta produção.

---
# 12. QUESTÕES PARA ESTUDO
Gerar automaticamente com base exclusivamente nesta produção:
- 5 perguntas de escolha múltipla
- 3 perguntas verdadeiro/falso
- 2 situações práticas

---
Ficha de Produção: ${nomePrato}`;
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
      <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
        Copia o prompt, cola numa IA com o link da receita e copia o resultado abaixo.
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <button type="button" className="btn btn-ghost"
          onClick={() => window.open(`https://claude.ai/new?q=${encodeURIComponent(promptFinal)}`, '_blank')}>
          🟠 Abrir no Claude
        </button>
        <button type="button" className="btn btn-ghost"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(promptFinal);
            } catch {
              const ta = document.createElement('textarea');
              ta.value = promptFinal;
              document.body.appendChild(ta); ta.select();
              document.execCommand('copy');
              document.body.removeChild(ta);
            }
            setCopiado(true);
            setTimeout(() => setCopiado(false), 4000);
            window.open('https://chat.openai.com/', '_blank');
          }}>
          🟢 Abrir ChatGPT (prompt copiado)
        </button>
        <button type="button" className="btn btn-ghost"
          onClick={() => copiar(promptFinal, setCopiado)}
          style={{ background: copiado ? 'var(--copper)' : undefined, color: copiado ? '#fff' : undefined }}>
          {copiado ? '✅ Copiado!' : '📋 Copiar prompt'}
        </button>
        <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }}
          onClick={() => setMostrarPrompt(!mostrarPrompt)}>
          {mostrarPrompt ? '🔼 Esconder' : '✏️ Ver/editar'}
        </button>
      </div>
      {copiado && (
        <div style={{ padding: '8px 12px', background: 'var(--copper-pale)', borderRadius: 8, fontSize: 12, color: 'var(--copper)', marginBottom: 8 }}>
          ✅ Prompt copiado! No ChatGPT faz <strong>Ctrl+V</strong> para colar.
        </div>
      )}
      {mostrarPrompt && (
        <div style={{ marginBottom: 12 }}>
          <textarea className="input" value={promptEditavel}
            onChange={e => setPromptEditavel(e.target.value)}
            style={{ minHeight: 180, fontSize: 11, fontFamily: 'monospace' }}/>
          <button type="button" className="btn btn-ghost" style={{ fontSize: 11, marginTop: 4 }}
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
        <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
          Após criar a ficha, usa este prompt para gerar o Guia de Apoio completo com HACCP, rendimentos, equilíbrio sensorial e questões pedagógicas.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <button type="button" className="btn btn-ghost"
            onClick={() => window.open(`https://claude.ai/new?q=${encodeURIComponent(guiaFinal)}`, '_blank')}
            style={{ borderColor: 'var(--sage)', color: 'var(--sage)' }}>
            🟠 Guia no Claude
          </button>
          <button type="button" className="btn btn-ghost"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(guiaFinal);
              } catch {
                const ta = document.createElement('textarea');
                ta.value = guiaFinal;
                document.body.appendChild(ta); ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
              }
              setCopiadoGuia(true);
              setTimeout(() => setCopiadoGuia(false), 4000);
              window.open('https://chat.openai.com/', '_blank');
            }}
            style={{ borderColor: 'var(--sage)', color: 'var(--sage)' }}>
            🟢 ChatGPT — Guia (prompt copiado)
          </button>
          <button type="button" className="btn btn-ghost"
            onClick={() => copiar(guiaFinal, setCopiadoGuia)}
            style={{ background: copiadoGuia ? 'var(--sage)' : undefined, color: copiadoGuia ? '#fff' : undefined, borderColor: 'var(--sage)' }}>
            {copiadoGuia ? '✅ Copiado!' : '📋 Copiar prompt guia'}
          </button>
          <button type="button" className="btn btn-ghost" style={{ fontSize: 12, borderColor: 'var(--sage)', color: 'var(--sage)' }}
            onClick={() => setMostrarGuia(!mostrarGuia)}>
            {mostrarGuia ? '🔼 Esconder' : '✏️ Ver/editar guia'}
          </button>
        </div>
        {mostrarGuia && (
          <div style={{ marginBottom: 8 }}>
            <textarea className="input" value={guiaEditavel}
              onChange={e => setGuiaEditavel(e.target.value)}
              style={{ minHeight: 180, fontSize: 11, fontFamily: 'monospace' }}/>
            <button type="button" className="btn btn-ghost" style={{ fontSize: 11, marginTop: 4 }}
              onClick={() => setGuiaEditavel(gerarPromptGuia(nomePrato || 'Receita', ucId, ucNome))}>
              🔄 Repor original
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
function PassoLink({ onContinuar, ucId, ucNome, onAlteracao }: { onContinuar: (texto: string, link: string) => void; ucId?: string; ucNome?: string; onAlteracao?: () => void }) {
  const [link, setLink] = useState('');
  const [textoManual, setTextoManual] = useState('');
  const [nomePrato, setNomePrato] = useState('');
  const [a_carregar, setACarregar] = useState(false);
  const [mostrarManual, setMostrarManual] = useState(false);
  const [erro, setErro] = useState('');
  const [fichasSimilares, setFichasSimilares] = useState<any[]>([]);
  const [mostrarSimilares, setMostrarSimilares] = useState(false);
  const [copiadoFicha, setCopiadoFicha] = useState(false);
  const [copiadoGuia, setCopiadoGuia] = useState(false);

  // Prompts calculados em tempo real
  const promptFicha = gerarPrompt(link, ucId, ucNome);
  const promptGuia = gerarPromptGuia(nomePrato || 'Receita', ucId, ucNome);

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

  async function carregar() {
    if (!link && !textoManual) return;
    if (textoManual) {
      try { localStorage.removeItem('ecl_ficha_draft'); } catch {}
      const textoFinal = textoManual.includes('NOME DO PRATO:') 
        ? textoManual 
        : (nomePrato ? nomePrato + '\n' : '') + textoManual;
      onContinuar(textoFinal, link);
      return;
    }
    setACarregar(true);
    setErro('');

    const metodos = [
      // 1º: Jina Reader com filtro de lixo
      async () => {
        const res = await fetch(`https://r.jina.ai/${link}`, {
          headers: { 'Accept': 'text/plain', 'X-Return-Format': 'markdown' }
        });
        if (!res.ok) throw new Error('Jina falhou');
        const texto = await res.text();

        // Extrair título do Jina (linha "Title: ...")
        const tituloMatch = texto.match(/^Title:\s*(.+)$/m);
        if (tituloMatch) setNomePrato(tituloMatch[1].trim());

        // Filtrar lixo
        const linhasUteis = texto.split('\n').filter(l =>
          l.trim().length > 3 &&
          !l.includes('http') &&
          !l.includes('![') &&
          !l.includes('base64') &&
          !l.includes('adzerk') &&
          !l.includes('zkcdn') &&
          !l.includes('eyJ')
        );
        if (linhasUteis.length < 8) throw new Error('Conteúdo insuficiente');
        return linhasUteis.join('\n');
      },
      // 2º: allorigins com JSON-LD
      async () => {
        const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(link)}`);
        const data = await res.json();
        const html = data.contents || '';
        const jsonLdBlocks = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
        for (const block of jsonLdBlocks) {
          try {
            const json = JSON.parse(block.replace(/<[^>]+>/g, '').trim());
            const recipe = json['@type'] === 'Recipe' ? json :
              Array.isArray(json['@graph']) ? json['@graph'].find((g: any) => g['@type'] === 'Recipe') : null;
            if (recipe) {
              if (recipe.name) setNomePrato(recipe.name);
              const ingredientes = (recipe.recipeIngredient || []).join('\n');
              const instrucoes = (recipe.recipeInstructions || [])
                .map((i: any, idx: number) => `${idx + 1}. ${typeof i === 'string' ? i : i.text || ''}`)
                .join('\n');
              const tempoPrep = recipe.prepTime?.replace('PT', '').replace('M', ' min').replace('H', 'h') || '';
              const tempoConf = recipe.cookTime?.replace('PT', '').replace('M', ' min').replace('H', 'h') || '';
              const porcoes = recipe.recipeYield || '';
              return `${recipe.name || ''}\nTempo de preparação: ${tempoPrep}\nTempo de confeção: ${tempoConf}\nDoses: ${porcoes}\nIngredientes\n${ingredientes}\nPreparação\n${instrucoes}`;
            }
          } catch {}
        }
        // fallback HTML limpo
        const div = document.createElement('div');
        div.innerHTML = html;
        ['script','style','nav','footer','header','aside','noscript'].forEach(tag => {
          div.querySelectorAll(tag).forEach((el: Element) => el.remove());
        });
        const texto = (div.innerText || div.textContent || '').trim();
        if (texto.length < 100) throw new Error('Conteúdo insuficiente');
        return texto;
      },
    ];

    for (const metodo of metodos) {
      try {
        const texto = await metodo();
        onContinuar(texto, link);
        setACarregar(false);
        return;
      } catch {}
    }

    // Todos falharam — mostrar modo manual com nome já preenchido se possível
    setACarregar(false);
    setMostrarManual(true);
    setErro('Não foi possível ler o link automaticamente. Cola abaixo apenas os ingredientes e o modo de preparação da receita.');
  }

  return (
    <Card>
      <div className="display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>
        📋 Nova Ficha de Produção
      </div>

      {/* NOME DO PRATO */}
      <Field label="Nome do prato *">
        <input
          className="input"
          value={nomePrato}
          onChange={e => { setNomePrato(e.target.value); onAlteracao?.(); }}
          placeholder="ex: Bacalhau à Brás, Mousse de Chocolate..."
        />
      </Field>

      {/* PASSO 1A — PROMPT DA FICHA DE PRODUÇÃO */}
      <div style={{ background: 'rgba(181,101,29,0.06)', borderRadius: 10, padding: '12px 14px', marginBottom: 12, border: '1.5px solid rgba(181,101,29,0.3)' }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--copper)', marginBottom: 4 }}>
          🤖 Passo 1A — Prompt para a Ficha de Produção
        </div>
        <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.5)', marginBottom: 8 }}>
          Copia este prompt, abre uma IA, cola e envia. Depois copia o resultado e cola no Passo 2.
        </div>
        <Field label="Link da receita (inclui no prompt automaticamente)">
          <input className="input" value={link}
            onChange={e => { setLink(e.target.value); setMostrarManual(false); setErro(''); onAlteracao?.(); }}
            placeholder="https://www.pingodoce.pt/receitas/..." />
        </Field>
        <textarea readOnly value={promptFicha}
          style={{ width:'100%', minHeight: 80, borderRadius: 8, border: '1px solid var(--border)', padding: 8, fontSize: 11, fontFamily: 'monospace', background: '#fafafa', resize: 'vertical', marginBottom: 8 }} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-ghost"
            style={{ background: copiadoFicha ? 'var(--copper)' : undefined, color: copiadoFicha ? '#fff' : undefined }}
            onClick={() => { navigator.clipboard.writeText(promptFicha).catch(()=>{}); setCopiadoFicha(true); setTimeout(()=>setCopiadoFicha(false),3000); }}>
            {copiadoFicha ? '✅ Copiado!' : '📋 Copiar prompt da ficha'}
          </button>
          <button type="button" className="btn btn-ghost"
            onClick={() => window.open(`https://claude.ai/new?q=${encodeURIComponent(promptFicha)}`, '_blank')}>
            🟠 Abrir no Claude
          </button>
          <button type="button" className="btn btn-ghost"
            onClick={() => { navigator.clipboard.writeText(promptFicha).catch(()=>{}); window.open('https://chat.openai.com/', '_blank'); }}>
            🟢 Abrir ChatGPT
          </button>
          {link && (
            <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }}
              onClick={carregar} disabled={a_carregar}>
              {a_carregar ? 'A carregar...' : '⚡ Ler link automaticamente'}
            </button>
          )}
        </div>
      </div>

      {/* PASSO 1B — PROMPT DO GUIA DE APOIO */}
      <div style={{ background: 'rgba(90,122,78,0.06)', borderRadius: 10, padding: '12px 14px', marginBottom: 12, border: '1.5px solid rgba(90,122,78,0.3)' }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--sage)', marginBottom: 4 }}>
          📚 Passo 1B — Prompt para o Guia de Apoio à Produção
        </div>
        <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.5)', marginBottom: 8 }}>
          Depois de ter a ficha, usa este prompt para gerar o Guia pedagógico. Cola o resultado no Passo 3.
        </div>
        <textarea readOnly value={promptGuia}
          style={{ width:'100%', minHeight: 60, borderRadius: 8, border: '1px solid var(--border)', padding: 8, fontSize: 11, fontFamily: 'monospace', background: '#fafafa', resize: 'vertical', marginBottom: 8 }} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-ghost"
            style={{ borderColor: 'var(--sage)', color: copiadoGuia ? '#fff' : 'var(--sage)', background: copiadoGuia ? 'var(--sage)' : undefined } as any}
            onClick={() => { navigator.clipboard.writeText(promptGuia).catch(()=>{}); setCopiadoGuia(true); setTimeout(()=>setCopiadoGuia(false),3000); }}>
            {copiadoGuia ? '✅ Copiado!' : '📋 Copiar prompt do guia'}
          </button>
          <button type="button" className="btn btn-ghost" style={{ borderColor: 'var(--sage)', color: 'var(--sage)' }}
            onClick={() => window.open(`https://claude.ai/new?q=${encodeURIComponent(promptGuia)}`, '_blank')}>
            🟠 Guia no Claude
          </button>
          <button type="button" className="btn btn-ghost" style={{ borderColor: 'var(--sage)', color: 'var(--sage)' }}
            onClick={() => { navigator.clipboard.writeText(promptGuia).catch(()=>{}); window.open('https://chat.openai.com/', '_blank'); }}>
            🟢 Guia no ChatGPT
          </button>
        </div>
      </div>

      {/* PASSO 2 — RESULTADO DA FICHA DE PRODUÇÃO */}
      <div style={{ background: 'rgba(181,101,29,0.04)', borderRadius: 10, padding: '12px 14px', marginBottom: 12, border: '1px solid rgba(181,101,29,0.2)' }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--copper)', marginBottom: 4 }}>
          📋 Passo 2 — Cola aqui o resultado da Ficha de Produção
        </div>
        <textarea
          className="input"
          value={textoManual}
          onChange={e => { setTextoManual(e.target.value); onAlteracao?.(); }}
          placeholder={'NOME DO PRATO: ...\nCLASSIFICAÇÃO: ...\nNº DE DOSES: 4\n\nINGREDIENTES:\nCOMPONENTE | QT | UN | PRODUTO | T.PREP | T.CONF | OBS\n...\n\nPREPARAÇÃO:\nNR | DESCRIÇÃO | TEMP | TEMPO | OBS | PCC/HACCP\n1 | ...'}
          style={{ minHeight: 180, fontSize: 12, fontFamily: 'monospace', background: '#fff' }}
        />
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
                <div style={{ fontWeight: 600, fontSize: 13 }}>{f.nomePrato}</div>
                <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.5)' }}>{f.classificacao} · {f.data}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {f.linkFicha && (
                  <button onClick={() => window.open(f.linkFicha, '_blank')} className="btn btn-ghost" style={{ fontSize: 11, padding: '5px 10px' }}>Ver →</button>
                )}
                <button onClick={() => {
                  const fichaLocal = getFichasProducao().find(x => x.id === f.id);
                  if (fichaLocal) {
                    const textoSimulado = `NOME DO PRATO: ${fichaLocal.nomePrato}\nCLASSIFICAÇÃO: ${fichaLocal.classificacao}\nNº DE DOSES: ${fichaLocal.numPorcoes}\nTEMPO DE PREPARAÇÃO: ${fichaLocal.tempoPrep}\nTEMPO DE CONFEÇÃO: ${fichaLocal.tempoConf}\nALERGÉNICOS: ${(fichaLocal.alergenicos||[]).join(', ')}\n\nINGREDIENTES:\nCOMPONENTE | QT | UN | PRODUTO | T.PREP | T.CONF | OBS\n${(fichaLocal.ingredientes||[]).map(i => `${i.componente}|${i.qt}|${i.un}|${i.produto}|${i.tPrep}|${i.tConf}|${i.obs}`).join('\n')}\n\nPREPARAÇÃO:\nNR | DESCRIÇÃO | TEMP | TEMPO | OBS | PCC/HACCP\n${(fichaLocal.preparacao||[]).map(p => `${p.num}|${p.descricao}|${p.temperatura}|${p.tempo}|${p.obs}|${p.haccp}`).join('\n')}\n\nEMPRATAMENTO:\n${fichaLocal.empratamento||''}\n\nCONSERVAÇÃO:\n${fichaLocal.conservacao||''}\n\nREGENERAÇÃO:\n${fichaLocal.regeneracao||''}\n\nREGISTOS KITCHENFLOW:\n${fichaLocal.kitchenflow||''}`;
                    setMostrarSimilares(false);
                    onContinuar(textoSimulado, link);
                  }
                }} className="btn btn-ghost" style={{ fontSize: 11, padding: '5px 10px', background: 'var(--sage)', color: 'white', border: 'none' }}>
                  Usar esta ficha
                </button>
              </div>
            </div>
          ))}
          <button onClick={() => setMostrarSimilares(false)} style={{ fontSize: 11, color: 'rgba(26,23,20,0.4)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4 }}>
            Ignorar e criar nova ficha
          </button>
        </div>
      )}

      <Button block onClick={carregar} disabled={!textoManual && !link}>
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
}: {
  ficha: FichaTecnica;
  textoReceita: string;
  onContinuar: (ficha: FichaTecnica) => void;
  onVoltar: () => void;
}) {
  const [ficha, setFicha] = useState<FichaTecnica>(fichaInicial);

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

  // Subtécnicas detetadas automaticamente
  const subtecnicasDetetadas = sugerirSubtecnicas(textoReceita + ' ' + ficha.nomePrato);

  return (
    <div>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div className="display" style={{ fontSize: 18, fontWeight: 700, flex: 1 }}>
            📋 Passo 2: Ficha de Produção
          </div>
          <button type="button" className="btn btn-ghost" style={{ fontSize: 11, color: 'var(--danger)' }}
            onClick={() => {
              try { localStorage.removeItem('ecl_ficha_draft'); } catch {}
              setFicha(fichaInicial);
            }}>
            🗑️ Repor
          </button>
        </div>
        <div className="muted" style={{ marginBottom: 14 }}>
          Verifica e ajusta os dados extraídos automaticamente.
        </div>

        {/* Cabeçalho */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <Field label="Nome do prato">
            <input className="input" value={ficha.nomePrato} onChange={e => setF('nomePrato', e.target.value)} />
          </Field>
          <Field label="Classificação">
            <input className="input" value={ficha.classificacao} onChange={e => setF('classificacao', e.target.value)} placeholder="ex: Peixe, Sobremesa..." />
          </Field>
          <Field label="Alergénicos">
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
                    <input className="input" style={{ padding: '4px 6px', fontSize: 12 }}
                      value={ing.componente} onChange={e => setIngrediente(i, 'componente', e.target.value)} />
                  </td>
                  <td style={{ padding: '4px 4px' }}>
                    <input className="input" style={{ padding: '4px 6px', fontSize: 12, width: 55 }}
                      value={ing.qt} onChange={e => setIngrediente(i, 'qt', e.target.value)} />
                  </td>
                  <td style={{ padding: '4px 4px' }}>
                    <input className="input" style={{ padding: '4px 6px', fontSize: 12, width: 45 }}
                      value={ing.un} onChange={e => setIngrediente(i, 'un', e.target.value)} />
                  </td>
                  <td style={{ padding: '4px 4px' }}>
                    <input className="input" style={{ padding: '4px 6px', fontSize: 12 }}
                      value={ing.produto} onChange={e => setIngrediente(i, 'produto', e.target.value)} />
                  </td>
                  <td style={{ padding: '4px 4px' }}>
                    <input className="input" style={{ padding: '4px 6px', fontSize: 12, width: 45 }}
                      value={ing.tPrep} onChange={e => setIngrediente(i, 'tPrep', e.target.value)} />
                  </td>
                  <td style={{ padding: '4px 4px' }}>
                    <input className="input" style={{ padding: '4px 6px', fontSize: 12, width: 45 }}
                      value={ing.tConf} onChange={e => setIngrediente(i, 'tConf', e.target.value)} />
                  </td>
                  <td style={{ padding: '4px 4px' }}>
                    <input className="input" style={{ padding: '4px 6px', fontSize: 12 }}
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
              <span className="muted" style={{ fontSize: 11, fontWeight: 400, marginLeft: 8 }}>
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
                  <div className="muted" style={{ fontSize: 11 }}>{label}</div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--copper)' }}>{valor}</div>
                </div>
              ))}
            </div>
            <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
              ⚠️ Estimativa — verificar com tabela oficial INSA
            </div>
          </Card>
        );
      })()}

      {/* Alergénicos */}
      {ficha.alergenicos && (
        <Card>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Alergénicos detetados</div>
          <div style={{ fontSize: 14 }}>{ficha.alergenicos}</div>
          <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
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
          <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
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
        <Button block variant="ghost" onClick={onVoltar}>← Voltar</Button>
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

        {/* GUIA DE APOIO À PRODUÇÃO — cola aqui o resultado da IA */}
        <CaixaGuia
          nomePrato={ficha.nomePrato}
          textoGuiaInicial={ficha.textoGuia}
          onGuiaAlterado={(texto) => setFicha(f => ({ ...f, textoGuia: texto }))}
        />

        {/* TÉCNICAS DETECTADAS — ligar às microcompetências */}
        {ficha.tecnicasDetectadas && ficha.tecnicasDetectadas.length > 0 && (
          <div style={{ background: 'var(--copper-pale)', border: '1px solid rgba(181,101,29,0.2)', borderRadius: 12, padding: 16, marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--copper)', marginBottom: 8 }}>
              🎯 Técnicas detectadas — para avaliação
            </div>
            <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.6)', marginBottom: 8 }}>
              O motor vai sugerir estas competências ao professor quando avaliar esta ficha.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ficha.tecnicasDetectadas.map((t, i) => (
                <span key={i} style={{ padding: '4px 10px', borderRadius: 20, background: 'white', border: '1px solid rgba(181,101,29,0.3)', fontSize: 11, color: 'var(--copper)', fontWeight: 600 }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{ height: 8 }} />
        <div style={{ position:'sticky', bottom:0, padding:'12px 0', background:'white', borderTop:'1px solid var(--border)' }}>
          <button className="btn btn-primary" style={{ width:'100%', background:'var(--sage)', fontSize:15, padding:'14px', fontWeight:700, borderRadius:10, border:'none', cursor:'pointer', opacity: ficha.nomePrato ? 1 : 0.4 }}
            onClick={() => ficha.nomePrato && onContinuar(ficha)} disabled={!ficha.nomePrato}>
            ✓ Guardar Ficha de Produção
          </button>
          {!ficha.nomePrato && <div style={{ textAlign:'center', fontSize:11, color:'var(--danger)', marginTop:6 }}>Preenche o nome do prato para guardar.</div>}
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// Vista principal do Professor — orquestra os passos
// ============================================================
export function ProfessorView({ turmaId, nomeProfessor, onAlteracao, onGuardado, planoId, modoGuia }: {
  turmaId: string;
  nomeProfessor?: string;
  onAlteracao?: () => void;
  onGuardado?: () => void;
  planoId?: string;       // se presente, ficha fica associada a este plano
  modoGuia?: boolean;     // se true, mostra só o fluxo do Guia
}) {
  const [vista, setVista] = useState<'biblioteca' | 'criar' | 'editar'>('biblioteca');
  const [textoReceita, setTextoReceita] = useState('');
  const [linkReceita, setLinkReceita] = useState('');
  const [ficha, setFicha] = useState<FichaTecnica>({ ...FICHA_VAZIA, elaboradoPor: nomeProfessor || FICHA_VAZIA.elaboradoPor });
  const [passo, setPasso] = useState<'link' | 'ficha'>('link');
  const [fichasGuardadas, setFichasGuardadas] = useState(() => getFichasProducao());
  const [guardadoMsg, setGuardadoMsg] = useState('');

  // Buscar UC do plano mais recente
  const planos = getPlanosAulaPorTurma(turmaId);
  const planoRecente = planos.find(p => p.ucId) || planos[0];
  const ucId = planoRecente?.ucId || '';
  const ucNome = planoRecente?.ucNome || '';

  function recarregar() { setFichasGuardadas(getFichasProducao()); }

  function guardarFicha(fichaConfirmada: FichaTecnica) {
    const now = new Date().toISOString();
    addOrUpdateFichaProducao({
      id: `ficha_${Date.now()}`,
      nomePrato: fichaConfirmada.nomePrato,
      classificacao: fichaConfirmada.classificacao,
      fichaNum: fichaConfirmada.fichaNum,
      numPorcoes: fichaConfirmada.numPorcoes,
      tempoPrep: fichaConfirmada.tempoPrep,
      tempoConf: fichaConfirmada.tempoConf,
      ingredientes: fichaConfirmada.ingredientes.map((ing, i) => ({ ...ing, id: `ing_${i}` })),
      preparacao: fichaConfirmada.preparacao.map((p, i) => ({ ...p, id: `passo_${i}` })),
      empratamento: fichaConfirmada.empratamento,
      alergenicos: fichaConfirmada.alergenicos.split(',').map(a => a.trim()).filter(Boolean),
      equipamento: fichaConfirmada.equipamento,
      conservacao: fichaConfirmada.conservacao,
      regeneracao: fichaConfirmada.regeneracao,
      kitchenflow: fichaConfirmada.kitchenflow,
      tecnicasSugeridas: fichaConfirmada.tecnicasDetectadas || [],
      ucsAssociadas: [ucId].filter(Boolean),
      elaboradoPor: nomeProfessor || fichaConfirmada.elaboradoPor,
      data: fichaConfirmada.data,
      criadoEm: now,
      atualizadoEm: now,
    });

    // Associar ao plano se existe planoId
    if (planoId) {
      const planos = getPlanosAula();
      const plano = planos.find(p => p.id === planoId);
      if (plano) {
        const fichasActuais = getFichasProducao();
        const novaFicha = fichasActuais[fichasActuais.length - 1];
        if (novaFicha && !plano.fichasIds.includes(novaFicha.id)) {
          addOrUpdatePlanoAula({ ...plano, fichasIds: [...plano.fichasIds, novaFicha.id], atualizadoEm: now });
        }
      }
    }

    try { localStorage.removeItem('ecl_ficha_draft'); } catch {}
    recarregar();
    onGuardado?.();
    setGuardadoMsg(fichaConfirmada.nomePrato || 'Ficha');
    setVista('apos_guardar' as any);
  }

  function novaFicha() {
    setFicha(FICHA_VAZIA);
    setTextoReceita('');
    setLinkReceita('');
    setPasso('link');
    setVista('criar');
  }

  // ── APÓS GUARDAR ─────────────────────────────────────────
  if ((vista as string) === 'apos_guardar') {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ background: 'var(--sage-pale)', border: '1px solid rgba(90,122,78,0.3)', borderRadius: 14, padding: 20, textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--sage)', marginBottom: 4 }}>Ficha guardada!</div>
          <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.6)' }}>{guardadoMsg}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
    return (
      <div>
        <div className="header-bar">
          <h2 className="display" style={{ margin: 0 }}>Fichas de Produção</h2>
          <button className="btn btn-primary" onClick={novaFicha}>+ Nova ficha</button>
        </div>

        {ucId && (
          <div style={{ padding:'8px 14px', background:'var(--copper-pale)', borderRadius:10, marginBottom:12, fontSize:12, color:'var(--copper)', border:'1px solid rgba(181,101,29,0.2)' }}>
            <strong>UC activa:</strong> {ucId} — {ucNome}
          </div>
        )}

        {fichasGuardadas.length === 0 && (
          <Card>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📄</div>
              <div className="display" style={{ fontSize: 18, marginBottom: 6 }}>Ainda não há fichas</div>
              <p className="muted">Uma aula pode ter 1 ou mais fichas de produção.</p>
              <Button onClick={novaFicha}>Criar primeira ficha →</Button>
            </div>
          </Card>
        )}

        {fichasGuardadas.length > 0 && (
          <div style={{ fontSize:12, color:'rgba(26,23,20,0.5)', marginBottom:10 }}>
            {fichasGuardadas.length} ficha{fichasGuardadas.length!==1?'s':''} criada{fichasGuardadas.length!==1?'s':''}. Podes adicionar mais ao mesmo plano de aula.
          </div>
        )}

        {fichasGuardadas.map(f => (
          <div key={f.id} className="option-card" onClick={() => {
            setFicha({
              nomePrato: f.nomePrato, classificacao: f.classificacao,
              fichaNum: f.fichaNum || '', alergenicos: (f.alergenicos||[]).join(', '),
              tempoPrep: f.tempoPrep||'', tempoConf: f.tempoConf||'',
              numPorcoes: f.numPorcoes||'',
              ingredientes: f.ingredientes.length > 0 ? f.ingredientes as any : FICHA_VAZIA.ingredientes,
              preparacao: f.preparacao.length > 0 ? f.preparacao as any : FICHA_VAZIA.preparacao,
              empratamento: f.empratamento||'', elaboradoPor: f.elaboradoPor||nomeProfessor||'',
              data: f.data||'', equipamento: f.equipamento||'',
              conservacao: f.conservacao||'', regeneracao: f.regeneracao||'',
              kitchenflow: f.kitchenflow||'',
            });
            setPasso('ficha');
            setVista('editar');
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{f.nomePrato}</div>
                <div className="muted">{f.classificacao} · {f.numPorcoes} porções · {f.data}</div>
                {(f.ucsAssociadas || []).length > 0 && <div style={{ fontSize:11, color:'var(--copper)' }}>{(f.ucsAssociadas || [])[0]}</div>}
              </div>
              <span className="stamp">Ver / Editar</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── CRIAR / EDITAR ────────────────────────────────────────
  if (passo === 'link' && vista === 'criar') {
    return (
      <PassoLink ucId={ucId} ucNome={ucNome} onContinuar={(texto, link) => {
        setTextoReceita(texto);
        setLinkReceita(link);
        setFicha(extrairFicha(texto));
        setPasso('ficha');
      }} onAlteracao={onAlteracao} />
    );
  }

  return (
    <div>
      {vista === 'criar' && (
        <button className="btn btn-ghost" style={{ marginBottom: 12 }} onClick={() => { try { localStorage.removeItem('ecl_ficha_draft'); } catch {} setVista('biblioteca'); }}>← Biblioteca</button>
      )}
      {vista === 'editar' && (
        <button className="btn btn-ghost" style={{ marginBottom: 12 }} onClick={() => setVista('biblioteca')}>← Biblioteca</button>
      )}
      <PassoFichaTecnica
        ficha={ficha}
        textoReceita={textoReceita}
        onContinuar={(fichaConfirmada) => {
          setFicha(fichaConfirmada);
          guardarFicha(fichaConfirmada);
        }}
        onVoltar={() => {
          try { localStorage.removeItem('ecl_ficha_draft'); } catch {}
          if (vista === 'criar') setPasso('link');
          else setVista('biblioteca');
        }}
      />
    </div>
  );
}

export default ProfessorView;


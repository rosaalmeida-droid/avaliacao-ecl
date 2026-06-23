import React, { useState } from 'react';
import { Comanda, FichaProducao } from '../types';
import { Button, Card, Field } from './ui';
import { addOrUpdateFichaProducao, getFichasProducao, getPlanosAulaPorTurma, buscarFichasSimilares, addOrUpdatePlanoAula, getPlanosAula, eliminarFichaProducaoDefinitivamente, proximoNumeroFicha } from '../backend';
import { EtiquetaLigacaoPlano } from './EtiquetaLigacaoPlano';
import { SeletorIA } from './SeletorIA';
import { encontrarMateriaPrima } from '../materiasPrimasBase';
import { obterComponenteCulinario } from '../componentesCulinarios';
import { GuiaProducao } from './GuiaProducao';
import { sugerirSubtecnicas } from '../subtecnicas';
import { getReferencialUC } from '../referencial811RA144';
import { exportDOCX, exportPDF, gerarHTML } from '../exportFicha';
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

// Limpa nomes de produtos com ruído típico da extracção IA: duplicações, conectores soltos
// Copia texto para a área de transferência com fallback se a API falhar
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
function normalizarFicha(f: any): FichaTecnica {
  const camposTexto: (keyof FichaTecnica)[] = [
    'nomePrato', 'classificacao', 'fichaNum', 'alergenicos', 'tempoPrep', 'tempoConf',
    'numPorcoes', 'empratamento', 'elaboradoPor', 'data', 'equipamento',
    'conservacao', 'regeneracao', 'kitchenflow', 'textoGuia',
  ];
  const out: any = { ...FICHA_VAZIA, ...f };
  camposTexto.forEach(campo => {
    const v = out[campo];
    if (Array.isArray(v)) out[campo] = v.join(', ');
    else if (v != null && typeof v !== 'string') out[campo] = String(v);
    else if (v == null) out[campo] = '';
  });
  if (!Array.isArray(out.ingredientes) || out.ingredientes.length === 0) out.ingredientes = FICHA_VAZIA.ingredientes;
  if (!Array.isArray(out.preparacao) || out.preparacao.length === 0) out.preparacao = FICHA_VAZIA.preparacao;
  return out as FichaTecnica;
}

function limparNomeProduto(nome: string): string {
  let t = nome.trim()
    .replace(/[.,;:!?]+$/g, '')              // pontuação no fim
    .replace(/^\s*(é|de|da|do|das|dos)\s+/i, '') // conector solto no início
    .replace(/\s+/g, ' ')
    .trim();
  // Remover palavra duplicada consecutiva: "ovo ovo" → "ovo", "Ovo, é ovo" → "Ovo"
  t = t.replace(/\b(\w+)([\s,]+\1\b)+/gi, '$1');
  return t;
}

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
  // Detectar se o texto colado é o PROMPT (não a resposta da IA)
  // Sinais: contém os marcadores literais de instrução do prompt
  const ehPrompt = /\[nome sem marcas\]|\[Peixe \/ Carne|\[lista dos 14 alerg|\[X min\]|Analisa a (página|receita|Ficha)/i.test(texto.slice(0, 500));
  if (ehPrompt) {
    return { ...FICHA_VAZIA, nomePrato: '⚠️ Colaste o PROMPT, não o resultado — vai à IA e cola a RESPOSTA dela aqui' };
  }

  // Limpar markdown mas SEM danificar tabelas com |
  texto = texto
    .replace(/\*\*([^*]+)\*\*/g, '$1')          // **negrito** → negrito
    .replace(/\*([^*\n]+)\*/g, '$1')             // *itálico* → itálico (sem cruzar linhas)
    .replace(/^#{1,4}\s+/gm, '')                 // ## headers
    .replace(/^>\s*/gm, '')                      // > citações
    .replace(/`([^`]+)`/g, '$1')                 // `código`
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')     // [texto](link) → texto
    .replace(/^[-]{3,}$/gm, '')                  // linhas --- sozinhas (não dentro de tabelas)
    .replace(/\n{3,}/g, '\n\n');                 // múltiplas linhas vazias

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
            const produto = limparNomeProduto(partes[3] || '');
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
            const produto = limparNomeProduto(m[4]?.trim() || '');
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
                produto: limparNomeProduto(mSimples[1]?.trim() || ''),
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
function gerarPrompt(linkReceita: string, ucId?: string, ucNome?: string, modoProf?: boolean): string {
  const ucContexto = ucId ? `\nCONTEXTO PEDAGÓGICO: Esta ficha pertence à UC ${ucId} — ${ucNome || ''}.\nAs técnicas e competências devem ser específicas desta UC.` : '';

  const blocoProf = modoProf ? `

═══════════════════════════════════════════════════
MODO PROFISSIONAL — LÊ ANTES DE TUDO O RESTO
═══════════════════════════════════════════════════

Esta ficha é para uma cozinha pedagógica profissional de nível Secundário (Curso Profissional).
Usa o link como INSPIRAÇÃO — não como receita literal a copiar.

ELEVA a receita para nível profissional:

1. TÉCNICAS — substitui métodos caseiros por técnicas de cozinha clássica:
   - "fritar" → saltear, confitar, poêler ou fritar por imersão (especificar)
   - "cozinhar" → escalfar, branquear, estufar, brasear (o mais correcto para o produto)
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

6. TÉCNICAS DETECTADAS — lista apenas técnicas profissionais, não caseiras

` : '';

  return `Analisa a receita e extrai a informação NO FORMATO EXATO abaixo.
Aplica TODAS as regras obrigatórias antes de responder.${ucContexto}${blocoProf}

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
- O objectivo é explicar, formar e contextualizar tecnicamente o aluno, com profundidade real — este é material de estudo profissional, não um resumo superficial
- Usa SEMPRE os ingredientes e a preparação reais da Ficha acima — nunca inventes valores diferentes
- Linguagem clara e directa, adequada a um aluno de 14-16 anos, mas sem perder rigor técnico nem profundidade de conteúdo
- Prefere tabelas, esquemas e listas estruturadas a parágrafos longos e densos — o objectivo é tornar o conteúdo mais fácil de estudar visualmente, sem cortar conteúdo
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

Que capacidades técnicas e organizativas esta produção desenvolve no aluno, e porquê são relevantes para o seu percurso profissional.

---
# 6. EQUILÍBRIO SENSORIAL

Para cada um destes 5 sabores, classifica a intensidade nesta receita concreta (usa: Forte / Presente / Ausente):
DOCE: 
ÁCIDO: 
SALGADO: 
AMARGO: 
UMAMI: 

Depois, desenvolve em 1 parágrafo: como estes sabores se equilibram (ou não) nesta receita concreta, e o impacto disso na experiência gastronómica.

---
# 7. SUGESTÕES GASTRONÓMICAS

Apenas sugestões — nunca alterar a receita original. Sugere acompanhamentos, harmonizações ou variações, justificando tecnicamente cada uma (elemento ácido, crocante, fresco, aromático, contraste de textura).

---
# 8. SUSTENTABILIDADE

Como esta produção se relaciona com sustentabilidade — aproveitamento integral do ingrediente principal, redução de desperdício, sazonalidade, origem local quando aplicável.

---
# 9. FOOD COST PEDAGÓGICO

Liga-se à secção 4 (Rendimentos): para cada apresentação comercial comparada, estima o impacto no food cost. Tabela seguida de interpretação sobre que opção é mais vantajosa e em que contexto.

---
# 10. TÉCNICAS E MICROCOMPETÊNCIAS TÉCNICAS

Lista as técnicas culinárias específicas mobilizadas nesta produção (ex: branqueamento, redução, emulsão, ponto de cozedura), cada uma com uma explicação técnica real do que exige e porque é crítica para o resultado final.

---
# 11. CONHECIMENTOS A CONSOLIDAR

Lista os conhecimentos teóricos que esta produção exige ou reforça (ex: reacções químicas envolvidas, princípios de conservação, bases de confecção), ligados ao referencial oficial da UC.

---
# 12. QUESTÕES PARA ESTUDO

Gera entre 8 e 10 questões de estudo sobre esta produção concreta — mistura de escolha múltipla, verdadeiro/falso e resposta curta — cobrindo ingredientes, técnica, HACCP e fundamentos teóricos. Inclui as respostas certas no fim.

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
      <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
        Copia o prompt, cola numa IA com o link da receita e copia o resultado abaixo.
      </div>
      <SeletorIA prompt={promptFinal} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
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
        <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
          Após criar a ficha, usa este prompt para gerar o Guia de Apoio completo com HACCP, rendimentos, equilíbrio sensorial e questões pedagógicas.
        </div>
        <SeletorIA prompt={guiaFinal} corPrincipal="var(--guia)" />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
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
  const [nomePrato, setNomePrato] = useState(nomePratoInicial || '');
  const [erro, setErro] = useState('');
  const [fichasSimilares, setFichasSimilares] = useState<any[]>([]);
  const [mostrarSimilares, setMostrarSimilares] = useState(false);
  const [copiadoFicha, setCopiadoFicha] = useState(false);
  const [copiadoGuia, setCopiadoGuia] = useState(false);
  const [modoProf, setModoProf] = useState(false); // modo profissional — eleva técnicas

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

  function carregar() {
    if (!textoManual) return;
    // Detectar se colou o PROMPT em vez da RESPOSTA da IA
    const ehPrompt = /\[nome sem marcas\]|\[Peixe \/ Carne|\[lista dos 14 alerg|\[X min\]|Analisa a (página|receita|Ficha)/i.test(textoManual.slice(0, 500));
    if (ehPrompt) {
      setErro('⚠️ Isto parece ser o PROMPT, não o resultado da IA. Cola o texto que a IA respondeu, não o que enviaste.');
      return;
    }
    try { localStorage.removeItem('ecl_ficha_draft'); } catch {}
    const textoFinal = textoManual.includes('NOME DO PRATO:')
      ? textoManual
      : (nomePrato ? nomePrato + '\n' : '') + textoManual;
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
        <div style={{ fontSize:12, color:'rgba(26,23,20,0.55)', marginBottom:10 }}>
          Claude abre já com o prompt pronto — ChatGPT e Gemini abrem com o prompt copiado, basta colar
        </div>

        {/* Selector de modo — fiel ao link ou versão profissional */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button type="button"
            onClick={() => setModoProf(false)}
            style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: `2px solid ${!modoProf ? 'var(--copper)' : 'var(--border)'}`, background: !modoProf ? 'var(--copper)' : '#fff', color: !modoProf ? 'white' : 'rgba(26,23,20,0.6)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
            📄 Fiel ao link
          </button>
          <button type="button"
            onClick={() => setModoProf(true)}
            style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: `2px solid ${modoProf ? 'var(--sage)' : 'var(--border)'}`, background: modoProf ? 'var(--sage)' : '#fff', color: modoProf ? 'white' : 'rgba(26,23,20,0.6)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
            ⭐ Versão profissional
          </button>
        </div>
        {modoProf && (
          <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(90,122,78,0.08)', border: '1px solid rgba(90,122,78,0.2)', fontSize: 11, color: 'var(--sage)', marginBottom: 10 }}>
            A IA vai elevar as técnicas para nível profissional — cortes com nomenclatura clássica, métodos de confeção precisos, massas base assinaladas para produção em aula.
          </div>
        )}

        <SeletorIA prompt={promptFicha} />
        <button type="button" className="btn btn-ghost" style={{ width:'100%', fontSize:12 }}
          onClick={() => copiarTexto(promptFicha, () => { setCopiadoFicha(true); setTimeout(()=>setCopiadoFicha(false),3000); }, () => {})}>
          {copiadoFicha ? '✅ Copiado!' : '📋 Copiar prompt'}
        </button>

        {/* Guia — só aparece se já tem nome do prato */}
        {nomePrato && (
          <div style={{ marginTop:14, paddingTop:12, borderTop:'1px solid rgba(181,101,29,0.2)' }}>
            <div style={{ fontWeight:700, fontSize:14, color:'var(--sage)', marginBottom:4 }}>
              📚 Passo 2 — Gerar o Guia de Apoio (depois da ficha pronta)
            </div>
            <SeletorIA prompt={promptGuia} corPrincipal="var(--guia)" />
            <button type="button" className="btn btn-ghost" style={{ width:'100%', fontSize:12, borderColor:'var(--sage)', color:'var(--sage)' }}
              onClick={() => copiarTexto(promptGuia, () => { setCopiadoGuia(true); setTimeout(()=>setCopiadoGuia(false),3000); }, () => {})}>
              {copiadoGuia ? '✅ Copiado!' : '📋 Copiar prompt do Guia'}
            </button>
          </div>
        )}
        {!nomePrato && (
          <div style={{ marginTop:10, padding:'8px 12px', background:'rgba(90,122,78,0.08)', borderRadius:8, fontSize:12, color:'var(--sage)' }}>
            💡 Preenche o nome do prato acima para activar o Guia de Apoio
          </div>
        )}
      </div>

      {/* 4. CAIXA RESULTADO */}
      <div style={{ background:'rgba(181,101,29,0.04)', borderRadius:10, padding:'12px 14px', marginBottom:12, border:'1px solid rgba(181,101,29,0.15)' }}>
        <div style={{ fontWeight:700, fontSize:14, color:'var(--copper)', marginBottom:4 }}>
          📥 Passo 3 — Cola aqui o resultado da IA
        </div>
        <div style={{ fontSize:12, color:'rgba(26,23,20,0.55)', marginBottom:8 }}>
          Cola o resultado da ficha <strong>ou</strong> do guia — a app detecta automaticamente qual é.
        </div>
        <textarea className="input" value={textoManual}
          onChange={e => { setTextoManual(e.target.value); setErro(''); onAlteracao?.(); }}
          placeholder={'Cola aqui o texto gerado pela IA...\n\nExemplo:\nNOME DO PRATO: Sopa Juliana\nCLASSIFICAÇÃO: Sopa\nNº DE DOSES: 4\n\nINGREDIENTES:\n...\nPREPARAÇÃO:\n...'}
          style={{ minHeight:180, fontSize:13, fontFamily:'monospace', background:'#fff' }} />
        {textoManual && (
          <button type="button" className="btn btn-primary" style={{ width:'100%', marginTop:8 }}
            onClick={carregar}>
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
                <div style={{ fontSize:13, color: 'rgba(26,23,20,0.5)' }}>{String(f.classificacao ?? '')} · {String(f.data ?? '')}</div>
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
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Alergénicos detetados</div>
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
        <Button block variant="ghost" onClick={() => {
          // Guardar draft antes de voltar — não perde o trabalho
          try { localStorage.setItem('ecl_ficha_draft', JSON.stringify(ficha)); } catch {}
          onVoltar();
        }}>← Voltar (guarda rascunho)</Button>
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

        {/* TÉCNICAS DETECTADAS — ligar às microcompetências */}
        {ficha.tecnicasDetectadas && ficha.tecnicasDetectadas.length > 0 && (
          <div style={{ background: 'var(--copper-pale)', border: '1px solid rgba(181,101,29,0.2)', borderRadius: 12, padding: 16, marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--copper)', marginBottom: 8 }}>
              🎯 Técnicas detectadas — para avaliação
            </div>
            <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.6)', marginBottom: 8 }}>
              O motor vai sugerir estas competências ao professor quando avaliar esta ficha. Toca para remover as que não se aplicam.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ficha.tecnicasDetectadas.map((t, i) => (
                <button key={i} type="button"
                  onClick={() => setFicha(f => ({ ...f, tecnicasDetectadas: (f.tecnicasDetectadas || []).filter((_, idx) => idx !== i) }))}
                  style={{ padding: '4px 10px', borderRadius: 20, background: 'white', border: '1px solid rgba(181,101,29,0.3)', fontSize:13, color: 'var(--copper)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {t} <span style={{ fontSize: 11, opacity: 0.6 }}>✕</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Adicionar técnica manualmente */}
        <div style={{ marginBottom: 10 }}>
          <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }}
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
              };
              onContinuar(fichaSegura);
            }} disabled={!ficha.nomePrato}>
            ✓ Guardar Ficha de Produção
          </button>
          {!ficha.nomePrato && <div style={{ textAlign:'center', fontSize:13, color:'var(--danger)', marginTop:6 }}>Preenche o nome do prato para guardar.</div>}
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
  // Encontrar a ficha-alvo UMA VEZ ao montar — não recalcula a cada render do pai
  const [fichaAlvo] = useState<FichaProducao | null>(() => {
    const fichasDoPlano = planoId
      ? getFichasProducao().filter(f => (f as any).planoAulaId === planoId)
      : getFichasProducao();
    // Ordenar por data de criação real — não confiar na ordem do array
    const ordenadas = [...fichasDoPlano].sort((a, b) => (a.criadoEm || '').localeCompare(b.criadoEm || ''));
    return ordenadas[ordenadas.length - 1] || null;
  });
  const nomePrato = nomePratoInicial || fichaAlvo?.nomePrato || '';
  const [textoGuia, setTextoGuia] = useState((fichaAlvo as any)?.textoGuia || '');
  const [modo, setModo] = useState<'colar' | 'ver'>((fichaAlvo as any)?.textoGuia ? 'ver' : 'colar');
  const [guardadoOk, setGuardadoOk] = useState(false);

  if (!fichaAlvo) {
    return (
      <div style={{ padding: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📚</div>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Ainda não há nenhuma ficha</div>
        <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.55)' }}>Cria primeiro uma Ficha de Produção para depois gerar o Guia.</div>
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
        <EtiquetaLigacaoPlano planoAulaId={(fichaAlvo as any)?.planoAulaId} />
      </div>

      <Card>
        <div className="no-print" style={{ fontWeight: 700, fontSize: 14, color: 'var(--sage)', marginBottom: 8 }}>1. Gerar com IA</div>
        <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SeletorIA prompt={promptGuiaAtual} corPrincipal="var(--guia)" />
          <button type="button" className="btn btn-ghost" style={{ fontSize: 12, borderColor: 'var(--sage)', color: 'var(--sage)' }}
            onClick={() => copiarTexto(promptGuiaAtual, () => {}, () => {})}>
            📋 Copiar prompt
          </button>
        </div>

        <div className="no-print" style={{ fontWeight: 700, fontSize: 14, color: 'var(--sage)', marginTop: 16, marginBottom: 8 }}>2. Colar o resultado</div>

        {modo === 'colar' && (
          <div className="no-print">
            <textarea
              value={textoGuia}
              onChange={e => setTextoGuia(e.target.value)}
              placeholder={`Cola aqui o resultado da IA para o Guia de Apoio à Produção de "${nomePrato}"...`}
              style={{ width: '100%', minHeight: 160, borderRadius: 10, border: '1.5px solid var(--border)', padding: 10, fontSize: 12, fontFamily: 'monospace', resize: 'vertical' }}
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
            <button onClick={() => setModo('colar')} className="no-print" style={{ marginBottom: 10, padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', fontSize: 12 }}>
              ← Editar texto
            </button>
            <div className="guia-area-impressao">
              <GuiaProducao textoGuia={textoGuia} nomePrato={nomePrato} />
            </div>
          </>
        )}

        {/* Gravação EXPLÍCITA — só ao clicar, nunca automática a cada tecla */}
        <button className="btn btn-primary btn-block no-print" style={{ marginTop: 16 }}
          disabled={!textoGuia}
          onClick={guardarGuia}>
          {guardadoOk ? '✅ Guia guardado!' : '💾 Guardar Guia'}
        </button>

        {textoGuia && (
          <button className="btn btn-ghost btn-block no-print" style={{ marginTop: 10 }}
            onClick={() => window.print()}>
            🖨️ Imprimir Guia
          </button>
        )}

        <button className="btn btn-block no-print" style={{ marginTop: 10, background: 'var(--copper)', color: 'white' }}
          onClick={() => { if (textoGuia && !guardadoOk) guardarGuia(); onGuardado?.(); }}>
          ✓ Concluir Guia
        </button>
      </Card>
    </div>
  );
}

export function ProfessorView({ turmaId, nomeProfessor, onAlteracao, onGuardado, planoId, modoGuia, nomePratoInicial }: {
  turmaId: string;
  nomeProfessor?: string;
  onAlteracao?: () => void;
  onGuardado?: () => void;
  planoId?: string;
  modoGuia?: boolean;
  nomePratoInicial?: string;
}) {
  const [vista, setVista] = useState<'biblioteca' | 'criar' | 'editar'>('biblioteca');
  // ID da ficha original quando em modo 'editar' — sem isto, guardar uma
  // edição criava sempre uma ficha NOVA em vez de atualizar a existente
  // (causa real de fichas duplicadas: "Bacalhau", "Bacalhau 2", "Bacalhau 3"...)
  const [fichaEmEdicaoId, setFichaEmEdicaoId] = useState<string | null>(null);
  const [textoReceita, setTextoReceita] = useState('');
  const [linkReceita, setLinkReceita] = useState('');
  const [ficha, setFicha] = useState<FichaTecnica>({ ...FICHA_VAZIA, elaboradoPor: nomeProfessor || FICHA_VAZIA.elaboradoPor });
  const [passo, setPasso] = useState<'link' | 'ficha'>('link');
  const [fichasGuardadas, setFichasGuardadas] = useState(() => getFichasProducao());
  const [mostrarBibliotecaCompleta, setMostrarBibliotecaCompleta] = useState(false);
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
      let nomeFinal = fichaConfirmada.nomePrato || '';
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
            classificacao: fichaConfirmada.classificacao || '',
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
      const novaFichaId = (vista === 'editar' && fichaEmEdicaoId) ? fichaEmEdicaoId : `ficha_${Date.now()}`;
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
        ucsAssociadas: [ucId].filter(Boolean),
        elaboradoPor: nomeProfessor || fichaConfirmada.elaboradoPor || '',
        data: fichaConfirmada.data || now,
        planoAulaId: fichaOriginal?.planoAulaId || planoId || undefined,
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
        if (plano && !plano.fichasIds.includes(novaFichaId)) {
          addOrUpdatePlanoAula({ ...plano, fichasIds: [...plano.fichasIds, novaFichaId], atualizadoEm: now });
        }
      }

      try { localStorage.removeItem('ecl_ficha_draft'); localStorage.removeItem('ecl_link_draft'); } catch {}
      recarregar();
      onGuardado?.();
      setUltimaFichaIdGuardada(novaFichaId);
      const nomeOriginal = fichaConfirmada.nomePrato || '';
      setGuardadoMsg(nomeFinal !== nomeOriginal
        ? `${nomeFinal} (renomeado de "${nomeOriginal}" — já existia uma ficha com esse nome)`
        : (nomeFinal || 'Ficha'));
      setVista('apos_guardar' as any);
    } catch (err) {
      console.error('Erro ao guardar ficha:', err);
      alert('Ocorreu um erro ao guardar a ficha. Os dados não se perderam — tenta novamente. Detalhe: ' + String(err));
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
    const fichasDoPlano = planoId
      ? fichasGuardadas.filter(f => (f as any).planoAulaId === planoId)
      : fichasGuardadas;
    const fichasParaMostrar = mostrarBibliotecaCompleta ? fichasGuardadas : fichasDoPlano;

    return (
      <div style={{ background: 'var(--sage-pale)', borderRadius: 16, padding: 16 }}>
        <div style={{ background: 'var(--sage)', borderRadius: 14, padding: '14px 18px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <h2 className="display" style={{ margin: 0, color: 'white' }}>Fichas de Produção</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => { setModoSelecao(!modoSelecao); setFichasSelecionadasIds(new Set()); }}
              style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.4)', color: 'white' }}>
              {modoSelecao ? '✕ Cancelar' : '☑ Selecionar'}
            </button>
            <button className="btn btn-primary" onClick={novaFicha} style={{ background: 'white', color: 'var(--sage)' }}>+ Nova ficha</button>
          </div>
        </div>

        {modoSelecao && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--danger-pale)', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600, flex: 1 }}>
              {fichasSelecionadasIds.size} ficha(s) selecionada(s)
            </span>
            <button onClick={() => {
              if (fichasSelecionadasIds.size === 0) return;
              if (confirm(`Eliminar DEFINITIVAMENTE ${fichasSelecionadasIds.size} ficha(s)? Remove do telemóvel/computador E do Google Sheets — não pode ser desfeito.`)) {
                fichasSelecionadasIds.forEach(id => eliminarFichaProducaoDefinitivamente(id));
                setFichasSelecionadasIds(new Set());
                setModoSelecao(false);
                recarregar();
              }
            }} disabled={fichasSelecionadasIds.size === 0}
              style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'var(--danger)', color: 'white', fontWeight: 700, fontSize: 12, cursor: fichasSelecionadasIds.size === 0 ? 'default' : 'pointer', opacity: fichasSelecionadasIds.size === 0 ? 0.4 : 1 }}>
              🗑️ Eliminar Selecionados
            </button>
          </div>
        )}

        {ucId && (
          <div style={{ padding:'8px 14px', background:'var(--copper-pale)', borderRadius:10, marginBottom:12, fontSize:12, color:'var(--copper)', border:'1px solid rgba(181,101,29,0.2)' }}>
            <strong>UC activa:</strong> {ucId} — {ucNome}
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
                {mostrarBibliotecaCompleta ? 'Ainda não há fichas em nenhum plano' : 'Ainda não há fichas neste plano'}
              </div>
              <p className="muted">Uma aula pode ter 1 ou mais fichas de produção.</p>
              <Button onClick={novaFicha}>Criar primeira ficha →</Button>
            </div>
          </Card>
        )}

        {fichasParaMostrar.length > 0 && (
          <div style={{ fontSize:12, color:'rgba(26,23,20,0.5)', marginBottom:10 }}>
            {fichasParaMostrar.length} ficha{fichasParaMostrar.length!==1?'s':''}
            {mostrarBibliotecaCompleta ? ' em toda a app — clica para associar a este plano' : ' associada(s) a este plano'}.
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
              if (plano && !plano.fichasIds.includes(f.id)) {
                addOrUpdatePlanoAula({ ...plano, fichasIds: [...plano.fichasIds, f.id], atualizadoEm: new Date().toISOString() });
                recarregar();
                onAlteracao?.();
                onGuardado?.(); // avisa o componente pai (VistaDePlano) para recarregar o plano actualizado
              }
              setMostrarBibliotecaCompleta(false);
              setVista('biblioteca');
              return;
            }
            setFicha(normalizarFicha({
              nomePrato: f.nomePrato, classificacao: f.classificacao,
              fichaNum: f.fichaNum || '', alergenicos: f.alergenicos,
              tempoPrep: f.tempoPrep||'', tempoConf: f.tempoConf||'',
              numPorcoes: f.numPorcoes||'',
              ingredientes: f.ingredientes && f.ingredientes.length > 0 ? f.ingredientes as any : FICHA_VAZIA.ingredientes,
              preparacao: f.preparacao && f.preparacao.length > 0 ? f.preparacao as any : FICHA_VAZIA.preparacao,
              empratamento: f.empratamento||'', elaboradoPor: f.elaboradoPor||nomeProfessor||'',
              data: f.data||'', equipamento: f.equipamento||'',
              conservacao: f.conservacao||'', regeneracao: f.regeneracao||'',
              kitchenflow: f.kitchenflow||'',
            }));
            setPasso('ficha');
            setFichaEmEdicaoId(f.id);
            setVista('editar');
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {modoSelecao && (
                <div style={{ width: 20, height: 20, borderRadius: 5, border: '2px solid var(--copper)', background: fichasSelecionadasIds.has(f.id) ? 'var(--copper)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, color: 'white' }}>
                  {fichasSelecionadasIds.has(f.id) && '✓'}
                </div>
              )}
              {mostrarBibliotecaCompleta && <span style={{ fontSize: 18, color: 'var(--sage)' }}>+</span>}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{f.nomePrato}</div>
                <div className="muted">{f.classificacao} · {f.numPorcoes} porções · {f.data}</div>
                {(f.ucsAssociadas || []).length > 0 && <div style={{ fontSize:13, color:'var(--copper)' }}>{(f.ucsAssociadas || [])[0]}</div>}
                <EtiquetaLigacaoPlano planoAulaId={f.planoAulaId} />
              </div>
              <span className="stamp">Ver / Editar</span>
              <button onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Eliminar definitivamente "${f.nomePrato}"? Esta ação remove a ficha do telemóvel/computador E do Google Sheets — não pode ser desfeita.`)) {
                  eliminarFichaProducaoDefinitivamente(f.id);
                  recarregar();
                }
              }} style={{ background: 'none', border: 'none', color: 'rgba(26,23,20,0.3)', fontSize: 16, cursor: 'pointer', padding: '4px 6px', flexShrink: 0 }}
                title="Eliminar definitivamente">
                🗑️
              </button>
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

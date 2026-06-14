import React, { useState } from 'react';
import { Comanda } from '../types';
import { Button, Card, Field, Chip } from './ui';
import { getCompetencia } from '../competencias';
import { addComanda } from '../backend';
import { EditorComanda, ESTADO_VAZIO, estadoParaComanda, EditorComandaState } from './EditorComanda';
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
    { num: 1, descricao: '', temperatura: '', tempo: '', obs: '' }
  ],
  empratamento: '',
  elaboradoPor: 'rosa.almeida@eclisboa.net',
  data: new Date().toLocaleDateString('pt-PT'),
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
  // Metadados que não são passos de preparação
  const regexMetadados = /^(nº\s+de\s+doses|número\s+de\s+doses|doses|porções|tempo\s+de\s+prepara|tempo\s+de\s+confec|tempo\s+total|serve\s+\d)/i;

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
    const dosesIA = extrair('Nº DE DOSES');
    const tPrepIA = extrair('TEMPO DE PREPARAÇÃO');
    const tConfIA = extrair('TEMPO DE CONFEÇÃO');
    const alergenicosIA = extrair('ALERGÉNICOS');

    // Ingredientes com separador |
    const secIngIA = texto.match(/INGREDIENTES:\n([\s\S]*?)(?=\nPREPARAÇÃO:|$)/i);
    const ingredientesIA: LinhaIngrediente[] = [];
    if (secIngIA) {
      const linhasIng = secIngIA[1].split('\n').filter(l => l.includes('|') && !l.toUpperCase().includes('COMPONENTE'));
      for (const linha of linhasIng) {
        const partes = linha.split('|').map(p => p.trim());
        if (partes.length >= 4) {
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
      }
    }

    // Preparação com separador |
    const secPrepIA = texto.match(/PREPARAÇÃO:\n([\s\S]*?)(?=\nEMPRATAMENTO:|$)/i);
    const preparacaoIA: PassoPreparacao[] = [];
    if (secPrepIA) {
      const linhasPrep = secPrepIA[1].split('\n').filter(l => l.includes('|') && !/^NR\s*\|/i.test(l));
      for (const linha of linhasPrep) {
        const partes = linha.split('|').map(p => p.trim());
        if (partes.length >= 2 && partes[1]) {
          preparacaoIA.push({
            num: parseInt(partes[0]) || preparacaoIA.length + 1,
            descricao: partes[1] || '',
            temperatura: partes[2] || '',
            tempo: partes[3] || '',
            obs: partes[4] || '',
          });
        }
      }
    }

    // Empratamento
    const empratamentoIA = extrair('EMPRATAMENTO');

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
      preparacao: preparacaoIA.length > 0 ? preparacaoIA : [{ num: 1, descricao: '', temperatura: '', tempo: '', obs: '' }],
      empratamento: empratamentoIA,
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
    });
  }

  if (preparacao.length === 0) {
    preparacao.push({ num: 1, descricao: '', temperatura: '', tempo: '', obs: '' });
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
function gerarPrompt(linkReceita: string): string {
  return `Analisa a receita neste link e extrai a informação NO FORMATO EXATO abaixo.
Não alteres os títulos. Não acrescentes texto extra. Não acrescentes explicações.
Usa o separador | entre colunas. Usa q.b. quando a quantidade não é especificada.

NOME DO PRATO: [nome da receita]
CLASSIFICAÇÃO: [Peixe / Carne / Aves / Sobremesa / Sopa / Entrada / Massa / Vegetariano / Outro]
Nº DE DOSES: [número]
TEMPO DE PREPARAÇÃO: [X min]
TEMPO DE CONFEÇÃO: [X min]
ALERGÉNICOS: [lista dos alergénicos presentes, ex: Glúten, Ovos, Peixe, Soja]

INGREDIENTES:
COMPONENTE | QT | UN | PRODUTO | T.PREP | T.CONF | OBS
[componente ou vazio] | [quantidade] | [unidade: g/kg/ml/l/un/cs/cc/q.b.] | [nome do produto] | [tempo prep se aplicável] | [tempo conf se aplicável] | [observações]

PREPARAÇÃO:
NR | DESCRIÇÃO | TEMP | TEMPO | OBS
1 | [descrição do passo] | [temperatura ex: 180ºC ou vazio] | [tempo ex: 5 min ou vazio] | [observações ou vazio]

EMPRATAMENTO:
[descrição da apresentação e empratamento do prato]

Link: ${linkReceita}`;
}

// ============================================================
// Passo 1 — Introduzir link ou texto da receita
// ============================================================
function PassoLink({ onContinuar }: { onContinuar: (texto: string, link: string) => void }) {
  const [link, setLink] = useState('');
  const [textoManual, setTextoManual] = useState('');
  const [nomePrato, setNomePrato] = useState('');
  const [a_carregar, setACarregar] = useState(false);
  const [mostrarManual, setMostrarManual] = useState(false);
  const [erro, setErro] = useState('');

  async function carregar() {
    if (!link && !textoManual) return;
    if (textoManual) {
      onContinuar((nomePrato ? nomePrato + '\n' : '') + textoManual, link);
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
        📋 Nova comanda — Passo 1: Receita
      </div>

      <Field label="Link da receita (internet)">
        <input
          className="input"
          value={link}
          onChange={e => { setLink(e.target.value); setMostrarManual(false); setErro(''); }}
          placeholder="https://www.pingodoce.pt/receitas/..."
        />
      </Field>

      {link && !mostrarManual && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
            🤖 Extrair receita com IA
          </div>
          <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
            Escolhe uma IA, copia o resultado e cola na caixa de texto abaixo.
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-ghost"
              onClick={() => window.open(`https://claude.ai/new?q=${encodeURIComponent(gerarPrompt(link))}`, '_blank')}>
              🟠 Claude
            </button>
            <button type="button" className="btn btn-ghost"
              onClick={() => window.open(`https://chatgpt.com/?q=${encodeURIComponent(gerarPrompt(link))}`, '_blank')}>
              🟢 ChatGPT
            </button>
            <button type="button" className="btn btn-ghost"
              onClick={() => {
                navigator.clipboard.writeText(gerarPrompt(link));
                alert('Prompt copiado! Cola numa IA à tua escolha.');
              }}>
              📋 Copiar prompt
            </button>
          </div>
        </div>
      )}

      {!mostrarManual && (
        <Button block onClick={carregar} disabled={(!link && !textoManual) || a_carregar}>
          {a_carregar ? 'A carregar...' : 'Tentar ler automaticamente →'}
        </Button>
      )}

      {(mostrarManual || !link) && (
        <>
          <div className="divider" />
          {nomePrato && (
            <Field label="Nome do prato (detetado automaticamente)">
              <input className="input" value={nomePrato} onChange={e => setNomePrato(e.target.value)} />
            </Field>
          )}
          {erro && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 8 }}>{erro}</div>}
          <Field label={mostrarManual ? 'Cola aqui os ingredientes e modo de preparação' : 'Ou cola o texto da receita diretamente'}>
            <textarea
              className="input"
              value={textoManual}
              onChange={e => setTextoManual(e.target.value)}
              placeholder={mostrarManual
                ? 'Ex:\nIngredientes\n2 sakus de atum\n1 cs de óleo de sésamo\n...\n\nPreparação\n1. Tempere o atum...'
                : 'Cola aqui o texto completo da receita...'}
              style={{ minHeight: 140 }}
            />
          </Field>
          <Button block onClick={carregar} disabled={!textoManual && !link}>
            Continuar →
          </Button>
        </>
      )}
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
      preparacao: [...prev.preparacao, { num: prev.preparacao.length + 1, descricao: '', temperatura: '', tempo: '', obs: '' }],
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
        <div className="display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
          📋 Passo 2: Ficha Técnica
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
            try { exportPDF(ficha as any); } 
            catch(e) { alert('Erro ao gerar PDF'); }
          }}>🖨️ PDF</Button>
          <Button variant="ghost" onClick={async () => {
            try {
              await exportDOCX(ficha as any);
            } catch(e) {
              alert('Erro ao gerar Word: ' + String(e));
            }
          }}>📄 Word</Button>
        </div>
        <div style={{ height: 8 }} />
        <Button block onClick={() => onContinuar(ficha)} disabled={!ficha.nomePrato}>
          Continuar para Competências →
        </Button>
      </Card>
    </div>
  );
}

// ============================================================
// Vista principal do Professor — orquestra os 3 passos
// ============================================================
export function ProfessorView({ turmaId }: { turmaId: string }) {
  const [passo, setPasso] = useState<'link' | 'ficha' | 'comanda'>('link');
  const [textoReceita, setTextoReceita] = useState('');
  const [linkReceita, setLinkReceita] = useState('');
  const [ficha, setFicha] = useState<FichaTecnica>(FICHA_VAZIA);
  const [criada, setCriada] = useState<Comanda | null>(null);

  function guardarComanda(estado: EditorComandaState) {
    const comanda = estadoParaComanda(estado, turmaId);
    // Guardar também o nome da receita da ficha técnica
    const comandaFinal = { ...comanda, titulo: ficha.nomePrato || comanda.titulo };
    addComanda(comandaFinal);
    setCriada(comandaFinal);
  }

  // Estado inicial do EditorComanda com dados da ficha e link
  const estadoInicial: EditorComandaState = {
    ...ESTADO_VAZIO,
    titulo: ficha.nomePrato,
    linkOuTexto: linkReceita || textoReceita.slice(0, 200),
  };

  if (criada) {
    const todasFixas = [...criada.tecnicasFixas, ...criada.atitudesFixas, ...criada.responsabilidadesFixas];
    return (
      <Card>
        <div className="display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>✅ Comanda criada</div>
        <div style={{ marginBottom: 10 }}>
          <strong>{criada.titulo}</strong>
        </div>
        <div className="muted" style={{ marginBottom: 12 }}>
          Alunos: {criada.alunosIds.map(id => id.split('-').pop()).join(', ')}
          <br />
          <span className="mono" style={{ fontSize: 11 }}>IDs: {criada.alunosIds.join(', ')}</span>
        </div>
        {todasFixas.length > 0 && (
          <>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Competências obrigatórias:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {todasFixas.map(id => (
                <span key={id} className="chip selected">🔒 {getCompetencia(id)?.nome}</span>
              ))}
            </div>
          </>
        )}
        <Button block onClick={() => { setCriada(null); setPasso('link'); setFicha(FICHA_VAZIA); setTextoReceita(''); setLinkReceita(''); }}>
          Nova comanda
        </Button>
      </Card>
    );
  }

  if (passo === 'link') {
    return (
      <PassoLink onContinuar={(texto, link) => {
        setTextoReceita(texto);
        setLinkReceita(link);
        setFicha(extrairFicha(texto));
        setPasso('ficha');
      }} />
    );
  }

  if (passo === 'ficha') {
    return (
      <PassoFichaTecnica
        ficha={ficha}
        textoReceita={textoReceita}
        onContinuar={(fichaConfirmada) => {
          setFicha(fichaConfirmada);
          setPasso('comanda');
        }}
        onVoltar={() => setPasso('link')}
      />
    );
  }

  return (
    <div>
      <Card>
        <div className="display" style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
          📋 Passo 3: Competências e Comanda
        </div>
        <div className="muted" style={{ marginBottom: 4 }}>{ficha.nomePrato}</div>
        <Button variant="ghost" onClick={() => setPasso('ficha')}>← Voltar à ficha técnica</Button>
      </Card>
      <EditorComanda
        turmaId={turmaId}
        estadoInicial={estadoInicial}
        onGuardar={guardarComanda}
        tituloBotao="Criar comanda"
      />
    </div>
  );
}


// ============================================================
// Ler a ficha técnica que a IA escreve (ou o texto de uma página de
// receita) — separado do ecrã do professor (ProfessorView), out/2026.
// Tira o nome, a família, as doses, os ingredientes (quantidade, unidade,
// produto) e os passos. É daqui que saem os ingredientes da requisição.
// ============================================================
import { FAMILIAS_FICHA, FamiliaFicha } from './types';
import { detetarAlergenicos, formatarAlergenicos } from './alergenicos';

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

export function normalizarFicha(f: any): FichaTecnica {
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
export interface LinhaIngrediente {
  componente: string;  // ex: "Gelado de whisky", "Cremeux", "" (sem agrupamento)
  qt: string;
  un: string;
  produto: string;
  tPrep: string;
  tConf: string;
  obs: string;
}

export interface PassoPreparacao {
  num: number;
  descricao: string;
  temperatura: string;
  tempo: string;
  obs: string;
  haccp: string;
}

export interface FichaTecnica {
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
  familia1?: string;        // família principal — define microcompetências primárias
  familia2?: string;        // família secundária — quando duas técnicas têm peso equivalente
  etiquetas?: string[];     // contexto adicional — máx 3
  tecnicasDetectadas?: string[];
  textoGuia?: string;       // texto do Guia de Apoio à Produção colado pelo professor
  aparelhosDetectados?: string[];
}

export const FICHA_VAZIA: FichaTecnica = {
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
  familia1: undefined,
  familia2: undefined,
  etiquetas: [],
};

// ============================================================
// Extração automática a partir do texto da receita
// ============================================================
function limparTexto(t: string): string {
  return t.replace(/\s+/g, ' ').trim();
}

/** «3 min», «1 h», «TEMPO»…: não é um produto. */
function pareceTempoOuTitulo(produto: string): boolean {
  const p = String(produto || '').trim();
  return !p || /^\d+([.,]\d+)?\s*(min|minutos?|h|horas?|seg|segundos?)\.?$/i.test(p) || /^(tempo|produto|descri[çc][ãa]o|temp)$/i.test(p);
}

export function extrairFicha(texto: string): FichaTecnica {
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
  // Os títulos das secções como a IA os escreve umas vezes («## PREPARAÇÃO»,
  // «PREPARAÇÃO :», «MODO DE PREPARAÇÃO:»…) passam à forma certa. Sem isto, a
  // tabela dos passos era lida como ingredientes: na requisição apareciam
  // «3 min», «5 min», «8 min» no lugar dos produtos (Rosa, out/2026).
  texto = texto
    .replace(/^[ \t#*]*INGREDIENTES\s*(?:\([^)\n]*\))?\s*:?[ \t*]*$/gim, 'INGREDIENTES:')
    .replace(/^[ \t#*]*(?:MODO\s+DE\s+)?PREPARA[ÇC][ÃA]O\s*(?:\([^)\n]*\))?\s*:?[ \t*]*$/gim, 'PREPARAÇÃO:');
  const temFormatoIA = texto.includes('NOME DO PRATO:') && texto.includes('INGREDIENTES:');
  
  if (temFormatoIA) {
    // Extrair campos do formato IA
    const extrair = (campo: string) => {
      const m = texto.match(new RegExp(`${campo}:\\s*(.+)`, 'i'));
      return m ? m[1].trim() : '';
    };

    const nomeIA = extrair('NOME DO PRATO');
    const classificacaoIA = extrair('CLASSIFICAÇÃO');
    const familia1IA = extrair('FAMÍLIA PRINCIPAL') || extrair('FAMILIA PRINCIPAL') || '';
    const familia2IA = extrair('FAMÍLIA SECUNDÁRIA') || extrair('FAMILIA SECUNDARIA') || '';
    const etiquetasIA = extrair('ETIQUETAS') || '';
    const etiquetasArr = etiquetasIA && etiquetasIA !== 'nenhuma'
      ? etiquetasIA.split('|').map((e: string) => e.trim()).filter((e: string) => e && e !== 'nenhuma')
      : [];
    const dosesIA = texto.match(/N[ºo°]?\s*DE\s*DOSES?:\s*(\d+)/i)?.[1] ||
                    texto.match(/PORÇÕES?:\s*(\d+)/i)?.[1] ||
                    texto.match(/DOSES?:\s*(\d+)/i)?.[1] || '';
    const tPrepIA = extrair('TEMPO DE PREPARAÇÃO');
    const tConfIA = extrair('TEMPO DE CONFEÇÃO');
    // As IAs escrevem umas vezes ALERGÉNICOS, outras ALERGÉNIOS.
    const alergenicosIA = extrair('ALERGÉNICOS') || extrair('ALERGÉNIOS') || extrair('ALERGENIOS');

    // Ingredientes com separador |
    const secIngIA = texto.match(/INGREDIENTES:\n([\s\S]*?)(?=\nPREPARAÇÃO:|$)/i);
    const ingredientesIA: LinhaIngrediente[] = [];
    if (secIngIA) {
      // Tabelas em Markdown começam e acabam em "|" e têm uma linha "|---|":
      // sem tirar isso, tudo ficava uma coluna ao lado (a quantidade ia
      // para a unidade, a unidade para o produto).
      const linhasIng = secIngIA[1].split('\n')
        .map(l => l.trim().replace(/^\|/, '').replace(/\|$/, '').trim())
        .filter(l => l && !/^[\s|:\-]+$/.test(l) && !l.toUpperCase().includes('COMPONENTE') && !l.toUpperCase().startsWith('INGREDIENTE'));
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
    // A preparação acaba no campo seguinte — também nos alergénios e nos
    // registos: antes, "ALERGÉNIOS: …" ia parar às observações do último passo.
    // Um «ingrediente» que é só um tempo ou um título de coluna veio da
    // tabela dos passos: não entra.
    for (let k = ingredientesIA.length - 1; k >= 0; k--) {
      if (pareceTempoOuTitulo(ingredientesIA[k].produto)) ingredientesIA.splice(k, 1);
    }
    const secPrepIA = texto.match(/PREPARAÇÃO:\n([\s\S]*?)(?=\nEMPRATAMENTO:|\nEQUIPAMENTO|\nCONSERVAÇÃO:|\nALERG|\nREGENERAÇÃO|\nREGISTOS|\nSUBTÉCNICAS|\nAPARELHOS|\n===GUI|$)/i);
    const preparacaoIA: PassoPreparacao[] = [];
    if (secPrepIA) {
      const linhasRaw = secPrepIA[1].split('\n')
        .map(l => l.trim().replace(/^\|/, '').replace(/\|$/, '').trim())
        .filter(l => l && !/^[\s|:\-]+$/.test(l));
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
          // "1 Desfiar…", "1. Desfiar…" ou "1) Desfiar…"
          const mNum = linha.match(/^(\d+)[.)ºº\-]?\s+(.+)/);
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

    // Extrair subtécnicas detectadas (SUB-xxx) — nova biblioteca V10
    const secSub = texto.match(/SUBTÉCNICAS DETECTADAS:\n([\s\S]*?)(?=\nAPARELHOS DETECTADOS:|\n---|$)/i)?.[1]?.trim() || '';
    const tecnicasDetectadas = secSub === 'nenhuma' ? [] : secSub
      .split('\n')
      .map(l => l.trim().replace(/^[-·•]\s*/, ''))
      .filter(l => l.length > 3);

    // Extrair aparelhos detectados (APP-xxx) — nova biblioteca V10
    const secApp = texto.match(/APARELHOS DETECTADOS:\n([\s\S]*?)(?=\n---|$)/i)?.[1]?.trim() || '';
    const aparelhosDetectados = secApp === 'nenhum' ? [] : secApp
      .split('\n')
      .map(l => l.trim().replace(/^[-·•]\s*/, ''))
      .filter(l => l.startsWith('APP-') || (l.length > 3 && l.length < 80));

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
      familia1: FAMILIAS_FICHA.includes(familia1IA as FamiliaFicha) ? familia1IA : undefined,
      familia2: familia2IA && familia2IA !== 'nenhuma' && FAMILIAS_FICHA.includes(familia2IA as FamiliaFicha) ? familia2IA : undefined,
      etiquetas: etiquetasArr,
      tecnicasDetectadas,
      aparelhosDetectados,
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

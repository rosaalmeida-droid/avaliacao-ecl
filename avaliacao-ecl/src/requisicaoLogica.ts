// ============================================================
// Lógica de processamento de ingredientes para Requisição ECL
// Implementa pontos 4, 5, 6, 7, 8, 9 da especificação funcional
// ============================================================

// ── 1. PRODUTOS QUE NUNCA VÃO PARA A REQUISIÇÃO ──────────────
// Ponto 4: Água nunca aparece na requisição
// Caldos produzidos em aula também não aparecem (são produzidos na cozinha)
const EXCLUIR_REQUISICAO = [
  // Água em todas as formas
  'agua', 'água', 'water',
  'agua fria', 'água fria',
  'agua quente', 'água quente',
  'agua para demolhar', 'água para demolhar',
  'agua de cozedura', 'água de cozedura',
  'agua temperada', 'água temperada',
  'gelo', 'ice',
  // Caldos produzidos em aula (regra da cozinha pedagógica)
  'caldo de galinha (produzido em aula)',
  'caldo de carne (produzido em aula)',
  'fumet de peixe (produzido em aula)',
  'caldo de peixe (produzido em aula)',
  'caldo de legumes (produzido em aula)',
  'caldo de vegetais (produzido em aula)',
];

export function deveExcluirDaRequisicao(nome: string): boolean {
  const n = nome.toLowerCase().trim();
  return EXCLUIR_REQUISICAO.some(e => n === e || n.startsWith(e + ' ') || n.includes(' ' + e));
}

// ── 2. INGREDIENTES DERIVADOS → PRODUTO ORIGINAL ─────────────
// Ponto 8/15: raspa de limão → limão, etc.
interface IngredienteDerivado {
  padroes: RegExp[];
  produtoOriginal: string;
  fatorConversao: number; // kg de produto original por kg de derivado
  und: string;
  pesoMedioKg?: number; // peso médio de 1 unidade do produto original, em kg
                        // — usado quando und === 'un', para converter kg do
                        // derivado em número real de unidades necessárias
}

const INGREDIENTES_DERIVADOS: IngredienteDerivado[] = [
  // Limão
  {
    padroes: [/raspa\s+de\s+lim[aã]o/i, /casca\s+de\s+lim[aã]o/i, /z[eê]st\s+de\s+lim[aã]o/i],
    produtoOriginal: 'Limão',
    fatorConversao: 8, // 1 limão rende ~12g raspa → precisamos 8x mais limões por kg raspa
    und: 'un',
  },
  {
    padroes: [/sumo\s+de\s+lim[aã]o/i, /zumo\s+de\s+lim[aã]o/i, /lemon\s+juice/i],
    produtoOriginal: 'Limão',
    fatorConversao: 4, // 1 limão rende ~30ml sumo
    und: 'un',
  },
  // Laranja
  {
    padroes: [/raspa\s+de\s+laranja/i, /casca\s+de\s+laranja/i, /z[eê]st\s+de\s+laranja/i],
    produtoOriginal: 'Laranja',
    fatorConversao: 5,
    und: 'un',
  },
  {
    padroes: [/sumo\s+de\s+laranja/i, /zumo\s+de\s+laranja/i, /orange\s+juice/i],
    produtoOriginal: 'Laranja',
    fatorConversao: 3,
    und: 'un',
  },
  // Lima
  {
    padroes: [/raspa\s+de\s+lima/i, /casca\s+de\s+lima/i],
    produtoOriginal: 'Lima',
    fatorConversao: 8,
    und: 'un',
  },
  {
    padroes: [/sumo\s+de\s+lima/i],
    produtoOriginal: 'Lima',
    fatorConversao: 4,
    und: 'un',
  },
  // Gengibre
  {
    padroes: [/raspa\s+de\s+gengibre/i, /gengibre\s+fresco\s+ralado/i],
    produtoOriginal: 'Gengibre fresco',
    fatorConversao: 1.5,
    und: 'kg',
  },
  // Gemas e claras → ovos. Não se compram gemas/claras avulsas — compram-se
  // ovos inteiros (pedido de 21/06/2026). Padrões mais robustos: aceitam
  // texto extra antes/depois (ex: "Gemas pasteurizadas", "Gema (1 un)"),
  // não exigem que "gema(s)"/"clara(s)" seja a última palavra exacta.
  {
    padroes: [/\bgema[s]?\b/i],
    produtoOriginal: 'Ovos',
    fatorConversao: 1, // 1 gema ≈ 1 ovo necessário
    und: 'un',
    pesoMedioKg: 0.018, // ~18g por gema (ovo médio)
  },
  {
    padroes: [/\bclara[s]?\b/i, /\begg\s+white[s]?\b/i],
    produtoOriginal: 'Ovos',
    fatorConversao: 1,
    und: 'un',
    pesoMedioKg: 0.033, // ~33g por clara (ovo médio)
  },
];

export interface ConversaoDerivado {
  produtoOriginal: string;
  qtOriginal: number;
  undOriginal: string;
  isDerivado: boolean;
}

export function converterIngredienteDerivado(
  nome: string,
  qtKg: number, // quantidade — em kg se und='g'/'kg', em unidades se und='un'
  und: string = 'kg' // unidade original, antes de qualquer conversão
): ConversaoDerivado | null {
  const n = nome.toLowerCase().trim();

  for (const d of INGREDIENTES_DERIVADOS) {
    if (d.padroes.some(p => p.test(n))) {
      if (d.und === 'un') {
        // Dois modos de cálculo:
        // (a) und original era 'un' → qtKg já é número de unidades (ex: 6 gemas)
        //     → quantidade de ovos = directamente qtKg (6 gemas = 6 ovos)
        // (b) und original era 'g'/'kg' → qtKg é peso em kg → usar pesoMedioKg
        //     para calcular quantas unidades são necessárias
        const undOrig = (und || '').toLowerCase().trim();
        const jaEmUnidades = ['un', 'unidade', 'unidades'].includes(undOrig);
        const qtUnidades = jaEmUnidades
          ? Math.max(1, Math.ceil(qtKg))  // já é unidades — arredondar para cima
          : d.pesoMedioKg
            ? Math.max(1, Math.ceil(qtKg / d.pesoMedioKg))  // converter kg → unidades
            : Math.max(1, Math.ceil(qtKg * d.fatorConversao));
        return {
          produtoOriginal: d.produtoOriginal,
          qtOriginal: qtUnidades,
          undOriginal: 'un',
          isDerivado: true,
        };
      } else {
        return {
          produtoOriginal: d.produtoOriginal,
          qtOriginal: qtKg * d.fatorConversao,
          undOriginal: d.und,
          isDerivado: true,
        };
      }
    }
  }
  return null;
}

// ── 3. PREPARAÇÕES VS MATÉRIAS-PRIMAS ─────────────────────────
// Ponto 5/13: identificar preparações que não são compráveis
export interface Preparacao {
  nome: string;
  padroes: RegExp[];
  materiasPrimas?: string[]; // ingredientes base se for para produzir
  podeComprar: boolean;
  perguntarProfessor: boolean;
}

export const PREPARACOES: Preparacao[] = [
  // Preparações que NUNCA se compram — sempre se produzem
  { nome: 'Fundo de carne', padroes: [/fundo\s+de\s+carne/i, /fond\s+de\s+veau/i], podeComprar: false, perguntarProfessor: false },
  { nome: 'Fundo de peixe', padroes: [/fundo\s+de\s+peixe/i, /fumet/i], podeComprar: false, perguntarProfessor: false },
  { nome: 'Caldo de galinha', padroes: [/caldo\s+de\s+galinha\s+caseiro/i], podeComprar: false, perguntarProfessor: false },
  { nome: 'Creme pasteleiro', padroes: [/creme\s+pasteleiro/i, /pastry\s+cream/i, /creme\s+patissiere/i], podeComprar: false, perguntarProfessor: false, materiasPrimas: ['Leite', 'Açúcar', 'Ovos', 'Farinha T55', 'Manteiga'] },
  { nome: 'Bechamel', padroes: [/b[eé]chamel/i, /molho\s+branco/i], podeComprar: false, perguntarProfessor: false, materiasPrimas: ['Leite', 'Farinha T55', 'Manteiga', 'Sal', 'Noz-moscada'] },
  { nome: 'Molho de tomate', padroes: [/molho\s+de\s+tomate\s+caseiro/i], podeComprar: false, perguntarProfessor: false },

  // ── MASSAS BASE — produzidas em aula salvo excepção autorizada ─────────
  // Regra pedagógica ECL (22/06/2026): em cozinha/pastelaria profissional,
  // massas base fazem parte das competências a desenvolver — não se compram.
  // A app avisa o professor e sugere a criação de uma Ficha Técnica separada.
  // Excepções (ex: comprar massa filo, massa de pizza pré-feita) só com
  // autorização explícita do professor, registada na observação da ficha.
  { nome: 'Massa folhada', padroes: [/massa\s+folhada/i, /puff\s+pastry/i, /pate\s+feuilletee/i, /massa\s+folhada\s+invertida/i], podeComprar: false, perguntarProfessor: true, materiasPrimas: ['Farinha T65', 'Manteiga', 'Sal', 'Água'] },
  { nome: 'Massa quebrada', padroes: [/massa\s+quebrada/i, /shortcrust/i, /p[aâ]te\s+bris[eé]e/i, /massa\s+areada/i, /p[aâ]te\s+sabl[eé]e/i], podeComprar: false, perguntarProfessor: true, materiasPrimas: ['Farinha T55', 'Manteiga', 'Sal', 'Água'] },
  { nome: 'Massa sucrée', padroes: [/massa\s+sucr[eé]e/i, /p[aâ]te\s+sucr[eé]e/i, /massa\s+doce/i], podeComprar: false, perguntarProfessor: true, materiasPrimas: ['Farinha T55', 'Manteiga', 'Açúcar em pó', 'Ovos'] },
  { nome: 'Massa de fartos', padroes: [/massa\s+de\s+fartos/i, /massa\s+choux/i, /p[aâ]te\s+[aà]\s+choux/i, /choux\s+pastry/i], podeComprar: false, perguntarProfessor: true, materiasPrimas: ['Farinha T55', 'Manteiga', 'Ovos', 'Água', 'Sal'] },
  { nome: 'Massa de pizza', padroes: [/massa\s+de\s+pizza/i, /pizza\s+dough/i, /massa\s+para\s+pizza/i], podeComprar: false, perguntarProfessor: true, materiasPrimas: ['Farinha T65', 'Fermento de padeiro', 'Sal', 'Azeite', 'Água'] },
  { nome: 'Massa de pão', padroes: [/massa\s+de\s+p[aã]o/i, /bread\s+dough/i, /massa\s+p[aã]o/i], podeComprar: false, perguntarProfessor: true, materiasPrimas: ['Farinha T65', 'Fermento de padeiro', 'Sal', 'Água'] },
  { nome: 'Massa fresca', padroes: [/massa\s+fresca/i, /fresh\s+pasta/i, /massa\s+caseira/i], podeComprar: false, perguntarProfessor: true, materiasPrimas: ['Farinha T55', 'Ovos', 'Sal'] },
  { nome: 'Massa filo', padroes: [/massa\s+filo/i, /filo\s+pastry/i, /phyllo/i], podeComprar: true, perguntarProfessor: true }, // excepção — muito técnica, pode comprar
  { nome: 'Base de tarte', padroes: [/base\s+de\s+tarte/i, /tart\s+shell/i, /base\s+para\s+tarte/i], podeComprar: false, perguntarProfessor: true, materiasPrimas: ['Farinha T55', 'Manteiga', 'Sal', 'Água'] },
  { nome: 'Bolacha champanhe', padroes: [/bolacha\s+champanhe/i, /ladyfinger/i, /savoiardi/i, /biscuit\s+cuill[eè]re/i], podeComprar: true, perguntarProfessor: true, materiasPrimas: ['Ovos', 'Açúcar', 'Farinha T55'] },

  // Preparações que são sempre compradas (produtos processados)
  { nome: 'Puré de tomate', padroes: [/pur[eé]\s+de\s+tomate/i, /concentrado\s+de\s+tomate/i], podeComprar: true, perguntarProfessor: false },
];

export function identificarPreparacao(nome: string): Preparacao | null {
  const n = nome.toLowerCase().trim();
  return PREPARACOES.find(p => p.padroes.some(r => r.test(n))) || null;
}

// ── 4. PURÉS E PREPARAÇÕES → MATÉRIA-PRIMA BASE ──────────────
// Ponto 4: puré de batata → batata, puré de grão → grão
interface ConversaoPure {
  padroes: RegExp[];
  materiaPrima: string;
  fatorRendimento: number; // kg de matéria-prima por kg de puré
}

const CONVERSOES_PURE: ConversaoPure[] = [
  { padroes: [/pur[eé]\s+de\s+batata/i, /mashed\s+potato/i], materiaPrima: 'Batata', fatorRendimento: 1.4 },
  { padroes: [/pur[eé]\s+de\s+gr[aã]o/i], materiaPrima: 'Grão de bico cozido (lata)', fatorRendimento: 1.2 },
  { padroes: [/pur[eé]\s+de\s+cenoura/i], materiaPrima: 'Cenoura', fatorRendimento: 1.3 },
  { padroes: [/pur[eé]\s+de\s+ervilhas/i], materiaPrima: 'Ervilhas congeladas', fatorRendimento: 1.1 },
  { padroes: [/legumes\s+assados/i, /legumes\s+grelhados/i], materiaPrima: 'Legumes', fatorRendimento: 1.2 },
  { padroes: [/caldo\s+de\s+galinha/i], materiaPrima: 'Caldo de galinha (cubo)', fatorRendimento: 1.0 },
  { padroes: [/caldo\s+de\s+carne/i], materiaPrima: 'Caldo de carne (cubo)', fatorRendimento: 1.0 },
  { padroes: [/caldo\s+de\s+peixe/i], materiaPrima: 'Caldo de peixe (cubo)', fatorRendimento: 1.0 },
];

export function converterPureParaMateriaPrima(nome: string, qtKg: number): { materiaPrima: string; qt: number; und: string } | null {
  for (const c of CONVERSOES_PURE) {
    if (c.padroes.some(p => p.test(nome))) {
      return { materiaPrima: c.materiaPrima, qt: qtKg * c.fatorRendimento, und: 'kg' };
    }
  }
  return null;
}

// ── 5. QUANTIDADE QB → QUANTIDADE MÍNIMA ─────────────────────
// Ponto 4: QB deve ter quantidade mínima para custo
export function qbParaQuantidadeMinima(produto: string): { qt: number; und: string } {
  const n = produto.toLowerCase();
  // Alta densidade (sal, açúcar, farinha)
  if (/\b(sal|pimenta|a[cç][uú]car|farinha|canela|n[uó]z[- ]moscada|paprika|colorau|c[uú]rcuma|gengibre\s+p[oó])\b/.test(n)) {
    return { qt: 0.002, und: 'kg' }; // 2g
  }
  // Líquidos
  if (/\b(azeite|[oó]leo|vinagre|molho|caldo|vinho|leite|natas)\b/.test(n)) {
    return { qt: 0.015, und: 'l' }; // 15ml
  }
  // Ervas frescas
  if (/\b(salsa|coentros|manjeric[aã]o|tomilho|alecrim|cebolinho|hortel[aã])\b/.test(n)) {
    return { qt: 0.010, und: 'kg' }; // 10g
  }
  // Manteiga, margarina
  if (/\b(manteiga|margarina|banha)\b/.test(n)) {
    return { qt: 0.020, und: 'kg' }; // 20g
  }
  // Default
  return { qt: 0.020, und: 'kg' }; // 20g
}

// ── 6. RENDIMENTOS TÉCNICOS ───────────────────────────────────
// Ponto 11/18
export interface RendimentoTecnico {
  produto: string;
  padroes: RegExp[];
  rendimento: number; // 0-1 (ex: 0.80 = 80%)
  tipoPerda: string;
}

export const RENDIMENTOS: RendimentoTecnico[] = [
  { produto: 'Batata', padroes: [/batata/i], rendimento: 0.80, tipoPerda: 'Descasque e olhos' },
  { produto: 'Cenoura', padroes: [/cenoura/i], rendimento: 0.85, tipoPerda: 'Descasque e pontas' },
  { produto: 'Cebola', padroes: [/cebola/i], rendimento: 0.85, tipoPerda: 'Casca e raiz' },
  { produto: 'Tomate fresco', padroes: [/tomate\s+fresco/i, /^tomate$/i], rendimento: 0.85, tipoPerda: 'Pele e sementes' },
  { produto: 'Pimento', padroes: [/pimento/i], rendimento: 0.80, tipoPerda: 'Sementes e pele' },
  { produto: 'Courgette', padroes: [/courgette/i, /curgete/i], rendimento: 0.90, tipoPerda: 'Pontas' },
  { produto: 'Beringela', padroes: [/beringela/i], rendimento: 0.90, tipoPerda: 'Pontas' },
  { produto: 'Abóbora', padroes: [/ab[oó]bora/i], rendimento: 0.75, tipoPerda: 'Casca e sementes' },
  { produto: 'Alho francês', padroes: [/alho\s+franc[eê]s/i, /alho[-\s]porro/i], rendimento: 0.70, tipoPerda: 'Folhas externas e raiz' },
  // Bacalhau
  { produto: 'Bacalhau posta', padroes: [/bacalhau\s+posta/i, /posta\s+bacalhau/i], rendimento: 0.70, tipoPerda: 'Pele e espinhas' },
  { produto: 'Bacalhau lombo', padroes: [/lombo\s+bacalhau/i, /bacalhau\s+lombo/i], rendimento: 0.85, tipoPerda: 'Pele' },
  { produto: 'Bacalhau seco', padroes: [/bacalhau\s+s[ae]co/i, /bacalhau\s+salgado/i], rendimento: 0.60, tipoPerda: 'Pele, espinhas e demolha (+45% peso)' },
  // Peixe
  { produto: 'Salmão filete', padroes: [/salm[aã]o\s+filete/i, /filete\s+salm[aã]o/i], rendimento: 0.90, tipoPerda: 'Pele e espinhas' },
  { produto: 'Salmão inteiro', padroes: [/salm[aã]o\s+inteiro/i], rendimento: 0.50, tipoPerda: 'Cabeça, pele, espinhas e vísceras' },
  { produto: 'Dourada', padroes: [/dourada/i], rendimento: 0.45, tipoPerda: 'Cabeça, pele, espinhas e vísceras' },
  { produto: 'Robalo', padroes: [/robalo/i], rendimento: 0.45, tipoPerda: 'Cabeça, pele, espinhas e vísceras' },
  { produto: 'Atum fresco', padroes: [/atum\s+fresco/i], rendimento: 0.75, tipoPerda: 'Pele e espinhas' },
  // Carnes
  { produto: 'Frango inteiro', padroes: [/frango\s+inteiro/i], rendimento: 0.67, tipoPerda: 'Osso, pele e vísceras' },
  { produto: 'Peito de frango', padroes: [/peito\s+frango/i, /peito\s+de\s+frango/i], rendimento: 0.95, tipoPerda: 'Aparas de limpeza' },
  { produto: 'Carne de vaca', padroes: [/carne\s+de\s+vaca/i, /lombo\s+de\s+vaca/i], rendimento: 0.85, tipoPerda: 'Gordura e nervos' },
  { produto: 'Borrego', padroes: [/borrego/i, /cordeiro/i], rendimento: 0.65, tipoPerda: 'Osso e gordura' },
];

export function obterRendimento(produto: string): RendimentoTecnico | null {
  const n = produto.toLowerCase();
  return RENDIMENTOS.find(r => r.padroes.some(p => p.test(n))) || null;
}

// ── 7. FARINHA — TIPO CORRECTO POR CONTEXTO ──────────────────
// Ponto 9
export function determinarTipoFarinha(
  nomePrato: string,
  temFermento: boolean,
  ingredientes: string[]
): string {
  const n = nomePrato.toLowerCase();
  // Bolos e massas montadas → T55
  if (/\b(bolo|queque|muffin|torta|rolad[oa]|cupcake|cake|brownie|financier)\b/.test(n)) {
    return 'Farinha de trigo T55';
  }
  // Se tem fermento químico → T55
  if (temFermento) return 'Farinha de trigo T55';
  // Pastelaria salgada, pão → T65
  if (/\b(p[aã]o|broa|tosta|pizza|focaccia|quiche|tarte\s+salgad)\b/.test(n)) {
    return 'Farinha de trigo T65';
  }
  // Molhos, panados → T55
  if (/\b(panado|empanado|b[eé]chamel)\b/.test(n)) {
    return 'Farinha de trigo T55';
  }
  // Por omissão → T65
  return 'Farinha de trigo T65';
}

// ── 8. MARCAS A REMOVER ───────────────────────────────────────
// Ponto 4: não usar nomes de marca
export const MARCAS_REMOVER = [
  'knorr','sidul','seara','continente','pingo doce','vaqueiro','mimosa',
  'parmalat','compal','sumol','bom petisco','terra do bacalhau','pescanova',
  'iglo','findus','campofrio','salsicharia','lusiteca','imperial','nobre',
  'dias','matinal','predilecta','gallo','oliveira da serra','riberalves',
  'auchan','jumbo','lidl','intermarché','mercadona','mcdonalds','nestle',
  'unilever','danone','lactogal','central de cervejas','unicer',
];

export function limparMarcas(nome: string): string {
  let n = nome.trim();
  for (const m of MARCAS_REMOVER) {
    n = n.replace(new RegExp(`\\b${m}\\b`, 'gi'), '').replace(/\s+/g, ' ').trim();
  }
  // NOTA: removida em 22/06/2026 uma segunda tentativa "genérica" de apanhar
  // marcas não listadas (regex /^[A-Z][a-z]+\s+/) — apagava por engano a
  // PRIMEIRA PALAVRA de qualquer ingrediente com 3+ palavras, mesmo sem ser
  // marca nenhuma. Ex: "Gemas de ovo" → "de ovo", "Farinha de trigo T55" →
  // "de trigo T55". A lista explícita MARCAS_REMOVER acima já é segura e
  // suficiente — preferível não detectar uma marca nova a apagar nomes reais.
  return n.trim() || nome.trim();
}

// Normaliza o nome do ingrediente para apresentação — independentemente de
// como o professor o escreveu na Ficha de Produção (espaços a mais, tudo
// em minúscula, etc.). Não altera o significado, só a forma:
// " ovos" → "Ovos" | "farinha de trigo t55" → "Farinha de trigo t55"
// Decisão de 22/06/2026: corrigir SEMPRE na Requisição, não depender de
// disciplina perfeita de escrita em cada ficha.
export function normalizarNomeIngrediente(nome: string): string {
  let n = nome.replace(/\s+/g, ' ').trim();
  if (!n) return n;
  return n.charAt(0).toUpperCase() + n.slice(1);
}

// ── 9. PROCESSAMENTO COMPLETO DE UM INGREDIENTE ──────────────
// Função principal que aplica todas as regras
export interface IngredienteProcessado {
  produto: string;         // nome final na requisição
  qtKg: number;            // quantidade em kg ou litros
  und: string;             // kg, l, un
  isQB: boolean;
  excluir: boolean;        // água, etc.
  avisos: string[];
  isDerivado: boolean;
  isPreparacao: boolean;
  perguntarProfessor: boolean; // produzir ou comprar?
  preparacaoInfo?: { nome: string; materiasPrimas?: string[]; podeComprar: boolean };
}

export function processarIngrediente(
  nome: string,
  qtRaw: string | number,
  undRaw: string,
  nomePrato: string = ''
): IngredienteProcessado {
  const avisos: string[] = [];
  let produto = normalizarNomeIngrediente(limparMarcas(nome.trim()));
  const isQB = /q\.?b\.?|a\s+gosto|quanto\s+baste/i.test(String(qtRaw));

  // Verificar se deve excluir (água)
  if (deveExcluirDaRequisicao(produto)) {
    return { produto, qtKg: 0, und: 'kg', isQB, excluir: true, avisos, isDerivado: false, isPreparacao: false, perguntarProfessor: false };
  }

  // Converter para kg/l base
  let qtNum = isQB ? 0 : (parseFloat(String(qtRaw).replace(',', '.')) || 0);
  const undLow = (undRaw || '').toLowerCase().trim();
  let qtKg = qtNum;
  let und = 'kg';

  if (!isQB && qtNum > 0) {
    if (['g', 'gr', 'gramas'].includes(undLow)) { qtKg = qtNum / 1000; und = 'kg'; }
    else if (['mg'].includes(undLow)) { qtKg = qtNum / 1000000; und = 'kg'; }
    else if (['ml'].includes(undLow)) { qtKg = qtNum / 1000; und = 'l'; }
    else if (['dl'].includes(undLow)) { qtKg = qtNum / 10; und = 'l'; }
    else if (['cl'].includes(undLow)) { qtKg = qtNum / 100; und = 'l'; }
    else if (['l', 'lt'].includes(undLow)) { qtKg = qtNum; und = 'l'; }
    else if (['kg'].includes(undLow)) { qtKg = qtNum; und = 'kg'; }
    else if (['un', 'unidade', 'unidades'].includes(undLow)) { qtKg = qtNum; und = 'un'; }
    else if (['cs', 'c.s.', 'colher de sopa'].includes(undLow)) { qtKg = qtNum * 0.015; und = 'kg'; }
    else if (['cc', 'c.c.', 'colher de chá'].includes(undLow)) { qtKg = qtNum * 0.005; und = 'kg'; }
    else if (['dente', 'dentes'].includes(undLow)) { qtKg = qtNum * 0.006; und = 'kg'; }
    else if (['folha', 'folhas'].includes(undLow)) { qtKg = qtNum * 0.001; und = 'kg'; }
    else if (['ramo', 'ramos'].includes(undLow)) { qtKg = qtNum * 0.015; und = 'kg'; }
  }

  // QB → quantidade mínima
  if (isQB) {
    const qbMin = qbParaQuantidadeMinima(produto);
    qtKg = qbMin.qt;
    und = qbMin.und;
  }

  // Verificar se é ovo (manter em unidades)
  if (/\bovo[s]?\b|\begg[s]?\b/i.test(produto)) {
    und = 'un';
    if (!isQB) qtKg = qtNum;
  }

  // Verificar ingredientes derivados
  // CRÍTICO: gemas/claras com und='un' — qtKg=6 significa 6 unidades,
  // não 6 kg. A conversão pesoMedioKg só faz sentido quando a quantidade
  // vem em GRAMAS (und='g'). Quando já vem em unidades, a quantidade de
  // ovos é directamente a quantidade de gemas/claras pedidas.
  const derivado = converterIngredienteDerivado(
    produto,
    // Se und=un e é gema/clara, passar a quantidade REAL em unidades
    // embrulhada num flag negativo (convenção interna) para que a função
    // saiba que não deve dividir pelo pesoMedioKg.
    // Implementação mais limpa: passar und como parâmetro adicional.
    qtKg,
    und  // novo parâmetro — und original antes da conversão
  );
  if (derivado) {
    return {
      produto: derivado.produtoOriginal,
      qtKg: derivado.qtOriginal,
      und: derivado.undOriginal,
      isQB, excluir: false,
      avisos: [`Convertido de "${nome}" → "${derivado.produtoOriginal}"`],
      isDerivado: true, isPreparacao: false, perguntarProfessor: false,
    };
  }

  // Verificar se é puré/preparação simples com conversão directa
  const conv = converterPureParaMateriaPrima(produto, qtKg);
  if (conv) {
    avisos.push(`"${produto}" convertido para "${conv.materiaPrima}" (matéria-prima base)`);
    return {
      produto: conv.materiaPrima, qtKg: conv.qt, und: conv.und,
      isQB, excluir: false, avisos,
      isDerivado: false, isPreparacao: true, perguntarProfessor: false,
    };
  }

  // Verificar se é preparação que precisa de decidir produzir/comprar
  const prep = identificarPreparacao(produto);
  if (prep && prep.perguntarProfessor) {
    const ehMassa = !prep.podeComprar; // massas base nunca se compram por defeito
    return {
      produto, qtKg, und,
      isQB, excluir: false,
      avisos: [ehMassa
        ? `"${produto}" deve ser produzida em aula — cria uma Ficha Técnica separada`
        : `"${produto}" pode ser comprado ou produzido em aula`
      ],
      isDerivado: false, isPreparacao: true, perguntarProfessor: true,
      preparacaoInfo: { nome: prep.nome, materiasPrimas: prep.materiasPrimas, podeComprar: prep.podeComprar },
    };
  }

  // Verificar farinha sem tipo especificado
  if (/^farinha\s*$/i.test(produto) || /^farinha\s+de\s+trigo\s*$/i.test(produto)) {
    const temFermento = false; // seria necessário analisar os outros ingredientes
    produto = determinarTipoFarinha(nomePrato, temFermento, []);
    avisos.push(`Farinha identificada como "${produto}"`);
  }

  return {
    produto, qtKg, und,
    isQB, excluir: false, avisos,
    isDerivado: false, isPreparacao: false, perguntarProfessor: false,
  };
}

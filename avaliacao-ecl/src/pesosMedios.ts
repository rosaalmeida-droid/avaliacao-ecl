// ============================================================
// Tabela de pesos médios por unidade — Avaliação ECL
// Usado na extração de fichas técnicas e na requisição
// para converter "2 cebolas" → "200g", "1 dente de alho" → "6g"
// Fonte: referências culinárias portuguesas
// ============================================================

export interface PesoMedio {
  nome: string;
  pesog: number;      // peso médio em gramas
  aliases: string[];
  obs?: string;
}

export const PESOS_MEDIOS: PesoMedio[] = [
  // ── ALHOS E CEBOLAS ──────────────────────────────────────
  { nome:'dente de alho', pesog:6, aliases:['dente alho','dente','dentes de alho','dentes','alho dente'] },
  { nome:'cabeça de alho', pesog:60, aliases:['cabeça alho','cabeça de alho','bulbo alho'] },
  { nome:'cebola pequena', pesog:80, aliases:['cebola pequena','cebola s'] },
  { nome:'cebola média', pesog:130, aliases:['cebola','cebola média','cebola m','cebola normal'] },
  { nome:'cebola grande', pesog:200, aliases:['cebola grande','cebola l','cebola xl'] },
  { nome:'cebola roxa', pesog:130, aliases:['cebola roxa'] },
  { nome:'cebola nova', pesog:30, aliases:['cebola nova','cebolinha'] },
  { nome:'chalota', pesog:25, aliases:['chalota','shallot','eschalion'] },

  // ── HORTÍCOLAS ───────────────────────────────────────────
  { nome:'tomate médio', pesog:120, aliases:['tomate','tomate médio','tomate normal','tomate m'] },
  { nome:'tomate grande', pesog:180, aliases:['tomate grande','tomate l'] },
  { nome:'tomate cherry', pesog:15, aliases:['tomate cherry','tomate cereja'] },
  { nome:'pimento', pesog:160, aliases:['pimento','pimento médio','pimento m','capsicum'] },
  { nome:'pimento grande', pesog:220, aliases:['pimento grande','pimento l'] },
  { nome:'courgette', pesog:250, aliases:['courgette','curgete','zucchini'] },
  { nome:'beringela', pesog:300, aliases:['beringela','eggplant','aubergine'] },
  { nome:'pepino', pesog:300, aliases:['pepino','cucumber'] },
  { nome:'cenoura', pesog:100, aliases:['cenoura','carrot'] },
  { nome:'batata média', pesog:150, aliases:['batata','batata média','batata m'] },
  { nome:'batata pequena', pesog:80, aliases:['batata pequena','batata s'] },
  { nome:'batata grande', pesog:250, aliases:['batata grande','batata l'] },
  { nome:'batata doce', pesog:200, aliases:['batata doce','sweet potato'] },
  { nome:'abóbora porção', pesog:300, aliases:['pedaço abóbora','porção abóbora'] },
  { nome:'couve-flor', pesog:800, aliases:['couve-flor','cauliflower'] },
  { nome:'brócolos cabeça', pesog:500, aliases:['brócolos','broccoli','cabeça brócolos'] },
  { nome:'nabo', pesog:150, aliases:['nabo','turnip'] },
  { nome:'alho-porro', pesog:200, aliases:['alho-porro','alho francês','leek','porro'] },
  { nome:'aipo talo', pesog:50, aliases:['talo aipo','aipo','celery stalk'] },
  { nome:'cogumelo', pesog:20, aliases:['cogumelo','champignon','mushroom'] },
  { nome:'folha de couve', pesog:80, aliases:['folha couve','folha de couve'] },

  // ── FRUTA ────────────────────────────────────────────────
  { nome:'limão', pesog:100, aliases:['limão','lemon'] },
  { nome:'lima', pesog:70, aliases:['lima','lime'] },
  { nome:'laranja', pesog:180, aliases:['laranja','orange'] },
  { nome:'maçã', pesog:160, aliases:['maçã','apple'] },
  { nome:'pera', pesog:170, aliases:['pera','pear'] },
  { nome:'banana', pesog:120, aliases:['banana'] },
  { nome:'manga', pesog:300, aliases:['manga','mango'] },
  { nome:'kiwi', pesog:80, aliases:['kiwi'] },
  { nome:'pêssego', pesog:150, aliases:['pêssego','peach'] },
  { nome:'ananás inteiro', pesog:1000, aliases:['ananás','pineapple'] },

  // ── PEIXE E MARISCO ──────────────────────────────────────
  { nome:'lombo de bacalhau', pesog:200, aliases:['lombo bacalhau','lombo de bacalhau','posta bacalhau','posta de bacalhau'] },
  { nome:'lombo de salmão', pesog:180, aliases:['lombo salmão','lombo de salmão','filete salmão','filete de salmão'] },
  { nome:'filete de peixe', pesog:150, aliases:['filete','filete de peixe','filete pescada','filete robalo'] },
  { nome:'dourada inteira', pesog:400, aliases:['dourada','dourada inteira'] },
  { nome:'robalo inteiro', pesog:500, aliases:['robalo','robalo inteiro'] },
  { nome:'sardinha', pesog:80, aliases:['sardinha','sardine'] },
  { nome:'carapau', pesog:100, aliases:['carapau'] },
  { nome:'camarão grande', pesog:30, aliases:['camarão grande','gambão','tiger prawn'] },
  { nome:'camarão médio', pesog:15, aliases:['camarão','camarão médio','shrimp'] },

  // ── CARNES ───────────────────────────────────────────────
  { nome:'frango inteiro', pesog:1200, aliases:['frango inteiro','frango'] },
  { nome:'peito de frango', pesog:200, aliases:['peito frango','peito de frango','chicken breast'] },
  { nome:'coxa de frango', pesog:180, aliases:['coxa frango','coxa de frango'] },
  { nome:'bife de vaca', pesog:180, aliases:['bife','bife de vaca','bife novilho'] },
  { nome:'costeleta de porco', pesog:150, aliases:['costeleta','costeleta de porco','pork chop'] },

  // ── ERVAS E AROMÁTICOS ───────────────────────────────────
  { nome:'ramo de salsa', pesog:15, aliases:['ramo salsa','ramo de salsa','molho salsa'] },
  { nome:'ramo de coentros', pesog:15, aliases:['ramo coentros','ramo de coentros','molho coentros'] },
  { nome:'ramo de tomilho', pesog:5, aliases:['ramo tomilho','ramo de tomilho'] },
  { nome:'ramo de alecrim', pesog:5, aliases:['ramo alecrim','ramo de alecrim'] },
  { nome:'folha de louro', pesog:1, aliases:['folha louro','folha de louro','bay leaf'] },
  { nome:'folha de manjericão', pesog:1, aliases:['folha manjericão','folha de manjericão','folhas manjericão'] },

  // ── LATICÍNIOS ───────────────────────────────────────────
  { nome:'fatia de queijo', pesog:20, aliases:['fatia queijo','fatia de queijo','slice cheese'] },
  { nome:'iogurte', pesog:125, aliases:['iogurte','yogurt'] },

  // ── OVO (EXCEÇÃO — manter em unidades) ───────────────────
  // Os ovos são a única exceção — ficam em "un"
  // NÃO incluir aqui para não converter
];

// ── Função de conversão ───────────────────────────────────────
export function converterUnidadeParaPeso(
  quantidade: number,
  unidade: string,
  nomeProduto: string
): { qt: number; und: string } | null {
  const u = (unidade||'').toLowerCase().trim();
  const p = (nomeProduto||'').toLowerCase().trim();

  // Ovos — manter em unidades
  if (['ovo','ovos','egg','eggs'].some(x => p.includes(x))) return null;

  // Já é kg ou g — não converter
  if (['kg','g','gr','gramas','l','ml','dl','cl','lt'].includes(u)) return null;

  // Procurar peso médio pelo nome do produto
  const match = PESOS_MEDIOS.find(pm =>
    pm.aliases.some(a => p.includes(a)) || p.includes(pm.nome.toLowerCase())
  );

  if (match) {
    const pesoTotal = quantidade * match.pesog;
    return { qt: pesoTotal / 1000, und: 'kg' };
  }

  return null; // não encontrou — manter como está
}

// ── Texto para o prompt de extração IA ───────────────────────
export const INSTRUCOES_PESOS_MEDIOS = `
REGRA CRÍTICA — UNIDADES:
- TODOS os ingredientes devem ter quantidade em gramas (g) ou mililitros (ml)
- A ÚNICA exceção são os OVOS que ficam em "un"
- Quando a receita diz "2 cebolas" → converter para "200 g" (cebola média ≈ 100g cada)
- Quando diz "1 dente de alho" → converter para "6 g"
- Quando diz "1 lombo de bacalhau" → converter para "200 g"
- Quando diz "1 lombo de salmão" → converter para "180 g"
- Quando diz "1 filete de peixe" → converter para "150 g"
- Quando diz "1 tomate" → converter para "120 g"
- Quando diz "1 cenoura" → converter para "100 g"
- Quando diz "1 batata" → converter para "150 g"
- Quando diz "1 limão (sumo)" → converter para "100 g" e nota "(sumo)"
- Quando diz "q.b." → manter "q.b." na coluna QT e deixar UN vazia
- Para colheres de sopa: "1 cs" → "15 ml" (líquidos) ou "15 g" (sólidos)
- Para colheres de chá: "1 cc" → "5 ml" (líquidos) ou "5 g" (sólidos)
`;

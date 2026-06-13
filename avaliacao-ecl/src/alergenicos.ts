// ============================================================
// Alergénicos — 14 obrigatórios por Regulamento UE 1169/2011
// ============================================================

export interface Alergenico {
  id: string;
  nome: string;
  icone: string;
  palavrasChave: string[];
}

export const ALERGENICOS: Alergenico[] = [
  { id: 'gluten', nome: 'Glúten', icone: '🌾',
    palavrasChave: ['farinha','trigo','centeio','cevada','aveia','espelta','kamut','pão','massa','macarrão','esparguete','tagliatelle','lasanha','bolachas','biscoito','broa','sêmola','bulgur','couscous','seitan'] },
  { id: 'crustaceos', nome: 'Crustáceos', icone: '🦐',
    palavrasChave: ['camarão','lagosta','lavagante','sapateira','caranguejo','lagostim','gamba','percebe','langoustine'] },
  { id: 'ovos', nome: 'Ovos', icone: '🥚',
    palavrasChave: ['ovo','ovos','gema','clara','mayonaise','maionese','omelette','omelete'] },
  { id: 'peixe', nome: 'Peixe', icone: '🐟',
    palavrasChave: ['peixe','bacalhau','salmão','atum','robalo','dourada','garoupa','pregado','linguado','solha','pescada','faneca','carapau','sardinha','anchova','anchovas','molho de peixe','fumet'] },
  { id: 'amendoins', nome: 'Amendoins', icone: '🥜',
    palavrasChave: ['amendoim','amendoins','manteiga de amendoim'] },
  { id: 'soja', nome: 'Soja', icone: '🫘',
    palavrasChave: ['soja','tofu','edamame','molho de soja','shoyu','tamari','miso','tempeh','leite de soja'] },
  { id: 'leite', nome: 'Leite / Lactose', icone: '🥛',
    palavrasChave: ['leite','natas','manteiga','queijo','iogurte','requeijão','creme','béchamel','chantilly','mozzarella','parmesão','gruyère','lactose','buttermilk'] },
  { id: 'frutas_casca', nome: 'Frutos de casca rija', icone: '🌰',
    palavrasChave: ['amêndoa','avelã','noz','castanha do caju','pistácio','noz de macadâmia','noz pecã','noz do brasil','pinhão','pistácios'] },
  { id: 'aipo', nome: 'Aipo / Salsão', icone: '🥬',
    palavrasChave: ['aipo','salsão','celery'] },
  { id: 'mostarda', nome: 'Mostarda', icone: '🌿',
    palavrasChave: ['mostarda','sementes de mostarda'] },
  { id: 'sesamo', nome: 'Sementes de Sésamo', icone: '⚪',
    palavrasChave: ['sésamo','sesamo','tahini','tahine'] },
  { id: 'dioxido_enxofre', nome: 'Dióxido de enxofre / Sulfitos', icone: '🍷',
    palavrasChave: ['vinho','vinagre de vinho','sulfito','sulfitos','dióxido de enxofre','conservante e220','e221','e222','e223','e224'] },
  { id: 'tremocos', nome: 'Tremoços', icone: '🌱',
    palavrasChave: ['tremoço','tremoços','lupino'] },
  { id: 'moluscos', nome: 'Moluscos', icone: '🦑',
    palavrasChave: ['amêijoa','mexilhão','ostra','vieira','lula','polvo','choco','caracol','berbigão','longueirão'] },
];

/**
 * Deteta alergénicos presentes numa lista de ingredientes.
 * Devolve os alergénicos encontrados.
 */
export function detetarAlergenicos(ingredientes: string[]): Alergenico[] {
  const texto = ingredientes.join(' ').toLowerCase();
  return ALERGENICOS.filter(al =>
    al.palavrasChave.some(p => texto.includes(p.toLowerCase()))
  );
}

/**
 * Formata lista de alergénicos para mostrar na ficha técnica.
 */
export function formatarAlergenicos(alergenicos: Alergenico[]): string {
  if (alergenicos.length === 0) return 'Nenhum detetado automaticamente — verificar';
  return alergenicos.map(a => `${a.icone} ${a.nome}`).join('  ·  ');
}

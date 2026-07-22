/**
 * =============================================================================
 * Escola de Comércio de Lisboa
 * Editorial AI Engine
 * -----------------------------------------------------------------------------
 * knowledgeResolver.ts
 *
 * Responsável por descobrir automaticamente todo o conhecimento necessário
 * para escrever um manual técnico.
 *
 * Fluxo:
 *
 * Referencial
 *        ↓
 * knowledgeResolver
 *        ↓
 * planner
 *        ↓
 * masterPrompt
 *        ↓
 * LLM
 * =============================================================================
 */

export type CourseProfile =
    | "cozinha"
    | "pastelaria"
    | "restaurante"
    | "bar"
    | "turismo"
    | "hotelaria"
    | "alimentacao"
    | "generic";

export interface KnowledgeContext {

    curso: string;

    perfil: CourseProfile;

    ufcd?: string;

    titulo: string;

    competencias: string[];

    conhecimentos: string[];

    aptidoes: string[];

    objetivos?: string[];

}

export interface KnowledgeResult {

    perfil: CourseProfile;

    temas: string[];

    conceitos: string[];

    conceitosObrigatorios: string[];

    conceitosComplementares: string[];

    haccp: string[];

    seguranca: string[];

    legislacao: string[];

    bibliografia: string[];

    glossario: string[];

    projetos: string[];

    estudosCaso: string[];

    exercicios: string[];

    palavrasChave: string[];

    notasEditoriais: string[];

}

interface KnowledgeRule {

    id:string;

    keywords:string[];

    score:number;

    temas:string[];

    conceitos:string[];

}

/**
 * ============================================================================
 * BASE DE CONHECIMENTO
 * PERFIL: COZINHA
 * ============================================================================
 */

KNOWLEDGE_RULES.push(

{
    id:"aves",

    keywords:[
        "aves",
        "frango",
        "peru",
        "pato",
        "codorniz"
    ],

    score:10,

    temas:[
        "Carnes de Aves"
    ],

    conceitos:[
        "Classificação",
        "Cortes",
        "Preparação",
        "Temperaturas Internas",
        "Conservação",
        "Segurança Alimentar",
        "Métodos de Confeção"
    ]

},

{
    id:"suino",

    keywords:[
        "suíno",
        "porco",
        "leitão",
        "lombo",
        "entremeada"
    ],

    score:10,

    temas:[
        "Carnes Suínas"
    ],

    conceitos:[
        "Cortes",
        "Gordura",
        "Colagénio",
        "Maturação",
        "Temperaturas",
        "Segurança Alimentar"
    ]

},

{
    id:"bovino",

    keywords:[
        "bovino",
        "vaca",
        "novilho",
        "vitela"
    ],

    score:10,

    temas:[
        "Carnes Bovinas"
    ],

    conceitos:[
        "Maturação",
        "Mioglobina",
        "Colagénio",
        "Reação de Maillard",
        "Sous-Vide",
        "Grelhar",
        "Assar"
    ]

},

{
    id:"ovos",

    keywords:[
        "ovo",
        "ovos"
    ],

    score:10,

    temas:[
        "Ovos"
    ],

    conceitos:[
        "Estrutura",
        "Coagulação",
        "Emulsão",
        "Pasteurização",
        "Conservação",
        "Salmonella"
    ]

},

{
    id:"lacticinios",

    keywords:[
        "leite",
        "queijo",
        "manteiga",
        "natas",
        "iogurte"
    ],

    score:10,

    temas:[
        "Laticínios"
    ],

    conceitos:[
        "Pasteurização",
        "Fermentação",
        "Conservação",
        "Temperatura",
        "Segurança Alimentar"
    ]

},

{
    id:"horticolas",

    keywords:[
        "legumes",
        "hortícolas",
        "vegetais",
        "verduras"
    ],

    score:9,

    temas:[
        "Produtos Hortícolas"
    ],

    conceitos:[
        "Lavagem",
        "Desinfeção",
        "Conservação",
        "Corte",
        "Branqueamento",
        "Cozedura"
    ]

},

{
    id:"fruta",

    keywords:[
        "fruta",
        "frutas"
    ],

    score:9,

    temas:[
        "Fruta"
    ],

    conceitos:[
        "Oxidação",
        "Conservação",
        "Sazonalidade",
        "Preparação",
        "Segurança Alimentar"
    ]

},

{
    id:"arroz",

    keywords:[
        "arroz",
        "risotto"
    ],

    score:8,

    temas:[
        "Arroz"
    ],

    conceitos:[
        "Amido",
        "Gelatinização",
        "Absorção",
        "Métodos de Cozedura"
    ]

},

{
    id:"massas",

    keywords:[
        "massa",
        "massas",
        "esparguete",
        "tagliatelle",
        "ravioli"
    ],

    score:8,

    temas:[
        "Massas"
    ],

    conceitos:[
        "Glúten",
        "Hidratação",
        "Cozedura",
        "Textura"
    ]

},

{
    id:"leguminosas",

    keywords:[
        "feijão",
        "grão",
        "lentilhas",
        "ervilhas"
    ],

    score:8,

    temas:[
        "Leguminosas"
    ],

    conceitos:[
        "Hidratação",
        "Demolha",
        "Cozedura",
        "Valor Nutricional"
    ]

},

{
    id:"molhos",

    keywords:[
        "molho",
        "molhos"
    ],

    score:9,

    temas:[
        "Molhos"
    ],

    conceitos:[
        "Emulsões",
        "Reduções",
        "Espessantes",
        "Montagem",
        "Estabilidade"
    ]

},

{
    id:"fundos",

    keywords:[
        "fundo",
        "fundos",
        "caldo"
    ],

    score:9,

    temas:[
        "Fundos"
    ],

    conceitos:[
        "Extração",
        "Gelatina",
        "Clarificação",
        "Redução"
    ]

},

{
    id:"sopas",

    keywords:[
        "sopa",
        "creme",
        "velouté"
    ],

    score:8,

    temas:[
        "Sopas"
    ],

    conceitos:[
        "Textura",
        "Ligação",
        "Emulsão",
        "Conservação"
    ]

},

{
    id:"fritura",

    keywords:[
        "fritura",
        "fritar"
    ],

    score:10,

    temas:[
        "Fritura"
    ],

    conceitos:[
        "Óleos",
        "Ponto de Fumo",
        "Absorção de Gordura",
        "Segurança",
        "Temperatura"
    ]

},

{
    id:"forno",

    keywords:[
        "assar",
        "forno"
    ],

    score:10,

    temas:[
        "Confeção em Forno"
    ],

    conceitos:[
        "Convecção",
        "Radiação",
        "Temperatura",
        "Humidade",
        "Maillard"
    ]

},

{
    id:"sousvide",

    keywords:[
        "sous vide",
        "baixa temperatura"
    ],

    score:10,

    temas:[
        "Sous-Vide"
    ],

    conceitos:[
        "Vácuo",
        "Pasteurização",
        "Temperatura",
        "Tempo",
        "Segurança Alimentar"
    ]

}

);

/**
 * ============================================================================
 * BASE DE CONHECIMENTO
 * PERFIL: PASTELARIA E PANIFICAÇÃO
 * ============================================================================
 */

KNOWLEDGE_RULES.push(

{
    id:"pastelaria",

    keywords:[
        "pastelaria",
        "doçaria",
        "sobremesas"
    ],

    score:10,

    temas:[
        "Pastelaria"
    ],

    conceitos:[
        "Mise en Place",
        "Precisão",
        "Pesagem",
        "Temperatura",
        "Textura",
        "Equilíbrio de Sabores"
    ]

},

{
    id:"panificacao",

    keywords:[
        "pão",
        "panificação",
        "massa lêveda",
        "fermento"
    ],

    score:10,

    temas:[
        "Panificação"
    ],

    conceitos:[
        "Glúten",
        "Hidratação",
        "Autólise",
        "Fermentação",
        "Leveduras",
        "Temperatura da Massa",
        "Cozedura"
    ]

},

{
    id:"fermentacao",

    keywords:[
        "fermentação",
        "fermentar",
        "massa mãe",
        "massa-mãe",
        "levain"
    ],

    score:10,

    temas:[
        "Fermentação"
    ],

    conceitos:[
        "Leveduras",
        "Fermentação Alcoólica",
        "Fermentação Lática",
        "pH",
        "Tempo",
        "Temperatura",
        "Desenvolvimento de Aroma"
    ]

},

{
    id:"chocolate",

    keywords:[
        "chocolate",
        "cacau"
    ],

    score:10,

    temas:[
        "Chocolate"
    ],

    conceitos:[
        "Cristalização",
        "Temperagem",
        "Manteiga de Cacau",
        "Bloom",
        "Conservação",
        "Humidade"
    ]

},

{
    id:"acucar",

    keywords:[
        "açúcar",
        "caramelo",
        "caramelização"
    ],

    score:10,

    temas:[
        "Açúcar"
    ],

    conceitos:[
        "Caramelização",
        "Cristalização",
        "Ponto de Bola",
        "Ponto de Rebuçado",
        "Ponto de Caramelo",
        "Higroscopicidade"
    ]

},

{
    id:"farinhas",

    keywords:[
        "farinha",
        "farinhas"
    ],

    score:9,

    temas:[
        "Farinhas"
    ],

    conceitos:[
        "Proteína",
        "Glúten",
        "Cinzas",
        "Extração",
        "Força da Farinha",
        "Capacidade de Absorção"
    ]

},

{
    id:"massasdoces",

    keywords:[
        "massa areada",
        "massa folhada",
        "massa quebrada",
        "massa brioche",
        "massa choux"
    ],

    score:10,

    temas:[
        "Massas Base"
    ],

    conceitos:[
        "Laminação",
        "Desenvolvimento do Glúten",
        "Incorporação de Gordura",
        "Vapor",
        "Estrutura"
    ]

},

{
    id:"cremes",

    keywords:[
        "creme pasteleiro",
        "creme inglês",
        "ganache",
        "curd"
    ],

    score:9,

    temas:[
        "Cremes"
    ],

    conceitos:[
        "Espessamento",
        "Coagulação",
        "Emulsão",
        "Temperatura",
        "Conservação"
    ]

},

{
    id:"gelados",

    keywords:[
        "gelado",
        "sorvete",
        "gelato"
    ],

    score:9,

    temas:[
        "Gelados"
    ],

    conceitos:[
        "Congelação",
        "Overrun",
        "Estabilizantes",
        "Cristais de Gelo",
        "Textura"
    ]

},

{
    id:"decoracao",

    keywords:[
        "decoração",
        "cake design",
        "glacê",
        "fondant"
    ],

    score:8,

    temas:[
        "Decoração"
    ],

    conceitos:[
        "Acabamento",
        "Modelação",
        "Estabilidade",
        "Apresentação",
        "Criatividade"
    ]

},

{
    id:"microbiologia",

    keywords:[
        "microbiologia",
        "microrganismos",
        "bactérias",
        "fungos"
    ],

    score:10,

    temas:[
        "Microbiologia Alimentar"
    ],

    conceitos:[
        "Bactérias",
        "Bolores",
        "Leveduras",
        "Patogénicos",
        "Deterioração",
        "Conservação",
        "Segurança Alimentar"
    ]

},

{
    id:"tecnologia",

    keywords:[
        "tecnologia alimentar",
        "processamento",
        "indústria alimentar"
    ],

    score:10,

    temas:[
        "Tecnologia Alimentar"
    ],

    conceitos:[
        "Processamento",
        "Pasteurização",
        "Esterilização",
        "Ultra Congelação",
        "Atmosfera Modificada",
        "Embalagem",
        "Vida Útil"
    ]

}

);

/**
 * ============================================================================
 * BASE DE CONHECIMENTO
 * HACCP • LEGISLAÇÃO • NUTRIÇÃO • FOOD COST • SUSTENTABILIDADE
 * ============================================================================
 */

KNOWLEDGE_RULES.push(

{
    id:"haccp",

    keywords:[
        "haccp",
        "segurança alimentar",
        "segurança",
        "higiene"
    ],

    score:15,

    temas:[
        "HACCP"
    ],

    conceitos:[
        "Os 7 Princípios do HACCP",
        "Análise de Perigos",
        "Pontos Críticos de Controlo (PCC)",
        "Limites Críticos",
        "Monitorização",
        "Ações Corretivas",
        "Verificação",
        "Registos",
        "Rastreabilidade"
    ]

},

{
    id:"perigos",

    keywords:[
        "perigos",
        "contaminação",
        "contaminação cruzada"
    ],

    score:15,

    temas:[
        "Perigos Alimentares"
    ],

    conceitos:[
        "Perigos Biológicos",
        "Perigos Químicos",
        "Perigos Físicos",
        "Alergénios",
        "Contaminação Cruzada",
        "Medidas Preventivas"
    ]

},

{
    id:"temperaturas",

    keywords:[
        "temperatura",
        "refrigeração",
        "congelação",
        "descongelação"
    ],

    score:12,

    temas:[
        "Controlo de Temperaturas"
    ],

    conceitos:[
        "Zona de Perigo",
        "Cadeia de Frio",
        "Arrefecimento",
        "Reaquecimento",
        "Conservação",
        "Temperaturas Internas"
    ]

},

{
    id:"limpeza",

    keywords:[
        "limpeza",
        "desinfeção",
        "sanitização"
    ],

    score:10,

    temas:[
        "Higiene"
    ],

    conceitos:[
        "Plano de Limpeza",
        "Desinfeção",
        "Detergentes",
        "Desinfetantes",
        "Verificação",
        "Boas Práticas"
    ]

},

{
    id:"legislacao",

    keywords:[
        "legislação",
        "regulamento",
        "lei",
        "norma"
    ],

    score:12,

    temas:[
        "Legislação Alimentar"
    ],

    conceitos:[
        "Regulamento (CE) 178/2002",
        "Regulamento (CE) 852/2004",
        "Regulamento (CE) 853/2004",
        "Codex Alimentarius",
        "ASAE",
        "DGS"
    ]

},

{
    id:"foodcost",

    keywords:[
        "food cost",
        "custos",
        "ficha técnica",
        "rentabilidade"
    ],

    score:12,

    temas:[
        "Food Cost"
    ],

    conceitos:[
        "Custo da Matéria-Prima",
        "Custo da Receita",
        "Margem Bruta",
        "Preço de Venda",
        "Desperdício",
        "Rentabilidade",
        "Yield"
    ]

},

{
    id:"stocks",

    keywords:[
        "stock",
        "armazenamento",
        "inventário"
    ],

    score:10,

    temas:[
        "Gestão de Stocks"
    ],

    conceitos:[
        "FIFO",
        "FEFO",
        "Rotação",
        "Inventário",
        "Quebras",
        "Conservação"
    ]

},

{
    id:"sustentabilidade",

    keywords:[
        "sustentabilidade",
        "ambiente",
        "desperdício"
    ],

    score:10,

    temas:[
        "Sustentabilidade"
    ],

    conceitos:[
        "Economia Circular",
        "Desperdício Alimentar",
        "Valorização Integral",
        "Pegada Carbónica",
        "Produtos Locais",
        "Sazonalidade"
    ]

},

{
    id:"nutricao",

    keywords:[
        "nutrição",
        "alimentação saudável",
        "nutrientes"
    ],

    score:10,

    temas:[
        "Nutrição"
    ],

    conceitos:[
        "Proteínas",
        "Lípidos",
        "Hidratos de Carbono",
        "Vitaminas",
        "Minerais",
        "Fibra Alimentar",
        "Valor Energético"
    ]

},

{
    id:"alergenios",

    keywords:[
        "alergénios",
        "alergias",
        "intolerâncias"
    ],

    score:12,

    temas:[
        "Alergénios"
    ],

    conceitos:[
        "14 Alergénios Obrigatórios",
        "Rotulagem",
        "Contaminação Cruzada",
        "Informação ao Consumidor",
        "Boas Práticas"
    ]

},

{
    id:"qualidade",

    keywords:[
        "qualidade",
        "controlo da qualidade"
    ],

    score:10,

    temas:[
        "Qualidade"
    ],

    conceitos:[
        "Controlo da Qualidade",
        "Não Conformidades",
        "Melhoria Contínua",
        "Indicadores",
        "Auditorias"
    ]

}

);

/**
 * ============================================================================
 * PERFIS DE CURSO
 * ============================================================================
 */

const PROFILE_KEYWORDS: Record<CourseProfile, string[]> = {

    cozinha: [
        "cozinha",
        "cozinheiro",
        "cozinheira",
        "cozinha profissional"
    ],

    pastelaria: [
        "pastelaria",
        "pasteleiro",
        "doçaria",
        "panificação"
    ],

    restaurante: [
        "restaurante",
        "mesa",
        "serviço",
        "sala"
    ],

    bar: [
        "bar",
        "cocktail",
        "cocktails",
        "bebidas"
    ],

    turismo: [
        "turismo",
        "hotel",
        "hotelaria",
        "alojamento"
    ],

    hotelaria: [
        "hotelaria",
        "hotel"
    ],

    alimentacao: [
        "alimentação",
        "alimentar"
    ],

    generic: []

};

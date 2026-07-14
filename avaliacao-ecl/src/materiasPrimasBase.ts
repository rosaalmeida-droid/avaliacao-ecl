// ============================================================
// Base de dados de matérias-primas — Avaliação ECL
// Preços reais do Continente (junho 2026)
// Critério: SEMPRE o preço mais baixo disponível
// Fonte: continente.pt
// ============================================================

export interface FormaComercial {
  forma: string;       // ex: 'Inteiro', 'Posta', 'Filete', 'Lombo com pele'
  rendimento: number;  // fracção: 0.55 = 55% de aproveitamento
  precoKg?: number;    // preço desta forma se diferente da base
  nota?: string;       // ex: 'após desosse e limpeza'
}

export interface MateriaPrimaBase {
  id: string;
  nome: string;
  categoria: string;
  subcategoria?: string;
  unidadeCompra: string;
  unidadeReceita: string;
  fatorConversao: number;
  precoKg: number;        // preço por kg/l (para comparação)
  precoUnitario: number;  // preço por unidadeCompra
  fonte: string;
  atualizadoEm: string;
  aliases: string[];
  formasComerciais?: FormaComercial[]; // formas de compra disponíveis com rendimentos
  foto?: string;             // URL de imagem ilustrativa (para painel visual)
  descricaoVisual?: string;  // cor, textura e sabor em poucas palavras
}

const D = '2026-06-15';
const F = 'Continente';

export const MATERIAS_PRIMAS_BASE: MateriaPrimaBase[] = [

  // ══════════════════════════════════════════════════════════
  // AÇÚCARES E ADOÇANTES
  // ══════════════════════════════════════════════════════════
  { id:'a001', nome:'Açúcar branco granulado', categoria:'Açúcares', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:1.00, precoUnitario:1.00, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['açúcar','açúcar branco','açúcar granulado','acucar branco','sugar'] },
  { id:'a002', nome:'Açúcar amarelo', categoria:'Açúcares', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:1.49, precoUnitario:1.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['açúcar amarelo','açúcar demerara','acucar amarelo'] },
  { id:'a003', nome:'Açúcar mascavado escuro', categoria:'Açúcares', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:2.39, precoUnitario:2.39, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['açúcar mascavado','mascavado','brown sugar','açúcar escuro'] },
  { id:'a004', nome:'Açúcar em pó', categoria:'Açúcares', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:500, precoKg:3.34, precoUnitario:1.67, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['açúcar em pó','açúcar glacê','açúcar fino','icing sugar','acucar po'] },
  { id:'a005', nome:'Açúcar baunilhado', categoria:'Açúcares', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:8, precoKg:5.00, precoUnitario:0.40, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['açúcar baunilhado','vanilla sugar','açúcar de baunilha'] },
  { id:'a006', nome:'Mel', categoria:'Açúcares', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:500, precoKg:7.98, precoUnitario:3.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['mel','honey','mel de abelha'] },
  { id:'a007', nome:'Açúcar de coco', categoria:'Açúcares', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:400, precoKg:9.97, precoUnitario:3.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['açúcar coco','coconut sugar'] },

  // ══════════════════════════════════════════════════════════
  // FARINHAS E CEREAIS
  // ══════════════════════════════════════════════════════════
  { id:'f001', nome:'Farinha de trigo T55', categoria:'Farinhas', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:0.79, precoUnitario:0.79, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['farinha','farinha de trigo','farinha branca','farinha t55','flour'] },
  { id:'f002', nome:'Farinha de trigo T65', categoria:'Farinhas', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:0.99, precoUnitario:0.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['farinha t65','farinha semi-integral'] },
  { id:'f003', nome:'Farinha integral de trigo', categoria:'Farinhas', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:1.19, precoUnitario:1.19, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['farinha integral','wholemeal flour','farinha wholemeal'] },
  { id:'f004', nome:'Farinha de milho', categoria:'Farinhas', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:500, precoKg:1.58, precoUnitario:0.79, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['farinha milho','cornmeal','fuba','farinha de milho'] },
  { id:'f005', nome:'Amido de milho (Maizena)', categoria:'Farinhas', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:400, precoKg:3.22, precoUnitario:1.29, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['maizena','amido milho','cornstarch','amido de milho','espessante'] },
  { id:'f006', nome:'Arroz agulha branco', categoria:'Cereais', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:1.09, precoUnitario:1.09, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['arroz','arroz agulha','arroz longo','rice'] },
  { id:'f007', nome:'Arroz carolino', categoria:'Cereais', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:1.39, precoUnitario:1.39, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['arroz carolino','arroz redondo','arroz de grão redondo'] },
  { id:'f008', nome:'Arroz basmati', categoria:'Cereais', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:2.49, precoUnitario:2.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['arroz basmati','basmati'] },
  { id:'f009', nome:'Arroz integral', categoria:'Cereais', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:1.99, precoUnitario:1.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['arroz integral','brown rice'] },
  { id:'f010', nome:'Massa esparguete', categoria:'Massas', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:500, precoKg:1.18, precoUnitario:0.59, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['esparguete','spaghetti','massa esparguete'] },
  { id:'f011', nome:'Massa penne', categoria:'Massas', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:500, precoKg:1.18, precoUnitario:0.59, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['penne','massa penne','canetas'] },
  { id:'f012', nome:'Massa fusilli', categoria:'Massas', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:500, precoKg:1.18, precoUnitario:0.59, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['fusilli','espirais','massa espiral'] },
  { id:'f013', nome:'Massa lasanha', categoria:'Massas', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:250, precoKg:2.76, precoUnitario:0.69, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['lasanha','lasagne','placas lasanha'] },
  { id:'f014', nome:'Flocos de aveia', categoria:'Cereais', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:500, precoKg:1.78, precoUnitario:0.89, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['aveia','flocos aveia','oats','oatmeal'] },

  // ══════════════════════════════════════════════════════════
  // GORDURAS E ÓLEOS
  // ══════════════════════════════════════════════════════════
  { id:'g001', nome:'Azeite virgem extra', categoria:'Gorduras', unidadeCompra:'l', unidadeReceita:'ml', fatorConversao:750, precoKg:6.65, precoUnitario:4.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['azeite','azeite virgem','azeite veve','olive oil','azeite extra virgem'] },
  { id:'g002', nome:'Azeite virgem', categoria:'Gorduras', unidadeCompra:'l', unidadeReceita:'ml', fatorConversao:750, precoKg:5.32, precoUnitario:3.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['azeite virgem normal'] },
  { id:'g003', nome:'Óleo de girassol', categoria:'Gorduras', unidadeCompra:'l', unidadeReceita:'ml', fatorConversao:1000, precoKg:1.49, precoUnitario:1.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['óleo','óleo girassol','óleo vegetal','sunflower oil','oil'] },
  { id:'g004', nome:'Manteiga sem sal', categoria:'Gorduras', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:250, precoKg:7.16, precoUnitario:1.79, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['manteiga','butter','manteiga sem sal','manteiga s/sal'] },
  { id:'g005', nome:'Manteiga com sal', categoria:'Gorduras', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:250, precoKg:7.16, precoUnitario:1.79, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['manteiga com sal','manteiga c/sal','salted butter'] },
  { id:'g006', nome:'Margarina vegetal', categoria:'Gorduras', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:500, precoKg:2.38, precoUnitario:1.19, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['margarina','margarine','flora'] },
  { id:'g007', nome:'Natas 35% MG para bater', categoria:'Gorduras', unidadeCompra:'un', unidadeReceita:'ml', fatorConversao:200, precoKg:4.45, precoUnitario:0.89, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['natas','creme leite','heavy cream','natas para bater','natas 35%','natas gordas'] },
  { id:'g008', nome:'Natas para culinária 15%', categoria:'Gorduras', unidadeCompra:'un', unidadeReceita:'ml', fatorConversao:200, precoKg:3.45, precoUnitario:0.69, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['natas culinária','natas light','single cream','natas 15%','natas magras'] },
  { id:'g009', nome:'Banha de porco', categoria:'Gorduras', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:500, precoKg:2.18, precoUnitario:1.09, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['banha','banha porco','lard'] },

  // ══════════════════════════════════════════════════════════
  // LATICÍNIOS
  // ══════════════════════════════════════════════════════════
  { id:'l001', nome:'Leite meio gordo UHT', categoria:'Laticínios', unidadeCompra:'l', unidadeReceita:'ml', fatorConversao:1000, precoKg:0.79, precoUnitario:0.79, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['leite','leite meio gordo','milk','leite uht'] },
  { id:'l002', nome:'Leite gordo UHT', categoria:'Laticínios', unidadeCompra:'l', unidadeReceita:'ml', fatorConversao:1000, precoKg:0.89, precoUnitario:0.89, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['leite gordo','whole milk'] },
  { id:'l003', nome:'Leite magro UHT', categoria:'Laticínios', unidadeCompra:'l', unidadeReceita:'ml', fatorConversao:1000, precoKg:0.69, precoUnitario:0.69, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['leite magro','skimmed milk'] },
  { id:'l004', nome:'Leite condensado', categoria:'Laticínios', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:397, precoKg:3.52, precoUnitario:1.39, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['leite condensado','condensed milk'] },
  { id:'l005', nome:'Iogurte natural sem açúcar', categoria:'Laticínios', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:125, precoKg:2.72, precoUnitario:0.34, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['iogurte','iogurte natural','yogurt','yoghurt'] },
  { id:'l006', nome:'Queijo flamengo fatiado', categoria:'Laticínios', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:400, precoKg:6.22, precoUnitario:2.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['queijo flamengo','queijo amarelo','edam','queijo fatiado'] },
  { id:'l007', nome:'Queijo mozzarella fresco', categoria:'Laticínios', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:125, precoKg:7.92, precoUnitario:0.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['mozzarella','queijo mozzarella','mozzarela'] },
  { id:'l008', nome:'Queijo mozzarella ralado', categoria:'Laticínios', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:200, precoKg:8.95, precoUnitario:1.79, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['mozzarella ralada','queijo ralado mozzarella'] },
  { id:'l009', nome:'Queijo parmesão ralado', categoria:'Laticínios', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:80, precoKg:18.62, precoUnitario:1.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['parmesão','parmesan','queijo parmesão','queijo parmigiano'] },
  { id:'l010', nome:'Queijo ricotta', categoria:'Laticínios', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:250, precoKg:5.96, precoUnitario:1.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['ricotta','ricota','requeijão'] },
  { id:'l011', nome:'Queijo creme (philadelphia tipo)', categoria:'Laticínios', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:200, precoKg:6.45, precoUnitario:1.29, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['queijo creme','cream cheese','philadelphia','queijo fresco creme'] },
  { id:'l012', nome:'Queijo fresco', categoria:'Laticínios', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:250, precoKg:3.96, precoUnitario:0.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['queijo fresco','fresh cheese'] },
  { id:'l013', nome:'Requeijão', categoria:'Laticínios', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:200, precoKg:3.95, precoUnitario:0.79, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['requeijão','reqeijao','requesón'] },
  { id:'l014', nome:'Queijo Serra da Estrela', categoria:'Laticínios', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:500, precoKg:28.00, precoUnitario:14.00, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['queijo serra','queijo serra estrela','serra da estrela'] },

  // ══════════════════════════════════════════════════════════
  // OVOS
  // ══════════════════════════════════════════════════════════
  { id:'o001', nome:'Ovos M (15 unidades)', categoria:'Ovos', unidadeCompra:'un', unidadeReceita:'un', fatorConversao:1, precoKg:0.00, precoUnitario:0.20, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['ovo','ovos','egg','eggs','ovo M','ovos M'] },
  { id:'o002', nome:'Ovos L (12 unidades)', categoria:'Ovos', unidadeCompra:'un', unidadeReceita:'un', fatorConversao:1, precoKg:0.00, precoUnitario:0.23, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['ovo L','ovos L','ovo grande'] },
  { id:'o003', nome:'Ovos biológicos', categoria:'Ovos', unidadeCompra:'un', unidadeReceita:'un', fatorConversao:1, precoKg:0.00, precoUnitario:0.35, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['ovo bio','ovos biológicos','ovo ecológico'] },

  // ══════════════════════════════════════════════════════════
  // BATATAS E TUBÉRCULOS
  // ══════════════════════════════════════════════════════════
  { id:'b001', nome:'Batata branca (cozer/fritar)', categoria:'Legumes', subcategoria:'Batatas', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:1.12, precoUnitario:1.12, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['batata','batata branca','batata cozer','batata fritar','potato','batatas'] },
  { id:'b002', nome:'Batata vermelha', categoria:'Legumes', subcategoria:'Batatas', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:1.10, precoUnitario:1.10, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['batata vermelha','red potato'] },
  { id:'b003', nome:'Batata especial assar', categoria:'Legumes', subcategoria:'Batatas', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:1.29, precoUnitario:1.29, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['batata assar','batata para assar','baking potato'] },
  { id:'b004', nome:'Batata nova', categoria:'Legumes', subcategoria:'Batatas', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:1.49, precoUnitario:1.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['batata nova','new potato','batata primor'] },
  { id:'b005', nome:'Batata doce laranja', categoria:'Legumes', subcategoria:'Batatas', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:1.99, precoUnitario:1.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['batata doce','sweet potato','batata doce laranja','inhame'] },
  { id:'b006', nome:'Batata doce roxa', categoria:'Legumes', subcategoria:'Batatas', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:2.49, precoUnitario:2.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['batata doce roxa','purple sweet potato'] },
  { id:'b007', nome:'Batata congelada palitos', categoria:'Legumes', subcategoria:'Batatas', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:1.49, precoUnitario:1.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['batata frita congelada','batata palito','french fries','batata pré-frita'] },

  // ══════════════════════════════════════════════════════════
  // CEBOLAS E ALHOS
  // ══════════════════════════════════════════════════════════
  { id:'c001', nome:'Cebola amarela', categoria:'Legumes', subcategoria:'Cebolas', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:1.18, precoUnitario:1.18, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['cebola','cebola amarela','onion','cebolas'] },
  { id:'c002', nome:'Cebola roxa', categoria:'Legumes', subcategoria:'Cebolas', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:2.49, precoUnitario:2.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['cebola roxa','red onion','cebola roxa'] },
  { id:'c003', nome:'Cebola nova', categoria:'Legumes', subcategoria:'Cebolas', unidadeCompra:'un', unidadeReceita:'un', fatorConversao:1, precoKg:0.00, precoUnitario:0.19, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['cebola nova','spring onion','cebolinhas'] },
  { id:'c004', nome:'Cebola doce', categoria:'Legumes', subcategoria:'Cebolas', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:1.99, precoUnitario:1.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['cebola doce','sweet onion','cebola de Viana'] },
  { id:'c005', nome:'Alho branco', categoria:'Legumes', subcategoria:'Alhos', unidadeCompra:'un', unidadeReceita:'dente', fatorConversao:10, precoKg:0.00, precoUnitario:0.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['alho','garlic','cabeça de alho','dente de alho','alho branco'] },
  { id:'c006', nome:'Alho francês (alho-porro)', categoria:'Legumes', subcategoria:'Alhos', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:1.99, precoUnitario:1.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['alho francês','alho porro','leek','alho-porro'] },

  // ══════════════════════════════════════════════════════════
  // TOMATE E DERIVADOS
  // ══════════════════════════════════════════════════════════
  { id:'t001', nome:'Tomate redondo fresco', categoria:'Legumes', subcategoria:'Tomate', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:1.99, precoUnitario:1.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['tomate','tomate fresco','tomato','tomates'] },
  { id:'t002', nome:'Tomate cherry', categoria:'Legumes', subcategoria:'Tomate', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:250, precoKg:2.99, precoUnitario:2.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['tomate cherry','cherry tomato','tomate cereja'] },
  { id:'t003', nome:'Tomate pelado em lata', categoria:'Conservas', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:400, precoKg:1.47, precoUnitario:0.59, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['tomate pelado','tomate lata','tinned tomato','tomate inteiro lata'] },
  { id:'t004', nome:'Tomate triturado em lata', categoria:'Conservas', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:400, precoKg:1.47, precoUnitario:0.59, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['tomate triturado','crushed tomato','tomate partido'] },
  { id:'t005', nome:'Concentrado de tomate', categoria:'Conservas', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:200, precoKg:3.95, precoUnitario:0.79, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['concentrado tomate','tomato paste','pasta de tomate','polpa concentrada'] },
  { id:'t006', nome:'Polpa de tomate', categoria:'Conservas', unidadeCompra:'un', unidadeReceita:'ml', fatorConversao:500, precoKg:1.78, precoUnitario:0.89, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['polpa tomate','tomato puree','passata'] },
  { id:'t007', nome:'Molho de tomate', categoria:'Conservas', unidadeCompra:'un', unidadeReceita:'ml', fatorConversao:500, precoKg:1.98, precoUnitario:0.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['molho tomate','tomato sauce','salsa tomate'] },

  // ══════════════════════════════════════════════════════════
  // FRUTOS EXÓTICOS / TROPICAIS
  // ══════════════════════════════════════════════════════════
  { id:'fx001', nome:'Abacate', categoria:'Legumes', subcategoria:'Frutos', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:9.98, precoUnitario:9.98, fonte:'Continente', atualizadoEm:'2026-06', aliases:['abacate','avocado','aguacate'], formasComerciais:[ {forma:'Inteiro (com caroço e pele)',rendimento:0.65,precoKg:3.99,nota:'remover pele e caroço'}, {forma:'Polpa limpa',rendimento:1.00,precoKg:6.14} ] },
  { id:'fx002', nome:'Manga', categoria:'Legumes', subcategoria:'Frutos', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:2.99, precoUnitario:2.99, fonte:'Continente', atualizadoEm:'2026-06', aliases:['manga','mango'] },
  { id:'fx003', nome:'Maracujá', categoria:'Legumes', subcategoria:'Frutos', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:80, precoKg:7.99, precoUnitario:0.64, fonte:'Continente', atualizadoEm:'2026-06', aliases:['maracujá','passion fruit','maracuja'] },
  { id:'fx004', nome:'Ananás', categoria:'Legumes', subcategoria:'Frutos', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:1.99, precoUnitario:1.99, fonte:'Continente', atualizadoEm:'2026-06', aliases:['ananás','pineapple','abacaxi'], formasComerciais:[ {forma:'Inteiro (com casca)',rendimento:0.55,precoKg:1.99,nota:'remover casca e miolo'}, {forma:'Já descascado/cortado',rendimento:1.00,precoKg:3.62} ] },

  // ══════════════════════════════════════════════════════════
  // MICROGREENS
  // Preços estimados (restauração) — actualizar com Makro
  // Fotos: microgreens.pt (cdn Shopify)
  // ══════════════════════════════════════════════════════════
  { id:'mg001', nome:'Microgreens de rúcula', categoria:'Microgreens', unidadeCompra:'g', unidadeReceita:'g', fatorConversao:1, precoKg:90, precoUnitario:0.09, fonte:'microgreens.pt', atualizadoEm:'2026-07', aliases:['microgreens rucula','micro rúcula','micro rucula','microgreen rúcula','microgreens de rucula'], foto:'https://www.microgreens.pt/cdn/shop/files/Vaso_Micro_Rucula.webp', descricaoVisual:'Verde intenso · folhas finas dentadas · picante e amendoado' },
  { id:'mg002', nome:'Microgreens de rabanete', categoria:'Microgreens', unidadeCompra:'g', unidadeReceita:'g', fatorConversao:1, precoKg:90, precoUnitario:0.09, fonte:'microgreens.pt', atualizadoEm:'2026-07', aliases:['microgreens rabanete','micro rabanete','microgreen rabanete','microgreens de rabanete'], foto:'https://www.microgreens.pt/cdn/shop/files/Vaso_Micro_Rabanete.webp', descricaoVisual:'Verde com caule magenta · picante e fresco' },
  { id:'mg003', nome:'Microgreens de rabanete roxo', categoria:'Microgreens', unidadeCompra:'g', unidadeReceita:'g', fatorConversao:1, precoKg:95, precoUnitario:0.095, fonte:'microgreens.pt', atualizadoEm:'2026-07', aliases:['microgreens rabanete roxo','micro rabanete roxo','microgreen rabanete roxo'], foto:'https://www.microgreens.pt/cdn/shop/files/Vaso_Micro_Rabanete_Roxo.webp', descricaoVisual:'Caule vermelho-roxo intenso · visual impactante · picante' },
  { id:'mg004', nome:'Microgreens de beterraba', categoria:'Microgreens', unidadeCompra:'g', unidadeReceita:'g', fatorConversao:1, precoKg:90, precoUnitario:0.09, fonte:'microgreens.pt', atualizadoEm:'2026-07', aliases:['microgreens beterraba','micro beterraba','microgreen beterraba'], foto:'https://www.microgreens.pt/cdn/shop/files/Vaso_Micro_Beterraba.webp', descricaoVisual:'Nervuras e caule vermelho-borgonha · sabor terroso doce' },
  { id:'mg005', nome:'Microgreens de ervilha', categoria:'Microgreens', unidadeCompra:'g', unidadeReceita:'g', fatorConversao:1, precoKg:70, precoUnitario:0.07, fonte:'microgreens.pt', atualizadoEm:'2026-07', aliases:['microgreens ervilha','micro ervilha','microgreen ervilha'], foto:'https://www.microgreens.pt/cdn/shop/files/Vaso_Micro_Ervilha.webp', descricaoVisual:'Verde claro · folhas rendilhadas · doce e umami · versátil' },
  { id:'mg006', nome:'Microgreens de girassol', categoria:'Microgreens', unidadeCompra:'g', unidadeReceita:'g', fatorConversao:1, precoKg:75, precoUnitario:0.075, fonte:'microgreens.pt', atualizadoEm:'2026-07', aliases:['microgreens girassol','micro girassol','microgreen girassol'], foto:'https://www.microgreens.pt/cdn/shop/files/Vaso_Micro_Girassol.webp', descricaoVisual:'Verde robusto · folhas largas · crocante · sabor a noz' },
  { id:'mg007', nome:'Microgreens de coentros', categoria:'Microgreens', unidadeCompra:'g', unidadeReceita:'g', fatorConversao:1, precoKg:100, precoUnitario:0.10, fonte:'microgreens.pt', atualizadoEm:'2026-07', aliases:['microgreens coentros','micro coentros','microgreen coentros'], foto:'https://www.microgreens.pt/cdn/shop/files/Vaso_Micro_Coentro.webp', descricaoVisual:'Verde pálido · folhas redondas · aroma intenso a coentro' },
  { id:'mg008', nome:'Microgreens de manjericão', categoria:'Microgreens', unidadeCompra:'g', unidadeReceita:'g', fatorConversao:1, precoKg:115, precoUnitario:0.115, fonte:'microgreens.pt', atualizadoEm:'2026-07', aliases:['microgreens manjericão','micro manjericão','microgreen manjericao'], foto:'https://www.microgreens.pt/cdn/shop/files/Vaso_Micro_Manjericao.webp', descricaoVisual:'Verde brilhante · folhas ovais · aroma doce a basil' },
  { id:'mg009', nome:'Microgreens de amaranto', categoria:'Microgreens', unidadeCompra:'g', unidadeReceita:'g', fatorConversao:1, precoKg:95, precoUnitario:0.095, fonte:'microgreens.pt', atualizadoEm:'2026-07', aliases:['microgreens amaranto','micro amaranto','microgreen amaranto'], foto:'https://www.microgreens.pt/cdn/shop/files/Vaso_Micro_Amaranto.webp', descricaoVisual:'Tons de vermelho e verde · folhas delicadas · levemente doce' },
  { id:'mg010', nome:'Mix de microgreens', categoria:'Microgreens', unidadeCompra:'g', unidadeReceita:'g', fatorConversao:1, precoKg:85, precoUnitario:0.085, fonte:'microgreens.pt', atualizadoEm:'2026-07', aliases:['microgreens mix','mix microgreens','microgreen mix','microvegetais'], foto:'https://www.microgreens.pt/cdn/shop/files/Mix_MicroVegetais_copy.webp', descricaoVisual:'5+ variedades · cores e texturas variadas · versátil' },

  // ══════════════════════════════════════════════════════════
  // OUTROS LEGUMES E HORTÍCOLAS
  // ══════════════════════════════════════════════════════════
  { id:'v001', nome:'Cenoura', categoria:'Legumes', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:0.99, precoUnitario:1.98, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['cenoura','carrot','cenouras'] },
  { id:'v002', nome:'Pimento vermelho', categoria:'Legumes', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:2.49, precoUnitario:2.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['pimento vermelho','red pepper','pimento','capsicum vermelho'] },
  { id:'v003', nome:'Pimento verde', categoria:'Legumes', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:1.99, precoUnitario:1.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['pimento verde','green pepper','pimento verde'] },
  { id:'v004', nome:'Pimento amarelo', categoria:'Legumes', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:2.99, precoUnitario:2.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['pimento amarelo','yellow pepper'] },
  { id:'v005', nome:'Courgette', categoria:'Legumes', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:1.49, precoUnitario:1.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['courgette','curgete','zucchini','aboborinha'] },
  { id:'v006', nome:'Beringela', categoria:'Legumes', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:1.49, precoUnitario:1.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['beringela','eggplant','aubergine'] },
  { id:'v007', nome:'Brócolos', categoria:'Legumes', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:500, precoKg:4.24, precoUnitario:4.24, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['brócolos','broccoli','brocolo','brocoli'] },
  { id:'v008', nome:'Couve-flor', categoria:'Legumes', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:800, precoKg:2.49, precoUnitario:1.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['couve flor','cauliflower','couve-flor'] },
  { id:'v009', nome:'Couve lombarda', categoria:'Legumes', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:1000, precoKg:1.49, precoUnitario:1.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['couve lombarda','savoy cabbage','couve'] },
  { id:'v010', nome:'Couve portuguesa', categoria:'Legumes', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:0.99, precoUnitario:0.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['couve portuguesa','couve galega','couve caldo verde'] },
  { id:'v011', nome:'Espinafres frescos', categoria:'Legumes', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:200, precoKg:1.49, precoUnitario:1.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['espinafres','spinach','espinafre'] },
  { id:'v012', nome:'Alface iceberg', categoria:'Legumes', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:300, precoKg:2.63, precoUnitario:0.79, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['alface','alface iceberg','lettuce','iceberg'] },
  { id:'v013', nome:'Rúcula', categoria:'Legumes', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:100, precoKg:9.90, precoUnitario:0.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['rúcula','rocket','arugula'] },
  { id:'v014', nome:'Cogumelos brancos frescos', categoria:'Legumes', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:250, precoKg:5.16, precoUnitario:1.29, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['cogumelos','mushrooms','cogumelo branco','champignon'] },
  { id:'v015', nome:'Cogumelos portobello', categoria:'Legumes', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:200, precoKg:7.45, precoUnitario:1.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['portobello','cogumelo portobello'] },
  { id:'v016', nome:'Abóbora butternut', categoria:'Legumes', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:1.29, precoUnitario:1.29, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['abóbora','butternut','abobora','abóbora manteiga','abóbora butternut'] },
  { id:'v017', nome:'Abóbora hokkaido', categoria:'Legumes', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:1.99, precoUnitario:1.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['hokkaido','abóbora hokkaido','abóbora japonesa'] },
  { id:'v018', nome:'Abóbora menina', categoria:'Legumes', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:0.99, precoUnitario:0.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['abóbora menina','abobora menina','pumpkin'] },
  { id:'v019', nome:'Ervilhas congeladas', categoria:'Legumes', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:1000, precoKg:1.79, precoUnitario:1.79, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['ervilhas','peas','ervilhas congeladas','green peas'] },
  { id:'v020', nome:'Feijão verde', categoria:'Legumes', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:1.99, precoUnitario:1.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['feijão verde','green beans','judias verdes'] },
  { id:'v021', nome:'Nabo', categoria:'Legumes', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:0.89, precoUnitario:0.89, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['nabo','turnip','nabos'] },
  { id:'v022', nome:'Aipo', categoria:'Legumes', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:400, precoKg:2.47, precoUnitario:0.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['aipo','celery','salsão'] },
  { id:'v023', nome:'Pepino', categoria:'Legumes', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:400, precoKg:1.97, precoUnitario:0.79, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['pepino','cucumber'] },
  { id:'v024', nome:'Alho-francês (porro)', categoria:'Legumes', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:300, precoKg:3.30, precoUnitario:0.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['porro','alho porro','alho francês','leek'] },

  // ══════════════════════════════════════════════════════════
  // FRUTA
  // ══════════════════════════════════════════════════════════
  { id:'fr001', nome:'Limão', categoria:'Fruta', unidadeCompra:'un', unidadeReceita:'un', fatorConversao:1, precoKg:0.00, precoUnitario:0.25, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['limão','lemon','sumo de limão','limon'] },
  { id:'fr002', nome:'Laranja', categoria:'Fruta', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:1.29, precoUnitario:1.29, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['laranja','orange','laranjas'] },
  { id:'fr003', nome:'Maçã golden', categoria:'Fruta', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:1.49, precoUnitario:1.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['maçã','maçã golden','apple','golden','maças'] },
  { id:'fr004', nome:'Maçã granny smith', categoria:'Fruta', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:1.69, precoUnitario:1.69, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['maçã verde','granny smith','maçã azeda'] },
  { id:'fr005', nome:'Pera rocha', categoria:'Fruta', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:1.99, precoUnitario:1.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['pera','pera rocha','pear','peras'] },
  { id:'fr006', nome:'Banana', categoria:'Fruta', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:1.09, precoUnitario:1.09, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['banana','bananas'] },
  { id:'fr007', nome:'Morangos', categoria:'Fruta', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:500, precoKg:5.98, precoUnitario:2.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['morango','morangos','strawberry','strawberries'] },
  { id:'fr008', nome:'Frutos vermelhos congelados', categoria:'Fruta', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:500, precoKg:3.98, precoUnitario:1.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['frutos vermelhos','mixed berries','frutos silvestres','bagas congeladas'] },
  { id:'fr009', nome:'Manga', categoria:'Fruta', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:300, precoKg:3.30, precoUnitario:0.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['manga','mango'] },
  { id:'fr010', nome:'Ananás', categoria:'Fruta', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:800, precoKg:1.87, precoUnitario:1.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['ananás','pineapple','abacaxi'] },
  { id:'fr011', nome:'Kiwi', categoria:'Fruta', unidadeCompra:'un', unidadeReceita:'un', fatorConversao:1, precoKg:0.00, precoUnitario:0.29, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['kiwi'] },
  { id:'fr012', nome:'Lima', categoria:'Fruta', unidadeCompra:'un', unidadeReceita:'un', fatorConversao:1, precoKg:0.00, precoUnitario:0.29, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['lima','lime'] },
  { id:'fr013', nome:'Pêssego', categoria:'Fruta', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:2.49, precoUnitario:2.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['pêssego','peach','pessego'] },
  { id:'fr014', nome:'Frutos secos mistos', categoria:'Fruta', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:200, precoKg:9.95, precoUnitario:1.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['frutos secos','nozes','amendoins','nuts'] },

  // ══════════════════════════════════════════════════════════
  // CARNES
  // ══════════════════════════════════════════════════════════
  { id:'cr001', nome:'Frango inteiro', categoria:'Carnes', subcategoria:'Aves', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:2.49, precoUnitario:2.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['frango','frango inteiro','chicken','frango assado'], formasComerciais:[ {forma:'Inteiro (assar ou trinchar)',rendimento:1.00,precoKg:2.49,nota:'peso bruto, perde ossos no prato'}, {forma:'Desossado completo (peito + coxa)',rendimento:0.65,precoKg:2.49,nota:'após desosse total'}, {forma:'Só peito (após desosse)',rendimento:0.35,precoKg:2.49,nota:'usar só o peito'}, ] },
  { id:'cr002', nome:'Peito de frango', categoria:'Carnes', subcategoria:'Aves', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:7.49, precoUnitario:7.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['peito frango','peito de frango','chicken breast','filetes frango'] },
  { id:'cr003', nome:'Coxa e perna de frango', categoria:'Carnes', subcategoria:'Aves', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:3.49, precoUnitario:3.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['coxa frango','perna frango','chicken thigh','chicken leg'] },
  { id:'cr004', nome:'Peru peito', categoria:'Carnes', subcategoria:'Aves', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:6.99, precoUnitario:6.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['peru','peito peru','turkey breast','peru peito'] },
  { id:'cr005', nome:'Carne picada de novilho', categoria:'Carnes', subcategoria:'Vaca', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:9.99, precoUnitario:9.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['carne picada','carne moída','ground beef','picado vaca','hamburguer'] },
  { id:'cr006', nome:'Bife de novilho', categoria:'Carnes', subcategoria:'Vaca', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:17.49, precoUnitario:17.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['bife','bife novilho','beef steak','bife vaca'] },
  { id:'cr007', nome:'Lombo de vaca', categoria:'Carnes', subcategoria:'Vaca', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:16.99, precoUnitario:16.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['lombo','lombo vaca','sirloin','lombo de novilho'], formasComerciais:[ {forma:'Lombo limpo (tournedos/medalhões)',rendimento:1.00,precoKg:16.99,nota:'já limpo e aparado'}, {forma:'Lombo com cabeça e gordura',rendimento:0.80,precoKg:13.99,nota:'limpar gordura e cabeça'}, ] },
  { id:'cr008', nome:'Costeleta de porco', categoria:'Carnes', subcategoria:'Porco', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:4.99, precoUnitario:4.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['costeleta','costeleta porco','pork chop','costoletas'] },
  { id:'cr009', nome:'Entrecosto de porco', categoria:'Carnes', subcategoria:'Porco', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:3.99, precoUnitario:3.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['entrecosto','spare ribs','costela porco','entrecosto porco'] },
  { id:'cr010', nome:'Lombinho de porco', categoria:'Carnes', subcategoria:'Porco', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:7.99, precoUnitario:7.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['lombinho porco','pork tenderloin','lombinho'] },
  { id:'cr011', nome:'Carne de porco para guisar', categoria:'Carnes', subcategoria:'Porco', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:4.49, precoUnitario:4.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['porco guisar','carne guisar','pork stew','porco alentejana'] },
  { id:'cr012', nome:'Borrego perna', categoria:'Carnes', subcategoria:'Borrego', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:12.99, precoUnitario:12.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['borrego','cordeiro','lamb leg','perna borrego'], formasComerciais:[ {forma:'Perna com osso (assar inteira)',rendimento:1.00,precoKg:9.99,nota:'peso com osso'}, {forma:'Perna desossada',rendimento:0.70,precoKg:9.99,nota:'após desosse'}, {forma:'Borrego inteiro',rendimento:0.65,precoKg:7.99,nota:'peças + aparas'}, ] },
  { id:'cr013', nome:'Vitela bife', categoria:'Carnes', subcategoria:'Vaca', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:14.99, precoUnitario:14.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['vitela','bife vitela','veal'] },

  // ══════════════════════════════════════════════════════════
  // ENCHIDOS E CHARCUTARIA
  // ══════════════════════════════════════════════════════════
  { id:'e001', nome:'Chouriço de carne', categoria:'Enchidos', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:200, precoKg:7.45, precoUnitario:1.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['chouriço','chouriço carne','chorizo'] },
  { id:'e002', nome:'Linguiça', categoria:'Enchidos', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:200, precoKg:6.95, precoUnitario:1.39, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['linguiça','salsichas frescas'] },
  { id:'e003', nome:'Presunto fatiado', categoria:'Enchidos', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:100, precoKg:14.90, precoUnitario:1.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['presunto','ham','presunto fatiado','pata negra'] },
  { id:'e004', nome:'Fiambre fatiado', categoria:'Enchidos', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:150, precoKg:7.27, precoUnitario:1.09, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['fiambre','cooked ham','fiambre fatiado'] },
  { id:'e005', nome:'Bacon fatiado', categoria:'Enchidos', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:150, precoKg:8.60, precoUnitario:1.29, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['bacon','toucinho','entremeada'] },
  { id:'e006', nome:'Farinheira', categoria:'Enchidos', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:200, precoKg:5.95, precoUnitario:1.19, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['farinheira'] },
  { id:'e007', nome:'Morcela', categoria:'Enchidos', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:200, precoKg:5.95, precoUnitario:1.19, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['morcela','black pudding','morcilla'] },
  { id:'e008', nome:'Salpicão', categoria:'Enchidos', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:200, precoKg:7.95, precoUnitario:1.59, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['salpicão','salpicao'] },

  // ══════════════════════════════════════════════════════════
  // PEIXE FRESCO
  // ══════════════════════════════════════════════════════════
  { id:'p001', nome:'Salmão fresco filete', categoria:'Peixe', subcategoria:'Peixe fresco', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:11.99, precoUnitario:11.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['salmão','salmon','filete salmão','salmao fresco','salmão fresco'], formasComerciais:[ {forma:'Lombo com pele (pronto a usar)',rendimento:1.00,precoKg:12.99,nota:'sem perda de aproveitamento'}, {forma:'Filete limpo sem pele',rendimento:0.90,precoKg:12.99,nota:'pequena perda na remoção da pele'}, {forma:'Lombo inteiro com pele',rendimento:0.80,precoKg:10.99,nota:'remover pele e aparar'}, {forma:'Posta central',rendimento:0.85,precoKg:9.99,nota:'retirar espinha central'}, {forma:'Salmão inteiro eviscerado',rendimento:0.60,precoKg:7.99,nota:'filetar + remover espinhas + pele'}, ] },
  { id:'p002', nome:'Robalo fresco', categoria:'Peixe', subcategoria:'Peixe fresco', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:9.99, precoUnitario:9.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['robalo','sea bass','lubina'], formasComerciais:[ {forma:'Filete limpo sem pele',rendimento:0.90,precoKg:11.99}, {forma:'Inteiro eviscerado (filetar)',rendimento:0.55,precoKg:7.99,nota:'escamar + filetar + remover espinhas'}, {forma:'Inteiro com escamas (vivo/fresco)',rendimento:0.50,precoKg:6.99,nota:'escamar + esviscerar + filetar'}, ] },
  { id:'p003', nome:'Dourada fresca', categoria:'Peixe', subcategoria:'Peixe fresco', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:7.99, precoUnitario:7.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['dourada','gilthead','sea bream','dourada fresca'], formasComerciais:[ {forma:'Filete limpo sem pele',rendimento:0.90,precoKg:9.99}, {forma:'Inteiro eviscerado',rendimento:0.55,precoKg:5.99,nota:'escamar + filetar'} ] },
  { id:'p004', nome:'Pescada fresca', categoria:'Peixe', subcategoria:'Peixe fresco', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:5.99, precoUnitario:5.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['pescada','hake','merluza'] },
  { id:'p005', nome:'Atum fresco', categoria:'Peixe', subcategoria:'Peixe fresco', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:18.99, precoUnitario:18.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['atum fresco','tuna fresh','tataki atum'], formasComerciais:[ {forma:'Lombo limpo (tataki/sashimi)',rendimento:1.00,precoKg:14.99}, {forma:'Posta central',rendimento:0.90,precoKg:12.99,nota:'retirar espinha central'}, {forma:'Lombos com pele',rendimento:0.80,precoKg:10.99} ] },
  { id:'p006', nome:'Pregado fresco', categoria:'Peixe', subcategoria:'Peixe fresco', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:16.99, precoUnitario:16.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['pregado','turbot'] },
  { id:'p007', nome:'Sardinha fresca', categoria:'Peixe', subcategoria:'Peixe fresco', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:3.99, precoUnitario:3.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['sardinha','sardine','sardinhas'] },
  { id:'p008', nome:'Carapau', categoria:'Peixe', subcategoria:'Peixe fresco', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:4.49, precoUnitario:4.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['carapau','horse mackerel','chicharro'] },

  // ══════════════════════════════════════════════════════════
  // BACALHAU (todas as variantes)
  // ══════════════════════════════════════════════════════════
  { id:'bac001', nome:'Bacalhau salgado seco especial 1ª', categoria:'Peixe', subcategoria:'Bacalhau', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:19.99, precoUnitario:19.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', formasComerciais:[ {forma:'Posta salgada (demolhar 48h)',rendimento:0.65,precoKg:9.99,nota:'perde sal — peso final ≈ 1.5× peso seco'}, {forma:'Lombo salgado (demolhar 48h)',rendimento:0.70,precoKg:12.99} ], aliases:['bacalhau seco','bacalhau salgado','bacalhau 1ª','cod dried','bacalhau especial'] },
  { id:'bac002', nome:'Bacalhau crescido salgado seco', categoria:'Peixe', subcategoria:'Bacalhau', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:8.49, precoUnitario:8.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['bacalhau crescido','bacalhau pequeno','bacalhau corrente'] },
  { id:'bac003', nome:'Bacalhau graúdo salgado seco', categoria:'Peixe', subcategoria:'Bacalhau', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:12.99, precoUnitario:12.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['bacalhau graúdo','bacalhau grande','bacalhau jumbo'] },
  { id:'bac004', nome:'Bacalhau demolhado (fresco)', categoria:'Peixe', subcategoria:'Bacalhau', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:13.99, precoUnitario:13.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['bacalhau demolhado','bacalhau fresco demolhado','bacalhau demolhado fresco'] },
  { id:'bac005', nome:'Bacalhau demolhado congelado', categoria:'Peixe', subcategoria:'Bacalhau', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:7.99, precoUnitario:7.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['bacalhau congelado','bacalhau demolhado congelado','bacalhau de molho congelado'] },
  { id:'bac006', nome:'Lombos de bacalhau congelados', categoria:'Peixe', subcategoria:'Bacalhau', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:400, precoKg:17.72, precoUnitario:7.09, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['lombos bacalhau','lombo bacalhau','bacalhau lombo','bacalhau congelado lombo'] },
  { id:'bac007', nome:'Postas de bacalhau congeladas', categoria:'Peixe', subcategoria:'Bacalhau', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:500, precoKg:9.98, precoUnitario:4.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['postas bacalhau','posta bacalhau','bacalhau posta'] },
  { id:'bac008', nome:'Bacalhau desfiado congelado', categoria:'Peixe', subcategoria:'Bacalhau', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:400, precoKg:9.97, precoUnitario:3.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['bacalhau desfiado','bacalhau lascas','bacalhau à brás'] },

  // ══════════════════════════════════════════════════════════
  // PEIXE CONGELADO
  // ══════════════════════════════════════════════════════════
  { id:'pc001', nome:'Atum em lata (ao natural)', categoria:'Conservas', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:120, precoKg:9.08, precoUnitario:1.09, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['atum','atum lata','tuna','atum natural','atum em lata'] },
  { id:'pc002', nome:'Atum em lata (em azeite)', categoria:'Conservas', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:120, precoKg:9.92, precoUnitario:1.19, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['atum azeite','atum em azeite','tuna oil'] },
  { id:'pc003', nome:'Sardinha em lata', categoria:'Conservas', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:120, precoKg:6.58, precoUnitario:0.79, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['sardinha lata','tinned sardine','conserva sardinha'] },
  { id:'pc004', nome:'Camarão congelado descascado', categoria:'Peixe', subcategoria:'Marisco', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:1000, precoKg:22.95, precoUnitario:22.95, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['camarão','shrimp','gambas','camarão descascado','camarão congelado'] },
  { id:'pc005', nome:'Camarão com casca congelado', categoria:'Peixe', subcategoria:'Marisco', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:8.99, precoUnitario:8.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['camarão casca','camarão inteiro','prawns','shrimp shell'] },
  { id:'pc006', nome:'Lulas limpas congeladas', categoria:'Peixe', subcategoria:'Marisco', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:1000, precoKg:5.99, precoUnitario:5.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['lulas','lulas limpas','squid','lulas congeladas'] },
  { id:'pc007', nome:'Polvo congelado', categoria:'Peixe', subcategoria:'Marisco', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:7.99, precoUnitario:7.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['polvo','octopus','polvo congelado'], formasComerciais:[ {forma:'Polvo congelado inteiro (cozinhar)',rendimento:0.70,precoKg:7.99,nota:'perde água na cozedura'}, {forma:'Polvo já cozido',rendimento:1.00,precoKg:10.99,nota:'pronto a usar'} ] },
  { id:'pc008', nome:'Amêijoas congeladas', categoria:'Peixe', subcategoria:'Marisco', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:9.99, precoUnitario:9.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['amêijoas','clams','berbigão'] },
  { id:'pc009', nome:'Mexilhão congelado', categoria:'Peixe', subcategoria:'Marisco', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:1000, precoKg:4.99, precoUnitario:4.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['mexilhão','mussels','mexilhoes'] },
  { id:'pc010', nome:'Salmão congelado', categoria:'Peixe', subcategoria:'Peixe congelado', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:11.22, precoUnitario:11.22, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['salmão congelado','salmon frozen','salmao congelado'] },

  // ══════════════════════════════════════════════════════════
  // TEMPEROS E CONDIMENTOS
  // ══════════════════════════════════════════════════════════
  { id:'tm001', nome:'Sal fino', categoria:'Temperos', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:0.39, precoUnitario:0.39, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['sal','salt','sal fino','sal marinho','sal grosso'] },
  { id:'tm002', nome:'Pimenta preta moída', categoria:'Temperos', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:50, precoKg:23.80, precoUnitario:1.19, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['pimenta','pimenta preta','black pepper','pimenta moída','pepper'] },
  { id:'tm003', nome:'Pimenta branca moída', categoria:'Temperos', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:45, precoKg:26.44, precoUnitario:1.19, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['pimenta branca','white pepper'] },
  { id:'tm004', nome:'Louro folhas secas', categoria:'Temperos', unidadeCompra:'un', unidadeReceita:'folha', fatorConversao:10, precoKg:0.00, precoUnitario:0.79, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['louro','bay leaf','folha de louro','bay leaves'] },
  { id:'tm005', nome:'Salsa fresca', categoria:'Temperos', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:30, precoKg:16.33, precoUnitario:0.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['salsa','parsley','salsa fresca','perejil'] },
  { id:'tm006', nome:'Coentros frescos', categoria:'Temperos', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:30, precoKg:19.80, precoUnitario:0.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['coentros','cilantro','coriander','coentros frescos'] },
  { id:'tm007', nome:'Tomilho seco', categoria:'Temperos', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:20, precoKg:49.50, precoUnitario:0.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['tomilho','thyme','thyme seco'] },
  { id:'tm008', nome:'Orégãos secos', categoria:'Temperos', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:20, precoKg:44.50, precoUnitario:0.89, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['orégãos','oregano','oregão','oreganos'] },
  { id:'tm009', nome:'Paprika (colorau) doce', categoria:'Temperos', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:50, precoKg:25.80, precoUnitario:1.29, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['paprika','colorau','paprica','pimentão doce'] },
  { id:'tm010', nome:'Paprika fumada', categoria:'Temperos', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:50, precoKg:29.80, precoUnitario:1.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['paprika fumada','smoked paprika','pimentão fumado'] },
  { id:'tm011', nome:'Canela em pó', categoria:'Temperos', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:30, precoKg:43.00, precoUnitario:1.29, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['canela','cinnamon','canela em pó'] },
  { id:'tm012', nome:'Cúrcuma (açafrão das índias)', categoria:'Temperos', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:40, precoKg:37.25, precoUnitario:1.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['cúrcuma','açafrão','turmeric','açafrão das índias','curcuma'] },
  { id:'tm013', nome:'Cominhos em pó', categoria:'Temperos', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:45, precoKg:29.78, precoUnitario:1.34, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['cominhos','cumin','cominho'] },
  { id:'tm014', nome:'Noz-moscada em pó', categoria:'Temperos', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:30, precoKg:46.33, precoUnitario:1.39, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['noz moscada','nutmeg','noz-moscada'] },
  { id:'tm015', nome:'Gengibre em pó', categoria:'Temperos', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:35, precoKg:39.71, precoUnitario:1.39, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['gengibre','ginger','gingembre'] },
  { id:'tm016', nome:'Gengibre fresco', categoria:'Temperos', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:100, precoKg:7.90, precoUnitario:0.79, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['gengibre fresco','fresh ginger'] },
  { id:'tm017', nome:'Vinagre de vinho branco', categoria:'Temperos', unidadeCompra:'un', unidadeReceita:'ml', fatorConversao:500, precoKg:1.18, precoUnitario:0.59, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['vinagre','vinagre branco','white vinegar','vinagre vinho'] },
  { id:'tm018', nome:'Vinagre balsâmico', categoria:'Temperos', unidadeCompra:'un', unidadeReceita:'ml', fatorConversao:250, precoKg:5.96, precoUnitario:1.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['vinagre balsâmico','balsamic vinegar','aceto balsamico'] },
  { id:'tm019', nome:'Molho de soja', categoria:'Temperos', unidadeCompra:'un', unidadeReceita:'ml', fatorConversao:150, precoKg:8.60, precoUnitario:1.29, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['molho soja','soja','soy sauce','shoyu','tamari'] },
  { id:'tm020', nome:'Molho worcestershire', categoria:'Temperos', unidadeCompra:'un', unidadeReceita:'ml', fatorConversao:150, precoKg:7.93, precoUnitario:1.19, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['worcestershire','molho inglês','lea perrins'] },
  { id:'tm021', nome:'Mostarda Dijon', categoria:'Temperos', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:200, precoKg:7.45, precoUnitario:1.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['mostarda','dijon','mustard','mostarda dijon'] },
  { id:'tm022', nome:'Mostarda amarela', categoria:'Temperos', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:250, precoKg:4.36, precoUnitario:1.09, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['mostarda amarela','yellow mustard'] },
  { id:'tm023', nome:'Ketchup', categoria:'Temperos', unidadeCompra:'un', unidadeReceita:'ml', fatorConversao:340, precoKg:3.20, precoUnitario:1.09, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['ketchup','catsup','molho tomate heinz'] },
  { id:'tm024', nome:'Maionese', categoria:'Temperos', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:250, precoKg:3.16, precoUnitario:0.79, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['maionese','mayonnaise','mayo'] },

  // ══════════════════════════════════════════════════════════
  // ERVAS AROMÁTICAS
  // ══════════════════════════════════════════════════════════
  { id:'er001', nome:'Manjericão fresco', categoria:'Ervas', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:25, precoKg:19.60, precoUnitario:0.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['manjericão','basil','basilico'] },
  { id:'er002', nome:'Hortelã fresca', categoria:'Ervas', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:25, precoKg:19.60, precoUnitario:0.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['hortelã','mint','hortelã-pimenta','menta'] },
  { id:'er003', nome:'Alecrim fresco', categoria:'Ervas', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:25, precoKg:19.60, precoUnitario:0.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['alecrim','rosemary','rosmarino'] },
  { id:'er004', nome:'Cebolinho fresco', categoria:'Ervas', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:25, precoKg:19.60, precoUnitario:0.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['cebolinho','chives','ciboulette'] },
  { id:'er005', nome:'Tomilho fresco', categoria:'Ervas', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:25, precoKg:19.60, precoUnitario:0.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['tomilho fresco','fresh thyme'] },
  { id:'er006', nome:'Salva fresca', categoria:'Ervas', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:25, precoKg:19.60, precoUnitario:0.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['salva','sage'] },
  { id:'er007', nome:'Estragão seco', categoria:'Ervas', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:15, precoKg:65.33, precoUnitario:0.98, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['estragão','tarragon','estragon'] },

  // ══════════════════════════════════════════════════════════
  // LEGUMINOSAS
  // ══════════════════════════════════════════════════════════
  { id:'lg001', nome:'Grão de bico seco', categoria:'Leguminosas', unidadeCompra:'kg', unidadeReceita:'g', fatorConversao:1000, precoKg:1.99, precoUnitario:1.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['grão seco','grão de bico','chickpeas dried'] },
  { id:'lg002', nome:'Grão de bico cozido (lata)', categoria:'Leguminosas', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:400, precoKg:1.97, precoUnitario:0.79, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['grão cozido','grão lata','chickpeas tinned','grão'] },
  { id:'lg003', nome:'Feijão encarnado cozido (lata)', categoria:'Leguminosas', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:400, precoKg:1.97, precoUnitario:0.79, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['feijão encarnado','feijão vermelho','red kidney beans','feijão'] },
  { id:'lg004', nome:'Feijão branco cozido (lata)', categoria:'Leguminosas', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:400, precoKg:1.97, precoUnitario:0.79, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['feijão branco','white beans','cannellini'] },
  { id:'lg005', nome:'Feijão preto cozido (lata)', categoria:'Leguminosas', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:400, precoKg:1.97, precoUnitario:0.79, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['feijão preto','black beans','feijoada'] },
  { id:'lg006', nome:'Lentilhas verdes', categoria:'Leguminosas', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:500, precoKg:2.78, precoUnitario:1.39, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['lentilhas','lentils','lentilhas verdes'] },
  { id:'lg007', nome:'Lentilhas vermelhas', categoria:'Leguminosas', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:500, precoKg:2.98, precoUnitario:1.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['lentilhas vermelhas','red lentils'] },
  { id:'lg008', nome:'Milho doce em lata', categoria:'Conservas', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:285, precoKg:2.42, precoUnitario:0.69, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['milho','corn','milho doce','milho lata','sweetcorn'] },

  // ══════════════════════════════════════════════════════════
  // CALDOS E FUNDOS
  // ══════════════════════════════════════════════════════════
  { id:'cd001', nome:'Caldo de galinha (cubo Knorr)', categoria:'Caldos', unidadeCompra:'un', unidadeReceita:'un', fatorConversao:1, precoKg:0.00, precoUnitario:0.15, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['caldo galinha','caldo knorr','chicken stock cube','cubo caldo','caldo ave'] },
  { id:'cd002', nome:'Caldo de carne (cubo)', categoria:'Caldos', unidadeCompra:'un', unidadeReceita:'un', fatorConversao:1, precoKg:0.00, precoUnitario:0.15, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['caldo carne','beef stock cube','caldo vaca'] },
  { id:'cd003', nome:'Caldo de peixe (cubo)', categoria:'Caldos', unidadeCompra:'un', unidadeReceita:'un', fatorConversao:1, precoKg:0.00, precoUnitario:0.15, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['caldo peixe','fish stock cube','fumet'] },
  { id:'cd004', nome:'Caldo de legumes (cubo)', categoria:'Caldos', unidadeCompra:'un', unidadeReceita:'un', fatorConversao:1, precoKg:0.00, precoUnitario:0.15, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['caldo legumes','vegetable stock cube','caldo vegetal'] },
  { id:'cd005', nome:'Vinho branco culinária', categoria:'Caldos', unidadeCompra:'un', unidadeReceita:'ml', fatorConversao:750, precoKg:3.32, precoUnitario:2.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['vinho branco','white wine','vinho culinária','vinho para cozinhar'] },
  { id:'cd006', nome:'Vinho tinto culinária', categoria:'Caldos', unidadeCompra:'un', unidadeReceita:'ml', fatorConversao:750, precoKg:3.32, precoUnitario:2.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['vinho tinto','red wine','vinho tinto culinária'] },
  { id:'cd007', nome:'Vinho do porto', categoria:'Caldos', unidadeCompra:'un', unidadeReceita:'ml', fatorConversao:750, precoKg:6.65, precoUnitario:4.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['porto','vinho do porto','port wine'] },
  { id:'cd008', nome:'Cerveja', categoria:'Caldos', unidadeCompra:'un', unidadeReceita:'ml', fatorConversao:330, precoKg:2.12, precoUnitario:0.70, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['cerveja','beer','sagres','super bock'] },

  // ══════════════════════════════════════════════════════════
  // CHOCOLATE E CACAU
  // ══════════════════════════════════════════════════════════
  { id:'ch001', nome:'Chocolate negro 70%', categoria:'Chocolate', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:200, precoKg:7.45, precoUnitario:1.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['chocolate negro','dark chocolate','chocolate 70%','chocolate amargo'] },
  { id:'ch002', nome:'Chocolate de leite', categoria:'Chocolate', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:200, precoKg:6.45, precoUnitario:1.29, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['chocolate leite','milk chocolate','chocolate ao leite'] },
  { id:'ch003', nome:'Chocolate branco', categoria:'Chocolate', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:200, precoKg:7.45, precoUnitario:1.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['chocolate branco','white chocolate'] },
  { id:'ch004', nome:'Cacau em pó sem açúcar', categoria:'Chocolate', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:250, precoKg:9.96, precoUnitario:2.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['cacau','cocoa','cacau em pó','cacau puro'] },
  { id:'ch005', nome:'Pepitas de chocolate negro', categoria:'Chocolate', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:200, precoKg:9.95, precoUnitario:1.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['pepitas chocolate','chocolate chips','gotas chocolate'] },
  { id:'ch006', nome:'Nutella', categoria:'Chocolate', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:400, precoKg:7.47, precoUnitario:2.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['nutella','creme avelã','chocolate avelã'] },

  // ══════════════════════════════════════════════════════════
  // LEVEDANTES E ADITIVOS
  // ══════════════════════════════════════════════════════════
  { id:'lv001', nome:'Fermento em pó Royal', categoria:'Levedantes', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:17, precoKg:25.88, precoUnitario:0.44, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['fermento','baking powder','fermento em pó','levedante','pó de levedar'] },
  { id:'lv002', nome:'Bicarbonato de sódio', categoria:'Levedantes', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:200, precoKg:3.95, precoUnitario:0.79, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['bicarbonato','baking soda','bicarbonato sódio'] },
  { id:'lv003', nome:'Fermento seco de padeiro', categoria:'Levedantes', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:7, precoKg:62.86, precoUnitario:0.44, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['levedura seca','yeast','fermento padeiro','fermento de pão','fermento seco'] },
  { id:'lv004', nome:'Gelatina em folhas', categoria:'Levedantes', unidadeCompra:'un', unidadeReceita:'folha', fatorConversao:6, precoKg:0.00, precoUnitario:0.69, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['gelatina','gelatin','gelatina folha','folha gelatina'] },
  { id:'lv005', nome:'Gelatina em pó neutra', categoria:'Levedantes', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:10, precoKg:50.00, precoUnitario:0.50, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['gelatina pó','gelatin powder','agar agar'] },
  { id:'lv006', nome:'Cremor tártaro', categoria:'Levedantes', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:100, precoKg:12.90, precoUnitario:1.29, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['cremor tartaro','cream of tartar'] },

  // ══════════════════════════════════════════════════════════
  // AZEITONAS E CONSERVAS
  // ══════════════════════════════════════════════════════════
  { id:'az001', nome:'Azeitonas pretas', categoria:'Conservas', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:200, precoKg:6.45, precoUnitario:1.29, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['azeitonas pretas','black olives','azeitonas'] },
  { id:'az002', nome:'Azeitonas verdes', categoria:'Conservas', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:200, precoKg:6.45, precoUnitario:1.29, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['azeitonas verdes','green olives'] },
  { id:'az003', nome:'Alcaparras', categoria:'Conservas', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:100, precoKg:8.90, precoUnitario:0.89, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['alcaparras','capers','alcaparras em salmoura'] },
  { id:'az004', nome:'Pickles', categoria:'Conservas', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:250, precoKg:3.16, precoUnitario:0.79, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['pickles','pepinilhos','cornichons'] },

  // ══════════════════════════════════════════════════════════
  // FRUTOS SECOS E SEMENTES
  // ══════════════════════════════════════════════════════════
  { id:'fs001', nome:'Amêndoas laminadas', categoria:'Frutos secos', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:100, precoKg:15.90, precoUnitario:1.59, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['amêndoas','almonds','amêndoa laminada','amende'] },
  { id:'fs002', nome:'Nozes', categoria:'Frutos secos', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:200, precoKg:12.45, precoUnitario:2.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['nozes','walnuts','noz'] },
  { id:'fs003', nome:'Pinhões', categoria:'Frutos secos', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:100, precoKg:29.90, precoUnitario:2.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['pinhões','pine nuts','pinhao'] },
  { id:'fs004', nome:'Avelãs', categoria:'Frutos secos', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:200, precoKg:8.45, precoUnitario:1.69, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['avelãs','hazelnuts','avelã'] },
  { id:'fs005', nome:'Passas de uva', categoria:'Frutos secos', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:250, precoKg:3.96, precoUnitario:0.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['passas','raisins','uvas passas','sultanas'] },
  { id:'fs006', nome:'Tâmaras', categoria:'Frutos secos', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:200, precoKg:5.45, precoUnitario:1.09, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['tâmaras','dates'] },
  { id:'fs007', nome:'Sementes de sésamo', categoria:'Frutos secos', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:100, precoKg:8.90, precoUnitario:0.89, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['sésamo','sesame seeds','gergelim'] },
  { id:'fs008', nome:'Sementes de girassol', categoria:'Frutos secos', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:200, precoKg:4.95, precoUnitario:0.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['sementes girassol','sunflower seeds'] },

  // ══════════════════════════════════════════════════════════
  // PRODUTOS DE PASTELARIA
  // ══════════════════════════════════════════════════════════
  { id:'pa001', nome:'Baunilha extrato', categoria:'Pastelaria', unidadeCompra:'un', unidadeReceita:'ml', fatorConversao:50, precoKg:21.80, precoUnitario:1.09, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['baunilha','vanilla extract','extrato baunilha','essência baunilha'] },
  { id:'pa002', nome:'Baunilha em vagem', categoria:'Pastelaria', unidadeCompra:'un', unidadeReceita:'un', fatorConversao:1, precoKg:0.00, precoUnitario:1.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['vagem baunilha','vanilla pod','pau baunilha'] },
  { id:'pa003', nome:'Rum escuro', categoria:'Pastelaria', unidadeCompra:'un', unidadeReceita:'ml', fatorConversao:700, precoKg:9.98, precoUnitario:6.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['rum','rum escuro','dark rum','aguardente'] },
  { id:'pa004', nome:'Açúcar pérola', categoria:'Pastelaria', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:250, precoKg:5.16, precoUnitario:1.29, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['açúcar pérola','pearl sugar','granulated sugar decorating'] },
  { id:'pa005', nome:'Corante alimentar', categoria:'Pastelaria', unidadeCompra:'un', unidadeReceita:'ml', fatorConversao:10, precoKg:0.00, precoUnitario:0.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['corante','food coloring','corante gel','corante líquido'] },
  { id:'pa006', nome:'Massa folhada', categoria:'Pastelaria', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:275, precoKg:5.27, precoUnitario:1.45, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['massa folhada','puff pastry','folhado'] },
  { id:'pa007', nome:'Massa quebrada', categoria:'Pastelaria', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:230, precoKg:5.17, precoUnitario:1.19, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['massa quebrada','shortcrust pastry','brisa'] },
  { id:'pa008', nome:'Pão ralado', categoria:'Pastelaria', unidadeCompra:'un', unidadeReceita:'g', fatorConversao:250, precoKg:1.96, precoUnitario:0.49, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['pão ralado','breadcrumbs','panko','pão ralado fino'] },

  // ══════════════════════════════════════════════════════════
  // OUTROS
  // ══════════════════════════════════════════════════════════
  { id:'ou001', nome:'Água', categoria:'Outros', unidadeCompra:'l', unidadeReceita:'ml', fatorConversao:1000, precoKg:0.00, precoUnitario:0.00, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['água','water','agua'] },
  { id:'ou002', nome:'Azeite para fritura', categoria:'Outros', unidadeCompra:'l', unidadeReceita:'ml', fatorConversao:1000, precoKg:3.99, precoUnitario:3.99, fonte:'Melhor preço mai/2026', atualizadoEm:'2026-05', aliases:['azeite fritura','frying oil','óleo fritura'] },
];

// ── Funções de pesquisa ───────────────────────────────────────
export function pesquisarMateriaPrima(termo: string): MateriaPrimaBase[] {
  const t = termo.toLowerCase().trim();
  if (t.length < 2) return [];
  return MATERIAS_PRIMAS_BASE.filter(mp =>
    mp.nome.toLowerCase().includes(t) ||
    mp.aliases.some(a => a.toLowerCase().includes(t)) ||
    (mp.subcategoria||'').toLowerCase().includes(t)
  ).sort((a,b) => {
    // Priorizar correspondências exatas
    const aExato = a.aliases.some(al => al.toLowerCase() === t) || a.nome.toLowerCase() === t;
    const bExato = b.aliases.some(al => al.toLowerCase() === t) || b.nome.toLowerCase() === t;
    if (aExato && !bExato) return -1;
    if (!aExato && bExato) return 1;
    return a.precoUnitario - b.precoUnitario; // mais barato primeiro
  }).slice(0, 8);
}

export function encontrarMateriaPrima(nome: string): MateriaPrimaBase | undefined {
  // Limpar ruído: duplicações tipo "ovo ovo" ou "é ovo, é ovo", artigos, pontuação
  let t = nome.toLowerCase().trim()
    .replace(/[.,;:!?()]/g, ' ')        // pontuação → espaço
    .replace(/\b(é|de|da|do|das|dos|um|uma|uns|umas)\b/g, ' ') // artigos/conectores
    .replace(/\s+/g, ' ')               // espaços múltiplos
    .trim();
  // Remover palavra duplicada consecutiva: "ovo ovo" → "ovo"
  t = t.replace(/\b(\w+)( \1\b)+/g, '$1');

  if (!t) return undefined;

  // Tentar correspondência exata primeiro
  let found = MATERIAS_PRIMAS_BASE.find(mp =>
    mp.nome.toLowerCase() === t ||
    mp.aliases.some(a => a.toLowerCase() === t)
  );
  // Depois correspondência parcial nos dois sentidos (palavra-base contida no texto OU vice-versa)
  if (!found) {
    const matches = MATERIAS_PRIMAS_BASE.filter(mp =>
      mp.nome.toLowerCase().includes(t) || t.includes(mp.nome.toLowerCase()) ||
      mp.aliases.some(a => a.toLowerCase().includes(t) || t.includes(a.toLowerCase()))
    ).sort((a,b) => a.precoUnitario - b.precoUnitario);
    found = matches[0];
  }
  return found;
}

export function getPrecoKg(mp: MateriaPrimaBase): string {
  return mp.precoKg > 0 ? `${mp.precoKg.toFixed(2)} €/kg` : '';
}

// ── Busca inteligente com nível de confiança ────────────────────────────
// Usada pela Requisição para decidir quando mostrar um aviso ao professor.
// Considera primeiro a camada CUSTOM (editada/aprendida pelo professor —
// sempre prioritária), depois a base de fábrica.
export type ConfiancaMatch = 'exata' | 'ambigua' | 'nenhuma';

export interface ResultadoBuscaMP {
  mp: MateriaPrimaBase | undefined;
  confianca: ConfiancaMatch;
}

export function encontrarMateriaPrimaComConfianca(
  nome: string,
  custom: { nome: string; categoria: string; unidadeCompra: string; precoKg: number; precoUnitario: number; aliases: string[] }[] = []
): ResultadoBuscaMP {
  let t = nome.toLowerCase().trim()
    .replace(/[.,;:!?()]/g, ' ')
    .replace(/\b(é|de|da|do|das|dos|um|uma|uns|umas)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  t = t.replace(/\b(\w+)( \1\b)+/g, '$1');

  if (!t) return { mp: undefined, confianca: 'nenhuma' };

  // Converter custom para o formato MateriaPrimaBase para reutilizar a mesma lógica
  const customComoBase: MateriaPrimaBase[] = custom.map(c => ({
    id: `custom_${c.nome}`, nome: c.nome, categoria: c.categoria,
    unidadeCompra: c.unidadeCompra, unidadeReceita: c.unidadeCompra, fatorConversao: 1,
    precoKg: c.precoKg, precoUnitario: c.precoUnitario, fonte: 'Professor', atualizadoEm: '', aliases: c.aliases,
  }));
  // Custom tem prioridade — procurar lá primeiro
  const todasFontes = [...customComoBase, ...MATERIAS_PRIMAS_BASE];

  // 1. Correspondência EXATA (nome ou alias igual) — alta confiança
  const exata = todasFontes.find(mp =>
    mp.nome.toLowerCase() === t || mp.aliases.some(a => a.toLowerCase() === t)
  );
  if (exata) return { mp: exata, confianca: 'exata' };

  // 2. Correspondência PARCIAL — confiança ambígua, vale a pena confirmar
  const matches = todasFontes.filter(mp =>
    mp.nome.toLowerCase().includes(t) || t.includes(mp.nome.toLowerCase()) ||
    mp.aliases.some(a => a.toLowerCase().includes(t) || t.includes(a.toLowerCase()))
  ).sort((a, b) => a.precoUnitario - b.precoUnitario);

  if (matches.length > 0) return { mp: matches[0], confianca: 'ambigua' };

  // 3. Nada encontrado
  return { mp: undefined, confianca: 'nenhuma' };
}

// ── Lazy getter — evita TDZ em bundles Rollup/Vite ──────────
export function getMateriaPrimasBase(): MateriaPrimaBase[] {
  return MATERIAS_PRIMAS_BASE;
}

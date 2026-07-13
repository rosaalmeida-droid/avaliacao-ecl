// ============================================================
// frases_subtecnicas.ts
// Frases de autoavaliação em 4 níveis para SUB-xxx e APP-xxx
// Migrado de S-codes para IDs da biblioteca V10
// ============================================================

export interface FrasesCompetencia {
  competenciaId: string;
  frases: [string, string, string, string]; // nao | ajuda | consegui | autonomia
}

// ── Frases genéricas (fallback para qualquer SUB/APP sem frase específica) ──
export function frasesGenericas(nomeTecnica: string): FrasesCompetencia['frases'] {
  return [
    `Não consegui ${nomeTecnica.toLowerCase()} de forma correta, precisei de ajuda constante.`,
    `Consegui ${nomeTecnica.toLowerCase()}, mas com algumas dificuldades ou erros que precisaram de correção.`,
    `Consegui ${nomeTecnica.toLowerCase()} corretamente, sem erros relevantes.`,
    `Consegui ${nomeTecnica.toLowerCase()} com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.`,
  ];
}

// ── Mapeamento SUB-xxx → 4 frases de autoavaliação ──────────
export const FRASES_SUBTECNICAS: FrasesCompetencia[] = [

  // ── CORTES (COR-030) ────────────────────────────────────────
  { competenciaId: 'SUB-COR-030-001', frases: [
    'Não consegui cortar em juliana de forma correta, precisei de ajuda constante.',
    'Consegui cortar em juliana, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui cortar em juliana corretamente, sem erros relevantes.',
    'Consegui cortar em juliana com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-COR-030-002', frases: [
    'Não consegui cortar em brunoise de forma correta, precisei de ajuda constante.',
    'Consegui cortar em brunoise, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui cortar em brunoise corretamente, sem erros relevantes.',
    'Consegui cortar em brunoise com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-COR-030-003', frases: [
    'Não consegui cortar em mirepoix de forma correta, precisei de ajuda constante.',
    'Consegui cortar em mirepoix, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui cortar em mirepoix corretamente, sem erros relevantes.',
    'Consegui cortar em mirepoix com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-COR-030-004', frases: [
    'Não consegui cortar em paysanne de forma correta, precisei de ajuda constante.',
    'Consegui cortar em paysanne, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui cortar em paysanne corretamente, sem erros relevantes.',
    'Consegui cortar em paysanne com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-COR-030-005', frases: [
    'Não consegui cortar em chiffonade de forma correta, precisei de ajuda constante.',
    'Consegui cortar em chiffonade, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui cortar em chiffonade corretamente, sem erros relevantes.',
    'Consegui cortar em chiffonade com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-COR-030-006', frases: [
    'Não consegui cortar em bâtonnet de forma correta, precisei de ajuda constante.',
    'Consegui cortar em bâtonnet, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui cortar em bâtonnet corretamente, sem erros relevantes.',
    'Consegui cortar em bâtonnet com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-COR-030-007', frases: [
    'Não consegui cortar em jardineira de forma correta, precisei de ajuda constante.',
    'Consegui cortar em jardineira, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui cortar em jardineira corretamente, sem erros relevantes.',
    'Consegui cortar em jardineira com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-COR-030-008', frases: [
    'Não consegui cortar em macedónia de forma correta, precisei de ajuda constante.',
    'Consegui cortar em macedónia, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui cortar em macedónia corretamente, sem erros relevantes.',
    'Consegui cortar em macedónia com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-COR-030-009', frases: [
    'Não consegui cortar em rodelas de forma correta, precisei de ajuda constante.',
    'Consegui cortar em rodelas, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui cortar em rodelas corretamente, sem erros relevantes.',
    'Consegui cortar em rodelas com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-COR-030-010', frases: [
    'Não consegui cortar em meias-luas de forma correta, precisei de ajuda constante.',
    'Consegui cortar em meias-luas, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui cortar em meias-luas corretamente, sem erros relevantes.',
    'Consegui cortar em meias-luas com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-COR-030-011', frases: [
    'Não consegui cortar em gomos de forma correta, precisei de ajuda constante.',
    'Consegui cortar em gomos, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui cortar em gomos corretamente, sem erros relevantes.',
    'Consegui cortar em gomos com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-COR-030-019', frases: [
    'Não consegui fazer concassé de tomate de forma correta, precisei de ajuda constante.',
    'Consegui fazer concassé de tomate, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui fazer concassé de tomate corretamente, sem erros relevantes.',
    'Consegui fazer concassé de tomate com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-COR-030-020', frases: [
    'Não consegui ciselar cebola de forma correta, precisei de ajuda constante.',
    'Consegui ciselar cebola, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui ciselar cebola corretamente, sem erros relevantes.',
    'Consegui ciselar cebola com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-COR-030-021', frases: [
    'Não consegui cortar em escalopes de forma correta, precisei de ajuda constante.',
    'Consegui cortar em escalopes, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui cortar em escalopes corretamente, sem erros relevantes.',
    'Consegui cortar em escalopes com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-COR-030-022', frases: [
    'Não consegui cortar em medalhões de forma correta, precisei de ajuda constante.',
    'Consegui cortar em medalhões, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui cortar em medalhões corretamente, sem erros relevantes.',
    'Consegui cortar em medalhões com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-COR-030-023', frases: [
    'Não consegui cortar supremos de forma correta, precisei de ajuda constante.',
    'Consegui cortar supremos, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui cortar supremos corretamente, sem erros relevantes.',
    'Consegui cortar supremos com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},

  // ── COZEDURA HÚMIDA (CHU) ────────────────────────────────────
  { competenciaId: 'SUB-CHU-041-003', frases: [
    'Não consegui fazer fervura suave de forma correta, precisei de ajuda constante.',
    'Consegui fazer fervura suave, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui fazer fervura suave corretamente, sem erros relevantes.',
    'Consegui fazer fervura suave com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-CHU-041-006', frases: [
    'Não consegui cozer por absorção de forma correta, precisei de ajuda constante.',
    'Consegui cozer por absorção, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui cozer por absorção corretamente, sem erros relevantes.',
    'Consegui cozer por absorção com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-CHU-041-007', frases: [
    'Não consegui cozer massa al dente de forma correta, precisei de ajuda constante.',
    'Consegui cozer massa al dente, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui cozer massa al dente corretamente, sem erros relevantes.',
    'Consegui cozer massa al dente com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-CHU-042-001', frases: [
    'Não consegui escaldar de forma correta, precisei de ajuda constante.',
    'Consegui escaldar, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui escaldar corretamente, sem erros relevantes.',
    'Consegui escaldar com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-CHU-043-001', frases: [
    'Não consegui branquear de forma correta, precisei de ajuda constante.',
    'Consegui branquear, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui branquear corretamente, sem erros relevantes.',
    'Consegui branquear com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-CHU-044-001', frases: [
    'Não consegui escalfar de forma correta, precisei de ajuda constante.',
    'Consegui escalfar, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui escalfar corretamente, sem erros relevantes.',
    'Consegui escalfar com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-CHU-045-001', frases: [
    'Não consegui cozer a vapor de forma correta, precisei de ajuda constante.',
    'Consegui cozer a vapor, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui cozer a vapor corretamente, sem erros relevantes.',
    'Consegui cozer a vapor com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-CHU-046-001', frases: [
    'Não consegui cozer em banho-maria de forma correta, precisei de ajuda constante.',
    'Consegui cozer em banho-maria, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui cozer em banho-maria corretamente, sem erros relevantes.',
    'Consegui cozer em banho-maria com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},

  // ── CALOR SECO — ASSAR E GRELHAR (CSE) ──────────────────────
  { competenciaId: 'SUB-CSE-047-001', frases: [
    'Não consegui assar peça bovina de forma correta, precisei de ajuda constante.',
    'Consegui assar peça bovina, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui assar peça bovina corretamente, sem erros relevantes.',
    'Consegui assar peça bovina com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-CSE-047-003', frases: [
    'Não consegui assar ave inteira de forma correta, precisei de ajuda constante.',
    'Consegui assar ave inteira, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui assar ave inteira corretamente, sem erros relevantes.',
    'Consegui assar ave inteira com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-CSE-047-010', frases: [
    'Não consegui assar bolo amanteigado de forma correta, precisei de ajuda constante.',
    'Consegui assar bolo amanteigado, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui assar bolo amanteigado corretamente, sem erros relevantes.',
    'Consegui assar bolo amanteigado com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-CSE-047-012', frases: [
    'Não consegui assar massa quebrada de forma correta, precisei de ajuda constante.',
    'Consegui assar massa quebrada, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui assar massa quebrada corretamente, sem erros relevantes.',
    'Consegui assar massa quebrada com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-CSE-047-013', frases: [
    'Não consegui assar massa folhada de forma correta, precisei de ajuda constante.',
    'Consegui assar massa folhada, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui assar massa folhada corretamente, sem erros relevantes.',
    'Consegui assar massa folhada com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-CSE-047-014', frases: [
    'Não consegui assar massa choux de forma correta, precisei de ajuda constante.',
    'Consegui assar massa choux, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui assar massa choux corretamente, sem erros relevantes.',
    'Consegui assar massa choux com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-CSE-048-001', frases: [
    'Não consegui grelhar bife bovino de forma correta, precisei de ajuda constante.',
    'Consegui grelhar bife bovino, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui grelhar bife bovino corretamente, sem erros relevantes.',
    'Consegui grelhar bife bovino com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-CSE-048-008', frases: [
    'Não consegui grelhar peixe inteiro de forma correta, precisei de ajuda constante.',
    'Consegui grelhar peixe inteiro, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui grelhar peixe inteiro corretamente, sem erros relevantes.',
    'Consegui grelhar peixe inteiro com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-CSE-051-001', frases: [
    'Não consegui gratinar de forma correta, precisei de ajuda constante.',
    'Consegui gratinar, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui gratinar corretamente, sem erros relevantes.',
    'Consegui gratinar com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},

  // ── FRITURA (GCM) ────────────────────────────────────────────
  { competenciaId: 'SUB-GCM-055-001', frases: [
    'Não consegui fazer fritura profunda de forma correta, precisei de ajuda constante.',
    'Consegui fazer fritura profunda, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui fazer fritura profunda corretamente, sem erros relevantes.',
    'Consegui fazer fritura profunda com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-GCM-055-006', frases: [
    'Não consegui fritar peixe panado de forma correta, precisei de ajuda constante.',
    'Consegui fritar peixe panado, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui fritar peixe panado corretamente, sem erros relevantes.',
    'Consegui fritar peixe panado com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-GCM-055-009', frases: [
    'Não consegui fritar carne panada de forma correta, precisei de ajuda constante.',
    'Consegui fritar carne panada, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui fritar carne panada corretamente, sem erros relevantes.',
    'Consegui fritar carne panada com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},

  // ── MOLHOS E LIGAÇÕES (MOL) ──────────────────────────────────
  { competenciaId: 'SUB-MOL-067-001', frases: [
    'Não consegui preparar roux branco de forma correta, precisei de ajuda constante.',
    'Consegui preparar roux branco, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui preparar roux branco corretamente, sem erros relevantes.',
    'Consegui preparar roux branco com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-MOL-067-007', frases: [
    'Não consegui ligar com gema de forma correta, precisei de ajuda constante.',
    'Consegui ligar com gema, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui ligar com gema corretamente, sem erros relevantes.',
    'Consegui ligar com gema com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-MOL-067-014', frases: [
    'Não consegui gelatinizar o amido no creme pasteleiro de forma correta, precisei de ajuda constante.',
    'Consegui gelatinizar o amido no creme pasteleiro, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui gelatinizar o amido no creme pasteleiro corretamente, sem erros relevantes.',
    'Consegui gelatinizar o amido no creme pasteleiro com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-MOL-068-002', frases: [
    'Não consegui preparar maionese de forma correta, precisei de ajuda constante.',
    'Consegui preparar maionese, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui preparar maionese corretamente, sem erros relevantes.',
    'Consegui preparar maionese com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-MOL-068-004', frases: [
    'Não consegui preparar molho holandês de forma correta, precisei de ajuda constante.',
    'Consegui preparar molho holandês, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui preparar molho holandês corretamente, sem erros relevantes.',
    'Consegui preparar molho holandês com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-MOL-068-007', frases: [
    'Não consegui preparar ganache de forma correta, precisei de ajuda constante.',
    'Consegui preparar ganache, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui preparar ganache corretamente, sem erros relevantes.',
    'Consegui preparar ganache com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},

  // ── PASTELARIA — BATER E MONTAR (PAP-075) ───────────────────
  { competenciaId: 'SUB-PAP-075-002', frases: [
    'Não consegui bater gemas com açúcar de forma correta, precisei de ajuda constante.',
    'Consegui bater gemas com açúcar, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui bater gemas com açúcar corretamente, sem erros relevantes.',
    'Consegui bater gemas com açúcar com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-PAP-075-004', frases: [
    'Não consegui montar claras em espuma firme de forma correta, precisei de ajuda constante.',
    'Consegui montar claras em espuma firme, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui montar claras em espuma firme corretamente, sem erros relevantes.',
    'Consegui montar claras em espuma firme com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-PAP-075-006', frases: [
    'Não consegui montar natas firmes de forma correta, precisei de ajuda constante.',
    'Consegui montar natas firmes, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui montar natas firmes corretamente, sem erros relevantes.',
    'Consegui montar natas firmes com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-PAP-075-008', frases: [
    'Não consegui bater pão-de-ló quente de forma correta, precisei de ajuda constante.',
    'Consegui bater pão-de-ló quente, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui bater pão-de-ló quente corretamente, sem erros relevantes.',
    'Consegui bater pão-de-ló quente com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-PAP-075-009', frases: [
    'Não consegui bater pão-de-ló frio de forma correta, precisei de ajuda constante.',
    'Consegui bater pão-de-ló frio, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui bater pão-de-ló frio corretamente, sem erros relevantes.',
    'Consegui bater pão-de-ló frio com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},

  // ── PASTELARIA — MASSAS (PAP-078 a 081) ─────────────────────
  { competenciaId: 'SUB-PAP-078-001', frases: [
    'Não consegui fazer amassadura curta de massa quebrada de forma correta, precisei de ajuda constante.',
    'Consegui fazer amassadura curta de massa quebrada, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui fazer amassadura curta de massa quebrada corretamente, sem erros relevantes.',
    'Consegui fazer amassadura curta de massa quebrada com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-PAP-078-005', frases: [
    'Não consegui amassar massa de pão de forma correta, precisei de ajuda constante.',
    'Consegui amassar massa de pão, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui amassar massa de pão corretamente, sem erros relevantes.',
    'Consegui amassar massa de pão com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-PAP-078-008', frases: [
    'Não consegui amassar brioche de forma correta, precisei de ajuda constante.',
    'Consegui amassar brioche, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui amassar brioche corretamente, sem erros relevantes.',
    'Consegui amassar brioche com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-PAP-079-005', frases: [
    'Não consegui fazer a dobra simples de massa folhada de forma correta, precisei de ajuda constante.',
    'Consegui fazer a dobra simples de massa folhada, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui fazer a dobra simples de massa folhada corretamente, sem erros relevantes.',
    'Consegui fazer a dobra simples de massa folhada com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-PAP-080-001', frases: [
    'Não consegui abrir massa quebrada de forma correta, precisei de ajuda constante.',
    'Consegui abrir massa quebrada, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui abrir massa quebrada corretamente, sem erros relevantes.',
    'Consegui abrir massa quebrada com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-PAP-080-004', frases: [
    'Não consegui laminar massa folhada de forma correta, precisei de ajuda constante.',
    'Consegui laminar massa folhada, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui laminar massa folhada corretamente, sem erros relevantes.',
    'Consegui laminar massa folhada com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-PAP-081-001', frases: [
    'Não consegui preparar massa choux de forma correta, precisei de ajuda constante.',
    'Consegui preparar massa choux, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui preparar massa choux corretamente, sem erros relevantes.',
    'Consegui preparar massa choux com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},

  // ── PASTELARIA — CARAMELO E CHOCOLATE (PAP-086 a 087) ───────
  { competenciaId: 'SUB-PAP-086-001', frases: [
    'Não consegui fazer caramelo seco de forma correta, precisei de ajuda constante.',
    'Consegui fazer caramelo seco, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui fazer caramelo seco corretamente, sem erros relevantes.',
    'Consegui fazer caramelo seco com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-PAP-086-002', frases: [
    'Não consegui fazer caramelo húmido de forma correta, precisei de ajuda constante.',
    'Consegui fazer caramelo húmido, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui fazer caramelo húmido corretamente, sem erros relevantes.',
    'Consegui fazer caramelo húmido com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-PAP-086-008', frases: [
    'Não consegui fazer caramelização superficial com maçarico de forma correta, precisei de ajuda constante.',
    'Consegui fazer caramelização superficial com maçarico, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui fazer caramelização superficial com maçarico corretamente, sem erros relevantes.',
    'Consegui fazer caramelização superficial com maçarico com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-PAP-087-001', frases: [
    'Não consegui temperar chocolate por tablage de forma correta, precisei de ajuda constante.',
    'Consegui temperar chocolate por tablage, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui temperar chocolate por tablage corretamente, sem erros relevantes.',
    'Consegui temperar chocolate por tablage com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-PAP-087-002', frases: [
    'Não consegui temperar chocolate por semeadura de forma correta, precisei de ajuda constante.',
    'Consegui temperar chocolate por semeadura, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui temperar chocolate por semeadura corretamente, sem erros relevantes.',
    'Consegui temperar chocolate por semeadura com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},

  // ── PANIFICAÇÃO (PAP-082 a 083) ──────────────────────────────
  { competenciaId: 'SUB-PAP-082-001', frases: [
    'Não consegui fazer fermentação direta de forma correta, precisei de ajuda constante.',
    'Consegui fazer fermentação direta, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui fazer fermentação direta corretamente, sem erros relevantes.',
    'Consegui fazer fermentação direta com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-PAP-082-002', frases: [
    'Não consegui fazer fermentação com poolish de forma correta, precisei de ajuda constante.',
    'Consegui fazer fermentação com poolish, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui fazer fermentação com poolish corretamente, sem erros relevantes.',
    'Consegui fazer fermentação com poolish com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-PAP-083-001', frases: [
    'Não consegui modelar baguete de forma correta, precisei de ajuda constante.',
    'Consegui modelar baguete, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui modelar baguete corretamente, sem erros relevantes.',
    'Consegui modelar baguete com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},
  { competenciaId: 'SUB-PAP-083-003', frases: [
    'Não consegui modelar boule de forma correta, precisei de ajuda constante.',
    'Consegui modelar boule, mas com algumas dificuldades ou erros que precisaram de correção.',
    'Consegui modelar boule corretamente, sem erros relevantes.',
    'Consegui modelar boule com autonomia e rigor, e ainda ajudei colegas que tiveram dificuldades.',
  ]},

];

// ── Lookup rápido por ID ─────────────────────────────────────
const _FRASES_MAP = new Map<string, FrasesCompetencia['frases']>(
  FRASES_SUBTECNICAS.map(f => [f.competenciaId, f.frases])
);

export function getFrasesParaCompetencia(
  id: string,
  nomeFallback: string
): FrasesCompetencia['frases'] {
  return _FRASES_MAP.get(id) ?? frasesGenericas(nomeFallback);
}

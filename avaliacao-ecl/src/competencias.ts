// ============================================================
// Base de Competências — mapeada ao Referencial 811RA144
// (Técnico/a de Cozinha e Restauração - Nível 4, BTE 40/2025)
//
// UCs cobertas:
//  Obrigatórias: UC03576, UC03577, UC01999, UC02002-UC02005,
//                 UC03578, UC00596, UC03579, UC03580, UC03584
//  Opcionais:     UC03585, UC03586, UC03588, UC03589, UC03590,
//                 UC03591, UC03592, UC03593, UC03595, UC03596, UC03597
//  Transversal:   UC00077 (Storytelling)
// ============================================================

import { Competencia, TipoServico } from './types';

// ------------------------------------------------------------------
// TÉCNICAS — Realizações / Aptidões específicas das UCs
// ------------------------------------------------------------------
export const TECNICAS: Competencia[] = [
  // --- Fundamentos / organização (UC03576, UC01999) ---
  { id: 'T01', categoria: 'TECNICAS', nome: 'Elaborar e interpretar fichas técnicas', uc: ['UC03576','UC02002','UC02003','UC02004','UC02005'], palavrasChave: ['ficha técnica','receita'] },
  { id: 'T02', categoria: 'TECNICAS', nome: 'Preparar a mise en place', uc: ['UC03576','UC01999','UC02002','UC02003','UC02004','UC02005'], palavrasChave: ['mise en place','preparação'] },
  { id: 'T03', categoria: 'TECNICAS', nome: 'Aplicar técnicas de corte de legumes e vegetais', uc: ['UC01999','UC03585'], palavrasChave: ['legumes','vegetais','corte','juliana','brunoise','descascar','picar','cortar','batata','batatas','cenoura','cebola'] },
  { id: 'T04', categoria: 'TECNICAS', nome: 'Limpar e preparar carnes de açougue, criação e caça', uc: ['UC01999','UC02004'], palavrasChave: ['carne','vaca','porco','frango','caça'] },
  { id: 'T05', categoria: 'TECNICAS', nome: 'Limpar e preparar peixes, moluscos e crustáceos (filetagem)', uc: ['UC01999','UC02003'], palavrasChave: ['peixe','marisco','filetagem','crustáceo','molusco'] },
  { id: 'T06', categoria: 'TECNICAS', nome: 'Aplicar técnicas dos principais métodos de confeção (grelhar, estufar, fritar, etc.)', uc: ['UC01999','UC02003','UC02004'], palavrasChave: ['grelhado','estufado','assado','fritura','vapor','grelhar','estufar','fritar','assar','cozer','refogar','saltear','marinar','escalfar','brasear','gratinar','vapor'] },

  // --- Acepipes, sopas, ovos e massas (UC02002) ---
  { id: 'T07', categoria: 'TECNICAS', nome: 'Confecionar sopas, cremes, aveludados e consommés', uc: ['UC02002'], palavrasChave: ['sopa','creme','caldo','consommé','aveludado'] },
  { id: 'T08', categoria: 'TECNICAS', nome: 'Confecionar entradas e acepipes', uc: ['UC02002'], palavrasChave: ['entrada','acepipe'] },
  { id: 'T09', categoria: 'TECNICAS', nome: 'Confecionar pratos de ovos e massas', uc: ['UC02002'], palavrasChave: ['ovo','omelete','massa','pasta','esparguete'] },

  // --- Peixes e mariscos (UC02003) ---
  { id: 'T10', categoria: 'TECNICAS', nome: 'Confecionar peixes e mariscos com acompanhamentos/guarnições', uc: ['UC02003'], palavrasChave: ['peixe','marisco','bacalhau','salmão','garoupa','grelhar','assar','cozer','fritar','escalfar','marinar'] },

  // --- Carnes, aves, caça (UC02004) ---
  { id: 'T11', categoria: 'TECNICAS', nome: 'Confecionar carnes, aves e caça com acompanhamentos/guarnições', uc: ['UC02004'], palavrasChave: ['frango','pato','vitela','porco','vaca','aves','caça','grelhar','assar','estufar','fritar','marinar','brasear','grelhado','assado'] },

  // --- Pastelaria base (UC02005) ---
  { id: 'T12', categoria: 'TECNICAS', nome: 'Confecionar massas base de pastelaria', uc: ['UC02005'], palavrasChave: ['massa folhada','massa quebrada','massa areada','pastelaria','laminar','estender','cozer'] },
  { id: 'T13', categoria: 'TECNICAS', nome: 'Confecionar recheios, cremes base e molhos base de pastelaria', uc: ['UC02005'], palavrasChave: ['creme pasteleiro','recheio','molho de pastelaria','puré','bater','ferver','engrossar'] },

  // --- Empratamento e conservação (transversal a várias UCs) ---
  { id: 'T14', categoria: 'TECNICAS', nome: 'Aplicar técnicas de empratamento e decoração', uc: ['UC02002','UC02003','UC02004','UC02005','UC03586','UC03588'], palavrasChave: ['empratamento','decoração','apresentação'] },
  { id: 'T15', categoria: 'TECNICAS', nome: 'Aplicar técnicas de acondicionamento, etiquetagem e conservação', uc: ['UC03584','UC03585','UC02002','UC02003','UC02004','UC02005'], palavrasChave: ['conservação','etiquetagem','acondicionamento','vácuo'] },
  { id: 'T16', categoria: 'TECNICAS', nome: 'Aplicar normas de conservação e armazenamento de géneros alimentícios', uc: ['UC03585','UC03579'], palavrasChave: ['armazenamento','stock','conservação'] },

  // --- Custos / aprovisionamento (UC03579) ---
  { id: 'T17', categoria: 'TECNICAS', nome: 'Efetuar pesagens, determinar proporções e calcular preços/custos', uc: ['UC03579','UC02002','UC02003','UC02004','UC02005'], palavrasChave: ['custo','preço','food cost','pesagem'] },
  { id: 'T18', categoria: 'TECNICAS', nome: 'Realizar inventários e gerir requisições', uc: ['UC03579'], palavrasChave: ['inventário','requisição','economato'] },

  // --- Higiene/HACCP (UC03584) ---
  { id: 'T19', categoria: 'TECNICAS', nome: 'Aplicar princípios HACCP e procedimentos de controlo de segurança alimentar', uc: ['UC03584'], palavrasChave: ['haccp','segurança alimentar','pontos críticos'] },
  { id: 'T20', categoria: 'TECNICAS', nome: 'Aplicar técnicas de limpeza, higienização e desinfeção', uc: ['UC03584'], palavrasChave: ['limpeza','higienização','desinfeção'] },

  // --- Nutrição (UC00596) ---
  { id: 'T21', categoria: 'TECNICAS', nome: 'Aplicar princípios de nutrição e dietética na confeção', uc: ['UC00596'], palavrasChave: ['nutrição','dietética','saudável','roda dos alimentos'] },

  // --- Inglês (UC03578) ---
  { id: 'T22', categoria: 'TECNICAS', nome: 'Interpretar/redigir fichas técnicas e comunicar em inglês no serviço de cozinha', uc: ['UC03578'], palavrasChave: ['inglês','english'] },

  // --- Atendimento (UC03580) ---
  { id: 'T23', categoria: 'TECNICAS', nome: 'Aplicar técnicas de atendimento ao cliente e gestão de reclamações', uc: ['UC03580'], palavrasChave: ['atendimento','reclamação','cliente'] },

  // --- Opcionais: Cozinha tradicional portuguesa (UC03586) ---
  { id: 'T24', categoria: 'TECNICAS', nome: 'Confecionar iguarias da cozinha e doçaria tradicional portuguesa', uc: ['UC03586'], palavrasChave: ['tradicional','português','doçaria','regional'] },

  // --- Gastronomia do mundo (UC03588) ---
  { id: 'T25', categoria: 'TECNICAS', nome: 'Confecionar iguarias da gastronomia internacional', uc: ['UC03588'], palavrasChave: ['internacional','mundo','italiana','francesa','asiática','mexicana'] },

  // --- Novas tendências (UC03589) ---
  { id: 'T26', categoria: 'TECNICAS', nome: 'Aplicar novas tendências e técnicas inovadoras na cozinha', uc: ['UC03589'], palavrasChave: ['tendência','inovador','novo'] },

  // --- Sustentabilidade (UC03590) ---
  { id: 'T27', categoria: 'TECNICAS', nome: 'Confecionar produtos sustentáveis com recursos endógenos/locais', uc: ['UC03590'], palavrasChave: ['sustentável','local','sazonal','endógeno','desperdício zero'] },

  // --- Serviços especiais / arte cisória (UC03591) ---
  { id: 'T28', categoria: 'TECNICAS', nome: 'Planear e executar serviço especial (incl. arte cisória)', uc: ['UC03591'], palavrasChave: ['banquete','evento','buffet','arte cisória','corte à vista'] },

  // --- Pastelaria internacional (UC03592) ---
  { id: 'T29', categoria: 'TECNICAS', nome: 'Confecionar pastelaria e doçaria internacional', uc: ['UC03592'], palavrasChave: ['pastelaria internacional','doçaria do mundo'] },

  // --- Panificação básica (UC03593) ---
  { id: 'T30', categoria: 'TECNICAS', nome: 'Confecionar pão de trigo, massas lêvedas e especialidades regionais', uc: ['UC03593'], palavrasChave: ['pão','padaria','massa lêveda','levedura','fermentação'] },

  // --- Cozinha alternativa (UC03595) ---
  { id: 'T31', categoria: 'TECNICAS', nome: 'Confecionar pratos de cozinha alternativa (vegetariana, vegan, sem gluten, etc.)', uc: ['UC03595'], palavrasChave: ['vegetariano','vegan','sem gluten','alternativa','plant-based'] },

  // --- Cozinha criativa (UC03596) ---
  { id: 'T32', categoria: 'TECNICAS', nome: 'Aplicar técnicas de cozinha criativa (vácuo, baixas temperaturas, fusão)', uc: ['UC03596'], palavrasChave: ['cozinha molecular','vácuo','baixa temperatura','fusão','autor','criativa'] },

  // --- Panificação especial (UC03597) ---
  { id: 'T33', categoria: 'TECNICAS', nome: 'Confecionar massas especiais de panificação (sem glúten, integrais, etc.)', uc: ['UC03597'], palavrasChave: ['pão especial','sem glúten','integral','massa especial'] },
];

// ------------------------------------------------------------------
// ATITUDES — conjunto transversal presente em quase todas as UCs
// ------------------------------------------------------------------
export const ATITUDES: Competencia[] = [
  { id: 'A01', categoria: 'ATITUDES', nome: 'Responsabilidade pelas suas ações', uc: ['UC02002','UC02003','UC02004','UC02005','UC03584'] },
  { id: 'A02', categoria: 'ATITUDES', nome: 'Autonomia no âmbito das suas funções', uc: ['UC02002','UC02003','UC02004','UC02005','UC03584'] },
  { id: 'A03', categoria: 'ATITUDES', nome: 'Cuidado com a apresentação pessoal', uc: ['UC02002','UC02003','UC02004','UC02005','UC03584'] },
  { id: 'A04', categoria: 'ATITUDES', nome: 'Iniciativa', uc: ['UC02002','UC02003','UC02004','UC02005'] },
  { id: 'A05', categoria: 'ATITUDES', nome: 'Autocontrolo', uc: ['UC02002','UC02003','UC02004','UC02005'] },
  { id: 'A06', categoria: 'ATITUDES', nome: 'Assertividade', uc: ['UC02002','UC02003','UC02004','UC02005'] },
  { id: 'A07', categoria: 'ATITUDES', nome: 'Empatia', uc: ['UC02002','UC02003','UC02004','UC02005','UC00077'] },
  { id: 'A08', categoria: 'ATITUDES', nome: 'Escuta ativa', uc: ['UC02002','UC02003','UC02004','UC02005','UC00077'] },
  { id: 'A09', categoria: 'ATITUDES', nome: 'Cooperação com a equipa', uc: ['UC02002','UC02003','UC02004','UC02005'] },
  { id: 'A10', categoria: 'ATITUDES', nome: 'Empenho e persistência na resolução de problemas', uc: ['UC02002','UC02003','UC02004','UC02005'] },
  { id: 'A11', categoria: 'ATITUDES', nome: 'Sentido de organização', uc: ['UC02002','UC02003','UC02004','UC02005'] },
  { id: 'A12', categoria: 'ATITUDES', nome: 'Flexibilidade e adaptabilidade', uc: ['UC02002','UC02003','UC02004','UC02005','UC03595'] },
  { id: 'A13', categoria: 'ATITUDES', nome: 'Respeito pelos princípios da sustentabilidade', uc: ['UC02002','UC02003','UC02004','UC03590'] },
  { id: 'A14', categoria: 'ATITUDES', nome: 'Sentido criativo', uc: ['UC03589','UC03596','UC00077'] },
  { id: 'A15', categoria: 'ATITUDES', nome: 'Disponibilidade para aprender', uc: ['UC03590','UC03592','UC03595'] },
  { id: 'A16', categoria: 'ATITUDES', nome: 'Resiliência / Determinação', uc: ['UC03590','UC03595','UC03596','UC03597'] },
  { id: 'A17', categoria: 'ATITUDES', nome: 'Proatividade', uc: ['UC03597'] },
  { id: 'A18', categoria: 'ATITUDES', nome: 'Autenticidade e autoconfiança na comunicação', uc: ['UC00077'] },
];

// ------------------------------------------------------------------
// RESPONSABILIDADES — Respeito por normas/regras (HACCP, segurança, etc.)
// ------------------------------------------------------------------
export const RESPONSABILIDADES: Competencia[] = [
  { id: 'R01', categoria: 'RESPONSABILIDADES', nome: 'Respeito pelas normas de higiene e segurança alimentar', uc: ['UC02002','UC02003','UC02004','UC02005','UC03584'] },
  { id: 'R02', categoria: 'RESPONSABILIDADES', nome: 'Respeito pelas normas de segurança e saúde no trabalho', uc: ['UC02002','UC02003','UC02004','UC02005','UC03584'] },
  { id: 'R03', categoria: 'RESPONSABILIDADES', nome: 'Respeito pelas regras e normas definidas (procedimentos internos)', uc: ['UC02002','UC02003','UC02004','UC02005'] },
  { id: 'R04', categoria: 'RESPONSABILIDADES', nome: 'Cumprir as orientações técnicas e o plano de trabalho', uc: ['UC02002','UC02003','UC02004','UC02005','UC03591'] },
  { id: 'R05', categoria: 'RESPONSABILIDADES', nome: 'Garantir a preservação das propriedades dos alimentos e conservação dos produtos', uc: ['UC02002','UC02003','UC02004','UC02005','UC03585'] },
  { id: 'R06', categoria: 'RESPONSABILIDADES', nome: 'Aplicar medidas de redução do desperdício alimentar', uc: ['UC03584','UC03585','UC03590'] },
  { id: 'R07', categoria: 'RESPONSABILIDADES', nome: 'Cumprir os princípios e normas do sistema HACCP', uc: ['UC03584'] },
  { id: 'R08', categoria: 'RESPONSABILIDADES', nome: 'Cumprir procedimentos de gestão de stocks e rotação (FIFO)', uc: ['UC03579','UC03591'] },
  { id: 'R09', categoria: 'RESPONSABILIDADES', nome: 'Considerar a divisão de trabalho pelas brigadas', uc: ['UC02002','UC02003','UC02004','UC02005','UC03591'] },
  { id: 'R10', categoria: 'RESPONSABILIDADES', nome: 'Respeitar a sensibilidade e bem-estar dos colegas e clientes', uc: ['UC03580','UC03584'] },
  { id: 'R11', categoria: 'RESPONSABILIDADES', nome: 'Cumprir prazos e horários estabelecidos no plano de produção', uc: ['UC03576','UC03591','UC03595'] },
  { id: 'R12', categoria: 'RESPONSABILIDADES', nome: 'Utilizar corretamente equipamento de proteção individual (EPI)', uc: ['UC03584'] },
];

import { SUBTECNICAS } from './subtecnicas';

export const TODAS_COMPETENCIAS: Competencia[] = [...TECNICAS, ...ATITUDES, ...RESPONSABILIDADES, ...SUBTECNICAS];

export function getCompetencia(id: string): Competencia | undefined {
  return TODAS_COMPETENCIAS.find(c => c.id === id);
}

// ------------------------------------------------------------------
// Sugestão automática de técnicas a partir do texto da receita
// ------------------------------------------------------------------
export function sugerirTecnicas(textoReceita: string): string[] {
  const texto = textoReceita.toLowerCase();
  // Sugerir tanto técnicas-mãe como subtécnicas específicas
  const todas = [...TECNICAS, ...SUBTECNICAS];
  const sugeridas = todas.filter(t =>
    (t.palavrasChave || []).some(p => texto.includes(p.toLowerCase()))
  );
  return sugeridas.map(t => t.id);
}

// ------------------------------------------------------------------
// Sugestão de Atitudes e Responsabilidades a partir do contexto da
// comanda (modo de trabalho + atendimento a clientes).
// ------------------------------------------------------------------
export function sugerirAtitudes(modo: 'individual' | 'grupo', atendimentoCliente: boolean, tipoServico: TipoServico = 'normal'): string[] {
  const ids = new Set<string>();

  if (modo === 'grupo') {
    // Cooperação, escuta, empatia, assertividade — essenciais em trabalho de equipa
    ids.add('A09'); // Cooperação com a equipa
    ids.add('A08'); // Escuta ativa
    ids.add('A07'); // Empatia
    ids.add('A06'); // Assertividade
  } else {
    // Individual: autonomia, iniciativa, organização
    ids.add('A02'); // Autonomia
    ids.add('A04'); // Iniciativa
    ids.add('A11'); // Sentido de organização
  }

  // Comum a ambos
  ids.add('A05'); // Autocontrolo
  ids.add('A10'); // Empenho e persistência
  ids.add('A12'); // Flexibilidade e adaptabilidade

  if (atendimentoCliente) {
    ids.add('A18'); // Autenticidade e autoconfiança na comunicação
    ids.add('A07'); // Empatia (com o cliente)
  }

  // Serviços especiais — pressão de tempo, adaptação, criatividade
  if (tipoServico === 'a_la_minute' || tipoServico === 'servico_carta') {
    ids.add('A05'); // Autocontrolo (pressão do imediato)
    ids.add('A12'); // Flexibilidade e adaptabilidade
  }
  if (tipoServico === 'buffet' || tipoServico === 'catering' || tipoServico === 'jantar') {
    ids.add('A11'); // Sentido de organização (grande volume)
    ids.add('A09'); // Cooperação com a equipa
  }
  if (tipoServico === 'brunch' || tipoServico === 'coffee_break' || tipoServico === 'pequeno_almoco') {
    ids.add('A14'); // Sentido criativo (apresentação variada)
  }

  return Array.from(ids);
}

export function sugerirResponsabilidades(modo: 'individual' | 'grupo', atendimentoCliente: boolean, tipoServico: TipoServico = 'normal'): string[] {
  const ids = new Set<string>();

  // Base sempre presente — higiene, segurança, HACCP, EPI
  ids.add('R01'); // Higiene e segurança alimentar
  ids.add('R02'); // Segurança e saúde no trabalho
  ids.add('R07'); // HACCP

  if (modo === 'grupo') {
    ids.add('R09'); // Divisão de trabalho pela brigada
  } else {
    ids.add('R04'); // Cumprir orientações e plano de trabalho
    ids.add('R11'); // Prazos e horários
  }

  if (atendimentoCliente) {
    ids.add('R10'); // Sensibilidade e bem-estar dos outros (clientes)
  }

  // Serviços especiais — prazos e gestão de stock mais críticos
  if (tipoServico !== 'normal') {
    ids.add('R11'); // Prazos e horários
    ids.add('R08'); // Gestão de stocks e FIFO
  }

  return Array.from(ids);
}

// ------------------------------------------------------------------
// Sugestão de Técnicas ligadas ao tipo de serviço (ex: UC03591 para
// buffet/catering/jantar = T28; complementa sugerirTecnicas() por
// palavras-chave da receita).
// ------------------------------------------------------------------
export function sugerirTecnicasPorServico(tipoServico: TipoServico): string[] {
  const ids = new Set<string>();

  if (['buffet', 'catering', 'jantar', 'coffee_break', 'brunch', 'pequeno_almoco'].includes(tipoServico)) {
    ids.add('T28'); // Serviço especial / arte cisória (UC03591)
  }
  if (tipoServico === 'servico_carta' || tipoServico === 'a_la_minute') {
    ids.add('T23'); // Atendimento ao cliente (UC03580)
  }
  if (tipoServico === 'brunch' || tipoServico === 'pequeno_almoco' || tipoServico === 'coffee_break') {
    ids.add('T29'); // Pastelaria internacional (UC03592) — comum nestes serviços
  }

  return Array.from(ids);
}

// ------------------------------------------------------------------
// Competências por UC/UFCD — funciona nas três turmas
// ------------------------------------------------------------------
import { ucsEquivalentes } from './cronograma';

export function competenciasParaModulo(codigoModulo: string): Competencia[] {
  const ucs = ucsEquivalentes(codigoModulo);
  if (ucs.length === 0) return [];
  return TODAS_COMPETENCIAS.filter(c => (c.uc || []).some((u: string) => ucs.includes(u)));
}

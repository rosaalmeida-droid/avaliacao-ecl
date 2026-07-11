// ============================================================
// Cronograma 2026-2027 — Avaliação ECL
//
// Três turmas em simultâneo, dois referenciais:
//   1º CP → referencial NOVO 811RA144 (trabalha com UCs)
//   2º CP → referencial ANTIGO 811183 (trabalha com UFCDs) — plano TCP 2025-2028
//   3º CP → referencial ANTIGO 811183 (trabalha com UFCDs) — plano TCP 2024-2027
//
// Inclui apenas as componentes usadas na app (planos de aula /
// avaliação de competências). Ficam FORA da app, por decisão da
// coordenação: IPP, FCT, Comunicar em Inglês/Francês (UC03578,
// UFCD 25, UFCD 54) e as disciplinas sociocultural/científica.
//
// Fontes: 12-Cronogramas_CR-CP_2026-2029 (1º),
//         08-Cronogramas_TCP_2025-2028 (2º),
//         07-Cronogramas_TCP_2024-2027 (3º).
// ============================================================

export const ANO_LETIVO = '2026-2027';

export type TipoModulo = 'UC' | 'UFCD';

export interface ModuloCronograma {
  /** Código usado nos planos de aula (ex: 'UC03576' ou 'UFCD 12') */
  id: string;
  tipo: TipoModulo;
  /** Número do módulo tal como aparece no cronograma da escola */
  numeroModulo: string;
  nome: string;
  disciplina: string;
  turmaAno: 1 | 2 | 3;
  horasPrevistas: number;
  horasEfetivas?: number;
  /** ISO yyyy-mm-dd */
  dataInicio: string;
  dataFim: string;
  docente?: string;
}

// ------------------------------------------------------------------
// 1º CP — Referencial 811RA144 (UCs) — Ano letivo 2026-2027
// ------------------------------------------------------------------
const MODULOS_1CP: ModuloCronograma[] = [
  // — Tecnologia Alimentar (50h) —
  { id: 'UC03584', tipo: 'UC', numeroModulo: '20', nome: 'Implementar regras de higiene e segurança alimentar em hotelaria e restauração', disciplina: 'Tecnologia Alimentar', turmaAno: 1, horasPrevistas: 25, horasEfetivas: 26, dataInicio: '2026-09-17', dataFim: '2026-12-15', docente: 'Raquel Ratado' },
  { id: 'UC00039', tipo: 'UC', numeroModulo: '14', nome: 'Implementar as normas de segurança e saúde no trabalho em hotelaria e restauração', disciplina: 'Tecnologia Alimentar', turmaAno: 1, horasPrevistas: 25, horasEfetivas: 24, dataInicio: '2027-01-04', dataFim: '2027-06-01', docente: 'Raquel Ratado' },

  // — Serviços de Cozinha-Pastelaria (175h) —
  { id: 'UC03576', tipo: 'UC', numeroModulo: '01', nome: 'Planear e organizar a produção de cozinha', disciplina: 'Serviços de Cozinha-Pastelaria', turmaAno: 1, horasPrevistas: 25, horasEfetivas: 24, dataInicio: '2026-09-17', dataFim: '2026-10-16', docente: 'Rosa Almeida' },
  { id: 'UC01999', tipo: 'UC', numeroModulo: '02', nome: 'Preparar e executar confeções de cozinha', disciplina: 'Serviços de Cozinha-Pastelaria', turmaAno: 1, horasPrevistas: 25, horasEfetivas: 51, dataInicio: '2026-10-19', dataFim: '2026-11-20', docente: 'Rosa Almeida' },
  { id: 'UC02002', tipo: 'UC', numeroModulo: '04', nome: 'Preparar e confecionar acepipes, sopas, entradas, ovos e massas', disciplina: 'Serviços de Cozinha-Pastelaria', turmaAno: 1, horasPrevistas: 50, horasEfetivas: 51, dataInicio: '2026-11-23', dataFim: '2027-02-05', docente: 'Rosa Almeida' },
  { id: 'UC02005', tipo: 'UC', numeroModulo: '07', nome: 'Preparar e confecionar massas base, recheios, cremes e molhos de pastelaria', disciplina: 'Serviços de Cozinha-Pastelaria', turmaAno: 1, horasPrevistas: 50, horasEfetivas: 25, dataInicio: '2027-02-08', dataFim: '2027-04-30', docente: 'Rosa Almeida' },
  { id: 'UC03577', tipo: 'UC', numeroModulo: '03', nome: 'Preparar e confecionar molhos e fundos de cozinha', disciplina: 'Serviços de Cozinha-Pastelaria', turmaAno: 1, horasPrevistas: 25, horasEfetivas: 49, dataInicio: '2027-05-03', dataFim: '2027-06-01', docente: 'Rosa Almeida' },

  // — Serviços de Restaurante e Bar (75h) —
  { id: 'UC03580', tipo: 'UC', numeroModulo: '11', nome: 'Atender o cliente e gerir reclamações na restauração', disciplina: 'Serviços de Restaurante e Bar', turmaAno: 1, horasPrevistas: 50, horasEfetivas: 49, dataInicio: '2026-09-17', dataFim: '2027-03-19' },
  { id: 'UC03581', tipo: 'UC', numeroModulo: '12', nome: 'Planear e executar o serviço casual de restaurante/bar', disciplina: 'Serviços de Restaurante e Bar', turmaAno: 1, horasPrevistas: 25, horasEfetivas: 26, dataInicio: '2027-03-30', dataFim: '2027-06-01' },

  // — Gestão e Controlo (50h) —
  { id: 'UC03579', tipo: 'UC', numeroModulo: '10', nome: 'Gerir aprovisionamentos e controlar custos', disciplina: 'Gestão e Controlo', turmaAno: 1, horasPrevistas: 25, horasEfetivas: 26, dataInicio: '2026-09-17', dataFim: '2026-12-15', docente: 'Raquel Ratado' },
  // ⚠️ CONFIRMAR: no cronograma o módulo 17 aparece sem código de UC.
  // Por eliminação no referencial 811RA144 (Gestão e Controlo = UC03579,
  // UC00054, UC00034 [2º ano], UC00032 [3º ano]) só pode ser a UC00054.
  { id: 'UC00054', tipo: 'UC', numeroModulo: '17', nome: 'Atuar em situações de emergência em hotelaria e restauração', disciplina: 'Gestão e Controlo', turmaAno: 1, horasPrevistas: 25, horasEfetivas: 24, dataInicio: '2027-01-04', dataFim: '2027-06-01' },
];

// ------------------------------------------------------------------
// 2º CP — Referencial 811183 (UFCDs) — Ano letivo 2026-2027
// (plano TCP 2025-2028, 2º ano)
// ------------------------------------------------------------------
const MODULOS_2CP: ModuloCronograma[] = [
  // — Serviços de Cozinha-Pastelaria (250h) —
  { id: 'UFCD 12', tipo: 'UFCD', numeroModulo: '12', nome: 'Planeamento e confeção de entradas sólidas e acepipes', disciplina: 'Serviços de Cozinha-Pastelaria', turmaAno: 2, horasPrevistas: 50, horasEfetivas: 49, dataInicio: '2026-09-17', dataFim: '2026-10-29' },
  { id: 'UFCD 14', tipo: 'UFCD', numeroModulo: '14', nome: 'Planeamento e confeção de carnes, aves e caça', disciplina: 'Serviços de Cozinha-Pastelaria', turmaAno: 2, horasPrevistas: 50, horasEfetivas: 51, dataInicio: '2026-10-30', dataFim: '2026-12-15' },
  { id: 'UFCD 15', tipo: 'UFCD', numeroModulo: '15', nome: 'Planeamento e confeção de peixes e mariscos', disciplina: 'Serviços de Cozinha-Pastelaria', turmaAno: 2, horasPrevistas: 50, horasEfetivas: 49, dataInicio: '2027-01-04', dataFim: '2027-02-05' },
  { id: 'UFCD 20', tipo: 'UFCD', numeroModulo: '20', nome: 'Planeamento e confeção de massas base, recheios, cremes e molhos de pastelaria', disciplina: 'Serviços de Cozinha-Pastelaria', turmaAno: 2, horasPrevistas: 50, horasEfetivas: 51, dataInicio: '2027-02-08', dataFim: '2027-03-19' },
  { id: 'UFCD 21.1', tipo: 'UFCD', numeroModulo: '21.1', nome: 'Pastelaria de sobremesa: sobremesas quentes e frias', disciplina: 'Serviços de Cozinha-Pastelaria', turmaAno: 2, horasPrevistas: 25, horasEfetivas: 24, dataInicio: '2027-03-30', dataFim: '2027-04-16' },
  { id: 'UFCD 21.2', tipo: 'UFCD', numeroModulo: '21.2', nome: 'Pastelaria de sobremesa: gelados e sorvetes', disciplina: 'Serviços de Cozinha-Pastelaria', turmaAno: 2, horasPrevistas: 25, horasEfetivas: 26, dataInicio: '2027-04-19', dataFim: '2027-06-01' },

  // — Gestão e Controlo (100h) —
  { id: 'UFCD 01', tipo: 'UFCD', numeroModulo: '01', nome: 'O setor do turismo em Portugal', disciplina: 'Gestão e Controlo', turmaAno: 2, horasPrevistas: 25, horasEfetivas: 26, dataInicio: '2026-09-17', dataFim: '2026-11-12' },
  { id: 'UFCD 07', tipo: 'UFCD', numeroModulo: '07', nome: 'Técnicas de comunicação e interação interpessoal em turismo', disciplina: 'Gestão e Controlo', turmaAno: 2, horasPrevistas: 25, horasEfetivas: 24, dataInicio: '2026-11-13', dataFim: '2027-01-22' },
  { id: 'UFCD 57', tipo: 'UFCD', numeroModulo: '57', nome: 'Ideias e oportunidades de negócio', disciplina: 'Gestão e Controlo', turmaAno: 2, horasPrevistas: 50, horasEfetivas: 50, dataInicio: '2027-01-25', dataFim: '2027-06-01' },
];

// ------------------------------------------------------------------
// 3º CP — Referencial 811183 (UFCDs) — Ano letivo 2026-2027
// (plano TCP 2024-2027, 3º ano)
// ------------------------------------------------------------------
const MODULOS_3CP: ModuloCronograma[] = [
  // — Serviços de Cozinha/Pastelaria (300h) —
  { id: 'UFCD 16', tipo: 'UFCD', numeroModulo: '16', nome: 'Planeamento e confeção de cozinha tradicional portuguesa', disciplina: 'Serviços de Cozinha/Pastelaria', turmaAno: 3, horasPrevistas: 50, horasEfetivas: 49, dataInicio: '2026-09-17', dataFim: '2026-10-30' },
  { id: 'UFCD 22.1', tipo: 'UFCD', numeroModulo: '22.1', nome: 'Pastelaria e doçaria tradicional portuguesa: pastelaria tradicional portuguesa', disciplina: 'Serviços de Cozinha/Pastelaria', turmaAno: 3, horasPrevistas: 25, horasEfetivas: 26, dataInicio: '2026-11-02', dataFim: '2026-11-20' },
  { id: 'UFCD 22.2', tipo: 'UFCD', numeroModulo: '22.2', nome: 'Pastelaria e doçaria tradicional portuguesa: doçaria conventual portuguesa', disciplina: 'Serviços de Cozinha/Pastelaria', turmaAno: 3, horasPrevistas: 25, horasEfetivas: 24, dataInicio: '2026-11-23', dataFim: '2026-12-15' },
  { id: 'UFCD 17', tipo: 'UFCD', numeroModulo: '17', nome: 'Planeamento e confeção de cozinha internacional', disciplina: 'Serviços de Cozinha/Pastelaria', turmaAno: 3, horasPrevistas: 50, horasEfetivas: 51, dataInicio: '2027-01-04', dataFim: '2027-02-12' },
  { id: 'UFCD 23', tipo: 'UFCD', numeroModulo: '23', nome: 'Planeamento e confeção de pastelaria internacional', disciplina: 'Serviços de Cozinha/Pastelaria', turmaAno: 3, horasPrevistas: 50, horasEfetivas: 49, dataInicio: '2027-02-15', dataFim: '2027-03-19' },
  { id: 'UFCD 18', tipo: 'UFCD', numeroModulo: '18', nome: 'Planeamento e confeção de iguarias das novas tendências de cozinha', disciplina: 'Serviços de Cozinha/Pastelaria', turmaAno: 3, horasPrevistas: 50, horasEfetivas: 51, dataInicio: '2027-03-30', dataFim: '2027-04-30' },
  { id: 'UFCD 19', tipo: 'UFCD', numeroModulo: '19', nome: 'Planeamento e execução de serviços especiais de cozinha', disciplina: 'Serviços de Cozinha/Pastelaria', turmaAno: 3, horasPrevistas: 50, horasEfetivas: 50, dataInicio: '2027-05-03', dataFim: '2027-06-01' },

  // — Gestão e Controlo (150h) —
  { id: 'UFCD 53.1', tipo: 'UFCD', numeroModulo: '53.1', nome: 'Atuação em situações de emergência relacionadas com doença súbita ou acidente', disciplina: 'Gestão e Controlo', turmaAno: 3, horasPrevistas: 25, horasEfetivas: 25, dataInicio: '2026-09-17', dataFim: '2026-10-23' },
  { id: 'UFCD 04', tipo: 'UFCD', numeroModulo: '04', nome: 'Qualidade em restauração', disciplina: 'Gestão e Controlo', turmaAno: 3, horasPrevistas: 25, horasEfetivas: 26, dataInicio: '2026-10-26', dataFim: '2026-11-27' },
  { id: 'UFCD 08', tipo: 'UFCD', numeroModulo: '08', nome: 'Colaboração e trabalho em equipa em turismo', disciplina: 'Gestão e Controlo', turmaAno: 3, horasPrevistas: 25, horasEfetivas: 24, dataInicio: '2026-11-30', dataFim: '2027-01-15' },
  { id: 'UFCD 09', tipo: 'UFCD', numeroModulo: '09', nome: 'Turismo inclusivo: conceitos e princípios', disciplina: 'Gestão e Controlo', turmaAno: 3, horasPrevistas: 25, horasEfetivas: 25, dataInicio: '2027-01-18', dataFim: '2027-02-19' },
  { id: 'UFCD 24', tipo: 'UFCD', numeroModulo: '24', nome: 'Coordenação de equipas de trabalho em restauração', disciplina: 'Gestão e Controlo', turmaAno: 3, horasPrevistas: 25, horasEfetivas: 25, dataInicio: '2027-02-22', dataFim: '2027-03-19' },
  { id: 'UFCD 52', tipo: 'UFCD', numeroModulo: '52', nome: 'Atendimento ao cliente e gestão de reclamações na restauração', disciplina: 'Gestão e Controlo', turmaAno: 3, horasPrevistas: 25, horasEfetivas: 25, dataInicio: '2027-03-30', dataFim: '2027-06-01' },
];

export const CRONOGRAMA_2026_2027: ModuloCronograma[] = [
  ...MODULOS_1CP,
  ...MODULOS_2CP,
  ...MODULOS_3CP,
];

// ------------------------------------------------------------------
// Equivalências UFCD (811183) → UCs (811RA144)
//
// As competências da app (competencias.ts / subtecnicas.ts) estão
// mapeadas às UCs do referencial novo. Como as disciplinas do
// referencial antigo são quase idênticas, cada UFCD do 2º/3º liga-se
// aqui às UCs equivalentes — assim as sugestões e filtros de
// competências funcionam nas três turmas sem duplicar a base.
// ------------------------------------------------------------------
export const EQUIVALENCIAS_UFCD_UC: Record<string, string[]> = {
  // 2º CP
  'UFCD 12':   ['UC02002'],              // entradas sólidas e acepipes
  'UFCD 14':   ['UC02004'],              // carnes, aves e caça
  'UFCD 15':   ['UC02003'],              // peixes e mariscos
  'UFCD 20':   ['UC02005'],              // massas base/recheios/cremes/molhos pastelaria
  'UFCD 21.1': ['UC02005', 'UC03592'],   // sobremesas quentes e frias
  'UFCD 21.2': ['UC02005', 'UC03592'],   // gelados e sorvetes
  'UFCD 01':   ['UC00038'],              // setor do turismo
  'UFCD 07':   ['UC03580'],              // comunicação/interação interpessoal
  'UFCD 57':   ['UC00031'],              // ideias e oportunidades de negócio

  // 3º CP
  'UFCD 16':   ['UC03586'],              // cozinha tradicional portuguesa
  'UFCD 22.1': ['UC03586'],              // pastelaria tradicional portuguesa
  'UFCD 22.2': ['UC03586'],              // doçaria conventual portuguesa
  'UFCD 17':   ['UC03588'],              // cozinha internacional
  'UFCD 23':   ['UC03592'],              // pastelaria internacional
  'UFCD 18':   ['UC03589'],              // novas tendências
  'UFCD 19':   ['UC03591'],              // serviços especiais de cozinha
  'UFCD 53.1': ['UC00054'],              // emergência (doença súbita/acidente)
  'UFCD 04':   ['UC03584'],              // qualidade em restauração ≈ higiene/segurança/procedimentos
  'UFCD 08':   ['UC00034'],              // colaboração e trabalho em equipa
  'UFCD 09':   ['UC00056'],              // turismo inclusivo
  'UFCD 24':   ['UC03576', 'UC03591'],   // coordenação de equipas ≈ organizar produção/brigadas
  'UFCD 52':   ['UC03580'],              // atendimento e reclamações
};

/** Resolve qualquer código (UC ou UFCD) para a lista de UCs 811RA144
 *  usada pelas competências. UCs devolvem-se a si próprias. */
export function ucsEquivalentes(codigo: string): string[] {
  if (!codigo) return [];
  const cod = codigo.trim();
  if (EQUIVALENCIAS_UFCD_UC[cod]) return EQUIVALENCIAS_UFCD_UC[cod];
  // aceitar variantes: 'UFCD12', 'ufcd 12', '12'
  const norm = cod.toUpperCase().replace(/\s+/g, ' ');
  if (EQUIVALENCIAS_UFCD_UC[norm]) return EQUIVALENCIAS_UFCD_UC[norm];
  const semPrefixo = norm.replace(/^UFCD\s*/, '');
  const chave = `UFCD ${semPrefixo}`;
  if (EQUIVALENCIAS_UFCD_UC[chave]) return EQUIVALENCIAS_UFCD_UC[chave];
  return [cod]; // é uma UC do referencial novo
}

// ------------------------------------------------------------------
// Helpers de turma e datas
// ------------------------------------------------------------------

/** Extrai o ano (1/2/3) do id/nome da turma — funciona com
 *  '1º CP', '1º ACP', '1 CP', etc. */
export function anoDaTurma(turmaIdOuNome: string): 1 | 2 | 3 | null {
  const m = (turmaIdOuNome || '').match(/[123]/);
  if (!m) return null;
  return Number(m[0]) as 1 | 2 | 3;
}

export function modulosDaTurma(turmaIdOuNome: string): ModuloCronograma[] {
  const ano = anoDaTurma(turmaIdOuNome);
  if (!ano) return [];
  return CRONOGRAMA_2026_2027.filter(m => m.turmaAno === ano);
}

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Módulos em curso na data indicada (por omissão, hoje). */
export function modulosAtivos(turmaIdOuNome: string, dataISO?: string): ModuloCronograma[] {
  const d = dataISO || hoje();
  return modulosDaTurma(turmaIdOuNome).filter(m => m.dataInicio <= d && d <= m.dataFim);
}

/** Módulos que começam nos próximos `dias` dias. */
export function modulosAImpiciar(turmaIdOuNome: string, dias = 7, dataISO?: string): ModuloCronograma[] {
  const d = new Date(dataISO || hoje());
  const limite = new Date(d);
  limite.setDate(limite.getDate() + dias);
  const dStr = d.toISOString().slice(0, 10);
  const limStr = limite.toISOString().slice(0, 10);
  return modulosDaTurma(turmaIdOuNome).filter(m => m.dataInicio > dStr && m.dataInicio <= limStr);
}

/** Módulos terminados nos últimos `dias` dias (verificar avaliação). */
export function modulosTerminados(turmaIdOuNome: string, dias = 14, dataISO?: string): ModuloCronograma[] {
  const d = new Date(dataISO || hoje());
  const inicio = new Date(d);
  inicio.setDate(inicio.getDate() - dias);
  const dStr = d.toISOString().slice(0, 10);
  const iniStr = inicio.toISOString().slice(0, 10);
  return modulosDaTurma(turmaIdOuNome).filter(m => m.dataFim < dStr && m.dataFim >= iniStr);
}

export function getModulo(id: string): ModuloCronograma | undefined {
  return CRONOGRAMA_2026_2027.find(m => m.id === id);
}

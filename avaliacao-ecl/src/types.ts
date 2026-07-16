// ============================================================
// Tipos — Avaliação ECL
// ============================================================

export type Categoria = 'TECNICAS' | 'ATITUDES' | 'RESPONSABILIDADES';

export interface Competencia {
  id: string;
  categoria: Categoria;
  nome: string;
  descricao?: string;
  uc: string[];
  palavrasChave?: string[];
  tecnicaMaeId?: string;
  /** Critérios observáveis — presentes nas subtécnicas e microcompetências */
  criterios?: { criterio: string; como?: string }[];
}

export interface Turma {
  id: string;
  nome: string;
}

export interface Aluno {
  id: string;
  turmaId: string;
  numero: number;
  ano: 1 | 2 | 3;
  nome?: string;
  pin?: string;
  pinCriadoEm?: string;
  pinAlteradoEm?: string;
  nivelMedidas?: 1 | 2 | 3;
  ativo?: boolean;
}

export const MINIMO_POR_ANO: Record<1 | 2 | 3, number> = {
  1: 5,
  2: 8,
  3: 12,
};

export type Perfil = 'aluno' | 'professor' | 'coordenadora';

export type ModoTrabalho = 'individual' | 'grupo';

export type TipoServico =
  | 'normal'
  | 'buffet'
  | 'servico_carta'
  | 'a_la_minute'
  | 'coffee_break'
  | 'brunch'
  | 'pequeno_almoco'
  | 'jantar'
  | 'catering';

export const TIPO_SERVICO_LABEL: Record<TipoServico, string> = {
  normal: 'Aula normal',
  buffet: 'Buffet',
  servico_carta: 'Serviço à carta',
  a_la_minute: 'Serviço à la minute',
  coffee_break: 'Coffee break',
  brunch: 'Brunch',
  pequeno_almoco: 'Pequeno-almoço',
  jantar: 'Jantar / Banquete',
  catering: 'Catering',
};

export interface Comanda {
  id: string;
  turmaId: string;
  data: string;
  titulo: string;
  linkOuTexto: string;
  fatorConversao?: number;
  modo: ModoTrabalho;
  tipoServico: TipoServico;
  atendimentoCliente: boolean;
  alunosIds: string[];
  tecnicasSugeridas: string[];
  atitudesSugeridas: string[];
  responsabilidadesSugeridas: string[];
  tecnicasFixas: string[];
  atitudesFixas: string[];
  responsabilidadesFixas: string[];
  criadaEm: string;
}

// NivelAuto: escala 1-5 + retrocompatibilidade com labels antigos
export type NivelAuto = 'nf' | 'tp' | 'ca' | 'fs' | 'mbr'
  | 'nao' | 'ajuda' | 'sozinho' | 'autonomia'
  | 'nao_atingi' | 'desenvolvimento' | 'atingi' | 'superei';

// Cores da escala — tons de ardósia progressivos (neutros, sem verde/vermelho)
export const NIVEL_AUTO_COR: Partial<Record<NivelAuto, { bg: string; texto: string }>> = {
  nf:  { bg: '#c8cfd6', texto: '#4a5568' },
  tp:  { bg: '#96a4b0', texto: '#2d3748' },
  ca:  { bg: '#647a8a', texto: '#ffffff' },
  fs:  { bg: '#3d5a6e', texto: '#ffffff' },
  mbr: { bg: '#1e3a4a', texto: '#ffffff' },
};

export const NIVEL_AUTO_LABEL: Record<NivelAuto, string> = {
  // Escala nova 1-5
  nf:  'Ainda não fiz',
  tp:  'Tentei mas ainda preciso de mais prática',
  ca:  'Consegui com ajuda',
  fs:  'Faço sozinho/a',
  mbr: 'Faço com muito bom resultado',
  // Retrocompatibilidade escala antiga 1-4
  nao:          'Ainda não fiz',
  ajuda:        'Consegui com ajuda',
  sozinho:      'Faço sozinho/a',
  autonomia:    'Faço com muito bom resultado',
  nao_atingi:   'Ainda não fiz',
  desenvolvimento: 'Tentei mas ainda preciso de mais prática',
  atingi:       'Faço sozinho/a',
  superei:      'Faço com muito bom resultado',
};

export const NIVEL_AUTO_NOTA: Record<NivelAuto, number> = {
  // Escala nova 1-5 (×4 = /20)
  nf:  1,
  tp:  2,
  ca:  3,
  fs:  4,
  mbr: 5,
  // Retrocompatibilidade escala antiga 1-4 → mapeado para 1-5
  nao:          1,
  ajuda:        3,
  sozinho:      4,
  autonomia:    5,
  nao_atingi:   1,
  desenvolvimento: 2,
  atingi:       4,
  superei:      5,
};

// Converter nota 1-5 para /20
export function notaPara20(n: number): number { return Math.min(20, Math.round(n * 4)); }

export interface AutoavaliacaoCompetencia {
  competenciaId: string;
  nivel: NivelAuto;
}

export interface SelecaoAluno {
  id: string;
  comandaId: string;
  planoAulaId?: string;
  fichaId?: string;
  alunoId: string;
  turmaId: string;
  tecnicas: string[];
  atitudes: string[];
  responsabilidades: string[];
  autoavaliacoes: AutoavaliacaoCompetencia[];
  comentario?: string;
  fotoUrl?: string;
  criadaEm: string;
}

export interface NotaCompetencia {
  competenciaId: string;
  nota: number;
  origem: 'auto' | 'professor';
}

export interface Validacao {
  id: string;
  selecaoId: string;
  comandaId: string;
  planoAulaId?: string;
  fichaId?: string;
  alunoId: string;
  turmaId: string;
  notas: NotaCompetencia[];
  comentarioGeral?: string;
  validadoPor: string;
  validadoEm: string;
}

export interface HistoricoCompetencia {
  competenciaId: string;
  notas: number[];
  vezesTreinada: number;
  media: number;
  dominada: boolean;
}

export interface HistoricoAluno {
  alunoId: string;
  porCompetencia: Record<string, HistoricoCompetencia>;
  mediaGeral: number;
  totalAvaliacoes: number;
  totalIndividual: number;
  totalGrupo: number;
}

export type TipoAtividade = 'evento' | 'concurso';

export interface Atividade {
  id: string;
  turmaId: string;
  tipo: TipoAtividade;
  titulo: string;
  data: string;
  participantesIds: string[];
  criadaEm: string;
}

export interface IngredienteFicha {
  id: string;
  componente: string;
  qt: string;
  un: string;
  produto: string;
  tPrep: string;
  tConf: string;
  obs: string;
}

export interface PassoFicha {
  id: string;
  num: number;
  descricao: string;
  temperatura: string;
  tempo: string;
  obs: string;
  haccp: string;
}

export type FamiliaFicha =
  | 'Preparações Base e Molhos'
  | 'Sopas e Caldos'
  | 'Entradas e Acepipes'
  | 'Ovos'
  | 'Peixes e Mariscos'
  | 'Carnes, Aves e Caça'
  | 'Arrozes'
  | 'Massas'
  | 'Legumes e Vegetarianos'
  | 'Acompanhamentos e Guarnições'
  | 'Panificação'
  | 'Pastelaria — Massas Base'
  | 'Pastelaria — Cremes e Molhos'
  | 'Pastelaria — Sobremesas Empratadas'
  | 'Pastelaria — Doçaria e Petit Fours'
  | 'Bebidas';

export const ETIQUETAS_FICHA = {
  proteina: [
    'Vaca', 'Porco', 'Frango', 'Pato', 'Borrego', 'Caça',
    'Peixe branco', 'Peixe gordo', 'Bacalhau', 'Marisco', 'Moluscos',
    'Leguminosas', 'Queijo', 'Enchidos',
  ],
  tecnica: [
    'Forno', 'Vapor', 'Vácuo', 'Fritura', 'Grelhado',
    'Estufado', 'Fumado', 'Fermentado', 'Cru',
  ],
  cultural: [
    'Cozinha Portuguesa', 'Pastelaria Portuguesa', 'Cozinha Internacional',
    'Sustentável', 'Criativa/Vanguarda', 'Alternativa/Vegan',
  ],
} as const;

export const TODAS_ETIQUETAS: string[] = [
  ...ETIQUETAS_FICHA.proteina,
  ...ETIQUETAS_FICHA.tecnica,
  ...ETIQUETAS_FICHA.cultural,
];

export const FAMILIAS_FICHA: FamiliaFicha[] = [
  'Preparações Base e Molhos',
  'Sopas e Caldos',
  'Entradas e Acepipes',
  'Ovos',
  'Peixes e Mariscos',
  'Carnes, Aves e Caça',
  'Arrozes',
  'Massas',
  'Legumes e Vegetarianos',
  'Acompanhamentos e Guarnições',
  'Panificação',
  'Pastelaria — Massas Base',
  'Pastelaria — Cremes e Molhos',
  'Pastelaria — Sobremesas Empratadas',
  'Pastelaria — Doçaria e Petit Fours',
  'Bebidas',
];

export interface FichaProducao {
  id: string;
  nomePrato: string;
  classificacao: string;
  familia1?: FamiliaFicha;
  familia2?: FamiliaFicha;
  etiquetas?: string[];
  fichaNum?: string;
  codigo?: string;
  numPorcoes: string;
  tempoPrep?: string;
  tempoConf?: string;
  ingredientes: IngredienteFicha[];
  preparacao: PassoFicha[];
  empratamento?: string;
  alergenicos: string[];
  equipamento?: string;
  conservacao?: string;
  regeneracao?: string;
  kitchenflow?: string;
  tecnicasSugeridas?: string[];
  ucsAssociadas?: string[];
  elaboradoPor?: string;
  data?: string;
  planoAulaId?: string;
  textoGuia?: string;
  htmlCompleto?: string;
  criadoEm: string;
  atualizadoEm: string;
  tipoPlanAula?: 'pratico' | 'misto' | 'teorico'; // define pesos de avaliação
}

// --------------------------------------------------------
// Planos de Aula
// --------------------------------------------------------
export interface PlanoAula {
  id: string;
  turmaId: string;
  professor: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  titulo: string;
  observacoes: string;
  fichasIds: string[];
  estado: 'rascunho' | 'fichas_pendentes' | 'requisicao_pendente' | 'publicado' | 'realizada' | 'arquivado';
  requisicaoId?: string;
  ucId?: string;
  ucNome?: string;
  numeroPlan?: number;
  compRemovidas?: string[];
  compAdicionadas?: string[];
  eventoId?: string;        // ← ID do evento pedagógico associado (EventosWizard)
  /** Critérios congelados no momento em que o professor marca a aula como realizada.
   *  A partir daqui, CriteriosComp lê daqui em vez do código atual.
   *  Formato: { [competenciaId]: { criterio: string; como?: string }[] } */
  criteriosCongelados?: Record<string, { criterio: string; como?: string }[]>;
  realizadaEm?: string;     // ISO timestamp — quando o professor marcou como realizada
  // Registo de alterações após publicação — visível ao aluno como aviso
  ultimaAlteracao?: {
    tipo: 'ficha' | 'guia' | 'requisicao' | 'competencias' | 'geral';
    descricao: string;      // ex: "Ficha técnica atualizada"
    em: string;             // ISO timestamp
  };
  criadoEm: string;
  atualizadoEm: string;
  tipoPlanAula?: 'pratico' | 'misto' | 'teorico'; // define pesos de avaliação
}

export interface Evidencia {
  id: string;
  alunoId: string;
  competenciaId: string;
  ucId: string;
  planoAulaId?: string;
  fichaId?: string;
  tipoEvidencia: string;
  nivel: 0 | 1 | 2 | 3 | 4;
  observacaoQualitativa?: string;
  professor: string;
  data: string;
  criadoEm: string;
}

export interface RecuperacaoModulo {
  id: string;
  alunoId: string;
  turmaId: string;
  ucId: string;
  ucNome: string;
  numeroRecuperacao?: number;
  tipoUC: 'tecnica' | 'organizacional' | 'hibrida';
  planosIds: string[];
  competenciasIds: string[];
  atitudesIds: string[];
  responsabilidadesIds: string[];
  estado: 'gerada' | 'em_curso' | 'submetida' | 'em_analise' | 'devolvida' | 'aguardar_defesa_oral' | 'validada' | 'nao_validada' | 'pendente_observacao_futura'
    | 'pendente' | 'em_avaliacao' | 'concluida';
  trabalhoTeorico?: string;
  investigacao?: string;
  casoProfissional?: string;
  autoavaliacao?: string;
  evidenciasUrls?: string[];
  anexos?: { tipo: 'foto' | 'video' | 'audio' | 'documento' | 'link'; url: string; descricao?: string; criadoEm: string }[];
  analiseIA?: {
    relatorioConsistencia: string;
    lacunasDetetadas: string[];
    sugestaoPerguntasDefesaOral: string[];
    sugestaoEstado: 'suficiente_para_defesa' | 'necessita_correcao' | 'evidencia_insuficiente' | 'validavel_observacao_futura';
    geradoEm: string;
  };
  dataLimite?: string;
  trancada?: boolean;
  destrancadaPorProfessor?: boolean;
  avaliacaoCompetencias?: { competenciaId: string; nivel: 'nao_demonstrada' | 'em_desenvolvimento' | 'consolidada' | 'avancada' }[];
  comentarioProfessor?: string;
  professorAvaliador?: string;
  perguntasDefesaOral?: { competenciaId: string; pergunta: string }[];
  defesaOralRealizada?: boolean;
  defesaOralNotas?: string;
  defesaOralData?: string;
  nivelMedidasUsado?: 1 | 2 | 3;
  promptPlanoIndividual?: string;
  planoIndividualTexto?: string;
  planoIndividualAprovado?: boolean;
  dataAtribuicao: string;
  dataSubmissao?: string;
  dataValidacao?: string;
  criadoEm: string;
  atualizadoEm: string;
  tipoPlanAula?: 'pratico' | 'misto' | 'teorico'; // define pesos de avaliação
}

export type ModoDistribuicaoFicha = 'todos' | 'grupo' | 'individual';

export interface GrupoFicha {
  id: string;
  fichaId: string;
  planoAulaId: string;
  nome: string;
  alunosIds: string[];
}

export interface DistribuicaoFicha {
  id: string;
  planoAulaId: string;
  fichaId: string;
  modo: ModoDistribuicaoFicha;
  tipoServico: TipoServico;
  alunosIds: string[];
  grupos: GrupoFicha[];
  tecnicasSelecionadas: string[];
  atitudesSelecionadas: string[];
  atitudesProfessor: string[];
  publicada: boolean;
}

export interface ChecklistAlunoFicha {
  id: string;
  planoAulaId: string;
  fichaId: string;
  alunoId: string;
  pontualidade: 'a_horas' | 'atrasado';
  minutosAtraso?: number;
  fardamento: boolean;
  itensFardamento: string[];
  ingredientesConfirmados: string[];
  passosConcluidos: string[];
  haccpConfirmado: string[];
  requisicaoVerificada?: boolean;
  comentario?: string;
  haccpRegistado: boolean;
  atualizadoEm: string;
}

export interface LinhaRequisicao {
  id: string;
  produto: string;
  unidade: string;
  quantidadeTotal: number;
  precoUnitario?: number;
  custoTotal?: number;
  materiaPrimaId?: string;
  obs?: string;
}

export interface RequisicaoAula {
  id: string;
  planoAulaId: string;
  turmaId: string;
  dataAula: string;
  professor: string;
  fichasIds: string[];
  linhas: LinhaRequisicao[];
  custoTotal: number;
  estado: 'rascunho' | 'enviada' | 'aprovada';
  criadaEm: string;
  atualizadaEm: string;
}

export interface MateriaPrima {
  id: string;
  nome: string;
  categoria: string;
  unidadeCompra: string;
  unidadeReceita: string;
  fatorConversao: number;
  precoUnitario: number;
  fonte?: string;
  atualizadoEm: string;
  aliases?: string[];
}

export interface HistoricoPreco {
  id: string;
  materiaPrimaId: string;
  preco: number;
  fonte: string;
  data: string;
}

export interface Aviso {
  id: string;
  tipo: 'ingrediente_nao_encontrado' | 'ingrediente_ambiguo' | 'ficha_incompleta'
    | 'plano_sem_ficha' | 'ficha_sem_guia' | 'plano_sem_requisicao'
    | 'recuperacao_por_avaliar' | 'validacao_pendente' | 'outro'
    | 'sugestao_ingrediente';
  titulo: string;
  descricao: string;
  contexto?: {
    fichaId?: string;
    planoId?: string;
    ingredienteNome?: string;
    tabDestino?: string;
    sugestao?: {
      nomeOriginal: string;
      nomeCorrigido?: string;
      precoKg?: number;
      precoUnitario?: number;
      unidadeCompra?: string;
      categoria?: string;
      observacao?: string;
      sugeridoPor?: string;
      sugeridoEm?: string;
      estadoAprovacao?: 'pendente' | 'aprovado' | 'rejeitado';
    };
  };
  resolvido: boolean;
  criadoEm: string;
  resolvidoEm?: string;
}

export interface MateriaPrimaCustom {
  id: string;
  nome: string;
  categoria: string;
  unidadeCompra: string;
  precoKg: number;
  precoUnitario: number;
  aliases: string[];
  criadoEm: string;
  atualizadoEm: string;
  tipoPlanAula?: 'pratico' | 'misto' | 'teorico'; // define pesos de avaliação
}

export type CategoriaManual =
  | 'Higiene e Preparação'
  | 'Técnicas de Corte'
  | 'Métodos de Confeção'
  | 'Empratamento e Apresentação'
  | 'Conservação e Armazenamento'
  | 'Equipamentos e Utensílios'
  | 'Pastelaria e Doçaria'
  | 'Segurança Alimentar'
  | 'Outro';

export type NivelManual = 'Base' | 'Intermédio' | 'Avançado';

export interface EntradaManual {
  id: string;
  titulo: string;
  categoria: CategoriaManual;
  nivel: NivelManual;
  palavrasChave: string[];
  textoGuia: string;
  criadoPor: string;
  criadoEm: string;
  atualizadoEm: string;
  tipoPlanAula?: 'pratico' | 'misto' | 'teorico'; // define pesos de avaliação
}

export const CATEGORIAS_MANUAL: CategoriaManual[] = [
  'Higiene e Preparação',
  'Técnicas de Corte',
  'Métodos de Confeção',
  'Empratamento e Apresentação',
  'Conservação e Armazenamento',
  'Equipamentos e Utensílios',
  'Pastelaria e Doçaria',
  'Segurança Alimentar',
  'Outro',
];

export const ICONES_CATEGORIA: Record<CategoriaManual, string> = {
  'Higiene e Preparação':        '🥬',
  'Técnicas de Corte':           '🔪',
  'Métodos de Confeção':         '🔥',
  'Empratamento e Apresentação': '🍽️',
  'Conservação e Armazenamento': '❄️',
  'Equipamentos e Utensílios':   '🧰',
  'Pastelaria e Doçaria':        '🍮',
  'Segurança Alimentar':         '⚠️',
  'Outro':                       '📖',
};

export const CORES_NIVEL: Record<NivelManual, { bg: string; cor: string }> = {
  'Base':       { bg: '#EAF3DE', cor: '#27500A' },
  'Intermédio': { bg: '#E6F1FB', cor: '#0C447C' },
  'Avançado':   { bg: '#EEEDFE', cor: '#3C3489' },
};

// ── Guia de Apoio à Produção ─────────────────────────────────
export interface SecaoGuia {
  num: number;
  titulo: string;
  icone: string;
  cor: string;
  corTexto: string;
  conteudo: string;
}

export interface DadosGuia {
  nomePrato: string;
  secoes: SecaoGuia[];
  equilibrioSensorial?: { componente: string; intensidade: string; notas: string }[];
  rendimentos?: { produto: string; comprado: string; utilizavel: string; rendimento: string; perdas: string }[];
  haccp?: { perigo: string; pcc: string; temperatura: string; medida: string; conservacao: string }[];
  questoes?: { tipo: string; pergunta: string; opcoes?: string[]; resposta?: string }[];
}

// ── Pesos por tipo de aula ────────────────────────────────────
export const PESOS_AULA = {
  pratico: { OBR: 0.20, SUB: 0.50, KNW: 0.20, ATI: 0.10, INI: 0.00 },
  misto:   { OBR: 0.20, SUB: 0.50, KNW: 0.20, ATI: 0.10, INI: 0.00 },
  teorico: { OBR: 0.20, SUB: 0.00, KNW: 0.65, ATI: 0.10, INI: 0.05 },
} as const;

// ── Iniciativa — autoavaliação do aluno em aulas teóricas ─────
export const INICIATIVA_FRASES = [
  { nivel: 1, texto: 'Não tomei iniciativa — esperei sempre que me dissessem o que fazer' },
  { nivel: 2, texto: 'Tentei tomar iniciativa mas precisei de orientação' },
  { nivel: 3, texto: 'Organizei algumas tarefas de cozinha sem precisar de ser pedido' },
  { nivel: 4, texto: 'Geri o meu trabalho de forma autónoma e organizada' },
  { nivel: 5, texto: 'Antecipei necessidades, apoiei colegas e contribuí além do que era esperado' },
];

// ── Função central: calcular nota 0-20 de um plano ───────────
export function calcularNotaPlano(
  notas: { categoria: 'OBR' | 'SUB' | 'KNW' | 'ATI' | 'INI'; nota: number }[],
  tipoPlan: 'pratico' | 'misto' | 'teorico'
): { nota20: number; porCategoria: Record<string, number>; detalhes: string } {
  const pesos = PESOS_AULA[tipoPlan];
  const porCat: Record<string, number[]> = { OBR: [], SUB: [], KNW: [], ATI: [], INI: [] };

  for (const n of notas) {
    if (porCat[n.categoria]) porCat[n.categoria].push(n.nota);
  }

  const media = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  let soma = 0;
  let pesoTotal = 0;
  const porCategoria: Record<string, number> = {};

  for (const [cat, peso] of Object.entries(pesos)) {
    if (peso === 0) continue;
    const m = media(porCat[cat]);
    if (m !== null) {
      soma += m * peso;
      pesoTotal += peso;
      porCategoria[cat] = Math.round(m * 4 * 10) / 10; // em /20
    }
  }

  // Normalizar se alguma categoria não foi avaliada
  const nota14 = pesoTotal > 0 ? soma / pesoTotal : 0;
  const nota20 = Math.min(20, Math.round(nota14 * 4 * 10) / 10);

  const detalhes = Object.entries(porCategoria)
    .map(([cat, n]) => `${cat}: ${n}/20`)
    .join(' | ');

  return { nota20, porCategoria, detalhes };
}

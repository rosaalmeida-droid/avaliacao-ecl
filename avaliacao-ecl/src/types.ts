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

export type NivelAuto = 'nao_atingi' | 'desenvolvimento' | 'atingi' | 'superei';

export const NIVEL_AUTO_LABEL: Record<NivelAuto, string> = {
  nao_atingi: 'Não atingi',
  desenvolvimento: 'Em desenvolvimento',
  atingi: 'Atingi',
  superei: 'Superei / domino bem',
};

export const NIVEL_AUTO_NOTA: Record<NivelAuto, number> = {
  nao_atingi: 5,
  desenvolvimento: 10,
  atingi: 15,
  superei: 18,
};

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

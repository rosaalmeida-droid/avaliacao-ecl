// ============================================================
// Tipos — Avaliação ECL
// ============================================================

export type Categoria = 'TECNICAS' | 'ATITUDES' | 'RESPONSABILIDADES';

export interface Competencia {
  id: string;            // ex: "T01"
  categoria: Categoria;
  nome: string;          // texto curto mostrado ao aluno
  descricao?: string;    // detalhe opcional
  uc: string[];          // códigos UC de origem (rastreabilidade ao referencial)
  palavrasChave?: string[]; // para sugestão automática a partir da receita
  tecnicaMaeId?: string;    // se for subtécnica, id da técnica "grupo" (T01-T33) de onde deriva
}

export interface Turma {
  id: string;
  nome: string; // ex: "CP-Cozinha-2526"
}

export interface Aluno {
  id: string;       // turma+numero, ex: "CP1-12"
  turmaId: string;
  numero: number;
  ano: 1 | 2 | 3;    // ano do curso — define o nº mínimo de competências exigidas
  nome?: string;
}

export const MINIMO_POR_ANO: Record<1 | 2 | 3, number> = {
  1: 5,
  2: 8,
  3: 12,
};

export type Perfil = 'aluno' | 'professor' | 'coordenadora';

// --------------------------------------------------------
// Contexto da comanda
// --------------------------------------------------------
export type ModoTrabalho = 'individual' | 'grupo';

export type TipoServico =
  | 'normal'           // aula normal de cozinha, sem serviço especial
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

// --------------------------------------------------------
// Comanda do dia (criada pelo professor)
// --------------------------------------------------------
export interface Comanda {
  id: string;
  turmaId: string;
  data: string;          // ISO date
  titulo: string;        // nome da receita
  linkOuTexto: string;    // link ou texto colado da receita
  fatorConversao?: number;
  modo: ModoTrabalho;
  tipoServico: TipoServico;
  atendimentoCliente: boolean;
  alunosIds: string[];     // alunos atribuídos a esta comanda (1 se individual, N se grupo)
  tecnicasSugeridas: string[];        // ids de Competencia (categoria TECNICAS)
  atitudesSugeridas: string[];        // ids de Competencia (categoria ATITUDES)
  responsabilidadesSugeridas: string[]; // ids de Competencia (categoria RESPONSABILIDADES)
  tecnicasFixas: string[];        // escolhidas pelo professor, obrigatórias (não removíveis)
  atitudesFixas: string[];
  responsabilidadesFixas: string[];
  criadaEm: string;       // ISO datetime
}

// --------------------------------------------------------
// Autoavaliação — escala qualitativa mapeada para 0-20
// --------------------------------------------------------
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

// --------------------------------------------------------
// Seleção do aluno para uma comanda
// --------------------------------------------------------
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

// --------------------------------------------------------
// Validação do professor (uma por competência escolhida)
// --------------------------------------------------------
export interface NotaCompetencia {
  competenciaId: string;
  nota: number;       // 0-20, nota final (validada ou herdada da autoavaliação)
  origem: 'auto' | 'professor'; // se o professor ajustou ou aceitou a autoavaliação
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

// --------------------------------------------------------
// Histórico agregado por aluno × competência
// (derivado das Validações, usado para o sistema de progressão)
// --------------------------------------------------------
export interface HistoricoCompetencia {
  competenciaId: string;
  notas: number[];     // todas as notas recebidas nessa competência
  vezesTreinada: number; // = notas.length, exposto explicitamente
  media: number;       // média calculada
  dominada: boolean;   // media >= 12
}

export interface HistoricoAluno {
  alunoId: string;
  porCompetencia: Record<string, HistoricoCompetencia>;
  mediaGeral: number;
  totalAvaliacoes: number;
  totalIndividual: number;
  totalGrupo: number;
}

// --------------------------------------------------------
// Atividades extracurriculares — eventos fora de horas e
// concursos de cozinha. Registo factual de participação,
// sem ligação (por agora) ao sistema de competências.
// --------------------------------------------------------
export type TipoAtividade = 'evento' | 'concurso';

export interface Atividade {
  id: string;
  turmaId: string;
  tipo: TipoAtividade;
  titulo: string;       // ex: "Jantar de Gala - Hotel X" / "Concurso Jovem Chef 2026"
  data: string;          // ISO date
  participantesIds: string[]; // alunos que participaram
  criadaEm: string;
}

// --------------------------------------------------------
// Fichas de Produção
// --------------------------------------------------------
export interface IngredienteFicha {
  id: string;
  componente: string;
  qt: string;
  un: string;        // unidade (g, kg, ml, l, un)
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

export interface FichaProducao {
  id: string;
  nomePrato: string;
  classificacao: string;
  fichaNum?: string;
  codigo?: string;        // ex: 1A, 1B, 2A — Plano N + letra
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
  htmlCompleto?: string;  // ficha formatada pronta a mostrar/imprimir — gerada ao guardar
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
  estado: 'rascunho' | 'fichas_pendentes' | 'requisicao_pendente' | 'publicado';
  requisicaoId?: string;
  ucId?: string;
  ucNome?: string;
  numeroPlan?: number;
  compRemovidas?: string[];
  compAdicionadas?: string[];
  criadoEm: string;
  atualizadoEm: string;
}

// --------------------------------------------------------
// Distribuição de Fichas
// --------------------------------------------------------
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

// --------------------------------------------------------
// Checklist do Aluno por Ficha
// --------------------------------------------------------
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

// --------------------------------------------------------
// Requisição
// --------------------------------------------------------
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

// --------------------------------------------------------
// Matérias-Primas e Preços
// --------------------------------------------------------
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

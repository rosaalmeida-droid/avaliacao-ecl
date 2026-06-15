// Tipos — Avaliação ECL

export type Categoria = 'TECNICAS' | 'ATITUDES' | 'RESPONSABILIDADES';

export interface Competencia {
  id: string;
  categoria: Categoria;
  nome: string;
  descricao?: string;
  uc: string[];
  palavrasChave?: string[];
  tecnicaMaeId?: string;
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
  servico_carta: 'Servico a carta',
  a_la_minute: 'Servico a la minute',
  coffee_break: 'Coffee break',
  brunch: 'Brunch',
  pequeno_almoco: 'Pequeno-almoco',
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
  nao_atingi: 'Nao atingi',
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
  grupoId?: string;
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
  grupoId?: string;
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

export interface FichaProducao {
  id: string;
  nomePrato: string;
  classificacao: string;
  fichaNum?: string;
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
  criadoEm: string;
  atualizadoEm: string;
}

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
  pontualidade?: 'a_horas' | 'atrasado';
  minutosAtraso?: number;
  fardamento?: boolean;
  itensFardamento?: string[];
  ingredientesConfirmados: string[];
  passosConcluidos: string[];
  haccpConfirmado: string[];
  requisicaoVerificada?: boolean;
  comentario?: string;
  haccpRegistado?: boolean;
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

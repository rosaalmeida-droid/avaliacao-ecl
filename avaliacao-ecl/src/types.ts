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
}

export interface Turma {
  id: string;
  nome: string; // ex: "CP-Cozinha-2526"
}

export interface Aluno {
  id: string;       // turma+numero, ex: "CP1-12"
  turmaId: string;
  numero: number;
  nome?: string;
}

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
  id: string;             // comandaId + alunoId
  comandaId: string;
  alunoId: string;
  turmaId: string;
  tecnicas: string[];        // ids escolhidos (min 3)
  atitudes: string[];        // ids escolhidos (min 3)
  responsabilidades: string[]; // ids escolhidos (min 3)
  autoavaliacoes: AutoavaliacaoCompetencia[]; // uma por competência selecionada
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
  id: string;              // selecaoId
  selecaoId: string;
  comandaId: string;
  alunoId: string;
  turmaId: string;
  notas: NotaCompetencia[]; // uma nota por competência selecionada
  comentarioGeral?: string;
  validadoPor: string;     // nome/pin do professor
  validadoEm: string;      // ISO datetime
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

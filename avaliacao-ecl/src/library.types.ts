// ============================================================
// library.types.ts
// Tipos TypeScript para a Biblioteca Técnica Profissional V10
// Avaliação ECL — Escola de Comércio de Lisboa
// ============================================================

// ── ESCALA DE AVALIAÇÃO ──────────────────────────────────────

export type CodigoAutoavaliacao = 'NTO' | 'NF' | 'NC' | 'AD' | 'FS';
export type CodigoValidacaoProfessor = 'CONFIRM' | 'UP' | 'DOWN' | 'NO';

export interface OpcaoAutoavaliacao {
  valor: number;
  codigo: CodigoAutoavaliacao;
  emoji: string;
  texto: string;
  entra_calculo: boolean;
  sinal_atitude?: boolean;
}

// ── REFERENCIAL ───────────────────────────────────────────────

export type Referencial = '811RA144' | '811183';
export type MedidasInclusao = 'regular' | 'seletivas' | 'adicionais';

export interface UC {
  id: string;         // ex: UC02003
  ano: 1 | 2 | 3;
  designacao: string;
  dominio: string;
}

export interface UFCD {
  id: string;         // ex: 3294
  designacao: string;
}

export interface UCUFCDMap {
  uc_id: string;
  uc_nome: string;
  ufcd_id: string | null;
  ufcd_nome: string | null;
  status: 'IGUAL' | 'SIMILAR' | 'DIFERENTE' | 'NOVO';
  notas: string;
}

// ── TÉCNICAS E SUBTÉCNICAS ────────────────────────────────────

export interface Tecnica {
  id: string;           // ex: TEC-CHU-041
  codigo: string;
  nome: string;
  familia: string;
  dominio: string;
  descricao?: string;
}

export interface Subtecnica {
  id: string;
  tecnica_id: string;
  nome: string;
  descricao?: string;
  produto_exemplo?: string;
  nivel?: number;
}

// ── PERFIS TÉCNICOS ───────────────────────────────────────────

export type Essencialidade = 'ESSENTIAL' | 'DEVELOPMENT' | 'ADVANCED';
export type Nivel = 1 | 2 | 3;

export interface PerfilTecnico {
  id: string;                   // ex: PERF-COZ-0001
  nivel: Nivel;
  essencialidade: Essencialidade;
  seletivas: boolean;           // disponível para medidas seletivas
  adicionais: boolean;          // disponível para medidas adicionais
  dominio: string;
  familia_referencial?: string;
  familia_tecnica: string;
  variante?: string;
  tecnicas?: string;
  tecnica_ids?: string[];       // parsed
  ambito_produto?: string;
  resultado_esperado: string;
  texto_aluno: string;          // em 1ª pessoa — aparece ao aluno
  como_posso_perceber: string;  // critérios observáveis
  erros_frequentes?: string;
  acoes_corretivas?: string;
  pre_requisitos?: string;
  nao_aplicacoes?: string;
  UC_aplicaveis?: string;
  uc_list?: string[];           // parsed
  aliases?: string;
  aliases_list?: string[];      // parsed em lowercase
  fontes?: string;
}

// ── CRITÉRIOS OBSERVÁVEIS ────────────────────────────────────

export interface CriterioObservavel {
  id: string;           // ex: CRT-000001
  perfil_id: string;
  ordem: number;
  nivel: Nivel;
  essencialidade: Essencialidade;
  seletivas: boolean;
  adicionais: boolean;
  texto_aluno: string;          // o aluno lê isto
  texto_professor: string;      // o professor vê isto
  titulo: string;
  observavel: boolean;
  escala_aluno: string;
  escala_professor: string;
}

// ── CONHECIMENTOS E APTIDÕES ─────────────────────────────────

export interface Conhecimento {
  id: string;
  nivel: Nivel;
  dominio: string;
  familia_tecnica: string;
  nome: string;
  definicao: string;
}

export interface Aptidao {
  id: string;
  nivel: Nivel;
  dominio: string;
  familia_tecnica: string;
  nome: string;
  manifestacao_observavel: string;
}

// ── APARELHOS / BASES / MOLHOS ───────────────────────────────

export interface Aparelho {
  id: string;
  nome: string;
  categoria: string;
  definicao: string;
  ambito_profissional?: string;
  nivel?: Nivel;
  aliases?: string;
  aliases_list?: string[];
  fontes?: string;
}

// ── PRODUTOS ─────────────────────────────────────────────────

export interface Produto {
  id: string;
  nome: string;
  familia: string;
  subfamilia?: string;
  funcao_tecnica?: string;
  riscos_tecnicos?: string;
  aliases?: string;
  aliases_list?: string[];
}

// ── PREPARAÇÕES ──────────────────────────────────────────────

export type PrioridadeCurricular = 'CORE' | 'REGIONAL' | 'COMPLEMENTAR';
export type PaisRegiao = 'Portugal' | string;

export interface Preparacao {
  id: string;
  nome: string;
  categoria: string;
  pais: PaisRegiao;
  regiao: string;
  regiao_geografica?: string;   // para internacionais
  descricao: string;
  nivel: Nivel;
  prioridade_curricular: PrioridadeCurricular;
  UC?: string;
  uc_list?: string[];           // parsed
  aparelhos?: string;
  perfis?: string;
  perfil_ids?: string[];        // parsed
  produtos?: string;
  ocasiao?: string;
  fontes?: string;
}

// ── ATITUDES ─────────────────────────────────────────────────

export interface Atitude {
  id: string;
  nome: string;
  descricao?: string;
  indicadores?: string;
  prioridade?: string;
}

// ── AVALIAÇÃO ─────────────────────────────────────────────────

export interface AutoavaliacaoItem {
  perfil_id: string;
  codigo: CodigoAutoavaliacao;
  timestamp: string;
  plano_id: string;
}

export interface ValidacaoProfessor {
  perfil_id: string;
  aluno_id: string;
  codigo: CodigoAutoavaliacao;       // autoavaliação original
  validacao: CodigoValidacaoProfessor;
  nota_final?: number;               // 0-20, calculado
  timestamp: string;
  observacao?: string;
}

export interface HistoricoCompetencia {
  perfil_id: string;
  aluno_id: string;
  avaliacoes: {
    data: string;
    codigo: CodigoAutoavaliacao;
    validacao: CodigoValidacaoProfessor;
    nota: number;
    plano_id: string;
  }[];
  estado: 'nunca_avaliada' | 'em_evolucao' | 'consolidada' | 'em_regressao';
  ultima_nota?: number;
  media_ponderada?: number;
}

// ── SUGESTÃO DE COMPETÊNCIAS ─────────────────────────────────

export interface SugestaoCompetencia {
  perfil: PerfilTecnico;
  criterios: CriterioObservavel[];
  score_relevancia: number;   // 0-100
  motivo: string[];           // razões da sugestão
  obrigatoria: boolean;
}

// ── PLANO DE AULA ─────────────────────────────────────────────

export interface PlanoDeAula {
  id: string;
  data: string;
  turma: string;
  referencial: Referencial;
  uc_id: string;              // UC (novo) ou UFCD (antigo)
  preparacao_id?: string;
  preparacao_nome?: string;
  competencias_selecionadas: string[];   // perfil IDs
  professor_id: string;
  estado: 'rascunho' | 'publicado' | 'concluido';
  notas?: string;
}

// ── BIBLIOTECA (agregado) ─────────────────────────────────────

export interface Library {
  tecnicas: Tecnica[];
  subtecnicas: Subtecnica[];
  perfis: PerfilTecnico[];
  criterios: CriterioObservavel[];
  conhecimentos: Conhecimento[];
  aptidoes: Aptidao[];
  aparelhos: Aparelho[];
  produtos: Produto[];
  preparacoes_mlm: Preparacao[];
  preparacoes_int: Preparacao[];
  preparacoes_base: Preparacao[];
  atitudes: Atitude[];
  uc_base: UC[];
  uc_ufcd_map: UCUFCDMap[];
  uc_to_ufcd: Record<string, string>;
  ufcd_to_uc: Record<string, string>;
  version: string;
  gerado_em: string;
}

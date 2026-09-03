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
  /** Define os pesos de avaliação. Decisão explícita do professor —
   *  o AlunoView adivinhava-o pela ausência de ficha técnica, o que
   *  impedia um plano teórico com trabalhos e sem ficha. */
  tipoPlanAula?: TipoPlanAula;
}

// --------------------------------------------------------
// Planos de Aula
// --------------------------------------------------------
// ── Trabalhos de conhecimento ─────────────────────────────────
// Um plano de aula não tem de assentar numa ficha técnica. Numa aula
// teórica o trabalho pode ser de investigação, uma apresentação, uma
// defesa oral ou um relatório — e é aí que os conhecimentos e as
// atitudes são avaliados.
export type TipoPlanAula = 'pratico' | 'teorico' | 'misto';

export type TipoTrabalho =
  | 'investigacao'   // pesquisa e desenvolvimento → escrito
  | 'relatorio'      // relatório de visita, prova, evento → escrito
  | 'apresentacao'   // apresentação à turma → oral
  | 'defesa';        // defesa do trabalho perante o professor → oral

/** Cada tipo de trabalho já traz consigo se conta como conhecimento
 *  escrito ou oral. Assim a repartição 50:50 dos conhecimentos sai
 *  do próprio trabalho, sem ser preciso marcar o conhecimentos.json. */
export const MODALIDADE_TRABALHO: Record<TipoTrabalho, 'escrito' | 'oral'> = {
  investigacao: 'escrito',
  relatorio:    'escrito',
  apresentacao: 'oral',
  defesa:       'oral',
};

export const LABEL_TRABALHO: Record<TipoTrabalho, string> = {
  investigacao: 'Investigação e desenvolvimento',
  relatorio:    'Relatório',
  apresentacao: 'Apresentação oral',
  defesa:       'Defesa do trabalho',
};

export interface TrabalhoConhecimento {
  id: string;
  tipo: TipoTrabalho;
  titulo: string;
  /** Enunciado dado ao aluno. Pode ser escrito pelo professor ou
   *  gerado com apoio de IA a partir de promptIA. */
  enunciado: string;
  /** Prompt usado para gerar o enunciado — guardado para o professor
   *  poder reaproveitar ou afinar depois. */
  promptIA?: string;
  /** Como é feito: sozinho, em grupo, ou pela turma toda. */
  modo: 'individual' | 'grupo' | 'turma';
  /** Alunos a quem foi atribuído. Vazio = toda a turma. */
  alunosIds?: string[];
  /** Conhecimentos (KNW-) avaliados por este trabalho. */
  conhecimentosIds: string[];
  /** Atitudes (ATI-) avaliadas por este trabalho. Um trabalho de grupo
   *  avalia cooperação e escuta tanto como uma produção de cozinha. */
  atitudesIds: string[];
  dataEntrega?: string;
  criadoEm: string;
}

/** O que o aluno entrega num trabalho de conhecimento. */
export interface SubmissaoTrabalho {
  id: string;
  trabalhoId: string;
  planoAulaId: string;
  alunoId: string;
  turmaId: string;
  /** Código anónimo usado na correção assistida (ex.: "A07").
   *  A IA vê só isto; a correspondência ao nome faz-se localmente. */
  codigo: string;
  texto: string;
  anexoUrl?: string;
  submetidoEm: string;
  /** Proposta devolvida pela correção assistida. Nunca é a nota final:
   *  o professor abre, vê a proposta preenchida, ajusta e valida —
   *  o mesmo padrão da autoavaliação do aluno. */
  propostaIA?: {
    nota: number;              // 1-5
    comentario: string;
    pontosFortes: string[];
    aMelhorar: string[];
    geradaEm: string;
  };
  /** Nota do professor. Só esta conta. */
  notaProfessor?: number;
  comentarioProfessor?: string;
  validadoEm?: string;
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
  /** Trabalhos de conhecimento — para planos teóricos ou mistos.
   *  Um plano de aula não precisa de ter ficha técnica. */
  trabalhos?: TrabalhoConhecimento[];
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
  /** Define os pesos de avaliação. Decisão explícita do professor —
   *  o AlunoView adivinhava-o pela ausência de ficha técnica, o que
   *  impedia um plano teórico com trabalhos e sem ficha. */
  tipoPlanAula?: TipoPlanAula;
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
  /** Define os pesos de avaliação. Decisão explícita do professor —
   *  o AlunoView adivinhava-o pela ausência de ficha técnica, o que
   *  impedia um plano teórico com trabalhos e sem ficha. */
  tipoPlanAula?: TipoPlanAula;

  // ── Recuperação via FCT — tipo adicional, coexiste com os anteriores ──
  // O aluno recupera um módulo evidenciando trabalho real feito durante a
  // Formação em Contexto de Trabalho, em vez de (ou além de) um trabalho
  // teórico/investigação. O professor escolhe se exige horas mínimas de
  // formação ou só evidências das competências, independentemente das horas.
  viaFCT?: boolean;
  fct?: {
    exigirHoras: boolean;              // false = só evidências contam, horas não são obrigatórias
    horasMinimasExigidas?: number;     // só relevante se exigirHoras = true
    horasRegistadasPeloAluno?: number;
    localFCT?: string;                 // empresa/entidade onde decorre a FCT
    supervisorFCT?: string;            // nome do orientador na empresa
    dataInicio?: string;               // início do período de FCT (YYYY-MM-DD)
    dataTermo?: string;                // termo do período de FCT (YYYY-MM-DD)
    // Importância relativa de cada competência (mesma ordem/índice que
    // competenciasAEvidenciar) — usada para calcular o peso % de cada uma
    // na média final. 1=baixa, 2=média, 3=alta.
    importancias?: number[];
    // Pergunta de cenário gerada pela IA para cada competência (mesma
    // ordem/índice que competenciasAEvidenciar) — usada no guião de
    // reflexão em vez da fórmula genérica fixa.
    perguntas?: string[];
    // Decisão do professor, tomada na CRIAÇÃO da recuperação — nunca depois
    // de avaliar — sobre se pode vir a ser necessária defesa oral.
    possivelOral?: boolean;
    // Guião de apoio gerado pela IA (texto completo, colado pelo professor)
    // — aparece em anexo no documento final, como folha própria para o
    // aluno responder (à mão ou por computador).
    guiaoTexto?: string;
    competenciasAEvidenciar: string[]; // competenciaIds que o professor definiu como alvo desta recuperação FCT
    // Aluno externo/antigo — não está na lista de alunos actual da turma
    // (ex: já terminou o curso e está a recuperar um módulo em falta).
    // Quando preenchido, sobrepõe-se ao nome/turma vindos de getAlunos().
    nomeAlunoManual?: string;
    turmaAlunoManual?: string;
    evidencias: {
      id: string;
      competenciaId: string;
      descricao: string;               // o que o aluno fez, na prática, que demonstra a competência
      dataOcorrencia?: string;
      anexoUrl?: string;                // foto/documento comprovativo, se houver
      validadoPeloSupervisor?: boolean; // se a empresa/orientador confirmou por escrito
    }[];
    promptGeradoParaAluno?: string;     // prompt que ajuda o aluno a estruturar a descrição das evidências
  };
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
  /** Define os pesos de avaliação. Decisão explícita do professor —
   *  o AlunoView adivinhava-o pela ausência de ficha técnica, o que
   *  impedia um plano teórico com trabalhos e sem ficha. */
  tipoPlanAula?: TipoPlanAula;
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
  /** Define os pesos de avaliação. Decisão explícita do professor —
   *  o AlunoView adivinhava-o pela ausência de ficha técnica, o que
   *  impedia um plano teórico com trabalhos e sem ficha. */
  tipoPlanAula?: TipoPlanAula;
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
// Decisão pedagógica (set/2026). Referência: sistema dual alemão —
// KochAusbV 2022 §16 reparte o exame em 60% prático / 40% teórico.
// Aqui prático = OBR + SUB = 60%; os restantes 40% dividem-se entre
// conhecimentos (20%) e atitudes (20%), porque num curso profissional
// a postura vale tanto como a teoria.
//
// KNW subdivide-se em escrito e oral (10% + 10%), à imagem dos dois
// blocos alemães "schriftliche Arbeiten" / "sonstige Leistungen" (50:50).
// A subdivisão só entra em vigor quando os conhecimentos passarem a
// estar marcados como escrito ou oral — até lá KNW conta como um todo.
//
// INI saiu daqui: a participação em eventos e concursos passou a bónus
// aditivo (ver BONUS_PARTICIPACAO). Não confundir com INI-001, que é
// a iniciativa dentro da aula teórica e continua a existir.
export const PESOS_AULA = {
  pratico: { OBR: 0.20, SUB: 0.40, KNW: 0.20, ATI: 0.20, INI: 0.00 },
  misto:   { OBR: 0.20, SUB: 0.40, KNW: 0.20, ATI: 0.20, INI: 0.00 },
  teorico: { OBR: 0.15, SUB: 0.00, KNW: 0.65, ATI: 0.20, INI: 0.00 },
} as const;

// Repartição interna dos conhecimentos, quando estiverem marcados.
export const PESOS_KNW = { escrito: 0.5, oral: 0.5 } as const;

// ── Bónus de participação — eventos e concursos ───────────────
// Não é uma componente ponderada: é um acréscimo à nota final.
// Assim quem participa SOBE, em vez de quem não participa descer por
// razões que muitas vezes não dependem dele (trabalha, mora longe,
// toma conta de irmãos).
export const BONUS_PARTICIPACAO = {
  porAtividade: 0.75,
  maxAtividades: 3,          // até +2,25 valores
  notaBaseMinima: 8,         // abaixo de 8 o bónus não conta
  tetoSemParticipacao: 17,   // sem participar, o máximo é 17
} as const;

/**
 * Aplica o bónus de participação à nota base de uma UC.
 * @param notaBase      nota 0-20 calculada pelas competências
 * @param nParticipacoes atividades/concursos concluídos pelo aluno
 */
export function aplicarBonusParticipacao(
  notaBase: number,
  nParticipacoes: number
): { notaFinal: number; bonus: number; limitadaPorTeto: boolean } {
  const B = BONUS_PARTICIPACAO;
  const n = Math.max(0, Math.min(nParticipacoes, B.maxAtividades));

  if (n === 0) {
    const limitada = notaBase > B.tetoSemParticipacao;
    return {
      notaFinal: limitada ? B.tetoSemParticipacao : notaBase,
      bonus: 0,
      limitadaPorTeto: limitada,
    };
  }

  const bonus = notaBase >= B.notaBaseMinima ? n * B.porAtividade : 0;
  return {
    // 2 casas: a nota da UC agrega vários planos e arredondar cedo
    // acumula erro. O arredondamento para 1 casa faz-se na apresentação.
    notaFinal: Math.min(20, Math.round((notaBase + bonus) * 100) / 100),
    bonus,
    limitadaPorTeto: false,
  };
}


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

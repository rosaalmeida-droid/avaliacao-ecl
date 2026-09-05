// ============================================================
// MOTOR DE AVALIAÇÃO — Avaliação ECL
//
// Sete módulos num único ficheiro, para ser criado de uma vez só no
// GitHub em vez de cinco ficheiros à mão num tablet. Podem ser
// separados mais tarde num computador; o conteúdo é o mesmo.
//
//  1. Atitudes do plano ....... seleção por trimestre/recuperação/aluno
//  2. Avaliação em árvore ..... granularidade automática + banco cumulativo
//  3. Perguntas com produto ... matéria-prima na pergunta ao aluno
//  4. Prompt de trabalhos ..... enunciados gerados com IA
//  5. Correção assistida ...... correção em lote anonimizada
//  6. Registos KitchenFlow .... verificação individual com justificação
//  7. Entrada na aula ......... atraso + obrigatórias rápidas
// ============================================================

import {
  ATITUDES_POR_ANO, atitudesParaAno, atitudesDoTrimestre,
  getAtitudeDetalhada, dicaRecuperacaoAtitude,
} from './compatECL';
import { trimestreAtual } from './datas';
import { Nivel } from './avaliacaoModelo';
import {
  Aluno, SubmissaoTrabalho, TrabalhoConhecimento,
  TipoTrabalho, LABEL_TRABALHO, MODALIDADE_TRABALHO,
} from './types';


// ============================================================
// atitudesDoPlano
// ============================================================
// ============================================================
// Seleção das atitudes de um plano de aula.
//
// Regras do manual do professor (secção 5), que até agora estavam
// escritas mas não implementadas — o AlunoView mostrava uma lista fixa
// de 7 atitudes, igual para todos os alunos e todos os planos:
//
//   1. Atitude do trimestre .... 1 ...... automática, do ano e trimestre
//   2. Atitude em recuperação .. 0 ou 1 . obrigatória se ficou em 1 ou 2
//   3. Atitude proposta ........ 1 ...... escolhida pelo aluno
//
// Máximo de 3 por plano. A atitude em recuperação volta SEMPRE no plano
// seguinte, ao contrário das subtécnicas, que só voltam quando a
// próxima ficha as incluir.
// ============================================================



export type OrigemAtitude = 'trimestre' | 'recuperacao' | 'aluno' | 'extra';

export interface AtitudeSelecionada {
  id: string;
  nome: string;
  origem: OrigemAtitude;
  /** Só o aluno pode trocar a que ele próprio escolheu. */
  editavelPeloAluno: boolean;
  /** Dica ajustada ao ano, quando vem de recuperação. */
  dica?: string;
}

export interface HistoricoAtitude {
  atitudeId: string;
  ultimaNota: number;   // 1-5
  planoAulaId: string;
  data: string;
}

export const MAX_ATITUDES_POR_PLANO = 3;
/** Abaixo deste nível a atitude volta obrigatoriamente no plano seguinte. */
export const NIVEL_RECUPERACAO = 2;

/**
 * Monta as atitudes de um plano de aula.
 * @param ano        ano do aluno (1-3)
 * @param historico  avaliações anteriores de atitudes deste aluno
 * @param data       data do plano (define o trimestre)
 * @param jaEscolhidas atitudes usadas em planos anteriores, para não repetir
 */
export function montarAtitudesDoPlano(
  ano: 1 | 2 | 3,
  historico: HistoricoAtitude[],
  data: Date = new Date(),
  jaEscolhidas: string[] = []
): { automaticas: AtitudeSelecionada[]; opcoesParaAluno: string[] } {
  const tri = trimestreAtual(data);
  const automaticas: AtitudeSelecionada[] = [];

  // 1. Atitude do trimestre — a primeira do ano/trimestre ainda não usada,
  //    ou a primeira do trimestre se já foram todas.
  const doTri = atitudesDoTrimestre(ano, tri);
  const nova = doTri.find(a => !jaEscolhidas.includes(a.id)) ?? doTri[0];
  if (nova) {
    automaticas.push({
      id: nova.id,
      nome: nova.nome,
      origem: 'trimestre',
      editavelPeloAluno: false,
    });
  }

  // 2. Atitude em recuperação — a mais recente que ficou em 1 ou 2.
  const emFalta = [...historico]
    .filter(h => h.ultimaNota <= NIVEL_RECUPERACAO)
    .filter(h => !automaticas.some(a => a.id === h.atitudeId))
    .sort((a, b) => b.data.localeCompare(a.data))[0];

  if (emFalta) {
    const det = getAtitudeDetalhada(emFalta.atitudeId);
    automaticas.push({
      id: emFalta.atitudeId,
      nome: det?.nome ?? emFalta.atitudeId,
      origem: 'recuperacao',
      editavelPeloAluno: false,
      dica: dicaRecuperacaoAtitude(emFalta.atitudeId, ano),
    });
  }

  // 3. O que sobra para o aluno escolher.
  const usadas = automaticas.map(a => a.id);
  const opcoesParaAluno = opcoesDeEscolhaDoAluno(ano).filter(id => !usadas.includes(id));

  return { automaticas, opcoesParaAluno };
}

/**
 * Atitudes que o aluno pode propor. Inclui as do seu ano e ainda as do
 * ano seguinte: um aluno pode querer ser avaliado numa atitude mais
 * avançada do que o seu ano exige, e isso deve ser possível.
 */
export function opcoesDeEscolhaDoAluno(ano: 1 | 2 | 3): string[] {
  const doSeuAno = atitudesParaAno(ano);
  const seguinte = ano < 3 ? (ATITUDES_POR_ANO[(ano + 1) as 2 | 3] ?? []) : [];
  return [...new Set([...doSeuAno, ...seguinte])];
}

/** Junta a escolha do aluno às automáticas, respeitando o máximo. */
export function fecharSelecao(
  automaticas: AtitudeSelecionada[],
  escolhaDoAluno?: string
): AtitudeSelecionada[] {
  const final = [...automaticas];
  if (
    escolhaDoAluno &&
    final.length < MAX_ATITUDES_POR_PLANO &&
    !final.some(a => a.id === escolhaDoAluno)
  ) {
    const det = getAtitudeDetalhada(escolhaDoAluno);
    final.push({
      id: escolhaDoAluno,
      nome: det?.nome ?? escolhaDoAluno,
      origem: 'aluno',
      editavelPeloAluno: true,
    });
  }
  return final.slice(0, MAX_ATITUDES_POR_PLANO);
}

/** Atitudes que ficaram por recuperar — para avisar o professor. */
export function atitudesPorRecuperar(historico: HistoricoAtitude[]): HistoricoAtitude[] {
  const ultimaPorAtitude = new Map<string, HistoricoAtitude>();
  for (const h of [...historico].sort((a, b) => a.data.localeCompare(b.data))) {
    ultimaPorAtitude.set(h.atitudeId, h);
  }
  return [...ultimaPorAtitude.values()].filter(h => h.ultimaNota <= NIVEL_RECUPERACAO);
}

export const LABEL_ORIGEM: Record<OrigemAtitude, string> = {
  trimestre: 'Atitude deste trimestre',
  recuperacao: 'A recuperar',
  aluno: 'Proposta tua',
  extra: 'Acrescentada pelo professor',
};


// ============================================================
// avaliacaoArvore
// ============================================================
// ============================================================
// Avaliação em árvore: APARELHO › TÉCNICA › SUBTÉCNICA
//
// Duas ideias que já estavam escritas no avaliacaoModelo.ts e nunca
// foram ligadas à aplicação:
//
// 1. GRANULARIDADE AUTOMÁTICA
//    Quem domina responde a uma pergunta. Quem falha desce até onde
//    precisa. O aparelho bem feito fecha a árvore; falhado, abre as
//    técnicas; a técnica falhada abre as subtécnicas.
//    Assim um aluno do 3º ano avalia "Béchamel: 4" e acabou, e um do
//    1º ano vê onde exactamente falhou — na pesagem? na ligação?
//
// 2. BANCO CUMULATIVO
//    A nota nunca desce do nível já consolidado. Repetir uma técnica
//    ou mantém ou sobe. O aluno não perde o que já conquistou.
// ============================================================


/** Acima deste nível a árvore fecha — não se pede mais detalhe. */
export const NIVEL_FECHA_ARVORE = 3;

export type NivelDetalhe = 'aparelho' | 'tecnica' | 'subtecnica';

export interface NoAvaliacao {
  id: string;
  nome: string;
  nivel?: Nivel;
  filhos?: NoAvaliacao[];
}

/** Um nível ≤ 3 abre o detalhe seguinte; 4 ou 5 fecha. */
export function abreDetalhe(nivel?: Nivel): boolean {
  return nivel != null && nivel <= NIVEL_FECHA_ARVORE;
}

/**
 * Que perguntas fazer a seguir, dado o que já foi respondido.
 * Devolve só o que o aluno precisa de ver agora.
 */
export function proximoDetalhe(no: NoAvaliacao): {
  abrir: boolean;
  filhos: NoAvaliacao[];
  motivo: string;
} {
  if (no.nivel == null) {
    return { abrir: false, filhos: [], motivo: 'Ainda não avaliado' };
  }
  if (!abreDetalhe(no.nivel)) {
    return { abrir: false, filhos: [], motivo: 'Conseguido — não é preciso mais detalhe' };
  }
  if (!no.filhos?.length) {
    return { abrir: false, filhos: [], motivo: 'Sem detalhe disponível' };
  }
  return {
    abrir: true,
    filhos: no.filhos,
    motivo: no.nivel <= 2 ? 'Vamos ver onde falhou' : 'Vamos afinar os pormenores',
  };
}

/** Nota de um nó: média dos filhos avaliados, ou a nota direta se fechou. */
export function notaDoNo(no: NoAvaliacao): number {
  const avaliados = (no.filhos ?? []).filter(f => f.nivel != null);
  if (avaliados.length) {
    const m = avaliados.reduce((s, f) => s + notaDoNo(f), 0) / avaliados.length;
    return Math.round(m * 10) / 10;
  }
  return no.nivel ?? 0;
}

// ── Banco cumulativo ──────────────────────────────────────────

export interface RegistoBanco {
  competenciaId: string;
  nivelConsolidado: number;
  vezesAvaliada: number;
  ultimaData: string;
}

/**
 * Aplica o piso: a nota nunca desce do nível já consolidado.
 * Devolve também se subiu, para a aplicação poder dar a notícia ao aluno.
 */
export function aplicarBanco(
  registo: RegistoBanco | undefined,
  novaNota: number,
  data: string
): { registo: RegistoBanco; subiu: boolean; manteve: boolean } {
  if (!registo) {
    return {
      registo: { competenciaId: '', nivelConsolidado: novaNota, vezesAvaliada: 1, ultimaData: data },
      subiu: false,
      manteve: false,
    };
  }
  const subiu = novaNota > registo.nivelConsolidado;
  return {
    registo: {
      ...registo,
      nivelConsolidado: Math.max(registo.nivelConsolidado, novaNota),
      vezesAvaliada: registo.vezesAvaliada + 1,
      ultimaData: data,
    },
    subiu,
    manteve: !subiu,
  };
}

/** Constrói o banco a partir do histórico todo de um aluno. */
export function construirBanco(
  avaliacoes: { competenciaId: string; nota: number; data: string }[]
): Map<string, RegistoBanco> {
  const banco = new Map<string, RegistoBanco>();
  for (const a of [...avaliacoes].sort((x, y) => x.data.localeCompare(y.data))) {
    const atual = banco.get(a.competenciaId);
    const { registo } = aplicarBanco(atual, a.nota, a.data);
    banco.set(a.competenciaId, { ...registo, competenciaId: a.competenciaId });
  }
  return banco;
}

/** Mensagem para o aluno depois de repetir uma competência. */
export function mensagemBanco(subiu: boolean, manteve: boolean, nivel: number): string {
  if (subiu) return `Subiste para o nível ${nivel}. Fica registado.`;
  if (manteve) return `Mantiveste o nível ${nivel} que já tinhas. Nunca perdes o que conquistaste.`;
  return `Nível ${nivel} registado.`;
}


// ============================================================
// perguntasComProduto
// ============================================================
// ============================================================
// Perguntas ao aluno com a matéria-prima incluída.
//
// Hoje o aluno lê "Selaste?" — genérico, sem contexto. Devia ler
// "Selaste a carne?". A mesma técnica aplicada a produtos diferentes
// tem pontos de controlo diferentes, e a pergunta tem de o dizer.
//
// Duas fontes, por ordem de preferência:
//  1. Micros_por_Tecnica_COMPLETO.json — perguntas específicas por
//     produto, para as 17 técnicas-mãe que já têm micros escritos.
//     Ex.: assar ave → "Chegou a ≥75°C ao centro?"
//  2. Frase genérica com o nome do produto colado, para as restantes
//     87 técnicas. Ex.: "Selaste a carne?"
//
// Assim o buraco dos micros por preencher deixa de ser impeditivo.
// ============================================================

export interface MicrosPorTecnica {
  tecnica: string;
  fr?: string;
  gesto?: string;
  micros: Record<string, string[]>;   // produto → perguntas
}

/** Normaliza para comparar: sem acentos, minúsculas, sem plural simples. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/s$/, '')
    .trim();
}

/**
 * Encontra o grupo de produto mais próximo do que está na ficha.
 * Os grupos nos micros são largos ("Carne", "Ave", "Pão/massa/brioche"),
 * a ficha traz o produto concreto ("lombo de porco", "coxa de frango").
 */
export function grupoDoProduto(
  produto: string,
  grupos: string[]
): string | undefined {
  const p = norm(produto);

  for (const g of grupos) {
    for (const parte of g.split('/')) {
      const n = norm(parte);
      if (p === n || p.includes(n) || n.includes(p)) return g;
    }
  }

  // Famílias conhecidas — o produto da ficha raramente diz "carne".
  const familias: Record<string, string[]> = {
    carne: ['vaca', 'vitela', 'porco', 'borrego', 'cabrito', 'lombo', 'bife', 'entrecosto', 'costeleta', 'novilho'],
    ave: ['frango', 'galinha', 'peru', 'pato', 'codorniz', 'coxa', 'peito'],
    peixe: ['bacalhau', 'robalo', 'dourada', 'salmao', 'pescada', 'atum', 'sardinha', 'linguado', 'polvo', 'lula'],
  };
  for (const [fam, termos] of Object.entries(familias)) {
    if (termos.some(t => p.includes(t))) {
      const g = grupos.find(x => norm(x) === fam || norm(x).includes(fam));
      if (g) return g;
    }
  }
  return undefined;
}

/**
 * Perguntas a fazer ao aluno para uma técnica sobre um produto.
 * Se houver micros para aquele produto, usa-os; senão devolve null e
 * quem chamou usa a frase genérica.
 */
export function perguntasEspecificas(
  nomeTecnica: string,
  produto: string,
  biblioteca: MicrosPorTecnica[]
): { grupo: string; perguntas: string[] } | null {
  const t = biblioteca.find(x => norm(x.tecnica) === norm(nomeTecnica));
  if (!t) return null;

  const grupo = grupoDoProduto(produto, Object.keys(t.micros));
  if (!grupo) return null;

  return { grupo, perguntas: t.micros[grupo] ?? [] };
}

/**
 * Compõe a pergunta genérica com o produto.
 *   ("Selar", "lombo de porco")      → "Selaste: lombo de porco?"
 *   ("Cortar em juliana", "cenoura") → "Cortaste em juliana: cenoura?"
 *
 * Sem artigo de propósito. O produtos.json não guarda o género, e
 * adivinhá-lo pela terminação falha em couve, leite, alface, sal e
 * dezenas de outros. Um "o couve" no ecrã do aluno é pior do que os
 * dois pontos. Quando os produtos tiverem género marcado, isto passa
 * a "Selaste o lombo de porco?" sem mexer em mais nada.
 */
export function perguntaComProduto(nomeSubtecnica: string, produto?: string): string {
  const base = nomeSubtecnica.trim();
  if (!produto) return `${base}?`;
  return `${base}: ${produto.trim()}?`;
}

/**
 * Etiqueta curta para mostrar ao lado da competência, para o aluno saber
 * sempre sobre que produto está a responder.
 *   ("Juliana", "cenoura") → "Juliana · cenoura"
 */
export function etiquetaComProduto(nome: string, produto?: string): string {
  return produto ? `${nome} · ${produto}` : nome;
}


// ============================================================
// promptTrabalho
// ============================================================
// ============================================================
// Geração do enunciado de um trabalho de conhecimento com apoio de IA.
//
// O professor escolhe o tipo de trabalho, a UC e o tema; a app monta o
// prompt e abre-o no Claude/ChatGPT/Gemini através de abrirIA().
// O enunciado que vier de lá é colado no trabalho e fica editável —
// a IA propõe, o professor decide.
// ============================================================


export interface ContextoTrabalho {
  tipo: TipoTrabalho;
  tema: string;
  ucId?: string;
  ucNome?: string;
  ano: 1 | 2 | 3;
  modo: 'individual' | 'grupo' | 'turma';
  /** Conhecimentos da UC que o trabalho deve cobrir (nomes, não IDs). */
  conhecimentos?: string[];
  /** Atitudes a observar durante o trabalho (nomes, não IDs). */
  atitudes?: string[];
  /** Duração prevista, em aulas ou dias. */
  duracao?: string;
}

const EXIGENCIA_POR_ANO: Record<1 | 2 | 3, string> = {
  1: 'Primeiro ano. Linguagem simples e instruções passo a passo. Pede sobretudo identificação e descrição. Evita pedir análise crítica.',
  2: 'Segundo ano. Pede aplicação e comparação, não apenas descrição. O aluno já deve justificar escolhas.',
  3: 'Terceiro ano. Pede análise, decisão fundamentada e sentido crítico. O aluno deve avaliar alternativas e defender a sua opção.',
};

const INSTRUCAO_POR_TIPO: Record<TipoTrabalho, string> = {
  investigacao:
    'Trabalho escrito de investigação. Estrutura com introdução, desenvolvimento e conclusão. Indica que fontes são aceitáveis e exige referências.',
  relatorio:
    'Relatório escrito sobre algo que o aluno viveu (visita, evento, serviço, prova). Descrição do que observou mais reflexão sobre o que aprendeu.',
  apresentacao:
    'Apresentação oral à turma. Indica a duração, se há suporte visual, e o que se espera na forma de comunicar, não só no conteúdo.',
  defesa:
    'Defesa oral perante o professor sobre trabalho já realizado. Prepara perguntas que obriguem o aluno a justificar decisões técnicas que tomou.',
};

export function construirPromptTrabalho(ctx: ContextoTrabalho): string {
  const modalidade = MODALIDADE_TRABALHO[ctx.tipo];
  const linhas: string[] = [];

  linhas.push(
    'És professor de cozinha num curso profissional de nível 4 em Portugal.',
    'Escreve o enunciado de um trabalho para dar aos alunos.',
    '',
    '## Contexto',
    `Tipo de trabalho: ${LABEL_TRABALHO[ctx.tipo]} (${modalidade})`,
    `Tema: ${ctx.tema}`,
  );

  if (ctx.ucNome) linhas.push(`Unidade de competência: ${ctx.ucId ?? ''} ${ctx.ucNome}`.trim());
  linhas.push(`Ano: ${ctx.ano}º`);
  linhas.push(
    `Modo: ${ctx.modo === 'individual' ? 'individual' : ctx.modo === 'grupo' ? 'em grupo' : 'turma inteira'}`
  );
  if (ctx.duracao) linhas.push(`Duração: ${ctx.duracao}`);

  if (ctx.conhecimentos?.length) {
    linhas.push('', '## Conhecimentos a cobrir');
    ctx.conhecimentos.forEach(c => linhas.push(`- ${c}`));
  }

  if (ctx.atitudes?.length) {
    linhas.push(
      '',
      '## Atitudes observadas durante o trabalho',
      'Não são para avaliar no texto entregue — são observadas pelo professor',
      'enquanto o trabalho decorre. Tem-nas em conta ao desenhar a tarefa.'
    );
    ctx.atitudes.forEach(a => linhas.push(`- ${a}`));
  }

  linhas.push(
    '',
    '## Nível de exigência',
    EXIGENCIA_POR_ANO[ctx.ano],
    '',
    '## Formato do trabalho',
    INSTRUCAO_POR_TIPO[ctx.tipo],
    '',
    '## O que devolver',
    'Escreve o enunciado em português de Portugal, dirigido ao aluno, com:',
    '1. Título',
    '2. O que se pede, em linguagem clara e direta',
    '3. Passos concretos a seguir',
    '4. Critérios de avaliação, em linguagem que o aluno perceba',
    '5. O que entregar e em que formato',
    '',
    'Regras: frases curtas; nada de jargão académico; se usares um termo',
    'técnico de cozinha, explica-o entre parênteses na primeira vez.',
    'Alguns alunos têm dificuldades de aprendizagem — o enunciado tem de',
    'ser legível por todos sem baixar a exigência do trabalho.',
    'Devolve só o enunciado, sem comentários teus antes ou depois.'
  );

  return linhas.join('\n');
}

/** Trabalho vazio, pronto a preencher no formulário do plano de aula. */
export function novoTrabalho(tipo: TipoTrabalho): TrabalhoConhecimento {
  return {
    id: `trab_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    tipo,
    titulo: '',
    enunciado: '',
    modo: 'individual',
    conhecimentosIds: [],
    atitudesIds: [],
    criadoEm: new Date().toISOString(),
  };
}

/** Reparte os trabalhos de um plano entre conhecimento escrito e oral. */
export function repartirPorModalidade(trabalhos: TrabalhoConhecimento[]): {
  escrito: TrabalhoConhecimento[];
  oral: TrabalhoConhecimento[];
} {
  const escrito: TrabalhoConhecimento[] = [];
  const oral: TrabalhoConhecimento[] = [];
  for (const t of trabalhos) {
    (MODALIDADE_TRABALHO[t.tipo] === 'escrito' ? escrito : oral).push(t);
  }
  return { escrito, oral };
}


// ============================================================
// correcaoAssistida
// ============================================================
// ============================================================
// Correção assistida dos trabalhos de conhecimento.
//
// O professor manda os trabalhos da turma num lote para a IA e recebe
// uma proposta de nota e comentário por aluno. A proposta NÃO é a nota:
// entra pré-preenchida no ecrã do professor, que ajusta e valida — o
// mesmo padrão já usado na autoavaliação do aluno.
//
// PROTEÇÃO DE DADOS: a IA nunca vê nomes. Cada aluno leva um código
// (A01, A02, ...) e a correspondência aos nomes fica na aplicação.
// ============================================================


/** Gera códigos anónimos estáveis para uma lista de alunos. */
export function gerarCodigos(alunos: Aluno[]): Map<string, string> {
  const mapa = new Map<string, string>();
  [...alunos]
    .sort((a, b) => a.numero - b.numero)
    .forEach((al, i) => mapa.set(al.id, `A${String(i + 1).padStart(2, '0')}`));
  return mapa;
}

/** Resolve um código de volta ao aluno. */
export function alunoDoCodigo(
  codigo: string,
  codigos: Map<string, string>
): string | undefined {
  for (const [alunoId, c] of codigos) if (c === codigo) return alunoId;
  return undefined;
}

const ESCALA = `1 = Não fez ou não corresponde ao pedido
2 = Fez pouco do que era pedido, com falhas importantes
3 = Fez o essencial, mas com lacunas ou pouca profundidade
4 = Fez o que era pedido, bem estruturado e correto
5 = Foi além do pedido, com análise própria e bem fundamentada`;

const EXIGENCIA: Record<1 | 2 | 3, string> = {
  1: 'Primeiro ano. Valoriza identificação e descrição corretas. Não penalizes falta de análise crítica — não é isso que se pede a este nível.',
  2: 'Segundo ano. Espera aplicação e comparação, com escolhas justificadas.',
  3: 'Terceiro ano. Espera análise, decisão fundamentada e sentido crítico.',
};

export interface LoteCorrecao {
  trabalho: TrabalhoConhecimento;
  submissoes: SubmissaoTrabalho[];
  ano: 1 | 2 | 3;
  ucNome?: string;
  conhecimentos?: string[];
}

export function construirPromptCorrecao(lote: LoteCorrecao): string {
  const { trabalho, submissoes, ano, ucNome, conhecimentos } = lote;
  const l: string[] = [];

  l.push(
    'És professor de cozinha num curso profissional de nível 4 em Portugal.',
    'Avalia os trabalhos abaixo e devolve uma proposta de nota para cada um.',
    '',
    'Os trabalhos estão identificados por código, não por nome. Não tentes',
    'adivinhar quem é quem nem comentes a identidade dos alunos.',
    '',
    '## Trabalho pedido',
    `Tipo: ${LABEL_TRABALHO[trabalho.tipo]}`,
    `Título: ${trabalho.titulo}`
  );
  if (ucNome) l.push(`Unidade de competência: ${ucNome}`);
  l.push(`Ano: ${ano}º`, '', '### Enunciado dado aos alunos', trabalho.enunciado);

  if (conhecimentos?.length) {
    l.push('', '### Conhecimentos a avaliar');
    conhecimentos.forEach(c => l.push(`- ${c}`));
  }

  l.push(
    '',
    '## Escala',
    ESCALA,
    '',
    '## Nível de exigência',
    EXIGENCIA[ano],
    '',
    '## Trabalhos entregues'
  );

  submissoes.forEach(s => {
    l.push('', `### ${s.codigo}`, s.texto.trim() || '(entrega vazia)');
  });

  l.push(
    '',
    '## O que devolver',
    'Devolve APENAS um array JSON, sem texto antes nem depois, sem ```:',
    '[',
    '  {',
    '    "codigo": "A01",',
    '    "nota": 4,',
    '    "comentario": "duas ou três frases dirigidas ao aluno, em português de Portugal",',
    '    "pontosFortes": ["...", "..."],',
    '    "aMelhorar": ["...", "..."]',
    '  }',
    ']',
    '',
    'Regras do comentário:',
    '- Fala com o aluno por tu, de forma direta e sem condescendência.',
    '- Diz o que está bem antes do que falta.',
    '- Em "aMelhorar" escreve o que ele deve fazer da próxima vez, não o que fez mal.',
    '- Nada de jargão académico. Alguns alunos têm dificuldades de aprendizagem.',
    '- Um comentário por cada código, mesmo que a entrega esteja vazia.'
  );

  return l.join('\n');
}

export interface PropostaIA {
  codigo: string;
  nota: number;
  comentario: string;
  pontosFortes: string[];
  aMelhorar: string[];
}

/** Lê a resposta da IA e devolve as propostas, ignorando lixo à volta. */
export function lerRespostaCorrecao(texto: string): {
  propostas: PropostaIA[];
  erro?: string;
} {
  try {
    const limpo = texto.replace(/```json|```/g, '').trim();
    const i = limpo.indexOf('[');
    const f = limpo.lastIndexOf(']');
    if (i === -1 || f === -1) return { propostas: [], erro: 'Não encontrei um array JSON na resposta.' };

    const bruto = JSON.parse(limpo.slice(i, f + 1));
    if (!Array.isArray(bruto)) return { propostas: [], erro: 'A resposta não é um array.' };

    const propostas = bruto
      .filter((p: any) => p && typeof p.codigo === 'string')
      .map((p: any) => ({
        codigo: String(p.codigo).trim(),
        nota: Math.max(1, Math.min(5, Number(p.nota) || 1)),
        comentario: String(p.comentario ?? '').trim(),
        pontosFortes: Array.isArray(p.pontosFortes) ? p.pontosFortes.map(String) : [],
        aMelhorar: Array.isArray(p.aMelhorar) ? p.aMelhorar.map(String) : [],
      }));

    return { propostas };
  } catch (e) {
    return { propostas: [], erro: `Não consegui ler a resposta: ${String(e)}` };
  }
}

/** Aplica as propostas às submissões. Não define notas — só preenche
 *  a proposta que o professor vai rever. */
export function aplicarPropostas(
  submissoes: SubmissaoTrabalho[],
  propostas: PropostaIA[]
): { atualizadas: SubmissaoTrabalho[]; semProposta: string[] } {
  const porCodigo = new Map(propostas.map(p => [p.codigo, p]));
  const agora = new Date().toISOString();
  const semProposta: string[] = [];

  const atualizadas = submissoes.map(s => {
    const p = porCodigo.get(s.codigo);
    if (!p) {
      semProposta.push(s.codigo);
      return s;
    }
    return {
      ...s,
      propostaIA: {
        nota: p.nota,
        comentario: p.comentario,
        pontosFortes: p.pontosFortes,
        aMelhorar: p.aMelhorar,
        geradaEm: agora,
      },
    };
  });

  return { atualizadas, semProposta };
}

/** Relatório individual para devolver ao aluno e publicar no Classroom. */
export function construirRelatorioAluno(
  submissao: SubmissaoTrabalho,
  trabalho: TrabalhoConhecimento,
  nomeAluno: string
): string {
  const nota = submissao.notaProfessor ?? submissao.propostaIA?.nota;
  const com = submissao.comentarioProfessor || submissao.propostaIA?.comentario || '';
  const l = [`# ${trabalho.titulo}`, '', `**${nomeAluno}**`, ''];

  if (nota != null) l.push(`Nível atingido: ${nota}/5 (${Math.round(nota * 4)}/20)`, '');
  if (com) l.push(com, '');

  const pf = submissao.propostaIA?.pontosFortes ?? [];
  const am = submissao.propostaIA?.aMelhorar ?? [];
  if (pf.length) { l.push('## O que está bem'); pf.forEach(p => l.push(`- ${p}`)); l.push(''); }
  if (am.length) { l.push('## Para a próxima'); am.forEach(p => l.push(`- ${p}`)); l.push(''); }

  return l.join('\n');
}


// ============================================================
// registosKF
// ============================================================
// ============================================================
// Registos KitchenFlow — verificação por aluno.
//
// PROBLEMA: em trabalho de grupo há alunos que nunca registam. Nem
// sempre é o mesmo grupo, por isso não basta olhar para uma aula: há
// quem se esquive sistematicamente sem que se note.
//
// REGRA: cada aluno faz pelo menos UM registo por aula.
//
// Se não fez, a aplicação pergunta porquê — e confirma a resposta
// contra os dados, em vez de acreditar. Se os registos exigidos pela
// ficha já tinham sido todos feitos pelos colegas, o aluno não podia
// fazer nada e NÃO é penalizado. Se ainda havia por fazer, houve
// oportunidade e ele não a aproveitou.
//
// A Higiene Pessoal não conta para esta contagem: já é avaliada na
// ATI-003 e contá-la aqui seria avaliar duas vezes o mesmo.
// ============================================================

/** Existe no KitchenFlow e o aluno pode preenchê-lo à vontade — só não
 *  conta para o mínimo desta contagem, porque a higiene pessoal é
 *  avaliada como atitude (ATI-003) na Avaliação ECL. Contá-la aqui
 *  seria avaliar duas vezes a mesma coisa. */
export const REGISTO_EXCLUIDO = 'Higiene Pessoal';

/** Não são registos HACCP — são competências técnicas que ficaram no
 *  MAPA_KF_COMPETENCIAS por engano. Mise en place é uma técnica de
 *  cozinha (S003/S004), interpretar ficha técnica também (S002).
 *  Não existem como registo no KitchenFlow. */
export const NAO_SAO_REGISTOS = ['Mise en Place', 'Ficha Técnica'];

/** Registos que fazem sentido uma vez por turma/serviço, não por aluno. */
export const REGISTOS_DE_TURMA = [
  'Receção Mercadorias',
  'Temperatura Receção',
  'Limpeza Equipamentos',
];

/** O que conta como registo individual de um aluno. */
export function ehRegistoIndividual(tipo: string): boolean {
  return (
    tipo !== REGISTO_EXCLUIDO &&
    !NAO_SAO_REGISTOS.includes(tipo) &&
    !REGISTOS_DE_TURMA.includes(tipo)
  );
}

export const MINIMO_POR_ALUNO_POR_AULA = 1;

export interface RegistoKF {
  tipo: string;
  alunoId: string;
  em: string;
}

export type MotivoSemRegisto =
  | 'ja_estavam_feitos'   // os colegas já tinham feito todos
  | 'esqueci'
  | 'nao_sabia_fazer'
  | 'nao_tive_oportunidade';

export const LABEL_MOTIVO: Record<MotivoSemRegisto, string> = {
  ja_estavam_feitos: 'Já estavam todos feitos pelos meus colegas',
  esqueci: 'Esqueci-me',
  nao_sabia_fazer: 'Não sabia como fazer',
  nao_tive_oportunidade: 'Não tive oportunidade',
};

export interface VerificacaoRegistos {
  fezAlgum: boolean;
  quantosFez: number;
  /** Tipos individuais que a ficha exigia e ainda estavam por fazer. */
  aindaPorFazer: string[];
  /** true se, no momento da submissão, já não havia nada por registar. */
  justificacaoValida: boolean;
  /** Se não fez e havia por fazer, a app pergunta o motivo. */
  perguntarMotivo: boolean;
  penaliza: boolean;
  mensagem: string;
}

/**
 * Verifica a situação de um aluno numa aula.
 * @param alunoId      aluno a verificar
 * @param exigidos     tipos de registo que a ficha pede
 * @param registos     registos feitos por toda a gente nesta aula
 */
export function verificarRegistos(
  alunoId: string,
  exigidos: string[],
  registos: RegistoKF[]
): VerificacaoRegistos {
  const individuais = exigidos.filter(ehRegistoIndividual);

  const doAluno = registos.filter(
    r => r.alunoId === alunoId && ehRegistoIndividual(r.tipo)
  );
  const feitosPorTodos = new Set(
    registos.filter(r => ehRegistoIndividual(r.tipo)).map(r => r.tipo)
  );

  const aindaPorFazer = individuais.filter(t => !feitosPorTodos.has(t));
  const fezAlgum = doAluno.length >= MINIMO_POR_ALUNO_POR_AULA;

  if (fezAlgum) {
    return {
      fezAlgum: true,
      quantosFez: doAluno.length,
      aindaPorFazer,
      justificacaoValida: true,
      perguntarMotivo: false,
      penaliza: false,
      mensagem:
        doAluno.length === 1
          ? 'Fizeste 1 registo no KitchenFlow.'
          : `Fizeste ${doAluno.length} registos no KitchenFlow.`,
    };
  }

  // Não fez nenhum. Havia alguma coisa por fazer?
  const havia = aindaPorFazer.length > 0;

  return {
    fezAlgum: false,
    quantosFez: 0,
    aindaPorFazer,
    justificacaoValida: !havia,
    perguntarMotivo: havia,
    penaliza: havia,
    mensagem: havia
      ? `Não fizeste nenhum registo, e ainda faltava registar: ${aindaPorFazer.join(', ')}.`
      : 'Não fizeste registos, mas os teus colegas já tinham feito todos. Não conta contra ti.',
  };
}

/**
 * Confronta o motivo dado pelo aluno com o que os dados mostram.
 * Não serve para o apanhar em falso — serve para não penalizar quem
 * tem razão e para dar ao professor um sinal quando há divergência.
 */
export function avaliarMotivo(
  motivo: MotivoSemRegisto,
  v: VerificacaoRegistos
): { aceite: boolean; nota: string } {
  if (motivo === 'ja_estavam_feitos') {
    return v.justificacaoValida
      ? { aceite: true, nota: 'Confirmado: já não havia registos por fazer.' }
      : {
          aceite: false,
          nota: `Ainda estava por registar: ${v.aindaPorFazer.join(', ')}.`,
        };
  }
  if (motivo === 'nao_sabia_fazer') {
    return { aceite: true, nota: 'Precisa de apoio no KitchenFlow — dizer ao professor.' };
  }
  return { aceite: false, nota: 'Sem justificação nos dados.' };
}

/**
 * Situação acumulada ao longo da UC. É aqui que se vê quem se esquiva:
 * numa aula pode não ter dado jeito, em doze aparece.
 */
export interface SituacaoUC {
  aulas: number;
  aulasComRegisto: number;
  aulasSemOportunidade: number;
  totalRegistos: number;
  tiposDiferentes: string[];
  /** Aulas em que havia por registar e não registou. */
  falhas: number;
  emDivida: boolean;
}

export function situacaoNaUC(
  alunoId: string,
  aulas: { exigidos: string[]; registos: RegistoKF[] }[]
): SituacaoUC {
  let comRegisto = 0, semOportunidade = 0, total = 0, falhas = 0;
  const tipos = new Set<string>();

  for (const a of aulas) {
    const v = verificarRegistos(alunoId, a.exigidos, a.registos);
    if (v.fezAlgum) {
      comRegisto++;
      total += v.quantosFez;
      a.registos
        .filter(r => r.alunoId === alunoId && ehRegistoIndividual(r.tipo))
        .forEach(r => tipos.add(r.tipo));
    } else if (v.justificacaoValida) {
      semOportunidade++;
    } else {
      falhas++;
    }
  }

  return {
    aulas: aulas.length,
    aulasComRegisto: comRegisto,
    aulasSemOportunidade: semOportunidade,
    totalRegistos: total,
    tiposDiferentes: [...tipos],
    falhas,
    // Falhar mais de uma vez já é padrão, não acaso.
    emDivida: falhas > 1,
  };
}

/** Frase para o aluno ver no painel, sem tom acusatório. */
export function resumoParaAluno(s: SituacaoUC): string {
  if (s.aulas === 0) return 'Ainda não houve aulas com registos.';
  if (s.falhas === 0) {
    return `Registaste em ${s.aulasComRegisto} de ${s.aulas} aulas. ${
      s.tiposDiferentes.length
    } tipos diferentes.`;
  }
  return `Registaste em ${s.aulasComRegisto} de ${s.aulas} aulas. Em ${s.falhas} havia registos por fazer e não fizeste nenhum.`;
}


// ============================================================
// entradaNaAula
// ============================================================
// ============================================================
// Entrada na aula — atraso e obrigatórias.
//
// Quando o aluno abre o plano de aula, a app regista a hora e compara
// com o horário. O atraso conta para a ATI-001 (Responsabilidade).
//
// As três obrigatórias são avaliadas em TODAS as aulas, práticas e
// teóricas, porque são fundamentais:
//   ATI-003  Apresentação pessoal
//   ATI-016  Higiene e segurança alimentar
//   ATI-017  Segurança e saúde no trabalho
//
// O ecrã de entrada tem de ser rápido: um aluno cumpridor não pode
// perder tempo a declarar que está tudo bem. Por isso a resposta
// normal é um toque — "está tudo em ordem" — e só quem tem algo fora
// do sítio é que abre o detalhe.
// ============================================================

/** As três atitudes avaliadas em todas as aulas. */
export const OBRIGATORIAS_SEMPRE = ['ATI-003', 'ATI-016', 'ATI-017'] as const;

/** O atraso conta aqui. */
export const ATITUDE_PONTUALIDADE = 'ATI-001';

/** Minutos de tolerância antes de contar como atraso. */
export const TOLERANCIA_MINUTOS = 5;

export type GrauAtraso = 'a_horas' | 'tolerancia' | 'atrasado' | 'muito_atrasado';

export interface Atraso {
  minutos: number;
  grau: GrauAtraso;
  /** Desconto a aplicar ao nível da ATI-001 nesta aula. */
  descontoNivel: number;
  mensagem: string;
}

/** Compara a hora de entrada com o início da aula. */
export function calcularAtraso(
  horaInicioAula: string,   // "14:00"
  horaEntrada: Date = new Date()
): Atraso {
  const [h, m] = horaInicioAula.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) {
    return { minutos: 0, grau: 'a_horas', descontoNivel: 0, mensagem: '' };
  }

  const inicio = new Date(horaEntrada);
  inicio.setHours(h, m, 0, 0);
  const minutos = Math.round((horaEntrada.getTime() - inicio.getTime()) / 60000);

  if (minutos <= 0) {
    return { minutos: 0, grau: 'a_horas', descontoNivel: 0, mensagem: 'Chegaste a horas.' };
  }
  if (minutos <= TOLERANCIA_MINUTOS) {
    return {
      minutos,
      grau: 'tolerancia',
      descontoNivel: 0,
      mensagem: `Entraste ${minutos} min depois, dentro da tolerância.`,
    };
  }
  if (minutos <= 20) {
    return {
      minutos,
      grau: 'atrasado',
      descontoNivel: 1,
      mensagem: `Chegaste ${minutos} min atrasado/a. Conta na responsabilidade.`,
    };
  }
  return {
    minutos,
    grau: 'muito_atrasado',
    descontoNivel: 2,
    mensagem: `Chegaste ${minutos} min atrasado/a.`,
  };
}

// ── Verificação rápida das obrigatórias ───────────────────────

export interface ItemObrigatorio {
  atitudeId: string;
  label: string;
  /** O que o aluno confirma com um toque. */
  confirmacao: string;
}

/** Aula prática: fardamento, higiene, segurança. */
export const OBRIGATORIAS_PRATICA: ItemObrigatorio[] = [
  {
    atitudeId: 'ATI-003',
    label: 'Apresentação',
    confirmacao: 'Farda completa, cabelo preso, sem adornos, unhas curtas',
  },
  {
    atitudeId: 'ATI-016',
    label: 'Higiene alimentar',
    confirmacao: 'Mãos lavadas e bancada higienizada antes de começar',
  },
  {
    atitudeId: 'ATI-017',
    label: 'Segurança',
    confirmacao: 'Calçado de segurança e postura de trabalho seguras',
  },
];

/** Aula teórica: não há bancada nem farda de cozinha, mas continua a
 *  haver apresentação, higiene e segurança — noutro registo. */
export const OBRIGATORIAS_TEORICA: ItemObrigatorio[] = [
  {
    atitudeId: 'ATI-003',
    label: 'Apresentação',
    confirmacao: 'Apresentação cuidada e material da aula comigo',
  },
  {
    atitudeId: 'ATI-016',
    label: 'Higiene alimentar',
    confirmacao: 'Sei as regras de higiene que se aplicam ao que vamos tratar',
  },
  {
    atitudeId: 'ATI-017',
    label: 'Segurança',
    confirmacao: 'Espaço de trabalho arrumado e sem riscos',
  },
];

export function obrigatoriasDaAula(tipo: 'pratico' | 'misto' | 'teorico'): ItemObrigatorio[] {
  return tipo === 'teorico' ? OBRIGATORIAS_TEORICA : OBRIGATORIAS_PRATICA;
}

export interface EntradaNaAula {
  alunoId: string;
  planoAulaId: string;
  horaEntrada: string;
  atraso: Atraso;
  /** true = "está tudo em ordem", o caminho de um toque. */
  tudoEmOrdem: boolean;
  /** Só preenchido quando o aluno diz que algo não está bem. */
  ressalvas?: { atitudeId: string; nota: string }[];
}

/**
 * Níveis a atribuir às obrigatórias e à responsabilidade.
 * Quem confirma tudo fica em 4 — cumpriu o que era esperado. O 5 é do
 * professor, para quem foi além (alertou um colega, corrigiu um risco).
 */
export function niveisDaEntrada(e: EntradaNaAula, tipo: 'pratico' | 'misto' | 'teorico'):
  { atitudeId: string; nivel: number; origem: string }[] {
  const itens = obrigatoriasDaAula(tipo);
  const ressalvas = new Map((e.ressalvas ?? []).map(r => [r.atitudeId, r.nota]));

  const niveis = itens.map(i => ({
    atitudeId: i.atitudeId,
    nivel: ressalvas.has(i.atitudeId) ? 2 : 4,
    origem: ressalvas.has(i.atitudeId) ? `Ressalva: ${ressalvas.get(i.atitudeId)}` : 'Confirmado à entrada',
  }));

  // Responsabilidade: parte de 4 e desce com o atraso.
  niveis.push({
    atitudeId: ATITUDE_PONTUALIDADE,
    nivel: Math.max(1, 4 - e.atraso.descontoNivel),
    origem: e.atraso.grau === 'a_horas' ? 'A horas' : e.atraso.mensagem,
  });

  return niveis;
}

/** Resumo curto para o aluno ver depois de entrar. */
export function resumoEntrada(e: EntradaNaAula): string {
  const partes: string[] = [];
  if (e.atraso.mensagem) partes.push(e.atraso.mensagem);
  if (e.tudoEmOrdem) partes.push('Confirmaste que está tudo em ordem.');
  else if (e.ressalvas?.length) partes.push(`Assinalaste ${e.ressalvas.length} ponto(s) a corrigir.`);
  return partes.join(' ');
}

// ============================================================
// Registo de entradas para o professor
// ============================================================
// O professor abre o plano de aula e vê logo quem chegou atrasado e
// quem entrou com alguma coisa em falta. Sem ter de perguntar nem de
// andar a verificar aluno a aluno.

export interface LinhaEntrada {
  alunoId: string;
  nome: string;
  horaEntrada?: string;
  atrasoMin: number;
  /** Atitudes em que o aluno assinalou uma falha à entrada. */
  ressalvas: string[];
  /** true se assumiu a falha por iniciativa própria (conta na ATI-001). */
  assumiu: boolean;
  naoEntrou: boolean;
}

export interface ResumoEntradas {
  linhas: LinhaEntrada[];
  aHoras: number;
  atrasados: number;
  comRessalva: number;
  naoEntraram: number;
}

export function resumoEntradasDoPlano(
  alunos: { id: string; nome?: string; numero: number }[],
  entradas: EntradaNaAula[]
): ResumoEntradas {
  const porAluno = new Map(entradas.map(e => [e.alunoId, e]));

  const linhas: LinhaEntrada[] = [...alunos]
    .sort((a, b) => a.numero - b.numero)
    .map(al => {
      const e = porAluno.get(al.id);
      const ressalvas = (e?.ressalvas ?? []).map(r => r.nota);
      return {
        alunoId: al.id,
        nome: al.nome ?? `Aluno ${al.numero}`,
        horaEntrada: e?.horaEntrada,
        atrasoMin: e?.atraso.minutos ?? 0,
        ressalvas,
        assumiu: ressalvas.length > 0,
        naoEntrou: !e,
      };
    });

  return {
    linhas,
    aHoras: linhas.filter(l => !l.naoEntrou && l.atrasoMin <= TOLERANCIA_MINUTOS).length,
    atrasados: linhas.filter(l => l.atrasoMin > TOLERANCIA_MINUTOS).length,
    comRessalva: linhas.filter(l => l.ressalvas.length > 0).length,
    naoEntraram: linhas.filter(l => l.naoEntrou).length,
  };
}

/** Nota da ATI-001 tendo em conta atraso e se assumiu a falha.
 *  Assumir vale: quem assume fica em 3, quem esconde e é corrigido fica em 1. */
export function nivelResponsabilidade(
  atraso: Atraso,
  assumiuFalha: boolean,
  falhaDetetadaPeloProfessor: boolean
): { nivel: number; motivo: string } {
  if (falhaDetetadaPeloProfessor && !assumiuFalha) {
    return { nivel: 1, motivo: 'Disse que estava tudo em ordem e não estava.' };
  }
  const base = Math.max(1, 4 - atraso.descontoNivel);
  if (assumiuFalha) {
    return {
      nivel: Math.max(3, base),
      motivo: 'Assumiu a falha à entrada — é a atitude que se pede.',
    };
  }
  return { nivel: base, motivo: atraso.grau === 'a_horas' ? 'A horas, tudo em ordem.' : atraso.mensagem };
}

// ============================================================
// Estados de competência — linguagem única em toda a aplicação
// ============================================================
// Os mesmos quatro estados para técnicas, atitudes e responsabilidades.
// O aluno aprende um vocabulário só.

export type EstadoComp = 'por_avaliar' | 'desenvolvimento' | 'consolidado' | 'avancado';

export const LABEL_ESTADO: Record<EstadoComp, string> = {
  por_avaliar:     'por avaliar',
  desenvolvimento: 'em desenvolvimento',
  consolidado:     'consolidada',
  avancado:        'em nível avançado',
};

export function estadoDoNivel(nivel?: number | null): EstadoComp {
  if (nivel == null || nivel === 0) return 'por_avaliar';
  if (nivel <= 2) return 'desenvolvimento';
  if (nivel <= 4) return 'consolidado';
  return 'avancado';
}

export interface CompComEstado {
  id: string;
  nome: string;
  nivel?: number | null;
  estado: EstadoComp;
}

/** Agrupa competências por estado, na ordem em que se mostram ao aluno:
 *  primeiro o que tem de fazer hoje, depois o que já domina, e só no
 *  fim o que falta. Abrir o ecrã com as falhas à frente desanima. */
export const ORDEM_ESTADOS: EstadoComp[] = [
  'por_avaliar', 'avancado', 'consolidado', 'desenvolvimento',
];

export function agruparPorEstado(
  comps: { id: string; nome: string; nivel?: number | null }[]
): { estado: EstadoComp; itens: CompComEstado[] }[] {
  const mapa = new Map<EstadoComp, CompComEstado[]>();
  for (const c of comps) {
    const estado = estadoDoNivel(c.nivel);
    if (!mapa.has(estado)) mapa.set(estado, []);
    mapa.get(estado)!.push({ ...c, estado });
  }
  return ORDEM_ESTADOS
    .filter(e => mapa.has(e))
    .map(e => ({ estado: e, itens: mapa.get(e)! }));
}

/** Frase completa para o cabeçalho de um grupo. Nunca um número solto. */
export function tituloGrupo(estado: EstadoComp, n: number, substantivo = 'competência'): string {
  const plural = n !== 1;
  const nome = plural ? `${substantivo}s` : substantivo;
  switch (estado) {
    case 'por_avaliar':     return `${n} ${nome} por avaliar hoje`;
    case 'avancado':        return `${n} ${nome} em nível avançado`;
    case 'consolidado':     return `${n} ${nome} consolidada${plural ? 's' : ''}`;
    case 'desenvolvimento': return `${n} ${nome} em desenvolvimento`;
  }
}

/** Pontos fortes e áreas a desenvolver — o perfil profissional. */
export function perfilProfissional(
  comps: { id: string; nome: string; nivel?: number | null }[]
): { fortes: CompComEstado[]; aDesenvolver: CompComEstado[] } {
  const com = comps
    .filter(c => c.nivel != null && c.nivel > 0)
    .map(c => ({ ...c, estado: estadoDoNivel(c.nivel) }));
  return {
    fortes: com.filter(c => c.estado === 'avancado' || (c.nivel ?? 0) === 4),
    aDesenvolver: com.filter(c => c.estado === 'desenvolvimento'),
  };
}

// ============================================================
// Penalização por falhas de fardamento
// ============================================================
// A média não servia: uma falha numa UC de 8 aulas tirava 0,13 valores
// a um aluno de 20. Quatro esquecimentos ao longo do ano não mexiam na
// nota final. Um teto por escalões era o extremo oposto — 4 valores por
// um esquecimento isolado.
//
// A redução é proporcional: a percentagem de aulas com falha corta a
// mesma percentagem da nota. Uma falha em 8 aulas são 12,5% — o aluno
// de 20 fica com 17,5.
//
// Ajusta-se sozinha ao tamanho da UC: numa UC curta cada aula pesa mais,
// e a matemática trata disso sem escalões.

/** Gravidade de um item em falta, pela consequência prática. */
export type GravidadeItem = 'impede' | 'risco' | 'resolve';

export const GRAVIDADE_FARDA: Record<string, GravidadeItem> = {
  farda:   'impede',   // sem isto não entra na cozinha
  avental: 'impede',
  sapatos: 'risco',    // produz, mas com risco
  unhas:   'risco',
  touca:   'resolve',  // touca descartável e está resolvido
  cabelo:  'resolve',
  fones:   'resolve',
  maos:    'resolve',
};

/** Nota da OBR_01 nesta aula, pela consequência do que falta. */
export function nivelFardamento(itensEmFalta: string[]): {
  nivel: number; podeProduzir: boolean; gravidade: GravidadeItem | null;
} {
  if (itensEmFalta.length === 0) {
    return { nivel: 5, podeProduzir: true, gravidade: null };
  }
  const graus = itensEmFalta.map(i => GRAVIDADE_FARDA[i] ?? 'resolve');
  if (graus.includes('impede')) {
    return { nivel: 1, podeProduzir: false, gravidade: 'impede' };
  }
  if (graus.includes('risco')) {
    return { nivel: 2, podeProduzir: true, gravidade: 'risco' };
  }
  return { nivel: Math.max(1, 4 - itensEmFalta.length), podeProduzir: true, gravidade: 'resolve' };
}

export interface PenalizacaoFarda {
  falhas: number;
  aulas: number;
  percentagem: number;
  notaAntes: number;
  notaDepois: number;
  perdeu: number;
  mensagem: string;
}

/**
 * Aplica a redução proporcional à nota de uma UC.
 * @param nota    nota base 0-20 da UC
 * @param falhas  aulas dessa UC em que entrou sem a farda completa
 * @param aulas   total de aulas práticas da UC
 */
export function penalizarFardamento(
  nota: number, falhas: number, aulas: number
): PenalizacaoFarda {
  if (aulas <= 0 || falhas <= 0) {
    return {
      falhas, aulas, percentagem: 0,
      notaAntes: nota, notaDepois: nota, perdeu: 0,
      mensagem: '',
    };
  }
  const pct = Math.min(1, falhas / aulas);
  const depois = Math.round(nota * (1 - pct) * 100) / 100;
  const pctTexto = (pct * 100).toFixed(1).replace('.', ',').replace(',0', '');

  return {
    falhas, aulas, percentagem: pct,
    notaAntes: nota,
    notaDepois: depois,
    perdeu: Math.round((nota - depois) * 100) / 100,
    mensagem:
      `Entraste sem a farda completa em ${falhas} de ${aulas} aulas — ${pctTexto}%. `
      + `A tua nota desce ${pctTexto}%, de ${nota.toFixed(1).replace('.', ',')} `
      + `para ${depois.toFixed(1).replace('.', ',')}.`,
  };
}

/** Aviso ao aluno antes de a nota sair, para não ser surpresa. */
export function avisoFardamento(falhas: number, aulas: number): string | null {
  if (falhas === 0 || aulas === 0) return null;
  const pct = Math.round((falhas / aulas) * 100);
  if (falhas === 1) {
    return `Já entraste uma vez sem a farda completa nesta unidade. `
         + `Isso desce a tua nota em ${pct}%.`;
  }
  return `Já entraste ${falhas} vezes sem a farda completa em ${aulas} aulas. `
       + `Isso desce a tua nota em ${pct}%.`;
}

// ============================================================
// Aula sem farda — o que pode e não pode ser avaliado
// ============================================================
// O aluno está na aula mas não entra na cozinha. Não é falta, mas
// também não é uma aula normal:
//
//   TÉCNICAS ....... sem nota. Não é zero — é não avaliável. Não se
//                    pode dar nota a quem não teve como produzir.
//   CONHECIMENTOS .. avaliáveis, se o professor lhe der trabalho. Pode
//                    recuperar parte dos 20% com uma tarefa a partir
//                    da ficha técnica.
//   ATITUDES ....... só as que não dependem da produção. A maioria são
//                    verificáveis em prática, e sem prática não há
//                    observação — logo não há nota.
//
// O aluno TEM de ser avisado antes de se autoavaliar: se pudesse
// dar-se 5 em "organização do espaço de trabalho" sem ter estado na
// bancada, a autoavaliação deixava de valer nada.

/** Atitudes observáveis sem o aluno estar a produzir. */
export const ATITUDES_SEM_PRODUCAO = [
  'ATI-001', // responsabilidade — assumiu a falha ou não
  'ATI-005', // autocontrolo
  'ATI-006', // assertividade
  'ATI-007', // empatia
  'ATI-008', // escuta ativa
  'ATI-013', // disponibilidade para aprender
  'ATI-018', // sensibilidade e bem-estar dos outros
  'ATI-021', // sentido crítico
  'ATI-022', // respeito pelas diferenças
];

/** Estas só se observam com o aluno a trabalhar na cozinha. */
export function atitudeExigeProducao(id: string): boolean {
  return !ATITUDES_SEM_PRODUCAO.includes(id);
}

export interface RestricoesSemFarda {
  podeProduzir: boolean;
  tecnicasAvaliaveis: boolean;
  conhecimentosAvaliaveis: boolean;
  atitudesAvaliaveis: string[];
  atitudesBloqueadas: string[];
  aviso: string;
}

/**
 * O que fica disponível ao aluno quando não pode entrar na cozinha.
 * @param atitudesDoPlano atitudes que estavam previstas para esta aula
 */
export function restricoesSemFarda(atitudesDoPlano: string[]): RestricoesSemFarda {
  const avaliaveis = atitudesDoPlano.filter(id => !atitudeExigeProducao(id));
  const bloqueadas = atitudesDoPlano.filter(atitudeExigeProducao);

  return {
    podeProduzir: false,
    tecnicasAvaliaveis: false,
    conhecimentosAvaliaveis: true,
    atitudesAvaliaveis: avaliaveis,
    atitudesBloqueadas: bloqueadas,
    aviso:
      'Sem a farda completa não podes entrar na cozinha, por isso hoje não há '
      + 'nota nas técnicas — não é zero, é que não houve como avaliar.\n\n'
      + (bloqueadas.length
          ? `Também não podes avaliar-te em ${bloqueadas.length} atitude`
            + `${bloqueadas.length > 1 ? 's' : ''}, porque só se observam com o `
            + 'trabalho na bancada.\n\n'
          : '')
      + 'Podes recuperar parte da aula: fala com o professor sobre um trabalho '
      + 'a partir da ficha técnica de hoje.',
  };
}

/** Nota da aula quando o aluno não produziu. As técnicas saem da conta
 *  em vez de contarem como zero, e o peso reparte-se pelo resto. */
export function notaAulaSemProducao(
  obr: number, knw: number | null, ati: number
): { nota20: number; pesos: Record<string, number> } {
  const P = { OBR: 0.20, KNW: 0.20, ATI: 0.20 };
  const usados: Record<string, number> = { OBR: P.OBR, ATI: P.ATI };
  if (knw != null) usados.KNW = P.KNW;

  const total = Object.values(usados).reduce((a, b) => a + b, 0);
  const soma = usados.OBR * obr + usados.ATI * ati + (knw != null ? usados.KNW * knw : 0);

  return {
    nota20: Math.round((soma / total) * 4 * 100) / 100,
    pesos: Object.fromEntries(
      Object.entries(usados).map(([k, v]) => [k, Math.round((v / total) * 100)])
    ),
  };
}

// ============================================================
// Falhas → atitudes
// ============================================================
// Princípio: uma falha nunca é uma categoria à parte. Traduz-se sempre
// numa atitude, porque é isso que ela é. Chegar tarde é responsabilidade.
// Vir sem farda é apresentação pessoal. Não fazer registos é higiene e
// segurança alimentar.
//
// Assim não há penalizações soltas espalhadas pelo sistema: tudo entra
// pelo mesmo sítio, com o mesmo peso, e o aluno percebe porquê.
//
// Nota sobre o mínimo: a escala é 1-5, e 1 é o mínimo — equivale a 4/20.
// Não há zero na escala das competências.

export const NIVEL_MINIMO = 1;

export type TipoFalha =
  | 'atraso'
  | 'farda_impede'      // farda, avental ou sapatos — não entra na cozinha
  | 'farda_leve'        // touca, cabelo, adornos — resolve-se na hora
  | 'sem_registos_kf'
  | 'falha_nao_assumida';

export interface EfeitoFalha {
  atitudeId: string;
  nivel: number;
  /** Se definido, a atitude não pode subir acima disto nesta aula. */
  teto?: number;
  motivo: string;
}

export function efeitosDaFalha(tipo: TipoFalha, minutosAtraso = 0): EfeitoFalha[] {
  switch (tipo) {
    case 'atraso':
      return [{
        atitudeId: 'ATI-001',
        nivel: minutosAtraso >= 20 ? 2 : 3,
        teto: 3,
        motivo: `Chegou ${minutosAtraso} min atrasado.`,
      }];

    case 'farda_impede':
      // Não entrou na cozinha. A apresentação vai ao mínimo e a
      // responsabilidade não pode ser alta: não trazer a farda é, em si,
      // uma falha de responsabilidade.
      return [
        {
          atitudeId: 'ATI-003',
          nivel: NIVEL_MINIMO,
          teto: NIVEL_MINIMO,
          motivo: 'Entrou sem a farda completa e não pôde produzir.',
        },
        {
          atitudeId: 'ATI-001',
          nivel: 2,
          teto: 3,
          motivo: 'Não trazer o material de trabalho é uma falha de responsabilidade.',
        },
      ];

    case 'farda_leve':
      return [{
        atitudeId: 'ATI-003',
        nivel: 2,
        teto: 3,
        motivo: 'Faltava parte da apresentação pessoal, resolvida na hora.',
      }];

    case 'sem_registos_kf':
      return [{
        atitudeId: 'ATI-016',
        nivel: 2,
        teto: 3,
        motivo: 'Não fez registos no KitchenFlow havendo registos por fazer.',
      }];

    case 'falha_nao_assumida':
      return [{
        atitudeId: 'ATI-001',
        nivel: NIVEL_MINIMO,
        teto: NIVEL_MINIMO,
        motivo: 'Declarou que estava tudo em ordem e não estava.',
      }];
  }
}

/** Junta os efeitos de várias falhas: fica sempre o nível mais baixo. */
export function acumularEfeitos(falhas: EfeitoFalha[][]): Map<string, EfeitoFalha> {
  const mapa = new Map<string, EfeitoFalha>();
  for (const efeito of falhas.flat()) {
    const atual = mapa.get(efeito.atitudeId);
    if (!atual || efeito.nivel < atual.nivel) mapa.set(efeito.atitudeId, efeito);
  }
  return mapa;
}

/** Teto de uma atitude nesta aula, dadas as falhas registadas.
 *  Devolve null quando não há limite. */
export function tetoDaAtitude(
  atitudeId: string, efeitos: Map<string, EfeitoFalha>
): { teto: number; motivo: string } | null {
  const e = efeitos.get(atitudeId);
  return e?.teto != null ? { teto: e.teto, motivo: e.motivo } : null;
}

// ── Aulas que não exigem farda ────────────────────────────────
// Nem toda a aula prática exige farda. Uma aula na cozinha a fazer
// prova de produtos, uma visita, uma aula teórico-prática na sala —
// o professor marca isso no plano e nada disto se aplica.

export function exigeFarda(plano: { tipoPlanAula?: string; exigeFarda?: boolean }): boolean {
  if (plano.exigeFarda != null) return plano.exigeFarda;
  return plano.tipoPlanAula !== 'teorico';
}

// ============================================================
// O que o aluno vê no "Avaliar-me"
// ============================================================
// REGRA:
//   Sem ficha técnica nem trabalho no plano → aparece o referencial
//   inteiro da UC: realizações, conhecimentos e atitudes. É o que a
//   aplicação assume estar a ser trabalhado.
//
//   Com ficha técnica ou trabalho → triagem, pelas regras já definidas:
//   competências da ficha, atitude do trimestre, recuperação, escolha
//   do aluno.
//
// NÃO se mostram os resultados esperados dos perfis técnicos
// ("Fundo limpo, aromático e sem amargor"). Isso é o resultado de uma
// prática, não uma competência. As subtécnicas e os critérios são a
// árvore que se abre ao avaliar uma competência concreta — não a lista
// que o aluno vê à entrada.

export type BlocoCompetencia = 'realizacoes' | 'conhecimentos' | 'atitudes';

export const LABEL_BLOCO: Record<BlocoCompetencia, string> = {
  realizacoes:   'O que vou saber fazer',
  conhecimentos: 'O que vou saber',
  atitudes:      'Como me vou comportar',
};

export const SUBSTANTIVO_BLOCO: Record<BlocoCompetencia, string> = {
  realizacoes:   'competência',
  conhecimentos: 'conhecimento',
  atitudes:      'atitude',
};

export interface ItemAvaliavel {
  id: string;
  nome: string;
  bloco: BlocoCompetencia;
  nivel?: number | null;
  /** true quando entrou por uma ficha técnica ou trabalho deste plano. */
  doPlano?: boolean;
}

export interface ConteudoUC {
  realizacoes: ItemAvaliavel[];
  conhecimentos: ItemAvaliavel[];
  atitudes: ItemAvaliavel[];
  /** false = referencial inteiro; true = triado pela ficha/trabalho. */
  triado: boolean;
}

interface RefUC {
  nome?: string;
  realizacoes?: string[];
  conhecimentos?: string[];
  criteriosDesempenho?: string[];
  atitudes?: string[];
}

/**
 * Monta o que o aluno vê. Sem ficha nem trabalho, devolve o referencial
 * completo; com eles, devolve só o que foi selecionado.
 *
 * @param ref           referencial da UC (getReferencialUC)
 * @param niveis        níveis já consolidados, por id
 * @param idsDaFicha    competências trazidas pela ficha/trabalho, se houver
 * @param atitudesAno   atitudes disponíveis para o ano do aluno
 */
export function conteudoParaAvaliar(
  ref: RefUC | undefined,
  niveis: Map<string, number>,
  idsDaFicha: string[] | null,
  atitudesAno: { id: string; nome: string }[]
): ConteudoUC {
  const triado = Array.isArray(idsDaFicha) && idsDaFicha.length > 0;

  const mk = (
    textos: string[], bloco: BlocoCompetencia, prefixo: string
  ): ItemAvaliavel[] =>
    textos.map((t, i) => {
      const id = `${prefixo}-${String(i + 1).padStart(2, '0')}`;
      return { id, nome: t, bloco, nivel: niveis.get(id) ?? null };
    });

  const realizacoes = mk(ref?.realizacoes ?? [], 'realizacoes', 'REA');
  // Os conhecimentos do referencial são a lista `conhecimentos`; quando
  // não existe, os critérios de desempenho fazem esse papel.
  const conhecimentos = mk(
    (ref?.conhecimentos?.length ? ref.conhecimentos : ref?.criteriosDesempenho) ?? [],
    'conhecimentos', 'CON'
  );

  const atitudes: ItemAvaliavel[] = atitudesAno.map(a => ({
    id: a.id, nome: a.nome, bloco: 'atitudes', nivel: niveis.get(a.id) ?? null,
  }));

  if (!triado) return { realizacoes, conhecimentos, atitudes, triado: false };

  const dentro = new Set(idsDaFicha!);
  const marcar = (its: ItemAvaliavel[]) =>
    its.filter(i => dentro.has(i.id)).map(i => ({ ...i, doPlano: true }));

  return {
    realizacoes: marcar(realizacoes),
    conhecimentos: marcar(conhecimentos),
    atitudes: marcar(atitudes),
    triado: true,
  };
}

/** Contagem por estado, para os cartões do ecrã. */
export function contarPorEstado(itens: ItemAvaliavel[]): Record<EstadoComp, number> {
  const c: Record<EstadoComp, number> = {
    por_avaliar: 0, desenvolvimento: 0, consolidado: 0, avancado: 0,
  };
  for (const i of itens) c[estadoDoNivel(i.nivel)]++;
  return c;
}

// ============================================================
// Triagem automática: ficha/trabalho → realização do referencial
// ============================================================
// Numa UC com 5 realizações e 3 fichas, o sistema tem de saber qual
// ficha pertence a qual realização — senão o aluno vê todas debaixo de
// todas, que é o oposto do que queremos.
//
// A app propõe, o professor confirma. Não é o professor a preencher
// um campo por ficha: é a aplicação a fazer o trabalho e ele a validar.
//
// Repara no caso "Elaborar fichas técnicas": é uma realização que se
// trabalha numa aula teórica, com um trabalho escrito, não numa
// produção. A triagem tem de apanhar isso.

const PARAR = new Set([
  'de','da','do','das','dos','e','a','o','as','os','em','para','com','por',
  'um','uma','uns','umas','no','na','nos','nas','ao','aos','à','às','seus',
  'suas','que','se','sua','seu',
]);

function palavras(txt: string): string[] {
  return txt
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(p => p.length > 3 && !PARAR.has(p))
    .map(raiz);
}

/** Corta sufixos para "conservação", "conservar" e "conservados" darem
 *  a mesma raiz. Sem isto o sistema vê três palavras diferentes onde
 *  há uma só ideia — foi o que fez "conservação de fundos" cair na
 *  realização das confeções em vez da conservação. */
function raiz(p: string): string {
  let r = p
    .replace(/(coes|cao)$/, 'c')        // conservação/conservações → conservac
    .replace(/(mentos|mento)$/, 'm')     // acondicionamento → acondicionam
    .replace(/(adas|ados|ada|ado)$/, '') // preparados → prepar
    .replace(/(ando|endo|indo)$/, '')
    .replace(/(ar|er|ir)$/, '')          // conservar → conserv
    .replace(/(oes|aes|ais|eis|is|as|os|es|s)$/, '');
  return r.length >= 4 ? r.slice(0, 8) : p.slice(0, 8);
}

/** Palavras que identificam uma realização, com peso a dobrar.
 *  Uma ficha de conservação e uma de confeção partilham "fundo" — o que
 *  as distingue é o verbo da ação, não o produto. */
const CHAVES: Record<string, string[]> = {
  elaborar:     ['ficha', 'custo', 'rendiment', 'calcul', 'planific', 'document'],
  mise:         ['mise', 'place', 'prepar previa', 'cort', 'pes', 'organiz'],
  confecionar:  ['confec', 'cozinh', 'cozer', 'assar', 'refog', 'saltear', 'reduz',
                 'ligar', 'roux', 'escum', 'coar', 'emulsion'],
  acondicionar: ['acondicion', 'conserv', 'arrefec', 'etiquet', 'vacuo', 'refrigera',
                 'congel', 'armazen', 'validad', 'rotul'],
};

/** Palavras-chave presentes numa realização. */
function chavesDa(texto: string): string[] {
  const ps = palavras(texto);
  const encontradas: string[] = [];
  for (const grupo of Object.values(CHAVES)) {
    for (const k of grupo) {
      if (ps.some(p => p.startsWith(k.slice(0, 6)))) encontradas.push(k);
    }
  }
  return encontradas;
}

/** Realizações que se trabalham fora da bancada. */
const REALIZACAO_TEORICA = ['ficha tecnica', 'fichas tecnicas', 'planificar', 'calcular', 'custo'];

export function realizacaoEhTeorica(texto: string): boolean {
  const t = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return REALIZACAO_TEORICA.some(k => t.includes(k));
}

export interface SugestaoTriagem {
  realizacaoId: string;
  realizacao: string;
  pontuacao: number;
  /** Palavras que fizeram a ligação — para o professor perceber porquê. */
  porque: string[];
  confianca: 'alta' | 'media' | 'baixa';
}

export interface FonteTriagem {
  /** Nome do prato, ou título do trabalho. */
  nome: string;
  familia1?: string;
  familia2?: string;
  tecnicasSugeridas?: string[];
  /** Passos de preparação ou enunciado. */
  texto?: string;
  /** true quando é trabalho de conhecimento, não ficha técnica. */
  ehTrabalho?: boolean;
}

/**
 * Sugere a que realização do referencial pertence uma ficha ou trabalho.
 * Devolve por ordem de pontuação — a primeira é a proposta.
 */
export function sugerirRealizacao(
  fonte: FonteTriagem,
  realizacoes: string[],
  ucId = ''
): SugestaoTriagem[] {
  const daFonte = new Set([
    ...palavras(fonte.nome),
    ...palavras(fonte.familia1 ?? ''),
    ...palavras(fonte.familia2 ?? ''),
    ...(fonte.tecnicasSugeridas ?? []).flatMap(palavras),
    ...palavras((fonte.texto ?? '').slice(0, 600)),
  ]);

  const sugestoes = realizacoes.map((r, i) => {
    const daReal = palavras(r);
    const comuns = daReal.filter(p => daFonte.has(p));
    let pontos = comuns.length * 10;

    // Palavras-chave da ação valem a dobrar: o que distingue conservar
    // de confecionar não é o produto, é o verbo.
    const chavesReal = chavesDa(r);
    const textoFonte = [
      fonte.nome, fonte.familia1 ?? '', fonte.familia2 ?? '',
      ...(fonte.tecnicasSugeridas ?? []), (fonte.texto ?? '').slice(0, 600),
    ].join(' ');
    const chavesFonte = chavesDa(textoFonte);
    const chavesComuns = chavesReal.filter(k => chavesFonte.includes(k));
    pontos += chavesComuns.length * 20;

    // Uma ficha técnica não trabalha uma realização teórica, e vice-versa.
    const teorica = realizacaoEhTeorica(r);
    if (teorica && !fonte.ehTrabalho) pontos -= 25;
    if (teorica && fonte.ehTrabalho) pontos += 20;
    if (!teorica && fonte.ehTrabalho) pontos -= 10;

    // O nome do prato pesa mais do que o texto solto.
    const noNome = palavras(fonte.nome).filter(p => daReal.includes(p));
    pontos += noNome.length * 8;

    return {
      realizacaoId: `${ucId}_R${i + 1}`,
      realizacao: r.replace(/\.$/, ''),
      pontuacao: pontos,
      porque: [...new Set([...chavesComuns, ...comuns])],
      confianca: 'baixa' as SugestaoTriagem['confianca'],
    };
  });

  const ord = sugestoes.sort((a, b) => b.pontuacao - a.pontuacao);

  // A confiança não pode vir só da pontuação absoluta: uma ficha de
  // fundos só partilha a palavra "fundo" com a realização certa, e isso
  // basta. O que conta é a distância para a segunda hipótese — se a
  // primeira está claramente à frente, a proposta é boa.
  const [p, s] = [ord[0]?.pontuacao ?? 0, ord[1]?.pontuacao ?? 0];
  if (ord[0]) {
    const margem = p - s;
    ord[0].confianca = p <= 0 ? 'baixa'
                     : (p >= 30 || margem >= 15) ? 'alta'
                     : (p >= 10 || margem >= 8) ? 'media'
                     : 'baixa';
  }
  return ord;
}

/** Texto para o professor confirmar a proposta. */
export function textoSugestao(s: SugestaoTriagem): string {
  if (s.confianca === 'baixa') {
    return 'Não consegui perceber a que realização isto pertence. Escolhe tu.';
  }
  const p = s.porque.slice(0, 3).join(', ');
  return `Proponho "${s.realizacao}"${p ? ` — por causa de: ${p}` : ''}. Confirmas?`;
}

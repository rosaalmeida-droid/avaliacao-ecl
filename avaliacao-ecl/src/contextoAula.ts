// ============================================================
// Como é esta aula — a triagem que o professor faz no plano
// ============================================================
// As perguntas da autoavaliação só fazem sentido se a aula as pedir
// (Rosa, out/2026): «Hoje, a trabalhar com a tua equipa…» numa aula sem
// equipas, ou «no fim da aula, arrumei…» numa visita de estudo, fazem o
// aluno responder para despachar. O professor diz, em quatro perguntas,
// como é a aula; daqui sai o que se pergunta e o que se avalia.
// ============================================================

export type OndeAula = 'cozinha' | 'sala' | 'fora';
export type TrabalhoAula = 'grupos' | 'individual' | 'turma';
/** O tipo de aula, que o professor diz primeiro (Rosa, out/2026): é ele que
 *  decide se há farda e higiene e segurança alimentar, e os pesos da nota. */
export type TipoAula = 'pratico' | 'misto' | 'teorico' | 'atitudinal';

export interface TriagemAula {
  /** Prática, mista, teórica ou atitudinal (sem ele, deduz-se de «cozinham»). */
  tipo?: TipoAula;
  /** Numa aula atitudinal: avalia-se a farda? (prática e mista: sempre; teórica: nunca). */
  farda?: boolean;
  /** Onde é a aula: na cozinha da escola, numa sala, ou fora da escola (visita, evento). */
  onde: OndeAula;
  /** Os alunos cozinham (prática ou mista)? Acompanha o tipo. */
  cozinham: boolean;
  /** Como trabalham: em grupos (equipas), cada um sozinho, ou a turma toda junta. */
  trabalho: TrabalhoAula;
  /** Há serviço a clientes (almoço pedagógico, evento)? */
  servico: boolean;
  /** Trabalham com o manual (aula teórica com o Manual do Aluno)? */
  manual?: boolean;
  /** Teórica ou mista: como se trabalha o manual. */
  modo?: ModoTrabalho;
  /** Num trabalho (de grupo ou individual): como se apresenta. */
  formatos?: FormatoTrabalho[];
  /** (antigo) Num trabalho: hoje preparam-no, ou apresentam-no. Agora: «fases». */
  fase?: FaseTrabalho;
  /** Num trabalho: em que fase(s) está hoje (pode ser mais do que uma). */
  fases?: FaseProjeto[];
  /** Num trabalho que vem de aulas anteriores: o plano da aula anterior. */
  continuaDe?: string;
}

// ── Trabalhos sobre o manual (Rosa, out/2026) ─────────────────
// Aula dada pelo professor (todos o mesmo conteúdo), trabalho de grupo
// (cada grupo investiga um tema) ou trabalho individual (cada aluno escolhe
// um tema do manual para defender). No trabalho, o aluno diz na
// autoavaliação o tema que escolheu, e avalia-se também no formato.
export type ModoTrabalho = 'professor' | 'grupo' | 'individual';
export type FormatoTrabalho = 'escrito' | 'oral' | 'digital' | 'pratico';
export const TEXTO_MODO: Record<ModoTrabalho, string> = {
  professor: 'Aula dada por mim (todos o mesmo conteúdo)',
  grupo: 'Trabalho de grupo (cada grupo um tema)',
  individual: 'Trabalho individual (cada aluno escolhe o tema)',
};
export const TEXTO_FORMATO: Record<FormatoTrabalho, string> = {
  escrito: 'Escrito', oral: 'Apresentação oral', digital: 'Digital (apresentação, vídeo…)', pratico: 'Prático (demonstração)',
};
/** O aluno escolhe o tema (um conteúdo do manual) na autoavaliação. */
export const escolheTema = (t: TriagemAula | null) => !!t && (t.modo === 'grupo' || t.modo === 'individual');

// Um trabalho tem várias aulas: primeiro prepara-se, depois apresenta-se.
// Numa aula de preparação não se avalia a apresentação oral, que ainda não
// aconteceu (Rosa, out/2026).
export type FaseTrabalho = 'preparar' | 'apresentar';
export const TEXTO_FASE: Record<FaseTrabalho, string> = {
  preparar: 'Hoje preparam (pesquisa e material)',
  apresentar: 'Hoje apresentam e defendem',
};
export const faseDoTrabalho = (t: TriagemAula | null): FaseTrabalho => t?.fase === 'apresentar' ? 'apresentar' : 'preparar';

// ── As fases de um trabalho (Rosa, out/2026) ──────────────────
// Um trabalho ocupa várias aulas, e cada aula está numa fase: investigar,
// desenvolver, a receita e a ficha técnica, o menu, a requisição, ou a
// apresentação (escrita, oral, digital, prática). O que o aluno responde
// é o da fase em que está: na investigação não se avalia a apresentação
// oral, que ainda não aconteceu.
export type FaseProjeto = 'investigacao' | 'desenvolvimento' | 'receita' | 'menu' | 'requisicao'
  | 'apres_escrito' | 'apres_oral' | 'apres_digital' | 'apres_pratico';
export const FASES: { id: FaseProjeto; nome: string; so?: 'cozinha' }[] = [
  { id: 'investigacao', nome: 'Investigação (pesquisa sobre o tema)' },
  { id: 'desenvolvimento', nome: 'Desenvolvimento (preparar o trabalho)' },
  { id: 'receita', nome: 'Desenvolvimento da receita e ficha técnica' },
  { id: 'menu', nome: 'Criação de menu' },
  { id: 'requisicao', nome: 'Criação da requisição' },
  { id: 'apres_escrito', nome: 'Entrega do trabalho escrito' },
  { id: 'apres_oral', nome: 'Apresentação oral e defesa' },
  { id: 'apres_digital', nome: 'Apresentação digital' },
  { id: 'apres_pratico', nome: 'Apresentação prática (confeção)', so: 'cozinha' },
];
export const NOME_FASE = Object.fromEntries(FASES.map(f => [f.id, f.nome])) as Record<FaseProjeto, string>;
/** As fases da aula. Os planos de antes só tinham «preparar» ou «apresentar» e os formatos. */
export function fasesDoTrabalho(t: TriagemAula | null): FaseProjeto[] {
  if (!t || !escolheTema(t)) return [];
  if (t.fases?.length) return t.fases;
  if (t.fase === 'apresentar') return (t.formatos || []).map(f => `apres_${f}` as FaseProjeto);
  return ['investigacao', 'desenvolvimento'];
}
/** A fase que normalmente vem a seguir (para sugerir na aula seguinte). */
export function faseSeguinte(fases: FaseProjeto[]): FaseProjeto | undefined {
  const ordem = FASES.map(f => f.id);
  const ultima = Math.max(-1, ...fases.map(f => ordem.indexOf(f)));
  return ultima >= 0 && ultima < ordem.length - 1 ? ordem[ultima + 1] : undefined;
}

/** O que uma pergunta precisa que a aula tenha para fazer sentido. */
export type Requisito = 'cozinha' | 'producao' | 'equipa' | 'colegas';

export interface ContextoAula {
  /** Na cozinha da escola (bancada, farda, circuito do sujo e do limpo, arrumar). */
  cozinha: boolean;
  /** Cozinham: facas, lume, alimentos, passos de uma ficha. */
  producao: boolean;
  /** Trabalham em equipas. */
  equipa: boolean;
  /** Trabalham com os colegas (em equipas ou a turma toda junta). */
  colegas: boolean;
  servico: boolean;
  /** O professor respondeu à triagem (sem ela, o contexto é deduzido do plano). */
  definido: boolean;
}

export const TEXTO_TIPO: Record<TipoAula, string> = {
  pratico: 'Prática', misto: 'Mista', teorico: 'Teórica', atitudinal: 'Atitudinal',
};
export const EXPLICA_TIPO: Record<TipoAula, string> = {
  pratico: 'Produção na cozinha, com fichas',
  misto: 'Teoria e produção',
  teorico: 'Conhecimentos (manual)',
  atitudinal: 'Dinâmicas e atitudes',
};

/** O tipo da aula: o que o professor escolheu, ou (triagens antigas) pelo «cozinham». */
export function tipoDe(t: TriagemAula): TipoAula {
  return t.tipo || (t.cozinham ? 'pratico' : t.manual ? 'teorico' : 'atitudinal');
}

export const TEXTO_ONDE: Record<OndeAula, string> = {
  cozinha: 'Cozinha da escola', sala: 'Sala de aula', fora: 'Fora da escola',
};
export const TEXTO_TRABALHO: Record<TrabalhoAula, string> = {
  grupos: 'Em grupos', individual: 'Cada um sozinho', turma: 'A turma toda junta',
};

export function triagemDoPlano(plano: any): TriagemAula | null {
  // Sem o tipo de aula escolhido pelo professor não há triagem: a aplicação
  // não adivinha (deduzia «atitudinal» numa aula teórica — Rosa, out/2026).
  const t = plano?.triagemAula;
  return t && t.tipo && t.onde && t.trabalho ? t as TriagemAula : null;
}

/**
 * O contexto da aula. Com a triagem do professor, é o que ele disse. Sem
 * ela (planos antigos), deduz-se do plano: aula prática ou mista → cozinha
 * e produção; equipas só se houver grupos formados nesta aula.
 */
export function contextoDaAula(plano: any, temGrupos = false): ContextoAula {
  const t = triagemDoPlano(plano);
  if (t) {
    const tipo = tipoDe(t);
    const producao = tipo === 'pratico' || tipo === 'misto';
    return {
      // Cozinhar é sempre numa cozinha, mesmo fora da escola (um evento).
      cozinha: t.onde === 'cozinha' || producao,
      producao,
      equipa: t.trabalho === 'grupos',
      colegas: t.trabalho !== 'individual',
      servico: !!t.servico,
      definido: true,
    };
  }
  const pratica = !plano?.tipoEvento && ['pratico', 'misto'].includes(String(plano?.tipoPlanAula || 'pratico'));
  return { cozinha: pratica, producao: pratica, equipa: temGrupos, colegas: true, servico: false, definido: false };
}

/** A pergunta faz sentido nesta aula? */
export function cumpre(requisitos: Requisito[] | undefined, ctx: ContextoAula): boolean {
  return (requisitos || []).every(r => ctx[r]);
}

/** O que falta à aula para a pergunta fazer sentido, numa frase para o professor. */
export function porqueNao(requisitos: Requisito[] | undefined, ctx: ContextoAula): string {
  const r = (requisitos || []).find(x => !ctx[x]);
  return r === 'producao' ? 'não cozinham'
    : r === 'cozinha' ? 'não é na cozinha'
    : r === 'equipa' ? 'não trabalham em equipas'
    : r === 'colegas' ? 'cada um trabalha sozinho'
    : '';
}

/** O tipo de aula (pesos da nota) que a triagem pede. Sem cozinhar: com
 *  conhecimentos → teórica; sem eles → só atitudes (na cozinha, com a
 *  farda a contar). */
export function tipoDaTriagem(t: TriagemAula, temConhecimentos: boolean, tipoAtual?: string):
  'pratico' | 'misto' | 'teorico' | 'atitudinal' | 'atitudinal_obr' {
  if (t.tipo) {
    if (t.tipo === 'atitudinal') return obrigatoriasDaTriagem(t).farda ? 'atitudinal_obr' : 'atitudinal';
    return t.tipo;
  }
  // Triagens antigas, sem o tipo.
  if (t.cozinham) return tipoAtual === 'misto' ? 'misto' : 'pratico';
  if (temConhecimentos || t.manual) return 'teorico';
  return t.onde === 'cozinha' ? 'atitudinal_obr' : 'atitudinal';
}

/** Farda e higiene e segurança alimentar, pelo tipo de aula: na prática e na
 *  mista avaliam-se as duas; na teórica nenhuma; na atitudinal só a farda,
 *  se o professor quiser. Os registos do KitchenFlow só quando se cozinha. */
export function obrigatoriasDaTriagem(t: TriagemAula): { farda: boolean; registos: boolean } {
  const tipo = tipoDe(t);
  if (tipo === 'pratico' || tipo === 'misto') return { farda: true, registos: true };
  if (tipo === 'teorico') return { farda: false, registos: false };
  return { farda: t.farda ?? t.onde === 'cozinha', registos: false };
}

// ── Peso de cada aula na nota do módulo ───────────────────────
// Uma aula técnica vale mais do que uma aula só de atitudes (Rosa,
// out/2026): as práticas, mistas e teóricas contam uma aula inteira; as
// que não têm técnicas nem conhecimentos (só atitudes, uma visita) contam
// meia. O professor pode mudar o peso de cada aula no plano.
export const PESO_NO_MODULO_POR_TIPO: Record<string, number> = {
  pratico: 1, misto: 1, teorico: 1, atitudinal: 0.5, atitudinal_obr: 0.5,
};
export const OPCOES_PESO_NO_MODULO = [0.5, 1] as const;

export function pesoNoModulo(plano: any): number {
  const escolhido = Number(plano?.pesoNoModulo);
  if (escolhido > 0) return escolhido;
  return PESO_NO_MODULO_POR_TIPO[String(plano?.tipoPlanAula || 'pratico')] ?? 1;
}

export function textoPeso(p: number): string {
  return p === 0.5 ? '½ aula' : p === 1 ? '1 aula inteira' : `${String(p).replace('.', ',')} aulas`;
}

// ── Os 5 C — o que cada pergunta trabalha ─────────────────────
// O aluno tem de saber que as perguntas trabalham os 5 C (Rosa, out/2026).
// As técnicas, os conhecimentos e as atitudes dão a nota da aula (o
// Competente); as três perguntas do fim são o Colaborativo, o Criativo e o
// Consciente; entregar a autoavaliação conta para o Comprometido.
export type Letra5CAluno = 'cm' | 'cp' | 'cl' | 'co' | 'cr';
export const CINCO_C: Record<Letra5CAluno, { sigla: string; nome: string; cor: string; fundo: string }> = {
  cm: { sigla: 'CM', nome: 'Comprometido', cor: '#7A4F0E', fundo: '#FFF2DC' },
  cp: { sigla: 'CP', nome: 'Competente', cor: '#6E370D', fundo: '#F8EADB' },
  cl: { sigla: 'CL', nome: 'Colaborativo', cor: '#1F4E79', fundo: '#E6EEF7' },
  co: { sigla: 'CO', nome: 'Consciente', cor: '#4B2C7A', fundo: '#EEE7F7' },
  cr: { sigla: 'CR', nome: 'Criativo', cor: '#3F6136', fundo: '#E7F0E2' },
};

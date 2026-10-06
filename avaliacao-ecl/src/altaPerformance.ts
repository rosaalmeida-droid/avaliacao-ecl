// ============================================================
// Alta performance — perguntas extra para os alunos que querem mais
// (Rosa, 6/out/2026).
//
// As perguntas da autoavaliação são feitas para a média da turma, e os
// melhores alunos chegam quase sempre ao máximo. Num plano, o professor pode
// criar (com a IA, a partir das fichas técnicas e dos conteúdos, ou à mão)
// perguntas de nível muito mais alto: porquês técnicos, o que fazer quando
// corre mal, ciência dos alimentos, adaptar a receita. Não aparecem a todos:
// no fim da autoavaliação, o aluno escolhe se quer responder.
//
// É EXTRA: o professor avalia as respostas, mas decide se entram na
// avaliação (por omissão, não entram — serve para ver o nível do aluno).
// O prompt das fichas técnicas não muda: este é um pedido à parte.
// ============================================================
import type { PlanoAula, FichaProducao } from './types';
import { getPlanosAula, addOrUpdatePlanoAula, addOrUpdateSelecao, getValidacoes } from './backend';

export type TipoPerguntaAP = 'tecnica' | 'conhecimento';
export interface PerguntaAP {
  id: string;
  tipo: TipoPerguntaAP;
  pergunta: string;
  /** Para o professor: o que tem uma resposta de nível muito bom. O aluno não vê. */
  criterio: string;
  estado: 'proposta' | 'aprovada' | 'retirada';
  /** De onde veio: a ficha técnica (nome do prato), os conteúdos, ou o professor. */
  origem?: string;
}
export interface AltaPerformanceDoPlano { perguntas: PerguntaAP[]; atualizadoEm?: string }
export interface RespostaAP { id: string; resposta: string }
/** O que o professor dá na validação. Por omissão não entra na avaliação. */
export interface AvaliacaoAP { notas: Record<string, number>; entraNaAvaliacao: boolean; media: number | null }

export const PREFIXO_ALTA_PERF = 'ALTAPERF|';
const novoId = () => 'ap_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// ── O pedido à IA (à parte do prompt das fichas) ─────────────────────────
export function promptAltaPerformance(plano: PlanoAula, fichas: FichaProducao[], conteudos: string[]): string {
  const p: any = plano;
  const linhasFichas = fichas.map(f => {
    const passos = ((f as any).preparacao || []).map((x: any) => x?.descricao).filter(Boolean).slice(0, 15);
    const tecs = ((f as any).tecnicasDetectadas || []).slice(0, 12);
    return [`Ficha técnica: «${f.nomePrato}»`, ...passos.map((x: string, i: number) => `  ${i + 1}. ${x}`),
      tecs.length ? `  Técnicas: ${tecs.join('; ')}` : ''].filter(Boolean).join('\n');
  });
  const nTec = fichas.length ? 3 : 0;
  const nCon = conteudos.length ? 2 : 0;
  return [
    'És professor de cozinha e pastelaria numa escola profissional em Portugal (cursos de nível 4).',
    `Aula: «${p.titulo || 'aula'}»${p.ucId ? `, ${p.ucId}` : ''}.`,
    ...(linhasFichas.length ? ['', ...linhasFichas] : []),
    ...(conteudos.length ? ['', 'Conteúdos desta aula:', ...conteudos.slice(0, 12).map(c => `  - ${c}`)] : []),
    '',
    'Escreve perguntas de ALTA PERFORMANCE para os alunos mais avançados da turma. São perguntas EXTRA, opcionais:',
    'só as respondem os alunos que querem mostrar um nível acima da média. As perguntas normais da aula já avaliam o básico.',
    '',
    'Regras:',
    `- ${nTec ? `${nTec} perguntas do tipo TECNICA (sobre as fichas acima)` : 'nenhuma pergunta TECNICA'} e ${nCon ? `${nCon} do tipo CONHECIMENTO (sobre os conteúdos)` : 'nenhuma do tipo CONHECIMENTO'}.`,
    '- Nível muito acima do da aula: o porquê técnico ou científico de um passo; o que fazer quando algo corre mal e como',
    '  o evitar; adaptar a receita (outra quantidade, uma restrição alimentar, outro equipamento); relacionar com a',
    '  segurança alimentar ou com o custo; comparar duas técnicas e justificar a escolha.',
    '- Perguntas abertas: o aluno responde por escrito, em 3 a 6 frases. Nunca de sim/não nem de escolha múltipla.',
    '- Uma pergunta, uma ideia. Concretas, ligadas aos pratos e aos passos desta aula (não perguntas gerais de manual).',
    '- Para cada pergunta, escreve o que tem uma resposta de nível muito bom (os pontos que o professor procura).',
    '- Português de Portugal, Acordo Ortográfico em vigor, linguagem cuidada, segunda pessoa do singular («Explica…», «O que farias…»).',
    '',
    'Formato — uma linha por pergunta, separada por « | », sem mais nada:',
    'AP | TECNICA ou CONHECIMENTO | pergunta | o que tem uma resposta de nível muito bom',
    'Exemplo:',
    'AP | TECNICA | O caramelo começou a cristalizar a meio da cozedura. Explica porquê e o que farias para o recuperar e para o evitar da próxima vez. | Agitação ou cristais nas paredes provocam a cristalização; recuperar com um pouco de água e voltar a dissolver; evitar com pincel húmido nas paredes, sem mexer, ou com glucose/limão.',
  ].join('\n');
}

/** As perguntas da resposta da IA (ou coladas pelo professor). */
export function lerPerguntasAP(texto: string, origem?: string): PerguntaAP[] {
  const out: PerguntaAP[] = [];
  for (const linha of String(texto || '').split('\n')) {
    const partes = linha.replace(/^[-·•*\s]+/, '').split('|').map(s => s.trim());
    if (partes.length < 4 || !/^AP$/i.test(partes[0])) continue;
    const [, tipo, pergunta, ...resto] = partes;
    if (pergunta.length < 15) continue;
    out.push({ id: novoId(), tipo: /CONHEC/i.test(tipo) ? 'conhecimento' : 'tecnica', pergunta, criterio: resto.join(' | '),
      estado: 'proposta', ...(origem ? { origem } : {}) });
  }
  return out;
}

// ── No plano ─────────────────────────────────────────────────────────────
export function altaPerformanceDoPlano(plano: PlanoAula | undefined): AltaPerformanceDoPlano {
  const ap = (plano as any)?.altaPerformance;
  return { perguntas: Array.isArray(ap?.perguntas) ? ap.perguntas : [], atualizadoEm: ap?.atualizadoEm };
}
export function perguntasAPAprovadas(plano: PlanoAula | undefined): PerguntaAP[] {
  return altaPerformanceDoPlano(plano).perguntas.filter(q => q.estado === 'aprovada');
}
export function guardarPerguntasAP(planoId: string, perguntas: PerguntaAP[]): PlanoAula | null {
  const p: any = getPlanosAula().find(x => x.id === planoId);
  if (!p) return null;
  const agora = new Date().toISOString();
  const novo = { ...p, altaPerformance: { perguntas, atualizadoEm: agora }, atualizadoEm: agora };
  addOrUpdatePlanoAula(novo);
  return novo;
}

// ── As respostas do aluno (registo à parte, como os 5 C) ─────────────────
export function respostasAP(alunoId: string, planoId: string): RespostaAP[] | null {
  const r: any = todasAsSelecoes().filter(s => s.alunoId === alunoId && s.planoAulaId === PREFIXO_ALTA_PERF + planoId)
    .sort((a, b) => String(b.criadaEm || '').localeCompare(String(a.criadaEm || '')))[0];
  // Vão dentro de «autoavaliacoes», como as respostas dos 5 C, para chegarem ao professor pelo mesmo caminho.
  return r ? ((r.autoavaliacoes || [])[0]?.respostasAP || r.respostasAP || []) : null;
}
function todasAsSelecoes(): any[] {
  // As especiais não vêm em getSelecoes (que é só das aulas): lê-se o guardado.
  try { return JSON.parse(localStorage.getItem('ecl_selecoes') || '[]'); } catch { return []; }
}
export function guardarRespostasAP(aluno: { id: string; turmaId: string }, planoId: string, respostas: RespostaAP[]): void {
  addOrUpdateSelecao({
    id: `ap_${planoId}_${aluno.id}`, planoAulaId: PREFIXO_ALTA_PERF + planoId, comandaId: '', fichaId: '',
    alunoId: aluno.id, turmaId: aluno.turmaId, tecnicas: [], atitudes: [], responsabilidades: [],
    autoavaliacoes: [{ competenciaId: 'ALTA_PERFORMANCE', nivel: 'ap', nota: 0, respostasAP: respostas }],
    criadaEm: new Date().toISOString(),
  } as any);
}

// ── A avaliação do professor (fica na validação da aula) ─────────────────
export function avaliacaoAPDaAula(alunoId: string, planoId: string): AvaliacaoAP | null {
  const v: any = getValidacoes().filter((x: any) => x.alunoId === alunoId && x.planoAulaId === planoId)
    .sort((a: any, b: any) => String(b.validadoEm || '').localeCompare(String(a.validadoEm || '')))[0];
  return v?.altaPerformance || null;
}
export function mediaAP(notas: Record<string, number>): number | null {
  const xs = Object.values(notas).filter(n => typeof n === 'number' && !isNaN(n));
  return xs.length ? Math.round(xs.reduce((s, n) => s + n, 0) / xs.length * 10) / 10 : null;
}

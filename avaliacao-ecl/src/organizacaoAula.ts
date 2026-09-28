// ════════════════════════════════════════════════════════════
// PLANO ORGANIZACIONAL DA AULA — a função de cada aluno
// ════════════════════════════════════════════════════════════
// Em cada aula prática, todos os alunos têm uma função (higienização,
// arrumação, temperaturas…). Há um líder da aula que não tem outra
// função: vê o plano de todos, verifica e fecha a aula no KitchenFlow.
// Com mais alunos do que lugares, os que sobram não têm função: podem
// ajudar os colegas e registar o que fizeram.
// O KitchenFlow é só onde se regista; quem faz o quê decide-se aqui.
//
// As funções rodam: a aplicação sorteia quando o professor publica o
// plano, dando primeiro a cada função quem a fez menos vezes (e o líder,
// as temperaturas e os panos a quem ainda não os teve), até toda a turma
// ter passado por elas. Fica guardado no plano, que chega aos telemóveis
// em poucos segundos. Quando alguém falta, o professor passa a função a
// um colega presente, que fica com as duas (o líder nunca acumula).
import type { PlanoAula } from './types';
import { getPlanosAula, getAlunos, getPresencas, addOrUpdatePlanoAula, getSessaoAula } from './backend';

export type IdFuncao = 'lider' | 'temp1' | 'temp2' | 'panos' | 'rececao' | 'copa' | 'economato'
  | 'equipamentos' | 'fogoes_frio' | 'lixo_carrinhos' | 'chao_bancadas';

export interface FuncaoAula {
  id: IdFuncao;
  nome: string;
  /** Uma frase: o que é esta função. */
  resumo: string;
  /** O que fazer no início da aula (antes de produzir). */
  inicio: string[];
  /** O que fazer no fim da aula (antes da autoavaliação). */
  fim: string[];
  /** Onde se regista no KitchenFlow, no início (se houver registo nesse momento). */
  kfInicio?: string;
  /** Onde se regista no KitchenFlow, no fim (se houver registo nesse momento). */
  kfFim?: string;
  /** O líder, as temperaturas e os panos: rodam primeiro e não se juntam. */
  especial?: boolean;
  /** Para a rotação: as duas metades das temperaturas contam como uma. */
  tipo: string;
}

/** O que todos fazem, tenham a função que tiverem. */
export const TAREFA_DE_TODOS = 'A bancada do teu grupo limpa e higienizada (em cima e em baixo), com o ralo da cuba limpo.';
export const KF_TAREFA_DE_TODOS = 'Higienização → Bancadas (a tua bancada)';

const METADE_1 = 'Congeladores 1, 2 e 3 · Frigoríficos verticais 1, 2 e 3';
const METADE_2 = 'Frigorífico vertical 4 · Frigoríficos de bancada 1 a 5';

export const FUNCOES_AULA: FuncaoAula[] = [
  { id: 'lider', tipo: 'lider', especial: true, nome: 'Líder da aula',
    resumo: 'Não tens outra função: verificas se todos fizeram a sua e fechas a aula no KitchenFlow.',
    inicio: [
      'Vê no plano organizacional quem faz o quê hoje.',
      'Confirma que as temperaturas de início e os panos foram registados.',
      'Confirma que os caixotes têm saco e que as máquinas da aula estão ligadas.',
    ],
    fim: [
      'Percorre a cozinha com o plano organizacional e verifica cada função.',
      'Verifica a copa: máquinas de lavar drenadas, com a porta aberta e higienizadas, e a cuba limpa.',
      'Se alguma coisa não estiver bem, pede a quem tinha essa função para a acabar.',
      'Fecha a aula no KitchenFlow.',
    ],
    kfFim: 'Encerramento da Aula' },
  { id: 'temp1', tipo: 'temp', especial: true, nome: 'Temperaturas — metade 1',
    resumo: `Medes e registas as temperaturas de: ${METADE_1}.`,
    inicio: [`Mede e regista a temperatura de cada equipamento da tua metade: ${METADE_1}.`],
    fim: [
      'Pelo menos 30 minutos depois do início, volta a medir e a registar os mesmos equipamentos.',
      'Se algum valor estiver fora do limite, avisa logo o professor.',
    ],
    kfInicio: 'Temperaturas → início', kfFim: 'Temperaturas → final' },
  { id: 'temp2', tipo: 'temp', especial: true, nome: 'Temperaturas — metade 2',
    resumo: `Medes e registas as temperaturas de: ${METADE_2}.`,
    inicio: [`Mede e regista a temperatura de cada equipamento da tua metade: ${METADE_2}.`],
    fim: [
      'Pelo menos 30 minutos depois do início, volta a medir e a registar os mesmos equipamentos.',
      'Se algum valor estiver fora do limite, avisa logo o professor.',
    ],
    kfInicio: 'Temperaturas → início', kfFim: 'Temperaturas → final' },
  { id: 'panos', tipo: 'panos', especial: true, nome: 'Panos, esponjas e material de limpeza',
    resumo: 'Tratas da solução desinfetante dos panos e das esponjas, e do material de limpeza.',
    inicio: ['Prepara a solução desinfetante e põe lá os panos e as esponjas.'],
    fim: [
      'Renova a solução e volta a pôr os panos e as esponjas.',
      'Rodos e esfregonas lavados e desinfetados; vassouras em condições.',
    ],
    kfInicio: 'Higienização → Panos e esponjas (início)',
    kfFim: 'Higienização → Panos e esponjas (final) e Equip. Limpeza' },
  { id: 'rececao', tipo: 'rececao', especial: true, nome: 'Receção de matérias-primas',
    resumo: 'Recebes as matérias-primas que chegam e registas cada entrega.',
    inicio: [
      'Pergunta ao professor se hoje chegam matérias-primas e a que horas.',
      'Quando chegarem, verifica o estado, a temperatura e a validade, e confere com a requisição.',
    ],
    fim: ['Tudo o que chegou ficou guardado no sítio certo (primeiro o que vai para o frio).'],
    kfInicio: 'Receção Matérias-Primas (uma por cada entrega)' },
  { id: 'copa', tipo: 'copa', nome: 'Copa',
    resumo: 'Tratas da loiça, das máquinas de lavar e da cuba.',
    inicio: ['Prepara a copa: máquinas de lavar prontas e cuba limpa.'],
    fim: [
      'Loiça lavada e arrumada; nenhum utensílio por lavar.',
      'Máquinas de lavar drenadas, com a porta aberta e higienizadas.',
      'Cuba higienizada e inox em condições.',
    ],
    kfFim: 'Higienização → Copa' },
  { id: 'economato', tipo: 'economato', nome: 'Economato',
    resumo: 'Tratas do economato das matérias-primas e do economato do material.',
    inicio: ['Confirma que o economato está arrumado e que se chega bem às matérias-primas da aula.'],
    fim: [
      'Matérias-primas bem guardadas: fechadas, identificadas e no sítio certo.',
      'Material arrumado no economato.',
      'Nada no chão; chão do economato em condições.',
    ],
    kfFim: 'Higienização → Economatos' },
  { id: 'equipamentos', tipo: 'equipamentos', nome: 'Equipamentos',
    resumo: 'Ligas e desligas as máquinas, e deixa-las limpas e protegidas.',
    inicio: ['Liga as máquinas que a turma vai usar hoje (pergunta ao professor quais).'],
    fim: ['Abatedores, máquinas de vácuo, amassadeiras, batedeira, picadora e processadores: desligados, limpos e protegidos com película.'],
    kfFim: 'Higienização → Equipamentos' },
  { id: 'fogoes_frio', tipo: 'fogoes_frio', nome: 'Fogões, frio e luzes',
    resumo: 'Tratas dos fogões e fornos, do ar condicionado, das luzes e dos frigoríficos.',
    inicio: ['Liga as luzes e, se for preciso, o ar condicionado.'],
    fim: [
      'Fogões e fornos desligados e limpos.',
      'Ar condicionado e luzes desligados.',
      'Frigoríficos e congeladores ligados.',
      'Abre as gavetas dos frigoríficos de bancada: os que estiverem vazios, desliga-os.',
    ],
    kfFim: 'Higienização → Equipamentos e Frio' },
  { id: 'lixo_carrinhos', tipo: 'lixo_carrinhos', nome: 'Lixo e carrinhos',
    resumo: 'Tratas do lixo e dos carrinhos.',
    inicio: ['Põe sacos novos nos caixotes do lixo (orgânico e reciclável).'],
    fim: [
      'Lixo orgânico despejado no local certo; reciclável separado.',
      'Caixotes lavados e com saco novo.',
      'Carrinhos limpos, higienizados e arrumados no sítio certo.',
    ],
    kfFim: 'Higienização → Resíduos e Carrinhos' },
  { id: 'chao_bancadas', tipo: 'chao_bancadas', nome: 'Chão e bancadas laterais',
    resumo: 'Tratas das bancadas laterais e do chão da cozinha.',
    inicio: ['Bancadas laterais limpas e livres para a aula.'],
    fim: [
      'Bancadas laterais limpas e higienizadas (em cima e em baixo).',
      'Chão da cozinha lavado.',
    ],
    kfFim: 'Higienização → Bancadas' },
];

export const funcaoPorId = (id: string) => FUNCOES_AULA.find(f => f.id === id);

/** Os lugares, pela ordem em que se preenchem quando há poucos alunos. */
const ORDEM_LUGARES: IdFuncao[] = ['lider', 'temp1', 'temp2', 'panos', 'rececao', 'copa', 'economato', 'equipamentos',
  'fogoes_frio', 'lixo_carrinhos', 'chao_bancadas', 'copa', 'economato', 'chao_bancadas'];
/** Avarias, faltas e necessidades e não conformidades não são funções:
 *  regista-as quem as deteta, no momento. */
export const REGISTAR_QUANDO_DETETAS = 'Se vires uma avaria, uma falta ou uma não conformidade, regista-a logo no KitchenFlow.';

export interface LugarAula {
  /** 'copa-2' */
  chave: string;
  funcaoId: IdFuncao;
  alunoId: string;
  /** Quem tinha este lugar no sorteio (quando foi substituído). */
  substituiu?: string;
  trocadoEm?: string;
}

export interface OrganizacaoAula {
  versao: 1;
  sorteadoEm: string;
  lugares: LugarAula[];
}

/** Aulas com plano organizacional: as práticas e mistas (não os eventos). */
export function temOrganizacao(p: PlanoAula | undefined | null): boolean {
  if (!p || (p as any).tipoEvento) return false;
  const t = String((p as any).tipoPlanAula || 'pratico');
  return t === 'pratico' || t === 'misto';
}

export function organizacaoDe(p: PlanoAula | undefined | null): OrganizacaoAula | null {
  const o = (p as any)?.organizacao;
  return o && Array.isArray(o.lugares) ? o : null;
}

// ── Sorteio ─────────────────────────────────────────────────

/** Número ao acaso entre 0 e 1, sempre o mesmo para a mesma semente. */
function aleatorio(semente: string): () => number {
  let h = 1779033703 ^ semente.length;
  for (let i = 0; i < semente.length; i++) { h = Math.imul(h ^ semente.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export interface HistoricoFuncoes {
  /** Quantas vezes cada aluno teve cada tipo de função. */
  porTipo: Map<string, Map<string, number>>;
  /** Quantas funções cada aluno já teve. */
  total: Map<string, number>;
  /** Quantas vezes teve líder, temperaturas ou panos. */
  especiais: Map<string, number>;
}

/** O que cada aluno já fez nas outras aulas da turma (conta quem ficou com o lugar). */
export function historicoFuncoes(planos: PlanoAula[], turmaId: string, excetoPlanoId?: string): HistoricoFuncoes {
  const h: HistoricoFuncoes = { porTipo: new Map(), total: new Map(), especiais: new Map() };
  const mais = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) || 0) + 1);
  for (const p of planos) {
    if (p.turmaId !== turmaId || p.id === excetoPlanoId) continue;
    const o = organizacaoDe(p);
    if (!o) continue;
    for (const l of o.lugares) {
      const f = funcaoPorId(l.funcaoId);
      if (!f || !l.alunoId) continue;
      if (!h.porTipo.has(f.tipo)) h.porTipo.set(f.tipo, new Map());
      mais(h.porTipo.get(f.tipo)!, l.alunoId);
      mais(h.total, l.alunoId);
      if (f.especial) mais(h.especiais, l.alunoId);
    }
  }
  return h;
}

const vezes = (h: HistoricoFuncoes, tipo: string, aluno: string) => h.porTipo.get(tipo)?.get(aluno) || 0;

/**
 * Distribui as funções pelos alunos da turma. Cada lugar vai para quem fez
 * menos vezes aquele tipo de função (e, entre esses, quem teve menos funções);
 * o empate decide-se ao acaso. Com poucos alunos, as últimas funções juntam-se
 * a quem já tem uma (nunca ao líder, às temperaturas, aos panos nem à receção);
 * com alunos a mais, os que sobram ficam sem função e podem ajudar.
 */
export function sortearOrganizacao(alunosIds: string[], hist: HistoricoFuncoes, semente: string): OrganizacaoAula {
  const rnd = aleatorio(semente);
  const sorteio = new Map(alunosIds.map(a => [a, rnd()]));
  const n = alunosIds.length;
  const base = [...ORDEM_LUGARES];
  // Com alunos a mais, os que sobram ficam sem função: podem ajudar os
  // colegas e dizer como ajudaram (decisão da Rosa, set/2026).
  const lugaresIds: IdFuncao[] = base;
  const contagem = new Map<string, number>();
  const lugares: LugarAula[] = lugaresIds.map(funcaoId => {
    const k = (contagem.get(funcaoId) || 0) + 1; contagem.set(funcaoId, k);
    return { chave: `${funcaoId}-${k}`, funcaoId, alunoId: '' };
  });

  const livres = new Set(alunosIds);
  const escolher = (cands: string[], tipo: string, especial: boolean) => [...cands].sort((a, b) =>
    (vezes(hist, tipo, a) - vezes(hist, tipo, b))
    || (especial ? ((hist.especiais.get(a) || 0) - (hist.especiais.get(b) || 0)) : 0)
    || ((hist.total.get(a) || 0) - (hist.total.get(b) || 0))
    || (sorteio.get(a)! - sorteio.get(b)!))[0];

  // 1. Os lugares que têm aluno próprio (os primeiros n, pela ordem).
  const comAlunoProprio = lugares.slice(0, Math.min(n, lugares.length));
  // Primeiro os especiais, pela ordem; depois os outros, numa ordem ao acaso.
  const especiais = comAlunoProprio.filter(l => funcaoPorId(l.funcaoId)!.especial);
  const outros = comAlunoProprio.filter(l => !funcaoPorId(l.funcaoId)!.especial)
    .map(l => ({ l, r: rnd() })).sort((a, b) => a.r - b.r).map(x => x.l);
  for (const l of [...especiais, ...outros]) {
    const f = funcaoPorId(l.funcaoId)!;
    const a = escolher([...livres], f.tipo, !!f.especial);
    if (!a) break;
    l.alunoId = a; livres.delete(a);
  }

  // 2. Poucos alunos: a função que já tem alguém (2.º lugar da copa…) fica só
  //    com essa pessoa; as outras juntam-se a quem tem menos funções.
  const semAluno = lugares.filter(l => !l.alunoId);
  const final: LugarAula[] = lugares.filter(l => l.alunoId);
  for (const l of semAluno) {
    if (final.some(x => x.funcaoId === l.funcaoId)) continue;
    const quantas = (a: string) => final.filter(x => x.alunoId === a).length;
    const cands = [...new Set(final.filter(x => !funcaoPorId(x.funcaoId)!.especial).map(x => x.alunoId))];
    const a = [...cands].sort((x, y) => (quantas(x) - quantas(y)) || (sorteio.get(x)! - sorteio.get(y)!))[0];
    if (a) final.push({ ...l, alunoId: a });
  }
  return { versao: 1, sorteadoEm: new Date().toISOString(), lugares: final };
}

// ── Consultas ───────────────────────────────────────────────

export function lugaresDoAluno(o: OrganizacaoAula | null, alunoId: string): LugarAula[] {
  return (o?.lugares || []).filter(l => l.alunoId === alunoId);
}

/** As funções deste aluno nesta aula, pela ordem da lista (sem repetir). */
export function funcoesDoAluno(o: OrganizacaoAula | null, alunoId: string): FuncaoAula[] {
  const ids = new Set(lugaresDoAluno(o, alunoId).map(l => l.funcaoId));
  return FUNCOES_AULA.filter(f => ids.has(f.id));
}

/** As funções pela ordem da lista, com quem as faz. */
export function quadroDaAula(o: OrganizacaoAula | null): { funcao: FuncaoAula; lugares: LugarAula[] }[] {
  if (!o) return [];
  return FUNCOES_AULA.map(funcao => ({ funcao, lugares: o.lugares.filter(l => l.funcaoId === funcao.id) }))
    .filter(x => x.lugares.length > 0);
}

// ── Substituições ───────────────────────────────────────────

/**
 * Quem pode ficar com este lugar, pela ordem em que a aplicação propõe.
 * Só se substitui com a aula a decorrer, e só por quem já entrou: é aí que
 * o professor sabe quem está. Primeiro quem não tem líder nem temperaturas
 * nem panos, depois quem tem menos funções hoje e menos vezes esta função.
 * Nunca o líder (não acumula), nem quem já tem esta função.
 */
export function candidatosParaLugar(o: OrganizacaoAula, chave: string, alunosIds: string[],
  hist: HistoricoFuncoes, entraram: Set<string> | null): string[] {
  const lugar = o.lugares.find(l => l.chave === chave);
  if (!lugar) return [];
  const f = funcaoPorId(lugar.funcaoId)!;
  const lider = o.lugares.find(l => l.funcaoId === 'lider')?.alunoId;
  const funcoesHoje = (a: string) => o.lugares.filter(l => l.alunoId === a);
  const temEspecial = (a: string) => funcoesHoje(a).some(l => funcaoPorId(l.funcaoId)?.especial);
  const ordem = aleatorio(o.sorteadoEm + chave);
  const sorte = new Map(alunosIds.map(a => [a, ordem()]));
  return alunosIds
    .filter(a => a !== lugar.alunoId && (lugar.funcaoId === 'lider' || a !== lider)
      && (!entraram || entraram.has(a))
      && !funcoesHoje(a).some(l => l.funcaoId === lugar.funcaoId))
    .sort((a, b) =>
      (Number(temEspecial(a)) - Number(temEspecial(b)))
      || (funcoesHoje(a).length - funcoesHoje(b).length)
      || (vezes(hist, f.tipo, a) - vezes(hist, f.tipo, b))
      || (sorte.get(a)! - sorte.get(b)!));
}

/**
 * Passa o lugar para outro aluno (fica com as duas funções). Se o lugar é
 * o de líder, o novo líder deixa as suas funções, que passam cada uma para
 * o colega que a aplicação propõe primeiro.
 */
export function substituirNoLugar(o: OrganizacaoAula, chave: string, novoId: string, alunosIds: string[],
  hist: HistoricoFuncoes, entraram: Set<string> | null): OrganizacaoAula {
  const agora = new Date().toISOString();
  let lugares = o.lugares.map(l => l.chave === chave
    ? { ...l, alunoId: novoId, substituiu: l.substituiu || l.alunoId, trocadoEm: agora } : l);
  let nova: OrganizacaoAula = { ...o, lugares };
  if (o.lugares.find(l => l.chave === chave)?.funcaoId === 'lider') {
    for (const l of lugares.filter(x => x.alunoId === novoId && x.funcaoId !== 'lider')) {
      const outro = candidatosParaLugar(nova, l.chave, alunosIds.filter(a => a !== novoId), hist, entraram)[0];
      if (!outro) continue;
      lugares = nova.lugares.map(x => x.chave === l.chave
        ? { ...x, alunoId: outro, substituiu: x.substituiu || x.alunoId, trocadoEm: agora } : x);
      nova = { ...nova, lugares };
    }
  }
  return nova;
}

// ── Guardar no plano (só no aparelho do professor) ──────────

/** Os alunos da turma que contam para o sorteio. */
export function alunosDaTurma(turmaId: string): string[] {
  return getAlunos().filter(a => a.turmaId === turmaId && a.ativo !== false)
    .sort((a, b) => a.numero - b.numero).map(a => a.id);
}

/** Quem já entrou nesta aula (marcou presença). */
export function entraramNaAula(planoAulaId: string): Set<string> {
  return new Set(getPresencas().filter(p => p.planoAulaId === planoAulaId && p.presente).map(p => p.alunoId));
}

function guardar(plano: PlanoAula, o: OrganizacaoAula): PlanoAula {
  const p = { ...plano, organizacao: o, atualizadoEm: new Date().toISOString() } as PlanoAula;
  addOrUpdatePlanoAula(p);
  return p;
}

/** Distribui as funções (de novo, se já estavam distribuídas). */
export function distribuirFuncoes(plano: PlanoAula): PlanoAula {
  const hist = historicoFuncoes(getPlanosAula(), plano.turmaId, plano.id);
  return guardar(plano, sortearOrganizacao(alunosDaTurma(plano.turmaId), hist, plano.id + '|' + Date.now()));
}

/** Plano publicado de uma aula prática ainda sem funções: distribui já. */
export function garantirOrganizacao(plano: PlanoAula): PlanoAula {
  if (!temOrganizacao(plano) || plano.estado !== 'publicado' || organizacaoDe(plano)) return plano;
  if (alunosDaTurma(plano.turmaId).length === 0) return plano;
  return distribuirFuncoes(plano);
}

/** Já se pode substituir? Só com a aula aberta (o professor sabe quem está). */
export function podeSubstituir(plano: PlanoAula): boolean {
  return !!getSessaoAula(plano.id)?.abertaEm;
}

/** O professor passa um lugar para outro aluno (só com a aula a decorrer). */
export function substituirAluno(plano: PlanoAula, chave: string, novoId: string): PlanoAula {
  const o = organizacaoDe(plano);
  if (!o || !podeSubstituir(plano)) return plano;
  const hist = historicoFuncoes(getPlanosAula(), plano.turmaId, plano.id);
  return guardar(plano, substituirNoLugar(o, chave, novoId, alunosDaTurma(plano.turmaId), hist, entraramNaAula(plano.id)));
}

/** Os candidatos para um lugar, pela ordem em que se propõem. */
export function candidatos(plano: PlanoAula, chave: string): string[] {
  const o = organizacaoDe(plano);
  if (!o) return [];
  const hist = historicoFuncoes(getPlanosAula(), plano.turmaId, plano.id);
  return candidatosParaLugar(o, chave, alunosDaTurma(plano.turmaId), hist, entraramNaAula(plano.id));
}

export function nomeDoAluno(id: string): string {
  const a = getAlunos().find(x => x.id === id);
  return a ? (a.nome || `Aluno ${a.numero}`) : '—';
}

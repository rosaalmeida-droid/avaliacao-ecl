// ============================================================
// Backend ECL — localStorage + Google Sheets
// ============================================================

import {
  Comanda, SelecaoAluno, Validacao, Atividade,
  Turma, Aluno, PlanoAula, FichaProducao,
  DistribuicaoFicha, ChecklistAlunoFicha, RequisicaoAula
} from './types';

const SHEETS_AVALIACAO_URL = '';

const KEYS = {
  comandas:       'ecl_comandas',
  selecoes:       'ecl_selecoes',
  validacoes:     'ecl_validacoes',
  atividades:     'ecl_atividades',
  turmas:         'ecl_turmas',
  alunos:         'ecl_alunos',
  planos:         'ecl_planos',
  fichas:         'ecl_fichas',
  distribuicoes:  'ecl_distribuicoes',
  checklists:     'ecl_checklists',
  requisicoes:    'ecl_requisicoes',
};

function load<T>(key: string): T[] {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : []; }
  catch { return []; }
}

function save<T>(key: string, data: T[]): void {
  try { localStorage.setItem(key, JSON.stringify(data)); }
  catch (e) { console.error('Erro ao guardar', key, e); }
}

async function enviar(tabela: string, linha: Record<string, unknown>): Promise<void> {
  if (!SHEETS_AVALIACAO_URL) return;
  try {
    await fetch(SHEETS_AVALIACAO_URL, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ tabela, linha }),
    });
  } catch (e) { console.error('Erro ao enviar para Sheets', e); }
}

// ── Turmas ───────────────────────────────────────────────────
export function getTurmas(): Turma[] {
  const t = load<Turma>(KEYS.turmas);
  if (t.length === 0) {
    const seed: Turma[] = [
      { id: 'CP1', nome: 'CP Cozinha/Pastelaria 1' },
      { id: 'CP2', nome: 'CP Cozinha/Pastelaria 2' },
    ];
    save(KEYS.turmas, seed);
    return seed;
  }
  return t;
}

// ── Alunos ───────────────────────────────────────────────────
export function getAlunos(): Aluno[] { return load<Aluno>(KEYS.alunos); }

export function addAluno(a: Aluno): void {
  const all = getAlunos();
  if (!all.find(x => x.id === a.id)) { all.push(a); save(KEYS.alunos, all); }
}

export function getOrCreateAluno(turmaId: string, numero: number, ano: 1|2|3): Aluno {
  const id = `${turmaId}-${numero}`;
  const all = getAlunos();
  let aluno = all.find(a => a.id === id);
  if (!aluno) { aluno = { id, turmaId, numero, ano }; addAluno(aluno); }
  else if (aluno.ano !== ano) { aluno.ano = ano; save(KEYS.alunos, all); }
  return aluno;
}

// ── Planos de Aula ───────────────────────────────────────────
export function getPlanosAula(): PlanoAula[] { return load<PlanoAula>(KEYS.planos); }

export function getPlanosAulaPorTurma(turmaId: string): PlanoAula[] {
  return getPlanosAula()
    .filter(p => p.turmaId === turmaId)
    .sort((a, b) => b.data.localeCompare(a.data));
}

export function addOrUpdatePlanoAula(p: PlanoAula): void {
  const all = getPlanosAula();
  const idx = all.findIndex(x => x.id === p.id);
  if (idx >= 0) all[idx] = p; else all.push(p);
  save(KEYS.planos, all);
  enviar('PlanosAula', p as unknown as Record<string, unknown>);
}

// ── Fichas de Produção ───────────────────────────────────────
export function getFichasProducao(): FichaProducao[] { return load<FichaProducao>(KEYS.fichas); }

export function getFichasPorPlano(planoId: string): FichaProducao[] {
  const plano = getPlanosAula().find(p => p.id === planoId);
  if (!plano) return [];
  return getFichasProducao().filter(f => plano.fichasIds.includes(f.id));
}

export function addOrUpdateFichaProducao(f: FichaProducao): void {
  const all = getFichasProducao();
  const idx = all.findIndex(x => x.id === f.id);
  if (idx >= 0) all[idx] = f; else all.push(f);
  save(KEYS.fichas, all);
}

// ── Distribuições de Fichas ──────────────────────────────────
export function getDistribuicoes(): DistribuicaoFicha[] { return load<DistribuicaoFicha>(KEYS.distribuicoes); }

export function getDistribuicoesPorPlano(planoId: string): DistribuicaoFicha[] {
  return getDistribuicoes().filter(d => d.planoAulaId === planoId);
}

export function addOrUpdateDistribuicaoFicha(d: DistribuicaoFicha): void {
  const all = getDistribuicoes();
  const idx = all.findIndex(x => x.id === d.id);
  if (idx >= 0) all[idx] = d; else all.push(d);
  save(KEYS.distribuicoes, all);
}

// ── Checklists do Aluno ──────────────────────────────────────
export function getChecklists(): ChecklistAlunoFicha[] { return load<ChecklistAlunoFicha>(KEYS.checklists); }

export function getChecklistAlunoFicha(planoId: string, fichaId: string, alunoId: string): ChecklistAlunoFicha | undefined {
  return getChecklists().find(c => c.planoAulaId === planoId && c.fichaId === fichaId && c.alunoId === alunoId);
}

export function addOrUpdateChecklistAluno(c: ChecklistAlunoFicha): void {
  const all = getChecklists();
  const idx = all.findIndex(x => x.id === c.id);
  if (idx >= 0) all[idx] = c; else all.push(c);
  save(KEYS.checklists, all);
}

// ── Requisições ──────────────────────────────────────────────
export function getRequisicoes(): RequisicaoAula[] { return load<RequisicaoAula>(KEYS.requisicoes); }

export function getRequisicaoPorPlano(planoId: string): RequisicaoAula | undefined {
  return getRequisicoes().find(r => r.planoAulaId === planoId);
}

export function addOrUpdateRequisicao(r: RequisicaoAula): void {
  const all = getRequisicoes();
  const idx = all.findIndex(x => x.id === r.id);
  if (idx >= 0) all[idx] = r; else all.push(r);
  save(KEYS.requisicoes, all);
}

// ── Comandas / Seleções / Validações ─────────────────────────
export function getComandas(): Comanda[] { return load<Comanda>(KEYS.comandas); }
export function getSelecoes(): SelecaoAluno[] { return load<SelecaoAluno>(KEYS.selecoes); }
export function getValidacoes(): Validacao[] { return load<Validacao>(KEYS.validacoes); }
export function getAtividades(): Atividade[] { return load<Atividade>(KEYS.atividades); }
export function getPlanosAulaFn(): PlanoAula[] { return getPlanosAula(); }

export function addOrUpdateSelecao(s: SelecaoAluno): void {
  const all = getSelecoes();
  const idx = all.findIndex(x => x.id === s.id);
  if (idx >= 0) all[idx] = s; else all.push(s);
  save(KEYS.selecoes, all);
  enviar('Avaliacoes', s as unknown as Record<string, unknown>);
}

export function addOrUpdateValidacao(v: Validacao): void {
  const all = getValidacoes();
  const idx = all.findIndex(x => x.id === v.id);
  if (idx >= 0) all[idx] = v; else all.push(v);
  save(KEYS.validacoes, all);
  enviar('Validacoes', v as unknown as Record<string, unknown>);
}

export function addOrUpdateAtividade(a: Atividade): void {
  const all = getAtividades();
  const idx = all.findIndex(x => x.id === a.id);
  if (idx >= 0) all[idx] = a; else all.push(a);
  save(KEYS.atividades, all);
}

// ── Histórico de avaliações por aluno/microcompetência ───────
const KEY_HIST = 'ecl_historico_avaliacoes';

export interface RegistoAvaliacao {
  id: string;
  alunoId: string;
  turmaId: string;
  planoAulaId: string;
  fichaId: string;
  ucId: string;
  microcompetenciaId: string;
  nota: number;
  data: string;
  observacao?: string;
  validadoPor: string;
}

export function getHistoricoAvaliacoes(): RegistoAvaliacao[] {
  return load<RegistoAvaliacao>(KEY_HIST);
}

export function getHistoricoAluno(alunoId: string): RegistoAvaliacao[] {
  return getHistoricoAvaliacoes().filter(r => r.alunoId === alunoId);
}

export function getHistoricoAlunoMicro(alunoId: string, microId: string): RegistoAvaliacao[] {
  return getHistoricoAvaliacoes()
    .filter(r => r.alunoId === alunoId && r.microcompetenciaId === microId)
    .sort((a, b) => a.data.localeCompare(b.data));
}

export function addRegistoAvaliacao(r: RegistoAvaliacao): void {
  const all = getHistoricoAvaliacoes();
  all.push(r);
  save(KEY_HIST, all);
  enviar('HistoricoAvaliacoes', r as unknown as Record<string, unknown>);
}

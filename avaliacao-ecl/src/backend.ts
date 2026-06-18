// ============================================================
// Backend ECL — localStorage (primário) + Google Sheets (persistência)
// localStorage: acesso imediato e offline
// Sheets: backup permanente — nunca perde dados ao mudar browser
// ============================================================

import {
  Comanda, SelecaoAluno, Validacao, Atividade,
  Turma, Aluno, PlanoAula, FichaProducao,
  DistribuicaoFicha, ChecklistAlunoFicha, RequisicaoAula
} from './types';

// ── URLs dos Apps Scripts ────────────────────────────────────
// Histórico de avaliações dos alunos (já configurado e a funcionar)
const SHEETS_HISTORICO_URL = 'https://script.google.com/a/macros/eclisboa.net/s/AKfycbyfchb-NExFKf_0At6Oby7WkTPQK1qZALx2veS4xb7-NF7Msow5ghstCNBmYGYoF7z16w/exec';

// Planos de Aula (preencher após criar o Sheets de Planos)
const SHEETS_PLANOS_URL = 'https://script.google.com/a/macros/eclisboa.net/s/AKfycbxT00cLo_mTHjv-swqo-lxqdq-YRmOB3gQ4AZ8rbIdyzTbAFt_Yi56D6-_GHV7miAlv/exec';

// Fichas de Produção (preencher após criar o Sheets de Fichas)
const SHEETS_FICHAS_URL = 'https://script.google.com/a/macros/eclisboa.net/s/AKfycbzhKheayYwBaIVNoz0dgHkb8JK1w8dViGY2T_HUILD2CXJJ7EPaIcnR97_uxBOqbRHw/exec';

// ── Chaves localStorage ──────────────────────────────────────
const KEYS = {
  comandas:      'ecl_comandas',
  selecoes:      'ecl_selecoes',
  validacoes:    'ecl_validacoes',
  atividades:    'ecl_atividades',
  turmas:        'ecl_turmas',
  alunos:        'ecl_alunos',
  planos:        'ecl_planos',
  fichas:        'ecl_fichas',
  distribuicoes: 'ecl_distribuicoes',
  checklists:    'ecl_checklists',
  requisicoes:   'ecl_requisicoes',
  syncPlanos:    'ecl_sync_planos_ts',
  syncFichas:    'ecl_sync_fichas_ts',
};

// ── Utilitários localStorage ─────────────────────────────────
function load<T>(key: string): T[] {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : []; }
  catch { return []; }
}

function save<T>(key: string, data: T[]): void {
  try { localStorage.setItem(key, JSON.stringify(data)); }
  catch (e) { console.error('Erro ao guardar', key, e); }
}

async function enviar(url: string, tipo: string, dados: Record<string, unknown>): Promise<void> {
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ tipo, ...dados }),
    });
  } catch (e) { console.error('Erro Sheets:', e); }
}

async function lerDoSheets(url: string, params: Record<string, string>): Promise<any> {
  if (!url) return null;
  try {
    const u = new URL(url);
    Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
    const res = await fetch(u.toString());
    return await res.json();
  } catch (e) {
    console.warn('Erro ao ler do Sheets:', e);
    return null;
  }
}

// Verifica fichas similares no Sheets de Fichas
export async function buscarFichasSimilares(nome: string): Promise<Array<{id: string; nomePrato: string; classificacao: string; linkFicha: string; data: string}>> {
  if (!SHEETS_FICHAS_URL || !nome) return [];
  try {
    const res = await lerDoSheets(SHEETS_FICHAS_URL, { tipo: 'buscar_similar', nome });
    return res?.ok ? (res.dados || []) : [];
  } catch { return []; }
}

// ── Sincronização do Sheets para localStorage ─────────────────
// Chamada na inicialização da app — carrega dados do Sheets se houver URL
export async function sincronizarDoSheets(turmaId: string): Promise<void> {
  try {
    // Carregar planos do Sheets de Planos
    if (SHEETS_PLANOS_URL) {
      const jsonPlanos = await lerDoSheets(SHEETS_PLANOS_URL, { tipo: 'get_planos', turmaId });
      if (jsonPlanos?.ok && jsonPlanos.dados?.length > 0) {
        const locais = getPlanosAula();
        const merged = [...locais];
        for (const p of jsonPlanos.dados) {
          const idx = merged.findIndex((x: PlanoAula) => x.id === p.id);
          if (idx >= 0) {
            if (new Date(p.atualizadoEm) > new Date((merged[idx] as any).atualizadoEm || '')) merged[idx] = p;
          } else merged.push(p);
        }
        save(KEYS.planos, merged);
      }
    }

    // Carregar índice de fichas do Sheets de Fichas
    if (SHEETS_FICHAS_URL) {
      const jsonFichas = await lerDoSheets(SHEETS_FICHAS_URL, { tipo: 'get_fichas' });
      if (jsonFichas?.ok && jsonFichas.dados?.length > 0) {
        const locais = getFichasProducao();
        const merged = [...locais];
        for (const f of jsonFichas.dados) {
          const idx = merged.findIndex((x: FichaProducao) => x.id === f.id);
          if (idx < 0) merged.push({ ...f, ingredientes: [], preparacao: [] });
        }
        save(KEYS.fichas, merged);
      }
    }

    localStorage.setItem(KEYS.syncPlanos, new Date().toISOString());
  } catch (e) {
    console.warn('Sincronização falhou — a usar dados locais:', e);
  }
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
  enviar(SHEETS_PLANOS_URL, 'plano', { plano: p });
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
  enviar(SHEETS_FICHAS_URL, 'ficha', { ficha: f });
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
  // Enviar para Sheets histórico (como já estava)
  enviar(SHEETS_PLANOS_URL, 'requisicao', r as unknown as Record<string, unknown>);
}

// ── Comandas / Seleções / Validações ─────────────────────────
export function getComandas(): Comanda[] { return load<Comanda>(KEYS.comandas); }

export function addComanda(c: Comanda): void {
  const all = getComandas();
  all.push(c);
  save(KEYS.comandas, all);
  enviar(SHEETS_HISTORICO_URL, 'comanda', c as unknown as Record<string, unknown>);
}

export function updateComanda(c: Comanda): void {
  const all = getComandas();
  const idx = all.findIndex(x => x.id === c.id);
  if (idx >= 0) all[idx] = c;
  save(KEYS.comandas, all);
  enviar(SHEETS_HISTORICO_URL, 'comanda', c as unknown as Record<string, unknown>);
}

export function getSelecoes(): SelecaoAluno[] { return load<SelecaoAluno>(KEYS.selecoes); }
export function getValidacoes(): Validacao[] { return load<Validacao>(KEYS.validacoes); }
export function getAtividades(): Atividade[] { return load<Atividade>(KEYS.atividades); }
export function getPlanosAulaFn(): PlanoAula[] { return getPlanosAula(); }

export function addOrUpdateSelecao(s: SelecaoAluno): void {
  const all = getSelecoes();
  const idx = all.findIndex(x => x.id === s.id);
  if (idx >= 0) all[idx] = s; else all.push(s);
  save(KEYS.selecoes, all);
  enviar(SHEETS_HISTORICO_URL, 'avaliacao', s as unknown as Record<string, unknown>);
}

export function addOrUpdateValidacao(v: Validacao): void {
  const all = getValidacoes();
  const idx = all.findIndex(x => x.id === v.id);
  if (idx >= 0) all[idx] = v; else all.push(v);
  save(KEYS.validacoes, all);
  enviar(SHEETS_HISTORICO_URL, 'validacao', v as unknown as Record<string, unknown>);
}

export function addOrUpdateAtividade(a: Atividade): void {
  const all = getAtividades();
  const idx = all.findIndex(x => x.id === a.id);
  if (idx >= 0) all[idx] = a; else all.push(a);
  save(KEYS.atividades, all);
}

// ── Histórico de avaliações ──────────────────────────────────
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

  // Enriquecer com dados para o Apps Script do Histórico
  const aluno = getAlunos().find(a => a.id === r.alunoId);
  const plano = getPlanosAula().find(p => p.id === r.planoAulaId);
  const ficha = getFichasProducao().find(f => f.id === r.fichaId);

  enviar(SHEETS_HISTORICO_URL, 'avaliacao', {
    ...r,
    tipo: 'avaliacao',
    nomeAluno: aluno?.nome || ('Aluno ' + (aluno?.numero || 0)),
    numero: aluno?.numero || 0,
    ano: aluno?.ano || 1,
    planoTitulo: plano?.titulo || '',
    ucId: r.ucId || plano?.ucId || '',
    fichaNome: ficha?.nomePrato || '',
    microcompetencia: r.microcompetenciaId,
    nota: r.nota,
    data: r.data,
    validadoPor: r.validadoPor,
  });
}

export function addRegistoPresenca(dados: {
  alunoId: string;
  turmaId: string;
  planoAulaId?: string;
  presente: boolean;
  atrasado?: boolean;
  atrasadoMins?: number;
  horaEntrada?: string;
  fardamentoOk?: boolean;
  observacao?: string;
  data?: string;
}): void {
  const aluno = getAlunos().find(a => a.id === dados.alunoId);
  const plano = getPlanosAula().find(p => p.id === dados.planoAulaId);
  enviar(SHEETS_HISTORICO_URL, 'presenca', {
    tipo: 'presenca',
    nomeAluno: aluno?.nome || ('Aluno ' + (aluno?.numero || 0)),
    numero: aluno?.numero || 0,
    turmaId: dados.turmaId,
    planoTitulo: plano?.titulo || '',
    ucId: plano?.ucId || '',
    presente: dados.presente,
    atrasado: dados.atrasado || false,
    atrasadoMins: dados.atrasadoMins || 0,
    horaEntrada: dados.horaEntrada || new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
    fardamentoOk: dados.fardamentoOk ?? true,
    observacao: dados.observacao || '',
    data: dados.data || new Date().toLocaleDateString('pt-PT'),
  });
}

// ── Estado de sincronização ──────────────────────────────────
export function getEstadoSync(): { temSheets: boolean; ultimaSync: string | null } {
  return {
    temSheets: !!(SHEETS_PLANOS_URL || SHEETS_FICHAS_URL),
    ultimaSync: localStorage.getItem(KEYS.syncPlanos),
  };
}

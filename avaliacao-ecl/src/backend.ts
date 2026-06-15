// ============================================================
// Backend — Avaliação ECL
// localStorage + envio opcional para Google Sheets via Apps Script
// Mantém compatibilidade com Comandas antigas
// ============================================================

import {
  Comanda,
  SelecaoAluno,
  Validacao,
  Atividade,
  Turma,
  Aluno,
  PlanoAula,
  FichaProducao,
  DistribuicaoFicha,
  ChecklistAlunoFicha,
  RequisicaoAula,
  MateriaPrima,
  HistoricoPreco,
} from './types';

const SHEET_URL = '';

const KEYS = {
  comandas: 'avaliacao_ecl_comandas',
  selecoes: 'avaliacao_ecl_selecoes',
  validacoes: 'avaliacao_ecl_validacoes',
  atividades: 'avaliacao_ecl_atividades',
  turmas: 'avaliacao_ecl_turmas',
  alunos: 'avaliacao_ecl_alunos',
  planosAula: 'avaliacao_ecl_planos_aula',
  fichasProducao: 'avaliacao_ecl_fichas_producao',
  distribuicoes: 'avaliacao_ecl_distribuicoes_ficha',
  checklistsAluno: 'avaliacao_ecl_checklists_aluno',
  requisicoes: 'avaliacao_ecl_requisicoes',
  materiasPrimas: 'avaliacao_ecl_materias_primas',
  historicoPrecos: 'avaliacao_ecl_historico_precos',
};

function load<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Erro ao guardar', key, e);
  }
}

function upsert<T extends { id: string }>(key: string, item: T): T[] {
  const all = load<T>(key);
  const idx = all.findIndex((x) => x.id === item.id);

  if (idx >= 0) all[idx] = item;
  else all.push(item);

  save(key, all);
  return all;
}

async function enviar(tabela: string, linha: Record<string, unknown>): Promise<void> {
  if (!SHEET_URL) return;

  try {
    await fetch(SHEET_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ tabela, linha }),
    });
  } catch (e) {
    console.error('Erro ao enviar para Sheets', e);
  }
}

// ============================================================
// PLANOS DE AULA
// ============================================================

export function getPlanosAula(): PlanoAula[] {
  return load<PlanoAula>(KEYS.planosAula);
}

export function getPlanoAula(id: string): PlanoAula | undefined {
  return getPlanosAula().find((p) => p.id === id);
}

export function getPlanosAulaPorTurma(turmaId: string): PlanoAula[] {
  return getPlanosAula().filter((p) => p.turmaId === turmaId);
}

export function addOrUpdatePlanoAula(p: PlanoAula): void {
  const atualizado: PlanoAula = {
    ...p,
    atualizadoEm: new Date().toISOString(),
  };

  upsert(KEYS.planosAula, atualizado);
  enviar('PlanosAula', atualizado as unknown as Record<string, unknown>);
}

export function criarPlanoAulaBase(params: {
  turmaId: string;
  professor: string;
  data: string;
  titulo?: string;
  horaInicio?: string;
  horaFim?: string;
}): PlanoAula {
  const now = new Date().toISOString();

  const plano: PlanoAula = {
    id: `plano_${Date.now()}`,
    turmaId: params.turmaId,
    professor: params.professor,
    data: params.data,
    horaInicio: params.horaInicio || '08:30',
    horaFim: params.horaFim || '17:30',
    titulo: params.titulo || `Plano de Aula - ${params.data}`,
    observacoes: '',
    fichasIds: [],
    estado: 'rascunho',
    criadoEm: now,
    atualizadoEm: now,
  };

  upsert(KEYS.planosAula, plano);
  enviar('PlanosAula', plano as unknown as Record<string, unknown>);

  return plano;
}

export function associarFichaAoPlano(planoId: string, fichaId: string): void {
  const plano = getPlanoAula(planoId);
  if (!plano) return;

  const fichasIds = plano.fichasIds.includes(fichaId)
    ? plano.fichasIds
    : [...plano.fichasIds, fichaId];

  addOrUpdatePlanoAula({
    ...plano,
    fichasIds,
    estado: 'fichas_pendentes',
  });
}

// ============================================================
// FICHAS DE PRODUÇÃO
// ============================================================

export function getFichasProducao(): FichaProducao[] {
  return load<FichaProducao>(KEYS.fichasProducao);
}

export function getFichaProducao(id: string): FichaProducao | undefined {
  return getFichasProducao().find((f) => f.id === id);
}

export function getFichasPorPlano(planoAulaId: string): FichaProducao[] {
  const plano = getPlanoAula(planoAulaId);
  if (!plano) return [];

  return getFichasProducao().filter((f) => plano.fichasIds.includes(f.id));
}

export function addOrUpdateFichaProducao(f: FichaProducao): void {
  const atualizada: FichaProducao = {
    ...f,
    atualizadoEm: new Date().toISOString(),
  };

  upsert(KEYS.fichasProducao, atualizada);
  enviar('FichasProducao', atualizada as unknown as Record<string, unknown>);
}

export function duplicarFichaProducao(fichaId: string): FichaProducao | undefined {
  const ficha = getFichaProducao(fichaId);
  if (!ficha) return undefined;

  const now = new Date().toISOString();

  const nova: FichaProducao = {
    ...ficha,
    id: `ficha_${Date.now()}`,
    nomePrato: `${ficha.nomePrato} - cópia`,
    planoAulaId: undefined,
    criadoEm: now,
    atualizadoEm: now,
  };

  addOrUpdateFichaProducao(nova);
  return nova;
}

// ============================================================
// DISTRIBUIÇÃO DAS FICHAS
// ============================================================

export function getDistribuicoesFicha(): DistribuicaoFicha[] {
  return load<DistribuicaoFicha>(KEYS.distribuicoes);
}

export function getDistribuicoesPorPlano(planoAulaId: string): DistribuicaoFicha[] {
  return getDistribuicoesFicha().filter((d) => d.planoAulaId === planoAulaId);
}

export function getDistribuicaoPorFicha(
  planoAulaId: string,
  fichaId: string
): DistribuicaoFicha | undefined {
  return getDistribuicoesFicha().find(
    (d) => d.planoAulaId === planoAulaId && d.fichaId === fichaId
  );
}

export function addOrUpdateDistribuicaoFicha(d: DistribuicaoFicha): void {
  upsert(KEYS.distribuicoes, d);
  enviar('DistribuicoesFicha', d as unknown as Record<string, unknown>);
}

// ============================================================
// CHECKLISTS DO ALUNO
// ============================================================

export function getChecklistsAluno(): ChecklistAlunoFicha[] {
  return load<ChecklistAlunoFicha>(KEYS.checklistsAluno);
}

export function getChecklistAlunoFicha(
  planoAulaId: string,
  fichaId: string,
  alunoId: string
): ChecklistAlunoFicha | undefined {
  return getChecklistsAluno().find(
    (c) =>
      c.planoAulaId === planoAulaId &&
      c.fichaId === fichaId &&
      c.alunoId === alunoId
  );
}

export function addOrUpdateChecklistAluno(c: ChecklistAlunoFicha): void {
  const atualizado: ChecklistAlunoFicha = {
    ...c,
    atualizadoEm: new Date().toISOString(),
  };

  upsert(KEYS.checklistsAluno, atualizado);
  enviar('ChecklistsAluno', atualizado as unknown as Record<string, unknown>);
}

// ============================================================
// REQUISIÇÕES
// ============================================================

export function getRequisicoes(): RequisicaoAula[] {
  return load<RequisicaoAula>(KEYS.requisicoes);
}

export function getRequisicao(id: string): RequisicaoAula | undefined {
  return getRequisicoes().find((r) => r.id === id);
}

export function getRequisicaoPorPlano(planoAulaId: string): RequisicaoAula | undefined {
  return getRequisicoes().find((r) => r.planoAulaId === planoAulaId);
}

export function addOrUpdateRequisicao(r: RequisicaoAula): void {
  const atualizada: RequisicaoAula = {
    ...r,
    atualizadaEm: new Date().toISOString(),
  };

  upsert(KEYS.requisicoes, atualizada);
  enviar('Requisicoes', atualizada as unknown as Record<string, unknown>);
}

export function gerarRequisicaoDoPlano(planoAulaId: string): RequisicaoAula | undefined {
  const plano = getPlanoAula(planoAulaId);
  if (!plano) return undefined;

  const fichas = getFichasPorPlano(planoAulaId);
  const linhasMap = new Map<string, any>();

  fichas.forEach((ficha) => {
    ficha.ingredientes.forEach((ing) => {
      const produto = (ing.produto || '').trim();
      if (!produto) return;

      const unidade = ing.un || '';
      const quantidade = parseFloat(String(ing.qt).replace(',', '.')) || 0;
      const key = `${produto.toLowerCase()}__${unidade.toLowerCase()}`;

      const atual = linhasMap.get(key);

      if (atual) {
        atual.quantidadeTotal += quantidade;
      } else {
        linhasMap.set(key, {
          id: `linha_${Date.now()}_${linhasMap.size}`,
          produto,
          unidade,
          quantidadeTotal: quantidade,
          precoUnitario: undefined,
          custoTotal: undefined,
          materiaPrimaId: undefined,
          obs: ing.obs || '',
        });
      }
    });
  });

  const now = new Date().toISOString();

  const requisicao: RequisicaoAula = {
    id: `req_${Date.now()}`,
    planoAulaId,
    turmaId: plano.turmaId,
    dataAula: plano.data,
    professor: plano.professor,
    fichasIds: plano.fichasIds,
    linhas: Array.from(linhasMap.values()),
    custoTotal: 0,
    estado: 'rascunho',
    criadaEm: now,
    atualizadaEm: now,
  };

  addOrUpdateRequisicao(requisicao);

  addOrUpdatePlanoAula({
    ...plano,
    requisicaoId: requisicao.id,
    estado: 'requisicao_pendente',
  });

  return requisicao;
}

// ============================================================
// MATÉRIAS-PRIMAS E HISTÓRICO DE PREÇOS
// ============================================================

export function getMateriasPrimas(): MateriaPrima[] {
  return load<MateriaPrima>(KEYS.materiasPrimas);
}

export function getMateriaPrima(id: string): MateriaPrima | undefined {
  return getMateriasPrimas().find((m) => m.id === id);
}

export function procurarMateriaPrima(nome: string): MateriaPrima | undefined {
  const termo = nome.trim().toLowerCase();
  return getMateriasPrimas().find((m) => m.nome.trim().toLowerCase() === termo);
}

export function addOrUpdateMateriaPrima(m: MateriaPrima): void {
  upsert(KEYS.materiasPrimas, m);
  enviar('MateriasPrimas', m as unknown as Record<string, unknown>);
}

export function getHistoricoPrecos(): HistoricoPreco[] {
  return load<HistoricoPreco>(KEYS.historicoPrecos);
}

export function addHistoricoPreco(h: HistoricoPreco): void {
  const all = getHistoricoPrecos();
  all.push(h);
  save(KEYS.historicoPrecos, all);
  enviar('HistoricoPrecos', h as unknown as Record<string, unknown>);
}

export function precoEstaAtualizado(dataISO: string, dias = 30): boolean {
  const data = new Date(dataISO).getTime();
  const agora = Date.now();
  const diffDias = (agora - data) / (1000 * 60 * 60 * 24);
  return diffDias <= dias;
}

// ============================================================
// COMANDAS — compatibilidade com sistema antigo
// ============================================================

export function getComandas(): Comanda[] {
  return load<Comanda>(KEYS.comandas);
}

export function addComanda(c: Comanda): void {
  const all = getComandas();
  all.push(c);
  save(KEYS.comandas, all);
  enviar('Comandas', c as unknown as Record<string, unknown>);
}

export function updateComanda(c: Comanda): void {
  upsert(KEYS.comandas, c);
  enviar('Comandas', c as unknown as Record<string, unknown>);
}

// ============================================================
// SELEÇÕES DOS ALUNOS
// ============================================================

export function getSelecoes(): SelecaoAluno[] {
  return load<SelecaoAluno>(KEYS.selecoes);
}

export function addOrUpdateSelecao(s: SelecaoAluno): void {
  upsert(KEYS.selecoes, s);
  enviar('SelecoesAvaliacao', s as unknown as Record<string, unknown>);
}

// ============================================================
// VALIDAÇÕES DO PROFESSOR
// ============================================================

export function getValidacoes(): Validacao[] {
  return load<Validacao>(KEYS.validacoes);
}

export function addOrUpdateValidacao(v: Validacao): void {
  upsert(KEYS.validacoes, v);
  enviar('Validacoes', v as unknown as Record<string, unknown>);
}

// ============================================================
// ATIVIDADES EXTRACURRICULARES
// ============================================================

export function getAtividades(): Atividade[] {
  return load<Atividade>(KEYS.atividades);
}

export function addOrUpdateAtividade(a: Atividade): void {
  upsert(KEYS.atividades, a);
  enviar('Atividades', a as unknown as Record<string, unknown>);
}

// ============================================================
// TURMAS E ALUNOS
// ============================================================

export function getTurmas(): Turma[] {
  const t = load<Turma>(KEYS.turmas);

  if (t.length === 0) {
    const seed: Turma[] = [
      { id: 'CP1', nome: 'CP Cozinha/Pastelaria - Turma 1' },
    ];

    save(KEYS.turmas, seed);
    return seed;
  }

  return t;
}

export function addOrUpdateTurma(t: Turma): void {
  upsert(KEYS.turmas, t);
  enviar('Turmas', t as unknown as Record<string, unknown>);
}

export function getAlunos(): Aluno[] {
  return load<Aluno>(KEYS.alunos);
}

export function getAlunosPorTurma(turmaId: string): Aluno[] {
  return getAlunos().filter((a) => a.turmaId === turmaId);
}

export function addAluno(a: Aluno): void {
  const all = getAlunos();

  if (!all.find((x) => x.id === a.id)) {
    all.push(a);
    save(KEYS.alunos, all);
    enviar('Alunos', a as unknown as Record<string, unknown>);
  }
}

export function addOrUpdateAluno(a: Aluno): void {
  upsert(KEYS.alunos, a);
  enviar('Alunos', a as unknown as Record<string, unknown>);
}

export function getOrCreateAluno(
  turmaId: string,
  numero: number,
  ano: 1 | 2 | 3
): Aluno {
  const id = `${turmaId}-${numero}`;
  const all = getAlunos();
  let aluno = all.find((a) => a.id === id);

  if (!aluno) {
    aluno = { id, turmaId, numero, ano };
    addAluno(aluno);
  } else if (aluno.ano !== ano) {
    aluno.ano = ano;
    save(KEYS.alunos, all);
  }

  return aluno;
}

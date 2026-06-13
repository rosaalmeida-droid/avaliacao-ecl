// ============================================================
// Backend — localStorage (funcional offline) + envio opcional
// para Google Sheets via Apps Script (mesmo padrão do KitchenFlow)
// ============================================================

import { Comanda, SelecaoAluno, Validacao, Atividade, Turma, Aluno } from './types';

// Preencher quando o Apps Script desta app estiver criado/publicado.
const SHEET_URL = '';

const KEYS = {
  comandas: 'avaliacao_ecl_comandas',
  selecoes: 'avaliacao_ecl_selecoes',
  validacoes: 'avaliacao_ecl_validacoes',
  atividades: 'avaliacao_ecl_atividades',
  turmas: 'avaliacao_ecl_turmas',
  alunos: 'avaliacao_ecl_alunos',
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

/** Envia uma linha para o Google Sheets, se SHEET_URL estiver configurado. */
async function enviar(tabela: string, linha: Record<string, unknown>): Promise<void> {
  if (!SHEET_URL) return; // ainda não configurado — apenas guarda localmente
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

// ------------------------------------------------------------------
// Comandas
// ------------------------------------------------------------------
export function getComandas(): Comanda[] {
  return load<Comanda>(KEYS.comandas);
}

export function addComanda(c: Comanda): void {
  const all = getComandas();
  all.push(c);
  save(KEYS.comandas, all);
  enviar('Comandas', c as unknown as Record<string, unknown>);
}

// ------------------------------------------------------------------
// Seleções dos alunos
// ------------------------------------------------------------------
export function getSelecoes(): SelecaoAluno[] {
  return load<SelecaoAluno>(KEYS.selecoes);
}

export function addOrUpdateSelecao(s: SelecaoAluno): void {
  const all = getSelecoes();
  const idx = all.findIndex(x => x.id === s.id);
  if (idx >= 0) all[idx] = s;
  else all.push(s);
  save(KEYS.selecoes, all);
  enviar('SelecoesAvaliacao', s as unknown as Record<string, unknown>);
}

// ------------------------------------------------------------------
// Validações do professor
// ------------------------------------------------------------------
export function getValidacoes(): Validacao[] {
  return load<Validacao>(KEYS.validacoes);
}

export function addOrUpdateValidacao(v: Validacao): void {
  const all = getValidacoes();
  const idx = all.findIndex(x => x.id === v.id);
  if (idx >= 0) all[idx] = v;
  else all.push(v);
  save(KEYS.validacoes, all);
  enviar('Validacoes', v as unknown as Record<string, unknown>);
}

// ------------------------------------------------------------------
// Atividades extracurriculares (eventos/concursos)
// ------------------------------------------------------------------
export function getAtividades(): Atividade[] {
  return load<Atividade>(KEYS.atividades);
}

export function addOrUpdateAtividade(a: Atividade): void {
  const all = getAtividades();
  const idx = all.findIndex(x => x.id === a.id);
  if (idx >= 0) all[idx] = a;
  else all.push(a);
  save(KEYS.atividades, all);
  enviar('Atividades', a as unknown as Record<string, unknown>);
}

// ------------------------------------------------------------------
// Turmas e Alunos (configuração básica)
// ------------------------------------------------------------------
export function getTurmas(): Turma[] {
  const t = load<Turma>(KEYS.turmas);
  if (t.length === 0) {
    // seed inicial
    const seed: Turma[] = [{ id: 'CP1', nome: 'CP Cozinha/Pastelaria - Turma 1' }];
    save(KEYS.turmas, seed);
    return seed;
  }
  return t;
}

export function getAlunos(): Aluno[] {
  return load<Aluno>(KEYS.alunos);
}

export function addAluno(a: Aluno): void {
  const all = getAlunos();
  if (!all.find(x => x.id === a.id)) {
    all.push(a);
    save(KEYS.alunos, all);
  }
}

export function getOrCreateAluno(turmaId: string, numero: number): Aluno {
  const id = `${turmaId}-${numero}`;
  const all = getAlunos();
  let aluno = all.find(a => a.id === id);
  if (!aluno) {
    aluno = { id, turmaId, numero };
    addAluno(aluno);
  }
  return aluno;
}

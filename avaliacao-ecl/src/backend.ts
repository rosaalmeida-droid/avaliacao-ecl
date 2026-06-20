// ============================================================
// Backend ECL — localStorage (primário) + Google Sheets (persistência)
// localStorage: acesso imediato e offline
// Sheets: backup permanente — nunca perde dados ao mudar browser
// ============================================================

import {
  Comanda, SelecaoAluno, Validacao, Atividade,
  Turma, Aluno, PlanoAula, FichaProducao,
  DistribuicaoFicha, ChecklistAlunoFicha, RequisicaoAula, RecuperacaoModulo
} from './types';
import { microsPorUC, ATITUDES, OBRIGATORIAS } from './competenciasECL';

// ── URLs dos Apps Scripts ────────────────────────────────────
// Histórico de avaliações dos alunos (já configurado e a funcionar)
const SHEETS_HISTORICO_URL = 'https://script.google.com/a/macros/eclisboa.net/s/AKfycbw9F0aZWCQOi-zIDUaMljLkAh3ilWt9R6D_EZe3as3pFm234q3u8iF1428Ga86ma_aYTg/exec';

// Planos de Aula (preencher após criar o Sheets de Planos)
const SHEETS_PLANOS_URL = 'https://script.google.com/a/macros/eclisboa.net/s/AKfycbxT00cLo_mTHjv-swqo-lxqdq-YRmOB3gQ4AZ8rbIdyzTbAFt_Yi56D6-_GHV7miAlv/exec';

// Fichas de Produção (preencher após criar o Sheets de Fichas)
const SHEETS_FICHAS_URL = 'https://script.google.com/a/macros/eclisboa.net/s/AKfycbzhKheayYwBaIVNoz0dgHkb8JK1w8dViGY2T_HUILD2CXJJ7EPaIcnR97_uxBOqbRHw/exec';

// URL do Apps Script de Requisição (apps_script_requisicao_v3.js) — preenche a sheet
// modelo com ingredientes, preços, turma, data, formador, responsável e atividade.
export const SHEETS_REQUISICAO_URL = 'https://script.google.com/macros/s/AKfycbz7g1xOC8gg23zI-wbE5ttAIHVj0l7GQrGkhSudCRvJqvgL5OK3bsBRmOSu4nNsEpR4aA/exec';

export const SHEETS_CALENDARIO_URL = 'https://script.google.com/macros/s/AKfycbxYOWQNb1UkzTocol56UhXk8ORQ8WlZHKGPU3l-got80WBSWr1I-4sCrdfO5Nhas3Hjgw/exec';

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
  presencas:     'ecl_presencas',
  recuperacoes:  'ecl_recuperacoes',
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
        for (const pRaw of jsonPlanos.dados) {
          // Normalizar — o Sheets pode devolver campos array como string (CSV de uma célula)
          const p: any = {
            ...pRaw,
            fichasIds: Array.isArray(pRaw.fichasIds) ? pRaw.fichasIds
              : (typeof pRaw.fichasIds === 'string' && pRaw.fichasIds ? pRaw.fichasIds.split(/[;,]/).map((s: string) => s.trim()).filter(Boolean) : []),
            compRemovidas: Array.isArray(pRaw.compRemovidas) ? pRaw.compRemovidas : [],
            compAdicionadas: Array.isArray(pRaw.compAdicionadas) ? pRaw.compAdicionadas : [],
          };
          const idx = merged.findIndex((x: PlanoAula) => x.id === p.id);
          if (idx >= 0) {
            if (new Date(p.atualizadoEm) > new Date((merged[idx] as any).atualizadoEm || '')) merged[idx] = p;
          } else merged.push(p);
        }
        save(KEYS.planos, merged);
      }
    }

    // Carregar índice de fichas do Sheets de Fichas
    // O índice agora também traz htmlCompleto (ficha formatada pronta a mostrar) —
    // os dados estruturados (ingredientes/preparação) continuam só no localStorage
    // de origem, mas o aluno pode sempre ver/imprimir a versão completa em HTML.
    if (SHEETS_FICHAS_URL) {
      const jsonFichas = await lerDoSheets(SHEETS_FICHAS_URL, { tipo: 'get_fichas' });
      if (jsonFichas?.ok && jsonFichas.dados?.length > 0) {
        const locais = getFichasProducao();
        const merged = [...locais];
        for (const f of jsonFichas.dados) {
          const idx = merged.findIndex((x: FichaProducao) => x.id === f.id);
          if (idx < 0) {
            merged.push({ ...f, ingredientes: [], preparacao: [], htmlCompleto: f.htmlCompleto || '' });
          } else if (f.htmlCompleto && !(merged[idx] as any).htmlCompleto) {
            // Já existe localmente mas sem HTML — completar com o que veio do Sheets
            merged[idx] = { ...merged[idx], htmlCompleto: f.htmlCompleto } as any;
          }
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

export function getPlanosAulaPorTurma(turmaId: string, incluirArquivados = false): PlanoAula[] {
  return getPlanosAula()
    .filter(p => p.turmaId === turmaId)
    .filter(p => incluirArquivados || p.estado !== 'arquivado')
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''));
}

export function addOrUpdatePlanoAula(p: PlanoAula): void {
  const all = getPlanosAula();
  const idx = all.findIndex(x => x.id === p.id);
  if (idx >= 0) all[idx] = p; else all.push(p);
  save(KEYS.planos, all);
  enviar(SHEETS_PLANOS_URL, 'plano', { plano: p });
  sincronizarPlanoComCalendario(p);
}

// Remove um plano de aula só localmente (o registo no Sheets/Calendário fica
// Arquiva um plano — desaparece da vista normal mas fica guardado, recuperável.
// Mais simples e seguro do que eliminar de verdade: nunca se perde nada por engano.
export function arquivarPlanoAula(planoId: string): void {
  const all = getPlanosAula();
  const idx = all.findIndex(p => p.id === planoId);
  if (idx >= 0) {
    all[idx] = { ...all[idx], estado: 'arquivado', atualizadoEm: new Date().toISOString() };
    save(KEYS.planos, all);
    enviar(SHEETS_PLANOS_URL, 'plano', { plano: all[idx] });
  }
}

// Traz um plano arquivado de volta — repõe o estado anterior (rascunho, para
// o professor decidir se publica de novo).
export function desarquivarPlanoAula(planoId: string): void {
  const all = getPlanosAula();
  const idx = all.findIndex(p => p.id === planoId);
  if (idx >= 0) {
    all[idx] = { ...all[idx], estado: 'rascunho', atualizadoEm: new Date().toISOString() };
    save(KEYS.planos, all);
    enviar(SHEETS_PLANOS_URL, 'plano', { plano: all[idx] });
  }
}

// Lista só os planos arquivados de uma turma — usado no ecrã "Arquivo"
export function getPlanosArquivados(turmaId: string): PlanoAula[] {
  return getPlanosAula()
    .filter(p => p.turmaId === turmaId && p.estado === 'arquivado')
    .sort((a, b) => (b.atualizadoEm || '').localeCompare(a.atualizadoEm || ''));
}

// Envia o plano para o Google Calendar — usa sempre a DATA DA AULA (p.data),
// nunca a data em que o plano foi criado. Não bloqueia nem espera resposta.
function sincronizarPlanoComCalendario(p: PlanoAula): void {
  if (!SHEETS_CALENDARIO_URL || !p.data) return;
  const fichas = getFichasProducao().filter(f => p.fichasIds.includes(f.id)).map(f => f.nomePrato);
  const temRequisicao = getRequisicoes().some(r => r.planoAulaId === p.id);
  enviar(SHEETS_CALENDARIO_URL, 'plano', {
    planoId: p.id,
    data: p.data,
    horaInicio: p.horaInicio,
    horaFim: p.horaFim,
    titulo: p.titulo,
    ucId: p.ucId || '',
    ucNome: p.ucNome || '',
    turmaId: p.turmaId,
    professor: p.professor,
    fichas,
    temRequisicao,
  });
}

// ── Fichas de Produção ───────────────────────────────────────
export function getFichasProducao(): FichaProducao[] {
  const fichas = load<FichaProducao>(KEYS.fichas);
  // Corrigir retroactivamente fichas antigas com campo "data" malformado
  // (ex: "00:00:00" — gravado antes da correção do Apps Script que tratava
  // objetos Date incorretamente). Não altera o que já está correto.
  let mudou = false;
  const corrigidas = fichas.map(f => {
    const dataRaw = (f.data || '').trim();
    const pareceSoHora = /^\d{1,2}:\d{2}(:\d{2})?$/.test(dataRaw);
    if (pareceSoHora) {
      mudou = true;
      const dataFallback = f.criadoEm ? new Date(f.criadoEm).toLocaleDateString('pt-PT') : '';
      return { ...f, data: dataFallback };
    }
    return f;
  });
  if (mudou) save(KEYS.fichas, corrigidas);
  return corrigidas;
}

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
  // Enviar para Sheets histórico — aninhado em 'requisicao' como o Apps Script espera
  enviar(SHEETS_PLANOS_URL, 'requisicao', { requisicao: r });
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
  // Não enviar para o Sheets aqui — os dados reais por competência já vão
  // individualmente via addRegistoAvaliacao() chamado em AlunoView.submeter().
  // Enviar a SelecaoAluno completa como 'avaliacao' criava linhas vazias/lixo na sheet do aluno.
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

export interface RegistoPresenca {
  id: string;
  alunoId: string;
  turmaId: string;
  planoAulaId: string;
  ucId: string;
  presente: boolean;
  atrasado: boolean;
  atrasadoMins: number;
  horaEntrada: string;
  fardamentoOk: boolean;
  observacao: string;
  data: string;
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

  // Gravar localmente — necessário para a app conseguir CONSULTAR presenças
  // depois (ex: identificação automática de faltas para Recuperação de Módulos).
  // Antes só se enviava para o Sheets (escrita) sem guardar para leitura local.
  const registo: RegistoPresenca = {
    id: `presenca_${dados.alunoId}_${dados.planoAulaId || 'sem_plano'}_${Date.now()}`,
    alunoId: dados.alunoId,
    turmaId: dados.turmaId,
    planoAulaId: dados.planoAulaId || '',
    ucId: plano?.ucId || '',
    presente: dados.presente,
    atrasado: dados.atrasado || false,
    atrasadoMins: dados.atrasadoMins || 0,
    horaEntrada: dados.horaEntrada || new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
    fardamentoOk: dados.fardamentoOk ?? true,
    observacao: dados.observacao || '',
    data: dados.data || new Date().toLocaleDateString('pt-PT'),
  };
  const all = load<RegistoPresenca>(KEYS.presencas);
  // Evitar duplicar — se já houver registo deste aluno para este plano, substitui
  const idx = all.findIndex(r => r.alunoId === dados.alunoId && r.planoAulaId === dados.planoAulaId);
  if (idx >= 0) all[idx] = registo; else all.push(registo);
  save(KEYS.presencas, all);

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
    horaEntrada: registo.horaEntrada,
    fardamentoOk: dados.fardamentoOk ?? true,
    observacao: dados.observacao || '',
    data: registo.data,
  });
}

// Lê todas as presenças guardadas localmente
export function getPresencas(): RegistoPresenca[] {
  return load<RegistoPresenca>(KEYS.presencas);
}

// Para um aluno e uma UC, devolve os planos de aula dessa UC a que o aluno
// NÃO esteve presente (faltou) — usado para a Recuperação de Módulos.
export function getPlanosFaltadosPorUC(alunoId: string, ucId: string, turmaId: string): PlanoAula[] {
  const todosPlanosDaUC = getPlanosAula().filter(p => p.ucId === ucId && p.turmaId === turmaId && p.estado === 'publicado');
  const presencas = getPresencas().filter(r => r.alunoId === alunoId);
  return todosPlanosDaUC.filter(plano => {
    const registo = presencas.find(r => r.planoAulaId === plano.id);
    // Falta = não há registo de presença, OU há registo explícito de ausência
    return !registo || registo.presente === false;
  });
}

// ── Recuperação de Módulos ──────────────────────────────────────
const SHEETS_RECUPERACAO_URL = ''; // PENDENTE: preencher quando houver Apps Script dedicado

export function getRecuperacoes(): RecuperacaoModulo[] {
  return load<RecuperacaoModulo>(KEYS.recuperacoes);
}

export function getRecuperacoesPorAluno(alunoId: string): RecuperacaoModulo[] {
  return getRecuperacoes().filter(r => r.alunoId === alunoId);
}

export function getRecuperacoesPorTurma(turmaId: string): RecuperacaoModulo[] {
  return getRecuperacoes().filter(r => r.turmaId === turmaId);
}

export function addOrUpdateRecuperacao(r: RecuperacaoModulo): void {
  const all = getRecuperacoes();
  const idx = all.findIndex(x => x.id === r.id);
  if (idx >= 0) all[idx] = r; else all.push(r);
  save(KEYS.recuperacoes, all);
  if (SHEETS_RECUPERACAO_URL) {
    enviar(SHEETS_RECUPERACAO_URL, 'recuperacao', { recuperacao: r });
  }
}

// Determina o tipo de UC (técnica / organizacional / híbrida) com base nas
// microcompetências técnicas vs atitudes/responsabilidades associadas.
// Usado para adaptar o modelo de recuperação (com ou sem exigência prática).
export function classificarTipoUC(ucId: string): 'tecnica' | 'organizacional' | 'hibrida' {
  const tecnicas = microsPorUC(ucId);
  // Heurística simples: se há muitas microcompetências técnicas específicas da UC,
  // é predominantemente técnica. Se a UC não tem microcompetências técnicas próprias
  // (só usa as obrigatórias/atitudes), é organizacional. Caso intermédio é híbrida.
  if (tecnicas.length >= 4) return 'tecnica';
  if (tecnicas.length === 0) return 'organizacional';
  return 'hibrida';
}

// Constrói uma recuperação nova para um aluno+UC: identifica automaticamente
// os planos faltados, herda competências/atitudes/responsabilidades — sem o
// professor ter de escolher tudo manualmente outra vez.
export function criarRecuperacaoAutomatica(alunoId: string, turmaId: string, ucId: string, ucNome: string): RecuperacaoModulo {
  const planosFaltados = getPlanosFaltadosPorUC(alunoId, ucId, turmaId);
  const planosIds = planosFaltados.map(p => p.id);

  // Herdar competências dos planos seleccionados (união, sem duplicados)
  const competenciasSet = new Set<string>();
  const microsDaUC = microsPorUC(ucId);
  microsDaUC.forEach(m => competenciasSet.add(m.id));
  planosFaltados.forEach(p => {
    (p.compAdicionadas || []).forEach(c => competenciasSet.add(c));
    (p.compRemovidas || []).forEach(c => competenciasSet.delete(c));
  });

  const atitudesIds = ATITUDES.filter(a => a.prioridade === 'permanente' || a.prioridade === 'recorrente').map(a => a.id);
  const responsabilidadesIds = OBRIGATORIAS.map(o => o.id);

  const agora = new Date().toISOString();
  return {
    id: `recup_${alunoId}_${ucId}_${Date.now()}`,
    alunoId, turmaId, ucId, ucNome,
    tipoUC: classificarTipoUC(ucId),
    planosIds,
    competenciasIds: Array.from(competenciasSet),
    atitudesIds,
    responsabilidadesIds,
    estado: 'pendente',
    dataAtribuicao: agora,
    criadoEm: agora,
    atualizadoEm: agora,
  };
}

// Resumo de progresso de competências de uma UC para um aluno — combina o que
// foi demonstrado em aula com o que foi recuperado posteriormente.
export function getEstadoCompetenciasUC(alunoId: string, ucId: string): {
  total: number; demonstradasEmAula: number; recuperadas: number; estado: 'incompleto' | 'completo';
} {
  const micros = microsPorUC(ucId);
  const total = micros.length;
  const historico = getHistoricoAvaliacoes().filter(r => r.alunoId === alunoId && r.ucId === ucId && r.validadoPor !== 'recuperacao');
  const demonstradasEmAula = new Set(historico.filter(r => r.nota >= 12).map(r => r.microcompetenciaId)).size;
  const recuperacoesConcluidas = getRecuperacoes().filter(r => r.alunoId === alunoId && r.ucId === ucId && r.estado === 'concluida');
  const competenciasRecuperadas = new Set<string>();
  recuperacoesConcluidas.forEach(r => {
    (r.avaliacaoCompetencias || []).forEach(a => {
      if (a.nivel === 'consolidada' || a.nivel === 'avancada') competenciasRecuperadas.add(a.competenciaId);
    });
  });
  const recuperadas = competenciasRecuperadas.size;
  return { total, demonstradasEmAula, recuperadas, estado: (demonstradasEmAula + recuperadas) >= total ? 'completo' : 'incompleto' };
}

// ── Estado de sincronização ──────────────────────────────────
export function getEstadoSync(): { temSheets: boolean; ultimaSync: string | null } {
  return {
    temSheets: !!(SHEETS_PLANOS_URL || SHEETS_FICHAS_URL),
    ultimaSync: localStorage.getItem(KEYS.syncPlanos),
  };
}

// ── Cópia de segurança completa ────────────────────────────────
// Junta TODOS os dados guardados localmente num único objeto, para o
// professor poder descarregar e guardar como rede de segurança própria,
// independente do Google Sheets.
export interface CopiaSeguranca {
  versao: number;
  criadoEm: string;
  alunos: Aluno[];
  planos: PlanoAula[];
  fichas: FichaProducao[];
  distribuicoes: DistribuicaoFicha[];
  checklists: ChecklistAlunoFicha[];
  requisicoes: RequisicaoAula[];
  comandas: Comanda[];
  selecoes: SelecaoAluno[];
  validacoes: Validacao[];
  atividades: Atividade[];
  historicoAvaliacoes: RegistoAvaliacao[];
}

export function exportarTudo(): CopiaSeguranca {
  return {
    versao: 1,
    criadoEm: new Date().toISOString(),
    alunos: getAlunos(),
    planos: getPlanosAula(),
    fichas: getFichasProducao(),
    distribuicoes: getDistribuicoes(),
    checklists: getChecklists(),
    requisicoes: getRequisicoes(),
    comandas: getComandas(),
    selecoes: getSelecoes(),
    validacoes: getValidacoes(),
    atividades: getAtividades(),
    historicoAvaliacoes: getHistoricoAvaliacoes(),
  };
}

// Descarrega a cópia de segurança como ficheiro .json no computador do professor
export function descarregarCopiaSeguranca(): void {
  const dados = exportarTudo();
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dataHoje = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `avaliacao-ecl-copia-seguranca-${dataHoje}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Restaura dados a partir de uma cópia de segurança previamente exportada.
// modo 'substituir': apaga tudo o que existe e põe só o que está no ficheiro.
// modo 'juntar': mantém o que já existe e acrescenta/atualiza com o do ficheiro
// (entradas com o mesmo id são substituídas pela versão do ficheiro).
export function restaurarCopiaSeguranca(dados: CopiaSeguranca, modo: 'substituir' | 'juntar'): void {
  function aplicar<T extends { id: string }>(key: string, novos: T[]) {
    if (modo === 'substituir') {
      save(key, novos);
      return;
    }
    const actuais = load<T>(key);
    const merged = [...actuais];
    novos.forEach(n => {
      const idx = merged.findIndex(x => x.id === n.id);
      if (idx >= 0) merged[idx] = n; else merged.push(n);
    });
    save(key, merged);
  }

  aplicar(KEYS.alunos, dados.alunos || []);
  aplicar(KEYS.planos, dados.planos || []);
  aplicar(KEYS.fichas, dados.fichas || []);
  aplicar(KEYS.distribuicoes, dados.distribuicoes || []);
  aplicar(KEYS.checklists, dados.checklists || []);
  aplicar(KEYS.requisicoes, dados.requisicoes || []);
  aplicar(KEYS.comandas, dados.comandas || []);
  aplicar(KEYS.selecoes, dados.selecoes || []);
  aplicar(KEYS.validacoes, dados.validacoes || []);
  aplicar(KEYS.atividades, dados.atividades || []);
  // Histórico de avaliações usa chave própria fora de KEYS — tratar à parte
  if (modo === 'substituir') {
    save(KEY_HIST, dados.historicoAvaliacoes || []);
  } else {
    const actuais = load<RegistoAvaliacao>(KEY_HIST);
    const merged = [...actuais];
    (dados.historicoAvaliacoes || []).forEach(n => {
      const idx = merged.findIndex(x => x.id === n.id);
      if (idx >= 0) merged[idx] = n; else merged.push(n);
    });
    save(KEY_HIST, merged);
  }
}

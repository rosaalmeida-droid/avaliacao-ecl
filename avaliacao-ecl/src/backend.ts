// ============================================================
// Backend ECL — localStorage (primário) + Google Sheets (persistência)
// localStorage: acesso imediato e offline
// Sheets: backup permanente — nunca perde dados ao mudar browser
// ============================================================

import {
  Comanda, SelecaoAluno, Validacao, Atividade,
  Turma, Aluno, PlanoAula, FichaProducao,
  DistribuicaoFicha, ChecklistAlunoFicha, RequisicaoAula, RecuperacaoModulo, Evidencia,
  Aviso, MateriaPrimaCustom
} from './types';
import { microsPorUC, ATITUDES, OBRIGATORIAS, encontrarMicro } from './competenciasECL';
import { classificarGrupoCompetencia, gerarPromptPlanoIndividual, gerarPromptAnalisePreliminar } from './matrizEvidencias';
import { REFERENCIAL_811RA144 } from './referencial811RA144';

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
  evidencias:    'ecl_evidencias',
  avisos:        'ecl_avisos',
  materiasPrimasCustom: 'ecl_materias_primas_custom',
  syncPlanos:    'ecl_sync_planos_ts',
  syncFichas:    'ecl_sync_fichas_ts',
  // "Tombstones" — IDs eliminados definitivamente. Sem isto, a sincronização
  // via Sheets trazia de volta planos/fichas/requisições já apagados, porque
  // não distinguia "nunca existiu aqui" de "já existiu e foi eliminado".
  eliminadosPlanos:      'ecl_eliminados_planos',
  eliminadosFichas:      'ecl_eliminados_fichas',
  eliminadosRequisicoes: 'ecl_eliminados_requisicoes',
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
        const eliminados = new Set(load<string>(KEYS.eliminadosPlanos));
        const merged = [...locais];
        for (const pRaw of jsonPlanos.dados) {
          if (eliminados.has(pRaw.id)) continue; // já foi eliminado de propósito — não trazer de volta
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
        const eliminadas = new Set(load<string>(KEYS.eliminadosFichas));
        const merged = [...locais];
        for (const f of jsonFichas.dados) {
          if (eliminadas.has(f.id)) continue; // já foi eliminada de propósito — não trazer de volta
          const idx = merged.findIndex((x: FichaProducao) => x.id === f.id);
          if (idx < 0) {
            merged.push({ ...f, ingredientes: [], preparacao: [], htmlCompleto: f.htmlCompleto || '', textoGuia: f.textoGuia || '', planoAulaId: f.planoAulaId || undefined });
          } else {
            // Completar campos que possam faltar localmente mas existem no Sheets
            // — crítico para textoGuia (Guia de Apoio) e planoAulaId (ligação à
            // Recuperação de Módulos), que antes não sincronizavam entre dispositivos.
            const atualizado = { ...merged[idx] } as any;
            if (f.htmlCompleto && !atualizado.htmlCompleto) atualizado.htmlCompleto = f.htmlCompleto;
            if (f.textoGuia && !atualizado.textoGuia) atualizado.textoGuia = f.textoGuia;
            if (f.planoAulaId && !atualizado.planoAulaId) atualizado.planoAulaId = f.planoAulaId;
            merged[idx] = atualizado;
          }
        }
        save(KEYS.fichas, merged);
      }
    }

    // Carregar Recuperações e Evidências do Sheets dedicado — merge por ID,
    // a versão mais recente (atualizadoEm) ganha em caso de conflito.
    if (SHEETS_RECUPERACAO_URL) {
      const jsonRecup = await lerDoSheets(SHEETS_RECUPERACAO_URL, { tipo: 'recuperacoes', turmaId });
      if (jsonRecup?.ok && jsonRecup.dados?.length > 0) {
        const locais = getRecuperacoes();
        const merged = [...locais];
        for (const r of jsonRecup.dados) {
          const idx = merged.findIndex((x: RecuperacaoModulo) => x.id === r.id);
          if (idx < 0) merged.push(r);
          else if ((r.atualizadoEm || '') > (merged[idx].atualizadoEm || '')) merged[idx] = r;
        }
        save(KEYS.recuperacoes, merged);
      }

      const jsonEvid = await lerDoSheets(SHEETS_RECUPERACAO_URL, { tipo: 'evidencias' });
      if (jsonEvid?.ok && jsonEvid.dados?.length > 0) {
        const locais = getEvidencias();
        const idsLocais = new Set(locais.map((e: Evidencia) => e.id));
        const novas = jsonEvid.dados.filter((e: Evidencia) => !idsLocais.has(e.id));
        if (novas.length > 0) save(KEYS.evidencias, [...locais, ...novas]);
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

// Numeração sequencial robusta — baseada no MAIOR número já usado, nunca em
// .length (que desce se algo for eliminado e podia repetir números antigos).
// A partir de hoje (21/06/2026), o piso passa a ser 100, conforme decidido.
const PISO_NUMERACAO = 100;

export function proximoNumeroPlano(): number {
  const todos = getPlanosAula();
  const maior = todos.reduce((m, p) => Math.max(m, p.numeroPlan || 0), 0);
  return Math.max(maior + 1, PISO_NUMERACAO);
}

export function proximoNumeroFicha(): number {
  const todas = getFichasProducao();
  const maior = todas.reduce((m, f) => {
    const n = parseInt((f.fichaNum || '').replace(/\D/g, ''), 10);
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  return Math.max(maior + 1, PISO_NUMERACAO);
}

export function proximoNumeroRecuperacao(): number {
  const todas = getRecuperacoes();
  const maior = todas.reduce((m, r) => {
    const n = parseInt(((r as any).numeroRecuperacao || '').toString().replace(/\D/g, ''), 10);
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  return Math.max(maior + 1, PISO_NUMERACAO);
}

// Código do Plano de Aula: Ano-UC-Número, ex: "1-UC03586-100".
// Sem data — já existe como campo próprio do plano, não precisa duplicar.
export function gerarCodigoPlano(turmaId: string, ucId: string | undefined, numeroPlan: number): string {
  const aluno = getAlunos().find(a => a.turmaId === turmaId);
  const ano = aluno?.ano || '?';
  const ucLimpo = ucId || 'SemUC';
  return `${ano}-${ucLimpo}-${numeroPlan}`;
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

// Elimina o plano DEFINITIVAMENTE — local e no Sheets (linha removida da
// sheet Planos_Aula). Diferente de arquivar: não há forma de recuperar.
export function eliminarPlanoAulaDefinitivamente(planoId: string): void {
  save(KEYS.planos, getPlanosAula().filter(p => p.id !== planoId));
  // Registar tombstone — sem isto, a próxima sincronização trazia o plano
  // de volta do Sheets, porque não havia forma de saber que foi eliminado
  // de propósito (em vez de nunca ter existido localmente).
  const eliminados = load<string>(KEYS.eliminadosPlanos);
  if (!eliminados.includes(planoId)) save(KEYS.eliminadosPlanos, [...eliminados, planoId]);
  enviar(SHEETS_PLANOS_URL, 'eliminar_plano', { planoId });
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

// Elimina a ficha DEFINITIVAMENTE — local e no Sheets (remove a sheet
// individual da ficha e a linha correspondente no INDICE).
export function eliminarFichaProducaoDefinitivamente(fichaId: string): void {
  save(KEYS.fichas, getFichasProducao().filter(f => f.id !== fichaId));
  const eliminados = load<string>(KEYS.eliminadosFichas);
  if (!eliminados.includes(fichaId)) save(KEYS.eliminadosFichas, [...eliminados, fichaId]);
  enviar(SHEETS_FICHAS_URL, 'eliminar_ficha', { fichaId });
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
  // Como um plano pode ter várias requisições (ex: fichas mudaram a meio),
  // devolve sempre a mais recente — não a primeira encontrada.
  const todas = getRequisicoes().filter(r => r.planoAulaId === planoId);
  if (todas.length === 0) return undefined;
  return todas.sort((a, b) => (b.criadaEm || '').localeCompare(a.criadaEm || ''))[0];
}

// Devolve TODAS as requisições de um plano, mais recente primeiro — usada
// onde é preciso mostrar/gerir o histórico completo, não só a última.
export function getRequisicoesPorPlano(planoId: string): RequisicaoAula[] {
  return getRequisicoes()
    .filter(r => r.planoAulaId === planoId)
    .sort((a, b) => (b.criadaEm || '').localeCompare(a.criadaEm || ''));
}

export function addOrUpdateRequisicao(r: RequisicaoAula): void {
  const all = getRequisicoes();
  const idx = all.findIndex(x => x.id === r.id);
  if (idx >= 0) all[idx] = r; else all.push(r);
  save(KEYS.requisicoes, all);
  // Enviar para Sheets histórico — aninhado em 'requisicao' como o Apps Script espera
  enviar(SHEETS_PLANOS_URL, 'requisicao', { requisicao: r });
}

// Elimina a requisição DEFINITIVAMENTE — local e a linha correspondente no
// histórico de Requisições do Sheets de Planos.
export function eliminarRequisicaoDefinitivamente(requisicaoId: string): void {
  save(KEYS.requisicoes, getRequisicoes().filter(r => r.id !== requisicaoId));
  const eliminados = load<string>(KEYS.eliminadosRequisicoes);
  if (!eliminados.includes(requisicaoId)) save(KEYS.eliminadosRequisicoes, [...eliminados, requisicaoId]);
  enviar(SHEETS_PLANOS_URL, 'eliminar_requisicao', { requisicaoId });
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
// Script dedicado de Recuperações/Evidências — deploy concluído em 21/06/2026.
export const SHEETS_RECUPERACAO_URL = 'https://script.google.com/macros/s/AKfycbx5oRjHhh8OduNZcUFlK1MXEoJrJfqMwGoU1ZYgYj9ASlg3WsKbdrnM6etpVcXH_nalUg/exec';

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
// Verifica se uma recuperação está trancada (passou da dataLimite sem ser
// submetida, e o professor não destrancou manualmente). Calculado na hora —
// não depende de um campo gravado que possa ficar desatualizado.
export function recuperacaoEstaTrancada(r: RecuperacaoModulo): boolean {
  if (r.destrancadaPorProfessor) return false;
  if (r.estado !== 'pendente') return false; // já submetida — não tranca mais
  if (!r.dataLimite) return false;
  return new Date(r.dataLimite).getTime() < Date.now();
}

// O professor destranca a recuperação, dando mais tempo ao aluno — gera
// uma nova dataLimite de +1 mês a partir de agora.
export function destrancarRecuperacao(recuperacaoId: string): void {
  const all = getRecuperacoes();
  const idx = all.findIndex(r => r.id === recuperacaoId);
  if (idx >= 0) {
    const novaDataLimite = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    addOrUpdateRecuperacao({ ...all[idx], destrancadaPorProfessor: true, dataLimite: novaDataLimite, atualizadoEm: new Date().toISOString() });
  }
}

export function criarRecuperacaoAutomatica(alunoId: string, turmaId: string, ucId: string, ucNome: string): RecuperacaoModulo {
  const planosFaltados = getPlanosFaltadosPorUC(alunoId, ucId, turmaId);
  const planosIds = planosFaltados.map(p => p.id);

  // Herdar competências TÉCNICAS dos planos seleccionados (união, sem duplicados).
  // Apenas estas (Grupo A) e as responsabilidades (Grupo B) entram na exigência
  // de recuperação por escrito/defesa oral — as atitudes (Grupo C) NUNCA são
  // validadas por trabalho escrito, ver matrizEvidencias.ts e pontos 19-20 do
  // documento pedagógico "Arquitetura Pedagógica da Avaliação ECL".
  const competenciasSet = new Set<string>();
  const microsDaUC = microsPorUC(ucId);
  microsDaUC.forEach(m => competenciasSet.add(m.id));
  planosFaltados.forEach(p => {
    (p.compAdicionadas || []).forEach(c => competenciasSet.add(c));
    (p.compRemovidas || []).forEach(c => competenciasSet.delete(c));
  });

  const responsabilidadesIds = OBRIGATORIAS.map(o => o.id);

  // Atitudes ficam registadas como "pendentes de observação futura" — não
  // bloqueiam a conclusão da UC nem fazem parte do trabalho escrito do aluno.
  // São validadas em qualquer contexto futuro (outra UC, FCT, PAP) através
  // do Banco de Evidências (ver addEvidencia / getEvidenciasPorCompetencia).
  const atitudesIds = ATITUDES.filter(a => a.prioridade === 'permanente' || a.prioridade === 'recorrente').map(a => a.id);

  const agora = new Date().toISOString();
  // Prazo de 1 mês para o aluno submeter — depois disso a recuperação fica
  // trancada automaticamente, e só o professor a pode reabrir (decisão de
  // 21/06/2026: "podes pôr um mês, e depois tranca").
  const dataLimite = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  return {
    id: `recup_${alunoId}_${ucId}_${Date.now()}`,
    alunoId, turmaId, ucId, ucNome,
    numeroRecuperacao: proximoNumeroRecuperacao(),
    tipoUC: classificarTipoUC(ucId),
    planosIds,
    competenciasIds: Array.from(competenciasSet),
    atitudesIds, // informativo — não exigido como trabalho escrito na recuperação
    responsabilidadesIds,
    estado: 'pendente',
    dataAtribuicao: agora,
    dataLimite,
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

// Devolve os Guias de Apoio à Produção (já gerados) das fichas associadas aos
// planos de uma recuperação. O Guia é o centro do trabalho de recuperação —
// o aluno parte do conteúdo já existente (enquadramento, HACCP, food cost,
// questões), em vez de escrever tudo do zero numa caixa de texto vazia.
export function getGuiasDaRecuperacao(planosIds: string[]): { fichaId: string; nomePrato: string; textoGuia: string; planoAulaId: string }[] {
  const fichas = getFichasProducao();
  const planos = getPlanosAula().filter(p => planosIds.includes(p.id));
  // Fonte 1 (mais fiável): plano.fichasIds — sempre preenchido, inclusive em
  // fichas antigas criadas antes do campo planoAulaId existir na ficha.
  const fichasIdsViaPlano = new Set<string>();
  planos.forEach(p => (p.fichasIds || []).forEach(fid => fichasIdsViaPlano.add(fid)));

  const resultado = new Map<string, { fichaId: string; nomePrato: string; textoGuia: string; planoAulaId: string }>();
  fichas.forEach(f => {
    if (!f.textoGuia) return;
    // Aceita a ficha se: (a) o seu planoAulaId está na lista, OU (b) algum
    // dos planos em causa a referencia em fichasIds.
    const viaPlanoAulaId = f.planoAulaId && planosIds.includes(f.planoAulaId);
    const viaFichasIds = fichasIdsViaPlano.has(f.id);
    if (viaPlanoAulaId || viaFichasIds) {
      resultado.set(f.id, { fichaId: f.id, nomePrato: f.nomePrato, textoGuia: f.textoGuia!, planoAulaId: f.planoAulaId || planosIds[0] || '' });
    }
  });
  return Array.from(resultado.values());
}

// Constrói o prompt único do Plano de Recuperação Individual para uma
// recuperação concreta, cruzando: produções em falta, competências/
// responsabilidades por validar, atitudes pendentes, evidências já existentes
// (para não repetir o que já foi observado), referencial oficial, e o nível
// de medidas educativas do aluno.
export function construirPromptPlanoIndividual(recuperacaoId: string): string {
  const r = getRecuperacoes().find(x => x.id === recuperacaoId);
  if (!r) return '';
  const aluno = getAlunos().find(a => a.id === r.alunoId);
  const guias = getGuiasDaRecuperacao(r.planosIds);
  const refUC = REFERENCIAL_811RA144[r.ucId];
  const evidencias = getEvidenciasPorAluno(r.alunoId).filter(e =>
    [...r.competenciasIds, ...r.responsabilidadesIds, ...r.atitudesIds].includes(e.competenciaId) && e.nivel >= 2
  );

  return gerarPromptPlanoIndividual({
    nomeAluno: aluno?.nome || `Aluno ${aluno?.numero || ''}`,
    ucId: r.ucId,
    ucNome: r.ucNome,
    nivelMedidas: aluno?.nivelMedidas || 1,
    producoesFaltadas: guias.map(g => g.nomePrato),
    competenciasEmFalta: r.competenciasIds.map(getNomeCompetenciaGenerica),
    responsabilidadesEmFalta: r.responsabilidadesIds.map(getNomeCompetenciaGenerica),
    atitudesPendentes: r.atitudesIds.map(getNomeCompetenciaGenerica),
    evidenciasJaExistentes: evidencias.map(e => `${getNomeCompetenciaGenerica(e.competenciaId)} (nível ${e.nivel}, em ${new Date(e.data).toLocaleDateString('pt-PT')})`),
    realizacoesOficiais: refUC?.realizacoes || [],
  });
}

// Resultado estruturado devolvido pela Gemini — espelha o JSON pedido na
// função serverless /api/gerarPlanoRecuperacao.ts.
export interface PlanoIndividualGemini {
  resumo: string;
  tarefas: string[];
  questoesTecnicas: string[];
  casoProfissional: string;
  evidenciasExigidas: string[];
  competenciasComDefesaOral: string[];
  tempoEstimadoMinutos: number;
}

export type ResultadoGeracaoIA =
  | { ok: true; plano: PlanoIndividualGemini }
  | { ok: false; motivo: 'sem_chave' | 'limite_atingido' | 'erro_api' | 'resposta_invalida' | 'erro_rede' | 'erro_pedido'; mensagem: string };

// Tenta gerar o Plano de Recuperação Individual automaticamente via Gemini
// (free tier). Se a chave não estiver configurada na Vercel, ou se o limite
// diário gratuito for atingido, devolve ok:false com o motivo — a interface
// usa isso para cair automaticamente no modo manual (prompt copiável já
// existente), sem nunca bloquear o aluno.
export async function gerarPlanoRecuperacaoComIA(recuperacaoId: string): Promise<ResultadoGeracaoIA> {
  const prompt = construirPromptPlanoIndividual(recuperacaoId);
  if (!prompt) return { ok: false, motivo: 'erro_pedido', mensagem: 'Recuperação não encontrada.' };

  try {
    const res = await fetch('/api/gerarPlanoRecuperacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    const dados = await res.json();
    if (dados.ok) return { ok: true, plano: dados.plano };
    return { ok: false, motivo: dados.motivo || 'erro_api', mensagem: dados.mensagem || 'Erro desconhecido.' };
  } catch (err) {
    // Falha de rede, ou a função /api não existe nesta instalação (deploy
    // antigo sem a pasta api/) — cair no modo manual sem rebentar a app.
    return { ok: false, motivo: 'erro_rede', mensagem: String(err) };
  }
}

// Constrói o prompt de análise preliminar (ponto 11-13 da adenda) — o
// professor copia, cola numa IA, e cola o resultado de volta na app.
export function construirPromptAnalisePreliminar(recuperacaoId: string): string {
  const r = getRecuperacoes().find(x => x.id === recuperacaoId);
  if (!r) return '';
  const aluno = getAlunos().find(a => a.id === r.alunoId);
  const guias = getGuiasDaRecuperacao(r.planosIds);

  return gerarPromptAnalisePreliminar({
    nomeAluno: aluno?.nome || `Aluno ${aluno?.numero || ''}`,
    ucNome: r.ucNome,
    guiasTexto: guias.map(g => g.textoGuia),
    trabalhoTeorico: r.trabalhoTeorico || '',
    investigacao: r.investigacao || '',
    casoProfissional: r.casoProfissional || '',
    autoavaliacao: r.autoavaliacao || '',
    planoIndividualTexto: r.planoIndividualTexto,
  });
}

// ── Banco de Evidências ──────────────────────────────────────────
// Regista qualquer observação de competência/atitude/responsabilidade,
// independente da UC. Permite que uma atitude transversal (ex: Organização)
// pendente de observação numa UC seja validada noutra UC, mais tarde.
export function getEvidencias(): Evidencia[] {
  return load<Evidencia>(KEYS.evidencias);
}

export function getEvidenciasPorAluno(alunoId: string): Evidencia[] {
  return getEvidencias().filter(e => e.alunoId === alunoId);
}

export function getEvidenciasPorCompetencia(alunoId: string, competenciaId: string): Evidencia[] {
  return getEvidencias().filter(e => e.alunoId === alunoId && e.competenciaId === competenciaId);
}

export function addEvidencia(e: Evidencia): void {
  const all = getEvidencias();
  all.push(e);
  save(KEYS.evidencias, all);
  if (SHEETS_RECUPERACAO_URL) {
    enviar(SHEETS_RECUPERACAO_URL, 'evidencia', { evidencia: e });
  }
}

// Nível mais alto já registado para uma competência de um aluno — usado para
// não "recuar" o estado se já tiver sido observado um nível superior antes.
export function getNivelMaximoEvidencia(alunoId: string, competenciaId: string): 0 | 1 | 2 | 3 | 4 {
  const evidencias = getEvidenciasPorCompetencia(alunoId, competenciaId);
  if (evidencias.length === 0) return 0;
  return evidencias.reduce((max, e) => (e.nivel > max ? e.nivel : max), 0 as 0 | 1 | 2 | 3 | 4);
}

// ── Perfil Profissional do Aluno ─────────────────────────────────
// Junta histórico de avaliações + evidências + recuperações numa vista
// única, dividida em 4 áreas (pontos 32-35 do documento pedagógico):
// Competências Técnicas, Responsabilidades, Gestão/Organização, Atitudes.
export interface ItemPerfil {
  competenciaId: string;
  nome: string;
  nivel: 0 | 1 | 2 | 3 | 4;
  origem: 'aula' | 'recuperacao' | 'evidencia' | 'nao_observado';
  ultimaData?: string;
}

export interface PerfilProfissionalAluno {
  alunoId: string;
  tecnicas: ItemPerfil[];
  responsabilidades: ItemPerfil[];
  atitudes: ItemPerfil[];
  pontosFortes: string[];
  areasADesenvolver: string[];
}

function notaParaNivel(nota: number): 0 | 1 | 2 | 3 | 4 {
  if (nota >= 16) return 4;
  if (nota >= 12) return 3;
  if (nota >= 8) return 2;
  if (nota > 0) return 1;
  return 0;
}

export function getPerfilProfissionalAluno(alunoId: string): PerfilProfissionalAluno {
  const historico = getHistoricoAvaliacoes().filter(r => r.alunoId === alunoId);
  const evidencias = getEvidenciasPorAluno(alunoId);

  // Agrupar por competência: pegar sempre no nível mais alto já demonstrado
  // (consolidação não regride — ver ponto 29 do documento pedagógico).
  const porCompetencia = new Map<string, { nivel: 0 | 1 | 2 | 3 | 4; origem: ItemPerfil['origem']; data: string }>();

  historico.forEach(r => {
    const nivel = notaParaNivel(r.nota);
    const actual = porCompetencia.get(r.microcompetenciaId);
    if (!actual || nivel > actual.nivel) {
      porCompetencia.set(r.microcompetenciaId, {
        nivel, origem: r.validadoPor === 'recuperacao' ? 'recuperacao' : 'aula', data: r.data,
      });
    }
  });

  evidencias.forEach(e => {
    const actual = porCompetencia.get(e.competenciaId);
    if (!actual || e.nivel > actual.nivel) {
      porCompetencia.set(e.competenciaId, { nivel: e.nivel, origem: 'evidencia', data: e.data });
    }
  });

  const tecnicas: ItemPerfil[] = [];
  const responsabilidades: ItemPerfil[] = [];
  const atitudes: ItemPerfil[] = [];

  porCompetencia.forEach((info, competenciaId) => {
    const grupo = classificarGrupoCompetencia(competenciaId);
    const item: ItemPerfil = {
      competenciaId, nome: getNomeCompetenciaGenerica(competenciaId),
      nivel: info.nivel, origem: info.origem, ultimaData: info.data,
    };
    if (grupo === 'tecnica') tecnicas.push(item);
    else if (grupo === 'responsabilidade') responsabilidades.push(item);
    else atitudes.push(item);
  });

  // Pontos fortes: nível 3-4. Áreas a desenvolver: nível 0-1.
  const todos = [...tecnicas, ...responsabilidades, ...atitudes];
  const pontosFortes = todos.filter(i => i.nivel >= 3).map(i => i.nome);
  const areasADesenvolver = todos.filter(i => i.nivel <= 1).map(i => i.nome);

  return { alunoId, tecnicas, responsabilidades, atitudes, pontosFortes, areasADesenvolver };
}

function getNomeCompetenciaGenerica(id: string): string {
  if (id.startsWith('OBR_')) {
    const o = OBRIGATORIAS.find(x => x.id === id);
    return o?.nome || id;
  }
  if (id.startsWith('ATT_')) {
    const a = ATITUDES.find(x => x.id === id);
    return a?.nome || id;
  }
  const m = encontrarMicro(id);
  return m?.nome || id;
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
  presencas: RegistoPresenca[];
  recuperacoes: RecuperacaoModulo[];
  evidencias: Evidencia[];
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
    presencas: getPresencas(),
    recuperacoes: getRecuperacoes(),
    evidencias: getEvidencias(),
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
  aplicar(KEYS.presencas, dados.presencas || []);
  aplicar(KEYS.recuperacoes, dados.recuperacoes || []);
  aplicar(KEYS.evidencias, dados.evidencias || []);
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

// ── Centro de Avisos ──────────────────────────────────────────
// Lista transversal de problemas pendentes em toda a app — ingredientes
// sem preço confirmado, fichas incompletas, etc. O painel lateral lê daqui.
export function getAvisos(): Aviso[] {
  return load<Aviso>(KEYS.avisos);
}

export function getAvisosPendentes(): Aviso[] {
  const persistidos = getAvisos().filter(a => !a.resolvido);
  return [...persistidos, ...calcularAvisosOperacionais()];
}

// Avisos operacionais — recalculados a cada chamada, sempre fiéis ao estado
// real da app (não ficam desatualizados como avisos gravados ficariam).
// Cobrem todo o ciclo de trabalho do professor: plano → ficha → guia →
// requisição → avaliação → recuperação — para que o Centro de Avisos seja
// mesmo o painel central de gestão do dia a dia, como pedido.
function calcularAvisosOperacionais(): Aviso[] {
  const avisos: Aviso[] = [];
  const planos = getPlanosAula().filter(p => p.estado !== 'arquivado');
  const fichas = getFichasProducao();
  const requisicoes = getRequisicoes();
  const recuperacoes = getRecuperacoes();
  const comandas = getComandas();
  const validacoes = getValidacoes();

  planos.forEach(p => {
    // 1. Plano sem nenhuma ficha associada
    if ((p.fichasIds || []).length === 0) {
      avisos.push({
        id: `op_plano_sem_ficha_${p.id}`, tipo: 'plano_sem_ficha',
        titulo: `"${p.titulo || 'Plano de aula'}" ainda não tem ficha`,
        descricao: `Plano de ${p.data} sem nenhuma Ficha de Produção associada.`,
        contexto: { planoId: p.id, tabDestino: 'planos' },
        resolvido: false, criadoEm: p.criadoEm,
      });
    } else {
      // 2. Ficha(s) do plano sem Guia gerado
      const fichasDoPlano = fichas.filter(f => (p.fichasIds || []).includes(f.id));
      const semGuia = fichasDoPlano.filter(f => !f.textoGuia);
      if (semGuia.length > 0 && p.estado === 'publicado') {
        avisos.push({
          id: `op_ficha_sem_guia_${p.id}`, tipo: 'ficha_sem_guia',
          titulo: `Falta o Guia em "${p.titulo || 'plano'}"`,
          descricao: `${semGuia.length} ficha(s) sem Guia de Apoio gerado: ${semGuia.map(f => f.nomePrato).join(', ')}.`,
          contexto: { planoId: p.id, tabDestino: 'guia' },
          resolvido: false, criadoEm: p.criadoEm,
        });
      }
      // 3. Plano publicado, com fichas, mas sem Requisição feita
      const temRequisicao = requisicoes.some(r => r.planoAulaId === p.id);
      if (!temRequisicao && p.estado === 'publicado') {
        avisos.push({
          id: `op_plano_sem_req_${p.id}`, tipo: 'plano_sem_requisicao',
          titulo: `Falta a Requisição de "${p.titulo || 'plano'}"`,
          descricao: `Plano publicado com fichas, mas ainda sem requisição de ingredientes enviada.`,
          contexto: { planoId: p.id, tabDestino: 'requisicao' },
          resolvido: false, criadoEm: p.criadoEm,
        });
      }
    }
  });

  // 4. Recuperações submetidas pelo aluno, à espera de avaliação do professor
  recuperacoes.filter(r => r.estado === 'submetida' || r.estado === 'em_avaliacao').forEach(r => {
    avisos.push({
      id: `op_recup_avaliar_${r.id}`, tipo: 'recuperacao_por_avaliar',
      titulo: `Recuperação de ${r.ucId} por avaliar`,
      descricao: `Um aluno submeteu o trabalho de recuperação — aguarda avaliação.`,
      contexto: { tabDestino: 'gestao_recuperacoes' },
      resolvido: false, criadoEm: r.dataSubmissao || r.criadoEm,
    });
  });

  // 5. Comandas com selecções por validar (aluno já trabalhou, falta o professor validar)
  const comandasPendentes = comandas.filter(c => {
    const jaValidada = validacoes.some(v => (v as any).comandaId === c.id);
    return !jaValidada;
  });
  if (comandasPendentes.length > 0) {
    avisos.push({
      id: `op_validacao_pendente`, tipo: 'validacao_pendente',
      titulo: `${comandasPendentes.length} validação(ões) pendente(s)`,
      descricao: `Há comandas de alunos à espera de validação do professor.`,
      contexto: { tabDestino: 'validacao' },
      resolvido: false, criadoEm: new Date().toISOString(),
    });
  }

  return avisos;
}

// Cria um aviso, evitando duplicados óbvios (mesmo tipo + mesmo ingrediente
// já pendente não cria um segundo aviso igual).
export function addAviso(a: Omit<Aviso, 'id' | 'criadoEm' | 'resolvido'>): void {
  const all = getAvisos();
  const jaExiste = all.some(x =>
    !x.resolvido && x.tipo === a.tipo &&
    x.contexto?.ingredienteNome === a.contexto?.ingredienteNome
  );
  if (jaExiste) return;
  all.push({ ...a, id: `aviso_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, resolvido: false, criadoEm: new Date().toISOString() });
  save(KEYS.avisos, all);
}

export function resolverAviso(avisoId: string): void {
  const all = getAvisos();
  const idx = all.findIndex(a => a.id === avisoId);
  if (idx >= 0) {
    all[idx] = { ...all[idx], resolvido: true, resolvidoEm: new Date().toISOString() };
    save(KEYS.avisos, all);
  }
}

// Resolve automaticamente todos os avisos pendentes de um ingrediente —
// chamado quando o professor confirma/corrige o preço na Requisição.
export function resolverAvisosDoIngrediente(nomeIngrediente: string): void {
  const all = getAvisos();
  let mudou = false;
  const atualizados = all.map(a => {
    if (!a.resolvido && a.contexto?.ingredienteNome?.toLowerCase() === nomeIngrediente.toLowerCase()) {
      mudou = true;
      return { ...a, resolvido: true, resolvidoEm: new Date().toISOString() };
    }
    return a;
  });
  if (mudou) save(KEYS.avisos, atualizados);
}

// ── Base de Dados de Ingredientes (camada editável) ────────────────────
// Fica POR CIMA da base "de fábrica" (MATERIAS_PRIMAS_BASE, ~233 itens,
// só leitura). O professor nunca edita o ficheiro de código — só esta
// camada, que cresce organicamente sempre que confirma um preço na
// Requisição. Entradas aqui têm sempre prioridade sobre as de fábrica.
export function getMateriasPrimasCustom(): MateriaPrimaCustom[] {
  return load<MateriaPrimaCustom>(KEYS.materiasPrimasCustom);
}

export function addOrUpdateMateriaPrimaCustom(m: Omit<MateriaPrimaCustom, 'id' | 'criadoEm' | 'atualizadoEm'> & { id?: string }): MateriaPrimaCustom {
  const all = getMateriasPrimasCustom();
  const agora = new Date().toISOString();
  const idExistente = m.id || all.find(x => x.nome.toLowerCase() === m.nome.toLowerCase())?.id;
  const idx = idExistente ? all.findIndex(x => x.id === idExistente) : -1;
  const registo: MateriaPrimaCustom = {
    id: idExistente || `mp_custom_${Date.now()}`,
    nome: m.nome, categoria: m.categoria || 'Outros',
    unidadeCompra: m.unidadeCompra, precoKg: m.precoKg, precoUnitario: m.precoUnitario,
    aliases: m.aliases || [],
    criadoEm: idx >= 0 ? all[idx].criadoEm : agora,
    atualizadoEm: agora,
  };
  if (idx >= 0) all[idx] = registo; else all.push(registo);
  save(KEYS.materiasPrimasCustom, all);
  return registo;
}

export function eliminarMateriaPrimaCustom(id: string): void {
  save(KEYS.materiasPrimasCustom, getMateriasPrimasCustom().filter(m => m.id !== id));
}

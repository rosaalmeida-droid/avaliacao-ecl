// ============================================================
// Backend ECL — localStorage (primário) + Google Sheets (persistência)
// localStorage: acesso imediato e offline
// Sheets: backup permanente — nunca perde dados ao mudar browser
// ============================================================

import { ucsEquivalentes } from './cronograma';
import {
  Comanda, SelecaoAluno, Validacao, Atividade,
  Turma, Aluno, PlanoAula, FichaProducao,
  DistribuicaoFicha, ChecklistAlunoFicha, RequisicaoAula, RecuperacaoModulo, Evidencia,
  Aviso, MateriaPrimaCustom, EntradaManual
} from './types';
import { microsPorUC, ATITUDES, OBRIGATORIAS, encontrarMicro } from './compatECL';
import { classificarGrupoCompetencia, gerarPromptPlanoIndividual, gerarPromptAnalisePreliminar } from './matrizEvidencias';
import { REFERENCIAL_811RA144 } from './referencial811RA144';

// ── URLs dos Apps Scripts ────────────────────────────────────
// Histórico de avaliações dos alunos (já configurado e a funcionar)
const SHEETS_HISTORICO_URL = 'https://script.google.com/a/macros/eclisboa.net/s/AKfycbw9F0aZWCQOi-zIDUaMljLkAh3ilWt9R6D_EZe3as3pFm234q3u8iF1428Ga86ma_aYTg/exec';

// Planos de Aula (preencher após criar o Sheets de Planos)
const SHEETS_PLANOS_URL = 'https://script.google.com/a/macros/eclisboa.net/s/AKfycbxT00cLo_mTHjv-swqo-lxqdq-YRmOB3gQ4AZ8rbIdyzTbAFt_Yi56D6-_GHV7miAlv/exec';

// Fichas de Produção (preencher após criar o Sheets de Fichas)
const SHEETS_FICHAS_URL = 'https://script.google.com/a/macros/eclisboa.net/s/AKfycbzhKheayYwBaIVNoz0dgHkb8JK1w8dViGY2T_HUILD2CXJJ7EPaIcnR97_uxBOqbRHw/exec';
// Deployment do script RecuperacaoFCT_PDF_ECL.gs — a Rosa preenche isto
// depois de instalar o script (ver instruções no topo do ficheiro .gs).
const RECUPERACAO_FCT_PDF_URL = 'https://script.google.com/macros/s/AKfycbx7h4jNIwFHnmLEonsIjP4yJBDcFmn2kPEGl1ILeSChq26pUTlgbmf4ADwkKICqjyh38w/exec';


// URL do Apps Script de Requisição (apps_script_requisicao_v3.js) — preenche a sheet
// modelo com ingredientes, preços, turma, data, formador, responsável e atividade.
export const SHEETS_REQUISICAO_URL = 'https://script.google.com/macros/s/AKfycbweU15FtVE5AIdl-kpV0PCmuNxYsd4pUIfdSLIAmVIal7z0Sb2oGimGgsjKHUHYxDML/exec';
// ID do Google Sheets da Requisição — para abrir directamente após o envio
export const SHEETS_REQUISICAO_ID = ''; // preencher quando confirmado

export const SHEETS_CALENDARIO_URL = 'https://script.google.com/macros/s/AKfycbweU15FtVE5AIdl-kpV0PCmuNxYsd4pUIfdSLIAmVIal7z0Sb2oGimGgsjKHUHYxDML/exec';

// Sheet de Alunos — registo central de alunos, PINs e timestamps
// Preencher após criar o Apps Script de alunos (conta eclisboa.net)
// Login partilhado — mesma Sheet e Apps Script do KitchenFlow
// O aluno cria PIN num lado e fica disponível no outro automaticamente
export let SHEETS_ALUNOS_URL = 'https://script.google.com/macros/s/AKfycbweU15FtVE5AIdl-kpV0PCmuNxYsd4pUIfdSLIAmVIal7z0Sb2oGimGgsjKHUHYxDML/exec';

// ── Integração KitchenFlow ECL ───────────────────────────────
// URL do Apps Script do KitchenFlow — envia registos em background
export const CLASSROOM_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxoSOznjK5Hz13-oKChFg8fwzLNsa1rD0peshcbkBFLGv1dsm7Loyg8J3gIBOrlw64kAw/exec';
export const KITCHENFLOW_SHEET_URL = 'https://script.google.com/macros/s/AKfycbweU15FtVE5AIdl-kpV0PCmuNxYsd4pUIfdSLIAmVIal7z0Sb2oGimGgsjKHUHYxDML/exec';
export const KITCHENFLOW_APP_URL = 'https://ecl-haccp.vercel.app/';

// Formato: { tabela: string, linha: any[] }
async function enviarParaKitchenFlow(tabela: string, linha: any[]): Promise<void> {
  if (!KITCHENFLOW_SHEET_URL) return;
  try {
    await fetch(KITCHENFLOW_SHEET_URL, {
      method: 'POST',
      body: JSON.stringify({ tabela, linha }),
    });
  } catch { /* falha silenciosa — não bloqueia o fluxo do aluno */ }
}

/** Envia registo de Higiene Pessoal para o KitchenFlow.
 *  Chamado automaticamente quando o aluno confirma fardamento na Avaliação ECL.
 *  Formato idêntico ao usado pelo KitchenFlow internamente. */
export async function registarHigieneKitchenFlow(
  turmaId: string,
  alunoId: string,
  nomeAluno: string,
  fardamentoOk: boolean
): Promise<void> {
  const hoje = new Date();
  const data = hoje.toLocaleDateString('pt-PT');
  const hora = hoje.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  const estado = fardamentoOk ? 'Confirmado' : 'Incompleto — registado pela Avaliação ECL';
  await enviarParaKitchenFlow('Higiene Pessoal', [
    data, hora, turmaId, alunoId, nomeAluno, estado, 'avaliacao_ecl'
  ]);
}

/** Envia registo de Temperatura de Serviço para o KitchenFlow. */
export async function registarTemperaturaKitchenFlow(
  turmaId: string,
  alunoId: string,
  nomeAluno: string,
  prato: string,
  tipo: 'quente' | 'frio',
  temperatura: number
): Promise<void> {
  const hoje = new Date();
  const data = hoje.toLocaleDateString('pt-PT');
  const hora = hoje.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  const tempOk = tipo === 'quente' ? temperatura >= 63 : temperatura <= 4;
  await enviarParaKitchenFlow('Temperatura Serviço', [
    data, hora, turmaId, alunoId, nomeAluno,
    prato, tipo === 'quente' ? 'Quente' : 'Frio',
    temperatura, tempOk ? 'OK' : 'NC', hora, ''
  ]);
}

/** Envia registo de Não Conformidade para o KitchenFlow. */
export async function registarNaoConformidadeKitchenFlow(
  turmaId: string,
  alunoId: string,
  nomeAluno: string,
  zona: string,
  descricao: string,
  acaoCorretiva: string
): Promise<void> {
  const hoje = new Date();
  const data = hoje.toLocaleDateString('pt-PT');
  const hora = hoje.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  await enviarParaKitchenFlow('NãoConformidades', [
    data, hora, turmaId, alunoId, nomeAluno,
    zona, descricao, acaoCorretiva, 'pendente'
  ]);
}

/** Abre o KitchenFlow com login automático do aluno/professor.
 *  Passa turma, número e PIN na URL para que o KitchenFlow faça
 *  login automaticamente sem o utilizador ter de repetir as credenciais. */
export function abrirKitchenFlow(modulo?: string, user?: {
  turma: string; numero?: number; pin?: string; tipo?: string;
  ucId?: string; ucNome?: string; pratos?: string[];
  planoHoraInicio?: string; planoHoraFim?: string; planoData?: string;
}): void {
  const params = new URLSearchParams();
  if (modulo) params.set('mod', modulo);
  if (user?.turma) params.set('turma', user.turma);
  if (user?.numero) params.set('num', String(user.numero));
  if (user?.pin) params.set('pin', user.pin);
  if (user?.tipo) params.set('tipo', user.tipo || 'aluno');
  if (user?.ucId) params.set('uc', user.ucId);
  if (user?.ucNome) params.set('ucNome', user.ucNome);
  if (user?.pratos?.length) params.set('pratos', user.pratos.join('|'));
  // Passar zona temporal do plano para o KitchenFlow controlar registos
  if (user?.planoHoraInicio) params.set('horaInicio', user.planoHoraInicio);
  if (user?.planoHoraFim) params.set('horaFim', user.planoHoraFim);
  if (user?.planoData) params.set('planoData', user.planoData);
  const query = params.toString();
  const url = query ? `${KITCHENFLOW_APP_URL}?${query}` : KITCHENFLOW_APP_URL;
  window.open(url, '_blank', 'noopener');
}

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
  avisosDispensados: 'ecl_avisos_dispensados',
  materiasPrimasCustom: 'ecl_materias_primas_custom',
  tecnicasCustom:       'ecl_tecnicas_custom',
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

export function save<T>(key: string, data: T[]): void {
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
            if (new Date(p.atualizadoEm) > new Date((merged[idx] as any).atualizadoEm || '')) {
              // Preservar campos que a Sheet pode não guardar (eventoId, criteriosCongelados, ultimaAlteracao)
              merged[idx] = {
                ...p,
                eventoId: p.eventoId || (merged[idx] as any).eventoId || undefined,
                criteriosCongelados: p.criteriosCongelados || (merged[idx] as any).criteriosCongelados || undefined,
                ultimaAlteracao: p.ultimaAlteracao || (merged[idx] as any).ultimaAlteracao || undefined,
                realizadaEm: p.realizadaEm || (merged[idx] as any).realizadaEm || undefined,
              };
            }
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

    // ── Sincronizar Avaliações (historico_avaliacoes) ──────────────────
    if (SHEETS_HISTORICO_URL) {
      const jsonAval = await lerDoSheets(SHEETS_HISTORICO_URL, { tipo: 'get_avaliacoes', turmaId });
      if (jsonAval?.ok && jsonAval.dados?.length > 0) {
        const locais = getHistoricoAvaliacoes();
        const idsLocais = new Set(locais.map((r: RegistoAvaliacao) => r.id));
        const novas = jsonAval.dados.filter((r: RegistoAvaliacao) => !idsLocais.has(r.id));
        if (novas.length > 0) save(KEY_HIST, [...locais, ...novas]);
      }

      // ── Sincronizar Validações ──────────────────────────────────────
      const jsonVal = await lerDoSheets(SHEETS_HISTORICO_URL, { tipo: 'get_validacoes', turmaId });
      if (jsonVal?.ok && jsonVal.dados?.length > 0) {
        const locais = getValidacoes();
        const merged = [...locais];
        for (const v of jsonVal.dados) {
          const idx = merged.findIndex((x: Validacao) => x.id === v.id);
          if (idx < 0) merged.push(v);
          else if ((v.validadoEm || '') > (merged[idx].validadoEm || '')) merged[idx] = v;
        }
        save(KEYS.validacoes, merged);
      }

      // ── Sincronizar Presenças ───────────────────────────────────────
      const jsonPres = await lerDoSheets(SHEETS_HISTORICO_URL, { tipo: 'get_presencas', turmaId });
      if (jsonPres?.ok && jsonPres.dados?.length > 0) {
        const locais = getPresencas();
        const idsLocais = new Set(locais.map((p: any) => p.id));
        const novas = jsonPres.dados.filter((p: any) => !idsLocais.has(p.id));
        if (novas.length > 0) save(KEYS.presencas, [...locais, ...novas]);
      }
    }

    // ── Sincronizar Alunos ──────────────────────────────────────────────
    if (SHEETS_ALUNOS_URL) {
      const jsonAlunos = await lerDoSheets(SHEETS_ALUNOS_URL, { tipo: 'get_alunos', turmaId });
      if (jsonAlunos?.ok && jsonAlunos.dados?.length > 0) {
        const locais = getAlunos();
        const merged = [...locais];
        for (const a of jsonAlunos.dados) {
          const idx = merged.findIndex((x: Aluno) => x.id === a.id);
          if (idx < 0) merged.push(a);
          else merged[idx] = { ...merged[idx], ...a, pin: merged[idx].pin || a.pin };
        }
        save(KEYS.alunos, merged);
      }
    }

    // ── Sincronizar Autoavaliações (Selecoes) ───────────────────────────
    if (SHEETS_HISTORICO_URL) {
      const jsonSel = await lerDoSheets(SHEETS_HISTORICO_URL, { tipo: 'get_selecoes', turmaId });
      if (jsonSel?.ok && jsonSel.dados?.length > 0) {
        const locais = getSelecoes();
        const merged = [...locais];
        for (const s of jsonSel.dados) {
          const idx = merged.findIndex((x: SelecaoAluno) => x.id === s.id);
          if (idx < 0) merged.push(s);
          else if ((s.criadaEm || '') > (merged[idx].criadaEm || '')) merged[idx] = s;
        }
        save(KEYS.selecoes, merged);
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
      { id: '1º ACP', nome: '1º ACP — Cozinha e Pastelaria' },
      { id: '2º ACP', nome: '2º ACP — Cozinha e Pastelaria' },
      { id: '3º ACP', nome: '3º ACP — Cozinha e Pastelaria' },
    ];
    save(KEYS.turmas, seed);
    return seed;
  }
  // Migração: corrigir nomes antigos (1º CP → 1º ACP)
  const mapa: Record<string, {id: string, nome: string}> = {
    '1º CP': { id: '1º ACP', nome: '1º ACP — Cozinha e Pastelaria' },
    '2º CP': { id: '2º ACP', nome: '2º ACP — Cozinha e Pastelaria' },
    '3º CP': { id: '3º ACP', nome: '3º ACP — Cozinha e Pastelaria' },
    'CP1':   { id: '1º ACP', nome: '1º ACP — Cozinha e Pastelaria' },
    'CP2':   { id: '2º ACP', nome: '2º ACP — Cozinha e Pastelaria' },
    'CP3':   { id: '3º ACP', nome: '3º ACP — Cozinha e Pastelaria' },
  };
  let alterou = false;
  const corrigidas = t.map(turma => {
    if (mapa[turma.id]) { alterou = true; return mapa[turma.id]; }
    return turma;
  });
  if (alterou) save(KEYS.turmas, corrigidas);
  return alterou ? corrigidas : t;
}


// ════════════════════════════════════════════════════════════════
// MANUAL DO COZINHEIRO — Backend
// ════════════════════════════════════════════════════════════════

const KEY_MANUAL = 'ecl_manual_cozinheiro';

export function getEntradasManual(): EntradaManual[] {
  return load<EntradaManual>(KEY_MANUAL);
}

export function addEntradaManual(entrada: EntradaManual): void {
  const todas = getEntradasManual();
  const idx = todas.findIndex(e => e.id === entrada.id);
  if (idx >= 0) todas[idx] = entrada;
  else todas.push(entrada);
  save(KEY_MANUAL, todas);
}

export function deleteEntradaManual(id: string): void {
  const todas = getEntradasManual().filter(e => e.id !== id);
  save(KEY_MANUAL, todas);
}

export function pesquisarManual(query: string): EntradaManual[] {
  if (!query.trim()) return getEntradasManual();
  const q = query.toLowerCase().trim();
  return getEntradasManual().filter(e =>
    e.titulo.toLowerCase().includes(q) ||
    e.categoria.toLowerCase().includes(q) ||
    e.palavrasChave.some((p: string) => p.toLowerCase().includes(q)) ||
    e.textoGuia.toLowerCase().includes(q)
  );
}


// ════════════════════════════════════════════════════════════════
// CRUZAMENTO KITCHENFLOW → COMPETÊNCIAS
// Vai buscar registos do aluno à Sheet do KitchenFlow e mapeia
// para evidências de competências na Avaliação ECL.
// Regra Rosa: "Se não registou, não conta — mesmo que tenha feito."
// ════════════════════════════════════════════════════════════════

// Mapa de registos KitchenFlow → competências da Avaliação ECL
// Só subtécnicas (S...) e microcompetências (M...) — as obrigatórias
// são avaliadas sempre e não precisam de evidência KF para tal.
const MAPA_KF_COMPETENCIAS: Record<string, string[]> = {
  // Registos de receção e armazenamento
  'Temperatura Receção':      ['S011', 'S203'],
  'Temperatura Confeção':     ['S203', 'M0065'],
  'Temperatura Frio':         ['S203', 'S015'],
  'Abatimento Temperatura':   ['S017', 'M0060'],
  'Rotulagem':                ['S014', 'M0116'],
  'Receção Mercadorias':      ['S010', 'S011', 'S012', 'S013'],
  'Conservação':              ['S015', 'S017'],
  // Registos de produção
  'Controlo de Óleos':        ['S106'],
  'Mise en Place':            ['S003', 'S004', 'M0172'],
  'Ficha Técnica':            ['S002', 'M0148'],
  'Limpeza Equipamentos':     ['S202'],
  // Cruzamento KF ↔ Obrigatórias (decidido 28/06/2026):
  // Higiene Pessoal KF → OBR_01 · Temperatura Serviço/NC resolvida KF → OBR_02
  'Higiene Pessoal':          ['OBR_01'],
  'Temperatura Serviço':      ['OBR_02'],
  'NãoConformidades':         ['OBR_02'],
};

/** Inverso: dado um id de competência, quais tipos de registo KF a evidenciam */
export function tiposKFParaCompetencia(competenciaId: string): string[] {
  return Object.entries(MAPA_KF_COMPETENCIAS)
    .filter(([, ids]) => ids.includes(competenciaId))
    .map(([tipo]) => tipo);
}

/** Verifica se um aluno tem registos KitchenFlow que evidenciam uma competência.
 *  Consulta o localStorage de evidências já sincronizadas (não vai à Sheet). */
export function evidenciasKFPorCompetencia(
  alunoId: string,
  competenciaId: string,
  data?: string  // YYYY-MM-DD — se fornecida, filtra por data
): { tipo: string; registadoEm?: string }[] {
  const tiposKF = tiposKFParaCompetencia(competenciaId);
  if (tiposKF.length === 0) return [];

  // Ler evidências já sincronizadas do localStorage
  const chave = `ecl_evidencias_kf_${alunoId}`;
  let evidencias: { tipo: string; registadoEm?: string; data?: string }[] = [];
  try { evidencias = JSON.parse(localStorage.getItem(chave) || '[]'); } catch {}

  return evidencias.filter(e =>
    tiposKF.includes(e.tipo) &&
    (!data || e.data === data || e.registadoEm?.startsWith(data))
  );
}

export interface EvidenciaKitchenFlow {
  competenciaId: string;
  registoKF: string;       // tipo de registo no KitchenFlow
  ingrediente?: string;    // ingrediente que originou o registo
  motivo?: string;         // razão técnica
  registadoEm?: string;    // timestamp do registo no KF
  fonte: 'kitchenflow';
}

/** Vai buscar registos do dia de um aluno à Sheet do KitchenFlow
 *  e mapeia para evidências de competências.
 *  Só conta registos que são obrigatórios para a ficha técnica. */
export async function sincronizarEvidenciasKitchenFlow(
  turmaId: string,
  alunoId: string,
  data: string,           // YYYY-MM-DD
  registosObrigatorios: string[]  // tipos de registo obrigatórios para a ficha
): Promise<EvidenciaKitchenFlow[]> {
  if (!KITCHENFLOW_SHEET_URL) return [];

  const evidencias: EvidenciaKitchenFlow[] = [];

  try {
    // Buscar registos do aluno neste dia para cada tipo obrigatório
    for (const tipoRegisto of registosObrigatorios) {
      const url = `${KITCHENFLOW_SHEET_URL}?tabela=${encodeURIComponent(tipoRegisto)}&turma=${encodeURIComponent(turmaId)}&aluno=${encodeURIComponent(alunoId)}&data=${encodeURIComponent(data)}`;

      const resp = await fetch(url);
      if (!resp.ok) continue;

      const dados = await resp.json();
      if (!dados.ok || !dados.dados?.length) continue;

      // Verificar se existe registo deste aluno nesta data
      const registoAluno = dados.dados.find((linha: any[]) => {
        const dataLinha = String(linha[0] || '');
        const idAluno = String(linha[3] || linha[2] || '');
        return dataLinha.includes(data.split('-').reverse().join('/')) &&
               (idAluno === alunoId || idAluno === String(alunoId).split('-').pop());
      });

      // Não Conformidades só conta como evidência positiva de OBR_02 quando
      // resolvida — um registo em aberto não deve "ajudar" a nota do aluno.
      // Coluna "Estado" é a 9ª (índice 8) na sheet NãoConformidades.
      const passaFiltroEstado = tipoRegisto !== 'NãoConformidades'
        || (registoAluno && String(registoAluno[8] || '').toLowerCase().includes('resolv'));

      if (registoAluno && passaFiltroEstado) {
        const competencias = MAPA_KF_COMPETENCIAS[tipoRegisto] || [];
        competencias.forEach(compId => {
          evidencias.push({
            competenciaId: compId,
            registoKF: tipoRegisto,
            registadoEm: `${registoAluno[0]} ${registoAluno[1] || ''}`.trim(),
            fonte: 'kitchenflow',
          });
        });
      }
    }
  } catch {
    // Falha silenciosa — não bloqueia o fluxo da avaliação
  }

  return evidencias;
}

/** Extrai os registos KitchenFlow obrigatórios de uma ficha técnica.
 *  A ficha tem um campo 'registosKFObrigatorios' gerado pela IA
 *  com formato: REGISTO|INGREDIENTE|MOTIVO (uma por linha). */
export function extrairRegistosObrigatorios(ficha: FichaProducao): string[] {
  const campo = (ficha as any).registosKFObrigatorios || ficha.kitchenflow || '';
  if (!campo) return ['Higiene Pessoal', 'NãoConformidades']; // mínimo sempre

  const tipos = new Set<string>(['Higiene Pessoal', 'NãoConformidades']);

  campo.split('\n').forEach((linha: string) => {
    const partes = linha.split('|').map((p: string) => p.trim());
    const tipo = partes[0]?.replace(/^REGISTO:\s*/i, '').trim();
    if (tipo && MAPA_KF_COMPETENCIAS[tipo]) tipos.add(tipo);

    // Inferir por palavras-chave no texto
    if (/temperatura|°C|mínimo|serviço/i.test(linha)) tipos.add('Temperatura Serviço');
    if (/fritu|óleo|fritura/i.test(linha)) tipos.add('Controlo de Óleos');
    if (/conserv|frigorí|refriger/i.test(linha)) tipos.add('Conservação');
  });

  return Array.from(tipos);
}


// ════════════════════════════════════════════════════════════════
// PORTEFÓLIO — Backup permanente na Google Sheet
// Escreve em paralelo com o localStorage para garantir que nada
// se perde mesmo que o browser seja limpo ou o dispositivo avarie.
// ════════════════════════════════════════════════════════════════

// URL do Apps Script do Portefólio — criar nova Sheet e publicar
// Deixar vazio até ter o URL — a escrita falha silenciosamente
export let SHEETS_PORTEFOLIO_URL = '';

async function escreverPortefolio(tipo: string, dados: Record<string, unknown>): Promise<void> {
  if (!SHEETS_PORTEFOLIO_URL) return;
  try {
    await fetch(SHEETS_PORTEFOLIO_URL, {
      method: 'POST',
      body: JSON.stringify({ tipo, ...dados }),
    });
  } catch { /* falha silenciosa — localStorage é a fonte primária */ }
}

/** Registar presença no Portefólio */
export async function registarPresencaPortefolio(presenca: RegistoPresenca, nomeAluno?: string): Promise<void> {
  await escreverPortefolio('presenca', { presenca: { ...presenca, nomeAluno } });
}

/** Registar validação de competências no Portefólio */
export async function registarCompetenciaPortefolio(dados: {
  data: string; turmaId: string; alunoId: string; nomeAluno: string;
  planoId: string; ucId: string; fichaNome: string;
  competenciaId: string; competenciaNome: string; categoria: string;
  nivelAluno: string; nivelProfessor: string; temEvidenciaKF: boolean;
  avaliadorNome: string; validadoEm: string;
}): Promise<void> {
  await escreverPortefolio('competencia', { competencia: dados });
}

/** Registar historial de aluno no Portefólio */
export async function registarHistorialPortefolio(dados: {
  alunoId: string; nomeAluno: string; turmaId: string;
  competenciaId: string; competenciaNome: string;
  vezesTreinada: number; media: number; nivelAtual: string;
  dominada: boolean; ultimaAvaliacao: string;
}): Promise<void> {
  await escreverPortefolio('historial', { historial: dados });
}

/** Registar evidência KitchenFlow no Portefólio */
export async function registarEvidenciaKFPortefolio(dados: {
  data: string; turmaId: string; alunoId: string; nomeAluno: string;
  planoId: string; ucId: string; moduloKF: string;
  competenciaECL: string; registadoEm: string;
}): Promise<void> {
  await escreverPortefolio('evidencia_kf', { evidencia: dados });
}

/** Sincronizar plano de aula com Portefólio */
export async function sincronizarPlanoPortefolio(plano: PlanoAula): Promise<void> {
  await escreverPortefolio('plano', { plano });
}

/** Sincronizar ficha técnica com Portefólio */
export async function sincronizarFichaPortefolio(ficha: FichaProducao): Promise<void> {
  await escreverPortefolio('ficha', { ficha });
}

// ── Seed de alunos fictícios para testes ─────────────────────
// Criados automaticamente na primeira vez que a app é aberta.
// Permitem simular cenários reais sem dados de alunos reais.

// ── Alunos reais ECL 2025/2026 ──────────────────────────────────────────────
// 2º CP = turma 1º ACP 2025/2028  |  3º CP = turma 2º ACP 2024/2027
// PINs iniciais: 2NNN para 2ºCP, 3NNN para 3ºCP (professor altera depois)
export function seedAlunosReais(): void {
  const todos = getAlunos().filter((a: Aluno) => a.turmaId === '2º ACP' || a.turmaId === '3º ACP');
  if (todos.length > 0) return; // já existem — não sobrescrever
  const agora = new Date().toISOString();
  const alunos: Aluno[] = [
    // ── 2º CP (1º ACP 2025/2028) ─────────────────────────────────
    { id: '2º ACP-1', turmaId: '2º ACP', numero: 1, ano: 2 as const, nome: 'Agnes Paola A. Conceição', pin: '2001', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-2', turmaId: '2º ACP', numero: 2, ano: 2 as const, nome: 'Alcides João S. Neto', pin: '2002', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-3', turmaId: '2º ACP', numero: 3, ano: 2 as const, nome: 'Anamar Padinha Gomes', pin: '2003', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-4', turmaId: '2º ACP', numero: 4, ano: 2 as const, nome: 'Arthur Oliveira Santos', pin: '2004', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-5', turmaId: '2º ACP', numero: 5, ano: 2 as const, nome: 'Beatriz Mendes Brito', pin: '2005', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-6', turmaId: '2º ACP', numero: 6, ano: 2 as const, nome: 'Beatriz Pompeu Pinheiro', pin: '2006', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-7', turmaId: '2º ACP', numero: 7, ano: 2 as const, nome: 'Carlos Alexandre C. Maia', pin: '2007', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-8', turmaId: '2º ACP', numero: 8, ano: 2 as const, nome: 'Eduardo Júnior S. Paulo', pin: '2008', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-9', turmaId: '2º ACP', numero: 9, ano: 2 as const, nome: 'Folly Orax Sallah', pin: '2009', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-10', turmaId: '2º ACP', numero: 10, ano: 2 as const, nome: 'Gonçalo Rafael Claro', pin: '2010', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-11', turmaId: '2º ACP', numero: 11, ano: 2 as const, nome: 'Gustavo Lopes Costa', pin: '2011', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-12', turmaId: '2º ACP', numero: 12, ano: 2 as const, nome: 'Isabella Medina Jurado', pin: '2012', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-13', turmaId: '2º ACP', numero: 13, ano: 2 as const, nome: 'Jorgeana Patricia T. Varela', pin: '2013', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-14', turmaId: '2º ACP', numero: 14, ano: 2 as const, nome: 'Mafalda Resende C. Ferreira', pin: '2014', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-15', turmaId: '2º ACP', numero: 15, ano: 2 as const, nome: 'Manuel José M. Maca', pin: '2015', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-16', turmaId: '2º ACP', numero: 16, ano: 2 as const, nome: 'Martim Rocha D. F. Silva', pin: '2016', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-17', turmaId: '2º ACP', numero: 17, ano: 2 as const, nome: 'Neide Tavares Cardoso', pin: '2017', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-18', turmaId: '2º ACP', numero: 18, ano: 2 as const, nome: 'Raquel Luis O. Diogo', pin: '2018', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-19', turmaId: '2º ACP', numero: 19, ano: 2 as const, nome: 'Rita Maria S. Nunes', pin: '2019', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-20', turmaId: '2º ACP', numero: 20, ano: 2 as const, nome: 'Rute Santos Rodrigues', pin: '2020', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-21', turmaId: '2º ACP', numero: 21, ano: 2 as const, nome: 'Sara Andrade Arruda', pin: '2021', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-22', turmaId: '2º ACP', numero: 22, ano: 2 as const, nome: 'Telmo Márcio T. Mendes', pin: '2022', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-23', turmaId: '2º ACP', numero: 23, ano: 2 as const, nome: 'Yichen Wu', pin: '2023', ativo: true, pinCriadoEm: agora },
    // ── 3º CP (2º ACP 2024/2027) ─────────────────────────────────
    { id: '3º ACP-1', turmaId: '3º ACP', numero: 1, ano: 3 as const, nome: 'Afonso Miguel C. Dias', pin: '3001', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-2', turmaId: '3º ACP', numero: 2, ano: 3 as const, nome: 'Aldmir Afonso Marques', pin: '3002', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-3', turmaId: '3º ACP', numero: 3, ano: 3 as const, nome: 'Bernardo Alexandre B. Correia', pin: '3003', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-4', turmaId: '3º ACP', numero: 4, ano: 3 as const, nome: 'Bruno Monteiro Cardoso', pin: '3004', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-5', turmaId: '3º ACP', numero: 5, ano: 3 as const, nome: 'Cilaine Espírito S. Pereira', pin: '3005', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-6', turmaId: '3º ACP', numero: 6, ano: 3 as const, nome: 'Diogo Alexandre S. Neves', pin: '3006', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-7', turmaId: '3º ACP', numero: 7, ano: 3 as const, nome: 'Djeison Patrick R. Pina', pin: '3007', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-8', turmaId: '3º ACP', numero: 8, ano: 3 as const, nome: 'Éria Santana Roberto', pin: '3008', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-9', turmaId: '3º ACP', numero: 9, ano: 3 as const, nome: 'Francisco Miguel P. Neto', pin: '3009', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-10', turmaId: '3º ACP', numero: 10, ano: 3 as const, nome: 'Hugo Guilherme B. Sequeira', pin: '3010', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-11', turmaId: '3º ACP', numero: 11, ano: 3 as const, nome: 'Íris Filipa G. Monteiro', pin: '3011', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-12', turmaId: '3º ACP', numero: 12, ano: 3 as const, nome: 'Lara Maria D. N. Machado', pin: '3012', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-13', turmaId: '3º ACP', numero: 13, ano: 3 as const, nome: 'Leonel Dino S. Tavares', pin: '3013', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-14', turmaId: '3º ACP', numero: 14, ano: 3 as const, nome: 'Leonor Sofia M. Cruz', pin: '3014', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-15', turmaId: '3º ACP', numero: 15, ano: 3 as const, nome: 'Luizito Campos Assunção', pin: '3015', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-16', turmaId: '3º ACP', numero: 16, ano: 3 as const, nome: 'Martim Fonseca M. Ramos', pin: '3016', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-17', turmaId: '3º ACP', numero: 17, ano: 3 as const, nome: 'Melisa Carine Cardoso', pin: '3017', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-18', turmaId: '3º ACP', numero: 18, ano: 3 as const, nome: 'Mishant Tamang', pin: '3018', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-19', turmaId: '3º ACP', numero: 19, ano: 3 as const, nome: 'Raquel Oliveira Pinto', pin: '3019', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-20', turmaId: '3º ACP', numero: 20, ano: 3 as const, nome: 'Ricardo Miguel G. Mendes', pin: '3020', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-21', turmaId: '3º ACP', numero: 21, ano: 3 as const, nome: 'Ronnen Alem Cardoso', pin: '3021', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-22', turmaId: '3º ACP', numero: 22, ano: 3 as const, nome: 'Vanessa Ramos Mestre', pin: '3022', ativo: true, pinCriadoEm: agora },
  ];
  const existentes = getAlunos();
  const merged = [...existentes];
  for (const a of alunos) {
    if (!merged.find((x: Aluno) => x.id === a.id)) merged.push(a);
  }
  save(KEYS.alunos, merged);
  alunos.forEach((a: Aluno) => enviar(SHEETS_ALUNOS_URL, 'upsert_aluno', { aluno: a }));
}


// ── Limpar dados de teste ────────────────────────────────────────
// Remove todos os alunos de teste excepto 1 por turma
// Remove todos os planos, fichas, guias e requisições de teste criados antes de hoje
export function limparDadosTeste(): void {
  const hoje = new Date().toISOString().slice(0, 10);

  // 1. Alunos — manter 1 por turma com nome "Teste"
  const alunos = getAlunos();
  const turmas = [...new Set(alunos.map(a => a.turmaId))];
  const alunosManter: string[] = [];
  for (const turma of turmas) {
    const daTurma = alunos.filter(a => a.turmaId === turma);
    // Manter o primeiro aluno de cada turma (para testes)
    const aTeste = daTurma.find(a =>
      a.nome?.toLowerCase().includes('teste') ||
      a.nome?.toLowerCase().includes('test') ||
      a.id.includes('CP-') ||
      a.numero === 9999
    ) || daTurma[0];
    if (aTeste) alunosManter.push(aTeste.id);
  }
  const alunosFiltrados = alunos.filter(a => alunosManter.includes(a.id));
  save(KEYS.alunos, alunosFiltrados);

  // 2. Planos de aula — remover os criados antes de hoje
  const planos = getPlanosAula();
  const planosFiltrados = planos.filter(p => (p.data || '') >= hoje);
  save(KEYS.planos, planosFiltrados);
  const planoIdsValidos = new Set(planosFiltrados.map(p => p.id));

  // 3. Fichas — remover as que não têm plano válido E foram criadas antes de hoje
  const fichas = getFichasProducao();
  const fichasFiltradas = fichas.filter(f =>
    (f.planoAulaId && planoIdsValidos.has(f.planoAulaId)) ||
    ((f as any).criadaEm || (f as any).atualizadoEm || '') >= hoje
  );
  save(KEYS.fichas, fichasFiltradas);
  const fichaIdsValidas = new Set(fichasFiltradas.map(f => f.id));

  // 4. Requisições — remover as antigas
  const requisicoes = getRequisicoes();
  const requisicoesFilter = requisicoes.filter(r =>
    planoIdsValidos.has(r.planoAulaId || '') ||
    (r.dataAula || '') >= hoje
  );
  save(KEYS.requisicoes, requisicoesFilter);

  // 5. Avaliações, validações, presenças, selecoes — limpar as de teste
  const hist = getHistoricoAvaliacoes().filter(r => (r.data || '') >= hoje);
  save(KEY_HIST, hist);
  const vals = getValidacoes().filter(v => (v.validadoEm || '') >= hoje);
  save(KEYS.validacoes, vals);
  const pres = getPresencas().filter((p: any) => (p.data || '') >= hoje);
  save(KEYS.presencas, pres);
  const sels = getSelecoes().filter(s => (s.criadaEm || '') >= hoje);
  save(KEYS.selecoes, sels);

  console.log(`[limparDadosTeste] Mantidos: ${alunosFiltrados.length} alunos, ${planosFiltrados.length} planos, ${fichasFiltradas.length} fichas`);
}

function seedAlunosTeste(): void {
  const todos = getAlunos();
  if (todos.length > 0) return; // já existem alunos, não fazer seed

  const agora = new Date().toISOString();
  const alunos: Aluno[] = [
    {
      // Aluno 1 — perfil universal, sem historial, primeiro acesso
      id: '1ºCP-1',
      turmaId: '1º ACP',
      numero: 1,
      ano: 1,
      nome: 'Mariana Costa',
      pin: '1001',
      pinCriadoEm: agora,
      nivelMedidas: 1,
      ativo: true,
    },
    {
      // Aluno 2 — nível 3 NEE, historial misto (algumas técnicas consolidadas, outras em regressão)
      id: '1ºCP-2',
      turmaId: '1º ACP',
      numero: 2,
      ano: 1,
      nome: 'Tomás Ferreira',
      pin: '1002',
      pinCriadoEm: agora,
      nivelMedidas: 3,
      ativo: true,
    },
    {
      // Aluno 3 — perfil avançado, maioria das técnicas consolidadas
      id: '1ºCP-3',
      turmaId: '1º ACP',
      numero: 3,
      ano: 1,
      nome: 'Beatriz Rodrigues',
      pin: '1003',
      pinCriadoEm: agora,
      nivelMedidas: 1,
      ativo: true,
    },
    {
      // Aluno 4 — 2º ano, historial de atrasos e faltas, competências em falta
      id: '2ºCP-4',
      turmaId: '2º ACP',
      numero: 4,
      ano: 2,
      nome: 'João Mendes',
      pin: '2004',
      pinCriadoEm: agora,
      nivelMedidas: 2,
      ativo: true,
    },
  ];

  save(KEYS.alunos, alunos);
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



// ── Seed de plano de aula, ficha técnica e requisição para testes ──
// Cria dados realistas para simular uma aula completa da Mariana Costa.
export function seedPlanoTeste(): void {
  const KEY_PLANOS = 'ecl_planos';
  const KEY_FICHAS = 'ecl_fichas';
  const KEY_REQUISICOES = 'ecl_requisicoes';

  if (load<any>(KEY_PLANOS).length > 0) return; // já tem planos

  const hoje = new Date().toISOString().slice(0, 10);
  const agora = new Date().toISOString();

  const fichaId = 'ficha_teste_pudim_001';
  const planoId = 'plano_teste_cz1a_001';
  const reqId   = 'req_teste_cz1a_001';

  // ── Ficha Técnica — Pudim de Ovos ────────────────────────
  const fichaPudim = {
    id: fichaId,
    nomePrato: 'Pudim de Ovos',
    classificacao: 'Sobremesa',
    familia1: 'Pastelaria — Sobremesas Empratadas',
    familia2: undefined,
    etiquetas: ['Forno', 'Cozinha Portuguesa'],
    fichaNum: '1A',
    numPorcoes: '8',
    tempoPrep: '20 min',
    tempoConf: '45 min',
    ingredientes: [
      { id:'i1', componente:'Caramelo', qt:'200', un:'g', produto:'Açúcar', tPrep:'2 min', tConf:'8 min', obs:'Caramelizar até âmbar escuro' },
      { id:'i2', componente:'Pudim', qt:'6', un:'un', produto:'Ovos inteiros', tPrep:'', tConf:'', obs:'' },
      { id:'i3', componente:'Pudim', qt:'3', un:'un', produto:'Gemas de ovo', tPrep:'', tConf:'', obs:'Reforça a riqueza e cor' },
      { id:'i4', componente:'Pudim', qt:'500', un:'ml', produto:'Leite gordo', tPrep:'', tConf:'', obs:'Aquecer sem ferver' },
      { id:'i5', componente:'Pudim', qt:'200', un:'g', produto:'Açúcar', tPrep:'', tConf:'', obs:'' },
      { id:'i6', componente:'Pudim', qt:'5', un:'ml', produto:'Extracto de baunilha', tPrep:'', tConf:'', obs:'' },
    ],
    preparacao: [
      { id:'p1', num:1, descricao:'Caramelizar o açúcar em seco numa frigideira antiaderente até atingir âmbar escuro', temperatura:'Forte', tempo:'8 min', obs:'Não mexer — agitar apenas a frigideira', haccp:'Atenção: açúcar a 180°C — risco de queimadura grave' },
      { id:'p2', num:2, descricao:'Verter o caramelo na forma untada e distribuir uniformemente', temperatura:'', tempo:'2 min', obs:'Rodar a forma rapidamente antes de solidificar', haccp:'' },
      { id:'p3', num:3, descricao:'Aquecer o leite com a baunilha sem deixar ferver', temperatura:'Médio', tempo:'5 min', obs:'', haccp:'' },
      { id:'p4', num:4, descricao:'Bater os ovos inteiros e as gemas com o açúcar até dissolver — não incorporar ar', temperatura:'', tempo:'3 min', obs:'Evitar espuma — afecta a textura final', haccp:'' },
      { id:'p5', num:5, descricao:'Verter o leite morno em fio sobre os ovos, mexendo constantemente', temperatura:'', tempo:'2 min', obs:'Temperar devagar para não coagular os ovos', haccp:'' },
      { id:'p6', num:6, descricao:'Passar o creme pelo passador fino e verter na forma caramelizada', temperatura:'', tempo:'2 min', obs:'Eliminar bolhas de ar da superfície', haccp:'' },
      { id:'p7', num:7, descricao:'Cozer em banho-maria no forno a 160°C durante 45 min', temperatura:'160°C', tempo:'45 min', obs:'Cobrir com papel de alumínio a meio', haccp:'PCC: temperatura interna mínima 72°C — verificar com termómetro' },
      { id:'p8', num:8, descricao:'Arrefecer à temperatura ambiente e refrigerar mínimo 4h antes de desenformar', temperatura:'Frio', tempo:'4h', obs:'Não desenformar quente', haccp:'PCC: refrigerar a 0-4°C — produto com ovos e leite' },
    ],
    empratamento: 'Desenformar para prato de apresentação. O caramelo deve escorrer naturalmente pelas laterais. Decorar com ramo de hortelã e caramelo em fio.',
    alergenicos: ['Ovos', 'Leite'],
    equipamento: 'Forma de pudim com tampa · Frigideira antiaderente · Termómetro de sonda · Passador fino',
    conservacao: 'Refrigerar a 0-4°C em recipiente fechado. Consumir em 48h.',
    regeneracao: 'Não aplicável — servir frio. Não regenerar.',
    kitchenflow: 'Higiene Pessoal — registar antes de iniciar a produção\nTemperatura de Serviço — servir frio, máximo 4°C\nConservação de Produtos — produto com ovos e leite: refrigerar a 0-4°C, consumir em 48h\nNão Conformidades — registar qualquer desvio detetado',
    tecnicasSugeridas: ['Caramelizar', 'Cozer em banho-maria', 'Cozer no forno', 'Controlar temperaturas'],
    ucsAssociadas: ['UC02005'],
    elaboradoPor: 'rosa.almeida@eclisboa.net',
    data: hoje,
    planoAulaId: planoId,
    criadoEm: agora,
    atualizadoEm: agora,
  };

  // ── Plano de Aula ─────────────────────────────────────────
  const plano = {
    id: planoId,
    turmaId: '1º ACP',
    professor: 'Rosa Almeida',
    data: hoje,
    horaInicio: '08:30',
    horaFim: '12:30',
    titulo: 'Introdução à Doçaria Portuguesa — Pudim de Ovos',
    observacoes: 'Primeira aula de doçaria. Foco na técnica do caramelo e cozeção em banho-maria.',
    fichasIds: [fichaId],
    estado: 'publicado' as const,
    requisicaoId: reqId,
    ucId: 'UC02005',
    ucNome: 'Preparar e confecionar massas base, recheios, cremes e molhos de pastelaria',
    numeroPlan: 1,
    criadoEm: agora,
    atualizadoEm: agora,
  };

  // ── Requisição ───────────────────────────────────────────
  const requisicao = {
    id: reqId,
    planoAulaId: planoId,
    turmaId: '1º ACP',
    dataAula: hoje,
    professor: 'Rosa Almeida',
    fichasIds: [fichaId],
    linhas: [
      { id:'r1', produto:'Açúcar', quantidade:400, quantidadeTotal:400, unidade:'g', fichaId, componente:'Caramelo + Pudim', precoKg:1.20, custoTotal:0.48 },
      { id:'r2', produto:'Ovos inteiros', quantidade:6, quantidadeTotal:6, unidade:'un', fichaId, componente:'Pudim', precoKg:0, custoTotal:0.90 },
      { id:'r3', produto:'Gemas de ovo', quantidade:3, quantidadeTotal:3, unidade:'un', fichaId, componente:'Pudim', precoKg:0, custoTotal:0.30 },
      { id:'r4', produto:'Leite gordo', quantidade:500, quantidadeTotal:500, unidade:'ml', fichaId, componente:'Pudim', precoKg:1.10, custoTotal:0.55 },
      { id:'r5', produto:'Extracto de baunilha', quantidade:5, quantidadeTotal:5, unidade:'ml', fichaId, componente:'Pudim', precoKg:0, custoTotal:0.20 },
    ],
    custoTotal: 2.43,
    estado: 'enviada' as const,
    criadaEm: agora,
    atualizadaEm: agora,
  };

  save(KEY_FICHAS, [fichaPudim]);
  save(KEY_PLANOS, [plano]);
  save(KEY_REQUISICOES, [requisicao]);
}

// ── Seed de historial de avaliações para alunos de teste ─────
// Cria registos realistas para simular diferentes cenários.
export function seedHistorialTeste(): void {
  const KEY_HIST = 'ecl_historico_avaliacoes';
  const KEY_PRES = 'ecl_historico_presencas';
  const existing = load<any>(KEY_HIST);
  if (existing.length > 0) return; // já tem historial

  const datas = [
    '2025-10-15', '2025-10-22', '2025-11-05',
    '2025-11-19', '2025-12-03', '2025-12-17',
    '2026-01-14', '2026-01-28', '2026-02-11',
  ];

  const avaliacoes: any[] = [];
  const presencas: any[] = [];
  let idx = 0;

  // ── MARIANA COSTA (CZ1A-1) — perfil universal, primeiro ano, sem historial
  // Nenhum registo — aluna nova, vai avaliar na primeira aula

  // ── TOMÁS FERREIRA (CZ1A-2) — nível 3 NEE, historial misto
  // Algumas técnicas consolidadas, outras em regressão
  const tomasCompetencias = [
    { id: 'S001', notas: [5, 5, 10] },      // higiene — em desenvolvimento
    { id: 'S002', notas: [15, 15, 15] },    // mise en place — consolidada
    { id: 'S058a', notas: [10, 15, 5] },    // cortes — em regressão!
    { id: 'OBR_01', notas: [10, 10, 15] },  // higiene pessoal — a melhorar
  ];
  tomasCompetencias.forEach(({ id, notas }) => {
    notas.forEach((nota, i) => {
      avaliacoes.push({
        id: `seed_tomas_${id}_${i}`,
        alunoId: '1ºCP-2', turmaId: '1º ACP',
        planoAulaId: `plano_seed_${i}`, fichaId: '',
        ucId: 'UC01999', microcompetenciaId: id,
        nota, data: datas[i], validadoPor: 'professor',
      });
    });
  });
  // Presenças — faltou a 2 aulas das 9
  datas.slice(0, 9).forEach((data, i) => {
    presencas.push({
      id: `seed_tomas_pres_${i}`,
      alunoId: '1ºCP-2', turmaId: '1º ACP',
      planoAulaId: `plano_seed_${i}`, ucId: 'UC01999',
      presente: i !== 3 && i !== 6, // faltou à 4ª e 7ª aula
      atrasado: i === 1 || i === 5,
      atrasadoMins: i === 1 ? 15 : i === 5 ? 8 : 0,
      fardamentoOk: i !== 2,
    });
  });

  // ── BEATRIZ RODRIGUES (CZ1A-3) — perfil avançado, maioria consolidada
  const beatrizCompetencias = [
    { id: 'S001', notas: [15, 15, 15] },    // higiene — avançada
    { id: 'S002', notas: [15, 15, 15] },    // mise en place — avançada
    { id: 'S058a', notas: [10, 15, 15] },   // cortes — consolidada
    { id: 'S058b', notas: [15, 15, 15] },   // gomos — avançada
    { id: 'OBR_01', notas: [15, 15, 15] },  // higiene pessoal — avançada
    { id: 'OBR_02', notas: [10, 15, 15] },  // HACCP — consolidada
    { id: 'S162B', notas: [15, 15] },       // massa montada — avançada
  ];
  beatrizCompetencias.forEach(({ id, notas }) => {
    notas.forEach((nota, i) => {
      avaliacoes.push({
        id: `seed_beatriz_${id}_${i}`,
        alunoId: '1ºCP-3', turmaId: '1º ACP',
        planoAulaId: `plano_seed_${i}`, fichaId: '',
        ucId: 'UC01999', microcompetenciaId: id,
        nota, data: datas[i], validadoPor: 'professor',
      });
    });
  });
  datas.slice(0, 9).forEach((data, i) => {
    presencas.push({
      id: `seed_beatriz_pres_${i}`,
      alunoId: '1ºCP-3', turmaId: '1º ACP',
      planoAulaId: `plano_seed_${i}`, ucId: 'UC01999',
      presente: true, atrasado: false, atrasadoMins: 0, fardamentoOk: true,
    });
  });

  // ── JOÃO MENDES (CZ2A-4) — 2º ano, atrasos, faltas, competências em falta
  const joaoCompetencias = [
    { id: 'S001', notas: [5, 5, 5, 5] },    // higiene — nunca passou
    { id: 'S002', notas: [10, 5, 10, 5] },  // mise en place — irregular
    { id: 'OBR_01', notas: [5, 10, 5, 5] }, // higiene pessoal — problema recorrente
    { id: 'OBR_02', notas: [5, 5, 10, 5] }, // HACCP — fraco
  ];
  joaoCompetencias.forEach(({ id, notas }) => {
    notas.forEach((nota, i) => {
      avaliacoes.push({
        id: `seed_joao_${id}_${i}`,
        alunoId: '2ºCP-4', turmaId: '2º ACP',
        planoAulaId: `plano_seed_${i}`, fichaId: '',
        ucId: 'UC02003', microcompetenciaId: id,
        nota, data: datas[i], validadoPor: 'professor',
      });
    });
  });
  // Presenças — faltou a 4 aulas das 9, 3 atrasos
  datas.slice(0, 9).forEach((data, i) => {
    presencas.push({
      id: `seed_joao_pres_${i}`,
      alunoId: '2ºCP-4', turmaId: '2º ACP',
      planoAulaId: `plano_seed_${i}`, ucId: 'UC02003',
      presente: ![2, 4, 6, 8].includes(i), // faltou a 4 aulas
      atrasado: [0, 1, 5].includes(i),
      atrasadoMins: i === 0 ? 20 : i === 1 ? 10 : i === 5 ? 30 : 0,
      fardamentoOk: ![0, 3].includes(i), // fardamento incompleto em 2 aulas
    });
  });

  save(KEY_HIST, avaliacoes);
  save(KEY_PRES, presencas);
}

// ── Gestão de PINs ───────────────────────────────────────────

/** Valida login do aluno: número + turma + pin.
 *  Primeiro tenta na sheet (fonte de verdade); fallback para localStorage. */
export async function validarLoginAluno(
  turmaId: string, numero: number, ano: 1|2|3, pinIntroduzido: string
): Promise<{ ok: boolean; aluno?: Aluno; erro?: string }> {
  const id = `${turmaId}-${numero}`;
  const all = getAlunos();
  let aluno = all.find(a => a.id === id);

  // Se ainda não tem PIN definido (primeiro acesso) — criar PIN agora
  if (!aluno?.pin) {
    if (pinIntroduzido.length < 4) return { ok: false, erro: 'O PIN deve ter 4 dígitos.' };
    const agora = new Date().toISOString();
    if (!aluno) {
      aluno = { id, turmaId, numero, ano, pin: pinIntroduzido, pinCriadoEm: agora, ativo: true };
      addAluno(aluno);
    } else {
      aluno.pin = pinIntroduzido;
      aluno.pinCriadoEm = agora;
      aluno.ativo = true;
      save(KEYS.alunos, getAlunos());
    }
    // Sincronizar com sheet
    await sincronizarAlunoComSheet(aluno);
    return { ok: true, aluno };
  }

  // Aluno já tem PIN — validar
  if (aluno.pin !== pinIntroduzido) return { ok: false, erro: 'PIN incorreto.' };
  return { ok: true, aluno };
}

/** Altera o PIN de um aluno já existente (pelo professor/coordenadora). */
export function alterarPinAluno(alunoId: string, novoPin: string): void {
  const all = getAlunos();
  const aluno = all.find(a => a.id === alunoId);
  if (!aluno) return;
  aluno.pin = novoPin;
  aluno.pinAlteradoEm = new Date().toISOString();
  save(KEYS.alunos, all);
  sincronizarAlunoComSheet(aluno);
}

/** Envia/atualiza um aluno na Sheet de Alunos. */
async function sincronizarAlunoComSheet(aluno: Aluno): Promise<void> {
  if (!SHEETS_ALUNOS_URL) return;
  try {
    await enviar(SHEETS_ALUNOS_URL, 'upsert_aluno', {
      id: aluno.id,
      turmaId: aluno.turmaId,
      numero: aluno.numero,
      ano: aluno.ano,
      nome: aluno.nome || '',
      pin: aluno.pin || '',
      pinCriadoEm: aluno.pinCriadoEm || '',
      pinAlteradoEm: aluno.pinAlteradoEm || '',
      nivelMedidas: aluno.nivelMedidas || '',
      ativo: aluno.ativo !== false,
    });
  } catch { /* falha silenciosa — localStorage é a fonte primária */ }
}

/** Carrega todos os alunos da Sheet para localStorage (usado pela coordenadora). */
export async function sincronizarAlunosDaSheet(): Promise<void> {
  // Usa a Sheet do KitchenFlow como fonte única de alunos
  const url = KITCHENFLOW_SHEET_URL || SHEETS_ALUNOS_URL;
  if (!url) return;
  try {
    // Ler separador Alunos directamente via tabela=Alunos
    const json = await lerDoSheets(url, { tabela: 'Alunos' });
    // Converter formato KitchenFlow → formato Avaliação ECL
    if (json?.ok && Array.isArray(json.dados) && json.dados.length > 4) {
      const all = getAlunos();
      json.dados.slice(4).forEach((row: any[]) => {
        if (!row[0]) return;
        const numero = Number(row[0]);
        const nome = String(row[1] || '').trim();
        const turma = String(row[2] || '').trim();
        const pin = String(row[3] || '').trim();
        const ativo = String(row[4] || 'ativo').toLowerCase() === 'ativo';
        const pinData = String(row[6] || '').trim();
        const pinHora = String(row[7] || '').trim();
        if (!numero || !turma) return;
        const id = turma + '-' + numero;
        const existing = all.find(a => a.id === id);
        if (existing) {
          if (nome) existing.nome = nome;
          if (pin) existing.pin = pin;
          if (pinData) existing.pinCriadoEm = pinData + (pinHora ? ' ' + pinHora : '');
          existing.ativo = ativo;
        } else {
          all.push({
            id, turmaId: turma, numero, ano: 1,
            nome: nome || undefined, pin: pin || undefined,
            pinCriadoEm: pinData || undefined, ativo,
          });
        }
      });
      save(KEYS.alunos, all);
      return;
    }
    // Fallback formato antigo
    const jsonAntigo = await lerDoSheets(SHEETS_ALUNOS_URL, { tipo: 'get_alunos' });
    if (!Array.isArray(json)) return;
    const all = getAlunos();
    json.forEach((row: any) => {
      const existing = all.find(a => a.id === row.id);
      if (existing) {
        // Atualizar campos vindos da sheet (nome, pin, timestamps, nível)
        if (row.nome) existing.nome = row.nome;
        if (row.pin) existing.pin = row.pin;
        if (row.pinCriadoEm) existing.pinCriadoEm = row.pinCriadoEm;
        if (row.pinAlteradoEm) existing.pinAlteradoEm = row.pinAlteradoEm;
        if (row.nivelMedidas) existing.nivelMedidas = Number(row.nivelMedidas) as 1|2|3;
        existing.ativo = row.ativo !== false && row.ativo !== 'false';
      } else {
        all.push({
          id: row.id,
          turmaId: row.turmaId,
          numero: Number(row.numero),
          ano: Number(row.ano) as 1|2|3,
          nome: row.nome || undefined,
          pin: row.pin || undefined,
          pinCriadoEm: row.pinCriadoEm || undefined,
          pinAlteradoEm: row.pinAlteradoEm || undefined,
          nivelMedidas: row.nivelMedidas ? Number(row.nivelMedidas) as 1|2|3 : undefined,
          ativo: row.ativo !== false && row.ativo !== 'false',
        });
      }
    });
    save(KEYS.alunos, all);
  } catch { /* sheet indisponível — mantém localStorage */ }
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

export function proximoNumeroEvento(): number {
  try {
    const todos = JSON.parse(localStorage.getItem('ecl_eventos_v3') || '[]');
    const maior = todos.reduce((m: number, e: any) => Math.max(m, e.numero || 0), 0);
    return Math.max(maior + 1, PISO_NUMERACAO);
  } catch { return PISO_NUMERACAO; }
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
  // Derivar o ano do nome da turma (1º ACP → 1, 2º ACP → 2, 3º ACP → 3)
  const match = (turmaId || '').match(/^(\d)/);
  const ano = match ? match[1] : (getAlunos().find(a => a.turmaId === turmaId)?.ano || '1');
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
  // Enviar selecao para Sheets — necessário para sincronização entre dispositivos
  // Tipo 'selecao' é diferente de 'avaliacao' para não criar linhas duplicadas
  enviar(SHEETS_HISTORICO_URL, 'selecao', {
    id: s.id,
    planoAulaId: s.planoAulaId,
    alunoId: s.alunoId,
    turmaId: s.turmaId,
    tecnicas: s.tecnicas,
    atitudes: s.atitudes,
    autoavaliacoes: s.autoavaliacoes,
    criadaEm: s.criadaEm,
  });
}

export function addOrUpdateValidacao(v: Validacao): void {
  const all = getValidacoes();
  const idx = all.findIndex(x => x.id === v.id);
  if (idx >= 0) all[idx] = v; else all.push(v);
  save(KEYS.validacoes, all);
  // Calcular nota média para o Sheet
  const notaMediaVal = v.notas.length
    ? v.notas.reduce((s, n) => s + n.nota, 0) / v.notas.length : 0;
  const aluno_val = getAlunos().find(a => a.id === v.alunoId);
  enviar(SHEETS_HISTORICO_URL, 'validacao', {
    ...(v as unknown as Record<string, unknown>),
    nomeAluno: aluno_val?.nome || ('Aluno ' + (aluno_val?.numero || 0)),
    turma: v.turmaId,
    nota_media_1_5: Math.round(notaMediaVal * 10) / 10,
    nota_media_0_20: Math.min(20, Math.round(notaMediaVal * 4)),
  });
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
  /** Quando professor escolhe "considerar feito" em vez de reavaliar */
  consideradoFeito?: boolean;
  /** true = nota conta para média; false = só registo histórico */
  contaParaMedia?: boolean;
}

/** Verifica se um aluno já foi avaliado numa competência para uma UC/UFCD.
 *  Aceita código UC (ex: 'UC03584') ou UFCD (ex: 'UFCD 12') — resolve
 *  equivalências automaticamente via cronograma.ts. */
export function registosAnteriores(
  alunoId: string,
  ucOuUfcd: string,
  microcompetenciaId: string
): RegistoAvaliacao[] {
  const todos = getHistoricoAvaliacoes();
  // Resolver equivalências UFCD→UC
  const ucsBase = ucsEquivalentes(ucOuUfcd);
  const ucsAVerificar = ucsBase.includes(ucOuUfcd) ? ucsBase : [...ucsBase, ucOuUfcd];
  return todos.filter(r =>
    r.alunoId === alunoId &&
    ucsAVerificar.includes(r.ucId) &&
    r.microcompetenciaId === microcompetenciaId
  );
}

/** Para um conjunto de alunos e competências, devolve quais já foram avaliados.
 *  Resultado: { [alunoId]: { [microId]: RegistoAvaliacao[] } } */
export function mapaAvaliacoesAnteriores(
  alunoIds: string[],
  ucOuUfcd: string,
  microIds: string[]
): Record<string, Record<string, RegistoAvaliacao[]>> {
  const todos = getHistoricoAvaliacoes();
  const ucsBase2 = ucsEquivalentes(ucOuUfcd);
  const ucsAVerificar = ucsBase2.includes(ucOuUfcd) ? ucsBase2 : [...ucsBase2, ucOuUfcd];

  const mapa: Record<string, Record<string, RegistoAvaliacao[]>> = {};
  for (const alunoId of alunoIds) {
    mapa[alunoId] = {};
    for (const microId of microIds) {
      mapa[alunoId][microId] = todos.filter(r =>
        r.alunoId === alunoId &&
        ucsAVerificar.includes(r.ucId) &&
        r.microcompetenciaId === microId
      );
    }
  }
  return mapa;
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

  // Label legível do nível (escala 1-5)
  const LABEL_NIVEL: Record<number, string> = {
    1: 'Ainda não fiz', 2: 'Preciso de mais prática',
    3: 'Consegui com ajuda', 4: 'Faço sozinho/a', 5: 'Faço com muito bom resultado',
  };
  const nota20 = Math.min(20, Math.round(r.nota * 4));

  enviar(SHEETS_HISTORICO_URL, 'avaliacao', {
    ...r,
    tipo: 'avaliacao',
    nomeAluno: aluno?.nome || ('Aluno ' + (aluno?.numero || 0)),
    numero: aluno?.numero || 0,
    turma: r.turmaId,
    ano: aluno?.ano || 1,
    planoTitulo: plano?.titulo || '',
    planoData: plano?.data || '',
    ucId: r.ucId || plano?.ucId || '',
    ucNome: plano?.ucNome || '',
    fichaNome: ficha?.nomePrato || '',
    microcompetencia: r.microcompetenciaId,
    nota_1_5: r.nota,
    nota_0_20: nota20,
    nivel_label: LABEL_NIVEL[r.nota] || String(r.nota),
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
export const SHEETS_RECUPERACAO_URL = 'https://script.google.com/macros/s/AKfycbweU15FtVE5AIdl-kpV0PCmuNxYsd4pUIfdSLIAmVIal7z0Sb2oGimGgsjKHUHYxDML/exec';

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


// ── Criar recuperação via FCT — tipo adicional, não substitui a anterior ──
// O professor escolhe as competências a evidenciar e se exige horas mínimas.
// O aluno preenche evidências reais da FCT em vez de trabalho teórico.
export function criarRecuperacaoFCT(
  alunoId: string, turmaId: string, ucId: string, ucNome: string,
  competenciasAEvidenciar: string[], exigirHoras: boolean, horasMinimasExigidas?: number,
  localFCT?: string, supervisorFCT?: string, dataInicio?: string, dataTermo?: string,
  importancias?: number[], perguntas?: string[]
): RecuperacaoModulo {
  const agora = new Date().toISOString();
  const dataLimite = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  return {
    id: `recup_fct_${alunoId}_${ucId}_${Date.now()}`,
    alunoId, turmaId, ucId, ucNome,
    numeroRecuperacao: proximoNumeroRecuperacao(),
    tipoUC: classificarTipoUC(ucId),
    planosIds: [],
    competenciasIds: competenciasAEvidenciar,
    atitudesIds: [],
    responsabilidadesIds: [],
    estado: 'pendente',
    dataAtribuicao: agora,
    dataLimite,
    criadoEm: agora,
    atualizadoEm: agora,
    viaFCT: true,
    fct: {
      exigirHoras,
      horasMinimasExigidas,
      localFCT,
      supervisorFCT,
      dataInicio,
      dataTermo,
      importancias,
      perguntas,
      competenciasAEvidenciar,
      evidencias: [],
    },
  };
}

// ── Adicionar/actualizar uma evidência de FCT numa recuperação existente ──
export function addEvidenciaFCT(
  recuperacaoId: string,
  evidencia: { id: string; competenciaId: string; descricao: string; dataOcorrencia?: string; anexoUrl?: string }
): void {
  const all = getRecuperacoes();
  const idx = all.findIndex(r => r.id === recuperacaoId);
  if (idx < 0 || !all[idx].fct) return;
  const evidenciasAtuais = all[idx].fct!.evidencias || [];
  const idxEv = evidenciasAtuais.findIndex(e => e.id === evidencia.id);
  if (idxEv >= 0) evidenciasAtuais[idxEv] = { ...evidenciasAtuais[idxEv], ...evidencia };
  else evidenciasAtuais.push({ ...evidencia, validadoPeloSupervisor: false });
  all[idx] = { ...all[idx], fct: { ...all[idx].fct!, evidencias: evidenciasAtuais }, atualizadoEm: new Date().toISOString() };
  save(KEYS.recuperacoes, all);
}

// Resumo de progresso de competências de uma UC para um aluno — combina o que
// foi demonstrado em aula com o que foi recuperado posteriormente.
export function getEstadoCompetenciasUC(alunoId: string, ucId: string): {
  total: number; demonstradasEmAula: number; recuperadas: number; estado: 'incompleto' | 'completo';
} {
  const micros = microsPorUC(ucId);
  const total = micros.length;
  const historico = getHistoricoAvaliacoes().filter(r => r.alunoId === alunoId && r.ucId === ucId && r.validadoPor !== 'recuperacao');
  const demonstradasEmAula = new Set(historico.filter(r => r.nota >= 3).map(r => r.microcompetenciaId)).size;
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
// Contextos pedagógicos específicos por UC — ancoram o plano de recuperação
// no espírito real da UC, evitando que a IA gere tarefas técnicas genéricas.
const CONTEXTO_PEDAGOGICO_UC: Record<string, string> = {
  UC03586: `Esta UC é sobre COZINHA E DOÇARIA TRADICIONAL PORTUGUESA.
O objetivo central não é técnico — é cultural e identitário.
O aluno deve ser capaz de:
- Reconhecer pratos emblemáticos da gastronomia portuguesa (bacalhau, caldo verde, cozido, arroz de pato, pastéis de nata, etc.)
- Compreender a ligação entre os pratos e as regiões, tradições e história do país
- Valorizar os produtos nacionais (DOP, IGP) e a sazonalidade
- Executar uma receita tradicional respeitando a técnica original, não a adaptando arbitrariamente
O plano de recuperação deve centrar-se neste eixo cultural: IDENTIDADE, TRADIÇÃO, PRODUTO NACIONAL.
Não deve focar em técnicas culinárias genéricas (brunoise, branquear, etc.) que pertencem a outras UCs.`,

  UC03587: `Esta UC é sobre PASTELARIA DE SOBREMESA.
O foco é a confeção de produtos de pastelaria e sobremesas, cremes, massas base e geladaria.
O plano deve centrar-se em produções de pastelaria — não em técnicas de cozinha salgada.`,

  UC03588: `Esta UC é sobre GASTRONOMIA DO MUNDO.
O aluno deve conhecer e confecionar pratos de diferentes culturas e países.
O plano deve ligar-se a um ou mais países/regiões específicos, não a técnicas genéricas.`,

  UC01999: `Esta UC é sobre MÉTODOS DE CONFEÇÃO.
O foco é a aplicação correta dos diferentes métodos (assar, brasear, cozer, confitar, etc.)
O plano deve centrar-se nos métodos específicos que o aluno não demonstrou.`,

  UC02002: `Esta UC é sobre SOPAS, ACEPIPES, OVOS, MASSAS, SALADAS E ENTRADAS.
O plano deve centrar-se nas produções deste grupo — não em carnes, peixes ou pastelaria.`,

  UC02003: `Esta UC é sobre PEIXES E MARISCOS.
O plano deve centrar-se na preparação e confeção de pescado — limpeza, corte, técnicas de confeção aplicadas ao peixe.`,

  UC02004: `Esta UC é sobre CARNES, AVES E CAÇA.
O plano deve centrar-se na preparação e confeção de carnes — desossar, aparar, bridagem, métodos de confeção aplicados.`,

  UC02005: `Esta UC é sobre MASSAS BASE, RECHEIOS, CREMES E MOLHOS DE PASTELARIA.
O plano deve centrar-se nas bases de pastelaria — pâte brisée, sablée, choux, cremes, etc.`,

  UC03585: `Esta UC é sobre CONSERVAÇÃO DE MATÉRIAS-PRIMAS E PRODUTOS.
O foco é HACCP, temperaturas, etiquetagem, FIFO/FEFO, armazenamento correto.
O plano deve centrar-se nas práticas de conservação e segurança alimentar.`,
};

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
    criteriosDesempenho: refUC?.criteriosDesempenho || [],
    contextoUC: CONTEXTO_PEDAGOGICO_UC[r.ucId] || undefined,
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
export function getNivelMaximoEvidencia(alunoId: string, competenciaId: string): 0 | 1 | 2 | 3 | 4 | 5 {
  const evidencias = getEvidenciasPorCompetencia(alunoId, competenciaId);
  if (evidencias.length === 0) return 0;
  return evidencias.reduce((max, e) => (e.nivel > max ? e.nivel : max), 0 as 0 | 1 | 2 | 3 | 4 | 5);
}

// ── Perfil Profissional do Aluno ─────────────────────────────────
// Junta histórico de avaliações + evidências + recuperações numa vista
// única, dividida em 4 áreas (pontos 32-35 do documento pedagógico):
// Competências Técnicas, Responsabilidades, Gestão/Organização, Atitudes.
export interface ItemPerfil {
  competenciaId: string;
  nome: string;
  nivel: 0 | 1 | 2 | 3 | 4 | 5;
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

function notaParaNivel(nota: number): 0 | 1 | 2 | 3 | 4 | 5 {
  // Escala 1-5 directa
  if (nota >= 5) return 5;
  if (nota >= 4) return 4;
  if (nota >= 3) return 3;
  if (nota >= 2) return 2;
  if (nota >= 1) return 1;
  // Compatibilidade com notas antigas (5/10/15/18/20)
  if (nota >= 20) return 5;
  if (nota >= 15) return 4;
  if (nota >= 12) return 3;
  if (nota >= 8)  return 2;
  if (nota > 0)   return 1;
  return 0;
}

export function getPerfilProfissionalAluno(alunoId: string): PerfilProfissionalAluno {
  const historico = getHistoricoAvaliacoes().filter(r => r.alunoId === alunoId);
  const evidencias = getEvidenciasPorAluno(alunoId);

  // Passo 1 — dentro da MESMA aula (planoAulaId + competência), a nota do professor
  // é sempre a autoritativa quando existe: substitui a nota provisória do aluno,
  // em vez de disputar por "qual é mais alta". Ambas as notas ficam registadas no
  // histórico (contam efetivamente), mas só uma entra na progressão por aula.
  const porAula = new Map<string, { nota: number; validadoPor: string; data: string }>();
  historico.forEach(r => {
    const chave = `${r.planoAulaId}__${r.microcompetenciaId}`;
    const actual = porAula.get(chave);
    const ehProfessor = r.validadoPor === 'professor' || r.validadoPor === 'recuperacao';
    if (!actual) {
      porAula.set(chave, { nota: r.nota, validadoPor: r.validadoPor, data: r.data });
    } else {
      const actualEhProfessor = actual.validadoPor === 'professor' || actual.validadoPor === 'recuperacao';
      // Professor substitui aluno; entre duas do professor, fica a mais recente.
      if (ehProfessor && !actualEhProfessor) {
        porAula.set(chave, { nota: r.nota, validadoPor: r.validadoPor, data: r.data });
      } else if (ehProfessor === actualEhProfessor && r.data >= actual.data) {
        porAula.set(chave, { nota: r.nota, validadoPor: r.validadoPor, data: r.data });
      }
    }
  });

  // Passo 2 — progressão ao longo do ano: entre aulas diferentes, mantém o nível
  // mais alto já validado (consolidação não regride — ver ponto 29 do documento
  // pedagógico), mas agora usando sempre a nota resolvida por aula (passo 1).
  const porCompetencia = new Map<string, { nivel: 0 | 1 | 2 | 3 | 4 | 5; origem: ItemPerfil['origem']; data: string }>();

  porAula.forEach((info, chave) => {
    const competenciaId = chave.split('__')[1];
    const nivel = notaParaNivel(info.nota);
    const actual = porCompetencia.get(competenciaId);
    if (!actual || nivel > actual.nivel) {
      porCompetencia.set(competenciaId, {
        nivel, origem: info.validadoPor === 'recuperacao' ? 'recuperacao' : 'aula', data: info.data,
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


// ── Sistema de pontos por regularidade — bónus KitchenFlow ─────
// Conta dias distintos com registo de entrada (higiene) no KitchenFlow.
// NOTA: usa apenas as presenças e evidências já sincronizadas localmente.
// Para contar registos VOLUNTÁRIOS (além do obrigatório da ficha), é preciso
// um endpoint novo no KitchenFlow (get_registos_aluno) que devolva todos os
// registos do aluno, não só os ligados a uma ficha específica — a acrescentar
// quando decidido.
export interface PontosRegularidade {
  pontos: number;
  diasComRegisto: number;
  nivel: 'sem_nivel' | 'bronze' | 'prata' | 'ouro';
  proximoNivel: { nivel: string; faltam: number } | null;
}

export function calcularPontosRegularidade(alunoId: string): PontosRegularidade {
  const presencas = getPresencas().filter(p => p.alunoId === alunoId);
  // Dias distintos em que o aluno cumpriu o registo de entrada (higiene) — cada
  // dia conta como 1 ponto de regularidade, com bónus extra se a farda estava completa.
  const diasUnicos = new Set(presencas.map(p => p.data));
  const diasComFardaCompleta = presencas.filter(p => p.fardamentoOk).length;

  const pontos = diasUnicos.size + diasComFardaCompleta; // 1pt/dia + 1pt bónus farda completa

  const NIVEIS: { nivel: PontosRegularidade['nivel']; min: number }[] = [
    { nivel: 'ouro', min: 40 },
    { nivel: 'prata', min: 20 },
    { nivel: 'bronze', min: 8 },
    { nivel: 'sem_nivel', min: 0 },
  ];
  const atual = NIVEIS.find(n => pontos >= n.min) || NIVEIS[NIVEIS.length - 1];
  const idxAtual = NIVEIS.findIndex(n => n.nivel === atual.nivel);
  const proximo = idxAtual > 0 ? NIVEIS[idxAtual - 1] : null;

  return {
    pontos,
    diasComRegisto: diasUnicos.size,
    nivel: atual.nivel,
    proximoNivel: proximo ? { nivel: proximo.nivel, faltam: proximo.min - pontos } : null,
  };
}


// ── Bónus de Assiduidade/Pontualidade/Fardamento por UC ─────────
// Máximo 2 valores somados directamente à nota final da UC (acumulado ao
// longo de todo o trimestre/ano nessa UC, não por aula):
//   · 0.5 valores — Pontualidade (chegar a horas)
//   · 0.5 valores — Assiduidade (não faltar)
//   · 1.0 valor   — Fardamento (farda completa)
// Cada aluno começa no máximo (2.0) e desce por cada falha. Os valores de
// desconto por falha (abaixo) são um ponto de partida — ajustar livremente.
const DESCONTO_POR_ATRASO = 0.1;   // por cada atraso registado
const DESCONTO_POR_FALTA = 0.25;   // por cada aula da UC em que o aluno faltou
const DESCONTO_POR_FARDA_INCOMPLETA = 0.1; // por cada aula com farda incompleta

export interface BonusAssiduidadeUC {
  pontualidade: number;    // 0 a 0.5
  assiduidade: number;     // 0 a 0.5
  fardamento: number;      // 0 a 1.0
  total: number;           // 0 a 2.0 — somar directamente à nota /20
  detalhe: { aulas: number; faltas: number; atrasos: number; fardaIncompleta: number };
}

export function calcularBonusAssiduidadeUC(alunoId: string, turmaId: string, ucId: string): BonusAssiduidadeUC {
  const planosDaUC = getPlanosAulaPorTurma(turmaId)
    .filter(p => p.ucId === ucId && p.estado !== 'rascunho');
  const presencas = getPresencas().filter(p => p.alunoId === alunoId);

  let faltas = 0, atrasos = 0, fardaIncompleta = 0;

  planosDaUC.forEach(p => {
    const pres = presencas.find(x => x.planoAulaId === p.id);
    if (!pres || pres.presente === false) { faltas++; return; }
    if (pres.atrasado) atrasos++;
    if (!pres.fardamentoOk) fardaIncompleta++;
  });

  const pontualidade = Math.max(0, 0.5 - atrasos * DESCONTO_POR_ATRASO);
  const assiduidade = Math.max(0, 0.5 - faltas * DESCONTO_POR_FALTA);
  const fardamento = Math.max(0, 1.0 - fardaIncompleta * DESCONTO_POR_FARDA_INCOMPLETA);

  return {
    pontualidade: Math.round(pontualidade * 100) / 100,
    assiduidade: Math.round(assiduidade * 100) / 100,
    fardamento: Math.round(fardamento * 100) / 100,
    total: Math.round((pontualidade + assiduidade + fardamento) * 100) / 100,
    detalhe: { aulas: planosDaUC.length, faltas, atrasos, fardaIncompleta },
  };
}


// ── Pontos de Disponibilidade — Eventos Extracurriculares ──────
// Só se aplica a eventos marcados como "extracurricular" (fora de horas
// letivas/aulas práticas — concursos, visitas fora do horário normal).
// Regras (ponto de partida — ajustar os factores livremente):
//   · Base: 1 ponto por dia de participação
//   · Fim de semana (sáb/dom): ×2
//   · Noite — evento com horaInicio às 19h ou mais tarde: ×1.5
//   · Fim de semana + noite: os dois multiplicadores acumulam (×3)
export interface PontosDisponibilidadeDia {
  data: string;
  ehFimDeSemana: boolean;
  ehNoite: boolean;
  pontos: number;
}

const MULTIPLICADOR_FIM_DE_SEMANA = 2;
const MULTIPLICADOR_NOITE = 1.5;
const HORA_INICIO_NOITE = 19;

export function calcularPontosDisponibilidadeEvento(dias: { data: string; horaInicio?: string }[]): {
  detalhePorDia: PontosDisponibilidadeDia[];
  totalPontos: number; // nota única, 1 a 20 — nunca cresce sem limite
} {
  const detalhePorDia = dias.map(d => {
    const dataObj = new Date(d.data + 'T00:00:00');
    const diaSemana = dataObj.getDay(); // 0=domingo, 6=sábado
    const ehFimDeSemana = diaSemana === 0 || diaSemana === 6;

    let ehNoite = false;
    if (d.horaInicio) {
      const hora = parseInt(d.horaInicio.split(':')[0], 10);
      ehNoite = !isNaN(hora) && hora >= HORA_INICIO_NOITE;
    }

    let pontos = 1; // base por dia
    if (ehFimDeSemana) pontos *= MULTIPLICADOR_FIM_DE_SEMANA;
    if (ehNoite) pontos *= MULTIPLICADOR_NOITE;

    return { data: d.data, ehFimDeSemana, ehNoite, pontos: Math.round(pontos * 10) / 10 };
  });

  // Soma bruta dos pontos de todos os dias do evento — depois normalizada
  // para uma nota única de 1 a 20 (nunca uma soma que cresce sem limite,
  // mesmo que o evento dure muitos dias).
  const somaBruta = detalhePorDia.reduce((s, d) => s + d.pontos, 0);
  const totalPontos = somaBruta > 0 ? Math.min(20, Math.max(1, Math.round(somaBruta * 10) / 10)) : 0;

  return { detalhePorDia, totalPontos };
}


// ── Gerar PDF da Recuperação FCT via Apps Script (dentro da app, sem
// depender de ninguém gerar manualmente) ────────────────────────────
export async function gerarPDFRecuperacaoFCTViaScript(dados: {
  nomeAluno: string; turma: string; anoLetivo?: string; area?: string; modulo: string;
  ucId?: string; ucNome?: string;
  competencias: string[]; exigirHoras: boolean; horasMinimas?: number;
  localFCT?: string; dataInicio?: string; dataTermo?: string;
  // Evidências reais já submetidas pelo aluno — é isto que o Orientador avalia
  // na tabela final, uma linha por evidência (não por competência abstracta).
  evidencias?: { competenciaId: string; descricao: string }[];
  // Importância relativa de cada competência (mesma ordem que "competencias"),
  // 1=baixa 2=média 3=alta — usada para calcular o peso % de cada uma na média.
  importancias?: number[];
  // Pergunta de cenário da IA para cada competência (mesma ordem) — usada
  // no guião de reflexão em vez da fórmula genérica.
  perguntas?: string[];
}): Promise<{ ok: boolean; pdfUrl?: string; mensagem?: string }> {
  if (!RECUPERACAO_FCT_PDF_URL) {
    return { ok: false, mensagem: 'Script de PDF ainda não configurado — falta o URL do deployment.' };
  }
  try {
    // Mesmo formato simples e directo usado por todos os outros scripts da
    // app (ver enviar()) — sem embrulhar duas vezes em JSON, que estava a
    // esconder os campos reais do script (nomeAluno, competências, etc.
    // chegavam sempre vazios).
    const res = await fetch(RECUPERACAO_FCT_PDF_URL, {
      method: 'POST',
      body: JSON.stringify(dados),
    });
    const json = await res.json();
    return json;
  } catch (err) {
    return { ok: false, mensagem: 'Erro de ligação ao script de PDF.' };
  }
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
  const dispensados = new Set(load<string>(KEYS.avisosDispensados));
  const operacionais = calcularAvisosOperacionais().filter(a => !dispensados.has(a.id));
  return [...persistidos, ...operacionais];
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
  // Avisos operacionais (id começa com 'op_') são recalculados dinamicamente
  // — não estão no localStorage, por isso guarda-se o ID numa lista de dispensados
  if (avisoId.startsWith('op_')) {
    const dispensados = load<string>(KEYS.avisosDispensados);
    if (!dispensados.includes(avisoId)) {
      dispensados.push(avisoId);
      save(KEYS.avisosDispensados, dispensados);
    }
    return;
  }
  // Avisos persistidos normais
  const all = getAvisos();
  const idx = all.findIndex(a => a.id === avisoId);
  if (idx >= 0) {
    all[idx] = { ...all[idx], resolvido: true, resolvidoEm: new Date().toISOString() };
    save(KEYS.avisos, all);
  }
}

export function limparAvisosDispensados(): void {
  save(KEYS.avisosDispensados, []);
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

// ── Sugestões de ingredientes — fluxo Professor → Coordenadora ───────────
// Professor cria sugestão via Requisição → fica como aviso pendente no
// Centro de Avisos → Coordenadora aprova/edita/rejeita → se aprovado,
// o ingrediente é adicionado/actualizado na camada custom (MateriaPrimaCustom).

export function addSugestaoIngrediente(sugestao: {
  nomeOriginal: string;
  nomeCorrigido?: string;
  precoKg?: number;
  precoUnitario?: number;
  unidadeCompra?: string;
  categoria?: string;
  observacao?: string;
  sugeridoPor?: string;
}): void {
  // Verificar se já existe sugestão pendente para este ingrediente
  const all = getAvisos();
  const jaExiste = all.some(a =>
    !a.resolvido &&
    a.tipo === 'sugestao_ingrediente' &&
    a.contexto?.sugestao?.nomeOriginal?.toLowerCase() === sugestao.nomeOriginal.toLowerCase()
  );
  if (jaExiste) return;

  addAviso({
    tipo: 'sugestao_ingrediente',
    titulo: `💡 Sugestão: "${sugestao.nomeOriginal}"`,
    descricao: sugestao.observacao
      ? `${sugestao.sugeridoPor || 'Professor'}: ${sugestao.observacao}`
      : `${sugestao.sugeridoPor || 'Professor'} sugere correcção a este ingrediente`,
    contexto: {
      ingredienteNome: sugestao.nomeOriginal,
      sugestao: {
        ...sugestao,
        sugeridoEm: new Date().toISOString(),
        estadoAprovacao: 'pendente',
      },
    },
  });
}

export function aprovarSugestaoIngrediente(avisoId: string, dadosFinais: {
  nomeCorrigido: string;
  precoKg: number;
  precoUnitario: number;
  unidadeCompra: string;
  categoria: string;
}): void {
  const all = getAvisos();
  const aviso = all.find(a => a.id === avisoId);
  if (!aviso || !aviso.contexto?.sugestao) return;

  const nomeOriginal = aviso.contexto.sugestao.nomeOriginal;

  // Adicionar/actualizar na camada custom — fica imediatamente disponível
  addOrUpdateMateriaPrimaCustom({
    nome: dadosFinais.nomeCorrigido || nomeOriginal,
    categoria: dadosFinais.categoria || 'Outro',
    unidadeCompra: dadosFinais.unidadeCompra || 'kg',
    precoKg: dadosFinais.precoKg || 0,
    precoUnitario: dadosFinais.precoUnitario || 0,
    aliases: nomeOriginal !== dadosFinais.nomeCorrigido
      ? [nomeOriginal.toLowerCase()]
      : [],
  });

  // Marcar aviso como resolvido
  resolverAviso(avisoId);
}

export function rejeitarSugestaoIngrediente(avisoId: string): void {
  resolverAviso(avisoId);
}


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

// ── Técnicas Custom — camada editável por cima das SUBTECNICAS base ────────
// Quando o professor encontra uma técnica nova ou com nome diferente
// (ex: "creme de nata", "pastel de nata"), pode adicioná-la aqui —
// entra em vigor imediatamente em todas as fichas seguintes, sem precisar
// de ir ao código. Mesmo modelo da MateriaPrimaCustom para ingredientes.

export interface TecnicaCustom {
  id: string;
  nome: string;              // nome da técnica como vai aparecer na app
  palavrasChave: string[];   // termos que activam esta técnica no texto da receita
  tecnicaMaeId?: string;     // ligação à técnica-grupo (T01-T33), opcional
  uc?: string[];             // UCs do referencial 811RA144 associadas
  criadoEm: string;
  atualizadoEm: string;
  criadoPor?: string;        // nome do professor que adicionou
}

export function getTecnicasCustom(): TecnicaCustom[] {
  try {
    const raw = localStorage.getItem(KEYS.tecnicasCustom);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function addOrUpdateTecnicaCustom(t: Omit<TecnicaCustom, 'id' | 'criadoEm' | 'atualizadoEm'> & { id?: string }): TecnicaCustom {
  const all = getTecnicasCustom();
  const agora = new Date().toISOString();
  const idExistente = t.id || all.find(x => x.nome.toLowerCase() === t.nome.toLowerCase())?.id;
  const idx = idExistente ? all.findIndex(x => x.id === idExistente) : -1;
  const registo: TecnicaCustom = {
    id: idExistente || `tec_custom_${Date.now()}`,
    nome: t.nome,
    palavrasChave: t.palavrasChave || [t.nome.toLowerCase()],
    tecnicaMaeId: t.tecnicaMaeId,
    uc: t.uc,
    criadoPor: t.criadoPor,
    criadoEm: idx >= 0 ? all[idx].criadoEm : agora,
    atualizadoEm: agora,
  };
  if (idx >= 0) all[idx] = registo; else all.push(registo);
  save(KEYS.tecnicasCustom, all);
  return registo;
}

export function eliminarTecnicaCustom(id: string): void {
  save(KEYS.tecnicasCustom, getTecnicasCustom().filter(t => t.id !== id));
}

// ═══════════════════════════════════════════════════════════════
// CLASSROOM — publicação automática
// ═══════════════════════════════════════════════════════════════

export type TipoPublicacaoClassroom = 'plano' | 'ficha' | 'guiao' | 'competencias' | 'requisicao' | 'evento';

export async function publicarNoClassroom(
  tipo: TipoPublicacaoClassroom,
  turmaId: string,
  conteudo: Record<string, unknown>
): Promise<{ ok: boolean; erro?: string }> {
  console.log('[Classroom] A publicar...', { tipo, turmaId, url: CLASSROOM_SCRIPT_URL });
  try {
    const body = JSON.stringify({
      action: 'publicarClassroom',
      tipo,
      turmaId,
      conteudo,
    });
    console.log('[Classroom] Body:', body);
    const resp = await fetch(CLASSROOM_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body,
    });
    console.log('[Classroom] Resposta HTTP:', resp.status, resp.statusText);
    const texto = await resp.text();
    console.log('[Classroom] Resposta texto:', texto);
    try {
      const data = JSON.parse(texto);
      console.log('[Classroom] Resposta JSON:', data);
      return data;
    } catch {
      return { ok: false, erro: 'Resposta inválida: ' + texto.slice(0, 200) };
    }
  } catch (e) {
    console.error('[Classroom] Erro fetch:', e);
    return { ok: false, erro: String(e) };
  }
}

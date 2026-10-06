// ============================================================
// Backend ECL — localStorage (primário) + Google Sheets (persistência)
// localStorage: acesso imediato e offline
// Sheets: backup permanente — nunca perde dados ao mudar browser
// ============================================================

import { baseLigada, gravarNaBase, lerDaBase, COLECAO_DO_TIPO, VAI_PARA_A_BASE } from './baseDeDados';
import type { Triagem5C } from './triagem5c';
import { bancoDe, perguntaDoCiclo } from './triagem5c';
import { contextoDaAula, pesoNoModulo, type ContextoAula } from './contextoAula';
import { manualDaUC, proximoConteudo, indicadoresDoConteudo } from './bancoManuais';
import { notaDaPautaUC, produtosDaUC, linhasDaPautaUC, notaDoCompetente, nivelPauta } from './pautaUC';
import { planoNumDiaSemAulas } from './horarios';
import { BONUS_EVENTOS, ATITUDES_FIXAS_EVENTO, TEC_EVENTO, TIPOS_EVENTO as TIPOS_EVENTO_PLANO, atitudesSugeridasEvento } from './eventosAvaliacao';
import { ucsEquivalentes, modulosDaTurma, CRONOGRAMA_2026_2027 } from './cronograma';
import {
  Comanda, SelecaoAluno, Validacao, Atividade,
  Turma, Aluno, PlanoAula, FichaProducao,
  DistribuicaoFicha, ChecklistAlunoFicha, RequisicaoAula, RecuperacaoModulo, Evidencia,
  Aviso, MateriaPrimaCustom, EntradaManual
, SessaoAula, TOLERANCIA_PADRAO_MIN , CampoKF, PassoChecklistFicha, calcularNotaPlano, BONUS_PARTICIPACAO, notaPara20, nivelDe20, nivelPara20 } from './types';
import { microsPorUC, ATITUDES, OBRIGATORIAS, encontrarMicro, nomeConhecimentoProf, categoriaDaNota, conhecimentosDoReferencial, nomeCompetencia } from './compatECL';
import { classificarGrupoCompetencia, gerarPromptPlanoIndividual, gerarPromptAnalisePreliminar } from './matrizEvidencias';
import { REFERENCIAL_811RA144 } from './referencial811RA144';
import { estadoDosPrecos, juntarPrecosRevistos, getPrecosRevistos, getMateriaPrimasBase, type PrecoRevisto } from './materiasPrimasBase';

// ══ SCRIPT ÚNICO ══
// Um só script guarda tudo: planos, fichas, alunos, avaliações,
// presenças, autoavaliações, validações, sessões, recuperações,
// evidências e telemóveis (AppsScript_ECL_UNICO.gs).
//
// Enquanto esta linha estiver vazia, a aplicação usa os endereços
// antigos, um por assunto. Assim que aqui estiver o endereço do script
// único, passa tudo a ir e a vir de lá — sem mexer em mais nada.
//
// Colar entre as plicas o URL que acaba em /exec:
export const SHEETS_ECL_URL = 'https://script.google.com/macros/s/AKfycbzFbA8e0U9GCSKyCvrCo2Pe28XgG9_UDcu7f9lqyZJ3kmWpnCj5PbWRyctLmN5OP6sC8Q/exec';

// ── URLs dos Apps Scripts ────────────────────────────────────
// Histórico de avaliações dos alunos (já configurado e a funcionar)
const SHEETS_HISTORICO_URL = SHEETS_ECL_URL || 'https://script.google.com/macros/s/AKfycbw9F0aZWCQOi-zIDUaMljLkAh3ilWt9R6D_EZe3as3pFm234q3u8iF1428Ga86ma_aYTg/exec';

// Planos de Aula (preencher após criar o Sheets de Planos)
const SHEETS_PLANOS_URL = SHEETS_ECL_URL || 'https://script.google.com/macros/s/AKfycbxT00cLo_mTHjv-swqo-lxqdq-YRmOB3gQ4AZ8rbIdyzTbAFt_Yi56D6-_GHV7miAlv/exec';

// Fichas de Produção (preencher após criar o Sheets de Fichas)
const SHEETS_FICHAS_URL = SHEETS_ECL_URL || 'https://script.google.com/macros/s/AKfycbzhKheayYwBaIVNoz0dgHkb8JK1w8dViGY2T_HUILD2CXJJ7EPaIcnR97_uxBOqbRHw/exec';
// Deployment do script RecuperacaoFCT_PDF_ECL.gs — a Rosa preenche isto
// depois de instalar o script (ver instruções no topo do ficheiro .gs).
const PAUTA_FCT_URL = 'https://script.google.com/macros/s/AKfycbwz_L-z2nmhUUambttWLf1TV8_aOk68zJ6tpR8vZiD7kz4dL9reUZa8hvdnfmMaAzp-uA/exec';
const RECUPERACAO_FCT_PDF_URL = 'https://script.google.com/macros/s/AKfycbxWgbuC3U6LN3O6R9LFxU9DecUaub5YDwz2wD2E76bJI0sP_1pWYg1CsSRhp1PFM3I/exec';


// URL do Apps Script de Requisição (apps_script_requisicao_v3.js) — preenche a sheet
// modelo com ingredientes, preços, turma, data, formador, responsável e atividade.
export const SHEETS_REQUISICAO_URL = 'https://script.google.com/macros/s/AKfycbz7g1xOC8gg23zI-wbE5ttAIHVj0l7GQrGkhSudCRvJqvgL5OK3bsBRmOSu4nNsEpR4aA/exec';
// ID do Google Sheets da Requisição — para abrir directamente após o envio
export const SHEETS_REQUISICAO_ID = ''; // preencher quando confirmado

export const SHEETS_CALENDARIO_URL = SHEETS_ECL_URL || 'https://script.google.com/macros/s/AKfycbweU15FtVE5AIdl-kpV0PCmuNxYsd4pUIfdSLIAmVIal7z0Sb2oGimGgsjKHUHYxDML/exec';

// Sheet de Alunos — registo central de alunos, PINs e timestamps
// Preencher após criar o Apps Script de alunos (conta eclisboa.net)
// Login partilhado — mesma Sheet e Apps Script do KitchenFlow
// O aluno cria PIN num lado e fica disponível no outro automaticamente
export let SHEETS_ALUNOS_URL = SHEETS_ECL_URL || 'https://script.google.com/macros/s/AKfycbweU15FtVE5AIdl-kpV0PCmuNxYsd4pUIfdSLIAmVIal7z0Sb2oGimGgsjKHUHYxDML/exec';

// ── Integração KitchenFlow ECL ───────────────────────────────
// URL do Apps Script do KitchenFlow — envia registos em background
export const CLASSROOM_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxoSOznjK5Hz13-oKChFg8fwzLNsa1rD0peshcbkBFLGv1dsm7Loyg8J3gIBOrlw64kAw/exec';
export const KITCHENFLOW_SHEET_URL = 'https://script.google.com/macros/s/AKfycbweU15FtVE5AIdl-kpV0PCmuNxYsd4pUIfdSLIAmVIal7z0Sb2oGimGgsjKHUHYxDML/exec';
export const KITCHENFLOW_APP_URL = 'https://ecl-haccp.vercel.app/';

// Formato: { tabela: string, linha: any[] }
// Os registos que a Avaliação ECL faz pelo KitchenFlow (higiene pessoal, temperatura
// de serviço, não conformidades) vão para o MESMO endereço que a aplicação
// KitchenFlow usa: o Google Sheets novo «HACCP KitchenFlow 2026-2027» (script v6).
// Antes iam para outro endereço (KITCHENFLOW_SHEET_URL), que podia ser outra folha: a higiene pessoal confirmada na Avaliação
// podia não aparecer nas folhas HACCP (Rosa, out/2026).
export const KITCHENFLOW_REGISTOS_URL = 'https://script.google.com/macros/s/AKfycbwa5WBEQy6fhYXP_mJO9RJy-23H1EtEkny2ObGwowrxc8T7EkoEwVuum0CJTr-HXrePkQ/exec';

async function enviarParaKitchenFlow(tabela: string, linha: any[]): Promise<void> {
  // O número de envio deixa o script v6 reconhecer uma repetição: as tentativas
  // seguintes não gravam a linha duas vezes.
  const idEnvio = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  const corpo = JSON.stringify({ tabela, linha, idEnvio });
  // Até 3 tentativas: na cozinha, a rede falha muitas vezes.
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(KITCHENFLOW_REGISTOS_URL, { method: 'POST', body: corpo, keepalive: corpo.length < 60000 });
      if (r.ok) return;
    } catch { /* tenta outra vez */ }
    await new Promise(res => setTimeout(res, 3000 * (i + 1)));
  }
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
// Quando o telemóvel não tem espaço (ou o browser não deixa guardar), o que
// não coube fica na memória enquanto a aplicação estiver aberta. Antes, a
// gravação falhava em silêncio e o aluno ficava sem ver planos nenhuns.
const naMemoria: Record<string, string> = {};
let semEspacoNoAparelho = false;
/** O telemóvel não conseguiu guardar dados (sem espaço ou guardar bloqueado). */
export function aparelhoSemEspaco(): boolean { return semEspacoNoAparelho; }

// Datas e horas que ficaram escritas à inglesa («Sat Sep 05 2026 00:00:00
// GMT+0100 (…)», ou «Sat Dec 30 1899 08:30:00 …» numa hora) voltam a
// «2026-09-05» e «08:30». Vale para todos os dados guardados (Rosa, 5/out/2026).
const MESES_EN: Record<string, string> = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
const DATA_EN = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{2}) (\d{4}) (\d{2}):(\d{2}):\d{2} GMT/;
export function semDataInglesa(v: unknown): unknown {
  if (typeof v !== 'string' || v.length < 25 || v.charAt(3) !== ' ') return v;
  const m = DATA_EN.exec(v);
  if (!m) return v;
  return m[4] === '1899' ? `${m[5]}:${m[6]}` : `${m[4]}-${MESES_EN[m[2]]}-${m[3]}`;
}

function load<T>(key: string): T[] {
  try {
    const r = key in naMemoria ? naMemoria[key] : localStorage.getItem(key);
    return r ? JSON.parse(r, (_k, v) => semDataInglesa(v)) : [];
  } catch { return []; }
}

/** Liberta o que já não serve (cópias antigas) para caberem os dados novos. */
function libertarEspaco(): void {
  try {
    // A cópia de antes do arranque do ano só se apaga no telemóvel de um aluno
    // (no do professor e no da coordenação é uma cópia de segurança que conta).
    const velhas = perfilDoAparelho === 'aluno' ? ['ecl_backup_pre_arranque', 'ecl_eventos_v3'] : ['ecl_eventos_v3'];
    velhas.forEach(k => localStorage.removeItem(k));
  } catch { /* */ }
}

export function save<T>(key: string, data: T[]): void {
  const texto = JSON.stringify(data);
  try { localStorage.setItem(key, texto); delete naMemoria[key]; return; }
  catch { /* sem espaço: tenta libertar */ }
  libertarEspaco();
  try { localStorage.setItem(key, texto); delete naMemoria[key]; return; }
  catch (e) {
    naMemoria[key] = texto;
    semEspacoNoAparelho = true;
    console.error('Sem espaço para guardar', key, e);
  }
}

async function postar(url: string, corpo: Record<string, unknown>): Promise<void> {
  // Nunca fica preso para sempre: ao fim de 90 s desiste (volta a ser
  // enviado pela lista de espera).
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const t = ctl ? setTimeout(() => ctl.abort(), 90000) : null;
  const texto = JSON.stringify(corpo);
  try {
    await fetch(url, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: texto,
      // O aluno envia e fecha logo a aplicação (Rosa, set/2026): com
      // «keepalive» o envio acaba mesmo com a aplicação fechada. O
      // navegador só o aceita para envios pequenos (até 64 KB).
      keepalive: texto.length < 60000,
      signal: ctl?.signal,
    });
  } catch (e) { console.error('Erro Sheets:', e); }
  finally { if (t) clearTimeout(t); }
}

// ── Uma gravação de cada vez ───────────────────────────────────
// O script grava uma coisa de cada vez: quem chega enquanto outra está a
// gravar espera no máximo 30 s e depois desiste, sem dar erro. A
// aplicação mandava tudo ao mesmo tempo (35 autoavaliações = 35 pedidos
// em simultâneo) e perdiam-se gravações — a abertura da aula, o apagar
// de um plano. Agora vai tudo numa fila, um de cada vez; o urgente
// (abrir a aula, apagar) passa à frente.
const filaUrgente: (() => Promise<void>)[] = [];
const filaNormal: (() => Promise<void>)[] = [];
/** Reenvios automáticos do que ficou por confirmar: vão por último, para
 *  nunca atrasarem o que o professor ou o aluno está a fazer agora. */
const filaFundo: (() => Promise<void>)[] = [];
export type Prioridade = 'urgente' | 'normal' | 'fundo';
let modoFundo = 0;
/** Tudo o que for enviado dentro de fn vai para o fim da fila. */
function emSegundoPlano(fn: () => void): void { modoFundo++; try { fn(); } finally { modoFundo--; } }
let filaATrabalhar = false;
async function correrFila(): Promise<void> {
  if (filaATrabalhar) return;
  filaATrabalhar = true;
  try {
    while (filaUrgente.length || filaNormal.length || filaFundo.length) {
      const tarefa = (filaUrgente.shift() || filaNormal.shift() || filaFundo.shift())!;
      await tarefa();
    }
  } finally { filaATrabalhar = false; }
}
function enviarAgora(url: string, corpo: Record<string, unknown>, prio: boolean | Prioridade = 'normal'): Promise<void> {
  if (url !== SHEETS_ECL_URL) return postar(url, corpo);
  const p: Prioridade = prio === true ? 'urgente' : prio === false ? 'normal' : prio;
  return new Promise<void>(resolve => {
    (p === 'urgente' ? filaUrgente : p === 'fundo' ? filaFundo : filaNormal).push(() => postar(url, corpo).then(resolve, resolve));
    correrFila();
  });
}

// ── Envios em pacote (script v16) ──────────────────────────────
// Uma autoavaliação ou uma validação eram um envio por competência, todos
// ao mesmo tempo. O script grava um de cada vez, e os últimos da fila
// desistiam: 4 competências avaliadas, 2 no Sheets. Agora o que é enviado
// no mesmo instante vai junto, num só pacote. Só com o script v16 ou
// posterior (que sabe abrir pacotes); com um script antigo, vai um a um.
let loteSuportado: boolean | null = null;
let aVerLote: Promise<void> | null = null;
function verSeHaLote(): Promise<void> {
  if (aVerLote) return aVerLote;
  aVerLote = (async () => {
    try {
      const r = await fetch(SHEETS_ECL_URL);
      const j = await r.json();
      const m = String(j?.versao || '').match(/v(\d+)/);
      loteSuportado = !!m && Number(m[1]) >= 16;
    } catch { loteSuportado = null; aVerLote = null; }
  })();
  return aVerLote;
}
// Sabe-se logo ao abrir a aplicação, para a primeira autoavaliação já ir junta.
if (typeof window !== 'undefined') setTimeout(() => { verSeHaLote(); }, 800);
const filas = new Map<string, { itens: Record<string, unknown>[]; resolver: (() => void)[]; t: any }>();
function despejarFila(chave: string) {
  const f = filas.get(chave);
  filas.delete(chave);
  const [url, prio] = chave.split('|') as [string, Prioridade];
  if (!f) return;
  const fim = () => f.resolver.forEach(r => r());
  // Pacotes pequenos (10) e UM DE CADA VEZ. Eram pacotes de 40, todos ao
  // mesmo tempo: o script grava um de cada vez, um pacote ocupava-o mais
  // de um minuto e os outros desistiam ao fim de 30 segundos («Ocupado»)
  // — e perdia-se tudo o que chegasse entretanto, até a abertura da aula.
  const partes: Record<string, unknown>[][] = [];
  for (let i = 0; i < f.itens.length; i += 10) partes.push(f.itens.slice(i, i + 10));
  (async () => {
    for (const p of partes) await (p.length === 1 ? enviarAgora(url, p[0], prio) : enviarAgora(url, { tipo: 'lote', itens: p }, prio));
  })().then(fim, fim);
}

/** Pedidos pequenos e urgentes: vão logo, sozinhos, sem esperar por pacotes. */
const URGENTES = new Set(['sessao', 'fechar_sessao', 'anular_sessao', 'eliminar_plano', 'eliminar_do_plano', 'eliminar_ficha',
  'eliminar_requisicao', 'eliminar_aluno', 'eliminar_evento']);

// As gravações dos alunos vão uma segunda vez, 10 a 15 s depois: se o
// Google recusar a primeira num pico (limite de pedidos ao mesmo tempo),
// a segunda chega. As repetições juntam-se no script (a mais recente manda).
const VAO_DUAS_VEZES = new Set(['presenca', 'selecao', 'avaliacao', 'grupo_membro', 'avaliacao_par']);

// A autoavaliação do aluno sai logo, sem esperar pela fila nem pelo
// pacote: o aluno submete e fecha a aplicação, e o que estava na fila
// perdia-se (Rosa, set/2026).
const SAEM_LOGO = new Set(['selecao', 'avaliacao_par']);

async function enviar(url: string, tipo: string, dados: Record<string, unknown>, repetida = false): Promise<void> {
  if (!url) return;
  // Autoavaliações, validações, avaliações e presenças vão também para a
  // base de dados (chegam logo); o Sheets fica como cópia.
  if (!repetida && VAI_PARA_A_BASE.has(tipo)) paraABase(tipo, dados as Record<string, any>);
  if (!repetida && url === SHEETS_ECL_URL && VAO_DUAS_VEZES.has(tipo)) {
    setTimeout(() => { emSegundoPlano(() => { enviar(url, tipo, dados, true); }); }, 10000 + Math.random() * 5000);
  }
  const corpo = { tipo, ...dados };
  if (!repetida && !modoFundo && SAEM_LOGO.has(tipo)) return postar(url, corpo);
  if (url !== SHEETS_ECL_URL || loteSuportado !== true || URGENTES.has(tipo)) {
    if (url === SHEETS_ECL_URL && loteSuportado === null) verSeHaLote();
    return enviarAgora(url, corpo, URGENTES.has(tipo) ? 'urgente' : modoFundo ? 'fundo' : 'normal');
  }
  const chave = url + '|' + (modoFundo ? 'fundo' : 'normal');
  return new Promise<void>(resolve => {
    let f = filas.get(chave);
    if (!f) { f = { itens: [], resolver: [], t: setTimeout(() => despejarFila(chave), 300) }; filas.set(chave, f); }
    f.itens.push(corpo);
    f.resolver.push(resolve);
  });
}

// ── Base de dados (Firebase), 2.ª fase ─────────────────────────
// Os planos, as fichas e a abertura da aula também vão para a base: os
// telemóveis dos alunos recebem-nos na hora. O Sheets continua a recebê-los.
// Um plano que chegou à base já chegou aos alunos: o aviso «A enviar…»
// passa a «Chegou» (o Sheets confere-se depois, sem prender o professor).
function paraABase(tipo: string, dados: Record<string, any>): void {
  if (!baseLigada()) return;
  const d: Record<string, any> = { ...dados };
  if (tipo === 'fechar_sessao' && !d.turmaId) {
    const s: any = getSessoesAula().find(x => x.planoAulaId === d.planoAulaId);
    d.turmaId = s?.turmaId || getPlanosAula().find(p => p.id === d.planoAulaId)?.turmaId;
  }
  gravarNaBase(tipo, d).then(ok => {
    // A abertura na base já está nos telemóveis dos alunos.
    if (ok && tipo === 'sessao' && d.abertaEm && !d.fechadaEm) aberturaNaBase(String(d.planoAulaId));
    // A autoavaliação na base já está no ecrã do professor (que valida a
    // partir da base): o aluno vê logo «Chegou ao professor», sem esperar
    // pela leitura do Sheets, que levava um minuto (Rosa, out/2026). O Sheets
    // continua a conferir-se por trás.
    if (ok && tipo === 'selecao') { marcarSelecaoNaBase(String(d.id), String(d.criadaEm || '')); return; }
    if (!ok || tipo !== 'plano') return;
    const p: any = d.plano || d;
    marcarPlanoNaBase(String(p.id), String(p.atualizadoEm || ''));
  }).catch(() => {});
}

// No máximo 4 leituras ao mesmo tempo por aparelho. O Google aceita
// cerca de 30 pedidos simultâneos para a turma toda: com 14 de cada vez
// por telemóvel, três alunos a entrar no mesmo segundo passavam o limite
// e o Google recusava o resto (incluindo o que o professor gravava).
let leiturasAtivas = 0;
const leiturasEmEspera: (() => void)[] = [];
async function vezDeLer(): Promise<void> {
  if (leiturasAtivas < 4) { leiturasAtivas++; return; }
  await new Promise<void>(r => leiturasEmEspera.push(r));
  leiturasAtivas++;
}
function acabouDeLer(): void {
  leiturasAtivas--;
  const proxima = leiturasEmEspera.shift();
  if (proxima) proxima();
}

async function lerDoSheets(url: string, params: Record<string, string>): Promise<any> {
  if (!url) return null;
  await vezDeLer();
  try { return await lerDoSheetsAgora(url, params); } finally { acabouDeLer(); }
}

/**
 * Leitura com prioridade, para entrar na aplicação: não espera pela fila das
 * outras leituras. Ao abrir, a aplicação pede ~15 coisas ao Sheets, 4 de cada
 * vez; a confirmação do código ficava atrás delas e entrar demorava quase um
 * minuto (Rosa, out/2026). Desiste ao fim de `ms` (e entra-se como antes).
 */
async function lerDoSheetsJa(url: string, params: Record<string, string>, ms = 10000): Promise<any> {
  if (!url) return null;
  return lerDoSheetsAgora(url, params, ms);
}

async function lerDoSheetsAgora(url: string, params: Record<string, string>, ms = 45000): Promise<any> {
  // Um pedido que nunca responde prendia um lugar da fila para sempre.
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const t = ctl ? setTimeout(() => ctl.abort(), ms) : null;
  try {
    const u = new URL(url);
    Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
    // (v22) Os PIN dos alunos só vêm para quem entrou como professor ou coordenação.
    if (params.tipo === 'get_alunos') { const t = tokenDaEntrada(); if (t) u.searchParams.set('token', t); }
    const res = await fetch(u.toString(), ctl ? { signal: ctl.signal } : undefined);
    const json = await res.json();
    if (json?.zeroEm) aplicarComecarDoZero(String(json.zeroEm));
    return json;
  } catch (e) {
    console.warn('Erro ao ler do Sheets:', e);
    return null;
  } finally {
    if (t) clearTimeout(t);
  }
}

// ============================================================
// (v22) Entrar: o código e o PIN confirmados pelo Sheets
// ============================================================
// Os códigos e os PIN estavam escritos na aplicação, à vista de quem
// abrisse o código no navegador. Agora quem confirma é o script do Sheets
// (folha CODIGOS e folha ALUNOS). Enquanto a folha CODIGOS não tiver o
// código de alguém, ou o aluno não tiver PIN no Sheets, a aplicação faz
// como antes — assim ninguém fica sem entrar durante a mudança.

const KEY_TOKEN = 'ecl_token_entrada';
export function tokenDaEntrada(): string {
  try { return sessionStorage.getItem(KEY_TOKEN) || ''; } catch { return ''; }
}
export function esquecerEntrada(): void { try { sessionStorage.removeItem(KEY_TOKEN); } catch { /* */ } }

export type RespostaEntrada = 'entrou' | 'errado' | 'bloqueado' | 'semCodigo' | 'semRede';

/** O código do professor («Rosa Almeida»), da coordenação («coordenadora») ou dos eventos («eventos»). */
export async function confirmarCodigo(quem: string, codigo: string): Promise<RespostaEntrada> {
  const j: any = await lerDoSheetsJa(SHEETS_ECL_URL, { tipo: 'entrar', quem, codigo });
  if (!j?.ok) return 'semRede';
  if (j.semCodigo || (j.entrou === undefined && !j.bloqueado)) return 'semCodigo';   // script antigo ou sem código novo
  if (j.bloqueado) return 'bloqueado';
  if (!j.entrou) return 'errado';
  try { if (j.token) sessionStorage.setItem(KEY_TOKEN, j.token); } catch { /* */ }
  return 'entrou';
}

export async function confirmarPinAluno(alunoId: string, pin: string): Promise<RespostaEntrada> {
  const j: any = await lerDoSheetsJa(SHEETS_ECL_URL, { tipo: 'entrar_aluno', alunoId, pin });
  if (!j?.ok) return 'semRede';
  if (j.semPin || (j.entrou === undefined && !j.bloqueado)) return 'semCodigo';
  if (j.bloqueado) return 'bloqueado';
  return j.entrou ? 'entrou' : 'errado';
}

/** Uma vez por aparelho do professor: os PIN dos alunos vão para o Sheets,
 *  para o Sheets os poder confirmar quando os PIN saírem da aplicação. */
export function enviarPinsParaOSheets(): void {
  try {
    if (localStorage.getItem('ecl_pins_enviados_v22')) return;
    emSegundoPlano(() => {
      getAlunos().filter(a => a.pin && a.ativo !== false).forEach(a => { sincronizarAlunoComSheet(a); });
      localStorage.setItem('ecl_pins_enviados_v22', new Date().toISOString());
    });
  } catch { /* */ }
}

// ============================================================
// Começar do zero
// ============================================================
// A coordenação corre "comecarDoZero" no script: o Sheets fica só com os
// alunos e os preços, e passa a dizer em cada resposta a data dessa
// limpeza (zeroEm). Cada aparelho — computador do professor, telemóvel do
// aluno — ao ver uma data nova apaga a sua cópia antiga: planos, fichas,
// requisições, avaliações, presenças… Ficam as turmas, os alunos, os
// preços e o que já tiver sido criado depois da limpeza.

const KEY_ZERO_VISTO = 'ecl_zero_visto';
const FICAM_NO_ZERO = new Set([
  'ecl_turmas', 'ecl_alunos', 'ecl_alunos_eliminados', 'ecl_alunos_externos', 'ecl_telemovel',
  'ecl_tecnicas_custom', 'ecl_materias_primas_custom', 'ecl_precos_revistos', 'ecl_precos_a_rever',
  'ecl_email_professor', 'ecl_ultimo_responsavel_compras', 'ecl_ultimo_backup_ts',
  'ecl_dicionario_criterios_custom', 'ecl_dicionario_sugestoes', 'ecl_atitudes_transicao',
  'ecl_template_fct', 'ecl_manual_cozinheiro', KEY_ZERO_VISTO,
]);
/** Listas em que se guarda o que foi criado depois da limpeza. */
const LISTAS_COM_DATA = ['ecl_planos', 'ecl_fichas', 'ecl_requisicoes', 'ecl_selecoes', 'ecl_validacoes',
  'ecl_presencas', 'ecl_historico_avaliacoes', 'ecl_sessoes_aula', 'ecl_eventos_v4',
  'ecl_grupos_membros', 'ecl_grupos_info', 'ecl_avaliacoes_pares'];

function dataMaisRecente(x: any): string {
  return [x?.atualizadoEm, x?.criadoEm, x?.atualizadaEm, x?.criadaEm, x?.validadoEm, x?.abertaEm]
    .map(v => String(v || '')).sort().pop() || '';
}

export function aplicarComecarDoZero(zeroEm: string): boolean {
  try {
    if (!zeroEm || localStorage.getItem(KEY_ZERO_VISTO) === zeroEm) return false;
    // PROTEÇÃO: o «começar do zero» faz-se uma vez. Se aparecer outro (por
    // exemplo, o «Executar» do editor carregado sem querer), este aparelho
    // NÃO apaga nada: devolve ao Sheets os planos, fichas e requisições que
    // ainda tem, para se recuperarem.
    // Um «começar do zero» pedido pela coordenação («#confirmado») limpa
    // sempre, mesmo num aparelho que já tinha visto outro.
    if (localStorage.getItem(KEY_ZERO_VISTO) && !String(zeroEm).endsWith('#confirmado')) {
      localStorage.setItem(KEY_ZERO_VISTO, zeroEm);
      localStorage.removeItem(KEY_VISTOS_SHEETS);
      setTimeout(() => {
        const planos = load<any>(KEYS.planos).filter(p => p?.id);
        const fichas = load<any>(KEYS.fichas).filter(f => f?.id);
        const reqs = load<any>(KEYS.requisicoes).filter(r => r?.id);
        emSegundoPlano(() => {
          planos.forEach(p => enviar(SHEETS_PLANOS_URL, 'plano', { plano: p }));
          fichas.forEach(f => enviar(SHEETS_FICHAS_URL, 'ficha', { ficha: f }));
          reqs.forEach(r => enviar(SHEETS_PLANOS_URL, 'requisicao', { requisicao: r }));
        });
        console.warn('[começar do zero] segundo pedido ignorado; devolvidos ao Sheets:', planos.length, 'planos');
      }, 0);
      return false;
    }
    const depois: Record<string, any[]> = {};
    LISTAS_COM_DATA.forEach(k => {
      try {
        const l = JSON.parse(localStorage.getItem(k) || '[]');
        if (Array.isArray(l)) depois[k] = l.filter(x => dataMaisRecente(x) > zeroEm);
      } catch { /* */ }
    });
    const apagar: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || '';
      if ((k.startsWith('ecl_') && !FICAM_NO_ZERO.has(k) && !k.startsWith('ecl_manual_aluno_'))
          || k.startsWith('avaliacao_submetida_')) apagar.push(k);
    }
    apagar.forEach(k => localStorage.removeItem(k));
    Object.entries(depois).forEach(([k, l]) => { if (l.length) localStorage.setItem(k, JSON.stringify(l)); });
    localStorage.setItem(KEY_ZERO_VISTO, zeroEm);
    console.log('[começar do zero] cópia local limpa:', apagar.length, 'chaves');
    return true;
  } catch { return false; }
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

// ============================================================
// O Sheets manda
// ============================================================
// A aplicação guarda uma cópia de tudo no aparelho. Ao ler do Sheets,
// juntava o que vinha de lá ao que já tinha — e nunca tirava nada. As
// aulas, fichas e requisições apagadas no Sheets continuavam a aparecer.
//
// Depois de uma leitura que correu bem (mesmo com a folha vazia):
//  - o que já esteve no Sheets e deixou de estar foi apagado lá: sai;
//  - o que nunca lá chegou e é recente, ou está na lista de espera,
//    fica e volta a ser enviado (é trabalho novo que ainda não chegou);
//  - o que nunca lá chegou e é antigo é sobra de antes: sai.

const KEY_VISTOS_SHEETS = 'ecl_vistos_no_sheets';
const DIAS_PARA_CHEGAR = 2;

function vistosNoSheets(colecao: string): Set<string> {
  try { return new Set((JSON.parse(localStorage.getItem(KEY_VISTOS_SHEETS) || '{}')[colecao]) || []); }
  catch { return new Set(); }
}
function marcarVistosNoSheets(colecao: string, ids: Set<string>): void {
  try {
    const todos = JSON.parse(localStorage.getItem(KEY_VISTOS_SHEETS) || '{}');
    todos[colecao] = [...ids].slice(-5000);
    localStorage.setItem(KEY_VISTOS_SHEETS, JSON.stringify(todos));
  } catch { /* */ }
}

const KEY_REENVIOS = 'ecl_ultimos_reenvios';
function podeReenviar(chave: string): boolean {
  try {
    const m: Record<string, number> = JSON.parse(localStorage.getItem(KEY_REENVIOS) || '{}');
    const agora = Date.now();
    if (m[chave] && agora - m[chave] < 10 * 60000) return false;
    m[chave] = agora;
    for (const k of Object.keys(m)) if (agora - m[k] > 86400000) delete m[k];
    localStorage.setItem(KEY_REENVIOS, JSON.stringify(m));
  } catch { /* */ }
  return true;
}

function reconciliarComSheets<T extends { id: string }>(
  colecao: string, itens: T[], idsNoSheets: Set<string>,
  abrange: (x: T) => boolean, dataDe: (x: T) => string, reenviarItem: (x: T) => void,
  /** Ids que o Sheets diz terem sido eliminados de propósito (se souber dizer). */
  eliminadosNoSheets?: Set<string>,
): T[] {
  const vistos = vistosNoSheets(colecao);
  idsNoSheets.forEach(id => vistos.add(id));
  // O mesmo registo volta a ser enviado no máximo de 10 em 10 minutos.
  // Cada sincronização reenviava tudo o que faltava — e cada envio fazia
  // os outros aparelhos sincronizar outra vez: a fila do script não
  // esvaziava e as gravações novas perdiam-se.
  const reenviarItemAntes = reenviarItem;
  reenviarItem = (x: T) => { if (podeReenviar(colecao + '|' + x.id)) emSegundoPlano(() => reenviarItemAntes(x)); };
  const emEspera = new Set(espera().map(p => String(p.id)));
  const limite = new Date(Date.now() - DIAS_PARA_CHEGAR * 86400000).toISOString();
  const ficam = itens.filter(x => {
    if (!abrange(x) || idsNoSheets.has(String(x.id))) return true;
    if (eliminadosNoSheets?.has(String(x.id))) return false; // eliminado de propósito
    // Já esteve no Sheets e deixou de estar. Antes saía também do aparelho —
    // e uma aula que desaparecesse do Sheets (linha escrita por cima,
    // folha mexida à mão) perdia-se em todo o lado. Agora só sai se o
    // Sheets disser que foi eliminada; senão, volta a ser enviada.
    if (vistos.has(String(x.id))) {
      if (colecao === 'planos') { reenviarItem(x); return true; }
      return false;
    }
    const recente = String(dataDe(x) || '') >= limite;
    if (recente || emEspera.has(String(x.id))) {             // ainda não chegou: reenviar
      reenviarItem(x);
      return true;
    }
    return false;                                            // sobra antiga
  });
  marcarVistosNoSheets(colecao, vistos);
  return ficam;
}

// ── Juntar ao que está no aparelho ─────────────────────────────
// O mesmo para o que vem do Sheets e do que vem da base de dados.

function juntarAvaliacoes(dados: any[]): void {
  // Os +1 da transição de referencial vão para o registo deles — se
  // entrassem aqui, contavam para as notas das UCs e para a pauta.
  const transicao = dados.filter((r: any) => r.validadoPor === 'transicao');
  const normais = dados.filter((r: any) => r.validadoPor !== 'transicao');

  const locais = getHistoricoAvaliacoes();
  const idsLocais = new Set(locais.map((r: RegistoAvaliacao) => r.id));
  const novas = normais.filter((r: RegistoAvaliacao) => !idsLocais.has(r.id));
  if (novas.length > 0) save(KEY_HIST, [...locais, ...novas]);

  if (transicao.length > 0) {
    const jaTem = getRegistosTransicao();
    const ids = new Set(jaTem.map(t => t.id));
    const chegados: RegistoTransicao[] = transicao
      .filter((r: any) => !ids.has(r.id))
      .map((r: any) => ({
        id: r.id, alunoId: r.alunoId, turmaId: r.turmaId,
        atitudeId: r.microcompetenciaId, nivel: Number(r.nota) || 1,
        data: r.data, planoAulaId: r.planoAulaId || '', professor: '',
      }));
    if (chegados.length) save(KEY_TRANSICAO, [...jaTem, ...chegados]);
  }
}

function juntarValidacoes(dados: any[]): void {
  const locais = getValidacoes();
  const merged = [...locais];
  for (const v of dados) {
    const idx = merged.findIndex((x: Validacao) => x.id === v.id);
    if (idx < 0) merged.push(v);
    else if ((v.validadoEm || '') > (merged[idx].validadoEm || '')) merged[idx] = v;
  }
  save(KEYS.validacoes, merged);
}

function juntarPresencas(dados: any[]): void {
  const decisaoLocalMaisRecente = (local: any, s: any): boolean => {
    if (!local?.decididoEm) return false;
    if (s?.decididoEm) return String(local.decididoEm) > String(s.decididoEm);
    return Date.now() - Date.parse(local.decididoEm) < 15 * 60 * 1000;
  };
  // As linhas do Sheets não trazem identificador: comparar pelo id
  // fazia cada sincronização acrescentar tudo outra vez. Agora é uma
  // presença por aluno e aula — e a decisão do professor que está no
  // Sheets (a última tomada, em qualquer aparelho) é a que vale.
  const porChave = new Map<string, any>();
  for (const p of load<any>(KEYS.presencas)) {
    const k = p.alunoId + '|' + p.planoAulaId;
    if (!porChave.has(k)) porChave.set(k, p);          // tira duplicados antigos
    else if (p.decisaoProfessor && !porChave.get(k).decisaoProfessor) porChave.set(k, { ...porChave.get(k), ...p, id: porChave.get(k).id });
  }
  for (const s of dados) {
    if (!s?.alunoId || !s?.planoAulaId) continue;
    const k = s.alunoId + '|' + s.planoAulaId;
    const local = porChave.get(k);
    if (!local) {
      porChave.set(k, { ...s, id: `presenca_${s.alunoId}_${s.planoAulaId}_sheets` });
    } else if (decisaoLocalMaisRecente(local, s)) {
      // A decisão tomada neste aparelho ainda não chegou ao Sheets (ou
      // é mais recente): não se volta atrás. Antes a sincronização
      // repunha a decisão antiga e parecia que a falta não ficava.
      continue;
    } else if (s.decisaoProfessor && s.decisaoProfessor !== local.decisaoProfessor) {
      porChave.set(k, { ...local, decisaoProfessor: s.decisaoProfessor,
        horasPresentes: s.horasPresentes || undefined,
        presente: s.decisaoProfessor === 'falta_presenca' ? false
          : s.decisaoProfessor === 'parcial' ? (s.horasPresentes || []).length > 0 : true });
    } else if (s.decisaoProfessor === 'parcial'
        && JSON.stringify(s.horasPresentes || []) !== JSON.stringify(local.horasPresentes || [])) {
      porChave.set(k, { ...local, horasPresentes: s.horasPresentes || [],
        presente: (s.horasPresentes || []).length > 0 });
    }
  }
  save(KEYS.presencas, [...porChave.values()]);
}

function juntarSelecoes(dados: any[]): void {
  const locais = load<SelecaoAluno>(KEYS.selecoes);
  const merged = [...locais];
  for (const s of dados) {
    const idx = merged.findIndex((x: SelecaoAluno) => x.id === s.id);
    if (idx < 0) { merged.push(s); continue; }
    if (quandoFoi(s.criadaEm) > quandoFoi(merged[idx].criadaEm)) merged[idx] = s;
  }
  save(KEYS.selecoes, merged);
}

/** O que chega da base de dados (de uma vez ou à escuta), por tipo de envio. */
/** O guião e a ficha formatada nunca se perdem numa junção: fica o texto
 *  mais recente que existir; um texto vazio nunca apaga um com conteúdo. */
function comTextosLongos(f: any, loc: any, nova: any): any {
  const novaMaisRecente = String(nova?.atualizadoEm || '') > String(loc?.atualizadoEm || '');
  // Uma cópia que chega sem estes campos (vazios no Sheets) não apaga o que
  // o professor escolheu: as técnicas da ficha mudavam depois de ela ir para
  // a biblioteca (Rosa, out/2026). Uma lista vazia de propósito ([]) passa.
  for (const campo of ['tecnicasSugeridas', 'aparelhosDetectados', 'etiquetas', 'familia1', 'familia2', 'perguntasAuto', 'linkOrigem']) {
    const n = nova?.[campo];
    if ((n === undefined || n === null || n === '') && loc?.[campo] != null && loc[campo] !== '') f[campo] = loc[campo];
  }
  for (const campo of ['textoGuia', 'htmlCompleto', 'planoAulaId']) {
    const l = loc?.[campo], n = nova?.[campo];
    if (n && (!l || novaMaisRecente)) f[campo] = n;
    else if (l) f[campo] = l;
  }
  return f;
}

export function juntarDaBase(tipo: string, dados: any[]): void {
  if (!dados.length) return;
  // Planos e fichas eliminados noutro aparelho: saem deste também.
  const fora = dados.filter(x => x?.eliminado).map(x => String(x.id));
  if (fora.length && (tipo === 'plano' || tipo === 'ficha')) {
    const [chave, chaveElim] = tipo === 'plano' ? [KEYS.planos, KEYS.eliminadosPlanos] : [KEYS.fichas, KEYS.eliminadosFichas];
    save(chave, load<any>(chave).filter(x => !fora.includes(String(x.id))));
    save(chaveElim, [...new Set([...load<string>(chaveElim), ...fora])]);
  }
  const vivos = dados.filter(x => !x?.eliminado);
  if (tipo === 'plano') { if (vivos.length) juntarAula({ planos: vivos }, vivos[0].turmaId || ''); return; }
  if (tipo === 'ficha') { if (vivos.length) juntarAula({ fichas: vivos }, ''); return; }
  if (tipo === 'sessao') { if (vivos.length) juntarAula({ sessoes: vivos.filter(x => x.abertaEm || x.fechadaEm || x.anuladaEm) }, vivos[0].turmaId || ''); return; }
  if (tipo === 'avaliacao') juntarAvaliacoes(dados);
  else if (tipo === 'validacao') juntarValidacoes(dados);
  else if (tipo === 'presenca') juntarPresencas(dados);
  else if (tipo === 'selecao') juntarSelecoes(dados);
  else if (tipo === 'grupo_membro') juntarPorId(KEY_MEMBROS, dados as MembroGrupo[]);
  else if (tipo === 'grupo_info') juntarPorId(KEY_INFO_GRUPOS, dados.map((g: any) => ({ ...g, validado: g.validado === true || g.validado === 'true' })) as InfoGrupo[]);
  else if (tipo === 'avaliacao_par') juntarPorId(KEY_PARES, dados as AvaliacaoPar[]);
  else if (tipo === 'lider_kf') juntarLideres(dados);
  else if (tipo === 'materia_prima') juntarMateriasPrimas(dados);
  else if (tipo === 'nota_produto') juntarNotasProdutos(dados);
  else if (tipo === 'aluno_fantasma') juntarFantasmas(dados);
  else if (tipo === 'config') juntarConfigs(dados);
  else if (tipo === 'aviso_coord') juntarAvisosDaCoordenacao(dados);
  else if (tipo === 'ocorrencia') juntarOcorrencias(dados);
  else if (tipo === 'requisicao') juntarRequisicoesDaBase(dados);
  else if (tipo === 'evento') juntarEventosDaBase(dados);
  else if (tipo === 'recuperacao') juntarRecuperacoesDaBase(dados);
  else if (tipo === 'evidencia') juntarEvidenciasDaBase(dados);
}

// (4.ª fase) Requisições, eventos, recuperações e evidências vindos da base.
// A regra é a mesma do Sheets: fica a versão mais recente, e uma requisição
// nunca perde as linhas que já tinha.
function juntarRequisicoesDaBase(dados: any[]): void {
  const fora = new Set(dados.filter(x => x?.eliminado).map(x => String(x.id)));
  if (fora.size) save(KEYS.eliminadosRequisicoes, [...new Set([...load<string>(KEYS.eliminadosRequisicoes), ...fora])]);
  const eliminados = new Set(load<string>(KEYS.eliminadosRequisicoes));
  const m = new Map(getRequisicoes().map(r => [r.id, r]));
  for (const r of dados) {
    if (!r?.id || r.eliminado) continue;
    const l: any = m.get(r.id);
    if (!l) m.set(r.id, r);
    else if (String(r.atualizadaEm || '') > String(l.atualizadaEm || '')) m.set(r.id, { ...r, linhas: (r.linhas?.length ? r.linhas : l.linhas) || [] });
  }
  save(KEYS.requisicoes, [...m.values()].filter(r => !eliminados.has(r.id)));
}
const KEY_EVENTOS_ELIMINADOS = 'ecl_eventos_eliminados';
function juntarEventosDaBase(dados: any[]): void {
  const fora = new Set([...load<string>(KEY_EVENTOS_ELIMINADOS), ...dados.filter(x => x?.eliminado).map(x => String(x.id))]);
  save(KEY_EVENTOS_ELIMINADOS, [...fora]);
  const m = new Map<string, any>(lerEventosLocais().map((e: any) => [e.id, e]));
  for (const e of dados) {
    if (!e?.id || e.eliminado || e.versao !== 4) continue;
    const l = m.get(e.id);
    if (!l || String(e.atualizadoEm || '') > String(l.atualizadoEm || '')) m.set(e.id, e);
  }
  try { localStorage.setItem(KEY_EVENTOS_V4, JSON.stringify([...m.values()].filter((e: any) => !fora.has(e.id)))); } catch { /* */ }
}
function juntarRecuperacoesDaBase(dados: any[]): void {
  const m = new Map(getRecuperacoes().map(r => [r.id, r]));
  for (const r of dados) {
    if (!r?.id || r.eliminado) continue;
    const l = m.get(r.id);
    if (!l || String(r.atualizadoEm || '') > String(l.atualizadoEm || '')) m.set(r.id, r);
  }
  save(KEYS.recuperacoes, [...m.values()]);
}
function juntarEvidenciasDaBase(dados: any[]): void {
  const locais = getEvidencias();
  const ids = new Set(locais.map(e => e.id));
  const novas: any[] = [];
  for (const e of dados) {
    if (!e?.id || e.eliminado || ids.has(e.id)) continue;
    ids.add(e.id); novas.push(e);
  }
  if (novas.length) save(KEYS.evidencias, [...locais, ...novas]);
}

// Chamadas repetidas juntam-se numa só: a entrada do aluno chamava a
// sincronização completa em três sítios ao mesmo tempo (14 pedidos cada),
// e o teste de carga mostrou 8 por telemóvel em pouco mais de um minuto.
const syncEmCurso = new Map<string, Promise<void>>();
const syncFeitaEm = new Map<string, number>();
export function sincronizarDoSheets(turmaId: string, opcoes?: { leve?: boolean; forcar?: boolean }): Promise<void> {
  const chave = turmaId + '|' + (opcoes?.leve ? 'leve' : 'tudo');
  const aDecorrer = syncEmCurso.get(chave) || (!opcoes?.leve ? syncEmCurso.get(turmaId + '|tudo') : undefined);
  if (aDecorrer) return aDecorrer;
  const feita = Math.max(syncFeitaEm.get(chave) || 0, syncFeitaEm.get(turmaId + '|tudo') || 0);
  if (!opcoes?.forcar && Date.now() - feita < 20000) return Promise.resolve();
  const p = sincronizarDoSheetsAgora(turmaId, opcoes)
    .finally(() => { syncEmCurso.delete(chave); syncFeitaEm.set(chave, Date.now()); });
  syncEmCurso.set(chave, p);
  return p;
}

async function sincronizarDoSheetsAgora(turmaId: string, opcoes?: { leve?: boolean }): Promise<void> {
  // «Leve»: só os planos. É o que o telemóvel do aluno pede quando há
  // novidades — eram 14 pedidos por telemóvel, e com a turma toda davam
  // mais de 300 em segundos: o Google recusava o que passava do limite,
  // e perdiam-se a aula, a abertura e as gravações do professor.
  const leve = !!opcoes?.leve;
  // Todos os pedidos ao Sheets partem ao mesmo tempo. Eram 15, um depois do
  // outro, e cada um leva 1 a 3 segundos no Google: «Atualizar» chegava a
  // demorar meio minuto. Agora demora o tempo do pedido mais lento.
  const pedidos = new Map<string, Promise<any>>();
  const ler = (url: string, params: Record<string, string>): Promise<any> => {
    const k = url + '|' + JSON.stringify(params);
    if (!pedidos.has(k)) pedidos.set(k, lerDoSheets(url, params));
    return pedidos.get(k)!;
  };
  [
    [SHEETS_PLANOS_URL, { tipo: 'get_planos', turmaId }],
    [SHEETS_FICHAS_URL, { tipo: 'get_fichas' }],
    [SHEETS_RECUPERACAO_URL, { tipo: 'recuperacoes', turmaId }],
    [SHEETS_RECUPERACAO_URL, { tipo: 'evidencias' }],
    [SHEETS_PLANOS_URL, { tipo: 'get_requisicoes', turmaId }],
    [SHEETS_HISTORICO_URL, { tipo: 'get_avaliacoes', turmaId }],
    [SHEETS_HISTORICO_URL, { tipo: 'get_validacoes', turmaId }],
    [SHEETS_HISTORICO_URL, { tipo: 'get_presencas', turmaId }],
    [SHEETS_ALUNOS_URL, { tipo: 'get_alunos', turmaId }],
    [SHEETS_HISTORICO_URL, { tipo: 'get_selecoes', turmaId }],
    [SHEETS_ECL_URL, { tipo: 'get_precos' }],
    [SHEETS_ECL_URL, { tipo: 'get_precos_a_rever' }],
  ].forEach(([url, params]) => {
    if (!url) return;
    if (leve && (params as any).tipo !== 'get_planos' && (params as any).tipo !== 'get_fichas') return;
    ler(url as string, params as Record<string, string>);
  });
  try {
    // Sessões e líderes primeiro: são o que o aluno precisa para saber
    // se pode entrar na aula. Falham em silêncio se o script ainda não
    // souber responder a estes tipos.
    if (!leve) await Promise.all([
      sincronizarSessoes(turmaId).catch(() => {}),
      sincronizarLideresKF(turmaId).catch(() => {}),
    ]);

    // Carregar planos do Sheets de Planos
    if (SHEETS_PLANOS_URL) {
      const jsonPlanos = await ler(SHEETS_PLANOS_URL, { tipo: 'get_planos', turmaId });
      marcarLeituraPlanos(!!jsonPlanos?.ok);
      if (jsonPlanos?.ok && Array.isArray(jsonPlanos.dados)) {
        const locais = getPlanosAula();
        const eliminados = new Set(load<string>(KEYS.eliminadosPlanos));
        let merged = [...locais];
        for (const pRaw of jsonPlanos.dados) {
          if (!pRaw?.id) continue;               // linha sem código (aula fantasma do antigo envio ao calendário)
          if (eliminados.has(pRaw.id)) {        // já foi eliminado de propósito — não trazer de volta
            // Mas continua no Sheets: o pedido de apagar perdeu-se. Volta a
            // ser pedido (no máximo de 10 em 10 minutos), à frente da fila.
            if (podeReenviar('eliminar_plano|' + pRaw.id)) enviar(SHEETS_PLANOS_URL, 'eliminar_plano', { planoId: pRaw.id });
            continue;
          }
          // Normalizar — o Sheets pode devolver campos array como string (CSV de uma célula)
          const p: any = {
            ...pRaw,
            fichasIds: Array.isArray(pRaw.fichasIds) ? pRaw.fichasIds
              : (typeof pRaw.fichasIds === 'string' && pRaw.fichasIds ? pRaw.fichasIds.split(/[;,]/).map((s: string) => s.trim()).filter(Boolean) : []),
            // A data pode vir com hora (o Sheets devolve datas como
            // instante UTC). '2026-09-21T23:00:00.000Z' em Lisboa é dia 22:
            // sem isto, a aula de hoje aparecia ao aluno como a de ontem.
            data: dataSoDia(pRaw.data),
            compRemovidas: Array.isArray(pRaw.compRemovidas) ? pRaw.compRemovidas : [],
            compAdicionadas: Array.isArray(pRaw.compAdicionadas) ? pRaw.compAdicionadas : [],
          };
          const idx = merged.findIndex((x: PlanoAula) => x.id === p.id);
          // NÃO filtrar por "plano parecido": um plano publicado que chega
          // do Sheets tem de entrar sempre. A filtragem por assinatura fazia
          // o telemóvel do aluno deitar fora a aula publicada, por já ter cá
          // uma cópia antiga com o mesmo dia e título — e o aluno ficava sem
          // aula nenhuma. Os planos repetidos resolvem-se no ecrã do
          // professor, com "Juntar as cópias".
          if (idx >= 0) {
            // O plano que vem do Sheets pode não trazer as fichas — o script
            // antigo dos planos nem sequer as guardava. Nesse caso ficam as
            // que o plano tem cá, senão perdiam-se na sincronização.
            if (!p.fichasIds?.length && merged[idx].fichasIds?.length) {
              p.fichasIds = merged[idx].fichasIds;
            }
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
        merged = reconciliarComSheets('planos', merged,
          new Set(jsonPlanos.dados.map((x: any) => String(x.id))),
          x => x.turmaId === turmaId,
          x => String((x as any).atualizadoEm || (x as any).criadoEm || x.data || ''),
          x => enviar(SHEETS_PLANOS_URL, 'plano', { plano: x }),
          Array.isArray(jsonPlanos.eliminados) ? new Set(jsonPlanos.eliminados.map(String)) : undefined);
        save(KEYS.planos, merged);
        // Plano eliminado noutro aparelho: este também o marca como eliminado.
        // Antes só saía da lista de planos, e as notas, autoavaliações e
        // presenças dele continuavam a aparecer nas notas da UC (Rosa, out/2026).
        if (Array.isArray(jsonPlanos.eliminados) && jsonPlanos.eliminados.length) {
          const ja = new Set(load<string>(KEYS.eliminadosPlanos));
          const novos = jsonPlanos.eliminados.map(String).filter((id: string) => id && !ja.has(id));
          if (novos.length) save(KEYS.eliminadosPlanos, [...ja, ...novos]);
        }
      }
    }

    // Carregar índice de fichas do Sheets de Fichas
    // O índice agora também traz htmlCompleto (ficha formatada pronta a mostrar) —
    // os dados estruturados (ingredientes/preparação) continuam só no localStorage
    // de origem, mas o aluno pode sempre ver/imprimir a versão completa em HTML.
    if (SHEETS_FICHAS_URL) {
      const jsonFichas = await ler(SHEETS_FICHAS_URL, { tipo: 'get_fichas' });
      if (jsonFichas?.ok && Array.isArray(jsonFichas.dados)) {
        const locais = getFichasProducao();
        const eliminadas = new Set(load<string>(KEYS.eliminadosFichas));
        let merged = [...locais];
        for (const f of jsonFichas.dados) {
          if (!f?.id) continue;
          if (eliminadas.has(f.id)) continue; // já foi eliminada de propósito — não trazer de volta
          const idx = merged.findIndex((x: FichaProducao) => x.id === f.id);
          if (idx < 0) {
            // A ficha vem completa do Sheets — `addOrUpdateFichaProducao`
            // envia o objeto inteiro. Forçar ingredientes e preparação a
            // vazio era o que fazia "abrir a ficha e ter desaparecido
            // metade da informação" ao mudar de aparelho.
            merged.push({
              ...f,
              ingredientes: Array.isArray(f.ingredientes) ? f.ingredientes : [],
              preparacao: Array.isArray(f.preparacao) ? f.preparacao : [],
              htmlCompleto: f.htmlCompleto || '',
              textoGuia: f.textoGuia || '',
              planoAulaId: f.planoAulaId || undefined,
            });
          } else {
            // Completar campos que possam faltar localmente mas existem no Sheets
            // — crítico para textoGuia (Guia de Apoio) e planoAulaId (ligação à
            // Recuperação de Módulos), que antes não sincronizavam entre dispositivos.
            const atualizado = { ...merged[idx] } as any;
            if (f.htmlCompleto && !atualizado.htmlCompleto) atualizado.htmlCompleto = f.htmlCompleto;
            if (f.textoGuia && !atualizado.textoGuia) atualizado.textoGuia = f.textoGuia;
            if (f.planoAulaId && !atualizado.planoAulaId) atualizado.planoAulaId = f.planoAulaId;
            // Se a cópia local ficou sem ingredientes ou preparação — por
            // causa do bug antigo — recupera-os do Sheets.
            if (Array.isArray(f.ingredientes) && f.ingredientes.length
                && !(atualizado.ingredientes?.length)) {
              atualizado.ingredientes = f.ingredientes;
            }
            if (Array.isArray(f.preparacao) && f.preparacao.length
                && !(atualizado.preparacao?.length)) {
              atualizado.preparacao = f.preparacao;
            }
            merged[idx] = atualizado;
          }
        }
        merged = reconciliarComSheets('fichas', merged,
          new Set(jsonFichas.dados.map((x: any) => String(x.id))),
          () => true,
          x => String((x as any).atualizadoEm || (x as any).criadoEm || ''),
          x => enviar(SHEETS_FICHAS_URL, 'ficha', { ficha: x }));
        save(KEYS.fichas, merged);
      }
    }
    if (leve) return;   // «leve»: só planos e fichas

    // Carregar Recuperações e Evidências do Sheets dedicado — merge por ID,
    // a versão mais recente (atualizadoEm) ganha em caso de conflito.
    if (SHEETS_RECUPERACAO_URL) {
      const jsonRecup = await ler(SHEETS_RECUPERACAO_URL, { tipo: 'recuperacoes', turmaId });
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

      const jsonEvid = await ler(SHEETS_RECUPERACAO_URL, { tipo: 'evidencias' });
      if (jsonEvid?.ok && jsonEvid.dados?.length > 0) {
        const locais = getEvidencias();
        const idsLocais = new Set(locais.map((e: Evidencia) => e.id));
        const novas = jsonEvid.dados.filter((e: Evidencia) => !idsLocais.has(e.id));
        if (novas.length > 0) save(KEYS.evidencias, [...locais, ...novas]);
      }
    }

    // ── Requisições e orçamentos ─────────────────────────────
    //
    // Iam para o Sheets e nunca voltavam. O professor fazia a requisição
    // num computador e noutro não a via — parecia que se tinha perdido.
    // É a única coisa que era enviada sem leitura de volta.
    if (SHEETS_PLANOS_URL) {
      try {
        const jsonReq = await ler(SHEETS_PLANOS_URL, { tipo: 'get_requisicoes', turmaId });
        const doSheets = jsonReq?.requisicoes || jsonReq?.dados || [];
        if (jsonReq?.ok && Array.isArray(doSheets)) {
          const locais = getRequisicoes();
          let merged = [...locais];
          for (const r of doSheets) {
            if (!r?.id) continue;
            const idx = merged.findIndex(x => x.id === r.id);
            if (idx < 0) {
              merged.push(r);
            } else if ((r.atualizadaEm || '') > (merged[idx].atualizadaEm || '')) {
              // A do Sheets é mais recente — mas nunca deitar fora linhas
              // que ela não traga e a local tenha.
              merged[idx] = {
                ...r,
                linhas: (r.linhas?.length ? r.linhas : merged[idx].linhas) || [],
              };
            }
          }
          merged = reconciliarComSheets('requisicoes', merged,
            new Set(doSheets.map((x: any) => String(x.id))),
            x => x.turmaId === turmaId,
            x => String(x.atualizadaEm || x.criadaEm || ''),
            x => enviar(SHEETS_PLANOS_URL, 'requisicao', { requisicao: x }));
          save(KEYS.requisicoes, merged);
        }
      } catch { /* sem rede, fica o que está */ }
    }

    // ── Sincronizar Avaliações (historico_avaliacoes) ──────────────────
    if (SHEETS_HISTORICO_URL) {
      const jsonAval = await ler(SHEETS_HISTORICO_URL, { tipo: 'get_avaliacoes', turmaId });
      if (jsonAval?.ok && jsonAval.dados?.length > 0) juntarAvaliacoes(jsonAval.dados);

      // ── Sincronizar Validações ──────────────────────────────────────
      const jsonVal = await ler(SHEETS_HISTORICO_URL, { tipo: 'get_validacoes', turmaId });
      if (jsonVal?.ok && jsonVal.dados?.length > 0) juntarValidacoes(jsonVal.dados);
      // (out/2026) No aparelho do professor: as validações que estão na
      // aplicação (vindas da base de dados) e faltam no Sheets, ou lá estão
      // sem a nota ou mais antigas, voltam a ser enviadas até chegarem.
      if (jsonVal?.ok && perfilDoAparelho && perfilDoAparelho !== 'aluno') {
        const noSheets = new Map<string, any>((jsonVal.dados || []).map((x: any) => [String(x.id), x]));
        getValidacoes().filter(v => v.turmaId === turmaId).forEach(v => {
          const x = noSheets.get(String(v.id));
          const falta = !x || String(x.notaMedia20 ?? '') === '' || quandoFoi(x.validadoEm) < quandoFoi((v as any).validadoEm) - 1000;
          if (falta) { enviarValidacaoAoSheets(v); porConfirmar('validacao', v.id, rotuloAlunoAula('validação', (v as any).alunoId, (v as any).planoAulaId), v.turmaId); }
        });
      }

      // ── Sincronizar Presenças ───────────────────────────────────────
      // A decisão local ganha se for mais recente do que a do Sheets; sem data
      // no Sheets, ganha durante 15 minutos (o tempo de o Sheets a receber).
      const jsonPres = await ler(SHEETS_HISTORICO_URL, { tipo: 'get_presencas', turmaId });
      if (jsonPres?.ok && jsonPres.dados?.length > 0) juntarPresencas(jsonPres.dados);
    }

    // ── Sincronizar Alunos ──────────────────────────────────────────────
    if (SHEETS_ALUNOS_URL) {
      const jsonAlunos = await ler(SHEETS_ALUNOS_URL, { tipo: 'get_alunos', turmaId });
      if (jsonAlunos?.ok && jsonAlunos.dados?.length > 0) {
        const locais = getAlunos();
        const merged = [...locais];
        for (const a of jsonAlunos.dados) {
          // Linhas sem nome são alunos-fantasma dos PINs inventados — não
          // entram noutros aparelhos.
          if (!a?.id || !a.nome) continue;
          const idx = merged.findIndex((x: Aluno) => x.id === a.id);
          if (idx < 0) merged.push(a);
          else merged[idx] = { ...merged[idx], ...a,
            nome: a.nome || merged[idx].nome,
            pin: merged[idx].pin || a.pin };
        }
        save(KEYS.alunos, merged);
        // A lista oficial manda: repor nomes, turmas e desativações.
        seedAlunosReais();
      }
    }

    // ── Sincronizar Autoavaliações (Selecoes) ───────────────────────────
    if (SHEETS_HISTORICO_URL) {
      const jsonSel = await ler(SHEETS_HISTORICO_URL, { tipo: 'get_selecoes', turmaId });
      if (jsonSel?.ok && jsonSel.dados?.length > 0) juntarSelecoes(jsonSel.dados);
    }

    // ── Base de dados (Firebase): o que não chegou ao Sheets está aqui ──
    if (baseLigada()) {
      const daBase = await Promise.all(Object.keys(COLECAO_DO_TIPO)
        .map(async tipo => [tipo, await lerDaBase(tipo, turmaId)] as const));
      for (const [tipo, dados] of daBase) if (dados) juntarDaBase(tipo, dados);
    }

    // ── Preços revistos (Continente) — iguais para todas as turmas ────
    if (SHEETS_ECL_URL) {
      const jsonPrecos = await ler(SHEETS_ECL_URL, { tipo: 'get_precos' });
      if (jsonPrecos?.ok && jsonPrecos.dados?.length > 0) juntarPrecosRevistos(jsonPrecos.dados);
      // Preços que os professores pediram para rever (v14).
      const jsonARever = await ler(SHEETS_ECL_URL, { tipo: 'get_precos_a_rever' });
      if (jsonARever?.ok && jsonARever.dados?.length > 0) juntarPrecosARever(jsonARever.dados);
      // As matérias-primas acrescentadas pelos professores (script v21.1).
      const jsonMP = await ler(SHEETS_ECL_URL, { tipo: 'get_materias_primas' });
      if (jsonMP?.ok && Array.isArray(jsonMP.dados)) juntarMateriasPrimas(jsonMP.dados.concat((jsonMP.eliminados || []).map((id: string) => ({ id, eliminado: true }))));
      partilharMateriasPrimasAntigas();
      // As sugestões feitas antes desta correção também chegam à coordenação.
      if (!sugestoesAntigasPartilhadas) {
        sugestoesAntigasPartilhadas = true;
        getAvisos().filter(x => x.tipo === 'sugestao_ingrediente').forEach(partilharAvisoDaCoordenacao);
      }
      // A tabela completa de preços fica também no Sheets, para se ver (Rosa, out/2026).
      if (perfilDoAparelho && perfilDoAparelho !== 'aluno') enviarTabelaDePrecos();
      if (perfilDoAparelho && perfilDoAparelho !== 'aluno') enviarNotasDaTurma(turmaId);
    }

    localStorage.setItem(KEYS.syncPlanos, new Date().toISOString());
  } catch (e) {
    console.warn('Sincronização falhou — a usar dados locais:', e);
  }
}

// ── Turmas ───────────────────────────────────────────────────
/** As turmas oficiais deste ano letivo. */
const TURMAS_OFICIAIS: Turma[] = [
  { id: '1º BCR', nome: '1º BCR — Cozinha e Restauração' },
  { id: '1º ACR', nome: '1º ACR — Cozinha e Restauração' },
  { id: '2º ACP', nome: '2º ACP — Cozinha e Pastelaria' },
  { id: '3º ACP', nome: '3º ACP — Cozinha e Pastelaria' },
];

export function getTurmas(): Turma[] {
  const t = load<Turma>(KEYS.turmas);
  // Uma turma criada depois — como a ACR — não aparecia em aparelhos que
  // já tinham a lista guardada: só se criava a lista quando estava vazia.
  if (t.length > 0) {
    const faltam = TURMAS_OFICIAIS.filter(o => !t.some(x => x.id === o.id));
    if (faltam.length) {
      const juntas = [...t, ...faltam];
      save(KEYS.turmas, juntas);
      return juntas;
    }
    return t;
  }
  if (t.length === 0) {
    const seed: Turma[] = [
      { id: '1º BCR', nome: '1º BCR — Cozinha e Restauração' },
      { id: '1º ACR', nome: '1º ACR — Cozinha e Restauração' },
      { id: '2º ACP', nome: '2º ACP — Cozinha e Pastelaria' },
      { id: '3º ACP', nome: '3º ACP — Cozinha e Pastelaria' },
    ];
    save(KEYS.turmas, seed);
    return seed;
  }
  // Migração: corrigir nomes antigos (1º CP → 1º ACP)
  const mapa: Record<string, {id: string, nome: string}> = {
    '1º CP': { id: '1º BCR', nome: '1º BCR — Cozinha e Restauração' },
    '1º ACP': { id: '1º BCR', nome: '1º BCR — Cozinha e Restauração' },
    '2º CP': { id: '2º ACP', nome: '2º ACP — Cozinha e Pastelaria' },
    '3º CP': { id: '3º ACP', nome: '3º ACP — Cozinha e Pastelaria' },
    'CP1':   { id: '1º BCR', nome: '1º BCR — Cozinha e Restauração' },
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
      const url = `${KITCHENFLOW_REGISTOS_URL}?tabela=${encodeURIComponent(tipoRegisto)}&turma=${encodeURIComponent(turmaId)}&aluno=${encodeURIComponent(alunoId)}&data=${encodeURIComponent(data)}`;

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

// ── Alunos reais ECL 2025/2026 ──────────────────────────────────────────────
// 2º CP = turma 1º ACP 2025/2028  |  3º CP = turma 2º ACP 2024/2027
// PINs: aleatórios, um por aluno, entregues em papel. O professor pode
// mudá-los depois (PIN temporário).
export function seedAlunosReais(): void {
  // Antes saía logo se o aparelho já tivesse alunos do 2º ou 3º ACP.
  // Num tablet já usado, o 1º BCR nunca entrava — e os três alunos que
  // saíram do 2º ACP continuavam lá. Agora acerta sempre a lista com a
  // oficial: acrescenta os que faltam, corrige os que estão mal, e
  // desativa os que já não pertencem à turma.
  const agora = new Date().toISOString();
  const alunos: Aluno[] = [
    // ── 1º BCR-C — Técnico de Cozinha e Restauração (2026/2029) ──
    // Turma nova deste ano letivo. Substitui o 1º ACP, que era outro
    // curso. A Jorgeana Varela e o Martim Silva vieram do 2º ACP.
    { id: '1º BCR-1', turmaId: '1º BCR', numero: 1, ano: 1 as const, nome: 'Dinis Fernandes Caralinda', pin: '6875', ativo: true, pinCriadoEm: agora },
    { id: '1º BCR-2', turmaId: '1º BCR', numero: 2, ano: 1 as const, nome: 'Diogo Barbaça', pin: '1406', ativo: true, pinCriadoEm: agora },
    { id: '1º BCR-3', turmaId: '1º BCR', numero: 3, ano: 1 as const, nome: 'Diogo Miguel Bernardo Lopes', pin: '6849', ativo: true, pinCriadoEm: agora },
    { id: '1º BCR-4', turmaId: '1º BCR', numero: 4, ano: 1 as const, nome: 'Érica Melissa Oliveira Leal', pin: '6174', ativo: true, pinCriadoEm: agora },
    { id: '1º BCR-5', turmaId: '1º BCR', numero: 5, ano: 1 as const, nome: 'Euler Fernando Kateque Cariango', pin: '4657', ativo: true, pinCriadoEm: agora },
    { id: '1º BCR-6', turmaId: '1º BCR', numero: 6, ano: 1 as const, nome: 'Guilherme Heitor Pereira Coutinho', pin: '4341', ativo: true, pinCriadoEm: agora },
    { id: '1º BCR-7', turmaId: '1º BCR', numero: 7, ano: 1 as const, nome: 'Joelma Barbosa de Pina Tavares', pin: '1219', ativo: true, pinCriadoEm: agora },
    { id: '1º BCR-8', turmaId: '1º BCR', numero: 8, ano: 1 as const, nome: 'Jorgeana Patricia Tavares Varela', pin: '5977', ativo: true, pinCriadoEm: agora },
    { id: '1º BCR-9', turmaId: '1º BCR', numero: 9, ano: 1 as const, nome: 'José Luís Tavares', pin: '9152', ativo: true, pinCriadoEm: agora },
    { id: '1º BCR-10', turmaId: '1º BCR', numero: 10, ano: 1 as const, nome: 'Kiara Alexandra de White Fernandes', pin: '3087', ativo: true, pinCriadoEm: agora },
    { id: '1º BCR-11', turmaId: '1º BCR', numero: 11, ano: 1 as const, nome: 'Luana Pinto', pin: '9267', ativo: true, pinCriadoEm: agora },
    { id: '1º BCR-12', turmaId: '1º BCR', numero: 12, ano: 1 as const, nome: 'Lúcia do Espírito Santo Cabral', pin: '8900', ativo: true, pinCriadoEm: agora },
    { id: '1º BCR-13', turmaId: '1º BCR', numero: 13, ano: 1 as const, nome: 'Martim Alexandre Mendes Máximo', pin: '5580', ativo: true, pinCriadoEm: agora },
    { id: '1º BCR-14', turmaId: '1º BCR', numero: 14, ano: 1 as const, nome: 'Martim Rocha Delgado Felizardo da Silva', pin: '8078', ativo: true, pinCriadoEm: agora },
    { id: '1º BCR-15', turmaId: '1º BCR', numero: 15, ano: 1 as const, nome: 'Melissa Gaspar da Costa', pin: '1205', ativo: true, pinCriadoEm: agora },
    { id: '1º BCR-16', turmaId: '1º BCR', numero: 16, ano: 1 as const, nome: 'Orcinela Campos dos Reis da Cruz', pin: '7100', ativo: true, pinCriadoEm: agora },
    { id: '1º BCR-17', turmaId: '1º BCR', numero: 17, ano: 1 as const, nome: 'Rodrigo Pereira Carvalho', pin: '6230', ativo: true, pinCriadoEm: agora },
    { id: '1º BCR-18', turmaId: '1º BCR', numero: 18, ano: 1 as const, nome: 'Sakibul Islam Sipat', pin: '1339', ativo: true, pinCriadoEm: agora },
    { id: '1º BCR-19', turmaId: '1º BCR', numero: 19, ano: 1 as const, nome: 'Tiago Gaty Lopes', pin: '1409', ativo: true, pinCriadoEm: agora },
    { id: '1º BCR-20', turmaId: '1º BCR', numero: 20, ano: 1 as const, nome: 'Tomás Paiva Novais', pin: '5399', ativo: true, pinCriadoEm: agora },

    // Entraram depois da folha de turma, vindas do 1º ACR.
    { id: '1º BCR-21', turmaId: '1º BCR', numero: 21, ano: 1 as const, nome: 'Kayllany Souza de Morais', pin: '6419', ativo: true, pinCriadoEm: agora },
    { id: '1º BCR-22', turmaId: '1º BCR', numero: 22, ano: 1 as const, nome: 'Letícia Filipa Correia Vicente', pin: '5244', ativo: true, pinCriadoEm: agora },

    // ── 1º ACR-R — Cozinha e Restauração (quinta, 14h-17h) ──────
    // Números da folha de turma da escola. Faltam o 10 e o 12:
    // a Kayllany e a Letícia passaram para o 1º BCR.
    { id: '1º ACR-1', turmaId: '1º ACR', numero: 1, ano: 1 as const, nome: 'Alexandre Miguel Carvalho Rodrigues', pin: '2425', ativo: true, pinCriadoEm: agora },
    { id: '1º ACR-2', turmaId: '1º ACR', numero: 2, ano: 1 as const, nome: 'Cristiano da Conceição Pacheco Lima', pin: '7549', ativo: true, pinCriadoEm: agora },
    { id: '1º ACR-3', turmaId: '1º ACR', numero: 3, ano: 1 as const, nome: 'Cristyan Jesus Pereira Fernandes', pin: '1145', ativo: true, pinCriadoEm: agora },
    { id: '1º ACR-4', turmaId: '1º ACR', numero: 4, ano: 1 as const, nome: 'Dalila Afonso das Neves Dias', pin: '2519', ativo: true, pinCriadoEm: agora },
    { id: '1º ACR-5', turmaId: '1º ACR', numero: 5, ano: 1 as const, nome: 'Diana Sofia Antão Ascenso', pin: '9461', ativo: true, pinCriadoEm: agora },
    { id: '1º ACR-6', turmaId: '1º ACR', numero: 6, ano: 1 as const, nome: 'Dinis Filipe Nunes Monteiro', pin: '4396', ativo: true, pinCriadoEm: agora },
    { id: '1º ACR-7', turmaId: '1º ACR', numero: 7, ano: 1 as const, nome: 'Francisco do Nascimento Varela Lopes', pin: '8049', ativo: true, pinCriadoEm: agora },
    { id: '1º ACR-8', turmaId: '1º ACR', numero: 8, ano: 1 as const, nome: 'Gustavo Morgado Chainho Antão', pin: '9513', ativo: true, pinCriadoEm: agora },
    { id: '1º ACR-9', turmaId: '1º ACR', numero: 9, ano: 1 as const, nome: 'João Rafael Ramos Gomes', pin: '7944', ativo: true, pinCriadoEm: agora },
    { id: '1º ACR-11', turmaId: '1º ACR', numero: 11, ano: 1 as const, nome: 'Lara Esteves Runa', pin: '8752', ativo: true, pinCriadoEm: agora },
    { id: '1º ACR-13', turmaId: '1º ACR', numero: 13, ano: 1 as const, nome: 'Luana Da Costa Oliveira', pin: '1823', ativo: true, pinCriadoEm: agora },
    { id: '1º ACR-14', turmaId: '1º ACR', numero: 14, ano: 1 as const, nome: 'Margarida Guerra dos Santos Duarte Costa', pin: '6762', ativo: true, pinCriadoEm: agora },
    { id: '1º ACR-15', turmaId: '1º ACR', numero: 15, ano: 1 as const, nome: 'Martim José Costa Silva', pin: '4344', ativo: true, pinCriadoEm: agora },
    { id: '1º ACR-16', turmaId: '1º ACR', numero: 16, ano: 1 as const, nome: 'Paulo Simão da Encarnação Esteves', pin: '6687', ativo: true, pinCriadoEm: agora },
    { id: '1º ACR-17', turmaId: '1º ACR', numero: 17, ano: 1 as const, nome: 'Raul Alexandre Adolfo Cotrim', pin: '9652', ativo: true, pinCriadoEm: agora },
    { id: '1º ACR-18', turmaId: '1º ACR', numero: 18, ano: 1 as const, nome: 'Susana Fernandes Sousa', pin: '3195', ativo: true, pinCriadoEm: agora },
    { id: '1º ACR-19', turmaId: '1º ACR', numero: 19, ano: 1 as const, nome: 'Vicente Castanheira Lalanda', pin: '8471', ativo: true, pinCriadoEm: agora },
    { id: '1º ACR-20', turmaId: '1º ACR', numero: 20, ano: 1 as const, nome: 'Vinicius Oliveira Cabral', pin: '9087', ativo: true, pinCriadoEm: agora },
    { id: '1º ACR-21', turmaId: '1º ACR', numero: 21, ano: 1 as const, nome: 'Yaya Konate', pin: '9936', ativo: true, pinCriadoEm: agora },
    { id: '1º ACR-99', turmaId: '1º ACR', numero: 99, ano: 1 as const, nome: 'TESTE — aluno de ensaio', pin: '9999', ativo: true, pinCriadoEm: agora },
    { id: '1º ACR-88', turmaId: '1º ACR', numero: 88, ano: 1 as const, nome: 'TESTE 88 — aluno de ensaio (sem autoavaliações)', pin: '8888', ativo: true, pinCriadoEm: agora },
    // Um aluno de teste por turma, para o professor experimentar sem
    // mexer no percurso de ninguém. PIN 9999.
    { id: '1º BCR-99', turmaId: '1º BCR', numero: 99, ano: 1 as const, nome: 'TESTE — aluno de ensaio', pin: '9999', ativo: true, pinCriadoEm: agora },
    { id: '1º BCR-88', turmaId: '1º BCR', numero: 88, ano: 1 as const, nome: 'TESTE 88 — aluno de ensaio (sem autoavaliações)', pin: '8888', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-99', turmaId: '2º ACP', numero: 99, ano: 2 as const, nome: 'TESTE — aluno de ensaio', pin: '9999', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-88', turmaId: '2º ACP', numero: 88, ano: 2 as const, nome: 'TESTE 88 — aluno de ensaio (sem autoavaliações)', pin: '8888', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-99', turmaId: '3º ACP', numero: 99, ano: 3 as const, nome: 'TESTE — aluno de ensaio', pin: '9999', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-88', turmaId: '3º ACP', numero: 88, ano: 3 as const, nome: 'TESTE 88 — aluno de ensaio (sem autoavaliações)', pin: '8888', ativo: true, pinCriadoEm: agora },

    // ── 2º ACP ───────────────────────────────────────────────────
    // 2º ACP — constituição de 2026/27 (eSchooling).
    // Saíram Carlos Maia (7), Jorgeana Varela (13) e Martim Silva (16).
    // Os números dos restantes mantêm-se os da pauta oficial — não se
    // renumeram, senão deixam de bater certo com o que a escola usa.
    { id: '2º ACP-1', turmaId: '2º ACP', numero: 1, ano: 2 as const, nome: 'Agnes Paola A. Conceição', pin: '4469', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-2', turmaId: '2º ACP', numero: 2, ano: 2 as const, nome: 'Alcides João S. Neto', pin: '3464', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-3', turmaId: '2º ACP', numero: 3, ano: 2 as const, nome: 'Anamar Padinha Gomes', pin: '8618', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-4', turmaId: '2º ACP', numero: 4, ano: 2 as const, nome: 'Arthur Oliveira Santos', pin: '6244', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-5', turmaId: '2º ACP', numero: 5, ano: 2 as const, nome: 'Beatriz Mendes Brito', pin: '6397', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-6', turmaId: '2º ACP', numero: 6, ano: 2 as const, nome: 'Beatriz Pompeu Pinheiro', pin: '1310', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-8', turmaId: '2º ACP', numero: 8, ano: 2 as const, nome: 'Eduardo Júnior S. Paulo', pin: '7924', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-9', turmaId: '2º ACP', numero: 9, ano: 2 as const, nome: 'Folly Orax Sallah', pin: '3616', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-10', turmaId: '2º ACP', numero: 10, ano: 2 as const, nome: 'Gonçalo Rafael Claro', pin: '5709', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-11', turmaId: '2º ACP', numero: 11, ano: 2 as const, nome: 'Gustavo Lopes Costa', pin: '3190', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-12', turmaId: '2º ACP', numero: 12, ano: 2 as const, nome: 'Isabella Medina Jurado', pin: '9527', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-14', turmaId: '2º ACP', numero: 14, ano: 2 as const, nome: 'Mafalda Resende C. Ferreira', pin: '4090', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-15', turmaId: '2º ACP', numero: 15, ano: 2 as const, nome: 'Manuel José M. Maca', pin: '9522', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-17', turmaId: '2º ACP', numero: 17, ano: 2 as const, nome: 'Neide Tavares Cardoso', pin: '8287', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-18', turmaId: '2º ACP', numero: 18, ano: 2 as const, nome: 'Raquel Luis O. Diogo', pin: '1739', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-19', turmaId: '2º ACP', numero: 19, ano: 2 as const, nome: 'Rita Maria S. Nunes', pin: '8550', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-20', turmaId: '2º ACP', numero: 20, ano: 2 as const, nome: 'Rute Santos Rodrigues', pin: '3607', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-21', turmaId: '2º ACP', numero: 21, ano: 2 as const, nome: 'Sara Andrade Arruda', pin: '2439', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-22', turmaId: '2º ACP', numero: 22, ano: 2 as const, nome: 'Telmo Márcio T. Mendes', pin: '1393', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-23', turmaId: '2º ACP', numero: 23, ano: 2 as const, nome: 'Yichen Wu', pin: '7955', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-1', turmaId: '3º ACP', numero: 1, ano: 3 as const, nome: 'Afonso Miguel C. Dias', pin: '6728', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-2', turmaId: '3º ACP', numero: 2, ano: 3 as const, nome: 'Aldmir Afonso Marques', pin: '1374', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-3', turmaId: '3º ACP', numero: 3, ano: 3 as const, nome: 'Bernardo Alexandre B. Correia', pin: '2359', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-4', turmaId: '3º ACP', numero: 4, ano: 3 as const, nome: 'Bruno Monteiro Cardoso', pin: '2792', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-5', turmaId: '3º ACP', numero: 5, ano: 3 as const, nome: 'Cilaine Espírito S. Pereira', pin: '7229', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-6', turmaId: '3º ACP', numero: 6, ano: 3 as const, nome: 'Diogo Alexandre S. Neves', pin: '6156', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-7', turmaId: '3º ACP', numero: 7, ano: 3 as const, nome: 'Djeison Patrick R. Pina', pin: '7153', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-8', turmaId: '3º ACP', numero: 8, ano: 3 as const, nome: 'Éria Santana Roberto', pin: '1579', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-9', turmaId: '3º ACP', numero: 9, ano: 3 as const, nome: 'Francisco Miguel P. Neto', pin: '1434', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-10', turmaId: '3º ACP', numero: 10, ano: 3 as const, nome: 'Hugo Guilherme B. Sequeira', pin: '8061', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-11', turmaId: '3º ACP', numero: 11, ano: 3 as const, nome: 'Íris Filipa G. Monteiro', pin: '1075', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-12', turmaId: '3º ACP', numero: 12, ano: 3 as const, nome: 'Lara Maria D. N. Machado', pin: '8915', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-13', turmaId: '3º ACP', numero: 13, ano: 3 as const, nome: 'Leonel Dino S. Tavares', pin: '5608', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-14', turmaId: '3º ACP', numero: 14, ano: 3 as const, nome: 'Leonor Sofia M. Cruz', pin: '7455', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-15', turmaId: '3º ACP', numero: 15, ano: 3 as const, nome: 'Luizito Campos Assunção', pin: '6943', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-16', turmaId: '3º ACP', numero: 16, ano: 3 as const, nome: 'Martim Fonseca M. Ramos', pin: '2136', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-17', turmaId: '3º ACP', numero: 17, ano: 3 as const, nome: 'Melisa Carine Cardoso', pin: '8177', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-18', turmaId: '3º ACP', numero: 18, ano: 3 as const, nome: 'Mishant Tamang', pin: '2738', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-19', turmaId: '3º ACP', numero: 19, ano: 3 as const, nome: 'Raquel Oliveira Pinto', pin: '4098', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-20', turmaId: '3º ACP', numero: 20, ano: 3 as const, nome: 'Ricardo Miguel G. Mendes', pin: '3014', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-21', turmaId: '3º ACP', numero: 21, ano: 3 as const, nome: 'Ronnen Alem Cardoso', pin: '9302', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-22', turmaId: '3º ACP', numero: 22, ano: 3 as const, nome: 'Vanessa Ramos Mestre', pin: '9101', ativo: true, pinCriadoEm: agora },
  ];
  const existentes = getAlunos();
  const merged = [...existentes];
  let mudou = false;
  const idsOficiais = new Set(alunos.map(a => a.id));

  const eliminados = alunosEliminados();
  for (const oficial of alunos) {
    // Eliminado pela coordenação — a lista oficial não o repõe.
    if (eliminados.has(oficial.id)) continue;
    const idx = merged.findIndex((x: Aluno) => x.id === oficial.id);
    if (idx < 0) { merged.push(oficial); mudou = true; continue; }

    const atual = merged[idx];
    // O nome, a turma e o número vêm sempre da lista oficial. O PIN só se
    // mantém se o professor o tiver mudado de propósito — um PIN escrito
    // por um aluno no primeiro acesso não conta.
    // PINs oficiais de 2026/27 — aleatórios, entregues em papel a cada aluno.
    // Um PIN mudado pelo professor DEPOIS desta data mantém-se; os de
    // antes (os antigos 1005, 2005… e os temporários do primeiro dia)
    // dão lugar ao oficial, para a folha impressa ser a que vale.
    const PINS_OFICIAIS_DESDE = '2026-09-22T00:00:00.000Z';
    const pin = (atual.pinAlteradoEm && atual.pinAlteradoEm >= PINS_OFICIAIS_DESDE)
      ? atual.pin : oficial.pin;
    // O estado (ativo/removido) NÃO vem da lista oficial: é decisão da
    // coordenação. Se a lista reativasse, uma remoção feita pela
    // coordenadora era desfeita na próxima vez que a aplicação abrisse.
    if (atual.nome !== oficial.nome || atual.turmaId !== oficial.turmaId
        || atual.numero !== oficial.numero || atual.pin !== pin) {
      merged[idx] = { ...atual, nome: oficial.nome, turmaId: oficial.turmaId,
        numero: oficial.numero, ano: oficial.ano, pin };
      mudou = true;
    }
  }

  // Quem está numa destas turmas mas não na lista oficial fica desativado:
  // os que saíram, e os alunos-fantasma criados por PINs inventados.
  const turmasOficiais = new Set(['1º ACP', '1º BCR', '2º ACP', '3º ACP']);
  for (let i = 0; i < merged.length; i++) {
    const a = merged[i];
    if (turmasOficiais.has(a.turmaId) && !idsOficiais.has(a.id) && a.ativo !== false) {
      merged[i] = { ...a, ativo: false };
      mudou = true;
    }
  }

  if (mudou) save(KEYS.alunos, merged);
  // Enviava a lista oficial inteira (≈80 alunos, um a um) em CADA
  // sincronização, de CADA aparelho — e cada envio fazia os outros
  // aparelhos sincronizar outra vez. O script nunca descansava. Agora só o
  // aparelho do professor ou da coordenação envia, e só o aluno que mudou.
  if (perfilDoAparelho !== 'professor' && perfilDoAparelho !== 'coordenadora') return;
  let enviados: Record<string, string> = {};
  try { enviados = JSON.parse(localStorage.getItem(KEY_ALUNOS_ENVIADOS) || '{}'); } catch { enviados = {}; }
  const assinatura = (a: any) => JSON.stringify([a.nome, a.turmaId, a.numero, a.pin, a.ativo !== false, a.nivelMedidas || 1]);
  const mudaram = alunos.filter((a: any) => enviados[a.id] !== assinatura(a));
  if (!mudaram.length) return;
  emSegundoPlano(() => mudaram.forEach((a: Aluno) => enviar(SHEETS_ALUNOS_URL, 'upsert_aluno', { aluno: a })));
  mudaram.forEach((a: any) => { enviados[a.id] = assinatura(a); });
  try { localStorage.setItem(KEY_ALUNOS_ENVIADOS, JSON.stringify(enviados)); } catch { /* */ }
}

const KEY_ALUNOS_ENVIADOS = 'ecl_alunos_enviados';
let perfilDoAparelho: string | null = null;
/** Quem está a usar este aparelho (professor, coordenadora, aluno). */
export function definirPerfilDoAparelho(p: string | null): void { perfilDoAparelho = p; }
let nomeDoAparelho = '';
/** O nome de quem entrou (para assinar as notas sobre os produtos). */
export function definirNomeDoAparelho(n: string): void { nomeDoAparelho = n || ''; }
export function getPerfilDoAparelho(): string | null { return perfilDoAparelho; }

// ── E-mails das compras (Rosa, out/2026) ───────────────────────
// Escritos uma vez na requisição, ficam guardados para todos os aparelhos
// e seguem em cada envio: o script da folha manda logo um e-mail formal.
const KEY_EMAILS_COMPRAS = 'ecl_emails_compras';
export function getEmailsCompras(): string {
  try { return (JSON.parse(localStorage.getItem(KEY_EMAILS_COMPRAS) || '{}') as any).valor || ''; } catch { return ''; }
}
export function definirEmailsCompras(valor: string): void {
  const reg = { id: 'emails_compras', valor: valor.trim(), atualizadoEm: new Date().toISOString() };
  try { localStorage.setItem(KEY_EMAILS_COMPRAS, JSON.stringify(reg)); } catch { /* */ }
  gravarNaBase('config', reg);
}
/** Os e-mails válidos, separados por vírgula, ponto e vírgula ou espaço. */
export function listaEmailsCompras(valor = getEmailsCompras()): string[] {
  return valor.split(/[,;\s]+/).map(x => x.trim()).filter(x => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x));
}
/** Uma definição partilhada qualquer (texto), guardada na base: ex. os
 *  favoritos e as notas dos vídeos da Rosa. */
export function getConfig(id: string): string {
  try { return (JSON.parse(localStorage.getItem('ecl_config_' + id) || '{}') as any).valor || ''; } catch { return ''; }
}
export function setConfig(id: string, valor: string): void {
  const reg = { id, valor, atualizadoEm: new Date().toISOString() };
  try { localStorage.setItem('ecl_config_' + id, JSON.stringify(reg)); } catch { /* */ }
  gravarNaBase('config', reg);
}
function juntarConfigs(lista: any[]): void {
  for (const x of lista) {
    if (x?.id && x.id !== 'emails_compras') {
      let atual: any = {};
      try { atual = JSON.parse(localStorage.getItem('ecl_config_' + x.id) || '{}'); } catch { /* */ }
      if (String(x.atualizadoEm || '') >= String(atual.atualizadoEm || '')) {
        try { localStorage.setItem('ecl_config_' + x.id, JSON.stringify({ id: x.id, valor: x.valor || '', atualizadoEm: x.atualizadoEm || '' })); } catch { /* */ }
      }
      continue;
    }
    if (x?.id !== 'emails_compras') continue;
    let atual: any = {};
    try { atual = JSON.parse(localStorage.getItem(KEY_EMAILS_COMPRAS) || '{}'); } catch { /* */ }
    if (String(x.atualizadoEm || '') >= String(atual.atualizadoEm || '')) {
      try { localStorage.setItem(KEY_EMAILS_COMPRAS, JSON.stringify({ id: x.id, valor: x.valor || '', atualizadoEm: x.atualizadoEm || '' })); } catch { /* */ }
    }
  }
}

// ── Alunos fantasma (Rosa, out/2026) ───────────────────────────
// «Existem alunos fantasma em todas as turmas»: estão inscritos mas nunca
// vêm. A coordenação marca-os e a aplicação deixa de os pôr nas faltas e
// presenças da aula, nas funções e responsabilidades, nas recuperações e
// no ranking (assume que faltam a tudo). Continuam na pauta oficial e
// podem ser repostos. A marca é partilhada por todos os aparelhos.
export interface MarcaFantasma { alunoId: string; turmaId: string; fantasma: boolean; marcadoPor: string; atualizadoEm: string }
const KEY_FANTASMAS = 'ecl_alunos_fantasma';
let cacheFantasmas: Set<string> | null = null;
export function alunosFantasma(): Set<string> {
  if (!cacheFantasmas) cacheFantasmas = new Set(load<MarcaFantasma>(KEY_FANTASMAS).filter(m => m.fantasma).map(m => m.alunoId));
  return cacheFantasmas;
}
export function ehFantasma(alunoId: string): boolean { return alunosFantasma().has(alunoId); }
export function marcarFantasma(aluno: { id: string; turmaId: string }, fantasma: boolean, quem: string): void {
  const m: MarcaFantasma = { alunoId: aluno.id, turmaId: aluno.turmaId, fantasma, marcadoPor: quem || 'coordenação', atualizadoEm: new Date().toISOString() };
  save(KEY_FANTASMAS, [...load<MarcaFantasma>(KEY_FANTASMAS).filter(x => x.alunoId !== aluno.id), m]);
  cacheFantasmas = null;
  gravarNaBase('aluno_fantasma', m as any);
}
function juntarFantasmas(lista: any[]): void {
  const m = new Map(load<MarcaFantasma>(KEY_FANTASMAS).map(x => [x.alunoId, x]));
  for (const x of lista) {
    if (!x?.alunoId) continue;
    const velho = m.get(x.alunoId);
    if (!velho || String(x.atualizadoEm || '') >= String(velho.atualizadoEm || '')) {
      m.set(x.alunoId, { alunoId: x.alunoId, turmaId: x.turmaDoAluno || x.turmaId || velho?.turmaId || '', fantasma: x.fantasma === true || x.fantasma === 'true',
        marcadoPor: x.marcadoPor || '', atualizadoEm: x.atualizadoEm || '' });
    }
  }
  save(KEY_FANTASMAS, [...m.values()]);
  cacheFantasmas = null;
}

// ── Notas da equipa sobre os produtos (Rosa, out/2026) ─────────
// Ao ver a fotografia de um produto da Makro, o professor pode deixar uma
// nota («já usámos», «não gostámos», «bom para empratar»…). As notas vão
// para a base de dados e aparecem a todos os professores, em todos os
// aparelhos. Quem as escreveu pode apagá-las.
export interface NotaProduto {
  id: string; codigo: string; produto: string; etiqueta: string; texto: string;
  autor: string; criadaEm: string; atualizadoEm: string; eliminado?: boolean;
}
const KEY_NOTAS_PRODUTOS = 'ecl_notas_produtos';
export const EVENTO_NOTAS_PRODUTOS = 'ecl-notas-produtos';
const avisarNotas = () => { try { window.dispatchEvent(new Event(EVENTO_NOTAS_PRODUTOS)); } catch { /* */ } };

export function getNotasProdutos(): NotaProduto[] {
  return load<NotaProduto>(KEY_NOTAS_PRODUTOS).filter(n => !n.eliminado);
}
export function getNotasDoProduto(codigo: string): NotaProduto[] {
  return getNotasProdutos().filter(n => n.codigo === codigo).sort((a, b) => b.criadaEm.localeCompare(a.criadaEm));
}
export function guardarNotaProduto(n: { codigo: string; produto: string; etiqueta: string; texto: string }): NotaProduto {
  const agora = new Date().toISOString();
  const nota: NotaProduto = { id: novoId('nota_prod'), codigo: n.codigo, produto: n.produto, etiqueta: n.etiqueta,
    texto: n.texto.trim(), autor: nomeDoAparelho || 'Professor', criadaEm: agora, atualizadoEm: agora };
  save(KEY_NOTAS_PRODUTOS, [...load<NotaProduto>(KEY_NOTAS_PRODUTOS), nota]);
  gravarNaBase('nota_produto', nota as any);
  avisarNotas();
  return nota;
}
export function eliminarNotaProduto(id: string): void {
  const todas = load<NotaProduto>(KEY_NOTAS_PRODUTOS);
  const n = todas.find(x => x.id === id);
  if (!n) return;
  const apagada = { ...n, eliminado: true, atualizadoEm: new Date().toISOString() };
  save(KEY_NOTAS_PRODUTOS, todas.map(x => x.id === id ? apagada : x));
  gravarNaBase('nota_produto', apagada as any);
  avisarNotas();
}
/** Quem pode apagar de vez um plano de aula do Arquivo: a coordenação. */
export function podeApagarDeVez(): boolean {
  return perfilDoAparelho === 'coordenadora' || /rosa\s+almeida/i.test(nomeDoAparelho);
}
/** Quem pode apagar uma nota: quem a escreveu e a coordenação. */
export function podeApagarNota(n: NotaProduto): boolean {
  const eu = nomeDoAparelho.trim().toLowerCase();
  return perfilDoAparelho === 'coordenadora' || /rosa\s+almeida/i.test(nomeDoAparelho)
    || (!!eu && n.autor.trim().toLowerCase() === eu);
}
function juntarNotasProdutos(lista: any[]): void {
  const m = new Map(load<NotaProduto>(KEY_NOTAS_PRODUTOS).map(x => [x.id, x]));
  for (const x of lista) {
    if (!x?.id || !x.codigo) continue;
    const velho = m.get(x.id);
    // Uma nota apagada não volta.
    if (velho?.eliminado) continue;
    if (!velho || x.eliminado || String(x.atualizadoEm || '') >= String(velho.atualizadoEm || '')) {
      const { gravadoNaBaseEm: _g, turmaId: _t, ...nota } = x;
      m.set(x.id, nota as NotaProduto);
    }
  }
  save(KEY_NOTAS_PRODUTOS, [...m.values()]);
  avisarNotas();
}


// ════════════════════════════════════════════════════════════════
// LIMPEZA SEGURA DE DADOS DE TESTE  (reescrita a 19/07/2026)
//
// A versão anterior fazia o CONTRÁRIO do que devia: mantinha 1 aluno
// "de teste" por turma e APAGAVA todos os alunos reais, mais todo o
// histórico anterior a hoje. Resultado: as turmas desapareceram.
//
// Regras da versão nova (definidas pela Rosa após o incidente):
// 1. Só apaga o que corresponde POSITIVAMENTE a padrões de teste
//    conhecidos — nunca "tudo menos X", nunca por data.
// 2. Só corre se houver uma cópia de segurança descarregada há menos
//    de 10 minutos (trava no próprio backend — mesmo que alguém chame
//    a função por engano de outro sítio, ela recusa-se).
// 3. Existe previewLimpezaDadosTeste() para a interface mostrar a
//    lista NOMINAL do que vai ser apagado ANTES de confirmar.
// 4. A função antiga limparDadosTeste() foi REMOVIDA — qualquer
//    import antigo dela falha no build, de propósito.
// ════════════════════════════════════════════════════════════════

const KEY_ULTIMO_BACKUP = 'ecl_ultimo_backup_ts';
const JANELA_BACKUP_MS = 10 * 60 * 1000; // 10 minutos

// Padrões que identificam POSITIVAMENTE dados de teste.
// Notas importantes:
// - IDs reais têm espaço: '2º ACP-1'. Os seeds de teste antigos usavam
//   '1ºCP-1' / '2ºCP-4' (SEM espaço) — o regex abaixo só apanha esses.
// - O bug antigo usava a.id.includes('CP-'), que apanhava TUDO
//   (porque 'ACP-' contém 'CP-'). Nunca repetir esse teste.
function ehAlunoTeste(a: Aluno): boolean {
  const nome = (a.nome || '').toLowerCase();
  return nome.includes('teste') || nome.includes('test') ||
    /^[123]ºCP-/.test(a.id) ||
    a.numero === 9999;
}

function ehPlanoTeste(p: PlanoAula): boolean {
  return p.id.startsWith('plano_teste_') || p.id.startsWith('plano_seed_');
}

function ehFichaTeste(f: FichaProducao): boolean {
  return f.id.startsWith('ficha_teste_');
}

function ehRequisicaoTeste(r: RequisicaoAula): boolean {
  return r.id.startsWith('req_teste_');
}

function ehRegistoSeed(id: string): boolean {
  return id.startsWith('seed_');
}

export interface PreviewLimpeza {
  alunosApagar: Aluno[];
  alunosManter: Aluno[];
  planosApagar: PlanoAula[];
  fichasApagar: FichaProducao[];
  requisicoesApagar: RequisicaoAula[];
  avaliacoesApagar: number;
  presencasApagar: number;
}

/** Mostra EXATAMENTE o que a limpeza vai apagar e o que vai manter —
 *  a interface usa isto para a confirmação nominal antes de executar. */
export function previewLimpezaDadosTeste(): PreviewLimpeza {
  const alunos = getAlunos();
  return {
    alunosApagar: alunos.filter(ehAlunoTeste),
    alunosManter: alunos.filter(a => !ehAlunoTeste(a)),
    planosApagar: getPlanosAula().filter(ehPlanoTeste),
    fichasApagar: getFichasProducao().filter(ehFichaTeste),
    requisicoesApagar: getRequisicoes().filter(ehRequisicaoTeste),
    avaliacoesApagar: getHistoricoAvaliacoes().filter(r => ehRegistoSeed(r.id)).length,
    presencasApagar: getPresencas().filter(p => ehRegistoSeed(p.id)).length,
  };
}

/** true se foi descarregada uma cópia de segurança nos últimos 10 minutos. */
export function backupRecente(): boolean {
  try {
    const ts = localStorage.getItem(KEY_ULTIMO_BACKUP);
    if (!ts) return false;
    return Date.now() - new Date(ts).getTime() < JANELA_BACKUP_MS;
  } catch { return false; }
}

export interface ResultadoLimpeza {
  ok: boolean;
  mensagem: string;
  removidos?: { alunos: number; planos: number; fichas: number; requisicoes: number; avaliacoes: number; presencas: number };
}

/** Executa a limpeza de dados de teste — SÓ apaga o que corresponde aos
 *  padrões de teste, e SÓ se houver backup recente. Devolve relatório. */
export function limparDadosTesteSeguro(): ResultadoLimpeza {
  if (!backupRecente()) {
    return {
      ok: false,
      mensagem: 'Bloqueado: é obrigatório descarregar uma cópia de segurança primeiro (há menos de 10 minutos). Descarregue a cópia de segurança e volte a tentar.',
    };
  }

  const pv = previewLimpezaDadosTeste();

  save(KEYS.alunos, pv.alunosManter);
  save(KEYS.planos, getPlanosAula().filter(p => !ehPlanoTeste(p)));
  save(KEYS.fichas, getFichasProducao().filter(f => !ehFichaTeste(f)));
  save(KEYS.requisicoes, getRequisicoes().filter(r => !ehRequisicaoTeste(r)));
  save(KEY_HIST, getHistoricoAvaliacoes().filter(r => !ehRegistoSeed(r.id)));
  save(KEYS.presencas, getPresencas().filter(p => !ehRegistoSeed(p.id)));
  // Chave antiga 'ecl_historico_presencas' — só os seeds de teste escreviam
  // aqui (a app real usa KEYS.presencas). Pode ir toda.
  try { localStorage.removeItem('ecl_historico_presencas'); } catch {}

  console.log('[limparDadosTesteSeguro] Removidos:', pv.alunosApagar.length, 'alunos de teste;',
    pv.planosApagar.length, 'planos;', pv.fichasApagar.length, 'fichas;',
    pv.requisicoesApagar.length, 'requisições;', pv.avaliacoesApagar, 'avaliações;',
    pv.presencasApagar, 'presenças. Mantidos:', pv.alunosManter.length, 'alunos reais.');

  return {
    ok: true,
    mensagem: `Limpeza concluída. Apagados ${pv.alunosApagar.length} alunos de teste — os ${pv.alunosManter.length} alunos reais ficaram intactos.`,
    removidos: {
      alunos: pv.alunosApagar.length,
      planos: pv.planosApagar.length,
      fichas: pv.fichasApagar.length,
      requisicoes: pv.requisicoesApagar.length,
      avaliacoes: pv.avaliacoesApagar,
      presencas: pv.presencasApagar,
    },
  };
}

// ══════════════════════════════════════════════════════════════
// RESET DE INÍCIO DE ANO LETIVO  (decidido pela Rosa a 19/07/2026)
//
// Enquanto a app está em fase de testes, TODA a atividade é ensaio
// — mesmo a feita com os alunos reais. Quando o ano letivo começar,
// a Rosa quer poder apagar tudo isso de uma vez e começar limpa.
//
// O que SOBREVIVE (decisão dela: "apagar tudo menos os alunos reais"):
//   · Alunos reais com os seus PINs
//   · As turmas (estrutura)
// O que DESAPARECE: absolutamente tudo o resto — avaliações,
// presenças, comandas, autoavaliações, validações, recuperações,
// evidências, planos, fichas, requisições, distribuições,
// checklists, eventos, avisos, matérias-primas custom, técnicas
// custom, manual do cozinheiro, rascunhos — todas as chaves ecl_*.
// Alunos de teste também desaparecem.
//
// Mesma trava da limpeza: exige backup dos últimos 10 minutos.
// ══════════════════════════════════════════════════════════════

export interface PreviewReset {
  alunosApagar: Aluno[];        // alunos de teste
  alunosManter: Aluno[];        // alunos reais — a ÚNICA coisa que sobrevive
  planosApagar: PlanoAula[];
  fichasApagar: FichaProducao[];
  requisicoesApagar: RequisicaoAula[];
  avaliacoesApagar: number;
  presencasApagar: number;
  outrasContagens: { rotulo: string; n: number }[];
}

/** Lista tudo o que o reset de início de ano vai apagar e o que mantém. */
export function previewResetInicioAno(): PreviewReset {
  const alunos = getAlunos();
  return {
    alunosApagar: alunos.filter(ehAlunoTeste),
    alunosManter: alunos.filter(a => !ehAlunoTeste(a)),
    planosApagar: getPlanosAula(),
    fichasApagar: getFichasProducao(),
    requisicoesApagar: getRequisicoes(),
    avaliacoesApagar: getHistoricoAvaliacoes().length,
    presencasApagar: getPresencas().length,
    outrasContagens: [
      { rotulo: 'Comandas', n: getComandas().length },
      { rotulo: 'Autoavaliações', n: getSelecoes().length },
      { rotulo: 'Validações', n: getValidacoes().length },
      { rotulo: 'Recuperações', n: getRecuperacoes().length },
      { rotulo: 'Evidências', n: getEvidencias().length },
      { rotulo: 'Distribuições', n: getDistribuicoes().length },
      { rotulo: 'Checklists', n: getChecklists().length },
    ],
  };
}

/** Apaga TODAS as chaves ecl_* do localStorage, repõe as turmas e os
 *  alunos reais (com PINs), e nada mais. Exige backup recente. */
export function resetInicioAnoLetivo(): ResultadoLimpeza {
  if (!backupRecente()) {
    return {
      ok: false,
      mensagem: 'Bloqueado: é obrigatório descarregar uma cópia de segurança primeiro (há menos de 10 minutos). Descarregue a cópia de segurança e volte a tentar.',
    };
  }

  const pv = previewResetInicioAno();
  const alunosReais = pv.alunosManter;
  const turmas = getTurmas();

  // Apagar TODAS as chaves ecl_* — inclusive as que a app ainda não
  // conhece por nome (eventos, rascunhos, custom, manual, tombstones).
  const aRemover: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('ecl_') && k !== KEY_ULTIMO_BACKUP) aRemover.push(k);
    }
  } catch {}
  aRemover.forEach(k => { try { localStorage.removeItem(k); } catch {} });

  // Repor a única coisa que sobrevive: turmas (estrutura) + alunos reais.
  save(KEYS.turmas, turmas);
  save(KEYS.alunos, alunosReais);

  console.log('[resetInicioAnoLetivo] Apagadas', aRemover.length, 'chaves ecl_*. Mantidos',
    alunosReais.length, 'alunos reais e', turmas.length, 'turmas.');

  return {
    ok: true,
    mensagem: `Reset concluído. A app está limpa para o ano letivo — mantidos apenas os ${alunosReais.length} alunos reais com os seus PINs. Tudo o resto foi apagado.`,
    removidos: {
      alunos: pv.alunosApagar.length,
      planos: pv.planosApagar.length,
      fichas: pv.fichasApagar.length,
      requisicoes: pv.requisicoesApagar.length,
      avaliacoes: pv.avaliacoesApagar,
      presencas: pv.presencasApagar,
    },
  };
}

// ── Alunos ───────────────────────────────────────────────────
export function getAlunos(): Aluno[] {
  // Os eliminados pela coordenação não voltam — nem pela lista oficial,
  // nem pelo Sheets.
  const fora = alunosEliminados();
  const todos = load<Aluno>(KEYS.alunos);
  return fora.size ? todos.filter(a => !fora.has(a.id)) : todos;
}

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

  // O login NUNCA cria alunos.
  //
  // Antes, um aluno que não existisse no aparelho era criado na hora com
  // o PIN que escrevesse. Qualquer número e qualquer PIN entravam — e
  // ficava um aluno sem nome, noutra turma, que depois não via plano
  // nenhum. Os alunos vêm só da lista oficial; o PIN, do professor.
  if (!aluno) {
    return { ok: false, erro: `Não há nenhum aluno nº ${numero} nesta turma. Confirma a turma e o número, ou fala com o professor.` };
  }
  if (aluno.ativo === false) {
    return { ok: false, erro: 'Este aluno já não está nesta turma. Fala com o professor.' };
  }
  // (v22) Quem confirma o PIN é o Sheets. Só se o Sheets ainda não tiver o
  // PIN deste aluno (ou não houver rede) se usa o que está neste aparelho.
  const r = await confirmarPinAluno(aluno.id, pinIntroduzido);
  if (r === 'errado') return { ok: false, erro: 'PIN incorreto.' };
  if (r === 'bloqueado') return { ok: false, erro: 'Fizeste demasiadas tentativas erradas. Espera 10 minutos ou pede ajuda ao professor.' };
  if (r !== 'entrou') {
    if (!aluno.pin) {
      return { ok: false, erro: r === 'semRede' ? 'Sem ligação à escola. Confirma a ligação à internet e tenta outra vez.' : 'Ainda não tens PIN. Pede-o ao professor.' };
    }
    if (aluno.pin !== pinIntroduzido) return { ok: false, erro: 'PIN incorreto.' };
  }

  // O PIN fica preso ao telemóvel onde o aluno entrou pela primeira vez.
  const tel = await verificarTelemovel(aluno);
  if (!tel.ok) return { ok: false, erro: tel.erro };
  return { ok: true, aluno, primeiraVezNesteTelemovel: tel.primeiraVez } as any;
}

// ============================================================
// O PIN ligado ao telemóvel
// ============================================================
// Na primeira entrada, o PIN do aluno fica ligado ao telemóvel onde ele
// entrou. Nas seguintes, só esse telemóvel entra com esse PIN — um colega
// que saiba o PIN não entra noutro telemóvel.
//
// O browser não deixa ver o número do telemóvel. O que se faz é deixar no
// telemóvel uma marca aleatória, guardada na primeira entrada, e
// reconhecê-la depois. A ligação fica no Sheets (script do Histórico,
// folha TELEMOVEIS), para todos os aparelhos a conhecerem.
//
// Se o aluno limpar os dados do browser, usar uma janela anónima ou mudar
// de browser, o telemóvel parece outro. (out/2026) Já não é recusado: com o
// PIN certo, o PIN passa para este telemóvel e o professor recebe um aviso.

const KEY_MEU_TELEMOVEL = 'ecl_telemovel';
const KEY_TELEMOVEIS = 'ecl_telemoveis_ligados';

/** A marca deste telemóvel — criada uma vez, fica para sempre. */
export function meuTelemovel(): string {
  let t = '';
  try { t = localStorage.getItem(KEY_MEU_TELEMOVEL) || ''; } catch { /* */ }
  if (!t) {
    t = novoId('tel');
    try { localStorage.setItem(KEY_MEU_TELEMOVEL, t); } catch { /* */ }
  }
  return t;
}

function ligacoesLocais(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(KEY_TELEMOVEIS) || '{}'); } catch { return {}; }
}
function guardarLigacoes(l: Record<string, string>): void {
  try { localStorage.setItem(KEY_TELEMOVEIS, JSON.stringify(l)); } catch { /* */ }
}

/** Vai buscar ao Sheets as ligações da turma. O Sheets manda. */
async function atualizarLigacoes(turmaId: string): Promise<boolean> {
  try {
    const json: any = await Promise.race([
      lerDoSheetsJa(SHEETS_HISTORICO_URL, { tipo: 'get_telemoveis', turmaId }, 6000),
      new Promise(res => setTimeout(() => res(null), 6000)),
    ]);
    if (!json?.ok || !Array.isArray(json.telemoveis)) return false;
    const l = ligacoesLocais();
    const daTurma = new Set(json.telemoveis.map((x: any) => x.alunoId));
    // Os desta turma que o Sheets já não tem foram libertados.
    for (const id of Object.keys(l)) {
      if (id.startsWith(turmaId + '-') && !daTurma.has(id)) delete l[id];
    }
    json.telemoveis.forEach((x: any) => { if (x.alunoId && x.dispositivoId) l[x.alunoId] = x.dispositivoId; });
    guardarLigacoes(l);
    return true;
  } catch { return false; }
}

async function verificarTelemovel(aluno: Aluno): Promise<{ ok: boolean; erro?: string; primeiraVez?: boolean }> {
  const eu = meuTelemovel();
  await atualizarLigacoes(aluno.turmaId);   // sem rede, fica o que está cá
  const l = ligacoesLocais();
  const dono = l[aluno.id];

  if (!dono) {
    // Primeira entrada deste aluno: fica ligado a este telemóvel.
    l[aluno.id] = eu;
    guardarLigacoes(l);
    enviar(SHEETS_HISTORICO_URL, 'ligar_telemovel', {
      alunoId: aluno.id, turmaId: aluno.turmaId, dispositivoId: eu,
    });
    return { ok: true, primeiraVez: true };
  }
  if (dono === eu) return { ok: true };
  // Parece outro telemóvel. Quase sempre é o mesmo: o iPhone apaga a memória
  // do site ao fim de 7 dias sem o abrir, e abrir o link pelo WhatsApp ou pelo
  // Instagram conta como outro browser (Rosa, out/2026: «diz que não está
  // associado quando só usaram esse telemóvel»). O aluno acabou de escrever o
  // PIN certo: o PIN passa para este telemóvel e o professor fica a saber —
  // se não foi o próprio aluno, vê-o nos pedidos de ajuda.
  l[aluno.id] = eu;
  guardarLigacoes(l);
  enviar(SHEETS_HISTORICO_URL, 'libertar_telemovel', { alunoId: aluno.id, turmaId: aluno.turmaId });
  enviar(SHEETS_HISTORICO_URL, 'ligar_telemovel', { alunoId: aluno.id, turmaId: aluno.turmaId, dispositivoId: eu });
  try {
    pedirAjudaAoProfessor(aluno, 'Entrou noutro telemóvel (ou noutro browser)', [
      'O PIN passou para este telemóvel sem precisar de o libertar.',
      'Se não foi o próprio aluno, mude-lhe o PIN.',
      `Navegador: ${typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 120) : '—'}`,
    ]);
  } catch { /* o aviso não pode impedir a entrada */ }
  return { ok: true, primeiraVez: true };
}

/** O professor liberta o PIN — a próxima entrada volta a ligar. */
export function libertarTelemovel(alunoId: string, turmaId: string): void {
  const l = ligacoesLocais();
  delete l[alunoId];
  guardarLigacoes(l);
  enviar(SHEETS_HISTORICO_URL, 'libertar_telemovel', { alunoId, turmaId });
}

/** O professor vai buscar à escola os telemóveis ligados da turma. Antes o
 *  aparelho do professor só conhecia os que tinham entrado nele. */
export function lerTelemoveisDaTurma(turmaId: string): Promise<boolean> {
  return atualizarLigacoes(turmaId);
}

/** Tem o PIN ligado a algum telemóvel? (para os ecrãs do professor) */
export function temTelemovelLigado(alunoId: string): boolean {
  return !!ligacoesLocais()[alunoId];
}

/** Altera o PIN de um aluno já existente (pelo professor/coordenadora).
 *  Liberta também o telemóvel: quem precisa de PIN novo muitas vezes
 *  mudou de telemóvel ou limpou o browser. */
export function alterarPinAluno(alunoId: string, novoPin: string): void {
  const alunoAntes = getAlunos().find(a => a.id === alunoId);
  if (alunoAntes) libertarTelemovel(alunoId, alunoAntes.turmaId);
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
  // Depois de ler do Sheets, a lista oficial volta a mandar — senão os
  // PINs inventados e os alunos-fantasma de lá voltavam a entrar.
  try { await sincronizarAlunosDaSheetBruto(); } finally { seedAlunosReais(); }
}

async function sincronizarAlunosDaSheetBruto(): Promise<void> {
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
// Sem as aulas fantasma (sem código) que o antigo envio ao calendário
// deixou na folha PLANOS e que a sincronização trouxe para o aparelho.
// Um plano vindo do Sheets ou do Firestore pode chegar sem a lista de fichas
// (aulas teóricas). Sem esta garantia, abrir esse plano fazia cair o ecrã do aluno.
// Os títulos automáticos levavam a data à inglesa («Aula prática — 2026-10-01»):
// mostram-se à portuguesa em todo o lado (auditoria out/2026).
const ISO_NO_TITULO = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
export function getPlanosAula(): PlanoAula[] {
  return load<PlanoAula>(KEYS.planos).filter(p => p && p.id)
    .map(p => Array.isArray(p.fichasIds) ? p : { ...p, fichasIds: [] })
    .map(p => typeof p.titulo === 'string' && /\b\d{4}-\d{2}-\d{2}\b/.test(p.titulo)
      ? { ...p, titulo: p.titulo.replace(ISO_NO_TITULO, '$3/$2/$1') } : p);
}

export function getPlanosAulaPorTurma(turmaId: string, incluirArquivados = false): PlanoAula[] {
  return getPlanosAula()
    .filter(p => p.turmaId === turmaId)
    .filter(p => incluirArquivados || p.estado !== 'arquivado')
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''));
}

export function addOrUpdatePlanoAula(p: PlanoAula): void {
  // O registo fica no fim da função, depois de gravar e enviar.
  // Toda a gravação leva a hora: é por ela que o telemóvel do aluno aceita a
  // correção. Antes só algumas gravações a punham, e as outras correções do
  // professor não chegavam aos alunos (Rosa, set/2026).
  p = { ...p, atualizadoEm: new Date().toISOString() } as PlanoAula;
  const all = getPlanosAula();
  const idx = all.findIndex(x => x.id === p.id);
  if (idx >= 0) all[idx] = p; else all.push(p);
  save(KEYS.planos, all);
  // O envio vem depois de gravar, e um erro aqui (memória do aparelho
  // cheia, por exemplo) não pode parar quem chamou: o botão «Criar plano»
  // ficava parado em «A criar o plano…» com o plano já gravado.
  const passos: (() => void)[] = [
    () => enviar(SHEETS_PLANOS_URL, 'plano', { plano: p }),
    () => registarEnvio(p.id, 'plano', p.titulo || `Plano de ${p.data}`),
    () => porConfirmar('plano', p.id, p.titulo || `Plano de ${p.data}`, p.turmaId),
    () => sincronizarPlanoComCalendario(p),
  ];
  passos.forEach(f => { try { f(); } catch (e) { console.error('Plano gravado, mas o envio falhou:', e); } });
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
    const todos = [...JSON.parse(localStorage.getItem('ecl_eventos_v3') || '[]'),
      ...JSON.parse(localStorage.getItem('ecl_eventos_v4') || '[]')];
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
  const turmaDoPlano = getPlanosAula().find(p => p.id === planoId)?.turmaId;
  if (turmaDoPlano) paraABase('eliminar_plano', { planoId, turmaId: turmaDoPlano });
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
  // Com o script único, o "calendário" ia para o mesmo endereço, com o tipo
  // "plano" e sem o código do plano: o script gravava na folha PLANOS uma
  // aula fantasma, sem código, igual à verdadeira. O script único não tem
  // calendário — não se envia nada.
  if (SHEETS_CALENDARIO_URL === SHEETS_ECL_URL) return;
  const fichas = getFichasProducao().filter(f => (p.fichasIds || []).includes(f.id)).map(f => f.nomePrato);
  const temRequisicao = getRequisicoes().some(r => r.planoAulaId === p.id);
  // Um plano é gravado muitas vezes (competências, publicar, fichas…) e
  // cada gravação mandava tudo outra vez para o calendário. Só se envia
  // quando muda alguma coisa que o calendário mostra.
  const assinatura = JSON.stringify([p.data, p.horaInicio, p.horaFim, p.titulo, p.ucId, p.turmaId, fichas, temRequisicao]);
  const KEY_CAL = 'ecl_calendario_enviados';
  let enviados: Record<string, string> = {};
  try { enviados = JSON.parse(localStorage.getItem(KEY_CAL) || '{}'); } catch { enviados = {}; }
  if (enviados[p.id] === assinatura) return;
  enviados[p.id] = assinatura;
  try { localStorage.setItem(KEY_CAL, JSON.stringify(enviados)); } catch { /* sem espaço */ }
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
  // O ponto final que a IA deixava nos títulos («Bacalhau à Brás.», «Peixe.»)
  // sai também das fichas já guardadas (Rosa, out/2026).
  const semPonto = (t: any) => typeof t === 'string' ? t.trim().replace(/([^.])\.$/, '$1').trim() : t;
  const corrigidas = fichas.map(f0 => {
    let f = f0;
    for (const c of ['nomePrato', 'classificacao', 'tempoPrep', 'tempoConf'] as const) {
      const v = (f as any)[c];
      if (typeof v === 'string' && semPonto(v) !== v) { f = { ...f, [c]: semPonto(v) }; mudou = true; }
    }
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
  return getFichasProducao().filter(f => (plano.fichasIds || []).includes(f.id));
}

const KEY_FICHAS_HIST = 'ecl_fichas_historico';

/**
 * Identificador único para uma ficha nova.
 *
 * Era `ficha_${Date.now()}` — o relógio em milissegundos. Duas fichas
 * criadas no mesmo milissegundo ficavam com o MESMO id, e a segunda
 * gravava por cima da primeira, aqui e no Sheets. Acontece sempre que
 * se criam fichas em lote.
 *
 * Agora leva também uma parte aleatória: duas fichas nunca colidem,
 * mesmo criadas ao mesmo tempo.
 */
export function novoId(prefixo: string): string {
  const agora = Date.now().toString(36);
  const acaso = Math.random().toString(36).slice(2, 8);
  return `${prefixo}_${agora}_${acaso}`;
}

export function novoIdFicha(): string {
  return novoId('ficha');
}

/**
 * Fichas com o id repetido — o estrago que o bug acima deixou.
 * Devolve os grupos, para se ver o que se perdeu.
 */
export function fichasComIdRepetido(): { id: string; fichas: FichaProducao[] }[] {
  const porId = new Map<string, FichaProducao[]>();
  getFichasProducao().forEach(f => {
    porId.set(f.id, [...(porId.get(f.id) || []), f]);
  });
  const repetidos: { id: string; fichas: FichaProducao[] }[] = [];
  porId.forEach((fichas, id) => {
    if (fichas.length > 1) repetidos.push({ id, fichas });
  });
  return repetidos;
}

/**
 * Dá um id novo às fichas que partilham o mesmo, para deixarem de se
 * sobrepor. Os planos que as usavam continuam a apontar para a primeira.
 */
export function separarFichasComIdRepetido(): { corrigidas: number } {
  const todas = getFichasProducao();
  const vistos = new Set<string>();
  let corrigidas = 0;

  const novas = todas.map(f => {
    if (!vistos.has(f.id)) { vistos.add(f.id); return f; }
    corrigidas += 1;
    return { ...f, id: novoIdFicha() };
  });

  if (corrigidas > 0) save(KEYS.fichas, novas);
  return { corrigidas };
}

/**
 * Guarda a versão anterior de uma ficha antes de a substituir.
 *
 * Perderam-se fichas por serem gravadas por cima com versões vazias.
 * Isto mantém as últimas versões COMPLETAS de cada ficha — e só as
 * completas, porque guardar as vazias não serve de nada.
 */
function guardarVersaoAnterior(f: FichaProducao): void {
  const anterior = getFichasProducao().find(x => x.id === f.id);
  if (!anterior) return;
  // Só vale a pena guardar se tinha conteúdo.
  if (!anterior.ingredientes?.length && !anterior.preparacao?.length) return;
  // E só se a nova está a perder alguma coisa.
  const perdeIngredientes = !!anterior.ingredientes?.length && !f.ingredientes?.length;
  const perdePreparacao = !!anterior.preparacao?.length && !f.preparacao?.length;
  if (!perdeIngredientes && !perdePreparacao) return;

  try {
    const hist = JSON.parse(localStorage.getItem(KEY_FICHAS_HIST) || '[]');
    const semEsta = hist.filter((x: any) => x.id !== f.id);
    // Guardar no máximo 60 — chega para um ano letivo.
    localStorage.setItem(KEY_FICHAS_HIST, JSON.stringify(
      [{ ...anterior, _guardadoEm: new Date().toISOString() }, ...semEsta].slice(0, 60)
    ));
  } catch { /* se não couber, segue */ }
}

export function addOrUpdateFichaProducao(f: FichaProducao): void {
  const all = getFichasProducao();
  const idx = all.findIndex(x => x.id === f.id);
  const anterior = idx >= 0 ? all[idx] : undefined;

  // ── TRAVA: uma ficha vazia nunca apaga uma que tem conteúdo ──
  //
  // Uma ficha podia estar vazia na aplicação (do bug antigo de leitura do
  // Sheets) e completa no Sheets. Bastava associá-la a um plano para a
  // aplicação a gravar — e a versão vazia ia por cima da boa, destruindo
  // no Sheets o que lá estava.
  //
  // Aqui, se o que vai ser gravado perde conteúdo em relação ao que já
  // existe, recupera-se o que se ia perder em vez de o deitar fora.
  let paraGravar = f;
  if (anterior) {
    const perdeIngredientes = !!anterior.ingredientes?.length && !f.ingredientes?.length;
    const perdePreparacao   = !!anterior.preparacao?.length   && !f.preparacao?.length;
    const perdeGuiao = !!(anterior as any).textoGuia && !(f as any).textoGuia;

    if (perdeIngredientes || perdePreparacao || perdeGuiao) {
      paraGravar = {
        ...f,
        ingredientes: perdeIngredientes ? anterior.ingredientes : f.ingredientes,
        preparacao:   perdePreparacao   ? anterior.preparacao   : f.preparacao,
        ...(perdeGuiao ? { textoGuia: (anterior as any).textoGuia } : {}),
      } as FichaProducao;
    }
  }

  // Data da última alteração: é por ela que o telemóvel do aluno sabe que a ficha mudou.
  paraGravar = { ...paraGravar, atualizadoEm: new Date().toISOString() } as FichaProducao;
  guardarVersaoAnterior(paraGravar);
  if (idx >= 0) all[idx] = paraGravar; else all.push(paraGravar);
  save(KEYS.fichas, all);

  // Nunca enviar uma ficha sem conteúdo nenhum para o Sheets: se lá
  // estiver a versão boa, seria apagada.
  //
  // O guião conta como conteúdo. Sem esta linha, uma ficha que tivesse
  // só guião — ou a quem se acabasse de escrever um — nunca era enviada,
  // e o guião perdia-se ao mudar de aparelho.
  const temConteudo = !!paraGravar.ingredientes?.length
    || !!paraGravar.preparacao?.length
    || !!(paraGravar as any).textoGuia
    || !!(paraGravar as any).htmlCompleto;
  if (temConteudo) {
    enviar(SHEETS_FICHAS_URL, 'ficha', { ficha: paraGravar });
    registarEnvio(paraGravar.id, 'ficha', paraGravar.nomePrato || 'Ficha sem nome');
  }
}

/** Grava a ficha tal como está, mesmo vazia. Só para quando o professor
 *  apaga o conteúdo de propósito no editor. */
export function guardarFichaMesmoVazia(f: FichaProducao): void {
  const all = getFichasProducao();
  const idx = all.findIndex(x => x.id === f.id);
  guardarVersaoAnterior(f);
  if (idx >= 0) all[idx] = f; else all.push(f);
  save(KEYS.fichas, all);
  enviar(SHEETS_FICHAS_URL, 'ficha', { ficha: f });
  porConfirmar('ficha', f.id, f.nomePrato || 'Ficha', '');
  registarEnvio(f.id, 'ficha', f.nomePrato || 'Ficha sem nome');
}

/** Versões completas guardadas antes de terem sido esvaziadas. */
export function versoesAnterioresDeFichas(): FichaProducao[] {
  try { return JSON.parse(localStorage.getItem(KEY_FICHAS_HIST) || '[]'); }
  catch { return []; }
}

/**
 * Procura as fichas vazias em todos os sítios onde possam estar
 * completas: cópia local, cópia do arranque do ano, e o Sheets.
 */
export async function recuperarFichasDeTodoOLado(): Promise<{
  tentadas: number; recuperadas: number; nomes: string[]; origens: string[];
}> {
  const vazias = getFichasProducao().filter(
    f => !f.ingredientes?.length || !f.preparacao?.length
  );
  if (vazias.length === 0) {
    return { tentadas: 0, recuperadas: 0, nomes: [], origens: [] };
  }

  // Todas as fontes possíveis, da mais fiável para a menos.
  const fontes: { nome: string; fichas: any[] }[] = [];

  fontes.push({ nome: 'cópia local', fichas: versoesAnterioresDeFichas() });

  try {
    const arranque = JSON.parse(localStorage.getItem('ecl_backup_pre_arranque') || '{}');
    if (arranque.fichas?.length) {
      fontes.push({ nome: 'cópia do arranque do ano', fichas: arranque.fichas });
    }
  } catch { /* ignorar */ }

  try {
    const json = await lerDoSheets(SHEETS_FICHAS_URL, { tipo: 'get_fichas' });
    const doSheets = json?.dados || json?.fichas || [];
    if (doSheets.length) fontes.push({ nome: 'Google Sheets', fichas: doSheets });
  } catch { /* ignorar */ }

  const nomes: string[] = [];
  const origens = new Set<string>();
  const locais = getFichasProducao();

  const atualizadas = locais.map(f => {
    if (f.ingredientes?.length && f.preparacao?.length) return f;

    for (const fonte of fontes) {
      const candidata = fonte.fichas.find((x: any) => x.id === f.id);
      if (!candidata) continue;

      const ganhaI = !f.ingredientes?.length && candidata.ingredientes?.length > 0;
      const ganhaP = !f.preparacao?.length && candidata.preparacao?.length > 0;
      if (!ganhaI && !ganhaP) continue;

      nomes.push(f.nomePrato || f.id);
      origens.add(fonte.nome);
      return {
        ...f,
        ingredientes: ganhaI ? candidata.ingredientes : f.ingredientes,
        preparacao: ganhaP ? candidata.preparacao : f.preparacao,
      };
    }
    return f;
  });

  save(KEYS.fichas, atualizadas);
  // Reenviar as recuperadas, para o Sheets voltar a ter a versão boa.
  atualizadas
    .filter(f => nomes.includes(f.nomePrato || f.id))
    .forEach(f => enviar(SHEETS_FICHAS_URL, 'ficha', { ficha: f }));

  return {
    tentadas: vazias.length, recuperadas: nomes.length,
    nomes, origens: [...origens],
  };
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
/** Tira do aparelho as requisições que cumprem a condição (e regista-as
 *  como eliminadas, para não voltarem do Sheets). Não envia nada: quem
 *  chama já pediu ao script para apagar (com o plano ou com o evento). */
function apagarRequisicoesLocais(condicao: (r: RequisicaoAula) => boolean): void {
  const todas = getRequisicoes();
  const fora = todas.filter(condicao).map(r => r.id);
  if (!fora.length) return;
  save(KEYS.requisicoes, todas.filter(r => !fora.includes(r.id)));
  const eliminados = load<string>(KEYS.eliminadosRequisicoes);
  save(KEYS.eliminadosRequisicoes, [...new Set([...eliminados, ...fora])]);
}

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

/** A proposta de nota final do aluno viaja como uma autoavaliação especial,
 *  com este prefixo no plano — assim sincroniza pelo mesmo caminho. Fica fora
 *  das autoavaliações das aulas (não é "por validar", não conta para a nota). */
const PREFIXO_FINAL = 'UCFINAL|';
/** As respostas às perguntas do CL, CR e CO de cada aula (aluno e professor). */
const PREFIXO_TRIAGEM = 'TRIAGEM|';
/** A nota final da UC publicada pelo professor, que o aluno vê. */
const PREFIXO_NOTA = 'UCNOTA|';
/** Quem não teve função no plano organizacional e ajudou os colegas: o que fez. */
const PREFIXO_COLAB = 'COLAB|';
/** O aluno carregou em «Avisar o professor»: o pedido e o relatório do telemóvel. */
const PREFIXO_AJUDA = 'AJUDA|';
const ehRegistoEspecial = (s: SelecaoAluno) => {
  const p = String(s.planoAulaId || '');
  return p.startsWith(PREFIXO_FINAL) || p.startsWith(PREFIXO_TRIAGEM) || p.startsWith(PREFIXO_NOTA) || p.startsWith(PREFIXO_COLAB)
    || p.startsWith(PREFIXO_AJUDA);
};

/**
 * O aluno pede ajuda ao professor (não vê a aula, por exemplo). Antes o aviso
 * ficava só no telemóvel do aluno e nunca chegava ao professor. Vai pelo
 * mesmo caminho das autoavaliações, com o relatório do telemóvel.
 */
export function pedirAjudaAoProfessor(aluno: { id: string; turmaId: string }, titulo: string, linhas: string[]): void {
  const agora = new Date().toISOString();
  addOrUpdateSelecao({
    id: `ajuda_${aluno.id}_${agora.slice(0, 16)}`, planoAulaId: PREFIXO_AJUDA + agora.slice(0, 10), comandaId: '', fichaId: '',
    alunoId: aluno.id, turmaId: aluno.turmaId, tecnicas: [], atitudes: [], responsabilidades: [],
    autoavaliacoes: [{ competenciaId: 'AJUDA', nivel: 'ajuda', nota: 0, titulo, linhas } as any],
    criadaEm: agora,
  } as any);
}

/** Pedidos de ajuda dos alunos dos últimos 7 dias. */
export function pedidosDeAjuda(): { id: string; alunoId: string; turmaId: string; em: string; titulo: string; linhas: string[] }[] {
  const limite = new Date(Date.now() - 7 * 86400000).toISOString();
  return load<any>(KEYS.selecoes).filter((s: any) => String(s.planoAulaId || '').startsWith(PREFIXO_AJUDA) && String(s.criadaEm || '') >= limite)
    .map((s: any) => ({ id: s.id, alunoId: s.alunoId, turmaId: s.turmaId, em: s.criadaEm,
      titulo: String(s.autoavaliacoes?.[0]?.titulo || ''), linhas: s.autoavaliacoes?.[0]?.linhas || [] }));
}

/** O aluno sem função nesta aula diz como ajudou os colegas (chega ao professor). */
export function guardarColaboracao(alunoId: string, turmaId: string, planoAulaId: string, texto: string): void {
  addOrUpdateSelecao({
    id: `colab_${planoAulaId}_${alunoId}`, planoAulaId: PREFIXO_COLAB + planoAulaId, comandaId: '', fichaId: '',
    alunoId, turmaId, tecnicas: [], atitudes: [], responsabilidades: [],
    autoavaliacoes: [{ competenciaId: 'COLABOROU', nivel: 'colaboracao', nota: 0, texto } as any],
    criadaEm: new Date().toISOString(),
  } as any);
}

export function colaboracoesDaAula(planoAulaId: string): { alunoId: string; texto: string }[] {
  return load<any>(KEYS.selecoes).filter((s: any) => s.planoAulaId === PREFIXO_COLAB + planoAulaId)
    .map((s: any) => ({ alunoId: s.alunoId, texto: String(s.autoavaliacoes?.[0]?.texto || '') }))
    .filter(x => x.texto.trim());
}
export function getSelecoes(): SelecaoAluno[] {
  const todas = semPlanosEliminados(load<SelecaoAluno>(KEYS.selecoes)).filter(s => !ehRegistoEspecial(s));
  // O professor mudou as perguntas e pediu à turma para responder outra vez:
  // as respostas antigas deixam de existir para todos, também as já
  // validadas (Rosa, set/2026). O aluno volta a ter a autoavaliação por
  // fazer; a nota antiga continua a contar até o professor validar a nova.
  const pedidos = new Map(getPlanosAula().filter((p: any) => p.pedirDeNovoEm).map((p: any) => [p.id, p.pedirDeNovoEm as string]));
  if (!pedidos.size) return todas;
  return todas.filter(s => {
    const em = pedidos.get(s.planoAulaId || '');
    return !em || respostaDepoisDoPedido(s, em);
  });
}

/**
 * As autoavaliações que o PROFESSOR vê para validar. São as de getSelecoes e,
 * de cada aluno que só tem respostas de antes do último pedido («responder
 * outra vez»), a última dessas, marcada `antesDoPedido`. Regra (Rosa, out/2026):
 * a última resposta está sempre ao alcance do professor. Antes, se o telemóvel
 * do aluno ainda tinha a versão antiga do plano, a resposta ficava escondida
 * ao professor e «pendente» para sempre.
 */
export function selecoesDoProfessor(): SelecaoAluno[] {
  const visiveis = getSelecoes();
  const todas = semPlanosEliminados(load<SelecaoAluno>(KEYS.selecoes)).filter(s => !ehRegistoEspecial(s));
  if (todas.length === visiveis.length) return visiveis;
  const tem = new Set(visiveis.map(s => s.alunoId + '|' + s.planoAulaId));
  const escondidas = selecoesQueContam(todas.filter(s => !tem.has(s.alunoId + '|' + s.planoAulaId)));
  return [...visiveis, ...escondidas.map(s => ({ ...s, antesDoPedido: true } as SelecaoAluno))];
}

/** Respostas desta aula dadas antes da última alteração do plano (e ainda não validadas). */
export function respostasAntesDaAlteracao(planoId: string): number {
  const p: any = getPlanosAula().find(x => x.id === planoId);
  const alterado = String(p?.ultimaAlteracao?.em || '');
  if (!p || !alterado) return 0;
  return getSelecoes().filter(s => s.planoAulaId === planoId && String(s.criadaEm || '') < alterado).length;
}

/** O professor mudou o plano: os alunos que já responderam (validados ou não) respondem outra vez. */
export function pedirNovaAutoavaliacao(planoId: string): void {
  const p = getPlanosAula().find(x => x.id === planoId);
  if (!p) return;
  addOrUpdatePlanoAula({ ...p, pedirDeNovoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() } as any);
}
/** Regra (Rosa, out/2026): o professor reabre a autoavaliação de UM aluno,
 *  sem PIN novo. Fica no plano (reabertaPara), chega ao telemóvel dele, e
 *  fecha outra vez quando ele responde. Os outros continuam fechados. */
export function reabrirAutoavaliacao(planoId: string, alunoId: string): void {
  const p: any = getPlanosAula().find(x => x.id === planoId);
  if (!p) return;
  addOrUpdatePlanoAula({ ...p, reabertaPara: { ...(p.reabertaPara || {}), [alunoId]: new Date().toISOString() } });
}
/** Desde quando este aluno tem de responder outra vez nesta aula: o pedido à
 *  turma (perguntas novas) ou a reabertura só para ele — o mais recente. */
export function pedidoParaOAluno(plano: any, alunoId?: string): string | undefined {
  const a = plano?.pedirDeNovoEm, b = alunoId ? plano?.reabertaPara?.[alunoId] : undefined;
  return !a ? b : !b ? a : (quandoFoi(b) > quandoFoi(a) ? b : a);
}
/** Os alunos que já tinham respondido e ainda não responderam à versão
 *  atual do plano, depois de o professor pedir para responder outra vez (à
 *  turma ou só a eles). Até responderem, conta a resposta antiga (Rosa, out/2026). */
export function alunosPorResponderVersaoNova(plano: any, sels: SelecaoAluno[] = getSelecoes()): string[] {
  if (!plano?.pedirDeNovoEm && !plano?.reabertaPara) return [];
  const ids = [...new Set(sels.filter(s => s.planoAulaId === plano.id).map(s => s.alunoId))];
  return ids.filter(id => {
    const pedido = pedidoParaOAluno(plano, id);
    if (!pedido) return false;
    const r = ultimaResposta(id, plano.id, sels);
    return !r || !respostaDepoisDoPedido(r, pedido);
  });
}

/** A autoavaliação deste aluno foi reaberta e ele ainda não respondeu outra vez? */
export function reabertaPorResponder(plano: any, alunoId: string): boolean {
  const r = plano?.reabertaPara?.[alunoId];
  if (!r) return false;
  const s = load<SelecaoAluno>(KEYS.selecoes).filter(x => x.alunoId === alunoId && x.planoAulaId === plano.id)
    .sort((x: any, y: any) => quandoFoi(y.criadaEm) - quandoFoi(x.criadaEm))[0];
  return !s || !respostaDepoisDoPedido(s, r);
}
export function getValidacoes(): Validacao[] { return semPlanosEliminados(load<Validacao>(KEYS.validacoes)); }

/** A validação desta autoavaliação. Procura pelo código e também pelo
 *  aluno e pela aula: a mesma autoavaliação pode chegar duas vezes (do
 *  telemóvel e do Sheets, ou com um código antigo). Sem isto, a cópia que
 *  chegava depois aparecia por corrigir e o professor corrigia duas vezes. */
export function validacaoDaSelecao(s: { id: string; alunoId?: string; planoAulaId?: string; criadaEm?: string }, validacoes: Validacao[] = getValidacoes()): Validacao | undefined {
  // A mais recente de todas as deste aluno nesta aula. Antes ficava a
  // primeira que aparecesse: se o professor corrigisse noutra cópia, a
  // correção não contava e o aluno continuava «por validar» (Rosa, out/2026).
  const v = validacoes
    .filter((v: any) => v.selecaoId === s.id
      || (!!s.alunoId && !!s.planoAulaId && v.alunoId === s.alunoId && v.planoAulaId === s.planoAulaId))
    .sort((a: any, b: any) => quandoFoi(b.validadoEm) - quandoFoi(a.validadoEm))[0];
  // Respondeu outra vez depois de o professor pedir: a validação antiga não
  // é desta resposta (continua a contar para a nota até haver a nova).
  const pedido = v && (s.criadaEm || (s as any).versaoPlano) ? pedidoParaOAluno(getPlanosAula().find(p => p.id === s.planoAulaId), s.alunoId) : undefined;
  // «Resposta nova» conta pela versão do plano a que o aluno respondeu (a hora
  // do professor); só as respostas antigas, sem versão, usam a hora do
  // telemóvel do aluno, que pode estar adiantada ou atrasada.
  const respostaNova = pedido ? respostaDepoisDoPedido(s, pedido) : false;
  if (v && pedido && respostaNova && quandoFoi((v as any).validadoEm) < quandoFoi(pedido)) return undefined;
  return v;
}
/** A resposta foi dada depois de o professor pedir que respondessem outra vez?
 *  Conta a versão do plano a que o aluno respondeu (a hora do professor); só
 *  as respostas antigas, sem versão, usam a hora do telemóvel do aluno, que
 *  pode estar adiantada ou atrasada. */
export function respostaDepoisDoPedido(s: { criadaEm?: string }, pedido: string): boolean {
  const versao = (s as any).versaoPlano;
  return versao ? quandoFoi(versao) >= quandoFoi(pedido) : quandoFoi(s.criadaEm) >= quandoFoi(pedido);
}
/** Uma data em milissegundos, venha ela como vier (texto ISO ou do Sheets). */
export function quandoFoi(x: unknown): number {
  const t = Date.parse(String(x || ''));
  return isNaN(t) ? 0 : t;
}
/** De cada aluno, em cada aula, conta só a ÚLTIMA resposta: as anteriores
 *  ficam anuladas. Assim uma resposta antiga, enviada duas vezes ou de antes
 *  de o professor pedir outra vez, nunca fica «por validar» para sempre
 *  (Rosa, out/2026). Usa-se em todo o lado onde se conta ou se mostra. */
export function selecoesQueContam(sels: SelecaoAluno[] = getSelecoes()): SelecaoAluno[] {
  const m = new Map<string, SelecaoAluno>();
  for (const s of sels) {
    const k = `${s.alunoId}|${s.planoAulaId}`, a = m.get(k);
    if (!a || quandoFoi((s as any).criadaEm) >= quandoFoi((a as any).criadaEm)) m.set(k, s);
  }
  return [...m.values()];
}
/** A resposta que conta deste aluno nesta aula (a última). */
export function ultimaResposta(alunoId: string, planoId: string, sels: SelecaoAluno[] = getSelecoes()): SelecaoAluno | undefined {
  return selecoesQueContam(sels.filter(s => s.alunoId === alunoId && s.planoAulaId === planoId))[0];
}
/** Quantas vezes o aluno respondeu a esta aula (o professor é avisado se for mais de uma). */
export function vezesQueRespondeu(alunoId: string, planoId: string, sels: SelecaoAluno[] = getSelecoes()): number {
  return sels.filter(s => s.alunoId === alunoId && s.planoAulaId === planoId).length;
}
export function selecaoJaValidada(s: { id: string; alunoId?: string; planoAulaId?: string }, validacoes: Validacao[] = getValidacoes()): boolean {
  return !!validacaoDaSelecao(s, validacoes);
}
export function getAtividades(): Atividade[] { return load<Atividade>(KEYS.atividades); }

/** Inscreve ou retira o aluno de uma atividade. Inscrever não é
 *  participar: só conta para o bónus depois de o aluno confirmar que foi. */
export function inscreverEmAtividade(atividadeId: string, alunoId: string, inscrever: boolean): void {
  const all = getAtividades().map(a => {
    if (a.id !== atividadeId) return a;
    const atuais = a.inscritosIds ?? [];
    return {
      ...a,
      inscritosIds: inscrever
        ? [...new Set([...atuais, alunoId])]
        : atuais.filter(id => id !== alunoId),
    };
  });
  save(KEYS.atividades, all);
}

/** O aluno diz se foi e como correu. É aqui que entra em participantesIds
 *  — e só a partir daqui é que conta para a nota. */
export function registarBalancoAtividade(
  atividadeId: string, alunoId: string, participou: boolean, resultado?: string
): void {
  const all = getAtividades().map(a => {
    if (a.id !== atividadeId) return a;
    const balancos = (a.balancos ?? []).filter(b => b.alunoId !== alunoId);
    const participantes = participou
      ? [...new Set([...a.participantesIds, alunoId])]
      : a.participantesIds.filter(id => id !== alunoId);
    return {
      ...a,
      participantesIds: participantes,
      balancos: [...balancos, {
        alunoId, participou,
        resultado: resultado as any,
        em: new Date().toISOString(),
      }],
    };
  });
  save(KEYS.atividades, all);
}
export function getPlanosAulaFn(): PlanoAula[] { return getPlanosAula(); }

export function addOrUpdateSelecao(s: SelecaoAluno): void {
  const all = load<SelecaoAluno>(KEYS.selecoes);
  const idx = all.findIndex(x => x.id === s.id);
  if (idx >= 0) all[idx] = s; else all.push(s);
  save(KEYS.selecoes, all);
  // Enviar selecao para Sheets — necessário para sincronização entre dispositivos
  // Tipo 'selecao' é diferente de 'avaliacao' para não criar linhas duplicadas
  enviar(SHEETS_HISTORICO_URL, 'selecao', corpoSelecao(s));
  // Se não chegar, volta a ser enviada: sem ela o professor não vê esta
  // autoavaliação na lista para validar.
  porConfirmar('selecao', s.id, rotuloAlunoAula('autoavaliação', s.alunoId, s.planoAulaId), s.turmaId);
}

function corpoSelecao(s: SelecaoAluno): Record<string, unknown> {
  return {
    id: s.id,
    planoAulaId: s.planoAulaId,
    alunoId: s.alunoId,
    turmaId: s.turmaId,
    tecnicas: s.tecnicas,
    atitudes: s.atitudes,
    autoavaliacoes: s.autoavaliacoes,
    // (v25) Os nomes das competências, para o Sheets mostrar o que o aluno
    // respondeu com palavras (o Sheets não tem o referencial).
    nomes: Object.fromEntries((s.autoavaliacoes || []).map(a => [a.competenciaId, (() => { try { return nomeCompetencia(a.competenciaId); } catch { return a.competenciaId; } })()])),
    criadaEm: s.criadaEm,
    // A versão do plano a que respondeu (out/2026).
    ...((s as any).versaoPlano ? { versaoPlano: (s as any).versaoPlano } : {}),
  };
}

export function addOrUpdateValidacao(v: Validacao): void {
  const all = getValidacoes();
  const idx = all.findIndex(x => x.id === v.id);
  if (idx >= 0) all[idx] = v; else all.push(v);
  save(KEYS.validacoes, all);
  // A nota que vai para o Sheets tem de ser a MESMA que o professor viu.
  // Antes fazia média simples de todas as notas, ignorando os pesos —
  // num aluno com muitas técnicas fracas e o resto bom, isso dava 9,09
  // no Sheets contra 14,00 no ecrã. Quase cinco valores de diferença.
  //
  // O ValidacaoView já calcula a ponderada e guarda-a em notaMedia20.
  // Usa-se essa; a média simples só serve de recurso se faltar.
  const notaPonderada = (v as any).notaMedia20;
  const notaMediaVal = v.notas.length
    ? v.notas.reduce((s, n) => s + n.nota, 0) / v.notas.length : 0;
  const nota20Final = typeof notaPonderada === 'number'
    ? Math.round(notaPonderada * 10) / 10
    : notaPara20(notaMediaVal);

  enviarValidacaoAoSheets(v, nota20Final);
  // (out/2026) A validação insiste até chegar ao Sheets, como a autoavaliação.
  // Antes ia uma vez: se o Sheets estava ocupado, a nota ficava na aplicação
  // e o Sheets continuava a mostrar «AA» (Rosa: o Leonel, dias 29/09 e 02/10).
  porConfirmar('validacao', v.id, rotuloAlunoAula('validação', (v as any).alunoId, (v as any).planoAulaId), v.turmaId);
}

function enviarValidacaoAoSheets(v: Validacao, nota20Final?: number): void {
  const np = (v as any).notaMedia20;
  const n20 = nota20Final ?? (typeof np === 'number' ? Math.round(np * 10) / 10
    : notaPara20(v.notas.length ? v.notas.reduce((s, n) => s + n.nota, 0) / v.notas.length : 0));
  const aluno_val = getAlunos().find(a => a.id === v.alunoId);
  enviar(SHEETS_HISTORICO_URL, 'validacao', {
    ...(v as unknown as Record<string, unknown>),
    nomeAluno: aluno_val?.nome || ('Aluno ' + (aluno_val?.numero || 0)),
    turma: v.turmaId,
    nota_media_1_5: Math.round(nivelDe20(n20) * 10) / 10,
    nota_media_0_20: n20,
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
  return semPlanosEliminados(load<RegistoAvaliacao>(KEY_HIST));
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

/**
 * Substitui os registos do professor para um aluno num plano.
 *
 * Sem isto, cada vez que o professor corrigia uma validação ficavam os
 * registos antigos ao lado dos novos — e o aluno via as duas notas da
 * mesma competência. A autoavaliação do aluno (validadoPor: 'aluno')
 * fica intacta: é a proposta dele e faz parte do percurso.
 */
export function substituirRegistosDoProfessor(
  alunoId: string, planoAulaId: string, novos: RegistoAvaliacao[]
): void {
  // Limpar os anteriores deste professor para este aluno neste plano.
  const semAntigos = getHistoricoAvaliacoes().filter(r => !(
    r.alunoId === alunoId &&
    r.planoAulaId === planoAulaId &&
    r.validadoPor === 'professor'
  ));
  save(KEY_HIST, semAntigos);
  // E gravar os novos pelo caminho normal, que trata do envio ao Sheets.
  novos.forEach(addRegistoAvaliacao);
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
  const nota20 = notaPara20(r.nota);

  porConfirmar('avaliacao', r.id, `${aluno?.nome || 'aluno'} · ${r.microcompetenciaId}`, r.turmaId);
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

  enviarPresenca(registo, aluno, plano);
}

/** A presença que vai para o Sheets. Ia sem o aluno e sem a aula (alunoId e
 *  planoAulaId): o Sheets identifica cada presença por esses dois campos,
 *  por isso todas caíam na mesma linha, umas por cima das outras, e o
 *  professor via «0 alunos entraram» mesmo com alunos lá dentro. */
function enviarPresenca(registo: any, aluno?: any, plano?: any): void {
  aluno = aluno || getAlunos().find(a => a.id === registo.alunoId);
  plano = plano || getPlanosAula().find(p => p.id === registo.planoAulaId);
  enviar(SHEETS_HISTORICO_URL, 'presenca', {
    id: registo.id,
    alunoId: registo.alunoId,
    planoAulaId: registo.planoAulaId || '',
    nomeAluno: aluno?.nome || ('Aluno ' + (aluno?.numero || 0)),
    numero: aluno?.numero || 0,
    turmaId: registo.turmaId,
    planoTitulo: plano?.titulo || '',
    ucId: registo.ucId || plano?.ucId || '',
    presente: !!registo.presente,
    atrasado: !!registo.atrasado,
    atrasadoMins: registo.atrasadoMins || 0,
    horaEntrada: registo.horaEntrada || '',
    fardamentoOk: registo.fardamentoOk ?? true,
    observacao: registo.observacao || '',
    data: registo.data || '',
    ...(registo.decisaoProfessor ? { decisaoProfessor: registo.decisaoProfessor, decididoPor: registo.decididoPor || '' } : {}),
    ...(registo.horasPresentes ? { horasPresentes: registo.horasPresentes } : {}),
  });
}

// ── Mãos lavadas à entrada ──────────────────────────────────
// Fica na observação da presença (é o que chega ao Sheets e aos outros
// aparelhos do professor), à frente do resto: «Mãos lavadas às 09:05 (52 s)».
const MARCA_MAOS = /Mãos lavadas às [^|]*(\|\s*)?/;

export function registarMaosLavadas(alunoId: string, planoAulaId: string, segundos: number): void {
  const all = load<RegistoPresenca>(KEYS.presencas);
  const i = all.findIndex(r => r.alunoId === alunoId && r.planoAulaId === planoAulaId);
  if (i < 0) return;
  const hora = new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  const marca = `Mãos lavadas às ${hora} (${segundos} s)`;
  const resto = (all[i].observacao || '').replace(MARCA_MAOS, '').trim();
  all[i] = { ...all[i], observacao: resto ? `${marca} | ${resto}` : marca };
  save(KEYS.presencas, all);
  enviarPresenca(all[i]);
}

/** A farda declarada à entrada vai para a presença: o professor vê no
 *  «Turma na aula» quem tem farda incompleta e o que falta. Antes só ia
 *  para a autoavaliação, e a presença dizia sempre «farda completa». */
export function registarFardaNaPresenca(alunoId: string, planoAulaId: string, emFalta: string[]): void {
  const all = load<RegistoPresenca>(KEYS.presencas);
  const i = all.findIndex(r => r.alunoId === alunoId && r.planoAulaId === planoAulaId);
  if (i < 0) return;
  const semFalta = (all[i].observacao || '').replace(/\|?\s*em falta:.*$/, '').trim();
  const obs = emFalta.length ? [semFalta, `em falta: ${emFalta.join(', ')}`].filter(Boolean).join(' | ') : semFalta;
  all[i] = { ...all[i], fardamentoOk: emFalta.length === 0, observacao: obs };
  save(KEYS.presencas, all);
  enviarPresenca(all[i]);
}

/** «às 09:05 (52 s)», ou '' se não confirmou. */
export function maosLavadasDaPresenca(observacao?: string): string {
  const m = (observacao || '').match(/Mãos lavadas (às [^|]*)/);
  return m ? m[1].trim() : '';
}

/** Uma vez por aparelho: volta a enviar as presenças guardadas aqui, agora
 *  com o aluno e a aula — as que foram antes da correção chegaram vazias. */
export function reenviarPresencasAntigas(): void {
  const CHAVE = 'ecl_presencas_reenviadas_v1';
  try { if (localStorage.getItem(CHAVE)) return; localStorage.setItem(CHAVE, new Date().toISOString()); } catch { return; }
  const limite = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
  load<any>(KEYS.presencas)
    .filter(r => r.alunoId && r.planoAulaId && String(r.data || '9999') >= limite)
    .forEach(r => emSegundoPlano(() => enviarPresenca(r)));
}


// Lê todas as presenças guardadas localmente
export function getPresencas(): RegistoPresenca[] {
  return semPlanosEliminados(load<RegistoPresenca>(KEYS.presencas));
}

/** O professor marcou falta a este aluno nesta aula ou atividade. Quem tem falta
 *  não se autoavalia nela (Rosa, 6/out/2026: uma aluna avaliou-se numa
 *  atividade a que faltou). */
export function temFaltaMarcada(alunoId: string, planoAulaId: string): boolean {
  const r: any = getPresencas().find(x => x.alunoId === alunoId && x.planoAulaId === planoAulaId);
  return r?.decisaoProfessor === 'falta_presenca';
}

// Para um aluno e uma UC, devolve os planos de aula dessa UC a que o aluno
// NÃO esteve presente (faltou) — usado para a Recuperação de Módulos.
export function getPlanosFaltadosPorUC(alunoId: string, ucId: string, turmaId: string): PlanoAula[] {
  // Só contam aulas que JÁ ACONTECERAM. Antes contava todos os planos
  // publicados da UC, incluindo os das semanas seguintes: publicava-se o
  // plano da próxima aula e o aluno aparecia logo com faltas — e com a UC
  // "por concluir". Plano de aula ≠ falta ≠ recuperação.
  const hoje = new Date().toISOString().slice(0, 10);
  const todosPlanosDaUC = getPlanosAula().filter(p =>
    p.ucId === ucId && p.turmaId === turmaId
    && (p.estado === 'publicado' || p.estado === 'realizada')
    && aulaJaAconteceu(p, hoje));
  const presencas = getPresencas().filter(r => r.alunoId === alunoId);
  return todosPlanosDaUC.filter(plano => {
    // O professor escolheu que esta atividade não conta faltas: nenhuma
    // conta, nem uma decisão marcada antes (ex.: aula que passou a evento).
    // A presença e a farda contam só como atitudes.
    if ((plano as any).contaAssiduidade === false) return false;
    const registo: any = presencas.find(r => r.planoAulaId === plano.id);
    if (registo?.decisaoProfessor === 'sem_falta') return false;
    if (registo?.decisaoProfessor === 'falta_presenca') return true;
    // Esteve parte da aula: as horas em falta contam-se à parte
    // (horasPerdidasPorAtraso), não a aula inteira.
    if (registo?.decisaoProfessor === 'parcial') return false;
    // Falta de atraso: o aluno esteve na aula, mesmo que o registo antigo
    // diga "não presente" (era assim gravado para quem não entrou na app).
    if (registo?.decisaoProfessor === 'falta_atraso') return false;
    // Aula que o professor nunca abriu não conta contra o aluno: sem a
    // aula aberta ele nem conseguia marcar presença. A responsabilidade é
    // do professor — só uma decisão explícita dele conta como falta.
    if (!getSessaoAula(plano.id)?.abertaEm) return false;
    // Aula aberta depois do dia marcado: só uma decisão do professor conta.
    if (aberturaTardia(plano.id)) return false;
    // Esteve na aula (mesmo atrasado) → não falta horas.
    if (registo?.presente) return false;
    return true;
  });
}

/** A aula já aconteceu: dia anterior a hoje, ou hoje com a aula fechada. */
function aulaJaAconteceu(p: PlanoAula, hoje: string): boolean {
  const d = String(p.data || '').slice(0, 10);
  if (!d) return false;
  if (d < hoje) return true;
  if (d === hoje) {
    // A aula de hoje só conta quando acaba: o professor fecha-a, ou passa a
    // hora de fim (com a aula aberta). Antes contava logo que era aberta —
    // e quem ainda estava a chegar, dentro dos 10 minutos, aparecia com
    // a aula toda em falta e o módulo "por recuperar".
    const s = getSessaoAula(p.id);
    if (s?.fechadaEm) return true;
    if (!s?.abertaEm) return false;
    const fim = String(p.horaFim || '').match(/(\d{1,2}):(\d{2})/);
    if (!fim) return false;
    const agora = new Date();
    return agora.getHours() * 60 + agora.getMinutes() >= Number(fim[1]) * 60 + Number(fim[2]);
  }
  return false;
}

/** Horas de um plano. Um dia inteiro (08:30–17:30) desconta a hora de almoço. */
/** (antes) Há hora de almoço (13h–14h) a descontar? Só nos planos que começam de
 *  manhã e acabam de tarde. Antes descontava-se em qualquer plano que
 *  passasse pelas 13h–14h: um plano de 2 h (12:30–14:30) ficava com 1 h,
 *  em dois blocos de meia hora, e faltar a um deles contava 0,5 h. */
// (Rosa, 5/out/2026) O almoço é sempre de 1 hora e começa entre as 12:00 e
// as 13:30, conforme a turma. O plano tem almoço lá dentro quando o almoço não
// pode ficar nem antes nem depois dele: começa antes das 13:00 e acaba depois
// das 13:30. Das 11:30 às 13:30 não há almoço (é depois); das 08:30 às 15:30 há.
// Um plano curto (menos de 3 h) nunca desconta.
function temAlmoco(ini: number, fim: number): boolean {
  return ini < 13 * 60 && fim > 13 * 60 + 30 && fim - ini >= 180;
}

export function horasDoPlano(p: PlanoAula): number {
  const min = (h?: string) => {
    if (!h) return NaN;
    const s = h.includes('T') ? new Date(h).toTimeString().slice(0, 5) : h.slice(0, 5);
    const [hh, mm] = s.split(':').map(Number);
    return hh * 60 + mm;
  };
  const ini = min(p.horaInicio), fim = min(p.horaFim);
  if (isNaN(ini) || isNaN(fim) || fim <= ini) return 0;
  let m = fim - ini;
  if (temAlmoco(ini, fim)) m -= 60;   // almoço
  return m / 60;
}

// ============================================================
// Recuperação — só em dois casos
// ============================================================
// O aluno só fica "em recuperação" quando:
//   1. faltou a mais de 10% das horas do módulo (presença abaixo de 90%), ou
//   2. o módulo já terminou e a nota não é positiva.
//
// Enquanto o módulo decorre, conhecimentos por avaliar, notas por lançar
// ou a simples existência de planos NÃO põem o aluno em recuperação.

export interface SituacaoRecuperacao {
  precisa: boolean;
  motivo: 'faltas' | 'negativa' | null;
  horasPrevistas: number;
  horasFaltadas: number;
  /** Horas da UC já dadas — é sobre estas que se contam as faltas. */
  horasDadas: number;
  /** 0–100 */
  presenca: number;
  terminou: boolean;
  nota20: number | null;
}

/** Faltas de um aluno numa UC, em horas, sobre as horas já dadas. */
export function faltasEmHorasUC(alunoId: string, turmaId: string, ucId: string):
  { horasPrevistas: number; horasFaltadas: number; horasDadas: number; presenca: number } {
  const mod = modulosDaTurma(turmaId).find(m => m.id === ucId);

  const planosDaUC = getPlanosAula().filter(p =>
    p.ucId === ucId && p.turmaId === turmaId
    && (p.estado === 'publicado' || p.estado === 'realizada'));

  // Horas do módulo: as do cronograma. Sem cronograma, as dos planos.
  const horasPrevistas = mod?.horasPrevistas
    || planosDaUC.reduce((s, p) => s + horasDoPlano(p), 0);

  // As faltas contam-se em horas, como na escola. Faltar à aula toda são
  // as horas todas; chegar duas horas atrasado são duas horas em falta.
  const faltados = getPlanosFaltadosPorUC(alunoId, ucId, turmaId);
  const idsFaltados = new Set(faltados.map(p => p.id));
  const horasFaltadas = faltados.reduce((s, p) => s + horasDoPlano(p), 0)
    + horasPerdidasPorAtraso(alunoId, ucId, turmaId, idsFaltados);

  // Os 10% contam-se sobre o TOTAL de horas da UC (as do cronograma), não
  // sobre as horas já dadas (decisão da Rosa, set/2026). Sem cronograma,
  // usam-se as horas dadas.
  const horasDadas = horasDadasDaUC(turmaId, ucId);
  const base = horasPrevistas > 0 ? horasPrevistas : horasDadas;
  const presenca = base > 0
    ? Math.max(0, Math.round((1 - horasFaltadas / base) * 100))
    : 100;
  return { horasPrevistas, horasFaltadas, horasDadas, presenca };
}

/** Uma falta de uma UC: em que aula, de que tipo, e quantas horas conta. */
export interface FaltaDaUC {
  planoId: string; data: string; titulo: string;
  tipo: 'falta' | 'parcial' | 'atraso';
  /** O que o professor decidiu ou o que aconteceu, em palavras. */
  descricao: string;
  horas: number;
  minutosAtraso?: number;
}

/**
 * As faltas do aluno numa UC, aula a aula — as mesmas contas da recuperação
 * (faltasEmHorasUC): a soma das horas é a mesma. Inclui os atrasos, mesmo os
 * que não chegam a uma hora (esses contam 0 h, mas o professor vê-os).
 */
export function faltasDaUC(alunoId: string, turmaId: string, ucId: string): FaltaDaUC[] {
  const hoje = new Date().toISOString().slice(0, 10);
  const faltados = getPlanosFaltadosPorUC(alunoId, ucId, turmaId);
  const idsFaltados = new Set(faltados.map(p => p.id));
  const presencas = getPresencas().filter(r => r.alunoId === alunoId);
  const out: FaltaDaUC[] = faltados.map(p => {
    const reg: any = presencas.find(r => r.planoAulaId === p.id);
    return { planoId: p.id, data: String(p.data || '').slice(0, 10), titulo: p.titulo || 'Aula', tipo: 'falta' as const,
      descricao: reg?.decisaoProfessor === 'falta_presenca' ? 'Falta de presença (decisão do professor)' : 'Faltou à aula',
      horas: horasDoPlano(p) };
  });
  getPlanosAula().filter(p => p.ucId === ucId && p.turmaId === turmaId
    && (p.estado === 'publicado' || p.estado === 'realizada')
    && (p as any).contaAssiduidade !== false && !idsFaltados.has(p.id) && aulaJaAconteceu(p, hoje))
    .forEach(p => {
      const reg: any = presencas.find(r => r.planoAulaId === p.id);
      if (!reg || reg.decisaoProfessor === 'sem_falta') return;
      const base = { planoId: p.id, data: String(p.data || '').slice(0, 10), titulo: p.titulo || 'Aula' };
      if (reg.decisaoProfessor === 'parcial') {
        const h = Math.max(0, horasDoPlano(p) - horasDosBlocos(p, reg.horasPresentes || []));
        if (h > 0) out.push({ ...base, tipo: 'parcial', descricao: 'Esteve só parte da aula', horas: h });
        return;
      }
      const minutos = Number(reg.atrasadoMins) || 0;
      if (atrasoConta(reg, p.id)) {
        out.push({ ...base, tipo: 'atraso',
          descricao: reg.decisaoProfessor === 'falta_atraso' ? 'Falta de atraso (decisão do professor)' : 'Chegou atrasado',
          horas: horasDoAtraso(reg, horasDoPlano(p)),
          ...(minutos > 0 ? { minutosAtraso: minutos } : {}) });
      }
    });
  return out.sort((a, b) => a.data.localeCompare(b.data));
}

export function situacaoRecuperacaoUC(alunoId: string, turmaId: string, ucId: string): SituacaoRecuperacao {
  const hoje = new Date().toISOString().slice(0, 10);
  const mod = modulosDaTurma(turmaId).find(m => m.id === ucId);
  const { horasPrevistas, horasFaltadas, horasDadas, presenca } = faltasEmHorasUC(alunoId, turmaId, ucId);
  const terminou = !!mod?.dataFim && mod.dataFim < hoje;

  // Nota final da UC: a da pauta oficial (a classificação atribuída pelo
  // professor, ou a sugerida pela pauta). Só interessa quando a UC acabou.
  const nota20: number | null = terminou ? (notaDaPautaUC(alunoId, turmaId, ucId)?.nota ?? null) : null;

  // 1. Faltas a partir de 10% do total de horas da UC.
  const baseFaltas = horasPrevistas > 0 ? horasPrevistas : horasDadas;
  if (baseFaltas > 0 && horasFaltadas >= baseFaltas * 0.10) {
    return { precisa: true, motivo: 'faltas', horasPrevistas, horasFaltadas, horasDadas, presenca, terminou, nota20 };
  }
  // 2. Módulo terminado sem positiva. Sem nenhuma avaliação não se decide
  //    por nota — seria pôr em recuperação quem ainda não foi avaliado.
  if (terminou && nota20 !== null && nota20 < 10) {
    return { precisa: true, motivo: 'negativa', horasPrevistas, horasFaltadas, horasDadas, presenca, terminou, nota20 };
  }
  return { precisa: false, motivo: null, horasPrevistas, horasFaltadas, horasDadas, presenca, terminou, nota20 };
}

// ── Recuperação de Módulos ──────────────────────────────────────
// Script dedicado de Recuperações/Evidências — deploy concluído em 21/06/2026.
export const SHEETS_RECUPERACAO_URL = SHEETS_ECL_URL || 'https://script.google.com/macros/s/AKfycbweU15FtVE5AIdl-kpV0PCmuNxYsd4pUIfdSLIAmVIal7z0Sb2oGimGgsjKHUHYxDML/exec';

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
  importancias?: number[], perguntas?: string[], possivelOral?: boolean
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
      possivelOral,
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
  // Só conta o que o professor validou. Antes contava também o que o aluno
  // disse na autoavaliação — bastava dizer "consegui" para somar.
  const historico = getHistoricoAvaliacoes().filter(r => r.alunoId === alunoId && r.ucId === ucId && r.validadoPor === 'professor');
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
  /** Aulas (validadas) com sucesso — nota 3 ou mais em 5. */
  sucessos?: number;
  /** Regra da escola: consolidada com 2 sucessos em aulas diferentes. */
  consolidada?: boolean;
  /** Média das notas do professor (1-5), a mesma conta do historial. */
  media?: number | null;
}

/** Sucessos precisos para uma competência estar consolidada (PARAMETROS_AVALIACAO). */
export const SUCESSOS_PARA_CONSOLIDAR = 2;

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
  // Quantas aulas (validadas) correram bem em cada competência. O nível
  // guarda o melhor resultado; a consolidação pede 2 sucessos — antes
  // uma só aula positiva já contava como "consolidada".
  const sucessos = new Map<string, number>();

  porAula.forEach((info, chave) => {
    // A autoavaliação alimenta, mas não valida: uma competência só entra
    // no perfil depois de o professor a confirmar. Sem isto, o aluno
    // aparecia com técnicas que ele próprio se deu e que nunca foram
    // vistas — e o perfil deixava de significar nada.
    const validada = info.validadoPor === 'professor'
      || info.validadoPor === 'recuperacao';
    if (!validada) return;

    const competenciaId = chave.split('__')[1];
    const nivel = notaParaNivel(info.nota);
    if (nivel >= 3) sucessos.set(competenciaId, (sucessos.get(competenciaId) || 0) + 1);
    const actual = porCompetencia.get(competenciaId);
    if (!actual || nivel > actual.nivel) {
      porCompetencia.set(competenciaId, {
        nivel, origem: info.validadoPor === 'recuperacao' ? 'recuperacao' : 'aula', data: info.data,
      });
    }
  });

  evidencias.forEach(e => {
    if (e.nivel >= 3) sucessos.set(e.competenciaId, (sucessos.get(e.competenciaId) || 0) + 1);
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
      sucessos: sucessos.get(competenciaId) || 0,
      consolidada: (sucessos.get(competenciaId) || 0) >= SUCESSOS_PARA_CONSOLIDAR,
      media: (() => { const ns = historico.filter(r => r.microcompetenciaId === competenciaId && r.validadoPor === 'professor').map(r => Number(r.nota)).filter(n => n > 0);
        return ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : null; })(),
    };
    if (grupo === 'tecnica') tecnicas.push(item);
    else if (grupo === 'responsabilidade') responsabilidades.push(item);
    else atitudes.push(item);
  });

  // Pontos fortes: nível 3-4. Áreas a desenvolver: nível 0-1.
  const todos = [...tecnicas, ...responsabilidades, ...atitudes];
  // Só entram no perfil as competências com verbo de ação. Um resultado
  // esperado ("produtos com cor viva") não serve como ponto forte: o aluno
  // não consegue reconhecer-se nele nem sabe o que treinar.
  const comVerbo = todos.filter(i => !!nomeComVerbo(i.nome, i.competenciaId));
  // Ponto forte só depois de consolidada (2 aulas com sucesso).
  const pontosFortes = comVerbo.filter(i => i.nivel >= 3 && i.consolidada).map(i => i.nome);
  const areasADesenvolver = comVerbo.filter(i => i.nivel <= 1).map(i => i.nome);

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
export const DESCONTO_POR_ATRASO = 0.1;   // por cada atraso registado
export const DESCONTO_POR_FALTA = 0.25;   // por cada aula da UC em que o aluno faltou
export const DESCONTO_POR_FARDA_INCOMPLETA = 0.1; // por cada aula com farda incompleta

export interface BonusAssiduidadeUC {
  pontualidade: number;    // 0 a 0.5
  assiduidade: number;     // 0 a 0.5
  fardamento: number;      // 0 a 1.0
  total: number;           // 0 a 2.0 — somar directamente à nota /20
  detalhe: { aulas: number; faltas: number; atrasos: number; fardaIncompleta: number };
}

export function calcularBonusAssiduidadeUC(alunoId: string, turmaId: string, ucId: string): BonusAssiduidadeUC {
  // Só aulas que já aconteceram e que o professor abriu. Antes contava
  // todos os planos publicados — os das semanas seguintes também — e o
  // aluno perdia bónus por aulas que ainda não tinham acontecido, ou que o
  // professor nunca abriu. O atraso conta a partir da abertura da aula; se
  // o professor não abriu, não há atraso nem falta a imputar ao aluno.
  const hoje = new Date().toISOString().slice(0, 10);
  const planosDaUC = getPlanosAulaPorTurma(turmaId)
    .filter(p => p.ucId === ucId && p.estado !== 'rascunho' && aulaJaAconteceu(p, hoje));
  const presencas = getPresencas().filter(p => p.alunoId === alunoId);

  let faltas = 0, atrasos = 0, fardaIncompleta = 0;

  planosDaUC.forEach(p => {
    const pres: any = presencas.find(x => x.planoAulaId === p.id);
    // Aula marcada como "não conta para a assiduidade" — o professor
    // criou-a depois de ela acontecer, e as faltas não são do aluno.
    if ((p as any).contaAssiduidade === false) return;
    const decisao = pres?.decisaoProfessor;
    // A decisão do professor manda.
    if (decisao === 'falta_presenca') { faltas++; return; }
    if (!getSessaoAula(p.id)?.abertaEm && !decisao) return;
    if (decisao === 'falta_atraso') { atrasos++; return; }
    // Aula aberta depois do dia: só conta o que o professor declarou.
    if (aberturaTardia(p.id) && !decisao) return;
    if (!pres || pres.presente === false) { faltas++; return; }
    if (atrasoConta(pres, p.id)) atrasos++;
    // Aula atitudinal não tem farda — não desconta.
    if (!pres.fardamentoOk && (p as any).tipoPlanAula !== 'atitudinal') fardaIncompleta++;
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
  ucId?: string; ucNome?: string; disciplina?: string;
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
  // Decisão do professor sobre possível defesa oral, tomada na criação.
  possivelOral?: boolean;
  // Guião de apoio completo (texto colado pelo professor) — vai em anexo.
  guiaoTexto?: string;
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
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(dados),
      redirect: 'follow',
    });
    const json = await res.json();
    return json;
  } catch (err) {
    return { ok: false, mensagem: 'Erro de ligação ao script de PDF.' };
  }
}


// ── Pauta de Avaliação FCT ──────────────────────────────────
export async function gerarPautaFCTViaScript(dados: {
  turma: string; disciplina: string; formador: string;
  ucId: string; uc: string; dataInicio: string; dataTermo: string;
  evidencias: { nome: string; peso: number }[];
  alunos: {
    numero: number; nome: string; numEvidencias: number;
    notasProdutos: number[]; cm: number; cl: number; co: number; cr: number;
    notaFinal: number;
  }[];
}): Promise<{ ok: boolean; pdfUrl?: string; mensagem?: string }> {
  if (!PAUTA_FCT_URL) return { ok: false, mensagem: 'URL da pauta não configurado.' };
  try {
    const res = await fetch(PAUTA_FCT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      redirect: 'follow',
      body: JSON.stringify(dados),
    });
    const json = await res.json();
    return json;
  } catch (err) {
    return { ok: false, mensagem: 'Erro de ligação ao script da pauta.' };
  }
}

function getNomeCompetenciaGenerica(id: string): string {
  if (id.startsWith('KNW-P') || id.startsWith('KNW-R-')) return nomeConhecimentoProf(id) || 'Conhecimento';
  if (id.startsWith('OBR_')) {
    const o = OBRIGATORIAS.find(x => x.id === id);
    return o?.nome || id;
  }
  if (id.startsWith('ATT_') || id.startsWith('ATI-')) {
    const a = ATITUDES.find(x => x.id === id);
    return a?.nome || id;
  }
  const m = encontrarMicro(id);
  // Subtécnicas, aparelhos, aptidões… (SUB-, APP-, APT-): o nome vem do referencial.
  if (!m) { try { return nomeCompetencia(id) || id; } catch { return id; } }

  // O `nome` de um perfil técnico é o RESULTADO ESPERADO — "produtos com
  // cor viva", "forma definida, exterior dourado e interior macio". Fora
  // do contexto da técnica e da matéria-prima isso não diz nada ao aluno.
  // Uma competência tem de ter verbo e objeto: "cozer arroz solto".
  // Quando o nome não tem verbo, procura-se a técnica-mãe.
  return nomeComVerbo(m.nome, id) || m.nome;
}

/** Um nome sem verbo de ação não é uma competência — é um resultado. */
const VERBOS_TECNICA = [
  'prepar','confec','cozer','cozinh','assar','grelh','fritar','saltear','refog',
  'reduz','ligar','emulsion','bater','montar','amass','levedar','laminar','cortar',
  'picar','descasc','limpar','filet','desoss','marinar','temper','escalf','branque',
  'brasear','estufar','gratin','flamb','caramel','clarific','coar','escum','glacear',
  'napar','panar','recheia','selar','tornear','triturar','peneir','pesar','porcion',
  'acondicion','conserv','arrefec','congel','regener','etiquet','empratar','decorar',
  'elaborar','calcular','planific','higieniz','desinfet','rececion','armazen',
];

function nomeComVerbo(nome: string, id: string): string | null {
  const n = nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (VERBOS_TECNICA.some(v => n.startsWith(v) || n.includes(' ' + v))) return nome;

  // Sem verbo: tentar a técnica-mãe pelo id (SUB-COR-030-001 → TEC-COR-030).
  const m = id.match(/^SUB-([A-Z]+)-(\d+)/);
  if (m) {
    const tec = encontrarMicro(`TEC-${m[1]}-${m[2]}`);
    if (tec?.nome) return tec.nome;
  }
  return null;
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
// Versão 2 (19/07/2026): passa a incluir também TODAS as outras chaves
// ecl_* do localStorage em "extras" (eventos, matérias-primas custom,
// técnicas custom, manual do cozinheiro, tombstones, avisos, etc.) —
// antes ficavam de fora e perdiam-se num restauro.
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
  /** Todas as restantes chaves ecl_* do localStorage, em bruto (v2+). */
  extras?: Record<string, string>;
}

// Chaves já cobertas pelos campos estruturados acima — não repetir em extras.
const CHAVES_ESTRUTURADAS = new Set<string>([
  KEYS.alunos, KEYS.planos, KEYS.fichas, KEYS.distribuicoes, KEYS.checklists,
  KEYS.requisicoes, KEYS.comandas, KEYS.selecoes, KEYS.validacoes,
  KEYS.atividades, KEYS.presencas, KEYS.recuperacoes, KEYS.evidencias,
  KEY_HIST,
]);

export function exportarTudo(): CopiaSeguranca {
  // Capturar todas as outras chaves ecl_* (eventos, custom, manual, avisos,
  // tombstones, rascunhos...) tal como estão — o restauro repõe-nas em bruto.
  const extras: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith('ecl_')) continue;
      if (CHAVES_ESTRUTURADAS.has(k)) continue;
      if (k === KEY_ULTIMO_BACKUP) continue; // timestamp local — não faz sentido exportar
      const v = localStorage.getItem(k);
      if (v !== null) extras[k] = v;
    }
  } catch { /* extras são bónus — o export estruturado segue na mesma */ }

  return {
    versao: 2,
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
    extras,
  };
}

// Descarrega a cópia de segurança como ficheiro .json no computador do professor.
// Regista também o timestamp do backup — é isto que desbloqueia a limpeza de
// dados de teste (limparDadosTesteSeguro recusa-se a correr sem backup recente).
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
  try { localStorage.setItem(KEY_ULTIMO_BACKUP, new Date().toISOString()); } catch {}
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
  // Extras (v2+) — chaves ecl_* em bruto. No modo 'substituir' repõem-se
  // sempre; no modo 'juntar' só preenchem chaves que ainda não existem
  // localmente (não há forma genérica de fazer merge de conteúdo bruto).
  if (dados.extras) {
    Object.entries(dados.extras).forEach(([k, v]) => {
      if (!k.startsWith('ecl_')) return; // segurança — nunca escrever fora do espaço ecl_
      try {
        if (modo === 'substituir' || localStorage.getItem(k) === null) {
          localStorage.setItem(k, v);
        }
      } catch { /* uma chave a mais não pode rebentar o restauro */ }
    });
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

  // Preços desatualizados. São recolhidos à mão no mercado e não se
  // atualizam sozinhos — ao fim de um mês as requisições passam a sair
  // com custos errados e ninguém repara.
  const precos = estadoDosPrecos();
  if (precos.desatualizados) {
    avisos.push({
      id: `op_precos_${precos.maisRecente}`,
      tipo: 'outro',
      titulo: `Preços por atualizar há ${precos.mesesDesdeAtualizacao} ${precos.mesesDesdeAtualizacao === 1 ? 'mês' : 'meses'}`,
      descricao: precos.mensagem,
      contexto: { tabDestino: 'requisicao' },
      resolvido: false,
      criadoEm: new Date().toISOString(),
    } as Aviso);
  }

  // Pedidos de ajuda dos alunos, com o relatório do telemóvel deles.
  pedidosDeAjuda().forEach(a => {
    const al = getAlunos().find(x => x.id === a.alunoId);
    avisos.push({
      id: `op_${a.id}`, tipo: 'outro',
      titulo: a.titulo.startsWith('Entrou noutro')
        ? `${al?.nome || a.alunoId} (${a.turmaId}) entrou noutro telemóvel ou browser`
        : `${al?.nome || a.alunoId} (${a.turmaId}) pede ajuda: ${a.titulo}`,
      descricao: `Enviado a ${new Date(a.em).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}.\n`
        + a.linhas.join('\n'),
      contexto: { tabDestino: 'planos' },
      resolvido: false, criadoEm: a.em,
    } as Aviso);
  });

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

  // Sumários e faltas por passar à eSchooling (a partir das 18h do dia da aula).
  try {
    if (perfilDoAparelho !== 'aluno' && perfilDoAparelho !== 'coordenadora' && nomeDoAparelho) {
      const pend = planosParaESchooling(nomeDoAparelho), n = pend.length;
      if (n > 0 && (new Date().getHours() >= 18 || pend.some(x => String(x.data).slice(0, 10) < new Date().toISOString().slice(0, 10)))) {
        avisos.push({ id: `op_eschooling_${new Date().toISOString().slice(0, 10)}_${n}`, tipo: 'outro',
          titulo: `${n} aula${n === 1 ? '' : 's'} por passar para a eSchooling`,
          descricao: 'Sumários e faltas prontos. Em «Para a eSchooling», copie o pedido para a extensão Claude no Chrome.',
          contexto: { tabDestino: 'eschooling' }, resolvido: false, criadoEm: new Date().toISOString() } as any);
      }
    }
  } catch { /* */ }

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
  const novo = { ...a, id: `aviso_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, resolvido: false, criadoEm: new Date().toISOString() } as Aviso;
  all.push(novo);
  save(KEYS.avisos, all);
  partilharAvisoDaCoordenacao(novo);
}

// Os avisos para a coordenação (sugestões de ingredientes dos professores)
// ficavam só no aparelho do professor que os criou: a coordenadora nunca
// os via (Rosa, out/2026: «os avisos no coordenador não estão a
// funcionar»). Vão agora para a base de dados, e voltam de lá resolvidos.
let sugestoesAntigasPartilhadas = false;
function partilharAvisoDaCoordenacao(a: Aviso | undefined): void {
  if (a && a.tipo === 'sugestao_ingrediente') gravarNaBase('aviso_coord', { ...a, atualizadoEm: new Date().toISOString() } as any);
}
function juntarAvisosDaCoordenacao(lista: any[]): void {
  const all = getAvisos();
  let mudou = false;
  for (const x of lista) {
    if (!x?.id || x.tipo !== 'sugestao_ingrediente') continue;
    const { gravadoNaBaseEm: _g, turmaId: _t, ...av } = x;
    const i = all.findIndex(a => a.id === x.id);
    if (i < 0) { all.push(av as Aviso); mudou = true; }
    else if (av.resolvido && !all[i].resolvido) { all[i] = { ...all[i], resolvido: true, resolvidoEm: av.resolvidoEm }; mudou = true; }
  }
  if (mudou) save(KEYS.avisos, all);
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
    partilharAvisoDaCoordenacao(all[idx]);
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
/** Os preços revistos pela coordenadora vão para o Sheets (folha PRECOS),
 *  todos de uma vez, para os outros aparelhos os usarem. */
export function enviarPrecosRevistos(lista: PrecoRevisto[]): void {
  if (!lista.length || !SHEETS_ECL_URL) return;
  enviar(SHEETS_ECL_URL, 'precos', { precos: lista });
}

/** Os preços gravados estão mesmo no Sheets (folha PRECOS)? O envio não traz
 *  resposta (limitação do Google), por isso vai-se ler a folha e confere-se
 *  preço a preço, durante cerca de 1 minuto (Rosa, out/2026: «ter a certeza
 *  que vai para o Sheets»). Devolve os que ainda lá não estão. */
export async function confirmarPrecosNoSheets(lista: PrecoRevisto[], aoTentar?: (faltam: number) => void): Promise<PrecoRevisto[]> {
  let faltam = lista.slice();
  for (const espera of [4000, 6000, 10000, 15000, 20000]) {
    await new Promise(r => setTimeout(r, espera));
    const json: any = await lerDoSheets(SHEETS_ECL_URL, { tipo: 'get_precos' }).catch(() => null);
    if (!json?.ok) continue;
    const noSheets = new Map<string, any>((json.dados || json.precos || []).map((p: any) => [String(p.id), p]));
    faltam = faltam.filter(p => {
      const s = noSheets.get(String(p.id));
      return !s || String(s.atualizadoEm || '') < String(p.atualizadoEm || '')
        || Math.abs((Number(s.precoEmbalagem) || 0) - (Number(p.precoEmbalagem) || 0)) > 0.001;
    });
    aoTentar?.(faltam.length);
    if (!faltam.length) break;
  }
  return faltam;
}

// ── Preços a rever — o professor desconfia de um preço ────────────
// O preço que o professor escreve na requisição vale só nessa requisição:
// não passa à frente do preço da coordenadora. Fica numa lista a rever
// (aqui e no Sheets, folha PRECOS_A_REVER) e a coordenadora vê-a no
// separador Preços; no pedido seguinte à IA, estes produtos vão primeiro.

export interface PrecoARever {
  /** Um registo por produto: o código da base, ou "novo:<nome>". */
  id: string;
  mpId: string;
  nome: string;
  /** O nome como estava na ficha. */
  produto: string;
  und: string;
  precoBase: number;
  precoProfessor: number;
  professor: string;
  turmaId: string;
  sugeridoEm: string;
  estado: 'pendente' | 'revisto';
  revistoEm?: string;
  /** Escolhido pelo professor no catálogo da Makro (só vale na requisição dele
   *  até a coordenação dizer «manter definitivamente»). */
  produtoMakro?: string;
  codigoMakro?: string;
  embalagemMakro?: string;
}

const KEY_PRECOS_A_REVER = 'ecl_precos_a_rever';

export function getPrecosARever(): PrecoARever[] {
  return load<PrecoARever>(KEY_PRECOS_A_REVER);
}

export function getPrecosAReverPendentes(): PrecoARever[] {
  return getPrecosARever().filter(p => p.estado === 'pendente')
    .sort((a, b) => (b.sugeridoEm || '').localeCompare(a.sugeridoEm || ''));
}

const momentoDe = (p: PrecoARever) => (p.estado === 'revisto' ? p.revistoEm : p.sugeridoEm) || '';

/** Junta registos (do Sheets ou deste aparelho): o mais recente de cada produto ganha. */
export function juntarPrecosARever(lista: any[]): void {
  const porId = new Map(getPrecosARever().map(p => [p.id, p]));
  (lista || []).forEach((x: any) => {
    if (!x || !x.id) return;
    const novo: PrecoARever = {
      ...x, id: String(x.id), precoBase: Number(x.precoBase) || 0, precoProfessor: Number(x.precoProfessor) || 0,
      estado: x.estado === 'revisto' ? 'revisto' : 'pendente',
    };
    const velho = porId.get(novo.id);
    if (!velho || momentoDe(novo) >= momentoDe(velho)) porId.set(novo.id, novo);
  });
  save(KEY_PRECOS_A_REVER, [...porId.values()]);
}

/** Vai buscar ao Sheets a lista a rever (e os preços do mês), para o ecrã da coordenadora. */
export async function lerPrecosDoSheets(): Promise<boolean> {
  if (!SHEETS_ECL_URL) return false;
  try {
    const [precos, aRever] = await Promise.all([
      lerDoSheets(SHEETS_ECL_URL, { tipo: 'get_precos' }),
      lerDoSheets(SHEETS_ECL_URL, { tipo: 'get_precos_a_rever' }),
    ]);
    if (precos?.ok && precos.dados?.length > 0) juntarPrecosRevistos(precos.dados);
    if (aRever?.ok && aRever.dados?.length > 0) juntarPrecosARever(aRever.dados);
    return !!(precos?.ok || aRever?.ok);
  } catch { return false; }
}

/** O professor escreveu um preço diferente: fica a rever pela coordenadora. */
export function sinalizarPrecoARever(p: Omit<PrecoARever, 'id' | 'sugeridoEm' | 'estado'>): void {
  const reg: PrecoARever = {
    ...p, id: p.mpId || `novo:${p.nome.toLowerCase().trim()}`,
    sugeridoEm: new Date().toISOString(), estado: 'pendente',
  };
  juntarPrecosARever([reg]);
  if (SHEETS_ECL_URL) enviar(SHEETS_ECL_URL, 'precos_a_rever', { precosARever: [reg] });
}

/** A coordenadora reviu estes produtos (com a IA ou à mão): saem da lista. */
export function marcarPrecosRevistos(ids: string[]): void {
  const agora = new Date().toISOString();
  const revistos = getPrecosARever()
    .filter(p => p.estado === 'pendente' && ids.includes(p.id))
    .map(p => ({ ...p, estado: 'revisto' as const, revistoEm: agora }));
  if (!revistos.length) return;
  juntarPrecosARever(revistos);
  if (SHEETS_ECL_URL) enviar(SHEETS_ECL_URL, 'precos_a_rever', { precosARever: revistos });
}

export function getMateriasPrimasCustom(): MateriaPrimaCustom[] {
  return load<MateriaPrimaCustom>(KEYS.materiasPrimasCustom);
}

export function addOrUpdateMateriaPrimaCustom(m: Omit<MateriaPrimaCustom, 'id' | 'criadoEm' | 'atualizadoEm'> & { id?: string }): MateriaPrimaCustom {
  const all = getMateriasPrimasCustom();
  const agora = new Date().toISOString();
  const idExistente = m.id || all.find(x => x.nome.toLowerCase() === m.nome.toLowerCase())?.id;
  const idx = idExistente ? all.findIndex(x => x.id === idExistente) : -1;
  const registo: MateriaPrimaCustom = {
    id: idExistente || novoId('mp_custom'),
    nome: m.nome, categoria: m.categoria || 'Outros',
    unidadeCompra: m.unidadeCompra, precoKg: m.precoKg, precoUnitario: m.precoUnitario,
    aliases: m.aliases || [],
    criadoEm: idx >= 0 ? all[idx].criadoEm : agora,
    atualizadoEm: agora,
  };
  if (idx >= 0) all[idx] = registo; else all.push(registo);
  save(KEYS.materiasPrimasCustom, all);
  // Para todos os aparelhos (base de dados) e para o arquivo (Sheets). Antes
  // ficava só neste aparelho e perdia-se com o browser (Rosa, out/2026).
  enviar(SHEETS_ECL_URL, 'materia_prima', registo as any);
  return registo;
}

const KEY_MP_ELIMINADAS = 'ecl_materias_primas_eliminadas';
const KEY_MP_PARTILHADAS = 'ecl_materias_primas_partilhadas';

export function eliminarMateriaPrimaCustom(id: string): void {
  save(KEYS.materiasPrimasCustom, getMateriasPrimasCustom().filter(m => m.id !== id));
  save(KEY_MP_ELIMINADAS, [...new Set([...load<string>(KEY_MP_ELIMINADAS), id])]);
  enviar(SHEETS_ECL_URL, 'eliminar_materia_prima', { id });
}

/** Junta matérias-primas vindas de outros aparelhos (base ou Sheets): fica a mais recente. */
export function juntarMateriasPrimas(lista: any[]): void {
  const fora = new Set(load<string>(KEY_MP_ELIMINADAS));
  lista.filter(x => x?.eliminado && x.id).forEach(x => fora.add(String(x.id)));
  save(KEY_MP_ELIMINADAS, [...fora]);
  const m = new Map(getMateriasPrimasCustom().map(x => [x.id, x]));
  for (const x of lista) {
    if (!x?.id || x.eliminado || !x.nome) continue;
    const velho = m.get(x.id);
    if (!velho || String(x.atualizadoEm || '') >= String(velho.atualizadoEm || '')) {
      m.set(x.id, { ...x, precoKg: Number(x.precoKg) || 0, precoUnitario: Number(x.precoUnitario) || 0,
        aliases: Array.isArray(x.aliases) ? x.aliases : String(x.aliases || '').split('|').filter(Boolean) });
    }
  }
  save(KEYS.materiasPrimasCustom, [...m.values()].filter(x => !fora.has(x.id)));
}

/** A tabela de preços completa, como a aplicação a usa: a base, com os preços
 *  revistos por cima, e as matérias-primas da escola. */
export function tabelaDePrecosCompleta() {
  const revistos = new Map(getPrecosRevistos().map(p => [p.id, p]));
  return [
    ...getMateriaPrimasBase().map(m => {
      const r = revistos.get(m.id);
      return { id: m.id, nome: m.nome, categoria: m.categoria, unidadeCompra: m.unidadeCompra,
        precoKg: r?.precoKg || m.precoKg, precoUnitario: r?.precoUnidade || m.precoUnitario,
        origem: r ? 'revisto pela coordenação' : 'tabela base', fonte: r ? (r.produtoContinente || m.fonte) : m.fonte,
        atualizadoEm: r?.atualizadoEm || m.atualizadoEm };
    }),
    ...getMateriasPrimasCustom().map(m => ({ id: m.id, nome: m.nome, categoria: m.categoria || 'Outros', unidadeCompra: m.unidadeCompra,
      precoKg: m.precoKg, precoUnitario: m.precoUnitario, origem: 'acrescentada pela escola', fonte: '', atualizadoEm: (m as any).atualizadoEm || '' })),
  ];
}
const KEY_TABELA_PRECOS_ENVIADA = 'ecl_tabela_precos_enviada';
/** Envia a tabela de preços para o Sheets (folha TABELA_PRECOS, script v23),
 *  só quando mudou desde a última vez. Um pedido só, com tudo. */
// (out/2026) As notas de cada aluno, como a aplicação as calcula, vão para o
// Sheets: a nota de cada aula (com a conta de hoje), a média da UC (com o peso
// de cada aula e as faltas a 0), o bónus e a nota da UC. Assim o Sheets mostra
// exatamente o que o professor e o aluno veem na aplicação (Rosa: o Sheets
// fazia a média simples e dava outro número).
const KEY_NOTAS_ENVIADAS = 'ecl_notas_app_enviadas';
export function enviarNotasDaTurma(turmaId: string, forcar = false): void {
  // A nota da UC que vai para o Sheets é a mesma que o professor e o aluno
  // veem (a conta da pauta, com as aulas sem autoavaliação a 0) — Rosa, 5/out/2026.
  import('./pautaUC').then(m => enviarNotasDaTurmaCom(turmaId, forcar, m.notaDaUCComDecimas))
    .catch(() => enviarNotasDaTurmaCom(turmaId, forcar, null));
}
function enviarNotasDaTurmaCom(turmaId: string, forcar: boolean,
  notaComoNaPauta: ((a: string, t: string, u: string) => number | null) | null): void {
  try {
    if (!SHEETS_ECL_URL || !turmaId) return;
    const planos = getPlanosAula().filter(p => p.turmaId === turmaId && !(p as any).tipoEvento && p.estado !== 'arquivado');
    const ucs = [...new Set(planos.map(p => p.ucId).filter(Boolean) as string[])];
    const alunos = getAlunos().filter(a => a.turmaId === turmaId && a.ativo !== false);
    const validacoes = getValidacoes();
    const agora = new Date().toISOString();
    const linhas: any[] = [];
    for (const a of alunos) for (const uc of ucs) {
      const c = notaFinalUC(a.id, turmaId, uc);
      const porAula: Record<string, number> = {};
      planos.filter(p => p.ucId === uc).forEach(p => {
        const n = notaDaAulaValidada(validacaoDaAula(a.id, p.id, validacoes));
        if (n !== null) porAula[p.id] = Math.round(n * 10) / 10;
      });
      // A atividade obrigatória fora das horas da aula conta como mais uma aula
      // (Rosa, 6/out/2026): vai com a sua nota, como na aplicação (falta = 0).
      for (const l of aulasDaNotaUC(a.id, turmaId, uc)) {
        if (getPlanosAula().some((x: any) => x.id === l.planoId && x.tipoEvento)) porAula[l.planoId] = Math.round(l.nota * 10) / 10;
      }
      if (c.final === null && !Object.keys(porAula).length) continue;
      linhas.push({ id: `${turmaId}|${a.id}|${uc}`, turmaId, alunoId: a.id, nomeAluno: a.nome || '', ucId: uc,
        media: c.base === null ? '' : Math.round(c.base * 10) / 10,
        bonus: Math.round(((c.bonusParticipacao || 0) + (c.bonusAssiduidade || 0)) * 100) / 100,
        final: (() => { const n = notaComoNaPauta ? notaComoNaPauta(a.id, turmaId, uc) : c.final;
          return n === null || n === undefined ? '' : Math.round(n * 10) / 10; })(),
        faltas: getPlanosFaltadosPorUC(a.id, uc, turmaId).length,
        // As faltas em horas, sobre o total de horas da UC (a regra dos 10%),
        // para o Sheets mostrar o mesmo que a aplicação (Rosa, 5/out/2026).
        ...(() => { const h = faltasEmHorasUC(a.id, turmaId, uc);
          return { horasFaltadas: Math.round(h.horasFaltadas * 10) / 10, horasUC: Math.round((h.horasPrevistas || h.horasDadas) * 10) / 10 }; })(),
        porAula: JSON.stringify(porAula), atualizadoEm: agora });
    }
    if (!linhas.length) return;
    const assinatura = linhas.map(l => `${l.id}:${l.media}:${l.bonus}:${l.final}:${l.faltas}:${l.horasFaltadas}:${l.horasUC}:${l.porAula}`).join('|');
    const chave = KEY_NOTAS_ENVIADAS + '|' + turmaId;
    let anterior = '';
    try { anterior = localStorage.getItem(chave) || ''; } catch { /* */ }
    const resumo = String(assinatura.length) + ':' + [...assinatura].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7);
    if (!forcar && anterior === resumo) return;
    enviar(SHEETS_ECL_URL, 'notas_app', { linhas } as any);
    try { localStorage.setItem(chave, resumo); } catch { /* */ }
  } catch (e) { console.warn('[notas] não enviei', e); }
}

export function enviarTabelaDePrecos(forcar = false): void {
  try {
    if (!SHEETS_ECL_URL) return;
    const linhas = tabelaDePrecosCompleta();
    const assinatura = linhas.length + '|' + linhas.map(l => `${l.id}:${l.precoKg}:${l.precoUnitario}`).join(',').length
      + '|' + linhas.reduce((s, l) => s + (Number(l.precoKg) || 0) + (Number(l.precoUnitario) || 0), 0).toFixed(2);
    if (!forcar && localStorage.getItem(KEY_TABELA_PRECOS_ENVIADA) === assinatura) return;
    enviar(SHEETS_ECL_URL, 'tabela_precos', { linhas } as any);
    localStorage.setItem(KEY_TABELA_PRECOS_ENVIADA, assinatura);
  } catch { /* */ }
}

/** Uma vez por aparelho: as que já cá estavam antes de se partilharem vão para todos. */
export function partilharMateriasPrimasAntigas(): void {
  try {
    if (localStorage.getItem(KEY_MP_PARTILHADAS)) return;
    getMateriasPrimasCustom().forEach(m => enviar(SHEETS_ECL_URL, 'materia_prima', m as any));
    localStorage.setItem(KEY_MP_PARTILHADAS, new Date().toISOString());
  } catch { /* */ }
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
    id: idExistente || novoId('tec_custom'),
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

// 'trabalho'  → enunciado do trabalho de conhecimento, para os alunos
// 'relatorio' → avaliação devolvida ao aluno depois de o professor validar
export type TipoPublicacaoClassroom =
  | 'plano' | 'ficha' | 'guiao' | 'competencias' | 'requisicao' | 'evento'
  | 'trabalho' | 'relatorio';

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

// ============================================================
// Sessão de aula — abertura pelo professor
// ============================================================
// Nota honesta sobre segurança: a especificação pede que o servidor
// recuse escritas antes da sessão abrir. Esta aplicação não tem
// servidor — é localStorage com sincronização para o Sheets. O bloqueio
// aqui é de aplicação, não de servidor: resolve o uso normal de uma
// turma, mas quem abrir a consola do browser consegue contorná-lo.
// Para garantia a sério seria preciso um backend a validar.

const KEY_SESSOES = 'ecl_sessoes_aula';

export function getSessoesAula(): SessaoAula[] {
  return semPlanosEliminados(load<SessaoAula>(KEY_SESSOES as any));
}

export function getSessaoAula(planoAulaId: string): SessaoAula | undefined {
  return getSessoesAula().find(s => s.planoAulaId === planoAulaId);
}

/**
 * O professor abre a aula. É daqui que contam os dez minutos.
 *
 * Escreve para o Sheets além do aparelho: o professor abre no computador
 * dele e o aluno lê no tablet. Sem isto a abertura ficava só num sítio e
 * o aluno esperava para sempre.
 */
export function abrirSessaoAula(
  planoAulaId: string, turmaId: string, professor: string,
  toleranciaMin = TOLERANCIA_PADRAO_MIN
): SessaoAula {
  const existente = getSessaoAula(planoAulaId);
  // Idempotente: abrir duas vezes não reinicia a contagem.
  if (existente?.abertaEm) return existente;

  const nova: SessaoAula = {
    planoAulaId, turmaId,
    abertaEm: new Date().toISOString(),
    abertaPor: professor,
    toleranciaMin,
  };
  save(KEY_SESSOES as any, [...getSessoesAula().filter(s => s.planoAulaId !== planoAulaId), nova]);
  // Abrir uma aula num dia em que a turma não tem aulas (uma reposição, uma
  // troca) é dizer que houve aula: conta nas horas, nas notas e nas faltas,
  // na aplicação e no Sheets (Rosa, 5/out/2026).
  const doPlano = getPlanosAula().find(p => p.id === planoAulaId);
  if (doPlano && planoNumDiaSemAulas(doPlano)) atualizarPlano(planoAulaId, { diaSemAulasOk: String(doPlano.data).slice(0, 10) } as any);

  enviarAberturaJa(nova);
  // Confere se chegou; se não, volta a enviar de 10 em 10 segundos.
  vigiarAbertura(planoAulaId);
  return nova;
}

/** A abertura vai sozinha e logo, fora dos pacotes: um pacote grande
 *  (fichas, avaliações) prendia-a na fila do script. */
function enviarAberturaJa(s: SessaoAula): Promise<void> {
  const plano = getPlanosAula().find(p => p.id === s.planoAulaId);
  paraABase('sessao', { planoAulaId: s.planoAulaId, turmaId: plano?.turmaId || s.turmaId,
    abertaEm: s.abertaEm, abertaPor: s.abertaPor, toleranciaMin: s.toleranciaMin });
  return enviarAgora(SHEETS_HISTORICO_URL, {
    tipo: 'sessao', planoAulaId: s.planoAulaId, turmaId: plano?.turmaId || s.turmaId,
    abertaEm: s.abertaEm, abertaPor: s.abertaPor, toleranciaMin: s.toleranciaMin,
  }, true);
}

// ── A abertura chegou aos alunos? ─────────────────────────────
// Antes confirmava-se três vezes em 15 segundos e depois só de minuto a
// minuto, sem dizer nada: o professor ficava 4 minutos à espera sem saber.
// Agora tenta-se de 10 em 10 segundos durante 3 minutos, e o ecrã mostra
// o que se passa: «a enviar», «chegou», ou um aviso a vermelho.
export interface EstadoAbertura { estado: 'a_enviar' | 'atrasada' | 'chegou' | 'nao_chegou'; tentativas: number }
const aberturas = new Map<string, EstadoAbertura>();
const aVigiarAbertura = new Map<string, Promise<boolean>>();
const ouvintesAbertura = new Set<() => void>();
export function estadoAbertura(planoAulaId: string): EstadoAbertura | undefined { return aberturas.get(planoAulaId); }
export function subscreverAbertura(fn: () => void): () => void { ouvintesAbertura.add(fn); return () => { ouvintesAbertura.delete(fn); }; }
function mudarAbertura(id: string, e: EstadoAbertura) { aberturas.set(id, e); ouvintesAbertura.forEach(f => { try { f(); } catch { /* */ } }); }
/** A abertura chegou à base (Firebase): os alunos já a têm. Antes o aviso só
 *  confiava no Sheets e podia ficar a vermelho com a aula já nos telemóveis. */
const aberturasNaBase = new Set<string>();
function aberturaNaBase(id: string) { aberturasNaBase.add(id); mudarAbertura(id, { estado: 'chegou', tentativas: 1 }); }

async function aberturaEstaNoSheets(planoAulaId: string): Promise<boolean | null> {
  // Com o script v19, confere-se na aula que os telemóveis leem (rápido).
  const s = getSessaoAula(planoAulaId);
  const plano = getPlanosAula().find(p => p.id === planoAulaId);
  const naAula = await aberturaNaAula(plano?.turmaId || s?.turmaId || '', planoAulaId).catch(() => null);
  if (naAula !== null) return naAula;
  const json: any = await lerDoSheets(SHEETS_HISTORICO_URL, { tipo: 'get_sessoes', turmaId: '' });
  if (!json?.ok) return null;
  return (json.sessoes || json.dados || []).some((x: any) => String(x.planoAulaId) === planoAulaId && x.abertaEm);
}

export function vigiarAbertura(planoAulaId: string): Promise<boolean> {
  const jaVigia = aVigiarAbertura.get(planoAulaId);
  if (jaVigia) return jaVigia;
  const p = (async () => {
    const ESPERAS = [3000, 5000, ...Array(17).fill(10000)];   // ~3 minutos
    for (let i = 0; i < ESPERAS.length; i++) {
      if (aberturasNaBase.has(planoAulaId)) { mudarAbertura(planoAulaId, { estado: 'chegou', tentativas: i + 1 }); return true; }
      mudarAbertura(planoAulaId, { estado: i < 3 ? 'a_enviar' : 'atrasada', tentativas: i + 1 });
      await new Promise(r => setTimeout(r, ESPERAS[i]));
      if (aberturasNaBase.has(planoAulaId)) { mudarAbertura(planoAulaId, { estado: 'chegou', tentativas: i + 1 }); return true; }
      const s = getSessaoAula(planoAulaId);
      if (!s?.abertaEm) { aberturas.delete(planoAulaId); return false; }   // anulada entretanto
      let la: boolean | null = null;
      try { la = await aberturaEstaNoSheets(planoAulaId); } catch { la = null; }
      if (la) { mudarAbertura(planoAulaId, { estado: 'chegou', tentativas: i + 1 }); return true; }
      await enviarAberturaJa(s);
    }
    mudarAbertura(planoAulaId, { estado: 'nao_chegou', tentativas: ESPERAS.length });
    return false;
  })();
  aVigiarAbertura.set(planoAulaId, p);
  p.finally(() => aVigiarAbertura.delete(planoAulaId));
  return p;
}

/**
 * Lê as sessões do Sheets e junta-as ao que está no aparelho.
 * O aluno chama isto ao abrir o plano, e vai repetindo enquanto espera.
 */
export async function sincronizarSessoes(turmaId: string): Promise<void> {
  // Todas as sessões, não só as da turma: a sessão encontra-se pelo plano.
  // Uma aula aberta com a turma errada (a do menu do professor, e não a do
  // plano) nunca chegava aos alunos. A folha é pequena — uma linha por aula.
  const json = await lerDoSheets(SHEETS_HISTORICO_URL, { tipo: 'get_sessoes', turmaId: '' });
  if (!json?.sessoes?.length) return;

  const locais = getSessoesAula();
  const porId = new Map(locais.map(s => [s.planoAulaId, s]));

  for (const r of json.sessoes) {
    if (!r?.planoAulaId) continue;
    porId.set(r.planoAulaId, juntarSessao(porId.get(r.planoAulaId), r, turmaId));
  }
  save(KEY_SESSOES as any, [...porId.values()]);
}

/**
 * Junta a abertura deste aparelho com a que veio de fora. A mais antiga
 * ganha (é a que iniciou a contagem), mas uma abertura anulada não vale:
 * uma anulação apaga as aberturas iguais ou anteriores a ela, e uma
 * abertura depois da anulação volta a valer (Rosa, 5/out/2026).
 */
function juntarSessao(ex: SessaoAula | undefined, r: any, turmaId: string): SessaoAula {
  const anuladaEm = [ex?.anuladaEm, r?.anuladaEm].filter(Boolean).sort().pop() || '';
  const vale = (a?: string) => !!a && (!anuladaEm || a > anuladaEm);
  const aberturas = [ex?.abertaEm, r?.abertaEm].filter(vale).sort() as string[];
  const abertaEm = aberturas[0] || '';
  const daAbertura = abertaEm && abertaEm === r?.abertaEm ? r : ex;
  const fecho = [ex?.fechadaEm, r?.fechadaEm].filter(f => !!f && !!abertaEm && f > abertaEm).sort().pop() || '';
  return {
    planoAulaId: String(r?.planoAulaId || ex?.planoAulaId), turmaId: r?.turmaId || ex?.turmaId || turmaId,
    abertaEm, abertaPor: abertaEm ? (daAbertura?.abertaPor || '') : '',
    toleranciaMin: Number(daAbertura?.toleranciaMin) || TOLERANCIA_PADRAO_MIN,
    fechadaEm: fecho, fechadaPor: fecho ? (r?.fechadaEm === fecho ? r?.fechadaPor : ex?.fechadaPor) : '',
    ...(anuladaEm ? { anuladaEm } : {}),
  };
}

/**
 * Anula a abertura de uma aula aberta por engano (Rosa, 5/out/2026: «abri uma
 * aula que era só para amanhã»). A aula fica como se nunca tivesse sido
 * aberta: os alunos deixam de a ver aberta e, quando se abrir no dia certo,
 * os dez minutos contam a partir daí. As entradas dos alunos nessa abertura
 * saem também (no aparelho e no Sheets).
 */
export function anularAberturaAula(planoAulaId: string, professor: string): void {
  const s = getSessaoAula(planoAulaId);
  const plano = getPlanosAula().find(p => p.id === planoAulaId);
  const turmaId = plano?.turmaId || s?.turmaId || '';
  const anuladaEm = new Date().toISOString();
  const tumulo: SessaoAula = { planoAulaId, turmaId, abertaEm: '', abertaPor: '', toleranciaMin: s?.toleranciaMin || TOLERANCIA_PADRAO_MIN,
    fechadaEm: '', fechadaPor: '', anuladaEm, anuladaPor: professor };
  save(KEY_SESSOES as any, [...getSessoesAula().filter(x => x.planoAulaId !== planoAulaId), tumulo]);
  save(KEYS.presencas, load<any>(KEYS.presencas).filter(p => p.planoAulaId !== planoAulaId));
  aberturas.delete(planoAulaId); aberturasNaBase.delete(planoAulaId);
  paraABase('sessao', { ...tumulo });
  enviar(SHEETS_HISTORICO_URL, 'anular_sessao', { planoAulaId, turmaId, anuladaEm, anuladaPor: professor });
}

/** A aula é de outro dia (amanhã, por exemplo): pergunta antes de abrir. */
export function diasAteAAula(plano: PlanoAula): number {
  const dia = String(plano?.data || '').slice(0, 10);
  if (!dia) return 0;
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Lisbon' });
  return Math.round((new Date(dia + 'T12:00:00').getTime() - new Date(hoje + 'T12:00:00').getTime()) / 86400000);
}

export function fecharSessaoAula(planoAulaId: string, professor: string): void {
  const fechadaEm = new Date().toISOString();
  const all = getSessoesAula().map(s =>
    s.planoAulaId === planoAulaId ? { ...s, fechadaEm, fechadaPor: professor } : s
  );
  save(KEY_SESSOES as any, all);
  enviar(SHEETS_HISTORICO_URL, 'fechar_sessao', { planoAulaId, fechadaEm, fechadaPor: professor });
}

export interface EstadoTolerancia {
  aberta: boolean;
  abertaEm?: string;
  limiteEm?: string;
  minutosRestantes: number;
  /** true depois de passado o limite — quem entrar agora fica atrasado. */
  foraDeTempo: boolean;
  /** Nesta aula não há atrasos (aberta depois do dia, ou o professor assim o disse ao abrir). */
  semAtrasos?: boolean;
}

/** Estado da janela de tolerância, num dado momento. */
export function estadoTolerancia(planoAulaId: string, agora = new Date()): EstadoTolerancia {
  const s = getSessaoAula(planoAulaId);
  if (!s?.abertaEm) {
    return { aberta: false, minutosRestantes: 0, foraDeTempo: false };
  }
  // Aula aberta depois do dia marcado (para os alunos se autoavaliarem):
  // ninguém chega atrasado a uma aula que já passou (Rosa, out/2026).
  if (aberturaTardia(planoAulaId) || (Number(s.toleranciaMin) || 0) >= SEM_ATRASOS_MIN)
    return { aberta: true, abertaEm: s.abertaEm, minutosRestantes: 0, foraDeTempo: false, semAtrasos: true };
  const abertura = new Date(s.abertaEm);
  const limite = new Date(abertura.getTime() + s.toleranciaMin * 60000);
  const restam = Math.max(0, Math.ceil((limite.getTime() - agora.getTime()) / 60000));

  return {
    aberta: true,
    abertaEm: s.abertaEm,
    limiteEm: limite.toISOString(),
    minutosRestantes: restam,
    // No instante exato do limite já conta como atraso.
    foraDeTempo: agora.getTime() >= limite.getTime(),
  };
}

/** O aluno pode gravar registos nesta aula? */
export function podeRegistar(planoAulaId: string): boolean {
  return !!getSessaoAula(planoAulaId)?.abertaEm;
}

/**
 * Marca presença. A aplicação NÃO decide o tipo de falta — regista os
 * factos e sinaliza quando a entrada foi fora do tempo. A decisão é do
 * professor, que escolhe entre sem falta, falta de atraso ou falta de
 * presença.
 *
 * Isto protege o aluno de duas coisas: de uma falha de sincronização
 * lhe dar uma falta que não merece, e de o professor não poder corrigir
 * um caso com justificação.
 *
 * Um registo só por aluno e plano.
 */
export function marcarPresenca(
  alunoId: string, planoAulaId: string, turmaId: string, ucId?: string
): { foraDeTempo: boolean; minutosAposAbertura: number; jaExistia: boolean } | null {
  const t = estadoTolerancia(planoAulaId);
  if (!t.aberta) return null;

  const jaTem = getPresencas().find(p => p.alunoId === alunoId && p.planoAulaId === planoAulaId);
  if (jaTem) {
    return {
      foraDeTempo: jaTem.atrasado,
      minutosAposAbertura: jaTem.atrasadoMins,
      jaExistia: true,
    };
  }

  const agora = new Date();
  const abertura = new Date(t.abertaEm!);
  const minutos = Math.max(0, Math.round((agora.getTime() - abertura.getTime()) / 60000));

  addRegistoPresenca({
    alunoId, turmaId, planoAulaId,
    presente: true,
    // `atrasado` aqui significa "entrou fora da janela", não "tem falta".
    // A falta é o campo decisaoProfessor, e só o professor a define.
    atrasado: t.foraDeTempo,
    atrasadoMins: minutos,
    observacao: t.foraDeTempo ? 'Entrou fora da janela — por decidir' : '',
  });

  return { foraDeTempo: t.foraDeTempo, minutosAposAbertura: minutos, jaExistia: false };
}

export type DecisaoFalta = 'sem_falta' | 'falta_atraso' | 'falta_presenca' | 'parcial';

export const LABEL_DECISAO: Record<DecisaoFalta, string> = {
  sem_falta:      'Sem falta',
  falta_atraso:   'Falta de atraso',
  falta_presenca: 'Falta de presença',
  parcial:        'Só algumas horas',
};

/** As horas de um plano, uma a uma ("13:00"), sem a hora de almoço. */
export function blocosDeHoraDoPlano(p: PlanoAula): { inicio: string; fim: string }[] {
  const min = (h?: string) => {
    if (!h) return NaN;
    const x = h.includes('T') ? new Date(h).toTimeString().slice(0, 5) : h.slice(0, 5);
    const [hh, mm] = x.split(':').map(Number);
    return hh * 60 + mm;
  };
  const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const ini = min(p.horaInicio), fim = min(p.horaFim);
  if (isNaN(ini) || isNaN(fim) || fim <= ini) return [];
  // Os tempos da escola são de hora e meia ou de uma hora (Rosa, set/2026):
  // cada parte da aula (manhã e tarde, se houver almoço) divide-se em tempos
  // de hora e meia quando dá certo (4h30 = 3 tempos); senão, de uma hora.
  // A hora de almoço nos tempos: das 13:00 às 14:00, ou mais cedo se o plano
  // acabar antes das 14:00 (entre as 12:00 e as 13:30 começa sempre).
  const iniAlmoco = Math.max(12 * 60, Math.min(13 * 60, fim - 60));
  const partes: [number, number][] = (temAlmoco(ini, fim) ? [[ini, iniAlmoco], [iniAlmoco + 60, fim]] as [number, number][] : [[ini, fim]] as [number, number][])
    .filter(([a, b]) => b > a);
  const blocos: { inicio: string; fim: string }[] = [];
  for (const [a, b] of partes) {
    // O maior número de tempos de hora e meia, e o resto em tempos de uma hora
    // (3h30 = 1h30 + 1h + 1h). Se nada der certo, tempos de uma hora.
    const dur = b - a;
    let n90 = Math.floor(dur / 90);
    while (n90 > 0 && (dur - n90 * 90) % 60 !== 0) n90--;
    const tempos = (dur - n90 * 90) % 60 === 0
      ? [...Array(n90).fill(90), ...Array((dur - n90 * 90) / 60).fill(60)]
      : Array(Math.ceil(dur / 60)).fill(60);
    let m = a;
    for (const t of tempos) {
      const f = Math.min(m + t, b);
      blocos.push({ inicio: hm(m), fim: hm(f) });
      m = f;
    }
  }
  return blocos;
}

/** Horas (com frações) em que o aluno esteve, pelos blocos escolhidos. */
export function horasDosBlocos(p: PlanoAula, inicios: string[]): number {
  const mins = (a: string, b: string) => {
    const [h1, m1] = a.split(':').map(Number), [h2, m2] = b.split(':').map(Number);
    return (h2 * 60 + m2) - (h1 * 60 + m1);
  };
  const blocos = blocosDeHoraDoPlano(p);
  const atuais = blocos.filter(b => inicios.includes(b.inicio))
    .reduce((t, b) => t + mins(b.inicio, b.fim) / 60, 0);
  // Marcações antigas eram em blocos de uma hora: um início que já não é o
  // de um tempo conta como a hora que era.
  const antigos = inicios.filter(i => !blocos.some(b => b.inicio === i)).length;
  return Math.min(horasDoPlano(p), atuais + antigos);
}

/** Entradas fora da janela que o professor ainda não decidiu. */
export function presencasPorDecidir(planoAulaId: string): RegistoPresenca[] {
  return getPresencas().filter(p =>
    p.planoAulaId === planoAulaId &&
    p.atrasado &&
    !(p as any).decisaoProfessor
  );
}

/** O professor decide o tipo de falta. Pode voltar atrás quando quiser. */
export function decidirFalta(
  alunoId: string, planoAulaId: string, decisao: DecisaoFalta, professor: string, nota?: string,
  /** Só com 'parcial': o início de cada hora em que o aluno esteve ("09:00"). */
  horasPresentes?: string[]
): void {
  const all = load<RegistoPresenca>(KEYS.presencas);
  let reg: any = all.find(p => p.alunoId === alunoId && p.planoAulaId === planoAulaId);

  // Aluno que não entrou não tinha registo — e a decisão perdia-se. Agora
  // cria-se o registo com a decisão do professor.
  if (!reg) {
    const aluno = getAlunos().find(a => a.id === alunoId);
    const plano = getPlanosAula().find(p => p.id === planoAulaId);
    reg = {
      id: `presenca_${alunoId}_${planoAulaId}_${Date.now()}`,
      alunoId, turmaId: aluno?.turmaId || plano?.turmaId || '', planoAulaId,
      ucId: plano?.ucId || '', presente: false, atrasado: false, atrasadoMins: 0,
      horaEntrada: '', fardamentoOk: false, observacao: '',
      data: String(plano?.data || '').slice(0, 10),
    };
    all.push(reg);
  }
  Object.assign(reg, {
    decisaoProfessor: decisao,
    decididoPor: professor,
    decididoEm: new Date().toISOString(),
    observacao: nota ?? reg.observacao,
    // Falta de presença anula a presença. "Sem falta", "falta de atraso"
    // e "só algumas horas" querem dizer que o aluno ESTEVE na aula — antes
    // a falta de atraso de quem não tinha entrado na aplicação ficava como
    // ausência, e contava as horas todas do dia.
    presente: decisao === 'falta_presenca' ? false
      : decisao === 'parcial' ? (horasPresentes || []).length > 0
      : true,
    horasPresentes: decisao === 'parcial' ? [...(horasPresentes || [])] : undefined,
  });
  save(KEYS.presencas, all);

  // Para o Sheets — a mesma linha do aluno nesta aula é atualizada, e os
  // outros aparelhos do professor passam a ver a decisão.
  const aluno = getAlunos().find(a => a.id === alunoId);
  const plano = getPlanosAula().find(p => p.id === planoAulaId);
  enviar(SHEETS_HISTORICO_URL, 'presenca', {
    alunoId, planoAulaId, turmaId: reg.turmaId,
    nomeAluno: aluno?.nome || ('Aluno ' + (aluno?.numero || 0)), numero: aluno?.numero || 0,
    planoTitulo: plano?.titulo || '', ucId: reg.ucId,
    presente: reg.presente, atrasado: !!reg.atrasado, atrasadoMins: reg.atrasadoMins || 0,
    horaEntrada: reg.horaEntrada || '', fardamentoOk: !!reg.fardamentoOk,
    data: reg.data || '', decisaoProfessor: decisao, decididoPor: professor, decididoEm: reg.decididoEm,
    horasPresentes: reg.horasPresentes || null,
    observacao: reg.observacao || '',
  });
}

/**
 * «Confirmar as presenças»: volta a enviar para o Sheets todas as decisões
 * desta aula e guarda no plano quem confirmou e quando. Antes não havia
 * forma de fechar esta parte, e a professora marcava as faltas várias vezes
 * sem saber se tinham ficado (Rosa, set/2026).
 */
export function confirmarPresencasDaAula(planoAulaId: string, professor: string): number {
  const regs = load<any>(KEYS.presencas).filter(r => r.planoAulaId === planoAulaId && r.decisaoProfessor);
  regs.forEach(r => decidirFalta(r.alunoId, planoAulaId, r.decisaoProfessor, r.decididoPor || professor, undefined, r.horasPresentes));
  const plano: any = getPlanosAula().find(p => p.id === planoAulaId);
  if (plano) addOrUpdatePlanoAula({ ...plano, presencasConfirmadasEm: new Date().toISOString(), presencasConfirmadasPor: professor, atualizadoEm: new Date().toISOString() });
  return regs.length;
}

// ── Líder do KitchenFlow ──────────────────────────────────────
// Num grupo, os registos são feitos uma vez. O professor escolhe quem
// os faz naquela aula; os outros consultam e veem que já está feito.
// Assim não há registos repetidos nem trabalho duplicado.

const KEY_LIDERES = 'ecl_lideres_kf';

export interface LiderKitchenFlow {
  planoAulaId: string;
  /** Vazio quando é um líder para a turma toda. */
  grupoId?: string;
  alunoId: string;
  definidoPor: string;
  definidoEm: string;
}

export function getLideresKF(planoAulaId: string): LiderKitchenFlow[] {
  return load<LiderKitchenFlow>(KEY_LIDERES as any)
    .filter(l => l.planoAulaId === planoAulaId);
}

/** Define ou troca o líder. Trocar não apaga os registos já feitos. */
export function definirLiderKF(
  planoAulaId: string, alunoId: string, professor: string, grupoId?: string
): void {
  const todos = load<LiderKitchenFlow>(KEY_LIDERES as any)
    .filter(l => !(l.planoAulaId === planoAulaId && (l.grupoId ?? '') === (grupoId ?? '')));
  const definidoEm = new Date().toISOString();
  save(KEY_LIDERES as any, [...todos, {
    planoAulaId, grupoId, alunoId, definidoPor: professor, definidoEm,
  }]);
  // O aluno tem de saber que foi escolhido — e os colegas, que não são.
  enviar(SHEETS_HISTORICO_URL, 'lider_kf', {
    planoAulaId, grupoId: grupoId || '', alunoId, definidoPor: professor, definidoEm,
    // A turma, para a base de dados saber onde o pôr.
    turmaId: getPlanosAula().find(p => p.id === planoAulaId)?.turmaId || '',
  });
}

/** Junta líderes vindos do Sheets ou da base: fica o mais recente de cada grupo. */
function juntarLideres(lista: any[]): void {
  const locais = load<LiderKitchenFlow>(KEY_LIDERES as any);
  const chave = (l: any) => `${l.planoAulaId}__${l.grupoId ?? ''}`;
  const porChave = new Map(locais.map(l => [chave(l), l]));
  for (const r of lista) {
    if (!r?.planoAulaId) continue;
    const k = `${r.planoAulaId}__${r.grupoId || ''}`;
    const atual = porChave.get(k);
    // Fica o mais recente: o professor pode ter trocado de líder.
    if (!atual || (r.definidoEm && r.definidoEm > atual.definidoEm)) {
      porChave.set(k, { planoAulaId: r.planoAulaId, grupoId: r.grupoId || undefined, alunoId: r.alunoId,
        definidoPor: r.definidoPor, definidoEm: r.definidoEm });
    }
  }
  save(KEY_LIDERES as any, [...porChave.values()].filter(l => l.alunoId));
}

/** Lê os líderes do Sheets. Chamado na sincronização geral. */
export async function sincronizarLideresKF(turmaId: string): Promise<void> {
  const json = await lerDoSheets(SHEETS_HISTORICO_URL, { tipo: 'get_lideres_kf', turmaId });
  if (!json?.lideres?.length) return;
  juntarLideres(json.lideres);
}

/** Este aluno é quem faz os registos do KitchenFlow nesta aula? */
export function ehLiderKF(alunoId: string, planoAulaId: string, grupoId?: string): boolean {
  const lideres = getLideresKF(planoAulaId);
  if (lideres.length === 0) return true;   // sem líder definido, cada um faz o seu
  return lideres.some(l => l.alunoId === alunoId && (l.grupoId ?? '') === (grupoId ?? ''));
}

/** Quem é o líder, para mostrar aos colegas quem fez os registos. */
export function liderKFdoGrupo(planoAulaId: string, grupoId?: string): string | undefined {
  return getLideresKF(planoAulaId)
    .find(l => (l.grupoId ?? '') === (grupoId ?? ''))?.alunoId;
}

// ============================================================
// Arranque do ano letivo
// ============================================================
// Tudo o que foi feito antes do arranque foi simulação: fichas,
// guiões, planos, requisições, autoavaliações e presenças. A aplicação
// nunca chegou a ser usada por alunos.
//
// A limpeza existente só apagava o que tinha prefixo "seed_", e o que
// foi feito à mão a testar não tem esse prefixo — é indistinguível de
// dados reais. Esta apaga por data: tudo o que é anterior ao arranque.
//
// NÃO APAGA: alunos, turmas, manuais, cronograma, referencial nem
// biblioteca de técnicas. Só o trabalho de aula.

export interface PreviewArranque {
  planos: number;
  fichas: number;
  requisicoes: number;
  avaliacoes: number;
  presencas: number;
  selecoes: number;
  validacoes: number;
  atividades: number;
  /** O que fica intacto. */
  alunosMantidos: number;
  turmasMantidas: number;
}

/** Mostra o que a limpeza vai apagar, antes de apagar. */
export function previewArranqueAno(dataArranque: string): PreviewArranque {
  const antes = (d?: string) => !d || d.slice(0, 10) < dataArranque;
  return {
    planos:      getPlanosAula().filter(p => antes(p.data)).length,
    fichas:      getFichasProducao().length,
    requisicoes: getRequisicoes().length,
    avaliacoes:  getHistoricoAvaliacoes().filter(r => antes(r.data)).length,
    presencas:   getPresencas().filter(p => antes(p.data)).length,
    selecoes:    getSelecoes().length,
    validacoes:  getValidacoes().length,
    atividades:  getAtividades().filter(a => antes(a.data)).length,
    alunosMantidos: getAlunos().length,
    turmasMantidas: getTurmas().length,
  };
}

/**
 * Apaga o trabalho de aula anterior ao arranque do ano.
 * @param dataArranque  'AAAA-MM-DD' — tudo antes desta data sai
 * @param confirmacao   tem de ser exatamente 'APAGAR' — evita cliques enganados
 */
export function limparParaArranqueAno(
  dataArranque: string, confirmacao: string
): { ok: boolean; erro?: string; apagado?: PreviewArranque } {
  if (confirmacao !== 'APAGAR') {
    return { ok: false, erro: 'Confirmação inválida. Escrever APAGAR em maiúsculas.' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataArranque)) {
    return { ok: false, erro: 'Data inválida. Formato AAAA-MM-DD.' };
  }

  const apagado = previewArranqueAno(dataArranque);
  const antes = (d?: string) => !d || d.slice(0, 10) < dataArranque;

  // Cópia de segurança antes de mexer — se algo correr mal, dá para voltar.
  try {
    const backup = {
      em: new Date().toISOString(),
      motivo: `arranque do ano letivo em ${dataArranque}`,
      planos: getPlanosAula(),
      fichas: getFichasProducao(),
      requisicoes: getRequisicoes(),
      historico: getHistoricoAvaliacoes(),
      presencas: getPresencas(),
      selecoes: getSelecoes(),
      validacoes: getValidacoes(),
      atividades: getAtividades(),
    };
    localStorage.setItem('ecl_backup_pre_arranque', JSON.stringify(backup));
  } catch { /* se não couber, segue — o essencial é a limpeza */ }

  save(KEYS.planos,      getPlanosAula().filter(p => !antes(p.data)));
  save(KEYS.fichas,      []);   // as fichas não têm data — saem todas
  save(KEYS.requisicoes, []);
  save(KEY_HIST,         getHistoricoAvaliacoes().filter(r => !antes(r.data)));
  save(KEYS.presencas,   getPresencas().filter(p => !antes(p.data)));
  save(KEYS.selecoes,    []);
  save(KEYS.validacoes,  []);
  save(KEYS.atividades,  getAtividades().filter(a => !antes(a.data)));

  return { ok: true, apagado };
}

/** Repõe o que foi apagado, se ainda houver cópia. */
export function reporArranqueAno(): { ok: boolean; erro?: string } {
  try {
    const raw = localStorage.getItem('ecl_backup_pre_arranque');
    if (!raw) return { ok: false, erro: 'Não há cópia de segurança.' };
    const b = JSON.parse(raw);
    save(KEYS.planos, b.planos ?? []);
    save(KEYS.fichas, b.fichas ?? []);
    save(KEYS.requisicoes, b.requisicoes ?? []);
    save(KEY_HIST, b.historico ?? []);
    save(KEYS.presencas, b.presencas ?? []);
    save(KEYS.selecoes, b.selecoes ?? []);
    save(KEYS.validacoes, b.validacoes ?? []);
    save(KEYS.atividades, b.atividades ?? []);
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: String(e) };
  }
}

// ============================================================
// Assiduidade no perfil
// ============================================================
// Faltar não é só perder a nota da aula: é um comportamento, e há
// atitudes que isso atinge — responsabilidade e respeito pelas regras.
//
// O perfil tem de mostrar isso ao aluno, para ele perceber o que tem
// de melhorar, e ao professor, para ter o registo à frente quando
// avalia as atitudes.

export interface Assiduidade {
  aulasPrevistas: number;
  presencas: number;
  faltas: number;
  faltasComDecisao: number;
  atrasos: number;
  percentagemPresenca: number;
  /** Aulas em que esteve mas não se autoavaliou. */
  semAutoavaliacao: number;
}

export function assiduidadeNaUC(alunoId: string, turmaId: string, ucId?: string): Assiduidade {
  // Só contam as aulas que JÁ ACONTECERAM. Um plano publicado para daqui
  // a três semanas também está "publicado" — contá-lo dava faltas por
  // aulas que ainda não houve. Um aluno na primeira aula aparecia com
  // quatro faltas.
  const hoje = new Date().toISOString().slice(0, 10);
  // As mesmas regras da recuperação (getPlanosFaltadosPorUC): só aulas que
  // já aconteceram; uma aula que o professor nunca abriu não conta contra
  // o aluno; a decisão do professor manda. Antes a aula de hoje contava
  // como falta antes de começar.
  const presencas = getPresencas().filter(p => p.alunoId === alunoId);
  const planos = getPlanosAulaPorTurma(turmaId)
    .filter(p => !ucId || (p as any).ucId === ucId)
    .filter(p => p.estado === 'publicado' || p.estado === 'realizada')
    .filter(p => aulaJaAconteceu(p, hoje))
    .filter(p => {
      const dec = (presencas.find(r => r.planoAulaId === p.id) as any)?.decisaoProfessor;
      if (dec) return true;
      return (p as any).contaAssiduidade !== false && !!getSessaoAula(p.id)?.abertaEm && !aberturaTardia(p.id);
    });
  const selecoes = getSelecoes().filter(s => s.alunoId === alunoId);

  let comPresenca = 0, atrasos = 0, semAuto = 0, comDecisao = 0;
  for (const plano of planos) {
    const pres: any = presencas.find(p => p.planoAulaId === plano.id);
    if (pres?.presente || pres?.decisaoProfessor === 'sem_falta' || pres?.decisaoProfessor === 'falta_atraso') {
      comPresenca++;
      if (atrasoConta(pres, plano.id)) atrasos++;
      if (!selecoes.some(s => s.planoAulaId === plano.id)) semAuto++;
    }
    if (pres?.decisaoProfessor) comDecisao++;
  }

  const faltas = planos.length - comPresenca;
  return {
    aulasPrevistas: planos.length,
    presencas: comPresenca,
    faltas,
    faltasComDecisao: comDecisao,
    atrasos,
    percentagemPresenca: planos.length ? Math.round((comPresenca / planos.length) * 100) : 100,
    semAutoavaliacao: semAuto,
  };
}

// ── Assiduidade em horas ─────────────────────────────────────
// Na escola as faltas contam-se em horas: cada hora do plano de aula é
// uma hora de falta, e um atraso conta as horas perdidas. É a mesma conta
// da recuperação (situacaoRecuperacaoUC), para o perfil e as recuperações
// dizerem sempre o mesmo ao aluno.

/** Horas da UC que já foram dadas: planos publicados de aulas que já aconteceram. */
export function horasDadasDaUC(turmaId: string, ucId: string): number {
  const hoje = new Date().toISOString().slice(0, 10);
  return getPlanosAula()
    .filter(p => p.ucId === ucId && p.turmaId === turmaId
      && (p.estado === 'publicado' || p.estado === 'realizada')
      && aulaJaAconteceu(p, hoje))
    .reduce((s, p) => s + horasDoPlano(p), 0);
}

export interface AssiduidadeHorasUC {
  ucId: string;
  horasPrevistas: number;
  horasDadas: number;
  horasFaltadas: number;
  /** 10% das horas previstas — acima disto o aluno fica em recuperação. */
  limite: number;
  acimaDoLimite: boolean;
}

export function assiduidadeEmHoras(alunoId: string, turmaId: string): {
  horasDadas: number; horasFaltadas: number; presenca: number; porUC: AssiduidadeHorasUC[];
} {
  const ucs = [...new Set(getPlanosAulaPorTurma(turmaId).map(p => p.ucId).filter(Boolean))] as string[];
  const porUC = ucs.map(ucId => {
    const s = situacaoRecuperacaoUC(alunoId, turmaId, ucId);
    return {
      ucId,
      horasPrevistas: s.horasPrevistas,
      horasDadas: horasDadasDaUC(turmaId, ucId),
      horasFaltadas: s.horasFaltadas,
      // 10% do total de horas da UC — a mesma regra do alerta do professor.
      limite: (s.horasPrevistas > 0 ? s.horasPrevistas : horasDadasDaUC(turmaId, ucId)) * 0.10,
      acimaDoLimite: s.motivo === 'faltas',
    };
  }).filter(u => u.horasDadas > 0 || u.horasFaltadas > 0);
  const horasDadas = porUC.reduce((t, u) => t + u.horasDadas, 0);
  const horasFaltadas = porUC.reduce((t, u) => t + u.horasFaltadas, 0);
  return {
    horasDadas, horasFaltadas, porUC,
    presenca: horasDadas > 0 ? Math.max(0, Math.round((1 - horasFaltadas / horasDadas) * 100)) : 100,
  };
}

/** O que a assiduidade diz sobre as atitudes — para o perfil do aluno
 *  e para o professor ter à frente quando avalia. */
export function leituraAssiduidade(a: Assiduidade): {
  texto: string;
  atitudesAfetadas: string[];
  grave: boolean;
} {
  if (a.aulasPrevistas === 0) {
    // As horas contam todas as aulas dadas; aqui só as que o professor abriu na
    // aplicação. Dizia «ainda não houve aulas» ao lado de «12 h dadas» (out/2026).
    return { texto: 'Ainda não há aulas com as presenças registadas na aplicação.', atitudesAfetadas: [], grave: false };
  }
  if (a.faltas === 0 && a.atrasos === 0) {
    return {
      texto: `Estiveste presente nas ${a.presencas} aulas, sempre a horas. `
           + 'A assiduidade é uma das coisas que mais conta num profissional de cozinha.',
      atitudesAfetadas: [], grave: false,
    };
  }

  const partes: string[] = [];
  const atitudes: string[] = [];

  if (a.faltas > 0) {
    partes.push(`Faltaste a ${a.faltas} de ${a.aulasPrevistas} aulas`);
    // Uma aula sem produção não gera nota: é zero na aula inteira.
    partes.push(` — essas aulas contam zero, porque não houve trabalho para avaliar`);
    atitudes.push('ATI-001', 'ATI-015');
  }
  if (a.atrasos > 0) {
    partes.push(`${partes.length ? ' e chegaste' : 'Chegaste'} atrasado ${a.atrasos} ${a.atrasos === 1 ? 'vez' : 'vezes'}`);
    if (!atitudes.includes('ATI-001')) atitudes.push('ATI-001');
  }
  if (a.semAutoavaliacao > 0) {
    partes.push(`. Em ${a.semAutoavaliacao} ${a.semAutoavaliacao === 1 ? 'aula' : 'aulas'}, estiveste presente, mas não te autoavaliaste, por isso perdeste a oportunidade de dizer como te correu a aula`);
  }

  return {
    texto: partes.join('') + '.',
    atitudesAfetadas: atitudes,
    grave: a.percentagemPresenca < 75,
  };
}

// ============================================================
// KitchenFlow por fase (inicial/final) e checklist da ficha
// ============================================================
// Guardados por aluno e plano, campo a campo — não um booleano geral.
// Isto é o que a especificação chama SheetProgress e KitchenFlowRecord.

const KEY_KF_FASE = 'ecl_kf_fases';
const KEY_CHECKLIST = 'ecl_checklist_ficha';

export interface RegistoKFFase {
  alunoId: string;
  planoAulaId: string;
  fase: 'inicial' | 'final';
  campos: CampoKF[];
  concluidoEm?: string;
}

export function getRegistoKFFase(
  alunoId: string, planoAulaId: string, fase: 'inicial' | 'final'
): RegistoKFFase | undefined {
  return load<RegistoKFFase>(KEY_KF_FASE as any)
    .find(r => r.alunoId === alunoId && r.planoAulaId === planoAulaId && r.fase === fase);
}

/** Guarda o registo. Cada chamada persiste logo — não há botão de
 *  "concluir" que decida por si: o estado sai dos campos obrigatórios. */
export function guardarKFFase(r: RegistoKFFase): void {
  const outros = load<RegistoKFFase>(KEY_KF_FASE as any)
    .filter(x => !(x.alunoId === r.alunoId && x.planoAulaId === r.planoAulaId && x.fase === r.fase));
  const obrigatoriosFeitos = r.campos.filter(c => c.obrigatorio).every(c => c.feito);
  save(KEY_KF_FASE as any, [...outros, {
    ...r,
    concluidoEm: obrigatoriosFeitos ? (r.concluidoEm ?? new Date().toISOString()) : undefined,
  }]);
}

export function kfFaseCompleta(alunoId: string, planoAulaId: string, fase: 'inicial' | 'final'): boolean {
  const r = getRegistoKFFase(alunoId, planoAulaId, fase);
  return !!r?.concluidoEm;
}

/** Checklist da ficha técnica. Guarda cada passo assim que é marcado. */
export interface RegistoChecklistFicha {
  alunoId: string;
  planoAulaId: string;
  fichaId: string;
  passos: PassoChecklistFicha[];
}

export function getChecklistFicha(
  alunoId: string, planoAulaId: string, fichaId: string
): RegistoChecklistFicha | undefined {
  return load<RegistoChecklistFicha>(KEY_CHECKLIST as any)
    .find(r => r.alunoId === alunoId && r.planoAulaId === planoAulaId && r.fichaId === fichaId);
}

/** Guarda um passo isolado — não a checklist toda. Abrir o guião a meio
 *  e voltar não pode perder o que já estava marcado. */
export function marcarPassoChecklist(
  alunoId: string, planoAulaId: string, fichaId: string,
  passoId: string, feito: boolean
): void {
  const todos = load<RegistoChecklistFicha>(KEY_CHECKLIST as any);
  const atual = todos.find(r =>
    r.alunoId === alunoId && r.planoAulaId === planoAulaId && r.fichaId === fichaId
  );
  const passos = atual?.passos ?? [];
  const idx = passos.findIndex(p => p.id === passoId);
  const novoPasso: PassoChecklistFicha = {
    id: passoId, label: passos[idx]?.label ?? passoId, feito,
    em: feito ? new Date().toISOString() : undefined,
  };
  const novosPassos = idx >= 0
    ? passos.map((p, i) => i === idx ? novoPasso : p)
    : [...passos, novoPasso];

  const outros = todos.filter(r => !(
    r.alunoId === alunoId && r.planoAulaId === planoAulaId && r.fichaId === fichaId
  ));
  save(KEY_CHECKLIST as any, [...outros, { alunoId, planoAulaId, fichaId, passos: novosPassos }]);
}

// ============================================================
// Recuperar fichas que perderam o conteúdo
// ============================================================
// Durante um período, a leitura do Sheets forçava ingredientes e
// preparação a vazio quando a ficha chegava pela primeira vez a um
// aparelho. O professor abria uma ficha antiga e encontrava só o nome.
//
// A leitura já está corrigida, mas as fichas que ficaram vazias
// continuam vazias. Isto procura-as e diz o que se pode fazer.

export interface FichaIncompleta {
  id: string;
  nomePrato: string;
  temIngredientes: boolean;
  temPreparacao: boolean;
  planoAulaId?: string;
}

/** Fichas sem ingredientes ou sem preparação. */
export function fichasIncompletas(): FichaIncompleta[] {
  return getFichasProducao()
    .filter(f => !f.ingredientes?.length || !f.preparacao?.length)
    .map(f => ({
      id: f.id,
      nomePrato: f.nomePrato || '(sem nome)',
      temIngredientes: !!f.ingredientes?.length,
      temPreparacao: !!f.preparacao?.length,
      planoAulaId: f.planoAulaId,
    }));
}

/**
 * Tenta recuperar do Sheets as fichas que ficaram vazias.
 *
 * Só funciona se o Sheets ainda tiver a versão completa. Se a ficha
 * vazia já foi gravada por cima, não há nada a recuperar aqui — mas
 * pode haver noutro aparelho onde a ficha nunca tenha sido aberta.
 */
export async function recuperarFichasDoSheets(): Promise<{
  tentadas: number; recuperadas: number; nomes: string[];
}> {
  const incompletas = fichasIncompletas();
  if (incompletas.length === 0) return { tentadas: 0, recuperadas: 0, nomes: [] };

  const json = await lerDoSheets(SHEETS_FICHAS_URL, { tipo: 'get_fichas' });
  const doSheets: any[] = json?.dados || json?.fichas || [];
  if (!doSheets.length) return { tentadas: incompletas.length, recuperadas: 0, nomes: [] };

  const locais = getFichasProducao();
  const nomes: string[] = [];

  const atualizadas = locais.map(f => {
    const remota = doSheets.find((r: any) => r.id === f.id);
    if (!remota) return f;

    const ganhaIngredientes = !f.ingredientes?.length
      && Array.isArray(remota.ingredientes) && remota.ingredientes.length > 0;
    const ganhaPreparacao = !f.preparacao?.length
      && Array.isArray(remota.preparacao) && remota.preparacao.length > 0;

    if (!ganhaIngredientes && !ganhaPreparacao) return f;

    nomes.push(f.nomePrato || f.id);
    return {
      ...f,
      ingredientes: ganhaIngredientes ? remota.ingredientes : f.ingredientes,
      preparacao: ganhaPreparacao ? remota.preparacao : f.preparacao,
    };
  });

  save(KEYS.fichas, atualizadas);
  return { tentadas: incompletas.length, recuperadas: nomes.length, nomes };
}

// ============================================================
// Vista de turma durante a aula
// ============================================================
// O professor não tinha onde ver, num ecrã, quem entrou, quem tem a
// farda em falta, quem fez os registos e quem já se avaliou. Tinha de
// ir a cada aluno.

export interface EstadoAlunoNaAula {
  alunoId: string;
  nome: string;
  numero: number;
  entrou: boolean;
  horaEntrada?: string;
  foraDeTempo: boolean;
  minutosAposAbertura: number;
  decisaoFalta?: string;
  /** Quando o professor tomou a decisão (para mostrar «gravado às…»). */
  decididoEm?: string;
  fardamentoOk: boolean;
  itensEmFalta: string;
  /** «às 09:05 (52 s)» quando confirmou que lavou as mãos; '' se não. */
  maosLavadas: string;
  kfInicial: boolean;
  kfFinal: boolean;
  ehLider: boolean;
  autoavaliou: boolean;
  validado: boolean;
}

export function estadoDaTurmaNaAula(planoAulaId: string, turmaId: string): EstadoAlunoNaAula[] {
  // Numa atividade com participantes escolhidos, só esses (Rosa, out/2026).
  const planoDaAula: any = getPlanosAula().find(p => p.id === planoAulaId);
  const alunos = planoDaAula ? alunosDoPlano(planoDaAula)
    : getAlunos().filter(a => a.turmaId === turmaId && a.ativo !== false && !ehFantasma(a.id)).sort((a, b) => a.numero - b.numero);

  const presencas = getPresencas().filter(p => p.planoAulaId === planoAulaId);
  // A última resposta de cada aluno, a mesma que o professor valida.
  const selecoes = selecoesQueContam(selecoesDoProfessor().filter(s => s.planoAulaId === planoAulaId));
  const validacoes = getValidacoes();
  const liderId = liderKFdoGrupo(planoAulaId);
  // (Rosa, 5/out/2026) Os alunos de teste («TESTE ensaio», nº 99…) não
  // aparecem nas listas da turma («Não entraram», «Falta avaliarem-se»),
  // a não ser que tenham mesmo entrado nesta aula (num ensaio do professor).
  const comTeste = new Set([...presencas.map(p => p.alunoId), ...selecoes.map(s => s.alunoId)]);

  return alunos.filter(a => !alunoDeTeste(a) || comTeste.has(a.id)).map(a => {
    const pres = presencas.find(p => p.alunoId === a.id);
    const sel = selecoes.find(s => s.alunoId === a.id);
    const val = sel ? validacaoDaSelecao(sel, validacoes) : undefined;

    // Os itens em falta ficam na observação da presença (sem a marca das mãos).
    const obs = (pres?.observacao || '').replace(MARCA_MAOS, '');
    const emFalta = obs.includes('em falta:')
      ? obs.split('em falta:')[1].trim()
      : '';

    return {
      alunoId: a.id,
      nome: a.nome || `Aluno ${a.numero}`,
      numero: a.numero,
      entrou: !!pres?.presente,
      horaEntrada: pres?.horaEntrada,
      foraDeTempo: !!pres?.atrasado,
      minutosAposAbertura: pres?.atrasadoMins || 0,
      decisaoFalta: (pres as any)?.decisaoProfessor,
      decididoEm: (pres as any)?.decididoEm as string | undefined,
      fardamentoOk: !!pres?.fardamentoOk,
      itensEmFalta: emFalta,
      maosLavadas: maosLavadasDaPresenca(pres?.observacao),
      kfInicial: kfFaseCompleta(a.id, planoAulaId, 'inicial'),
      kfFinal: kfFaseCompleta(a.id, planoAulaId, 'final'),
      ehLider: liderId === a.id,
      autoavaliou: !!sel,
      validado: !!val,
    };
  });
}

/** Resumo para o cabeçalho: quantos em cada estado. */
export function resumoDaTurmaNaAula(estadosTodos: EstadoAlunoNaAula[]) {
  // Os alunos de ensaio (TESTE, n.º 99 e 88) ficam na lista mas não nos
  // totais (auditoria 5/out/2026: «Entraram: 15» contava-os).
  const estados = estadosTodos.filter(e => !(e.numero === 99 || e.numero === 88 || alunoDeTeste(e.alunoId)));
  return {
    total: estados.length,
    entraram: estados.filter(e => e.entrou).length,
    foraDeTempo: estados.filter(e => e.foraDeTempo && !e.decisaoFalta).length,
    semFarda: estados.filter(e => e.entrou && !!e.horaEntrada && !e.fardamentoOk).length,
    kfPorFazer: estados.filter(e => e.entrou && !e.kfFinal).length,
    porAvaliar: estados.filter(e => e.entrou && !e.autoavaliou).length,
    porValidar: estados.filter(e => e.autoavaliou && !e.validado).length,
  };
}

// ============================================================
// Fila de sincronização — saber o que chegou ao Sheets
// ============================================================
// Tudo é guardado primeiro no browser e enviado ao Sheets a seguir.
// O envio usa `mode: 'no-cors'`, obrigatório para o Apps Script aceitar
// pedidos do browser — mas com ele a resposta vem sempre vazia. Mesmo
// que o script rejeite, dê erro ou o URL esteja errado, o fetch diz que
// correu bem.
//
// Resultado: o professor fecha o browser, muda de computador, e perdeu
// trabalho sem nunca ter sido avisado.
//
// Isto não resolve o no-cors — não há como. O que faz é registar o que
// foi enviado e confirmar depois, lendo do Sheets. O que não aparecer
// fica sinalizado.

const KEY_FILA_SYNC = 'ecl_fila_sync';

export interface ItemFila {
  id: string;
  tipo: string;
  descricao: string;
  enviadoEm: string;
  confirmadoEm?: string;
  tentativas: number;
}

export function getFilaSync(): ItemFila[] {
  try { return JSON.parse(localStorage.getItem(KEY_FILA_SYNC) || '[]'); }
  catch { return []; }
}

function guardarFila(itens: ItemFila[]): void {
  try {
    // Manter só o que interessa: por confirmar, e os últimos confirmados.
    const porConfirmar = itens.filter(i => !i.confirmadoEm);
    const confirmados = itens.filter(i => i.confirmadoEm).slice(0, 40);
    localStorage.setItem(KEY_FILA_SYNC, JSON.stringify([...porConfirmar, ...confirmados]));
  } catch { /* se não couber, segue */ }
}

/** Regista que algo foi enviado, à espera de confirmação. */
export function registarEnvio(id: string, tipo: string, descricao: string): void {
  const fila = getFilaSync();
  const existente = fila.find(i => i.id === id);
  if (existente) {
    existente.enviadoEm = new Date().toISOString();
    existente.confirmadoEm = undefined;
    existente.tentativas += 1;
  } else {
    fila.unshift({
      id, tipo, descricao,
      enviadoEm: new Date().toISOString(),
      tentativas: 1,
    });
  }
  guardarFila(fila);
}

/**
 * Lê do Sheets e confirma o que lá chegou.
 *
 * É a única forma de saber: o envio não devolve resposta, mas a leitura
 * devolve. Se a ficha está lá, chegou.
 */
export async function confirmarSincronizacao(turmaId: string): Promise<{
  confirmados: number; porConfirmar: number; falhados: ItemFila[];
}> {
  const fila = getFilaSync().filter(i => !i.confirmadoEm);
  if (fila.length === 0) {
    return { confirmados: 0, porConfirmar: 0, falhados: [] };
  }

  // Ler tudo o que o Sheets tem, por tipo.
  const idsNoSheets = new Set<string>();

  const tenta = async (url: string, tipo: string, campo: string) => {
    try {
      const json = await lerDoSheets(url, { tipo, turmaId });
      const itens = json?.[campo] || json?.dados || [];
      itens.forEach((x: any) => { if (x?.id) idsNoSheets.add(String(x.id)); });
    } catch { /* falha na leitura não é falha no envio */ }
  };

  // (Rosa, 5/out/2026: «carrego no botão e nunca dá em nada») Os planos de
  // outras turmas confirmam-se na turma deles: antes só se lia a turma
  // aberta, e os das outras ficavam «a caminho» para sempre.
  const planosLocais = getPlanosAula();
  const turmasDaFila = new Set<string>([turmaId]);
  fila.forEach(i => { const p = planosLocais.find(x => x.id === i.id); if (p?.turmaId) turmasDaFila.add(p.turmaId); });
  const tentaTurma = async (url: string, tipo: string, campo: string, t: string) => {
    try {
      const json = await lerDoSheets(url, { tipo, turmaId: t });
      const itens = json?.[campo] || json?.dados || [];
      itens.forEach((x: any) => { if (x?.id) idsNoSheets.add(String(x.id)); });
    } catch { /* falha na leitura não é falha no envio */ }
  };
  await Promise.all([
    tenta(SHEETS_FICHAS_URL, 'get_fichas', 'fichas'),
    ...[...turmasDaFila].map(t => tentaTurma(SHEETS_PLANOS_URL, 'get_planos', 'planos', t)),
    tenta(SHEETS_HISTORICO_URL, 'get_selecoes', 'selecoes'),
    tenta(SHEETS_HISTORICO_URL, 'get_validacoes', 'validacoes'),
  ]);
  // O que já não existe neste aparelho (um plano de aula ou uma ficha que
  // foi apagada) já não tem nada para enviar: sai da fila.
  const eliminados = new Set(load<string>(KEYS.eliminadosPlanos));
  const fichasLocais = new Set(getFichasProducao().map(f => f.id));

  const agora = new Date().toISOString();
  const todos = getFilaSync();
  let confirmados = 0;

  todos.forEach(item => {
    if (item.confirmadoEm) return;
    const apagado = (item.tipo === 'plano' && (eliminados.has(item.id) || !planosLocais.some(p => p.id === item.id)))
      || (item.tipo === 'ficha' && !fichasLocais.has(item.id));
    if (idsNoSheets.has(item.id) || apagado) {
      item.confirmadoEm = agora;
      if (!apagado) confirmados += 1;
    }
  });
  guardarFila(todos);

  // Falhado = enviado há mais de 5 min e ainda sem confirmação.
  const limite = Date.now() - 5 * 60 * 1000;
  const falhados = todos.filter(i =>
    !i.confirmadoEm && new Date(i.enviadoEm).getTime() < limite
  );

  return {
    confirmados,
    porConfirmar: todos.filter(i => !i.confirmadoEm).length,
    falhados,
  };
}

/** Reenvia o que não chegou. */
export async function reenviarFalhados(): Promise<number> {
  const falhados = getFilaSync().filter(i => !i.confirmadoEm);
  let n = 0;

  for (const item of falhados) {
    if (item.tipo === 'ficha') {
      const f = getFichasProducao().find(x => x.id === item.id);
      if (f) { enviar(SHEETS_FICHAS_URL, 'ficha', { ficha: f }); n += 1; }
    } else if (item.tipo === 'plano') {
      const p = getPlanosAula().find(x => x.id === item.id);
      if (p) { enviar(SHEETS_PLANOS_URL, 'plano', { plano: p }); n += 1; }
    }
    registarEnvio(item.id, item.tipo, item.descricao);
  }
  return n;
}

// ============================================================
// Guardar com confirmação
// ============================================================
// O envio não devolve resposta (no-cors), mas a leitura devolve. Este
// é o gesto explícito: envia, espera, lê do Sheets, e só diz que está
// guardado quando o encontra lá.

export interface ResultadoGuardar {
  ok: boolean;
  confirmados: number;
  porConfirmar: number;
  mensagem: string;
}

/**
 * Envia o que falta e confirma lendo do Sheets.
 * @param aoMudarEstado chamado a cada passo, para a interface mostrar
 */
export async function guardarNoSheetsComConfirmacao(
  turmaId: string,
  aoMudarEstado?: (estado: 'a_enviar' | 'a_confirmar' | 'pronto') => void
): Promise<ResultadoGuardar> {
  const pendentes = getFilaSync().filter(i => !i.confirmadoEm);

  if (pendentes.length === 0) {
    // Mesmo sem pendentes, confirmar — pode haver coisas de outra sessão.
    aoMudarEstado?.('a_confirmar');
    const r = await confirmarSincronizacao(turmaId);
    aoMudarEstado?.('pronto');
    return {
      ok: r.porConfirmar === 0,
      confirmados: r.confirmados,
      porConfirmar: r.porConfirmar,
      mensagem: r.porConfirmar === 0
        ? 'Está tudo guardado no Google Sheets.'
        : `${r.porConfirmar} ainda por confirmar.`,
    };
  }

  aoMudarEstado?.('a_enviar');
  await reenviarFalhados();

  // O Apps Script demora a escrever. Esperar antes de ler, senão a
  // confirmação falha só porque chegámos cedo demais.
  await new Promise(r => setTimeout(r, 2500));

  aoMudarEstado?.('a_confirmar');
  const r = await confirmarSincronizacao(turmaId);
  aoMudarEstado?.('pronto');

  return {
    ok: r.porConfirmar === 0,
    confirmados: r.confirmados,
    porConfirmar: r.porConfirmar,
    mensagem: r.porConfirmar === 0
      ? `Guardado. ${r.confirmados} ${r.confirmados === 1 ? 'item confirmado' : 'itens confirmados'} no Sheets.`
      : `${r.confirmados} guardados, ${r.porConfirmar} ainda por chegar. Tente outra vez dentro de um minuto.`,
  };
}

/** Há coisas por guardar? Para o aviso ao fechar o browser. */
export function haCoisasPorGuardar(): number {
  return getFilaSync().filter(i => !i.confirmadoEm).length;
}

/**
 * Ao voltar à aplicação, reenvia o que ficou pendente da última vez.
 * Apanha o caso de o professor ter fechado com coisas por guardar.
 */
export async function recuperarPendentesAoArrancar(turmaId: string): Promise<number> {
  const pendentes = getFilaSync().filter(i => !i.confirmadoEm);
  if (pendentes.length === 0) return 0;

  await reenviarFalhados();
  await new Promise(r => setTimeout(r, 2500));
  const r = await confirmarSincronizacao(turmaId);
  return r.confirmados;
}

// ============================================================
// Numeração de requisições e orçamentos
// ============================================================
// Cada documento precisa de um número próprio, para se identificar numa
// conversa, num email ou no economato.
//
//   R01, R02…  requisições feitas fora de um plano de aula
//   O01, O02…  orçamentos
//
// Uma requisição DENTRO de um plano não leva número próprio: identifica-se
// pelo plano a que pertence ("Plano de Aula 3 de 8").

/** Próximo número livre para o prefixo dado. */
function proximoNumero(prefixo: 'R' | 'O'): string {
  const todas = getRequisicoes();
  const usados = todas
    .map(r => (r as any).numero as string | undefined)
    .filter((n): n is string => !!n && n.startsWith(prefixo))
    .map(n => parseInt(n.slice(1), 10))
    .filter(n => !isNaN(n));
  const proximo = usados.length ? Math.max(...usados) + 1 : 1;
  return prefixo + String(proximo).padStart(2, '0');
}

/** Número para uma requisição nova. Sem plano é orçamento. */
export function numeroParaDocumento(temPlano: boolean, ehOrcamento?: boolean): string {
  if (temPlano) return '';
  return proximoNumero(ehOrcamento ? 'O' : 'R');
}

/** Como o documento se identifica: número próprio ou o plano a que pertence. */
export function rotuloDocumento(req: any): string {
  if (req?.numero) return req.numero;
  if (req?.planoAulaId) {
    const plano = getPlanosAula().find(p => p.id === req.planoAulaId);
    if (plano) {
      const mesmaUC = getPlanosAula()
        .filter(p => p.ucId === plano.ucId && p.turmaId === plano.turmaId)
        .sort((a, b) => String(a.data).localeCompare(String(b.data)));
      const pos = mesmaUC.findIndex(p => p.id === plano.id) + 1;
      return `Aula ${pos} de ${mesmaUC.length}`;
    }
  }
  return '—';
}

/** Requisições e orçamentos, do mais recente para o mais antigo. */
export function historicoDocumentos(turmaId?: string): any[] {
  return getRequisicoes()
    .filter(r => !turmaId || r.turmaId === turmaId)
    .sort((a, b) => String(b.criadaEm || '').localeCompare(String(a.criadaEm || '')));
}

// ============================================================
// Fichas duplicadas
// ============================================================
// A mesma ficha aparece duas ou três vezes na biblioteca, com o mesmo
// nome, as mesmas porções e a mesma data. Acontece quando a mesma ficha
// chega do Sheets com um id diferente do que já cá está — por exemplo
// depois de ser gravada em dois aparelhos.

export interface GrupoDuplicado {
  nome: string;
  fichas: FichaProducao[];
  /** A que vale a pena guardar: a mais completa, e entre iguais a mais recente. */
  melhor: FichaProducao;
}

/** Fichas que parecem ser a mesma. */
export function fichasDuplicadas(): GrupoDuplicado[] {
  const porChave = new Map<string, FichaProducao[]>();

  getFichasProducao().forEach(f => {
    const nome = (f.nomePrato || '').trim().toLowerCase();
    if (!nome) return;
    // Nome + porções: duas fichas com o mesmo nome mas doses diferentes
    // podem ser versões legítimas.
    const chave = `${nome}|${f.numPorcoes || ''}`;
    porChave.set(chave, [...(porChave.get(chave) || []), f]);
  });

  const grupos: GrupoDuplicado[] = [];
  porChave.forEach(fichas => {
    if (fichas.length < 2) return;

    // A melhor é a que tem mais conteúdo; em caso de empate, a mais recente.
    const melhor = [...fichas].sort((a, b) => {
      const pesoA = (a.ingredientes?.length || 0) + (a.preparacao?.length || 0)
        + ((a as any).textoGuia ? 10 : 0);
      const pesoB = (b.ingredientes?.length || 0) + (b.preparacao?.length || 0)
        + ((b as any).textoGuia ? 10 : 0);
      if (pesoA !== pesoB) return pesoB - pesoA;
      return String(b.criadoEm || '').localeCompare(String(a.criadoEm || ''));
    })[0];

    grupos.push({ nome: fichas[0].nomePrato || '', fichas, melhor });
  });

  return grupos.sort((a, b) => b.fichas.length - a.fichas.length);
}

/**
 * Apaga as cópias, ficando com a melhor de cada grupo.
 *
 * Os planos que apontavam para uma cópia passam a apontar para a que
 * fica — senão perderiam a ficha.
 */
export function limparFichasDuplicadas(): { apagadas: number; mantidas: number } {
  const grupos = fichasDuplicadas();
  if (!grupos.length) return { apagadas: 0, mantidas: 0 };

  const aApagar = new Set<string>();
  const substituir = new Map<string, string>();   // id antigo → id que fica

  grupos.forEach(g => {
    g.fichas.forEach(f => {
      if (f.id !== g.melhor.id) {
        aApagar.add(f.id);
        substituir.set(f.id, g.melhor.id);
      }
    });
  });

  // Redirigir os planos antes de apagar.
  const planos = getPlanosAula().map(p => {
    if (!p.fichasIds?.some(id => substituir.has(id))) return p;
    const novos = p.fichasIds.map(id => substituir.get(id) || id);
    // Sem repetidos, caso o plano já tivesse as duas versões.
    return { ...p, fichasIds: [...new Set(novos)] };
  });
  save(KEYS.planos, planos);

  const ficam = getFichasProducao().filter(f => !aApagar.has(f.id));
  save(KEYS.fichas, ficam);

  return { apagadas: aApagar.size, mantidas: grupos.length };
}

// ============================================================
// Autoavaliações à espera de validação
// ============================================================
// Uma autoavaliação não validada não conta para nada — nem para a nota,
// nem para o banco de competências. Se o professor não der por ela, o
// trabalho do aluno fica no ar.

export interface PorValidar {
  planoAulaId: string;
  planoTitulo: string;
  data: string;
  quantos: number;
  nomes: string[];
}

/** Autoavaliações submetidas sem validação, por plano. */
export function autoavaliacoesPorValidar(turmaId: string): PorValidar[] {
  const validacoes = getValidacoes();
  const planos = getPlanosAula();
  const alunos = getAlunos();

  const porPlano = new Map<string, { nomes: string[] }>();

  selecoesQueContam(selecoesDoProfessor())
    .filter((s: any) => s.turmaId === turmaId && !selecaoJaValidada(s, validacoes))
    .forEach((s: any) => {
      const atual = porPlano.get(s.planoAulaId) || { nomes: [] };
      const aluno = alunos.find(a => a.id === s.alunoId);
      atual.nomes.push(aluno?.nome || `Aluno ${aluno?.numero ?? '?'}`);
      porPlano.set(s.planoAulaId, atual);
    });

  const saida: PorValidar[] = [];
  porPlano.forEach((v, planoAulaId) => {
    const p = planos.find(x => x.id === planoAulaId);
    saida.push({
      planoAulaId,
      planoTitulo: p?.titulo || 'Plano de aula',
      data: p?.data || '',
      quantos: v.nomes.length,
      nomes: v.nomes,
    });
  });

  // Os mais antigos primeiro: são os que arriscam ficar esquecidos.
  return saida.sort((a, b) => String(a.data).localeCompare(String(b.data)));
}

/** Quantas ao todo, para o aviso do painel. */
export function totalPorValidar(turmaId: string): number {
  return autoavaliacoesPorValidar(turmaId).reduce((s, p) => s + p.quantos, 0);
}


// ============================================================
// 1º ACP → 1º BCR nos planos e requisições
// ============================================================
// A turma mudou de nome, mas os planos e requisições já criados
// continuavam com '1º ACP'. O aluno do 1º BCR só vê planos com a turma
// exatamente igual à dele — e via "não há plano de aula".
//
// `enviarAoSheets` só no aparelho do professor: é lá que está a versão
// mais recente de cada plano, e o Sheets tem de ficar com a turma nova
// para os tablets dos alunos o encontrarem.
export function migrarTurmaAntiga(enviarAoSheets = false): number {
  const DE = '1º ACP', PARA = '1º BCR';
  let n = 0;

  const planos = getPlanosAula();
  const planosNovos = planos.map(p => {
    if (p.turmaId !== DE) return p;
    n++;
    return { ...p, turmaId: PARA, atualizadoEm: new Date().toISOString() };
  });
  if (n > 0) {
    save(KEYS.planos, planosNovos);
    if (enviarAoSheets) {
      planosNovos.filter(p => p.turmaId === PARA)
        .forEach(p => enviar(SHEETS_PLANOS_URL, 'plano', { plano: p }));
    }
  }

  const reqs = getRequisicoes();
  let nr = 0;
  const reqsNovas = reqs.map(r => {
    if (r.turmaId !== DE) return r;
    nr++;
    return { ...r, turmaId: PARA };
  });
  if (nr > 0) save(KEYS.requisicoes, reqsNovas);

  return n + nr;
}


// ============================================================
// Remover um aluno da turma (coordenação)
// ============================================================
// Desativa — não apaga. Apagar levaria também as notas, as presenças e
// as autoavaliações, que continuam a fazer falta na pauta e no arquivo.
// O aluno deixa de aparecer nas listas da turma e deixa de conseguir
// entrar; a coordenação pode repô-lo.
/**
 * Muda o nível de medidas de um aluno (1 universais, 2 seletivas, 3 adicionais)
 * e envia-o ao Sheets — senão ficava só no computador do professor e o
 * telemóvel do aluno continuava a mostrar as perguntas normais.
 */
export function definirNivelMedidas(alunoId: string, nivel: 1 | 2 | 3): void {
  const todos = getAlunos();
  const a = todos.find(x => x.id === alunoId);
  if (!a) return;
  a.nivelMedidas = nivel;
  save(KEYS.alunos, todos);
  enviar(SHEETS_ALUNOS_URL, 'upsert_aluno', { aluno: a });
}

export function removerAlunoDaTurma(alunoId: string, por: string): void {
  const todos = getAlunos();
  const a = todos.find(x => x.id === alunoId);
  if (!a) return;
  a.ativo = false;
  a.removidoEm = new Date().toISOString();
  a.removidoPor = por;
  save(KEYS.alunos, todos);
  enviar(SHEETS_ALUNOS_URL, 'upsert_aluno', { aluno: a });
}

export function reporAlunoNaTurma(alunoId: string): void {
  const todos = getAlunos();
  const a = todos.find(x => x.id === alunoId);
  if (!a) return;
  a.ativo = true;
  delete a.removidoEm;
  delete a.removidoPor;
  save(KEYS.alunos, todos);
  enviar(SHEETS_ALUNOS_URL, 'upsert_aluno', { aluno: a });
}


// ============================================================
// Transição de referencial — o +1 do professor
// ============================================================
// Nas turmas do referencial antigo (ACP), as atitudes do 1º e 2º ano vão
// sendo consolidadas nas aulas deste ano. Quando o professor vê que o
// aluno demonstrou uma delas, soma +1 ao nível dessa atitude.
//
// Fica num registo À PARTE, e não no histórico das avaliações: esse é o
// histórico de onde saem as notas das UCs, a pauta e a recuperação. Um
// +1 que desse nível 1 ou 2 puxaria a nota para baixo — a imagem de
// incumprimento que a mudança de referencial não pode criar. Aqui conta
// só para a consolidação da atitude.

const KEY_TRANSICAO = 'ecl_atitudes_transicao';

export interface RegistoTransicao {
  id: string;
  alunoId: string;
  turmaId: string;
  atitudeId: string;
  /** Nível depois do +1, de 1 a 5. */
  nivel: number;
  data: string;
  planoAulaId: string;
  professor: string;
}

export function getRegistosTransicao(alunoId?: string): RegistoTransicao[] {
  const todos = semPlanosEliminados(load<RegistoTransicao>(KEY_TRANSICAO));
  return alunoId ? todos.filter(t => t.alunoId === alunoId) : todos;
}

/** Nível atual da atitude: o maior entre as avaliações normais e os +1. */
export function nivelConsolidadoAtitude(alunoId: string, atitudeId: string): number {
  const normais = getHistoricoAlunoMicro(alunoId, atitudeId).map(r => Number(r.nota) || 0);
  const mais = getRegistosTransicao(alunoId)
    .filter(t => t.atitudeId === atitudeId).map(t => t.nivel);
  return Math.max(0, ...normais, ...mais);
}

/** +1 no nível da atitude, até ao máximo de 5. Devolve o nível novo. */
export function somarUmAtitude(
  alunoId: string, turmaId: string, atitudeId: string,
  planoAulaId: string, professor: string
): number {
  const atual = nivelConsolidadoAtitude(alunoId, atitudeId);
  if (atual >= 5) return 5;
  const nivel = atual + 1;
  const reg: RegistoTransicao = {
    id: novoId('trans'), alunoId, turmaId, atitudeId, nivel,
    data: new Date().toISOString(), planoAulaId, professor,
  };
  save(KEY_TRANSICAO, [...getRegistosTransicao(), reg]);

  // Para o Sheets vai como avaliação marcada "transicao" — é assim que,
  // ao voltar, a sincronização a separa das notas.
  const aluno = getAlunos().find(a => a.id === alunoId);
  enviar(SHEETS_HISTORICO_URL, 'avaliacao', {
    id: reg.id, alunoId, turmaId, turma: turmaId, planoAulaId,
    nomeAluno: aluno?.nome || '', numero: aluno?.numero || 0, ano: aluno?.ano || 1,
    ucId: 'TRANSICAO', microcompetencia: atitudeId, microcompetenciaId: atitudeId,
    nota: nivel, nota_1_5: nivel, nota_0_20: notaPara20(nivel),
    data: reg.data, validadoPor: 'transicao',
    observacoes: '+1 — atitude do referencial anterior',
  });
  return nivel;
}


// ============================================================
// Nota final de uma UC — um só cálculo para toda a aplicação
// ============================================================
// Decisões da Rosa (set/2026), depois da simulação do creme de cenoura:
//
//   1. Só conta a validação do professor. Antes a nota da UC fazia a
//      média de TODOS os registos — autoavaliação do aluno, validação do
//      professor e farda à entrada. O aluno avalia-se sempre acima, e na
//      simulação o aluno fraco (7,3 na aula) aparecia com 11,7 na UC.
//   2. O bónus de assiduidade, pontualidade e farda (até +2) mantém-se
//      como está.
//   3. O bónus de eventos passa a ser aplicado, como no modelo: +0,5 por
//      atividade em que o aluno participou, até 3; só com nota base de 10
//      ou mais; sem nenhuma participação, a nota não passa de 17. Estava
//      escrito (BONUS_PARTICIPACAO) mas não era chamado em lado nenhum.
//
// A ordem: base das competências → + assiduidade → eventos/teto.
// O teto de 17 aplica-se no fim, senão a assiduidade passava-o por cima.
// O mínimo de 10 para o bónus de eventos olha para a base das
// competências — "não se leva a concurso quem tem negativa".

/** Registos que contam para notas: validados pelo professor. */
export function registosQueContam(r: RegistoAvaliacao): boolean {
  return r.validadoPor === 'professor' || r.validadoPor === 'recuperacao';
}

function categoriaDe(id: string): 'OBR' | 'SUB' | 'KNW' | 'ATI' | 'INI' {
  return categoriaDaNota(id);
}

/** Tipo de aula mais comum entre os registos (prática/mista/teórica). */
function tipoDominante(regs: RegistoAvaliacao[]): 'pratico' | 'misto' | 'teorico' | 'atitudinal' | 'atitudinal_obr' {
  const planos = getPlanosAula();
  const tipos = regs.map(r => (planos.find(p => p.id === r.planoAulaId) as any)?.tipoPlanAula || 'pratico');
  if (tipos.filter(t => t === 'teorico').length > tipos.length / 2) return 'teorico';
  if (tipos.filter(t => t === 'misto').length > tipos.length / 2) return 'misto';
  return 'pratico';
}

/**
 * O que entra na nota da aula. A higiene e segurança alimentar (20% nas aulas
 * práticas e mistas) é a farda (OBR_01, 10%) e os registos do KitchenFlow
 * (OBR_02, 10%) — Rosa, set/2026. Sem farda, as técnicas continuam a contar 0.
 * A técnica geral do evento só serve para o bónus.
 */
export function contaNaNotaDaAula(id: string): boolean {
  return id !== TEC_EVENTO;
}

/** Registos do KitchenFlow: o professor vê o relatório e marca. */
export const NIVEIS_REGISTOS_KF = [
  { v: 5, texto: 'Todos feitos' },
  { v: 3, texto: 'Alguns' },
  { v: 1, texto: 'Nenhum' },
] as const;
const KEY_REGISTOS_KF = 'ecl_registos_kf_marca';
const alvoRegistosKF = (planoId: string, alunoId: string) => {
  const g = grupoDoAluno(planoId, alunoId);
  return `${planoId}|${g ? 'g:' + g.id : 'a:' + alunoId}`;
};
/** A marca dada ao grupo do aluno nesta aula (ou ao próprio, se não tem grupo).
 *  Só serve para vir já preenchida nos colegas do grupo: a nota fica na validação. */
export function marcaRegistosKF(planoId: string, alunoId: string): number | undefined {
  try { return JSON.parse(localStorage.getItem(KEY_REGISTOS_KF) || '{}')[alvoRegistosKF(planoId, alunoId)]; } catch { return undefined; }
}
export function guardarMarcaRegistosKF(planoId: string, alunoId: string, nota: number): void {
  try {
    const m = JSON.parse(localStorage.getItem(KEY_REGISTOS_KF) || '{}');
    m[alvoRegistosKF(planoId, alunoId)] = nota;
    localStorage.setItem(KEY_REGISTOS_KF, JSON.stringify(m));
  } catch { /* */ }
}

/**
 * A validação que conta numa aula: a mais recente do aluno nesse plano.
 * Quando o aluno respondeu duas vezes, há duas validações (uma por
 * resposta) — cada ecrã ficava com a primeira que encontrava, e a antiga
 * podia aparecer num sítio e a nova noutro.
 */
export function validacaoDaAula(alunoId: string, planoId: string, validacoes: Validacao[] = getValidacoes()): Validacao | undefined {
  return validacoes
    .filter((v: any) => v.alunoId === alunoId && v.planoAulaId === planoId)
    .sort((a: any, b: any) => String(b.validadoEm || '').localeCompare(String(a.validadoEm || '')))[0];
}

/**
 * O cálculo da nota de uma aula validada — o ÚNICO na aplicação. O ecrã do
 * aluno («Professor confirmou»), a pré-visualização do professor, a gravação,
 * a lista da Avaliação por UC e a nota do módulo usam todos este. Antes
 * havia quatro contas parecidas mas não iguais, e o aluno e o professor
 * podiam ver números diferentes para a mesma aula.
 *
 * Sempre com as regras de agora (escala, pesos, farda) a partir das notas
 * dadas, e com o tipo de aula do momento da validação (se o plano for
 * editado depois, a nota não muda). Sem farda, as técnicas contam 1;
 * «Não era verdade» põe a Responsabilidade (ATI-001) a 1.
 */
export function calculoDaAulaValidada(v: any, tipoSeNaoHouver?: string):
  { nota20: number; porCategoria: Record<string, number>; detalhes: string } | null {
  if (!v) return null;
  const plano: any = planoPorIdRapido(v.planoAulaId);
  // Atividade extra com ficha técnica: as técnicas contam (dentro do bónus),
  // também nas validações já feitas como «atitudinal» (Rosa, out/2026).
  const tipo = (atividadeComTecnicas(plano) ? 'pratico' : (v.tipoPlanAulaUsado || tipoSeNaoHouver || plano?.tipoPlanAula || 'pratico')) as any;
  const notas = (v.notas || []).filter((n: any) => contaNaNotaDaAula(n.competenciaId)).map((n: any) => {
    const categoria = categoriaDe(n.competenciaId);
    const nota = v.semFarda && categoria === 'SUB' ? 1
      : v.faltouVerdade && n.competenciaId === 'ATI-001' ? 1
      : (Number(n.nota) || 0);
    return { categoria, nota };
  });
  return notas.length ? calcularNotaPlano(notas, tipo) : null;
}

/** A nota 0-20 de uma aula validada (ver calculoDaAulaValidada). */
export function notaDaAulaValidada(v: any): number | null {
  return calculoDaAulaValidada(v)?.nota20 ?? null;
}

/**
 * A nota de um aluno num conjunto de aulas: a média das aulas, cada uma pelo
 * peso da sua aula (pesoNoModulo) e com a sua validação mais recente. É a
 * mesma conta da nota do módulo, sem faltas nem bónus.
 */
export function mediaDasAulasValidadas(alunoId: string, planosIds: Iterable<string>, validacoes: Validacao[] = getValidacoes()): number | null {
  const planos = new Map(getPlanosAula().map(p => [p.id, p]));
  const notas = [...new Set(planosIds)]
    .map(id => ({ nota: notaDaAulaValidada(validacaoDaAula(alunoId, id, validacoes)), peso: pesoNoModulo(planos.get(id)) }))
    .filter((x): x is { nota: number; peso: number } => x.nota !== null);
  const peso = notas.reduce((s, x) => s + x.peso, 0);
  return peso ? Math.round((notas.reduce((s, x) => s + x.nota * x.peso, 0) / peso) * 10) / 10 : null;
}

/** Nota das competências (0–20) a partir de registos já filtrados. */
export function notaBaseDeRegistos(regs: RegistoAvaliacao[]): number | null {
  const validos = regs.filter(registosQueContam).filter(r => contaNaNotaDaAula(r.microcompetenciaId));
  if (!validos.length) return null;
  return calcularNotaPlano(
    validos.map(r => ({ categoria: categoriaDe(r.microcompetenciaId), nota: r.nota })),
    tipoDominante(validos)).nota20;
}

/** Atividades (eventos, concursos) em que o aluno participou mesmo. */
export function participacoesDoAluno(alunoId: string): number {
  return getAtividades().filter(a => (a.participantesIds || []).includes(alunoId)).length;
}

/**
 * Participações que contam para uma UC: as do período do módulo. Um
 * evento feito em novembro ajuda a nota do módulo que estava a decorrer
 * em novembro, e não todos os módulos do ano.
 */
/** As actividades (eventos e concursos) do aluno no período deste módulo. */
export function atividadesDoAlunoNaUC(alunoId: string, turmaId: string, ucId: string): Atividade[] {
  const mod: any = modulosDaTurma(turmaId).find((m: any) => m.id === ucId);
  const registadas = getAtividades().filter(a =>
    (a.participantesIds || []).includes(alunoId) && a.turmaId === turmaId);
  // O plano do evento é o registo da participação: quem foi validado nesse
  // plano participou. Não há outro sítio onde registar quem foi.
  const validados = new Set(getValidacoes().filter(v => v.alunoId === alunoId).map(v => v.planoAulaId || ''));
  const diasRegistados = new Set(registadas.map(a => String(a.data || '').slice(0, 10)));
  const dosPlanos: Atividade[] = getPlanosAula()
    .filter((p: any) => p.turmaId === turmaId && p.tipoEvento && p.estado !== 'arquivado' && validados.has(p.id)
      && p.ucId === ucId && !diasRegistados.has(String(p.data || '').slice(0, 10)) && !atividadeContaComoAula(p)
      // Evento fora do horário: só quem vai (a turma toda, ou os aceites).
      && (!eventoForaDoHorario(p) || participantesDoEvento(p).includes(alunoId)))
    .map((p: any) => ({ id: p.id, turmaId, tipo: p.tipoEvento, titulo: p.titulo || 'Evento', data: p.data,
      participantesIds: [alunoId], criadaEm: p.criadoEm || '' }));
  // Os planos de evento contam na UC do próprio plano (um evento fora do
  // período de uma UC conta na mais próxima, escolhida ao criar).
  if (!mod?.dataInicio || !mod?.dataFim) return [...registadas, ...dosPlanos];
  return [...dosPlanos, ...registadas.filter(a => {
    const d = String(a.data || '').slice(0, 10);
    return d >= mod.dataInicio && d <= mod.dataFim;
  })];
}

export function participacoesDoAlunoNaUC(alunoId: string, turmaId: string, ucId: string): number {
  return atividadesDoAlunoNaUC(alunoId, turmaId, ucId).length;
}

/**
 * Esta participação dá bónus? Vê-se no plano do evento (mesma turma e dia):
 * farda à entrada, e as notas finais do professor em "Muito bom" (5) —
 * no evento todas as atitudes e a técnica; no concurso as 3 fixas.
 */
/**
 * A participação conta (validada e com farda) e quanto vale: o bónus é
 * proporcional à nota do evento — a média das atitudes do evento (e da
 * técnica geral, no evento) em /20, a dividir por 20. Antes era tudo ou
 * nada: só com tudo em «Muito bom» (Rosa, set/2026).
 */
export function participacaoContaParaBonus(a: Atividade, alunoId: string): { conta: boolean; motivo: string; fator: number } {
  // Atividade que serviu para recuperar a UC: só recupera, não dá bónus (Rosa, out/2026).
  const planoAtv: any = (a as any).planoId ? getPlanosAula().find(p => p.id === (a as any).planoId) : null;
  if (planoAtv?.paraRecuperar?.[alunoId]) return { conta: false, motivo: 'Serviu para recuperar a UC: não dá bónus.', fator: 0 };
  const dia = String(a.data || '').slice(0, 10);
  const doDia = getPlanosAula().filter(p => p.turmaId === a.turmaId && String(p.data || '').slice(0, 10) === dia && p.estado !== 'arquivado');
  const deEvento = doDia.filter((p: any) => !!p.tipoEvento);
  const planos = deEvento.length ? deEvento : doDia;
  if (!planos.length) return { conta: false, motivo: 'Não há plano de avaliação deste evento.', fator: 0 };
  const ids = new Set(planos.map(p => p.id));
  // A farda só tira o bónus se a atividade conta faltas; senão conta só como
  // atitude (apresentação pessoal), escolha do professor ao criar a atividade.
  const idsOficiais = new Set(planos.filter((p: any) => p.contaAssiduidade !== false).map(p => p.id));
  if (getPresencas().some(r => r.alunoId === alunoId && idsOficiais.has(r.planoAulaId) && r.fardamentoOk === false))
    return { conta: false, motivo: 'Foi sem farda.', fator: 0 };
  const val = getValidacoes().filter(v => v.alunoId === alunoId && ids.has(v.planoAulaId || ''))
    .sort((x, y) => String(y.validadoEm).localeCompare(String(x.validadoEm)))[0];
  if (!val) return { conta: false, motivo: 'Ainda não foi validado pelo professor.', fator: 0 };
  const nota = new Map(val.notas.map(n => [n.competenciaId, Number(n.nota)]));
  const exigidas = a.tipo === 'concurso'
    ? ATITUDES_FIXAS_EVENTO
    : [...new Set([...ATITUDES_FIXAS_EVENTO, ...val.notas.map(n => n.competenciaId).filter(id => id.startsWith('ATI-')), TEC_EVENTO,
        // As técnicas da ficha técnica da atividade também contam (Rosa, out/2026).
        ...val.notas.map(n => n.competenciaId).filter(id => id.startsWith('SUB-') || id.startsWith('APP-'))])];
  // Um plano que passou de aula a evento pode não ter as atitudes do evento:
  // conta então o que foi avaliado.
  const aContar = exigidas.some(id => nota.has(id)) ? exigidas.filter(id => nota.has(id)) : [...nota.keys()];
  const avaliadas = aContar.map(id => nivelPara20(nota.get(id) || 0));
  const fator = avaliadas.length ? avaliadas.reduce((x, y) => x + y, 0) / avaliadas.length / 20 : 0;
  return { conta: true, motivo: '', fator: Math.max(0, Math.min(1, fator)) };
}

export interface NotaUC {
  base: number | null;
  bonusAssiduidade: number;
  bonusParticipacao: number;
  participacoes: number;
  limitadaPorTeto: boolean;
  final: number | null;
  /** Até onde pode ir a nota e porquê (para o aluno perceber). */
  teto?: number;
  motivoTeto?: string;
}

/**
 * As oportunidades de participar que o aluno teve nesta UC, e o que fez com
 * elas. O limite (17 / 18 / 20) só castiga quem teve a oportunidade e não a
 * aproveitou (Rosa, set/2026):
 *  • sem atividades na UC → sem limite;
 *  • candidatou-se e não foi escolhido → mostrou atitude (não ganha bónus);
 *  • faltou a uma obrigatória, ou não se candidatou → limite 17;
 *  • o 20 só pede concurso se houve um concurso a que se pudesse candidatar.
 * Só conta o que está registado na aplicação e já aconteceu — o que não
 * está registado conta a favor do aluno.
 */
export function oportunidadesNaUC(alunoId: string, turmaId: string, ucId: string) {
  const hoje = new Date().toISOString().slice(0, 10);
  const mod: any = modulosDaTurma(turmaId).find((m: any) => m.id === ucId);
  const noModulo = (d: string) => !mod?.dataInicio || !mod?.dataFim || (d >= mod.dataInicio && d <= mod.dataFim);
  const ops: { titulo: string; concurso: boolean; obrigatoria: boolean; participou: boolean; candidatou: boolean }[] = [];
  const participadas = new Set(atividadesDoAlunoNaUC(alunoId, turmaId, ucId).map(a => a.id));
  const planosEv = getPlanosAula().filter((p: any) => p.turmaId === turmaId && p.tipoEvento && p.ucId === ucId
    && p.estado !== 'arquivado' && String(p.data || '').slice(0, 10) <= hoje);
  const dias = new Set<string>();
  for (const p of planosEv as any[]) {
    dias.add(String(p.data || '').slice(0, 10));
    const obrigatoria = modoParticipacao(p) === 'turma';
    ops.push({ titulo: p.titulo || 'Atividade', concurso: p.tipoEvento === 'concurso', obrigatoria,
      // A obrigatória que conta como aula não dá bónus, mas quem foi participou.
      participou: participadas.has(p.id) || (atividadeContaComoAula(p) && getValidacoes().some(v => v.alunoId === alunoId && v.planoAulaId === p.id)),
      candidatou: !obrigatoria && (inscritosNoEvento(p.id).includes(alunoId) || participantesDoEvento(p).includes(alunoId)) });
  }
  for (const a of getAtividades().filter(a => a.turmaId === turmaId)) {
    const d = String(a.data || '').slice(0, 10);
    if (d > hoje || !noModulo(d) || dias.has(d)) continue;
    ops.push({ titulo: a.titulo || 'Atividade', concurso: a.tipo === 'concurso', obrigatoria: false,
      participou: (a.participantesIds || []).includes(alunoId),
      candidatou: (a.inscritosIds || []).includes(alunoId) || (a.participantesIds || []).includes(alunoId) });
  }
  return ops;
}

export function tetoDaNotaUC(alunoId: string, turmaId: string, ucId: string): { teto: number; motivo: string } {
  const ops = oportunidadesNaUC(alunoId, turmaId, ucId);
  if (!ops.length) return { teto: 20, motivo: '' };
  const mostrou = ops.some(o => o.participou || o.candidatou);
  if (!mostrou) {
    const faltadas = ops.map(o => o.titulo);
    return { teto: BONUS_EVENTOS.tetoSemParticipacao,
      motivo: `Tiveste oportunidade de participar (${faltadas.join(', ')}) e não participaste nem te candidataste. Por isso a tua nota vai até ${BONUS_EVENTOS.tetoSemParticipacao}.` };
  }
  const concursos = ops.filter(o => o.concurso);
  if (concursos.length && !concursos.some(o => o.participou || o.candidatou))
    return { teto: BONUS_EVENTOS.tetoSoEventos,
      motivo: `Houve um concurso (${concursos.map(o => o.titulo).join(', ')}) e não te candidataste. O 20 fica para quem se candidata a um concurso; a tua nota vai até ${BONUS_EVENTOS.tetoSoEventos}.` };
  return { teto: 20, motivo: '' };
}

/** Aplica os dois bónus e o teto a uma nota base de UC. */
export function aplicarBonusesUC(base: number | null, alunoId: string, turmaId: string, ucId: string): NotaUC {
  // Só as atividades do período deste módulo (decisão da Rosa, set/2026).
  const participacoes = participacoesDoAlunoNaUC(alunoId, turmaId, ucId);
  if (base === null) {
    return { base, bonusAssiduidade: 0, bonusParticipacao: 0, participacoes, limitadaPorTeto: false, final: null };
  }
  const B = BONUS_EVENTOS;
  // Sem bónus de assiduidade (decisão da Rosa, set/2026): quem falta já é
  // penalizado — a aula conta 0, perde no Comprometido da pauta e, com 10%,
  // vai para recuperação. Dar +2 a quem cumpre subia a turma inteira e
  // contava a mesma coisa duas vezes. A farda conta na aula (sem farda, 0).
  const bonusAssiduidade = 0;
  let nota = base;

  // O bónus de cada atividade (eventos proporcionais à nota do evento;
  // concursos por pontos: candidatura, participação, fases, vitória).
  const bruto = bonusPorAtividade(alunoId, turmaId, ucId, base).reduce((t, b) => t + b.valor, 0);
  const bonusParticipacao = Math.round(Math.min(B.maximo, bruto) * 100) / 100;
  nota += bonusParticipacao;
  // Tetos: só para quem teve a oportunidade e não a aproveitou (tetoDaNotaUC).
  const { teto, motivo: motivoTeto } = tetoDaNotaUC(alunoId, turmaId, ucId);
  let limitadaPorTeto = false;
  if (nota > teto) { nota = teto; limitadaPorTeto = true; }
  const final = Math.min(20, Math.round(nota * 10) / 10);
  return { base, bonusAssiduidade, bonusParticipacao, participacoes, limitadaPorTeto, final, teto, motivoTeto };
}

/** O bónus de cada atividade (evento/concurso) do aluno na UC, para o aluno
 *  perceber de onde vem (antes do limite total de 2 e dos tetos). */
export interface BonusDaAtividade { id: string; titulo: string; data: string; tipo: string; conta: boolean; motivo: string; valor: number }
export function bonusPorAtividade(alunoId: string, turmaId: string, ucId: string, base: number | null): BonusDaAtividade[] {
  const B = BONUS_EVENTOS;
  // Concursos com plano: por pontos (pontosDoConcurso). Contam também para
  // quem se candidatou e não foi escolhido.
  const concursos = getPlanosAula().filter((p: any) => p.turmaId === turmaId && p.tipoEvento === 'concurso'
    && p.ucId === ucId && p.estado !== 'arquivado');
  const idsConcurso = new Set(concursos.map(p => p.id));
  const doConcurso = concursos.map((p: any) => {
    const r = pontosDoConcurso(p, alunoId, base);
    return r.candidatou ? { id: p.id, titulo: p.titulo || 'Concurso', data: String(p.data || '').slice(0, 10), tipo: 'concurso',
      conta: r.valor > 0, motivo: r.explicacao, valor: r.valor } : null;
  }).filter((x): x is BonusDaAtividade => !!x);
  const outras = atividadesDoAlunoNaUC(alunoId, turmaId, ucId).filter(a => !idsConcurso.has(a.id)).map(a => {
    const semNota = a.tipo === 'concurso' && (base ?? 0) < B.notaMinimaConcurso;
    const r = semNota ? { conta: false, motivo: `Os concursos contam a partir de ${B.notaMinimaConcurso} valores.`, fator: 0 } : participacaoContaParaBonus(a, alunoId);
    const valor = r.conta ? Math.round((a.tipo === 'concurso' ? B.porConcurso : B.porEvento) * r.fator * 100) / 100 : 0;
    return { id: a.id, titulo: a.titulo || 'Atividade', data: String(a.data || '').slice(0, 10), tipo: a.tipo, conta: r.conta, motivo: r.motivo, valor };
  });
  return [...outras, ...doConcurso].sort((x, y) => x.data.localeCompare(y.data));
}

/**
 * Pontos de um concurso, por factos (Rosa, set/2026) — até 1 valor:
 *   candidatou-se 0,2 (mesmo sem ser escolhido) · participou 0,2 ·
 *   cada fase passada 0,2 · ganhou: o que falta para 1.
 * Quem foi escolhido e depois não foi perde tudo (também a candidatura).
 */
export function pontosDoConcurso(p: any, alunoId: string, base: number | null):
  { candidatou: boolean; valor: number; explicacao: string } {
  const C = BONUS_EVENTOS.concurso;
  const hoje = new Date().toISOString().slice(0, 10);
  const obrigatorio = modoParticipacao(p) === 'turma';
  const escolhido = participantesDoEvento(p).includes(alunoId);
  const candidatou = obrigatorio || escolhido || inscritosNoEvento(p.id).includes(alunoId);
  if (!candidatou) return { candidatou: false, valor: 0, explicacao: '' };
  if (base !== null && base < BONUS_EVENTOS.notaMinimaConcurso)
    return { candidatou, valor: 0, explicacao: `Os concursos contam a partir de ${BONUS_EVENTOS.notaMinimaConcurso} valores.` };
  const participou = getValidacoes().some(v => v.alunoId === alunoId && v.planoAulaId === p.id);
  const passou = String(p.data || '').slice(0, 10) < hoje;
  if (escolhido && passou && !participou) return { candidatou, valor: 0, explicacao: 'Foste escolhido e não participaste.' };
  const nFases = Math.max(0, Math.min(2, Number(p.fasesConcurso) || 0));
  const res = (p.resultadosConcurso || {})[alunoId] || {};
  const partes: string[] = [];
  let v = 0;
  const f = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');
  v += C.candidatura; partes.push(`${obrigatorio ? 'inscrição' : 'candidatura'} ${f(C.candidatura)}`);
  if (participou) { v += C.participacao; partes.push(`participação ${f(C.participacao)}`); }
  if (participou && nFases >= 1 && res.fase1) { v += C.fase; partes.push(`1.ª fase ${f(C.fase)}`); }
  if (participou && nFases >= 2 && res.fase2) { v += C.fase; partes.push(`2.ª fase ${f(C.fase)}`); }
  if (participou && res.ganhou) {
    const vit = Math.max(0, C.maximo - C.candidatura - C.participacao - C.fase * nFases);
    v += vit; partes.push(`vitória ${f(vit)}`);
  }
  v = Math.min(C.maximo, Math.round(v * 100) / 100);
  return { candidatou, valor: v, explicacao: partes.length ? partes.join(' + ') : 'À espera do concurso.' };
}

/**
 * Os eventos que ficam agregados a esta aula: a primeira aula da turma, na
 * mesma UC, no dia do evento ou depois (Rosa, set/2026). Um evento nas
 * férias, antes do ano letivo ou fora da UC aparece na aula seguinte, para
 * o professor o avaliar e o aluno ver o bónus.
 */
export function eventosAgregadosAAula(plano: PlanoAula): PlanoAula[] {
  if (!plano || (plano as any).tipoEvento || !plano.ucId) return [];
  const daUC = getPlanosAula().filter(p => p.turmaId === plano.turmaId && p.ucId === plano.ucId && p.estado !== 'arquivado');
  const aulas = daUC.filter(p => !(p as any).tipoEvento)
    .sort((a, b) => `${String(a.data).slice(0, 10)} ${a.horaInicio || ''}`.localeCompare(`${String(b.data).slice(0, 10)} ${b.horaInicio || ''}`));
  const bonus = daUC.filter(p => (p as any).tipoEvento && !atividadeContaComoAula(p)).filter(ev => {
    const d = String(ev.data || '').slice(0, 10);
    const seguinte = aulas.find(a => String(a.data || '').slice(0, 10) >= d);
    return seguinte?.id === plano.id;
  });
  const comoAula = (getPlanosAula() as any[]).filter(p => p.turmaId === plano.turmaId && atividadeContaComoAula(p)
    && aulaQueRecebeAtividade(p)?.id === plano.id);
  return [...comoAula, ...bonus];
}

/** A nota final de um aluno numa UC. */
/**
 * As aulas que fazem a média da UC, uma a uma (Rosa, 5/out/2026: «o aluno
 * não percebe»): a nota de cada aula validada e as aulas em que esteve e não
 * se autoavaliou (contam 0), cada uma com o peso da sua aula (½ só de
 * atitudes, 1 com técnicas ou conhecimentos). É a mesma lista da conta da
 * nota (notaFinalUC) e a que o aluno e o professor veem. As faltas ficam à parte.
 */
export interface AulaDaNotaUC { planoId: string; titulo: string; data: string; nota: number; peso: number; semResposta: boolean }
export function aulasDaNotaUC(alunoId: string, turmaId: string, ucId: string,
  faltados: Set<string> = new Set(getPlanosFaltadosPorUC(alunoId, ucId, turmaId).map(p => p.id))): AulaDaNotaUC[] {
  // Só os planos que contam: publicados ou realizados (os arquivados não).
  const planosUC = new Map(getPlanosAula().filter(p => p.ucId === ucId && p.turmaId === turmaId && !(p as any).tipoEvento
    && p.estado !== 'arquivado').map(p => [p.id, p]));
  // Uma validação por aula: a mais recente. Quem respondeu duas vezes tinha
  // a mesma aula a contar duas vezes, com a nota antiga e a nova.
  const validacoesAluno = getValidacoes().filter((v: any) => v.alunoId === alunoId);
  const linhas: AulaDaNotaUC[] = [];
  for (const id of new Set(validacoesAluno.map((v: any) => v.planoAulaId as string))) {
    const p: any = planosUC.get(id);
    if (!p || faltados.has(id)) continue;
    const nota = notaDaAulaValidada(validacaoDaAula(alunoId, id, validacoesAluno));
    if (nota === null) continue;
    linhas.push({ planoId: id, titulo: p.titulo || 'Aula', data: String(p.data || '').slice(0, 10), nota, peso: pesoNoModulo(p), semResposta: false });
  }
  // Aulas em que o aluno esteve e não se autoavaliou: contam 0 até se
  // autoavaliar (Rosa, out/2026). Assim o aluno responsabiliza-se. Uma
  // autoavaliação enviada e ainda por validar não conta (espera pelo professor).
  for (const p of planosSemAutoavaliacao(alunoId, turmaId, ucId)) {
    if (faltados.has(p.id) || linhas.some(l => l.planoId === p.id)) continue;
    linhas.push({ planoId: p.id, titulo: p.titulo || 'Aula', data: String(p.data || '').slice(0, 10), nota: 0, peso: pesoNoModulo(p), semResposta: true });
  }
  // A atividade obrigatória fora das horas da aula conta como mais uma aula, na
  // aula que a recebe. Sem autoavaliação conta 0, como as aulas (Rosa, 6/out/2026);
  // respondida e ainda por validar, espera pelo professor.
  const hojeISO_ = new Date().toISOString().slice(0, 10);
  for (const r of atividadesQueContamComoAula(turmaId, ucId)) {
    if (faltados.has(r.atividade.id) || linhas.some(l => l.planoId === r.atividade.id) || r.atividade.data > hojeISO_) continue;
    // Com falta marcada: conta 0, e uma resposta que tenha dado não conta.
    const faltou = temFaltaMarcada(alunoId, r.atividade.id);
    const v = faltou ? undefined : validacaoDaAula(alunoId, r.atividade.id, validacoesAluno);
    const nota = faltou ? 0 : v ? notaDaAulaValidada(v) : null;
    if (nota === null && ultimaResposta(alunoId, r.atividade.id)) continue;
    linhas.push({ planoId: r.atividade.id, titulo: `${r.atividade.titulo || 'Atividade'} (atividade de ${r.atividade.data.split('-').reverse().slice(0, 2).join('/')}, conta como aula)`,
      data: r.dataDaAula, nota: nota ?? 0, peso: pesoNoModulo(r.atividade), semResposta: nota === null });
  }
  return linhas.sort((a, b) => a.data.localeCompare(b.data));
}

/** As atividades obrigatórias fora das horas da aula que contam como aula nesta UC, e a aula que as recebe. */
export function atividadesQueContamComoAula(turmaId: string, ucId: string): { atividade: any; aula: PlanoAula; dataDaAula: string }[] {
  return (getPlanosAula() as any[]).filter(p => p.turmaId === turmaId && atividadeContaComoAula(p))
    .map(p => ({ atividade: { ...p, data: String(p.data || '').slice(0, 10) }, aula: aulaQueRecebeAtividade(p) as PlanoAula }))
    .filter(r => r.aula && r.aula.ucId === ucId)
    .map(r => ({ ...r, dataDaAula: String(r.aula.data || '').slice(0, 10) }));
}

export function notaFinalUC(alunoId: string, turmaId: string, ucId: string): NotaUC {
  const regs = getHistoricoAvaliacoes().filter(r =>
    r.alunoId === alunoId && r.turmaId === turmaId && r.ucId === ucId);
  // Aulas sem farda: as técnicas ficam no percurso com a nota dada, mas na
  // nota contam 0 (nível 1). As atitudes e o resto contam normalmente.
  const semFarda = planosSemFarda(alunoId);
  const regsNota = regs.map(r => semFarda.has(r.planoAulaId || '') && categoriaDe(r.microcompetenciaId) === 'SUB'
    ? { ...r, nota: 1 } : r);
  void regsNota;
  // A média dos planos avaliados, cada um pelo peso da sua aula (Rosa,
  // out/2026): as aulas com técnicas ou conhecimentos contam uma aula
  // inteira, as só de atitudes meia (pesoNoModulo). Antes juntavam-se as
  // competências todas: um plano com o dobro das competências pesava o dobro.
  const faltadosPlanos = getPlanosFaltadosPorUC(alunoId, ucId, turmaId);
  const faltados = new Set(faltadosPlanos.map(p => p.id));
  // Só os planos que contam: publicados ou realizados (os arquivados não).
  const planosUC = new Map(getPlanosAula().filter(p => p.ucId === ucId && p.turmaId === turmaId && !(p as any).tipoEvento
    && p.estado !== 'arquivado').map(p => [p.id, p]));
  // Uma validação por aula: a mais recente. Quem respondeu duas vezes tinha
  // a mesma aula a contar duas vezes, com a nota antiga e a nova.
  void planosUC;
  const notasAulas = aulasDaNotaUC(alunoId, turmaId, ucId, faltados);
  const pesoAulas = notasAulas.reduce((s, x) => s + x.peso, 0);
  const base = pesoAulas ? notasAulas.reduce((s, x) => s + x.nota * x.peso, 0) / pesoAulas : null;
  const recup = notaRecuperacaoUC(alunoId, ucId) ?? 0;
  const pesoFaltas = faltadosPlanos.reduce((s, p) => s + pesoNoModulo(p), 0);
  const comFaltas = faltados.size
    ? Math.round((((base ?? 0) * pesoAulas + recup * pesoFaltas) / (pesoAulas + pesoFaltas)) * 100) / 100
    : base === null ? null : Math.round(base * 100) / 100;
  return aplicarBonusesUC(comFaltas, alunoId, turmaId, ucId);
}

/**
 * Aulas em que o aluno não tinha a farda completa (validação com
 * «semFarda»): a prática avalia-se e fica no percurso, mas as técnicas contam 0.
 */
export function planosSemFarda(alunoId: string): Set<string> {
  return new Set(getValidacoes().filter((v: any) => v.alunoId === alunoId && v.semFarda)
    .map(v => v.planoAulaId || ''));
}

/** Nota da recuperação concluída desta UC, se houver. */
export function notaRecuperacaoUC(alunoId: string, ucId: string): number | null {
  const r = getRecuperacoes().filter(x => x.alunoId === alunoId && x.ucId === ucId
    && x.estado === 'concluida' && typeof x.resultadoNota === 'number')
    .sort((a, b) => String(b.realizadaEm || b.atualizadoEm).localeCompare(String(a.realizadaEm || a.atualizadoEm)))[0];
  return r ? (r.resultadoNota as number) : null;
}

/**
 * Uma aula a que o aluno faltou conta zero na avaliação — ou o resultado
 * da recuperação, quando foi feita. Cada aula pesa o mesmo: a média das
 * aulas avaliadas entra com as faltas.
 */
function baseComFaltas(base: number | null, regs: RegistoAvaliacao[], alunoId: string, turmaId: string, ucId: string): number | null {
  const faltas = getPlanosFaltadosPorUC(alunoId, ucId, turmaId);
  if (!faltas.length) return base;
  const idsFaltas = new Set(faltas.map(p => p.id));
  const avaliadas = new Set(regs.filter(r => r.planoAulaId && !idsFaltas.has(r.planoAulaId)).map(r => r.planoAulaId)).size;
  const recup = notaRecuperacaoUC(alunoId, ucId) ?? 0;
  const soma = (base ?? 0) * avaliadas + recup * faltas.length;
  return Math.round((soma / (avaliadas + faltas.length)) * 100) / 100;
}

// ============================================================
// Planos repetidos
// ============================================================
// Cliques repetidos em "Criar plano" deixaram planos iguais: mesma turma,
// dia, horas, unidade e título, com identificadores diferentes.

export function assinaturaPlano(p: any): string {
  const h = (x?: string) => String(x || '').slice(0, 5);
  return [p.turmaId, String(p.data || '').slice(0, 10), h(p.horaInicio), h(p.horaFim),
    p.ucId || '', String(p.titulo || '').trim()].join('|');
}

/** Grupos de planos iguais numa turma (só os não arquivados). */
export function planosRepetidos(turmaId: string): PlanoAula[][] {
  const grupos = new Map<string, PlanoAula[]>();
  getPlanosAulaPorTurma(turmaId).forEach(p => {
    const k = assinaturaPlano(p);
    grupos.set(k, [...(grupos.get(k) || []), p]);
  });
  return [...grupos.values()].filter(g => g.length > 1);
}

/** Quanto trabalho tem uma cópia — a que tiver mais é a que fica. */
function pesoDoPlano(p: PlanoAula): number {
  let n = 0;
  if (getSessaoAula(p.id)?.abertaEm) n += 1000;
  n += getPresencas().filter(r => r.planoAulaId === p.id).length * 50;
  n += getSelecoes().filter((s: any) => s.planoAulaId === p.id).length * 50;
  if (getRequisicoes().some(r => r.planoAulaId === p.id)) n += 100;
  if (p.estado === 'publicado') n += 20;
  n += (p.fichasIds || []).length * 10;
  return n;
}

/**
 * Junta as cópias. Fica a que tem mais trabalho feito — aula aberta,
 * presenças, autoavaliações, requisição —, recebe as fichas das outras, e
 * as outras são arquivadas, não apagadas.
 */
export function juntarPlanosRepetidos(turmaId: string): { arquivados: number } {
  let arquivados = 0;
  for (const grupo of planosRepetidos(turmaId)) {
    const ordenado = [...grupo].sort((a, b) => pesoDoPlano(b) - pesoDoPlano(a));
    const fica = ordenado[0];
    const fichas = [...new Set(grupo.flatMap(p => p.fichasIds || []))];
    addOrUpdatePlanoAula({ ...fica, fichasIds: fichas, atualizadoEm: new Date().toISOString() } as any);
    for (const copia of ordenado.slice(1)) {
      addOrUpdatePlanoAula({ ...copia, estado: 'arquivado', atualizadoEm: new Date().toISOString() } as any);
      arquivados++;
    }
  }
  return { arquivados };
}

// ============================================================
// Eliminar alunos de vez (coordenação)
// ============================================================
// "Remover" desativa e guarda as notas. "Eliminar" é para quem nunca
// devia ter estado na turma — alunos de teste, criados por engano. Fica
// numa lista, para a lista oficial e o Sheets não o trazerem de volta.

const KEY_ALUNOS_ELIMINADOS = 'ecl_alunos_eliminados';

export function alunosEliminados(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(KEY_ALUNOS_ELIMINADOS) || '[]')); }
  catch { return new Set(); }
}

export function eliminarAlunoDefinitivo(alunoId: string): void {
  const todos = load<Aluno>(KEYS.alunos);
  const a = todos.find(x => x.id === alunoId);
  const fora = alunosEliminados();
  fora.add(alunoId);
  try { localStorage.setItem(KEY_ALUNOS_ELIMINADOS, JSON.stringify([...fora])); } catch { /* */ }
  save(KEYS.alunos, todos.filter(x => x.id !== alunoId));
  // Noutros aparelhos fica, pelo menos, desativado.
  if (a) enviar(SHEETS_ALUNOS_URL, 'upsert_aluno', { aluno: { ...a, ativo: false, eliminado: true } });
  // E sai do Sheets com tudo o que era dele: o aluno ficava lá, com as
  // notas todas, depois de a aplicação dizer que o tinha eliminado.
  enviar(SHEETS_ALUNOS_URL, 'eliminar_aluno', { alunoId });
}

/** Alunos numa turma que já não existe (turmas de teste, nomes antigos). */
export function alunosForaDasTurmas(): Aluno[] {
  const validas = new Set(getTurmas().map(t => t.id));
  return getAlunos().filter(a => !validas.has(a.turmaId));
}

// ============================================================
// Nota prevista pela autoavaliação
// ============================================================
// Quando o aluno se autoavalia, vê já a nota que a proposta dele dá, com
// uma margem — o professor ainda confirma, e pode subir ou descer. A
// margem vem do exemplo da Rosa: o aluno propõe 14, o professor dá 12.

export const MARGEM_AJUSTE_PROFESSOR = 2;   // valores, para cima e para baixo

export interface NotaPrevista { nota: number; min: number; max: number; }

export function previsaoNota(
  autos: { competenciaId: string; nota: number }[],
  tipo: 'pratico' | 'misto' | 'teorico' | 'atitudinal' | 'atitudinal_obr' = 'pratico'
): NotaPrevista | null {
  const validas = autos.filter(a => a.nota > 0 && contaNaNotaDaAula(a.competenciaId));
  if (!validas.length) return null;
  const nota = calcularNotaPlano(
    validas.map(a => ({ categoria: categoriaDe(a.competenciaId), nota: a.nota })), tipo).nota20;
  return {
    nota,
    min: Math.max(0, Math.round((nota - MARGEM_AJUSTE_PROFESSOR) * 10) / 10),
    max: Math.min(20, Math.round((nota + MARGEM_AJUSTE_PROFESSOR) * 10) / 10),
  };
}


/** Aula atitudinal — dinâmicas de grupo e atitudes, sem farda nem KitchenFlow. */
export function ehAulaAtitudinal(p: any): boolean {
  return String(p?.tipoPlanAula || '').startsWith('atitudinal');
}

/** Nesta aula atitudinal, a higiene e a farda contam? */
export function atitudinalComObrigatorias(p: any): boolean {
  return p?.tipoPlanAula === 'atitudinal_obr';
}


// ============================================================
// Eliminar e corrigir planos com avaliações
// ============================================================
// Eliminar um plano apagava só o plano. As autoavaliações, validações,
// notas e presenças dessa aula ficavam soltas — e continuavam a contar
// para a nota da UC. A aplicação não fazia o que dizia.
//
// Agora, tudo o que pertence a um plano eliminado deixa de ser lido, em
// toda a aplicação. Mesmo que o Sheets o mande de volta numa
// sincronização, não volta a contar.

function planosEliminados(): Set<string> {
  return new Set(load<string>(KEYS.eliminadosPlanos));
}

/** Tira tudo o que pertence a planos eliminados. */
function semPlanosEliminados<T>(lista: T[]): T[] {
  const fora = planosEliminados();
  if (!fora.size) return lista;
  return lista.filter((x: any) => !x || !fora.has(x.planoAulaId || x.comandaId || ''));
}

export interface ResumoPlano {
  autoavaliacoes: number;
  validacoes: number;
  notas: number;
  presencas: number;
  aulaAberta: boolean;
  requisicoes: number;
  /** Há alguma coisa que se perde se o plano for eliminado? */
  temAvaliacoes: boolean;
}

/** O que uma aula já tem — para o professor saber o que vai perder. */
export function resumoDoPlano(planoId: string): ResumoPlano {
  const autoavaliacoes = getSelecoes().filter((s: any) => s.planoAulaId === planoId).length;
  const validacoes = getValidacoes().filter((v: any) => v.planoAulaId === planoId).length;
  const notas = getHistoricoAvaliacoes().filter(r => r.planoAulaId === planoId).length;
  const presencas = getPresencas().filter(p => p.planoAulaId === planoId).length;
  const aulaAberta = !!getSessaoAula(planoId)?.abertaEm;
  const requisicoes = getRequisicoes().filter(r => r.planoAulaId === planoId).length;
  return {
    autoavaliacoes, validacoes, notas, presencas, aulaAberta, requisicoes,
    temAvaliacoes: autoavaliacoes + validacoes + notas + presencas > 0 || aulaAberta,
  };
}

/**
 * Anula a aula: o plano e tudo o que os alunos fizeram nela desaparecem.
 * A requisição não se apaga — pode já ter ido para o economato; fica
 * solta, fora de plano.
 */
export function anularPlanoAula(planoId: string): void {
  const turmaDoPlano = getPlanosAula().find(p => p.id === planoId)?.turmaId || '';
  // A requisição desta aula sai também (a cópia da aplicação; o
  // documento oficial do economato não é tocado).
  apagarRequisicoesLocais(r => r.planoAulaId === planoId);
  // As fichas técnicas (e o guião, que vai dentro da ficha) FICAM na
  // biblioteca e no Sheets: só deixam de estar ligadas a esta aula.
  getFichasProducao().filter(f => (f as any).planoAulaId === planoId)
    .forEach(f => addOrUpdateFichaProducao({ ...f, planoAulaId: '', atualizadoEm: new Date().toISOString() } as any));
  eliminarPlanoAulaDefinitivamente(planoId);
  // E no Sheets sai tudo o que era desta aula (autoavaliações, presenças,
  // validações, abertura, grupos…), não só o plano. Fica registado nos
  // ELIMINADOS: não volta.
  enviar(SHEETS_PLANOS_URL, 'eliminar_do_plano', { planoId, turmaId: turmaDoPlano });
  save(KEY_MEMBROS, load<any>(KEY_MEMBROS).filter(m => m.planoAulaId !== planoId));
  save(KEY_INFO_GRUPOS, load<any>(KEY_INFO_GRUPOS).filter(g => g.planoAulaId !== planoId));
  save(KEY_PARES, load<any>(KEY_PARES).filter(x => x.planoAulaId !== planoId));
  // Limpar já do aparelho — as leituras já os escondem, isto só arruma.
  save(KEY_HIST, load<RegistoAvaliacao>(KEY_HIST).filter(r => r.planoAulaId !== planoId));
  save(KEYS.selecoes, load<any>(KEYS.selecoes).filter(s => s.planoAulaId !== planoId));
  save(KEYS.validacoes, load<any>(KEYS.validacoes).filter(v => v.planoAulaId !== planoId));
  save(KEYS.presencas, load<any>(KEYS.presencas).filter(p => p.planoAulaId !== planoId));
  save(KEY_SESSOES as any, load<any>(KEY_SESSOES as any).filter(s => s.planoAulaId !== planoId));
  save(KEY_TRANSICAO, load<any>(KEY_TRANSICAO).filter(t => t.planoAulaId !== planoId));
}

/**
 * Corrige um plano já criado — data, horas, tipo, unidade, título. As
 * avaliações ficam; se a unidade mudar, passam a contar para a nova.
 */
export function atualizarPlano(planoId: string, alteracoes: Partial<PlanoAula>): PlanoAula | null {
  const p = getPlanosAula().find(x => x.id === planoId);
  if (!p) return null;
  // Mudou a unidade: o manual e as competências acompanham (Rosa, out/2026).
  // Saem os indicadores do manual da unidade antiga (e as retiradas deles);
  // numa aula dada pelo professor entra o próximo conteúdo do manual novo;
  // num trabalho com tema, fica sem nada marcado (os alunos escolhem entre todos).
  if (alteracoes.ucId !== undefined && alteracoes.ucId !== p.ucId) {
    const x: any = p;
    const mNovo = manualDaUC(alteracoes.ucId);
    const doNovo = (id: string) => !!mNovo && String(id).startsWith(`KNW-P-M-${mNovo.ficheiro}-`);
    const doManual = (id: string) => String(id).startsWith('KNW-P-M-');
    const ficam = ((x.conhecimentosProf || []) as any[]).filter(k => !doManual(k.id) || doNovo(k.id));
    const tri: any = x.triagemAula;
    const tipo = String(x.tipoPlanAula || '').replace('_obr', '');
    if (!ficam.some(k => doManual(k.id)) && (tipo === 'teorico' || tipo === 'misto') && !(tri && (tri.modo === 'grupo' || tri.modo === 'individual'))) {
      const prox = proximoConteudo(getPlanosAula(), p.turmaId, alteracoes.ucId, p.id);
      if (prox) ficam.push(...indicadoresDoConteudo(prox.ficheiro, prox.capitulo));
    }
    (alteracoes as any).conhecimentosProf = ficam;
    (alteracoes as any).compRemovidas = ((x.compRemovidas || []) as string[]).filter(id => !doManual(id) || doNovo(id));
    (alteracoes as any).compAdicionadas = ((x.compAdicionadas || []) as string[]).filter(id => !doManual(id) || doNovo(id));
  }
  const novo = { ...p, ...alteracoes, atualizadoEm: new Date().toISOString() } as PlanoAula;
  addOrUpdatePlanoAula(novo);
  if (alteracoes.ucId && alteracoes.ucId !== p.ucId) {
    const uc = alteracoes.ucId;
    save(KEY_HIST, load<RegistoAvaliacao>(KEY_HIST).map(r => r.planoAulaId === planoId ? { ...r, ucId: uc } : r));
    save(KEYS.presencas, load<any>(KEYS.presencas).map(r => r.planoAulaId === planoId ? { ...r, ucId: uc } : r));
  }
  return novo;
}

// ============================================================
// Requisição desatualizada
// ============================================================
// O professor faz a requisição e depois acrescenta ou tira fichas ao
// plano. A requisição ficava com os ingredientes antigos, sem aviso — e
// ao economato chegava um pedido que já não correspondia à aula.

export interface DiferencaRequisicao { faltam: string[]; sobram: string[]; }

/** Fichas do plano que a requisição não tem, e as que tem a mais. Null se está em dia. */
export function requisicaoDesatualizada(planoId: string): DiferencaRequisicao | null {
  const plano = getPlanosAula().find(p => p.id === planoId);
  const req = getRequisicaoPorPlano(planoId); // a mais recente
  if (!plano || !req) return null;
  const doPlano = new Set(plano.fichasIds || []);
  const naReq = new Set(req.fichasIds || []);
  const faltam = [...doPlano].filter(id => !naReq.has(id));
  const sobram = [...naReq].filter(id => !doPlano.has(id));
  return faltam.length || sobram.length ? { faltam, sobram } : null;
}


// ============================================================
// Datas e estado da ligação
// ============================================================

/** 'YYYY-MM-DD' no dia local, venha a data como vier do Sheets. */
export function dataSoDia(v: any): string {
  if (!v) return '';
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (isNaN(d.getTime())) return s.slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const KEY_LEITURA_PLANOS = 'ecl_leitura_planos';

function marcarLeituraPlanos(ok: boolean): void {
  try { localStorage.setItem(KEY_LEITURA_PLANOS, JSON.stringify({ ok, quando: new Date().toISOString() })); }
  catch { /* */ }
}

/** A última tentativa de ir buscar as aulas correu bem? */
export function leituraDePlanosFalhou(): boolean {
  try {
    const r = JSON.parse(localStorage.getItem(KEY_LEITURA_PLANOS) || 'null');
    return !!r && r.ok === false;
  } catch { return false; }
}

// ============================================================
// Publicar para os alunos — com confirmação
// ============================================================
// O envio para o Apps Script não devolve resposta (limitação do Google).
// A aplicação dizia "publicado" sem saber se a aula tinha chegado ao
// Sheets — e o aluno, que só lê de lá, ficava sem aula nenhuma.
//
// Agora publica-se assim: marcar, enviar, e ir ler ao Sheets se a aula
// lá está mesmo. Só então se diz ao professor que os alunos já a veem.

export interface ResultadoPublicacao {
  ok: boolean;
  erro?: string;
}

// Estado de cada publicação, partilhado por todos os botões. Carregar
// duas vezes (ou em dois botões) não envia duas vezes: devolve o mesmo
// envio que já está a decorrer, e todos os botões mostram o mesmo estado.
export type FasePublicacao = 'a_enviar' | 'confirmado' | 'falhou';
export interface EstadoPublicacao { fase: FasePublicacao; erro?: string; em: number; }

const estadosPublicacao = new Map<string, EstadoPublicacao>();
const publicacoesEmCurso = new Map<string, Promise<ResultadoPublicacao>>();
const ouvintesPublicacao = new Set<() => void>();

export function estadoPublicacao(planoId: string): EstadoPublicacao | undefined {
  return estadosPublicacao.get(planoId);
}
export function subscreverPublicacao(fn: () => void): () => void {
  ouvintesPublicacao.add(fn);
  return () => { ouvintesPublicacao.delete(fn); };
}
function marcarPublicacao(planoId: string, e: Omit<EstadoPublicacao, 'em'>) {
  estadosPublicacao.set(planoId, { ...e, em: Date.now() });
  ouvintesPublicacao.forEach(f => { try { f(); } catch { /* */ } });
}

/** Anota no plano, só neste aparelho e sem mudar a hora da alteração:
 *  segue com o próximo envio do plano (a publicação, por exemplo). */
export function anotarNoPlano(planoId: string, campos: Record<string, unknown>): void {
  const all = getPlanosAula();
  const i = all.findIndex(p => p.id === planoId);
  if (i < 0) return;
  all[i] = { ...all[i], ...campos } as PlanoAula;
  save(KEYS.planos, all);
}

export function publicarPlanoParaAlunos(planoId: string): Promise<ResultadoPublicacao> {
  const emCurso = publicacoesEmCurso.get(planoId);
  if (emCurso) return emCurso;
  marcarPublicacao(planoId, { fase: 'a_enviar' });
  const p = publicarEConfirmar(planoId)
    .catch(() => ({ ok: false, erro: 'Não consegui confirmar a publicação.' }) as ResultadoPublicacao)
    .then(r => {
      marcarPublicacao(planoId, r.ok ? { fase: 'confirmado' } : { fase: 'falhou', erro: r.erro });
      return r;
    })
    .finally(() => { publicacoesEmCurso.delete(planoId); });
  publicacoesEmCurso.set(planoId, p);
  return p;
}

async function publicarEConfirmar(planoId: string): Promise<ResultadoPublicacao> {
  const plano = getPlanosAula().find(p => p.id === planoId);
  if (!plano) return { ok: false, erro: 'Plano não encontrado.' };

  const publicado = { ...plano, estado: 'publicado' as const, atualizadoEm: new Date().toISOString() };
  // Grava no aparelho e envia À FRENTE de tudo o resto. Antes ia para a
  // fila normal e a aplicação só esperava uns segundos: se o script
  // estivesse a meio de outra gravação, dizia «falhou» — e a aula
  // chegava depois. Agora espera que a gravação termine mesmo, e só
  // depois confere no Sheets.
  const todos = getPlanosAula();
  const iP = todos.findIndex(x => x.id === planoId);
  if (iP >= 0) todos[iP] = publicado; else todos.push(publicado);
  save(KEYS.planos, todos);
  registarEnvio(publicado.id, 'plano', publicado.titulo || `Plano de ${publicado.data}`);
  porConfirmar('plano', publicado.id, publicado.titulo || `Plano de ${publicado.data}`, publicado.turmaId);
  const esperar = (ms: number) => new Promise(res => setTimeout(res, ms));
  const estaLa = async (): Promise<boolean | null> => {
    // Script v19: a aula que os telemóveis leem já tem o plano publicado?
    try {
      const json: any = aulaNaoSuportada ? null : await lerDoSheets(SHEETS_ECL_URL, { tipo: 'get_aula', turmaId: plano.turmaId });
      if (json?.ok && Array.isArray(json.planos) && json.planos.some((p: any) => p.id === planoId)) return true;
    } catch { /* confere pela folha */ }
    try {
      const json: any = await lerDoSheets(SHEETS_PLANOS_URL, { tipo: 'get_planos', turmaId: plano.turmaId });
      if (!json?.ok) return null;
      const la: any = (json.dados || []).find((p: any) => p.id === planoId);
      return !!la && String(la.estado) === 'publicado';
    } catch { return null; }
  };
  let ligou = false;
  for (let volta = 0; volta < 2; volta++) {
    if (volta === 0) paraABase('plano', { plano: publicado });
    await Promise.race([enviarAgora(SHEETS_PLANOS_URL, { tipo: 'plano', plano: publicado }, 'urgente'), esperar(120000)]);
    for (const ms of [300, 1500, 3000, 5000]) {
      await esperar(ms);
      const r = await estaLa();
      if (r !== null) ligou = true;
      if (r) return { ok: true };
    }
  }
  return { ok: false, erro: ligou
    ? 'A aula não chegou ao Sheets, por isso os alunos ainda não a veem. Carregue outra vez em «Publicar».'
    : 'Sem ligação ao Sheets. A aula ficou registada neste aparelho, mas os alunos só a veem quando chegar ao Sheets. Carregue outra vez em «Publicar» quando tiver ligação à internet.' };
}

// ============================================================
// Enviar tudo para o Sheets
// ============================================================
// O que está no aparelho está completo — as fichas com ingredientes e
// preparação, os planos, as avaliações. Para o Sheets só sobe quando se
// mexe em cada coisa. Isto empurra tudo de uma vez: serve para encher o
// ficheiro novo, e para recuperar de um período sem ligação.

export interface ProgressoEnvio { feito: number; total: number; oQue: string; }

export async function enviarTudoParaOSheets(
  turmaId: string,
  aoProgredir?: (p: ProgressoEnvio) => void
): Promise<{ enviados: number; emFalta: string[] }> {
  const alunos = getAlunos().filter(a => a.turmaId === turmaId);
  const planos = getPlanosAula().filter(p => p.turmaId === turmaId);
  const idsPlanos = new Set(planos.map(p => p.id));
  const fichas = getFichasProducao();
  const requisicoes = getRequisicoes().filter(r => r.turmaId === turmaId);
  const avaliacoes = getHistoricoAvaliacoes().filter(r => r.turmaId === turmaId);
  const presencas = getPresencas().filter(p => idsPlanos.has(p.planoAulaId || ''));
  const selecoes = getSelecoes().filter((s: any) => s.turmaId === turmaId);
  const validacoes = getValidacoes().filter((v: any) => v.turmaId === turmaId);
  const sessoes = getSessoesAula().filter(s => s.turmaId === turmaId);

  const tarefas: { oQue: string; fazer: () => void }[] = [];
  alunos.forEach(a => tarefas.push({ oQue: 'alunos', fazer: () => enviar(SHEETS_ALUNOS_URL, 'upsert_aluno', { aluno: a }) }));
  planos.forEach(p => tarefas.push({ oQue: 'planos', fazer: () => enviar(SHEETS_PLANOS_URL, 'plano', { plano: p }) }));
  fichas.forEach(f => tarefas.push({ oQue: 'fichas', fazer: () => enviar(SHEETS_FICHAS_URL, 'ficha', { ficha: f }) }));
  requisicoes.forEach(r => tarefas.push({ oQue: 'requisições', fazer: () => enviar(SHEETS_PLANOS_URL, 'requisicao', { requisicao: r }) }));
  sessoes.forEach(s => tarefas.push({ oQue: 'sessões', fazer: () => enviar(SHEETS_HISTORICO_URL, 'sessao', s as any) }));
  presencas.forEach(p => tarefas.push({ oQue: 'presenças', fazer: () => enviar(SHEETS_HISTORICO_URL, 'presenca', p as any) }));
  selecoes.forEach(s => tarefas.push({ oQue: 'autoavaliações', fazer: () => enviar(SHEETS_HISTORICO_URL, 'selecao', s as any) }));
  validacoes.forEach(v => tarefas.push({ oQue: 'validações', fazer: () => enviar(SHEETS_HISTORICO_URL, 'validacao', v as any) }));
  avaliacoes.forEach(r => tarefas.push({ oQue: 'avaliações', fazer: () => enviar(SHEETS_HISTORICO_URL, 'avaliacao', r as any) }));

  // Um de cada vez, com espaço entre eles. Disparados todos ao mesmo
  // tempo, o Google recusa os que passam do limite de execuções em
  // paralelo — e não avisa. Foi assim que chegaram 25 de 65 alunos.
  for (let i = 0; i < tarefas.length; i++) {
    tarefas[i].fazer();
    aoProgredir?.({ feito: i + 1, total: tarefas.length, oQue: tarefas[i].oQue });
    await new Promise(res => setTimeout(res, 220));
    if (i % 25 === 24) await new Promise(res => setTimeout(res, 1500));
  }

  // Conferir e repetir o que faltar. Duas rondas.
  const emFalta: string[] = [];
  for (let ronda = 0; ronda < 2; ronda++) {
    await new Promise(res => setTimeout(res, 2500));
    const faltam = await oQueNaoChegou(turmaId, alunos, planos, fichas);
    if (!faltam.length) return { enviados: tarefas.length, emFalta: [] };
    if (ronda === 1) { emFalta.push(...faltam.map(x => x.rotulo)); break; }
    aoProgredir?.({ feito: tarefas.length, total: tarefas.length, oQue: `a repetir ${faltam.length}` });
    for (const f of faltam) {
      f.reenviar();
      await new Promise(res => setTimeout(res, 300));
    }
  }
  return { enviados: tarefas.length, emFalta };
}

/** O que foi enviado e não está no Sheets — com forma de o reenviar. */
async function oQueNaoChegou(
  turmaId: string, alunos: Aluno[], planos: PlanoAula[], fichas: FichaProducao[]
): Promise<{ rotulo: string; reenviar: () => void }[]> {
  const faltam: { rotulo: string; reenviar: () => void }[] = [];
  const ler = async (url: string, tipo: string) => {
    try {
      const j: any = await lerDoSheets(url, { tipo, turmaId });
      return j?.ok ? new Set((j.dados || []).map((x: any) => String(x.id))) : null;
    } catch { return null; }
  };

  const la = await ler(SHEETS_ALUNOS_URL, 'get_alunos');
  if (la) alunos.filter(a => !la.has(a.id)).forEach(a => faltam.push({
    rotulo: `aluno ${a.numero} — ${a.nome}`,
    reenviar: () => enviar(SHEETS_ALUNOS_URL, 'upsert_aluno', { aluno: a }),
  }));

  const lp = await ler(SHEETS_PLANOS_URL, 'get_planos');
  if (lp) planos.filter(p => !lp.has(p.id)).forEach(p => faltam.push({
    rotulo: `plano ${p.titulo || p.id}`,
    reenviar: () => enviar(SHEETS_PLANOS_URL, 'plano', { plano: p }),
  }));

  const lf = await ler(SHEETS_FICHAS_URL, 'get_fichas');
  if (lf) fichas.filter(f => !lf.has(f.id)).forEach(f => faltam.push({
    rotulo: `ficha ${f.nomePrato}`,
    reenviar: () => enviar(SHEETS_FICHAS_URL, 'ficha', { ficha: f }),
  }));

  return faltam;
}

/** Só as contas, para o professor ver o que vai enviar. */
export function oQueHaParaEnviar(turmaId: string): Record<string, number> {
  const idsPlanos = new Set(getPlanosAula().filter(p => p.turmaId === turmaId).map(p => p.id));
  return {
    alunos: getAlunos().filter(a => a.turmaId === turmaId).length,
    planos: idsPlanos.size,
    fichas: getFichasProducao().length,
    requisições: getRequisicoes().filter(r => r.turmaId === turmaId).length,
    sessões: getSessoesAula().filter(s => s.turmaId === turmaId).length,
    presenças: getPresencas().filter(p => idsPlanos.has(p.planoAulaId || '')).length,
    autoavaliações: getSelecoes().filter((s: any) => s.turmaId === turmaId).length,
    validações: getValidacoes().filter((v: any) => v.turmaId === turmaId).length,
    avaliações: getHistoricoAvaliacoes().filter(r => r.turmaId === turmaId).length,
  };
}

// ============================================================
// Confirmar que a avaliação chegou ao Sheets
// ============================================================
// O envio não devolve resposta (limitação do Apps Script). Sem
// confirmação, uma avaliação podia ficar só no computador do professor
// e ninguém dava por isso — e uma nota que se perde engana o aluno e o
// professor. Depois de validar, a aplicação vai ler e confere.

export async function confirmarRegistosNoSheets(
  turmaId: string, ids: string[]
): Promise<{ ok: boolean; encontrados: number; total: number; erro?: string }> {
  if (!ids.length) return { ok: true, encontrados: 0, total: 0 };
  // Cada nota é um envio, e o Sheets grava um de cada vez: 15 notas podem
  // levar meio minuto. Vai vendo, e pára logo que estiverem todas.
  const esperas = [2000, 3000, 5000, 8000, 12000];
  let encontrados = 0, erro: string | undefined;
  for (const espera of esperas) {
    await new Promise(res => setTimeout(res, espera));
    try {
      const json: any = await lerDoSheets(SHEETS_HISTORICO_URL, { tipo: 'get_avaliacoes', turmaId });
      if (!json?.ok) continue;
      const la = new Set((json.dados || json.avaliacoes || []).map((r: any) => String(r.id)));
      encontrados = ids.filter(id => la.has(String(id))).length;
      if (encontrados === ids.length) return { ok: true, encontrados, total: ids.length };
    } catch (e) { erro = String(e); }
  }
  return { ok: false, encontrados, total: ids.length, erro };
}

/**
 * Teste de ligação: escreve um registo de teste, vai lê-lo e apaga-o.
 * Diz exatamente onde está a falhar — a escrever ou a ler.
 */
export async function testarLigacaoAoSheets(turmaId: string): Promise<string[]> {
  const linhas: string[] = [];
  const url = SHEETS_ECL_URL || SHEETS_HISTORICO_URL;
  linhas.push('Endereço em uso: …' + url.slice(-16));
  linhas.push(SHEETS_ECL_URL ? 'Script único: SIM' : 'Script único: NÃO (ainda a usar os antigos)');

  // 1. Ler
  try {
    const json: any = await lerDoSheets(url, { tipo: 'get_avaliacoes', turmaId });
    linhas.push(json?.ok ? `Leitura: OK (${(json.dados || []).length} avaliações desta turma)`
      : 'Leitura: FALHOU — o script não respondeu como devia');
  } catch (e) {
    linhas.push('Leitura: FALHOU — ' + String(e).slice(0, 60));
  }

  // 2. Escrever e voltar a ler
  const id = novoId('teste');
  enviar(SHEETS_HISTORICO_URL, 'avaliacao', {
    id, alunoId: 'TESTE', turmaId, planoAulaId: 'TESTE', ucId: 'TESTE',
    microcompetencia: 'TESTE', microcompetenciaId: 'TESTE', nota: 1,
    data: new Date().toISOString(), validadoPor: 'teste', nomeAluno: 'Teste de ligação',
  });
  const r = await confirmarRegistosNoSheets(turmaId, [id]);
  linhas.push(r.ok ? 'Escrita: OK. O que guarda chega ao Sheets.'
    : 'Escrita: FALHOU. O que guarda NÃO chega ao Sheets.');
  if (!r.ok) linhas.push('Apague a linha de teste se ela aparecer mais tarde (aluno TESTE).');
  return linhas;
}


// ============================================================
// Horas perdidas por atraso
// ============================================================
// Um atraso não é uma falta à aula inteira, mas também não é zero: o
// aluno que chega duas horas depois perdeu duas horas de aula. Contam-se
// as horas completas de atraso, depois da tolerância — quem chega dentro
// dos dez minutos não perde nada.

export function horasPerdidasPorAtraso(
  alunoId: string, ucId: string, turmaId: string, jaContados?: Set<string>
): number {
  const hoje = new Date().toISOString().slice(0, 10);
  const planos = getPlanosAula().filter(p =>
    p.ucId === ucId && p.turmaId === turmaId
    && (p.estado === 'publicado' || p.estado === 'realizada')
    && (p as any).contaAssiduidade !== false
    && !jaContados?.has(p.id)
    && aulaJaAconteceu(p, hoje));

  const presencas = getPresencas().filter(r => r.alunoId === alunoId);
  let horas = 0;
  for (const p of planos) {
    const reg: any = presencas.find(r => r.planoAulaId === p.id);
    if (!reg || reg.decisaoProfessor === 'sem_falta') continue;
    // Só algumas horas: faltou as que não foram escolhidas.
    if (reg.decisaoProfessor === 'parcial') {
      horas += Math.max(0, horasDoPlano(p) - horasDosBlocos(p, reg.horasPresentes || []));
      continue;
    }
    horas += horasDoAtraso(reg, horasDoPlano(p));
  }
  return horas;
}

/**
 * Horas de falta de um atraso. Falta de atraso marcada pelo professor conta
 * horas (Rosa, set/2026): as horas começadas, no mínimo 1, nunca mais do que
 * a aula. Um atraso sem essa decisão conta só as horas completas perdidas.
 */
export function horasDoAtraso(reg: any, horasAula: number): number {
  const minutos = Number(reg?.atrasadoMins) || 0;
  if (reg?.decisaoProfessor === 'falta_atraso') return Math.min(Math.max(1, Math.ceil(minutos / 60)), horasAula);
  if (minutos <= 0) return 0;
  return Math.min(Math.floor(minutos / 60), horasAula);
}

// ============================================================
// Fecho de UC — pauta e envio por email
// ============================================================
// Quando o módulo acaba, o professor tem de fechar a avaliação e mandar
// a pauta para a direção. Sem isto ficava à espera de se lembrar, e
// depois tinha de refazer as contas à mão.

export interface LinhaPauta {
  numero: number;
  nome: string;
  alunoId: string;
  base: number | null;
  bonusAssiduidade: number;
  bonusParticipacao: number;
  final: number | null;
  presenca: number;
  recuperacao: boolean;
  motivo: string;
}

/** A pauta de uma UC: uma linha por aluno, com as contas já feitas. */
export function pautaDaUC(turmaId: string, ucId: string): LinhaPauta[] {
  return getAlunos()
    .filter(a => a.turmaId === turmaId && a.ativo !== false)
    .sort((a, b) => a.numero - b.numero)
    .map(a => {
      const n = notaFinalUC(a.id, turmaId, ucId);
      const s = situacaoRecuperacaoUC(a.id, turmaId, ucId);
      return {
        numero: a.numero, nome: a.nome || `Aluno ${a.numero}`, alunoId: a.id,
        base: n.base, bonusAssiduidade: n.bonusAssiduidade,
        bonusParticipacao: n.bonusParticipacao, final: n.final,
        presenca: s.presenca, recuperacao: s.precisa,
        motivo: s.motivo === 'faltas' ? 'faltas acima de 10%'
          : s.motivo === 'negativa' ? 'terminou sem positiva' : '',
      };
    });
}

const KEY_FECHOS = 'ecl_ucs_fechadas';

function ucsFechadas(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY_FECHOS) || '[]'); } catch { return []; }
}

export function ucJaFechada(turmaId: string, ucId: string): boolean {
  return ucsFechadas().includes(turmaId + '|' + ucId);
}

export function marcarUCFechada(turmaId: string, ucId: string): void {
  const todas = ucsFechadas();
  const chave = turmaId + '|' + ucId;
  if (!todas.includes(chave)) {
    todas.push(chave);
    try { localStorage.setItem(KEY_FECHOS, JSON.stringify(todas)); } catch { /* */ }
  }
}

/** UCs cujo módulo já acabou e que ainda não foram fechadas. */
export function ucsPorFechar(turmaId: string): { ucId: string; nome: string; dataFim: string }[] {
  const hoje = new Date().toISOString().slice(0, 10);
  const comAulas = new Set(getPlanosAulaPorTurma(turmaId).map(p => p.ucId).filter(Boolean) as string[]);
  return modulosDaTurma(turmaId)
    .filter((m: any) => m.dataFim && m.dataFim < hoje && comAulas.has(m.id) && !ucJaFechada(turmaId, m.id))
    .map((m: any) => ({ ucId: m.id, nome: m.nome, dataFim: m.dataFim }));
}

/**
 * Manda a pauta para o email do professor. O ficheiro fica no Drive da
 * escola, numa folha própria; o email leva o link.
 */
export async function enviarPautaPorEmail(
  turmaId: string, ucId: string, email: string, professor: string,
  /** Só estes alunos entram na pauta. Sem lista, entram todos. */
  alunosIds?: string[],
  /** As linhas da pauta oficial (modelo da escola), já com a classificação
   *  atribuída pelo professor. Com elas, o email leva essas notas e não
   *  outra conta. */
  linhasOficiais?: Record<string, unknown>[]
): Promise<{ ok: boolean; erro?: string }> {
  if (!email || !email.includes('@')) return { ok: false, erro: 'Email inválido.' };
  const mod: any = modulosDaTurma(turmaId).find((m: any) => m.id === ucId);
  enviar(SHEETS_HISTORICO_URL, 'pauta', {
    turmaId, ucId, ucNome: mod?.nome || '', email, professor,
    disciplina: mod?.disciplina || '', horasPrevistas: mod?.horasPrevistas || 0,
    dataInicio: mod?.dataInicio || '', dataFim: mod?.dataFim || '',
    linhas: linhasOficiais || pautaDaUC(turmaId, ucId).filter(l => !alunosIds || alunosIds.includes(l.alunoId)),
    criadaEm: new Date().toISOString(),
  });
  // Dar tempo ao script e confirmar que a pauta ficou registada.
  await new Promise(res => setTimeout(res, 2500));
  try {
    const json: any = await lerDoSheets(SHEETS_HISTORICO_URL, { tipo: 'get_pautas', turmaId });
    const la = (json?.dados || json?.pautas || []).some((p: any) =>
      String(p.ucId) === ucId && String(p.turmaId) === turmaId);
    return la ? { ok: true } : { ok: false, erro: 'A pauta não chegou ao Sheets. Tente outra vez.' };
  } catch {
    return { ok: false, erro: 'Não consegui confirmar o envio.' };
  }
}

const KEY_EMAIL_PROF = 'ecl_email_professor';
export function emailDoProfessor(): string {
  try { return localStorage.getItem(KEY_EMAIL_PROF) || ''; } catch { return ''; }
}
export function guardarEmailDoProfessor(email: string): void {
  try { localStorage.setItem(KEY_EMAIL_PROF, email.trim()); } catch { /* */ }
}

// ============================================================
// Cada professor vê os seus planos
// ============================================================
// Vários professores dão aulas à mesma turma. Sem isto, cada um via o
// calendário cheio das aulas dos outros e não encontrava as suas.
//
// Os planos antigos não têm professor gravado — esses aparecem a todos,
// senão desapareciam sem explicação.

/** O plano é deste professor (ou é antigo, sem dono)? */
export function planoDoProfessor(plano: PlanoAula, nomeProfessor?: string): boolean {
  const dono = String((plano as any).professor || '').trim().toLowerCase();
  if (!dono) return true;                       // plano antigo, sem dono
  const eu = String(nomeProfessor || '').trim().toLowerCase();
  if (!eu) return true;                         // sem nome, vê tudo
  return dono === eu;
}

/** Quem tem planos nesta turma — para a coordenadora saber quem é quem. */
export function professoresComPlanos(turmaId: string): string[] {
  const nomes = new Set<string>();
  getPlanosAulaPorTurma(turmaId).forEach(p => {
    const n = String((p as any).professor || '').trim();
    if (n) nomes.add(n);
  });
  return [...nomes].sort();
}

// ============================================================
// Nada se perde: lista de espera com confirmação
// ============================================================
// O envio para o Apps Script não devolve resposta — o Google aceita ou
// descarta sem dizer nada. Um plano criado podia nunca chegar ao Sheets
// e ninguém dava por isso durante uma hora.
//
// Agora tudo o que é importante fica numa lista de espera. De minuto a
// minuto a aplicação vai ler o Sheets, risca o que já lá está e reenvia
// o que falta. O que teimar em não chegar aparece ao professor.

const KEY_ESPERA = 'ecl_por_confirmar';

export interface PorConfirmar {
  tipo: 'plano' | 'ficha' | 'aluno' | 'avaliacao' | 'selecao' | 'validacao';
  id: string;
  rotulo: string;
  turmaId: string;
  desde: string;
  tentativas: number;
  /** (planos) O que a última conferência viu: para o professor saber porque não confirma. */
  motivo?: 'sem_leitura' | 'nao_esta' | 'versao_antiga';
  versaoNoSheets?: string;
  /** (planos) A versão que já chegou à base de dados — e, por ela, aos alunos. */
  naBaseVersao?: string;
}

function espera(): PorConfirmar[] {
  try { return JSON.parse(localStorage.getItem(KEY_ESPERA) || '[]'); } catch { return []; }
}
function guardarEspera(l: PorConfirmar[]): void {
  try { localStorage.setItem(KEY_ESPERA, JSON.stringify(l.slice(-300))); } catch { /* */ }
}

/** «validação de Diogo Neves, aula de 02/10» — para o professor saber o que ficou por enviar. */
function rotuloAlunoAula(oQue: string, alunoId?: string, planoAulaId?: string): string {
  const a = alunoId ? getAlunos().find(x => x.id === alunoId) : undefined;
  const p = planoAulaId ? getPlanosAula().find(x => x.id === planoAulaId) : undefined;
  const dia = p?.data ? String(p.data).slice(0, 10).split('-').reverse().slice(0, 2).join('/') : '';
  return `${oQue}${a ? ` de ${a.nome || 'n.º ' + a.numero}` : ''}${dia ? `, aula de ${dia}` : ''}`;
}

export function porConfirmar(tipo: PorConfirmar['tipo'], id: string, rotulo: string, turmaId: string): void {
  const l = espera();
  const ja = l.find(x => x.tipo === tipo && x.id === id);
  // Um plano alterado outra vez é uma versão nova: volta a ter as tentativas todas.
  if (ja) { if (tipo === 'plano') { ja.tentativas = 0; ja.desde = new Date().toISOString(); guardarEspera(l); } return; }
  l.push({ tipo, id, rotulo, turmaId, desde: new Date().toISOString(), tentativas: 0 });
  guardarEspera(l);
}

/** O que ficou por enviar, dito com o aluno e a aula (também nos registos antigos). */
export function rotuloDaEspera(x: PorConfirmar): string {
  if (x.tipo === 'validacao') {
    const v: any = getValidacoes().find(y => y.id === x.id);
    if (v) return rotuloAlunoAula('validação', v.alunoId, v.planoAulaId);
  }
  if (x.tipo === 'selecao') {
    const s = load<SelecaoAluno>(KEYS.selecoes).find(y => y.id === x.id);
    if (s) return rotuloAlunoAula('autoavaliação', s.alunoId, s.planoAulaId);
  }
  return x.rotulo;
}

/** Quantos ainda não se sabe se chegaram, e há quanto tempo. */
export function estadoDaEspera(): { total: number; teimosos: PorConfirmar[] } {
  const l = espera();
  return { total: l.length, teimosos: l.filter(x => x.tentativas >= 2) };
}

const LEITURA_POR_TIPO: Record<PorConfirmar['tipo'], [string, string]> = {
  plano:     [SHEETS_PLANOS_URL, 'get_planos'],
  ficha:     [SHEETS_FICHAS_URL, 'get_fichas'],
  aluno:     [SHEETS_ALUNOS_URL, 'get_alunos'],
  avaliacao: [SHEETS_HISTORICO_URL, 'get_avaliacoes'],
  selecao:   [SHEETS_HISTORICO_URL, 'get_selecoes'],
  validacao: [SHEETS_HISTORICO_URL, 'get_validacoes'],
};

/** O registo ainda existe neste aparelho (se não, já não há nada a enviar). */
/** Foi apagado de vez noutro aparelho: sai deste também (fica marcado, para
 *  nenhuma leitura o trazer de volta). */
function esquecerEliminado(p: PorConfirmar): void {
  try {
    if (p.tipo === 'plano') {
      const ja = new Set(load<string>(KEYS.eliminadosPlanos));
      if (!ja.has(String(p.id))) save(KEYS.eliminadosPlanos, [...ja, String(p.id)]);
      save(KEYS.planos, load<any>(KEYS.planos).filter(x => x?.id !== p.id));
    }
  } catch { /* fica para a próxima */ }
}

function existeAinda(p: PorConfirmar): boolean {
  try {
    if (p.tipo === 'plano') return getPlanosAula().some(x => x.id === p.id) && !load<string>(KEYS.eliminadosPlanos).includes(String(p.id));
    if (p.tipo === 'ficha') return getFichasProducao().some(x => x.id === p.id);
    if (p.tipo === 'aluno') return getAlunos().some(x => x.id === p.id);
    if (p.tipo === 'selecao') return load<SelecaoAluno>(KEYS.selecoes).some(x => x.id === p.id);
    if (p.tipo === 'validacao') return getValidacoes().some(x => x.id === p.id);
  } catch { /* na dúvida, fica */ }
  return true;
}

function reenviar(p: PorConfirmar): void {
  if (p.tipo === 'plano') {
    const plano = getPlanosAula().find(x => x.id === p.id);
    if (plano) enviar(SHEETS_PLANOS_URL, 'plano', { plano });
  } else if (p.tipo === 'ficha') {
    const ficha = getFichasProducao().find(x => x.id === p.id);
    if (ficha) enviar(SHEETS_FICHAS_URL, 'ficha', { ficha });
  } else if (p.tipo === 'aluno') {
    const aluno = getAlunos().find(x => x.id === p.id);
    if (aluno) enviar(SHEETS_ALUNOS_URL, 'upsert_aluno', { aluno });
  } else if (p.tipo === 'selecao') {
    const sel = load<SelecaoAluno>(KEYS.selecoes).find(x => x.id === p.id);
    if (sel) enviar(SHEETS_HISTORICO_URL, 'selecao', corpoSelecao(sel));
  } else if (p.tipo === 'validacao') {
    const v = getValidacoes().find(x => x.id === p.id);
    if (v) enviarValidacaoAoSheets(v);
  } else {
    const r = getHistoricoAvaliacoes().find(x => x.id === p.id);
    if (r) enviar(SHEETS_HISTORICO_URL, 'avaliacao', r as any);
  }
}

/** Esta autoavaliação ainda não se sabe se chegou ao professor? */
export function selecaoPorConfirmar(id: string): boolean {
  const e = espera().find(x => x.tipo === 'selecao' && x.id === id);
  if (!e) return false;
  // Já está na base de dados, nesta versão: chegou ao professor.
  const local = String((load<SelecaoAluno>(KEYS.selecoes).find(x => x.id === id) as any)?.criadaEm || '');
  return !(e.naBaseVersao && local && quandoFoi(e.naBaseVersao) >= quandoFoi(local));
}
function marcarSelecaoNaBase(id: string, versao: string): void {
  const l = espera();
  const e = l.find(x => x.tipo === 'selecao' && x.id === id);
  if (!e || !versao || (e.naBaseVersao && quandoFoi(e.naBaseVersao) >= quandoFoi(versao))) return;
  e.naBaseVersao = versao;
  guardarEspera(l);
  ouvintesEspera.forEach(f => { try { f(); } catch { /* */ } });
}

/** Este plano (ou a última alteração dele) ainda não se sabe se chegou aos alunos?
 *  Se a versão atual já está na base de dados, chegou (os alunos leem de lá). */
export function planoPorConfirmar(id: string): boolean {
  const e = espera().find(x => x.tipo === 'plano' && x.id === id);
  if (!e) return false;
  const local = String((getPlanosAula().find(p => p.id === id) as any)?.atualizadoEm || '');
  return !(e.naBaseVersao && local && e.naBaseVersao >= local);
}

/** O plano chegou à base de dados nesta versão. */
function marcarPlanoNaBase(id: string, versao: string): void {
  const l = espera();
  const e = l.find(x => x.tipo === 'plano' && x.id === id);
  if (!e || (e.naBaseVersao && e.naBaseVersao >= versao)) return;
  e.naBaseVersao = versao;
  guardarEspera(l);
  ouvintesEspera.forEach(f => { try { f(); } catch { /* */ } });
}
const ouvintesEspera = new Set<() => void>();
/** Avisa quando um plano à espera chega à base (para o aviso «A enviar…» mudar logo). */
export function subscreverEspera(f: () => void): () => void { ouvintesEspera.add(f); return () => { ouvintesEspera.delete(f); }; }

/** O que se sabe do envio do plano que ainda não confirmou (para o aviso dizer porquê). */
export function esperaDoPlano(id: string): PorConfirmar | undefined {
  return espera().find(x => x.tipo === 'plano' && x.id === id);
}

/** «Tentar outra vez»: o plano volta a ser enviado já, com as tentativas todas. */
export function reenviarPlanoJa(id: string): void {
  const plano = getPlanosAula().find(x => x.id === id);
  if (!plano) return;
  const l = espera();
  const p = l.find(x => x.tipo === 'plano' && x.id === id);
  if (p) { p.tentativas = 0; p.desde = new Date().toISOString(); guardarEspera(l); }
  else porConfirmar('plano', id, plano.titulo || `Plano de ${plano.data}`, plano.turmaId);
  paraABase('plano', { plano });
  enviarAgora(SHEETS_PLANOS_URL, { tipo: 'plano', plano }, 'urgente');
}

/** «Já vi que está no Sheets»: deixa de esperar por este plano. */
export function esquecerEsperaDoPlano(id: string): void {
  guardarEspera(espera().filter(x => !(x.tipo === 'plano' && x.id === id)));
}

/** Ao fechar ou esconder a aplicação: a autoavaliação ou o plano que ainda
 *  não se sabe se chegou vai outra vez, logo, com «keepalive» (acaba mesmo
 *  com a aplicação fechada). As repetições juntam-se no script. */
function enviarAntesDeFechar(): void {
  const agora = Date.now();
  for (const p of espera()) {
    if (agora - new Date(p.desde).getTime() > 24 * 3600 * 1000) continue;
    if (p.tipo === 'selecao') {
      const sel = load<SelecaoAluno>(KEYS.selecoes).find(x => x.id === p.id);
      if (sel) postar(SHEETS_HISTORICO_URL, { tipo: 'selecao', ...corpoSelecao(sel) });
    } else if (p.tipo === 'plano') {
      // O professor gravou o plano e saiu logo: as alterações não chegavam aos alunos.
      const plano = getPlanosAula().find(x => x.id === p.id);
      if (plano) postar(SHEETS_PLANOS_URL, { tipo: 'plano', plano });
    }
  }
}
if (typeof window !== 'undefined') {
  let ultimo = 0;
  const aoSair = () => { if (Date.now() - ultimo < 5000) return; ultimo = Date.now(); enviarAntesDeFechar(); };
  window.addEventListener('pagehide', aoSair);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') aoSair(); });
}

/** Confere o que está à espera e reenvia o que não chegou. */
/**
 * Aulas abertas neste aparelho que não estão no Sheets voltam a ser
 * enviadas. O aluno só sabe que a aula abriu pelo Sheets: se o envio da
 * abertura se perdia, o professor via «aberta» e o aluno nunca a recebia —
 * e carregar outra vez não servia, porque o aparelho já a tinha como aberta.
 */
export async function confirmarSessoesAbertas(): Promise<number> {
  const umDia = Date.now() - 24 * 3600 * 1000;
  const locais = getSessoesAula().filter(s =>
    s.abertaEm && !s.fechadaEm && new Date(s.abertaEm).getTime() > umDia);
  if (!locais.length) return 0;
  let json: any;
  try { json = await lerDoSheets(SHEETS_HISTORICO_URL, { tipo: 'get_sessoes', turmaId: '' }); }
  catch { return 0; }
  if (!json?.ok) return 0;
  const la = new Set((json.sessoes || json.dados || []).map((x: any) => String(x.planoAulaId)));
  let reenviadas = 0;
  for (const s of locais) {
    if (la.has(String(s.planoAulaId))) continue;
    enviarAberturaJa(s);
    reenviadas++;
  }
  return reenviadas;
}

export async function confirmarEReenviar(): Promise<{ confirmados: number; aRepetir: number }> {
  await confirmarSessoesAbertas().catch(() => 0);
  const l = espera();
  if (!l.length) return { confirmados: 0, aRepetir: 0 };

  const turmas = [...new Set(l.map(x => x.turmaId).filter(Boolean))];
  const tipos = [...new Set(l.map(x => x.tipo))];
  const noSheets = new Map<string, Set<string>>();
  /** A hora da versão de cada plano no Sheets: uma alteração só chegou
   *  quando o Sheets tem esta versão ou uma mais recente. Antes bastava o
   *  plano lá estar — e uma correção que se perdia dava-se por entregue. */
  const versaoNoSheets = new Map<string, number>();
  // Leitura que correu bem, mesmo com a folha vazia. Antes, uma folha sem
  // nenhuma linha (por exemplo, depois de limpar os dados de teste) era
  // tomada por "não consegui ler" — e o que estava à espera nunca mais era
  // reenviado: a aula criada não chegava ao Sheets nem aos alunos.
  const lidoComSucesso = new Set<string>();
  /** O que o Sheets diz ter sido eliminado de propósito (apagado de vez).
   *  O Sheets recusa gravá-lo outra vez («eliminado»), e o aparelho que ainda
   *  o tinha insistia para sempre: «9.ª tentativa», «62.ª tentativa» (Rosa,
   *  5/out/2026). Sai da lista e deste aparelho também. */
  const eliminadosNoSheets = new Map<string, Set<string>>();

  for (const tipo of tipos) {
    const [url, pedido] = LEITURA_POR_TIPO[tipo];
    const ids = new Set<string>();
    let algumaLeitura = false;
    for (const t of (turmas.length ? turmas : [''])) {
      try {
        const json: any = await lerDoSheets(url, { tipo: pedido, turmaId: t });
        if (json?.ok) algumaLeitura = true;
        if (Array.isArray(json?.eliminados)) {
          const el = eliminadosNoSheets.get(tipo) || new Set<string>();
          json.eliminados.forEach((id: any) => el.add(String(id)));
          eliminadosNoSheets.set(tipo, el);
        }
        (json?.dados || []).forEach((x: any) => {
          ids.add(String(x.id));
          if (tipo === 'plano') versaoNoSheets.set(String(x.id), Date.parse(String(x.atualizadoEm || '')));
          // A autoavaliação: a que lá está tem de ser a ÚLTIMA resposta do
          // aluno. Com o mesmo código, a resposta antiga dava a nova por
          // entregue e o professor validava a antiga (Rosa, out/2026).
          if (tipo === 'selecao') versaoNoSheets.set('selecao:' + String(x.id), quandoFoi(x.criadaEm));
          // A validação: a que lá está tem de ser a última (com a nota).
          if (tipo === 'validacao') versaoNoSheets.set('validacao:' + String(x.id), String(x.notaMedia20 ?? '') === '' ? 0 : quandoFoi(x.validadoEm));
        });
      } catch { /* sem rede: fica para a próxima */ }
    }
    noSheets.set(tipo, ids);
    if (algumaLeitura) lidoComSucesso.add(tipo);
  }

  const versaoChegou = (p: PorConfirmar): boolean => {
    if (p.tipo === 'validacao') {
      const local = quandoFoi((getValidacoes().find(x => x.id === p.id) as any)?.validadoEm);
      const remota = versaoNoSheets.get('validacao:' + String(p.id)) || 0;
      return !local || (remota > 0 && remota >= local - 1000);
    }
    if (p.tipo === 'selecao') {
      const local = quandoFoi((load<SelecaoAluno>(KEYS.selecoes).find(x => x.id === p.id) as any)?.criadaEm);
      const remota = versaoNoSheets.get('selecao:' + String(p.id)) || 0;
      return !local || !remota || remota >= local - 1000;
    }
    if (p.tipo !== 'plano') return true;
    const local = Date.parse(String((getPlanosAula().find(x => x.id === p.id) as any)?.atualizadoEm || ''));
    const remota = versaoNoSheets.get(String(p.id)) ?? NaN;
    // Sem hora num dos lados, conta como chegou (como antes).
    return isNaN(local) || isNaN(remota) || remota >= local - 1000;
  };
  const restantes: PorConfirmar[] = [];
  let confirmados = 0;
  // Entretanto pode ter entrado outra coisa na lista (uma gravação nova).
  const atual = espera();
  for (const p0 of l) {
    const p = atual.find(x => x.tipo === p0.tipo && x.id === p0.id) || p0;
    // Já não existe neste aparelho (foi apagado de vez): não há nada para
    // enviar, sai da lista. Antes ficava «a caminho do arquivo» para sempre e
    // o botão não fazia nada (Rosa, 5/out/2026).
    if (!existeAinda(p)) { continue; }
    if (eliminadosNoSheets.get(p.tipo)?.has(String(p.id))) { esquecerEliminado(p); continue; }
    const ids = noSheets.get(p.tipo);
    if (!ids || !lidoComSucesso.has(p.tipo)) { restantes.push({ ...p, motivo: 'sem_leitura' }); continue; }   // não consegui ler: não conto como falha
    if (ids.has(String(p.id)) && versaoChegou(p)) { confirmados++; continue; }
    // O professor já validou esta resposta: chegou, de certeza.
    if (p.tipo === 'selecao') {
      const sel = load<SelecaoAluno>(KEYS.selecoes).find(x => x.id === p.id);
      const v: any = sel && validacaoDaSelecao(sel);
      if (v && quandoFoi(v.validadoEm) >= quandoFoi((sel as any).criadaEm)) { confirmados++; continue; }
    }
    // A autoavaliação do aluno insiste até chegar: sem ela o professor
    // não a vê para validar. O plano também (eram 5 vezes, e depois o
    // aviso «A enviar…» ficava para sempre sem nada a acontecer).
    // A resposta do aluno nunca desiste: depois de 60 tentativas, continua
    // de 10 em 10 conferências (antes parava e ficava «A enviar…» para sempre).
    if (p.tentativas < 5 || (p.tipo === 'selecao' && (p.tentativas < 60 || p.tentativas % 10 === 0)) || (p.tipo === 'plano' && p.tentativas < 30)) emSegundoPlano(() => reenviar(p));
    const v = versaoNoSheets.get(String(p.id));
    restantes.push({ ...p, tentativas: p.tentativas + 1,
      ...(p.tipo === 'plano' ? { motivo: ids.has(String(p.id)) ? 'versao_antiga' as const : 'nao_esta' as const,
        versaoNoSheets: v && !isNaN(v) ? new Date(v).toISOString() : undefined } : {}) });
  }
  for (const x of atual) if (!l.some(y => y.tipo === x.tipo && y.id === x.id)) restantes.push(x);
  guardarEspera(restantes);
  return { confirmados, aRepetir: restantes.length };
}

// ============================================================
// Vigiar alterações — a pergunta pequena
// ============================================================
// Ir buscar tudo de minuto a minuto é pesado e lento. Agora pergunta-se
// só o número de alterações da turma — uma resposta de meia dúzia de
// letras — de 15 em 15 segundos. Quando o número muda, aí sim vai
// buscar os dados.
//
// É o que faz uma alteração feita no tablet aparecer no computador em
// segundos, e a aula publicada chegar depressa ao telemóvel do aluno.

const KEY_ULTIMA_VERSAO = 'ecl_versao_vista';

async function lerVersaoDaTurma(turmaId: string): Promise<string | null> {
  const url = SHEETS_ECL_URL || SHEETS_PLANOS_URL;
  if (!url) return null;
  try {
    const u = new URL(url);
    u.searchParams.set('tipo', 'versao');
    u.searchParams.set('turmaId', turmaId);
    const r = await fetch(u.toString());
    if (!r.ok) return null;
    const t = (await r.text()).trim();
    return /^\d+$/.test(t) ? t : null;
  } catch { return null; }
}

/**
 * Fica a vigiar a turma. Chama aoMudar() sempre que houver novidades.
 * Devolve a função de parar.
 */
export function vigiarAlteracoes(
  turmaId: string, aoMudar: () => void, segundos = 15
): () => void {
  let parado = false;
  let ultima = '';
  try { ultima = localStorage.getItem(KEY_ULTIMA_VERSAO + '_' + turmaId) || ''; } catch { /* */ }

  async function espreitar() {
    if (parado) return;
    // Com a aula rápida a ser lida, o número de alterações já vem nela.
    if (aulaJaLida && !aulaNaoSuportada) return;
    const v = await lerVersaoDaTurma(turmaId);
    if (parado || !v) return;
    if (ultima && v !== ultima) {
      try { localStorage.setItem(KEY_ULTIMA_VERSAO + '_' + turmaId, v); } catch { /* */ }
      ultima = v;
      aoMudar();
    } else if (!ultima) {
      ultima = v;
      try { localStorage.setItem(KEY_ULTIMA_VERSAO + '_' + turmaId, v); } catch { /* */ }
    }
  }

  espreitar();
  const t = setInterval(espreitar, segundos * 1000);
  return () => { parado = true; clearInterval(t); };
}

// ============================================================
// Diagnóstico — onde é que a corrente parte
// ============================================================
// Em vez de adivinhar porque é que uma aula não chega ao aluno, a
// aplicação percorre a corrente toda e diz em que elo parou. Corre-se
// no aparelho do professor e no do aluno, e compara-se.

/** Porque é que a aula de hoje não aparece — para explicar ao aluno numa frase. */
export type CausaAulaEmFalta =
  | 'ok' | 'sem_rede' | 'resposta_estranha' | 'nada_no_arquivo'
  | 'nao_publicada' | 'sem_aula_hoje' | 'nao_chegou' | 'outra_turma';

export async function diagnostico(turmaId: string): Promise<string[]> {
  return (await diagnosticoDetalhado(turmaId)).linhas;
}

export async function diagnosticoDetalhado(turmaId: string): Promise<{ linhas: string[]; causa: CausaAulaEmFalta }> {
  const L: string[] = [];
  let causa: CausaAulaEmFalta = 'ok';
  const hoje = new Date().toISOString().slice(0, 10);
  const url = SHEETS_ECL_URL || SHEETS_PLANOS_URL;

  L.push(`Turma: ${turmaId} · hoje: ${hoje}`);
  L.push(SHEETS_ECL_URL ? '1. Versão nova da aplicação: SIM' : '1. Versão nova da aplicação: NÃO — o aparelho tem a antiga');
  L.push(`   endereço …${String(url).slice(-14)}`);

  // 2. O contador responde?
  try {
    const u = new URL(url);
    u.searchParams.set('tipo', 'versao');
    u.searchParams.set('turmaId', turmaId);
    const r = await fetch(u.toString());
    const t = (await r.text()).trim();
    L.push(/^\d+$/.test(t) ? `2. Ligação ao arquivo: OK (número ${t.slice(-6)})`
      : `2. Ligação ao arquivo: RESPOSTA ESTRANHA — ${t.slice(0, 40)}`);
    if (!/^\d+$/.test(t)) causa = 'resposta_estranha';
  } catch (e) {
    L.push('2. Ligação ao arquivo: FALHOU — sem rede ou acesso barrado');
    causa = 'sem_rede';
  }

  // 3. O que o arquivo tem desta turma
  let doArquivo: any[] = [];
  try {
    const json: any = await lerDoSheets(url, { tipo: 'get_planos', turmaId });
    if (!json?.ok) {
      L.push('3. Planos no arquivo: NÃO CONSEGUI LER');
      if (causa === 'ok') causa = 'resposta_estranha';
    } else {
      doArquivo = json.dados || [];
      const publicados = doArquivo.filter((p: any) => p.estado === 'publicado');
      const deHoje = publicados.filter((p: any) => dataSoDia(p.data) === hoje);
      L.push(`3. Planos no arquivo: ${doArquivo.length} · publicados ${publicados.length} · de hoje ${deHoje.length}`);
      deHoje.slice(0, 3).forEach((p: any) =>
        L.push(`   · ${p.titulo || p.id} — turma "${p.turmaId}" — ${dataSoDia(p.data)}`));
      if (!deHoje.length && publicados.length) {
        const ultimo = publicados[publicados.length - 1];
        L.push(`   último publicado: ${ultimo.titulo || ultimo.id} em ${dataSoDia(ultimo.data)}`);
      }
      if (doArquivo.length && !publicados.length) {
        L.push('   ATENÇÃO: há planos, mas nenhum publicado. Falta carregar em Publicar.');
      }
      if (causa === 'ok') {
        causa = !doArquivo.length ? 'nada_no_arquivo'
          : !publicados.length ? 'nao_publicada'
          : !deHoje.length ? 'sem_aula_hoje' : 'ok';
      }
    }
  } catch { L.push('3. Planos no arquivo: FALHOU'); if (causa === 'ok') causa = 'sem_rede'; }

  // 4. O que este aparelho tem
  const locais = getPlanosAulaPorTurma(turmaId);
  const locaisPub = locais.filter(p => p.estado === 'publicado');
  const locaisHoje = locaisPub.filter(p => dataSoDia(p.data) === hoje);
  L.push(`4. Neste aparelho: ${locais.length} planos · publicados ${locaisPub.length} · de hoje ${locaisHoje.length}`);

  // 5. O que falta cá do que está lá
  const idsLocais = new Set(locais.map(p => p.id));
  const soLa = doArquivo.filter((p: any) => !idsLocais.has(p.id));
  if (soLa.length) {
    L.push(`5. No arquivo mas não aqui: ${soLa.length} — a sincronização não os trouxe`);
    if (causa === 'ok' && soLa.some((p: any) => p.estado === 'publicado' && dataSoDia(p.data) === hoje)) causa = 'nao_chegou';
    soLa.slice(0, 3).forEach((p: any) => L.push(`   · ${p.titulo || p.id}`));
  } else {
    L.push('5. Tudo o que está no arquivo também está aqui');
  }

  // 6. Turmas com que nome estão lá — o erro mais traiçoeiro
  const turmasLa = [...new Set(doArquivo.map((p: any) => String(p.turmaId)))];
  if (turmasLa.length && !turmasLa.includes(turmaId)) {
    L.push(`6. ATENÇÃO: o arquivo devolveu planos das turmas [${turmasLa.join(', ')}], e esta é "${turmaId}"`);
    causa = 'outra_turma';
  }

  return { linhas: L, causa };
}


// ============================================================
// UC / módulo em atraso — faltas a partir de 10% das horas dadas
// ============================================================
// O professor tem de ver, sem procurar aluno a aluno, quem está neste
// momento com uma UC em atraso e o que falta fazer para recuperar.

export const MODALIDADES_RECUPERACAO: { id: 'pratico' | 'teorico' | 'atividade' | 'outra'; nome: string; sugestao: string }[] = [
  { id: 'pratico', nome: 'Exercício prático',
    sugestao: 'Repetir, em aula ou em horário combinado, a produção de um dos planos em falta, avaliada com as mesmas técnicas.' },
  { id: 'teorico', nome: 'Exercício teórico',
    sugestao: 'Trabalho escrito ou ficha sobre os conteúdos das aulas em falta: técnicas, fichas técnicas, HACCP.' },
  { id: 'atividade', nome: 'Participação numa atividade',
    sugestao: 'Participar num evento ou serviço da escola em que demonstre as competências das aulas em falta.' },
  { id: 'outra', nome: 'Outra estratégia', sugestao: 'Definida pelo professor.' },
];

export interface UCEmAtraso {
  alunoId: string;
  turmaId: string;
  numero: number;
  nome: string;
  ucId: string;
  ucNome: string;
  horasDadas: number;
  /** Total de horas da UC (cronograma: 25, 50…). É sobre este que se contam os 10%. */
  horasUC: number;
  horasFaltadas: number;
  /** Faltas em % do total de horas da UC. */
  percentagem: number;
  plano: RecuperacaoModulo | null;
  /** sem_plano: por decidir · adiado: fica para depois da UC · em_curso: plano feito · recuperado */
  estado: 'sem_plano' | 'adiado' | 'em_curso' | 'recuperado';
}

/** Todos os alunos da turma com uma UC em atraso por faltas (≥ 10% do total de horas da UC). */
export function ucsEmAtraso(turmaId: string): UCEmAtraso[] {
  const ucs = [...new Set(getPlanosAulaPorTurma(turmaId).map(p => p.ucId).filter(Boolean))] as string[];
  const mods = modulosDaTurma(turmaId);
  const out: UCEmAtraso[] = [];
  for (const a of getAlunos().filter(x => x.turmaId === turmaId && x.ativo !== false && !ehFantasma(x.id))) {
    for (const ucId of ucs) {
      const s = situacaoRecuperacaoUC(a.id, turmaId, ucId);
      if (s.motivo !== 'faltas') continue;
      const dadas = horasDadasDaUC(turmaId, ucId);
      const plano = getRecuperacoes().filter(r => r.alunoId === a.id && r.ucId === ucId)
        .sort((x, y) => String(y.criadoEm).localeCompare(String(x.criadoEm)))[0] || null;
      out.push({
        alunoId: a.id, turmaId, numero: a.numero, nome: a.nome || `Aluno ${a.numero}`,
        ucId, ucNome: (mods.find((m: any) => m.id === ucId) as any)?.nome || '',
        horasDadas: dadas, horasUC: s.horasPrevistas || dadas, horasFaltadas: s.horasFaltadas,
        // Em % do total de horas da UC (o mesmo total dos 10%).
        percentagem: (s.horasPrevistas || dadas) > 0 ? Math.round((s.horasFaltadas / (s.horasPrevistas || dadas)) * 100) : 0,
        plano,
        estado: !plano ? 'sem_plano' : plano.estado === 'concluida' ? 'recuperado'
          : plano.quando === 'depois' && !plano.modalidade ? 'adiado' : 'em_curso',
      });
    }
  }
  const ordem = { sem_plano: 0, em_curso: 1, adiado: 2, recuperado: 3 };
  return out.sort((x, y) => ordem[x.estado] - ordem[y.estado] || x.numero - y.numero || x.ucId.localeCompare(y.ucId));
}

/** O professor decide o plano de recuperação: modalidade, o que fazer e prazo. */
export function criarPlanoRecuperacao(
  alunoId: string, turmaId: string, ucId: string,
  modalidade: 'pratico' | 'teorico' | 'atividade' | 'outra', descricao: string, prazo?: string
): RecuperacaoModulo {
  const mod: any = modulosDaTurma(turmaId).find((m: any) => m.id === ucId);
  // Se o professor tinha deixado para depois da UC, o plano é esse mesmo.
  const adiado = getRecuperacoes().find(r => r.alunoId === alunoId && r.ucId === ucId
    && r.quando === 'depois' && !r.modalidade && r.estado !== 'concluida');
  const base = adiado || criarRecuperacaoAutomatica(alunoId, turmaId, ucId, mod?.nome || '');
  const r: RecuperacaoModulo = {
    ...base, modalidade, descricaoPlano: descricao, estado: 'em_curso', quando: adiado ? 'depois' : 'ja',
    atualizadoEm: new Date().toISOString(),
    dataLimite: prazo ? new Date(prazo + 'T23:59:00').toISOString() : base.dataLimite,
  };
  addOrUpdateRecuperacao(r);
  return r;
}

/**
 * O professor deixa a recuperação para depois do fim da UC: o aluno sai do
 * alerta vermelho, a UC fica com a nota que tiver (com "a)" se for negativa)
 * e o plano faz-se depois.
 */
export function adiarRecuperacaoParaDepoisDaUC(alunoId: string, turmaId: string, ucId: string): RecuperacaoModulo {
  const mod: any = modulosDaTurma(turmaId).find((m: any) => m.id === ucId);
  const r: RecuperacaoModulo = {
    ...criarRecuperacaoAutomatica(alunoId, turmaId, ucId, mod?.nome || ''),
    quando: 'depois', estado: 'pendente', atualizadoEm: new Date().toISOString(),
  };
  addOrUpdateRecuperacao(r);
  return r;
}

// ── Recuperar numa atividade extra (Rosa, out/2026) ───────────────
// O professor escolhe a atividade no plano de recuperação, ou o aluno em
// recuperação candidata-se (mesmo a uma atividade fechada a outros). Só
// recupera se o professor confirmar que participou; o resultado sugerido é a
// nota que o professor validou nessa atividade. Para ele, não dá bónus.
const ID_CANDIDATURA_RECUP = 'recuperacao';
export function atividadesParaRecuperar(turmaId: string): PlanoAula[] {
  return getPlanosAula().filter((p: any) => p.turmaId === turmaId && eventoForaDoHorario(p) && p.estado !== 'arquivado')
    .sort((a, b) => String(b.data).localeCompare(String(a.data)));
}
/** A recuperação em curso deste aluno numa UC (a mais recente), se houver. */
function recuperacaoEmCurso(alunoId: string, ucId?: string): RecuperacaoModulo | undefined {
  return getRecuperacoes().filter(r => r.alunoId === alunoId && (!ucId || r.ucId === ucId) && r.estado !== 'concluida')
    .sort((x: any, y: any) => String(y.criadoEm || '').localeCompare(String(x.criadoEm || '')))[0];
}
/** Liga a recuperação à atividade: o aluno entra na atividade, marcado «a recuperar». */
export function ligarRecuperacaoAAtividade(recuperacaoId: string, planoAtividadeId: string): void {
  const r: any = getRecuperacoes().find(x => x.id === recuperacaoId);
  const p: any = getPlanosAula().find(x => x.id === planoAtividadeId);
  if (!r || !p) return;
  addOrUpdateRecuperacao({ ...r, atividadePlanoId: p.id, modalidade: 'atividade', atualizadoEm: new Date().toISOString() });
  addOrUpdatePlanoAula({ ...p, participantesIds: [...new Set([...(p.participantesIds || []), r.alunoId])],
    paraRecuperar: { ...(p.paraRecuperar || {}), [r.alunoId]: { recuperacaoId: r.id, ucId: r.ucId } },
    atualizadoEm: new Date().toISOString() });
}
/** As UC que este aluno tem para recuperar por faltas (ainda não recuperadas). */
export function ucsARecuperarDoAluno(alunoId: string, turmaId: string): string[] {
  const ucs = [...new Set(getPlanosAulaPorTurma(turmaId).map(p => p.ucId).filter(Boolean))] as string[];
  return ucs.filter(ucId => situacaoRecuperacaoUC(alunoId, turmaId, ucId).motivo === 'faltas'
    && !getRecuperacoes().some(r => r.alunoId === alunoId && r.ucId === ucId && r.estado === 'concluida'));
}
/** O aluno em recuperação candidata-se a recuperar nesta atividade. */
export function candidatarParaRecuperar(plano: PlanoAula, aluno: { id: string; nome?: string }, sim: boolean): void {
  entrarNoGrupo({ planoAulaId: 'insc_' + plano.id, turmaId: plano.turmaId, alunoId: aluno.id, nomeAluno: aluno.nome,
    grupoId: sim ? ID_CANDIDATURA_RECUP : 'retirado', grupoNome: sim ? 'Candidato a recuperar' : 'Retirado', definidoPor: 'aluno' });
}
export function candidatosARecuperar(planoId: string): string[] {
  return getMembrosGrupo('insc_' + planoId).filter(m => m.grupoId === ID_CANDIDATURA_RECUP).map(m => m.alunoId);
}
/** O professor aceita a candidatura: usa (ou cria) o plano de recuperação do aluno e liga-o à atividade. */
export function aceitarParaRecuperar(planoAtividadeId: string, alunoId: string): void {
  const p: any = getPlanosAula().find(x => x.id === planoAtividadeId);
  if (!p) return;
  const emAtraso = ucsEmAtraso(p.turmaId).filter(l => l.alunoId === alunoId);
  const alvo = emAtraso.find(l => l.ucId === p.ucId) || emAtraso[0];
  let r: any = recuperacaoEmCurso(alunoId, alvo?.ucId);
  if (!r && alvo) r = criarPlanoRecuperacao(alunoId, p.turmaId, alvo.ucId, 'atividade',
    `Participar na atividade «${p.titulo || 'atividade'}» e demonstrar as competências das aulas em falta.`);
  if (r) ligarRecuperacaoAAtividade(r.id, p.id);
}
/** O professor tira a recuperação desta atividade (o aluno continua na lista; tira-o lá, se não foi). */
export function desligarRecuperacaoDaAtividade(planoAtividadeId: string, alunoId: string): void {
  const p: any = getPlanosAula().find(x => x.id === planoAtividadeId);
  const marca = p?.paraRecuperar?.[alunoId];
  if (!marca) return;
  const resto = { ...p.paraRecuperar }; delete resto[alunoId];
  addOrUpdatePlanoAula({ ...p, paraRecuperar: resto, atualizadoEm: new Date().toISOString() });
  const r: any = getRecuperacoes().find(x => x.id === marca.recuperacaoId);
  if (r && r.atividadePlanoId === p.id) addOrUpdateRecuperacao({ ...r, atividadePlanoId: undefined, atualizadoEm: new Date().toISOString() });
}
/** A UC que este aluno está a recuperar nesta atividade (ou nada). */
export function recuperaNaAtividade(plano: any, alunoId: string): { recuperacaoId: string; ucId: string } | null {
  return plano?.paraRecuperar?.[alunoId] || null;
}
/** O resultado sugerido: a nota validada na atividade, só se o professor confirmou que participou. */
/** A atividade onde esta recuperação se faz (pela recuperação ou pela marca no plano da atividade). */
export function atividadeDaRecuperacao(r: any): PlanoAula | undefined {
  if (!r) return undefined;
  return getPlanosAula().find((x: any) => r.atividadePlanoId ? x.id === r.atividadePlanoId : x.paraRecuperar?.[r.alunoId]?.recuperacaoId === r.id);
}
export function resultadoSugeridoDaRecuperacao(r: any): { nota: number | null; atividade?: PlanoAula; porque: string } {
  const p: any = atividadeDaRecuperacao(r);
  if (!p) return { nota: null, porque: '' };
  if (!participantesDoEvento(p).includes(r.alunoId) || !p.participantesConfirmadosEm)
    return { nota: null, atividade: p, porque: `Ainda não confirmaste que participou na atividade «${p.titulo}».` };
  const nota = notaDaAulaValidada(validacaoDaAula(r.alunoId, p.id));
  return nota == null ? { nota: null, atividade: p, porque: `Ainda não validou a autoavaliação deste aluno na atividade «${p.titulo}».` }
    : { nota, atividade: p, porque: `Nota validada na atividade «${p.titulo}».` };
}

/** Regista que a recuperação foi feita e o resultado (0-20). */
export function registarResultadoRecuperacao(id: string, nota: number, observacao: string, professor?: string): void {
  const r = getRecuperacoes().find(x => x.id === id);
  if (!r) return;
  const agora = new Date().toISOString();
  addOrUpdateRecuperacao({
    ...r, estado: 'concluida', resultadoNota: Math.max(0, Math.min(20, nota)),
    realizadaEm: agora, dataValidacao: agora, comentarioProfessor: observacao || r.comentarioProfessor,
    professorAvaliador: professor || r.professorAvaliador, atualizadoEm: agora,
  });
}

// ============================================================
// Autoavaliação final da UC — a nota que o aluno propõe
// ============================================================

export interface PropostaFinalUC {
  alunoId: string;
  turmaId: string;
  ucId: string;
  nota: number;
  justificacao: string;
  criadaEm: string;
}

export function getPropostaFinalUC(alunoId: string, ucId: string): PropostaFinalUC | null {
  const s: any = load<any>(KEYS.selecoes).find((x: any) =>
    x.alunoId === alunoId && x.planoAulaId === PREFIXO_FINAL + ucId);
  const a = s?.autoavaliacoes?.[0];
  if (!s || !a) return null;
  return { alunoId, turmaId: s.turmaId, ucId, nota: Number(a.nota), justificacao: a.justificacao || '', criadaEm: s.criadaEm };
}

export function guardarPropostaFinalUC(p: Omit<PropostaFinalUC, 'criadaEm'>): void {
  const agora = new Date().toISOString();
  addOrUpdateSelecao({
    id: `final_${p.ucId}_${p.alunoId}`, planoAulaId: PREFIXO_FINAL + p.ucId, comandaId: '', fichaId: '',
    alunoId: p.alunoId, turmaId: p.turmaId, tecnicas: [], atitudes: [], responsabilidades: [],
    autoavaliacoes: [{ competenciaId: 'PROPOSTA_FINAL', nivel: 'proposta', nota: p.nota, justificacao: p.justificacao }],
    criadaEm: agora,
  } as any);
}

// ============================================================
// Triagem do CL, CR e CO de cada aula
// ============================================================
// Viaja como um registo próprio, com os dados dentro das autoavaliações —
// o mesmo caminho da proposta final, que o Sheets guarda inteiro. Assim a
// resposta do aluno e a confirmação do professor chegam a todos os aparelhos.

export interface TriagemDaAula { aluno?: Triagem5C; professor?: Triagem5C }

export function getTriagemDaAula(alunoId: string, planoAulaId: string): TriagemDaAula {
  const s: any = load<any>(KEYS.selecoes).find((x: any) =>
    x.alunoId === alunoId && x.planoAulaId === PREFIXO_TRIAGEM + planoAulaId);
  const a = s?.autoavaliacoes?.[0];
  if (a) return { aluno: a.aluno || undefined, professor: a.professor || undefined };
  // Autoavaliações antigas: a triagem vinha dentro da seleção e da validação.
  const sel: any = load<any>(KEYS.selecoes).find((x: any) => x.alunoId === alunoId && x.planoAulaId === planoAulaId);
  const val: any = getValidacoes().find((x: any) => x.alunoId === alunoId && x.planoAulaId === planoAulaId);
  return { aluno: sel?.triagem5c, professor: val?.triagem5c };
}

export function guardarTriagemDaAula(alunoId: string, turmaId: string, planoAulaId: string,
  triagem: Triagem5C, deQuem: 'aluno' | 'professor'): void {
  const atual = getTriagemDaAula(alunoId, planoAulaId);
  const novo = { ...atual, [deQuem]: triagem };
  addOrUpdateSelecao({
    id: `tri_${planoAulaId}_${alunoId}`, planoAulaId: PREFIXO_TRIAGEM + planoAulaId, comandaId: '', fichaId: '',
    alunoId, turmaId, tecnicas: [], atitudes: [], responsabilidades: [],
    autoavaliacoes: [{ competenciaId: 'TRIAGEM_5C', nivel: 'triagem', nota: 0, ...novo }],
    criadaEm: new Date().toISOString(),
  } as any);
}

/** A pergunta do Consciente (ou do Criativo) desta aula: a que o professor
 *  escolheu, ou a seguinte na rotação. A mesma para a turma toda, porque se
 *  conta pelas aulas da turma (os eventos não contam), da mais antiga para a
 *  mais recente. */
export function perguntaDaAula(chave: 'co' | 'cr', planoAulaId: string): string {
  const plano: any = getPlanosAula().find(p => p.id === planoAulaId);
  const escolhida = plano?.[chave === 'co' ? 'perguntaCO' : 'perguntaCR'];
  if (escolhida && bancoDe(chave).banco.some(q => q.id === escolhida)) return escolhida;
  if (!plano) return perguntaDoCiclo(chave, 0).id;
  const ordem = (p: any) => `${String(p.data || '').slice(0, 10)} ${p.horaInicio || ''} ${p.id}`;
  const aulas = getPlanosAula().filter((p: any) => p.turmaId === plano.turmaId && !p.tipoEvento)
    .sort((a, b) => ordem(a).localeCompare(ordem(b)));
  // Sem cozinhar (aula teórica, atitudinal, visita) não saem perguntas sobre a cozinha e os pratos.
  const soTeoria = !contextoDoPlano(plano).producao;
  return perguntaDoCiclo(chave, Math.max(0, aulas.findIndex(p => p.id === planoAulaId)), soTeoria).id;
}
/** Como é esta aula (cozinha, produção, equipas): a triagem do professor,
 *  ou, sem ela, o que se deduz do plano e dos grupos formados. */
export function contextoDoPlano(plano: any): ContextoAula {
  // Grupos ligados no plano pelo professor, ou formados pelos alunos nesta aula.
  let temGrupos = !!plano?.gruposAlunos?.ativo;
  try { temGrupos = temGrupos || (!!plano?.id && gruposDaAula(plano.id).length > 0); } catch { /* */ }
  return contextoDaAula(plano, temGrupos);
}
export const perguntaCODaAula = (planoAulaId: string) => perguntaDaAula('co', planoAulaId);
export const perguntaCRDaAula = (planoAulaId: string) => perguntaDaAula('cr', planoAulaId);

/** Colegas que, na mesma aula e à mesma pergunta, disseram que a situação
 *  aconteceu (reparou, fez alguma coisa). Serve para avisar o professor
 *  quando um aluno responde «Hoje não aconteceu». */
export function colegasQueViram(chave: 'co' | 'cr', alunoId: string, planoAulaId: string, perguntaId: string): number {
  return load<any>(KEYS.selecoes).filter((x: any) =>
    x.planoAulaId === PREFIXO_TRIAGEM + planoAulaId && x.alunoId !== alunoId)
    .filter((x: any) => {
      const t = x.autoavaliacoes?.[0]; const r = (t?.professor || t?.aluno) as Triagem5C | undefined;
      const resposta = r?.[chave];
      return r?.[chave === 'co' ? 'coId' : 'crId'] === perguntaId && typeof resposta === 'number' && resposta >= 1;
    }).length;
}

// ============================================================
// Nota final da UC publicada pelo professor
// ============================================================
// O professor atualiza a pauta e publica: cada aluno passa a ver a sua
// nota final da UC. É esta a nota que conta em todo o lado.

export interface NotaFinalPublicada {
  alunoId: string; turmaId: string; ucId: string;
  nota: number; resultado: string; cp: number; total: number;
  professor: string; publicadaEm: string;
  /** (out/2026) Como os colegas de grupo veem o aluno, sem nomes nem notas
   *  (calculado no aparelho do professor ao publicar). */
  colegas?: { forte: string[]; melhorar: string[] } | null;
  /** Em quantas aulas desta UC o professor teve em conta a opinião dos colegas. */
  colegasTidosEmConta?: number;
}

export function getNotaFinalPublicadaUC(alunoId: string, ucId: string): NotaFinalPublicada | null {
  const s: any = load<any>(KEYS.selecoes).find((x: any) =>
    x.alunoId === alunoId && x.planoAulaId === PREFIXO_NOTA + ucId);
  const a = s?.autoavaliacoes?.[0];
  if (!s || !a || typeof a.nota !== 'number') return null;
  return { alunoId, turmaId: s.turmaId, ucId, nota: a.nota, resultado: a.resultado || '', cp: a.cp,
    total: a.total, professor: a.professor || '', publicadaEm: a.publicadaEm || s.criadaEm,
    colegas: a.colegas || null, colegasTidosEmConta: Number(a.colegasTidosEmConta) || 0 };
}

/** Todas as notas finais publicadas de um aluno (as UC que já fecharam). */
export function notasFinaisPublicadasDoAluno(alunoId: string): NotaFinalPublicada[] {
  return load<any>(KEYS.selecoes)
    .filter((x: any) => x.alunoId === alunoId && String(x.planoAulaId || '').startsWith(PREFIXO_NOTA))
    .map((x: any) => getNotaFinalPublicadaUC(alunoId, String(x.planoAulaId).slice(PREFIXO_NOTA.length)))
    .filter((x): x is NotaFinalPublicada => !!x);
}

export function publicarNotaFinalUC(n: Omit<NotaFinalPublicada, 'publicadaEm'>): void {
  const agora = new Date().toISOString();
  // O que os colegas de grupo veem (sem nomes) e em quantas aulas o professor
  // o teve em conta: vai com a nota, para o aluno e para a avaliação final.
  const daUC = new Set(getPlanosAula().filter(p => p.ucId === n.ucId && p.turmaId === n.turmaId).map(p => p.id));
  let colegas: NotaFinalPublicada['colegas'] = null, colegasTidosEmConta = 0;
  try {
    colegas = resumoDosColegasParaOAluno(n.alunoId, daUC);
    colegasTidosEmConta = new Set(getValidacoes().filter((v: any) => v.alunoId === n.alunoId && daUC.has(String(v.planoAulaId)) && v.consideraColegas)
      .map((v: any) => v.planoAulaId)).size;
  } catch { /* sem dados dos colegas: vai só a nota */ }
  addOrUpdateSelecao({
    id: `nota_${n.ucId}_${n.alunoId}`, planoAulaId: PREFIXO_NOTA + n.ucId, comandaId: '', fichaId: '',
    alunoId: n.alunoId, turmaId: n.turmaId, tecnicas: [], atitudes: [], responsabilidades: [],
    autoavaliacoes: [{ competenciaId: 'NOTA_FINAL_UC', nivel: 'nota', nota: n.nota, resultado: n.resultado,
      cp: n.cp, total: n.total, professor: n.professor, publicadaEm: agora,
      ...(colegas ? { colegas } : {}), ...(colegasTidosEmConta ? { colegasTidosEmConta } : {}) }],
    criadaEm: agora,
  } as any);
}

/** UCs em que o aluno já tem de fazer a autoavaliação final: o módulo acabou
 *  (ou o professor fechou a UC ou publicou a nota) e ainda não há proposta dele. */
/** A UC já acabou: passou a data de fim do cronograma ou o professor fechou-a.
 *  Uma nota publicada antes disso não faz a UC acabar (auditoria 5/out/2026:
 *  a UFCD 16 ia no plano 8 de 17 e o aluno lia «A UC terminou»). */
export function ucTerminou(turmaId: string, ucId: string): boolean {
  const hoje = new Date().toISOString().slice(0, 10);
  const m: any = modulosDaTurma(turmaId).find((x: any) => x.id === ucId);
  return (!!m?.dataFim && m.dataFim <= hoje) || ucJaFechada(turmaId, ucId);
}

export function ucsParaAutoavaliacaoFinal(aluno: Aluno): { ucId: string; nome: string; dataFim: string }[] {
  const comAulas = new Set(getPlanosAulaPorTurma(aluno.turmaId).map(p => p.ucId).filter(Boolean) as string[]);
  return modulosDaTurma(aluno.turmaId)
    .filter((m: any) => comAulas.has(m.id)
      && ucTerminou(aluno.turmaId, m.id)
      && !getPropostaFinalUC(aluno.id, m.id))
    .map((m: any) => ({ ucId: m.id, nome: m.nome, dataFim: m.dataFim }));
}


// ============================================================
// Eventos (v4) — no Sheets, na folha EVENTOS (script v17)
// ============================================================
// Os eventos ficavam só no aparelho onde eram criados. Agora vão para o
// Sheets e cada aparelho junta o que lá está: ganha o mais recente.

const KEY_EVENTOS_V4 = 'ecl_eventos_v4';

export function lerEventosLocais<T = any>(): T[] {
  try { return JSON.parse(localStorage.getItem(KEY_EVENTOS_V4) || '[]'); } catch { return []; }
}

export function gravarEvento(ev: any): void {
  const todos = lerEventosLocais();
  const i = todos.findIndex((x: any) => x.id === ev.id);
  if (i >= 0) todos[i] = ev; else todos.push(ev);
  try { localStorage.setItem(KEY_EVENTOS_V4, JSON.stringify(todos)); } catch { /* */ }
  enviar(SHEETS_ECL_URL, 'evento', { evento: ev });
}

export function apagarEvento(id: string): void {
  // Os orçamentos do evento (as requisições feitas para ele) saem também;
  // no Sheets, o script apaga-os com o evento.
  apagarRequisicoesLocais(r => (r as any).eventoId === id);
  const todos = lerEventosLocais().filter((x: any) => x.id !== id);
  try { localStorage.setItem(KEY_EVENTOS_V4, JSON.stringify(todos)); } catch { /* */ }
  enviar(SHEETS_ECL_URL, 'eliminar_evento', { id });
}

/** Junta os eventos do Sheets aos do aparelho. Devolve true se leu. */
export async function sincronizarEventos(): Promise<boolean> {
  const json: any = await lerDoSheets(SHEETS_ECL_URL, { tipo: 'get_eventos' });
  if (!json?.ok) return false;
  const remotos: any[] = (json.eventos || json.dados || []).filter((e: any) => e?.id && e.versao === 4);
  // Eliminado noutro aparelho (script v24): sai daqui também, e não volta a
  // ser enviado. Antes ficava e era reenviado para sempre (auditoria out/2026).
  const fora = new Set<string>((json.eliminados || []).map(String));
  const porId = new Map<string, any>(lerEventosLocais().filter((e: any) => !fora.has(String(e.id))).map((e: any) => [e.id, e]));
  for (const r of remotos) {
    const l = porId.get(r.id);
    if (!l || String(r.atualizadoEm || '') > String(l.atualizadoEm || '')) porId.set(r.id, r);
  }
  try { localStorage.setItem(KEY_EVENTOS_V4, JSON.stringify([...porId.values()])); } catch { /* */ }
  // Os que só existem aqui (criados sem rede) sobem agora.
  const noSheets = new Set(remotos.map(r => r.id));
  [...porId.values()].filter((e: any) => !noSheets.has(e.id)).forEach((e: any) => enviar(SHEETS_ECL_URL, 'evento', { evento: e }));
  return true;
}

/** Confirma que a abertura da aula chegou ao Sheets (é de lá que o aluno a
 *  lê). Se não chegou, volta a enviar e confere outra vez. */
export async function confirmarAberturaNoSheets(planoAulaId: string): Promise<boolean> {
  const s = getSessaoAula(planoAulaId);
  // «Tentar outra vez»: envia já, sem esperar pela próxima volta.
  if (s?.abertaEm) await enviarAberturaJa(s);
  return vigiarAbertura(planoAulaId);
}

// ============================================================
// Grupos formados pelos alunos (com validação do professor)
// ============================================================
// Cada aluno grava só a SUA linha («estou no grupo X»): assim, dois
// alunos a entrar no mesmo grupo ao mesmo tempo não se apagam um ao
// outro. Os grupos saem da junção dessas linhas. O professor pode mudar
// alunos de grupo (grava a linha desse aluno), dar uma ficha a cada grupo
// e validar. A autoavaliação continua individual e igual.

export interface MembroGrupo {
  id: string;            // mg_<plano>_<aluno>
  planoAulaId: string;
  turmaId: string;
  alunoId: string;
  nomeAluno?: string;
  grupoId: string;
  grupoNome: string;
  definidoPor: 'aluno' | 'professor';
  atualizadoEm: string;
  /** O tema do manual (capítulo) que o aluno escolheu na autoavaliação. */
  tema?: number | null;
}
export interface InfoGrupo {
  id: string;            // o grupoId
  planoAulaId: string;
  turmaId: string;
  grupoNome: string;
  fichaId?: string;
  validado?: boolean;
  atualizadoEm: string;
}
/** O que um aluno diz de um colega do grupo. Só o professor vê. Não conta para nota nenhuma. */
export interface AvaliacaoPar {
  id: string;            // par_<plano>_<avaliador>_<avaliado>
  planoAulaId: string;
  turmaId: string;
  grupoId: string;
  avaliadorId: string;
  avaliadoId: string;
  nomeAvaliado?: string;
  /** 1 pouco · 2 às vezes · 3 muito. No «conflito», 1 = criou conflitos, 3 = ajudou a resolver. */
  colabora: number; ouve: number; flexivel: number; conflito: number;
  comentario?: string;
  criadoEm: string;
}

const KEY_MEMBROS = 'ecl_grupos_membros';
const KEY_INFO_GRUPOS = 'ecl_grupos_info';
const KEY_PARES = 'ecl_avaliacoes_pares';
/** No telemóvel do aluno: o que os colegas disseram dele, sem nomes (v26.4). */
const KEY_PARES_SOBRE_MIM = 'ecl_pares_sobre_mim';

/** Vai buscar ao Sheets o que os colegas disseram deste aluno, sem nomes (para o perfil). */
export async function sincronizarParesDoAluno(alunoId: string, turmaId: string): Promise<void> {
  const j: any = await lerDoSheets(SHEETS_ECL_URL, { tipo: 'get_pares_aluno', turmaId, alunoId });
  if (!j?.ok || !Array.isArray(j.dados)) return;
  save(KEY_PARES_SOBRE_MIM, j.dados.filter((p: any) => p.avaliadoId === alunoId).map((p: any) => ({ ...p,
    colabora: Number(p.colabora) || 0, ouve: Number(p.ouve) || 0, flexivel: Number(p.flexivel) || 0, conflito: Number(p.conflito) || 0 })));
}
/** O que os colegas disseram deste aluno: com nomes no aparelho do professor;
 *  sem nomes («c1», «c2»…) no telemóvel do aluno. */
function paresSobre(alunoId: string): AvaliacaoPar[] {
  const comNomes = load<AvaliacaoPar>(KEY_PARES).filter(p => p.avaliadoId === alunoId);
  return comNomes.length ? comNomes : load<AvaliacaoPar>(KEY_PARES_SOBRE_MIM).filter(p => p.avaliadoId === alunoId);
}

export function getMembrosGrupo(planoAulaId: string): MembroGrupo[] {
  return load<MembroGrupo>(KEY_MEMBROS).filter(m => m.planoAulaId === planoAulaId);
}
export function getInfoGrupos(planoAulaId: string): InfoGrupo[] {
  return load<InfoGrupo>(KEY_INFO_GRUPOS).filter(g => g.planoAulaId === planoAulaId);
}
// ── O que os colegas dizem de um aluno (Rosa, out/2026) ─────────
// Não conta para nota. Ajuda o professor a validar as atitudes e os 5 C:
// mostra, aula a aula, quem disse o quê. No fim da UC, o aluno recebe um
// resumo sem nomes e sem notas, para perceber como os colegas o veem.

export type DimensaoPar = 'colabora' | 'ouve' | 'flexivel' | 'conflito';
/** Cada pergunta dos colegas, a atitude e o C a que ajuda. */
export const LIGACOES_PARES: Record<DimensaoPar, { pergunta: string; atitudes: string[]; c: 'cl' | 'co' | 'cr'; nomeC: string; muito: string; pouco: string }> = {
  colabora: { pergunta: 'Colaborou com o grupo?', atitudes: ['ATI-009'], c: 'cl', nomeC: 'Colaborativo',
    muito: 'colaboras muito com o grupo', pouco: 'podes colaborar mais com o grupo' },
  ouve: { pergunta: 'Ouviu os outros?', atitudes: ['ATI-008', 'ATI-007'], c: 'co', nomeC: 'Consciente',
    muito: 'ouves bem os outros', pouco: 'podes ouvir mais os outros antes de decidir' },
  flexivel: { pergunta: 'Aceitou outras ideias?', atitudes: ['ATI-012'], c: 'cr', nomeC: 'Criativo',
    muito: 'aceitas bem as ideias dos outros', pouco: 'podes abrir-te mais às ideias dos outros' },
  conflito: { pergunta: 'Nos problemas do grupo…', atitudes: ['ATI-005', 'ATI-018', 'ATI-006'], c: 'co', nomeC: 'Consciente',
    muito: 'ajudas a resolver os problemas do grupo', pouco: 'nos problemas do grupo, podes ajudar mais a resolver em vez de discutir' },
};
export const TEXTO_RESPOSTA_PAR: Record<DimensaoPar, [string, string, string]> = {
  colabora: ['pouco', 'às vezes', 'muito'], ouve: ['pouco', 'às vezes', 'muito'], flexivel: ['pouco', 'às vezes', 'muito'],
  conflito: ['criou conflitos', 'nem uma coisa nem outra', 'ajudou a resolver'],
};
export interface RespostaDeColega {
  planoAulaId: string; data: string; avaliadorId: string; avaliadorNome: string; valor: number; comentario?: string;
  /** Muito diferente do que os outros colegas disseram na mesma aula: pode ser conflito entre eles. */
  foraDoComum: boolean;
}
export interface OQueOsColegasDizem { dimensao: DimensaoPar; respostas: RespostaDeColega[]; media: number | null; colegas: number; aulas: number }

/** Tudo o que os colegas disseram de um aluno, por pergunta (só aulas até «ate», se dado). */
export function oQueOsColegasDizem(alunoId: string, opts: { ate?: string; planosIds?: Set<string> } = {}): OQueOsColegasDizem[] {
  const planos = new Map(getPlanosAula().map(p => [p.id, p as any]));
  const nomes = new Map(getAlunos().map(a => [a.id, a.nome || `nº ${a.numero}`]));
  const doAluno = paresSobre(alunoId).filter(p => podemAvaliarSe(p.avaliadorId, p.avaliadoId)
    && planos.has(p.planoAulaId) && planos.get(p.planoAulaId).estado !== 'arquivado'
    && (!opts.planosIds || opts.planosIds.has(p.planoAulaId))
    && (!opts.ate || String(planos.get(p.planoAulaId).data || '').slice(0, 10) <= opts.ate));
  return (Object.keys(LIGACOES_PARES) as DimensaoPar[]).map(dim => {
    const respostas: RespostaDeColega[] = doAluno.filter(p => Number(p[dim]) > 0).map(p => {
      const outros = doAluno.filter(o => o.planoAulaId === p.planoAulaId && o.id !== p.id && Number(o[dim]) > 0).map(o => Number(o[dim]));
      const mediaOutros = outros.length ? outros.reduce((a, b) => a + b, 0) / outros.length : null;
      return { planoAulaId: p.planoAulaId, data: String(planos.get(p.planoAulaId)?.data || '').slice(0, 10), avaliadorId: p.avaliadorId,
        avaliadorNome: nomes.get(p.avaliadorId) || p.avaliadorId, valor: Number(p[dim]), comentario: p.comentario,
        foraDoComum: mediaOutros !== null && outros.length >= 2 && Math.abs(Number(p[dim]) - mediaOutros) >= 1.5 };
    }).sort((a, b) => b.data.localeCompare(a.data));
    // A média deixa de fora o que é muito diferente do resto (pode ser conflito entre colegas).
    const conta = respostas.filter(r => !r.foraDoComum);
    return { dimensao: dim, respostas, media: conta.length ? Math.round(conta.reduce((s, r) => s + r.valor, 0) / conta.length * 10) / 10 : null,
      colegas: new Set(respostas.map(r => r.avaliadorId)).size, aulas: new Set(respostas.map(r => r.planoAulaId)).size };
  });
}
/** A pergunta dos colegas que ajuda a validar esta competência (atitude) ou este C. */
export function dimensoesDosColegasPara(competenciaOuC: string): DimensaoPar[] {
  return (Object.keys(LIGACOES_PARES) as DimensaoPar[]).filter(d =>
    LIGACOES_PARES[d].atitudes.includes(competenciaOuC) || LIGACOES_PARES[d].c === competenciaOuC);
}
/** «muito» / «às vezes» / «pouco», a partir da média (1 a 3). */
export function palavraDosColegas(media: number | null, dim: DimensaoPar): string {
  if (media === null) return '';
  const t = TEXTO_RESPOSTA_PAR[dim];
  return media >= 2.5 ? t[2] : media >= 1.75 ? t[1] : t[0];
}
/** Para o aluno, no fim da UC: o que os colegas veem, sem nomes nem notas.
 *  Só com pelo menos 2 colegas diferentes (para ninguém saber quem disse). */
export function resumoDosColegasParaOAluno(alunoId: string, planosIds: Set<string>): { forte: string[]; melhorar: string[] } | null {
  const r = oQueOsColegasDizem(alunoId, { planosIds }).filter(x => x.media !== null && x.colegas >= 2);
  if (!r.length) return null;
  return { forte: r.filter(x => x.media! >= 2.5).map(x => LIGACOES_PARES[x.dimensao].muito),
    melhorar: r.filter(x => x.media! < 2).map(x => LIGACOES_PARES[x.dimensao].pouco) };
}

/** O que os colegas disseram nesta aula, para guardar na validação quando o
 *  professor o teve em conta: só números de conjunto, sem nomes (o aluno vê
 *  isto no perfil). Com «autoAlta»/«autoBaixa»: o aluno viu-se bem acima ou
 *  bem abaixo do que os colegas o veem. */
export function colegasParaAValidacao(alunoId: string, planoAulaId: string, autoavaliacoes: any[], triagem: any) {
  const dims: Record<string, { media: number; colegas: number }> = {};
  const autoAlta: string[] = [], autoBaixa: string[] = [];
  for (const d of oQueOsColegasDizem(alunoId, { planosIds: new Set([planoAulaId]) })) {
    if (d.media === null) continue;
    dims[d.dimensao] = { media: d.media, colegas: d.colegas };
    const lig = LIGACOES_PARES[d.dimensao];
    const notas = (autoavaliacoes || []).filter(a => lig.atitudes.includes(a.competenciaId) && Number(a.nota) > 0).map(a => Number(a.nota));
    const r = triagem?.[lig.c];
    const alta = notas.some(n => n >= 3) || (typeof r === 'number' && r >= 2);
    const baixa = (notas.length > 0 && notas.every(n => n <= 2)) || (typeof r === 'number' && r <= 1);
    if (alta && d.media < 2) autoAlta.push(d.dimensao);
    if (baixa && d.media >= 2.5) autoBaixa.push(d.dimensao);
  }
  return Object.keys(dims).length ? { dims, autoAlta, autoBaixa } : null;
}

/** O perfil «social» do aluno (Rosa, out/2026): os 5 C em palavras e o que os
 *  colegas veem — só o que o professor confirmou, sem nomes, com 2 ou mais
 *  colegas — e um passo concreto. Calcula-se no telemóvel do aluno a partir
 *  das validações dele (que já lá estão). */
export interface PerfilSocial {
  /** A UC a que se referem os 5 C (a mais recente com aulas validadas). */
  ucId: string;
  cincoC: { c: 'cp' | 'cm' | 'cl' | 'cr' | 'co'; nome: string; nivel: string; pct: number; frase: string }[];
  tecnicas: { dominadas: string[]; aTreinar: string[]; total: number };
  atitudes: { dominadas: string[]; aTreinar: string[]; total: number };
  participacoes: { titulo: string; data: string }[];
  forte: string[]; melhorar: string[];
  diferenca: 'acima' | 'abaixo' | 'igual' | null;
  passo: string; colegas: number; aulas: number;
}
/** O que quer dizer cada C, em três níveis (a melhorar · a caminho · bem). */
const FRASES_5C: Record<'cp' | 'cm' | 'cl' | 'cr' | 'co', [string, string, string]> = {
  cp: ['As técnicas e os conhecimentos das aulas ainda precisam de treino.', 'Já fazes as técnicas das aulas, às vezes com ajuda.', 'Fazes bem as técnicas e mostras o que sabes.'],
  cm: ['As faltas, os atrasos ou as autoavaliações por entregar estão a pesar.', 'Estás presente e cumpres quase sempre o que te pedem.', 'Estás presente, chegas a horas e cumpres o que te pedem.'],
  cl: ['Ainda trabalhas quase sempre sozinho/a.', 'Ajudas quando te pedem.', 'Combinas com a equipa e ajudas toda a gente a acabar.'],
  cr: ['Quando algo corre mal, ainda pedes logo ajuda.', 'Tentas outra maneira antes de pedir ajuda.', 'Resolves imprevistos e explicas aos colegas como fizeste.'],
  co: ['Ainda te custa ver o que tens de melhorar.', 'Já reparas no que correu mal e começas a mudar.', 'Mudas o que correu mal e explicas o que melhoraste.'],
};
const NOMES_5C = { cp: 'Competente', cm: 'Comprometido', cl: 'Colaborativo', cr: 'Criativo', co: 'Consciente' } as const;
const PALAVRA_NIVEL: Record<number, string> = { 2: 'Insuficiente', 4: 'Suficiente', 5: 'Bom', 6: 'Muito bom' };
export function perfilSocialDoAluno(alunoId: string): PerfilSocial | null {
  const vals = getValidacoes().filter((v: any) => v.alunoId === alunoId);
  const porAula = new Map<string, any>();
  vals.forEach((v: any) => { const a = porAula.get(v.planoAulaId); if (!a || quandoFoi(v.validadoEm) >= quandoFoi(a.validadoEm)) porAula.set(v.planoAulaId, v); });
  const ultimas = [...porAula.values()];
  const aluno = getAlunos().find(a => a.id === alunoId);
  const turmaId = aluno?.turmaId || '';
  // Os 5 C com a mesma conta da pauta, na UC mais recente com aulas validadas.
  const planosPorId = new Map(getPlanosAula().map(p => [p.id, p as any]));
  const ucId = String([...ultimas].map(v => planosPorId.get(v.planoAulaId)).filter((p: any) => p && !p.tipoEvento && p.ucId)
    .sort((a: any, b: any) => String(b.data || '').localeCompare(String(a.data || '')))[0]?.ucId || '');
  let cincoC: PerfilSocial['cincoC'] = [];
  if (ucId && turmaId) {
    try {
      const produtos = produtosDaUC(turmaId, ucId);
      const linha = linhasDaPautaUC(turmaId, ucId, produtos, alunoId)[0];
      if (linha) {
        const niveis: Record<string, number | null> = { cp: nivelPauta(notaDoCompetente(linha, produtos)), cm: linha.c5.cm, cl: linha.c5.cl, cr: linha.c5.cr, co: linha.c5.co };
        cincoC = (['cp', 'cm', 'cl', 'cr', 'co'] as const).filter(c => niveis[c]).map(c => {
          const n = niveis[c] as number;
          return { c, nome: NOMES_5C[c], nivel: PALAVRA_NIVEL[n] || 'Suficiente', pct: Math.round(Math.max(12, Math.min(100, n / 6 * 100))),
            frase: FRASES_5C[c][n <= 3 ? 0 : n === 4 ? 1 : 2] };
        });
      }
    } catch { /* sem dados para a pauta */ }
  }
  // As competências técnicas e as atitudes: as que já dominas e as que estás a treinar.
  const perfil = getPerfilProfissionalAluno(alunoId);
  const resumo = (l: ItemPerfil[]) => ({
    dominadas: l.filter(x => x.consolidada || x.nivel >= 4).map(x => x.nome),
    aTreinar: l.filter(x => x.nivel > 0 && x.nivel < 3).map(x => x.nome),
    total: l.filter(x => x.nivel > 0).length,
  });
  const tecnicas = resumo(perfil.tecnicas), atitudes = resumo(perfil.atitudes);
  // A participação ativa: atividades e eventos em que esteve (participação confirmada pelo professor).
  const participacoes = turmaId ? getPlanosAula().filter((p: any) => p.turmaId === turmaId && eventoForaDoHorario(p) && p.estado !== 'arquivado'
    && p.participantesConfirmadosEm && participantesDoEvento(p).includes(alunoId))
    .sort((a: any, b: any) => String(b.data || '').localeCompare(String(a.data || '')))
    .map((p: any) => ({ titulo: String(p.titulo || 'Atividade').replace(/^Atividade fora da escola — /, ''), data: String(p.data || '').slice(0, 10) })) : [];
  // O que os colegas disseram, em todas as aulas (Rosa, out/2026: não conta
  // para a nota, é para o aluno ter noção das suas atitudes; já não depende
  // do visto do professor na validação).
  const soma: Record<string, { s: number; n: number }> = {};
  let colegas = 0, aulas = 0, acima = 0, abaixo = 0;
  const aulasComColegas = [...new Set(paresSobre(alunoId).map(p => p.planoAulaId))].filter(id => {
    const pl = planosPorId.get(id); return pl && pl.estado !== 'arquivado';
  });
  aulasComColegas.forEach(planoId => {
    const resp = getSelecoes().filter((x: any) => x.alunoId === alunoId && x.planoAulaId === planoId)
      .sort((a: any, b: any) => quandoFoi(b.criadaEm) - quandoFoi(a.criadaEm))[0] as any;
    const r = colegasParaAValidacao(alunoId, planoId, resp?.autoavaliacoes || [], resp?.triagem5c);
    if (!r) return;
    aulas++;
    Object.entries(r.dims).forEach(([d, x]) => {
      soma[d] = soma[d] || { s: 0, n: 0 }; soma[d].s += x.media * x.colegas; soma[d].n += x.colegas;
      colegas = Math.max(colegas, x.colegas);
    });
    acima += r.autoAlta.length; abaixo += r.autoBaixa.length;
  });
  const dims = Object.entries(soma).filter(([, x]) => x.n >= 2).map(([d, x]) => ({ d: d as DimensaoPar, m: x.s / x.n }));
  const forte = dims.filter(x => x.m >= 2.5).map(x => LIGACOES_PARES[x.d].muito);
  const melhorarD = dims.filter(x => x.m < 2).map(x => x.d);
  const melhorar = melhorarD.map(d => LIGACOES_PARES[d].pouco);
  if (!cincoC.length && !dims.length && !tecnicas.total && !atitudes.total && !participacoes.length) return null;
  const diferenca = !dims.length ? null : acima > abaixo ? 'acima' : abaixo > acima ? 'abaixo' : 'igual';
  const PASSOS: Record<string, string> = {
    conflito: 'quando não concordares, primeiro repete a ideia do colega («Estás a dizer que…?») e só depois dá a tua.',
    colabora: 'na próxima aula, quando acabares a tua parte, pergunta à equipa «Em que posso ajudar?».',
    ouve: 'antes de responder, deixa o colega acabar e repete o que ele disse.',
    flexivel: 'experimenta a ideia de um colega antes de dizeres que não.',
    cr: 'antes de pedir ajuda, experimenta uma maneira diferente. Se não resultar, pede ajuda e conta o que tentaste.',
    co: 'no fim da aula, pensa numa coisa que correu mal e no que vais mudar na próxima.',
    cl: 'ajuda um colega sem ele te pedir.',
    cm: 'chega a horas e entrega a autoavaliação no fim de cada aula.',
  };
  const maisFraco = [...cincoC].filter(c => c.c === 'cl' || c.c === 'cr' || c.c === 'co' || c.c === 'cm').sort((a, b) => a.pct - b.pct)[0];
  const passo = melhorarD.includes('conflito') ? PASSOS.conflito : melhorarD[0] ? PASSOS[melhorarD[0]]
    : diferenca === 'abaixo' ? 'na próxima aula, diz uma ideia ao grupo: os teus colegas confiam em ti.'
    : maisFraco && maisFraco.pct < 75 ? PASSOS[maisFraco.c]
    : tecnicas.aTreinar[0] ? `na próxima aula prática, pede ao professor que te mostre outra vez: ${tecnicas.aTreinar[0].toLowerCase()}.`
    : 'experimenta ser o líder do KitchenFlow numa aula: o grupo confia em ti.';
  return { ucId, cincoC, tecnicas, atitudes, participacoes, forte, melhorar, diferenca, passo, colegas, aulas };
}

export function getAvaliacoesPares(planoAulaId?: string): AvaliacaoPar[] {
  return load<AvaliacaoPar>(KEY_PARES).filter(p => !planoAulaId || p.planoAulaId === planoAulaId);
}

function juntarPorId<T extends { id: string; atualizadoEm?: string; criadoEm?: string }>(chave: string, novos: T[]): void {
  const m = new Map(load<T>(chave).map(x => [x.id, x]));
  for (const n of novos) {
    if (!n?.id) continue;
    const velho = m.get(n.id);
    const d = (x: any) => String(x?.atualizadoEm || x?.criadoEm || '');
    // A mesma versão vinda de outro sítio (o Sheets pode não guardar todos
    // os campos, como o tema do grupo): fica o que já se sabia.
    if (velho && d(n) === d(velho)) m.set(n.id, { ...velho, ...n, ...((velho as any).tema != null && (n as any).tema == null ? { tema: (velho as any).tema } : {}) });
    else if (!velho || d(n) > d(velho)) m.set(n.id, n);
  }
  save(chave, [...m.values()]);
}

export function entrarNoGrupo(m: Omit<MembroGrupo, 'id' | 'atualizadoEm'>): MembroGrupo {
  const reg: MembroGrupo = { ...m, id: `mg_${m.planoAulaId}_${m.alunoId}`, atualizadoEm: new Date().toISOString() };
  juntarPorId(KEY_MEMBROS, [reg]);
  enviar(SHEETS_ECL_URL, 'grupo_membro', reg as any);
  return reg;
}
export function guardarInfoGrupo(g: Omit<InfoGrupo, 'atualizadoEm'>): void {
  const reg: InfoGrupo = { ...g, atualizadoEm: new Date().toISOString() };
  juntarPorId(KEY_INFO_GRUPOS, [reg]);
  enviar(SHEETS_ECL_URL, 'grupo_info', reg as any);
}
/** Regra (Rosa, out/2026): os alunos de teste (nº 99 e 88, «TESTE — aluno de
 *  ensaio») não entram na avaliação entre colegas dos alunos verdadeiros. Um
 *  aluno de teste só avalia (e só é avaliado por) outro aluno de teste. */
export function alunoDeTeste(alunoOuId: Aluno | string | undefined): boolean {
  const a: any = typeof alunoOuId === 'string' ? getAlunos().find(x => x.id === alunoOuId) : alunoOuId;
  if (!a) return false;
  const n = Number(a.numero);
  return n === 99 || n === 88 || n === 9999 || /\bteste\b/i.test(String(a.nome || ''));
}
export function podemAvaliarSe(avaliadorId: string, avaliadoId: string): boolean {
  return avaliadorId !== avaliadoId && alunoDeTeste(avaliadorId) === alunoDeTeste(avaliadoId);
}
export function guardarAvaliacaoPar(p: Omit<AvaliacaoPar, 'id' | 'criadoEm'>): void {
  if (!podemAvaliarSe(p.avaliadorId, p.avaliadoId)) return;
  const reg: AvaliacaoPar = { ...p, id: `par_${p.planoAulaId}_${p.avaliadorId}_${p.avaliadoId}`, criadoEm: new Date().toISOString() };
  juntarPorId(KEY_PARES, [reg]);
  enviar(SHEETS_ECL_URL, 'avaliacao_par', reg as any);
}

/** Vai buscar ao Sheets os grupos (e, para o professor, as avaliações entre colegas). */
export async function sincronizarGrupos(turmaId: string, comPares = false): Promise<void> {
  const json: any = await lerDoSheets(SHEETS_ECL_URL, { tipo: 'get_grupos', turmaId });
  if (json?.ok) {
    juntarPorId(KEY_MEMBROS, (json.membros || []) as MembroGrupo[]);
    juntarPorId(KEY_INFO_GRUPOS, (json.info || []).map((g: any) => ({ ...g, validado: g.validado === true || g.validado === 'true' })) as InfoGrupo[]);
  }
  if (comPares) {
    const jp: any = await lerDoSheets(SHEETS_ECL_URL, { tipo: 'get_pares', turmaId });
    if (jp?.ok) juntarPorId(KEY_PARES, (jp.dados || []).map((p: any) => ({ ...p,
      colabora: Number(p.colabora) || 0, ouve: Number(p.ouve) || 0, flexivel: Number(p.flexivel) || 0, conflito: Number(p.conflito) || 0 })) as AvaliacaoPar[]);
  }
}

export interface GrupoDaAula { id: string; nome: string; membros: MembroGrupo[]; fichaId?: string; validado: boolean }

/** Os grupos da aula, a partir das linhas de cada aluno. */
export function gruposDaAula(planoAulaId: string): GrupoDaAula[] {
  const info = new Map(getInfoGrupos(planoAulaId).map(g => [g.id, g]));
  const mapa = new Map<string, GrupoDaAula>();
  for (const m of getMembrosGrupo(planoAulaId)) {
    if (!m.grupoId) continue;
    const g = mapa.get(m.grupoId) || { id: m.grupoId, nome: info.get(m.grupoId)?.grupoNome || m.grupoNome, membros: [],
      fichaId: info.get(m.grupoId)?.fichaId, validado: !!info.get(m.grupoId)?.validado };
    g.membros.push(m);
    mapa.set(m.grupoId, g);
  }
  return [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt', { numeric: true }));
}
export function grupoDoAluno(planoAulaId: string, alunoId: string): GrupoDaAula | undefined {
  return gruposDaAula(planoAulaId).find(g => g.membros.some(m => m.alunoId === alunoId));
}

/** Regra (Rosa, out/2026): no mesmo grupo, o tema é o mesmo. O tema que o
 *  aluno escolhe fica no registo dele no grupo, que chega aos colegas. */
export function marcarTemaNoGrupo(planoAulaId: string, alunoId: string, tema: number | null): void {
  const m = load<MembroGrupo>(KEY_MEMBROS).find(x => x.planoAulaId === planoAulaId && x.alunoId === alunoId && x.grupoId);
  if (!m || (m.tema ?? null) === tema) return;
  const reg: MembroGrupo = { ...m, tema, atualizadoEm: new Date().toISOString() };
  juntarPorId(KEY_MEMBROS, [reg]);
  enviar(SHEETS_ECL_URL, 'grupo_membro', reg as any);
}
/** Os temas que os colegas do grupo já escolheram (sem o próprio aluno). */
export function temasDosColegas(planoAulaId: string, alunoId: string): { nome: string; tema: number }[] {
  const g = grupoDoAluno(planoAulaId, alunoId);
  if (!g) return [];
  return g.membros.filter(m => m.alunoId !== alunoId && m.tema != null)
    .map(m => ({ nome: String(m.nomeAluno || '').split(' ')[0] || 'Colega', tema: Number(m.tema) }));
}

// ============================================================
// Eventos fora do horário nas «Atividades e concursos»
// ============================================================
// O plano do evento é a atividade. O professor escolhe: a turma toda vai
// (obrigatório) ou os alunos inscrevem-se e ele aceita quem vai. A
// inscrição do aluno segue pelo mesmo caminho rápido dos grupos (sem
// mexer no script), com o «plano» insc_<id>. Quem o professor aceita
// fica no próprio plano (participantesIds). Não há faltas: é extra.
export type ModoParticipacao = 'turma' | 'inscricao';
export function modoParticipacao(p: any): ModoParticipacao { return p?.modoParticipacao === 'inscricao' ? 'inscricao' : 'turma'; }
const idInscricao = (planoId: string) => 'insc_' + planoId;
export function eventoForaDoHorario(p: any): boolean { return !!p?.tipoEvento && TIPOS_EVENTO_PLANO.includes(p?.tipoAtividade); }

/**
 * Atividade obrigatória fora das horas da aula (Rosa, 5-6/out/2026): a turma
 * toda vai, depois das aulas, num sábado, nas férias ou antes do início das UC.
 * Não é bónus: CONTA COMO MAIS UMA AULA, ligada à aula desse dia ou à seguinte
 * da mesma UC; se a UC já tiver acabado, à aula seguinte da mesma disciplina.
 * Quem não se autoavaliou conta 0. Os convidados (inscrição) e os concursos
 * continuam a ser bónus. Dentro das horas da aula, o evento entra no plano de aula.
 */
export function atividadeContaComoAula(p: any): boolean {
  return !!p?.tipoEvento && p.tipoEvento !== 'concurso' && p.estado !== 'arquivado' && !p.eliminado
    && modoParticipacao(p) === 'turma' && !p.aulaLigada && !aulaNasMesmasHoras(p);
}
/** A aula da turma no mesmo dia e às mesmas horas da atividade (sobrepõem-se). */
export function aulaNasMesmasHoras(atv: any): PlanoAula | undefined {
  const dia = String(atv?.data || '').slice(0, 10);
  const min = (h?: string) => { const [a, b] = String(h || '').split(':').map(Number); return isNaN(a) ? NaN : a * 60 + (b || 0); };
  const i1 = min(atv?.horaInicio), f1 = min(atv?.horaFim);
  if (isNaN(i1) || isNaN(f1)) return undefined;
  return getPlanosAula().find((p: any) => p.id !== atv.id && p.turmaId === atv.turmaId && !p.tipoEvento && p.estado !== 'arquivado' && !p.eliminado
    && String(p.data || '').slice(0, 10) === dia && i1 < min(p.horaFim) && min(p.horaInicio) < f1);
}
/** A aula que recebe a avaliação de uma atividade obrigatória fora das horas da aula. */
export function aulaQueRecebeAtividade(atv: any): PlanoAula | undefined {
  if (!atv) return undefined;
  const dia = String(atv.data || '').slice(0, 10);
  const aulas = getPlanosAula().filter((p: any) => p.turmaId === atv.turmaId && !p.tipoEvento && p.estado !== 'arquivado' && !p.eliminado
    && String(p.data || '').slice(0, 10) >= dia)
    .sort((a, b) => `${String(a.data).slice(0, 10)} ${a.horaInicio || ''}`.localeCompare(`${String(b.data).slice(0, 10)} ${b.horaInicio || ''}`));
  const mesmaUC = aulas.find(a => atv.ucId && a.ucId === atv.ucId);
  if (mesmaUC) return mesmaUC;
  // A UC já acabou (ou a atividade não tem UC): a aula seguinte da mesma disciplina.
  const mods: any[] = modulosDaTurma(atv.turmaId) as any[];
  const disc = mods.find(m => m.id === atv.ucId)?.disciplina
    || mods.find(m => atv.professor && m.docente === atv.professor)?.disciplina;
  if (!disc) return undefined;
  const daDisciplina = new Set(mods.filter(m => m.disciplina === disc).map(m => m.id));
  return aulas.find(a => daDisciplina.has(a.ucId));
}

export function inscreverNoEvento(plano: PlanoAula, aluno: { id: string; nome?: string }, sim: boolean): void {
  entrarNoGrupo({ planoAulaId: idInscricao(plano.id), turmaId: plano.turmaId, alunoId: aluno.id, nomeAluno: aluno.nome,
    grupoId: sim ? 'inscrito' : 'retirado', grupoNome: sim ? 'Inscrito' : 'Retirado', definidoPor: 'aluno' });
}
export function inscritosNoEvento(planoId: string): string[] {
  return getMembrosGrupo(idInscricao(planoId)).filter(m => m.grupoId === 'inscrito').map(m => m.alunoId);
}
/** Uma aula que foi transformada em atividade (antes da regra «a atividade
 *  nunca muda a aula»): ainda tem sinais de aula — o tipo de aula, fichas,
 *  conteúdos, ou respostas de alunos que não estão na atividade. */
export function aulaTransformadaEmAtividade(plano: any): boolean {
  if (!plano || !eventoForaDoHorario(plano) || plano.aulaLigada) return false;
  const tipo = plano.triagemAula?.tipo;
  const quem = new Set(participantesDoEvento(plano));
  const deOutros = modoParticipacao(plano) === 'inscricao'
    && getSelecoes().some(s => s.planoAulaId === plano.id && !quem.has(s.alunoId));
  return (!!tipo && tipo !== 'atitudinal') || (plano.fichasIds || []).length > 0 || (plano.conhecimentosProf || []).length > 0 || deOutros;
}

/** Repara: a aula volta a ser aula para a turma toda, e a atividade passa a
 *  ficar à parte, ligada a ela, com os mesmos participantes e decisões.
 *  Os campos tirados vão a «null» (e não apagados): assim a correção chega a
 *  todos os aparelhos e ao Sheets, que guarda o que já lá estava. */
export function separarAtividadeDaAula(planoId: string): { aula: PlanoAula; atividade: PlanoAula } | null {
  const x: any = getPlanosAula().find(p => p.id === planoId);
  if (!x || !aulaTransformadaEmAtividade(x)) return null;
  const agora = new Date().toISOString();
  const tipo = x.triagemAula?.tipo || String(x.tipoPlanAula || 'pratico').replace('_obr', '');
  const nomes: Record<string, string> = { pratico: 'Aula prática', misto: 'Aula mista', teorico: 'Aula teórica', atitudinal: 'Dinâmica de grupo — atitudes' };
  const atividade: any = {
    id: `plano_atv_${x.id}_${Date.now().toString(36)}`, turmaId: x.turmaId, professor: x.professor || '',
    data: String(x.data || '').slice(0, 10), horaInicio: x.horaInicio || '', horaFim: x.horaFim || '',
    titulo: `${x.tipoAtividade} — ${x.titulo || 'aula'}`, observacoes: '', fichasIds: [], estado: 'publicado',
    criadoEm: agora, atualizadoEm: agora, ucId: x.ucId || '', ucNome: x.ucNome || '',
    numeroPlan: proximoNumeroPlano(), tipoAtividade: x.tipoAtividade, tipoEvento: x.tipoEvento,
    tipoPlanAula: 'atitudinal', compAdicionadas: atitudesSugeridasEvento(x.tipoAtividade),
    modoParticipacao: modoParticipacao(x), participantesIds: x.participantesIds || [],
    postosPeloProfessor: x.postosPeloProfessor || [], participantesConfirmadosEm: x.participantesConfirmadosEm || agora,
    resultadosConcurso: x.resultadosConcurso || {}, fasesConcurso: x.fasesConcurso || 0,
    contaAssiduidade: false, aulaLigada: x.id, tambemRespondemAula: x.tambemRespondemAula !== false,
    ...(x.eventoId ? { eventoId: x.eventoId } : {}),
    triagemAula: { tipo: 'atitudinal', onde: /fora|externo/i.test(x.tipoAtividade) ? 'fora' : 'cozinha',
      cozinham: !/fora|externo|Concurso/i.test(x.tipoAtividade), trabalho: 'grupos', servico: /Catering|Buffet|externo/i.test(x.tipoAtividade) },
  };
  addOrUpdatePlanoAula(atividade);
  const aula: any = { ...x, tipoAtividade: nomes[tipo] || 'Aula prática', tipoEvento: null, modoParticipacao: 'turma',
    participantesIds: [], postosPeloProfessor: [], participantesConfirmadosEm: null, tambemRespondemAula: null, eventoId: null,
    resultadosConcurso: null, fasesConcurso: null, atualizadoEm: agora };
  addOrUpdatePlanoAula(aula);
  return { aula, atividade };
}

/** O plano da turma no dia da atividade (Rosa, out/2026): o que está ligado
 *  a ela, ou senão a aula da mesma turma nesse dia (a que se sobrepõe às
 *  horas, se houver mais do que uma). Não se escolhe: é o do mesmo dia. */
export function aulaDoDiaDaAtividade(atividade: any): PlanoAula | undefined {
  if (!atividade) return undefined;
  const todos = getPlanosAula();
  // A aula ligada só vale se ainda estiver em uso: arquivada (anulada) ou
  // eliminada, procura-se a aula da turma desse dia que está em uso (antes a
  // atividade continuava presa a um plano arquivado — Rosa, out/2026).
  if (atividade.aulaLigada) { const a: any = todos.find(p => p.id === atividade.aulaLigada); if (a && a.estado !== 'arquivado' && !a.eliminado) return a; }
  const dia = String(atividade.data || '').slice(0, 10);
  const min = (h?: string) => { const [a, b] = String(h || '').split(':').map(Number); return isNaN(a) ? NaN : a * 60 + (b || 0); };
  const doDia = todos.filter((p: any) => p.id !== atividade.id && p.turmaId === atividade.turmaId && !p.tipoEvento
    && p.estado !== 'arquivado' && String(p.data || '').slice(0, 10) === dia);
  const i1 = min(atividade.horaInicio), f1 = min(atividade.horaFim);
  return doDia.find((p: any) => { const i2 = min(p.horaInicio), f2 = min(p.horaFim); return [i1, f1, i2, f2].some(isNaN) || (i1 < f2 && i2 < f1); }) || doDia[0];
}
/** As partes do plano da turma a que um aluno de uma atividade do mesmo dia
 *  responde, como o professor disse (Rosa, out/2026). A atividade é um extra:
 *  por omissão, continuam a responder a tudo, como os outros. O professor
 *  pode tirar uma parte (por exemplo as atitudes, já avaliadas na atividade). */
export type PartesDoPlano = { tecnicas: boolean; conhecimentos: boolean; atitudes: boolean };
export const PARTES_POR_OMISSAO: PartesDoPlano = { tecnicas: true, conhecimentos: true, atitudes: true };
export function partesDoPlanoParaOAluno(aula: any, alunoId: string): PartesDoPlano {
  const atv: any = getPlanosAula().find((a: any) => eventoForaDoHorario(a) && a.estado !== 'arquivado'
    && aulaDoDiaDaAtividade(a)?.id === aula?.id && participantesDoEvento(a).includes(alunoId));
  // A própria atividade: as atitudes só se não forem já avaliadas no plano
  // de aula da turma desse dia (não se repetem as mesmas perguntas).
  if (aula?.tipoEvento) return { tecnicas: true, conhecimentos: true, atitudes: !atitudesNoPlanoDaTurma(aula) };
  if (!atv) return { tecnicas: true, conhecimentos: true, atitudes: true };
  if (atv.tambemRespondemAula === false) return { tecnicas: false, conhecimentos: false, atitudes: false };
  return { ...PARTES_POR_OMISSAO, ...(atv.partesDaAula || {}) };
}
/** Regra (Rosa, out/2026): os alunos da atividade já respondem às atitudes
 *  no plano de aula da turma desse dia? Então a atividade não as repete.
 *  Se não respondem ao plano de aula (ou as atitudes lá foram tiradas), a
 *  atividade avalia as atitudes. */
export function atitudesNoPlanoDaTurma(atividade: any): boolean {
  if (!atividade?.tipoEvento) return false;
  const aula = aulaDoDiaDaAtividade(atividade);
  if (!aula || atividade.tambemRespondemAula === false) return false;
  return { ...PARTES_POR_OMISSAO, ...(atividade.partesDaAula || {}) }.atitudes !== false;
}

/** Regra (Rosa, out/2026): os alunos de um plano. Numa atividade com os
 *  participantes escolhidos (inscrição), só esses; numa aula (ou atividade
 *  da turma toda), a turma toda. Tudo o que lista alunos de um plano — quem
 *  falta responder, a turma na aula, faltas, funções, grupos, reabrir —
 *  usa isto. */
export function alunosDoPlano(plano: any): Aluno[] {
  // Os alunos fantasma não entram nas listas da aula (faltas, funções, grupos).
  const turma = getAlunos().filter(a => a.turmaId === plano?.turmaId && a.ativo !== false && !ehFantasma(a.id)).sort((a, b) => a.numero - b.numero);
  if (!plano || !eventoForaDoHorario(plano) || modoParticipacao(plano) !== 'inscricao') return turma;
  const ids = new Set<string>((plano.participantesIds || []) as string[]);
  return turma.filter(a => ids.has(a.id));
}
/** O aluno esteve nesta aula: entrou (presença) ou, num evento, está entre
 *  os participantes. Uma autoavaliação de quem não esteve chega ao professor
 *  com aviso (auditoria 5/out/2026). */
export function esteveNaAula(alunoId: string, planoAulaId: string): boolean {
  if (getPresencas().some(x => x.alunoId === alunoId && x.planoAulaId === planoAulaId && x.presente !== false)) return true;
  const p: any = getPlanosAula().find(x => x.id === planoAulaId);
  if (p?.tipoEvento) return participantesDoEvento(p).includes(alunoId);
  return false;
}

export function participantesDoEvento(p: PlanoAula): string[] {
  return modoParticipacao(p) === 'turma'
    ? getAlunos().filter(a => a.turmaId === p.turmaId && a.ativo !== false && !ehFantasma(a.id)).map(a => a.id)
    : ((p as any).participantesIds || []);
}
/** Os eventos da turma, no formato das atividades que o aluno vê. */
export function eventosComoAtividades(turmaId: string): Atividade[] {
  return getPlanosAula().filter((p: any) => p.turmaId === turmaId && eventoForaDoHorario(p) && p.estado !== 'arquivado')
    .map((p: any) => ({
      id: 'ev_' + p.id, turmaId, tipo: p.tipoEvento, titulo: p.titulo || 'Evento', data: String(p.data || '').slice(0, 10),
      horaInicio: p.horaInicio, horaFim: p.horaFim, descricao: p.sumario || p.observacoes || '',
      participantesIds: participantesDoEvento(p), inscritosIds: inscritosNoEvento(p.id), criadaEm: p.criadoEm || '',
      doPlano: true, modo: modoParticipacao(p), planoId: p.id, aviso: p.avisoDeslocacao || '',
    } as any));
}

// ============================================================
// A aula num só pedido (script v19): plano, fichas, abertura e grupos
// ============================================================
// O telemóvel do aluno pergunta isto de 3 em 3 segundos. O script
// responde da memória, sem abrir as folhas: é rápido e não entope,
// mesmo com a turma toda. Com um script antigo (sem «get_aula»),
// devolve false e a aplicação faz como antes.
let aulaNaoSuportada = false;
let aulaJaLida = false;
const contadorDaAula = new Map<string, string>();
/** O número de alterações da turma, que veio com a aula rápida. */
export function contadorDaTurma(turmaId: string): string { return contadorDaAula.get(turmaId) || ''; }
/** O script responde a «get_aula» (v19)? */
export function aulaRapidaDisponivel(): boolean { return !aulaNaoSuportada; }
export async function lerAula(turmaId: string): Promise<boolean> {
  if (!turmaId || aulaNaoSuportada) return false;
  // A aula é o que o aluno espera para entrar: vai à frente da fila (auditoria out/2026).
  const json: any = await lerDoSheetsJa(SHEETS_ECL_URL, { tipo: 'get_aula', turmaId }, 15000);
  if (!json?.ok || !Array.isArray(json.planos)) {
    if (json && json.ok === false && /tipo|desconhecido/i.test(String(json.mensagem || ''))) aulaNaoSuportada = true;
    if (json && json.ok && !Array.isArray(json.planos)) aulaNaoSuportada = true;
    return false;
  }
  juntarAula(json, turmaId);
  if (json.contador) contadorDaAula.set(turmaId, String(json.contador));
  aulaJaLida = true;
  return true;
}

/** Junta ao aparelho a aula que chegou (do Sheets ou da base de dados):
 *  planos, fichas, aberturas e grupos. */
function juntarAula(json: any, turmaId: string): void {
  // Planos (os eliminados neste aparelho não voltam)
  const eliminados = new Set(load<string>(KEYS.eliminadosPlanos));
  const planos = getPlanosAula();
  let mudou = false;
  for (const pRaw of (json.planos || [])) {
    if (!pRaw?.id || eliminados.has(pRaw.id)) continue;
    const p: any = { ...pRaw,
      fichasIds: Array.isArray(pRaw.fichasIds) ? pRaw.fichasIds
        : (typeof pRaw.fichasIds === 'string' && pRaw.fichasIds ? pRaw.fichasIds.split(/[;,]/).map((s: string) => s.trim()).filter(Boolean) : []),
      data: dataSoDia(pRaw.data),
      compRemovidas: Array.isArray(pRaw.compRemovidas) ? pRaw.compRemovidas : [],
      compAdicionadas: Array.isArray(pRaw.compAdicionadas) ? pRaw.compAdicionadas : [] };
    const i = planos.findIndex(x => x.id === p.id);
    if (i < 0) { planos.push(p); mudou = true; }
    else if (String(p.atualizadoEm || '') > String((planos[i] as any).atualizadoEm || '')) {
      if (!p.fichasIds?.length && planos[i].fichasIds?.length) p.fichasIds = planos[i].fichasIds;
      planos[i] = { ...planos[i], ...p }; mudou = true;
    }
  }
  if (mudou) save(KEYS.planos, planos);
  // Fichas: as que faltam entram; as que existem ficam com o que tiverem a mais
  const eliminadas = new Set(load<string>(KEYS.eliminadosFichas));
  const fichas = getFichasProducao();
  let mudouF = false;
  for (const f of (json.fichas || [])) {
    if (!f?.id || eliminadas.has(f.id)) continue;
    const i = fichas.findIndex(x => x.id === f.id);
    const nova: any = { ...f, ingredientes: Array.isArray(f.ingredientes) ? f.ingredientes : [],
      preparacao: Array.isArray(f.preparacao) ? f.preparacao : [] };
    if (i < 0) { fichas.push(nova); mudouF = true; }
    else {
      // A ficha que o professor corrigiu depois de o aluno a ter recebido
      // tem de chegar (Rosa, set/2026): antes só se atualizava se a do aluno
      // estivesse vazia, e as correções nunca chegavam. Nunca se troca uma
      // ficha com conteúdo por uma vazia.
      const loc: any = fichas[i];
      const vazia = !nova.ingredientes.length && !nova.preparacao.length;
      const maisRecente = String(nova.atualizadoEm || '') > String(loc.atualizadoEm || '');
      const diferente = JSON.stringify([nova.ingredientes, nova.preparacao, nova.tecnicasSugeridas, nova.aparelhosDetectados, nova.nomePrato])
        !== JSON.stringify([loc.ingredientes, loc.preparacao, loc.tecnicasSugeridas, loc.aparelhosDetectados, loc.nomePrato]);
      if (!loc.ingredientes?.length && nova.ingredientes.length) { fichas[i] = comTextosLongos({ ...loc, ...nova }, loc, nova); mudouF = true; }
      else if (!vazia && diferente && (maisRecente || !loc.atualizadoEm)) { fichas[i] = comTextosLongos({ ...loc, ...nova }, loc, nova); mudouF = true; }
      else {
        // O guião (e a ficha formatada) feito noutro aparelho tem de chegar
        // a este, mesmo que o resto da ficha seja igual (auditoria 5/out/2026:
        // os guiões só apareciam no navegador onde tinham sido feitos).
        const junta = comTextosLongos({ ...loc }, loc, nova);
        if (junta.textoGuia !== loc.textoGuia || junta.htmlCompleto !== loc.htmlCompleto || junta.planoAulaId !== loc.planoAulaId) {
          fichas[i] = junta; mudouF = true;
        }
      }
    }
  }
  if (mudouF) save(KEYS.fichas, fichas);
  // Aberturas: a mais antiga ganha; o fecho junta-se
  const sess = new Map(getSessoesAula().map(s => [s.planoAulaId, s]));
  for (const r of (json.sessoes || [])) {
    if (!r?.planoAulaId) continue;
    sess.set(r.planoAulaId, juntarSessao(sess.get(r.planoAulaId), r, turmaId));
  }
  save(KEY_SESSOES as any, [...sess.values()]);
  // Grupos
  juntarPorId(KEY_MEMBROS, (json.grupos?.membros || []) as MembroGrupo[]);
  juntarPorId(KEY_INFO_GRUPOS, (json.grupos?.info || []).map((g: any) => ({ ...g, validado: g.validado === true || g.validado === 'true' })) as InfoGrupo[]);
}

/** Esta abertura já está na aula que os telemóveis leem? (script v19; null = não sei) */
export async function aberturaNaAula(turmaId: string, planoAulaId: string): Promise<boolean | null> {
  if (aulaNaoSuportada) return null;
  const json: any = await lerDoSheetsJa(SHEETS_ECL_URL, { tipo: 'get_aula', turmaId }, 15000);
  if (!json?.ok || !Array.isArray(json.sessoes)) return null;
  return json.sessoes.some((s: any) => String(s.planoAulaId) === planoAulaId && s.abertaEm);
}

// ============================================================
// O que falta avaliar numa UC — aviso ao professor
// ============================================================
// Cada UC tem a sua prática, os seus conhecimentos e as suas atitudes.
// Muitas aulas usam fichas de outra área (eventos): o aluno é avaliado no
// que fez, mas a UC continua com coisas por avaliar. O professor tem de
// saber o que falta, sobretudo perto do fim da UC.
export interface CoberturaUC {
  ucId: string;
  diasParaFim: number | null;
  pratica: { total: number; avaliadas: number; faltam: string[] };
  conhecimentos: { total: number; avaliados: number; faltam: string[] };
  atitudes: { avaliadas: number };
}

export function coberturaDaUC(turmaId: string, ucId: string): CoberturaUC {
  const regs = getHistoricoAvaliacoes().filter(r => r.turmaId === turmaId && r.ucId === ucId && r.validadoPor === 'professor');
  const ids = new Set(regs.map(r => r.microcompetenciaId));
  // Prática: técnicas da UC no catálogo (pela equivalência UFCD → UC).
  const tecUC = microsPorUC(ucId).filter(m => m.categoria === 'TECNICAS');
  const tecFaltam = tecUC.filter(m => !ids.has(m.id));
  // Conhecimentos: os do referencial. Conta como avaliado se houve registo
  // KNW-R desse índice, ou um conhecimento do professor com o mesmo texto.
  const refs = conhecimentosDoReferencial(ucId);
  const textosAvaliados = new Set([...ids].filter(i => i.startsWith('KNW-')).map(i => nomeConhecimentoProf(i) || ''));
  const knwFaltam = refs.filter(t => !textosAvaliados.has(t));
  const mod: any = modulosDaTurma(turmaId).find((m: any) => m.id === ucId);
  const dias = mod?.dataFim ? Math.ceil((new Date(mod.dataFim + 'T00:00:00').getTime() - Date.now()) / 86400000) : null;
  return {
    ucId, diasParaFim: dias,
    pratica: { total: tecUC.length, avaliadas: tecUC.length - tecFaltam.length, faltam: tecFaltam.map(m => m.nome) },
    conhecimentos: { total: refs.length, avaliados: refs.length - knwFaltam.length, faltam: knwFaltam },
    atitudes: { avaliadas: [...ids].filter(i => categoriaDaNota(i) === 'ATI').length },
  };
}

// ============================================================
// Alunos externos e as suas recuperações (Rosa, out/2026)
// ============================================================
// Alunos de fora das turmas que vêm recuperar UC. Antes ficavam só no
// aparelho da coordenação (e podiam perder-se) e não podiam ter
// recuperações. Agora ficam no Sheets (folha ALUNOS_EXTERNOS, script v24) e
// em todos os aparelhos. As recuperações são as de sempre, na «turma»
// EXTERNOS: plano (UC, como recupera, o que tem de fazer, prazo), as
// entregas e o resultado. Tratam delas o professor da UC e a coordenação;
// o aluno não entra na aplicação. Sai uma pauta por UC.

export const TURMA_EXTERNOS = 'EXTERNOS';
const KEY_EXTERNOS = 'ecl_alunos_externos';

export interface AlunoExterno {
  id: string;
  nome: string;
  numeroProcesso?: string;
  /** Escola ou turma de origem. */
  turmaOrigem?: string;
  cursoOrigem?: string;
  anoLetivo?: string;
  contacto?: string;
  observacoes?: string;
  /** FCT (da lista antiga da coordenação). */
  localFCT?: string;
  supervisorFCT?: string;
  dataInicio?: string;
  dataTermo?: string;
  criadoEm: string;
  atualizadoEm?: string;
}

export interface EntregaRecuperacao { data: string; descricao: string; registadoPor?: string }

export function getAlunosExternos(): AlunoExterno[] {
  try { return JSON.parse(localStorage.getItem(KEY_EXTERNOS) || '[]'); } catch { return []; }
}
function gravarAlunosExternos(l: AlunoExterno[]): void {
  try { localStorage.setItem(KEY_EXTERNOS, JSON.stringify(l)); } catch { /* */ }
}
export function guardarAlunoExterno(a: AlunoExterno): void {
  const r = { ...a, atualizadoEm: new Date().toISOString() };
  const todos = getAlunosExternos().filter(x => x.id !== a.id);
  gravarAlunosExternos([...todos, r]);
  if (SHEETS_ECL_URL) enviar(SHEETS_ECL_URL, 'aluno_externo', { alunoExterno: r } as any);
}
export function eliminarAlunoExterno(id: string): void {
  gravarAlunosExternos(getAlunosExternos().filter(a => a.id !== id));
  if (SHEETS_ECL_URL) enviar(SHEETS_ECL_URL, 'eliminar_aluno_externo', { id } as any);
}

/** Traz do Sheets os alunos externos e as recuperações deles (e envia os que só cá estão). */
export async function sincronizarExternos(): Promise<boolean> {
  let ok = false;
  try {
    const j: any = await lerDoSheets(SHEETS_ECL_URL, { tipo: 'get_alunos_externos' });
    if (j?.ok && Array.isArray(j.dados)) {
      ok = true;
      const fora = new Set((j.eliminados || []).map(String));
      const m = new Map(getAlunosExternos().filter(a => !fora.has(a.id)).map(a => [a.id, a]));
      const doSheets = new Set<string>();
      for (const a of j.dados as AlunoExterno[]) {
        if (!a?.id || !a.nome) continue;
        doSheets.add(a.id);
        const loc = m.get(a.id);
        if (!loc || String(a.atualizadoEm || '') >= String(loc.atualizadoEm || '')) m.set(a.id, a);
      }
      gravarAlunosExternos([...m.values()]);
      // Os que estavam só neste aparelho (a lista antiga da coordenação) vão para o Sheets.
      [...m.values()].filter(a => !doSheets.has(a.id)).forEach(a => enviar(SHEETS_ECL_URL, 'aluno_externo', { alunoExterno: a } as any));
    }
    const jr: any = await lerDoSheets(SHEETS_RECUPERACAO_URL, { tipo: 'recuperacoes', turmaId: TURMA_EXTERNOS });
    if (jr?.ok && Array.isArray(jr.dados)) {
      const todas = getRecuperacoes();
      for (const r of jr.dados) {
        if (!r?.id) continue;
        const i = todas.findIndex(x => x.id === r.id);
        if (i < 0) todas.push(r);
        else if (String(r.atualizadoEm || '') > String(todas[i].atualizadoEm || '')) todas[i] = r;
      }
      save(KEYS.recuperacoes, todas);
    }
  } catch { /* fica o que está cá */ }
  return ok;
}

export function recuperacoesDeExternos(): RecuperacaoModulo[] {
  return getRecuperacoes().filter(r => r.turmaId === TURMA_EXTERNOS);
}

/** As UC que um aluno externo pode recuperar (todas as do cronograma, sem repetir). */
export function ucsParaExternos(): { id: string; nome: string; ano: number }[] {
  const m = new Map<string, { id: string; nome: string; ano: number }>();
  for (const x of CRONOGRAMA_2026_2027 as any[]) if (x?.id && !m.has(x.id)) m.set(x.id, { id: x.id, nome: x.nome || '', ano: x.turmaAno || 0 });
  return [...m.values()].sort((a, b) => a.ano - b.ano || a.id.localeCompare(b.id));
}

export function criarRecuperacaoExterno(aluno: AlunoExterno, uc: { id: string; nome: string }, modalidade: 'pratico' | 'teorico' | 'atividade' | 'outra',
  descricao: string, prazo: string, professor: string): RecuperacaoModulo {
  const agora = new Date().toISOString();
  const r: any = {
    id: novoId('rec_ext'), alunoId: aluno.id, nomeAluno: aluno.nome, turmaId: TURMA_EXTERNOS, ucId: uc.id, ucNome: uc.nome,
    tipoUC: 'tecnica', planosIds: [], competenciasIds: [], atitudesIds: [], responsabilidadesIds: [],
    estado: 'em_curso', quando: 'ja', modalidade, descricaoPlano: descricao,
    dataLimite: prazo ? new Date(prazo + 'T23:59:00').toISOString() : undefined,
    dataAtribuicao: agora, criadoEm: agora, atualizadoEm: agora, professorAvaliador: professor, entregas: [],
  };
  addOrUpdateRecuperacao(r);
  return r;
}

export function registarEntregaRecuperacao(id: string, descricao: string, data: string, quem?: string): void {
  const r: any = getRecuperacoes().find(x => x.id === id);
  if (!r) return;
  const e: EntregaRecuperacao = { data: data || new Date().toISOString().slice(0, 10), descricao, registadoPor: quem };
  addOrUpdateRecuperacao({ ...r, entregas: [...(r.entregas || []), e], atualizadoEm: new Date().toISOString() });
}

export function eliminarRecuperacaoExterno(id: string): void {
  const r = getRecuperacoes().find(x => x.id === id);
  if (!r) return;
  // Não se apaga: fica «anulada», para não voltar de outro aparelho.
  addOrUpdateRecuperacao({ ...(r as any), estado: 'anulada', atualizadoEm: new Date().toISOString() });
}

/** Atividade extra (evento, concurso…) com ficha técnica: os alunos avaliam
 *  as técnicas da ficha e elas contam na nota da atividade, como numa aula
 *  prática (técnicas, atitudes e farda). Antes a atividade ficava
 *  «atitudinal» e só as atitudes contavam (Rosa, out/2026). */
export function atividadeComTecnicas(plano: any): boolean {
  if (!plano?.tipoEvento || !(plano.fichasIds || []).length) return false;
  const t = plano.triagemAula?.tipo;
  return !t || t === 'pratico' || t === 'misto';
}

/** O tipo de aula que decide os pesos da nota deste plano. */
export function tipoParaANota(plano: any): string {
  return atividadeComTecnicas(plano) ? 'pratico' : (plano?.tipoPlanAula || 'pratico');
}

// Os planos por código, guardados um instante: o cálculo da nota de cada aula
// validada precisa do plano, e numa pauta são centenas de cálculos seguidos.
let planosRapidos: { em: number; m: Map<string, PlanoAula> } | null = null;
function planoPorIdRapido(id: string): PlanoAula | undefined {
  if (!planosRapidos || Date.now() - planosRapidos.em > 1000) planosRapidos = { em: Date.now(), m: new Map(getPlanosAula().map(p => [p.id, p])) };
  return planosRapidos.m.get(id);
}

/**
 * Aulas da UC que já aconteceram, foram abertas pelo professor (ou em que o
 * aluno marcou presença) e a que o aluno não respondeu: na nota da UC contam
 * 0 até o aluno se autoavaliar (Rosa, out/2026). Não entram as aulas a que
 * faltou (essas já contam 0 como falta), as arquivadas, as atividades extra
 * e as aulas em que o professor disse que os alunos de uma atividade só
 * respondem à atividade.
 */
export function planosSemAutoavaliacao(alunoId: string, turmaId: string, ucId?: string): PlanoAula[] {
  const hoje = new Date().toISOString().slice(0, 10);
  const sels = getSelecoes();
  const vals = getValidacoes();
  const presencas = getPresencas().filter(r => r.alunoId === alunoId);
  return getPlanosAula().filter(p => p.turmaId === turmaId && (!ucId || p.ucId === ucId)
    && !(p as any).tipoEvento && (p.estado === 'publicado' || p.estado === 'realizada')
    && aulaJaAconteceu(p, hoje))
    .filter(p => {
      const pres: any = presencas.find(r => r.planoAulaId === p.id);
      if (pres?.decisaoProfessor === 'falta_presenca') return false;
      const esteve = !!pres?.presente || ['sem_falta', 'falta_atraso', 'parcial'].includes(pres?.decisaoProfessor);
      if (!esteve && !getSessaoAula(p.id)?.abertaEm) return false;
      const partes = partesDoPlanoParaOAluno(p, alunoId);
      if (!partes.tecnicas && !partes.conhecimentos && !partes.atitudes) return false;
      if (ultimaResposta(alunoId, p.id, sels)) return false;
      return !vals.some((v: any) => v.alunoId === alunoId && v.planoAulaId === p.id);
    });
}

/**
 * A aula foi aberta num dia posterior ao do plano (por exemplo, para os
 * alunos se autoavaliarem depois). Nessas aulas, a aplicação não marca
 * atrasos nem faltas sozinha: só conta o que o professor declarou nas
 * presenças (Rosa, out/2026).
 */
export function aberturaTardia(planoAulaId: string): boolean {
  const s = getSessaoAula(planoAulaId);
  const p: any = planoPorIdRapido(planoAulaId);
  if (!s?.abertaEm || !p?.data) return false;
  const diaAbertura = new Date(s.abertaEm).toLocaleDateString('sv-SE', { timeZone: 'Europe/Lisbon' });
  return diaAbertura > String(p.data).slice(0, 10);
}

// ── Email da escola do aluno (Rosa, out/2026) ─────────────────
// Pedido logo na entrada, obrigatório: serve para os avisos de
// autoavaliação em falta (o script do Sheets envia-os às 18h).
export const RE_EMAIL_ESCOLA = /^[a-z0-9._%+-]+@eclisboa\.net$/i;
const chaveEmail = (alunoId: string) => 'ecl_email_aluno_' + alunoId;

export function emailDoAluno(alunoId: string): string {
  try { return localStorage.getItem(chaveEmail(alunoId)) || ''; } catch { return ''; }
}

export function registarEmailDoAluno(aluno: Aluno, email: string): boolean {
  const e = email.trim().toLowerCase();
  if (!RE_EMAIL_ESCOLA.test(e)) return false;
  try { localStorage.setItem(chaveEmail(aluno.id), e); } catch { /* sem espaço: volta a pedir */ }
  enviar(SHEETS_ECL_URL, 'email_aluno', { alunoId: aluno.id, turmaId: aluno.turmaId, numero: aluno.numero, nome: aluno.nome || '',
    email: e, atualizadoEm: new Date().toISOString() } as any);
  return true;
}

/**
 * Este registo de presença conta como atraso? (Rosa, out/2026)
 * - o professor declarou «falta de atraso»: conta;
 * - o professor declarou «sem falta»: não conta;
 * - sem decisão: conta a entrada depois da tolerância, exceto nas aulas
 *   abertas depois do dia do plano (aí só conta o que o professor registou)
 *   e nas aulas em que o professor disse, ao abrir, que os atrasos não contam.
 */
export function atrasoConta(pres: any, planoAulaId: string): boolean {
  if (!pres) return false;
  if (pres.decisaoProfessor === 'falta_atraso') return true;
  if (pres.decisaoProfessor) return false;
  if (!pres.atrasado) return false;
  if (aberturaTardia(planoAulaId)) return false;
  return atrasosContamNaAula(planoAulaId);
}

/** Tolerância que quer dizer «nesta aula os atrasos não contam» (24 horas). */
export const SEM_ATRASOS_MIN = 1440;
export function atrasosContamNaAula(planoAulaId: string): boolean {
  const s = getSessaoAula(planoAulaId);
  return !s || (Number(s.toleranciaMin) || 0) < SEM_ATRASOS_MIN;
}

// ============================================================
// Para a eSchooling (Rosa, out/2026)
// ============================================================
// A eSchooling não aceita importar dados. A aplicação junta, aula a aula,
// o sumário e as faltas já registados aqui, e a extensão Claude no Chrome
// passa-os para a eSchooling (o professor confirma antes de gravar).
// As faltas seguem as mesmas regras da assiduidade (calcularBonusAssiduidadeUC).
export interface AlunoESch { id?: string; alunoId: string; numero: number; nome: string; minutos?: number; faltaPorAtraso?: boolean; itens?: string; descricao?: string }
/** Ocorrência disciplinar numa aula (Rosa, out/2026): na eSchooling vai para
 *  «Comportamento», com a explicação do que aconteceu. */
export interface OcorrenciaDisciplinar {
  id: string; planoAulaId: string; turmaId: string; alunoId: string; tipo?: string; nota?: string; descricao: string;
  registadaEm: string; registadaPor: string; atualizadoEm: string; eliminado?: boolean;
}
export interface AulaParaESchooling {
  plano: PlanoAula;
  sumario: string;
  faltas: AlunoESch[];
  atrasos: AlunoESch[];
  /** «Material» na eSchooling: a farda incompleta (com os itens em falta). */
  material: AlunoESch[];
  /** «Comportamento» na eSchooling: as ocorrências disciplinares, com a explicação. */
  ocorrencias: AlunoESch[];
  /** As presenças desta aula ainda não foram tiradas (aula não aberta). */
  semPresencas: boolean;
}
export function faltasDaAulaParaESchooling(p: PlanoAula): Pick<AulaParaESchooling, 'faltas' | 'atrasos' | 'material' | 'ocorrencias' | 'semPresencas'> {
  const alunos = getAlunos().filter(a => a.turmaId === p.turmaId && a.ativo !== false).sort((a, b) => a.numero - b.numero);
  const pres = getPresencas().filter(x => x.planoAulaId === p.id);
  const aberta = !!getSessaoAula(p.id)?.abertaEm;
  const faltas: AlunoESch[] = [], atrasos: AlunoESch[] = [], material: AlunoESch[] = [];
  const exigeFarda = (p as any).exigeFarda !== false && (p as any).tipoPlanAula !== 'atitudinal' && (p as any).tipoPlanAula !== 'teorico';
  let decididas = 0;
  for (const a of alunos) {
    const quem = { alunoId: a.id, numero: a.numero, nome: a.nome || `Aluno ${a.numero}` };
    // O aluno fantasma nunca vem: na eSchooling tem sempre falta.
    if (ehFantasma(a.id)) { faltas.push(quem); continue; }
    const r: any = pres.find(x => x.alunoId === a.id);
    const decisao = r?.decisaoProfessor;
    if (decisao) decididas++;
    if (decisao === 'falta_presenca') { faltas.push(quem); continue; }
    const minutos = Number(r?.atrasadoMins) || undefined;
    if (decisao === 'falta_atraso') atrasos.push({ ...quem, minutos, faltaPorAtraso: true });
    else {
      if (!aberta || (aberturaTardia(p.id) && !decisao)) continue;
      if (!r || r.presente === false) { faltas.push(quem); continue; }
      if (atrasoConta(r, p.id)) atrasos.push({ ...quem, minutos });
    }
    // O aluno atrasado também pode vir sem a farda completa: regista-se as duas.
    if (!r) continue;
    // Falta de material: a farda incompleta, com os itens que faltaram.
    if (exigeFarda && r.fardamentoOk === false) {
      const obs = String(r.observacao || '').replace(MARCA_MAOS, '');
      material.push({ ...quem, itens: obs.includes('em falta:') ? obs.split('em falta:')[1].trim() : 'farda incompleta' });
    }
  }
  const ocorrencias: AlunoESch[] = ocorrenciasDaAula(p.id).map(o => {
    const a = alunos.find(x => x.id === o.alunoId);
    return { id: o.id, alunoId: o.alunoId, numero: a?.numero || 0, nome: a?.nome || o.alunoId, descricao: o.descricao };
  });
  return { faltas, atrasos, material, ocorrencias, semPresencas: !aberta && decididas === 0 };
}
/** As aulas já dadas deste professor que ainda não passaram para a eSchooling. */
export function aulasParaESchooling(nomeProfessor: string, incluirPassadas = false): AulaParaESchooling[] {
  // O sumário junta-se no ecrã (sumarioDoPlano), com as fichas da aula.
  return planosParaESchooling(nomeProfessor, incluirPassadas).map(p => ({ plano: p, sumario: '', ...faltasDaAulaParaESchooling(p) }));
}
/** Só os planos (leve: serve para o aviso, que se recalcula muitas vezes). */
export function planosParaESchooling(nomeProfessor: string, incluirPassadas = false): PlanoAula[] {
  const agora = new Date();
  const hoje = agora.toISOString().slice(0, 10);
  return getPlanosAula()
    .filter((p: any) => p.estado !== 'arquivado' && p.estado !== 'rascunho' && planoDoProfessor(p, nomeProfessor)
      && !eventoForaDoHorario(p) && !planoNumDiaSemAulas(p) && String(p.data || '').slice(0, 10) <= hoje
      && (incluirPassadas || !p.eschoolingEm))
    .filter((p: any) => String(p.data).slice(0, 10) < hoje || !p.horaFim || p.horaFim <= agora.toTimeString().slice(0, 5))
    .sort((a, b) => `${a.data} ${a.horaInicio || ''}`.localeCompare(`${b.data} ${b.horaInicio || ''}`));
}
// ── Ocorrências disciplinares ──────────────────────────────────
// O professor escolhe o tipo e escreve uma nota curta; a aplicação monta a
// explicação formal que vai para «Comportamento» na eSchooling.
export const TIPOS_OCORRENCIA: { id: string; nome: string; frase: string }[] = [
  { id: 'telemovel', nome: 'Uso do telemóvel', frase: 'utilizou o telemóvel durante a aula, sem autorização' },
  { id: 'linguagem', nome: 'Linguagem imprópria', frase: 'utilizou linguagem imprópria' },
  { id: 'desrespeito_prof', nome: 'Falta de respeito ao professor', frase: 'teve uma atitude de falta de respeito para com o professor' },
  { id: 'desrespeito_colegas', nome: 'Falta de respeito aos colegas', frase: 'teve uma atitude de falta de respeito para com os colegas' },
  { id: 'recusa', nome: 'Recusa em realizar as tarefas', frase: 'recusou-se a realizar as tarefas propostas' },
  { id: 'perturbacao', nome: 'Perturbação da aula', frase: 'perturbou o normal funcionamento da aula' },
  { id: 'saida', nome: 'Saída sem autorização', frase: 'saiu da sala/cozinha sem autorização' },
  { id: 'higiene', nome: 'Incumprimento das regras de higiene e segurança', frase: 'não cumpriu as regras de higiene e segurança alimentar da cozinha' },
  { id: 'equipamento', nome: 'Uso indevido de equipamento', frase: 'fez uso indevido de equipamentos ou utensílios da escola' },
  { id: 'outra', nome: 'Outra', frase: '' },
];
export function textoDaOcorrencia(tipo: string, nota: string, aluno: { nome?: string; numero?: number }, p: any): string {
  const t = TIPOS_OCORRENCIA.find(x => x.id === tipo);
  const quando = `${String(p?.data || '').slice(0, 10).split('-').reverse().join('/')}${p?.horaInicio ? `, ${p.horaInicio}–${p.horaFim || ''}` : ''}`;
  const base = t?.frase ? `Na aula de ${quando}${p?.ucId ? ` (${p.ucId})` : ''}, o(a) aluno(a) ${aluno.nome || ''} (n.º ${aluno.numero || ''}) ${t.frase}.` : '';
  const extra = String(nota || '').trim().replace(/([^.!?])$/, '$1.');
  return [base, extra].filter(Boolean).join(' ');
}
/** Regista uma ocorrência disciplinar numa aula. Fica no plano (vai para todos os aparelhos). */
// Ficam num registo à parte, só dos professores, e não no plano da aula: o
// plano vai para o Sheets e para os telemóveis dos alunos, e o plano já tem
// coisas que chegue (Rosa, out/2026). Vão para a base por turma, para se
// poderem registar no iPad e passar à eSchooling noutro computador.
const KEY_OCORRENCIAS = 'ecl_ocorrencias';
export function ocorrenciasDaAula(planoId: string): OcorrenciaDisciplinar[] {
  return load<OcorrenciaDisciplinar>(KEY_OCORRENCIAS).filter(o => o.planoAulaId === planoId && !o.eliminado)
    .sort((a, b) => String(a.registadaEm).localeCompare(String(b.registadaEm)));
}
function guardarOcorrencia(o: OcorrenciaDisciplinar): void {
  save(KEY_OCORRENCIAS, [...load<OcorrenciaDisciplinar>(KEY_OCORRENCIAS).filter(x => x.id !== o.id), o]);
  gravarNaBase('ocorrencia', o as any);
}
export function registarOcorrenciaDisciplinar(planoId: string, alunoId: string, tipo: string, nota: string, quem: string): void {
  const p: any = getPlanosAula().find(x => x.id === planoId);
  const a = getAlunos().find(x => x.id === alunoId);
  if (!p || !a || (!tipo && !nota.trim()) || (tipo === 'outra' && !nota.trim())) return;
  const agora = new Date().toISOString();
  guardarOcorrencia({ id: novoId('ocorr'), planoAulaId: p.id, turmaId: p.turmaId, alunoId, tipo, nota: nota.trim(),
    descricao: textoDaOcorrencia(tipo, nota, a, p), registadaEm: agora, registadaPor: quem, atualizadoEm: agora });
}
export function apagarOcorrenciaDisciplinar(ocorrenciaId: string): void {
  const o = load<OcorrenciaDisciplinar>(KEY_OCORRENCIAS).find(x => x.id === ocorrenciaId);
  if (o) guardarOcorrencia({ ...o, eliminado: true, atualizadoEm: new Date().toISOString() });
}
function juntarOcorrencias(lista: any[]): void {
  const m = new Map(load<OcorrenciaDisciplinar>(KEY_OCORRENCIAS).map(x => [x.id, x]));
  for (const x of lista) {
    if (!x?.id || !x.planoAulaId) continue;
    const velho = m.get(x.id);
    if (!velho || String(x.atualizadoEm || '') >= String(velho.atualizadoEm || '')) m.set(x.id, { ...x, eliminado: x.eliminado === true || x.eliminado === 'true' });
  }
  save(KEY_OCORRENCIAS, [...m.values()]);
}
/** Todas as turmas onde este professor tem aulas (para a página juntar tudo). */
export function turmasDoProfessor(nomeProfessor: string): string[] {
  return [...new Set(getPlanosAula().filter(p => planoDoProfessor(p, nomeProfessor)).map(p => p.turmaId).filter(Boolean))];
}
export function marcarPassadoAESchooling(planoIds: string[], passado = true): void {
  const em = new Date().toISOString();
  getPlanosAula().filter(p => planoIds.includes(p.id))
    .forEach(p => addOrUpdatePlanoAula({ ...(p as any), eschoolingEm: passado ? em : undefined, atualizadoEm: em }));
}

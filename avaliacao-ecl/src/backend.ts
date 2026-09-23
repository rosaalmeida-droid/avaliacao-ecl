// ============================================================
// Backend ECL — localStorage (primário) + Google Sheets (persistência)
// localStorage: acesso imediato e offline
// Sheets: backup permanente — nunca perde dados ao mudar browser
// ============================================================

import { ucsEquivalentes, modulosDaTurma } from './cronograma';
import {
  Comanda, SelecaoAluno, Validacao, Atividade,
  Turma, Aluno, PlanoAula, FichaProducao,
  DistribuicaoFicha, ChecklistAlunoFicha, RequisicaoAula, RecuperacaoModulo, Evidencia,
  Aviso, MateriaPrimaCustom, EntradaManual
, SessaoAula, TOLERANCIA_PADRAO_MIN , CampoKF, PassoChecklistFicha, calcularNotaPlano, BONUS_PARTICIPACAO } from './types';
import { microsPorUC, ATITUDES, OBRIGATORIAS, encontrarMicro } from './compatECL';
import { classificarGrupoCompetencia, gerarPromptPlanoIndividual, gerarPromptAnalisePreliminar } from './matrizEvidencias';
import { REFERENCIAL_811RA144 } from './referencial811RA144';
import { estadoDosPrecos } from './materiasPrimasBase';

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

function deduplicarPorId<T extends { id: string }>(itens: T[]): T[] {
  const porId = new Map<string, T>();
  itens.forEach(item => { if (item?.id) porId.set(item.id, item); });
  return [...porId.values()];
}

function idsEliminados(valor: unknown): string[] {
  const itens = Array.isArray(valor) ? valor
    : typeof valor === 'string' ? valor.split(/[;,\n]/) : [];
  return itens.map((item: any) => String(
    typeof item === 'string' || typeof item === 'number' ? item
      : item?.id || item?.planoId || item?.fichaId || item?.requisicaoId || ''
  ).trim()).filter(Boolean);
}

async function sincronizarTombstones(): Promise<void> {
  const resposta = await lerDoSheets(SHEETS_ECL_URL || SHEETS_PLANOS_URL, { tipo: 'get_eliminados' });
  if (!resposta?.ok) return;

  const dados = resposta.eliminados ?? resposta.dados ?? resposta;
  const listas: Record<string, string[]> = { planos: [], fichas: [], requisicoes: [] };
  if (Array.isArray(dados)) {
    dados.forEach((item: any) => {
      const tipo = String(item?.tipo || item?.tabela || item?.entidade || '').toLowerCase();
      const id = String(item?.id || item?.planoId || item?.fichaId || item?.requisicaoId || '').trim();
      if (!id) return;
      if (tipo.includes('plano')) listas.planos.push(id);
      else if (tipo.includes('ficha')) listas.fichas.push(id);
      else if (tipo.includes('requis')) listas.requisicoes.push(id);
    });
  }
  const fontes: Record<string, string[]> = {
    planos: ['planos', 'eliminadosPlanos', 'planosEliminados', 'idsPlanos', 'planoIds'],
    fichas: ['fichas', 'eliminadosFichas', 'fichasEliminadas', 'idsFichas', 'fichaIds'],
    requisicoes: ['requisicoes', 'eliminadosRequisicoes', 'requisicoesEliminadas', 'idsRequisicoes', 'requisicaoIds'],
  };
  const chaves: Record<string, string> = {
    planos: KEYS.eliminadosPlanos,
    fichas: KEYS.eliminadosFichas,
    requisicoes: KEYS.eliminadosRequisicoes,
  };
  for (const grupo of Object.keys(fontes)) {
    for (const nome of fontes[grupo]) {
      listas[grupo].push(...idsEliminados((dados as any)?.[nome] ?? (resposta as any)?.[nome]));
    }
    save(chaves[grupo], [...new Set([...load<string>(chaves[grupo]), ...listas[grupo]])]);
  }

  // A Requisição fica deliberadamente fora desta reconciliação local.
  const planosRemovidos = new Set(load<string>(KEYS.eliminadosPlanos));
  const fichasRemovidas = new Set(load<string>(KEYS.eliminadosFichas));
  save(KEYS.planos, getPlanosAula().filter(p => !planosRemovidos.has(p.id)));
  save(KEYS.fichas, getFichasProducao().filter(f => !fichasRemovidas.has(f.id)));
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
    // Importar eliminações antes dos registos: evita que outro dispositivo
    // volte a apresentar planos ou fichas removidos.
    await sincronizarTombstones().catch(() => {});

    // Sessões e líderes primeiro: são o que o aluno precisa para saber
    // se pode entrar na aula. Falham em silêncio se o script ainda não
    // souber responder a estes tipos.
    await sincronizarSessoes(turmaId).catch(() => {});
    await sincronizarLideresKF(turmaId).catch(() => {});

    // Carregar planos do Sheets de Planos
    if (SHEETS_PLANOS_URL) {
      const jsonPlanos = await lerDoSheets(SHEETS_PLANOS_URL, { tipo: 'get_planos', turmaId });
      marcarLeituraPlanos(!!jsonPlanos?.ok);
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
        save(KEYS.planos, deduplicarPorId(merged));
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
        save(KEYS.fichas, deduplicarPorId(merged));
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

    // ── Requisições e orçamentos ─────────────────────────────
    //
    // Iam para o Sheets e nunca voltavam. O professor fazia a requisição
    // num computador e noutro não a via — parecia que se tinha perdido.
    // É a única coisa que era enviada sem leitura de volta.
    if (SHEETS_PLANOS_URL) {
      try {
        const jsonReq = await lerDoSheets(SHEETS_PLANOS_URL, { tipo: 'get_requisicoes', turmaId });
        const doSheets = jsonReq?.requisicoes || jsonReq?.dados || [];
        if (Array.isArray(doSheets) && doSheets.length > 0) {
          const locais = getRequisicoes();
          const merged = [...locais];
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
          save(KEYS.requisicoes, merged);
        }
      } catch { /* sem rede, fica o que está */ }
    }

    // ── Sincronizar Avaliações (historico_avaliacoes) ──────────────────
    if (SHEETS_HISTORICO_URL) {
      const jsonAval = await lerDoSheets(SHEETS_HISTORICO_URL, { tipo: 'get_avaliacoes', turmaId });
      if (jsonAval?.ok && jsonAval.dados?.length > 0) {
        // Os +1 da transição de referencial vão para o registo deles — se
        // entrassem aqui, contavam para as notas das UCs e para a pauta.
        const transicao = jsonAval.dados.filter((r: any) => r.validadoPor === 'transicao');
        const normais = jsonAval.dados.filter((r: any) => r.validadoPor !== 'transicao');

        const locais = deduplicarPorId(getHistoricoAvaliacoes());
        const porId = new Map(locais.map((r: RegistoAvaliacao) => [r.id, r]));
        for (const registo of normais as RegistoAvaliacao[]) {
          const atual = porId.get(registo.id);
          if (!atual || (registo.data || '') > (atual.data || '')) porId.set(registo.id, registo);
        }
        save(KEY_HIST, [...porId.values()]);

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

      // ── Sincronizar Validações ──────────────────────────────────────
      const jsonVal = await lerDoSheets(SHEETS_HISTORICO_URL, { tipo: 'get_validacoes', turmaId });
      if (jsonVal?.ok && jsonVal.dados?.length > 0) {
        const locais = deduplicarPorId(getValidacoes());
        const merged = [...locais];
        for (const v of jsonVal.dados) {
          const idx = merged.findIndex((x: Validacao) => x.id === v.id);
          if (idx < 0) merged.push(v);
          else if ((v.validadoEm || '') > (merged[idx].validadoEm || '')) merged[idx] = v;
        }
        save(KEYS.validacoes, deduplicarPorId(merged));
      }

      // ── Sincronizar Presenças ───────────────────────────────────────
      const jsonPres = await lerDoSheets(SHEETS_HISTORICO_URL, { tipo: 'get_presencas', turmaId });
      if (jsonPres?.ok && jsonPres.dados?.length > 0) {
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
        for (const s of jsonPres.dados) {
          if (!s?.alunoId || !s?.planoAulaId) continue;
          const k = s.alunoId + '|' + s.planoAulaId;
          const local = porChave.get(k);
          if (!local) {
            porChave.set(k, { ...s, id: `presenca_${s.alunoId}_${s.planoAulaId}_sheets` });
          } else if (s.decisaoProfessor && s.decisaoProfessor !== local.decisaoProfessor) {
            porChave.set(k, { ...local, decisaoProfessor: s.decisaoProfessor,
              presente: s.decisaoProfessor === 'falta_presenca' ? false
                : s.decisaoProfessor === 'sem_falta' ? true : local.presente });
          }
        }
        save(KEYS.presencas, [...porChave.values()]);
      }
    }

    // ── Sincronizar Alunos ──────────────────────────────────────────────
    if (SHEETS_ALUNOS_URL) {
      const jsonAlunos = await lerDoSheets(SHEETS_ALUNOS_URL, { tipo: 'get_alunos', turmaId });
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
      const jsonSel = await lerDoSheets(SHEETS_HISTORICO_URL, { tipo: 'get_selecoes', turmaId });
      if (jsonSel?.ok && jsonSel.dados?.length > 0) {
        const locais = deduplicarPorId(getSelecoes());
        const merged = [...locais];
        for (const s of jsonSel.dados) {
          const idx = merged.findIndex((x: SelecaoAluno) => x.id === s.id);
          if (idx < 0) merged.push(s);
          else if ((s.criadaEm || '') > (merged[idx].criadaEm || '')) merged[idx] = s;
        }
        save(KEYS.selecoes, deduplicarPorId(merged));
      }
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

    // ── 1º ACR — Cozinha e Restauração (quinta, 14h-17h) ────────
    { id: '1º ACR-1', turmaId: '1º ACR', numero: 1, ano: 1 as const, nome: 'Kayllany Souza de Morais', pin: '6419', ativo: true, pinCriadoEm: agora },
    { id: '1º ACR-2', turmaId: '1º ACR', numero: 2, ano: 1 as const, nome: 'Letícia Filipa Correia Vicente', pin: '5244', ativo: true, pinCriadoEm: agora },
    { id: '1º ACR-3', turmaId: '1º ACR', numero: 3, ano: 1 as const, nome: 'Luana Da Costa Oliveira', pin: '1823', ativo: true, pinCriadoEm: agora },
    { id: '1º ACR-99', turmaId: '1º ACR', numero: 99, ano: 1 as const, nome: 'TESTE — aluno de ensaio', pin: '9999', ativo: true, pinCriadoEm: agora },
    // Um aluno de teste por turma, para o professor experimentar sem
    // mexer no percurso de ninguém. PIN 9999.
    { id: '1º BCR-99', turmaId: '1º BCR', numero: 99, ano: 1 as const, nome: 'TESTE — aluno de ensaio', pin: '9999', ativo: true, pinCriadoEm: agora },
    { id: '2º ACP-99', turmaId: '2º ACP', numero: 99, ano: 2 as const, nome: 'TESTE — aluno de ensaio', pin: '9999', ativo: true, pinCriadoEm: agora },
    { id: '3º ACP-99', turmaId: '3º ACP', numero: 99, ano: 3 as const, nome: 'TESTE — aluno de ensaio', pin: '9999', ativo: true, pinCriadoEm: agora },

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
  alunos.forEach((a: Aluno) => enviar(SHEETS_ALUNOS_URL, 'upsert_aluno', { aluno: a }));
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
      mensagem: 'Bloqueado: é obrigatório descarregar uma cópia de segurança primeiro (há menos de 10 minutos). Descarrega o backup e volta a tentar.',
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
      mensagem: 'Bloqueado: é obrigatório descarregar uma cópia de segurança primeiro (há menos de 10 minutos). Descarrega o backup e volta a tentar.',
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
  if (!aluno.pin) {
    return { ok: false, erro: 'Ainda não tens PIN. Pede-o ao professor.' };
  }
  if (aluno.pin !== pinIntroduzido) return { ok: false, erro: 'PIN incorreto.' };

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
// de browser, o telemóvel parece outro — e é recusado. O professor liberta
// (PIN temporário ou "Libertar telemóvel"), e a próxima entrada volta a ligar.

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
      lerDoSheets(SHEETS_HISTORICO_URL, { tipo: 'get_telemoveis', turmaId }),
      new Promise(res => setTimeout(() => res(null), 5000)),
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
  return {
    ok: false,
    erro: 'Este PIN está ligado a outro telemóvel. Se mudaste de telemóvel ou limpaste '
      + 'o browser, pede ao professor para libertar o teu PIN.',
  };
}

/** O professor liberta o PIN — a próxima entrada volta a ligar. */
export function libertarTelemovel(alunoId: string, turmaId: string): void {
  const l = ligacoesLocais();
  delete l[alunoId];
  guardarLigacoes(l);
  enviar(SHEETS_HISTORICO_URL, 'libertar_telemovel', { alunoId, turmaId });
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
export function getPlanosAula(): PlanoAula[] { return load<PlanoAula>(KEYS.planos); }

export function getPlanosAulaPorTurma(turmaId: string, incluirArquivados = false): PlanoAula[] {
  return getPlanosAula()
    .filter(p => p.turmaId === turmaId)
    .filter(p => incluirArquivados || p.estado !== 'arquivado')
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''));
}

export function addOrUpdatePlanoAula(p: PlanoAula): void {
  // O registo fica no fim da função, depois de gravar e enviar.
  const all = getPlanosAula();
  const idx = all.findIndex(x => x.id === p.id);
  if (idx >= 0) all[idx] = p; else all.push(p);
  save(KEYS.planos, all);
  enviar(SHEETS_PLANOS_URL, 'plano', { plano: p });
  registarEnvio(p.id, 'plano', p.titulo || `Plano de ${p.data}`);
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

export function getSelecoes(): SelecaoAluno[] { return semPlanosEliminados(load<SelecaoAluno>(KEYS.selecoes)); }
export function getValidacoes(): Validacao[] { return semPlanosEliminados(load<Validacao>(KEYS.validacoes)); }
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
  const all = deduplicarPorId(getSelecoes());
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
  registarEnvio(s.id, 'selecao', `Autoavaliação de ${s.alunoId}`);
}

export function addOrUpdateValidacao(v: Validacao): void {
  const all = deduplicarPorId(getValidacoes());
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
    : Math.min(20, Math.round(notaMediaVal * 4));

  const aluno_val = getAlunos().find(a => a.id === v.alunoId);
  enviar(SHEETS_HISTORICO_URL, 'validacao', {
    ...(v as unknown as Record<string, unknown>),
    nomeAluno: aluno_val?.nome || ('Aluno ' + (aluno_val?.numero || 0)),
    turma: v.turmaId,
    nota_media_1_5: Math.round((nota20Final / 4) * 10) / 10,
    nota_media_0_20: nota20Final,
  });
  registarEnvio(v.id, 'validacao', `Validação de ${v.alunoId}`);
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
  const all = deduplicarPorId(getHistoricoAvaliacoes());
  const idx = all.findIndex(item => item.id === r.id);
  if (idx >= 0) all[idx] = r; else all.push(r);
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
  registarEnvio(r.id, 'avaliacao', `Avaliação de ${r.alunoId}`);
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
  return semPlanosEliminados(load<RegistoPresenca>(KEYS.presencas));
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
    const registo: any = presencas.find(r => r.planoAulaId === plano.id);
    if (registo?.decisaoProfessor === 'sem_falta') return false;
    if (registo?.decisaoProfessor === 'falta_presenca') return true;
    // Aula que o professor nunca abriu não conta contra o aluno: sem a
    // aula aberta ele nem conseguia marcar presença. A responsabilidade é
    // do professor — só uma decisão explícita dele conta como falta.
    if ((plano as any).contaAssiduidade === false) return false;
    if (!getSessaoAula(plano.id)?.abertaEm) return false;
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
    // Hoje conta a partir do momento em que o professor abre a aula.
    const s = getSessaoAula(p.id);
    return !!(s?.fechadaEm || s?.abertaEm);
  }
  return false;
}

/** Horas de um plano. Um dia inteiro (08:30–17:30) desconta a hora de almoço. */
function horasDoPlano(p: PlanoAula): number {
  const min = (h?: string) => {
    if (!h) return NaN;
    const s = h.includes('T') ? new Date(h).toTimeString().slice(0, 5) : h.slice(0, 5);
    const [hh, mm] = s.split(':').map(Number);
    return hh * 60 + mm;
  };
  const ini = min(p.horaInicio), fim = min(p.horaFim);
  if (isNaN(ini) || isNaN(fim) || fim <= ini) return 0;
  let m = fim - ini;
  if (ini <= 13 * 60 && fim >= 14 * 60) m -= 60;   // almoço
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
  /** 0–100 */
  presenca: number;
  terminou: boolean;
  nota20: number | null;
}

export function situacaoRecuperacaoUC(alunoId: string, turmaId: string, ucId: string): SituacaoRecuperacao {
  const hoje = new Date().toISOString().slice(0, 10);
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

  const presenca = horasPrevistas > 0
    ? Math.max(0, Math.round((1 - horasFaltadas / horasPrevistas) * 100))
    : 100;

  const terminou = !!mod?.dataFim && mod.dataFim < hoje;

  // Nota final da UC — a mesma do ecrã "Notas da UC" (notaFinalUC).
  const nota20: number | null = notaFinalUC(alunoId, turmaId, ucId).final;

  // 1. Faltas acima de 10% das horas do módulo.
  if (horasPrevistas > 0 && horasFaltadas > horasPrevistas * 0.10) {
    return { precisa: true, motivo: 'faltas', horasPrevistas, horasFaltadas, presenca, terminou, nota20 };
  }
  // 2. Módulo terminado sem positiva. Sem nenhuma avaliação não se decide
  //    por nota — seria pôr em recuperação quem ainda não foi avaliado.
  if (terminou && nota20 !== null && nota20 < 10) {
    return { precisa: true, motivo: 'negativa', horasPrevistas, horasFaltadas, presenca, terminou, nota20 };
  }
  return { precisa: false, motivo: null, horasPrevistas, horasFaltadas, presenca, terminou, nota20 };
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
    // A autoavaliação alimenta, mas não valida: uma competência só entra
    // no perfil depois de o professor a confirmar. Sem isto, o aluno
    // aparecia com técnicas que ele próprio se deu e que nunca foram
    // vistas — e o perfil deixava de significar nada.
    const validada = info.validadoPor === 'professor'
      || info.validadoPor === 'recuperacao';
    if (!validada) return;

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
  // Só entram no perfil as competências com verbo de ação. Um resultado
  // esperado ("produtos com cor viva") não serve como ponto forte: o aluno
  // não consegue reconhecer-se nele nem sabe o que treinar.
  const comVerbo = todos.filter(i => !!nomeComVerbo(i.nome, i.competenciaId));
  const pontosFortes = comVerbo.filter(i => i.nivel >= 3).map(i => i.nome);
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
    if (!pres || pres.presente === false) { faltas++; return; }
    if (decisao === 'falta_atraso' || (pres.atrasado && decisao !== 'sem_falta')) atrasos++;
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
  if (id.startsWith('OBR_')) {
    const o = OBRIGATORIAS.find(x => x.id === id);
    return o?.nome || id;
  }
  if (id.startsWith('ATT_') || id.startsWith('ATI-')) {
    const a = ATITUDES.find(x => x.id === id);
    return a?.nome || id;
  }
  const m = encontrarMicro(id);
  if (!m) return id;

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
    id: idExistente || novoId('mp_custom'),
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

  enviar(SHEETS_HISTORICO_URL, 'sessao', {
    planoAulaId, turmaId,
    abertaEm: nova.abertaEm,
    abertaPor: professor,
    toleranciaMin,
  });
  return nova;
}

/**
 * Lê as sessões do Sheets e junta-as ao que está no aparelho.
 * O aluno chama isto ao abrir o plano, e vai repetindo enquanto espera.
 */
export async function sincronizarSessoes(turmaId: string): Promise<void> {
  const json = await lerDoSheets(SHEETS_HISTORICO_URL, { tipo: 'get_sessoes', turmaId });
  if (!json?.sessoes?.length) return;

  const locais = getSessoesAula();
  const porId = new Map(locais.map(s => [s.planoAulaId, s]));

  for (const r of json.sessoes) {
    const existente = porId.get(r.planoAulaId);
    // A abertura mais antiga ganha: é a que iniciou a contagem.
    if (!existente?.abertaEm || (r.abertaEm && r.abertaEm < existente.abertaEm)) {
      porId.set(r.planoAulaId, {
        planoAulaId: r.planoAulaId,
        turmaId: r.turmaId || turmaId,
        abertaEm: r.abertaEm,
        abertaPor: r.abertaPor,
        toleranciaMin: Number(r.toleranciaMin) || TOLERANCIA_PADRAO_MIN,
        fechadaEm: r.fechadaEm || existente?.fechadaEm,
      });
    }
  }
  save(KEY_SESSOES as any, [...porId.values()]);
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
}

/** Estado da janela de tolerância, num dado momento. */
export function estadoTolerancia(planoAulaId: string, agora = new Date()): EstadoTolerancia {
  const s = getSessaoAula(planoAulaId);
  if (!s?.abertaEm) {
    return { aberta: false, minutosRestantes: 0, foraDeTempo: false };
  }
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

export type DecisaoFalta = 'sem_falta' | 'falta_atraso' | 'falta_presenca';

export const LABEL_DECISAO: Record<DecisaoFalta, string> = {
  sem_falta:      'Sem falta',
  falta_atraso:   'Falta de atraso',
  falta_presenca: 'Falta de presença',
};

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
  alunoId: string, planoAulaId: string, decisao: DecisaoFalta, professor: string, nota?: string
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
    // Falta de presença anula a presença; "sem falta" conta como presente.
    presente: decisao === 'falta_presenca' ? false
      : decisao === 'sem_falta' ? true : reg.presente,
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
    data: reg.data || '', decisaoProfessor: decisao, decididoPor: professor,
    observacao: reg.observacao || '',
  });
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
  });
}

/** Lê os líderes do Sheets. Chamado na sincronização geral. */
export async function sincronizarLideresKF(turmaId: string): Promise<void> {
  const json = await lerDoSheets(SHEETS_HISTORICO_URL, { tipo: 'get_lideres_kf', turmaId });
  if (!json?.lideres?.length) return;

  const locais = load<LiderKitchenFlow>(KEY_LIDERES as any);
  const chave = (l: any) => `${l.planoAulaId}__${l.grupoId ?? ''}`;
  const porChave = new Map(locais.map(l => [chave(l), l]));

  for (const r of json.lideres) {
    const atual = porChave.get(chave(r));
    // Fica o mais recente: o professor pode ter trocado de líder.
    if (!atual || (r.definidoEm && r.definidoEm > atual.definidoEm)) {
      porChave.set(chave(r), {
        planoAulaId: r.planoAulaId,
        grupoId: r.grupoId || undefined,
        alunoId: r.alunoId,
        definidoPor: r.definidoPor,
        definidoEm: r.definidoEm,
      });
    }
  }
  save(KEY_LIDERES as any, [...porChave.values()].filter(l => l.alunoId));
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
  const planos = getPlanosAulaPorTurma(turmaId)
    .filter(p => !ucId || (p as any).ucId === ucId)
    .filter(p => p.estado === 'publicado' || p.estado === 'realizada')
    .filter(p => p.data <= hoje);

  const presencas = getPresencas().filter(p => p.alunoId === alunoId);
  const selecoes = getSelecoes().filter(s => s.alunoId === alunoId);

  let comPresenca = 0, atrasos = 0, semAuto = 0, comDecisao = 0;
  for (const plano of planos) {
    const pres = presencas.find(p => p.planoAulaId === plano.id);
    if (pres?.presente) {
      comPresenca++;
      if (pres.atrasado) atrasos++;
      if (!selecoes.some(s => s.planoAulaId === plano.id)) semAuto++;
    }
    if ((pres as any)?.decisaoProfessor) comDecisao++;
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

/** O que a assiduidade diz sobre as atitudes — para o perfil do aluno
 *  e para o professor ter à frente quando avalia. */
export function leituraAssiduidade(a: Assiduidade): {
  texto: string;
  atitudesAfetadas: string[];
  grave: boolean;
} {
  if (a.aulasPrevistas === 0) {
    return { texto: 'Ainda não houve aulas nesta unidade.', atitudesAfetadas: [], grave: false };
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
    partes.push(`— essas aulas contam zero, porque não houve trabalho para avaliar`);
    atitudes.push('ATI-001', 'ATI-015');
  }
  if (a.atrasos > 0) {
    partes.push(`${partes.length ? ' e chegaste' : 'Chegaste'} atrasado ${a.atrasos} ${a.atrasos === 1 ? 'vez' : 'vezes'}`);
    if (!atitudes.includes('ATI-001')) atitudes.push('ATI-001');
  }
  if (a.semAutoavaliacao > 0) {
    partes.push(`. Em ${a.semAutoavaliacao} ${a.semAutoavaliacao === 1 ? 'aula' : 'aulas'} estiveste mas não te avaliaste — perdeste a hipótese de dizer como te correu`);
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
  fardamentoOk: boolean;
  itensEmFalta: string;
  kfInicial: boolean;
  kfFinal: boolean;
  ehLider: boolean;
  autoavaliou: boolean;
  validado: boolean;
}

export function estadoDaTurmaNaAula(planoAulaId: string, turmaId: string): EstadoAlunoNaAula[] {
  const alunos = getAlunos()
    .filter(a => a.turmaId === turmaId && a.ativo !== false)
    .sort((a, b) => a.numero - b.numero);

  const presencas = getPresencas().filter(p => p.planoAulaId === planoAulaId);
  const selecoes = getSelecoes().filter(s => s.planoAulaId === planoAulaId);
  const validacoes = getValidacoes();
  const liderId = liderKFdoGrupo(planoAulaId);

  return alunos.map(a => {
    const pres = presencas.find(p => p.alunoId === a.id);
    const sel = selecoes.find(s => s.alunoId === a.id);
    const val = sel ? validacoes.find(v => (v as any).selecaoId === sel.id) : undefined;

    // Os itens em falta ficam na observação da presença.
    const obs = pres?.observacao || '';
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
      fardamentoOk: !!pres?.fardamentoOk,
      itensEmFalta: emFalta,
      kfInicial: kfFaseCompleta(a.id, planoAulaId, 'inicial'),
      kfFinal: kfFaseCompleta(a.id, planoAulaId, 'final'),
      ehLider: liderId === a.id,
      autoavaliou: !!sel,
      validado: !!val,
    };
  });
}

/** Resumo para o cabeçalho: quantos em cada estado. */
export function resumoDaTurmaNaAula(estados: EstadoAlunoNaAula[]) {
  return {
    total: estados.length,
    entraram: estados.filter(e => e.entrou).length,
    foraDeTempo: estados.filter(e => e.foraDeTempo && !e.decisaoFalta).length,
    semFarda: estados.filter(e => e.entrou && !e.fardamentoOk).length,
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
  const existente = fila.find(i => i.id === id && i.tipo === tipo);
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

  const tenta = async (url: string, consulta: string, campo: string, tipoFila: string) => {
    try {
      const json = await lerDoSheets(url, { tipo: consulta, turmaId });
      const itens = json?.[campo] || json?.dados || [];
      itens.forEach((x: any) => { if (x?.id) idsNoSheets.add(`${tipoFila}|${String(x.id)}`); });
    } catch { /* falha na leitura não é confirmação nem falha de envio */ }
  };

  await Promise.all([
    tenta(SHEETS_FICHAS_URL, 'get_fichas', 'fichas', 'ficha'),
    tenta(SHEETS_PLANOS_URL, 'get_planos', 'planos', 'plano'),
    tenta(SHEETS_HISTORICO_URL, 'get_selecoes', 'selecoes', 'selecao'),
    tenta(SHEETS_HISTORICO_URL, 'get_validacoes', 'validacoes', 'validacao'),
    tenta(SHEETS_HISTORICO_URL, 'get_avaliacoes', 'avaliacoes', 'avaliacao'),
  ]);

  const agora = new Date().toISOString();
  const todos = getFilaSync();
  let confirmados = 0;

  todos.forEach(item => {
    if (item.confirmadoEm) return;
    if (idsNoSheets.has(`${item.tipo}|${item.id}`)) {
      item.confirmadoEm = agora;
      confirmados += 1;
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
    } else if (item.tipo === 'selecao') {
      const s = getSelecoes().find(x => x.id === item.id);
      if (s) {
        enviar(SHEETS_HISTORICO_URL, 'selecao', {
          id: s.id, planoAulaId: s.planoAulaId, alunoId: s.alunoId, turmaId: s.turmaId,
          tecnicas: s.tecnicas, atitudes: s.atitudes, autoavaliacoes: s.autoavaliacoes, criadaEm: s.criadaEm,
        });
        n += 1;
      }
    } else if (item.tipo === 'validacao') {
      const v = getValidacoes().find(x => x.id === item.id);
      if (v) {
        const mediaPonderada = (v as any).notaMedia20;
        const media = v.notas.length ? v.notas.reduce((s, nota) => s + nota.nota, 0) / v.notas.length : 0;
        const nota20 = typeof mediaPonderada === 'number'
          ? Math.round(mediaPonderada * 10) / 10 : Math.min(20, Math.round(media * 4));
        const aluno = getAlunos().find(a => a.id === v.alunoId);
        enviar(SHEETS_HISTORICO_URL, 'validacao', {
          ...(v as unknown as Record<string, unknown>),
          nomeAluno: aluno?.nome || (`Aluno ${aluno?.numero || 0}`), turma: v.turmaId,
          nota_media_1_5: Math.round((nota20 / 4) * 10) / 10, nota_media_0_20: nota20,
        });
        n += 1;
      }
    } else if (item.tipo === 'avaliacao') {
      const r = getHistoricoAvaliacoes().find(x => x.id === item.id);
      if (r) {
        const aluno = getAlunos().find(a => a.id === r.alunoId);
        const plano = getPlanosAula().find(p => p.id === r.planoAulaId);
        const ficha = getFichasProducao().find(f => f.id === r.fichaId);
        const labels: Record<number, string> = {
          1: 'Ainda não fiz', 2: 'Preciso de mais prática', 3: 'Consegui com ajuda',
          4: 'Faço sozinho/a', 5: 'Faço com muito bom resultado',
        };
        enviar(SHEETS_HISTORICO_URL, 'avaliacao', {
          ...r, tipo: 'avaliacao', nomeAluno: aluno?.nome || (`Aluno ${aluno?.numero || 0}`),
          numero: aluno?.numero || 0, turma: r.turmaId, ano: aluno?.ano || 1,
          planoTitulo: plano?.titulo || '', planoData: plano?.data || '',
          ucId: r.ucId || plano?.ucId || '', ucNome: plano?.ucNome || '', fichaNome: ficha?.nomePrato || '',
          microcompetencia: r.microcompetenciaId, nota_1_5: r.nota, nota_0_20: Math.min(20, Math.round(r.nota * 4)),
          nivel_label: labels[r.nota] || String(r.nota), data: r.data, validadoPor: r.validadoPor,
        });
        n += 1;
      }
    }
    if (n > 0) registarEnvio(item.id, item.tipo, item.descricao);
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
      : `${r.confirmados} guardados, ${r.porConfirmar} ainda por chegar. Tenta outra vez dentro de um minuto.`,
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
  const validados = new Set(getValidacoes().map((v: any) => v.selecaoId));
  const planos = getPlanosAula();
  const alunos = getAlunos();

  const porPlano = new Map<string, { nomes: string[] }>();

  getSelecoes()
    .filter((s: any) => s.turmaId === turmaId && !validados.has(s.id))
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
    nota: nivel, nota_1_5: nivel, nota_0_20: nivel * 4,
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
//   3. O bónus de eventos passa a ser aplicado, como no modelo: +0,75 por
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
  return id?.startsWith('OBR_') ? 'OBR'
    : (id?.startsWith('SUB-') || id?.startsWith('APP-')) ? 'SUB'
    : id?.startsWith('KNW-') ? 'KNW' : id?.startsWith('INI-') ? 'INI' : 'ATI';
}

/** Tipo de aula mais comum entre os registos (prática/mista/teórica). */
function tipoDominante(regs: RegistoAvaliacao[]): 'pratico' | 'misto' | 'teorico' | 'atitudinal' {
  const planos = getPlanosAula();
  const tipos = regs.map(r => (planos.find(p => p.id === r.planoAulaId) as any)?.tipoPlanAula || 'pratico');
  if (tipos.filter(t => t === 'teorico').length > tipos.length / 2) return 'teorico';
  if (tipos.filter(t => t === 'misto').length > tipos.length / 2) return 'misto';
  return 'pratico';
}

/** Nota das competências (0–20) a partir de registos já filtrados. */
export function notaBaseDeRegistos(regs: RegistoAvaliacao[]): number | null {
  const validos = regs.filter(registosQueContam);
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
export function participacoesDoAlunoNaUC(alunoId: string, turmaId: string, ucId: string): number {
  const mod: any = modulosDaTurma(turmaId).find((m: any) => m.id === ucId);
  const atividades = getAtividades().filter(a =>
    (a.participantesIds || []).includes(alunoId) && a.turmaId === turmaId);
  if (!mod?.dataInicio || !mod?.dataFim) return atividades.length;
  return atividades.filter(a => {
    const d = String(a.data || '').slice(0, 10);
    return d >= mod.dataInicio && d <= mod.dataFim;
  }).length;
}

export interface NotaUC {
  base: number | null;
  bonusAssiduidade: number;
  bonusParticipacao: number;
  participacoes: number;
  limitadaPorTeto: boolean;
  final: number | null;
}

/** Aplica os dois bónus e o teto a uma nota base de UC. */
export function aplicarBonusesUC(base: number | null, alunoId: string, turmaId: string, ucId: string): NotaUC {
  // Só as atividades do período deste módulo (decisão da Rosa, set/2026).
  const participacoes = participacoesDoAlunoNaUC(alunoId, turmaId, ucId);
  if (base === null) {
    return { base, bonusAssiduidade: 0, bonusParticipacao: 0, participacoes, limitadaPorTeto: false, final: null };
  }
  const B = BONUS_PARTICIPACAO;
  const bonusAssiduidade = calcularBonusAssiduidadeUC(alunoId, turmaId, ucId)?.total || 0;
  let nota = base + bonusAssiduidade;

  const n = Math.min(participacoes, B.maxAtividades);
  let bonusParticipacao = 0, limitadaPorTeto = false;
  if (n === 0) {
    if (nota > B.tetoSemParticipacao) { nota = B.tetoSemParticipacao; limitadaPorTeto = true; }
  } else if (base >= B.notaBaseMinima) {
    bonusParticipacao = n * B.porAtividade;
    nota += bonusParticipacao;
  }
  const final = Math.min(20, Math.round(nota * 10) / 10);
  return { base, bonusAssiduidade, bonusParticipacao, participacoes, limitadaPorTeto, final };
}

/** A nota final de um aluno numa UC. */
export function notaFinalUC(alunoId: string, turmaId: string, ucId: string): NotaUC {
  const regs = getHistoricoAvaliacoes().filter(r =>
    r.alunoId === alunoId && r.turmaId === turmaId && r.ucId === ucId);
  return aplicarBonusesUC(notaBaseDeRegistos(regs), alunoId, turmaId, ucId);
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
  tipo: 'pratico' | 'misto' | 'teorico' | 'atitudinal' = 'pratico'
): NotaPrevista | null {
  const validas = autos.filter(a => a.nota > 0);
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
  return p?.tipoPlanAula === 'atitudinal';
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
  getRequisicoes().filter(r => r.planoAulaId === planoId).forEach(r =>
    addOrUpdateRequisicao({ ...r, planoAulaId: '' } as any));
  eliminarPlanoAulaDefinitivamente(planoId);
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
  const req = getRequisicoes().find(r => r.planoAulaId === planoId);
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

export async function publicarPlanoParaAlunos(planoId: string): Promise<ResultadoPublicacao> {
  const plano = getPlanosAula().find(p => p.id === planoId);
  if (!plano) return { ok: false, erro: 'Plano não encontrado.' };

  const publicado = { ...plano, estado: 'publicado' as const, atualizadoEm: new Date().toISOString() };
  addOrUpdatePlanoAula(publicado);          // grava e envia

  // Duas tentativas: o Sheets demora um instante a gravar.
  for (let i = 0; i < 2; i++) {
    await new Promise(res => setTimeout(res, i === 0 ? 1800 : 3000));
    try {
      const json: any = await lerDoSheets(SHEETS_PLANOS_URL, { tipo: 'get_planos', turmaId: plano.turmaId });
      if (!json?.ok) {
        if (i === 1) return { ok: false, erro: 'Não consegui ligar-me ao Sheets dos planos. A aula ficou publicada aqui, mas os alunos não a veem enquanto não chegar lá.' };
        continue;
      }
      const la: any = (json.dados || []).find((p: any) => p.id === planoId);
      if (la && String(la.estado) === 'publicado') return { ok: true };
      if (i === 1) {
        return { ok: false, erro: la
          ? 'A aula está no Sheets, mas não como publicada. Tenta publicar outra vez.'
          : 'A aula não chegou ao Sheets. Os alunos não a veem. Tenta outra vez; se continuar, é o Apps Script dos planos que não está a receber.' };
      }
      addOrUpdatePlanoAula(publicado);       // segunda tentativa de envio
    } catch {
      if (i === 1) return { ok: false, erro: 'Não consegui confirmar a publicação.' };
    }
  }
  return { ok: false, erro: 'Não consegui confirmar a publicação.' };
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
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    await new Promise(res => setTimeout(res, tentativa === 0 ? 1800 : 3000));
    try {
      const json: any = await lerDoSheets(SHEETS_HISTORICO_URL, { tipo: 'get_avaliacoes', turmaId });
      if (!json?.ok) continue;
      const la = new Set((json.dados || json.avaliacoes || []).map((r: any) => String(r.id)));
      const encontrados = ids.filter(id => la.has(String(id))).length;
      if (encontrados === ids.length) return { ok: true, encontrados, total: ids.length };
      if (tentativa === 1) return { ok: false, encontrados, total: ids.length };
    } catch (e) {
      if (tentativa === 1) return { ok: false, encontrados: 0, total: ids.length, erro: String(e) };
    }
  }
  return { ok: false, encontrados: 0, total: ids.length };
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
  linhas.push(r.ok ? 'Escrita: OK — o que gravas chega ao Sheets'
    : 'Escrita: FALHOU — o que gravas NÃO chega ao Sheets');
  if (!r.ok) linhas.push('Apaga a linha de teste se ela aparecer mais tarde (aluno TESTE).');
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
    const minutos = Number(reg.atrasadoMins) || 0;
    if (minutos <= 0) continue;
    // Horas completas, e nunca mais do que a aula toda.
    horas += Math.min(Math.floor(minutos / 60), horasDoPlano(p));
  }
  return horas;
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
  turmaId: string, ucId: string, email: string, professor: string
): Promise<{ ok: boolean; erro?: string }> {
  if (!email || !email.includes('@')) return { ok: false, erro: 'Email inválido.' };
  const mod: any = modulosDaTurma(turmaId).find((m: any) => m.id === ucId);
  enviar(SHEETS_HISTORICO_URL, 'pauta', {
    turmaId, ucId, ucNome: mod?.nome || '', email, professor,
    disciplina: mod?.disciplina || '', horasPrevistas: mod?.horasPrevistas || 0,
    dataInicio: mod?.dataInicio || '', dataFim: mod?.dataFim || '',
    linhas: pautaDaUC(turmaId, ucId),
    criadaEm: new Date().toISOString(),
  });
  // Dar tempo ao script e confirmar que a pauta ficou registada.
  await new Promise(res => setTimeout(res, 2500));
  try {
    const json: any = await lerDoSheets(SHEETS_HISTORICO_URL, { tipo: 'get_pautas', turmaId });
    const la = (json?.dados || json?.pautas || []).some((p: any) =>
      String(p.ucId) === ucId && String(p.turmaId) === turmaId);
    return la ? { ok: true } : { ok: false, erro: 'A pauta não chegou ao Sheets. Tenta outra vez.' };
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

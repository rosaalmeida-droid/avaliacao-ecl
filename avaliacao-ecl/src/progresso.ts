// ============================================================
// Progressão — histórico por aluno × competência e sugestões
//
// Regra: cada competência tem média própria (notas 0-20).
// Se média >= 12 -> competência "dominada": a app sugere
// trocá-la na próxima seleção. Não bloqueia — apenas sugere.
// ============================================================

import { Validacao, HistoricoAluno, HistoricoCompetencia, Categoria, SelecaoAluno, Comanda, Atividade, NIVEL_AUTO_NOTA } from './types';
import { TECNICAS, ATITUDES, RESPONSABILIDADES, TODAS_COMPETENCIAS } from './competencias';

export const LIMIAR_DOMINIO = 12;

/**
 * Constrói o histórico agregado de um aluno a partir de todas as
 * Validações já recebidas. `selecoes` e `comandas` servem para
 * contabilizar o equilíbrio Individual vs Grupo.
 */
export function construirHistorico(
  alunoId: string,
  validacoes: Validacao[],
  selecoes: SelecaoAluno[] = [],
  comandas: Comanda[] = []
): HistoricoAluno {
  const doAluno = validacoes.filter(v => v.alunoId === alunoId);

  const porCompetencia: Record<string, HistoricoCompetencia> = {};
  let somaTotal = 0;
  let countTotal = 0;

  for (const v of doAluno) {
    for (const n of v.notas) {
      if (!porCompetencia[n.competenciaId]) {
        porCompetencia[n.competenciaId] = { competenciaId: n.competenciaId, notas: [], vezesTreinada: 0, media: 0, dominada: false };
      }
      porCompetencia[n.competenciaId].notas.push(n.nota);
      somaTotal += n.nota;
      countTotal += 1;
    }
  }

  for (const comp of Object.values(porCompetencia)) {
    const soma = comp.notas.reduce((a, b) => a + b, 0);
    comp.media = soma / comp.notas.length;
    comp.dominada = comp.media >= LIMIAR_DOMINIO;
    comp.vezesTreinada = comp.notas.length;
  }

  // Equilíbrio Individual vs Grupo: contar pelas seleções do aluno
  // cuja comanda associada já foi validada.
  let totalIndividual = 0;
  let totalGrupo = 0;
  const idsValidados = new Set(doAluno.map(v => v.selecaoId));
  for (const sel of selecoes) {
    if (sel.alunoId !== alunoId) continue;
    if (!idsValidados.has(sel.id)) continue;
    const comanda = comandas.find(c => c.id === sel.comandaId);
    if (!comanda) continue;
    if (comanda.modo === 'individual') totalIndividual += 1;
    else totalGrupo += 1;
  }

  return {
    alunoId,
    porCompetencia,
    mediaGeral: countTotal > 0 ? somaTotal / countTotal : 0,
    totalAvaliacoes: countTotal,
    totalIndividual,
    totalGrupo,
  };
}

/**
 * Histórico "provisório" — combina validações confirmadas (peso normal)
 * com as autoavaliações de seleções ainda não validadas pelo professor.
 * Usado para a sugestão de progressão funcionar mesmo antes da validação.
 */
export function construirHistoricoProvisorio(
  alunoId: string,
  validacoes: Validacao[],
  selecoesPendentes: SelecaoAluno[],
  todasSelecoes: SelecaoAluno[] = [],
  comandas: Comanda[] = []
): HistoricoAluno {
  const base = construirHistorico(alunoId, validacoes, todasSelecoes, comandas);
  const idsValidados = new Set(validacoes.map(v => v.selecaoId));

  for (const sel of selecoesPendentes) {
    if (sel.alunoId !== alunoId) continue;
    if (idsValidados.has(sel.id)) continue; // já contabilizada em base

    for (const auto of sel.autoavaliacoes) {
      const nota = NIVEL_AUTO_NOTA[auto.nivel];
      if (!base.porCompetencia[auto.competenciaId]) {
        base.porCompetencia[auto.competenciaId] = { competenciaId: auto.competenciaId, notas: [], vezesTreinada: 0, media: 0, dominada: false };
      }
      const comp = base.porCompetencia[auto.competenciaId];
      comp.notas.push(nota);
      comp.media = comp.notas.reduce((a, b) => a + b, 0) / comp.notas.length;
      comp.dominada = comp.media >= LIMIAR_DOMINIO;
      comp.vezesTreinada = comp.notas.length;

      base.mediaGeral = (base.mediaGeral * base.totalAvaliacoes + nota) / (base.totalAvaliacoes + 1);
      base.totalAvaliacoes += 1;
    }
  }

  return base;
}

/**
 * Para uma dada categoria, devolve:
 *  - dominadas: ids com média >= 12 (sugestão: trocar)
 *  - emDesenvolvimento: ids já tentados mas média < 12 (continuar a treinar)
 *  - novas: ids nunca tentados (prioridade para sugestão de novidade)
 */
export function analisarCategoria(historico: HistoricoAluno, categoria: Categoria) {
  const todasIds = listaPorCategoria(categoria).map(c => c.id);

  const dominadas: string[] = [];
  const emDesenvolvimento: string[] = [];
  const novas: string[] = [];

  for (const id of todasIds) {
    const h = historico.porCompetencia[id];
    if (!h) {
      novas.push(id);
    } else if (h.dominada) {
      dominadas.push(id);
    } else {
      emDesenvolvimento.push(id);
    }
  }

  return { dominadas, emDesenvolvimento, novas };
}

function listaPorCategoria(categoria: Categoria) {
  switch (categoria) {
    case 'TECNICAS': return TECNICAS;
    case 'ATITUDES': return ATITUDES;
    case 'RESPONSABILIDADES': return RESPONSABILIDADES;
  }
}

/**
 * Dado o conjunto de ids que o aluno está prestes a (re)selecionar
 * para a próxima comanda, devolve avisos de "sugestão de troca"
 * para competências já dominadas.
 */
export function sugerirTrocas(historico: HistoricoAluno, idsSelecionados: string[]): {
  id: string;
  media: number;
}[] {
  return idsSelecionados
    .map(id => ({ id, h: historico.porCompetencia[id] }))
    .filter(x => x.h && x.h.dominada)
    .map(x => ({ id: x.id, media: x.h!.media }));
}

/**
 * Texto de badge para mostrar junto a cada competência na UI.
 */
export function badgeCompetencia(historico: HistoricoAluno, competenciaId: string): {
  texto: string;
  tipo: 'nova' | 'desenvolvimento' | 'dominada';
} {
  const h = historico.porCompetencia[competenciaId];
  if (!h) return { texto: 'Nova — ainda não treinada', tipo: 'nova' };
  if (h.dominada) return { texto: `Treinada ${h.vezesTreinada}x · média ${h.media.toFixed(1)} — já dominas, experimenta outra`, tipo: 'dominada' };
  return { texto: `Treinada ${h.vezesTreinada}x · média ${h.media.toFixed(1)}`, tipo: 'desenvolvimento' };
}

// ------------------------------------------------------------------
// Alerta de equilíbrio Individual vs Grupo — visível só ao professor
// ------------------------------------------------------------------
const MIN_AVALIACOES_PARA_ALERTA = 4;
const RATIO_DESEQUILIBRIO = 0.85; // se >=85% num só modo, alertar

export function alertaEquilibrioModo(historico: HistoricoAluno): string | null {
  const total = historico.totalIndividual + historico.totalGrupo;
  if (total < MIN_AVALIACOES_PARA_ALERTA) return null;

  const ratioGrupo = historico.totalGrupo / total;
  const ratioIndividual = historico.totalIndividual / total;

  if (ratioGrupo >= RATIO_DESEQUILIBRIO) {
    return `Este aluno teve ${historico.totalGrupo} trabalhos em grupo e apenas ${historico.totalIndividual} individual. Considera atribuir uma receita individual.`;
  }
  if (ratioIndividual >= RATIO_DESEQUILIBRIO) {
    return `Este aluno teve ${historico.totalIndividual} trabalhos individuais e apenas ${historico.totalGrupo} em grupo. Considera integrá-lo num grupo.`;
  }
  return null;
}

// ------------------------------------------------------------------
// Progresso por Unidade de Competência (UC) do referencial 811RA144
//
// Critério: uma competência conta como "realizada" numa UC quando
// está "dominada" (média >= 12). Progresso da UC = % de competências
// dominadas entre as que pertencem a essa UC.
// ------------------------------------------------------------------
export interface ProgressoUC {
  uc: string;
  totalCompetencias: number;
  dominadas: number;
  percentagem: number; // 0-100
  nivel: 'inicio' | 'progresso' | 'quase_la' | 'concluida';
}

export function calcularProgressoUCs(historico: HistoricoAluno): ProgressoUC[] {
  // Agrupar todas as competências por UC
  const porUC: Record<string, string[]> = {}; // uc -> [competenciaId]
  for (const comp of TODAS_COMPETENCIAS) {
    for (const uc of comp.uc) {
      if (!porUC[uc]) porUC[uc] = [];
      porUC[uc].push(comp.id);
    }
  }

  const resultado: ProgressoUC[] = [];
  for (const [uc, ids] of Object.entries(porUC)) {
    const dominadas = ids.filter(id => historico.porCompetencia[id]?.dominada).length;
    const percentagem = ids.length > 0 ? Math.round((dominadas / ids.length) * 100) : 0;

    let nivel: ProgressoUC['nivel'] = 'inicio';
    if (percentagem === 100) nivel = 'concluida';
    else if (percentagem >= 70) nivel = 'quase_la';
    else if (percentagem >= 60) nivel = 'progresso';

    resultado.push({ uc, totalCompetencias: ids.length, dominadas, percentagem, nivel });
  }

  return resultado.sort((a, b) => b.percentagem - a.percentagem);
}

// ------------------------------------------------------------------
// Participação extracurricular — eventos fora de horas e concursos.
// Registo factual: quantas vezes o aluno teve oportunidade vs.
// participou. Sem nota associada (ver dúvida em memória).
// ------------------------------------------------------------------
export interface ParticipacaoExtra {
  eventosOferecidos: number;
  eventosParticipados: number;
  concursosOferecidos: number;
  concursosParticipados: number;
  /** true se o aluno participou em pelo menos 1 concurso entre os oferecidos */
  participouAlgumConcurso: boolean;
  /**
   * Regra para nota final > 17:
   * - se houve concursos oferecidos, exige participação em pelo menos um
   * - se nunca houve concursos oferecidos, não restringe
   */
  elegivelAcimaDe17: boolean;
}

export function calcularParticipacaoExtra(alunoId: string, atividades: Atividade[]): ParticipacaoExtra {
  const eventos = atividades.filter(a => a.tipo === 'evento');
  const concursos = atividades.filter(a => a.tipo === 'concurso');

  const eventosParticipados = eventos.filter(a => a.participantesIds.includes(alunoId)).length;
  const concursosParticipados = concursos.filter(a => a.participantesIds.includes(alunoId)).length;

  const participouAlgumConcurso = concursosParticipados > 0;
  const elegivelAcimaDe17 = concursos.length === 0 || participouAlgumConcurso;

  return {
    eventosOferecidos: eventos.length,
    eventosParticipados,
    concursosOferecidos: concursos.length,
    concursosParticipados,
    participouAlgumConcurso,
    elegivelAcimaDe17,
  };
}

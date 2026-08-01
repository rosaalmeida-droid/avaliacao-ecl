// "Plano de Aula N de M" + avisos de fim de UC.
//  N = posição do plano dentro da sua UC (ordenado por data).
//  M = nº de semanas entre início e fim da UC no cronograma (cada semana = uma aula).
import { getPlanosAula } from './backend';
import { CRONOGRAMA_2026_2027 } from './cronograma';
import type { PlanoAula } from './types';

const DIA = 86400000;

function modDaUC(plano: PlanoAula): any {
  return CRONOGRAMA_2026_2027.find(x => x.id === plano.ucId);
}

export function totalAulasUC(plano: PlanoAula): number {
  const mod = modDaUC(plano);
  if (!mod || !mod.dataInicio || !mod.dataFim) return 0;
  const ini = new Date(mod.dataInicio).getTime();
  const fim = new Date(mod.dataFim).getTime();
  if (isNaN(ini) || isNaN(fim) || fim < ini) return 0;
  return Math.floor((fim - ini) / (7 * DIA)) + 1;
}

export function posicaoNaUC(plano: PlanoAula): number {
  const daUC = getPlanosAula()
    .filter(p => p.ucId === plano.ucId && p.turmaId === plano.turmaId && p.estado !== 'arquivado')
    .sort((a, b) => String(a.data || '').localeCompare(String(b.data || '')) || (a.numeroPlan || 0) - (b.numeroPlan || 0));
  const idx = daUC.findIndex(p => p.id === plano.id);
  return idx >= 0 ? idx + 1 : (plano.numeroPlan || 1);
}

export function rotuloPlano(plano: PlanoAula): string {
  if (!plano) return 'Plano de aula';
  const n = posicaoNaUC(plano);
  const m = totalAulasUC(plano);
  return 'Plano de Aula ' + n + (m ? ' de ' + m : '');
}

/** Aviso a mostrar ao professor sobre o fim da UC. '' se não há aviso. */
export function avisoFimUC(plano: PlanoAula): string {
  if (!plano) return '';
  const mod = modDaUC(plano);
  if (!mod || !mod.dataFim) return '';
  const fim = new Date(mod.dataFim).getTime();
  if (isNaN(fim)) return '';

  // 1) Este plano é a última aula da UC? (é o último N de M, ou a sua data cai na última semana)
  const n = posicaoNaUC(plano), m = totalAulasUC(plano);
  const dataPlano = plano.data ? new Date(plano.data).getTime() : NaN;
  const naUltimaSemana = !isNaN(dataPlano) && fim - dataPlano <= 7 * DIA && fim - dataPlano >= -DIA;
  if ((m && n >= m) || naUltimaSemana) {
    return '⚠️ Última aula desta UC — é o momento de fechar a avaliação e recuperar competências em falta.';
  }

  // 2) A UC termina dentro de uma semana (relativo a hoje)?
  const faltam = fim - Date.now();
  if (faltam >= 0 && faltam <= 7 * DIA) {
    return '📅 Esta UC termina para a semana.';
  }
  return '';
}

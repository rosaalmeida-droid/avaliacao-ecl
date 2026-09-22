// "Plano de Aula N de M" + avisos de fim de UC.
//  N = posição do plano dentro da sua UC (ordenado por data).
//  M = dias de cozinha da turma entre início e fim da UC (horários.ts);
//      para as outras disciplinas, semanas.
import { getPlanosAula } from './backend';
import { CRONOGRAMA_2026_2027 } from './cronograma';
import { horarioDaTurma, temCozinha } from './horarios';
import type { PlanoAula } from './types';

const DIA = 86400000;

function modDaUC(plano: PlanoAula): any {
  return CRONOGRAMA_2026_2027.find(x => x.id === plano.ucId);
}

// Feriados nacionais em dias de semana, dentro dos períodos letivos de
// 2026/27.
const FERIADOS_2026_27 = new Set([
  '2026-10-05', '2026-12-01', '2026-12-08', '2027-05-27',
]);

// Interrupções letivas, tiradas dos intervalos do cronograma (o 1º
// período acaba a 15/12 e o 2º começa a 04/01; o 2º acaba a 19/03 e o
// 3º começa a 30/03). Módulos que atravessam o Natal não contam as
// semanas de férias.
const INTERRUPCOES_2026_27: [string, string][] = [
  ['2026-12-16', '2027-01-03'],
  ['2027-03-20', '2027-03-29'],
];
const emInterrupcao = (iso: string) => INTERRUPCOES_2026_27.some(([a, b]) => iso >= a && iso <= b);

/**
 * Quantas aulas tem a UC — os dias de cozinha reais da turma entre o
 * início e o fim do módulo (um plano = as horas seguidas de um dia).
 * Contava semanas: no 3º ACP, com cozinha três dias por semana, um
 * módulo de 5 semanas dizia "de 5" quando tem 15 aulas.
 *
 * Só para Serviços de Cozinha/Pastelaria — é só esse o horário que a
 * aplicação conhece. Para as outras disciplinas continua a contar semanas.
 */
export function totalAulasUC(plano: PlanoAula): number {
  const mod = modDaUC(plano);
  if (!mod || !mod.dataInicio || !mod.dataFim) return 0;
  const ini = new Date(mod.dataInicio + 'T00:00:00');
  const fim = new Date(mod.dataFim + 'T00:00:00');
  if (isNaN(ini.getTime()) || isNaN(fim.getTime()) || fim < ini) return 0;

  const ehCozinha = /cozinha/i.test(String(mod.disciplina || ''));
  if (ehCozinha && horarioDaTurma(plano.turmaId)) {
    let n = 0;
    for (let d = new Date(ini); d <= fim; d.setDate(d.getDate() + 1)) {
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!FERIADOS_2026_27.has(iso) && !emInterrupcao(iso) && temCozinha(plano.turmaId, iso)) n++;
    }
    if (n > 0) return n;
  }
  return Math.floor((fim.getTime() - ini.getTime()) / (7 * DIA)) + 1;
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

  // "12 de 5" não quer dizer nada: são 12 planos criados numa unidade
  // que o cronograma diz ter 5 semanas. Quando isso acontece, mostra-se
  // só a posição — o total do cronograma deixou de servir de referência.
  if (!m || n > m) return 'Plano de Aula ' + n;

  return 'Plano de Aula ' + n + ' de ' + m;
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

// "Plano de Aula N de M" — N por UC (posição por data), M pelas datas do cronograma (~1 aula/semana).
// Ficheiro próprio para não depender de exports do backend.
import { getPlanosAula } from './backend';
import { CRONOGRAMA_2026_2027 } from './cronograma';
import type { PlanoAula } from './types';

export function rotuloPlano(plano: PlanoAula): string {
  if (!plano) return 'Plano de aula';
  const daUC = getPlanosAula()
    .filter(p => p.ucId === plano.ucId && p.turmaId === plano.turmaId && !p.arquivado)
    .sort((a, b) => String(a.data || '').localeCompare(String(b.data || '')) || (a.numeroPlan || 0) - (b.numeroPlan || 0));
  const idx = daUC.findIndex(p => p.id === plano.id);
  const n = idx >= 0 ? idx + 1 : (plano.numeroPlan || 1);
  let m = 0;
  const mod = CRONOGRAMA_2026_2027.find(x => x.id === plano.ucId);
  if (mod && mod.dataInicio && mod.dataFim) {
    const ini = new Date(mod.dataInicio).getTime();
    const fim = new Date(mod.dataFim).getTime();
    if (!isNaN(ini) && !isNaN(fim) && fim >= ini) m = Math.max(1, Math.round((fim - ini) / (7 * 86400000)) + 1);
  }
  return 'Plano de Aula ' + n + (m ? ' de ' + m : '');
}

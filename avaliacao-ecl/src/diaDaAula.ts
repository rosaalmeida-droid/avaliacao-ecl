// ============================================================
// O dia da aula, nas palavras do aluno (Rosa, 13/out/2026)
// ============================================================
// O aluno avaliava a atividade de sábado na segunda e lia «Hoje, …» e «A aula
// de hoje»: não sabia o que estava a avaliar. Numa aula ou atividade que já
// passou, as perguntas dizem o dia, e o topo da autoavaliação diz sempre o que
// se avalia (atividade a verde, aula a roxo).
// ============================================================
import { pedeFardaEHigiene } from './contextoAula';

export function hojeLocalISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export const eAtividade = (p: any) => !!p?.tipoEvento;
/** «sábado, 10/10» ou, por extenso, «sábado, 10 de outubro». */
export function diaDaAula(data: string, extenso = false): string {
  const d = new Date(String(data).slice(0, 10) + 'T12:00:00');
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-PT', extenso ? { weekday: 'long', day: 'numeric', month: 'long' } : { weekday: 'long', day: '2-digit', month: '2-digit' });
}
/** A aula ou atividade é de um dia que já passou. */
export function jaPassou(plano: any): boolean {
  const data = String(plano?.data || '').slice(0, 10);
  return !!data && data < hojeLocalISO();
}
/** As perguntas dizem «Hoje»: numa aula ou atividade que já passou, dizem o dia. */
export function textoParaODia(t: string, plano: any): string {
  if (!t || !/hoje/i.test(t) || !jaPassou(plano)) return t;
  const data = String(plano.data).slice(0, 10);
  const qual = eAtividade(plano) ? 'atividade' : 'aula';
  const dia = diaDaAula(data);
  return t
    .replace(/^Hoje,?\s+/, `Na ${qual} de ${dia}, `)
    .replace(/\b(a|da|na) (aula|atividade) de hoje\b/gi, (_m, art) => `${art} ${qual} de ${dia}`)
    .replace(/\bde hoje\b/g, 'desse dia')
    .replace(/\bHoje\b/g, 'Nesse dia')
    .replace(/\bhoje\b/g, 'nesse dia');
}
/** O que o aluno está a avaliar: atividade ou aula, o nome e o dia. */
export function faixaDaAula(plano: any): { atividade: boolean; titulo: string; linha: string } {
  const titulo = String(plano?.titulo || 'Aula').replace(/\s*[—–-]\s*\d{2}\/\d{2}\/\d{4}\s*$/, '') || 'Aula';
  const horas = plano?.horaInicio ? `${String(plano.horaInicio).slice(0, 5)}${plano.horaFim ? `–${String(plano.horaFim).slice(0, 5)}` : ''}` : '';
  const data = String(plano?.data || '').slice(0, 10);
  const dia = data === hojeLocalISO() ? `hoje, ${diaDaAula(data, true)}` : diaDaAula(data, true);
  return { atividade: eAtividade(plano), titulo,
    linha: [dia, horas, pedeFardaEHigiene(plano) ? 'com farda' : 'sem farda'].filter(Boolean).join(' · ') };
}

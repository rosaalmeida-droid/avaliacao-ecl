// ============================================================
// Sem farda completa: tolerância uma vez por período, ou sem prática
// (Rosa, 7/out/2026)
// ============================================================
// «O aluno pode falhar a farda uma vez, porque eu dou-lhe essa hipótese:
// um perdão por período. Se já é a segunda vez, não pode responder sobre
// as técnicas: responde só sobre os conhecimentos (o guião), porque não as
// realizou.»
//   • Tolerância: faz a aula; as técnicas contam. Uma só por período.
//   • Sem prática: o professor dá-lhe outra tarefa; na autoavaliação não
//     aparecem as técnicas (contam 0, como sempre sem farda).
// O professor decide em «Turma e faltas». Se o aluno já usou a tolerância
// do período, fica logo «sem prática».
// ============================================================
import { getPresencas, getPlanosAula, getValidacoes } from './backend';

export type DecisaoFarda = 'tolerancia' | 'sem_pratica';

/** Os períodos escolares de 2026/27. Por meses, até a escola dar as datas
 *  oficiais: é só mudar aqui (setembro–dezembro, janeiro–março, abril–agosto). */
export const PERIODOS_ESCOLARES = [
  { n: 1, inicio: '2026-09-01', fim: '2026-12-31' },
  { n: 2, inicio: '2027-01-01', fim: '2027-03-31' },
  { n: 3, inicio: '2027-04-01', fim: '2027-08-31' },
] as const;

export function periodoDe(dataISO: string): { n: number; inicio: string; fim: string } | null {
  const d = String(dataISO || '').slice(0, 10);
  return PERIODOS_ESCOLARES.find(p => d >= p.inicio && d <= p.fim) || null;
}

const dataDoPlano = (planoAulaId: string) => String(getPlanosAula().find(p => p.id === planoAulaId)?.data || '').slice(0, 10);

/** O aluno disse à entrada (ou o professor marcou) que a farda não estava completa. */
export function fardaEmFaltaNaAula(alunoId: string, planoAulaId: string): boolean {
  const r: any = getPresencas().find(x => x.alunoId === alunoId && x.planoAulaId === planoAulaId);
  if (!r) return false;
  if (r.fardaDeclarada) return (r.fardaEmFalta || []).length > 0;
  return !!r.horaEntrada && r.fardamentoOk === false;
}

/** A tolerância da farda já dada neste período, noutra aula (a mais recente). */
export function toleranciaNoPeriodo(alunoId: string, dataISO: string, excluirPlanoId?: string): { planoAulaId: string; data: string } | null {
  const per = periodoDe(dataISO);
  if (!per) return null;
  const dentro = (id: string) => { const d = dataDoPlano(id); return id !== excluirPlanoId && d >= per.inicio && d <= per.fim; };
  const ids = new Set<string>();
  getPresencas().forEach((r: any) => { if (r.alunoId === alunoId && r.decisaoFarda === 'tolerancia' && dentro(r.planoAulaId)) ids.add(r.planoAulaId); });
  // As tolerâncias dadas na validação, antes de haver esta decisão na aula.
  getValidacoes().forEach((v: any) => { if (v.alunoId === alunoId && v.fardaPerdoada && !v.semFarda && dentro(v.planoAulaId)) ids.add(v.planoAulaId); });
  const lista = [...ids].map(id => ({ planoAulaId: id, data: dataDoPlano(id) })).sort((a, b) => b.data.localeCompare(a.data));
  return lista[0] || null;
}

/** O que vale nesta aula: a decisão do professor; sem ela, «sem prática» se o
 *  aluno não tem farda e já usou a tolerância do período; senão, por decidir (null). */
export function decisaoFardaNaAula(alunoId: string, planoAulaId: string): { decisao: DecisaoFarda | null; automatica: boolean } {
  const r: any = getPresencas().find(x => x.alunoId === alunoId && x.planoAulaId === planoAulaId);
  if (r?.decisaoFarda === 'tolerancia' || r?.decisaoFarda === 'sem_pratica') return { decisao: r.decisaoFarda, automatica: false };
  if (fardaEmFaltaNaAula(alunoId, planoAulaId) && toleranciaNoPeriodo(alunoId, dataDoPlano(planoAulaId), planoAulaId))
    return { decisao: 'sem_pratica', automatica: true };
  return { decisao: null, automatica: false };
}

/** «06/10» */
export const diaMes = (iso: string) => String(iso || '').slice(0, 10).split('-').reverse().slice(0, 2).join('/');

// ============================================================
// As horas de cada UC: as dadas e as que ainda cabem (Rosa, 5/out/2026)
// ============================================================
// Conta-se em horas, como nas faltas. Já dadas: os planos de aula de dias
// que já passaram. Ainda por dar: os planos de aula já feitos para os dias
// que vêm, e as horas do horário da turma nos dias de aula sem plano até ao
// fim da UC (sem feriados nem interrupções da escola). Um dia que passou
// sem plano (uma visita de estudo com outros professores) não conta.
// ============================================================
import { getPlanosAula, horasDoPlano } from './backend';
import { modulosDaTurma, CRONOGRAMA_2026_2027 } from './cronograma';
import { horasSugeridas, horarioDaTurma } from './horarios';
import { diaSemAulas } from './calendarioEscolar';
import { TIPOS_EVENTO } from './eventosAvaliacao';

const isoDe = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export interface HorasDaUC {
  turmaId: string; ucId: string; nome: string; inicio: string; fim: string;
  total: number; dadas: number; planeadas: number; noHorario: number; diasNoHorario: number; previstas: number;
}

export function horasDaUC(turmaId: string, ucId: string, hojeISO = isoDe(new Date())): HorasDaUC | null {
  const mod: any = modulosDaTurma(turmaId).find(m => m.id === ucId) || CRONOGRAMA_2026_2027.find(m => m.id === ucId);
  const total = Number(mod?.horasPrevistas) || 0;
  if (!mod || !total || !mod.dataFim) return null;
  const planos = getPlanosAula().filter((p: any) => p.turmaId === turmaId && p.ucId === ucId && p.estado !== 'arquivado'
    && !p.eliminado && !(p.tipoEvento && TIPOS_EVENTO.includes(p.tipoAtividade)));
  const dia = (p: any) => String(p.data || '').slice(0, 10);
  // Só os planos de aula dentro das datas da UC: os de teste (junho a agosto)
  // ficavam a contar como horas dadas (Rosa, 5/out/2026).
  const ini0 = String(mod.dataInicio || '0000-00-00'), fim0 = String(mod.dataFim);
  const dentro = planos.filter(p => dia(p) >= ini0 && dia(p) <= fim0);
  planos.length = 0; planos.push(...dentro);
  const dadas = planos.filter(p => dia(p) < hojeISO).reduce((s, p) => s + horasDoPlano(p), 0);
  const futuros = planos.filter(p => dia(p) >= hojeISO);
  const planeadas = futuros.reduce((s, p) => s + horasDoPlano(p), 0);
  const comPlano = new Set(futuros.map(dia));
  let noHorario = 0, diasNoHorario = 0;
  if (horarioDaTurma(turmaId) && /cozinha/i.test(String(mod.disciplina || ''))) {
    const fim = new Date(mod.dataFim + 'T00:00:00');
    const ini = new Date(Math.max(new Date(hojeISO + 'T00:00:00').getTime(), new Date((mod.dataInicio || hojeISO) + 'T00:00:00').getTime()));
    for (let d = new Date(ini); d <= fim; d.setDate(d.getDate() + 1)) {
      const iso = isoDe(d);
      if (comPlano.has(iso) || diaSemAulas(iso, turmaId)) continue;
      const h = horasSugeridas(turmaId, iso);
      if (!h) continue;
      noHorario += horasDoPlano({ horaInicio: h.inicio, horaFim: h.fim } as any);
      diasNoHorario++;
    }
  }
  return { turmaId, ucId, nome: mod.nome || '', inicio: String(mod.dataInicio || ''), fim: mod.dataFim, total, dadas, planeadas, noHorario, diasNoHorario,
    previstas: dadas + planeadas + noHorario };
}

/** A UC que está a decorrer na turma (só essa: mostrar a seguinte ao mesmo
 *  tempo dava a ideia de duas UC de cozinha em simultâneo — Rosa, 5/out/2026).
 *  Sem nenhuma a decorrer (entre duas UC), a próxima. */
export function horasDasUCsEmCurso(turmaId: string, professor?: string, hojeISO = isoDe(new Date())): HorasDaUC[] {
  const minhas = modulosDaTurma(turmaId)
    .filter((m: any) => m.dataFim >= hojeISO)
    .filter((m: any) => !professor || String(m.docente || '').toLowerCase().includes(String(professor).toLowerCase().split(' ')[0]))
    .filter((m: any) => /cozinha/i.test(String(m.disciplina || '')) && !!horarioDaTurma(turmaId))
    .sort((a: any, b: any) => String(a.dataInicio || '').localeCompare(String(b.dataInicio || '')));
  const aDecorrer = minhas.filter((m: any) => (m.dataInicio || '') <= hojeISO);
  return (aDecorrer.length ? aDecorrer : minhas.slice(0, 1))
    .map((m: any) => horasDaUC(turmaId, m.id, hojeISO))
    .filter((x): x is HorasDaUC => !!x);
}

const fmt = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
const horas = (n: number) => `${fmt(n)} hora${Math.round(n * 10) / 10 === 1 ? '' : 's'}`;
const dataPT = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' });

/** A frase para o professor, e se está tudo certo, faltam horas ou sobram. */
export function fraseDasHorasDaUC(h: HorasDaUC): { frase: string; estado: 'certo' | 'faltam' | 'sobram' } {
  const partes: string[] = [`Já deu ${fmt(h.dadas)} das ${horas(h.total)}.`];
  if (h.planeadas) partes.push(`Tem planos de aula para os próximos dias com ${horas(h.planeadas)}.`);
  if (h.noHorario) partes.push(`Até ${dataPT(h.fim)}, o horário da turma tem mais ${h.diasNoHorario} dia${h.diasNoHorario === 1 ? '' : 's'} de aula sem plano, com ${horas(h.noHorario)}.`);
  else partes.push(`Até ${dataPT(h.fim)}, o horário da turma não tem mais dias de aula sem plano.`);
  const dif = Math.round((h.previstas - h.total) * 10) / 10;
  if (Math.abs(dif) < 0.5) return { frase: partes.join(' ') + ' As horas chegam certas.', estado: 'certo' };
  if (dif < 0) return { frase: partes.join(' ') + ` ${Math.round(-dif * 10) / 10 === 1 ? "Falta" : "Faltam"} ${horas(-dif)} para chegar às ${horas(h.total)}: é preciso acertar o cronograma ou marcar mais planos de aula.`, estado: 'faltam' };
  // Sobram menos horas do que um dia de aula: basta encurtar o último plano.
  const umDia = h.diasNoHorario ? h.noHorario / h.diasNoHorario : 0;
  if (umDia && dif < umDia) return { frase: partes.join(' ') + ` Passa das ${horas(h.total)} em ${horas(dif)}: no último dia de aula da UC, basta dar ${horas(umDia - dif)}.`, estado: 'sobram' };
  return { frase: partes.join(' ') + ` Passa das ${horas(h.total)} em ${horas(dif)}: a UC pode acabar mais cedo, ou é preciso acertar o cronograma.`, estado: 'sobram' };
}

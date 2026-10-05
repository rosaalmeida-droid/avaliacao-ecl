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
  turmaId: string; ucId: string; nome: string; fim: string;
  total: number; dadas: number; planeadas: number; noHorario: number; diasNoHorario: number; previstas: number;
}

export function horasDaUC(turmaId: string, ucId: string, hojeISO = isoDe(new Date())): HorasDaUC | null {
  const mod: any = modulosDaTurma(turmaId).find(m => m.id === ucId) || CRONOGRAMA_2026_2027.find(m => m.id === ucId);
  const total = Number(mod?.horasPrevistas) || 0;
  if (!mod || !total || !mod.dataFim) return null;
  const planos = getPlanosAula().filter((p: any) => p.turmaId === turmaId && p.ucId === ucId && p.estado !== 'arquivado'
    && !p.eliminado && !(p.tipoEvento && TIPOS_EVENTO.includes(p.tipoAtividade)));
  const dia = (p: any) => String(p.data || '').slice(0, 10);
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
  return { turmaId, ucId, nome: mod.nome || '', fim: mod.dataFim, total, dadas, planeadas, noHorario, diasNoHorario,
    previstas: dadas + planeadas + noHorario };
}

/** As UC em curso (ou a começar nas próximas 2 semanas) da turma, com as horas. */
export function horasDasUCsEmCurso(turmaId: string, professor?: string, hojeISO = isoDe(new Date())): HorasDaUC[] {
  const daqui2 = isoDe(new Date(new Date(hojeISO + 'T00:00:00').getTime() + 14 * 86400000));
  return modulosDaTurma(turmaId)
    .filter((m: any) => m.dataFim >= hojeISO && (m.dataInicio || '') <= daqui2)
    // Só as UC do professor, e só as de cozinha (as únicas com horário na aplicação).
    .filter((m: any) => !professor || String(m.docente || '').toLowerCase().includes(String(professor).toLowerCase().split(' ')[0]))
    .filter((m: any) => /cozinha/i.test(String(m.disciplina || '')) && !!horarioDaTurma(turmaId))
    .map((m: any) => horasDaUC(turmaId, m.id, hojeISO))
    .filter((x): x is HorasDaUC => !!x);
}

const fmt = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
const dataPT = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' });

/** A frase para o professor, e se está tudo certo, faltam horas ou sobram. */
export function fraseDasHorasDaUC(h: HorasDaUC): { frase: string; estado: 'certo' | 'faltam' | 'sobram' } {
  const partes: string[] = [`Já deu ${fmt(h.dadas)} das ${fmt(h.total)} horas.`];
  if (h.planeadas) partes.push(`Tem planos de aula para os próximos dias com ${fmt(h.planeadas)} horas.`);
  if (h.noHorario) partes.push(`Até ${dataPT(h.fim)}, o horário da turma tem mais ${h.diasNoHorario} dia${h.diasNoHorario === 1 ? '' : 's'} de aula sem plano, com ${fmt(h.noHorario)} horas.`);
  else partes.push(`Até ${dataPT(h.fim)}, o horário da turma não tem mais dias de aula sem plano.`);
  const dif = Math.round((h.previstas - h.total) * 10) / 10;
  if (Math.abs(dif) < 0.5) return { frase: partes.join(' ') + ' As horas chegam certas.', estado: 'certo' };
  if (dif < 0) return { frase: partes.join(' ') + ` Faltam ${fmt(-dif)} horas para chegar às ${fmt(h.total)}: é preciso acertar o cronograma ou marcar mais planos de aula.`, estado: 'faltam' };
  return { frase: partes.join(' ') + ` Passa das ${fmt(h.total)} horas em ${fmt(dif)} horas: pode acabar a UC mais cedo ou acertar o cronograma.`, estado: 'sobram' };
}

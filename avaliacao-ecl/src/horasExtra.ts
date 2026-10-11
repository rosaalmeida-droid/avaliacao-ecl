// ============================================================
// Registo das horas em atividades extra, fora do horário da turma
// (Rosa, 7/out/2026: «tenho de criar registo do número de horas que os
// alunos fazem em atividades extra, dentro dos dias da semana fora do
// horário normal da turma, à noite e ao fim de semana; vou usar isso mais
// tarde»).
// ============================================================
// Conta-se cada atividade extra (evento, concurso, visita, catering) que é
// um plano da turma: as horas de início e de fim do plano, menos o que
// coincide com o horário de cozinha da turma nesse dia. Separa-se a parte
// da noite (depois das 19:00) e o fim de semana. Só contam os alunos que o
// professor confirmou que foram («Confirmar quem participou»); antes disso
// a atividade aparece como «por confirmar».
// ============================================================
import { getPlanosAula, getPresencas, participantesDoEvento } from './backend';
import { blocosNoDia } from './horarios';

export const INICIO_NOITE = 19 * 60;   // 19:00

export interface LinhaHorasExtra {
  planoId: string;
  data: string;            // AAAA-MM-DD
  diaSemana: string;       // «sábado»
  titulo: string;
  tipo: string;            // evento, concurso…
  horario: string;         // «19:00–23:00»
  /** Horas fora do horário da turma (com a noite e o fim de semana incluídos). */
  horas: number;
  noite: number;
  fimDeSemana: number;
  quando: 'Fim de semana' | 'Noite' | 'Dia de semana, fora do horário';
  confirmado: boolean;
}

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const min = (h?: string) => {
  if (!h) return NaN;
  const s = h.includes('T') ? new Date(h).toTimeString().slice(0, 5) : String(h).slice(0, 5);
  const [a, b] = s.split(':').map(Number);
  return a * 60 + b;
};
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Minutos de [a, b] que ficam fora dos intervalos dados. */
function foraDe(a: number, b: number, intervalos: [number, number][]): number {
  let livre = b - a;
  for (const [x, y] of intervalos) livre -= Math.max(0, Math.min(b, y) - Math.max(a, x));
  return Math.max(0, livre);
}

/** As linhas de uma atividade (sem aluno): horas fora do horário, noite e fim de semana. */
function contaDaAtividade(p: any): Omit<LinhaHorasExtra, 'confirmado'> | null {
  const data = String(p.data || '').slice(0, 10);
  const ini = min(p.horaInicio), fim0 = min(p.horaFim);
  if (!data || isNaN(ini) || isNaN(fim0)) return null;
  const fim = fim0 <= ini ? fim0 + 24 * 60 : fim0;   // passa da meia-noite
  const dia = new Date(data + 'T00:00:00').getDay();
  const fds = dia === 0 || dia === 6;
  const aulas: [number, number][] = fds ? [] : blocosNoDia(p.turmaId, data).map(b => [min(b.inicio), min(b.fim)] as [number, number]);
  const foraMin = foraDe(ini, fim, aulas);
  if (foraMin <= 0) return null;
  // A noite: depois das 19:00 (e antes das 7:00 do dia seguinte), fora das aulas.
  const noiteMin = fds ? 0 : foraDe(Math.max(ini, INICIO_NOITE), Math.max(fim, INICIO_NOITE), aulas);
  const hm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return {
    planoId: p.id, data, diaSemana: DIAS[dia], titulo: String(p.titulo || 'Atividade').replace(/^Atividade fora da escola — /, ''),
    tipo: String(p.tipoEvento || 'atividade'), horario: `${hm(ini)}–${hm(fim)}`,
    horas: r2(foraMin / 60), noite: r2(noiteMin / 60), fimDeSemana: fds ? r2(foraMin / 60) : 0,
    quando: fds ? 'Fim de semana' : noiteMin > 0 ? 'Noite' : 'Dia de semana, fora do horário',
  };
}

/** As atividades extra já feitas pela turma (as que têm horas fora do horário). */
function atividadesDaTurma(turmaId: string): any[] {
  const hoje = new Date().toISOString().slice(0, 10);
  return getPlanosAula().filter((p: any) => p.turmaId === turmaId && p.tipoEvento && p.estado !== 'arquivado' && !p.eliminado
    && String(p.data || '').slice(0, 10) <= hoje);
}

/** As horas extra de um aluno, por atividade (a mais recente primeiro). */
export function horasExtraDoAluno(alunoId: string, turmaId: string): LinhaHorasExtra[] {
  const faltou = new Set(getPresencas().filter((r: any) => r.alunoId === alunoId && r.decisaoProfessor === 'falta_presenca').map((r: any) => r.planoAulaId));
  return atividadesDaTurma(turmaId)
    .filter(p => participantesDoEvento(p).includes(alunoId) && !faltou.has(p.id))
    .map(p => { const c = contaDaAtividade(p); return c ? { ...c, confirmado: !!p.participantesConfirmadosEm } : null; })
    .filter((x): x is LinhaHorasExtra => !!x)
    .sort((a, b) => b.data.localeCompare(a.data));
}

/** Os totais (só as atividades em que o professor confirmou a participação). */
export function totaisHorasExtra(linhas: LinhaHorasExtra[]) {
  const ok = linhas.filter(l => l.confirmado);
  const soma = (k: 'horas' | 'noite' | 'fimDeSemana') => r2(ok.reduce((s, l) => s + l[k], 0));
  return { horas: soma('horas'), noite: soma('noite'), fimDeSemana: soma('fimDeSemana'), atividades: ok.length,
    porConfirmar: linhas.length - ok.length };
}

/** «3,5 h» */
export const horasTxt = (n: number) => `${String(r2(n)).replace('.', ',')} h`;

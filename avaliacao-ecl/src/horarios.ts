// ============================================================
// Horários das turmas — só as aulas de cozinha
// ============================================================
// A aplicação não sabia quando é que cada turma tem cozinha. O professor
// abria o calendário e todos os dias pareciam iguais; podia marcar uma
// aula prática para uma quinta-feira em que a turma tem Matemática.
//
// Aqui ficam só os blocos de Serviços de Cozinha-Pastelaria (SCP) — as
// outras disciplinas não interessam a esta aplicação.
//
// Fonte: horários oficiais da ECL, ano letivo 2026/27.
// ============================================================

export interface BlocoAula {
  /** 1 = segunda … 5 = sexta. */
  dia: 1 | 2 | 3 | 4 | 5;
  inicio: string;   // 'HH:MM'
  fim: string;
  sala?: string;
  /** A hora de almoço da turma neste dia, quando não é a habitual (13:00–14:00). */
  almoco?: { inicio: string; fim: string };
}

export interface HorarioTurma {
  turmaId: string;
  /** Primeiro dia de aulas do ano letivo. */
  inicioAulas: string;
  blocos: BlocoAula[];
}

export const HORARIOS: HorarioTurma[] = [
  {
    // Técnico de Cozinha e Restauração — turma nova de 2026/2029.
    turmaId: '1º BCR',
    inicioAulas: '2026-09-21',
    blocos: [
      // Terça-feira, das 08:30 às 15:30 (Rosa, 5/out/2026: estava até às
      // 17:30, mas à terça a turma só tem aulas até às 15:30).
      // Almoço das 12:00 às 13:00 (Rosa, 7/out/2026).
      { dia: 2, inicio: '08:30', fim: '15:30', almoco: { inicio: '12:00', fim: '13:00' } },
    ],
  },
  {
    // Cozinha e Restauração — a outra turma do 1º ano.
    turmaId: '1º ACR',
    inicioAulas: '2026-09-21',
    blocos: [
      // Quinta-feira, à tarde.
      { dia: 4, inicio: '14:00', fim: '17:00' },
    ],
  },
  {
    turmaId: '2º ACP',
    inicioAulas: '2026-09-21',
    blocos: [
      // Quarta-feira: o dia inteiro. Os dois blocos do horário — manhã
      // e tarde — são um plano de aula só, porque um plano é o conjunto
      // de horas seguidas que se dá no mesmo dia.
      { dia: 3, inicio: '08:30', fim: '17:30', sala: 'TCC' },
    ],
  },
  {
    turmaId: '3º ACP',
    inicioAulas: '2026-09-21',
    blocos: [
      // Três dias, com durações diferentes. A sexta é o dia longo.
      { dia: 1, inicio: '08:30', fim: '09:30' },   // segunda
      { dia: 4, inicio: '10:30', fim: '12:00' },   // quinta
      { dia: 5, inicio: '08:30', fim: '16:00' },   // sexta
    ],
  },
];

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/** O horário de uma turma, se estiver registado. */
export function horarioDaTurma(turmaId: string): HorarioTurma | undefined {
  return HORARIOS.find(h => h.turmaId === turmaId);
}

/** Os blocos de cozinha de uma turma naquele dia. Vazio se não houver. */
export function blocosNoDia(turmaId: string, dataISO: string): BlocoAula[] {
  const h = horarioDaTurma(turmaId);
  if (!h) return [];

  // Antes do início do ano letivo não há aulas nenhumas.
  if (dataISO < h.inicioAulas) return [];

  const d = new Date(dataISO + 'T00:00:00');
  if (isNaN(d.getTime())) return [];
  const dia = d.getDay();

  return h.blocos.filter(b => b.dia === dia);
}

/** A hora de almoço da turma nesse dia, quando o horário a define. */
export function almocoNoDia(turmaId: string, dataISO: string): { inicio: string; fim: string } | undefined {
  return blocosNoDia(turmaId, dataISO).find(b => b.almoco)?.almoco;
}

/** Há cozinha nesta turma neste dia? */
export function temCozinha(turmaId: string, dataISO: string): boolean {
  return blocosNoDia(turmaId, dataISO).length > 0;
}

/**
 * O que dizer ao professor sobre este dia.
 * '' quando o dia é normal e não há nada a assinalar.
 */
export function avisoDoDia(turmaId: string, dataISO: string): string {
  const h = horarioDaTurma(turmaId);
  if (!h) return '';

  if (dataISO < h.inicioAulas) {
    const d = new Date(h.inicioAulas + 'T00:00:00');
    return 'As aulas só começam a '
      + d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' }) + '.';
  }

  const blocos = blocosNoDia(turmaId, dataISO);
  if (blocos.length > 0) return '';   // dia normal de cozinha

  const d = new Date(dataISO + 'T00:00:00');
  const dia = d.getDay();
  if (dia === 0 || dia === 6) return 'Fim de semana.';

  // Dias em que a turma tem aulas, mas não de cozinha.
  const diasDeCozinha = [...new Set(h.blocos.map(b => b.dia))]
    .sort()
    .map(n => DIAS[n]);
  return `${DIAS[dia].charAt(0).toUpperCase() + DIAS[dia].slice(1)} não é dia de cozinha `
    + `nesta turma — as aulas são à ${diasDeCozinha.join(' e à ')}.`;
}

/** As horas sugeridas para uma aula neste dia. */
export function horasSugeridas(turmaId: string, dataISO: string):
  { inicio: string; fim: string } | undefined {
  const blocos = blocosNoDia(turmaId, dataISO);
  if (!blocos.length) return undefined;
  // Do início do primeiro bloco ao fim do último: um plano de aula é o
  // conjunto de horas seguidas que se dá no mesmo dia.
  return { inicio: blocos[0].inicio, fim: blocos[blocos.length - 1].fim };
}

/** O dia de aula de cozinha mais próximo, a contar de hoje (inclusive). */
export function proximoDiaDeAula(turmaId: string, desdeISO: string): string | undefined {
  const h = horarioDaTurma(turmaId);
  if (!h) return undefined;
  const d = new Date((desdeISO < h.inicioAulas ? h.inicioAulas : desdeISO) + 'T00:00:00');
  if (isNaN(d.getTime())) return undefined;
  for (let i = 0; i < 7; i++) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (temCozinha(turmaId, iso)) return iso;
    d.setDate(d.getDate() + 1);
  }
  return undefined;
}

/** O horário da turma numa linha: "segunda 08:30–09:30 · sexta 08:30–16:00". */
export function horarioEmTexto(turmaId: string): string {
  const h = horarioDaTurma(turmaId);
  if (!h) return '';
  return h.blocos.map(b => `${DIAS[b.dia]} ${b.inicio}–${b.fim}`).join(' · ');
}

/**
 * Plano de aula num dia da semana em que a turma não tem aulas (Rosa,
 * 5/out/2026: «uma aula do dia 24, que os alunos não tiveram e nunca vão ter
 * numa quinta-feira»). Não conta como aula dada, nem nas horas, nem na
 * numeração, enquanto o professor não confirmar que houve aula nesse dia.
 * Os eventos e as atividades podem ser em qualquer dia.
 */
export function planoNumDiaSemAulas(p: any): boolean {
  if (!p || p.tipoEvento) return false;
  const dia = String(p.data || '').slice(0, 10);
  const h = horarioDaTurma(p.turmaId);
  if (!h || !dia || dia < h.inicioAulas) return false;
  if (p.diaSemAulasOk === dia) return false;
  return blocosNoDia(p.turmaId, dia).length === 0;
}

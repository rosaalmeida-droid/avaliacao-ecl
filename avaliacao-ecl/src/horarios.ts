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
      // Terça-feira, o dia inteiro.
      { dia: 2, inicio: '08:30', fim: '17:30' },
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

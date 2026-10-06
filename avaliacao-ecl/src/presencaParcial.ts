// ============================================================
// O aluno esteve só parte da aula — perguntas para perceber o que isso fez
// ao grupo e à confiança (Rosa, 6/out/2026)
// ============================================================
// «As perguntas têm de existir para o aluno perceber e, ao detetar que está
// errado, …». Sem respostas escritas. Quando escolhe uma resposta errada, a
// aplicação explica porquê e o aluno escolhe outra vez. As respostas nunca
// sobem a nota. A nota da aula desce pelos tempos em que não esteve
// («são 3 blocos, desce 1/3» por cada um: esteve 1 de 3, conta 1/3).
// O compromisso escolhe-se de uma lista e verifica-se na aula seguinte.
// ============================================================
import type { PlanoAula } from './types';
import { getPresencas, getPlanosAula, getSelecoes, partesDaAulaDoAluno, blocosDeHoraDoPlano, horasDosBlocos, horasDoPlano } from './backend';

export interface OpcaoPresenca { t: string; certa: boolean; porque?: string }
export interface PerguntaPresenca { id: string; pergunta: (esteve: string, total: string) => string; opcoes: OpcaoPresenca[] }

// As perguntas são as da Rosa (6/out/2026): diretas, «percebes que…».
export const PERGUNTAS_PRESENCA: PerguntaPresenca[] = [
  { id: 'afeta', pergunta: () => 'Percebes que o teu comportamento, quando faltas ou chegas tarde, afeta o teu grupo, a turma, a organização das aulas e a organização dos eventos?', opcoes: [
    { t: 'Sim, percebo.', certa: true },
    { t: 'Não. Só me afeta a mim.', certa: false,
      porque: 'Não é só a ti. O grupo divide o trabalho a contar contigo, o professor organiza a aula e os eventos a contar com quem lá está. Quando faltas, todos têm de mudar o que estava combinado.' },
    { t: 'Não sei.', certa: false,
      porque: 'Pensa no teu grupo hoje: alguém teve de fazer a tua parte, ou ela ficou por fazer. É assim que a tua falta afeta os outros.' },
  ] },
  { id: 'confianca', pergunta: () => 'Percebes que a confiança também se perde quando um aluno falta ou chega tarde?', opcoes: [
    { t: 'Sim, percebo.', certa: true },
    { t: 'Não. Se eu fizer bem o meu trabalho, confiam em mim.', certa: false,
      porque: 'Fazer bem é importante, mas não chega. Numa cozinha, confia-se em quem está lá à hora e o turno todo. Quem falta deixa os outros sem saber se podem contar com ele.' },
    { t: 'Não. Uma falta não muda nada.', certa: false,
      porque: 'Muda. Cada falta faz o grupo e o professor contarem menos contigo da próxima vez. A confiança ganha-se devagar e perde-se depressa.' },
  ] },
  { id: 'avaliacao', pergunta: () => 'Consideras que os alunos que estão menos presentes nas aulas devem ter uma avaliação mais baixa do que os alunos que estão presentes?', opcoes: [
    { t: 'Sim. Quem está presente faz mais e mostra mais.', certa: true },
    { t: 'Não. Deve ser igual para todos.', certa: false,
      porque: 'A avaliação é sobre o que fazes nas aulas. Quem não está não faz nem mostra o que sabe, e deixa o trabalho para os colegas. Não seria justo para quem esteve a aula toda ter a mesma nota.' },
  ] },
];

export const COMPROMISSOS = [
  { id: 'hora', t: 'Chegar à hora e ficar a aula toda.' },
  { id: 'avisar', t: 'Se não puder vir, avisar antes o professor e o grupo.' },
] as const;
export type IdCompromisso = typeof COMPROMISSOS[number]['id'];

export interface RespostaPresenca { id: string; primeira: number; final: number }
export interface ReflexaoPresenca { esteve: number; total: number; blocosEsteve: number; blocosTotal: number; respostas: RespostaPresenca[]; compromisso?: IdCompromisso }

const fmtH = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
export { fmtH as horasEmTexto };

/**
 * As horas e os tempos (blocos) em que o aluno esteve nesta aula, quando não
 * esteve a aula toda: do professor («Só algumas horas») ou, sem isso, da hora
 * a que entrou (perdeu pelo menos um tempo). null quando esteve a aula toda.
 */
export function horasDoAlunoNaAula(alunoId: string, planoAulaId: string):
  { esteve: number; total: number; blocosEsteve: number; blocosTotal: number } | null {
  const p = getPlanosAula().find(x => x.id === planoAulaId);
  if (!p) return null;
  const blocos = blocosDeHoraDoPlano(p);
  const pa = partesDaAulaDoAluno(alunoId, planoAulaId);
  if (pa && pa.horasAula > 0 && pa.horasEsteve < pa.horasAula)
    return { esteve: pa.horasEsteve, total: pa.horasAula, blocosEsteve: pa.esteve.length, blocosTotal: blocos.length };
  const r: any = getPresencas().find(x => x.alunoId === alunoId && x.planoAulaId === planoAulaId);
  if (!r?.presente || !r.horaEntrada) return null;
  if (r.decisaoProfessor && r.decisaoProfessor !== 'falta_atraso') return null;   // o professor decidiu outra coisa
  const min = (h: string) => { const [a, b] = String(h).slice(0, 5).split(':').map(Number); return a * 60 + b; };
  const entrada = min(r.horaEntrada);
  if (isNaN(entrada)) return null;
  // Um tempo conta como perdido se o aluno entrou mais de 30 minutos depois de ele começar.
  const esteveEm = blocos.filter(b => entrada <= min(b.inicio) + 30).map(b => b.inicio);
  if (!blocos.length || !esteveEm.length || esteveEm.length === blocos.length) return null;
  const total = horasDoPlano(p);
  const esteve = horasDosBlocos(p, esteveEm);
  return total > 0 && esteve < total
    ? { esteve: Math.round(esteve * 100) / 100, total: Math.round(total * 100) / 100, blocosEsteve: esteveEm.length, blocosTotal: blocos.length }
    : null;
}

/** O compromisso da aula anterior em que o aluno não esteve a aula toda, e se o cumpriu nesta. */
export function compromissoPorCumprir(alunoId: string, plano: PlanoAula): { data: string; compromisso: IdCompromisso; cumpriu: boolean | null } | null {
  const anteriores = getSelecoes()
    .filter((s: any) => s.alunoId === alunoId && s.planoAulaId !== plano.id && s.reflexaoPresenca?.compromisso)
    .map((s: any) => ({ s, p: getPlanosAula().find(x => x.id === s.planoAulaId) }))
    .filter(x => x.p && x.p.turmaId === plano.turmaId && String(x.p.data) < String(plano.data))
    .sort((a, b) => String(b.p!.data).localeCompare(String(a.p!.data)));
  const ult = anteriores[0];
  if (!ult) return null;
  const compromisso = (ult.s as any).reflexaoPresenca.compromisso as IdCompromisso;
  const r: any = getPresencas().find(x => x.alunoId === alunoId && x.planoAulaId === plano.id);
  let cumpriu: boolean | null = null;
  if (compromisso === 'hora') {
    if (!r) cumpriu = null;                       // ainda não há presença: não se sabe
    else cumpriu = !!r.presente && !r.atrasado && !horasDoAlunoNaAula(alunoId, plano.id);
  }
  return { data: String(ult.p!.data).slice(0, 10), compromisso, cumpriu };
}

export const textoCompromisso = (id?: string) => COMPROMISSOS.find(c => c.id === id)?.t || '';

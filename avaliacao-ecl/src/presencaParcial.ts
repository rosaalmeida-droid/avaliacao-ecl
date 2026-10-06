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

export const PERGUNTAS_PRESENCA: PerguntaPresenca[] = [
  { id: 'quem', pergunta: () => 'Enquanto não estavas, quem fez a tua parte do trabalho?', opcoes: [
    { t: 'Ninguém precisou: não fiz falta.', certa: false,
      porque: 'Numa cozinha, cada pessoa tem uma parte do trabalho. Quando faltas, essa parte não desaparece: ou alguém a faz por ti, ou fica por fazer e atrasa o serviço.' },
    { t: 'Os colegas do grupo fizeram-na por mim.', certa: true },
    { t: 'Ficou por fazer, e o grupo atrasou-se.', certa: true },
  ] },
  { id: 'grupo', pergunta: () => 'O que achas que o teu grupo sentiu?', opcoes: [
    { t: 'Nada. Não fez diferença.', certa: false,
      porque: 'Fez diferença. Os teus colegas contavam contigo para dividir o trabalho e tiveram de fazer mais, ou de mudar o que tinham combinado.' },
    { t: 'Ficaram com mais trabalho.', certa: true },
    { t: 'Ficaram sem saber se podiam contar comigo.', certa: true },
  ] },
  { id: 'confianca', pergunta: (esteve, total) => `Numa cozinha a sério, o chefe confiava num cozinheiro que só está ${esteve} das ${total} horas do turno?`, opcoes: [
    { t: 'Sim, desde que faça bem o que faz.', certa: false,
      porque: 'Fazer bem é importante, mas não chega. Numa brigada, o chefe precisa de saber que cada pessoa está lá à hora e o turno todo. Sem isso, não consegue organizar o serviço, por melhor que a pessoa cozinhe.' },
    { t: 'Talvez, se avisasse antes.', certa: false,
      porque: 'Avisar ajuda, mas o chefe continua sem essa pessoa no turno. A confiança ganha-se estando lá, à hora, de forma regular.' },
    { t: 'Não. Primeiro eu tinha de mostrar que se pode contar comigo.', certa: true },
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

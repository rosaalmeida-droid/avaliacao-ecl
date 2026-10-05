// ============================================================
// Calendário escolar da ECL 2026/27 (Rosa, 5/out/2026)
// ============================================================
// Os dias sem aulas (feriados nacionais e de Lisboa, interrupções letivas e
// o fim das aulas) e a agenda da escola. Nos dias sem aulas não se cria um
// plano de aula; uma atividade (evento, concurso, visita) cria-se na mesma.
// A agenda serve para lembrar o professor do que vem aí.
// ============================================================

export interface DiaMarcado { inicio: string; fim: string; nome: string; tipo: 'feriado' | 'interrupcao' | 'agenda' }

/** Feriados nacionais e o de Lisboa (Santo António). */
export const FERIADOS: DiaMarcado[] = [
  ['2026-10-05', 'Feriado: Implantação da República'],
  ['2026-11-01', 'Feriado: Todos os Santos'],
  ['2026-12-01', 'Feriado: Restauração da Independência'],
  ['2026-12-08', 'Feriado: Imaculada Conceição'],
  ['2026-12-25', 'Feriado: Natal'],
  ['2027-01-01', 'Feriado: Ano Novo'],
  ['2027-03-26', 'Feriado: Sexta-feira Santa'],
  ['2027-03-28', 'Feriado: Páscoa'],
  ['2027-04-25', 'Feriado: Dia da Liberdade'],
  ['2027-05-01', 'Feriado: Dia do Trabalhador'],
  ['2027-05-27', 'Feriado: Corpo de Deus'],
  ['2027-06-10', 'Feriado: Dia de Portugal'],
  ['2027-06-13', 'Feriado de Lisboa: Santo António'],
].map(([d, nome]) => ({ inicio: d, fim: d, nome, tipo: 'feriado' as const }));

/** Interrupções letivas do calendário escolar da ECL (sem aulas). */
export const INTERRUPCOES: DiaMarcado[] = [
  ['2026-10-30', '2026-10-30', 'Interrupção letiva: Conselhos de Turma Intercalares'],
  ['2026-12-16', '2027-01-01', 'Férias de Natal'],
  ['2027-01-15', '2027-01-15', 'Interrupção letiva: Reflexão Pedagógica'],
  ['2027-02-08', '2027-02-10', 'Interrupção do Carnaval'],
  ['2027-03-22', '2027-03-29', 'Férias da Páscoa'],
  ['2027-06-02', '2027-08-31', 'Fim das aulas: Formação em Contexto de Trabalho (FCT) e férias'],
].map(([inicio, fim, nome]) => ({ inicio, fim, nome, tipo: 'interrupcao' as const }));

/** Dias sem aulas só de uma turma (o outdoor de cada turma do 1.º ano, por
 *  exemplo). A 1.º BCR fez o outdoor a 29/09/2026 (Rosa, 5/out/2026). */
export const DIAS_DA_TURMA: Record<string, DiaMarcado[]> = {
  '1º BCR': [{ inicio: '2026-09-29', fim: '2026-09-29', nome: 'Outdoor da turma (sem aulas de cozinha)', tipo: 'interrupcao' }],
};

/** A agenda da escola: não tira aulas, mas convém lembrar. */
export const AGENDA: DiaMarcado[] = [
  ['2026-09-21', '2026-10-09', 'Período dos outdoors dos 1.º anos (cada turma faz o seu num só dia)'],
  ['2026-09-30', '2026-09-30', 'Fórum de Encarregados de Educação (Cursos Profissionais, 1.º ano, 18h; CEF, 18h30)'],
  ['2026-10-01', '2026-10-01', 'Fórum de Encarregados de Educação (2.º e 3.º anos: Profissionais 18h, Aprendizagem 19h)'],
  ['2026-10-01', '2026-10-02', 'Outdoors (CEF)'],
  ['2026-10-12', '2026-10-12', 'Início dos 1.º anos dos Cursos de Aprendizagem (a confirmar)'],
  ['2026-10-12', '2026-10-16', 'Conversas com o Orientador Profissional Júnior; questionários EMaEI'],
  ['2026-10-16', '2026-10-16', 'Aula Inaugural'],
  ['2026-10-19', '2026-10-23', 'Conversas com o Orientador Profissional Sénior'],
  ['2026-10-19', '2026-10-30', 'Conselhos de Turma Intercalares'],
  ['2026-10-20', '2026-10-20', 'Fórum de Encarregados de Educação (Aprendizagem, 1.º ano, 18h30)'],
  ['2026-10-21', '2026-10-23', 'EfVET «Global Citizenship Empowered by VET», Bruxelas'],
  ['2026-11-11', '2026-11-11', 'Sessão UACS'],
  ['2026-11-13', '2026-12-21', 'Rossio Xmas Market (ADBP)'],
  ['2026-11-18', '2026-11-18', 'Fórum dos Alunos, 10h30'],
  ['2026-11-24', '2026-11-26', '9.º Fórum Global da OCDE (a confirmar)'],
  ['2026-11-30', '2026-12-04', '1.º questionário aos alunos e docentes'],
  ['2026-12-11', '2026-12-11', 'Convívio de Natal, 18h30'],
  ['2026-12-15', '2026-12-15', 'Fim do 1.º trimestre'],
  ['2026-12-16', '2026-12-21', 'Conselhos de Turma de Avaliação'],
  ['2027-01-04', '2027-01-15', 'Recuperações de módulos em atraso'],
  ['2027-01-11', '2027-01-14', 'Fórum de Encarregados de Educação'],
  ['2027-01-22', '2027-01-22', 'Conselho Consultivo, 9h'],
  ['2027-03-08', '2027-03-12', 'Questionários EMaEI aos alunos'],
  ['2027-03-17', '2027-03-20', 'Futurália'],
  ['2027-03-19', '2027-03-19', 'Fim do 2.º trimestre'],
  ['2027-03-30', '2027-04-09', 'Recuperações de módulos em atraso'],
  ['2027-04-05', '2027-04-08', 'Fórum de Encarregados de Educação'],
  ['2027-04-09', '2027-04-09', 'Dia Aberto'],
  ['2027-05-03', '2027-05-08', 'Mobilidades de grupo Erasmus+ (a confirmar)'],
  ['2027-05-10', '2027-05-14', '2.º questionário de satisfação aos alunos e docentes'],
  ['2027-05-12', '2027-06-01', 'Provas de Aptidão Profissional'],
  ['2027-06-01', '2027-06-01', 'Fim do 3.º trimestre (último dia de aulas)'],
].map(([inicio, fim, nome]) => ({ inicio, fim, nome, tipo: 'agenda' as const }));

const entre = (iso: string, x: DiaMarcado) => iso >= x.inicio && iso <= x.fim;

/** O dia não tem aulas (feriado ou interrupção)? Devolve o motivo, ou null. */
export function diaSemAulas(iso: string, turmaId?: string): DiaMarcado | null {
  const d = String(iso || '').slice(0, 10);
  if (!d) return null;
  return FERIADOS.find(x => entre(d, x)) || INTERRUPCOES.find(x => entre(d, x))
    || (turmaId ? (DIAS_DA_TURMA[turmaId] || []).find(x => entre(d, x)) : undefined) || null;
}

/** O que a agenda tem neste dia. */
// Os períodos longos (outdoors, mercado de Natal, recuperações) não aparecem
// em cada dia: davam a ideia de que todas as terças eram de outdoor (Rosa,
// 5/out/2026). Aparecem só em «o que vem aí».
export function agendaDoDia(iso: string): DiaMarcado[] {
  const d = String(iso || '').slice(0, 10);
  const dias = (x: DiaMarcado) => (new Date(x.fim + 'T00:00:00').getTime() - new Date(x.inicio + 'T00:00:00').getTime()) / 86400000 + 1;
  return AGENDA.filter(x => entre(d, x) && dias(x) <= 5);
}

/** O que vem aí nos próximos dias (feriados, interrupções e agenda), por ordem. */
export function proximosDoCalendario(hojeISO: string, dias = 21): (DiaMarcado & { faltam: number })[] {
  const h = new Date(hojeISO + 'T00:00:00').getTime();
  return [...FERIADOS, ...INTERRUPCOES, ...AGENDA]
    .map(x => ({ ...x, faltam: Math.round((new Date(x.inicio + 'T00:00:00').getTime() - h) / 86400000) }))
    // O que já começou e ainda não acabou também aparece; os feriados ao fim
    // de semana não (não tiram aulas).
    .filter(x => x.fim >= hojeISO && x.faltam <= dias
      && !(x.tipo === 'feriado' && [0, 6].includes(new Date(x.inicio + 'T00:00:00').getDay())))
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
}

/** «hoje», «amanhã», «daqui a 5 dias». */
export function quandoEmTexto(faltam: number): string {
  if (faltam <= 0) return 'Agora';
  if (faltam === 1) return 'Amanhã';
  return `Daqui a ${faltam} dias`;
}

/** A frase de cada coisa do calendário que vem aí, em frase inteira. */
export function fraseDoCalendario(x: DiaMarcado & { faltam: number }): string {
  const fmt = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });
  const quando = x.inicio === x.fim ? fmt(x.inicio) : `de ${fmt(x.inicio)} a ${fmt(x.fim)}`;
  const semAulas = x.tipo !== 'agenda' ? ' Não há aulas: não se pode criar um plano de aula, só atividades.' : '';
  const hoje = new Date().toISOString().slice(0, 10);
  if (x.faltam <= 0 && x.fim === hoje) return `Hoje: ${x.nome}.${semAulas}`;
  return x.faltam <= 0
    ? `A decorrer, até ${fmt(x.fim)}: ${x.nome}.${semAulas}`
    : `${quandoEmTexto(x.faltam)}, ${quando}: ${x.nome}.${semAulas}`;
}

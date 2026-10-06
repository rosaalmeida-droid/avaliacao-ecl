// ============================================================
// Evento externo criado pelo plano («Avaliar evento fora do horário»)
// ============================================================
// O plano de evento serve para avaliar os alunos; o evento em si (cliente,
// orçamento, material…) vive no ecrã Eventos. Antes criar o plano não
// criava o evento, e a professora não o encontrava em Eventos (Rosa,
// set/2026). Agora o plano cria o evento, com um código fixo — o mesmo
// em todos os aparelhos, para não haver repetidos.
import { eventoNovo } from './modelo';
import { gravarEvento, lerEventosLocais, getPlanosAula, addOrUpdatePlanoAula, proximoNumeroEvento, proximoNumeroPlano, aulaNasMesmasHoras } from '../backend';
import { modulosAtivos, modulosDaTurma } from '../cronograma';
import { horarioDaTurma } from '../horarios';
import { atitudesSugeridasEvento } from '../eventosAvaliacao';

export const idEventoDoPlano = (planoId: string) => 'ev_plano_' + planoId;

/** Cria em Eventos o evento de um plano de evento (se ainda não existir) e liga-os. */
export function garantirEventoDoPlano(plano: any, professor = ''): string | null {
  if (!plano || plano.tipoEvento !== 'evento') return null;
  // «Outra atividade» (visita, feira…) não tem catering: fica só o plano.
  if (plano.tipoAtividade === 'Atividade fora da escola') return null;
  const existentes = lerEventosLocais<any>();
  if (plano.eventoId && existentes.some(e => e.id === plano.eventoId)) return plano.eventoId;
  const id = plano.eventoId || idEventoDoPlano(plano.id);
  if (!existentes.some(e => e.id === id)) {
    const hoje = new Date().toISOString().slice(0, 10);
    const ev = {
      ...eventoNovo(proximoNumeroEvento(), professor || plano.professor || ''),
      id, nome: plano.titulo || 'Evento', data: String(plano.data || '').slice(0, 10),
      horaInicio: plano.horaInicio || '', horaFim: plano.horaFim || '',
      turmasIds: [plano.turmaId], turmaResponsavel: plano.turmaId,
      estado: String(plano.data || '') < hoje ? 'realizado' : 'confirmado',
    };
    gravarEvento(ev);
  }
  return id;
}

/** Os planos de evento já criados sem evento: aparecem em Eventos. */
export function eventosDosPlanosEmFalta(): number {
  let n = 0;
  for (const p of getPlanosAula() as any[]) {
    // Só os que não têm evento nenhum: um plano ligado a um evento que ainda
    // não chegou a este aparelho não se mexe (senão criava-se um por cima).
    if (p.tipoEvento !== 'evento' || p.estado === 'arquivado' || p.eventoId || p.tipoAtividade === 'Atividade fora da escola') continue;
    const id = garantirEventoDoPlano(p);
    if (id && p.eventoId !== id) addOrUpdatePlanoAula({ ...p, eventoId: id, atualizadoEm: new Date().toISOString() });
    n++;
  }
  return n;
}

/** Os planos de avaliação ligados a este evento. */
export function planosDoEvento(eventoId: string): any[] {
  return (getPlanosAula() as any[]).filter(p => p.eventoId === eventoId && p.estado !== 'arquivado');
}

/**
 * Cria, a partir do evento, o plano onde os alunos se autoavaliam (um por
 * turma). É o mesmo que «Avaliar evento fora do horário»: atitudes do
 * evento, sem faltas, e o bónus na UC que estava a decorrer nesse dia.
 */
export function criarAvaliacaoDoEvento(ev: any, turmaId: string, modo: 'turma' | 'inscricao', professor = ''): any | null {
  // O módulo é o do professor que cria o evento nessa turma (Rosa, out/2026):
  // antes ia o primeiro a decorrer, e o evento ficava em Tecnologia Alimentar.
  const ativos = modulosAtivos(turmaId, ev.data);
  const meus = ativos.filter(m => professor && m.docente === professor);
  const ucs = meus.length ? meus : ativos.filter(m => !m.docente || !professor);
  // Sem UC a decorrer nesse dia (férias, antes do início): a próxima UC do professor nessa turma.
  if (!ucs.length && professor) {
    const proxima = modulosDaTurma(turmaId).filter(m => m.docente === professor && m.dataInicio >= String(ev.data || '').slice(0, 10))
      .sort((a, b) => a.dataInicio.localeCompare(b.dataInicio))[0];
    if (proxima) ucs.push(proxima);
  }
  const agora = new Date().toISOString();
  const dia = String(ev.data || '').slice(0, 10);
  // Regra «Quem vai?» (Rosa, out/2026): a turma toda conta sempre como aula.
  if (modo === 'turma' && ucs.length > 0) {
    // Às mesmas horas de uma aula desta turma: o evento entra nesse plano de aula
    // (nunca se cria um plano de aula a mais).
    const nasHoras = aulaNasMesmasHoras({ id: '', turmaId, data: dia, horaInicio: ev.horaInicio, horaFim: ev.horaFim }) as any;
    if (nasHoras) {
      const comEvento = { ...nasHoras, eventoNaAula: 'evento', eventoId: ev.id, avisoDeslocacao: avisoDeslocacao(ev) || undefined, atualizadoEm: agora };
      addOrUpdatePlanoAula(comEvento);
      return comEvento;
    }
    // Fora das horas da aula (depois das aulas, sábado, férias): não se cria um
    // plano de aula (Rosa, 6/out/2026). Fica a atividade, obrigatória para a
    // turma, e conta como mais uma aula, na aula desse dia ou na seguinte da UC.
    const atv: any = {
      id: `plano_ev_${ev.id}_${turmaId.replace(/\W/g, '')}`, turmaId, professor,
      data: ev.data, horaInicio: ev.horaInicio || '', horaFim: ev.horaFim || '',
      titulo: ev.nome || 'Evento', observacoes: '', fichasIds: [], estado: 'publicado',
      criadoEm: agora, atualizadoEm: agora, ucId: ucs[0].id, ucNome: ucs[0].nome || '',
      numeroPlan: proximoNumeroPlano(), tipoAtividade: 'Evento externo', tipoEvento: 'evento', tipoPlanAula: 'atitudinal',
      compAdicionadas: atitudesSugeridasEvento('Evento externo'), modoParticipacao: 'turma',
      contaAssiduidade: false, eventoId: ev.id, avisoDeslocacao: avisoDeslocacao(ev) || undefined,
    };
    addOrUpdatePlanoAula(atv);
    return atv;
  }
  const p: any = {
    id: `plano_ev_${ev.id}_${turmaId.replace(/\W/g, '')}`, turmaId, professor,
    data: ev.data, horaInicio: ev.horaInicio || '', horaFim: ev.horaFim || '',
    titulo: ev.nome || 'Evento', observacoes: '', fichasIds: [], estado: 'publicado',
    criadoEm: agora, atualizadoEm: agora, ucId: ucs[0]?.id || '', ucNome: ucs[0]?.nome || '',
    numeroPlan: proximoNumeroPlano(), tipoAtividade: 'Evento externo', tipoEvento: 'evento', tipoPlanAula: 'atitudinal',
    compAdicionadas: atitudesSugeridasEvento('Evento externo'), modoParticipacao: modo,
    contaAssiduidade: false, eventoId: ev.id, avisoDeslocacao: avisoDeslocacao(ev) || undefined,
  };
  addOrUpdatePlanoAula(p);
  return p;
}

/**
 * O evento ficou como plano de aula («a turma toda»), mas não é obrigatório
 * (Rosa, out/2026): passa a atividade extra, com inscrições. Se o evento entrou
 * na aula normal desse dia, a aula fica como estava (sem o evento) e cria-se a
 * atividade à parte; se o plano foi criado só para o evento, muda ele próprio.
 */
export function passarParaInscricoes(ev: any, plano: any, professor = ''): any | null {
  const agora = new Date().toISOString();
  if (plano.tipoEvento) {
    const p = { ...plano, modoParticipacao: 'inscricao', estado: 'publicado', atualizadoEm: agora };
    addOrUpdatePlanoAula(p);
    return p;
  }
  const criadoParaOEvento = String(plano.id || '').startsWith(`plano_ev_${ev.id}_`);
  if (criadoParaOEvento) {
    const meu = modulosAtivos(plano.turmaId, ev.data).find(m => professor && m.docente === professor);
    const p: any = { ...plano, ucId: meu?.id || '', ucNome: meu?.nome || '', tipoAtividade: 'Evento externo', tipoEvento: 'evento', tipoPlanAula: 'atitudinal',
      compAdicionadas: atitudesSugeridasEvento('Evento externo'), modoParticipacao: 'inscricao', contaAssiduidade: false,
      estado: 'publicado', atualizadoEm: agora };
    delete p.eventoNaAula; delete p.triagemAula;
    addOrUpdatePlanoAula(p);
    return p;
  }
  // A aula normal do dia: tira-se o evento dela e cria-se a atividade à parte.
  const aula: any = { ...plano, atualizadoEm: agora };
  delete aula.eventoNaAula; delete aula.eventoId;
  addOrUpdatePlanoAula(aula);
  return criarAvaliacaoDoEvento(ev, plano.turmaId, 'inscricao', professor);
}

/** O que o aluno tem de saber antes de se inscrever: vai ter de se deslocar (Rosa, out/2026). */
export function avisoDeslocacao(ev: any): string {
  const morada = String(ev?.morada || '').trim(), partes = String(ev?.partes || '').trim();
  if (ev?.onde === 'misto') return `Atenção: parte desta atividade é fora da escola. Vais ter de te deslocar.${partes ? ` ${partes}` : ''}${morada ? ` Local fora da escola: ${morada}.` : ''}`;
  if (ev?.onde === 'fora') return `Atenção: esta atividade é fora da escola. Vais ter de te deslocar.${morada ? ` Local: ${morada}.` : ''}`;
  return '';
}
/** Mudou o local do evento: os registos das turmas (o que o aluno vê) acompanham. */
export function atualizarAvisoNosPlanos(ev: any): void {
  const aviso = avisoDeslocacao(ev);
  for (const p of planosDoEvento(ev.id)) if ((p.avisoDeslocacao || '') !== aviso) addOrUpdatePlanoAula({ ...p, avisoDeslocacao: aviso || undefined });
}

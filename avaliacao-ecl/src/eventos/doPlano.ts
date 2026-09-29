// ============================================================
// Evento externo criado pelo plano («Avaliar evento fora do horário»)
// ============================================================
// O plano de evento serve para avaliar os alunos; o evento em si (cliente,
// orçamento, material…) vive no ecrã Eventos. Antes criar o plano não
// criava o evento, e a professora não o encontrava em Eventos (Rosa,
// set/2026). Agora o plano cria o evento, com um código fixo — o mesmo
// em todos os aparelhos, para não haver repetidos.
import { eventoNovo } from './modelo';
import { gravarEvento, lerEventosLocais, getPlanosAula, addOrUpdatePlanoAula, proximoNumeroEvento, proximoNumeroPlano } from '../backend';
import { modulosAtivos } from '../cronograma';
import { atitudesSugeridasEvento } from '../eventosAvaliacao';

export const idEventoDoPlano = (planoId: string) => 'ev_plano_' + planoId;

/** Cria em Eventos o evento de um plano de evento (se ainda não existir) e liga-os. */
export function garantirEventoDoPlano(plano: any, professor = ''): string | null {
  if (!plano || plano.tipoEvento !== 'evento') return null;
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
    if (p.tipoEvento !== 'evento' || p.estado === 'arquivado' || p.eventoId) continue;
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
  const ucs = modulosAtivos(turmaId, ev.data);
  const agora = new Date().toISOString();
  const p: any = {
    id: `plano_ev_${ev.id}_${turmaId.replace(/\W/g, '')}`, turmaId, professor,
    data: ev.data, horaInicio: ev.horaInicio || '', horaFim: ev.horaFim || '',
    titulo: ev.nome || 'Evento', observacoes: '', fichasIds: [], estado: 'publicado',
    criadoEm: agora, atualizadoEm: agora, ucId: ucs[0]?.id || '', ucNome: ucs[0]?.nome || '',
    numeroPlan: proximoNumeroPlano(), tipoAtividade: 'Evento externo', tipoEvento: 'evento', tipoPlanAula: 'atitudinal',
    compAdicionadas: atitudesSugeridasEvento('Evento externo'), modoParticipacao: modo,
    contaAssiduidade: false, eventoId: ev.id,
  };
  addOrUpdatePlanoAula(p);
  return p;
}

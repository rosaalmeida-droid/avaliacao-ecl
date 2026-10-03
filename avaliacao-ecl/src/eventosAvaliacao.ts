// ============================================================
// Avaliação dos eventos e concursos (decisões da Rosa, set/2026)
// ============================================================
// Um evento ou concurso avalia-se num plano de aula próprio, com o tipo de
// actividade de evento. O aluno autoavalia-se e o professor ajusta, como
// nas aulas. O bónus na nota da UC depende dessa avaliação:
//   · Evento: +0,5 — só com farda, todas as atitudes avaliadas e a técnica
//     geral do evento em "Muito bom" (5).
//   · Concurso: +0,75 — só com farda e as 3 atitudes fixas em "Muito bom".
//     A técnica e o resultado não contam: premeia-se a coragem de ir.
//   · Sem farda, o evento não conta nada.
//   · Abaixo de 10: os eventos contam (ajudam a subir); os concursos não
//     (quem tem negativa não vai a concurso).
//   · Tetos: sem participar, 17; só eventos, 18; o 20 só com concurso.
//   · Bónus total até +2.
// ============================================================

/** Tipos de actividade do plano que são eventos (e o concurso). */
export const TIPOS_EVENTO = ['Evento externo', 'Concurso', 'Catering', 'Buffet', 'Atividade fora da escola'];

export type TipoEvento = 'evento' | 'concurso';

/** O nome que se mostra. «Atividade fora da escola» é só o nome guardado
 *  (planos antigos): a atividade pode ser na escola. Mostra-se «Atividade
 *  extra»; se é dentro ou fora da escola pergunta-se em «Onde é?» (Rosa, out/2026). */
export function nomeDoTipoAtividade(tipo?: string): string {
  return tipo === 'Atividade fora da escola' ? 'Atividade extra' : (tipo || '');
}

/** «Como é a atividade» já se sabe numa atividade extra: avaliam-se as atitudes
 *  (e as técnicas da ficha, se houver). Onde é muda-se em «Onde é?». */
export function triagemDaAtividade(tipoAtividade?: string): { tipo: 'atitudinal'; onde: 'cozinha' | 'fora'; cozinham: boolean; trabalho: 'grupos'; servico: boolean } {
  const t = tipoAtividade || '';
  return { tipo: 'atitudinal', onde: t === 'Evento externo' ? 'fora' : 'cozinha',
    cozinham: /Catering|Buffet|Evento/i.test(t), trabalho: 'grupos', servico: /Catering|Buffet|Evento externo/i.test(t) };
}

export function tipoEventoDe(tipoAtividade?: string): TipoEvento | undefined {
  if (!tipoAtividade || !TIPOS_EVENTO.includes(tipoAtividade)) return undefined;
  return tipoAtividade === 'Concurso' ? 'concurso' : 'evento';
}

/** Sempre avaliadas: chegar à hora (Responsabilidade), ficar até ao fim
 *  (Flexibilidade) e a farda (Apresentação pessoal). */
export const ATITUDES_FIXAS_EVENTO = ['ATI-001', 'ATI-012', 'ATI-003'];

/** As atitudes que a aplicação sugere para cada tipo de evento. */
export function atitudesSugeridasEvento(tipoAtividade: string): string[] {
  const extra =
    tipoAtividade === 'Concurso' ? ['ATI-019', 'ATI-005', 'ATI-004']              // autoconfiança, autocontrolo, iniciativa
    : tipoAtividade === 'Atividade fora da escola' || tipoAtividade === 'Evento externo'
      ? ['ATI-009', 'ATI-006', 'ATI-010']                                        // cooperação, assertividade, empenho
    : ['ATI-009', 'ATI-016', 'ATI-020'];                                         // catering/buffet: cooperação, higiene, postura
  return [...ATITUDES_FIXAS_EVENTO, ...extra];
}

/** A técnica geral do evento — uma só pergunta, não a avaliação das aulas. */
export const TEC_EVENTO = 'EVT-TEC';
export const NOME_TEC_EVENTO = 'Técnica no evento (geral)';

/** Pergunta ao aluno: um cenário concreto, e ele sabe que o chef também responde. */
export const OPCOES_TEC_EVENTO: { nota: number; texto: string }[] = [
  { nota: 5, texto: 'Fazia tudo igual, sem ajuda nenhuma' },
  { nota: 4, texto: 'Precisava de ajuda numa parte' },
  { nota: 3, texto: 'Precisava de ajuda em várias partes' },
  { nota: 2, texto: 'Ainda não conseguia fazer sozinho/a' },
];

export const BONUS_EVENTOS = {
  porEvento: 0.5,
  porConcurso: 0.75,
  maximo: 2,
  notaMinimaConcurso: 10,   // abaixo disto não vai a concurso
  tetoSemParticipacao: 17,   // não foi a nada
  tetoSoEventos: 18,         // o 20 só com pelo menos um concurso
  /** Concursos por pontos (Rosa, set/2026): no máximo 1 valor; a vitória vale o que falta para 1. */
  concurso: { candidatura: 0.2, participacao: 0.2, fase: 0.2, maximo: 1 },
} as const;

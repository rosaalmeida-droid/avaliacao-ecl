// ============================================================
// Transição de referencial — turmas ACP
// ============================================================
// Os alunos das turmas ACP começaram no referencial antigo. Já fizeram o
// 1º (e, no 3º ano, o 2º) ano, mas as atitudes desses anos nunca foram
// avaliadas no sistema novo.
//
// Regra, enquanto houver turmas ACP:
//   · as atitudes dos anos anteriores contam como no referencial novo;
//   · não aparecem ao aluno como "por avaliar" — ficam num grupo próprio,
//     como trabalho a apanhar, e não como falha;
//   · em cada aula o aluno escolhe DUAS atitudes: a normal, e uma segunda
//     só entre as dos anos anteriores que ainda lhe faltam;
//   · o professor pode somar +1 ao nível de uma delas quando vê o aluno
//     demonstrá-la (registo à parte, fora das notas — ver backend.ts).
//
// É temporário. A regra está ligada ao CURSO (ACP), não ao ano: os
// alunos novos entram em BCR e ficam no processo normal; quando a última
// turma ACP terminar, deixa de se aplicar sem ninguém ter de mexer.
// ============================================================

import { atitudesNovasNoAno, getAtitudeDetalhada } from './compatECL';
import { getHistoricoAlunoMicro, nivelConsolidadoAtitude } from './backend';
import type { Aluno } from './types';

/** A turma está na transição? (Curso ACP — referencial antigo.) */
export function ehTurmaTransicao(turmaId?: string): boolean {
  return /\bACP\b/i.test(turmaId || '');
}

export interface AtitudeAnterior {
  id: string;
  nome: string;
  /** Ano do referencial a que a atitude pertence. */
  ano: 1 | 2;
  /** Nível consolidado, 0 a 5 (0 = nunca avaliada nem somada). */
  nivel: number;
  /** Já foi avaliada numa aula, validada pelo professor? */
  avaliada: boolean;
}

/** As atitudes dos anos anteriores ao do aluno. Vazio fora da transição. */
export function atitudesAnteriores(aluno: Pick<Aluno, 'id' | 'turmaId' | 'ano'>): AtitudeAnterior[] {
  if (!ehTurmaTransicao(aluno.turmaId)) return [];
  const ano = (aluno.ano ?? 1) as 1 | 2 | 3;
  const saida: AtitudeAnterior[] = [];
  const vistas = new Set<string>();

  for (const a of [1, 2] as const) {
    if (a >= ano) break;
    for (const id of atitudesNovasNoAno(a)) {
      if (vistas.has(id)) continue;
      vistas.add(id);
      const avaliada = getHistoricoAlunoMicro(aluno.id, id)
        .some(r => r.validadoPor === 'professor' || r.validadoPor === 'recuperacao');
      saida.push({
        id,
        nome: getAtitudeDetalhada(id)?.nome ?? id,
        ano: a,
        nivel: nivelConsolidadoAtitude(aluno.id, id),
        avaliada,
      });
    }
  }
  return saida;
}

/** As que ainda faltam — nunca avaliadas numa aula. É daqui que sai a
 *  segunda escolha do aluno. */
export function atitudesQueFaltam(aluno: Pick<Aluno, 'id' | 'turmaId' | 'ano'>): AtitudeAnterior[] {
  return atitudesAnteriores(aluno).filter(a => !a.avaliada);
}

/** Ids das atitudes anteriores — para as tirar das listas normais. */
export function idsAtitudesAnteriores(aluno: Pick<Aluno, 'id' | 'turmaId' | 'ano'>): Set<string> {
  return new Set(atitudesAnteriores(aluno).map(a => a.id));
}

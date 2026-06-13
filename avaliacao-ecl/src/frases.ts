// ============================================================
// Índice unificado de frases de autoavaliação
// ============================================================

import { FrasesCompetencia, getFrases } from './frases_atitudes';
import { FRASES_ATITUDES } from './frases_atitudes';
import { FRASES_RESPONSABILIDADES } from './frases_responsabilidades';
import { FRASES_TECNICAS } from './frases_tecnicas_1';
import { FRASES_TECNICAS_2 } from './frases_tecnicas_2';
import { NivelAuto } from './types';

export const TODAS_FRASES: FrasesCompetencia[] = [
  ...FRASES_TECNICAS,
  ...FRASES_TECNICAS_2,
  ...FRASES_ATITUDES,
  ...FRASES_RESPONSABILIDADES,
];

const NIVEIS: NivelAuto[] = ['nao_atingi', 'desenvolvimento', 'atingi', 'superei'];

/**
 * Devolve as 4 opções (frase + nível interno) para uma competência,
 * para construir os botões/seleção na UI do aluno.
 */
export function opcoesAutoavaliacao(competenciaId: string): { nivel: NivelAuto; frase: string }[] {
  const f = getFrases(TODAS_FRASES, competenciaId);
  if (!f) return [];
  return f.frases.map((frase, i) => ({ nivel: NIVEIS[i], frase }));
}

export { getFrases };
export type { FrasesCompetencia };

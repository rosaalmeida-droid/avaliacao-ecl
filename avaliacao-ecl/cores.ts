// ============================================================
// cores.ts — Paleta de cores por turma
// Fonte única de verdade para todas as componentes da app.
//
// 1º CP — Solar    #FBC02D
// 2º CP — Roxo     #7C3AED
// 3º CP — Verde    #6B9E3A
// ============================================================

export interface CoresTurma {
  base:       string;   // cor principal (botões, cabeçalhos, badges preenchidos)
  pale:       string;   // fundo claro (chips, cards, fundo de badge)
  text:       string;   // texto sobre fundo claro
  textOnBase: string;   // texto sobre fundo base (quase sempre #fff ou escuro)
}

export const CORES_TURMA: Record<string, CoresTurma> = {
  '1º ACP': { base: '#FBC02D', pale: '#FFF3D6', text: '#5A3E00', textOnBase: '#5A3E00' },
  '2º ACP': { base: '#7C3AED', pale: '#EDE9FE', text: '#5B21B6', textOnBase: '#FFFFFF' },
  '3º ACP': { base: '#6B9E3A', pale: '#E8F5D6', text: '#4E7A25', textOnBase: '#FFFFFF' },
};

// Aliases para usar quando só se conhece o ano (1, 2 ou 3)
export const CORES_POR_ANO: Record<1 | 2 | 3, CoresTurma> = {
  1: CORES_TURMA['1º ACP'],
  2: CORES_TURMA['2º ACP'],
  3: CORES_TURMA['3º ACP'],
};

/** Devolve as cores da turma a partir do id/nome (ex: '1º ACP', '2º CP', '1 CP').
 *  Fallback para cinzento neutro se não reconhecer. */
export function coresDaTurma(turmaIdOuNome: string): CoresTurma {
  // Correspondência directa
  if (CORES_TURMA[turmaIdOuNome]) return CORES_TURMA[turmaIdOuNome];
  // Por número
  const m = (turmaIdOuNome || '').match(/[123]/);
  if (m) {
    const ano = Number(m[0]) as 1 | 2 | 3;
    if (CORES_POR_ANO[ano]) return CORES_POR_ANO[ano];
  }
  // Fallback neutro
  return { base: '#6B7280', pale: '#F3F4F6', text: '#374151', textOnBase: '#FFFFFF' };
}

// Ponte entre o sistema antigo e as novas competências atitudinais
// Re-exporta de competenciasAtitudinais.ts com os nomes esperados pelo AlunoView

export { TODAS_COMPETENCIAS as ATITUDES_22, PERMANENTES_IDS, CompAtitudinal as CompetenciaAtitudinal, getCompsPorContexto as getCompetenciasContexto, getCompAtitudinal } from './competenciasAtitudinais';
import { PERMANENTES } from './competenciasAtitudinais';

export function getCompetenciasPermanentes() { return PERMANENTES; }

export type EstadoProgressao = 'inicial' | 'em_desenvolvimento' | 'consolidado' | 'avancado';

export const ESTADO_LABEL: Record<EstadoProgressao, string> = {
  inicial: 'Inicial',
  em_desenvolvimento: 'Em desenvolvimento',
  consolidado: 'Consolidado',
  avancado: 'Avançado',
};

export const ESTADO_COR: Record<EstadoProgressao, { bg: string; color: string }> = {
  inicial: { bg: '#F1EFE8', color: '#5F5E5A' },
  em_desenvolvimento: { bg: '#E6F1FB', color: '#185FA5' },
  consolidado: { bg: '#EAF3DE', color: '#3B6D11' },
  avancado: { bg: '#FAEEDA', color: '#854F0B' },
};

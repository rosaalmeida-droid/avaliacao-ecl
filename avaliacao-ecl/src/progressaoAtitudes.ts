import {
  TODAS_COMPETENCIAS,
  PERMANENTES,
  PERMANENTES_IDS,
  getCompsPorContexto,
  getCompAtitudinal,
  CompAtitudinal,
} from './competenciasAtitudinais';

export type EstadoProgressao =
  | 'inicial'
  | 'em_desenvolvimento'
  | 'consolidado'
  | 'avancado';

export type CompetenciaAtitudinal = CompAtitudinal & {
  observar: string[];
  naoObservar: string[];
  nao_observar: string[];
  descritores: Record<EstadoProgressao, string>;
};

function adaptarComp(comp: CompAtitudinal): CompetenciaAtitudinal {
  const c = comp as any;

  return {
    ...comp,
    observar: c.observar || c.o_que_observar || [],
    naoObservar: c.naoObservar || c.nao_observar || [],
    nao_observar: c.nao_observar || c.naoObservar || [],
    descritores: c.descritores || {
      inicial: 'Necessito de muita orientação.',
      em_desenvolvimento: 'Consigo cumprir parcialmente, com alguma ajuda.',
      consolidado: 'Cumpro de forma autónoma e consistente.',
      avancado: 'Supero o esperado e ajudo a melhorar o trabalho.',
    },
  };
}

export const ATITUDES_22: CompetenciaAtitudinal[] =
  TODAS_COMPETENCIAS.map(adaptarComp);

export function getCompetenciasPermanentes(): CompetenciaAtitudinal[] {
  return PERMANENTES.map(adaptarComp);
}

export function getCompetenciasContexto(
  contexto: 'individual' | 'equipa' | 'servico' | 'coordenacao'
): CompetenciaAtitudinal[] {
  return getCompsPorContexto(contexto).map(adaptarComp);
}

export function getCompetenciaAtitudinal(id: string): CompetenciaAtitudinal | undefined {
  const comp = getCompAtitudinal(id);
  return comp ? adaptarComp(comp) : undefined;
}

export { PERMANENTES_IDS };

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

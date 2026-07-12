// ============================================================
// compatECL.ts
// Camada de compatibilidade — substitui:
//   competenciasECL.ts, competencias.ts,
//   subtecnicas.ts, componentesCulinarios.ts
//
// Exporta as mesmas funções e constantes que os ficheiros
// eliminados, mas usando a biblioteca V10.
//
// Em cada componente, muda só a linha do import:
//   from '../competenciasECL'  →  from '../compatECL'
//   from '../competencias'     →  from '../compatECL'
//   from '../subtecnicas'      →  from '../compatECL'
//   from '../componentesCulinarios' → from '../compatECL'
// ============================================================

import { getLibrary, filtrarPerfis, calcularNota, estadoCompetencia } from './libraryService';
import type { PerfilTecnico, CriterioObservavel } from './library.types';
import type { Competencia, Categoria, NivelAuto } from './types';

// ── Tipo interno legacy ─────────────────────────────────────
export interface MicroCompetencia {
  id: string;
  nome: string;
  ucPrincipal: string;
  ucNome: string;
  ucsRelacionadas: string[];
  categoria: Categoria;
  prioridade: 'A' | 'B' | 'C';
  criterios: { criterio: string; como?: string }[];
}

export interface Atitude {
  id: string;
  nome: string;
  nUCs: number;
  ucs: string[];
  prioridade: 'permanente' | 'recorrente' | 'contextual' | 'especifica';
}

// ── Converter PerfilTecnico → MicroCompetencia ──────────────
function perfilParaMicro(p: PerfilTecnico, crit: CriterioObservavel[]): MicroCompetencia {
  return {
    id: p.id,
    nome: p.resultado_esperado || p.texto_aluno || p.id,
    ucPrincipal: p.uc_list?.[0] || '',
    ucNome: p.uc_list?.[0] || '',
    ucsRelacionadas: p.uc_list || [],
    categoria: 'TECNICAS',
    prioridade: p.essencialidade === 'ESSENTIAL' ? 'A'
              : p.essencialidade === 'DEVELOPMENT' ? 'B' : 'C',
    criterios: crit.map(c => ({ criterio: c.texto_aluno, como: c.titulo })),
  };
}

// ── Lazy getters ────────────────────────────────────────────
// Chamados apenas após loadLibrary() ter terminado.

function getCriteriosPorPerfil(): Record<string, CriterioObservavel[]> {
  const lib = getLibrary();
  const map: Record<string, CriterioObservavel[]> = {};
  for (const c of lib.criterios) {
    if (!map[c.perfil_id]) map[c.perfil_id] = [];
    map[c.perfil_id].push(c);
  }
  return map;
}

// MICROCOMPETENCIAS — todos os perfis da biblioteca como MicroCompetencia[]
export function getMICROCOMPETENCIAS(): MicroCompetencia[] {
  const lib = getLibrary();
  const critMap = getCriteriosPorPerfil();
  return lib.perfis.map(p => perfilParaMicro(p, critMap[p.id] || []));
}

// Proxy array-like para retrocompatibilidade com código que usa
// MICROCOMPETENCIAS.filter(...), MICROCOMPETENCIAS.find(...), etc.
// Usar getMICROCOMPETENCIAS() quando possível.
export let MICROCOMPETENCIAS: MicroCompetencia[] = [];

// ATITUDES
export function getATITUDES(): Atitude[] {
  const lib = getLibrary();
  return lib.atitudes.map(a => ({
    id: a.id,
    nome: a.nome,
    nUCs: 0,
    ucs: [],
    prioridade: (a.prioridade as any) || 'recorrente',
  }));
}
export let ATITUDES: Atitude[] = [];

// OBRIGATORIAS — perfis ESSENTIAL de nível 1
export function getOBRIGATORIAS(): MicroCompetencia[] {
  const lib = getLibrary();
  const critMap = getCriteriosPorPerfil();
  return lib.perfis
    .filter(p => p.essencialidade === 'ESSENTIAL' && p.nivel === 1)
    .map(p => perfilParaMicro(p, critMap[p.id] || []));
}
export let OBRIGATORIAS: MicroCompetencia[] = [];

// TECNICAS, RESPONSABILIDADES para progresso.ts
export function getTECNICAS(): Competencia[] {
  const lib = getLibrary();
  const critMap = getCriteriosPorPerfil();
  return lib.perfis.map(p => ({
    id: p.id,
    categoria: 'TECNICAS' as Categoria,
    nome: p.resultado_esperado || p.texto_aluno || p.id,
    uc: p.uc_list || [],
    palavrasChave: p.aliases_list || [],
    criterios: (critMap[p.id] || []).map(c => ({ criterio: c.texto_aluno, como: c.titulo })),
  }));
}
export let TECNICAS: Competencia[] = [];

export function getRESPONSABILIDADES(): Competencia[] {
  const lib = getLibrary();
  return lib.atitudes
    .filter(a => (a.prioridade as string) === 'permanente')
    .map(a => ({
      id: a.id,
      categoria: 'RESPONSABILIDADES' as Categoria,
      nome: a.nome,
      uc: [],
    }));
}
export let RESPONSABILIDADES: Competencia[] = [];

export function getTODAS_COMPETENCIAS(): Competencia[] {
  return [...getTECNICAS(), ...getRESPONSABILIDADES(),
    ...getATITUDES().map(a => ({
      id: a.id, categoria: 'ATITUDES' as Categoria, nome: a.nome, uc: [],
    }))
  ];
}
export let TODAS_COMPETENCIAS: Competencia[] = [];

// SUBTECNICAS
export function getSUBTECNICAS() {
  return getLibrary().subtecnicas;
}
export let SUBTECNICAS: ReturnType<typeof getSUBTECNICAS> = [];

// ── Inicializar arrays após loadLibrary() ───────────────────
export function inicializarCompat() {
  MICROCOMPETENCIAS  = getMICROCOMPETENCIAS();
  ATITUDES           = getATITUDES();
  OBRIGATORIAS       = getOBRIGATORIAS();
  TECNICAS           = getTECNICAS();
  RESPONSABILIDADES  = getRESPONSABILIDADES();
  TODAS_COMPETENCIAS = getTODAS_COMPETENCIAS();
  SUBTECNICAS        = getSUBTECNICAS();
}

// ── Funções de lookup ───────────────────────────────────────

export function encontrarMicro(id: string): MicroCompetencia | undefined {
  const lib = getLibrary();
  const critMap = getCriteriosPorPerfil();
  const p = lib.perfis.find(x => x.id === id);
  if (p) return perfilParaMicro(p, critMap[p.id] || []);
  // Fallback: procurar nas atitudes
  const a = lib.atitudes.find(x => x.id === id);
  if (a) return { id: a.id, nome: a.nome, ucPrincipal: '', ucNome: '', ucsRelacionadas: [], categoria: 'ATITUDES', prioridade: 'B', criterios: [] };
  return undefined;
}

export function encontrarAtitude(id: string): Atitude | undefined {
  return getATITUDES().find(a => a.id === id);
}

export function getCompetencia(id: string): Competencia | undefined {
  return getTODAS_COMPETENCIAS().find(c => c.id === id);
}

export function microsPorUC(ucId: string): MicroCompetencia[] {
  if (!ucId) return getMICROCOMPETENCIAS();
  const lib = getLibrary();
  const critMap = getCriteriosPorPerfil();
  return lib.perfis
    .filter(p => p.uc_list?.includes(ucId))
    .map(p => perfilParaMicro(p, critMap[p.id] || []));
}

export function microsPorFamilia(
  familia1?: string,
  familia2?: string,
  etiquetas?: string[],
  ucId?: string
): MicroCompetencia[] {
  const lib = getLibrary();
  const critMap = getCriteriosPorPerfil();
  return lib.perfis
    .filter(p => {
      if (ucId && !p.uc_list?.includes(ucId)) return false;
      if (familia1 && p.familia_tecnica !== familia1 && p.familia_referencial !== familia1) {
        if (familia2 && p.familia_tecnica !== familia2 && p.familia_referencial !== familia2) return false;
      }
      return true;
    })
    .map(p => perfilParaMicro(p, critMap[p.id] || []));
}

// ── Sugestão por texto ──────────────────────────────────────

export function sugerirSubtecnicas(texto: string): typeof SUBTECNICAS {
  const lib = getLibrary();
  if (!texto || texto.length < 3) return [];
  const palavras = texto.toLowerCase().split(/\s+/).filter(p => p.length > 3);
  return lib.subtecnicas.filter(s => {
    const nome = (s.nome || '').toLowerCase();
    const desc = (s.descricao || '').toLowerCase();
    return palavras.some(p => nome.includes(p) || desc.includes(p));
  }).slice(0, 12);
}

export function sugerirTecnicas(texto: string): MicroCompetencia[] {
  const lib = getLibrary();
  if (!texto || texto.length < 3) return [];
  const palavras = texto.toLowerCase().split(/\s+/).filter(p => p.length > 3);
  const critMap = getCriteriosPorPerfil();
  return lib.perfis
    .filter(p => {
      const aliases = (p.aliases_list || []).join(' ');
      const nome = (p.resultado_esperado || p.texto_aluno || '').toLowerCase();
      return palavras.some(pal => aliases.includes(pal) || nome.includes(pal));
    })
    .slice(0, 8)
    .map(p => perfilParaMicro(p, critMap[p.id] || []));
}

export function sugerirTecnicasPorServico(tipoServico: string): MicroCompetencia[] {
  // Servico real → priorizar perfis de nível 1 de atendimento
  const lib = getLibrary();
  const critMap = getCriteriosPorPerfil();
  if (tipoServico === 'com_clientes') {
    return lib.perfis
      .filter(p => p.uc_list?.some(u => ['UC03580', 'UC03581'].includes(u)))
      .slice(0, 4)
      .map(p => perfilParaMicro(p, critMap[p.id] || []));
  }
  return [];
}

export function sugerirAtitudes(
  _modo?: string,
  _atendimento?: boolean,
  _tipoServico?: string
): Atitude[] {
  return getATITUDES()
    .filter(a => a.prioridade === 'permanente' || a.prioridade === 'recorrente')
    .slice(0, 5);
}

export function sugerirResponsabilidades(
  _modo?: string,
  _atendimento?: boolean,
  _tipoServico?: string
): MicroCompetencia[] {
  return getOBRIGATORIAS().slice(0, 4);
}

// ── Funções de avaliação ────────────────────────────────────

export const PARAMETROS_AVALIACAO = {
  maxProfessor: 4,
  maxAluno: 1,
  totalMax: 5,
  maxMicroPorCompetencia: 2,
  notaMinimaSucesso: 12,
  nSucessosConsolidada: 2,
  diferencaMinSignificativa: 2,
  regressaoRelevante: -2,
  mensagemBloqueioAluno: 'O aluno já obteve sucesso nesta competência. Sugere outra em desenvolvimento.',
};

// Verificar se já teve sucesso (2+ avaliações >= 12)
export function jaTeveSucesso(avaliacoes: { nota: number }[]): boolean {
  return avaliacoes.filter(a => a.nota >= PARAMETROS_AVALIACAO.notaMinimaSucesso).length
    >= PARAMETROS_AVALIACAO.nSucessosConsolidada;
}

// Verificar regressão (última nota caiu >= 2 pontos)
export function estaEmRegressao(avaliacoes: { nota: number }[]): boolean {
  if (avaliacoes.length < 2) return false;
  const last = avaliacoes[avaliacoes.length - 1].nota;
  const prev = avaliacoes[avaliacoes.length - 2].nota;
  return prev - last >= PARAMETROS_AVALIACAO.regressaoRelevante * -1;
}

// ── Componentes culinários (antigo componentesCulinarios.ts) ─
// Mapeamento simples categoria → componente
const MAPA_COMPONENTE: Record<string, string> = {
  'Carnes': 'Proteína',
  'Peixes': 'Proteína',
  'Mariscos': 'Proteína',
  'Legumes': 'Vegetal',
  'Hortícolas': 'Vegetal',
  'Cereais e farinhas': 'Cereal',
  'Laticínios': 'Laticínio',
  'Ovos e ovoprodutos': 'Ovo',
  'Especiarias': 'Tempero',
  'Leguminosas': 'Leguminosa',
};

export function obterComponenteCulinario(categoria?: string): string {
  if (!categoria) return 'Ingrediente';
  return MAPA_COMPONENTE[categoria] || categoria;
}

// ── registarSubtecnicas — no-op (a biblioteca trata disto) ──
export function registarSubtecnicas(_subs: unknown): void {
  // Não é necessário — a biblioteca é carregada via loadLibrary()
}

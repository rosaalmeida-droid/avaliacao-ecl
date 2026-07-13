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

import { getLibrary } from './libraryService';
import type { PerfilTecnico, CriterioObservavel } from './library.types';
import type { Competencia, Categoria } from './types';

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

// Subtécnica enriquecida com campos legacy
export interface SubtecnicaLegacy {
  id: string;
  nome: string;
  tecnica_id: string;
  /** @deprecated use tecnica_id */
  tecnicaMaeId: string;
  uc: string[];
  definicao?: string;
  resultado_esperado?: string;
  criterios?: { criterio: string; como?: string }[];
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

function getCriteriosPorPerfil(): Record<string, CriterioObservavel[]> {
  const lib = getLibrary();
  const map: Record<string, CriterioObservavel[]> = {};
  for (const c of lib.criterios) {
    if (!map[c.perfil_id]) map[c.perfil_id] = [];
    map[c.perfil_id].push(c);
  }
  return map;
}

// ── Arrays lazy ─────────────────────────────────────────────
export let MICROCOMPETENCIAS: MicroCompetencia[] = [];
export let ATITUDES: Atitude[] = [];
export let OBRIGATORIAS: MicroCompetencia[] = [];
export let TECNICAS: Competencia[] = [];
export let RESPONSABILIDADES: Competencia[] = [];
export let TODAS_COMPETENCIAS: Competencia[] = [];
export let SUBTECNICAS: SubtecnicaLegacy[] = [];

// ── Inicializar após loadLibrary() ──────────────────────────
export function inicializarCompat() {
  const lib = getLibrary();
  const critMap = getCriteriosPorPerfil();

  // Construir mapa técnica → UCs (via perfis)
  const tecnicaParaUCs: Record<string, string[]> = {};
  for (const p of lib.perfis) {
    for (const tid of (p.tecnica_ids || [])) {
      if (!tecnicaParaUCs[tid]) tecnicaParaUCs[tid] = [];
      for (const uc of (p.uc_list || [])) {
        if (!tecnicaParaUCs[tid].includes(uc)) tecnicaParaUCs[tid].push(uc);
      }
    }
  }

  MICROCOMPETENCIAS = lib.perfis.map(p => perfilParaMicro(p, critMap[p.id] || []));

  ATITUDES = lib.atitudes.map(a => ({
    id: a.id,
    nome: a.nome,
    nUCs: 0,
    ucs: [],
    prioridade: (a.prioridade as any) || 'recorrente',
  }));

  OBRIGATORIAS = lib.perfis
    .filter(p => p.essencialidade === 'ESSENTIAL' && p.nivel === 1)
    .map(p => perfilParaMicro(p, critMap[p.id] || []));

  TECNICAS = lib.perfis.map(p => ({
    id: p.id,
    categoria: 'TECNICAS' as Categoria,
    nome: p.resultado_esperado || p.texto_aluno || p.id,
    uc: p.uc_list || [],
    palavrasChave: p.aliases_list || [],
    criterios: (critMap[p.id] || []).map(c => ({ criterio: c.texto_aluno, como: c.titulo })),
  }));

  RESPONSABILIDADES = lib.atitudes
    .filter(a => (a.prioridade as string) === 'permanente')
    .map(a => ({ id: a.id, categoria: 'RESPONSABILIDADES' as Categoria, nome: a.nome, uc: [] }));

  TODAS_COMPETENCIAS = [
    ...TECNICAS,
    ...RESPONSABILIDADES,
    ...ATITUDES.map(a => ({ id: a.id, categoria: 'ATITUDES' as Categoria, nome: a.nome, uc: [] })),
  ];

  // Subtécnicas enriquecidas com campos legacy
  SUBTECNICAS = lib.subtecnicas.map(s => ({
    id: s.id,
    nome: s.nome || '',
    tecnica_id: (s as any).tecnica_id || '',
    tecnicaMaeId: (s as any).tecnica_id || '',
    uc: tecnicaParaUCs[(s as any).tecnica_id || ''] || [],
    definicao: (s as any).definicao,
    resultado_esperado: (s as any).resultado_esperado,
    criterios: [],
  }));
}

// ── Funções de lookup ───────────────────────────────────────

export function encontrarMicro(id: string): MicroCompetencia | undefined {
  const lib = getLibrary();
  const critMap = getCriteriosPorPerfil();
  const p = lib.perfis.find(x => x.id === id);
  if (p) return perfilParaMicro(p, critMap[p.id] || []);
  const a = lib.atitudes.find(x => x.id === id);
  if (a) return { id: a.id, nome: a.nome, ucPrincipal: '', ucNome: '', ucsRelacionadas: [], categoria: 'ATITUDES', prioridade: 'B', criterios: [] };
  return undefined;
}

export function encontrarAtitude(id: string): Atitude | undefined {
  return ATITUDES.find(a => a.id === id);
}

export function getCompetencia(id: string): Competencia | undefined {
  return TODAS_COMPETENCIAS.find(c => c.id === id);
}

export function microsPorUC(ucId: string): MicroCompetencia[] {
  if (!ucId) return MICROCOMPETENCIAS;
  return MICROCOMPETENCIAS.filter(m =>
    m.ucPrincipal === ucId || m.ucsRelacionadas.includes(ucId)
  );
}

export function microsPorFamilia(
  familia1?: string,
  familia2?: string,
  _etiquetas?: string[],
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

// ── Sugestão — devolve string[] (IDs) para compatibilidade ──

export function sugerirSubtecnicas(texto: string): SubtecnicaLegacy[] {
  if (!texto || texto.length < 3) return [];
  const palavras = texto.toLowerCase().split(/\s+/).filter(p => p.length > 3);
  return SUBTECNICAS.filter(s => {
    const nome = (s.nome || '').toLowerCase();
    return palavras.some(p => nome.includes(p));
  }).slice(0, 12);
}

// Devolve IDs (string[]) para compatibilidade com Comanda.tecnicasSugeridas
export function sugerirTecnicas(texto: string): string[] {
  if (!texto || texto.length < 3) return [];
  const palavras = texto.toLowerCase().split(/\s+/).filter(p => p.length > 3);
  return MICROCOMPETENCIAS
    .filter(m => {
      const nome = m.nome.toLowerCase();
      return palavras.some(p => nome.includes(p));
    })
    .slice(0, 8)
    .map(m => m.id);
}

export function sugerirTecnicasPorServico(tipoServico: string): string[] {
  if (tipoServico === 'com_clientes') {
    return MICROCOMPETENCIAS
      .filter(m => m.ucsRelacionadas.some(u => ['UC03580', 'UC03581'].includes(u)))
      .slice(0, 4)
      .map(m => m.id);
  }
  return [];
}

export function sugerirAtitudes(
  _modo?: string,
  _atendimento?: boolean,
  _tipoServico?: string
): string[] {
  return ATITUDES
    .filter(a => a.prioridade === 'permanente' || a.prioridade === 'recorrente')
    .slice(0, 5)
    .map(a => a.id);
}

export function sugerirResponsabilidades(
  _modo?: string,
  _atendimento?: boolean,
  _tipoServico?: string
): string[] {
  return OBRIGATORIAS.slice(0, 4).map(m => m.id);
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

export function jaTeveSucesso(avaliacoes: { nota: number }[]): boolean {
  return avaliacoes.filter(a => a.nota >= PARAMETROS_AVALIACAO.notaMinimaSucesso).length
    >= PARAMETROS_AVALIACAO.nSucessosConsolidada;
}

export function estaEmRegressao(avaliacoes: { nota: number }[]): boolean {
  if (avaliacoes.length < 2) return false;
  const last = avaliacoes[avaliacoes.length - 1].nota;
  const prev = avaliacoes[avaliacoes.length - 2].nota;
  return prev - last >= 2;
}

// ── Componentes culinários ───────────────────────────────────
const MAPA_COMPONENTE: Record<string, string> = {
  'Carnes': 'Proteína', 'Peixes': 'Proteína', 'Mariscos': 'Proteína',
  'Legumes': 'Vegetal', 'Hortícolas': 'Vegetal',
  'Cereais e farinhas': 'Cereal', 'Laticínios': 'Laticínio',
  'Ovos e ovoprodutos': 'Ovo', 'Especiarias': 'Tempero',
  'Leguminosas': 'Leguminosa',
};

export function obterComponenteCulinario(categoria?: string): string {
  if (!categoria) return 'Ingrediente';
  return MAPA_COMPONENTE[categoria] || categoria;
}

// ── no-op ────────────────────────────────────────────────────
export function registarSubtecnicas(_subs: unknown): void {}

// ════════════════════════════════════════════════════════════
// NOVAS FUNÇÕES V10 — aparelhos, subtécnicas, conhecimentos
// ════════════════════════════════════════════════════════════

// ── Aparelhos (APP-xxxx) ─────────────────────────────────────
export function encontrarAparelho(id: string): {
  id: string; nome: string; categoria: string; nivel: number;
  definicao?: string; ambito_profissional?: string;
} | undefined {
  return (getLibrary().aparelhos as any[]).find(a => a.id === id);
}

// ── Subtécnicas (SUB-xxx-xxx-xxx) ────────────────────────────
export function encontrarSubtecnica(id: string): {
  id: string; nome: string; tecnica_id?: string;
  definicao?: string; resultado_esperado?: string;
} | undefined {
  return (getLibrary().subtecnicas as any[]).find(s => s.id === id) as any;
}

// ── Conhecimentos (KNW-xxxxx) ─────────────────────────────────
export function encontrarConhecimento(id: string): {
  id: string; nome: string; nivel: number; dominio: string;
  familia_tecnica: string; definicao: string;
} | undefined {
  return (getLibrary().conhecimentos as any[]).find(k => k.id === id);
}

// ── Aptidões (APT-xxxxx) ──────────────────────────────────────
export function encontrarAptidao(id: string): {
  id: string; nome: string; nivel: number; dominio: string;
  familia_tecnica: string; manifestacao_observavel: string;
} | undefined {
  return (getLibrary().aptidoes as any[]).find(a => a.id === id);
}

// ── Nome de qualquer ID ───────────────────────────────────────
export function nomeCompetencia(id: string): string {
  if (id.startsWith('SUB-')) return encontrarSubtecnica(id)?.nome || id;
  if (id.startsWith('APP-')) return encontrarAparelho(id)?.nome || id;
  if (id.startsWith('ATT_')) return encontrarAtitude(id)?.nome || id;
  if (id.startsWith('KNW-')) return encontrarConhecimento(id)?.nome || id;
  if (id.startsWith('APT-')) return encontrarAptidao(id)?.nome || id;
  if (id.startsWith('OBR_')) {
    const obrs: Record<string,string> = {
      'OBR_01': 'Higiene pessoal',
      'OBR_02': 'Higiene e Segurança Alimentar / KitchenFlow',
      'OBR_03': 'Assiduidade e pontualidade',
    };
    return obrs[id] || id;
  }
  return encontrarMicro(id)?.nome || id;
}

// ── Tipo de qualquer ID ───────────────────────────────────────
export function tipoCompetencia(id: string): 'subtecnica' | 'aparelho' | 'conhecimento' | 'aptidao' | 'micro' | 'atitude' | 'obrigatoria' {
  if (id.startsWith('SUB-')) return 'subtecnica';
  if (id.startsWith('APP-')) return 'aparelho';
  if (id.startsWith('KNW-')) return 'conhecimento';
  if (id.startsWith('APT-')) return 'aptidao';
  if (id.startsWith('ATT_')) return 'atitude';
  if (id.startsWith('OBR_')) return 'obrigatoria';
  return 'micro';
}

// ── Nível de aparelho ─────────────────────────────────────────
export function nivelAparelho(id: string): number {
  return encontrarAparelho(id)?.nivel || 1;
}

// ── Filtrar aparelhos por nível de medidas do aluno ───────────
// nivelMedidas: undefined/1=regular(tudo), 2=seletivas(nível 1-2), 3=adicionais(só 1)
export function aparelhosPermitidos(ids: string[], nivelMedidas?: number): string[] {
  return ids.filter(id => {
    if (!id.startsWith('APP-')) return true;
    const nivel = nivelAparelho(id);
    if (!nivelMedidas || nivelMedidas === 1) return true;
    if (nivelMedidas === 2) return nivel <= 2;
    if (nivelMedidas === 3) return nivel === 1;
    return true;
  });
}

// ── Conhecimentos da biblioteca por domínio/família ───────────
export function conhecimentosDaBiblioteca(familia?: string, dominio?: string): any[] {
  let items = getLibrary().conhecimentos as any[];
  if (familia) items = items.filter(k => k.familia_tecnica === familia);
  if (dominio) items = items.filter(k => k.dominio === dominio);
  return items;
}

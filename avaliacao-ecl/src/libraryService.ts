// ============================================================
// libraryService.ts
// Carrega a biblioteca pedagógica V10 e expõe funções de query
// para o motor de sugestão e para as vistas da app
// ============================================================

import type {
  Library, PerfilTecnico, CriterioObservavel, Preparacao,
  SugestaoCompetencia, UC, Referencial, MedidasInclusao,
  CodigoAutoavaliacao, CodigoValidacaoProfessor, Nivel
} from './library.types';

// ── Base URL dos ficheiros JSON ───────────────────────────────
// Em produção: GitHub raw ou Vercel static
const BASE_URL = import.meta.env.VITE_LIBRARY_BASE_URL
  || 'https://raw.githubusercontent.com/rosaalmeida-droid/avaliacao-ecl/main/public/library';

// ── Singleton cache ───────────────────────────────────────────
let _library: Library | null = null;
let _loading: Promise<Library> | null = null;

// ── Carregar biblioteca ───────────────────────────────────────
async function fetchJSON<T>(name: string): Promise<T> {
  const res = await fetch(`${BASE_URL}/${name}`);
  if (!res.ok) throw new Error(`Erro ao carregar ${name}: ${res.status}`);
  return res.json();
}

export async function loadLibrary(): Promise<Library> {
  if (_library) return _library;
  if (_loading) return _loading;

  _loading = (async () => {
    console.log('[Library] A carregar biblioteca V10...');
    const [
      tecnicas, subtecnicas, perfis, criterios,
      conhecimentos, aptidoes, aparelhos, produtos,
      preparacoes_mlm, preparacoes_int, preparacoes_base,
      atitudes, uc_base, uc_ufcd_map, lookup, index
    ] = await Promise.all([
      fetchJSON('tecnicas.json'),
      fetchJSON('subtecnicas.json'),
      fetchJSON('perfis.json'),
      fetchJSON('criterios.json'),
      fetchJSON('conhecimentos.json'),
      fetchJSON('aptidoes.json'),
      fetchJSON('aparelhos.json'),
      fetchJSON('produtos.json'),
      fetchJSON('preparacoes_mlm.json'),
      fetchJSON('preparacoes_int.json'),
      fetchJSON('preparacoes_base.json'),
      fetchJSON('atitudes.json'),
      fetchJSON('uc_base.json'),
      fetchJSON('uc_ufcd_map.json'),
      fetchJSON('uc_ufcd_lookup.json'),
      fetchJSON('index.json'),
    ]);

    _library = {
      tecnicas, subtecnicas, perfis, criterios,
      conhecimentos, aptidoes, aparelhos, produtos,
      preparacoes_mlm, preparacoes_int, preparacoes_base,
      atitudes, uc_base, uc_ufcd_map,
      uc_to_ufcd: (lookup as any).uc_to_ufcd,
      ufcd_to_uc: (lookup as any).ufcd_to_uc,
      version: (index as any).version,
      gerado_em: (index as any).gerado_em,
    } as Library;

    console.log(`[Library] ✅ V${_library.version} carregada — ${perfis.length} perfis, ${criterios.length} critérios`);
    return _library;
  })();

  return _loading;
}

export function getLibrary(): Library {
  if (!_library) throw new Error('Biblioteca não carregada. Chama loadLibrary() primeiro.');
  return _library;
}

// ══════════════════════════════════════════════════════════════
// CONVERSÃO UC ↔ UFCD
// ══════════════════════════════════════════════════════════════

/** Dado um UC ID (novo ref) ou UFCD ID (antigo ref), devolve a lista canónica de UC IDs */
export function resolveUC(id: string, referencial: Referencial): string[] {
  const lib = getLibrary();
  if (referencial === '811RA144') return [id];
  // Antigo: converter UFCD → UC
  const uc = lib.ufcd_to_uc[id];
  return uc ? [uc] : [id]; // fallback: usar como está
}

/** UC ID → UFCD ID (para display no antigo referencial) */
export function ucToUfcd(uc_id: string): string | undefined {
  return getLibrary().uc_to_ufcd[uc_id];
}

/** Para display: mostra o código correcto segundo o referencial */
export function displayUCCode(uc_id: string, referencial: Referencial): string {
  if (referencial === '811RA144') return uc_id;
  const ufcd = ucToUfcd(uc_id);
  return ufcd ? `UFCD ${ufcd}` : uc_id;
}

// ══════════════════════════════════════════════════════════════
// PERFIS — FILTROS E SUGESTÃO
// ══════════════════════════════════════════════════════════════

/**
 * Filtra perfis por:
 * - UC/UFCD do plano de aula
 * - Nível de acesso do aluno (medidas inclusão)
 * - Nível curricular (1º, 2º, 3º ano)
 */
export function filtrarPerfis(params: {
  uc_id: string;
  referencial: Referencial;
  medidas?: MedidasInclusao;
  nivel_curricular?: 1 | 2 | 3;  // ano do curso
}): PerfilTecnico[] {
  const lib = getLibrary();
  const uc_ids = resolveUC(params.uc_id, params.referencial);
  const medidas = params.medidas ?? 'regular';

  // Níveis permitidos por medidas
  const niveisPermitidos: Nivel[] = medidas === 'adicionais'
    ? [1]
    : [1, 2, 3];

  return lib.perfis.filter(p => {
    // Tem de ter pelo menos uma UC em comum
    const ucMatch = p.uc_list?.some(u => uc_ids.includes(u)) ?? false;
    if (!ucMatch) return false;

    // Nível dentro dos permitidos por medidas
    if (!niveisPermitidos.includes(p.nivel as Nivel)) return false;

    // Medidas seletivas: seletivas=true
    if (medidas === 'seletivas' && !p.seletivas) return false;
    if (medidas === 'adicionais' && !p.adicionais) return false;

    return true;
  });
}

/**
 * Dado um plano de aula, sugere competências ordenadas por prioridade.
 * Lógica:
 *   1. Perfis ESSENTIAL da UC → obrigatórios (aparecem primeiro)
 *   2. Match por preparação (aliases da preparação vs aliases dos perfis)
 *   3. Perfis DEVELOPMENT → sugestões contextuais
 *   4. Perfis ADVANCED → apenas se solicitado pelo professor
 */
export function sugerirCompetencias(params: {
  uc_id: string;
  referencial: Referencial;
  preparacao_id?: string;
  medidas?: MedidasInclusao;
  max?: number;
}): SugestaoCompetencia[] {
  const lib = getLibrary();
  const { uc_id, referencial, preparacao_id, max = 8 } = params;

  const perfis = filtrarPerfis({
    uc_id,
    referencial,
    medidas: params.medidas,
  });

  // Palavras-chave da preparação
  let prep_keywords: string[] = [];
  if (preparacao_id) {
    const prep = [...lib.preparacoes_mlm, ...lib.preparacoes_int, ...lib.preparacoes_base]
      .find(p => p.id === preparacao_id);
    if (prep) {
      prep_keywords = [
        prep.nome.toLowerCase(),
        prep.categoria.toLowerCase(),
        ...(prep.descricao?.toLowerCase().split(/\s+/) ?? []),
      ];
    }
  }

  const sugestoes: SugestaoCompetencia[] = perfis.map(perfil => {
    const criterios = lib.criterios.filter(c => c.perfil_id === perfil.id);
    let score = 0;
    const motivo: string[] = [];

    // Score base por essencialidade
    if (perfil.essencialidade === 'ESSENTIAL') { score += 50; motivo.push('Técnica essencial da UC'); }
    else if (perfil.essencialidade === 'DEVELOPMENT') { score += 30; motivo.push('Técnica de desenvolvimento'); }
    else { score += 10; }

    // Score por nível (nível 1 mais urgente)
    score += (4 - perfil.nivel) * 10;

    // Score por match com preparação
    if (prep_keywords.length > 0 && perfil.aliases_list) {
      const matches = perfil.aliases_list.filter(a =>
        prep_keywords.some(k => k.includes(a) || a.includes(k))
      );
      if (matches.length > 0) {
        score += matches.length * 15;
        motivo.push(`Relacionado com a preparação (${matches.slice(0, 2).join(', ')})`);
      }
    }

    // Score por match no texto do resultado esperado
    if (perfil.resultado_esperado && prep_keywords.length > 0) {
      const texto = perfil.resultado_esperado.toLowerCase();
      if (prep_keywords.some(k => k.length > 4 && texto.includes(k))) {
        score += 10;
      }
    }

    return {
      perfil,
      criterios,
      score_relevancia: Math.min(100, score),
      motivo,
      obrigatoria: perfil.essencialidade === 'ESSENTIAL' && perfil.nivel === 1,
    };
  });

  // Ordenar: obrigatórias primeiro, depois por score
  return sugestoes
    .sort((a, b) => {
      if (a.obrigatoria !== b.obrigatoria) return a.obrigatoria ? -1 : 1;
      return b.score_relevancia - a.score_relevancia;
    })
    .slice(0, max);
}

// ══════════════════════════════════════════════════════════════
// PREPARAÇÕES
// ══════════════════════════════════════════════════════════════

/** Todas as preparações por UC */
export function preparacoesPorUC(uc_id: string, referencial: Referencial): Preparacao[] {
  const lib = getLibrary();
  const uc_ids = resolveUC(uc_id, referencial);
  const todas = [...lib.preparacoes_mlm, ...lib.preparacoes_int, ...lib.preparacoes_base];
  return todas.filter(p => p.uc_list?.some(u => uc_ids.includes(u)));
}

/** Preparações portuguesas por região */
export function preparacoesPorRegiao(regiao: string): Preparacao[] {
  return getLibrary().preparacoes_mlm.filter(p =>
    p.regiao.split('/')[0].trim().toLowerCase() === regiao.toLowerCase()
  );
}

/** Pesquisa de preparação por nome (fuzzy) */
export function pesquisarPreparacao(query: string, tipo?: 'pt' | 'int' | 'all'): Preparacao[] {
  const lib = getLibrary();
  const q = query.toLowerCase().trim();
  const pool = tipo === 'pt'
    ? lib.preparacoes_mlm
    : tipo === 'int'
    ? lib.preparacoes_int
    : [...lib.preparacoes_mlm, ...lib.preparacoes_int, ...lib.preparacoes_base];

  return pool.filter(p =>
    p.nome.toLowerCase().includes(q) ||
    p.categoria.toLowerCase().includes(q) ||
    p.descricao?.toLowerCase().includes(q)
  );
}

// ══════════════════════════════════════════════════════════════
// CÁLCULO DE NOTA
// ══════════════════════════════════════════════════════════════

const NOTA_POR_CODIGO: Record<CodigoAutoavaliacao, number | null> = {
  NTO: null,  // fora do cálculo
  NF:  null,  // fora do cálculo (ou atitude)
  NC:  8,     // tentou mas não concluiu
  AD:  13,    // com dificuldades
  FS:  17,    // sem dificuldade
};

const AJUSTE_VALIDACAO: Record<CodigoValidacaoProfessor, number> = {
  CONFIRM: 0,
  UP:      3,   // sobe ~1 nível
  DOWN:   -3,   // desce ~1 nível
  NO:      0,   // não observou — não altera
};

export function calcularNota(
  codigo_aluno: CodigoAutoavaliacao,
  validacao: CodigoValidacaoProfessor
): number | null {
  const base = NOTA_POR_CODIGO[codigo_aluno];
  if (base === null) return null;
  if (validacao === 'NO') return null;
  return Math.max(0, Math.min(20, base + AJUSTE_VALIDACAO[validacao]));
}

/** Média ponderada pelo tempo de uma sequência de avaliações */
export function mediaPonderada(avaliacoes: { data: string; nota: number }[]): number {
  if (!avaliacoes.length) return 0;

  const agora = new Date();
  const PESOS = [
    { meses: 3,  peso: 1.00 },
    { meses: 6,  peso: 0.75 },
    { meses: 12, peso: 0.50 },
    { meses: Infinity, peso: 0.25 },
  ];

  let soma = 0, totalPeso = 0;
  for (const { data, nota } of avaliacoes) {
    const mesesAtras = (agora.getTime() - new Date(data).getTime()) / (1000 * 60 * 60 * 24 * 30);
    const peso = PESOS.find(p => mesesAtras <= p.meses)?.peso ?? 0.25;
    soma += nota * peso;
    totalPeso += peso;
  }

  return totalPeso > 0 ? Math.round((soma / totalPeso) * 10) / 10 : 0;
}

/** Estado de evolução de uma competência */
export function estadoCompetencia(
  notas: number[],
  params = { nota_minima: 12, n_sucessos: 2, regressao: -2 }
): 'nunca_avaliada' | 'em_evolucao' | 'consolidada' | 'em_regressao' {
  if (!notas.length) return 'nunca_avaliada';

  const sucessos = notas.filter(n => n >= params.nota_minima).length;
  if (sucessos >= params.n_sucessos) return 'consolidada';

  if (notas.length >= 2) {
    const ultima = notas[notas.length - 1];
    const penultima = notas[notas.length - 2];
    if (ultima - penultima <= params.regressao) return 'em_regressao';
  }

  return 'em_evolucao';
}

// ══════════════════════════════════════════════════════════════
// PRIORIDADE (ordenação do professor)
// ══════════════════════════════════════════════════════════════

export type EstadoCompetencia =
  | 'obrigatoria' | 'em_regressao' | 'sem_evolucao'
  | 'nunca_avaliada' | 'exigida_pela_ficha'
  | 'escolha_aluno' | 'em_evolucao' | 'consolidada';

const PRIORIDADE_SCORE: Record<EstadoCompetencia, number> = {
  obrigatoria:       0,
  em_regressao:    100,
  sem_evolucao:     85,
  nunca_avaliada:   80,
  exigida_pela_ficha: 75,
  escolha_aluno:    70,
  em_evolucao:      50,
  consolidada:      20,
};

export function scoreOrdenacao(estado: EstadoCompetencia): number {
  return PRIORIDADE_SCORE[estado];
}

// ══════════════════════════════════════════════════════════════
// CRITÉRIOS FILTRADOS POR ALUNO
// ══════════════════════════════════════════════════════════════

export function criteriosPorPerfil(
  perfil_id: string,
  medidas: MedidasInclusao = 'regular'
): CriterioObservavel[] {
  const lib = getLibrary();
  return lib.criterios
    .filter(c => {
      if (c.perfil_id !== perfil_id) return false;
      if (medidas === 'adicionais' && !c.adicionais) return false;
      if (medidas === 'seletivas' && !c.seletivas) return false;
      return true;
    })
    .sort((a, b) => a.ordem - b.ordem);
}

// ══════════════════════════════════════════════════════════════
// UCs — DISPLAY E NAVEGAÇÃO
// ══════════════════════════════════════════════════════════════

export function getUC(uc_id: string): UC | undefined {
  return getLibrary().uc_base.find(u => u.id === uc_id);
}

export function ucNome(uc_id: string, referencial: Referencial): string {
  const uc = getUC(uc_id);
  if (!uc) return uc_id;
  const codigo = displayUCCode(uc_id, referencial);
  return `${codigo} — ${uc.designacao}`;
}

export function ucsPorAno(ano: 1 | 2 | 3): UC[] {
  return getLibrary().uc_base.filter(u => u.ano === ano);
}

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
  notaMinimaSucesso: 3,  // escala 1-5: sucesso a partir de 3 (Consegui com ajuda = 12/20)
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


// ── Atitudes por ano de curso (811RA144) ─────────────────────
// Baseado no cronograma ECL 2026-2029 e referencial
export const ATITUDES_POR_ANO: Record<1|2|3, string[]> = {
  1: [
    'ATI-001', // Responsabilidade pelas suas ações
    'ATI-003', // Cuidado com a apresentação pessoal
    'ATI-005', // Autocontrolo
    'ATI-011', // Sentido de organização
    'ATI-013', // Disponibilidade para aprender
    'ATI-015', // Respeito pelas regras e normas definidas
    'ATI-016', // Respeito pelas normas de higiene e segurança alimentar
    'ATI-017', // Respeito pelas normas de SST
  ],
  2: [
    // Acumulam as do 1º ano +
    'ATI-002', // Autonomia no âmbito das suas funções
    'ATI-007', // Empatia
    'ATI-008', // Escuta ativa
    'ATI-009', // Cooperação com a equipa
    'ATI-010', // Empenho e persistência na resolução de problemas
    'ATI-012', // Flexibilidade e adaptabilidade
    'ATI-018', // Respeito pela sensibilidade e bem-estar dos outros
    'ATI-022', // Respeito pelas diferenças individuais (contexto multicultural — UC03586)
  ],
  3: [
    // Acumulam as do 1º e 2º ano +
    'ATI-004', // Iniciativa
    'ATI-006', // Assertividade
    'ATI-014', // Respeito pelos princípios da sustentabilidade
    'ATI-019', // Autoconfiança
    'ATI-020', // Postura profissional
    'ATI-021', // Sentido crítico
  ],
};

// Devolver atitudes disponíveis para um ano (acumulativas)
export function atitudesParaAno(ano: 1|2|3): string[] {
  const ids = new Set<string>();
  for (let a = 1; a <= ano; a++) {
    (ATITUDES_POR_ANO[a as 1|2|3] || []).forEach(id => ids.add(id));
  }
  return Array.from(ids);
}

// Devolver atitudes do ano corrente (só as novas desse ano)
export function atitudesNovasNoAno(ano: 1|2|3): string[] {
  return ATITUDES_POR_ANO[ano] || [];
}


// ════════════════════════════════════════════════════════════
// SISTEMA DE ATITUDES — distribuição por ano e trimestre
// Referencial 811RA144 + Cronograma ECL 2026-2029
// ════════════════════════════════════════════════════════════

export interface AtitudeDetalhada {
  id: string;
  nome: string;
  descricao: string;          // o que significa
  exemploCozinha: string;     // exemplo concreto em cozinha
  nivelComplexidade: {
    n1: string;               // 1º ano
    n2: string;               // 2º ano
    n3: string;               // 3º ano
  };
  dicaRecuperacao: {
    n1: string;
    n2: string;
    n3: string;
  };
  ano: 1 | 2 | 3;
  trimestre: 1 | 2 | 3;
}

export const ATITUDES_DETALHADAS: AtitudeDetalhada[] = [
  // ── 1º ANO ──────────────────────────────────────────────────
  // T1
  {
    id: 'ATI-001', nome: 'Responsabilidade pelas suas ações',
    descricao: 'Assume o que faz, bem ou mal. Não culpa colegas nem inventa desculpas. Cumpre o que lhe é pedido sem supervisão constante.',
    exemploCozinha: 'Se queimou o molho, diz. Se partiu um utensílio, comunica imediatamente.',
    nivelComplexidade: {
      n1: 'Assume erros simples e comunica ao professor sem ser questionado.',
      n2: 'Assume responsabilidade perante a equipa e em contexto de serviço com clientes.',
      n3: 'Assume responsabilidade total em contexto profissional real — FCT e eventos.',
    },
    dicaRecuperacao: {
      n1: 'Na última aula não comunicaste um erro. Desta vez, se algo correr mal, diz imediatamente ao professor antes que ele repare.',
      n2: 'Tens de demonstrar que assumiste o que correu mal com a equipa. Fala com os colegas antes do início da produção.',
      n3: 'Num contexto profissional, assumir erros é essencial. Mostra que consegues fazê-lo sem ser questionado.',
    },
    ano: 1, trimestre: 1,
  },
  {
    id: 'ATI-003', nome: 'Cuidado com a apresentação pessoal',
    descricao: 'Chega à aula com farda completa e limpa, touca bem colocada, cabelo preso, sem adornos, unhas cortadas e sem verniz, mãos higienizadas.',
    exemploCozinha: 'A apresentação é a primeira impressão profissional — é o que um cliente ou empregador vê primeiro.',
    nivelComplexidade: {
      n1: 'Farda completa, limpa e correcta em todas as aulas.',
      n2: 'Apresentação impecável mesmo em serviços prolongados e situações de stress.',
      n3: 'Apresentação profissional autónoma, incluindo em contexto de estágio e eventos externos.',
    },
    dicaRecuperacao: {
      n1: 'Na última aula a tua apresentação estava incompleta. Verifica a lista: farda, touca, cabelo, unhas, sem adornos.',
      n2: 'Mesmo após horas de trabalho, a apresentação deve manter-se. Faz uma verificação a meio da aula.',
      n3: 'Num estágio ou evento, a apresentação representa a escola. Não há segunda oportunidade para primeira impressão.',
    },
    ano: 1, trimestre: 1,
  },
  // T2
  {
    id: 'ATI-005', nome: 'Autocontrolo',
    descricao: 'Mantém a calma em situações de pressão. Não reage com impulsividade. Gere o stress sem afectar a equipa.',
    exemploCozinha: 'Quando algo corre mal, quando o tempo aperta, quando recebe uma crítica — reage com serenidade.',
    nivelComplexidade: {
      n1: 'Mantém calma perante erros simples e críticas do professor.',
      n2: 'Gere pressão em serviço com equipa e tempo limitado.',
      n3: 'Mantém autocontrolo em contexto de serviço real com clientes e imprevistos.',
    },
    dicaRecuperacao: {
      n1: 'Na última aula perdeste a calma quando algo correu mal. Desta vez, se sentires pressão, para, respira e comunica ao professor.',
      n2: 'Em equipa, o teu estado emocional afecta os colegas. Mostra que consegues gerir a pressão sem transmiti-la.',
      n3: 'Em contexto profissional, o autocontrolo é uma competência técnica. Demonstra que o tens.',
    },
    ano: 1, trimestre: 2,
  },
  {
    id: 'ATI-011', nome: 'Sentido de organização',
    descricao: 'Organiza o posto de trabalho antes, durante e após a produção. Faz mise en place correcta. Sabe onde está cada coisa.',
    exemploCozinha: 'Não perde tempo à procura de utensílios. Deixa o espaço limpo e organizado. A mise en place está completa antes de começar.',
    nivelComplexidade: {
      n1: 'Organiza o posto de trabalho e faz mise en place para uma produção simples.',
      n2: 'Organiza produção com múltiplos componentes e coordena com a equipa.',
      n3: 'Organiza brigada e serviço completo, antecipando necessidades.',
    },
    dicaRecuperacao: {
      n1: 'Na última aula a mise en place estava incompleta. Desta vez lista tudo o que precisas antes de começar.',
      n2: 'Com múltiplos componentes, a organização é crítica. Faz um plano escrito antes da produção.',
      n3: 'Organizar uma brigada exige antecipar o que cada pessoa precisa. Mostra que consegues liderar essa organização.',
    },
    ano: 1, trimestre: 2,
  },
  {
    id: 'ATI-016', nome: 'Respeito pelas normas de higiene e segurança alimentar',
    descricao: 'Cumpre os procedimentos HACCP em todas as produções. Regista temperaturas, separa zonas, evita contaminações cruzadas.',
    exemploCozinha: 'Usa e regista no KitchenFlow ECL. Não mistura utensílios de carne e vegetais. Verifica temperatura de serviço.',
    nivelComplexidade: {
      n1: 'Cumpre procedimentos HACCP básicos e regista no KitchenFlow.',
      n2: 'Aplica HACCP em produções complexas com ingredientes de alto risco.',
      n3: 'Gere HACCP de toda a produção e deteta não conformidades sem ser alertado.',
    },
    dicaRecuperacao: {
      n1: 'Na última aula não registaste no KitchenFlow. Desta vez faz o registo antes de começar a produção.',
      n2: 'Com ingredientes de alto risco (peixe cru, ovos), o HACCP é crítico. Verifica as temperaturas em cada fase.',
      n3: 'Como futuro profissional, és responsável pela segurança alimentar de quem consome o teu trabalho.',
    },
    ano: 1, trimestre: 2,
  },
  // T3
  {
    id: 'ATI-013', nome: 'Disponibilidade para aprender',
    descricao: 'Acolhe correcções sem resistência. Faz perguntas quando não percebe. Experimenta mesmo quando tem medo de errar.',
    exemploCozinha: 'Não desiste ao primeiro insucesso. Pede explicação quando não percebe uma técnica. Tenta de novo.',
    nivelComplexidade: {
      n1: 'Aceita correcções do professor e tenta novamente sem resistência.',
      n2: 'Procura aprender com os colegas e com os próprios erros de forma autónoma.',
      n3: 'Aprende de forma autónoma, procura referências externas e propõe melhorias ao próprio processo.',
    },
    dicaRecuperacao: {
      n1: 'Na última aula mostraste resistência a uma correcção. Desta vez, quando o professor corrigir, agradece e tenta de novo.',
      n2: 'Aprender com os colegas é tão importante como aprender com o professor. Pede feedback à equipa.',
      n3: 'Um profissional que não aprende fica parado. Mostra que procuras aprender mesmo quando não és obrigado.',
    },
    ano: 1, trimestre: 3,
  },
  {
    id: 'ATI-015', nome: 'Respeito pelas regras e normas definidas',
    descricao: 'Cumpre os procedimentos definidos para a cozinha, mesmo que discorde. Chega a horas, usa o equipamento correctamente.',
    exemploCozinha: 'Respeita as hierarquias da brigada. Não usa o telemóvel durante a produção. Segue os protocolos.',
    nivelComplexidade: {
      n1: 'Cumpre as regras básicas da cozinha escolar sem necessitar de lembretes.',
      n2: 'Respeita normas em contexto de serviço e com clientes presentes.',
      n3: 'Respeita e transmite as normas aos colegas em contexto profissional.',
    },
    dicaRecuperacao: {
      n1: 'Na última aula não cumpriste uma regra da cozinha. Relê as normas antes de entrar.',
      n2: 'Com clientes presentes, as regras têm impacto directo na imagem profissional. Não há excepções.',
      n3: 'Um profissional que não respeita normas coloca em risco a equipa e o estabelecimento.',
    },
    ano: 1, trimestre: 3,
  },
  {
    id: 'ATI-017', nome: 'Respeito pelas normas de segurança e saúde no trabalho',
    descricao: 'Usa equipamentos de protecção individual. Respeita o manuseamento de facas, equipamentos quentes e produtos de limpeza.',
    exemploCozinha: 'Comunica situações de risco. Não corre na cozinha. Usa luva de corte ao filetar.',
    nivelComplexidade: {
      n1: 'Usa EPI correctamente e reporta situações de risco ao professor.',
      n2: 'Identifica riscos proactivamente e alerta a equipa antes de ocorrerem acidentes.',
      n3: 'Gere a segurança do posto de trabalho de forma autónoma e sensibiliza os colegas.',
    },
    dicaRecuperacao: {
      n1: 'Na última aula não usaste o equipamento de protecção correctamente. Verifica a lista de EPI antes de começar.',
      n2: 'Um acidente na cozinha pode ter consequências graves. Identifica os riscos antes de começar a produção.',
      n3: 'Como futuro profissional, a segurança da equipa é também tua responsabilidade.',
    },
    ano: 1, trimestre: 3,
  },

  // ── 2º ANO ──────────────────────────────────────────────────
  // T1
  {
    id: 'ATI-002', nome: 'Autonomia no âmbito das suas funções',
    descricao: 'Executa as tarefas que lhe competem sem necessitar de instrução passo a passo. Gere o seu tempo e prioridades.',
    exemploCozinha: 'Sabe o que tem de fazer e faz. Não espera que o professor diga cada passo. Toma decisões dentro do seu âmbito.',
    nivelComplexidade: {
      n1: 'Executa tarefas simples sem instrução constante.',
      n2: 'Gere a sua estação de trabalho autonomamente durante toda a produção.',
      n3: 'Toma decisões profissionais autónomas, incluindo em situações imprevistas.',
    },
    dicaRecuperacao: {
      n1: 'Na última aula pediste ajuda para tarefas que já sabes fazer. Tenta resolver primeiro antes de pedir.',
      n2: 'Autonomia significa gerir a tua estação sem supervisão. Mostra que consegues durante toda a produção.',
      n3: 'Em estágio não há professor. Mostra que consegues trabalhar com autonomia total.',
    },
    ano: 2, trimestre: 1,
  },
  {
    id: 'ATI-007', nome: 'Empatia',
    descricao: 'Percebe o que os colegas precisam sem que tenham de pedir. Adapta a sua comunicação ao estado emocional dos outros.',
    exemploCozinha: 'Ajuda quando vê alguém com dificuldades. Não é indiferente ao que se passa à sua volta.',
    nivelComplexidade: {
      n1: 'Reconhece quando um colega está com dificuldades e oferece ajuda.',
      n2: 'Adapta a sua comunicação e postura ao estado da equipa durante o serviço.',
      n3: 'Antecipa necessidades da equipa e gere dinâmicas interpessoais com maturidade.',
    },
    dicaRecuperacao: {
      n1: 'Na última aula um colega tinha dificuldades e não reagiste. Desta vez, observa a equipa e oferece ajuda sem esperar ser pedido.',
      n2: 'Empatia em serviço significa ajustar o teu ritmo ao da equipa. Não trabalhes só para ti.',
      n3: 'Um líder empático consegue tirar o melhor de cada elemento da equipa. Demonstra isso.',
    },
    ano: 2, trimestre: 1,
  },
  // T2
  {
    id: 'ATI-008', nome: 'Escuta ativa',
    descricao: 'Ouve com atenção as instruções do professor e dos colegas. Não interrompe. Confirma que percebeu.',
    exemploCozinha: 'Não repete os mesmos erros por não ter prestado atenção. Confirma as instruções antes de executar.',
    nivelComplexidade: {
      n1: 'Ouve as instruções do professor sem interromper e executa correctamente à primeira.',
      n2: 'Escuta activamente os colegas durante a coordenação da produção.',
      n3: 'Lidera reuniões de brigada ouvindo todos os elementos antes de decidir.',
    },
    dicaRecuperacao: {
      n1: 'Na última aula repetiste um erro já corrigido. Desta vez confirma com o professor que percebeste a instrução antes de executar.',
      n2: 'Em equipa, não ouvir os colegas gera erros e conflitos. Confirma sempre o que foi dito.',
      n3: 'Liderar exige ouvir mais do que falar. Demonstra que consegues escutar toda a equipa.',
    },
    ano: 2, trimestre: 2,
  },
  {
    id: 'ATI-009', nome: 'Cooperação com a equipa',
    descricao: 'Trabalha em função do resultado do grupo, não só da sua tarefa. Partilha recursos e informação.',
    exemploCozinha: 'Adapta o ritmo ao da equipa. Não isola o seu trabalho. Partilha o que sobra com quem precisa.',
    nivelComplexidade: {
      n1: 'Partilha recursos e ajuda colegas na mesma produção.',
      n2: 'Coordena o seu trabalho com o da equipa em serviços complexos.',
      n3: 'Lidera a cooperação da brigada garantindo que todos trabalham para o mesmo objectivo.',
    },
    dicaRecuperacao: {
      n1: 'Na última aula trabalhaste isolado da equipa. Desta vez coordena pelo menos uma tarefa com um colega.',
      n2: 'Cooperação em serviço significa saber quando parar a tua tarefa para ajudar outra pessoa.',
      n3: 'Uma brigada que não coopera falha mesmo que cada um seja tecnicamente competente.',
    },
    ano: 2, trimestre: 2,
  },
  {
    id: 'ATI-010', nome: 'Empenho e persistência na resolução de problemas',
    descricao: 'Quando algo não resulta à primeira, tenta de novo. Procura soluções em vez de desistir ou esperar que o professor resolva.',
    exemploCozinha: 'Mostra determinação mesmo nas tarefas mais difíceis. Não desiste quando falha uma técnica.',
    nivelComplexidade: {
      n1: 'Tenta resolver um problema técnico pelo menos duas vezes antes de pedir ajuda.',
      n2: 'Encontra soluções alternativas quando o plano original falha em contexto de produção.',
      n3: 'Resolve problemas complexos de forma autónoma e partilha a solução com a equipa.',
    },
    dicaRecuperacao: {
      n1: 'Na última aula desististe rapidamente quando algo não correu bem. Desta vez tenta pelo menos duas vezes antes de pedir ajuda.',
      n2: 'Em serviço, os problemas têm de ser resolvidos sem parar a produção. Mostra que consegues.',
      n3: 'Um profissional resiliente é valioso. Demonstra que não te rendes perante dificuldades.',
    },
    ano: 2, trimestre: 2,
  },
  // T3
  {
    id: 'ATI-012', nome: 'Flexibilidade e adaptabilidade',
    descricao: 'Ajusta-se quando o plano muda. Não bloqueia perante o imprevisto. Encontra alternativas.',
    exemploCozinha: 'Ingrediente em falta, equipamento avariado, tempo reduzido — adapta sem perder a qualidade.',
    nivelComplexidade: {
      n1: 'Adapta-se a uma mudança simples no plano sem perder o foco.',
      n2: 'Ajusta a produção inteira quando surge um imprevisto significativo.',
      n3: 'Gere múltiplos imprevistos em simultâneo mantendo a qualidade do serviço.',
    },
    dicaRecuperacao: {
      n1: 'Na última aula bloqueaste quando algo mudou. Desta vez, se o plano mudar, adapta imediatamente.',
      n2: 'Imprevistos são normais na cozinha profissional. Mostra que consegues improvisar com qualidade.',
      n3: 'Flexibilidade em liderança significa manter a equipa focada mesmo quando tudo muda.',
    },
    ano: 2, trimestre: 3,
  },
  {
    id: 'ATI-018', nome: 'Respeito pela sensibilidade e bem-estar dos outros',
    descricao: 'Tem consciência do impacto das suas palavras e acções nos colegas. Não faz comentários que magoam.',
    exemploCozinha: 'Percebe quando um colega está a ter dificuldades e ajusta a sua postura. Não humilha em público.',
    nivelComplexidade: {
      n1: 'Evita comentários negativos sobre o trabalho dos colegas.',
      n2: 'Apoia activamente colegas com dificuldades sem comprometer a produção.',
      n3: 'Cria um ambiente de trabalho positivo e inclusivo para toda a brigada.',
    },
    dicaRecuperacao: {
      n1: 'Na última aula fizeste um comentário que afectou negativamente um colega. Pensa antes de falar.',
      n2: 'Apoiar os colegas é tão importante como o teu trabalho técnico. Mostra que consegues fazer os dois.',
      n3: 'Um líder que não cuida do bem-estar da equipa perde a sua confiança.',
    },
    ano: 2, trimestre: 3,
  },
  {
    id: 'ATI-022', nome: 'Respeito pelas diferenças individuais',
    descricao: 'Trabalha com naturalidade com colegas de diferentes origens, culturas, capacidades e formas de ser.',
    exemploCozinha: 'Não rotula nem exclui. Valoriza a diversidade como riqueza da brigada e da gastronomia mundial.',
    nivelComplexidade: {
      n1: 'Trabalha com todos os colegas sem distinção ou exclusão.',
      n2: 'Valoriza activamente as diferenças culturais na produção — ingredientes, técnicas, sabores.',
      n3: 'Promove a inclusão na brigada e usa a diversidade cultural como vantagem criativa.',
    },
    dicaRecuperacao: {
      n1: 'Na última aula mostraste resistência em trabalhar com determinados colegas. Desta vez trabalha com quem te for atribuído.',
      n2: 'A gastronomia é multicultural por natureza. Mostra que abraças essa diversidade.',
      n3: 'Uma brigada diversa é uma brigada criativa. Lidera aproveitando o melhor de cada um.',
    },
    ano: 2, trimestre: 3,
  },

  // ── 3º ANO ──────────────────────────────────────────────────
  // T1
  {
    id: 'ATI-004', nome: 'Iniciativa',
    descricao: 'Propõe soluções sem esperar que lhe peçam. Antecipa necessidades. Age antes de ser instruído.',
    exemploCozinha: 'Repõe stock sem ser pedido. Sugere uma melhoria ao prato. Arregaça as mangas quando vê que alguém precisa.',
    nivelComplexidade: {
      n1: 'Toma iniciativa em tarefas simples e previsíveis.',
      n2: 'Propõe melhorias ao processo de produção com fundamentação.',
      n3: 'Lidera iniciativas criativas e profissionais com impacto na equipa e no resultado.',
    },
    dicaRecuperacao: {
      n1: 'Na última aula esperaste sempre que te dissessem o que fazer. Desta vez antecipa pelo menos uma tarefa.',
      n2: 'Iniciativa com fundamentação é mais valiosa que iniciativa impulsiva. Propõe e explica porquê.',
      n3: 'Em contexto profissional, a iniciativa distingue quem lidera de quem segue.',
    },
    ano: 3, trimestre: 1,
  },
  {
    id: 'ATI-006', nome: 'Assertividade',
    descricao: 'Comunica o que pensa de forma clara, directa e respeitosa. Defende o seu ponto de vista sem agressividade nem passividade.',
    exemploCozinha: 'Diz quando não concorda com um método. Comunica um problema ao professor sem hesitar.',
    nivelComplexidade: {
      n1: 'Comunica opiniões e dúvidas de forma clara sem hesitar.',
      n2: 'Defende posições técnicas com argumentos perante a equipa.',
      n3: 'Comunica assertivamente com clientes, superiores e equipa em contexto profissional.',
    },
    dicaRecuperacao: {
      n1: 'Na última aula não expressaste a tua opinião quando devias. Desta vez diz o que pensas de forma clara e respeitosa.',
      n2: 'Assertividade não é agressividade. Mostra que consegues defender uma posição sem conflito.',
      n3: 'Comunicar assertivamente com clientes e chefes é uma competência profissional crítica.',
    },
    ano: 3, trimestre: 1,
  },
  // T2
  {
    id: 'ATI-014', nome: 'Respeito pelos princípios da sustentabilidade',
    descricao: 'Reduz desperdício activamente. Aproveita subprodutos. Escolhe ingredientes de época. Gere energia e água com consciência.',
    exemploCozinha: 'Usa as aparas do peixe para fumet. Não deixa o fogão ligado sem necessidade. Prefere ingredientes locais.',
    nivelComplexidade: {
      n1: 'Reduz desperdício visível e separa resíduos correctamente.',
      n2: 'Integra princípios de sustentabilidade nas decisões de produção — aproveitamento, época, origem.',
      n3: 'Concebe produções sustentáveis do início ao fim, minimizando impacto ambiental.',
    },
    dicaRecuperacao: {
      n1: 'Na última aula desperdiçaste ingredientes desnecessariamente. Desta vez pensa em como aproveitar tudo.',
      n2: 'Sustentabilidade nas decisões de compra e produção é uma competência profissional crescente.',
      n3: 'Conceber um menu sustentável é uma competência que o mercado valoriza cada vez mais.',
    },
    ano: 3, trimestre: 2,
  },
  {
    id: 'ATI-019', nome: 'Autoconfiança',
    descricao: 'Apresenta o seu trabalho com segurança. Não pede validação constante. Aceita elogios e críticas com a mesma serenidade.',
    exemploCozinha: 'Acredita nas suas competências sem arrogância. Apresenta o prato com convicção.',
    nivelComplexidade: {
      n1: 'Apresenta o seu trabalho ao professor sem minimizá-lo.',
      n2: 'Apresenta e defende as suas escolhas técnicas perante a equipa.',
      n3: 'Apresenta o seu trabalho com confiança profissional em contexto de estágio e avaliação externa.',
    },
    dicaRecuperacao: {
      n1: 'Na última aula desvalorizaste o teu próprio trabalho antes de ser avaliado. Apresenta o que fizeste com confiança.',
      n2: 'Confiança nas tuas escolhas técnicas é o que separa um aprendiz de um profissional.',
      n3: 'Em estágio, a autoconfiança é lida como competência. Demonstra-a.',
    },
    ano: 3, trimestre: 2,
  },
  // T3
  {
    id: 'ATI-020', nome: 'Postura profissional',
    descricao: 'Comporta-se como num contexto real de trabalho — linguagem, postura, relação com clientes e superiores.',
    exemploCozinha: 'Distingue o que é adequado do que não é num ambiente profissional. Trata todos com respeito formal.',
    nivelComplexidade: {
      n1: 'Adopta postura e linguagem adequadas à cozinha escolar.',
      n2: 'Mantém postura profissional em serviço com clientes e eventos.',
      n3: 'Representa a escola e a profissão com excelência em contexto de estágio e eventos externos.',
    },
    dicaRecuperacao: {
      n1: 'Na última aula a tua postura ou linguagem não foi adequada ao contexto profissional.',
      n2: 'Com clientes presentes, a postura profissional é inegociável. Demonstra que a tens.',
      n3: 'Em estágio, és embaixador da escola. A tua postura reflecte a tua formação.',
    },
    ano: 3, trimestre: 3,
  },
  {
    id: 'ATI-021', nome: 'Sentido crítico',
    descricao: 'Avalia o próprio trabalho com honestidade. Identifica o que pode melhorar sem precisar que o professor aponte.',
    exemploCozinha: 'Questiona processos e propõe alternativas fundamentadas. Não se contenta com "está bom".',
    nivelComplexidade: {
      n1: 'Identifica um aspecto a melhorar no próprio trabalho após cada produção.',
      n2: 'Analisa criticamente a produção da equipa e propõe melhorias concretas.',
      n3: 'Desenvolve pensamento crítico sobre tendências, técnicas e processos profissionais.',
    },
    dicaRecuperacao: {
      n1: 'Na última aula não conseguiste identificar o que podias ter feito melhor. Desta vez, antes de terminar, analisa o teu trabalho.',
      n2: 'Criticar construtivamente a equipa é tão valioso como criticar o próprio trabalho.',
      n3: 'Um profissional sem sentido crítico não evolui. Mostra que consegues questionar e melhorar.',
    },
    ano: 3, trimestre: 3,
  },
];

// ── Helpers ───────────────────────────────────────────────────
export function getAtitudeDetalhada(id: string): AtitudeDetalhada | undefined {
  return ATITUDES_DETALHADAS.find(a => a.id === id);
}

export function atitudesDoTrimestre(ano: 1|2|3, trimestre: 1|2|3): AtitudeDetalhada[] {
  return ATITUDES_DETALHADAS.filter(a => a.ano === ano && a.trimestre === trimestre);
}

export function todasAtitudesAteAno(ano: 1|2|3): AtitudeDetalhada[] {
  return ATITUDES_DETALHADAS.filter(a => a.ano <= ano);
}

export function dicaRecuperacaoAtitude(id: string, ano: 1|2|3): string {
  const a = getAtitudeDetalhada(id);
  if (!a) return '';
  return a.dicaRecuperacao[`n${ano}` as 'n1'|'n2'|'n3'] || '';
}

export function nivelComplexidadeAtitude(id: string, ano: 1|2|3): string {
  const a = getAtitudeDetalhada(id);
  if (!a) return '';
  return a.nivelComplexidade[`n${ano}` as 'n1'|'n2'|'n3'] || '';
}

// ── Calcular nota final de plano (1-4) ───────────────────────
export function calcularNotaPlano(notas: {
  obr: number[];
  sub: number[];
  app: number[];
  knw: number[];
  ati: number[];
}): number {
  const media = (arr: number[]) => arr.length > 0
    ? arr.reduce((a, b) => a + b, 0) / arr.length
    : 0;
  const componentes = [
    media(notas.obr),
    media(notas.sub),
    media(notas.app),
    media(notas.knw),
    media(notas.ati),
  ].filter(n => n > 0);
  if (componentes.length === 0) return 0;
  return Math.round((componentes.reduce((a, b) => a + b, 0) / componentes.length) * 10) / 10;
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
  try { return (getLibrary().aparelhos as any[]).find(a => a.id === id); } catch { return undefined; }
}

// ── Subtécnicas (SUB-xxx-xxx-xxx) ────────────────────────────
export function encontrarSubtecnica(id: string): {
  id: string; nome: string; tecnica_id?: string;
  definicao?: string; resultado_esperado?: string;
} | undefined {
  try { return (getLibrary().subtecnicas as any[]).find(s => s.id === id) as any; } catch { return undefined; }
}

// ── Conhecimentos (KNW-xxxxx) ─────────────────────────────────
export function encontrarConhecimento(id: string): {
  id: string; nome: string; nivel: number; dominio: string;
  familia_tecnica: string; definicao: string;
} | undefined {
  try { return (getLibrary().conhecimentos as any[]).find(k => k.id === id); } catch { return undefined; }
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

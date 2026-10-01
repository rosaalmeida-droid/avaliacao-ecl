// ============================================================
// Banco de conhecimentos dos Manuais do Aluno
// ============================================================
// Tirado do índice de cada manual (scripts/extrairBancoManuais.py): as
// partes, os capítulos e, em cada capítulo, os pontos de «O que vais
// aprender». O professor escolhe no plano os capítulos e os campos que
// trabalhou na aula, sem ter de inventar perguntas; o aluno autoavalia-se
// em cada campo, com o capítulo do manual à frente (Rosa, out/2026).
// ============================================================
import BANCO from './bancoManuais.json';
import { manualDoModulo } from './manuais';

export interface CapituloManual {
  n: number;
  parte: string;
  titulo: string;
  /** «O que vais aprender»: os campos que se trabalham neste capítulo. */
  objetivos: string[];
}

const banco = BANCO as Record<string, CapituloManual[]>;

/** O manual da UC (ou UFCD) com os seus capítulos, se houver. */
export function manualDaUC(ucId: string | undefined): { ficheiro: string; titulo: string; capitulos: CapituloManual[] } | null {
  if (!ucId) return null;
  const m = manualDoModulo(ucId);
  const caps = m ? banco[m.ficheiro] : undefined;
  return m && caps?.length ? { ficheiro: m.ficheiro, titulo: m.titulo, capitulos: caps } : null;
}

/** Os campos de um capítulo (o título, se o capítulo não tiver «O que vais aprender»). */
export function camposDoCapitulo(c: CapituloManual): string[] {
  return c.objetivos.length ? c.objetivos : [c.titulo];
}

/** Código de um campo do manual. Começa por KNW-P para contar como um
 *  conhecimento escolhido pelo professor (nome, nota, validação). */
export const idCampoManual = (ficheiro: string, cap: number, i: number) => `KNW-P-M-${ficheiro}-${cap}-${i}`;

// ── Os três níveis (Rosa, out/2026) ──────────────────────────
// Do mais geral ao mais específico, como o manual está organizado:
//   Tema       — a parte do manual: o conhecimento base («Peixe e marisco»);
//   Conteúdo   — o capítulo («O bacalhau: demolha e cozedura»);
//   Indicador  — o que o aluno mostra que sabe («Executar a demolha
//                segundo a espessura da posta»). É o que se avalia.
export const NIVEIS_CONHECIMENTO = { tema: 'Tema', conteudo: 'Conteúdo', indicador: 'Indicador' } as const;

/** O texto de um conteúdo: «Cap. 21 — O bacalhau: demolha e cozedura». */
export const rotuloConteudo = (c: CapituloManual) => `Cap. ${c.n} — ${c.titulo}`;

/** Os conteúdos do manual já trabalhados pela turma noutras aulas desta UC. */
export function conteudosTrabalhados(planos: any[], turmaId: string, ucId: string, excetoPlano?: string): Set<string> {
  const feitos = new Set<string>();
  for (const p of planos) {
    if (p.turmaId !== turmaId || p.ucId !== ucId || p.id === excetoPlano || p.estado === 'arquivado') continue;
    for (const k of (p.conhecimentosProf || []) as { id: string }[]) {
      const m = /^KNW-P-M-(.+)-(\d+)-\d+$/.exec(k.id);
      if (m) feitos.add(`${m[1]}-${m[2]}`);
    }
  }
  return feitos;
}

/**
 * O próximo conteúdo da UC para esta turma: o primeiro capítulo, pela ordem
 * do manual, que ainda não foi trabalhado. Os conhecimentos vão-se dando
 * por ordem ao longo da UC, e o professor só confirma.
 */
export function proximoConteudo(planos: any[], turmaId: string, ucId: string, excetoPlano?: string): { ficheiro: string; capitulo: CapituloManual } | null {
  const m = manualDaUC(ucId);
  if (!m) return null;
  const feitos = conteudosTrabalhados(planos, turmaId, ucId, excetoPlano);
  const c = m.capitulos.find(c => !feitos.has(`${m.ficheiro}-${c.n}`));
  return c ? { ficheiro: m.ficheiro, capitulo: c } : null;
}

/** Os indicadores de um conteúdo, prontos a gravar no plano (conhecimentosProf). */
export function indicadoresDoConteudo(ficheiro: string, c: CapituloManual): { id: string; texto: string; capitulo: string; tema: string }[] {
  return camposDoCapitulo(c).map((t, i) => ({ id: idCampoManual(ficheiro, c.n, i), texto: t, capitulo: `Manual, ${rotuloConteudo(c)}`, tema: c.parte }));
}

/** O capítulo de um campo do manual, pelo código. */
export function capituloDoCampo(id: string): { ficheiro: string; capitulo: CapituloManual } | null {
  const m = /^KNW-P-M-(.+)-(\d+)-(\d+)$/.exec(id);
  if (!m) return null;
  const capitulo = banco[m[1]]?.find(c => c.n === Number(m[2]));
  return capitulo ? { ficheiro: m[1], capitulo } : null;
}

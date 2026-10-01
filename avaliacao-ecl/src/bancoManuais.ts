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

/** O capítulo de um campo do manual, pelo código. */
export function capituloDoCampo(id: string): { ficheiro: string; capitulo: CapituloManual } | null {
  const m = /^KNW-P-M-(.+)-(\d+)-(\d+)$/.exec(id);
  if (!m) return null;
  const capitulo = banco[m[1]]?.find(c => c.n === Number(m[2]));
  return capitulo ? { ficheiro: m[1], capitulo } : null;
}

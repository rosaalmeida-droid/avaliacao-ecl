// ============================================================
// Pauta final da UC — no modelo da escola (ECL.GAE.087.1)
// ============================================================
// A pauta é EXATAMENTE o modelo da escola. O ficheiro Excel parte de
// public/pauta_modelo.xlsx, que é o modelo original convertido célula a
// célula (fontes, cores, bordas, alinhamentos, larguras, alturas,
// junções e fórmulas). A aplicação só preenche as células de dados; o
// resto do modelo fica como está. O PDF é desenhado a partir da mesma
// grelha (src/pautaModelo.json) com os mesmos valores.
//
// Duas correções às fórmulas do modelo, sem mudar o formato:
//   - o TOTAL lia a coluna U (vazia) em vez do CP (T): o CP não contava;
//   - o CR não tinha peso (X14 vazio): os 5 C's somavam 90%.
//
// O que a aplicação calcula:
//   - PRODUTOS: os planos de aula da UC efetivamente avaliados (até 7
//     colunas, como no modelo; com mais planos, juntam-se por ordem).
//     Uma aula a que o aluno faltou conta 0 (ou a nota da recuperação).
//   - PONDERAÇÃO (linha 9): cada produto pesa pelo número de elementos
//     (competências) efetivamente avaliados nele. Um produto sem
//     avaliação pesa 0%.
//   - 5 C's: saem das atitudes observadas e validadas ao longo da UC,
//     cada atitude ligada ao seu C (MAPA_5C). O CM junta a assiduidade
//     e a pontualidade; o CO junta a higiene (obrigatórias). O CP é a
//     fórmula do modelo sobre os produtos.
//   - PROPOSTA ALUNO: a nota que o aluno propôs na autoavaliação final.
//   - CLASSIF. ATRIBUÍDA: a nota final da UC; negativas levam "a)".
// ============================================================
import {
  getAlunos, getPlanosAulaPorTurma, getValidacoes, getHistoricoAvaliacoes,
  getPlanosFaltadosPorUC, getAtividades, situacaoRecuperacaoUC, assiduidadeNaUC,
  notaFinalUC, participacoesDoAlunoNaUC, notaRecuperacaoUC, getPropostaFinalUC,
} from './backend';
import { calcularNotaPlano } from './types';
import { modulosDaTurma } from './cronograma';
import { ATITUDES } from './compatECL';
import MODELO from './pautaModelo.json';

// ── Os 5 C's: que atitudes contribuem para cada um ───────────

export type Letra5C = 'cm' | 'cl' | 'co' | 'cr';

export const MAPA_5C: Record<Letra5C, { sigla: string; nome: string; atitudes: string[]; tambem?: string }> = {
  cm: { sigla: 'CM', nome: 'Comprometido', tambem: 'assiduidade e pontualidade',
    atitudes: ['ATI-001', 'ATI-010', 'ATI-013', 'ATI-020', 'ATI-003', 'ATI-011'] },
  cl: { sigla: 'CL', nome: 'Colaborativo',
    atitudes: ['ATI-009', 'ATI-008', 'ATI-007', 'ATI-018', 'ATI-022', 'ATI-006'] },
  co: { sigla: 'CO', nome: 'Consciente', tambem: 'higiene e segurança (obrigatórias)',
    atitudes: ['ATI-015', 'ATI-016', 'ATI-017', 'ATI-014', 'ATI-005'] },
  cr: { sigla: 'CR', nome: 'Criativo',
    atitudes: ['ATI-004', 'ATI-021', 'ATI-012', 'ATI-019', 'ATI-002'] },
};

const nomeAtitude = (id: string) => (ATITUDES as any[]).find(a => a.id === id)?.nome || id;

/** Nível do modelo: 0 N.R./N.O. · 2 Insuficiente · 4 Suficiente · 5 Bom · 6 Muito bom
 *  (as mesmas fronteiras das fórmulas do modelo). */
export function nivelPauta(nota20: number | null | undefined): number {
  if (nota20 === null || nota20 === undefined || isNaN(nota20) || nota20 === 0) return 0;
  return nota20 < 9.5 ? 2 : nota20 < 14 ? 4 : nota20 < 17 ? 5 : 6;
}

const media = (xs: (number | null | undefined)[]) => {
  const v = xs.filter((x): x is number => typeof x === 'number' && !isNaN(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
const hojeISO = () => new Date().toISOString().slice(0, 10);

// ── Produtos e ponderação ────────────────────────────────────

export const MAX_PRODUTOS = 7;   // as colunas do modelo

export interface ProdutoPauta {
  numero: number;              // 1..7, como no modelo
  titulo: string;
  planosIds: string[];
  /** Elementos (competências) efetivamente avaliados neste produto. */
  elementos: number;
  /** Peso em % — pelo número de elementos avaliados. */
  peso: number;
}

const categoria = (id: string) => id?.startsWith('OBR_') ? 'OBR'
  : id?.startsWith('SUB-') || id?.startsWith('APP-') ? 'SUB'
  : id?.startsWith('KNW-') ? 'KNW' : id?.startsWith('INI-') ? 'INI' : 'ATI';

/** Nota 0-20 de um aluno num plano: a validação do professor. */
function notaDoPlano(alunoId: string, planoId: string, tipo: string): number | null {
  const v: any = getValidacoes().find((x: any) => x.planoAulaId === planoId && x.alunoId === alunoId);
  if (!v) return null;
  if (typeof v.notaMedia20 === 'number') return v.notaMedia20;
  const notas = (v.notas || []).map((n: any) => ({ categoria: categoria(n.competenciaId) as any, nota: Number(n.nota) || 0 }));
  return notas.length ? calcularNotaPlano(notas, (tipo || 'pratico') as any).nota20 : null;
}

/** Os planos da UC que já aconteceram e foram avaliados, como produtos do modelo. */
export function produtosDaUC(turmaId: string, ucId: string): ProdutoPauta[] {
  const validacoes = getValidacoes() as any[];
  const planos = getPlanosAulaPorTurma(turmaId)
    .filter(p => p.ucId === ucId && (p.estado === 'publicado' || (p.estado as string) === 'realizada')
      && String(p.data).slice(0, 10) <= hojeISO())
    .sort((a, b) => String(a.data).localeCompare(String(b.data))
      || String(a.horaInicio || '').localeCompare(String(b.horaInicio || '')))
    // Só o que foi efetivamente avaliado entra na pauta.
    .filter(p => validacoes.some(v => v.planoAulaId === p.id));

  // Elementos avaliados em cada plano: as competências que o professor validou.
  const elementosDe = (ids: string[]) => new Set(validacoes
    .filter(v => ids.includes(v.planoAulaId))
    .flatMap(v => (v.notas || []).map((n: any) => n.competenciaId))).size || 1;

  // Até 7 colunas; com mais planos, juntam-se por ordem, em grupos seguidos.
  const grupos: typeof planos[] = [];
  const n = planos.length, k = Math.min(MAX_PRODUTOS, n);
  let i = 0;
  for (let g = 0; g < k; g++) {
    const tam = Math.floor(n / k) + (g < n % k ? 1 : 0);
    grupos.push(planos.slice(i, i + tam)); i += tam;
  }
  const produtos = grupos.map((g, j) => ({
    numero: j + 1,
    titulo: g.length === 1 ? (g[0].titulo || `Plano ${j + 1}`)
      : g.map(p => p.titulo || '').filter(Boolean).join(' + '),
    planosIds: g.map(p => p.id),
    elementos: elementosDe(g.map(p => p.id)),
    peso: 0,
  }));
  const total = produtos.reduce((s, p) => s + p.elementos, 0) || 1;
  produtos.forEach(p => { p.peso = Math.round((p.elementos / total) * 1000) / 10; });
  // Acerto de arredondamento: a soma dá sempre 100%.
  if (produtos.length) {
    const soma = produtos.reduce((s, p) => s + p.peso, 0);
    produtos[produtos.length - 1].peso = Math.round((produtos[produtos.length - 1].peso + 100 - soma) * 10) / 10;
  }
  return produtos;
}

// ── Linhas dos alunos ────────────────────────────────────────

export interface Evidencia5C { rotulo: string; nota20: number; vezes: number }

export interface LinhaPautaUC {
  alunoId: string;
  numero: number;
  nome: string;
  atividades: number;
  /** Nota 0-20 de cada produto (7): 0 se faltou, null se sem avaliação. */
  produtos: (number | null)[];
  /** Nível 0-6 de cada C; null quando não houve nenhuma evidência. */
  c5: Record<Letra5C, number | null>;
  /** As evidências de onde saiu cada C — para o professor ver o fundamento. */
  evidencias: Record<Letra5C, Evidencia5C[]>;
  proposta: number | null;
  justificacao: string;
  final: number | null;
}

export function linhasDaPautaUC(turmaId: string, ucId: string, produtos: ProdutoPauta[]): LinhaPautaUC[] {
  const planos = getPlanosAulaPorTurma(turmaId);
  const tipoDe = (id: string) => (planos.find(p => p.id === id) as any)?.tipoPlanAula || 'pratico';
  const validados = getHistoricoAvaliacoes().filter(r =>
    r.turmaId === turmaId && r.ucId === ucId && r.validadoPor === 'professor');

  return getAlunos()
    .filter(a => a.turmaId === turmaId && a.ativo !== false)
    .sort((a, b) => a.numero - b.numero)
    .map(a => {
      const faltou = new Set(getPlanosFaltadosPorUC(a.id, ucId, turmaId).map(p => p.id));
      const recup = notaRecuperacaoUC(a.id, ucId);
      const regs = validados.filter(r => r.alunoId === a.id);

      // Produtos: média dos planos do grupo; falta = 0 (ou a recuperação).
      const notasProd = Array.from({ length: MAX_PRODUTOS }, (_, j) => {
        const p = produtos[j];
        if (!p) return null;
        const notas = p.planosIds.map(id => {
          if (faltou.has(id)) return recup ?? 0;
          return notaDoPlano(a.id, id, tipoDe(id));
        });
        const m = media(notas);
        return m === null ? null : Math.round(m * 10) / 10;
      });

      // 5 C's a partir das evidências
      const evidencias: Record<Letra5C, Evidencia5C[]> = { cm: [], cl: [], co: [], cr: [] };
      (Object.keys(MAPA_5C) as Letra5C[]).forEach(c => {
        MAPA_5C[c].atitudes.forEach(id => {
          const ns = regs.filter(r => r.microcompetenciaId === id).map(r => r.nota * 4);
          if (ns.length) evidencias[c].push({ rotulo: nomeAtitude(id), nota20: media(ns)!, vezes: ns.length });
        });
      });
      const s = situacaoRecuperacaoUC(a.id, turmaId, ucId);
      const assid = assiduidadeNaUC(a.id, turmaId, ucId);
      if (assid.aulasPrevistas > 0) {
        evidencias.cm.push({ rotulo: `Assiduidade (${s.presenca}% das horas dadas)`, nota20: s.presenca / 5, vezes: assid.aulasPrevistas });
        if (assid.presencas > 0) evidencias.cm.push({
          rotulo: `Pontualidade (${assid.atrasos} atraso${assid.atrasos === 1 ? '' : 's'})`,
          nota20: (1 - assid.atrasos / assid.presencas) * 20, vezes: assid.presencas });
      }
      const obr = regs.filter(r => r.microcompetenciaId.startsWith('OBR_')).map(r => r.nota * 4);
      if (obr.length) evidencias.co.push({ rotulo: 'Higiene e segurança (obrigatórias)', nota20: media(obr)!, vezes: obr.length });
      const c5 = Object.fromEntries((Object.keys(evidencias) as Letra5C[]).map(c => {
        const m = media(evidencias[c].map(e => e.nota20));
        return [c, m === null ? null : nivelPauta(m)];
      })) as Record<Letra5C, number | null>;

      const prop = getPropostaFinalUC(a.id, ucId);
      return {
        alunoId: a.id, numero: a.numero, nome: a.nome || `Aluno ${a.numero}`,
        atividades: participacoesDoAlunoNaUC(a.id, turmaId, ucId),
        produtos: notasProd, c5, evidencias,
        proposta: prop ? prop.nota : null, justificacao: prop?.justificacao || '',
        final: notaFinalUC(a.id, turmaId, ucId).final,
      };
    });
}

/** Atividades da turma no período do módulo — o "Total Pond" da coluna ATIV. */
export function atividadesDoModulo(turmaId: string, ucId: string): number {
  const mod: any = modulosDaTurma(turmaId).find((m: any) => m.id === ucId);
  return getAtividades().filter(a => {
    if (a.turmaId !== turmaId) return false;
    const d = String(a.data || '').slice(0, 10);
    return !mod?.dataInicio || !mod?.dataFim || (d >= mod.dataInicio && d <= mod.dataFim);
  }).length;
}

// ── As contas do modelo (as mesmas das fórmulas) ─────────────

const PESOS_5C = { cm: 0.1, cp: 0.6, cl: 0.1, co: 0.1, cr: 0.1 };

export function calculoDoModelo(l: LinhaPautaUC, produtos: ProdutoPauta[], totalAtividades: number) {
  const nAtiv = l.atividades < 1 ? 0 : l.atividades < totalAtividades * 0.5 ? 2
    : l.atividades < totalAtividades * 0.7 ? 4 : l.atividades < totalAtividades * 0.85 ? 5 : 6;
  const niveis = l.produtos.map(v => nivelPauta(v));
  const cp = niveis.reduce((s, n, j) => s + n * ((produtos[j]?.peso || 0) / 100), 0);
  const total = (l.c5.cm ?? 0) * PESOS_5C.cm + cp * PESOS_5C.cp + (l.c5.cl ?? 0) * PESOS_5C.cl
    + (l.c5.co ?? 0) * PESOS_5C.co + (l.c5.cr ?? 0) * PESOS_5C.cr;
  const resultado = total < 3.5 ? 'Módulo em atraso' : total < 4.5 ? 'Suficiente' : total < 5.5 ? 'Bom' : 'Muito bom';
  return { nAtiv, niveis, cp, total, resultado };
}

export const classificacaoComNota = (final: number | null) => {
  if (final === null) return '';
  const f = Math.round(final);
  return f < 10 ? `${f} a)` : f;
};

// ── Cabeçalho ────────────────────────────────────────────────

export interface CabecalhoPauta {
  turma: string;
  disciplina: string;
  formador: string;
  ucId: string;
  ucNome: string;
  dataInicio: string;
  dataFim: string;
}

const dataPT = (iso: string) => {
  const [a, m, d] = String(iso || '').slice(0, 10).split('-');
  return a && m && d ? `${d}/${m}/${a}` : '';
};

export function nomeFicheiroPauta(cab: CabecalhoPauta, ext: 'xlsx' | 'pdf'): string {
  return `Pauta ${cab.ucId} ${cab.turma.split(' — ')[0]}.${ext}`.replace(/[\\/:*?"<>|]/g, '-');
}

// Colunas do modelo (base 1, como no Excel)
const COL = { A: 1, B: 2, C: 3, D: 4, S: 19, T: 20, V: 22, W: 23, X: 24, Y: 25, Z: 26, AE: 31, AG: 33 };
const COL_PROD = [5, 7, 9, 11, 13, 15, 17];              // E G I K M O Q (nota)
const COL_PESO = [10, 11, 12, 13, 14, 15, 16];            // J..P linha 9
const LETRA = (c: number) => { let s = ''; for (let n = c; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
const PRIMEIRA = 15, LINHAS_MODELO = 23;

export interface DadosPauta {
  cabecalho: CabecalhoPauta;
  produtos: ProdutoPauta[];
  linhas: LinhaPautaUC[];
  totalAtividades: number;
}

// ── Excel (.xlsx) ────────────────────────────────────────────

export async function gerarPautaXLSX(d: DadosPauta): Promise<Blob> {
  const ExcelJS: any = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const resp = await fetch('/pauta_modelo.xlsx');
  if (!resp.ok) throw new Error('Não encontrei o modelo da pauta.');
  await wb.xlsx.load(await resp.arrayBuffer());
  const ws = wb.worksheets[0];
  const set = (addr: string, v: any) => { ws.getCell(addr).value = v; };
  const f = (addr: string, formula: string) => { ws.getCell(addr).value = { formula }; };

  // Cabeçalho
  set('AB1', d.cabecalho.turma.split(' — ')[0]);
  set('AB2', d.cabecalho.disciplina);
  set('AB3', d.cabecalho.formador);
  set('AB5', `${d.cabecalho.ucId} — ${d.cabecalho.ucNome}`);
  set('AB6', dataPT(d.cabecalho.dataInicio));
  set('AF6', dataPT(d.cabecalho.dataFim));
  set('C14', d.totalAtividades);
  set('V39', dataPT(hojeISO()));

  // Produtos: nome na linha 13, peso na linha 9
  COL_PROD.forEach((c, j) => {
    const p = d.produtos[j];
    set(`${LETRA(c)}13`, p ? p.titulo : j + 1);
    set(`${LETRA(COL_PESO[j])}9`, p ? p.peso / 100 : 0);
  });

  // Alunos. Se houver mais do que as 23 linhas do modelo, acrescentam-se
  // linhas iguais antes da última (que tem a borda de fecho).
  const extra = Math.max(0, d.linhas.length - LINHAS_MODELO);
  if (extra) ws.duplicateRow(PRIMEIRA + LINHAS_MODELO - 2, extra, true);
  const nLinhas = LINHAS_MODELO + extra;
  for (let k = 0; k < nLinhas; k++) {
    const R = PRIMEIRA + k;
    const l = d.linhas[k];
    const lv = (c: number) => `${LETRA(c)}${R}`;
    if (!l) {
      // Linha sem aluno: fica em branco, com o formato do modelo.
      for (let c = 1; c <= 34; c++) {
        const cell = ws.getCell(R, c);
        if (!cell.isMerged || cell.master === cell) cell.value = null;
      }
      continue;
    }
    set(lv(COL.A), l.numero);
    set(lv(COL.B), l.nome);
    set(lv(COL.C), l.atividades);
    f(lv(COL.D), `IF(C${R}<1,"0",IF(C${R}<$C$14*0.5,"2",IF(C${R}<$C$14*0.7,"4",IF(C${R}<$C$14*0.85,"5","6"))))`);
    COL_PROD.forEach((c, j) => {
      const v = l.produtos[j];
      set(lv(c), v === null ? null : v);
      const e = lv(c);
      f(lv(c + 1), `IF(${e}=0,"0",IF(${e}<9.5,"2",IF(${e}<14,"4",IF(${e}<17,"5","6"))))`);
    });
    f(lv(COL.T), COL_PROD.map((c, j) => `(${LETRA(c + 1)}${R}*$${LETRA(COL_PESO[j])}$9)`).join('+'));
    set(lv(COL.S), l.c5.cm);
    set(lv(COL.V), l.c5.cl);
    set(lv(COL.W), l.c5.co);
    set(lv(COL.X), l.c5.cr);
    f(lv(COL.Y), `(S${R}*$S$14)+(T${R}*$U$14)+(V${R}*$V$14)+(W${R}*$W$14)+(X${R}*$X$14)`);
    f(lv(COL.Z), `IF(Y${R}<3.5,"Módulo em atraso",IF(Y${R}<4.5,"Suficiente",IF(Y${R}<5.5,"Bom","Muito bom")))`);
    set(lv(COL.AE), l.proposta);
    set(lv(COL.AG), classificacaoComNota(l.final));
  }

  // Logo da escola, no sítio do modelo.
  const logo = await fetch('/pauta_logo.png').then(r => r.ok ? r.arrayBuffer() : null).catch(() => null);
  if (logo) {
    const id = wb.addImage({ buffer: logo, extension: 'png' });
    ws.addImage(id, { tl: { col: 0.35, row: 1.1 }, ext: { width: 179, height: 66 } });
  }
  wb.calcProperties = { ...(wb.calcProperties || {}), fullCalcOnLoad: true };
  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// ── PDF ──────────────────────────────────────────────────────
// A mesma grelha do modelo, desenhada com os valores já calculados.

type EstiloModelo = {
  font: string; size: number; bold: boolean; italic: boolean; color: string; fill: string | null;
  border: Record<'top' | 'bottom' | 'left' | 'right', { w: number; estilo: string; cor: string } | null>;
  h: string | null; v: string; wrap: boolean; num: string | null; rot?: number;
};

const fmtNum = (v: number, num: string | null) =>
  num === '0%' ? `${Math.round(v * 100)}%`
  : num === '0.0' ? v.toFixed(1).replace('.', ',')
  : num === '0' ? String(Math.round(v))
  : String(Math.round(v * 100) / 100).replace('.', ',');

export function htmlDaPauta(d: DadosPauta): string {
  const M: any = MODELO;
  const cols: number[] = M.cols, alturas: number[] = [...M.rows];
  const E: Record<string, EstiloModelo> = M.estilos;
  const valores = new Map<string, string | number>();   // "r,c" (base 0) → valor
  const val = (r: number, c: number, v: any) => valores.set(`${r},${c}`, v);

  // Valores fixos do modelo
  Object.entries(M.cells as Record<string, any>).forEach(([k, x]) => {
    const r = Number(k.split(',')[0]);
    if (r >= PRIMEIRA - 1 && r < PRIMEIRA - 1 + LINHAS_MODELO) return;   // zona dos alunos
    if (x.t !== undefined) valores.set(k, x.t);
    else if (x.n !== undefined) valores.set(k, x.n);
  });
  const c0 = (c: number) => c - 1;
  val(0, 27, d.cabecalho.turma.split(' — ')[0]);
  val(1, 27, d.cabecalho.disciplina);
  val(2, 27, d.cabecalho.formador);
  val(4, 27, `${d.cabecalho.ucId} — ${d.cabecalho.ucNome}`);
  val(5, 27, dataPT(d.cabecalho.dataInicio));
  val(5, 31, dataPT(d.cabecalho.dataFim));
  val(13, 2, d.totalAtividades);
  val(38, 21, dataPT(hojeISO()));
  let somaPesos = 0;
  COL_PROD.forEach((c, j) => {
    const p = d.produtos[j];
    val(12, c0(c), p ? p.titulo : j + 1);
    val(8, c0(COL_PESO[j]), p ? p.peso / 100 : 0);
    somaPesos += p ? p.peso / 100 : 0;
  });
  val(8, 16, somaPesos);   // Q9 = SOMA

  // Linhas dos alunos (e linhas a mais, se for preciso)
  const extra = Math.max(0, d.linhas.length - LINHAS_MODELO);
  const nLinhas = LINHAS_MODELO + extra;
  const linhaModelo = (k: number) => k < LINHAS_MODELO - 1 ? PRIMEIRA - 1 + k : PRIMEIRA - 1 + LINHAS_MODELO - 1;
  for (let k = 0; k < nLinhas; k++) {
    const r = PRIMEIRA - 1 + k;
    const l = d.linhas[k];
    if (!l) continue;
    const calc = calculoDoModelo(l, d.produtos, d.totalAtividades);
    val(r, 0, l.numero); val(r, 1, l.nome); val(r, 2, l.atividades); val(r, 3, calc.nAtiv);
    COL_PROD.forEach((c, j) => {
      if (l.produtos[j] !== null) val(r, c0(c), l.produtos[j] as number);
      val(r, c0(c + 1), calc.niveis[j]);
    });
    val(r, 18, l.c5.cm ?? ''); val(r, 19, Math.round(calc.cp * 100) / 100);
    val(r, 21, l.c5.cl ?? ''); val(r, 22, l.c5.co ?? ''); val(r, 23, l.c5.cr ?? '');
    val(r, 24, Math.round(calc.total * 100) / 100);
    val(r, 25, calc.resultado);
    if (l.proposta !== null) val(r, 30, l.proposta);
    val(r, 32, classificacaoComNota(l.final));
  }

  // Grelha: as linhas a mais repetem a penúltima linha de alunos.
  const mapaLinha = (r: number) => r < PRIMEIRA - 1 + LINHAS_MODELO - 1 ? r
    : r < PRIMEIRA - 1 + nLinhas - 1 ? linhaModelo(LINHAS_MODELO - 2)
    : r - extra;
  const nTotal = alturas.length + extra;
  const merges: number[][] = [];
  (M.merges as number[][]).forEach(([r1, c1, r2, c2]) => {
    const desloca = (r: number) => r >= PRIMEIRA - 1 + LINHAS_MODELO - 1 ? r + extra : r;
    merges.push([desloca(r1), c1, desloca(r2), c2]);
    if (r1 === PRIMEIRA - 1 + LINHAS_MODELO - 2 && r2 === r1)
      for (let e = 1; e <= extra; e++) merges.push([r1 + e, c1, r1 + e, c2]);
  });
  const cobertas = new Set<string>(), span = new Map<string, [number, number]>();
  merges.forEach(([r1, c1, r2, c2]) => {
    span.set(`${r1},${c1}`, [r2 - r1 + 1, c2 - c1 + 1]);
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) if (r !== r1 || c !== c1) cobertas.add(`${r},${c}`);
  });
  const altura = (r: number) => alturas[mapaLinha(r)] ?? alturas[alturas.length - 1];

  const css = (e: EstiloModelo) => [
    `font-family:'${e.font}',Arial,sans-serif`, `font-size:${e.size}pt`, `color:${e.color}`,
    e.bold ? 'font-weight:bold' : '', e.italic ? 'font-style:italic' : '',
    e.fill ? `background:${e.fill}` : '',
    ...(['top', 'bottom', 'left', 'right'] as const).map(l => {
      const b = e.border[l]; return b ? `border-${l}:${b.w}pt ${b.estilo === 'double' ? 'double' : 'solid'} ${b.cor}` : `border-${l}:none`;
    }),
    `text-align:${e.h || 'left'}`, `vertical-align:${e.v === 'center' ? 'middle' : e.v}`,
    `white-space:${e.wrap ? 'normal' : 'nowrap'}`,
  ].filter(Boolean).join(';');
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  let html = `<table style="border-collapse:collapse;table-layout:fixed;width:${cols.reduce((a, b) => a + b, 0)}pt"><colgroup>`
    + cols.map(w => `<col style="width:${w}pt">`).join('') + '</colgroup>';
  for (let r = 0; r < nTotal; r++) {
    html += `<tr style="height:${altura(r)}pt">`;
    const rm = mapaLinha(r);
    for (let c = 0; c < cols.length; c++) {
      if (cobertas.has(`${r},${c}`)) continue;
      const x = (M.cells as any)[`${rm},${c}`] || { s: 'Default' };
      const e = E[x.s] || E['Default'] || Object.values(E)[0];
      let v: any = valores.get(`${r},${c}`);
      if (v === undefined && r >= PRIMEIRA - 1 + nLinhas) v = valores.get(`${r - extra},${c}`);
      const txt = v === undefined || v === '' ? '' : typeof v === 'number' ? fmtNum(v, e.num) : String(v);
      const [rs, cs] = span.get(`${r},${c}`) || [1, 1];
      const conteudo = esc(txt).replace(/\n/g, '<br>');
      if (e.rot === 90 && txt) {
        // Texto vertical, como no modelo (de baixo para cima).
        let h = 0; for (let k = 0; k < rs; k++) h += altura(r + k);
        let w = 0; for (let k = 0; k < cs; k++) w += cols[c + k];
        html += `<td rowspan="${rs}" colspan="${cs}" style="${css(e)};padding:0;position:relative">`
          + `<div style="position:absolute;left:50%;top:50%;width:${h - 2}pt;transform:translate(-50%,-50%) rotate(-90deg);`
          + `text-align:center;white-space:normal;line-height:1.05;max-height:${w}pt">${conteudo}</div></td>`;
      } else if (!e.wrap && txt) {
        // Como na folha: o texto que não cabe passa para as células vazias ao lado.
        const lado = e.h === 'right' ? 'right:2px' : e.h === 'center' ? 'left:50%;transform:translateX(-50%)' : 'left:2px';
        html += `<td rowspan="${rs}" colspan="${cs}" style="${css(e)};padding:0;position:relative;overflow:visible">`
          + `<span style="position:absolute;${lado};top:50%;margin-top:-0.55em;white-space:nowrap;line-height:1.1">${conteudo}</span>&nbsp;</td>`;
      } else {
        html += `<td rowspan="${rs}" colspan="${cs}" style="${css(e)};padding:0 2px;overflow:hidden;line-height:1.05">${conteudo}</td>`;
      }
    }
    html += '</tr>';
  }
  html += '</table>';
  // Logo no sítio do modelo: célula A2, 24 pt da esquerda, 3 pt abaixo do topo.
  const topoA2 = alturas[0] + 3;
  return `<div style="position:relative;background:#fff;padding:0">${html}`
    + `<img src="/pauta_logo.png" style="position:absolute;left:24pt;top:${topoA2}pt;width:134.2pt;height:49.5pt"></div>`;
}

export async function gerarPautaPDF(d: DadosPauta): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  const caixa = document.createElement('div');
  caixa.style.cssText = 'position:fixed;left:-20000px;top:0;background:#fff;padding:0';
  caixa.innerHTML = htmlDaPauta(d);
  document.body.appendChild(caixa);
  try {
    await Promise.all([...caixa.querySelectorAll('img')].map(img =>
      (img as HTMLImageElement).complete ? null : new Promise(res => { img.onload = img.onerror = res; })));
    const canvas = await html2canvas(caixa.firstElementChild as HTMLElement, { scale: 2, backgroundColor: '#ffffff' });
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight(), m = 20;
    const k = Math.min((W - 2 * m) / canvas.width, (H - 2 * m) / canvas.height);
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', m, m, canvas.width * k, canvas.height * k);
    return pdf.output('blob');
  } finally {
    caixa.remove();
  }
}

export function descarregar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

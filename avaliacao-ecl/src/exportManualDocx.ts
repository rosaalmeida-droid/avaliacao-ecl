// src/exportManualDocx.ts
// Exporta um Manual do Aluno como .docx no formato oficial ECL.
// Constantes, cabeçalho, rodapé e logótipo copiados de exportGuiao.ts
// (documento _16-ECL_GPC_015_1_-_DM.DOCX): teal #0f8c93, Arial Narrow 12pt,
// margens 70,8pt / 85pt, rodapé ECL.GPC.015.2.

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType,
  Header, Footer, ImageRun, PageNumber, TabStopType, TabStopPosition,
} from 'docx';
import { LOGO_ECL } from './logo_ecl';

// ── tipos (compatíveis com o DocumentoManual de ManuaisAluno.tsx) ───────────
interface Callout { type: 'nota' | 'aviso' | 'dica' | 'definicao'; content: string }
interface Tabela { title?: string; columns: string[]; rows: string[][] }
interface Passos { title: string; intro?: string; steps: { label: string; detail: string; warning?: string }[] }
interface Dialogo { title: string; instructions?: string; items: { client: string; response: string; objective?: string }[] }
interface Consolidacao { title?: string; keyPoints: string[]; selfCheck?: string[] }
interface Ficha { title: string; instructions?: string; prompts: { prompt: string; lines: number }[] }
export interface PaginaManual {
  pageNumber: number; title: string; subtitle?: string; paragraphs?: string[];
  calloutBoxes?: Callout[]; bullets?: string[];
  subsections?: { title: string; paragraphs?: string[]; bullets?: string[] }[];
  procedureSteps?: Passos; tables?: Tabela[]; dialogueBlocks?: Dialogo[];
  consolidationBlock?: Consolidacao; worksheetSections?: Ficha[];
}
export interface DocumentoManual {
  unitCode: string; unitNumber: number; fullTitle: string; schoolLabel: string;
  academicYear: string; footerReference: string; pages: PaginaManual[];
}

// ── constantes ECL (iguais a exportGuiao.ts) ────────────────────────────────
const COR_TEAL = '0f8c93';
const COR_TEXTO = '1A1714';
const COR_TAB = '0f8c93';
const COR_ZEBRA = 'E8F4F4';
const COR_CALLOUT = 'EAF6F6';
const FONTE = 'Arial Narrow';

const SZ_CORPO = 24;   // 12pt
const SZ_H2 = 28;      // 14pt
const SZ_H3 = 26;      // 13pt
const SZ_HDR1 = 22;    // 11pt
const SZ_HDR2 = 20;    // 10pt
const SZ_TIT = 52;     // 26pt — título da capa
const SZ_FTR = 18;     // 9pt

const MAR_TOP = Math.round(70.8 * 20);
const MAR_LAT = Math.round(85.0 * 20);
const MAR_HF = Math.round(35.4 * 20);
const LARG_CONTEUDO = 11906 - MAR_LAT * 2; // largura útil em twips (~8506)

// ── helpers ─────────────────────────────────────────────────────────────────
const rTeal = (t: string, sz = SZ_CORPO, bold = false) => new TextRun({ text: t, font: FONTE, color: COR_TEAL, bold, size: sz });
const rTexto = (t: string, sz = SZ_CORPO, bold = false) => new TextRun({ text: t, font: FONTE, color: COR_TEXTO, bold, size: sz });
const rTab = () => new TextRun({ text: '\t', font: FONTE });
const borderTeal = (sz = 6) => ({ style: BorderStyle.SINGLE, size: sz, color: COR_TEAL, space: 4 });

function logoBytes(): Uint8Array {
  const b64 = (LOGO_ECL.split(',')[1] || '');
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function para(text: string, opts: { bold?: boolean; sz?: number; after?: number; justify?: boolean } = {}) {
  return new Paragraph({
    alignment: opts.justify ? AlignmentType.JUSTIFIED : AlignmentType.LEFT,
    spacing: { after: opts.after ?? 80, line: 276 },
    children: [rTexto(text, opts.sz ?? SZ_CORPO, opts.bold)],
  });
}

function h2(text: string): Paragraph {
  return new Paragraph({
    border: { bottom: borderTeal(4) },
    spacing: { before: 120, after: 120, line: 276 },
    children: [new TextRun({ text: text.toUpperCase(), font: FONTE, color: COR_TEAL, bold: true, size: SZ_H2 })],
  });
}
function h3(text: string): Paragraph {
  return new Paragraph({ spacing: { before: 160, after: 60, line: 276 }, children: [new TextRun({ text, font: FONTE, color: COR_TEAL, bold: true, size: SZ_H3 })] });
}

// tabela no estilo oficial (cabeçalho teal, zebra)
function tabela(t: Tabela): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [];
  if (t.title) out.push(new Paragraph({ spacing: { before: 80, after: 40 }, children: [rTeal(t.title, SZ_CORPO, true)] }));
  const cols = t.columns || [];
  const colW = Math.floor(LARG_CONTEUDO / Math.max(1, cols.length));
  out.push(new Table({
    width: { size: LARG_CONTEUDO, type: WidthType.DXA },
    columnWidths: cols.map(() => colW),
    rows: [
      new TableRow({
        tableHeader: true,
        children: cols.map((h) => new TableCell({
          width: { size: colW, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, color: COR_TAB, fill: COR_TAB },
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
          children: [new Paragraph({ children: [new TextRun({ text: h, font: FONTE, color: 'FFFFFF', bold: true, size: SZ_CORPO })] })],
        })),
      }),
      ...(t.rows || []).map((r, ri) => new TableRow({
        children: cols.map((_, ci) => new TableCell({
          width: { size: colW, type: WidthType.DXA },
          shading: ri % 2 === 0 ? { type: ShadingType.CLEAR, color: COR_ZEBRA, fill: COR_ZEBRA } : undefined,
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
          children: [new Paragraph({ children: [rTexto(r[ci] ?? '', SZ_CORPO)] })],
        })),
      })),
    ],
  }));
  out.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
  return out;
}

// caixa com fundo (callout / consolidação) — tabela de 1 célula
function caixa(children: Paragraph[], borderColor = COR_TEAL, fill = COR_CALLOUT): Table {
  return new Table({
    width: { size: LARG_CONTEUDO, type: WidthType.DXA },
    columnWidths: [LARG_CONTEUDO],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: borderColor },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: borderColor },
      left: { style: BorderStyle.SINGLE, size: 18, color: borderColor },
      right: { style: BorderStyle.SINGLE, size: 2, color: borderColor },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    rows: [new TableRow({ children: [new TableCell({
      width: { size: LARG_CONTEUDO, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, color: fill, fill },
      margins: { top: 80, bottom: 80, left: 140, right: 120 },
      children,
    })] })],
  });
}

// linha de resposta (folha de trabalho)
function linhaResposta(): Paragraph {
  return new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '999999', space: 8 } }, spacing: { before: 120, after: 0 }, children: [new TextRun({ text: ' ', font: FONTE })] });
}

// ── corpo de uma página → elementos docx ────────────────────────────────────
function blocosDaPagina(p: PaginaManual): (Paragraph | Table)[] {
  const els: (Paragraph | Table)[] = [];
  if (p.subtitle) els.push(h3(p.subtitle));
  (p.paragraphs || []).forEach((t) => els.push(para(t, { justify: true })));
  (p.calloutBoxes || []).forEach((c) => {
    const tag = { definicao: 'DEFINIÇÃO', aviso: 'ATENÇÃO', dica: 'DICA', nota: 'NOTA' }[c.type] || 'NOTA';
    els.push(caixa([
      new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: tag, font: FONTE, color: COR_TEAL, bold: true, size: SZ_HDR2 })] }),
      new Paragraph({ children: [rTexto(c.content)] }),
    ]));
    els.push(new Paragraph({ spacing: { after: 100 }, children: [] }));
  });
  (p.bullets || []).forEach((b) => els.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 40, line: 276 }, children: [rTexto(b)] })));
  (p.subsections || []).forEach((s) => {
    els.push(h3(s.title));
    (s.paragraphs || []).forEach((t) => els.push(para(t, { justify: true })));
    (s.bullets || []).forEach((b) => els.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 40 }, children: [rTexto(b)] })));
  });
  if (p.procedureSteps && p.procedureSteps.steps) {
    const ps = p.procedureSteps;
    els.push(new Paragraph({ spacing: { before: 80, after: 40 }, children: [rTeal(ps.title, SZ_CORPO, true)] }));
    if (ps.intro) els.push(para(ps.intro));
    ps.steps.forEach((st, i) => {
      els.push(new Paragraph({ spacing: { after: 40, line: 276 }, children: [rTexto(`${i + 1}. `, SZ_CORPO, true), rTexto(st.label + ': ', SZ_CORPO, true), rTexto(st.detail)] }));
      if (st.warning) els.push(new Paragraph({ spacing: { after: 40 }, indent: { left: 360 }, children: [new TextRun({ text: '⚠ ' + st.warning, font: FONTE, color: 'B3261E', size: SZ_HDR2 })] }));
    });
  }
  (p.tables || []).forEach((t) => tabela(t).forEach((e) => els.push(e)));
  (p.dialogueBlocks || []).forEach((d) => {
    els.push(new Paragraph({ spacing: { before: 80, after: 40 }, children: [rTeal(d.title, SZ_CORPO, true)] }));
    if (d.instructions) els.push(para(d.instructions));
    (d.items || []).forEach((it) => {
      els.push(caixa([
        new Paragraph({ children: [rTexto('Cliente: ', SZ_CORPO, true), rTexto(it.client)] }),
        new Paragraph({ spacing: { before: 20 }, children: [rTeal('Colaborador: ', SZ_CORPO, true), rTexto(it.response)] }),
        ...(it.objective ? [new Paragraph({ spacing: { before: 20 }, children: [new TextRun({ text: 'Objetivo: ' + it.objective, font: FONTE, italics: true, color: '666666', size: SZ_HDR2 })] })] : []),
      ], '999999', 'FAFAFA'));
      els.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
    });
  });
  if (p.consolidationBlock) {
    const cb = p.consolidationBlock;
    const inner: Paragraph[] = [new Paragraph({ spacing: { after: 40 }, children: [rTeal(cb.title || 'Consolidação', SZ_CORPO, true)] })];
    (cb.keyPoints || []).forEach((k) => inner.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 20 }, children: [rTexto(k)] })));
    if (cb.selfCheck && cb.selfCheck.length) {
      inner.push(new Paragraph({ spacing: { before: 60, after: 20 }, children: [rTexto('Verifica se sabes:', SZ_CORPO, true)] }));
      cb.selfCheck.forEach((s) => inner.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 20 }, children: [rTexto(s)] })));
    }
    els.push(caixa(inner));
    els.push(new Paragraph({ spacing: { after: 100 }, children: [] }));
  }
  (p.worksheetSections || []).forEach((w) => {
    els.push(new Paragraph({ spacing: { before: 80, after: 40 }, children: [rTeal(w.title, SZ_CORPO, true)] }));
    if (w.instructions) els.push(para(w.instructions));
    (w.prompts || []).forEach((pr) => {
      els.push(new Paragraph({ spacing: { before: 80, after: 20 }, children: [rTexto(pr.prompt)] }));
      for (let i = 0; i < (pr.lines || 2); i++) els.push(linhaResposta());
    });
  });
  return els;
}

// ── documento completo ──────────────────────────────────────────────────────
export async function exportarManualDocx(doc: DocumentoManual): Promise<void> {
  const cover = doc.pages[0];
  const content = doc.pages.slice(1);

  // Cabeçalho (repete em todas as páginas): logo + curso / UC · ano
  const header = new Header({
    children: [
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        spacing: { before: 0, after: 0, line: 240 },
        children: [
          new ImageRun({ data: logoBytes(), transformation: { width: 120, height: 50 } }) as any,
          rTab(),
          rTeal(doc.schoolLabel, SZ_HDR1, true),
        ],
      }),
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        border: { bottom: borderTeal(8) },
        spacing: { before: 0, after: 40, line: 240 },
        children: [rTab(), rTeal(`${doc.unitCode}  ·  ${doc.academicYear}`, SZ_HDR2, false)],
      }),
    ],
  });

  // Rodapé: Data | nº página (centro) | referência ; Revisão em baixo
  const footer = new Footer({
    children: [
      new Paragraph({
        tabStops: [
          { type: TabStopType.CENTER, position: Math.round(LARG_CONTEUDO / 2) },
          { type: TabStopType.RIGHT, position: TabStopPosition.MAX },
        ],
        border: { top: borderTeal(4) },
        spacing: { before: 40, after: 0, line: 240 },
        children: [
          rTeal('Data: 01 / 09 / 2016', SZ_FTR),
          rTab(),
          new TextRun({ children: [PageNumber.CURRENT], font: FONTE, color: COR_TEAL, bold: true, size: 22 }),
          rTab(),
          rTeal(doc.footerReference || 'ECL.GPC.015.2', SZ_FTR),
        ],
      }),
      new Paragraph({ spacing: { before: 0, after: 0, line: 240 }, children: [rTeal('Revisão: 02 / 07 / 2021', SZ_FTR)] }),
    ],
  });

  const corpo: (Paragraph | Table)[] = [];

  // Capa / introdução
  if (cover) {
    corpo.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 0, after: 200, line: 260 }, children: [new TextRun({ text: `${doc.unitNumber} - ${doc.fullTitle}`, font: FONTE, color: COR_TEAL, bold: true, size: SZ_TIT })] }));
    corpo.push(h2('Introdução'));
    blocosDaPagina(cover).forEach((e) => corpo.push(e));
  }

  // Índice
  if (content.length) {
    corpo.push(new Paragraph({ pageBreakBefore: true, border: { bottom: borderTeal(4) }, spacing: { before: 0, after: 160 }, children: [new TextRun({ text: 'ÍNDICE', font: FONTE, color: COR_TEAL, bold: true, size: SZ_H2 })] }));
    content.forEach((p) => {
      corpo.push(new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX, leader: 'dot' as any }],
        spacing: { after: 60, line: 276 },
        children: [rTexto(p.title), rTab(), rTeal(String(p.pageNumber), SZ_CORPO, true)],
      }));
    });
  }

  // Páginas de conteúdo — cada uma começa em página nova
  content.forEach((p) => {
    corpo.push(new Paragraph({ pageBreakBefore: true, border: { bottom: borderTeal() }, spacing: { before: 0, after: 140, line: 276 }, children: [new TextRun({ text: p.title.toUpperCase(), font: FONTE, color: COR_TEAL, bold: true, size: SZ_H2 })] }));
    blocosDaPagina(p).forEach((e) => corpo.push(e));
  });

  const documento = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: MAR_TOP, bottom: MAR_TOP, left: MAR_LAT, right: MAR_LAT, header: MAR_HF, footer: MAR_HF },
        },
      },
      headers: { default: header },
      footers: { default: footer },
      children: corpo,
    }],
  });

  const blob = await Packer.toBlob(documento);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safe = doc.fullTitle.slice(0, 50).replace(/[^a-zA-ZÀ-ÿ0-9 ]/g, '').replace(/\s+/g, '_');
  a.download = `${doc.unitNumber}_Guiao_${safe}_SCP_CR.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

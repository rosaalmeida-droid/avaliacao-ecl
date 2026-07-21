// exportGuiao.ts — exporta uma entrada do Manual do Cozinheiro como .docx
// Requer: npm install docx (já incluído no package.json actualizado)

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  VerticalAlign, Header, Footer, PageNumber,
} from 'docx';

export interface EntradaParaExportar {
  titulo: string;
  categoria: string;
  nivel: string;
  textoGuia: string;
  criadoPor: string;
  criadoEm: string;
}

// ── Paleta ────────────────────────────────────────────────────
const COBRE  = '8A561F';
const SALVIA = '5F7350';
const CARVAO = '2E2A26';
const CINZA  = '6B655E';
const CREME  = 'F5F0E6';
const FONT   = 'Arial Narrow';

// ── Helpers ───────────────────────────────────────────────────
function allBorders(cor: string) {
  const b = { style: BorderStyle.SINGLE, size: 2, color: cor };
  return { top: b, bottom: b, left: b, right: b, insideHorizontal: b, insideVertical: b };
}

function txt(text: string, opts: { size?: number; bold?: boolean; italics?: boolean; color?: string } = {}) {
  return new TextRun({ text, font: FONT, size: opts.size ?? 22, bold: !!opts.bold,
    italics: !!opts.italics, color: opts.color ?? CARVAO });
}

function para(children: TextRun[], opts: { align?: (typeof AlignmentType)[keyof typeof AlignmentType]; before?: number; after?: number; line?: number; indent?: number } = {}) {
  return new Paragraph({
    alignment: opts.align ?? AlignmentType.JUSTIFIED,
    spacing: { line: opts.line ?? 360, before: opts.before ?? 0, after: opts.after ?? 120 },
    indent: opts.indent ? { left: opts.indent } : undefined,
    children,
  });
}

// ── Parser markdown → blocos ──────────────────────────────────
type Bloco =
  | { tipo: 'h1'; texto: string }
  | { tipo: 'h2'; texto: string }
  | { tipo: 'h3'; texto: string }
  | { tipo: 'caixa'; emoji: string; label: string; linhas: string[] }
  | { tipo: 'tabela'; headers: string[]; rows: string[][] }
  | { tipo: 'lista'; itens: string[] }
  | { tipo: 'paragrafo'; texto: string };

function parsear(md: string): Bloco[] {
  const linhas = md.split('\n');
  const blocos: Bloco[] = [];
  let i = 0;
  while (i < linhas.length) {
    const l = linhas[i].trimEnd();
    if (l.startsWith('## '))  { blocos.push({ tipo: 'h2', texto: l.slice(3).trim() }); i++; continue; }
    if (l.startsWith('### ')) { blocos.push({ tipo: 'h3', texto: l.slice(4).trim() }); i++; continue; }
    if (l.startsWith('# '))   { blocos.push({ tipo: 'h1', texto: l.slice(2).trim() }); i++; continue; }

    const mCaixa = l.match(/^(🎯|💡|✏️)\s+\*?\*?([^*\n]+)\*?\*?$/);
    if (mCaixa) {
      const ls: string[] = []; i++;
      while (i < linhas.length && linhas[i].trim() !== '') {
        ls.push(linhas[i].trim().replace(/^[•\-]\s*/, '')); i++;
      }
      blocos.push({ tipo: 'caixa', emoji: mCaixa[1], label: mCaixa[2].trim(), linhas: ls });
      continue;
    }

    if (l.startsWith('|') && l.endsWith('|')) {
      const headers = l.split('|').slice(1, -1).map(c => c.trim()); i++;
      if (i < linhas.length && /^\|[-| ]+\|$/.test(linhas[i])) i++;
      const rows: string[][] = [];
      while (i < linhas.length && linhas[i].startsWith('|')) {
        rows.push(linhas[i].split('|').slice(1, -1).map(c => c.trim())); i++;
      }
      if (headers.length) blocos.push({ tipo: 'tabela', headers, rows });
      continue;
    }

    if (/^[•\-]\s+/.test(l)) {
      const itens: string[] = [];
      while (i < linhas.length && /^[•\-]\s+/.test(linhas[i])) {
        itens.push(linhas[i].replace(/^[•\-]\s+/, '').trim()); i++;
      }
      blocos.push({ tipo: 'lista', itens }); continue;
    }

    if (l.trim() && !/^[-=]{3,}$/.test(l)) {
      blocos.push({ tipo: 'paragrafo', texto: l.replace(/\*\*/g, '').trim() });
    }
    i++;
  }
  return blocos;
}

// ── Blocos → elementos docx ───────────────────────────────────
function buildEl(blocos: Bloco[]): (Paragraph | Table)[] {
  const el: (Paragraph | Table)[] = [];

  for (const b of blocos) {
    if (b.tipo === 'h1') {
      el.push(new Paragraph({
        heading: HeadingLevel.HEADING_1, pageBreakBefore: true,
        spacing: { before: 200, after: 160 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COBRE, space: 6 } },
        children: [txt(b.texto, { size: 32, bold: true, color: COBRE })],
      }));
    } else if (b.tipo === 'h2') {
      el.push(new Paragraph({
        heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 },
        children: [txt(b.texto, { size: 27, bold: true, color: SALVIA })],
      }));
    } else if (b.tipo === 'h3') {
      el.push(new Paragraph({
        heading: HeadingLevel.HEADING_3, spacing: { before: 140, after: 80 },
        children: [txt(b.texto, { size: 24, bold: true, color: CARVAO })],
      }));
    } else if (b.tipo === 'paragrafo') {
      el.push(para([txt(b.texto)]));
    } else if (b.tipo === 'lista') {
      b.itens.forEach(it => el.push(para(
        [txt('•  ', { color: COBRE }), txt(it)],
        { line: 300, after: 50, indent: 240 }
      )));
    } else if (b.tipo === 'caixa') {
      const CORES: Record<string, [string, string]> = {
        '🎯': ['FFF3D6', '5A3E00'],
        '💡': [CREME,    COBRE   ],
        '✏️': ['E8F5D6', '4E7A25'],
      };
      const [fill, edge] = CORES[b.emoji] ?? [CREME, COBRE];
      el.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: [9360],
        borders: {
          top:    { style: BorderStyle.SINGLE, size: 4,  color: edge },
          bottom: { style: BorderStyle.SINGLE, size: 4,  color: edge },
          left:   { style: BorderStyle.SINGLE, size: 20, color: edge },
          right:  { style: BorderStyle.SINGLE, size: 4,  color: edge },
          insideHorizontal: { style: BorderStyle.NONE },
          insideVertical:   { style: BorderStyle.NONE },
        },
        rows: [new TableRow({ children: [new TableCell({
          width: { size: 9360, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill },
          margins: { top: 100, bottom: 100, left: 140, right: 140 },
          children: [
            para([txt(`${b.emoji}  ${b.label}`, { size: 22, bold: true, color: edge })], { after: 60 }),
            ...b.linhas.map(l => para([txt(l, { size: 21 })], { line: 300, after: 40 })),
          ],
        })] })],
      }));
      el.push(para([txt('')]));
    } else if (b.tipo === 'tabela') {
      const nc    = b.headers.length;
      const total = 9360;
      const cw    = Array(nc).fill(Math.floor(total / nc));
      el.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: cw,
        borders: allBorders('D8CFBE'),
        rows: [
          new TableRow({ tableHeader: true, children: b.headers.map((h, i) =>
            new TableCell({
              width: { size: cw[i], type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: COBRE },
              margins: { top: 60, bottom: 60, left: 90, right: 90 },
              verticalAlign: VerticalAlign.CENTER,
              children: [para([txt(h, { size: 21, bold: true, color: 'FFFFFF' })], { after: 0, line: 240 })],
            })
          )}),
          ...b.rows.map((r, ri) => new TableRow({ children: r.map((c, i) =>
            new TableCell({
              width: { size: cw[i] ?? Math.floor(total / r.length), type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: ri % 2 ? CREME : 'FFFFFF' },
              margins: { top: 50, bottom: 50, left: 90, right: 90 },
              children: [para([txt(c, { size: 20 })], { after: 0, line: 240 })],
            })
          )})),
        ],
      }));
      el.push(para([txt('')]));
    }
  }
  return el;
}

// ── Exportar ──────────────────────────────────────────────────
export async function exportarGuiaoDocx(entrada: EntradaParaExportar): Promise<void> {
  const dataFmt = new Date(entrada.criadoEm).toLocaleDateString('pt-PT');

  const capa: Paragraph[] = [
    para([txt('ESCOLA DE COMÉRCIO DE LISBOA', { size: 26, bold: true, color: CINZA })],
      { align: AlignmentType.CENTER, before: 400, after: 40 }),
    para([txt('Curso Profissional de Técnico de Cozinha-Pastelaria', { size: 22, italics: true, color: CINZA })],
      { align: AlignmentType.CENTER, after: 40 }),
    para([txt(`${entrada.categoria}  ·  Nível: ${entrada.nivel}`, { size: 20, color: CINZA })],
      { align: AlignmentType.CENTER, after: 40 }),
    para([txt(dataFmt, { size: 20, color: CINZA })],
      { align: AlignmentType.CENTER, after: 600 }),
  ];

  const corpo = buildEl(parsear(entrada.textoGuia));

  const doc = new Document({
    creator: 'Avaliação ECL — Escola de Comércio de Lisboa',
    title: entrada.titulo,
    styles: { default: { document: { run: { font: FONT, size: 22, color: CARVAO } } } },
    sections: [{
      properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
      headers: { default: new Header({ children: [new Paragraph({
        alignment: AlignmentType.RIGHT, spacing: { after: 0 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: COBRE, space: 4 } },
        children: [txt(entrada.titulo, { size: 18, color: CINZA })],
      })] }) },
      footers: { default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { before: 0 },
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: COBRE, space: 4 } },
        children: [
          txt('Escola de Comércio de Lisboa  ·  Manual do Cozinheiro  ·  Pág. ', { size: 16, color: CINZA }),
          new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: CINZA }),
        ],
      })] }) },
      children: [...capa, ...corpo],
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `Guiao_${entrada.titulo.replace(/[^a-zA-Z0-9À-ÿ ]/g, '').replace(/\s+/g, '_').slice(0, 60)}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Alternativa: enviar para Apps Script (Google Doc no Drive) ─
export const GUIAO_GS_URL = 'https://script.google.com/macros/s/AKfycbzBxobzVzxVfoAKC7wiqmKRiKru8z_FM1g7O6sTvRUE9q2QpD3DsTRfkrAFnouA41a1LA/exec'; // preencher com a URL do Web App após deploy

export async function exportarGuiaoViaScript(
  entrada: EntradaParaExportar & {
    anoLetivo: string;
    moduloId: string;
    disciplina: string;
    horasPrevistas: number;
    turmaAno: number;
  }
): Promise<string> {
  if (!GUIAO_GS_URL) throw new Error('GUIAO_GS_URL não está definido em exportGuiao.ts');
  const resp = await fetch(GUIAO_GS_URL, {
    method: 'POST',
    body: JSON.stringify(entrada),
  });
  const data = await resp.json();
  if (!data.ok) throw new Error(data.erro || 'Erro no Apps Script');
  return data.url as string; // URL do Google Doc gerado
}

// exportGuiao.ts — Exporta manual do cozinheiro como .docx com cabeçalho/rodapé ECL
// Usa a biblioteca docx (já em package.json: "docx": "^8.5.0")

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  Header, Footer, ImageRun, PageNumber, NumberFormat,
  TabStopType, TabStopPosition, PageBreak,
} from 'docx';

// ── Tipos ─────────────────────────────────────────────────────
export interface EntradaParaExportar {
  titulo:       string;
  categoria:    string;
  nivel:        string;
  textoGuia:    string;
  moduloId?:    string;
  moduloNome?:  string;
  anoLetivo?:   string;
  disciplina?:  string;
  turmaAno?:    number;
  horas?:       string | number;
}

// ── Cores ECL ─────────────────────────────────────────────────
const COR_TEAL  = '0f8c93';
const COR_TEXTO = '1A1714';
const COR_TAB   = '00796B';
const COR_ZEBRA = 'E0F2F1';
const FONTE     = 'Arial Narrow';
const F_CORPO   = 24;  // 12pt
const F_H2      = 26;  // 13pt
const F_H1      = 28;  // 14pt

// ── Logótipo ECL em base64 (PNG 280×119) ──────────────────────
// Carregado via fetch do ficheiro público na app
async function carregarLogo(): Promise<ArrayBuffer | null> {
  try {
    const r = await fetch('/ecl_logo.png');
    if (r.ok) return r.arrayBuffer();
  } catch (_) {}
  return null;
}

// ── Helpers ───────────────────────────────────────────────────
function rTeal(text: string, bold = false, sz = 20) {
  return new TextRun({ text, font: FONTE, color: COR_TEAL, bold, size: sz });
}
function rTexto(text: string, bold = false, sz = F_CORPO) {
  return new TextRun({ text, font: FONTE, color: COR_TEXTO, bold, size: sz });
}
function borderTeal() {
  return { style: BorderStyle.SINGLE, size: 6, color: COR_TEAL, space: 4 };
}

// ── Parser markdown → elementos docx ─────────────────────────
function parseMd(texto: string): (Paragraph | Table)[] {
  const linhas = texto.split('\n');
  const els: (Paragraph | Table)[] = [];
  let i = 0;

  while (i < linhas.length) {
    const l = linhas[i].trimEnd();

    // H1
    if (l.startsWith('# ') && !l.startsWith('## ')) {
      els.push(new Paragraph({
        pageBreakBefore: true,
        heading: HeadingLevel.HEADING_1,
        border: { bottom: borderTeal() },
        spacing: { before: 280, after: 160, line: 360 },
        children: [new TextRun({ text: l.slice(2).trim(), font: FONTE, color: COR_TEAL, bold: true, size: F_H1 })],
      }));
      i++; continue;
    }

    // H2
    if (l.startsWith('## ') && !l.startsWith('### ')) {
      els.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120, line: 360 },
        children: [new TextRun({ text: l.slice(3).trim(), font: FONTE, color: COR_TEAL, bold: true, size: F_H2 })],
      }));
      i++; continue;
    }

    // H3
    if (l.startsWith('### ')) {
      els.push(new Paragraph({
        spacing: { before: 160, after: 80, line: 360 },
        children: [new TextRun({ text: l.slice(4).trim(), font: FONTE, color: COR_TEXTO, bold: true, size: F_CORPO })],
      }));
      i++; continue;
    }

    // Tabela markdown
    if (l.startsWith('|') && l.endsWith('|')) {
      const headers = l.split('|').slice(1,-1).map(c => c.trim());
      i++;
      if (i < linhas.length && /^\|[-| ]+\|$/.test(linhas[i])) i++;
      const rows: string[][] = [];
      while (i < linhas.length && linhas[i].startsWith('|')) {
        rows.push(linhas[i].split('|').slice(1,-1).map(c => c.trim()));
        i++;
      }
      if (headers.length && rows.length) {
        const colW = Math.floor(9000 / headers.length);
        els.push(new Table({
          width: { size: 9000, type: WidthType.DXA },
          rows: [
            new TableRow({ children: headers.map(h => new TableCell({
              width: { size: colW, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, color: COR_TAB, fill: COR_TAB },
              children: [new Paragraph({ spacing: { before: 40, after: 40 }, children: [
                new TextRun({ text: h.replace(/\*\*/g,''), font: FONTE, color: 'FFFFFF', bold: true, size: F_CORPO }),
              ]})]
            }))}),
            ...rows.map((r, ri) => new TableRow({ children: r.map(c => new TableCell({
              width: { size: colW, type: WidthType.DXA },
              shading: ri%2===0 ? { type: ShadingType.CLEAR, color: COR_ZEBRA, fill: COR_ZEBRA } : undefined,
              children: [new Paragraph({ spacing: { before: 40, after: 40 }, children: [
                new TextRun({ text: c.replace(/\*\*/g,''), font: FONTE, color: COR_TEXTO, size: F_CORPO }),
              ]})]
            })) })),
          ],
        }));
        els.push(new Paragraph({ children: [], spacing: { after: 120 } }));
      }
      continue;
    }

    // Lista bullet
    if (/^[•\-]\s+/.test(l)) {
      els.push(new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 40, line: 360 },
        children: [rTexto(l.replace(/^[•\-]\s+/,'').replace(/\*\*/g,''))],
      }));
      i++; continue;
    }

    // Lista numerada
    if (/^\d+\.\s+/.test(l)) {
      els.push(new Paragraph({
        numbering: { reference: 'numbered', level: 0 },
        spacing: { after: 40, line: 360 },
        children: [rTexto(l.replace(/^\d+\.\s+/,'').replace(/\*\*/g,''))],
      }));
      i++; continue;
    }

    // Separador
    if (/^[-=]{3,}$/.test(l.trim())) {
      els.push(new Paragraph({ children: [], border: { bottom: borderTeal() }, spacing: { after: 120 } }));
      i++; continue;
    }

    // Parágrafo normal
    if (l.trim()) {
      els.push(new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 80, line: 360 },
        children: [rTexto(l.replace(/\*\*/g,'').trim())],
      }));
    }
    i++;
  }
  return els;
}

// ── Exportar .docx ────────────────────────────────────────────
export async function exportarGuiaoDocx(entrada: EntradaParaExportar): Promise<void> {
  const moduloId   = entrada.moduloId   || '';
  const moduloNome = entrada.moduloNome || entrada.titulo;
  const anoLetivo  = entrada.anoLetivo  || new Date().getFullYear() + '-' + (new Date().getFullYear()+1);
  const disciplina = entrada.disciplina || 'Serviços de Cozinha-Pastelaria';
  const turmaAno   = entrada.turmaAno   || 3;
  const sigla      = disciplina.toLowerCase().includes('restaurante') ? 'SRB' : 'SCP';

  const logoBuffer = await carregarLogo();

  // ── Capa ────────────────────────────────────────────────────
  const capa: (Paragraph | Table)[] = [
    ...(logoBuffer ? [new Paragraph({
      spacing: { before: 0, after: 200 },
      children: [new ImageRun({ data: logoBuffer, transformation: { width: 82, height: 35 } })],
    })] : []),

    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [
      rTeal('Curso Profissional de Técnico de Cozinha-Pastelaria', true, 22),
    ]}),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [
      rTeal(sigla + ' - ' + moduloId + ' - ' + moduloNome + '    ' + anoLetivo, false, 22),
    ]}),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400, after: 0 }, children: [
      new TextRun({ text: moduloNome, font: FONTE, color: COR_TEAL, bold: true, size: 56 }),
    ]}),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  // ── Cabeçalho e rodapé ──────────────────────────────────────
  const cabecalhoChildren: (Paragraph | Table)[] = [
    new Paragraph({
      border: { bottom: borderTeal() },
      tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
      spacing: { before: 0, after: 40 },
      children: [
        ...(logoBuffer ? [new ImageRun({ data: logoBuffer, transformation: { width: 60, height: 26 } })] : []),
        new TextRun({ text: '\t', font: FONTE }),
        rTeal(moduloNome + '   ' + anoLetivo, false, 18),
      ],
    }),
  ];

  const rodapeChildren: (Paragraph | Table)[] = [
    new Paragraph({
      border: { top: borderTeal() },
      tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
      spacing: { before: 40, after: 0 },
      children: [
        rTeal('Escola de Comércio de Lisboa   ·   Manual do Cozinheiro', false, 18),
        new TextRun({ text: '\t', font: FONTE }),
        new TextRun({ children: ['Pág. ', PageNumber.CURRENT], font: FONTE, color: COR_TEAL, bold: true, size: 18 }),
      ],
    }),
  ];

  // ── Conteúdo ─────────────────────────────────────────────────
  const conteudo = entrada.textoGuia ? parseMd(entrada.textoGuia) : [
    new Paragraph({ children: [rTexto('Conteúdo a gerar.')], spacing: { after: 80 } }),
  ];

  // ── Documento ─────────────────────────────────────────────────
  const doc = new Document({
    numbering: {
      config: [{
        reference: 'numbered',
        levels: [{ level: 0, format: NumberFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
      }],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1417, bottom: 1417, left: 1701, right: 1701, header: 708, footer: 708 },
        },
      },
      headers: { default: new Header({ children: cabecalhoChildren }) },
      footers: { default: new Footer({ children: rodapeChildren }) },
      children: [...capa, ...conteudo],
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = (moduloId ? moduloId + '_' : '') + moduloNome.slice(0, 50).replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_') + '.docx';
  a.click();
  URL.revokeObjectURL(url);
}

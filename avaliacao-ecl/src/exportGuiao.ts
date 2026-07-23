// exportGuiao.ts — Exporta manual como .docx com layout oficial ECL
// Valores extraídos do documento _16-ECL_GPC_015_1_-_DM.DOCX:
//   Cor teal: #0f8c93 | Fonte: Arial Narrow | Corpo: 12pt
//   Header sizes: 22 e 28 half-points (11pt e 14pt) | Footer sizes: 18 e 22 (9pt e 11pt)
//   Margens: top/bottom 70.8pt, left/right 85pt | Header/Footer distance: 35.4pt

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  Header, Footer, ImageRun, PageNumber,
  TabStopType, TabStopPosition, PageBreak, UnderlineType,
} from 'docx';

export interface EntradaParaExportar {
  titulo:      string;
  categoria:   string;
  nivel:       string;
  textoGuia:   string;
  moduloId?:   string;
  moduloNome?: string;
  anoLetivo?:  string;
  disciplina?: string;
  turmaAno?:   number;
  horas?:      string | number;
  // campos opcionais para compatibilidade com EntradaManual
  criadoPor?:  string;
  criadoEm?:   string;
  atualizadoEm?: string;
  palavrasChave?: string[];
  tipoPlanAula?: string;
}

// ── Constantes ECL ────────────────────────────────────────────
const COR_TEAL  = '0f8c93';
const COR_TEXTO = '1A1714';
const COR_TAB   = '0f8c93';
const COR_ZEBRA = 'E8F4F4';
const FONTE     = 'Arial Narrow';

// Tamanhos em half-points (como no docx original)
const SZ_CORPO   = 24; // 12pt — body text
const SZ_H1      = 28; // 14pt — Heading 1
const SZ_H2      = 26; // 13pt — Heading 2
const SZ_H3      = 24; // 12pt negrito — Heading 3
const SZ_HDR1    = 22; // 11pt — linha 1 do header (Curso Profissional)
const SZ_HDR2    = 20; // 10pt — linha 2 do header (SCP - MÓDULO)
const SZ_HDR_TIT = 52; // 26pt — título grande no header (nome curto)
const SZ_FTR     = 18; // 9pt  — rodapé

// Margens em twips (1pt = 20 twips)
const MAR_TOP    = Math.round(70.8 * 20);  // 1416
const MAR_BOT    = Math.round(70.8 * 20);
const MAR_LAT    = Math.round(85.0 * 20);  // 1700
const MAR_HDR    = Math.round(35.4 * 20);  // 708
const MAR_FTR    = Math.round(35.4 * 20);

// ── Carregar logótipo ─────────────────────────────────────────
async function carregarLogo(): Promise<ArrayBuffer | null> {
  try {
    const r = await fetch('/ecl_logo.png');
    if (r.ok) return r.arrayBuffer();
  } catch (_) {}
  return null;
}

// ── Helpers de TextRun ────────────────────────────────────────
const rTeal = (text: string, sz = SZ_CORPO, bold = false) =>
  new TextRun({ text, font: FONTE, color: COR_TEAL, bold, size: sz });

const rTexto = (text: string, sz = SZ_CORPO, bold = false) =>
  new TextRun({ text, font: FONTE, color: COR_TEXTO, bold, size: sz });

const rTab = () => new TextRun({ text: '\t', font: FONTE });

const borderTeal = (sz = 6) => ({ style: BorderStyle.SINGLE, size: sz, color: COR_TEAL, space: 4 });

// ── Parser markdown → elementos docx ─────────────────────────
function parseMd(texto: string): (Paragraph | Table)[] {
  const linhas = texto.split('\n');
  const els: (Paragraph | Table)[] = [];
  let i = 0;

  while (i < linhas.length) {
    const l = linhas[i].trimEnd();

    // H1 — página nova + linha teal em baixo
    if (l.startsWith('# ') && !l.startsWith('## ')) {
      els.push(new Paragraph({
        pageBreakBefore: true,
        border: { bottom: borderTeal() },
        spacing: { before: 0, after: 160, line: 276 },
        children: [new TextRun({ text: l.slice(2).trim(), font: FONTE, color: COR_TEAL, bold: true, size: SZ_H1 })],
      }));
      i++; continue;
    }

    // H2 — teal negrito com linha em baixo
    if (l.startsWith('## ') && !l.startsWith('### ')) {
      els.push(new Paragraph({
        border: { bottom: borderTeal(4) },
        spacing: { before: 280, after: 120, line: 276 },
        children: [new TextRun({ text: l.slice(3).trim(), font: FONTE, color: COR_TEAL, bold: true, size: SZ_H2 })],
      }));
      i++; continue;
    }

    // H3 — texto negrito sem linha
    if (l.startsWith('### ')) {
      els.push(new Paragraph({
        spacing: { before: 200, after: 80, line: 276 },
        children: [new TextRun({ text: l.slice(4).trim(), font: FONTE, color: COR_TEXTO, bold: true, size: SZ_H3 })],
      }));
      i++; continue;
    }

    // Tabela markdown
    if (l.startsWith('|') && l.endsWith('|')) {
      const headers = l.split('|').slice(1, -1).map(c => c.trim());
      i++;
      if (i < linhas.length && /^\|[-| ]+\|$/.test(linhas[i])) i++;
      const rows: string[][] = [];
      while (i < linhas.length && linhas[i].startsWith('|')) {
        rows.push(linhas[i].split('|').slice(1, -1).map(c => c.trim()));
        i++;
      }
      if (headers.length && rows.length) {
        const colW = Math.floor(8800 / headers.length);
        els.push(new Table({
          width: { size: 8800, type: WidthType.DXA },
          rows: [
            new TableRow({ tableHeader: true, children: headers.map(h => new TableCell({
              width: { size: colW, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, color: COR_TAB, fill: COR_TAB },
              margins: { top: 60, bottom: 60, left: 100, right: 100 },
              children: [new Paragraph({ children: [
                new TextRun({ text: h.replace(/\*\*/g, ''), font: FONTE, color: 'FFFFFF', bold: true, size: SZ_CORPO }),
              ], spacing: { before: 0, after: 0 } })],
            })) }),
            ...rows.map((r, ri) => new TableRow({ children: r.map(c => new TableCell({
              width: { size: colW, type: WidthType.DXA },
              shading: ri % 2 === 0 ? { type: ShadingType.CLEAR, color: COR_ZEBRA, fill: COR_ZEBRA } : undefined,
              margins: { top: 60, bottom: 60, left: 100, right: 100 },
              children: [new Paragraph({ children: [
                new TextRun({ text: c.replace(/\*\*/g, ''), font: FONTE, color: COR_TEXTO, size: SZ_CORPO }),
              ], spacing: { before: 0, after: 0 } })],
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
        spacing: { after: 60, line: 276 },
        children: [rTexto(l.replace(/^[•\-]\s+/, '').replace(/\*\*/g, ''))],
      }));
      i++; continue;
    }

    // Lista numerada
    if (/^\d+\.\s+/.test(l)) {
      els.push(new Paragraph({
        numbering: { reference: 'numbered', level: 0 },
        spacing: { after: 60, line: 276 },
        children: [rTexto(l.replace(/^\d+\.\s+/, '').replace(/\*\*/g, ''))],
      }));
      i++; continue;
    }

    // Separador ---
    if (/^[-=]{3,}$/.test(l.trim())) {
      els.push(new Paragraph({
        border: { bottom: borderTeal(4) },
        spacing: { before: 80, after: 80 },
        children: [],
      }));
      i++; continue;
    }

    // Caixas de destaque [DICA DO CHEF], [HACCP], etc.
    const mCaixa = l.match(/^\[(DICA DO CHEF|HACCP|CIENCIA NA COZINHA|ERROS FREQUENTES|SABIA QUE|NOTA)\]\s*(.*)/);
    if (mCaixa) {
      const etiqueta = mCaixa[1];
      const resto = mCaixa[2] || '';
      const conteudo: string[] = resto ? [resto] : [];
      i++;
      while (i < linhas.length && linhas[i].trim() !== '' && !linhas[i].startsWith('#') && !linhas[i].startsWith('[')) {
        conteudo.push(linhas[i].trim()); i++;
      }
      els.push(new Paragraph({
        border: {
          left: { style: BorderStyle.SINGLE, size: 12, color: COR_TEAL, space: 8 },
        },
        shading: { type: ShadingType.CLEAR, color: COR_ZEBRA, fill: COR_ZEBRA },
        spacing: { before: 120, after: 120, line: 276 },
        indent: { left: 200 },
        children: [
          new TextRun({ text: etiqueta + (conteudo.length ? '  ' : ''), font: FONTE, color: COR_TEAL, bold: true, size: SZ_CORPO }),
          ...conteudo.map(t => new TextRun({ text: t, font: FONTE, color: COR_TEXTO, size: SZ_CORPO })),
        ],
      }));
      continue;
    }

    // Parágrafo negrito (**texto**)
    if (l.startsWith('**') && l.endsWith('**')) {
      els.push(new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 80, line: 276 },
        children: [rTexto(l.replace(/\*\*/g, '').trim(), SZ_CORPO, true)],
      }));
      i++; continue;
    }

    // Parágrafo normal
    if (l.trim()) {
      // Processar bold inline **texto**
      const partes: TextRun[] = [];
      const regex = /\*\*(.+?)\*\*/g;
      let ultimo = 0;
      let m;
      while ((m = regex.exec(l)) !== null) {
        if (m.index > ultimo) partes.push(rTexto(l.slice(ultimo, m.index)));
        partes.push(rTexto(m[1], SZ_CORPO, true));
        ultimo = m.index + m[0].length;
      }
      if (ultimo < l.length) partes.push(rTexto(l.slice(ultimo).trim()));

      els.push(new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 100, line: 276 },
        children: partes.length ? partes : [rTexto(l.trim())],
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
  const anoLetivo  = '2026-2027'; // fixo conforme instrução
  const disciplina = entrada.disciplina || 'Serviços de Cozinha-Pastelaria';
  const sigla      = disciplina.toLowerCase().includes('restaurante') ? 'SRB' : 'SCP';

  // Título curto para o header grande (max ~30 chars)
  const tituloLong = moduloNome;
  const tituloCurto = moduloNome.length > 35
    ? moduloNome.split(' ').slice(0, 4).join(' ')
    : moduloNome;

  const logoBuffer = await carregarLogo();

  // ── Cabeçalho (igual ao documento oficial) ─────────────────
  // Estrutura original:
  //   [logótipo esquerda]    [Curso Profissional... direita bold 11pt teal]
  //                          [SCP - MÓDULO 16 - nome    ano 10pt teal]
  //                          [Cozinha Tradicional Portuguesa  26pt teal bold]
  // Linha separadora em baixo

  const logoImg = logoBuffer
    ? new ImageRun({ data: logoBuffer, transformation: { width: 70, height: 30 } })
    : new TextRun({ text: 'ECL', font: FONTE, color: COR_TEAL, bold: true, size: SZ_HDR1 });

  const header = new Header({
    children: [
      // Linha com logótipo à esquerda e texto à direita usando tab
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        spacing: { before: 0, after: 0, line: 240 },
        children: [
          logoImg as any,
          rTab(),
          rTeal('Curso Profissional de Técnico de Cozinha-Pastelaria', SZ_HDR1, true),
        ],
      }),
      // Linha 2: SCP - MÓDULO + nome + ano (à direita)
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        spacing: { before: 0, after: 0, line: 240 },
        children: [
          rTab(),
          rTeal(sigla + ' - ' + moduloId + ' - ' + tituloLong + '    ' + anoLetivo, SZ_HDR2, false),
        ],
      }),
      // Linha 3: título curto grande (à direita)
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        border: { bottom: borderTeal(8) },
        spacing: { before: 0, after: 40, line: 240 },
        children: [
          rTab(),
          rTeal(tituloCurto, SZ_HDR_TIT, true),
        ],
      }),
    ],
  });

  // ── Rodapé (igual ao documento oficial) ────────────────────
  // "Data: 01/09/2016 / Revisão: 02/07/2021"  esquerda teal 9pt
  // "ECL.GPC.015.2"                            direita teal 9pt
  const footer = new Footer({
    children: [
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        border: { top: borderTeal(4) },
        spacing: { before: 40, after: 0, line: 240 },
        children: [
          rTeal('Data: 01 / 09 / 2016', SZ_FTR),
          rTab(),
          rTeal('ECL.GPC.015.2', SZ_FTR),
        ],
      }),
      new Paragraph({
        spacing: { before: 0, after: 0, line: 240 },
        children: [
          rTeal('Revisão: 02 /07 /2021', SZ_FTR),
        ],
      }),
    ],
  });

  // ── Conteúdo ──────────────────────────────────────────────
  const conteudo = entrada.textoGuia
    ? parseMd(entrada.textoGuia)
    : [new Paragraph({ children: [rTexto('Conteúdo a gerar.')], spacing: { after: 80 } })];

  // ── Documento ──────────────────────────────────────────────
  const doc = new Document({
    numbering: {
      config: [{
        reference: 'numbered',
        levels: [{
          level: 0,
          format: 'decimal' as any,
          text: '%1.',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      }],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4 em twips
          margin: {
            top: MAR_TOP, bottom: MAR_BOT,
            left: MAR_LAT, right: MAR_LAT,
            header: MAR_HDR, footer: MAR_FTR,
          },
        },
      },
      headers: { default: header },
      footers: { default: footer },
      children: conteudo,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = (moduloId ? moduloId + '_' : '') + moduloNome.slice(0, 50).replace(/[^a-zA-ZÀ-ÿ0-9 ]/g, '').replace(/\s+/g, '_') + '.docx';
  a.click();
  URL.revokeObjectURL(url);
}

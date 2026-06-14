// ============================================================
// Export da Ficha Técnica ECL para .docx e .pdf (impressão)
// Formato fiel ao original ECL:
//   - Cores: #004F5C (header tabela), #007A8E (fill), #F2F2F2 (linhas)
//   - Logo ECL no cabeçalho
//   - Tabela de ingredientes por componente
//   - Modo de preparação numerado
//   - Rodapé com elaborado por / data / página
// ============================================================

// Logo ECL em base64 (extraído do ficheiro original)
const LOGO_ECL_B64 = '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';

export interface LinhaIngrediente {
  componente: string;
  qt: string;
  un: string;
  produto: string;
  tPrep: string;
  tConf: string;
  obs: string;
}

export interface PassoPreparacao {
  num: number;
  descricao: string;
  temperatura: string;
  tempo: string;
  obs: string;
  haccp?: string;
}

export interface FichaTecnicaExport {
  nomePrato: string;
  classificacao: string;
  fichaNum: string;
  alergenicos: string;
  tempoPrep: string;
  tempoConf: string;
  numPorcoes: string;
  ingredientes: LinhaIngrediente[];
  preparacao: PassoPreparacao[];
  empratamento: string;
  elaboradoPor: string;
  data: string;
  equipamento?: string;
  conservacao?: string;
  regeneracao?: string;
  kitchenflow?: string;
  nutricao?: {
    calorias: number;
    proteinas: number;
    gorduras: number;
    hidratos: number;
  };
}

// ============================================================
// Export PDF via impressão do browser
// ============================================================
export function exportPDF(ficha: FichaTecnicaExport): void {
  const html = gerarHTML(ficha);
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 500);
}

// ============================================================
// Export DOCX via biblioteca docx (carregada via CDN no browser)
// ============================================================
export async function exportDOCX(ficha: FichaTecnicaExport): Promise<void> {
  try {
    // Carregar docx via CDN se ainda não estiver disponível
    if (!(window as any).docx) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/docx/8.5.0/docx.umd.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Falha ao carregar biblioteca docx'));
        document.head.appendChild(script);
        setTimeout(() => reject(new Error('Timeout')), 10000);
      });
    }

    if (!(window as any).docx) {
      alert('Não foi possível carregar a biblioteca Word. Tenta o PDF em alternativa.');
      return;
    }

  const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
    ImageRun, Header, Footer, PageNumber, HeadingLevel,
  } = (window as any).docx;

  // Cores ECL
  const COR_HEADER = '004F5C';
  const COR_FILL = 'D6E4E8';
  const COR_CINZA = 'F2F2F2';
  const COR_BRANCO = 'FFFFFF';

  const border = { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' };
  const borders = { top: border, bottom: border, left: border, right: border };
  const semBordas = { top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } };

  // Largura total A4 com margens 1cm = ~11200 DXA
  const W = 11200;

  function celHeader(texto: string, largura: number) {
    return new TableCell({
      width: { size: largura, type: WidthType.DXA },
      borders,
      shading: { fill: COR_HEADER, type: ShadingType.CLEAR },
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 60, bottom: 60, left: 80, right: 80 },
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: texto, bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })],
      })],
    });
  }

  function celDado(texto: string, largura: number, fill = COR_BRANCO, bold = false) {
    return new TableCell({
      width: { size: largura, type: WidthType.DXA },
      borders,
      shading: { fill, type: ShadingType.CLEAR },
      margins: { top: 60, bottom: 60, left: 80, right: 80 },
      children: [new Paragraph({
        children: [new TextRun({ text: texto || '', bold, size: 18, font: 'Calibri' })],
      })],
    });
  }

  // Logo
  const logoData = Uint8Array.from(atob(LOGO_ECL_B64), c => c.charCodeAt(0));

  // ---- CABEÇALHO ----
  const tabelaCabecalho = new Table({
    width: { size: W, type: WidthType.DXA },
    columnWidths: [1200, W - 2400, 1200],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 1200, type: WidthType.DXA },
            borders,
            shading: { fill: COR_BRANCO, type: ShadingType.CLEAR },
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new ImageRun({ data: logoData, transformation: { width: 60, height: 60 }, type: 'png' })],
            })],
          }),
          new TableCell({
            width: { size: W - 2400, type: WidthType.DXA },
            borders,
            shading: { fill: COR_HEADER, type: ShadingType.CLEAR },
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'Escola de Comércio de Lisboa', bold: true, color: 'FFFFFF', size: 22, font: 'Calibri' })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'FICHA TÉCNICA DE COZINHA', bold: true, color: 'FFFFFF', size: 26, font: 'Calibri' })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 1200, type: WidthType.DXA },
            borders,
            shading: { fill: COR_FILL, type: ShadingType.CLEAR },
            margins: { top: 60, bottom: 60, left: 80, right: 80 },
            children: [
              new Paragraph({ children: [new TextRun({ text: 'CLASSIFICAÇÃO:', bold: true, size: 16, font: 'Calibri' })] }),
              new Paragraph({ children: [new TextRun({ text: ficha.classificacao || '', size: 16, font: 'Calibri' })] }),
              new Paragraph({ children: [new TextRun({ text: 'FICHA Nº:', bold: true, size: 16, font: 'Calibri' })] }),
              new Paragraph({ children: [new TextRun({ text: ficha.fichaNum || '', size: 16, font: 'Calibri' })] }),
            ],
          }),
        ],
      }),
    ],
  });

  // ---- INFO PRATO ----
  const tabelaInfo = new Table({
    width: { size: W, type: WidthType.DXA },
    columnWidths: [W - 2400, 1200, 1200],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: W - 2400, type: WidthType.DXA },
            borders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [
              new Paragraph({ children: [new TextRun({ text: 'NOME: ', bold: true, size: 20, font: 'Calibri' }), new TextRun({ text: ficha.nomePrato, bold: true, size: 20, font: 'Calibri', color: COR_HEADER })] }),
              new Paragraph({ children: [new TextRun({ text: 'ALERGÉNICOS: ', bold: true, size: 18, font: 'Calibri' }), new TextRun({ text: ficha.alergenicos || '', size: 18, font: 'Calibri' })] }),
            ],
          }),
          new TableCell({
            width: { size: 1200, type: WidthType.DXA },
            borders,
            shading: { fill: COR_FILL, type: ShadingType.CLEAR },
            margins: { top: 60, bottom: 60, left: 80, right: 80 },
            children: [
              new Paragraph({ children: [new TextRun({ text: 'T. PREPARAÇÃO', bold: true, size: 16, font: 'Calibri' })] }),
              new Paragraph({ children: [new TextRun({ text: ficha.tempoPrep || '', size: 18, font: 'Calibri' })] }),
              new Paragraph({ children: [new TextRun({ text: 'T. CONFEÇÃO', bold: true, size: 16, font: 'Calibri' })] }),
              new Paragraph({ children: [new TextRun({ text: ficha.tempoConf || '', size: 18, font: 'Calibri' })] }),
            ],
          }),
          new TableCell({
            width: { size: 1200, type: WidthType.DXA },
            borders,
            shading: { fill: COR_FILL, type: ShadingType.CLEAR },
            margins: { top: 60, bottom: 60, left: 80, right: 80 },
            children: [
              new Paragraph({ children: [new TextRun({ text: 'Nº PORÇÕES', bold: true, size: 16, font: 'Calibri' })] }),
              new Paragraph({ children: [new TextRun({ text: ficha.numPorcoes || '', size: 24, bold: true, font: 'Calibri', color: COR_HEADER })] }),
            ],
          }),
        ],
      }),
    ],
  });

  // ---- INGREDIENTES ----
  const colsIng = [1400, 600, 500, 3000, 800, 800, 1800];
  const headersIng = ['COMPONENTE', 'QT.', 'UN.', 'PRODUTO', 'T.PREP', 'T.CONF', 'OBSERVAÇÕES'];

  const rowHeaderIng = new TableRow({
    children: headersIng.map((h, i) => celHeader(h, colsIng[i])),
  });

  const rowsIng = ficha.ingredientes.map((ing, idx) => new TableRow({
    children: [
      celDado(ing.componente, colsIng[0], idx % 2 === 0 ? COR_BRANCO : COR_CINZA, !!ing.componente),
      celDado(ing.qt, colsIng[1], idx % 2 === 0 ? COR_BRANCO : COR_CINZA),
      celDado(ing.un, colsIng[2], idx % 2 === 0 ? COR_BRANCO : COR_CINZA),
      celDado(ing.produto, colsIng[3], idx % 2 === 0 ? COR_BRANCO : COR_CINZA),
      celDado(ing.tPrep, colsIng[4], idx % 2 === 0 ? COR_BRANCO : COR_CINZA),
      celDado(ing.tConf, colsIng[5], idx % 2 === 0 ? COR_BRANCO : COR_CINZA),
      celDado(ing.obs, colsIng[6], idx % 2 === 0 ? COR_BRANCO : COR_CINZA),
    ],
  }));

  const tabelaIngredientes = new Table({
    width: { size: W, type: WidthType.DXA },
    columnWidths: colsIng,
    rows: [rowHeaderIng, ...rowsIng],
  });

  // ---- MODO DE PREPARAÇÃO ----
  const colsPrep = [600, 4200, 1000, 1000, 4400];
  const headersPrep = ['Nº', 'AÇÃO / DESCRIÇÃO', 'TEMP.', 'TEMPO', 'OBSERVAÇÕES'];

  const rowHeaderPrep = new TableRow({
    children: headersPrep.map((h, i) => celHeader(h, colsPrep[i])),
  });

  const rowsPrep = ficha.preparacao.map((p, idx) => new TableRow({
    children: [
      celDado(String(p.num), colsPrep[0], idx % 2 === 0 ? COR_BRANCO : COR_CINZA, true),
      celDado(p.descricao, colsPrep[1], idx % 2 === 0 ? COR_BRANCO : COR_CINZA),
      celDado(p.temperatura, colsPrep[2], idx % 2 === 0 ? COR_BRANCO : COR_CINZA),
      celDado(p.tempo, colsPrep[3], idx % 2 === 0 ? COR_BRANCO : COR_CINZA),
      celDado(p.obs, colsPrep[4], idx % 2 === 0 ? COR_BRANCO : COR_CINZA),
    ],
  }));

  const tabelaPreparacao = new Table({
    width: { size: W, type: WidthType.DXA },
    columnWidths: colsPrep,
    rows: [rowHeaderPrep, ...rowsPrep],
  });

  // ---- EMPRATAMENTO ----
  const tabelaEmpratamento = new Table({
    width: { size: W, type: WidthType.DXA },
    columnWidths: [600, W - 600],
    rows: [
      new TableRow({
        children: [
          celHeader('Nº', 600),
          celHeader('APRESENTAÇÃO / EMPRATAMENTO', W - 600),
        ],
      }),
      new TableRow({
        children: [
          celDado('1', 600),
          celDado(ficha.empratamento || '', W - 600),
        ],
      }),
    ],
  });

  // ---- RODAPÉ ----
  const tabelaRodape = new Table({
    width: { size: W, type: WidthType.DXA },
    columnWidths: [Math.floor(W * 0.5), Math.floor(W * 0.25), Math.floor(W * 0.25)],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: Math.floor(W * 0.5), type: WidthType.DXA },
            borders,
            shading: { fill: COR_FILL, type: ShadingType.CLEAR },
            margins: { top: 60, bottom: 60, left: 80, right: 80 },
            children: [new Paragraph({ children: [new TextRun({ text: 'ELABORADO POR: ' + (ficha.elaboradoPor || ''), size: 16, font: 'Calibri' })] })],
          }),
          new TableCell({
            width: { size: Math.floor(W * 0.25), type: WidthType.DXA },
            borders,
            shading: { fill: COR_FILL, type: ShadingType.CLEAR },
            margins: { top: 60, bottom: 60, left: 80, right: 80 },
            children: [new Paragraph({ children: [new TextRun({ text: 'DATA: ' + (ficha.data || ''), size: 16, font: 'Calibri' })] })],
          }),
          new TableCell({
            width: { size: Math.floor(W * 0.25), type: WidthType.DXA },
            borders,
            shading: { fill: COR_FILL, type: ShadingType.CLEAR },
            margins: { top: 60, bottom: 60, left: 80, right: 80 },
            children: [new Paragraph({ children: [new TextRun({ text: 'PÁGINA 1', size: 16, font: 'Calibri' })] })],
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 567, right: 567, bottom: 567, left: 567 },
        },
      },
      children: [
        tabelaCabecalho,
        new Paragraph({ text: '', spacing: { after: 100 } }),
        tabelaInfo,
        new Paragraph({ text: '', spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: 'INGREDIENTES', bold: true, size: 22, color: COR_HEADER, font: 'Calibri' })] }),
        new Paragraph({ text: '', spacing: { after: 60 } }),
        tabelaIngredientes,
        new Paragraph({ text: '', spacing: { after: 200 } }),
        new Paragraph({ children: [new TextRun({ text: 'MODO DE PREPARAÇÃO', bold: true, size: 22, color: COR_HEADER, font: 'Calibri' })] }),
        new Paragraph({ text: '', spacing: { after: 60 } }),
        tabelaPreparacao,
        new Paragraph({ text: '', spacing: { after: 200 } }),
        new Paragraph({ children: [new TextRun({ text: 'APRESENTAÇÃO / EMPRATAMENTO', bold: true, size: 22, color: COR_HEADER, font: 'Calibri' })] }),
        new Paragraph({ text: '', spacing: { after: 60 } }),
        tabelaEmpratamento,
        new Paragraph({ text: '', spacing: { after: 200 } }),
        tabelaRodape,
      ],
    }],
  });

  const buffer = await Packer.toBlob(doc);
  const url = URL.createObjectURL(buffer);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Ficha_Tecnica_${ficha.nomePrato.replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
  a.click();
  URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Erro ao gerar Word:', e);
    alert('Não foi possível gerar o ficheiro Word. Tenta o PDF em alternativa.');
  }
}

// ============================================================
// HTML para impressão/PDF (formato ECL)
// ============================================================
function gerarHTML(ficha: FichaTecnicaExport): string {
  const ing = ficha.ingredientes.map((i, idx) => `
    <tr style="background:${idx % 2 === 0 ? '#fff' : '#F2F2F2'}">
      <td>${i.componente}</td><td>${i.qt}</td><td>${i.un}</td>
      <td>${i.produto}</td><td>${i.tPrep}</td><td>${i.tConf}</td><td>${i.obs}</td>
    </tr>`).join('');

  const prep = ficha.preparacao.map((p, idx) => `
    <tr style="background:${idx % 2 === 0 ? '#fff' : '#F2F2F2'}">
      <td style="text-align:center;font-weight:bold">${p.num}</td>
      <td>${p.descricao}</td><td>${p.temperatura}</td>
      <td>${p.tempo}</td><td>${p.obs}</td>
      <td style="color:#B5651D;font-size:9pt">${p.haccp || ''}</td>
    </tr>`).join('');

  return `<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8">
  <title>Ficha Técnica — ${ficha.nomePrato}</title>
  <style>
    @page { size: A4; margin: 1cm; }
    body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; margin: 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    td, th { border: 1px solid #aaa; padding: 5px 7px; vertical-align: top; }
    .header-ecl { background: #004F5C; color: #fff; font-weight: bold; text-align: center; }
    .header-table th { background: #004F5C; color: #fff; font-weight: bold; font-size: 10pt; }
    .info-fill { background: #D6E4E8; }
    .section-title { color: #004F5C; font-weight: bold; font-size: 12pt; margin: 10px 0 4px 0; }
    .rodape { font-size: 9pt; }
    img.logo { width: 50px; height: 50px; }
  </style>
  </head><body>
  <table>
    <tr>
      <td style="width:80px;text-align:center"><img class="logo" src="data:image/png;base64,${LOGO_ECL_B64}"></td>
      <td class="header-ecl" style="font-size:14pt">Escola de Comércio de Lisboa<br><span style="font-size:16pt">FICHA TÉCNICA DE COZINHA</span></td>
      <td class="info-fill" style="width:120px;font-size:9pt">
        <b>CLASSIFICAÇÃO:</b><br>${ficha.classificacao}<br>
        <b>FICHA Nº:</b><br>${ficha.fichaNum}
      </td>
    </tr>
  </table>
  <table>
    <tr>
      <td style="width:70%"><b>NOME:</b> <span style="color:#004F5C;font-weight:bold">${ficha.nomePrato}</span><br>
        <b>ALERGÉNICOS:</b> ${ficha.alergenicos}</td>
      <td class="info-fill" style="text-align:center"><b>T. PREP.</b><br>${ficha.tempoPrep}<br><b>T. CONF.</b><br>${ficha.tempoConf}</td>
      <td class="info-fill" style="text-align:center"><b>Nº PORÇÕES</b><br><span style="font-size:18pt;font-weight:bold;color:#004F5C">${ficha.numPorcoes}</span></td>
    </tr>
  </table>
  <div class="section-title">INGREDIENTES</div>
  <table class="header-table">
    <tr><th>COMPONENTE</th><th>QT.</th><th>UN.</th><th>PRODUTO</th><th>T.PREP</th><th>T.CONF</th><th>OBSERVAÇÕES</th></tr>
    ${ing}
  </table>
  <div class="section-title">MODO DE PREPARAÇÃO</div>
  <table class="header-table">
    <tr><th style="width:30px">Nº</th><th>AÇÃO / DESCRIÇÃO</th><th style="width:60px">TEMP.</th><th style="width:60px">TEMPO</th><th>OBS.</th><th style="width:120px">⚠️ PCC/HACCP</th></tr>
    ${prep}
  </table>
  <div class="section-title">APRESENTAÇÃO / EMPRATAMENTO</div>
  <table><tr><td>${ficha.empratamento || ''}</td></tr></table>
  ${ficha.equipamento ? `
  <div class="section-title">🔧 EQUIPAMENTO NECESSÁRIO</div>
  <table><tr><td style="white-space:pre-line">${ficha.equipamento}</td></tr></table>
  ` : ''}
  ${(ficha.conservacao || ficha.regeneracao) ? `
  <div class="section-title">❄️ CONSERVAÇÃO E 🔥 REGENERAÇÃO</div>
  <table>
    <tr>
      <td style="width:50%;vertical-align:top"><b>Conservação:</b><br>${ficha.conservacao || 'Não especificado'}</td>
      <td style="width:50%;vertical-align:top"><b>Regeneração:</b><br>${ficha.regeneracao || 'Não especificado'}</td>
    </tr>
  </table>
  ` : ''}
  ${ficha.nutricao ? `
  <div class="section-title">INFORMAÇÃO NUTRICIONAL ESTIMADA (por porção)</div>
  <table class="header-table">
    <tr>
      <th>Energia (kcal)</th>
      <th>Proteínas (g)</th>
      <th>Gorduras (g)</th>
      <th>Hidratos de Carbono (g)</th>
    </tr>
    <tr>
      <td style="text-align:center;font-weight:bold;font-size:13pt">${ficha.nutricao.calorias}</td>
      <td style="text-align:center">${ficha.nutricao.proteinas}</td>
      <td style="text-align:center">${ficha.nutricao.gorduras}</td>
      <td style="text-align:center">${ficha.nutricao.hidratos}</td>
    </tr>
  </table>
  <div style="font-size:8pt;color:#666;margin-bottom:8px">⚠️ Valores estimados com base na tabela INSA. Verificar com tabela oficial.</div>
  ` : ''}
  <div style="margin-top:16px;padding:10px 12px;border:2px solid #004F5C;border-radius:4px;background:#F0F8FF;">
    <div style="font-weight:bold;color:#004F5C;font-size:10pt;margin-bottom:6px">📋 REGISTOS OBRIGATÓRIOS — KitchenFlow ECL</div>
    <div style="font-size:9pt;color:#333">${
      (ficha.kitchenflow || 'Temperatura de serviço · Higiene pessoal · Não conformidades')
        .split('\n')
        .filter((l: string) => l.trim())
        .map((l: string) => `• ${l.trim()}`)
        .join('<br>')
    }</div>
  </div>
  <table class="rodape" style="margin-top:20px">
    <tr>
      <td class="info-fill"><b>ELABORADO POR:</b> ${ficha.elaboradoPor}</td>
      <td class="info-fill"><b>DATA:</b> ${ficha.data}</td>
      <td class="info-fill">PÁGINA 1</td>
    </tr>
  </table>
  </body></html>`;
}

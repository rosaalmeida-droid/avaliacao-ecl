import { abrirEImprimir } from './imprimir';
// O logótipo da Escola de Comércio de Lisboa (o mesmo do guião). Aqui estava,
// por engano, o de outra escola (Rosa, out/2026).
import { LOGO_ECL } from './logo_ecl';
const LOGO_ECL_B64 = LOGO_ECL.split(',')[1];

// ============================================================
// Export da Ficha Técnica ECL para .docx e .pdf (impressão)
// Formato fiel ao original ECL:
//   - Cores: #004F5C (header tabela), #007A8E (fill), #F2F2F2 (linhas)
//   - Logo ECL no cabeçalho
//   - Tabela de ingredientes por componente
//   - Modo de preparação numerado
//   - Rodapé com elaborado por / data / página
// ============================================================


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
  tecnicasSugeridas?: string[];
  aparelhosDetectados?: string[];
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
  abrirEImprimir(gerarHTML(ficha));
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
    columnWidths: [1900, W - 3100, 1200],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 1900, type: WidthType.DXA },
            borders,
            shading: { fill: COR_BRANCO, type: ShadingType.CLEAR },
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new ImageRun({ data: logoData, transformation: { width: 110, height: 52 }, type: 'jpg' })],
            })],
          }),
          new TableCell({
            width: { size: W - 3100, type: WidthType.DXA },
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
export function gerarHTML(ficha: FichaTecnicaExport): string {
  const ing = (ficha.ingredientes || []).map((i, idx) => `
    <tr style="background:${idx % 2 === 0 ? '#fff' : '#F2F2F2'}">
      <td>${i.componente}</td><td>${i.qt}</td><td>${i.un}</td>
      <td>${i.produto}</td><td>${i.tPrep}</td><td>${i.tConf}</td><td>${i.obs}</td>
    </tr>`).join('');

  const prep = (ficha.preparacao || []).map((p, idx) => `
    <tr style="background:${idx % 2 === 0 ? '#fff' : '#F2F2F2'}">
      <td style="text-align:center;font-weight:bold">${p.num}</td>
      <td>${p.descricao}</td><td>${p.temperatura}</td>
      <td>${p.tempo}</td><td>${p.obs}</td>
      <td style="color:#B5651D;font-size:7pt">${p.haccp || ''}</td>
    </tr>`).join('');

  return `<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8">
  <title>Ficha Técnica — ${ficha.nomePrato}</title>
  <style>
    @page { size: A4; margin: 1cm; }
    body { font-family: Calibri, Arial, sans-serif; font-size: 7pt; margin: 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 7px; }
    td, th { border: 1px solid #aaa; padding: 3px 5px; vertical-align: top; }
    .header-ecl { background: #004F5C; color: #fff; font-weight: bold; text-align: center; }
    .header-table th { background: #004F5C; color: #fff; font-weight: bold; font-size: 8.5pt; }
    .info-fill { background: #D6E4E8; }
    .section-title { color: #004F5C; font-weight: bold; font-size: 8.5pt; margin: 6px 0 3px 0; }
    .rodape { font-size: 7pt; }
    img.logo { height: 46px; width: auto; max-width: 150px; }
  </style>
  </head><body>
  <table>
    <tr>
      <td style="width:160px;text-align:center"><img class="logo" src="${LOGO_ECL}" alt="Escola de Comércio de Lisboa"></td>
      <td class="header-ecl" style="font-size:8.5pt">Escola de Comércio de Lisboa<br><span style="font-size:8.5pt">FICHA TÉCNICA DE COZINHA</span></td>
      <td class="info-fill" style="width:120px;font-size:7pt">
        <b>CLASSIFICAÇÃO:</b><br>${ficha.classificacao}<br>
        <b>FICHA Nº:</b><br>${ficha.fichaNum}
      </td>
    </tr>
  </table>
  <table>
    <tr>
      <td style="width:70%"><b>NOME:</b> <span style="color:#004F5C;font-weight:bold">${ficha.nomePrato}</span><br>
        <b>ALERGÉNICOS:</b> ${Array.isArray(ficha.alergenicos) ? (ficha.alergenicos as any).join(", ") : (ficha.alergenicos || "")}</td>
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
      <td style="text-align:center;font-weight:bold;font-size:7pt">${ficha.nutricao.calorias}</td>
      <td style="text-align:center">${ficha.nutricao.proteinas}</td>
      <td style="text-align:center">${ficha.nutricao.gorduras}</td>
      <td style="text-align:center">${ficha.nutricao.hidratos}</td>
    </tr>
  </table>
  <div style="font-size:7pt;color:#666;margin-bottom:4px">⚠️ Valores estimados com base na tabela INSA. Verificar com tabela oficial.</div>
  ` : ''}
  <div style="margin-top:8px;padding:10px 12px;border:2px solid #004F5C;border-radius:4px;background:#F0F8FF;">
    <div style="font-weight:bold;color:#004F5C;font-size:8.5pt;margin-bottom:3px">📋 REGISTOS OBRIGATÓRIOS — KitchenFlow ECL</div>
    <div style="font-size:7pt;color:#333">${
      (ficha.kitchenflow || 'Temperatura de serviço · Higiene pessoal · Não conformidades')
        .split('\n')
        .filter((l: string) => l.trim())
        .map((l: string) => `• ${l.trim()}`)
        .join('<br>')
    }</div>
  </div>
  ${(ficha.tecnicasSugeridas && ficha.tecnicasSugeridas.length > 0) || (ficha.aparelhosDetectados && ficha.aparelhosDetectados.length > 0) ? `
  <div style="margin-top:10px;padding:8px 12px;border:1px solid #CBD5E1;border-radius:4px;background:#F8FAFC;">
    ${ficha.tecnicasSugeridas && ficha.tecnicasSugeridas.length > 0 ? `
    <div style="font-weight:bold;color:#5B67EA;font-size:7pt;margin-bottom:4px">SUBTÉCNICAS DETECTADAS:</div>
    <div style="font-size:7pt;color:#333;margin-bottom:3px">${ficha.tecnicasSugeridas.map((s: string) => {
      // «SUB-… — Nome | APP-… | componente»: no papel basta o código e o nome.
      const partes = s.split('|')[0].trim().split(' — ');
      return partes.length > 1 ? `${partes[0]} — <b>${partes[1]}</b>` : s;
    }).join(' · ')}</div>
    ` : ''}
    ${ficha.aparelhosDetectados && ficha.aparelhosDetectados.length > 0 ? `
    <div style="font-weight:bold;color:#5B67EA;font-size:7pt;margin-bottom:4px">APARELHOS DETECTADOS:</div>
    <div style="font-size:7pt;color:#333">${ficha.aparelhosDetectados.map((a: string) => {
      const partes = a.split(' — ');
      return partes.length > 1 ? `${partes[0]} — <b>${partes[1]}</b>` : a;
    }).join(' · ')}</div>
    ` : ''}
  </div>
  ` : ''}
  <table class="rodape" style="margin-top:10px">
    <tr>
      <td class="info-fill"><b>ELABORADO POR:</b> ${ficha.elaboradoPor}</td>
      <td class="info-fill"><b>DATA:</b> ${ficha.data}</td>
      <td class="info-fill">PÁGINA 1</td>
    </tr>
  </table>
  </body></html>`;
}

import { jsPDF } from 'jspdf';
import { DadosGuia } from './GuiaProducao';

// ─────────────────────────────────────────────────────────────
// Cores e tipografia — replicar o estilo do PDF do Gemini
// ─────────────────────────────────────────────────────────────
const COR_PRIMARIA   = '#1a1714';
const COR_COBRE      = '#b5651d';
const COR_COBRE_PALE = '#fdf0e6';
const COR_AZUL_HCAP  = '#dc2626';
const COR_VERDE_OK   = '#15803d';
const COR_CINZA      = '#6b7280';
const COR_LINHA_PAR  = '#f8fafc';
const LARGURA_PAGINA = 210; // A4 mm
const MARGEM         = 15;
const LARGURA_UTIL   = LARGURA_PAGINA - MARGEM * 2;

interface OpcoesPDF {
  nomePrato: string;
  ucId?: string;
  ucNome?: string;
  guia: DadosGuia;
  textoOriginal: string;
}

// ─────────────────────────────────────────────────────────────
// Utilitários de desenho
// ─────────────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function setFill(doc: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  doc.setFillColor(r, g, b);
}

function setTextColor(doc: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  doc.setTextColor(r, g, b);
}

function setDrawColor(doc: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  doc.setDrawColor(r, g, b);
}

// Texto com wrap automático — devolve nova posição Y
function textoComWrap(
  doc: jsPDF, texto: string, x: number, y: number,
  maxWidth: number, lineHeight: number
): number {
  const linhas = doc.splitTextToSize(texto, maxWidth);
  doc.text(linhas, x, y);
  return y + linhas.length * lineHeight;
}

// Verificar espaço na página — nova página se necessário
function verificarPagina(doc: jsPDF, y: number, espaco: number, margemBase: number): number {
  const alturaUtil = 297 - margemBase - 15;
  if (y + espaco > alturaUtil) {
    doc.addPage();
    return margemBase + 10;
  }
  return y;
}

// ─────────────────────────────────────────────────────────────
// Cabeçalho da página
// ─────────────────────────────────────────────────────────────
function desenharCabecalho(doc: jsPDF, nomePrato: string, ucId?: string, ucNome?: string): number {
  let y = MARGEM;

  // Bloco superior — fundo escuro
  setFill(doc, COR_PRIMARIA);
  doc.rect(MARGEM, y, LARGURA_UTIL, 28, 'F');

  // Título do guião
  setTextColor(doc, '#ffffff');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('GUIA DE APOIO À PRODUÇÃO', MARGEM + 6, y + 10);

  // Nome do prato
  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.text(nomePrato.toUpperCase(), MARGEM + 6, y + 20);

  y += 30;

  // Faixa UC
  if (ucId || ucNome) {
    setFill(doc, COR_COBRE);
    doc.rect(MARGEM, y, LARGURA_UTIL, 8, 'F');
    setTextColor(doc, '#ffffff');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const textoUC = [ucId, ucNome].filter(Boolean).join(' — ');
    doc.text(textoUC, MARGEM + 4, y + 5.5);
    y += 10;
  }

  // Linha separadora
  setDrawColor(doc, COR_COBRE);
  doc.setLineWidth(0.3);
  doc.line(MARGEM, y, MARGEM + LARGURA_UTIL, y);
  y += 6;

  return y;
}

// ─────────────────────────────────────────────────────────────
// Título de secção
// ─────────────────────────────────────────────────────────────
function desenharTituloSeccao(
  doc: jsPDF, numero: number, titulo: string, icone: string, cor: string, y: number
): number {
  y = verificarPagina(doc, y, 14, MARGEM);

  setFill(doc, cor);
  doc.rect(MARGEM, y, LARGURA_UTIL, 9, 'F');

  setTextColor(doc, '#ffffff');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`${icone}  ${numero}. ${titulo.toUpperCase()}`, MARGEM + 4, y + 6.2);

  return y + 12;
}

// ─────────────────────────────────────────────────────────────
// Tabela genérica
// ─────────────────────────────────────────────────────────────
function desenharTabela(
  doc: jsPDF, cabecalhos: string[], linhas: string[][], corCabecalho: string, y: number
): number {
  const numCols = cabecalhos.length;
  const larguraCols = LARGURA_UTIL / numCols;
  const altLinha = 7;

  y = verificarPagina(doc, y, altLinha * (linhas.length + 1) + 4, MARGEM);

  // Cabeçalho
  setFill(doc, corCabecalho);
  doc.rect(MARGEM, y, LARGURA_UTIL, altLinha + 1, 'F');
  setTextColor(doc, '#ffffff');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  cabecalhos.forEach((cab, i) => {
    doc.text(cab, MARGEM + i * larguraCols + 2, y + 5.5);
  });
  y += altLinha + 1;

  // Linhas
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  linhas.forEach((linha, ri) => {
    y = verificarPagina(doc, y, altLinha + 2, MARGEM);
    if (ri % 2 === 0) {
      setFill(doc, COR_LINHA_PAR);
      doc.rect(MARGEM, y, LARGURA_UTIL, altLinha + 2, 'F');
    }
    setTextColor(doc, COR_PRIMARIA);
    setDrawColor(doc, '#e5e7eb');
    doc.setLineWidth(0.1);
    doc.line(MARGEM, y + altLinha + 2, MARGEM + LARGURA_UTIL, y + altLinha + 2);

    linha.forEach((cel, ci) => {
      const textoLimpo = cel.replace(/\*\*/g, '');
      const linhasTexto = doc.splitTextToSize(textoLimpo, larguraCols - 4);
      doc.text(linhasTexto, MARGEM + ci * larguraCols + 2, y + 5);
    });
    y += altLinha + 2;
  });

  return y + 4;
}

// ─────────────────────────────────────────────────────────────
// Bullet list
// ─────────────────────────────────────────────────────────────
function desenharBullets(doc: jsPDF, items: string[], y: number, corBullet: string): number {
  doc.setFontSize(9);
  items.forEach(item => {
    y = verificarPagina(doc, y, 8, MARGEM);
    setTextColor(doc, corBullet);
    doc.setFont('helvetica', 'bold');
    doc.text('▸', MARGEM + 2, y);
    setTextColor(doc, COR_PRIMARIA);
    doc.setFont('helvetica', 'normal');
    const linhas = doc.splitTextToSize(item.replace(/^[-•·▸]\s*/, '').replace(/\*\*/g, ''), LARGURA_UTIL - 10);
    doc.text(linhas, MARGEM + 8, y);
    y += linhas.length * 5 + 2;
  });
  return y + 2;
}

// ─────────────────────────────────────────────────────────────
// Texto de parágrafo
// ─────────────────────────────────────────────────────────────
function desenharParagrafo(doc: jsPDF, texto: string, y: number): number {
  y = verificarPagina(doc, y, 10, MARGEM);
  setTextColor(doc, COR_PRIMARIA);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const linhas = doc.splitTextToSize(texto.replace(/\*\*/g, ''), LARGURA_UTIL);
  doc.text(linhas, MARGEM, y);
  return y + linhas.length * 5 + 3;
}

// ─────────────────────────────────────────────────────────────
// Roda Sensorial
// ─────────────────────────────────────────────────────────────
function desenharRodaSensorial(doc: jsPDF, items: {sabor: string; nivel: string; cor: string}[], y: number): number {
  y = verificarPagina(doc, y, 30, MARGEM);

  const nomes = ['DOCE', 'ÁCIDO', 'SALGADO', 'AMARGO', 'UMAMI'];
  const cores: Record<string, string> = {
    'Forte': '#1d4ed8', 'Presente': '#0891b2',
    'Ligeiro': '#6b7280', 'Ausente': '#e5e7eb'
  };

  doc.setFontSize(8);
  items.forEach((item, i) => {
    const xBase = MARGEM + i * (LARGURA_UTIL / 5);
    const nivel = item.nivel || 'Ausente';

    setTextColor(doc, COR_PRIMARIA);
    doc.setFont('helvetica', 'bold');
    doc.text(nomes[i] || item.sabor, xBase + 2, y);

    // Bolinhas
    const maxBolinhas = 4;
    const nivelMap: Record<string, number> = { 'Forte': 4, 'Presente': 3, 'Ligeiro': 2, 'Ausente': 0 };
    const preenchidas = nivelMap[nivel] ?? 0;

    for (let b = 0; b < maxBolinhas; b++) {
      const corBolinha = b < preenchidas ? (cores[nivel] || '#0891b2') : '#e5e7eb';
      setFill(doc, corBolinha);
      doc.circle(xBase + 3 + b * 7, y + 6, 2.5, 'F');
    }

    setTextColor(doc, COR_CINZA);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(nivel, xBase + 2, y + 14);
  });

  return y + 22;
}

// ─────────────────────────────────────────────────────────────
// Questões
// ─────────────────────────────────────────────────────────────
function desenharQuestoes(doc: jsPDF, conteudo: string, cor: string, y: number): number {
  // Separar perguntas de respostas
  const blocoPergs = conteudo.split(/RESPOSTAS?\s*:/i)[0].replace(/PERGUNTAS?\s*:/i, '').trim();
  const blocoResps = conteudo.includes('RESPOSTAS') ? conteudo.split(/RESPOSTAS?\s*:/i)[1]?.trim() || '' : '';

  const respostasCorretas: Record<string, string> = {};
  if (blocoResps) {
    blocoResps.split('\n').forEach((l: string) => {
      const m = l.trim().match(/^(\d+)[.)]\s*(.+)/);
      if (m) respostasCorretas[m[1]] = m[2].trim();
    });
  }

  // Desenhar perguntas
  const linhas = blocoPergs.split('\n').filter((l: string) => l.trim());
  let numQ = 0;
  let iLinha = 0;

  while (iLinha < linhas.length) {
    const l = linhas[iLinha].trim();
    const mNum = l.match(/^(\d+)[.)]\s+(.+)/);

    if (mNum) {
      numQ++;
      y = verificarPagina(doc, y, 10, MARGEM);

      // Número da questão
      setFill(doc, cor);
      doc.circle(MARGEM + 3, y - 1, 3, 'F');
      setTextColor(doc, '#ffffff');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(mNum[1], MARGEM + 1.5, y + 0.5);

      // Texto da questão
      setTextColor(doc, COR_PRIMARIA);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      const pergLinhas = doc.splitTextToSize(mNum[2].replace(/\(verdadeiro\/falso\)/i, '(V/F)').replace(/\(resposta curta\)/i, ''), LARGURA_UTIL - 10);
      doc.text(pergLinhas, MARGEM + 8, y);
      y += pergLinhas.length * 5 + 2;

      // Opções a/b/c/d
      iLinha++;
      while (iLinha < linhas.length) {
        const opt = linhas[iLinha].trim();
        if (opt.match(/^[a-dA-D][.)]/)) {
          y = verificarPagina(doc, y, 6, MARGEM);
          setTextColor(doc, COR_CINZA);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          const optLinhas = doc.splitTextToSize(opt, LARGURA_UTIL - 14);
          doc.text(optLinhas, MARGEM + 12, y);
          y += optLinhas.length * 5;
          iLinha++;
        } else break;
      }

      // Resposta correcta
      if (respostasCorretas[mNum[1]]) {
        y = verificarPagina(doc, y, 6, MARGEM);
        setFill(doc, '#f0fdf4');
        doc.rect(MARGEM + 8, y - 1, LARGURA_UTIL - 8, 6, 'F');
        setTextColor(doc, COR_VERDE_OK);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(`✓ ${respostasCorretas[mNum[1]]}`, MARGEM + 10, y + 3.5);
        y += 8;
      }

      y += 3;
    } else {
      iLinha++;
    }
  }

  return y;
}

// ─────────────────────────────────────────────────────────────
// Alerta HACCP
// ─────────────────────────────────────────────────────────────
function desenharAlertaHACCP(doc: jsPDF, texto: string, y: number): number {
  y = verificarPagina(doc, y, 10, MARGEM);
  setFill(doc, '#fef2f2');
  const linhas = doc.splitTextToSize(texto.replace(/\*\*/g, ''), LARGURA_UTIL - 10);
  doc.rect(MARGEM, y - 2, LARGURA_UTIL, linhas.length * 5 + 6, 'F');
  setTextColor(doc, COR_AZUL_HCAP);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('⚠ ', MARGEM + 2, y + 3);
  doc.setFont('helvetica', 'normal');
  doc.text(linhas, MARGEM + 8, y + 3);
  return y + linhas.length * 5 + 8;
}

// ─────────────────────────────────────────────────────────────
// Rodapé
// ─────────────────────────────────────────────────────────────
function desenharRodape(doc: jsPDF, nomePrato: string, ucId?: string, ucNome?: string) {
  const totalPaginas = doc.getNumberOfPages();
  for (let p = 1; p <= totalPaginas; p++) {
    doc.setPage(p);
    const yRodape = 297 - 10;
    setDrawColor(doc, '#e5e7eb');
    doc.setLineWidth(0.3);
    doc.line(MARGEM, yRodape - 4, MARGEM + LARGURA_UTIL, yRodape - 4);

    setTextColor(doc, COR_CINZA);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);

    const textoEsq = `Guião de Apoio à Produção · ${nomePrato}`;
    const textoCentro = ucId ? `${ucId}${ucNome ? ` — ${ucNome.slice(0, 40)}` : ''}` : '';
    const textoDir = `${p} / ${totalPaginas}`;

    doc.text(textoEsq, MARGEM, yRodape);
    if (textoCentro) {
      doc.text(textoCentro, LARGURA_PAGINA / 2, yRodape, { align: 'center' });
    }
    doc.text(textoDir, MARGEM + LARGURA_UTIL, yRodape, { align: 'right' });

    // Logo ECL
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    setTextColor(doc, COR_COBRE);
    doc.text('ECL', MARGEM + LARGURA_UTIL - 20, yRodape);
  }
}

// ─────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL — Gerar PDF completo
// ─────────────────────────────────────────────────────────────
export async function gerarPDFGuiao(opcoes: OpcoesPDF): Promise<void> {
  const { nomePrato, ucId, ucNome, guia } = opcoes;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Metadados
  doc.setProperties({
    title: `Guião de Apoio à Produção — ${nomePrato}`,
    subject: ucNome || ucId || 'Cozinha e Pastelaria',
    author: 'Avaliação ECL — Escola de Comércio de Lisboa',
    creator: 'KitchenFlow ECL',
  });

  let y = desenharCabecalho(doc, nomePrato, ucId, ucNome);

  // Cores por secção — replicar as do GuiaProducao
  const CORES_SECCAO: Record<number, string> = {
    1: '#0f766e', 2: '#2563eb', 3: '#dc2626', 4: '#0891b2',
    5: '#7c3aed', 6: '#d97706', 7: '#0369a1', 8: '#059669',
    9: '#b45309', 10: '#1e40af', 11: '#6d28d9', 12: '#0c4a6e',
    13: '#9d174d', 14: '#374151', 15: '#1a1714',
  };

  const ICONES_SECCAO: Record<number, string> = {
    1: '📖', 2: '🎯', 3: '⚠️', 4: '⚖️', 5: '👥',
    6: '🌈', 7: '💡', 8: '♻️', 9: '💶', 10: '🔬',
    11: '📚', 12: '❓', 13: '🧩', 14: '🪞', 15: '📖',
  };

  // Renderizar cada secção
  for (const secao of guia.secoes) {
    const cor = CORES_SECCAO[secao.num] || '#374151';
    const icone = ICONES_SECCAO[secao.num] || '•';

    y = desenharTituloSeccao(doc, secao.num, secao.titulo, icone, cor, y);

    const conteudo = secao.conteudo || '';
    const linhas = conteudo.split('\n').filter((l: string) => l.trim());

    if (secao.num === 3) {
      // HACCP — tabela
      const cabHACCP = ['Etapa', 'Perigo', 'Ponto Crítico', 'Medida de Controlo'];
      const linhasTabela: string[][] = [];
      let linhaAtual: string[] = [];

      linhas.forEach((l: string) => {
        const t = l.trim().replace(/\*\*/g, '');
        if (t.startsWith('|')) {
          const cols = t.split('|').filter((c: string) => c.trim() && !c.trim().match(/^-+$/));
          if (cols.length >= 3 && !cols[0].toLowerCase().includes('etapa')) {
            linhasTabela.push(cols.map((c: string) => c.trim()));
          }
        } else if (t && !t.match(/^#+/) && linhaAtual.length < 4) {
          linhaAtual.push(t);
          if (linhaAtual.length === 4) {
            linhasTabela.push([...linhaAtual]);
            linhaAtual = [];
          }
        }
      });

      if (linhasTabela.length > 0) {
        y = desenharTabela(doc, cabHACCP, linhasTabela, cor, y);
      } else {
        y = desenharBullets(doc, linhas.filter((l: string) => l.trim()), y, cor);
      }

    } else if (secao.num === 6) {
      // Equilíbrio sensorial
      if (guia.equilibrioSensorial && guia.equilibrioSensorial.length > 0) {
        const rodaFormatada = guia.equilibrioSensorial.map(e => ({ sabor: e.componente || '', nivel: e.intensidade || '', cor: '' }));
        y = desenharRodaSensorial(doc, rodaFormatada, y);
      }
      // Parágrafo de análise
      const analise = linhas.filter(l => !l.match(/^(DOCE|ÁCIDO|SALGADO|AMARGO|UMAMI):/i)).join(' ');
      if (analise) y = desenharParagrafo(doc, analise, y);

    } else if (secao.num === 12) {
      // Questões
      y = desenharQuestoes(doc, conteudo, cor, y);

    } else if (secao.num === 4) {
      // Tabela de rendimentos
      const cabRend = ['Apresentação Comercial', 'Rendimento', 'Vantagens', 'Desvantagens'];
      const linhasTabela: string[][] = [];
      linhas.forEach((l: string) => {
        const t = l.trim().replace(/\*\*/g, '');
        if (t.startsWith('|')) {
          const cols = t.split('|').filter((c: string) => c.trim() && !c.trim().match(/^-+$/));
          if (cols.length >= 3 && !cols[0].toLowerCase().includes('apresentação')) {
            linhasTabela.push(cols.slice(0, 4).map((c: string) => c.trim()));
          }
        }
      });
      if (linhasTabela.length > 0) {
        y = desenharTabela(doc, cabRend, linhasTabela, cor, y);
      } else {
        y = desenharBullets(doc, linhas.filter((l: string) => l.trim()), y, cor);
      }

    } else {
      // Conteúdo genérico — parágrafos e bullets
      let emTabela = false;
      const tabelaLinhas: string[][] = [];
      let tabelaCabecalho: string[] = [];

      linhas.forEach((l: string) => {
        const t = l.trim();

        if (t.startsWith('|')) {
          const cols = t.split('|').filter(c => c.trim());
          if (cols.some(c => c.trim().match(/^-+$/))) return; // linha separadora
          if (tabelaCabecalho.length === 0) {
            tabelaCabecalho = cols.map((c: string) => c.trim().replace(/\*\*/g, ''));
          } else {
            tabelaLinhas.push(cols.map((c: string) => c.trim()));
          }
          emTabela = true;
        } else {
          if (emTabela && tabelaLinhas.length > 0) {
            y = desenharTabela(doc, tabelaCabecalho, tabelaLinhas, cor, y);
            tabelaCabecalho = [];
            tabelaLinhas.length = 0;
            emTabela = false;
          }
          if (t.match(/^[-•·▸*]\s+/) || t.match(/^\d+\.\s+/)) {
            const ehHACCP = /⚠️|PCC|Crítico|temperatura.*°C/i.test(t);
            if (ehHACCP) {
              y = desenharAlertaHACCP(doc, t, y);
            } else {
              y = desenharBullets(doc, [t], y, cor);
            }
          } else if (t.match(/^#+\s+/)) {
            // Subtítulo
            y = verificarPagina(doc, y, 8, MARGEM);
            setTextColor(doc, cor);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text(t.replace(/^#+\s+/, ''), MARGEM, y);
            y += 6;
          } else if (t) {
            y = desenharParagrafo(doc, t, y);
          }
        }
      });

      if (emTabela && tabelaLinhas.length > 0) {
        y = desenharTabela(doc, tabelaCabecalho, tabelaLinhas, cor, y);
      }
    }

    y += 4; // espaço entre secções
  }

  // Rodapé em todas as páginas
  desenharRodape(doc, nomePrato, ucId, ucNome);

  // Download
  const nomeArquivo = `Guiao_${nomePrato.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(nomeArquivo);
}

import { DadosGuia } from './GuiaProducao';

export interface OpcoesPDF {
  nomePrato: string;
  ucId?: string;
  ucNome?: string;
  guia: DadosGuia;
  textoOriginal: string;
}

// Cores por secção
const CORES: Record<number, string> = {
  1:'#0f766e',2:'#2563eb',3:'#dc2626',4:'#0891b2',
  5:'#7c3aed',6:'#d97706',7:'#0369a1',8:'#059669',
  9:'#b45309',10:'#1e40af',11:'#6d28d9',12:'#0c4a6e',
  13:'#9d174d',14:'#374151',15:'#1a1714',
};

const ICONES: Record<number, string> = {
  1:'📖',2:'🎯',3:'⚠️',4:'⚖️',5:'👥',6:'🌈',7:'💡',
  8:'♻️',9:'💶',10:'🔬',11:'📚',12:'❓',13:'🧩',14:'🪞',15:'📖',
};

function renderSecao(secao: { num: number; titulo: string; conteudo: string; equilibrioSensorial?: any[] }): string {
  const cor = CORES[secao.num] || '#374151';
  const icone = ICONES[secao.num] || '•';
  const conteudo = secao.conteudo || '';

  // Secção 6 — equilíbrio sensorial
  if (secao.num === 6 && secao.equilibrioSensorial?.length) {
    const rodaHtml = secao.equilibrioSensorial.map((e: any) => {
      const nivelMap: Record<string, number> = { 'Forte':4,'Presente':3,'Ligeiro':2,'Ausente':0 };
      const n = nivelMap[e.intensidade] ?? 0;
      const bolinhas = Array.from({length:4},(_,i) =>
        `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${i<n?cor:'#e5e7eb'};margin:0 2px;"></span>`
      ).join('');
      return `<div style="text-align:center;margin:0 8px;">
        <div style="font-size:11px;font-weight:700;color:#374151;margin-bottom:4px;">${e.componente||''}</div>
        <div>${bolinhas}</div>
        <div style="font-size:9px;color:#6b7280;margin-top:3px;">${e.intensidade||''}</div>
      </div>`;
    }).join('');

    const analise = conteudo.split('\n')
      .filter((l: string) => !l.match(/^(DOCE|ÁCIDO|SALGADO|AMARGO|UMAMI):/i))
      .join(' ').trim();

    return `
      <div style="display:flex;justify-content:center;flex-wrap:wrap;gap:4px;padding:12px 0;">
        ${rodaHtml}
      </div>
      ${analise ? `<p style="font-size:12px;color:#374151;line-height:1.5;margin-top:8px;">${analise}</p>` : ''}
    `;
  }

  // Secção 12 — questões
  if (secao.num === 12) {
    const blocos = conteudo.split(/RESPOSTAS?\s*:/i);
    const pergs = blocos[0].replace(/PERGUNTAS?\s*:/i,'').trim();
    const respsRaw = blocos[1] || '';
    const resps: Record<string,string> = {};
    respsRaw.split('\n').forEach((l: string) => {
      const m = l.trim().match(/^(\d+)[.)]\s*(.+)/);
      if (m) resps[m[1]] = m[2];
    });
    const linhas = pergs.split('\n').filter((l: string) => l.trim());
    let html = '';
    let i = 0;
    while (i < linhas.length) {
      const l = linhas[i].trim();
      const mNum = l.match(/^(\d+)[.)]\s+(.+)/);
      if (mNum) {
        html += `<div style="margin-bottom:12px;padding:10px;background:#f8fafc;border-radius:8px;border-left:3px solid ${cor};">
          <div style="font-weight:700;font-size:12px;color:#1a1714;margin-bottom:6px;">${mNum[1]}. ${mNum[2]}</div>`;
        i++;
        while (i < linhas.length && linhas[i].trim().match(/^[a-dA-D][.)]/)) {
          html += `<div style="font-size:11px;color:#6b7280;padding:2px 0 2px 10px;">${linhas[i].trim()}</div>`;
          i++;
        }
        if (resps[mNum[1]]) {
          html += `<div style="margin-top:6px;padding:4px 8px;background:#f0fdf4;border-radius:4px;font-size:11px;color:#15803d;font-weight:600;">✓ ${resps[mNum[1]]}</div>`;
        }
        html += '</div>';
      } else { i++; }
    }
    return html;
  }

  // Tabelas markdown
  if (conteudo.includes('|')) {
    const linhas = conteudo.split('\n');
    let html = '';
    let emTabela = false;
    let cabecalho: string[] = [];
    let linhasTabela: string[][] = [];

    linhas.forEach((l: string) => {
      const t = l.trim();
      if (t.startsWith('|')) {
        const cols = t.split('|').filter((c: string) => c.trim());
        if (cols.every((c: string) => c.trim().match(/^-+$/))) return;
        if (!emTabela) { cabecalho = cols.map((c: string) => c.trim()); emTabela = true; }
        else { linhasTabela.push(cols.map((c: string) => c.trim())); }
      } else {
        if (emTabela && linhasTabela.length > 0) {
          html += `<table style="width:100%;border-collapse:collapse;font-size:11px;margin:8px 0;">
            <tr>${cabecalho.map(c => `<th style="background:${cor};color:#fff;padding:6px 8px;text-align:left;font-weight:700;">${c}</th>`).join('')}</tr>
            ${linhasTabela.map((lr,ri) => `<tr style="background:${ri%2===0?'#f8fafc':'#fff'}">${lr.map(c=>`<td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;">${c}</td>`).join('')}</tr>`).join('')}
          </table>`;
          cabecalho = []; linhasTabela = []; emTabela = false;
        }
        if (t) {
          if (t.match(/^[-•·]\s/)) {
            html += `<div style="padding:3px 0 3px 16px;font-size:12px;color:#374151;position:relative;"><span style="position:absolute;left:4px;color:${cor};">▸</span>${t.replace(/^[-•·]\s/,'')}</div>`;
          } else if (t.match(/^#+\s/)) {
            html += `<div style="font-weight:700;font-size:12px;color:${cor};margin:8px 0 4px;">${t.replace(/^#+\s/,'')}</div>`;
          } else {
            html += `<p style="font-size:12px;color:#374151;line-height:1.5;margin:4px 0;">${t}</p>`;
          }
        }
      }
    });
    if (emTabela && linhasTabela.length > 0) {
      html += `<table style="width:100%;border-collapse:collapse;font-size:11px;margin:8px 0;">
        <tr>${cabecalho.map(c=>`<th style="background:${cor};color:#fff;padding:6px 8px;text-align:left;">${c}</th>`).join('')}</tr>
        ${linhasTabela.map((lr,ri)=>`<tr style="background:${ri%2===0?'#f8fafc':'#fff'}">${lr.map(c=>`<td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;">${c}</td>`).join('')}</tr>`).join('')}
      </table>`;
    }
    return html;
  }

  // Texto genérico
  return conteudo.split('\n').map((l: string) => {
    const t = l.trim();
    if (!t) return '';
    if (t.match(/^[-•·]\s/)) return `<div style="padding:3px 0 3px 16px;font-size:12px;color:#374151;position:relative;"><span style="position:absolute;left:4px;color:${cor};">▸</span>${t.replace(/^[-•·]\s/,'')}</div>`;
    if (t.match(/^#+\s/)) return `<div style="font-weight:700;font-size:12px;color:${cor};margin:8px 0 4px;">${t.replace(/^#+\s/,'')}</div>`;
    if (t.match(/⚠️|PCC|crítico/i)) return `<div style="padding:6px 10px;background:#fef2f2;border-left:3px solid #dc2626;border-radius:4px;font-size:11px;color:#b91c1c;margin:4px 0;">${t}</div>`;
    return `<p style="font-size:12px;color:#374151;line-height:1.5;margin:3px 0;">${t}</p>`;
  }).join('');
}

export async function gerarPDFGuiao(opcoes: OpcoesPDF): Promise<void> {
  const { nomePrato, ucId, ucNome, guia } = opcoes;

  const secoesHtml = guia.secoes.map(secao => {
    const cor = CORES[secao.num] || '#374151';
    const icone = ICONES[secao.num] || '•';
    const secaoComRoda = { ...secao, equilibrioSensorial: guia.equilibrioSensorial };
    return `
      <div style="margin-bottom:20px;page-break-inside:avoid;">
        <div style="background:${cor};color:#fff;padding:8px 12px;border-radius:6px 6px 0 0;display:flex;align-items:center;gap:8px;">
          <span style="font-size:14px;">${icone}</span>
          <span style="font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">${secao.num}. ${secao.titulo}</span>
        </div>
        <div style="background:#fff;border:1px solid ${cor}30;border-top:none;border-radius:0 0 6px 6px;padding:12px 14px;">
          ${renderSecao(secaoComRoda as any)}
        </div>
      </div>
    `;
  }).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Guião — ${nomePrato}</title>
<style>
  @page { size: A4; margin: 15mm; }
  body { font-family: 'Arial Narrow', Arial, sans-serif; font-size: 12px; line-height: 1.5; color: #1a1714; background: #fff; margin: 0; text-align: justify; }
  p, li, div, td, th, span { font-family: 'Arial Narrow', Arial, sans-serif; line-height: 1.5; text-align: justify; }
  h1, h2, h3, h4, .titulo, [style*='font-weight:900'], [style*='font-weight:700'] { text-align: left; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <!-- Cabeçalho -->
  <div style="background:#1a1714;color:#fff;padding:16px 20px;border-radius:8px;margin-bottom:8px;">
    <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;opacity:0.5;margin-bottom:4px;">Guia de Apoio à Produção</div>
    <div style="font-size:18px;font-weight:900;line-height:1.2;">${nomePrato.toUpperCase()}</div>
    ${ucId || ucNome ? `<div style="margin-top:8px;background:#b5651d;padding:4px 10px;border-radius:4px;display:inline-block;font-size:9px;font-weight:700;">${[ucId,ucNome].filter(Boolean).join(' — ')}</div>` : ''}
  </div>

  <!-- Secções -->
  ${secoesHtml}

  <!-- Rodapé -->
  <div style="margin-top:20px;padding-top:8px;border-top:1px solid #e5e7eb;font-size:9px;color:#9ca3af;display:flex;justify-content:space-between;">
    <span>Guião de Apoio à Produção · ${nomePrato}</span>
    <span>Avaliação ECL · Escola de Comércio de Lisboa</span>
  </div>
</body>
</html>`;

  // Abrir numa nova janela e imprimir
  const janela = window.open('', '_blank', 'width=900,height=700');
  if (!janela) { alert('Permite popups para gerar o PDF'); return; }
  janela.document.write(html);
  janela.document.close();
  janela.onload = () => {
    setTimeout(() => {
      janela.focus();
      janela.print();
    }, 500);
  };
}

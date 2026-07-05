import { DadosGuia } from './GuiaProducao';

export interface OpcoesPDF {
  nomePrato: string;
  ucId?: string;
  ucNome?: string;
  guia: DadosGuia;
  textoOriginal: string;
}

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
  const conteudo = secao.conteudo || '';

  if (secao.num === 6 && secao.equilibrioSensorial?.length) {
    const rodaHtml = secao.equilibrioSensorial.map((e: any) => {
      const nivelMap: Record<string, number> = { 'Forte':4,'Presente':3,'Ligeiro':2,'Ausente':0 };
      const n = nivelMap[e.intensidade] ?? 0;
      const bolinhas = Array.from({length:4},(_,i) =>
        `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${i<n?cor:'#e5e7eb'};margin:0 2px;"></span>`
      ).join('');
      return `<div style="text-align:center;margin:0 8px;">
        <div style="font-size:10px;font-weight:700;color:#374151;margin-bottom:4px;">${e.componente||''}</div>
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
      ${analise ? `<p style="font-size:11px;color:#374151;line-height:1.6;margin-top:8px;">${analise}</p>` : ''}
    `;
  }

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
          <div style="font-weight:700;font-size:11px;color:#1a1714;margin-bottom:6px;">${mNum[1]}. ${mNum[2]}</div>`;
        i++;
        while (i < linhas.length && linhas[i].trim().match(/^[a-dA-D][.)]/)) {
          html += `<div style="font-size:10px;color:#6b7280;padding:2px 0 2px 10px;">${linhas[i].trim()}</div>`;
          i++;
        }
        if (resps[mNum[1]]) {
          html += `<div style="margin-top:6px;padding:4px 8px;background:#f0fdf4;border-radius:4px;font-size:10px;color:#15803d;font-weight:600;">✓ ${resps[mNum[1]]}</div>`;
        }
        html += '</div>';
      } else { i++; }
    }
    return html;
  }

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
          html += `<table style="width:100%;border-collapse:collapse;font-size:10px;margin:8px 0;">
            <tr>${cabecalho.map(c => `<th style="background:${cor};color:#fff;padding:6px 8px;text-align:left;font-weight:700;">${c}</th>`).join('')}</tr>
            ${linhasTabela.map((lr,ri) => `<tr style="background:${ri%2===0?'#f8fafc':'#fff'}">${lr.map(c=>`<td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;">${c}</td>`).join('')}</tr>`).join('')}
          </table>`;
          cabecalho = []; linhasTabela = []; emTabela = false;
        }
        if (t) {
          if (t.match(/^[-•·]\s/)) {
            html += `<div style="padding:3px 0 3px 16px;font-size:11px;color:#374151;position:relative;"><span style="position:absolute;left:4px;color:${cor};">▸</span>${t.replace(/^[-•·]\s/,'')}</div>`;
          } else if (t.match(/^#+\s/)) {
            html += `<div style="font-weight:800;font-size:12px;color:${cor};margin:12px 0 6px;padding:4px 0;border-bottom:1px solid ${cor}30;">${t.replace(/^#+\s/,'')}</div>`;
          } else if (t) {
            html += `<p style="font-size:11px;color:#374151;line-height:1.5;margin:4px 0;text-align:justify;">${t}</p>`;
          }
        }
      }
    });
    if (emTabela && linhasTabela.length > 0) {
      html += `<table style="width:100%;border-collapse:collapse;font-size:10px;margin:8px 0;">
        <tr>${cabecalho.map(c=>`<th style="background:${cor};color:#fff;padding:6px 8px;text-align:left;">${c}</th>`).join('')}</tr>
        ${linhasTabela.map((lr,ri)=>`<tr style="background:${ri%2===0?'#f8fafc':'#fff'}">${lr.map(c=>`<td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;">${c}</td>`).join('')}</tr>`).join('')}
      </table>`;
    }
    return html;
  }

  return conteudo.split('\n').map((l: string) => {
    const t = l.trim();
    if (!t) return '';
    if (t.match(/^[-•·]\s/)) return `<div style="padding:3px 0 3px 16px;font-size:11px;color:#374151;position:relative;"><span style="position:absolute;left:4px;color:${cor};">▸</span>${t.replace(/^[-•·]\s/,'')}</div>`;
    if (t.match(/^#+\s/)) return `<div style="font-weight:800;font-size:12px;color:${cor};margin:12px 0 6px;padding:4px 0;border-bottom:1px solid ${cor}30;page-break-after:avoid;">${t.replace(/^#+\s/,'')}</div>`;
    if (t.match(/⚠️|PCC|crítico/i)) return `<div style="padding:6px 10px;background:#fef2f2;border-left:3px solid #dc2626;border-radius:4px;font-size:10px;color:#b91c1c;margin:4px 0;">${t}</div>`;
    return `<p style="font-size:11px;color:#374151;line-height:1.5;margin:3px 0;text-align:justify;">${t}</p>`;
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
        <div style="background:${cor};color:#fff;padding:8px 12px;border-radius:6px 6px 0 0;page-break-after:avoid;">
          <span style="font-size:14px;margin-right:8px;">${icone}</span>
          <span style="font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">${secao.num}. ${secao.titulo}</span>
        </div>
        <div style="background:#fff;border:1px solid ${cor}30;border-top:none;border-radius:0 0 6px 6px;padding:12px 14px;">
          ${renderSecao(secaoComRoda as any)}
        </div>
      </div>
    `;
  }).join('');

  const cabecalhoHtml = `
    <div style="background:#1a1714;color:#fff;padding:16px 20px;border-radius:8px;margin-bottom:16px;">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;opacity:0.5;margin-bottom:4px;">Guia de Apoio à Produção</div>
      <div style="font-size:20px;font-weight:900;line-height:1.2;font-family:'Arial Narrow',Arial,sans-serif;">${nomePrato.toUpperCase()}</div>
      ${ucId || ucNome ? `<div style="margin-top:8px;background:#b5651d;padding:4px 10px;border-radius:4px;display:inline-block;font-size:9px;font-weight:700;">${[ucId,ucNome].filter(Boolean).join(' — ')}</div>` : ''}
    </div>
  `;

  const rodapeHtml = `
    <table style="margin-top:20px;padding-top:8px;border-top:1px solid #e5e7eb;width:100%;border-collapse:collapse;">
      <tr>
        <td style="font-size:9px;color:#9ca3af;padding:0;border:none;text-align:left;">Guião de Apoio à Produção · ${nomePrato} · ${ucId || ''}</td>
        <td style="font-size:9px;color:#9ca3af;padding:0;border:none;text-align:right;">Escola de Comércio de Lisboa · Avaliação ECL · 2026</td>
      </tr>
    </table>
  `;

  // CSS de impressão — esconde tudo excepto o overlay
  const styleId = 'ecl-print-style';
  let styleEl = document.getElementById(styleId) as HTMLStyleElement;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = `
    @media print {
      body > *:not(#ecl-print-overlay) { display: none !important; }
      #ecl-print-overlay { position: static !important; overflow: visible !important; }
      #ecl-print-overlay .ecl-barra-overlay { display: none !important; }
      @page { size: A4; margin: 15mm; }
    }
  `;

  // Remover overlay anterior
  const anterior = document.getElementById('ecl-print-overlay');
  if (anterior) anterior.remove();

  // Criar overlay
  const overlay = document.createElement('div');
  overlay.id = 'ecl-print-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 99999; background: #fff;
    overflow-y: auto; font-family: 'Arial Narrow', Arial, sans-serif;
    font-size: 12px; line-height: 1.5; color: #1a1714;
  `;

  // Barra superior
  const barra = document.createElement('div');
  barra.className = 'ecl-barra-overlay';
  barra.style.cssText = 'position:sticky;top:0;z-index:2;background:#1a1714;padding:12px 20px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;';
  barra.innerHTML = `
    <div style="flex:1;min-width:0;">
      <div style="color:#fff;font-weight:700;font-size:14px;font-family:Arial,sans-serif;">📄 ${nomePrato}</div>
      <div style="color:rgba(255,255,255,0.55);font-size:11px;font-family:Arial,sans-serif;margin-top:2px;">
        Clica em <strong style="color:#f59e0b;">Imprimir</strong> → destino <strong style="color:#f59e0b;">"Guardar como PDF"</strong> → desactiva cabeçalhos e rodapés
      </div>
    </div>
    <button id="ecl-btn-print" style="padding:10px 20px;background:#b5651d;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif;white-space:nowrap;">🖨️ Imprimir / PDF</button>
    <button id="ecl-btn-fechar" style="padding:10px 16px;background:rgba(255,255,255,0.15);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif;">✕</button>
  `;

  // Conteúdo — largura total A4
  const conteudo = document.createElement('div');
  conteudo.style.cssText = 'padding:24px 28px;width:100%;max-width:800px;margin:0 auto;box-sizing:border-box;';
  conteudo.innerHTML = cabecalhoHtml + secoesHtml + rodapeHtml;

  overlay.appendChild(barra);
  overlay.appendChild(conteudo);
  document.body.appendChild(overlay);

  document.getElementById('ecl-btn-fechar')!.onclick = () => {
    overlay.remove();
    styleEl.textContent = '';
  };

  document.getElementById('ecl-btn-print')!.onclick = () => {
    barra.style.display = 'none';
    window.print();
    setTimeout(() => { barra.style.display = ''; }, 1500);
  };
}

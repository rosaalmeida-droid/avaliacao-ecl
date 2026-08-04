// src/exportManualDoc.ts
// Export do Manual do Aluno — formato ECL.
// Cabeçalho e rodapé REPETEM em todas as páginas (Word: cabeçalho/rodapé
// nativos mso; PDF: técnica thead/tfoot). O rodapé fica SEMPRE no fundo da
// página, seja qual for o tamanho do texto, e o conteúdo longo pagina sozinho.
// As margens estão "coladas" ao layout (não dependem das definições de
// impressão do browser). Word = download .doc; PDF = abrir + imprimir.

const brandBlue = '#1aa1af';
const courseTrackLabel = 'Serviços de Cozinha e Pastelaria';

const M_TOP = '1.6cm';
const M_BOTTOM = '1.3cm';
const M_SIDE = '1.7cm';

export interface ManualSubsection { title: string; paragraphs?: string[]; bullets?: string[] }
export interface ManualTable { title?: string; columns: string[]; rows: string[][] }
export interface ManualDialogueBlock { title: string; instructions?: string; items: { client: string; response: string; objective?: string }[] }
export interface ManualWorksheetSection { title: string; instructions?: string; prompts: { prompt: string; lines: number }[] }
export interface ManualCallout { type: 'nota' | 'aviso' | 'dica' | 'definicao'; content: string }
export interface ManualProcedureSteps { title: string; intro?: string; steps: { label: string; detail: string; warning?: string }[] }
export interface ManualConsolidation { title?: string; keyPoints: string[]; selfCheck?: string[] }
export interface ManualPage {
  pageNumber: number; title: string; subtitle?: string;
  paragraphs?: string[]; bullets?: string[]; subsections?: ManualSubsection[];
  tables?: ManualTable[]; dialogueBlocks?: ManualDialogueBlock[];
  worksheetSections?: ManualWorksheetSection[];
  calloutBoxes?: ManualCallout[]; procedureSteps?: ManualProcedureSteps; consolidationBlock?: ManualConsolidation;
}
export interface ManualDocument {
  unitCode: string; unitNumber: number; fullTitle: string; schoolLabel: string;
  academicYear: string; footerDate: string; footerReference: string; footerRevision: string;
  pages: ManualPage[];
}

const schoolLogoSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 680">
  <g fill="${brandBlue}">
    <circle cx="113" cy="112" r="60" /><circle cx="295" cy="80" r="88" /><circle cx="485" cy="112" r="60" />
    <circle cx="80" cy="294" r="82" /><circle cx="296" cy="297" r="84" /><circle cx="516" cy="297" r="84" />
    <circle cx="113" cy="480" r="56" /><circle cx="296" cy="510" r="86" /><circle cx="485" cy="480" r="56" />
  </g>
  <g fill="${brandBlue}" font-family="Arial Narrow, Arial, sans-serif" font-weight="400">
    <text x="622" y="151" font-size="165">ESCOLA</text>
    <text x="622" y="381" font-size="185">COMÉRCIO</text>
    <text x="622" y="592" font-size="185">LISBOA</text>
  </g>
</svg>`.trim();
const schoolLogoDataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(schoolLogoSvg)}`;

function escapeHtml(value: string) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function capitalizeWord(w: string) { return w.length === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); }
function formatManualUnitTitle(title: string) {
  return title.trim().split(/\s+/).map((word) =>
    word.includes('-') ? word.split('-').map((p) => capitalizeWord(p)).join('-') : capitalizeWord(word)
  ).join(' ');
}

function renderParagraphs(paragraphs?: string[]) {
  if (!paragraphs || !paragraphs.length) return '';
  return paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('');
}
function renderBullets(bullets?: string[]) {
  if (!bullets || !bullets.length) return '';
  return `<ul>${bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>`;
}
function renderSubsections(subsections?: ManualSubsection[]) {
  if (!subsections || !subsections.length) return '';
  return subsections.map((s) => `<div class="subsection"><h3>${escapeHtml(s.title)}</h3>${renderParagraphs(s.paragraphs)}${renderBullets(s.bullets)}</div>`).join('');
}
function renderTables(tables?: ManualTable[]) {
  if (!tables || !tables.length) return '';
  return tables.map((table) => `<div class="manual-table-wrap">${table.title ? `<h3>${escapeHtml(table.title)}</h3>` : ''}<table class="manual-table" role="presentation"><thead><tr>${(table.columns || []).map((c) => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead><tbody>${(table.rows || []).map((row) => `<tr>${(row || []).map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`).join('');
}
function renderDialogueBlocks(dialogueBlocks?: ManualDialogueBlock[]) {
  if (!dialogueBlocks || !dialogueBlocks.length) return '';
  return dialogueBlocks.map((block) => `<div class="dialogue-block"><h3>${escapeHtml(block.title)}</h3>${block.instructions ? `<p class="dialogue-instructions">${escapeHtml(block.instructions)}</p>` : ''}${(block.items || []).map((item) => `<table class="dialogue-table" role="presentation"><tr><th>Cliente diz</th><td>${escapeHtml(item.client)}</td></tr><tr><th>Responder</th><td>${escapeHtml(item.response)}</td></tr>${item.objective ? `<tr><th>Objetivo</th><td>${escapeHtml(item.objective)}</td></tr>` : ''}</table>`).join('')}</div>`).join('');
}
function renderWorksheetSections(worksheetSections?: ManualWorksheetSection[]) {
  if (!worksheetSections || !worksheetSections.length) return '';
  return worksheetSections.map((section) => `<div class="worksheet-section"><h3>${escapeHtml(section.title)}</h3>${section.instructions ? `<p class="worksheet-instructions">${escapeHtml(section.instructions)}</p>` : ''}${(section.prompts || []).map((prompt) => `<div class="worksheet-prompt"><p>${escapeHtml(prompt.prompt)}</p>${Array.from({ length: Math.max(1, prompt.lines || 2) }, () => '<div class="answer-line"></div>').join('')}</div>`).join('')}</div>`).join('');
}
function renderCallouts(callouts?: ManualCallout[]) {
  if (!callouts || !callouts.length) return '';
  const tag: Record<string, string> = { definicao: 'DEFINIÇÃO', aviso: 'ATENÇÃO', dica: 'DICA', nota: 'NOTA' };
  return callouts.map((c) => `<div class="callout"><span class="callout-tag">${tag[c.type] || 'NOTA'}</span><span>${escapeHtml(c.content)}</span></div>`).join('');
}
function renderProcedure(ps?: ManualProcedureSteps) {
  if (!ps || !ps.steps || !ps.steps.length) return '';
  return `<div class="procedure"><h3>${escapeHtml(ps.title)}</h3>${ps.intro ? `<p>${escapeHtml(ps.intro)}</p>` : ''}<ol>${ps.steps.map((s) => `<li><strong>${escapeHtml(s.label)}:</strong> ${escapeHtml(s.detail)}${s.warning ? `<br /><span class="warning">⚠ ${escapeHtml(s.warning)}</span>` : ''}</li>`).join('')}</ol></div>`;
}
function renderConsolidation(cb?: ManualConsolidation) {
  if (!cb) return '';
  return `<div class="consolidation"><h3>${escapeHtml(cb.title || 'Consolidação')}</h3>${renderBullets(cb.keyPoints)}${cb.selfCheck && cb.selfCheck.length ? `<p><strong>Verifica se sabes:</strong></p>${renderBullets(cb.selfCheck)}` : ''}</div>`;
}
function renderCorePageBody(page: ManualPage) {
  return `${renderParagraphs(page.paragraphs)}${renderCallouts(page.calloutBoxes)}${renderBullets(page.bullets)}${renderSubsections(page.subsections)}${renderProcedure(page.procedureSteps)}${renderTables(page.tables)}${renderDialogueBlocks(page.dialogueBlocks)}${renderConsolidation(page.consolidationBlock)}${renderWorksheetSections(page.worksheetSections)}`;
}

function runningHeaderInner(doc: ManualDocument) {
  return `<table class="hdr" role="presentation"><tr>
      <td class="hlogo"><img src="${schoolLogoDataUri}" alt="Escola de Comércio de Lisboa" /></td>
      <td class="hmain">
        <div class="course-name"><span>Curso Profissional de Técnico de</span><span>Cozinha e Restauração</span></div>
        <div class="course-track">${escapeHtml(courseTrackLabel)}</div>
        <div class="hcode">${escapeHtml(doc.unitCode)} &nbsp;·&nbsp; ${escapeHtml(doc.academicYear)}</div>
      </td></tr></table><div class="hrule"></div>`;
}
function runningFooterInner(doc: ManualDocument) {
  return `<div class="frule"></div><table class="ftr" role="presentation"><tr>
      <td class="fleft">${escapeHtml(doc.footerDate)}<br/>${escapeHtml(doc.footerRevision)}</td>
      <td class="fright">${escapeHtml(doc.footerReference)}</td></tr></table>`;
}

function coverBlock(doc: ManualDocument, cover?: ManualPage) {
  const title = formatManualUnitTitle(doc.fullTitle);
  return `<div class="cover">
      <div class="cover-title">${escapeHtml(String(doc.unitNumber))} - ${escapeHtml(title)}</div>
      <h2 class="page-title">INTRODUÇÃO</h2>
      ${cover ? renderCorePageBody(cover) : ''}
    </div>`;
}
function indexBlock(content: ManualPage[]) {
  if (!content.length) return '';
  return `<div class="chapter"><h2 class="page-title">Índice</h2><ol class="toc">${content.map((p) => `<li>${escapeHtml(p.title)}</li>`).join('')}</ol></div>`;
}
function chaptersBlocks(content: ManualPage[]) {
  return content.map((p) => `<div class="chapter"><h2 class="page-title">${escapeHtml(p.title)}</h2>${p.subtitle ? `<h3 class="page-subtitle">${escapeHtml(p.subtitle)}</h3>` : ''}${renderCorePageBody(p)}</div>`).join('');
}

const CONTENT_CSS = `
  .course-name, .course-track, .hcode, .cover-title, .page-title, .page-subtitle, h3 { color: ${brandBlue}; }
  .course-name { font-size: 13pt; font-weight: 700; line-height: 1.08; text-align: right; }
  .course-track { font-size: 12pt; text-align: right; }
  .hcode { font-size: 11pt; font-weight: 700; text-align: right; margin-top: 0.06cm; }
  .cover-title { font-size: 34pt; font-weight: 700; line-height: 1.03; text-align: right; margin: 0 0 0.3cm; }
  .page-title { font-size: 14pt; font-weight: 700; text-transform: uppercase; margin: 0 0 0.18cm; page-break-after: avoid; }
  .page-subtitle, h3 { font-size: 13pt; font-weight: 700; margin: 0.3cm 0 0.14cm; page-break-after: avoid; }
  p, li { color: #000; text-align: justify; font-size: 12pt; line-height: 18pt; }
  p { margin: 0 0 0.22cm; mso-pagination: widow-orphan; }
  ul, ol.toc { margin: 0.06cm 0 0.3cm; padding-left: 1.2rem; }
  ol.toc li { margin: 0 0 0.12cm; font-weight: 700; }
  li { margin: 0 0 0.14cm; }
  .subsection, .manual-table-wrap, .dialogue-block, .worksheet-section, .worksheet-prompt, .callout, .procedure, .consolidation { page-break-inside: avoid; }
  .manual-table, .dialogue-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 0.16cm 0 0.3cm; }
  .manual-table th, .manual-table td, .dialogue-table th, .dialogue-table td { border: 1px solid #000; padding: 0.1cm 0.14cm; vertical-align: top; font-size: 11pt; line-height: 1.35; text-align: left; word-wrap: break-word; }
  .manual-table th, .dialogue-table th { background: #dcf1f3; font-weight: 700; }
  .dialogue-table th { width: 3.2cm; }
  .dialogue-instructions, .worksheet-instructions { font-style: italic; }
  .answer-line { border-bottom: 1px solid #737373; height: 0.6cm; margin-top: 0.12cm; }
  .callout { border-left: 3pt solid ${brandBlue}; background: #eaf6f6; padding: 0.14cm 0.2cm; margin: 0.14cm 0; }
  .callout-tag { display: block; color: ${brandBlue}; font-weight: 700; font-size: 9pt; margin-bottom: 0.04cm; }
  .procedure { margin: 0.14cm 0 0.28cm; } .procedure ol { margin: 0.06cm 0 0; padding-left: 1.2rem; } .procedure li { margin: 0 0 0.14cm; }
  .warning { color: #b3261e; font-size: 10pt; }
  .consolidation { border: 1px solid #9dd7dc; background: #f0fbfc; padding: 0.16cm 0.2cm; margin: 0.18cm 0; }
  .hdr { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .hlogo { width: 4.6cm; vertical-align: top; } .hlogo img { width: 4.5cm; height: auto; display: block; }
  .hmain { vertical-align: top; text-align: right; }
  .hrule { border-bottom: 1pt solid #b3e0e4; margin: 0.08cm 0 0; }
  .frule { border-top: 1pt solid #b3e0e4; margin: 0 0 0.06cm; }
  .ftr { width: 100%; border-collapse: collapse; color: ${brandBlue}; font-family: Arial, sans-serif; font-size: 7pt; line-height: 1.15; }
  .fleft { text-align: left; vertical-align: bottom; } .fright { text-align: right; vertical-align: bottom; }
  .chapter { page-break-before: always; }
`;

function normalizeFileNamePart(value: string) { return value.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function buildManualFileName(doc: ManualDocument, ext: string) {
  return `${String(doc.unitNumber).trim()}_Guião_${normalizeFileNamePart(doc.fullTitle)}_SCP_CR.${ext}`;
}

// ── WORD (.doc) — cabeçalho/rodapé NATIVOS (mso) ────────────────────────────
export function buildManualHtml(doc: ManualDocument): string {
  const cover = doc.pages[0];
  const content = doc.pages.slice(1);
  const css = `
    @page { size: 21cm 29.7cm; margin: ${M_TOP} ${M_SIDE} ${M_BOTTOM} ${M_SIDE}; mso-header-margin: 1cm; mso-footer-margin: 0.8cm; mso-header: h1; mso-footer: f1; }
    body { margin: 0; font-family: 'Arial Narrow', Arial, sans-serif; font-size: 12pt; line-height: 18pt; color: #000; }
    ${CONTENT_CSS}
  `;
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8" /><title>${escapeHtml(doc.fullTitle)}</title><!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]--><style>${css}</style></head><body>
    <div style="mso-element:header" id="h1">${runningHeaderInner(doc)}</div>
    <div style="mso-element:footer" id="f1">${runningFooterInner(doc)}</div>
    ${coverBlock(doc, cover)}
    ${indexBlock(content)}
    ${chaptersBlocks(content)}
  </body></html>`;
}

// ── PDF — thead/tfoot repetem; rodapé sempre no fundo; margens "coladas" ─────
export function buildPdfHtml(doc: ManualDocument): string {
  const cover = doc.pages[0];
  const content = doc.pages.slice(1);
  // alturas reservadas para o cabeçalho/rodapé fixos (espaço em cada página)
  const HEADER_H = '4.2cm';
  const FOOTER_H = '2.4cm';
  const css = `
    @page { size: A4; margin: 0; }
    html, body { margin: 0; padding: 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: 'Arial Narrow', Arial, sans-serif; font-size: 12pt; line-height: 18pt; color: #000; background: #fff; }
    /* Cabeçalho e rodapé FIXOS — o Chrome/Edge repetem-nos em todas as páginas,
       pinados ao topo e ao fundo, seja qual for o tamanho do texto. */
    .pfx-header { position: fixed; top: 0; left: 0; right: 0; padding: ${M_TOP} ${M_SIDE} 0.1cm; background: #fff; }
    .pfx-footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 0.1cm ${M_SIDE} ${M_BOTTOM}; background: #fff; }
    /* Espaçadores que repetem por página (thead/tfoot) para reservar o espaço
       do cabeçalho/rodapé fixos, evitando sobreposição. */
    table.sheet { width: 100%; border-collapse: collapse; }
    td.zone { padding-left: ${M_SIDE}; padding-right: ${M_SIDE}; }
    thead .sp { height: ${HEADER_H}; } tfoot .sp { height: ${FOOTER_H}; }
    tbody td.zone { padding-top: 0.1cm; padding-bottom: 0.1cm; }
    ${CONTENT_CSS}
    .cover { page-break-before: avoid; }
  `;
  return `<!DOCTYPE html><html lang="pt"><head><meta charset="utf-8" /><title>${escapeHtml(doc.fullTitle)}</title><style>${css}</style>
    <script>window.addEventListener('load',function(){setTimeout(function(){window.print()},450)})<\/script></head>
    <body>
      <div class="pfx-header">${runningHeaderInner(doc)}</div>
      <div class="pfx-footer">${runningFooterInner(doc)}</div>
      <table class="sheet">
        <thead><tr><td class="zone"><div class="sp"></div></td></tr></thead>
        <tfoot><tr><td class="zone"><div class="sp"></div></td></tr></tfoot>
        <tbody><tr><td class="zone">
          ${coverBlock(doc, cover)}
          ${indexBlock(content)}
          ${chaptersBlocks(content)}
        </td></tr></tbody>
      </table>
    </body></html>`;
}

export function downloadManualDoc(doc: ManualDocument) {
  const html = buildManualHtml(doc);
  const blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = buildManualFileName(doc, 'doc');
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function exportManualPdf(doc: ManualDocument) {
  // imprime a partir de um iframe escondido (não depende de pop-up).
  // O HTML/formato é o mesmo do buildPdfHtml; só o disparo da impressão muda.
  const html = buildPdfHtml(doc).replace(/<script>[\s\S]*?<\/script>/, '');
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);
  const idoc = iframe.contentWindow && iframe.contentWindow.document;
  if (!idoc) {
    document.body.removeChild(iframe);
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.focus(); w.print(); }
    return;
  }
  idoc.open();
  idoc.write(html);
  idoc.close();
  setTimeout(() => {
    try { iframe.contentWindow && iframe.contentWindow.focus(); iframe.contentWindow && iframe.contentWindow.print(); } catch (e) { /* */ }
    setTimeout(() => { try { document.body.removeChild(iframe); } catch (e) { /* */ } }, 120000);
  }, 700);
}

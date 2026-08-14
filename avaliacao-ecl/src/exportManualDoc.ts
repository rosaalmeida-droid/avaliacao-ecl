// src/exportManualDoc.ts
// Export do Manual do Aluno — formato ECL.
// Cabeçalho e rodapé REPETEM em todas as páginas (Word: cabeçalho/rodapé
// nativos mso; PDF: técnica thead/tfoot). O rodapé fica SEMPRE no fundo da
// página, seja qual for o tamanho do texto, e o conteúdo longo pagina sozinho.
// As margens estão "coladas" ao layout (não dependem das definições de
// impressão do browser). Word = download .doc; PDF = impressão via iframe
// (sem popup bloqueado). Preview = HTML renderizado idêntico ao PDF.

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
  calloutBoxes?: ManualCallout[]; procedureSteps?: ManualProcedureSteps;
  consolidationBlock?: ManualConsolidation;
  incompleto?: boolean;
}
export interface ManualDocument {
  unitCode: string; unitNumber: number; fullTitle: string; schoolLabel: string;
  academicYear: string; footerDate: string; footerReference: string; footerRevision: string;
  pages: ManualPage[];
  indice?: string; // linhas do índice editável
  geradorV?: number;
}

// ── Logo ECL SVG ─────────────────────────────────────────────────────────────
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

// ── Escape / utils ────────────────────────────────────────────────────────────
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

// ── Render helpers ────────────────────────────────────────────────────────────
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
  return tables.map((tbl) => {
    const cols = tbl.columns || [];
    const rows = tbl.rows || [];
    return `<div class="manual-table-wrap">${tbl.title ? `<h3>${escapeHtml(tbl.title)}</h3>` : ''}<table class="manual-table" role="presentation"><thead><tr>${cols.map((c) => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${(row || []).map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }).join('');
}
function renderDialogueBlocks(dialogueBlocks?: ManualDialogueBlock[]) {
  if (!dialogueBlocks || !dialogueBlocks.length) return '';
  return dialogueBlocks.map((block) => `<div class="dialogue-block"><h3>${escapeHtml(block.title)}</h3>${block.instructions ? `<p class="dialogue-instructions">${escapeHtml(block.instructions)}</p>` : ''}${(block.items || []).map((item) => `<table class="dialogue-table" role="presentation"><tr><th>Cliente diz</th><td>${escapeHtml(item.client)}</td></tr><tr><th>Responder</th><td>${escapeHtml(item.response)}</td></tr>${item.objective ? `<tr><th>Objetivo</th><td>${escapeHtml(item.objective)}</td></tr>` : ''}</table>`).join('')}</div>`).join('');
}
function renderWorksheetSections(worksheetSections?: ManualWorksheetSection[]) {
  if (!worksheetSections || !worksheetSections.length) return '';
  return worksheetSections.map((section) => `<div class="worksheet-section"><h3>${escapeHtml(section.title)}</h3>${section.instructions ? `<p class="worksheet-instructions">${escapeHtml(section.instructions)}</p>` : ''}${(section.prompts || []).map((prompt) => `<div class="worksheet-prompt"><p>${escapeHtml(prompt.prompt)}</p>${Array.from({ length: Math.max(1, prompt.lines || 1) }, () => '<div class="answer-line"></div>').join('')}</div>`).join('')}</div>`).join('');
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
export function renderCorePageBody(page: ManualPage) {
  return `${renderParagraphs(page.paragraphs)}${renderCallouts(page.calloutBoxes)}${renderBullets(page.bullets)}${renderSubsections(page.subsections)}${renderProcedure(page.procedureSteps)}${renderTables(page.tables)}${renderDialogueBlocks(page.dialogueBlocks)}${renderConsolidation(page.consolidationBlock)}${renderWorksheetSections(page.worksheetSections)}`;
}

// ── Cabeçalho e rodapé ECL (idênticos para Word e PDF) ───────────────────────
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

// ── Blocos de conteúdo ────────────────────────────────────────────────────────
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
  return content.map((p) => `<div class="chapter"><h2 class="page-title">${escapeHtml(p.title)}</h2>${p.subtitle ? `<h3 class="page-subtitle">${escapeHtml(p.subtitle)}</h3>` : ''}${p.incompleto ? `<div class="callout" style="border-color:#e65100;background:#fff3e0"><span class="callout-tag" style="color:#e65100">POR ACABAR</span><span>Este capítulo ainda não foi gerado ou ficou incompleto.</span></div>` : ''}${renderCorePageBody(p)}</div>`).join('');
}

// ── CSS comum ─────────────────────────────────────────────────────────────────
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

// ── Word (.doc) — cabeçalho/rodapé NATIVOS (mso) ─────────────────────────────
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

// ── PDF — thead/tfoot repetem; rodapé sempre no fundo; margens "coladas" ──────
export function buildPdfHtml(doc: ManualDocument): string {
  const cover = doc.pages[0];
  const content = doc.pages.slice(1);
  const css = `
    @page { size: A4; margin: 0; }
    html, body { margin: 0; padding: 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: 'Arial Narrow', Arial, sans-serif; font-size: 12pt; line-height: 18pt; color: #000; background: #fff; }
    table.sheet { width: 100%; border-collapse: collapse; }
    td.zone { padding-left: ${M_SIDE}; padding-right: ${M_SIDE}; }
    thead td.zone { padding-top: ${M_TOP}; padding-bottom: 0.15cm; }
    tfoot td.zone { padding-top: 0.15cm; padding-bottom: ${M_BOTTOM}; }
    tbody td.zone { padding-top: 0.2cm; padding-bottom: 0.2cm; }
    ${CONTENT_CSS}
    .cover { page-break-before: avoid; }
  `;
  return `<!DOCTYPE html><html lang="pt"><head><meta charset="utf-8" /><title>${escapeHtml(doc.fullTitle)}</title><style>${css}</style>
    <script>window.addEventListener('load',function(){setTimeout(function(){window.print()},450)})<\/script></head>
    <body>
      <table class="sheet">
        <thead><tr><td class="zone">${runningHeaderInner(doc)}</td></tr></thead>
        <tfoot><tr><td class="zone">${runningFooterInner(doc)}</td></tr></tfoot>
        <tbody><tr><td class="zone">
          ${coverBlock(doc, cover)}
          ${indexBlock(content)}
          ${chaptersBlocks(content)}
        </td></tr></tbody>
      </table>
    </body></html>`;
}

// ── Preview HTML — renderização idêntica ao PDF mas sem auto-print ─────────────
export function buildPreviewHtml(doc: ManualDocument): string {
  const cover = doc.pages[0];
  const content = doc.pages.slice(1);
  const css = `
    * { box-sizing: border-box; }
    body { margin: 0; padding: 16px; background: #e5e7eb; font-family: 'Arial Narrow', Arial, sans-serif; }
    .page-wrap { background: #fff; width: 21cm; min-height: 29.7cm; margin: 0 auto 24px; padding: ${M_TOP} ${M_SIDE} ${M_BOTTOM} ${M_SIDE}; box-shadow: 0 2px 12px rgba(0,0,0,.18); position: relative; display: flex; flex-direction: column; }
    .page-header { margin-bottom: 0.3cm; }
    .page-footer { margin-top: auto; padding-top: 0.3cm; }
    .page-body { flex: 1; }
    ${CONTENT_CSS}
    .chapter { page-break-before: unset; margin-top: 0.5cm; }
    @media (max-width: 800px) { .page-wrap { width: 100%; padding: 1cm 0.8cm; } }
  `;

  function wrapPage(header: string, body: string, footer: string) {
    return `<div class="page-wrap"><div class="page-header">${header}</div><div class="page-body">${body}</div><div class="page-footer">${footer}</div></div>`;
  }

  const hdr = runningHeaderInner(doc);
  const ftr = runningFooterInner(doc);

  const coverHtml = coverBlock(doc, cover);
  const idxHtml = indexBlock(content);
  const chaps = content.map((p) =>
    `<div class="chapter"><h2 class="page-title">${escapeHtml(p.title)}</h2>${p.subtitle ? `<h3 class="page-subtitle">${escapeHtml(p.subtitle)}</h3>` : ''}${p.incompleto ? `<div class="callout" style="border-color:#e65100;background:#fff3e0"><span class="callout-tag" style="color:#e65100">POR ACABAR</span><span>Este capítulo ainda não foi gerado.</span></div>` : ''}${renderCorePageBody(p)}</div>`
  );

  // capa + índice numa página, cada 2 capítulos noutra (heurística de agrupamento)
  const pages: string[] = [];
  pages.push(coverHtml + (idxHtml || ''));
  for (let i = 0; i < chaps.length; i += 2) {
    pages.push(chaps.slice(i, i + 2).join(''));
  }

  const wrapped = pages.map((b) => wrapPage(hdr, b, ftr)).join('');
  return `<!DOCTYPE html><html lang="pt"><head><meta charset="utf-8"><style>${css}</style></head><body>${wrapped}</body></html>`;
}

// ── Reorganizar — renumerar e ordenar páginas pelo índice ─────────────────────
export function reorganizarManual(doc: ManualDocument): ManualDocument {
  if (!doc.indice) return doc;
  const linhas = doc.indice.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  // extrair títulos do índice (antes de " — ")
  const titulos = linhas.map((l) => {
    const partes = l.split(' — ');
    return partes[0].replace(/^\d+\.\s*/, '').trim();
  });

  if (titulos.length === 0) return doc;

  const cover = doc.pages[0]; // capa/introdução fica sempre em [0]
  const body = doc.pages.slice(1);

  // mapear cada título do índice à página existente (por título normalizado)
  function norm(s: string) { return s.toLowerCase().replace(/[^a-z0-9]/g, ''); }

  const reordenado: ManualPage[] = titulos.map((titulo, idx) => {
    const found = body.find((p) => norm(p.title) === norm(titulo));
    if (found) return { ...found, pageNumber: idx + 2 };
    // capítulo mencionado no índice mas ainda não gerado
    return { pageNumber: idx + 2, title: titulo, incompleto: true, paragraphs: [] };
  });

  // capítulos gerados mas não no índice ficam no fim
  const usados = new Set(reordenado.map((p) => norm(p.title)));
  const extra = body
    .filter((p) => !usados.has(norm(p.title)))
    .map((p, i) => ({ ...p, pageNumber: reordenado.length + i + 2 }));

  return { ...doc, pages: [cover, ...reordenado, ...extra] };
}

// ── Download / print ──────────────────────────────────────────────────────────
function normalizeFileNamePart(value: string) { return value.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function buildManualFileName(doc: ManualDocument, ext: string) {
  return `${String(doc.unitNumber).trim()}_Guião_${normalizeFileNamePart(doc.fullTitle)}_SCP_CR.${ext}`;
}

export function downloadManualDoc(doc: ManualDocument) {
  try {
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
  } catch (err) {
    alert('Erro ao gerar Word: ' + String(err));
  }
}

export function exportManualPdf(doc: ManualDocument) {
  try {
    const html = buildPdfHtml(doc);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    // usar iframe escondido em vez de window.open (evita bloqueio de popup)
    let iframe = document.getElementById('__ecl_pdf_iframe') as HTMLIFrameElement | null;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = '__ecl_pdf_iframe';
      iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0;pointer-events:none;';
      document.body.append(iframe);
    }
    iframe.src = url;
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch (err) {
    alert('Erro ao gerar PDF: ' + String(err));
  }
}

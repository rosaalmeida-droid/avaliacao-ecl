// src/exportManualDoc.ts
// Export do Manual do Aluno — formato ECL aprovado (portado da app Retool
// "Curso De Cozinha Manual"). HTML-para-Word (.doc) com logótipo SVG,
// cabeçalho/rodapé próprios, tabelas, diálogos e folhas de trabalho.
// Acrescentei os blocos que este gerador produz a mais: callout, passos e
// consolidação. Word = download .doc; PDF = abrir + imprimir o mesmo HTML.

const brandBlue = '#1aa1af';
const courseTrackLabel = 'Serviços de Cozinha e Pastelaria';

// ── tipos (compatíveis com o DocumentoManual de ManuaisAluno.tsx) ───────────
export interface ManualIllustration { src: string; alt: string; caption: string }
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
  tables?: ManualTable[]; dialogueBlocks?: ManualDialogueBlock[]; illustrations?: ManualIllustration[];
  worksheetSections?: ManualWorksheetSection[];
  calloutBoxes?: ManualCallout[]; procedureSteps?: ManualProcedureSteps; consolidationBlock?: ManualConsolidation;
}
export interface ManualDocument {
  unitCode: string; unitNumber: number; fullTitle: string; schoolLabel: string;
  academicYear: string; footerDate: string; footerReference: string; footerRevision: string;
  pages: ManualPage[];
}

// ── logótipo SVG (igual ao Retool) ──────────────────────────────────────────
const schoolLogoSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 680">
  <g fill="${brandBlue}">
    <circle cx="113" cy="112" r="60" />
    <circle cx="295" cy="80" r="88" />
    <circle cx="485" cy="112" r="60" />
    <circle cx="80" cy="294" r="82" />
    <circle cx="296" cy="297" r="84" />
    <circle cx="516" cy="297" r="84" />
    <circle cx="113" cy="480" r="56" />
    <circle cx="296" cy="510" r="86" />
    <circle cx="485" cy="480" r="56" />
  </g>
  <g fill="${brandBlue}" font-family="Arial Narrow, Arial, sans-serif" font-weight="400" letter-spacing="0">
    <text x="622" y="151" font-size="165">ESCOLA</text>
    <text x="622" y="381" font-size="185">COMÉRCIO</text>
    <text x="622" y="592" font-size="185">LISBOA</text>
  </g>
</svg>
`.trim();
const schoolLogoDataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(schoolLogoSvg)}`;

// ── helpers ─────────────────────────────────────────────────────────────────
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
  return subsections.map((s) => `
        <div class="subsection">
          <h3>${escapeHtml(s.title)}</h3>
          ${renderParagraphs(s.paragraphs)}
          ${renderBullets(s.bullets)}
        </div>`).join('');
}
function renderTables(tables?: ManualTable[]) {
  if (!tables || !tables.length) return '';
  return tables.map((table) => `
        <div class="manual-table-wrap">
          ${table.title ? `<h3>${escapeHtml(table.title)}</h3>` : ''}
          <table class="manual-table" role="presentation">
            <thead><tr>${table.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead>
            <tbody>${table.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>
        </div>`).join('');
}
function renderDialogueBlocks(dialogueBlocks?: ManualDialogueBlock[]) {
  if (!dialogueBlocks || !dialogueBlocks.length) return '';
  return dialogueBlocks.map((block) => `
        <div class="dialogue-block">
          <h3>${escapeHtml(block.title)}</h3>
          ${block.instructions ? `<p class="dialogue-instructions">${escapeHtml(block.instructions)}</p>` : ''}
          ${block.items.map((item) => `
                <table class="dialogue-table" role="presentation">
                  <tr><th>Cliente diz</th><td>${escapeHtml(item.client)}</td></tr>
                  <tr><th>Responder</th><td>${escapeHtml(item.response)}</td></tr>
                  ${item.objective ? `<tr><th>Objetivo</th><td>${escapeHtml(item.objective)}</td></tr>` : ''}
                </table>`).join('')}
        </div>`).join('');
}
function renderIllustrations(illustrations?: ManualIllustration[]) {
  if (!illustrations || !illustrations.length) return '';
  return `
    <div class="illustrations">
      <h3>Imagens ilustrativas</h3>
      <table class="illustrations-table" role="presentation"><tr>
        ${illustrations.map((i) => `<td><img src="${escapeHtml(i.src)}" alt="${escapeHtml(i.alt)}" /><div class="caption">${escapeHtml(i.caption)}</div></td>`).join('')}
      </tr></table>
    </div>`;
}
function renderWorksheetSections(worksheetSections?: ManualWorksheetSection[]) {
  if (!worksheetSections || !worksheetSections.length) return '';
  return worksheetSections.map((section) => `
        <div class="worksheet-section">
          <h3>${escapeHtml(section.title)}</h3>
          ${section.instructions ? `<p class="worksheet-instructions">${escapeHtml(section.instructions)}</p>` : ''}
          ${section.prompts.map((prompt) => `
                <div class="worksheet-prompt">
                  <p>${escapeHtml(prompt.prompt)}</p>
                  ${Array.from({ length: prompt.lines }, () => '<div class="answer-line"></div>').join('')}
                </div>`).join('')}
        </div>`).join('');
}

// ── blocos extra deste gerador (não existiam no Retool) ─────────────────────
function renderCallouts(callouts?: ManualCallout[]) {
  if (!callouts || !callouts.length) return '';
  const tag: Record<string, string> = { definicao: 'DEFINIÇÃO', aviso: 'ATENÇÃO', dica: 'DICA', nota: 'NOTA' };
  return callouts.map((c) => `
        <div class="callout callout-${escapeHtml(c.type)}">
          <span class="callout-tag">${tag[c.type] || 'NOTA'}</span>
          <span>${escapeHtml(c.content)}</span>
        </div>`).join('');
}
function renderProcedure(ps?: ManualProcedureSteps) {
  if (!ps || !ps.steps || !ps.steps.length) return '';
  return `
    <div class="procedure">
      <h3>${escapeHtml(ps.title)}</h3>
      ${ps.intro ? `<p>${escapeHtml(ps.intro)}</p>` : ''}
      <ol>${ps.steps.map((s) => `<li><strong>${escapeHtml(s.label)}:</strong> ${escapeHtml(s.detail)}${s.warning ? `<br /><span class="warning">⚠ ${escapeHtml(s.warning)}</span>` : ''}</li>`).join('')}</ol>
    </div>`;
}
function renderConsolidation(cb?: ManualConsolidation) {
  if (!cb) return '';
  return `
    <div class="consolidation">
      <h3>${escapeHtml(cb.title || 'Consolidação')}</h3>
      ${renderBullets(cb.keyPoints)}
      ${cb.selfCheck && cb.selfCheck.length ? `<p class="selfcheck-label"><strong>Verifica se sabes:</strong></p>${renderBullets(cb.selfCheck)}` : ''}
    </div>`;
}

function renderHeader(documentData: ManualDocument) {
  const formattedTitle = formatManualUnitTitle(documentData.fullTitle);
  return `
    <table class="header-table" role="presentation">
      <tr>
        <td class="header-logo-cell">
          <img src="${schoolLogoDataUri}" alt="Escola de Comércio de Lisboa" class="logo-image" />
        </td>
        <td class="header-main-cell">
          <div class="course-name"><span>Curso Profissional de Técnico de</span><span>Cozinha e Restauração</span></div>
          <div class="course-track">${escapeHtml(courseTrackLabel)}</div>
          <div class="course-year">${escapeHtml(documentData.academicYear)}</div>
          <div class="identity-code">${escapeHtml(documentData.unitCode)}</div>
          <div class="identity-title">${escapeHtml(String(documentData.unitNumber))} - ${escapeHtml(formattedTitle)}</div>
        </td>
      </tr>
    </table>`;
}
function renderFooter(documentData: ManualDocument) {
  return `
    <table class="footer-table" role="presentation">
      <tr>
        <td class="footer-left-cell"><div>${escapeHtml(documentData.footerDate)}</div><div>${escapeHtml(documentData.footerRevision)}</div></td>
        <td class="footer-right-cell">${escapeHtml(documentData.footerReference)}</td>
      </tr>
    </table>`;
}
function renderCorePageBody(page: ManualPage) {
  return `
    ${renderParagraphs(page.paragraphs)}
    ${renderCallouts(page.calloutBoxes)}
    ${renderBullets(page.bullets)}
    ${renderSubsections(page.subsections)}
    ${renderProcedure(page.procedureSteps)}
    ${renderTables(page.tables)}
    ${renderDialogueBlocks(page.dialogueBlocks)}
    ${renderIllustrations(page.illustrations)}
    ${renderConsolidation(page.consolidationBlock)}
    ${renderWorksheetSections(page.worksheetSections)}
  `;
}
function renderFirstPage(documentData: ManualDocument, page: ManualPage) {
  return `
    <section class="page page-cover">
      ${renderHeader(documentData)}
      <div class="body body-cover">
        <div class="introduction-heading">Introdução</div>
        ${renderCorePageBody(page)}
      </div>
      ${renderFooter(documentData)}
    </section>`;
}
function renderRegularPage(documentData: ManualDocument, page: ManualPage) {
  return `
    <section class="page">
      ${renderHeader(documentData)}
      <div class="body">
        <h2 class="page-title">${escapeHtml(page.title)}</h2>
        ${page.subtitle ? `<h3 class="page-subtitle">${escapeHtml(page.subtitle)}</h3>` : ''}
        ${renderCorePageBody(page)}
      </div>
      ${renderFooter(documentData)}
    </section>`;
}
function renderPage(documentData: ManualDocument, page: ManualPage) {
  return page.pageNumber === 1 ? renderFirstPage(documentData, page) : renderRegularPage(documentData, page);
}
function normalizeFileNamePart(value: string) { return value.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function buildManualFileName(documentData: ManualDocument) {
  return `${String(documentData.unitNumber).trim()}_Guião_${normalizeFileNamePart(documentData.fullTitle)}_SCP_CR.doc`;
}

const MANUAL_CSS = `
          @page { size: A4; margin: 1.82cm 1.94cm 1.42cm 1.94cm; }
          body { margin: 0; font-family: 'Arial Narrow', Arial, sans-serif; font-size: 12pt; line-height: 18pt; color: #000000; }
          .page { page-break-after: always; }
          .page + .page { page-break-before: always; }
          .page:last-child { page-break-after: auto; }
          .header-table, .footer-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          .header-table { margin-bottom: 0.18cm; }
          .header-logo-cell { width: 4.3cm; vertical-align: top; padding-top: 0.04cm; }
          .header-main-cell { vertical-align: top; text-align: right; color: ${brandBlue}; }
          .logo-image { width: 4.83cm; height: auto; display: block; }
          .course-name, .course-track, .course-year, .identity-code, .identity-title,
          .introduction-heading, .page-title, .page-subtitle, h3 { color: ${brandBlue}; }
          .course-name { display: flex; flex-direction: column; align-items: flex-end; gap: 0.02cm; max-width: 100%; margin: 0 0 0 auto; font-family: 'Arial Narrow', Arial, sans-serif; font-size: 14pt; font-weight: 700; line-height: 1.08; text-align: right; }
          .course-track, .course-year, .identity-code, .identity-title { font-family: 'Arial Narrow', Arial, sans-serif; text-align: right; }
          .course-track { margin-top: 0.02cm; font-size: 14pt; line-height: 1.08; }
          .course-year { margin-top: 0.02cm; font-size: 14pt; line-height: 1.08; }
          .identity-code { margin-top: 0.22cm; font-size: 14pt; line-height: 1.08; font-weight: 700; }
          .identity-title { margin-top: 0.03cm; font-size: 36pt; line-height: 1.02; font-weight: 700; }
          .introduction-heading { margin: 0 0 0.18cm; font-size: 14pt; line-height: 1.08; font-weight: 700; text-align: left; }
          .body { margin-top: 0.18cm; }
          .body-cover { margin-top: 0.12cm; }
          .page-title { margin: 0 0 0.18cm; font-size: 14pt; line-height: 1.08; font-weight: 700; text-transform: uppercase; page-break-after: avoid; }
          .page-subtitle, h3 { margin: 0.3cm 0 0.16cm; font-size: 13pt; line-height: 1.08; font-weight: 700; text-align: left; page-break-after: avoid; }
          p, li, .caption { color: #000000; text-align: justify; font-family: 'Arial Narrow', Arial, sans-serif; font-size: 12pt; line-height: 18pt; }
          p { margin: 0 0 0.22cm; text-align: justify; mso-pagination: widow-orphan; }
          ul { margin: 0.06cm 0 0.32cm; padding-left: 1.2rem; }
          li { margin: 0 0 0.15cm; }
          .manual-table-wrap, .dialogue-block, .illustrations, .worksheet-section, .subsection, .worksheet-prompt, .callout, .procedure, .consolidation { page-break-inside: avoid; }
          .manual-table, .dialogue-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 0.18cm 0 0.32cm; }
          .manual-table th, .manual-table td, .dialogue-table th, .dialogue-table td { border: 1px solid #000000; padding: 0.12cm 0.14cm; vertical-align: top; color: #000000; font-family: 'Arial Narrow', Arial, sans-serif; font-size: 11pt; line-height: 1.35; text-align: left; }
          .manual-table th, .dialogue-table th { background: #dcf1f3; color: #000000; font-weight: 700; }
          .dialogue-table th { width: 3.2cm; }
          .dialogue-instructions, .worksheet-instructions { font-style: italic; }
          .illustrations-table { width: 100%; border-collapse: separate; border-spacing: 0.18cm; margin: 0.2cm 0; }
          .illustrations-table td { width: 50%; vertical-align: top; }
          .illustrations-table img { width: 100%; height: 5.3cm; object-fit: cover; border: 1px solid #000000; display: block; }
          .caption { font-size: 10pt; line-height: 1.3; margin-top: 0.15cm; }
          .answer-line { border-bottom: 1px solid #737373; height: 0.6cm; margin-top: 0.12cm; }
          .callout { border-left: 3pt solid ${brandBlue}; background: #eaf6f6; padding: 0.14cm 0.2cm; margin: 0.14cm 0; }
          .callout-tag { display: block; color: ${brandBlue}; font-weight: 700; font-size: 9pt; margin-bottom: 0.04cm; }
          .procedure { margin: 0.16cm 0 0.28cm; }
          .procedure ol { margin: 0.06cm 0 0; padding-left: 1.2rem; }
          .procedure li { margin: 0 0 0.15cm; }
          .warning { color: #b3261e; font-size: 10pt; }
          .consolidation { border: 1px solid #9dd7dc; background: #f0fbfc; padding: 0.16cm 0.2cm; margin: 0.18cm 0; }
          .footer-table { margin-top: 0.8cm; color: ${brandBlue}; font-family: Arial, sans-serif; font-size: 7pt; line-height: 1.15; }
          .footer-left-cell { vertical-align: bottom; text-align: left; }
          .footer-right-cell { vertical-align: bottom; text-align: right; }
`;

export function buildManualHtml(documentData: ManualDocument): string {
  const content = documentData.pages.map((page) => renderPage(documentData, page)).join('');
  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(documentData.fullTitle)}</title>
        <style>${MANUAL_CSS}</style>
      </head>
      <body>${content}</body>
    </html>`;
}

export function downloadManualDoc(documentData: ManualDocument) {
  const html = buildManualHtml(documentData);
  const blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = buildManualFileName(documentData);
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function exportManualPdf(documentData: ManualDocument) {
  // mesmo HTML do Word, mas limpo do namespace Office e com auto-print
  const html = buildManualHtml(documentData)
    .replace(/ xmlns:o="[^"]*" xmlns:w="[^"]*"/, '')
    .replace('<head>', `<head><script>window.addEventListener('load',function(){setTimeout(function(){window.print()},400)})<\/script>`);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) setTimeout(() => URL.revokeObjectURL(url), 8000);
  else URL.revokeObjectURL(url);
}

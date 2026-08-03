// src/components/ManuaisAluno.tsx
// Gerador de Manuais do Aluno por UC — escrito como um professor de cozinha
// explica antes da aula prática, para alunos com dificuldades. Usa o
// referencial oficial já na app como fundamento, gera página a página pela
// função /api/gerarPaginaManual (Gemini, grátis) e, se falhar, permite gerar
// numa IA externa e colar o JSON. Guarda em localStorage, exporta Word e PDF.

import React, { useState, useEffect } from 'react';
import { REFERENCIAL_811RA144, ReferencialUC } from '../referencial811RA144';
import { downloadManualDoc, exportManualPdf } from '../exportManualDoc';

// ── cores do documento (formato ECL) e do UI (roxo da app) ──────────────────
const BRAND = '#1aa1af'; // teal do manual ECL (igual ao export aprovado)
const LIGHT = '#d9f2f4';
const LINE = '#b3e0e4';
const SOFT = '#f0fbfc';
const ROXO = '#7C3AED';

const ANO_LETIVO = '2026-2027';
const SCHOOL_LABEL = 'Curso Profissional de Técnico de Cozinha e Restauração';
const FOOTER = { date: 'Data: 01 / 09 / 2016', reference: 'ECL.GPC.015.2', revision: 'Revisão: 02 / 07 / 2021' };
const FONTES = 'Le Cordon Bleu (técnica); Maria de Lurdes Modesto, "Cozinha Tradicional Portuguesa" (receitas tradicionais); José Avillez, "Combinações Improváveis" (inovação); Ferran Adrià / elBulli (inovação internacional); Manual de Cozinha da Escola de Hotelaria (Turismo de Portugal)';

const EXCLUIR = ['UC03578', 'UC03579']; // Inglês, Francês
const SERVICE_UCS = ['UC03580', 'UC03581', 'UC03582', 'UC03583', 'UC00595'];
const PRODUCT_UCS = ['UC01999', 'UC02002', 'UC02003', 'UC02004', 'UC02005', 'UC03577', 'UC03585', 'UC03586'];

// ── tipos de página (mesmo esquema do render/export) ────────────────────────
interface Callout { type: 'nota' | 'aviso' | 'dica' | 'definicao'; content: string }
interface Tabela { title?: string; columns: string[]; rows: string[][] }
interface Passos { title: string; intro?: string; steps: { label: string; detail: string; warning?: string }[] }
interface Dialogo { title: string; instructions?: string; items: { client: string; response: string; objective?: string }[] }
interface Consolidacao { title?: string; keyPoints: string[]; selfCheck?: string[] }
interface Ficha { title: string; instructions?: string; prompts: { prompt: string; lines: number }[] }
interface PaginaManual {
  pageNumber: number;
  title: string;
  subtitle?: string;
  paragraphs?: string[];
  calloutBoxes?: Callout[];
  bullets?: string[];
  subsections?: { title: string; paragraphs?: string[]; bullets?: string[] }[];
  procedureSteps?: Passos;
  tables?: Tabela[];
  dialogueBlocks?: Dialogo[];
  consolidationBlock?: Consolidacao;
  worksheetSections?: Ficha[];
}
interface DocumentoManual {
  unitCode: string;
  unitNumber: number;
  fullTitle: string;
  schoolLabel: string;
  academicYear: string;
  footerDate: string;
  footerReference: string;
  footerRevision: string;
  pages: PaginaManual[];
}

// ── UCs disponíveis (do referencial) ────────────────────────────────────────
interface UCItem { code: string; ref: ReferencialUC; kind: 'produto' | 'serviço' | 'processo' }
const UCS: UCItem[] = Object.entries(REFERENCIAL_811RA144)
  .filter(([code, r]) => !EXCLUIR.includes(code) && r.bloco !== 'fct')
  .sort((a, b) => a[1].ordemECL - b[1].ordemECL)
  .map(([code, ref]) => ({
    code,
    ref,
    kind: SERVICE_UCS.includes(code) ? 'serviço' : PRODUCT_UCS.includes(code) ? 'produto' : 'processo',
  }));

// ── utilitários ─────────────────────────────────────────────────────────────
function esc(s: any): string {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function splitCourseLines(label: string): [string, string] {
  const w = label.split(' ');
  const mid = Math.ceil(w.length / 2);
  return [w.slice(0, mid).join(' '), w.slice(mid).join(' ')];
}
function fileNameFor(doc: DocumentoManual, ext: string): string {
  const safe = doc.fullTitle.replace(/[^\w\sÀ-ÿ-]/g, '').replace(/\s+/g, '_');
  return `${doc.unitNumber}_Guiao_${safe}_SCP_CR.${ext}`;
}
function ucNumber(code: string): number {
  const m = code.match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}

// ── sequência pedagógica por tipo de UC ─────────────────────────────────────
function sequenciaPorTipo(kind: string): string {
  if (kind === 'produto')
    return 'Para esta UC de produto/confeção segue: (1) MATÉRIAS-PRIMAS — divide-as por FAMÍLIAS/grupos, fala um pouco de cada grupo e dos CASOS ESPECIAIS; (2) TÉCNICAS DE CONFEÇÃO — de forma exaustiva; (3) CONSERVAÇÃO dos produtos; (4) VERIFICAÇÃO DA FRESCURA e da qualidade; (5) HIGIENE no trabalho.';
  if (kind === 'serviço')
    return 'Para esta UC de serviço segue: (1) o espaço e a preparação (mise en place); (2) a sequência do serviço passo a passo; (3) o atendimento e a comunicação com o cliente; (4) os produtos/bebidas envolvidos; (5) higiene e segurança.';
  return 'Para esta UC de processo segue: (1) a organização e o planeamento; (2) os documentos (fichas técnicas, requisições, cronogramas); (3) a mise en place; (4) a coordenação e o controlo; (5) higiene e HACCP.';
}

// ── PROMPT-MESTRE de um manual (a app gera, a Rosa cola numa IA externa) ─────
function buildMasterPrompt(uc: UCItem): string {
  return `Vais ajudar-me a construir um MANUAL DO ALUNO para a unidade ${uc.code} — ${uc.ref.nome} (Curso Profissional de Técnico de Cozinha e Restauração). É para alunos do secundário com dificuldades de aprendizagem, muitos que nunca entraram numa cozinha.

======== REGRAS DE CONSTRUÇÃO ========
1. ÂMBITO — antes de tudo, pergunta: "O QUE É QUE O ALUNO PRODUZ EM AULA com esta UC?". A resposta define o sentido de TODOS os termos. Exemplo real: numa UC de "acepipes, sopas, entradas, ovos e massas", o aluno produz ACEPIPES, logo "massas" são as massas de base dos acepipes (folhada, quebrada, tenra, choux salgada, rissol, empada) e NÃO massas alimentícias italianas.
2. SEQUÊNCIA. ${sequenciaPorTipo(uc.kind)} As NORMAS DE SEGURANÇA (SST) aplicam-se AO LONGO do trabalho, não como capítulo isolado.
3. TRÊS EIXOS em cada capítulo, integrados no texto: CONHECIMENTO (o quê, porquê, como funciona) + APTIDÃO (como se faz na prática, passo a passo, ligado às realizações da UC, com situações reais portuguesas) + ATITUDES profissionais a demonstrar (higiene/HACCP, SST, organização, responsabilidade, rigor).
4. REFLETE A PRÁTICA da aula — nada de teoria solta. Linguagem simples, cada termo técnico explicado à primeira vez, muito CONCRETO (nomes, °C, minutos, pratos e utensílios pelo nome). Dá contexto histórico curto e a ciência simples (Maillard, osmose, coagulação — sem fórmulas) quando ajudar.
5. FONTES a referenciar quando útil: ${FONTES}. Ensina também o aluno a PROCURAR INFORMAÇÃO nestas obras.
6. CADA UC TRATA SÓ O QUE É SEU. Temas que são o foco de OUTRA UC (HACCP → UC03584; nutrição → UC00596) entram apenas como enquadramento/referência geral, não desenvolvidos.
7. FICHAS DE TRABALHO em papel, INTERATIVAS: exercícios variados e ativos — ligar colunas, ordenar passos, completar tabelas e espaços, verdadeiro/falso, e um CENÁRIO REAL — misturando aplicação prática (na cozinha/sala) com consolidação da teoria, a terminar com autoavaliação.
8. Português europeu, sem meta-referências ("neste manual", "como vimos").

======== REFERENCIAL DESTA UC (fundamenta-te aqui) ========
Realizações: ${uc.ref.realizacoes.join(' | ')}
Conhecimentos: ${uc.ref.conhecimentos.join(' | ')}
Critérios de desempenho: ${uc.ref.criteriosDesempenho.join(' | ')}

======== FORMATO (para eu colar na minha app) ========
Responde SEMPRE em JSON puro, sem markdown e sem crases. Cada capítulo é UM objeto com este esquema (usa só os campos úteis):
{ "title": "…", "subtitle"?: "…", "paragraphs"?: ["…"], "subsections"?: [{ "title":"…", "paragraphs"?:["…"], "bullets"?:["…"] }], "calloutBoxes"?: [{ "type":"nota|aviso|dica|definicao", "content":"…" }], "bullets"?: ["…"], "tables"?: [{ "title":"…", "columns":["…"], "rows":[["…","…"]] }], "procedureSteps"?: { "title":"…", "intro"?:"…", "steps":[{ "label":"…", "detail":"…", "warning"?:"…" }] }, "consolidationBlock"?: { "title":"…", "keyPoints":["…"], "selfCheck"?:["…"] }, "worksheetSections"?: [{ "title":"…", "instructions"?:"…", "prompts":[{ "prompt":"…", "lines": 3 }] }] }

======== COMO VAMOS TRABALHAR (por partes, para nunca cortar) ========
PASSO 1 — devolve APENAS o ÍNDICE: um array JSON de 8 a 14 títulos de capítulo, por ordem pedagógica (do básico ao avançado), com o ÂMBITO certo, incluindo um capítulo final "Onde procurar informação". Depois PÁRA e espera que eu reveja e corrija.
PASSO 2 — quando eu disser "capítulo N" (ou "próximo"), escreve SÓ esse capítulo, DESENVOLVIDO a fundo, como UM objeto JSON no esquema acima. Se ficar muito longo, escreve a primeira parte e termina com "continua": true; eu digo "continua" e tu segues o MESMO capítulo, sem repetir o título.
PASSO 3 — no fim, gera a SÍNTESE (com os critérios de desempenho) e as FOLHAS DE TRABALHO interativas, cada uma como um objeto JSON.

Começa agora pelo PASSO 1: devolve só o índice (array JSON de títulos), e nada mais.`;
}

// ── render do corpo de uma página (pré-visualização no ecrã) ───────────────
function renderPageBody(page: PaginaManual): string {
  let h = '';
  if (page.subtitle) h += `<h3 style="color:${BRAND};font-size:13pt;font-weight:700;margin:0.1cm 0 0.16cm;">${esc(page.subtitle)}</h3>`;
  (page.paragraphs || []).forEach((p) => (h += `<p style="margin:0 0 0.22cm;text-align:justify;">${esc(p)}</p>`));
  (page.calloutBoxes || []).forEach((c) => {
    const map: Record<string, { bg: string; tag: string }> = { definicao: { bg: SOFT, tag: 'DEFINIÇÃO' }, aviso: { bg: '#fdecea', tag: 'ATENÇÃO' }, dica: { bg: '#eef9ec', tag: 'DICA' }, nota: { bg: LIGHT, tag: 'NOTA' } };
    const m = map[c.type] || map.nota;
    h += `<table style="width:100%;border-collapse:collapse;margin:0.14cm 0;"><tr><td style="background:${m.bg};border-left:3pt solid ${BRAND};padding:0.14cm 0.2cm;font-size:11pt;"><b style="color:${BRAND};font-size:9pt;">${m.tag}</b><br/>${esc(c.content)}</td></tr></table>`;
  });
  if (page.bullets && page.bullets.length) h += `<ul style="margin:0.06cm 0 0.28cm;padding-left:1.1rem;">${page.bullets.map((b) => `<li style="margin:0 0 0.12cm;">${esc(b)}</li>`).join('')}</ul>`;
  (page.subsections || []).forEach((sub) => {
    h += `<h4 style="color:${BRAND};font-size:11.5pt;font-weight:700;margin:0.2cm 0 0.1cm;">${esc(sub.title)}</h4>`;
    (sub.paragraphs || []).forEach((p) => (h += `<p style="margin:0 0 0.18cm;text-align:justify;">${esc(p)}</p>`));
    if (sub.bullets && sub.bullets.length) h += `<ul style="margin:0.04cm 0 0.22cm;padding-left:1.1rem;">${sub.bullets.map((b) => `<li style="margin:0 0 0.1cm;">${esc(b)}</li>`).join('')}</ul>`;
  });
  if (page.procedureSteps && page.procedureSteps.steps) {
    const ps = page.procedureSteps;
    h += `<div style="margin:0.16cm 0 0.28cm;"><b style="color:${BRAND};">${esc(ps.title)}</b>`;
    if (ps.intro) h += `<p style="margin:0.06cm 0 0.12cm;">${esc(ps.intro)}</p>`;
    h += `<ol style="margin:0.06cm 0 0;padding-left:1.2rem;">${ps.steps.map((st) => `<li style="margin:0 0 0.14cm;"><b>${esc(st.label)}:</b> ${esc(st.detail)}${st.warning ? `<br/><span style="color:#b3261e;font-size:10pt;">⚠ ${esc(st.warning)}</span>` : ''}</li>`).join('')}</ol></div>`;
  }
  (page.tables || []).forEach((t) => {
    if (t.title) h += `<p style="margin:0.14cm 0 0.06cm;font-weight:700;color:${BRAND};font-size:11pt;">${esc(t.title)}</p>`;
    h += `<table style="width:100%;border-collapse:collapse;margin:0 0 0.28cm;"><tr>${(t.columns || []).map((c) => `<th style="border:1px solid #000;background:${LIGHT};font-weight:700;padding:0.1cm 0.14cm;font-size:10.5pt;text-align:left;">${esc(c)}</th>`).join('')}</tr>${(t.rows || []).map((row) => `<tr>${row.map((cell) => `<td style="border:1px solid #000;padding:0.1cm 0.14cm;font-size:10.5pt;vertical-align:top;">${esc(cell)}</td>`).join('')}</tr>`).join('')}</table>`;
  });
  (page.dialogueBlocks || []).forEach((d) => {
    h += `<div style="margin:0.14cm 0 0.28cm;"><b style="color:${BRAND};">${esc(d.title)}</b>`;
    if (d.instructions) h += `<p style="margin:0.06cm 0 0.12cm;">${esc(d.instructions)}</p>`;
    (d.items || []).forEach((it) => (h += `<table style="width:100%;border-collapse:collapse;margin:0 0 0.12cm;"><tr><td style="background:#fafafa;border-left:3pt solid #ccc;padding:0.1cm 0.16cm;font-size:10.5pt;"><b>Cliente:</b> ${esc(it.client)}<br/><b style="color:${BRAND};">Colaborador:</b> ${esc(it.response)}${it.objective ? `<br/><i style="font-size:9.5pt;color:#666;">Objetivo: ${esc(it.objective)}</i>` : ''}</td></tr></table>`));
    h += `</div>`;
  });
  if (page.consolidationBlock) {
    const cb = page.consolidationBlock;
    h += `<table style="width:100%;border-collapse:collapse;margin:0.18cm 0;"><tr><td style="background:${SOFT};border:1pt solid ${LINE};padding:0.16cm 0.2cm;"><b style="color:${BRAND};">${esc(cb.title || 'Consolidação')}</b><ul style="margin:0.08cm 0 0;padding-left:1.1rem;">${(cb.keyPoints || []).map((k) => `<li style="margin:0 0 0.08cm;">${esc(k)}</li>`).join('')}</ul>`;
    if (cb.selfCheck && cb.selfCheck.length) h += `<p style="margin:0.12cm 0 0.04cm;font-weight:700;">Verifica se sabes:</p><ul style="margin:0;padding-left:1.1rem;">${cb.selfCheck.map((sc) => `<li style="margin:0 0 0.08cm;">${esc(sc)}</li>`).join('')}</ul>`;
    h += `</td></tr></table>`;
  }
  (page.worksheetSections || []).forEach((w) => {
    h += `<div style="margin:0.16cm 0 0.28cm;"><b style="color:${BRAND};">${esc(w.title)}</b>`;
    if (w.instructions) h += `<p style="margin:0.06cm 0 0.12cm;">${esc(w.instructions)}</p>`;
    (w.prompts || []).forEach((p) => {
      h += `<p style="margin:0.1cm 0 0.04cm;">${esc(p.prompt)}</p>`;
      for (let i = 0; i < (p.lines || 2); i++) h += `<div style="border-bottom:1px solid #999;height:0.55cm;"></div>`;
    });
    h += `</div>`;
  });
  return h;
}

// ── export PDF (A4 + auto-print) ────────────────────────────────────────────
function buildPdfHtml(doc: DocumentoManual): string {
  const [l1, l2] = splitCourseLines(doc.schoolLabel);
  const cover = doc.pages[0];
  const content = doc.pages.slice(1);
  const pageStyle = "width:210mm;min-height:283mm;box-sizing:border-box;padding:1.6cm 1.9cm 1.4cm;page-break-after:always;display:flex;flex-direction:column;font-family:'Arial Narrow',Arial,sans-serif;font-size:12pt;line-height:17pt;color:#000;background:#fff;";
  const head = (isCover: boolean) => `<table style="width:100%;border-collapse:collapse;margin-bottom:0.1cm;"><tr><td style="vertical-align:top;"><div style="font-weight:700;color:${BRAND};font-size:12pt;">Escola de Comércio de Lisboa</div></td><td style="vertical-align:top;text-align:right;color:${BRAND};"><div style="font-weight:700;font-size:12pt;line-height:1.1;">${esc(l1)}</div><div style="font-weight:700;font-size:12pt;line-height:1.1;">${esc(l2)}</div><div style="font-size:11pt;">${esc(doc.academicYear)}</div>${isCover ? `<div style="font-weight:700;font-size:12pt;">${esc(doc.unitCode)}</div>` : ''}</td></tr></table>${!isCover ? `<table style="width:100%;border-collapse:collapse;border-bottom:1pt solid ${LINE};margin-bottom:0.14cm;"><tr><td style="font-size:9pt;font-weight:700;color:${BRAND};padding:0.04cm 0;">${esc(doc.unitCode)}</td><td style="font-size:9pt;color:${BRAND};text-align:right;padding:0.04cm 0;">${esc(doc.fullTitle)}</td></tr></table>` : ''}`;
  const foot = (n?: number) => `<div style="margin-top:auto;padding-top:0.2cm;border-top:1pt solid ${LINE};"><table style="width:100%;border-collapse:collapse;color:${BRAND};font-size:7pt;"><tr><td style="text-align:left;">${esc(doc.footerDate)}<br/>${esc(doc.footerRevision)}</td><td style="text-align:center;font-weight:700;font-size:9pt;">${n != null ? n : ''}</td><td style="text-align:right;">${esc(doc.footerReference)}</td></tr></table></div>`;
  let pages = '';
  if (cover) pages += `<div style="${pageStyle}">${head(true)}<div style="text-align:right;color:${BRAND};margin:0.2cm 0;"><div style="font-weight:700;font-size:32pt;line-height:1.05;">${esc(doc.unitNumber)} - ${esc(doc.fullTitle)}</div></div><h2 style="color:${BRAND};font-size:14pt;font-weight:700;margin:0 0 0.18cm;">INTRODUÇÃO</h2><div style="flex:1;">${renderPageBody(cover)}</div>${foot(1)}</div>`;
  if (content.length) {
    const entries = content.map((p) => `<div style="display:flex;align-items:flex-end;gap:0.2cm;margin-bottom:0.14cm;"><div style="font-size:11pt;">${esc(p.title)}</div><div style="flex:1;border-bottom:1pt dotted #aaa;margin-bottom:0.14cm;"></div><div style="font-size:11pt;font-weight:700;color:${BRAND};">${p.pageNumber}</div></div>`).join('');
    pages += `<div style="${pageStyle}">${head(false)}<h2 style="color:${BRAND};font-size:14pt;font-weight:700;margin:0 0 0.3cm;">ÍNDICE</h2><div style="flex:1;">${entries}</div>${foot()}</div>`;
  }
  content.forEach((p) => (pages += `<div style="${pageStyle}">${head(false)}<h2 style="color:${BRAND};font-size:14pt;font-weight:700;text-transform:uppercase;margin:0 0 0.18cm;">${esc(p.title)}</h2><div style="flex:1;">${renderPageBody(p)}</div>${foot(p.pageNumber)}</div>`));
  return `<!DOCTYPE html><html lang="pt"><head><meta charset="utf-8"/><title>${esc(doc.fullTitle)}</title><style>@page{size:A4 portrait;margin:0}*{box-sizing:border-box}body{margin:0;background:#eee}</style><script>window.addEventListener('load',function(){setTimeout(function(){window.print()},600)})<\/script></head><body>${pages}</body></html>`;
}

// ── export Word (cabeçalho/rodapé nativos) ──────────────────────────────────
function buildWordHtml(doc: DocumentoManual): string {
  const [l1, l2] = splitCourseLines(doc.schoolLabel);
  const cover = doc.pages[0];
  const content = doc.pages.slice(1);
  const header = `<div style="mso-element:header" id="h1"><table style="width:100%;border-collapse:collapse;"><tr><td style="vertical-align:top;"><div style="font-weight:700;color:${BRAND};font-size:12pt;">Escola de Comércio de Lisboa</div></td><td style="vertical-align:top;text-align:right;color:${BRAND};"><div style="font-weight:700;font-size:12pt;">${esc(l1)}</div><div style="font-weight:700;font-size:12pt;">${esc(l2)}</div><div style="font-size:11pt;">${esc(doc.academicYear)}</div><div style="font-weight:700;font-size:11pt;">${esc(doc.unitCode)}</div></td></tr></table><div style="border-bottom:1pt solid ${LINE};margin-bottom:0.1cm;"></div></div>`;
  const footer = `<div style="mso-element:footer" id="f1"><div style="border-top:1pt solid ${LINE};margin-top:0.1cm;"></div><table style="width:100%;border-collapse:collapse;color:${BRAND};font-size:7pt;margin-top:0.1cm;"><tr><td style="text-align:left;">${esc(doc.footerDate)}<br/>${esc(doc.footerRevision)}</td><td style="text-align:center;font-weight:700;font-size:9pt;"><span style="mso-field-code:&quot; PAGE &quot;">1</span></td><td style="text-align:right;">${esc(doc.footerReference)}</td></tr></table></div>`;
  const brk = '<p style="page-break-before:always;mso-break-type:page-break;margin:0;"></p>';
  let body = '';
  if (cover) body += `<div style="text-align:right;color:${BRAND};margin-bottom:0.3cm;"><div style="font-weight:700;font-size:32pt;">${esc(doc.unitNumber)} - ${esc(doc.fullTitle)}</div></div><h2 style="color:${BRAND};font-size:14pt;font-weight:700;margin:0 0 0.18cm;">Introdução</h2>${renderPageBody(cover)}`;
  if (content.length) {
    body += brk + `<h2 style="color:${BRAND};font-size:14pt;font-weight:700;margin:0 0 0.3cm;">ÍNDICE</h2>`;
    body += content.map((p) => `<table style="width:100%;border-collapse:collapse;"><tr><td style="border:none;font-size:11pt;padding:0.08cm 0;width:75%;">${esc(p.title)}</td><td style="border:none;border-bottom:1pt dotted #999;"></td><td style="border:none;font-size:11pt;font-weight:700;color:${BRAND};text-align:right;">${p.pageNumber}</td></tr></table>`).join('');
  }
  content.forEach((p) => (body += brk + `<h2 style="color:${BRAND};font-size:14pt;font-weight:700;text-transform:uppercase;margin:0 0 0.18cm;">${esc(p.title)}</h2>${renderPageBody(p)}`));
  const css = `@page{size:21cm 29.7cm;margin:1.8cm 1.9cm 1.4cm;mso-header:h1;mso-footer:f1;mso-header-margin:1.2cm;mso-footer-margin:1cm}body{font-family:'Arial Narrow',Arial,sans-serif;font-size:12pt;line-height:17pt;color:#000}p{margin:0 0 0.22cm;text-align:justify}h2,h3,h4{color:${BRAND}}table{border-collapse:collapse}`;
  return `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset="utf-8"/><title>${esc(doc.fullTitle)}</title><!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]--><style>${css}</style></head><body>${header}${footer}${body}</body></html>`;
}

function downloadBlob(html: string, filename: string, mime: string) {
  const blob = new Blob([html], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// ── localStorage ────────────────────────────────────────────────────────────
const KEY = (code: string) => `ecl_manual_aluno_${code}`;
function listSaved(): { code: string; title: string; pages: number }[] {
  const out: { code: string; title: string; pages: number }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('ecl_manual_aluno_')) {
      try { const d = JSON.parse(localStorage.getItem(k) || '') as DocumentoManual; out.push({ code: d.unitCode, title: d.fullTitle, pages: d.pages.length }); } catch { /* */ }
    }
  }
  return out.sort((a, b) => a.code.localeCompare(b.code));
}

// ── parse tolerante (JSON cortado) ──────────────────────────────────────────
function tryParse(clean: string): any {
  try { return JSON.parse(clean); } catch { /* */ }
  let s = clean.replace(/```json/g, '').replace(/```/g, '').trim();
  const i = s.indexOf('{'); const j = s.lastIndexOf('}');
  if (i >= 0) s = s.slice(i, j > i ? j + 1 : undefined);
  try { return JSON.parse(s); } catch { /* */ }
  const stack: string[] = []; let inStr = false, e = false;
  for (const c of s) { if (inStr) { if (e) e = false; else if (c === '\\') e = true; else if (c === '"') inStr = false; continue; } if (c === '"') inStr = true; else if (c === '{') stack.push('}'); else if (c === '[') stack.push(']'); else if (c === '}' || c === ']') stack.pop(); }
  s = s.replace(/[\s,]*$/, ''); while (stack.length) s += stack.pop();
  return JSON.parse(s);
}

// ════════════════════════════════════════════════════════════════════════════
export function ManuaisAluno({ nomeProfessor: _nome }: { nomeProfessor?: string }) {
  const [modo, setModo] = useState<'lista' | 'gerar' | 'ver'>('lista');
  const [lista, setLista] = useState(listSaved());
  const [selCode, setSelCode] = useState(UCS[0]?.code || '');
  const [doc, setDoc] = useState<DocumentoManual | null>(null);
  const [colarTxt, setColarTxt] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => { setLista(listSaved()); }, [modo]);

  function novoDoc(uc: UCItem): DocumentoManual {
    return { unitCode: uc.code, unitNumber: ucNumber(uc.code), fullTitle: uc.ref.nome, schoolLabel: SCHOOL_LABEL, academicYear: ANO_LETIVO, footerDate: FOOTER.date, footerReference: FOOTER.reference, footerRevision: FOOTER.revision, pages: [] };
  }

  function copiarMestre() {
    const uc = UCS.find((u) => u.code === selCode); if (!uc) return;
    const txt = buildMasterPrompt(uc);
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(txt).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 2500); }).catch(() => {});
    else { setColarTxt(txt); }
  }

  function adicionar() {
    const uc = UCS.find((u) => u.code === selCode); if (!uc) return;
    let parsed: any;
    try { parsed = tryParse(colarTxt); } catch (e: any) { setLogs((l) => [...l, '✗ JSON inválido: ' + e.message]); return; }
    let arr: any[] = Array.isArray(parsed) ? parsed : (parsed.pages || parsed.paginas || [parsed]);
    // ignorar um índice (array de strings) colado por engano
    if (arr.length && typeof arr[0] === 'string') { setLogs((l) => [...l, 'ℹ Isto parece o ÍNDICE (lista de títulos). Cola antes um CAPÍTULO (objeto JSON com "title" e conteúdo).']); return; }
    arr = arr.filter((p) => p && typeof p === 'object' && (p.title || p.paragraphs || p.worksheetSections || p.subsections));
    if (!arr.length) { setLogs((l) => [...l, '✗ Não encontrei capítulos no que colaste.']); return; }
    const d = doc && doc.unitCode === uc.code ? { ...doc, pages: [...doc.pages] } : novoDoc(uc);
    arr.forEach((p) => d.pages.push(p as PaginaManual));
    d.pages.forEach((p, idx) => (p.pageNumber = idx === 0 ? 1 : idx + 1));
    setDoc(d); setColarTxt(''); setSaved(false);
    setLogs((l) => [...l, `✓ Juntei ${arr.length} — o manual tem agora ${d.pages.length} página(s).`]);
  }

  function guardar() {
    if (!doc || doc.pages.length === 0) return;
    try { localStorage.setItem(KEY(doc.unitCode), JSON.stringify(doc)); setSaved(true); setLista(listSaved()); setLogs((l) => [...l, '💾 Guardado em Manuais Guardados.']); }
    catch (e: any) { setLogs((l) => [...l, '✗ Falha ao guardar: ' + e.message]); }
  }
  function abrir(code: string) { try { const d = JSON.parse(localStorage.getItem(KEY(code)) || '') as DocumentoManual; setDoc(d); setSaved(true); setModo('ver'); } catch { /* */ } }
  function apagar(code: string) { localStorage.removeItem(KEY(code)); setLista(listSaved()); }

  const btn = (bg: string, color = '#fff'): React.CSSProperties => ({ padding: '9px 15px', borderRadius: 8, border: 'none', background: bg, color, fontWeight: 600, fontSize: 13, cursor: 'pointer' });
  const ghost: React.CSSProperties = { padding: '8px 14px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' };
  const uc = UCS.find((u) => u.code === selCode);
  const passo: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'baseline', margin: '0 0 6px' };
  const num: React.CSSProperties = { flex: '0 0 auto', width: 20, height: 20, borderRadius: 10, background: ROXO, color: '#fff', fontSize: 12, fontWeight: 700, textAlign: 'center', lineHeight: '20px' };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '8px 4px', fontFamily: "'Inter', system-ui, sans-serif", color: '#1f2937' }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {(['lista', 'gerar'] as const).map((m) => (
          <button key={m} onClick={() => setModo(m)} style={{ ...ghost, background: modo === m ? '#f3f0fd' : '#fff', color: modo === m ? ROXO : '#6b7280', borderColor: modo === m ? ROXO : '#e5e7eb' }}>
            {m === 'lista' ? 'Manuais Guardados' : 'Criar Manual'}
          </button>
        ))}
        {doc && <button onClick={() => setModo('ver')} style={{ ...ghost, background: modo === 'ver' ? '#f3f0fd' : '#fff', color: modo === 'ver' ? ROXO : '#6b7280', borderColor: modo === 'ver' ? ROXO : '#e5e7eb' }}>Ver / Exportar</button>}
      </div>

      {modo === 'lista' && (
        <div>
          <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>Os manuais ficam guardados neste navegador. Para um ficheiro que possas enviar ou imprimir, abre um manual e usa Exportar Word ou PDF.</p>
          {lista.length === 0 ? <p style={{ color: '#6b7280' }}>Ainda não há manuais. Vai a <b>Criar Manual</b>.</p> : (
            <div style={{ border: '1px solid #eee', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
              {lista.map((m) => (
                <div key={m.code} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid #f1f1f1' }}>
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => abrir(m.code)}>
                    <div style={{ fontWeight: 600 }}><span style={{ color: ROXO }}>{m.code}</span> — {m.title}</div>
                    <div style={{ fontSize: 12, color: m.pages === 0 ? '#dc2626' : '#6b7280' }}>{m.pages === 0 ? '⚠ 0 páginas' : `${m.pages} páginas`}</div>
                  </div>
                  <button style={ghost} onClick={() => abrir(m.code)}>Abrir</button>
                  <button style={{ ...ghost, color: '#dc2626' }} onClick={() => apagar(m.code)}>Apagar</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {modo === 'gerar' && (
        <div>
          <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: 16, marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Unidade de competência</label>
            <select value={selCode} onChange={(e) => setSelCode(e.target.value)} style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, marginBottom: 12 }}>
              {UCS.map((u) => <option key={u.code} value={u.code}>{u.code} — {u.ref.nome}</option>)}
            </select>

            <div style={{ background: '#f8f7ff', border: '1px solid #ece9fd', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
              <div style={passo}><span style={num}>1</span><span style={{ fontSize: 13 }}><b>Copia o prompt-mestre</b> e cola-o na tua IA (Gemini, ChatGPT ou Claude). Ela devolve primeiro o <b>índice</b> — revê e corrige o âmbito.</span></div>
              <div style={passo}><span style={num}>2</span><span style={{ fontSize: 13 }}>Pede os capítulos <b>um a um</b> ("capítulo 1", "próximo", "continua"). A IA responde em JSON.</span></div>
              <div style={passo}><span style={num}>3</span><span style={{ fontSize: 13 }}>Cola cada capítulo (JSON) no campo abaixo e clica <b>Juntar ao manual</b>. No fim, exporta em Word/PDF.</span></div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button style={btn(ROXO)} onClick={copiarMestre}>{copiado ? 'Copiado ✓' : 'Copiar prompt-mestre'}</button>
              {doc && doc.pages.length > 0 && <>
                <button style={ghost} onClick={() => setModo('ver')}>Ver ({doc.pages.length})</button>
                <button style={btn(ROXO)} onClick={guardar}>Guardar</button>
              </>}
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Colar capítulo (JSON) devolvido pela IA</label>
              <textarea value={colarTxt} onChange={(e) => setColarTxt(e.target.value)} placeholder='Cola aqui um capítulo, por exemplo: { "title": "…", "paragraphs": ["…"] }' style={{ width: '100%', height: 140, borderRadius: 8, border: '1px solid #d1d5db', padding: 10, fontSize: 12, fontFamily: 'monospace' }} />
              <button style={btn(ROXO)} onClick={adicionar}>Juntar ao manual</button>
            </div>
            {saved && <p style={{ fontSize: 12, color: '#0a7d2c', marginTop: 8 }}>✓ Guardado em Manuais Guardados.</p>}
          </div>

          {logs.length > 0 && <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: 10, maxHeight: 240, overflow: 'auto', fontSize: 12, fontFamily: 'monospace' }}>{logs.map((l, i) => <div key={i} style={{ color: l.startsWith('✗') ? '#dc2626' : l.startsWith('ℹ') ? '#b45309' : '#374151', padding: '1px 0' }}>{l}</div>)}</div>}
        </div>
      )}

      {modo === 'ver' && doc && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <h2 style={{ flex: 1, fontSize: 18, fontWeight: 700, margin: 0 }}>{doc.unitCode} — {doc.fullTitle}</h2>
            <button style={ghost} onClick={() => exportManualPdf(doc as any)}>Exportar PDF</button>
            <button style={ghost} onClick={() => downloadManualDoc(doc as any)}>Exportar Word</button>
            <button style={btn(ROXO)} onClick={guardar}>{saved ? 'Guardar (atualizar)' : 'Guardar'}</button>
          </div>
          <p style={{ fontSize: 12, color: saved ? '#0a7d2c' : '#6b7280', marginBottom: 14 }}>{saved ? '✓ Em Manuais Guardados. Exporta em Word/PDF para um ficheiro.' : 'Ainda não guardado. Clica Guardar, ou exporta em Word/PDF.'}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {doc.pages.map((page, idx) => {
              const isCover = idx === 0;
              const body = (isCover ? `<h2 style="color:${BRAND};font-size:14pt;font-weight:700;margin:0 0 0.18cm;">INTRODUÇÃO</h2>` : `<h2 style="color:${BRAND};font-size:14pt;font-weight:700;text-transform:uppercase;margin:0 0 0.18cm;">${esc(page.title)}</h2>`) + renderPageBody(page);
              return (
                <div key={idx} style={{ background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #eee', borderRadius: 6, maxWidth: 820, margin: '0 auto', width: '100%' }}>
                  <div style={{ padding: '26px 32px', fontFamily: "'Arial Narrow', Arial, sans-serif", fontSize: 13, lineHeight: 1.5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${LINE}`, paddingBottom: 6, marginBottom: 12, color: BRAND }}>
                      <b>Escola de Comércio de Lisboa</b><span style={{ textAlign: 'right' }}>{doc.unitCode} · {doc.academicYear}</span>
                    </div>
                    {isCover && <div style={{ textAlign: 'right', color: BRAND, margin: '6px 0 14px' }}><div style={{ fontWeight: 700, fontSize: 28, lineHeight: 1.05 }}>{doc.unitNumber} - {doc.fullTitle}</div></div>}
                    <div dangerouslySetInnerHTML={{ __html: body }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${LINE}`, marginTop: 16, paddingTop: 6, color: BRAND, fontSize: 9 }}>
                      <span>{doc.footerReference}</span><b>{page.pageNumber}</b><span>{doc.footerRevision}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default ManuaisAluno;

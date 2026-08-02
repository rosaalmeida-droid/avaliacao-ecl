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

// ── sequência de tópicos a partir do referencial oficial ────────────────────
function buildTopics(uc: UCItem): { topic: string; isIntro: boolean; isWs: boolean }[] {
  const t: { topic: string; isIntro: boolean; isWs: boolean }[] = [];
  t.push({ topic: `Introdução: apresentar a UC "${uc.ref.nome}", para que serve e o que o aluno vai aprender`, isIntro: true, isWs: false });
  // Um capítulo por conhecimento, pela ORDEM EXATA do referencial (evita dispersão/repetição).
  // As realizações (aptidões) e as atitudes são aplicadas DENTRO de cada capítulo, não em páginas soltas.
  uc.ref.conhecimentos.forEach((c, i) => t.push({ topic: `Capítulo ${i + 1}: ${c}`, isIntro: false, isWs: false }));
  t.push({ topic: 'Síntese e critérios de desempenho: como saber se o trabalho está bem feito', isIntro: false, isWs: false });
  t.push({ topic: 'Folha de trabalho 1: exercício prático de aplicação dos conteúdos da UC', isIntro: false, isWs: true });
  t.push({ topic: 'Folha de trabalho 2: exercício de revisão e autoavaliação', isIntro: false, isWs: true });
  return t;
}

// ── prompt de uma página (grounded no referencial) ──────────────────────────
function buildPagePrompt(uc: UCItem, topic: string, covered: string[], tight: boolean, isIntro: boolean, isWs: boolean): string {
  const productLine =
    uc.kind === 'produto'
      ? 'PRODUTO: se o capítulo trata um alimento, diz SEMPRE quais as variedades pelo nome (portuguesas e internacionais), como se reconhecem, limpam e cortam, e receitas concretas onde se aplicam. Nunca "vários tipos".'
      : `Esta UC é de ${uc.kind}, não de produto — não cries listas de variedades de alimentos nem de receitas; foca-te no ${uc.kind} concreto.`;
  const wsField = isWs ? ', "worksheetSections"?: [{ "title": string, "instructions"?: string, "prompts": [{ "prompt": string, "lines": number }] }]' : '';
  const dlgField = uc.kind === 'serviço' ? ', "dialogueBlocks"?: [{ "title": string, "instructions"?: string, "items": [{ "client": string, "response": string, "objective"?: string }] }]' : '';
  const indice = uc.ref.conhecimentos.map((c, i) => `${i + 1}. ${c}`).join('\n');

  return `Produz APENAS um objeto JSON válido (sem markdown, sem crases, sem texto antes ou depois).

És um professor de cozinha e restauração com 20 anos de experiência, a escrever um MANUAL DO ALUNO para alunos do secundário com dificuldades de aprendizagem, muitos que nunca entraram numa cozinha. Escreve UM capítulo (uma página bem desenvolvida) sobre o tema indicado.

UC: ${uc.code} — ${uc.ref.nome} (tipo: ${uc.kind})

ÍNDICE DA UC (os conhecimentos do referencial, POR ORDEM — cada um é um capítulo do manual):
${indice}

REALIZAÇÕES DA UC (o que o aluno tem de saber FAZER — usa-as para mostrar a APTIDÃO em ação):
${uc.ref.realizacoes.join(' | ')}

CRITÉRIOS DE DESEMPENHO (o padrão de "bem feito"):
${uc.ref.criteriosDesempenho.join(' | ')}

CAPÍTULO A ESCREVER AGORA (trata SÓ isto):
${topic}

JÁ ESCRITO (não repetir, não voltar a estes temas de nenhum ângulo):
${covered.length ? covered.map((c) => '- ' + c).join('\n') : '(nenhum)'}

REGRA DE SEQUÊNCIA (evita dispersão e repetição):
- Escreve apenas o capítulo acima. NÃO adiantes conteúdos dos capítulos seguintes do índice; NÃO repitas os anteriores.
- Se um assunto pertence a outro capítulo do índice, deixa-o para lá (no máximo uma frase de ligação, sem o desenvolver aqui).

DESENVOLVE O CAPÍTULO NOS TRÊS EIXOS, integrados no texto (não como rótulos soltos):
1. CONHECIMENTO — explica o tema a fundo: o que é, porque existe/serve, como funciona. Vários parágrafos desenvolvidos.
2. APTIDÃO (aplicação) — mostra como esse saber vira técnica/gesto na cozinha ou na sala: o passo a passo do que o aluno faz, ligado às realizações da UC, com situações reais de estabelecimentos portugueses.
3. ATITUDES — refere as atitudes profissionais a demonstrar neste trabalho (higiene e HACCP, segurança/SST, organização e mise en place, responsabilidade, autonomia, trabalho em equipa, rigor, sustentabilidade) — só as que fazem sentido aqui, ligadas ao gesto concreto.

ESTILO:
- Linguagem simples e clara, mas desenvolvida. Cada termo técnico é explicado à primeira vez que aparece.
- CONCRETO: nomes, graus (°C), minutos, pratos e utensílios pelo nome. Proibido "existem vários tipos", "deve ter cuidado" ou "é importante" sem dizer o quê.
- ${productLine}
- Quando fizer sentido, dá o contexto histórico curto (origem da técnica/produto) e a ciência simples (Maillard, osmose, coagulação, gelatinização — sem fórmulas).
- Português europeu. Sem meta-referências ("neste manual", "como vimos").

DESENVOLVIMENTO (capítulos ricos):
- Usa vários parágrafos e organiza em subsecções (subsections) quando o tema tem partes.
- Inclui PELO MENOS UMA tabela de referência quando a informação é comparativa ou de listagem, e PELO MENOS UM exemplo real concreto.
- Usa procedureSteps para as sequências de "como fazer" e callouts para definições, avisos e dicas.
${isIntro ? '- Esta é a INTRODUÇÃO: apresenta a UC, para que serve, o que o aluno vai aprender e como o manual está organizado (segue o índice). Título = "Introdução".' : ''}
${isWs ? '- Esta é uma FOLHA DE TRABALHO: usa worksheetSections com perguntas claras, incluindo de aplicação prática, e espaço de resposta (lines).' : ''}
${tight ? '- Mantém o capítulo desenvolvido, mas um pouco mais compacto (a resposta anterior ficou demasiado longa para caber).' : ''}

Devolve este objeto (usa os campos que enriquecem o capítulo):
{ "title": string, "subtitle"?: string, "paragraphs"?: string[], "subsections"?: [{ "title": string, "paragraphs"?: string[], "bullets"?: string[] }], "calloutBoxes"?: [{ "type": "nota"|"aviso"|"dica"|"definicao", "content": string }], "bullets"?: string[], "tables"?: [{ "title": string, "columns": string[], "rows": string[][] }], "procedureSteps"?: { "title": string, "intro"?: string, "steps": [{ "label": string, "detail": string, "warning"?: string }] }${dlgField}, "consolidationBlock"?: { "title": string, "keyPoints": string[], "selfCheck"?: string[] }${wsField} }`;
}

// ── render do corpo de uma página (ecrã + Word + PDF) ────────────────────────
function renderPageBody(page: PaginaManual): string {
  let h = '';
  if (page.subtitle) h += `<h3 style="color:${BRAND};font-size:13pt;font-weight:700;margin:0.1cm 0 0.16cm;">${esc(page.subtitle)}</h3>`;
  (page.paragraphs || []).forEach((p) => (h += `<p style="margin:0 0 0.22cm;text-align:justify;">${esc(p)}</p>`));
  (page.calloutBoxes || []).forEach((c) => {
    const map: Record<string, { bg: string; tag: string }> = {
      definicao: { bg: SOFT, tag: 'DEFINIÇÃO' }, aviso: { bg: '#fdecea', tag: 'ATENÇÃO' },
      dica: { bg: '#eef9ec', tag: 'DICA' }, nota: { bg: LIGHT, tag: 'NOTA' },
    };
    const m = map[c.type] || map.nota;
    h += `<table style="width:100%;border-collapse:collapse;margin:0.14cm 0;"><tr><td style="background:${m.bg};border-left:3pt solid ${BRAND};padding:0.14cm 0.2cm;font-size:11pt;"><b style="color:${BRAND};font-size:9pt;">${m.tag}</b><br/>${esc(c.content)}</td></tr></table>`;
  });
  if (page.bullets && page.bullets.length) h += `<ul style="margin:0.06cm 0 0.28cm;padding-left:1.1rem;">${page.bullets.map((b) => `<li style="margin:0 0 0.12cm;">${esc(b)}</li>`).join('')}</ul>`;
  (page.subsections || []).forEach((s) => {
    h += `<h4 style="color:${BRAND};font-size:11.5pt;font-weight:700;margin:0.2cm 0 0.1cm;">${esc(s.title)}</h4>`;
    (s.paragraphs || []).forEach((p) => (h += `<p style="margin:0 0 0.18cm;text-align:justify;">${esc(p)}</p>`));
    if (s.bullets && s.bullets.length) h += `<ul style="margin:0.04cm 0 0.22cm;padding-left:1.1rem;">${s.bullets.map((b) => `<li style="margin:0 0 0.1cm;">${esc(b)}</li>`).join('')}</ul>`;
  });
  if (page.procedureSteps && page.procedureSteps.steps) {
    const ps = page.procedureSteps;
    h += `<div style="margin:0.16cm 0 0.28cm;"><b style="color:${BRAND};">${esc(ps.title)}</b>`;
    if (ps.intro) h += `<p style="margin:0.06cm 0 0.12cm;">${esc(ps.intro)}</p>`;
    h += `<ol style="margin:0.06cm 0 0;padding-left:1.2rem;">${ps.steps.map((st) => `<li style="margin:0 0 0.14cm;"><b>${esc(st.label)}:</b> ${esc(st.detail)}${st.warning ? `<br/><span style="color:#b3261e;font-size:10pt;">⚠ ${esc(st.warning)}</span>` : ''}</li>`).join('')}</ol></div>`;
  }
  (page.tables || []).forEach((t) => {
    if (t.title) h += `<p style="margin:0.14cm 0 0.06cm;font-weight:700;color:${BRAND};font-size:11pt;">${esc(t.title)}</p>`;
    h += `<table style="width:100%;border-collapse:collapse;margin:0 0 0.28cm;"><tr>${(t.columns || []).map((c) => `<th style="border:1px solid #000;background:${LIGHT};font-weight:700;padding:0.1cm 0.14cm;font-size:10.5pt;text-align:left;">${esc(c)}</th>`).join('')}</tr>`;
    (t.rows || []).forEach((row) => (h += `<tr>${row.map((cell) => `<td style="border:1px solid #000;padding:0.1cm 0.14cm;font-size:10.5pt;vertical-align:top;">${esc(cell)}</td>`).join('')}</tr>`));
    h += `</table>`;
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
    if (cb.selfCheck && cb.selfCheck.length) h += `<p style="margin:0.12cm 0 0.04cm;font-weight:700;">Verifica se sabes:</p><ul style="margin:0;padding-left:1.1rem;">${cb.selfCheck.map((s) => `<li style="margin:0 0 0.08cm;">${esc(s)}</li>`).join('')}</ul>`;
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
  const [gerando, setGerando] = useState(false);
  const [prog, setProg] = useState({ done: 0, total: 0 });
  const [logs, setLogs] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [pararFlag, setPararFlag] = useState(false);
  const [colarAberto, setColarAberto] = useState(false);
  const [colarTxt, setColarTxt] = useState('');
  let parar = false;

  useEffect(() => { setLista(listSaved()); }, [modo]);

  function novoDoc(uc: UCItem): DocumentoManual {
    return { unitCode: uc.code, unitNumber: ucNumber(uc.code), fullTitle: uc.ref.nome, schoolLabel: SCHOOL_LABEL, academicYear: ANO_LETIVO, footerDate: FOOTER.date, footerReference: FOOTER.reference, footerRevision: FOOTER.revision, pages: [] };
  }

  async function gerar() {
    const uc = UCS.find((u) => u.code === selCode);
    if (!uc) return;
    parar = false; setPararFlag(false); setGerando(true); setSaved(false); setLogs([]); setModo('gerar');
    const tasks = buildTopics(uc);
    setProg({ done: 0, total: tasks.length });
    const d = novoDoc(uc); const covered: string[] = [];
    for (let i = 0; i < tasks.length; i++) {
      if (parar) { setLogs((l) => [...l, '⏹ Parado.']); break; }
      const task = tasks[i]; let ok = false; let motivo = '';
      for (let att = 0; att < 2 && !ok; att++) {
        try {
          const prompt = buildPagePrompt(uc, task.topic, covered, att === 1, task.isIntro, task.isWs);
          const res = await fetch('/api/gerarPaginaManual', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
          const data = await res.json();
          if (!data.ok) { motivo = data.motivo || 'erro'; if (motivo === 'limite_atingido' || motivo === 'sem_chave') { att = 99; } throw new Error(data.mensagem || motivo); }
          const page: PaginaManual = data.pagina;
          page.pageNumber = i === 0 ? 1 : d.pages.length + 1;
          if (task.isIntro && !page.title) page.title = 'Introdução';
          d.pages.push(page);
          covered.push(page.title + (page.subtitle ? ' / ' + page.subtitle : ''));
          setDoc({ ...d }); setLogs((l) => [...l, `✓ Pág. ${page.pageNumber}: ${page.title}`]); ok = true;
        } catch (e: any) { if (att >= 1 || motivo === 'limite_atingido' || motivo === 'sem_chave') setLogs((l) => [...l, `✗ ${task.topic.slice(0, 50)}… (${e.message})`]); }
      }
      setProg({ done: i + 1, total: tasks.length });
      if (motivo === 'limite_atingido' || motivo === 'sem_chave') {
        setLogs((l) => [...l, motivo === 'sem_chave' ? '— Falta configurar GEMINI_API_KEY na Vercel. Podes gerar noutra IA e colar o JSON (botão abaixo).' : '— Limite grátis da Gemini atingido. Tenta mais tarde, ou gera noutra IA e cola o JSON.']);
        break;
      }
    }
    setGerando(false);
    if (d.pages.length > 0) { setDoc({ ...d }); setLogs((l) => [...l, `— ${d.pages.length} páginas. Podes guardar.`]); }
  }

  function guardar() {
    if (!doc || doc.pages.length === 0) return;
    try { localStorage.setItem(KEY(doc.unitCode), JSON.stringify(doc)); setSaved(true); setLista(listSaved()); setLogs((l) => [...l, '💾 Guardado.']); }
    catch (e: any) { setLogs((l) => [...l, '✗ Falha ao guardar: ' + e.message]); }
  }
  function abrir(code: string) { try { const d = JSON.parse(localStorage.getItem(KEY(code)) || '') as DocumentoManual; setDoc(d); setSaved(true); setModo('ver'); } catch { /* */ } }
  function apagar(code: string) { localStorage.removeItem(KEY(code)); setLista(listSaved()); }

  function copiarPromptUC() {
    const uc = UCS.find((u) => u.code === selCode); if (!uc) return;
    const tasks = buildTopics(uc);
    const p = `Vais escrever um MANUAL DO ALUNO completo para a UC ${uc.code} — ${uc.ref.nome}.\n\n` +
      buildPagePrompt(uc, '(ver lista de tópicos abaixo)', [], false, false, false).split('TÓPICO DESTA PÁGINA')[0] +
      `\nESCREVE UMA PÁGINA POR CADA TÓPICO, POR ORDEM:\n${tasks.map((t, i) => `${i + 1}. ${t.topic}`).join('\n')}\n\n` +
      `Devolve um ARRAY JSON de páginas, cada uma no formato { "title", "paragraphs"?, "calloutBoxes"?, "bullets"?, "tables"?, "procedureSteps"?, "consolidationBlock"?, "worksheetSections"? }. Depois cola o array aqui na app em "Colar páginas (JSON)".`;
    navigator.clipboard?.writeText(p).catch(() => {});
    setLogs((l) => [...l, '📋 Prompt do manual completo copiado — cola numa IA externa (Gemini/ChatGPT/Claude).']);
  }

  function importarColado() {
    const uc = UCS.find((u) => u.code === selCode); if (!uc) return;
    try {
      const parsed = tryParse(colarTxt);
      const arr: PaginaManual[] = Array.isArray(parsed) ? parsed : (parsed.pages || parsed.paginas || [parsed]);
      const d = doc && doc.unitCode === uc.code ? { ...doc } : novoDoc(uc);
      arr.forEach((p) => { p.pageNumber = d.pages.length + (d.pages.length === 0 ? 1 : 1); if (d.pages.length === 0) p.pageNumber = 1; d.pages.push(p); });
      d.pages.forEach((p, idx) => (p.pageNumber = idx === 0 ? 1 : idx + 1));
      setDoc(d); setColarAberto(false); setColarTxt(''); setModo('ver'); setSaved(false);
    } catch (e: any) { alert('JSON inválido: ' + e.message); }
  }

  const btn = (bg: string, color = '#fff'): React.CSSProperties => ({ padding: '8px 14px', borderRadius: 8, border: 'none', background: bg, color, fontWeight: 600, fontSize: 13, cursor: 'pointer' });
  const ghost: React.CSSProperties = { padding: '8px 14px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' };
  const uc = UCS.find((u) => u.code === selCode);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '8px 4px', fontFamily: "'Inter', system-ui, sans-serif", color: '#1f2937' }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {(['lista', 'gerar'] as const).map((m) => (
          <button key={m} onClick={() => setModo(m)} style={{ ...ghost, background: modo === m ? '#f3f0fd' : '#fff', color: modo === m ? ROXO : '#6b7280', borderColor: modo === m ? ROXO : '#e5e7eb' }}>
            {m === 'lista' ? 'Manuais Guardados' : 'Gerar Manual'}
          </button>
        ))}
        {doc && <button onClick={() => setModo('ver')} style={{ ...ghost, background: modo === 'ver' ? '#f3f0fd' : '#fff', color: modo === 'ver' ? ROXO : '#6b7280', borderColor: modo === 'ver' ? ROXO : '#e5e7eb' }}>Ver / Exportar</button>}
      </div>

      {/* LISTA */}
      {modo === 'lista' && (
        <div>
          <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>Os manuais ficam guardados neste navegador (localStorage). Para um ficheiro que possas enviar ou imprimir, abre um manual e usa Exportar Word ou PDF.</p>
          {lista.length === 0 ? <p style={{ color: '#6b7280' }}>Ainda não há manuais. Vai a <b>Gerar Manual</b>.</p> : (
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

      {/* GERAR */}
      {modo === 'gerar' && (
        <div>
          <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: 16, marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Unidade de competência</label>
            <select value={selCode} onChange={(e) => setSelCode(e.target.value)} disabled={gerando} style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, marginBottom: 8 }}>
              {UCS.map((u) => <option key={u.code} value={u.code}>{u.code} — {u.ref.nome}</option>)}
            </select>
            {uc && <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 10px' }}>{buildTopics(uc).length} páginas · tipo: {uc.kind} · gera pela Gemini (deixa a aba aberta).</p>}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {!gerando ? <button style={btn(ROXO)} onClick={gerar}>Iniciar geração</button> : <button style={btn('#dc2626')} onClick={() => { parar = true; setPararFlag(true); }}>Parar</button>}
              {doc && doc.pages.length > 0 && <>
                <button style={ghost} disabled={gerando} onClick={() => setModo('ver')}>Ver ({doc.pages.length})</button>
                <button style={btn(ROXO)} disabled={gerando} onClick={guardar}>Guardar {doc.pages.length} páginas</button>
              </>}
              <button style={ghost} disabled={gerando} onClick={copiarPromptUC}>Copiar prompt (IA externa)</button>
              <button style={ghost} disabled={gerando} onClick={() => setColarAberto(!colarAberto)}>Colar páginas (JSON)</button>
            </div>
            {saved && <p style={{ fontSize: 12, color: '#0a7d2c', marginTop: 8 }}>✓ Guardado em Manuais Guardados.</p>}
            {colarAberto && (
              <div style={{ marginTop: 10 }}>
                <textarea value={colarTxt} onChange={(e) => setColarTxt(e.target.value)} placeholder="Cola aqui o array JSON de páginas gerado noutra IA…" style={{ width: '100%', height: 120, borderRadius: 8, border: '1px solid #d1d5db', padding: 8, fontSize: 12, fontFamily: 'monospace' }} />
                <button style={btn(ROXO)} onClick={importarColado}>Adicionar páginas</button>
              </div>
            )}
          </div>
          {prog.total > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ height: 8, borderRadius: 6, background: '#eee', overflow: 'hidden' }}><div style={{ height: '100%', width: `${(prog.done / prog.total) * 100}%`, background: ROXO, transition: 'width .2s' }} /></div>
              <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{prog.done} de {prog.total}{pararFlag ? ' · a parar…' : ''}</p>
            </div>
          )}
          {logs.length > 0 && <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: 10, maxHeight: 280, overflow: 'auto', fontSize: 12, fontFamily: 'monospace' }}>{logs.map((l, i) => <div key={i} style={{ color: l.startsWith('✗') ? '#dc2626' : l.startsWith('—') ? '#b45309' : '#374151', padding: '1px 0' }}>{l}</div>)}</div>}
        </div>
      )}

      {/* VER */}
      {modo === 'ver' && doc && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <h2 style={{ flex: 1, fontSize: 18, fontWeight: 700, margin: 0 }}>{doc.unitCode} — {doc.fullTitle}</h2>
            <button style={ghost} onClick={() => window.print()}>Imprimir</button>
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

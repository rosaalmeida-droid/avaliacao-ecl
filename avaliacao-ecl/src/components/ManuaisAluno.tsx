// src/components/ManuaisAluno.tsx
// Gerador de Manuais do Aluno por UC. A app desenha o ÍNDICE (a Rosa revê),
// depois gera os capítulos AUTOMATICAMENTE, um a um, pela função Gemini
// (/api/gerarPaginaManual) — que devolve sempre JSON válido. Capítulos longos
// continuam ("continua") na mesma página lógica. Se a Gemini falhar/esgotar,
// há o modo manual (copiar prompt-mestre + colar JSON). Guarda em localStorage,
// exporta Word e PDF no formato ECL.

import React, { useState, useEffect, useRef } from 'react';
import { REFERENCIAL_811RA144, ReferencialUC } from '../referencial811RA144';
import { downloadManualDoc, exportManualPdf } from '../exportManualDoc';
import { getFichasProducao } from '../backend';
import { encontrarSubtecnica, encontrarAparelho } from '../compatECL';

const BRAND = '#1aa1af';
const LIGHT = '#d9f2f4';
const LINE = '#b3e0e4';
const SOFT = '#f0fbfc';
const ROXO = '#7C3AED';

const ANO_LETIVO = '2026-2027';
const SCHOOL_LABEL = 'Curso Profissional de Técnico de Cozinha e Restauração';
const FOOTER = { date: 'Data: 01 / 09 / 2016', reference: 'ECL.GPC.015.2', revision: 'Revisão: 02 / 07 / 2021' };
const FONTES = 'Le Cordon Bleu (técnica); Maria de Lurdes Modesto, "Cozinha Tradicional Portuguesa" (receitas tradicionais); José Avillez, "Combinações Improváveis" (inovação); Ferran Adrià / elBulli (inovação internacional); Manual de Cozinha da Escola de Hotelaria (Turismo de Portugal)';
const PT_PT = 'Escreve em PORTUGUÊS DE PORTUGAL (europeu), NUNCA em português do Brasil. Trata o aluno por "tu" (não "você"). Usa vocabulário e ortografia de Portugal — ex.: pequeno-almoço (não "café da manhã"), frigorífico (não "geladeira"), casa de banho, fogão, autocarro, telemóvel, ecrã, gelado, sumo, talho, empregado de mesa. Evita termos e construções brasileiras.';
const MAX_PAGINAS_CAP = 4; // segurança: máximo de páginas por capítulo
const THROTTLE_MS = 6500;    // espaçar pedidos (~9/min; o limite grátis ronda 10/min)
const ESPERA_429_MS = 35000; // esperar o minuto limpar quando bate no limite
const MAX_ESPERAS = 5;
const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const EXCLUIR = ['UC03578', 'UC03579'];
const SERVICE_UCS = ['UC03580', 'UC03581', 'UC03582', 'UC03583', 'UC00595'];
const PRODUCT_UCS = ['UC01999', 'UC02002', 'UC02003', 'UC02004', 'UC02005', 'UC03577', 'UC03585', 'UC03586'];

interface Callout { type: 'nota' | 'aviso' | 'dica' | 'definicao'; content: string }
interface Tabela { title?: string; columns: string[]; rows: string[][] }
interface Passos { title: string; intro?: string; steps: { label: string; detail: string; warning?: string }[] }
interface Dialogo { title: string; instructions?: string; items: { client: string; response: string; objective?: string }[] }
interface Consolidacao { title?: string; keyPoints: string[]; selfCheck?: string[] }
interface Ficha { title: string; instructions?: string; prompts: { prompt: string; lines: number }[] }
interface Subseccao { title: string; paragraphs?: string[]; bullets?: string[] }
interface PaginaManual {
  pageNumber: number; title: string; subtitle?: string;
  paragraphs?: string[]; calloutBoxes?: Callout[]; bullets?: string[];
  subsections?: Subseccao[]; procedureSteps?: Passos; tables?: Tabela[];
  dialogueBlocks?: Dialogo[]; consolidationBlock?: Consolidacao; worksheetSections?: Ficha[];
}
interface DocumentoManual {
  unitCode: string; unitNumber: number; fullTitle: string; schoolLabel: string;
  academicYear: string; footerDate: string; footerReference: string; footerRevision: string;
  pages: PaginaManual[];
  indice?: string[];
}

interface UCItem { code: string; ref: ReferencialUC; kind: 'produto' | 'serviço' | 'processo' }
const UCS: UCItem[] = Object.entries(REFERENCIAL_811RA144)
  .filter(([code, r]) => !EXCLUIR.includes(code) && r.bloco !== 'fct')
  .sort((a, b) => a[1].ordemECL - b[1].ordemECL)
  .map(([code, ref]) => ({ code, ref, kind: SERVICE_UCS.includes(code) ? 'serviço' : PRODUCT_UCS.includes(code) ? 'produto' : 'processo' }));

// ── utilitários ─────────────────────────────────────────────────────────────
function esc(s: any): string {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function ucNumber(code: string): number { const m = code.match(/(\d+)/); return m ? Number(m[1]) : 0; }

// parse tolerante: tira crases/lixo, vírgulas finais e repara JSON cortado
function tryParse(raw: string): any {
  let s = String(raw || '').replace(/```json/gi, '').replace(/```/g, '').trim();
  const fO = s.indexOf('{'); const fA = s.indexOf('[');
  const start = fA >= 0 && (fO < 0 || fA < fO) ? fA : fO;
  if (start > 0) s = s.slice(start);
  const noTrailing = s.replace(/,(\s*[}\]])/g, '$1');
  for (const cand of [s, noTrailing]) { try { return JSON.parse(cand); } catch { /* */ } }
  // reparar truncagem: fechar string/parênteses abertos
  let t = noTrailing;
  let inStr = false, escp = false; const stack: string[] = [];
  for (const c of t) {
    if (inStr) { if (escp) escp = false; else if (c === '\\') escp = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true; else if (c === '{') stack.push('}'); else if (c === '[') stack.push(']'); else if (c === '}' || c === ']') stack.pop();
  }
  if (inStr) t += '"';
  t = t.replace(/,\s*$/, '');
  while (stack.length) t += stack.pop();
  return JSON.parse(t);
}

// ── render do corpo de uma página (pré-visualização no ecrã) ────────────────
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
    h += `<table style="width:100%;border-collapse:collapse;margin:0 0 0.28cm;"><tr>${(t.columns || []).map((c) => `<th style="border:1px solid #000;background:${LIGHT};font-weight:700;padding:0.1cm 0.14cm;font-size:10.5pt;text-align:left;">${esc(c)}</th>`).join('')}</tr>${(t.rows || []).map((row) => `<tr>${(row || []).map((cell) => `<td style="border:1px solid #000;padding:0.1cm 0.14cm;font-size:10.5pt;vertical-align:top;">${esc(cell)}</td>`).join('')}</tr>`).join('')}</table>`;
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

// ── prompts ─────────────────────────────────────────────────────────────────
function sequenciaPorTipo(kind: string): string {
  if (kind === 'produto') return 'Para esta UC de produto/confeção segue: (1) MATÉRIAS-PRIMAS por FAMÍLIAS/grupos, com um pouco de cada grupo e os CASOS ESPECIAIS; (2) TÉCNICAS DE CONFEÇÃO de forma exaustiva; (3) CONSERVAÇÃO; (4) VERIFICAÇÃO DA FRESCURA e qualidade; (5) HIGIENE. As normas de SEGURANÇA (SST) aplicam-se AO LONGO do trabalho, não em capítulo isolado.';
  if (kind === 'serviço') return 'Para esta UC de serviço segue: (1) o espaço e a mise en place; (2) a sequência do serviço; (3) o atendimento e a comunicação; (4) os produtos/bebidas; (5) higiene e segurança.';
  return 'Para esta UC de processo segue: (1) organização e planeamento; (2) documentos (fichas técnicas, requisições, cronogramas); (3) mise en place; (4) coordenação e controlo; (5) higiene e HACCP.';
}
function refBlock(uc: UCItem): string {
  const apt = uc.ref.aptidoes && uc.ref.aptidoes.length ? `Aptidões (o que deve saber FAZER): ${uc.ref.aptidoes.join(' | ')}\n` : '';
  const ati = uc.ref.atitudes && uc.ref.atitudes.length ? `Atitudes a demonstrar: ${uc.ref.atitudes.join(' | ')}\n` : '';
  return `Conhecimentos (o ESQUELETO — a desenvolver A FUNDO): ${uc.ref.conhecimentos.join(' | ')}\nRealizações: ${uc.ref.realizacoes.join(' | ')}\n${apt}${ati}Critérios: ${uc.ref.criteriosDesempenho.join(' | ')}`;
}
interface Comp { subs: string[]; apps: string[]; subDefs: string[]; appDefs: string[] }
// Reúne as subtécnicas e aparelhos REAIS trabalhados nos planos/fichas desta UC,
// com as definições da biblioteca. Se não houver dados, devolve vazio (recuo).
function competenciasDaUC(ucId: string): Comp {
  const subs: string[] = []; const apps: string[] = []; const subDefs: string[] = []; const appDefs: string[] = [];
  try {
    const fichas: any[] = (getFichasProducao() as any[]).filter((f) => f && f.ucId === ucId);
    const sIds = new Set<string>(); const aIds = new Set<string>();
    fichas.forEach((f) => { (f.tecnicasDetectadas || []).forEach((id: string) => sIds.add(id)); (f.aparelhosDetectados || []).forEach((id: string) => aIds.add(id)); });
    sIds.forEach((id) => { const s: any = encontrarSubtecnica(id); if (s && s.nome) { subs.push(s.nome); const d = s.definicao || s.resultado_esperado; if (d) subDefs.push(`${s.nome}: ${d}`); } });
    aIds.forEach((id) => { const a: any = encontrarAparelho(id); if (a && a.nome) { apps.push(a.nome); if (a.definicao) appDefs.push(`${a.nome}${a.categoria ? ' (' + a.categoria + ')' : ''}: ${a.definicao}`); } });
  } catch { /* sem biblioteca/planos — recuo silencioso */ }
  return { subs, apps, subDefs, appDefs };
}
function blocoCompetencias(c: Comp): string {
  if (!c.subs.length && !c.apps.length) return '';
  let t = '\n\nCOMPETÊNCIAS REAIS DESTA UC (retiradas dos planos de aula — trata-as, com estes nomes exatos):';
  if (c.subs.length) t += `\n- Subtécnicas: ${c.subs.slice(0, 60).join(', ')}`;
  if (c.apps.length) t += `\n- Aparelhos (preparações de base — massas, cremes, molhos, fundos): ${c.apps.slice(0, 40).join(', ')}`;
  return t;
}
function blocoDefs(c: Comp): string {
  const defs = [...c.subDefs, ...c.appDefs].slice(0, 25);
  return defs.length ? `\n\nDEFINIÇÕES DE REFERÊNCIA (usa-as para desenvolver com rigor, sem as copiar tal e qual):\n- ${defs.join('\n- ')}` : '';
}

function substanciaPagina(p: any): number {
  let n = 0;
  (p?.paragraphs || []).forEach((x: string) => (n += (x || '').length));
  (p?.subsections || []).forEach((s: any) => { (s?.paragraphs || []).forEach((x: string) => (n += (x || '').length)); (s?.bullets || []).forEach((x: string) => (n += (x || '').length)); });
  (p?.bullets || []).forEach((x: string) => (n += (x || '').length));
  (p?.tables || []).forEach((t: any) => (t?.rows || []).forEach((r: any) => (r || []).forEach((c: string) => (n += (c || '').length))));
  return n;
}

function buildOutlinePrompt(uc: UCItem, comp: Comp): string {
  return `Produz APENAS um array JSON de strings (sem markdown, sem crases). Cada string é o título de um capítulo.

És um professor de cozinha e restauração com 20 anos de experiência. Desenha o ÍNDICE de um MANUAL DO ALUNO para a UC ${uc.code} — ${uc.ref.nome} (tipo: ${uc.kind}), para alunos do secundário com dificuldades.

PENSA PRIMEIRO (âmbito): "O QUE É QUE O ALUNO PRODUZ EM AULA com esta UC?". A resposta define o sentido de TODOS os termos. Ex.: em "acepipes… e massas", o aluno produz ACEPIPES, logo "massas" são as massas dos acepipes (folhada, quebrada, tenra, choux salgada, rissol, empada), NÃO massas italianas.

${sequenciaPorTipo(uc.kind)}

O ESQUELETO do manual vem dos CONHECIMENTOS do referencial — desenvolve-os A FUNDO (expande para o conteúdo REAL de cozinha, não fiques nas frases genéricas):
${refBlock(uc)}${blocoCompetencias(comp)}

LÍNGUA (OBRIGATÓRIO): ${PT_PT}

REGRAS:
- O ÍNDICE assenta nos CONHECIMENTOS do referencial. Cada capítulo DESENVOLVE A FUNDO um conhecimento ou um grupo de conhecimentos afins — e o índice, no conjunto, tem de COBRIR TODOS os conhecimentos listados, nenhum de fora.
- Usa TANTOS capítulos quantos forem precisos para tratar todos os conhecimentos com profundidade (agrupa os da mesma família num capítulo; não deixes conhecimentos por cobrir). Ordena do básico ao avançado, sem sobreposição.
- Para CADA capítulo escreve 5 a 10 PONTOS A TRABALHAR que APROFUNDAM o(s) conhecimento(s): o que é; porquê/para que serve; como se faz (passo a passo); variedades/tipos; exemplos concretos; erros comuns. Nível esperado (exemplo do capítulo das facas): constituição da faca (partes); tipos de facas e para que serve cada uma; pega em pinça; pousar/lançar na tábua e postura; segurança na utilização; cuidados no transporte e ao passar a faca; afiação e conservação.
- ANCORA a teoria na PRÁTICA: liga cada conhecimento às realizações/aptidões e às subtécnicas/aparelhos reais acima — a teoria explica o que o aluno faz na aula. Um aparelho (massa, creme, molho, fundo) merece pontos próprios: o que é, para que serve, ingredientes-base, técnica passo a passo, erros a evitar.
- Os TEMAS TRANSVERSAIS (trabalhados em quase todas as UCs — higiene e segurança alimentar, segurança e saúde no trabalho, sustentabilidade e desperdício, comunicação, trabalho em equipa) vão nos ÚLTIMOS capítulos, mais CURTOS, tratados de forma a ENQUADRAR esta UC em concreto (aplicados ao que se faz nela), NÃO exaustivamente. O corpo central do manual são os conhecimentos ESPECÍFICOS da UC.
- Inclui um capítulo final "Onde procurar informação" (fontes: ${FONTES}).
- Não desenvolvas temas que são foco de outra UC (HACCP=UC03584; nutrição=UC00596); no máximo, uma referência.

FORMATO: um array JSON de strings; cada string é "Título — ponto; ponto; ponto; …" (o título, um travessão " — ", e os pontos separados por ponto e vírgula).
Exemplo: ["As facas — constituição da faca; tipos de facas; pega em pinça; segurança; transporte; afiação", "..."]`;
}
function buildChapterPrompt(uc: UCItem, titulo: string, pontos: string[], indice: string[], covered: string[], tipo: 'intro' | 'capitulo' | 'sintese' | 'ficha', comp: Comp, prevResumo: string, parte: number): string {
  const dlg = uc.kind === 'serviço' ? ', "dialogueBlocks"?: [{ "title": string, "instructions"?: string, "items": [{ "client": string, "response": string, "objective"?: string }] }]' : '';
  const idx = indice.map((c, i) => `${i + 1}. ${c}`).join('\n');
  let especifico = '';
  if (tipo === 'intro') especifico = '- INTRODUÇÃO: começa por dizer O QUE O ALUNO VAI PRODUZIR nesta UC, apresenta a UC, para que serve e como o manual está organizado. Título = "Introdução". Não uses "continua".';
  else if (tipo === 'sintese') especifico = '- SÍNTESE: resume os pontos-chave e apresenta os critérios de desempenho. Usa consolidationBlock. Não uses "continua".';
  else if (tipo === 'ficha') especifico = '- FOLHA DE TRABALHO INTERATIVA (papel): exercícios VARIADOS e ATIVOS — ligar colunas (tabela de 2 colunas), ordenar passos, completar tabelas/espaços, verdadeiro/falso, e um CENÁRIO REAL. Mistura aplicação prática e consolidação da teoria; termina com autoavaliação. Usa worksheetSections, tables e bullets. Não uses "continua".';
  else especifico = parte === 1
    ? '- Desenvolve o capítulo A FUNDO nos três eixos integrados: CONHECIMENTO (o quê, porquê, como funciona) + APTIDÃO (como se faz na prática, passo a passo, ligado às realizações) + ATITUDES a demonstrar. Se ainda houver muito a dizer e a resposta ficaria demasiado longa, escreve a primeira parte e devolve "continua": true.'
    : `- CONTINUAÇÃO (parte ${parte}) do mesmo capítulo. Já foi escrito: ${prevResumo}. NÃO repitas o título nem o que já foi dito; acrescenta o que FALTA. Se ainda faltar, "continua": true; se ficou completo, "continua": false.`;

  return `Produz APENAS um objeto JSON válido (sem markdown, sem crases).

És um professor de cozinha e restauração com 20 anos de experiência, a escrever um MANUAL DO ALUNO para alunos do secundário com dificuldades. ${tipo === 'capitulo' ? `Escreve o capítulo "${titulo}"` : 'Escreve esta secção'} da UC ${uc.code} — ${uc.ref.nome}.

LÍNGUA (OBRIGATÓRIO): ${PT_PT}

ÂMBITO: parte sempre de "o que produz o aluno nesta UC?" e interpreta os termos à volta disso (ex.: "massas" dos acepipes, não esparguete).

PÚBLICO (MUITO IMPORTANTE): o aluno NÃO SABE PRATICAMENTE NADA de cozinha — pode nunca ter entrado numa. Escreve DO ZERO: explica cada conceito e cada termo técnico como se fosse a primeira vez que ele ouve aquilo, com palavras simples e exemplos do dia a dia. NUNCA assumas conhecimentos prévios nem uses "como sabes", "obviamente" ou "basta". Se aparece uma palavra técnica, explica-a ali mesmo.

ÍNDICE COMPLETO (para não repetir nem adiantar):
${idx}

Referencial:
${refBlock(uc)}
${pontos.length ? `\nPONTOS A COBRIR NESTE CAPÍTULO (obrigatório — desenvolve TODOS a fundo, e NÃO invadas o que é de outros capítulos):\n- ${pontos.join('\n- ')}\n` : ''}${blocoDefs(comp)}

JÁ ESCRITO — capítulos que JÁ EXISTEM neste manual. NÃO repitas a matéria deles: se precisares de tocar num tema já dado, faz só uma referência curta ("como viste no capítulo X…"), não voltes a explicá-lo. Cada capítulo traz informação NOVA.
${covered.length ? covered.slice(-25).map((c) => '- ' + c).join('\n') : '(nada ainda — este é o primeiro)'}

${especifico}

ESTILO: linguagem simples mas DESENVOLVIDA; cada termo técnico explicado à primeira vez; CONCRETO (nomes, °C, minutos, pratos e utensílios pelo nome); reflete a PRÁTICA; contexto histórico curto e ciência simples quando ajudar; remete para as fontes quando útil (${FONTES}); cada UC trata só o que é seu; usa subsections/tables/procedureSteps/callouts; ${PT_PT} Sem meta-referências.

NUNCA entregues um capítulo superficial ou de uma só frase — desenvolve SEMPRE a fundo (vários parágrafos e/ou subsecções, com pormenor prático). Se a matéria for mesmo insuficiente para desenvolver este capítulo com qualidade, devolve { "incompleto": true } em vez de um texto vazio ou de uma frase — fica por acabar e completa-se mais tarde.

Devolve este objeto (só os campos úteis):
{ "title": string, "subtitle"?: string, "paragraphs"?: string[], "subsections"?: [{ "title": string, "paragraphs"?: string[], "bullets"?: string[] }], "calloutBoxes"?: [{ "type": "nota"|"aviso"|"dica"|"definicao", "content": string }], "bullets"?: string[], "tables"?: [{ "title": string, "columns": string[], "rows": string[][] }], "procedureSteps"?: { "title": string, "intro"?: string, "steps": [{ "label": string, "detail": string, "warning"?: string }] }${dlg}, "consolidationBlock"?: { "title": string, "keyPoints": string[], "selfCheck"?: string[] }, "worksheetSections"?: [{ "title": string, "instructions"?: string, "prompts": [{ "prompt": string, "lines": number }] }], "incompleto"?: boolean, "continua"?: boolean }`;
}
function buildMasterPrompt(uc: UCItem): string {
  return `Vais ajudar-me a construir um MANUAL DO ALUNO para ${uc.code} — ${uc.ref.nome}. Alunos do secundário com dificuldades.

REGRAS: (1) ÂMBITO — pergunta "o que produz o aluno nesta UC?" e interpreta os termos à volta disso (ex.: "massas" dos acepipes, não esparguete). (2) ${sequenciaPorTipo(uc.kind)} (3) Cada capítulo nos três eixos: conhecimento + aptidão (prática) + atitudes. (4) Reflete a prática, concreto, linguagem simples. (5) Fontes: ${FONTES}. (6) Cada UC só trata o que é seu. (7) Fichas de trabalho em papel, interativas. (8) ${PT_PT}

Referencial:
${refBlock(uc)}

FORMATO: responde em JSON puro (sem crases). Cada capítulo = um objeto { "title", "paragraphs"?, "subsections"?, "calloutBoxes"?, "bullets"?, "tables"?, "procedureSteps"?, "consolidationBlock"?, "worksheetSections"? }.

TRABALHO: PASSO 1 devolve só o ÍNDICE (array JSON de 8-14 títulos, âmbito certo) e pára. PASSO 2 quando eu disser "capítulo N"/"próximo" escreve só esse capítulo (JSON); se longo, "continua": true e eu digo "continua". PASSO 3 no fim, síntese + fichas interativas.

Começa pelo PASSO 1: devolve só o índice.`;
}

function buildPlanoPrompt(uc: UCItem, titulos: string[], pedido: string): string {
  const lista = titulos.map((t, i) => `${i + 1}. ${t}`).join('\n');
  return `Produz APENAS um objeto JSON (sem markdown, sem crases).

Tens um MANUAL DO ALUNO da UC ${uc.code} — ${uc.ref.nome}, com estes capítulos por ordem:
${lista}

O professor quer ACRESCENTAR ao manual: "${pedido}".

Decide, do ponto de vista PEDAGÓGICO e do ÂMBITO da UC (o que o aluno produz):
- Se o assunto já pertence a um capítulo existente, EXPANDE esse capítulo.
- Se é matéria nova que merece capítulo próprio, cria um NOVO capítulo e diz em que POSIÇÃO entra (a seguir a que capítulo), pela ordem pedagógica. As folhas de trabalho e a síntese ficam sempre no fim.
- Se o acréscimo não fizer sentido nesta UC, di-lo.

Devolve: { "accao": "novo" | "expandir" | "nao_faz_sentido", "aposNumero": number, "alvoNumero": number, "titulo": string, "justificacao": string }
(aposNumero = número do capítulo DEPOIS do qual entra o novo; alvoNumero = número do capítulo a expandir; titulo = título do novo capítulo.)`;
}

function buildRevisaoPrompt(uc: UCItem, page: any, comp: Comp): string {
  return `Produz APENAS um objeto JSON válido (sem markdown, sem crases). És um revisor pedagógico exigente.

Vais MELHORAR este capítulo de um MANUAL DO ALUNO (UC ${uc.code} — ${uc.ref.nome}), para alunos que NÃO SABEM PRATICAMENTE NADA de cozinha.

MELHORA assim:
- DESENVOLVE o que estiver curto ou superficial: acrescenta detalhe prático, passo a passo, exemplos concretos (°C, minutos, nomes de pratos e utensílios).
- Explica DO ZERO cada termo técnico; tira qualquer pressuposto de conhecimento.
- CORTA repetições e frases vazias ("é importante", "existem vários tipos").
- Garante PORTUGUÊS DE PORTUGAL: ${PT_PT}
- MANTÉM o mesmo assunto e a mesma estrutura; NÃO mudes o título nem o âmbito.
${blocoDefs(comp)}

CAPÍTULO ATUAL (em JSON):
${JSON.stringify(page).slice(0, 12000)}

Devolve o MESMO capítulo, melhorado, no MESMO formato JSON (title, subtitle?, paragraphs?, subsections?, calloutBoxes?, bullets?, tables?, procedureSteps?, consolidationBlock?, worksheetSections?). Não uses "continua".`;
}

function buildCoberturaPrompt(uc: UCItem, resumo: string): string {
  const apt = (uc.ref.aptidoes && uc.ref.aptidoes.length) ? uc.ref.aptidoes.join(' | ') : '(não listadas)';
  return `Produz APENAS um objeto JSON (sem markdown, sem crases). Verifica a COBERTURA de um manual do aluno.

UC ${uc.code} — ${uc.ref.nome}. O manual devia cobrir estas competências:
Realizações: ${uc.ref.realizacoes.join(' | ')}
Aptidões: ${apt}
Conhecimentos: ${uc.ref.conhecimentos.join(' | ')}

O manual tem estes capítulos:
${resumo}

Compara e diz o que FALTA. Devolve: { "em_falta": [string], "sugestao": string }
- em_falta = competências/temas do referencial que o manual NÃO cobre (frases curtas e concretas; se estiver tudo coberto, lista vazia).
- sugestao = uma frase com o que valeria a pena acrescentar.`;
}

// ════════════════════════════════════════════════════════════════════════════
export function ManuaisAluno({ nomeProfessor: _nome }: { nomeProfessor?: string }) {
  const [modo, setModo] = useState<'lista' | 'gerar' | 'ver'>('lista');
  const [lista, setLista] = useState(listSaved());
  const [selCode, setSelCode] = useState(UCS[0]?.code || '');
  const [doc, setDoc] = useState<DocumentoManual | null>(null);
  const [gerando, setGerando] = useState(false);
  const [aFazerIndice, setAFazerIndice] = useState(false);
  const [faseIndice, setFaseIndice] = useState(false);
  const [indiceTxt, setIndiceTxt] = useState('');
  const [prog, setProg] = useState({ done: 0, total: 0 });
  const [logs, setLogs] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [colarAberto, setColarAberto] = useState(false);
  const [colarTxt, setColarTxt] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [pedidoAdd, setPedidoAdd] = useState('');
  const [plano, setPlano] = useState<any>(null);
  const [aPlanear, setAPlanear] = useState(false);
  const [aVerificar, setAVerificar] = useState(false);
  const [cobertura, setCobertura] = useState<any>(null);
  const [filaAtiva, setFilaAtiva] = useState(false);
  const [filaSel, setFilaSel] = useState<string[]>([]);
  const pararRef = useRef(false);

  useEffect(() => { setLista(listSaved()); }, [modo]);

  function novoDoc(uc: UCItem): DocumentoManual {
    return { unitCode: uc.code, unitNumber: ucNumber(uc.code), fullTitle: uc.ref.nome, schoolLabel: SCHOOL_LABEL, academicYear: ANO_LETIVO, footerDate: FOOTER.date, footerReference: FOOTER.reference, footerRevision: FOOTER.revision, pages: [] };
  }

  async function chamarIA(prompt: string, preferir?: string): Promise<{ ok: boolean; data?: any; motivo?: string; mensagem?: string; fornecedor?: string; avisos?: string[] }> {
    try {
      const res = await fetch('/api/gerarPaginaManual', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, preferir }) });
      const txt = await res.text();
      let json: any;
      try { json = JSON.parse(txt); } catch { return { ok: false, motivo: res.ok ? 'json_invalido' : 'erro_servidor', mensagem: (txt || '').slice(0, 140) }; }
      if (!json.ok) return { ok: false, motivo: json.motivo, mensagem: json.mensagem };
      let data = json.pagina !== undefined ? json.pagina : json;
      if (typeof data === 'string') { try { data = tryParse(data); } catch { /* */ } }
      return { ok: true, data, fornecedor: json.fornecedor, avisos: json.avisos };
    } catch (e: any) { return { ok: false, motivo: 'rede', mensagem: String(e?.message || e) }; }
  }

  async function gerarIndiceCore(uc: UCItem): Promise<string[] | null> {
    const r = await chamarIA(buildOutlinePrompt(uc, competenciasDaUC(uc.code)));
    let titulos: string[] = [];
    if (r.ok && Array.isArray(r.data)) titulos = r.data.filter((x: any) => typeof x === 'string' && x.trim()).map((x: string) => x.trim());
    if (titulos.length) return titulos;
    if (r.ok) return uc.ref.conhecimentos.slice(); // sem índice mas sem limite → usa conhecimentos como base
    return null; // falhou (limite/erro) — não dá para prosseguir agora
  }

  async function gerarIndice() {
    const uc = UCS.find((u) => u.code === selCode); if (!uc) return;
    setAFazerIndice(true); setSaved(false); setFaseIndice(false); setLogs(['A desenhar o índice…']); setModo('gerar');
    const titulos = await gerarIndiceCore(uc);
    setAFazerIndice(false);
    if (!titulos || !titulos.length) { setLogs((l) => [...l, '— Não consegui desenhar o índice (limite ou erro). Tenta de novo mais tarde.']); return; }
    setLogs((l) => [...l, `✓ Índice com ${titulos.length} capítulos. Revê e corrige o âmbito antes de gerar.`]);
    setIndiceTxt(titulos.join('\n')); setFaseIndice(true);
  }

  // ── FILA AUTOMÁTICA: manual a manual, do início ao fim, gravando a cada capítulo ──
  async function correrFila(codigos: string[]) {
    if (!codigos.length) return;
    pararRef.current = false; setFilaAtiva(true); setGerando(true); setModo('gerar');
    setLogs([`— Fila automática: ${codigos.length} UC(s). Faço uma a uma, do início ao fim, e gravo a cada capítulo. Deixa a aba aberta.`]);
    for (let k = 0; k < codigos.length && !pararRef.current; k++) {
      const code = codigos[k];
      const uc = UCS.find((u) => u.code === code); if (!uc) continue;
      setSelCode(code);
      setLogs((l) => [...l, `▶ [${k + 1}/${codigos.length}] ${code} — ${uc.ref.nome}`]);
      let existente: DocumentoManual | null = null;
      try { const raw = localStorage.getItem(KEY(code)); if (raw) existente = JSON.parse(raw); } catch { /* */ }
      let linhas: string[] | null = existente && existente.indice && existente.indice.length ? existente.indice : null;
      if (!linhas) {
        setLogs((l) => [...l, '  · a desenhar o índice…']);
        linhas = await gerarIndiceCore(uc);
        if (!linhas) { setLogs((l) => [...l, '  ✗ índice indisponível agora (limite?) — salto e sigo para a próxima.']); continue; }
      } else { setLogs((l) => [...l, '  · retomo o índice já guardado.']); }
      setIndiceTxt(linhas.join('\n'));
      if (existente) setDoc(existente);
      const res = await gerarCapitulos(!!existente, { linhas, base: existente, silencioso: true });
      if (res.doc) { try { localStorage.setItem(KEY(code), JSON.stringify(res.doc)); } catch { /* */ } setLista(listSaved()); }
      setLogs((l) => [...l, res.completo ? `  ✓ ${code} COMPLETO (${res.doc?.pages.length || 0} págs) e guardado.` : `  ⚠ ${code} ficou com capítulos por acabar (guardado). Retomo se voltares a correr a fila.`]);
      if (!pararRef.current) await esperar(1500);
    }
    setFilaAtiva(false); setGerando(false);
    setLogs((l) => [...l, pararRef.current ? '— Fila parada. Tudo o que foi gerado ficou guardado.' : '— Fila terminada. Vê os manuais em “Manuais Guardados”.']);
  }

  function fundir(dest: any, part: any) {
    (['paragraphs', 'bullets', 'subsections', 'tables', 'calloutBoxes', 'dialogueBlocks', 'worksheetSections'] as const).forEach((k) => {
      if (Array.isArray(part[k])) dest[k] = [...(dest[k] || []), ...part[k]];
    });
    if (part.procedureSteps && !dest.procedureSteps) dest.procedureSteps = part.procedureSteps;
    if (part.consolidationBlock && !dest.consolidationBlock) dest.consolidationBlock = part.consolidationBlock;
    if (part.subtitle && !dest.subtitle) dest.subtitle = part.subtitle;
  }

  async function gerarCapitulos(continuar = false, opts?: { linhas?: string[]; base?: DocumentoManual | null; silencioso?: boolean }): Promise<{ doc: DocumentoManual | null; completo: boolean }> {
    const uc = UCS.find((u) => u.code === selCode); if (!uc) return { doc: null, completo: false };
    const linhas = ((opts?.linhas && opts.linhas.length) ? opts.linhas : indiceTxt.split('\n')).map((s) => s.trim()).filter(Boolean);
    if (!linhas.length) return { doc: null, completo: false };
    const parseLinha = (l: string) => { const i = l.indexOf('—'); return { titulo: (i >= 0 ? l.slice(0, i) : l).trim(), pontos: i >= 0 ? l.slice(i + 1).split(';').map((x) => x.trim()).filter(Boolean) : [] }; };
    const capsInfo = linhas.map(parseLinha);
    const caps = capsInfo.map((c) => c.titulo);
    const comp = competenciasDaUC(uc.code);
    if (!opts?.silencioso) { pararRef.current = false; setGerando(true); setSaved(false); setFaseIndice(false); setLogs([]); }
    const persistir = (dd: DocumentoManual) => { try { localStorage.setItem(KEY(uc.code), JSON.stringify(dd)); } catch { /* */ } };
    const tarefas: { titulo: string; tipo: 'intro' | 'capitulo' | 'sintese' | 'ficha'; pontos: string[] }[] = [
      { titulo: 'Introdução', tipo: 'intro', pontos: [] },
      ...capsInfo.map((c) => ({ titulo: c.titulo, tipo: 'capitulo' as const, pontos: c.pontos })),
      { titulo: 'Síntese e critérios de desempenho', tipo: 'sintese', pontos: [] },
      { titulo: 'Folha de trabalho 1', tipo: 'ficha', pontos: [] },
      { titulo: 'Folha de trabalho 2', tipo: 'ficha', pontos: [] },
    ];
    const base = opts && 'base' in opts ? opts.base : doc;
    const jaExiste = continuar && !!base && base.unitCode === uc.code && base.pages.length > 0;
    const d: DocumentoManual = jaExiste ? { ...(base as DocumentoManual), pages: [...(base as DocumentoManual).pages] } : novoDoc(uc);
    d.indice = linhas;
    const norm = (x: string) => (x || '').toLowerCase().replace(/[^a-zà-ú0-9]+/g, ' ').trim();
    const temIntro = d.pages.some((p) => /introdu/i.test(p.title));
    const temSintese = d.pages.some((p) => /s[íi]ntese|crit[ée]rios/i.test(p.title));
    let nFichas = d.pages.filter((p) => /folha de trabalho|ficha/i.test(p.title)).length;
    const capsFeitos = new Set(d.pages.map((p) => norm(p.title)));
    const covered: string[] = d.pages.map((p) => p.title);
    setProg({ done: 0, total: tarefas.length });
    let parouPorLimite = false;
    let primeiroPedido = true;
    // faz um pedido respeitando o ritmo; se bater no limite/minuto, espera e repete sozinha
    async function pedirComRitmo(prompt: string): Promise<{ ok: boolean; data?: any; motivo?: string; mensagem?: string; fornecedor?: string }> {
      if (!primeiroPedido) await esperar(THROTTLE_MS);
      primeiroPedido = false;
      let esperas = 0;
      while (!pararRef.current) {
        const r = await chamarIA(prompt);
        if (r.ok) return r;
        if (r.motivo === 'limite_atingido' && esperas < MAX_ESPERAS) {
          esperas++;
          setLogs((l) => [...l, `⏳ Limite por minuto — a aguardar ${Math.round(ESPERA_429_MS / 1000)}s (${esperas}/${MAX_ESPERAS})…`]);
          await esperar(ESPERA_429_MS);
          continue;
        }
        return r;
      }
      return { ok: false, motivo: 'parado' };
    }
    for (let i = 0; i < tarefas.length && !pararRef.current; i++) {
      const t = tarefas[i];
      if (jaExiste) {
        const feito = (t.tipo === 'intro' && temIntro) || (t.tipo === 'sintese' && temSintese) || (t.tipo === 'ficha' && nFichas > 0) || (t.tipo === 'capitulo' && capsFeitos.has(norm(t.titulo)));
        if (feito) { if (t.tipo === 'ficha') nFichas--; setProg({ done: i + 1, total: tarefas.length }); continue; }
      }
      let pagina: any = null; let prev = ''; let continua = true; let parte = 1; let motivo = ''; let fornecedorUsado = ''; let incompletoFlag = false;
      while (continua && parte <= MAX_PAGINAS_CAP && !pararRef.current) {
        const r = await pedirComRitmo(buildChapterPrompt(uc, t.titulo, t.pontos, caps, covered, t.tipo, comp, prev, parte));
        if (r.fornecedor) fornecedorUsado = r.fornecedor;
        if (!r.ok) { motivo = r.motivo || 'erro'; if (motivo !== 'parado') setLogs((l) => [...l, `✗ ${t.titulo.slice(0, 42)}… (${r.mensagem || motivo})`]); break; }
        const part = r.data || {};
        if (part.incompleto === true) incompletoFlag = true;
        if (!pagina) pagina = { pageNumber: 0, title: t.tipo === 'capitulo' ? t.titulo : (part.title || t.titulo) };
        fundir(pagina, part);
        prev = (pagina.paragraphs || []).slice(-1).join(' ').slice(0, 240) + ' | ' + (pagina.subsections || []).map((s: any) => s.title).join('; ');
        continua = t.tipo === 'capitulo' && part.continua === true && parte < MAX_PAGINAS_CAP;
        parte++;
      }
      const temAlgum = pagina && (pagina.paragraphs?.length || pagina.subsections?.length || pagina.worksheetSections?.length || pagina.tables?.length);
      const fraco = pagina && t.tipo === 'capitulo' && (incompletoFlag || substanciaPagina(pagina) < 400);
      if (pagina && fraco) {
        pagina.subtitle = '⚠ Por acabar — volta a gerar ou usa “✨ Rever (melhorar)” para completar';
        pagina.incompleto = true;
        if (!temAlgum) pagina.paragraphs = ['Este capítulo ficou por desenvolver (a IA não conseguiu, de momento, produzir texto com profundidade). Usa “✨ Rever (melhorar)” ou gera de novo mais tarde para o completar — não ficou superficial de propósito.'];
        pagina.pageNumber = d.pages.length === 0 ? 1 : d.pages.length + 1;
        d.pages.push(pagina); covered.push(pagina.title); setDoc({ ...d }); persistir(d);
        setLogs((l) => [...l, `⚠ ${pagina.title} ficou POR ACABAR — completa mais tarde (não foi entregue superficial).`]);
      } else if (temAlgum) {
        pagina.pageNumber = d.pages.length === 0 ? 1 : d.pages.length + 1;
        d.pages.push(pagina); covered.push(pagina.title + (pagina.subtitle ? ' / ' + pagina.subtitle : '')); setDoc({ ...d }); persistir(d);
        setLogs((l) => [...l, `✓ ${pagina.title}${parte > 2 ? ` (${parte - 1} págs)` : ''}${fornecedorUsado ? ` — via ${fornecedorUsado}` : ''}`]);
      }
      setProg({ done: i + 1, total: tarefas.length });
      if (motivo === 'limite_atingido' || motivo === 'sem_chave') { parouPorLimite = true; setLogs((l) => [...l, motivo === 'sem_chave' ? '— Falta a GEMINI_API_KEY na Vercel.' : '— Limite ainda ativo depois de esperar — provavelmente o limite diário. Continua mais tarde (o que já foi gerado é guardável) ou usa o modo manual.']); break; }
    }
    const ordemKey = (p: PaginaManual) => { if (/introdu/i.test(p.title)) return 0; if (/s[íi]ntese|crit[ée]rios/i.test(p.title)) return 9000; if (/folha de trabalho|ficha/i.test(p.title)) return 9500; const idx = caps.findIndex((c) => norm(c) === norm(p.title)); return idx >= 0 ? 100 + idx : 500; };
    d.pages.sort((a, b) => ordemKey(a) - ordemKey(b));
    d.pages.forEach((p, idx) => (p.pageNumber = idx === 0 ? 1 : idx + 1));
    const temPorAcabar = d.pages.some((p: any) => p.incompleto === true);
    const completo = !parouPorLimite && !temPorAcabar && d.pages.length > 0;
    if (!opts?.silencioso) setGerando(false);
    if (d.pages.length > 0) { setDoc({ ...d }); persistir(d); setLista(listSaved()); if (!opts?.silencioso) setLogs((l) => [...l, `— ${d.pages.length} páginas.${parouPorLimite ? '' : ' Podes guardar/exportar.'}`]); }
    return { doc: d, completo };
  }

  function copiarMestre() {
    const uc = UCS.find((u) => u.code === selCode); if (!uc) return;
    const txt = buildMasterPrompt(uc);
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(txt).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 2500); }).catch(() => setColarTxt(txt));
    else setColarTxt(txt);
  }

  function adicionar() {
    const uc = UCS.find((u) => u.code === selCode); if (!uc) return;
    let parsed: any;
    try { parsed = tryParse(colarTxt); } catch (e: any) { setLogs((l) => [...l, '✗ JSON inválido: ' + e.message]); return; }
    let arr: any[] = Array.isArray(parsed) ? parsed : (parsed.pages || parsed.paginas || [parsed]);
    if (arr.length && typeof arr[0] === 'string') { setLogs((l) => [...l, 'ℹ Isto parece o ÍNDICE (lista de títulos), não um capítulo. Cola o índice no campo de cima e usa "Gerar manual".']); return; }
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
    catch (e: any) { setLogs((l) => [...l, '✗ Falha ao guardar: ' + e.message]); alert('Não consegui guardar: ' + (e?.message || e)); }
  }
  function abrir(code: string) { try { const d = JSON.parse(localStorage.getItem(KEY(code)) || '') as DocumentoManual; setDoc(d); setSelCode(d.unitCode); setIndiceTxt((d.indice || []).join('\n')); setSaved(true); setModo('ver'); } catch { /* */ } }
  function apagar(code: string) { localStorage.removeItem(KEY(code)); setLista(listSaved()); }

  function conteudoFim(d: DocumentoManual): number {
    let fim = d.pages.length;
    for (let i = 1; i < d.pages.length; i++) {
      if (/^(folha de trabalho|s[íi]ntese)/i.test(d.pages[i].title || '')) { fim = i; break; }
    }
    return fim;
  }
  async function planear() {
    const uc = UCS.find((u) => u.code === selCode); if (!uc || !doc || !pedidoAdd.trim()) return;
    setAPlanear(true); setPlano(null); setLogs(['A planear onde encaixar…']);
    const r = await chamarIA(buildPlanoPrompt(uc, doc.pages.map((p) => p.title), pedidoAdd.trim()));
    setAPlanear(false);
    if (r.ok && r.data && typeof r.data === 'object' && r.data.accao) { setPlano(r.data); setLogs((l) => [...l, '✓ Plano pronto — confirma abaixo.']); }
    else setLogs((l) => [...l, `✗ Não consegui planear (${r.mensagem || r.motivo || 'erro'}).`]);
  }
  async function confirmarAcrescento() {
    const uc = UCS.find((u) => u.code === selCode); if (!uc || !doc || !plano) return;
    if (plano.accao === 'nao_faz_sentido') { setLogs((l) => [...l, 'ℹ Não encaixa: ' + (plano.justificacao || '')]); setPlano(null); return; }
    pararRef.current = false; setGerando(true); setLogs((l) => [...l, '— A gerar o acréscimo…']);
    const comp = competenciasDaUC(uc.code);
    const d: DocumentoManual = { ...doc, pages: [...doc.pages] };
    const titulos = d.pages.map((p) => p.title);
    if (plano.accao === 'expandir') {
      const alvo = Math.max(1, Math.min(d.pages.length, Number(plano.alvoNumero) || 1)) - 1;
      const base: any = { ...d.pages[alvo] };
      const r = await chamarIA(buildChapterPrompt(uc, base.title, [], titulos, titulos, 'capitulo', comp, `Expandir "${base.title}" com: ${pedidoAdd}`, 2));
      if (r.ok && r.data) { fundir(base, r.data); d.pages[alvo] = base; setLogs((l) => [...l, `✓ Expandido: ${base.title}`]); }
      else setLogs((l) => [...l, `✗ Falhou (${r.mensagem || r.motivo}).`]);
    } else {
      const titulo = plano.titulo || pedidoAdd;
      let pagina: any = { pageNumber: 0, title: titulo }; let prev = ''; let continua = true; let parte = 1;
      while (continua && parte <= MAX_PAGINAS_CAP && !pararRef.current) {
        const r = await chamarIA(buildChapterPrompt(uc, titulo, [], [...titulos, titulo], titulos, 'capitulo', comp, prev, parte));
        if (!r.ok) { setLogs((l) => [...l, `✗ Falhou (${r.mensagem || r.motivo}).`]); break; }
        fundir(pagina, r.data || {});
        prev = (pagina.paragraphs || []).slice(-1).join(' ').slice(0, 240);
        continua = (r.data && r.data.continua === true) && parte < MAX_PAGINAS_CAP; parte++;
      }
      if (pagina.paragraphs?.length || pagina.subsections?.length || pagina.tables?.length) {
        const fim = conteudoFim(d);
        let ins = Number(plano.aposNumero); if (!Number.isFinite(ins)) ins = fim;
        if (ins < 1) ins = 1; if (ins > fim) ins = fim;
        d.pages.splice(ins, 0, pagina);
        setLogs((l) => [...l, `✓ Novo capítulo inserido: ${titulo}`]);
      }
    }
    d.pages.forEach((p, i) => (p.pageNumber = i === 0 ? 1 : i + 1));
    setDoc(d); setPlano(null); setPedidoAdd(''); setSaved(false); setGerando(false);
    setLogs((l) => [...l, `— Manual tem agora ${d.pages.length} páginas. Guarda para manter.`]);
  }

  async function reverManual() {
    if (!doc || doc.pages.length === 0) return;
    const uc = UCS.find((u) => u.code === doc.unitCode); if (!uc) return;
    const comp = competenciasDaUC(uc.code);
    pararRef.current = false; setGerando(true); setSaved(false); setLogs(['— A rever e melhorar capítulo a capítulo…']);
    const d: DocumentoManual = { ...doc, pages: [...doc.pages] };
    // pontos por título, a partir do índice guardado (para reescrever capítulos por acabar)
    const pontosPorTitulo: Record<string, string[]> = {};
    const titulosIndice: string[] = [];
    (d.indice || indiceTxt.split('\n')).map((l) => (l || '').trim()).filter(Boolean).forEach((l) => {
      const j = l.indexOf('—'); const tit = (j >= 0 ? l.slice(0, j) : l).trim();
      titulosIndice.push(tit);
      pontosPorTitulo[tit.toLowerCase()] = j >= 0 ? l.slice(j + 1).split(';').map((x) => x.trim()).filter(Boolean) : [];
    });
    setProg({ done: 0, total: d.pages.length });
    let primeiro = true;
    for (let i = 0; i < d.pages.length && !pararRef.current; i++) {
      if (!primeiro) await esperar(THROTTLE_MS);
      primeiro = false;
      const orig = d.pages[i];
      const porAcabar = (orig as any).incompleto === true;
      const outros = d.pages.filter((_, k) => k !== i).map((p) => p.title);
      const prompt = porAcabar
        ? buildChapterPrompt(uc, orig.title, pontosPorTitulo[orig.title.toLowerCase()] || [], titulosIndice.length ? titulosIndice : d.pages.map((p) => p.title), outros, 'capitulo', comp, '', 1)
        : buildRevisaoPrompt(uc, orig, comp);
      const r = await chamarIA(prompt, 'openai');
      if (r.ok && r.data && typeof r.data === 'object' && (r.data.paragraphs || r.data.subsections || r.data.worksheetSections || r.data.tables) && substanciaPagina(r.data) >= 400) {
        const melhor: any = r.data; melhor.title = orig.title; melhor.pageNumber = orig.pageNumber; delete melhor.incompleto; delete melhor.continua;
        d.pages[i] = melhor; setDoc({ ...d });
        setLogs((l) => [...l, `✓ ${porAcabar ? 'Completado' : 'Revisto'}: ${orig.title}${r.fornecedor ? ` — via ${r.fornecedor}` : ''}`]);
      } else {
        setLogs((l) => [...l, `✗ ${orig.title.slice(0, 40)}… (${r.mensagem || r.motivo || 'sem melhoria'})`]);
      }
      setProg({ done: i + 1, total: d.pages.length });
    }
    setGerando(false); setSaved(false); setDoc({ ...d });
    setLogs((l) => [...l, '— Revisão terminada. Guarda para manter.']);
  }

  async function verificarCobertura() {
    if (!doc || doc.pages.length === 0) return;
    const uc = UCS.find((u) => u.code === doc.unitCode); if (!uc) return;
    setAVerificar(true); setCobertura(null); setLogs(['— A verificar cobertura vs referencial…']);
    const resumo = doc.pages.map((p) => '- ' + p.title + (p.subtitle ? ': ' + p.subtitle : '')).join('\n');
    const r = await chamarIA(buildCoberturaPrompt(uc, resumo), 'gemini');
    setAVerificar(false);
    if (r.ok && r.data && Array.isArray(r.data.em_falta)) { setCobertura(r.data); setLogs((l) => [...l, `✓ Cobertura verificada — ${r.data.em_falta.length} em falta.`]); }
    else setLogs((l) => [...l, `✗ Não consegui verificar (${r.mensagem || r.motivo || 'erro'}).`]);
  }

  const btn = (bg: string, color = '#fff'): React.CSSProperties => ({ padding: '9px 15px', borderRadius: 8, border: 'none', background: bg, color, fontWeight: 600, fontSize: 13, cursor: 'pointer' });
  const ghost: React.CSSProperties = { padding: '8px 14px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' };
  const uc = UCS.find((u) => u.code === selCode);
  const capsAtual = indiceTxt.split('\n').map((x) => x.trim()).filter(Boolean);
  const totalPrevisto = capsAtual.length ? capsAtual.length + 4 : 0;
  const faltam = doc && doc.unitCode === selCode ? Math.max(0, totalPrevisto - doc.pages.length) : 0;

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
          <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>Os manuais ficam guardados neste navegador. Para um ficheiro, abre um manual e usa Exportar Word ou PDF.</p>
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
            <select value={selCode} onChange={(e) => setSelCode(e.target.value)} disabled={gerando || aFazerIndice} style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, marginBottom: 10 }}>
              {UCS.map((u) => <option key={u.code} value={u.code}>{u.code} — {u.ref.nome}</option>)}
            </select>
            {uc && <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 12px' }}>Tipo: {uc.kind}. A app desenha o índice, tu revês, e depois gera os capítulos sozinha (Gemini — deixa a aba aberta).</p>}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {gerando ? (
                <button style={btn('#dc2626')} onClick={() => (pararRef.current = true)}>Parar</button>
              ) : (
                <button style={btn(ROXO)} disabled={aFazerIndice} onClick={gerarIndice}>{aFazerIndice ? 'A desenhar índice…' : (faseIndice ? '↻ Refazer índice' : '1. Desenhar índice')}</button>
              )}
              {faseIndice && !gerando && <button style={btn(ROXO)} onClick={() => gerarCapitulos(false)}>2. Gerar manual ▶</button>}
              {!gerando && !!doc && doc.unitCode === selCode && doc.pages.length > 0 && faltam > 0 && <button style={btn(ROXO)} onClick={() => gerarCapitulos(true)}>Continuar (faltam {faltam})</button>}
              {doc && doc.pages.length > 0 && !gerando && <>
                <button style={ghost} onClick={() => setModo('ver')}>Ver ({doc.pages.length})</button>
                <button style={btn(ROXO)} onClick={guardar}>Guardar</button>
              </>}
            </div>

            {faseIndice && (
              <div style={{ marginTop: 12 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Índice — revê e edita (uma linha por capítulo: Título — ponto; ponto; ponto)</label>
                <textarea value={indiceTxt} onChange={(e) => setIndiceTxt(e.target.value)} disabled={gerando} style={{ width: '100%', height: 190, borderRadius: 8, border: '1px solid #d1d5db', padding: 10, fontSize: 13, lineHeight: 1.5 }} />
                <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Cada linha é um capítulo: título, um travessão “—”, e os pontos a trabalhar separados por “;”. Acrescenta ou tira pontos — a IA fica obrigada a cobri-los. Corrige aqui o âmbito. Depois clica “2. Gerar manual”.</p>
              </div>
            )}

            {prog.total > 0 && gerando && (
              <div style={{ marginTop: 12 }}>
                <div style={{ height: 8, borderRadius: 6, background: '#eee', overflow: 'hidden' }}><div style={{ height: '100%', width: `${(prog.done / prog.total) * 100}%`, background: ROXO, transition: 'width .2s' }} /></div>
                <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{prog.done} de {prog.total}</p>
              </div>
            )}
            {saved && <p style={{ fontSize: 12, color: '#0a7d2c', marginTop: 8 }}>✓ Guardado em Manuais Guardados.</p>}

            <div style={{ marginTop: 12, borderTop: '1px solid #f0f0f0', paddingTop: 10 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Modo automático — fila de manuais (um a um, do início ao fim)</label>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 6px' }}>Escolhe as UCs (Ctrl/Cmd para várias). A app gera cada manual completo, grava a cada capítulo, e passa ao seguinte. Retoma o que ficou por acabar. Deixa a aba aberta.</p>
              <select multiple value={filaSel} onChange={(e) => setFilaSel(Array.from(e.target.selectedOptions).map((o) => o.value))} disabled={filaAtiva || gerando} style={{ width: '100%', height: 140, borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, padding: 6 }}>
                {UCS.map((u) => <option key={u.code} value={u.code}>{u.code} — {u.ref.nome}</option>)}
              </select>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {filaAtiva ? (
                  <button style={btn('#dc2626')} onClick={() => (pararRef.current = true)}>Parar fila</button>
                ) : (
                  <button style={btn(ROXO)} disabled={!filaSel.length || gerando} onClick={() => correrFila(filaSel)}>▶ Gerar fila ({filaSel.length})</button>
                )}
                <button style={{ ...ghost, fontSize: 12 }} disabled={filaAtiva} onClick={() => setFilaSel(UCS.map((u) => u.code))}>Selecionar todas</button>
                <button style={{ ...ghost, fontSize: 12 }} disabled={filaAtiva} onClick={() => setFilaSel([])}>Limpar</button>
              </div>
            </div>

            <div style={{ marginTop: 12, borderTop: '1px solid #f0f0f0', paddingTop: 10 }}>
              <button style={{ ...ghost, fontSize: 12 }} onClick={() => setColarAberto(!colarAberto)}>{colarAberto ? '▾' : '▸'} Modo manual (IA externa) — se a Gemini esgotar</button>
              {colarAberto && (
                <div style={{ marginTop: 8 }}>
                  <button style={{ ...ghost, marginBottom: 8 }} onClick={copiarMestre}>{copiado ? 'Copiado ✓' : 'Copiar prompt-mestre'}</button>
                  <textarea value={colarTxt} onChange={(e) => setColarTxt(e.target.value)} placeholder='Cola aqui um capítulo (JSON) devolvido pela IA externa' style={{ width: '100%', height: 110, borderRadius: 8, border: '1px solid #d1d5db', padding: 8, fontSize: 12, fontFamily: 'monospace' }} />
                  <button style={btn(ROXO)} onClick={adicionar}>Juntar ao manual</button>
                </div>
              )}
            </div>
          </div>

          {logs.length > 0 && <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: 10, maxHeight: 240, overflow: 'auto', fontSize: 12, fontFamily: 'monospace' }}>{logs.map((l, i) => <div key={i} style={{ color: l.startsWith('✗') ? '#dc2626' : (l.startsWith('—') || l.startsWith('ℹ')) ? '#b45309' : '#374151', padding: '1px 0' }}>{l}</div>)}</div>}
        </div>
      )}

      {modo === 'ver' && doc && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <h2 style={{ flex: 1, fontSize: 18, fontWeight: 700, margin: 0 }}>{doc.unitCode} — {doc.fullTitle}</h2>
            <button style={ghost} onClick={() => { try { exportManualPdf(doc as any); } catch (e: any) { alert('Erro ao exportar PDF: ' + (e?.message || e)); } }}>Exportar PDF</button>
            <button style={ghost} onClick={() => { try { downloadManualDoc(doc as any); } catch (e: any) { alert('Erro ao exportar Word: ' + (e?.message || e)); } }}>Exportar Word</button>
            <button style={ghost} disabled={gerando || aVerificar} onClick={reverManual}>{gerando ? 'A rever…' : '✨ Rever (melhorar)'}</button>
            <button style={ghost} disabled={gerando || aVerificar} onClick={verificarCobertura}>{aVerificar ? 'A verificar…' : 'Verificar cobertura'}</button>
            <button style={btn(ROXO)} onClick={guardar}>{saved ? 'Guardar (atualizar)' : 'Guardar'}</button>
          </div>
          <p style={{ fontSize: 12, color: saved ? '#0a7d2c' : '#6b7280', marginBottom: 14 }}>{saved ? '✓ Em Manuais Guardados. Exporta em Word/PDF para um ficheiro.' : 'Ainda não guardado. Clica Guardar, ou exporta em Word/PDF.'}</p>
          <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Completar este manual</label>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 8px' }}>Escreve o que falta. A IA decide se cria um capítulo novo (e onde entra, pela ordem certa) ou se expande um existente.</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input value={pedidoAdd} onChange={(e) => setPedidoAdd(e.target.value)} placeholder="ex.: falta falar dos molhos base" disabled={gerando || aPlanear} style={{ flex: 1, minWidth: 220, padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13 }} />
              <button style={btn(ROXO)} disabled={gerando || aPlanear || !pedidoAdd.trim()} onClick={planear}>{aPlanear ? 'A planear…' : 'Planear inserção'}</button>
            </div>
            {plano && (
              <div style={{ marginTop: 10, background: '#f8f7ff', border: '1px solid #ece9fd', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 13 }}>
                  {plano.accao === 'novo' && <span>➕ Novo capítulo <b>“{plano.titulo}”</b>, a seguir ao capítulo {plano.aposNumero}.</span>}
                  {plano.accao === 'expandir' && <span>✎ Expandir o capítulo {plano.alvoNumero} <b>“{doc.pages[Math.max(0, (Number(plano.alvoNumero) || 1) - 1)]?.title}”</b>.</span>}
                  {plano.accao === 'nao_faz_sentido' && <span>⚠ A IA acha que não encaixa nesta UC.</span>}
                </div>
                {plano.justificacao && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{plano.justificacao}</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  {plano.accao !== 'nao_faz_sentido' && <button style={btn(ROXO)} disabled={gerando} onClick={confirmarAcrescento}>Confirmar e gerar</button>}
                  <button style={ghost} disabled={gerando} onClick={() => setPlano(null)}>Cancelar</button>
                </div>
              </div>
            )}
            {logs.length > 0 && <div style={{ marginTop: 8, fontSize: 12, fontFamily: 'monospace', maxHeight: 120, overflow: 'auto' }}>{logs.slice(-6).map((l, i) => <div key={i} style={{ color: l.startsWith('✗') ? '#dc2626' : (l.startsWith('—') || l.startsWith('ℹ')) ? '#b45309' : '#374151' }}>{l}</div>)}</div>}
          </div>
          {cobertura && (
            <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <b style={{ color: ROXO }}>Cobertura do referencial</b>
              {cobertura.em_falta && cobertura.em_falta.length ? (
                <>
                  <p style={{ fontSize: 13, margin: '6px 0 4px' }}>Ainda por cobrir:</p>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>{cobertura.em_falta.map((x: string, i: number) => <li key={i} style={{ marginBottom: 3 }}>{x}</li>)}</ul>
                  {cobertura.sugestao && <p style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>💡 {cobertura.sugestao}</p>}
                  <p style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>Podes usar “Completar este manual” acima para acrescentar o que falta.</p>
                </>
              ) : <p style={{ fontSize: 13, color: '#0a7d2c', marginTop: 6 }}>✓ O manual cobre as competências do referencial.</p>}
            </div>
          )}
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

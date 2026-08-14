// src/components/ManuaisAluno.tsx
// Gerador de Manuais do Aluno por UC — escrito como um professor de cozinha
// explica antes da aula prática, para alunos com dificuldades. Usa o
// referencial oficial já na app como fundamento, gera página a página pela
// função /api/gerarPaginaManual e guarda em localStorage.
// NOVIDADES: preview visual em tempo real (painel lateral) + botão Reorganizar.

import React, { useState, useEffect, useRef } from 'react';
import { REFERENCIAL_811RA144, ReferencialUC } from '../referencial811RA144';
import {
  ManualDocument, ManualPage,
  buildPreviewHtml, buildManualHtml, buildPdfHtml,
  reorganizarManual,
} from '../exportManualDoc';

// ── cores UI ──────────────────────────────────────────────────────────────────
const BRAND = '#1aa1af';
const LIGHT = '#d9f2f4';
const LINE  = '#b3e0e4';
const SOFT  = '#f0fbfc';
const ROXO  = '#7C3AED';

const ANO_LETIVO   = '2026-2027';
const SCHOOL_LABEL = 'Curso Profissional de Técnico de Cozinha e Restauração';
const FOOTER = { date: 'Data: 01 / 09 / 2016', reference: 'ECL.GPC.015.2', revision: 'Revisão: 02 / 07 / 2021' };

const EXCLUIR    = ['UC03578', 'UC03579'];
const SERVICE_UCS = ['UC03580', 'UC03581', 'UC03582', 'UC03583', 'UC00595'];
const PRODUCT_UCS = ['UC01999', 'UC02002', 'UC02003', 'UC02004', 'UC02005', 'UC03577', 'UC03585', 'UC03586'];

interface UCItem { code: string; ref: ReferencialUC; kind: 'produto' | 'serviço' | 'processo' }
const UCS: UCItem[] = Object.entries(REFERENCIAL_811RA144)
  .filter(([code, r]) => !EXCLUIR.includes(code) && r.bloco !== 'fct')
  .sort((a, b) => a[1].ordemECL - b[1].ordemECL)
  .map(([code, ref]) => ({
    code, ref,
    kind: SERVICE_UCS.includes(code) ? 'serviço' : PRODUCT_UCS.includes(code) ? 'produto' : 'processo',
  }));

// ── utilitários ───────────────────────────────────────────────────────────────
function esc(s: any): string {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function ucNumber(code: string): number { const m = code.match(/(\d+)/); return m ? Number(m[1]) : 0; }
function fileNameFor(doc: ManualDocument, ext: string): string {
  const safe = doc.fullTitle.replace(/[^\w\s\u00c0-\u00ff-]/g, '').replace(/\s+/g, '_');
  return `${doc.unitNumber}_Guiao_${safe}_SCP_CR.${ext}`;
}

// ── sequência de tópicos ──────────────────────────────────────────────────────
function buildTopics(uc: UCItem): { topic: string; isIntro: boolean; isWs: boolean }[] {
  const t: { topic: string; isIntro: boolean; isWs: boolean }[] = [];
  t.push({ topic: `Introdução: o que é a UC "${uc.ref.nome}", para que serve e o que o aluno vai aprender`, isIntro: true, isWs: false });
  (uc.ref.conhecimentos || []).forEach((c) => t.push({ topic: `Conhecimento: ${c}`, isIntro: false, isWs: false }));
  (uc.ref.realizacoes || []).forEach((r) => t.push({ topic: `Na prática (realização): ${r}`, isIntro: false, isWs: false }));
  t.push({ topic: 'Síntese e critérios de desempenho: como saber se o trabalho está bem feito', isIntro: false, isWs: false });
  t.push({ topic: 'Folha de trabalho 1: exercício prático sobre os conteúdos da UC', isIntro: false, isWs: true });
  t.push({ topic: 'Folha de trabalho 2: exercício de revisão e autoavaliação', isIntro: false, isWs: true });
  return t;
}

// ── prompt ────────────────────────────────────────────────────────────────────
function buildPagePrompt(uc: UCItem, topic: string, covered: string[], tight: boolean, isIntro: boolean, isWs: boolean): string {
  const productLine = uc.kind === 'produto'
    ? 'PRODUTO: se a página trata um alimento, diz SEMPRE quais as variedades pelo nome (portuguesas e internacionais), como se reconhecem, limpam e cortam, e 2-3 receitas concretas. Nunca "vários tipos".'
    : `Esta UC é de ${uc.kind}, não de produto — não cries listas de variedades de alimentos nem de receitas; foca-te no ${uc.kind} concreto.`;
  const brevity = tight
    ? 'LIMITE RÍGIDO: no máximo 2 parágrafos curtos e SÓ UM de: uma tabela (até 3 linhas) OU um callout. Resposta muito curta.'
    : 'LIMITE RÍGIDO: no máximo 3 parágrafos curtos (2-3 frases). No máximo UMA tabela (até 4 linhas). No máximo UM callout. Se usares procedureSteps, no máximo 4 passos. Bullets até 5. Escolhe só 2-3 campos. Resposta curta.';
  const wsField  = isWs  ? ', "worksheetSections"?: [{ "title": string, "instructions"?: string, "prompts": [{ "prompt": string, "lines": number }] }]' : '';
  const dlgField = uc.kind === 'serviço' ? ', "dialogueBlocks"?: [{ "title": string, "instructions"?: string, "items": [{ "client": string, "response": string, "objective"?: string }] }]' : '';

  return `Produz APENAS um objeto JSON válido (sem markdown, sem crases, sem texto antes ou depois).

És um professor de cozinha e restauração com 20 anos de experiência, a escrever para alunos do secundário com dificuldades de aprendizagem, muitos que nunca entraram numa cozinha. Escreve UMA página de manual sobre o tópico indicado.

UC: ${uc.code} — ${uc.ref.nome} (tipo: ${uc.kind})

FUNDAMENTO OFICIAL DESTA UC (referencial 811RA144 — cobre isto de forma natural, sem citar):
Realizações: ${(uc.ref.realizacoes || []).join(' | ')}
Conhecimentos: ${(uc.ref.conhecimentos || []).join(' | ')}
Critérios de desempenho: ${(uc.ref.criteriosDesempenho || []).join(' | ')}

GABARITO DE PROFUNDIDADE (aplica sempre, por esta ordem):
1. Função: para que serve, onde se usa em cozinha/sala real
2. Ciência simples: uma frase sobre a física/química (Maillard >140 °C, desnaturação, osmose, emulsão — sem fórmulas)
3. Classificação COM NOMES PRÓPRIOS: nunca "existem vários tipos"; nomeia e quantifica (ex.: T45, T55, T65; escalfar 70-80 °C; fritar 175-190 °C)
4. Dados concretos: °C, %, rácios, tempos, pesos — o que o aluno vai mesmo medir
5. Uso profissional com exemplos de estabelecimentos portugueses
6. Passo a passo quando aplicável
7. Erros comuns e como evitá-los
8. Conservação e segurança (HACCP integrado, não à parte)
PROIBIDO: "é essencial", "existem vários tipos" sem nomear, "deve ter cuidado" sem dizer o quê.

TÓPICO DESTA PÁGINA (trata só isto):
${topic}

TÍTULOS JÁ ESCRITOS (não repetir estes temas):
${covered.length ? covered.map((c) => '- ' + c).join('\n') : '(nenhum)'}

ESTILO OBRIGATÓRIO:
- Uma ideia, explicada com clareza. Frases curtas. Cada termo técnico explicado à primeira vez.
- CONCRETO: nomes, graus (°C), minutos, pratos e utensílios pelo nome.
- ${productLine}
- Liga o conteúdo ao que o aluno vai mesmo fazer na cozinha/sala, com situações reais.
- Quando fizer sentido: 1-2 frases de origem histórica e 1-2 frases da ciência simples.
- Usa tabela quando a informação é comparativa. Callout só quando acrescenta.
- Português europeu. Sem meta-referências ("neste manual", "como vimos").
- ${brevity}
${isIntro ? '- Esta é a PÁGINA DE INTRODUÇÃO: apresenta a UC, para que serve e o que o aluno vai aprender. Título = "Introdução".' : ''}
${isWs ? '- Esta é uma FOLHA DE TRABALHO: usa worksheetSections com perguntas simples e diretas e espaço de resposta (lines).' : ''}

Devolve este objeto (só os campos que fizerem sentido):
{ "title": string, "subtitle"?: string, "paragraphs"?: string[], "calloutBoxes"?: [{ "type": "nota"|"aviso"|"dica"|"definicao", "content": string }], "bullets"?: string[], "tables"?: [{ "title": string, "columns": string[], "rows": string[][] }], "procedureSteps"?: { "title": string, "intro"?: string, "steps": [{ "label": string, "detail": string, "warning"?: string }] }${dlgField}, "consolidationBlock"?: { "title": string, "keyPoints": string[], "selfCheck"?: string[] }${wsField} }`;
}

// ── parse tolerante ───────────────────────────────────────────────────────────
function tryParse(clean: string): any {
  try { return JSON.parse(clean); } catch { /* */ }
  let s = clean.replace(/```json/g, '').replace(/```/g, '').trim();
  const i = s.indexOf('{'); const j = s.lastIndexOf('}');
  if (i >= 0) s = s.slice(i, j > i ? j + 1 : undefined);
  try { return JSON.parse(s); } catch { /* */ }
  const stack: string[] = []; let inStr = false, e = false;
  for (const c of s) {
    if (inStr) { if (e) e = false; else if (c === '\\') e = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === '{') stack.push('}'); else if (c === '[') stack.push(']');
    else if (c === '}' || c === ']') stack.pop();
  }
  s = s.replace(/[\s,]*$/, ''); while (stack.length) s += stack.pop();
  return JSON.parse(s);
}

// ── localStorage ──────────────────────────────────────────────────────────────
const KEY = (code: string) => `ecl_manual_aluno_${code}`;
function listSaved(): { code: string; title: string; pages: number }[] {
  const out: { code: string; title: string; pages: number }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('ecl_manual_aluno_')) {
      try {
        const d = JSON.parse(localStorage.getItem(k) || '') as ManualDocument;
        out.push({ code: d.unitCode, title: d.fullTitle, pages: d.pages.length });
      } catch { /* */ }
    }
  }
  return out.sort((a, b) => a.code.localeCompare(b.code));
}

// ── download / print ──────────────────────────────────────────────────────────
function downloadBlob(html: string, filename: string, mime: string) {
  const blob = new Blob([html], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function exportarPDF(doc: ManualDocument) {
  try {
    const html = buildPdfHtml(doc);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    let iframe = document.getElementById('__ecl_pdf_iframe') as HTMLIFrameElement | null;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = '__ecl_pdf_iframe';
      iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0;pointer-events:none;';
      document.body.append(iframe);
    }
    iframe.src = url;
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch (err) { alert('Erro ao gerar PDF: ' + String(err)); }
}

// ── componente principal ──────────────────────────────────────────────────────
export function ManuaisAluno({ nomeProfessor: _nome }: { nomeProfessor?: string }) {
  const [modo, setModo]         = useState<'lista' | 'gerar' | 'ver'>('lista');
  const [lista, setLista]       = useState(listSaved());
  const [selCode, setSelCode]   = useState(UCS[0]?.code || '');
  const [doc, setDoc]           = useState<ManualDocument | null>(null);
  const [gerando, setGerando]   = useState(false);
  const [prog, setProg]         = useState({ done: 0, total: 0 });
  const [logs, setLogs]         = useState<string[]>([]);
  const [saved, setSaved]       = useState(false);
  const [colarAberto, setColarAberto] = useState(false);
  const [colarTxt, setColarTxt] = useState('');
  const [mostrarPreview, setMostrarPreview] = useState(true);
  const pararRef = useRef(false);
  const previewRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => { setLista(listSaved()); }, [modo]);

  // actualizar preview sempre que doc muda
  useEffect(() => {
    if (!mostrarPreview || !doc || !previewRef.current) return;
    try {
      const html = buildPreviewHtml(doc);
      const iframe = previewRef.current;
      iframe.srcdoc = html;
    } catch { /* */ }
  }, [doc, mostrarPreview]);

  function novoDoc(uc: UCItem): ManualDocument {
    return {
      unitCode: uc.code, unitNumber: ucNumber(uc.code), fullTitle: uc.ref.nome,
      schoolLabel: SCHOOL_LABEL, academicYear: ANO_LETIVO,
      footerDate: FOOTER.date, footerReference: FOOTER.reference, footerRevision: FOOTER.revision,
      pages: [],
    };
  }

  async function gerar() {
    const uc = UCS.find((u) => u.code === selCode);
    if (!uc) return;
    pararRef.current = false; setGerando(true); setSaved(false); setLogs([]); setModo('gerar');
    const tasks = buildTopics(uc);
    setProg({ done: 0, total: tasks.length });
    const d = novoDoc(uc); const covered: string[] = [];

    for (let i = 0; i < tasks.length; i++) {
      if (pararRef.current) { setLogs((l) => [...l, '⏹ Parado.']); break; }
      const task = tasks[i]; let ok = false; let motivo = '';

      for (let att = 0; att < 2 && !ok; att++) {
        try {
          const prompt = buildPagePrompt(uc, task.topic, covered, att === 1, task.isIntro, task.isWs);
          const res  = await fetch('/api/gerarPaginaManual', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
          const data = await res.json();
          if (!data.ok) { motivo = data.motivo || 'erro'; if (motivo === 'limite_atingido' || motivo === 'sem_chave') att = 99; throw new Error(data.mensagem || motivo); }
          const page: ManualPage = { ...data.pagina, pageNumber: d.pages.length === 0 ? 1 : d.pages.length + 1 };
          if (task.isIntro && !page.title) page.title = 'Introdução';
          d.pages.push(page);
          covered.push(page.title + (page.subtitle ? ' / ' + page.subtitle : ''));
          setDoc({ ...d }); setLogs((l) => [...l, `✓ Pág. ${page.pageNumber}: ${page.title}`]); ok = true;
        } catch (e: any) {
          if (att >= 1 || motivo === 'limite_atingido' || motivo === 'sem_chave')
            setLogs((l) => [...l, `✗ ${task.topic.slice(0, 50)}… (${e.message})`]);
        }
      }
      setProg({ done: i + 1, total: tasks.length });
      if (motivo === 'limite_atingido' || motivo === 'sem_chave') {
        setLogs((l) => [...l, motivo === 'sem_chave'
          ? '— Falta configurar GEMINI_API_KEY na Vercel. Podes gerar noutra IA e colar o JSON (botão abaixo).'
          : '— Limite grátis da Gemini atingido. Tenta mais tarde, ou gera noutra IA e cola o JSON.']);
        break;
      }
      // throttle leve entre pedidos
      await new Promise<void>((res) => {
        const start = Date.now();
        const tick = () => { if (pararRef.current || Date.now() - start >= 6500) res(); else setTimeout(tick, 250); };
        tick();
      });
    }
    setGerando(false);
    if (d.pages.length > 0) { setDoc({ ...d }); setLogs((l) => [...l, `— ${d.pages.length} páginas geradas. Podes guardar.`]); }
  }

  function guardar() {
    if (!doc || doc.pages.length === 0) return;
    try { localStorage.setItem(KEY(doc.unitCode), JSON.stringify(doc)); setSaved(true); setLista(listSaved()); setLogs((l) => [...l, '💾 Guardado.']); }
    catch (e: any) { setLogs((l) => [...l, '✗ Falha ao guardar: ' + e.message]); }
  }

  function abrir(code: string) {
    try { const d = JSON.parse(localStorage.getItem(KEY(code)) || '') as ManualDocument; setDoc(d); setSaved(true); setModo('ver'); } catch { /* */ }
  }
  function apagar(code: string) { localStorage.removeItem(KEY(code)); setLista(listSaved()); }

  function reorganizar() {
    if (!doc) return;
    const d = reorganizarManual(doc);
    setDoc(d); setSaved(false);
    setLogs((l) => [...l, `↕ Reorganizado: ${d.pages.length} páginas pela ordem do índice.`]);
  }

  function importarColado() {
    const uc = UCS.find((u) => u.code === selCode); if (!uc) return;
    try {
      const parsed = tryParse(colarTxt);
      const arr: ManualPage[] = Array.isArray(parsed) ? parsed : (parsed.pages || parsed.paginas || [parsed]);
      const d = doc && doc.unitCode === uc.code ? { ...doc, pages: [...doc.pages] } : novoDoc(uc);
      arr.forEach((p) => { p.pageNumber = d.pages.length === 0 ? 1 : d.pages.length + 1; d.pages.push(p); });
      d.pages.forEach((p, idx) => (p.pageNumber = idx === 0 ? 1 : idx + 1));
      setDoc(d); setColarAberto(false); setColarTxt(''); setModo('ver'); setSaved(false);
    } catch (e: any) { alert('JSON inválido: ' + e.message); }
  }

  function copiarPromptUC() {
    const uc = UCS.find((u) => u.code === selCode); if (!uc) return;
    const tasks = buildTopics(uc);
    const p = `Vais escrever um MANUAL DO ALUNO completo para a UC ${uc.code} — ${uc.ref.nome}.\n\n` +
      buildPagePrompt(uc, '(ver lista de tópicos abaixo)', [], false, false, false).split('TÓPICO DESTA PÁGINA')[0] +
      `\nESCREVE UMA PÁGINA POR CADA TÓPICO, POR ORDEM:\n${tasks.map((t, i) => `${i + 1}. ${t.topic}`).join('\n')}\n\n` +
      `Devolve um ARRAY JSON de páginas, cada uma no formato { "title", "paragraphs"?, "calloutBoxes"?, "bullets"?, "tables"?, "procedureSteps"?, "consolidationBlock"?, "worksheetSections"? }.`;
    navigator.clipboard?.writeText(p).catch(() => {});
    setLogs((l) => [...l, '📋 Prompt copiado — cola numa IA externa (Gemini/ChatGPT/Claude).']);
  }

  // ── estilos ────────────────────────────────────────────────────────────────
  const btn = (bg: string, color = '#fff'): React.CSSProperties =>
    ({ padding: '8px 14px', borderRadius: 8, border: 'none', background: bg, color, fontWeight: 600, fontSize: 13, cursor: 'pointer' });
  const ghost: React.CSSProperties =
    { padding: '8px 14px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' };
  const tabBtn = (active: boolean): React.CSSProperties =>
    ({ ...ghost, background: active ? '#f3f0fd' : '#fff', color: active ? ROXO : '#6b7280', borderColor: active ? ROXO : '#e5e7eb' });

  const uc = UCS.find((u) => u.code === selCode);

  // ── layout com preview ─────────────────────────────────────────────────────
  const temDoc   = doc && doc.pages.length > 0;
  const showSide = mostrarPreview && temDoc;

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", color: '#1f2937', height: '100%' }}>
      {/* tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', padding: '0 4px' }}>
        {(['lista', 'gerar'] as const).map((m) => (
          <button key={m} onClick={() => setModo(m)} style={tabBtn(modo === m)}>
            {m === 'lista' ? 'Manuais Guardados' : 'Gerar Manual'}
          </button>
        ))}
        {doc && <button onClick={() => setModo('ver')} style={tabBtn(modo === 'ver')}>Ver / Exportar</button>}
        {temDoc && (
          <button
            onClick={() => setMostrarPreview((v) => !v)}
            style={{ ...ghost, marginLeft: 'auto', color: mostrarPreview ? BRAND : '#6b7280', borderColor: mostrarPreview ? BRAND : '#e5e7eb' }}
          >
            {mostrarPreview ? '▣ Ocultar preview' : '▣ Mostrar preview'}
          </button>
        )}
      </div>

      {/* layout 2 colunas quando preview activo */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '0 4px' }}>
        {/* painel esquerdo — controlos */}
        <div style={{ flex: showSide ? '0 0 420px' : '1', minWidth: 0 }}>

          {/* ── LISTA ── */}
          {modo === 'lista' && (
            <div>
              <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>
                Os manuais ficam guardados neste navegador. Para partilhar ou imprimir, abre um manual e exporta em Word ou PDF.
              </p>
              {lista.length === 0
                ? <p style={{ color: '#6b7280' }}>Ainda não há manuais. Vai a <b>Gerar Manual</b>.</p>
                : (
                  <div style={{ border: '1px solid #eee', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
                    {lista.map((m) => (
                      <div key={m.code} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid #f1f1f1' }}>
                        <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => abrir(m.code)}>
                          <div style={{ fontWeight: 600 }}><span style={{ color: ROXO }}>{m.code}</span> — {m.title}</div>
                          <div style={{ fontSize: 12, color: m.pages === 0 ? '#dc2626' : '#6b7280' }}>
                            {m.pages === 0 ? '⚠ 0 páginas' : `${m.pages} páginas`}
                          </div>
                        </div>
                        <button style={ghost} onClick={() => abrir(m.code)}>Abrir</button>
                        <button style={{ ...ghost, color: '#dc2626' }} onClick={() => apagar(m.code)}>Apagar</button>
                      </div>
                    ))}
                  </div>
                )
              }
            </div>
          )}

          {/* ── GERAR ── */}
          {modo === 'gerar' && (
            <div>
              <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: 16, marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Unidade de competência</label>
                <select
                  value={selCode} onChange={(e) => setSelCode(e.target.value)} disabled={gerando}
                  style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, marginBottom: 8 }}
                >
                  {UCS.map((u) => <option key={u.code} value={u.code}>{u.code} — {u.ref.nome}</option>)}
                </select>
                {uc && (
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 10px' }}>
                    {buildTopics(uc).length} páginas · tipo: {uc.kind} · gera pela Gemini (deixa a aba aberta).
                  </p>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {!gerando
                    ? <button style={btn(ROXO)} onClick={gerar}>▶ Iniciar geração</button>
                    : <button style={btn('#dc2626')} onClick={() => { pararRef.current = true; }}>⏹ Parar</button>
                  }
                  {doc && doc.pages.length > 0 && <>
                    <button style={ghost} disabled={gerando} onClick={() => setModo('ver')}>Ver ({doc.pages.length})</button>
                    <button style={btn(ROXO)} disabled={gerando} onClick={guardar}>💾 Guardar</button>
                  </>}
                  <button style={ghost} disabled={gerando} onClick={copiarPromptUC}>📋 Copiar prompt</button>
                  <button style={ghost} disabled={gerando} onClick={() => setColarAberto(!colarAberto)}>Colar JSON</button>
                </div>
                {saved && <p style={{ fontSize: 12, color: '#0a7d2c', marginTop: 8 }}>✓ Guardado em Manuais Guardados.</p>}
                {colarAberto && (
                  <div style={{ marginTop: 10 }}>
                    <textarea
                      value={colarTxt} onChange={(e) => setColarTxt(e.target.value)}
                      placeholder="Cola aqui o array JSON de páginas gerado noutra IA…"
                      style={{ width: '100%', height: 120, borderRadius: 8, border: '1px solid #d1d5db', padding: 8, fontSize: 12, fontFamily: 'monospace' }}
                    />
                    <button style={btn(ROXO)} onClick={importarColado}>Adicionar páginas</button>
                  </div>
                )}
              </div>

              {/* barra de progresso */}
              {prog.total > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ height: 8, borderRadius: 6, background: '#eee', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(prog.done / prog.total) * 100}%`, background: ROXO, transition: 'width .2s' }} />
                  </div>
                  <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{prog.done} de {prog.total}</p>
                </div>
              )}

              {/* log */}
              {logs.length > 0 && (
                <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: 10, maxHeight: 280, overflow: 'auto', fontSize: 12, fontFamily: 'monospace' }}>
                  {logs.map((l, i) => (
                    <div key={i} style={{ color: l.startsWith('✗') ? '#dc2626' : l.startsWith('—') ? '#b45309' : '#374151', padding: '1px 0' }}>{l}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── VER / EXPORTAR ── */}
          {modo === 'ver' && doc && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                <h2 style={{ flex: 1, fontSize: 16, fontWeight: 700, margin: 0 }}>{doc.unitCode} — {doc.fullTitle}</h2>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                <button style={ghost} onClick={() => {
                  try {
                    const html = buildPdfHtml(doc);
                    const b = new Blob([html], { type: 'text/html;charset=utf-8' });
                    const u = URL.createObjectURL(b);
                    let iframe = document.getElementById('__ecl_pdf_iframe') as HTMLIFrameElement | null;
                    if (!iframe) {
                      iframe = document.createElement('iframe');
                      iframe.id = '__ecl_pdf_iframe';
                      iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0;pointer-events:none;';
                      document.body.append(iframe);
                    }
                    iframe.src = u;
                    setTimeout(() => URL.revokeObjectURL(u), 10000);
                  } catch (err) { alert('Erro PDF: ' + String(err)); }
                }}>📄 Exportar PDF</button>
                <button style={ghost} onClick={() => {
                  try { downloadBlob(buildManualHtml(doc), fileNameFor(doc, 'doc'), 'application/msword;charset=utf-8'); }
                  catch (err) { alert('Erro Word: ' + String(err)); }
                }}>📝 Exportar Word</button>
                <button style={btn(BRAND)} onClick={reorganizar} title="Renumera e ordena os capítulos pela sequência do índice">↕ Reorganizar</button>
                <button style={btn(ROXO)} onClick={guardar}>{saved ? 'Guardar (atualizar)' : '💾 Guardar'}</button>
              </div>
              <p style={{ fontSize: 12, color: saved ? '#0a7d2c' : '#6b7280', marginBottom: 10 }}>
                {saved ? '✓ Em Manuais Guardados. Exporta em Word/PDF para partilhar.' : 'Ainda não guardado. Clica Guardar, ou exporta directamente.'}
              </p>

              {/* lista de capítulos compacta */}
              <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 10, overflow: 'hidden' }}>
                {doc.pages.map((page, idx) => (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 14px', borderBottom: idx < doc.pages.length - 1 ? '1px solid #f1f1f1' : undefined,
                    background: page.incompleto ? '#fff8f0' : idx % 2 === 0 ? '#fff' : '#fafafa',
                  }}>
                    <span style={{ fontSize: 11, color: '#999', minWidth: 22 }}>{page.pageNumber}</span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: idx === 0 ? 700 : 400, color: page.incompleto ? '#e65100' : '#1f2937' }}>
                      {page.incompleto ? '⚠ ' : ''}{page.title}
                    </span>
                    {page.subtitle && <span style={{ fontSize: 11, color: '#6b7280' }}>{page.subtitle}</span>}
                  </div>
                ))}
              </div>

              {logs.length > 0 && (
                <div style={{ marginTop: 10, background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: 10, maxHeight: 160, overflow: 'auto', fontSize: 12, fontFamily: 'monospace' }}>
                  {logs.map((l, i) => (
                    <div key={i} style={{ color: l.startsWith('✗') ? '#dc2626' : l.startsWith('—') ? '#b45309' : '#374151', padding: '1px 0' }}>{l}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── PREVIEW LATERAL ── */}
        {showSide && (
          <div style={{ flex: 1, minWidth: 0, position: 'sticky', top: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: BRAND }}>Preview do documento</span>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>— actualiza automaticamente</span>
            </div>
            <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, overflow: 'hidden', background: '#e5e7eb' }}>
              <iframe
                ref={previewRef}
                title="preview-manual"
                style={{ width: '100%', height: 700, border: 'none', display: 'block' }}
                sandbox="allow-same-origin"
              />
            </div>
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, textAlign: 'center' }}>
              Para imprimir ou guardar como PDF, usa o botão «Exportar PDF» no painel esquerdo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ManuaisAluno;

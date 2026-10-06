// ============================================================
// A aplicação em inglês, para um aluno que só fala inglês
// (Rosa, 6/out/2026: «tudo o que ele fizer na aplicação seja em inglês,
// para já; depois posso retirar»).
// ============================================================
// A aplicação está toda escrita em português. Em vez de traduzir cada ecrã
// à mão, o texto que aparece no ecrã do aluno é traduzido pela IA da
// aplicação (/api/ia) e guardado no aparelho: cada frase só se pede uma vez.
// Enquanto a tradução não chega, fica o português (nada bloqueia).
// O professor liga e desliga no Mapa da turma, na ficha do aluno.
// ============================================================
import { pedirAIA } from './ia';

const KEY_CACHE = 'ecl_traducao_en_v1';
const NAO_TRADUZIR = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'CODE', 'NOSCRIPT']);
const ATRIBUTOS = ['placeholder', 'title', 'aria-label'];

let cache: Record<string, string> = {};
try { cache = JSON.parse(localStorage.getItem(KEY_CACHE) || '{}'); } catch { cache = {}; }
/** O que já está em inglês (para não voltar a traduzir o que se traduziu). */
const jaEmIngles = new Set<string>(Object.values(cache));
/** O texto original de cada nó, para repor o português ao desligar. */
const originais = new WeakMap<Node, string>();
const originaisAttr = new WeakMap<Element, Record<string, string>>();

let ativo = false;
let observador: MutationObserver | null = null;
const pendentes = new Set<string>();
const falhadas = new Map<string, number>();   // frase → quando falhou (não insistir logo)
let temporizador: ReturnType<typeof setTimeout> | null = null;
let aPedir = false;

const precisa = (s: string) => s.length > 1 && /[A-Za-zÀ-ÿ]/.test(s) && !jaEmIngles.has(s)
  && !(falhadas.has(s) && Date.now() - (falhadas.get(s) || 0) < 60000);

function dentroDeNaoTraduzir(n: Node | null): boolean {
  for (let e = n?.parentElement || null; e; e = e.parentElement) {
    if (NAO_TRADUZIR.has(e.tagName) || e.getAttribute('data-sem-traducao') !== null || e.isContentEditable) return true;
  }
  return false;
}

function traduzirTexto(no: Text): void {
  const atual = no.nodeValue || '';
  const s = atual.trim();
  if (!s || !precisa(s) || dentroDeNaoTraduzir(no)) return;
  const en = cache[s];
  if (en) {
    if (!originais.has(no)) originais.set(no, atual);
    no.nodeValue = atual.replace(s, en);
  } else { pendentes.add(s); agendar(); }
}

function traduzirAtributos(el: Element): void {
  for (const a of ATRIBUTOS) {
    const v = el.getAttribute(a);
    const s = (v || '').trim();
    if (!s || !precisa(s)) continue;
    const en = cache[s];
    if (en) {
      const o = originaisAttr.get(el) || {};
      if (!(a in o)) { o[a] = v as string; originaisAttr.set(el, o); }
      el.setAttribute(a, en);
    } else { pendentes.add(s); agendar(); }
  }
}

function percorrer(raiz: Node): void {
  if (raiz.nodeType === Node.TEXT_NODE) { traduzirTexto(raiz as Text); return; }
  if (!(raiz instanceof Element) && raiz !== document.body) return;
  const el = raiz as Element;
  if (NAO_TRADUZIR.has(el.tagName)) { traduzirAtributos(el); return; }
  traduzirAtributos(el);
  const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) traduzirTexto(n as Text);
    else traduzirAtributos(n as Element);
  }
}

function agendar(): void {
  if (temporizador || aPedir) return;
  temporizador = setTimeout(() => { temporizador = null; void pedirTraducoes(); }, 350);
}

async function pedirTraducoes(): Promise<void> {
  if (!ativo || aPedir || !pendentes.size) return;
  aPedir = true;
  const lote = [...pendentes].slice(0, 40);
  lote.forEach(s => pendentes.delete(s));
  try {
    const prompt = [
      'You translate the user interface of a Portuguese (European Portuguese) app used in a professional cooking school.',
      'The reader is a first-year vocational student who only speaks English. Use simple, clear English.',
      'Translate EACH string below. Keep numbers, times, dates as numbers, emojis, symbols, punctuation and people\'s names unchanged.',
      'Use standard English culinary terms. Keep the same tone (instructions to the student use "you").',
      'If a string is already English or is only a name or a code, return it unchanged.',
      'Answer ONLY with a JSON array of strings, with exactly the same number of items and in the same order. No comments.',
      '',
      JSON.stringify(lote),
    ].join('\n');
    const r = await pedirAIA(prompt, 6000);
    if (!r.ok) throw new Error(r.mensagem);
    const t = r.texto.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    const arr = JSON.parse(t.slice(t.indexOf('['), t.lastIndexOf(']') + 1));
    if (!Array.isArray(arr) || arr.length !== lote.length) throw new Error('resposta com outro tamanho');
    lote.forEach((s, i) => {
      const en = String(arr[i] ?? '').trim();
      if (en) { cache[s] = en; jaEmIngles.add(en); }
    });
    try { localStorage.setItem(KEY_CACHE, JSON.stringify(cache)); } catch { /* sem espaço: fica só nesta sessão */ }
  } catch {
    lote.forEach(s => falhadas.set(s, Date.now()));
  } finally {
    aPedir = false;
  }
  if (ativo) {
    percorrer(document.body);
    if (pendentes.size) agendar();
  }
}

/** Liga ou desliga a aplicação em inglês neste aparelho. */
export function ligarTraducaoIngles(ligar: boolean): void {
  if (typeof document === 'undefined' || ligar === ativo) return;
  ativo = ligar;
  if (ligar) {
    document.documentElement.lang = 'en';
    // O tradutor do navegador não traduz por cima.
    document.documentElement.setAttribute('translate', 'no');
    percorrer(document.body);
    observador = new MutationObserver(muts => {
      for (const m of muts) {
        if (m.type === 'characterData') traduzirTexto(m.target as Text);
        else if (m.type === 'attributes') traduzirAtributos(m.target as Element);
        else m.addedNodes.forEach(n => percorrer(n));
      }
    });
    observador.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATRIBUTOS });
  } else {
    observador?.disconnect(); observador = null;
    pendentes.clear();
    document.documentElement.lang = 'pt';
    document.documentElement.removeAttribute('translate');
    // Repor o português no que está à vista.
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      if (n.nodeType === Node.TEXT_NODE) { const o = originais.get(n); if (o != null) n.nodeValue = o; }
      else { const o = originaisAttr.get(n as Element); if (o) for (const a in o) (n as Element).setAttribute(a, o[a]); }
    }
  }
}

export function traducaoInglesLigada(): boolean { return ativo; }

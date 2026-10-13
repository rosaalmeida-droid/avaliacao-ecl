// ============================================================
// Armazenamento comprimido (Rosa, 13/out/2026)
// ============================================================
// O tablet da professora encheu: «O espaço da aplicação neste aparelho está
// cheio». O Safari dá a cada site 5 MB e, como os dados têm letras como «—»,
// conta 2 bytes por letra: cabem cerca de 2,6 milhões de letras, metade do
// que se julgava. As turmas da professora já passavam disso ao fim de um mês.
//
// Os textos grandes (as listas de notas, autoavaliações, presenças, planos…)
// passam a ser guardados comprimidos: ficam umas dez vezes mais pequenos. É
// feito aqui, por baixo de tudo, para o resto da aplicação continuar a ler e a
// gravar como sempre (localStorage.getItem / setItem devolvem o texto normal).
// ============================================================
import { deflateSync, inflateSync, strToU8, strFromU8 } from 'fflate';

/** O que marca um texto comprimido (nenhum dado normal começa por este sinal). */
const MARCA = '\u0001z1:';
/** Só se comprimem os textos grandes; os pequenos ficam como estão. */
const MINIMO = 20000;
/** O limite do Safari, em bytes. */
export const LIMITE_EM_BYTES = 5 * 1024 * 1024;

function paraBase64(u: Uint8Array): string {
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, Array.from(u.subarray(i, i + 0x8000)));
  return btoa(s);
}
function deBase64(b: string): Uint8Array {
  const s = atob(b);
  const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u;
}
export function comprimir(texto: string): string { return MARCA + paraBase64(deflateSync(strToU8(texto), { level: 6 })); }
export function descomprimir(guardado: string): string { return strFromU8(inflateSync(deBase64(guardado.slice(MARCA.length)))); }
export const estaComprimido = (v: string | null | undefined): boolean => !!v && v.charCodeAt(0) === 1 && v.startsWith(MARCA);

let lerOriginal: ((this: Storage, k: string) => string | null) | null = null;
/** O último texto aberto de cada chave: abrir um texto comprimido só uma vez. */
const abertos = new Map<string, { guardado: string; texto: string }>();

/** Bytes que um texto ocupa no Safari: 1 por letra, ou 2 se tiver letras como «—». */
function bytesDe(t: string): number { return /[^\u0000-ÿ]/.test(t) ? t.length * 2 : t.length; }

/** O espaço que a aplicação ocupa de facto neste aparelho (em bytes, como o Safari conta). */
export function bytesOcupados(): number {
  let total = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || '';
      const v = lerOriginal ? lerOriginal.call(localStorage, k) : localStorage.getItem(k);
      total += bytesDe(k) + bytesDe(v || '');
    }
  } catch { /* sem armazenamento */ }
  return total;
}

/** Instala a compressão (uma vez, antes de tudo). Comprime logo o que já lá está. */
export function instalarArmazenamentoComprimido(): void {
  if (lerOriginal || typeof Storage === 'undefined' || typeof btoa === 'undefined') return;
  const proto = Storage.prototype;
  const ler = proto.getItem, gravar = proto.setItem, tirar = proto.removeItem, limpar = proto.clear;
  lerOriginal = ler;
  proto.getItem = function (this: Storage, k: string): string | null {
    const v = ler.call(this, k);
    if (!estaComprimido(v)) return v;
    const a = abertos.get(k);
    if (a && a.guardado === v) return a.texto;
    try { const texto = descomprimir(v as string); abertos.set(k, { guardado: v as string, texto }); return texto; }
    catch (e) { console.error('Não consegui abrir', k, e); return null; }
  };
  proto.setItem = function (this: Storage, k: string, valor: string): void {
    const texto = String(valor);
    let guardar = texto;
    if (texto.length >= MINIMO) { try { guardar = comprimir(texto); } catch { guardar = texto; } }
    // Sem espaço, o erro continua a subir como antes (quem grava trata dele).
    gravar.call(this, k, guardar);
    if (guardar !== texto) abertos.set(k, { guardado: guardar, texto }); else abertos.delete(k);
  };
  proto.removeItem = function (this: Storage, k: string): void { abertos.delete(k); tirar.call(this, k); };
  proto.clear = function (this: Storage): void { abertos.clear(); limpar.call(this); };

  // O que já está guardado sem compressão comprime-se agora: é isto que
  // liberta o espaço num tablet que já encheu.
  try {
    const chaves: string[] = [];
    for (let i = 0; i < localStorage.length; i++) chaves.push(localStorage.key(i) || '');
    for (const k of chaves) {
      const v = ler.call(localStorage, k);
      if (v && v.length >= MINIMO && !estaComprimido(v)) {
        try { localStorage.setItem(k, v); } catch (e) { console.error('Não consegui comprimir', k, e); }
      }
    }
  } catch { /* sem armazenamento */ }
}

instalarArmazenamentoComprimido();

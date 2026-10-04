// ============================================================
// Escolher na Makro — janela para UM ingrediente (Rosa, out/2026)
// ============================================================
// Quando a aplicação não tem a certeza do produto (nome diferente, várias
// variações) ou não tem preço, o professor abre esta janela só para esse
// ingrediente, vê os produtos da Makro com esse nome e escolhe um. O preço
// (com IVA) entra na linha, só nessa requisição. A escolha vai para a
// coordenação («Preços a rever»): só passa a valer para todos quando a
// coordenação disser «manter definitivamente» (Rosa, out/2026).
// Neste aparelho fica só como lembrete («escolhido antes»), nunca automático.
// As regras são as das fichas: produtos em cru (os alunos é que cozinham),
// «sem sal» não dá «com sal», e sem dietas especiais se não se pedirem.
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { lerCatalogo, type Catalogo, type Produto } from './CatalogoMakro';

const KEY = 'ecl_escolhas_makro';
export interface EscolhaMakro { codigo: string; nome: string; embalagem: string; preco: number; und: string; em: string }

export function getEscolhasMakro(): Record<string, EscolhaMakro> {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}
export const chaveEscolha = (produto: string, und: string) => `${produto.trim().toLowerCase()}|${und}`;
function guardarEscolha(produto: string, e: EscolhaMakro) {
  const t = getEscolhasMakro(); t[chaveEscolha(produto, e.und)] = e;
  try { localStorage.setItem(KEY, JSON.stringify(t)); } catch { /* */ }
}

const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const VAZIAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'com', 'em', 'a', 'o', 'para', 'q', 'b', 'qb']);
const palavras = (t: string) => norm(t).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)
  .filter(w => w.length > 1 && !VAZIAS.has(w) && !/^\d/.test(w)).map(w => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w));
/** Palavras de produto já transformado: só servem se o ingrediente também as tiver. */
const PROCESSADO = new Set(palavras('cozido cozida assado assada frito frita panado panada preparado cozinhado recheado recheada molho sabor salada sumo pure doce compota tarte bolo gelado sobremesa pizza hamburguer nugget croquete rissol mistura aromatizado fumado marinado temperado biscoito bolacha snack lasanha refeicao sopa gratinado iogurte bebida topping recheio cobertura desidratado liofilizado cristalizado xarope aroma polpa nectar licor folhado queijo pate espetada lata conserva frasco'));
/** O que os alunos fazem na cozinha (cozer, picar, ralar…): não se procura na Makro. */
const DESCRITORES = new Set(palavras('cozido cozida cozidos cozidas picado picada ralado ralada cortado cortada fatiado fatiada laminado laminada descascado descascada limpo limpa cubo cubos juliana brunoise inteiro inteira fresco fresca cru crua batido batida derretido derretida'));
const DIETA = /sem glu|sem lact|vegan|\bbio\b|biologic|sem acucar|0% acucar/;
const sems = (t: string) => new Set((norm(t).match(/\b(?:sem|s\/)\s*(\w+)/g) || []).map(x => x.replace(/^(sem|s\/)\s*/, '')));

/** Quantidade em kg/L escrita num texto («10 X 9,8 Ml», «1 Kg», «500G»). */
export function qtdDeTexto(t: string): number | null {
  const e = norm(t).replace(/(\d),(\d)/g, '$1.$2');
  let m = e.match(/(\d+)\s*x\s*([\d.]+)\s*(kg|g|gr|l|lt|ml|cl)\b/) || null;
  let n = 1, q = 0, u = '';
  if (m) { n = +m[1]; q = +m[2]; u = m[3]; }
  else { m = e.match(/([\d.]+)\s*(kg|g|gr|l|lt|ml|cl)\b/); if (!m) return null; q = +m[1]; u = m[2]; }
  const f = ({ kg: 1, l: 1, lt: 1, g: 0.001, gr: 0.001, ml: 0.001, cl: 0.01 } as Record<string, number>)[u];
  return q > 0 ? n * q * f : null;
}
function qtdTotal(p: Produto): number | null {
  if (/^ca\.|ao peso/.test(norm(p[5] || ''))) return null;   // vende-se ao peso
  // «10 X 9,8 Ml» no nome: o nome manda; senão a embalagem, que conta os packs
  // («10 x 1 kg» com o preço do pack de 10).
  if (/\d+\s*x\s*[\d.,]+\s*(kg|g|gr|l|lt|ml|cl)\b/.test(norm(p[3]))) return qtdDeTexto(p[3]);
  return qtdDeTexto(p[5] || '') ?? qtdDeTexto(p[3]);
}
/** Preço com IVA por kg ou litro, calculado a partir da embalagem (o da Makro vem às vezes errado). */
export function precoKgMakro(p: Produto): number | null {
  if (p[7] == null) return null;
  // Limpeza, higiene, embalagens, consumíveis, equipamentos: a «embalagem» da Makro
  // é muitas vezes o peso do artigo; o preço por kg não serve (verificação de 4/10/2026).
  if (p[0] > 3) return null;
  // Bebidas: só quando o nome e a embalagem dizem o mesmo (as caixas de packs vêm mal).
  if (p[0] === 3 && !/^ca\.|ao peso/.test(norm(p[5] || ''))) {
    const a = qtdDeTexto(p[3]), b = qtdDeTexto(p[5] || '');
    if (!a || !b || Math.abs(a - b) / Math.max(a, b) > 0.05) return null;
  }
  const q = qtdTotal(p);
  if (q) return p[7] / q;
  if (p[8] === 'kg' || p[8] === 'L') return p[7];
  return p[10] != null && (p[11] === 'kg' || p[11] === 'L') ? p[10] : null;
}
/** Preço com IVA de uma unidade (ovos: a embalagem a dividir pelo nº de ovos). */
export function precoUnMakro(p: Produto): number | null {
  if (p[7] == null) return null;
  const t = norm(p[3]);
  const duz = t.match(/(\d+)\s*duzias?/); if (duz) return p[7] / (+duz[1] * 12);
  if (/\bduzia\b/.test(t)) return p[7] / 12;
  const un = t.match(/(\d+)\s*(?:un|unidades)\b/); if (un && +un[1] > 1) return p[7] / +un[1];
  return p[7];
}

export function candidatosMakro(cat: Catalogo, texto: string): Produto[] {
  const q = palavras(texto).filter(w => !DESCRITORES.has(w)); if (!q.length) return [];
  const pediu = new Set(q); const dietaPedida = DIETA.test(norm(texto)); const semPedido = sems(texto);
  return cat.produtos.filter(p => {
    if (p[0] > 3) return false;   // só alimentar e bebidas
    const w = new Set(palavras(p[3]));
    if (!q.every(x => [...w].some(y => y.startsWith(x)))) return false;
    if ([...w].some(y => PROCESSADO.has(y) && !pediu.has(y))) return false;
    if (!dietaPedida && (p[16] || []).length) return false;
    const sp = sems(p[3]); if ([...sp].some(x => !semPedido.has(x)) || [...semPedido].some(x => !sp.has(x))) return false;
    return true;
  }).sort((a, b) => (b[14] - a[14]) || ((precoKgMakro(a) ?? 9e9) - (precoKgMakro(b) ?? 9e9)));
}
/** Produtos já preparados (ex.: ovos cozidos) com esse nome: aparecem à parte,
 *  para quando for mesmo preciso comprá-los (Rosa, out/2026). */
export function preparadosMakro(cat: Catalogo, texto: string, jaListados: Set<string>): Produto[] {
  const todas = palavras(texto);
  const base = todas.filter(w => !DESCRITORES.has(w));
  const pedidas = todas.filter(w => DESCRITORES.has(w));   // ex.: «cozido» em «ovos cozidos»
  if (!base.length) return [];
  const dietaPedida = DIETA.test(norm(texto));
  const bate = (p: Produto) => { const w = palavras(p[3]); return pedidas.some(x => w.some(y => y.startsWith(x.slice(0, 5)))) ? 0 : 1; };
  return cat.produtos.filter(p => {
    if (p[0] > 3 || jaListados.has(p[15])) return false;
    const w = palavras(p[3]);
    if (!base.every(x => w.some(y => y.startsWith(x)))) return false;
    if (!dietaPedida && (p[16] || []).length) return false;
    return w.some(y => (PROCESSADO.has(y) || DESCRITORES.has(y)) && !base.includes(y));
  }).sort((a, b) => (bate(a) - bate(b)) || (b[14] - a[14]) || ((precoKgMakro(a) ?? 9e9) - (precoKgMakro(b) ?? 9e9)));
}

/** Ordena pelo preço que interessa à linha (por unidade ou por kg). */
export function candidatosParaLinha(cat: Catalogo, texto: string, und: string): Produto[] {
  const c = candidatosMakro(cat, texto);
  if (und !== 'un') return c;
  return c.sort((a, b) => (b[14] - a[14]) || ((precoUnMakro(a) ?? 9e9) - (precoUnMakro(b) ?? 9e9)));
}

const euro = (n: number) => n.toFixed(2).replace('.', ',') + ' €';

export function EscolherMakro({ produto, und, onEscolher, onFechar, podeDecidir = false }: {
  produto: string; und: string; onEscolher: (preco: number, e: EscolhaMakro, definitivo: boolean) => void; onFechar: () => void;
  /** A coordenadora (Rosa Almeida) pode deixar logo a escolha definitiva. */
  podeDecidir?: boolean;
}) {
  const [definitivo, setDefinitivo] = useState(false);
  const [cat, setCat] = useState<Catalogo | null | undefined>(undefined);
  const [texto, setTexto] = useState(produto.replace(/\s*\([^)]*\)/g, '').trim());
  useEffect(() => { lerCatalogo().then(setCat); }, []);
  const lista = useMemo(() => (cat ? candidatosParaLinha(cat, texto, und).slice(0, 5) : []), [cat, texto]);
  const preparados = useMemo(() => (cat ? preparadosMakro(cat, texto, new Set(lista.map(p => p[15]))).slice(0, 5) : []), [cat, texto, lista]);
  const anterior = getEscolhasMakro()[chaveEscolha(produto, und)];
  const porUn = und === 'un';

  function escolher(p: Produto) {
    const preco = porUn ? precoUnMakro(p) : precoKgMakro(p);
    if (!preco || !(preco > 0)) { alert('Este produto não tem preço por ' + (porUn ? 'unidade' : 'kg') + '. Escolha outro.'); return; }
    const e: EscolhaMakro = { codigo: p[15], nome: p[3], embalagem: p[5], preco: Math.round(preco * 100) / 100, und, em: new Date().toISOString() };
    guardarEscolha(produto, e);
    onEscolher(e.preco, e, podeDecidir && definitivo);
  }

  function botaoProduto(p: Produto) {
    const v = porUn ? precoUnMakro(p) : precoKgMakro(p);
    return (
      <button key={p[15]} onClick={() => escolher(p)} disabled={!v}
        style={{ display: 'flex', width: '100%', textAlign: 'left', gap: 10, alignItems: 'center', padding: '10px 12px', marginBottom: 6, borderRadius: 10,
          border: `1.5px solid ${anterior?.codigo === p[15] ? '#0f766e' : 'rgba(26,23,20,0.12)'}`, background: p[14] ? '#fff' : '#f6f6f6', cursor: v ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5 }}>{p[3]}</div>
          <div style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.6)' }}>{p[5]} · {p[7] != null ? euro(p[7]) : '—'} a embalagem{p[14] ? '' : ' · esgotado'}</div>
        </div>
        <div style={{ fontWeight: 800, color: '#0f766e', whiteSpace: 'nowrap' }}>{v ? `${euro(v)}/${porUn ? 'un' : und === 'l' ? 'L' : 'kg'}` : '—'}</div>
      </button>
    );
  }

  return (
    <div onClick={onFechar} style={{ position: 'fixed', inset: 0, background: 'rgba(20,18,16,0.45)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-label={`Escolher na Makro: ${produto}`}
        style={{ background: '#fff', borderRadius: 14, width: 'min(560px, 100%)', maxHeight: '88vh', overflowY: 'auto', padding: '18px 18px 14px', boxShadow: '0 10px 40px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div>
            <div style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.55)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>Escolher na Makro</div>
            <div style={{ fontSize: 19, fontWeight: 800, marginTop: 2 }}>{produto}</div>
            <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.6)', marginTop: 2 }}>
              Preço com IVA {porUn ? 'por unidade' : 'por kg ou litro'}. Escolha o produto que vai comprar. Vale nesta requisição; a coordenação decide se fica para sempre.
            </div>
          </div>
          <button onClick={onFechar} aria-label="Fechar" style={{ border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <input value={texto} onChange={e => setTexto(e.target.value)} placeholder="Procurar por outro nome"
          style={{ width: '100%', boxSizing: 'border-box', margin: '12px 0 10px', padding: '10px 12px', borderRadius: 10, border: '1.5px solid rgba(26,23,20,0.2)', fontSize: 15, fontFamily: 'inherit' }} />
        {podeDecidir && (
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13.5, margin: '0 0 10px', padding: '8px 10px', borderRadius: 9, background: '#eef3fb', cursor: 'pointer' }}>
            <input type="checkbox" checked={definitivo} onChange={e => setDefinitivo(e.target.checked)} style={{ marginTop: 3 }} />
            <span><b>Manter definitivamente (coordenação)</b>: as fichas e as requisições de todos passam a usar o produto que escolher.</span>
          </label>
        )}
                {anterior && <div style={{ fontSize: 13, marginBottom: 8, color: '#0f766e' }}>Escolhido antes: <b>{anterior.nome}</b> ({euro(anterior.preco)})</div>}
        {cat === undefined && <div style={{ padding: 16, color: 'rgba(26,23,20,0.6)' }}>A abrir o catálogo da Makro…</div>}
        {cat === null && <div style={{ padding: 16, color: '#b42318' }}>Não foi possível abrir o catálogo. Verifique a ligação à Internet.</div>}
        {cat && lista.length === 0 && <div style={{ padding: 16, color: 'rgba(26,23,20,0.6)' }}>Nenhum produto da Makro com esse nome. Experimente outra palavra (por exemplo, só «natas» ou «salmão»).</div>}
        {lista.length > 0 && <div style={{ fontSize: 12.5, fontWeight: 700, color: 'rgba(26,23,20,0.55)', margin: '4px 0 6px' }}>Em cru (o normal: os alunos é que preparam)</div>}
        {lista.map(p => botaoProduto(p))}
        {preparados.length > 0 && (
          <>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#8a4a15', margin: '12px 0 6px' }}>Já preparados (só se for mesmo para comprar assim)</div>
            {preparados.map(p => botaoProduto(p))}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Catálogo da Makro (Rosa, out/2026)
// ============================================================
// Todos os produtos da Makro de Alfragide, com os preços, tirados da
// conta da escola com a extensão do Claude no Chrome. Organizados pelos
// grupos da cozinha: frescos, congelados, mercearia, bebidas, consumíveis
// diretos e indiretos, embalagens, e equipamentos e utensílios. Dentro de
// cada grupo, as secções (fruta fresca, legumes, ervas aromáticas…) e,
// dentro destas, o pormenor (citrinos, cogumelos…).
// Só para consulta: não muda os preços das fichas nem da requisição.
// O ficheiro (public/catalogo_makro.json) gera-se com
// dados/gerar_catalogo_makro.py a partir do CSV da Makro.
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';

type Produto = [number, string, string, string, string, string, number | null, number | null, string,
  number | null, number | null, string, number | null, number | null, number, string, number[]?, number?];
interface Catalogo { loja: string; data: string; grupos: string[]; dietas?: string[]; produtos: Produto[] }

let cache: Promise<Catalogo | null> | null = null;
function lerCatalogo(): Promise<Catalogo | null> {
  if (!cache) {
    cache = fetch('/catalogo_makro.json')
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null);
    cache.then(c => { if (!c) cache = null; });
  }
  return cache;
}

const semAcentos = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/** Secção (ex.: «Fruta Fresca») e pormenor (ex.: «Citrinos») de um produto. */
const seccaoDe = (p: Produto) => (p[2] ? p[2].split(' > ')[0] : '') || p[1];
const pormenorDe = (p: Produto) => (p[2] && p[2].includes(' > ') ? p[2].split(' > ').slice(1).join(' > ') : '');
const euro = (n: number | null) => n == null ? '' : n.toFixed(2).replace('.', ',') + ' €';

export interface CoresCatalogo { papel: string; tinta: string; suave: string; linha: string; acento: string; quente: string }

export function CatalogoMakro({ cores }: { cores: CoresCatalogo }) {
  const C = cores;
  const [cat, setCat] = useState<Catalogo | null | undefined>(undefined);
  const [grupo, setGrupo] = useState(0);
  // Três níveis dentro do grupo: categoria (Frutas e Legumes) › secção (Fruta Fresca) › pormenor (Citrinos).
  const [sel, setSel] = useState<string[]>(['', '', '']);
  const [pesquisa, setPesquisa] = useState('');
  const [quantos, setQuantos] = useState(60);
  // A escola trabalha sempre com IVA (não o deduz): mostra-se só o preço com IVA (Rosa, out/2026).
  const comIVA = true;
  // Dietas especiais (sem glúten, sem lactose…): mostram os produtos de todos os grupos.
  const [dieta, setDieta] = useState(-1);

  useEffect(() => { lerCatalogo().then(setCat); }, []);

  const indice = useMemo(() => (cat?.produtos || []).map(p => semAcentos(`${p[3]} ${p[4]} ${p[2]}`)), [cat]);
  const q = semAcentos(pesquisa.trim());
  const palavras = q.split(/\s+/).filter(Boolean);
  // Com pesquisa, procura em todos os grupos; sem pesquisa, mostra o grupo escolhido.
  const doGrupo = useMemo(() => (cat?.produtos || []).map((p, i) => [p, i] as const).filter(([p]) => p[0] === grupo), [cat, grupo]);
  const contar = (ps: Produto[], f: (p: Produto) => string) => {
    const m = new Map<string, number>();
    ps.forEach(p => { const k = f(p); if (k) m.set(k, (m.get(k) || 0) + 1); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const NIVEIS: ((p: Produto) => string)[] = [p => p[1], seccaoDe, pormenorDe];
  const passa = (p: Produto, ate: number) => NIVEIS.slice(0, ate).every((f, n) => !sel[n] || f(p) === sel[n]);
  const opcoes = useMemo(() => NIVEIS.map((f, n) => (n === 0 || sel[n - 1]) ? contar(doGrupo.map(([p]) => p).filter(p => passa(p, n)), f) : []),
    [doGrupo, sel.join('|')]);
  const escolher = (n: number, v: string) => { setSel(s => s.map((x, k) => k < n ? x : k === n ? (x === v ? '' : v) : '')); setQuantos(60); };
  const lista = useMemo(() => {
    if (!cat) return [];
    const todos = palavras.length || dieta >= 0;
    const base = todos ? cat.produtos.map((p, i) => [p, i] as const) : doGrupo;
    return base.filter(([p, i]) => (dieta < 0 || (p[16] || []).includes(dieta))
      && (palavras.length ? palavras.every(w => indice[i].includes(w)) : dieta >= 0 || passa(p, 3))).map(([p]) => p);
  }, [cat, doGrupo, sel.join('|'), palavras.join(' '), indice, dieta]);

  // Taxas de IVA dos produtos que se estão a ver (para quem precise do preço sem IVA).
  const taxas = useMemo(() => {
    const m = new Map<number, number>();
    lista.forEach(p => { if (p[12] != null) m.set(p[12], (m.get(p[12]) || 0) + 1); });
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [lista]);

  const chip = (ativo: boolean): React.CSSProperties => ({ minHeight: 40, padding: '0 14px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit',
    fontSize: 14.5, fontWeight: 700, border: `1.5px solid ${ativo ? C.acento : C.linha}`, background: ativo ? C.acento : C.papel, color: ativo ? '#fff' : C.tinta });

  if (cat === undefined) return <div style={{ padding: '24px 0', fontSize: 16, color: C.suave }}>A abrir o catálogo da Makro…</div>;
  if (cat === null) return <div style={{ padding: '24px 0', fontSize: 16, color: C.suave }}>Não foi possível abrir o catálogo da Makro. Verifique a ligação à Internet e tente outra vez.</div>;

  const dataTxt = new Date(cat.data + 'T12:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <div>
      <div style={{ fontSize: 14.5, color: C.suave, marginBottom: 10, lineHeight: 1.5 }}>
        {cat.loja} · {cat.produtos.length.toLocaleString('pt-PT')} produtos · preços de {dataTxt}
      </div>
      <input value={pesquisa} onChange={e => { setPesquisa(e.target.value); setQuantos(60); }}
        placeholder="Procurar na Makro (ex.: natas, película, luvas, garrafão de azeite)"
        style={{ width: '100%', boxSizing: 'border-box', minHeight: 54, padding: '0 18px', borderRadius: 14, border: `1.5px solid ${C.linha}`,
          fontSize: 17, fontFamily: 'inherit', background: C.papel, color: C.tinta }} />
      {!!cat.dietas?.length && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, margin: '12px 0 4px' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.suave, marginRight: 4 }}>Dietas especiais:</span>
          {cat.dietas.map((dn, i) => {
            const n = cat.produtos.filter(p => (p[16] || []).includes(i)).length;
            return <button key={dn} onClick={() => { setDieta(d => d === i ? -1 : i); setQuantos(60); }}
              style={{ ...chip(dieta === i), minHeight: 34, fontSize: 13.5, fontWeight: 600, ...(dieta === i ? {} : { borderStyle: 'dashed' }) }}>{dn} ({n})</button>;
          })}
        </div>
      )}
      {!palavras.length && dieta < 0 && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '14px 0 10px' }}>
            {cat.grupos.map((g, i) => {
              const n = cat.produtos.filter(p => p[0] === i).length;
              return <button key={g} onClick={() => { setGrupo(i); setSel(['', '', '']); setQuantos(60); }} style={chip(i === grupo)}>{g} ({n.toLocaleString('pt-PT')})</button>;
            })}
          </div>
          {opcoes.map((ops, n) => ops.length > 1 && (
            <div key={n} style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12, ...(n ? { paddingLeft: 10, borderLeft: `3px solid ${C.acento}` } : {}) }}>
              {n === 0 && <button onClick={() => escolher(0, '')} style={{ ...chip(!sel[0]), minHeight: 34, fontSize: 13.5, fontWeight: 600 }}>Todas</button>}
              {ops.map(([c, k]) => (
                <button key={c} onClick={() => escolher(n, c)}
                  style={{ ...chip(c === sel[n]), minHeight: n ? 32 : 34, fontSize: n ? 13 : 13.5, fontWeight: 600 }}>{c} ({k})</button>
              ))}
            </div>
          ))}
        </>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', margin: '10px 0' }}>
        <div style={{ fontSize: 15, color: C.suave }}>{lista.length.toLocaleString('pt-PT')} produto{lista.length === 1 ? '' : 's'}</div>
        <div style={{ fontSize: 14, color: C.suave }}>Preços com IVA</div>
      </div>
      {taxas.length > 0 && (
        <div style={{ fontSize: 13.5, color: C.tinta, background: C.papel, border: `1px dashed ${C.linha}`, borderRadius: 10, padding: '8px 12px', marginBottom: 10, lineHeight: 1.5 }}>
          <b>IVA {taxas.length === 1 ? 'destes produtos' : 'nesta lista'}:</b>{' '}
          {taxas.map(([t, n]) => `${t}%${taxas.length > 1 ? ` (${n.toLocaleString('pt-PT')} produto${n === 1 ? '' : 's'})` : ''}`).join(' · ')}.{' '}
          Para o preço sem IVA, divida o preço por {taxas.map(([t]) => (1 + t / 100).toFixed(2).replace('.', ',')).join(', por ')}{taxas.length > 1 ? ', conforme a taxa de cada produto' : ''}.
          {lista.some(p => (p[17] || 0) > 0) && ' Nas bebidas em lata ou garrafa, o preço inclui o depósito da embalagem (0,10 € por lata ou garrafa, mais nas grades com tara), que não paga IVA e se recebe de volta ao entregar as embalagens. O imposto sobre o álcool e as bebidas açucaradas já está dentro do preço.'}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: 8 }}>
        {lista.slice(0, quantos).map(p => {
          const preco = comIVA ? p[7] : p[6];
          const ref = comIVA ? p[10] : p[9];
          const antes = p[13] != null && p[12] != null ? (comIVA ? p[13] * (1 + p[12] / 100) : p[13]) : null;
          const porQue = p[8] === 'embalagem' || !p[8] ? '' : `/${p[8]}`;
          return (
            <div key={p[15]} style={{ background: C.papel, borderRadius: 12, padding: '10px 14px', border: `1px solid ${C.linha}`, opacity: p[14] ? 1 : 0.6 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.tinta, lineHeight: 1.3 }}>{p[3]}</div>
                  <div style={{ fontSize: 13, color: C.suave, marginTop: 2 }}>
                    {[p[5], p[2] || p[1], p[12] != null ? `IVA ${p[12]}%` : ''].filter(Boolean).join(' · ')}{p[14] ? '' : ' · esgotado'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ fontSize: 16.5, fontWeight: 800, color: C.acento }}>{euro(preco)}{porQue}</div>
                  {antes != null && <div style={{ fontSize: 12.5, color: C.suave, textDecoration: 'line-through' }}>{euro(antes)}</div>}
                  {ref != null && p[11] && (p[8] !== p[11]) && <div style={{ fontSize: 12.5, color: C.quente, fontWeight: 700 }}>{euro(ref)}/{p[11]}</div>}
                  {(p[17] || 0) > 0 && <div style={{ fontSize: 12, color: C.suave }}>inclui depósito {euro(p[17] ?? null)}</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {lista.length > quantos && (
        <button onClick={() => setQuantos(n => n + 60)} style={{ ...chip(false), width: '100%', marginTop: 12 }}>
          Mostrar mais ({(lista.length - quantos).toLocaleString('pt-PT')} por mostrar)
        </button>
      )}
      {lista.length === 0 && <div style={{ fontSize: 16, color: C.suave, padding: '24px 0' }}>Não há nenhum produto com esse nome na Makro.</div>}
    </div>
  );
}

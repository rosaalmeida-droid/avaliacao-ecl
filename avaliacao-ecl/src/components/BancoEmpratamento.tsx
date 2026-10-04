// ============================================================
// Banco de imagens de empratamento (Rosa, out/2026)
// ============================================================
// 431 produtos da Makro com imagem: ervas aromáticas, flores, micro
// legumes, rebentos, frutos vermelhos, embalagens e descartáveis.
// Nas fichas técnicas, cada ingrediente que corresponde a um destes
// produtos mostra a imagem ao lado; e o professor pode abrir o banco e
// acrescentar à ficha o que vai usar no empratamento (fica como
// ingrediente, com o componente «Empratamento», e entra na requisição).
// Dados: public/banco_empratamento.json (dados/gerar_banco_empratamento.py).
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';

export interface ItemEmpratamento { codigo: string; nome: string; grupo: string; sub: string; embalagem: string; preco: number | null; imagem: string; link: string }
interface Banco { loja: string; data: string; itens: ItemEmpratamento[] }

let cache: Promise<Banco | null> | null = null;
export function lerBancoEmpratamento(): Promise<Banco | null> {
  if (!cache) {
    cache = fetch('/banco_empratamento.json').then(r => (r.ok ? r.json() : null)).catch(() => null);
    cache.then(b => { if (!b) cache = null; });
  }
  return cache;
}
export function useBancoEmpratamento(): Banco | null {
  const [b, setB] = useState<Banco | null>(null);
  useEffect(() => { let vivo = true; lerBancoEmpratamento().then(x => { if (vivo) setB(x); }); return () => { vivo = false; }; }, []);
  return b;
}

const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const VAZIAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'com', 'em', 'para', 'metro', 'chef', 'categoria', 'i', 'ii', 'un', 'unidades',
  'fresco', 'fresca', 'frescos', 'frescas', 'picado', 'picada', 'q', 'b', 'qb', 'folha', 'folhas', 'ramo', 'ramos', 'raminho', 'pe', 'pes']);
const palavras = (t: string) => norm(t).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)
  .filter(w => w.length > 1 && !VAZIAS.has(w) && !/^\d/.test(w)).map(w => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w));

/** O produto do banco que corresponde a um ingrediente (ex.: «Cebolinho picado» → cebolinho). */
export function itemDoIngrediente(banco: Banco | null, nome: string): ItemEmpratamento | null {
  if (!banco || !nome) return null;
  const exato = banco.itens.find(i => norm(i.nome) === norm(nome));
  if (exato) return exato;
  const q = palavras(nome); if (!q.length) return null;
  let melhor: { i: ItemEmpratamento; s: number } | null = null;
  for (const i of banco.itens) {
    const w = palavras(i.nome);
    if (!q.every(x => w.some(y => y === x || (x.length >= 4 && y.startsWith(x)) || (x.length >= 7 && y.startsWith(x.slice(0, 6)))))) continue;
    const s = q.length / w.length;
    if (!melhor || s > melhor.s) melhor = { i, s };
  }
  return melhor && melhor.s >= 0.3 ? melhor.i : null;
}

/** Miniatura ao lado de um ingrediente da ficha (não aparece se não houver correspondência). */
export function ImagemDoIngrediente({ nome, tamanho = 34 }: { nome: string; tamanho?: number }) {
  const banco = useBancoEmpratamento();
  const item = useMemo(() => itemDoIngrediente(banco, nome), [banco, nome]);
  const [grande, setGrande] = useState(false);
  if (!item) return null;
  return (
    <>
      <img src={item.imagem} alt={item.nome} title={`${item.nome} (Makro) — toque para ampliar`} loading="lazy"
        onClick={e => { e.preventDefault(); e.stopPropagation(); setGrande(true); }}
        style={{ width: tamanho, height: tamanho, objectFit: 'contain', background: '#fff', borderRadius: 6, border: '1px solid rgba(26,23,20,0.12)', cursor: 'zoom-in', flexShrink: 0 }} />
      {grande && (
        <div onClick={e => { e.stopPropagation(); setGrande(false); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1100,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16 }}>
          <img src={item.imagem} alt={item.nome} style={{ maxWidth: 'min(90vw, 600px)', maxHeight: '75vh', background: '#fff', borderRadius: 10 }} />
          <div style={{ color: '#fff', textAlign: 'center', fontSize: 15 }}>{item.nome}<br /><span style={{ opacity: 0.75 }}>{item.embalagem}{item.preco != null ? ` · ${item.preco.toFixed(2).replace('.', ',')} € (com IVA)` : ''}</span></div>
        </div>
      )}
    </>
  );
}

/** Janela com o banco inteiro, para escolher o que se vai usar no empratamento. */
export function BancoEmpratamentoJanela({ onEscolher, onFechar, jaEscolhidos = [] }: {
  onEscolher: (item: ItemEmpratamento) => void; onFechar: () => void; jaEscolhidos?: string[];
}) {
  const banco = useBancoEmpratamento();
  const [grupo, setGrupo] = useState('');
  const [sub, setSub] = useState('');
  const [q, setQ] = useState('');
  const grupos = useMemo(() => [...new Set((banco?.itens || []).map(i => i.grupo))], [banco]);
  const subs = useMemo(() => [...new Set((banco?.itens || []).filter(i => i.grupo === grupo).map(i => i.sub))], [banco, grupo]);
  const qq = norm(q.trim());
  const lista = (banco?.itens || []).filter(i => (!grupo || i.grupo === grupo) && (!sub || i.sub === sub) && (!qq || norm(`${i.nome} ${i.sub}`).includes(qq)));
  const chip = (on: boolean): React.CSSProperties => ({ border: `1px solid ${on ? '#3f6b45' : 'rgba(26,23,20,0.18)'}`, background: on ? '#3f6b45' : '#fff', color: on ? '#fff' : 'inherit',
    borderRadius: 999, padding: '5px 11px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' });
  return (
    <div onClick={onFechar} style={{ position: 'fixed', inset: 0, background: 'rgba(20,18,16,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-label="Banco de imagens de empratamento"
        style={{ background: '#f6f4ef', borderRadius: 14, width: 'min(980px, 100%)', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid rgba(26,23,20,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>Banco de imagens de empratamento</div>
              <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.6)' }}>
                Produtos da Makro Alfragide, com o preço com IVA{banco ? ` de ${new Date(banco.data + 'T12:00:00').toLocaleDateString('pt-PT')}` : ''}.
                Toque num produto para o acrescentar à ficha (entra como ingrediente de «Empratamento» e vai para a requisição).
              </div>
            </div>
            <button onClick={onFechar} aria-label="Fechar" style={{ border: 'none', background: 'none', fontSize: 24, cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>
          <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Procurar (ex.: amaranto, flor, caixa kraft, copo)"
            style={{ width: '100%', boxSizing: 'border-box', margin: '10px 0 8px', padding: '8px 12px', borderRadius: 999, border: '1px solid rgba(26,23,20,0.18)', fontSize: 15, fontFamily: 'inherit' }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button style={chip(!grupo)} onClick={() => { setGrupo(''); setSub(''); }}>Tudo</button>
            {grupos.map(g => <button key={g} style={chip(grupo === g)} onClick={() => { setGrupo(g); setSub(''); }}>{g}</button>)}
          </div>
          {subs.length > 1 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {subs.map(s => <button key={s} style={chip(sub === s)} onClick={() => setSub(sub === s ? '' : s)}>{s}</button>)}
            </div>
          )}
        </div>
        <div style={{ overflowY: 'auto', padding: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
          {!banco && <div style={{ gridColumn: '1/-1', color: 'rgba(26,23,20,0.6)' }}>A abrir o banco de imagens…</div>}
          {banco && lista.length === 0 && <div style={{ gridColumn: '1/-1', color: 'rgba(26,23,20,0.6)' }}>Nenhum produto com esse nome.</div>}
          {lista.map(i => {
            const ja = jaEscolhidos.includes(i.codigo);
            return (
              <button key={i.codigo} onClick={() => onEscolher(i)} title={ja ? 'Já está na ficha' : 'Acrescentar à ficha'}
                style={{ background: '#fff', border: `${ja ? 3 : 1}px solid ${ja ? '#c9a227' : 'rgba(26,23,20,0.12)'}`, borderRadius: 12, overflow: 'hidden', padding: 0,
                  textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column' }}>
                <img src={i.imagem} alt={i.nome} loading="lazy" style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', background: '#fff' }} />
                <div style={{ padding: '7px 9px 9px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.25 }}>{i.nome}</div>
                  <div style={{ fontSize: 11.5, color: 'rgba(26,23,20,0.6)' }}>{i.sub}{i.embalagem ? ` · ${i.embalagem}` : ''}</div>
                  {i.preco != null && <div style={{ fontSize: 13, fontWeight: 800, color: '#3f6b45' }}>{i.preco.toFixed(2).replace('.', ',')} €</div>}
                  {ja && <div style={{ fontSize: 11.5, fontWeight: 700, color: '#8a6d12' }}>✓ já na ficha</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

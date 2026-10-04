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
import { FotoProduto, SeloNotas, useNotasPorProduto, type ProdutoComFoto } from './FotoProduto';

export interface ItemEmpratamento { codigo: string; nome: string; grupo: string; sub: string; embalagem: string; preco: number | null; imagem: string; link: string }
interface Banco { loja: string; data: string; itens: ItemEmpratamento[] }

let cache: Promise<Banco | null> | null = null;
let lido: Banco | null = null;
export function lerBancoEmpratamento(): Promise<Banco | null> {
  if (!cache) {
    cache = fetch('/banco_empratamento.json').then(r => (r.ok ? r.json() : null)).catch(() => null);
    cache.then(b => { if (!b) cache = null; else lido = b; });
  }
  return cache;
}
/** O produto do banco com este nome exato (o que o professor acrescentou à
 *  ficha a partir do banco). Só depois de o banco estar lido. */
export function itemDoBancoPorNome(nome: string): ItemEmpratamento | null {
  if (!lido || !nome) return null;
  const n = norm(nome.trim());
  return lido.itens.find(i => norm(i.nome) === n) || null;
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

/** O produto do banco no formato da janela da fotografia. */
export const comFoto = (i: ItemEmpratamento): ProdutoComFoto => ({ codigo: i.codigo, nome: i.nome, imagem: i.imagem,
  detalhe: [i.sub, i.embalagem].filter(Boolean).join(' · '), preco: i.preco, link: i.link });

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
      {grande && <FotoProduto produto={comFoto(item)} onFechar={() => setGrande(false)} />}
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
  const [ver, setVer] = useState<ItemEmpratamento | null>(null);
  const notas = useNotasPorProduto();
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
                A lupa 🔍 abre a fotografia em grande e as notas da equipa.
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
        {/* No iPad (Safari) as linhas da grelha encolhiam e cortavam as fotografias e
            os nomes: a altura das linhas e da imagem fica fixa (Rosa, out/2026). */}
        <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: 14, display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gridAutoRows: 'max-content', alignContent: 'start', gap: 12 } as React.CSSProperties}>
          {!banco && <div style={{ gridColumn: '1/-1', color: 'rgba(26,23,20,0.6)' }}>A abrir o banco de imagens…</div>}
          {banco && lista.length === 0 && <div style={{ gridColumn: '1/-1', color: 'rgba(26,23,20,0.6)' }}>Nenhum produto com esse nome.</div>}
          {lista.map(i => {
            const ja = jaEscolhidos.includes(i.codigo);
            return (
              <button key={i.codigo} onClick={() => onEscolher(i)} title={ja ? 'Já está na ficha' : 'Acrescentar à ficha'}
                style={{ background: '#fff', border: `${ja ? 3 : 1}px solid ${ja ? '#c9a227' : 'rgba(26,23,20,0.12)'}`, borderRadius: 12, overflow: 'hidden', padding: 0,
                  textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', display: 'block', width: '100%', minHeight: 0, flexShrink: 0 }}>
                <div style={{ position: 'relative' }}>
                  <img src={i.imagem} alt={i.nome} loading="lazy" style={{ width: '100%', height: 150, objectFit: 'contain', background: '#fff', display: 'block' }} />
                  <span role="button" tabIndex={0} aria-label={`Ver ${i.nome} em grande`} title="Ver em grande e notas da equipa"
                    onClick={e => { e.stopPropagation(); setVer(i); }}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setVer(i); } }}
                    style={{ position: 'absolute', top: 6, right: 6, width: 36, height: 36, borderRadius: 999, background: 'rgba(255,255,255,0.95)',
                      border: '1px solid rgba(26,23,20,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, cursor: 'zoom-in' }}>🔍</span>
                </div>
                <div style={{ padding: '7px 9px 9px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.25 }}>{i.nome}</div>
                  <div style={{ fontSize: 11.5, color: 'rgba(26,23,20,0.6)' }}>{i.sub}{i.embalagem ? ` · ${i.embalagem}` : ''}</div>
                  {i.preco != null && <div style={{ fontSize: 13, fontWeight: 800, color: '#3f6b45' }}>{i.preco.toFixed(2).replace('.', ',')} €</div>}
                  {ja && <div style={{ fontSize: 11.5, fontWeight: 700, color: '#8a6d12' }}>✓ já na ficha</div>}
                  <SeloNotas notas={notas.get(i.codigo)} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
      {ver && <FotoProduto produto={comFoto(ver)} onFechar={() => setVer(null)} />}
    </div>
  );
}

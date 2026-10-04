// ============================================================
// Fotografia de um produto, em grande, com as notas da equipa
// ============================================================
// Rosa (out/2026): «nas coisas que têm fotografias, era importante nós
// conseguirmos abrir para ver melhor … e até poder escrever alguma nota,
// para nós mesmos sabermos o que é que já usámos, não gostámos, etc.»
// Serve o catálogo da Makro, o banco de empratamento e as fichas técnicas.
// As notas são da equipa: vão para a base de dados e aparecem a todos os
// professores (os alunos não as veem).
// ============================================================
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  EVENTO_NOTAS_PRODUTOS, eliminarNotaProduto, getNotasDoProduto, getNotasProdutos, getPerfilDoAparelho, guardarNotaProduto,
  podeApagarNota, type NotaProduto,
} from '../backend';

export const ETIQUETAS_NOTA: { id: string; texto: string; cor: string; fundo: string }[] = [
  { id: 'usamos', texto: '✓ Já usámos', cor: '#25632a', fundo: '#e3f3e1' },
  { id: 'gostamos', texto: '👍 Gostámos', cor: '#1d4f8f', fundo: '#e2ecf8' },
  { id: 'nao_gostamos', texto: '👎 Não gostámos', cor: '#9a2b1f', fundo: '#f8e3df' },
  { id: 'atencao', texto: '⚠️ Atenção', cor: '#8a5a00', fundo: '#fbefd5' },
];
const etiqueta = (id: string) => ETIQUETAS_NOTA.find(e => e.id === id);

/** As notas da equipa ficam escondidas aos alunos. */
export const veNotas = () => getPerfilDoAparelho() !== 'aluno';

/** Quantas notas tem cada produto (para o selo nas listas); atualiza-se sozinho. */
export function useNotasPorProduto(): Map<string, NotaProduto[]> {
  const ler = () => {
    const m = new Map<string, NotaProduto[]>();
    if (!veNotas()) return m;
    getNotasProdutos().forEach(n => m.set(n.codigo, [...(m.get(n.codigo) || []), n]));
    return m;
  };
  const [m, setM] = useState(ler);
  useEffect(() => {
    const f = () => setM(ler());
    window.addEventListener(EVENTO_NOTAS_PRODUTOS, f);
    return () => window.removeEventListener(EVENTO_NOTAS_PRODUTOS, f);
  }, []);
  return m;
}

/** O selo pequeno de um produto com notas (ex.: «✓ Já usámos · 2 notas»). */
export function SeloNotas({ notas }: { notas?: NotaProduto[] }) {
  if (!notas?.length) return null;
  const ult = notas.slice().sort((a, b) => b.criadaEm.localeCompare(a.criadaEm))[0];
  const e = etiqueta(ult.etiqueta);
  return (
    <span title={notas.map(n => `${etiqueta(n.etiqueta)?.texto || ''} ${n.texto} — ${n.autor}`.trim()).join('\n')}
      style={{ display: 'inline-block', fontSize: 11.5, fontWeight: 700, padding: '1px 7px', borderRadius: 999, marginTop: 3,
        background: e?.fundo || '#eee', color: e?.cor || '#444' }}>
      {e?.texto || '📝 Nota'}{notas.length > 1 ? ` · ${notas.length} notas` : ''}
    </span>
  );
}

export interface ProdutoComFoto { codigo: string; nome: string; imagem: string; detalhe?: string; preco?: number | null; link?: string }

/** A janela: fotografia grande, dados do produto e notas da equipa. */
export function FotoProduto({ produto, onFechar }: { produto: ProdutoComFoto; onFechar: () => void }) {
  const [notas, setNotas] = useState<NotaProduto[]>(() => getNotasDoProduto(produto.codigo));
  const [etq, setEtq] = useState('');
  const [texto, setTexto] = useState('');
  const [falhou, setFalhou] = useState(false);
  const pode = veNotas();
  useEffect(() => {
    const f = () => setNotas(getNotasDoProduto(produto.codigo));
    window.addEventListener(EVENTO_NOTAS_PRODUTOS, f);
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', esc);
    return () => { window.removeEventListener(EVENTO_NOTAS_PRODUTOS, f); window.removeEventListener('keydown', esc); };
  }, [produto.codigo]);
  const gravar = () => {
    if (!etq && !texto.trim()) return;
    guardarNotaProduto({ codigo: produto.codigo, produto: produto.nome, etiqueta: etq, texto });
    setEtq(''); setTexto('');
  };
  const parar = (e: React.SyntheticEvent) => e.stopPropagation();
  // Vai direto para o fim da página: dentro de uma linha da ficha (que é um
  // <label> com uma caixa de marcar) um toque na janela marcava o ingrediente.
  return createPortal(
    <div onClick={e => { e.stopPropagation(); onFechar(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
      <div onClick={parar} role="dialog" aria-label={produto.nome}
        style={{ background: '#fbfaf7', borderRadius: 14, width: 'min(760px, 100%)', maxHeight: '94vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'relative', background: '#fff', borderRadius: '14px 14px 0 0', display: 'flex', justifyContent: 'center', padding: 12 }}>
          {falhou
            ? <div style={{ padding: '60px 20px', color: 'rgba(26,23,20,0.6)', fontSize: 15, textAlign: 'center' }}>Não foi possível abrir a fotografia (verifique a ligação à Internet).</div>
            : <img src={produto.imagem} alt={produto.nome} onError={() => setFalhou(true)}
                style={{ maxWidth: '100%', maxHeight: '55vh', objectFit: 'contain' }} />}
          <button onClick={onFechar} aria-label="Fechar"
            style={{ position: 'absolute', top: 8, right: 8, width: 40, height: 40, borderRadius: 999, border: '1px solid rgba(26,23,20,0.15)',
              background: '#fff', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.3 }}>{produto.nome}</div>
            <div style={{ fontSize: 14, color: 'rgba(26,23,20,0.65)', marginTop: 2 }}>
              {[produto.detalhe, produto.preco != null ? `${produto.preco.toFixed(2).replace('.', ',')} € (com IVA)` : ''].filter(Boolean).join(' · ')}
              {produto.link && <> · <a href={produto.link} target="_blank" rel="noreferrer" style={{ color: '#1d4f8f' }}>ver na Makro</a></>}
            </div>
          </div>
          {pode && (
            <div style={{ borderTop: '1px solid rgba(26,23,20,0.1)', paddingTop: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>Notas da equipa</div>
              {notas.length === 0 && <div style={{ fontSize: 14, color: 'rgba(26,23,20,0.6)', marginBottom: 8 }}>Ainda não há notas sobre este produto.</div>}
              {notas.map(n => {
                const e = etiqueta(n.etiqueta);
                return (
                  <div key={n.id} style={{ background: '#fff', border: '1px solid rgba(26,23,20,0.1)', borderLeft: `4px solid ${e?.cor || '#999'}`,
                    borderRadius: 8, padding: '7px 10px', marginBottom: 6, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, fontSize: 14, lineHeight: 1.4 }}>
                      {e && <b style={{ color: e.cor }}>{e.texto}</b>}{e && n.texto ? ' — ' : ''}{n.texto}
                      <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.55)' }}>{n.autor} · {new Date(n.criadaEm).toLocaleDateString('pt-PT')}</div>
                    </div>
                    {podeApagarNota(n) && (
                      <button onClick={() => { if (window.confirm('Apagar esta nota?')) eliminarNotaProduto(n.id); }}
                        style={{ border: 'none', background: 'none', color: '#9a2b1f', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', textDecoration: 'underline' }}>Apagar</button>
                    )}
                  </div>
                );
              })}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '8px 0 6px' }}>
                {ETIQUETAS_NOTA.map(e => (
                  <button key={e.id} onClick={() => setEtq(etq === e.id ? '' : e.id)}
                    style={{ minHeight: 36, padding: '0 12px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
                      border: `1.5px solid ${e.cor}`, background: etq === e.id ? e.cor : e.fundo, color: etq === e.id ? '#fff' : e.cor }}>{e.texto}</button>
                ))}
              </div>
              <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={2}
                placeholder="Escreva uma nota (ex.: usado no evento de Natal; folhas pequenas; chega murcho)"
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(26,23,20,0.2)', fontSize: 15, fontFamily: 'inherit', resize: 'vertical' }} />
              <button onClick={gravar} disabled={!etq && !texto.trim()}
                style={{ marginTop: 6, minHeight: 42, padding: '0 18px', borderRadius: 10, border: 'none', fontFamily: 'inherit', fontSize: 15, fontWeight: 800,
                  background: !etq && !texto.trim() ? 'rgba(26,23,20,0.15)' : '#3f6b45', color: '#fff', cursor: !etq && !texto.trim() ? 'default' : 'pointer' }}>Guardar nota</button>
              <div style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.55)', marginTop: 6 }}>As notas ficam visíveis para todos os professores, em todos os aparelhos. Os alunos não as veem.</div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

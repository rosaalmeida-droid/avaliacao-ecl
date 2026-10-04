// ============================================================
// Os meus vídeos — Instagram e Facebook da Rosa Almeida (out/2026)
// ============================================================
// «Tenho tanta coisa boa, mas não tenho acesso para filtrar quando preciso.»
// A extensão Claude no Chrome faz a lista das publicações (CSV) e
// dados/gerar_videos.py transforma-a em public/videos_rosa.json. Aqui
// procura-se por palavras, temas automáticos, plataforma, tipo e ano; um
// toque abre a publicação. Favoritos e notas ficam guardados (base de dados).
// Só aparece no menu da Rosa Almeida.
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { getConfig, setConfig } from '../backend';

interface Video { p: 'instagram' | 'facebook'; link: string; data: string; tipo: string; legenda: string; tags: string[];
  vis: number | null; gostos: number | null; capa: string; temas: string[] }
interface Dados { atualizado: string; temas: string[]; itens: Video[] }

const sa = (t: string) => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const dataPT = (iso: string) => /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '';
const n = (x: number | null) => x == null ? '' : x >= 1000 ? (x / 1000).toFixed(x >= 10000 ? 0 : 1).replace('.', ',') + ' mil' : String(x);
const COR = { instagram: '#c13584', facebook: '#1877f2' };
const ID_CONFIG = 'videos_rosa';

function lerMarcas(): { fav: string[]; notas: Record<string, string> } {
  try { const v = JSON.parse(getConfig(ID_CONFIG) || '{}'); return { fav: v.fav || [], notas: v.notas || {} }; } catch { return { fav: [], notas: {} }; }
}

export function BibliotecaVideos() {
  const [dados, setDados] = useState<Dados | null | undefined>(undefined);
  const [q, setQ] = useState('');
  const [plat, setPlat] = useState('');
  const [tipo, setTipo] = useState('');
  const [tema, setTema] = useState('');
  const [ano, setAno] = useState('');
  const [ordem, setOrdem] = useState<'recentes' | 'vistos'>('recentes');
  const [soFav, setSoFav] = useState(false);
  const [quantos, setQuantos] = useState(48);
  const [marcas, setMarcas] = useState(lerMarcas);
  const [aEscrever, setAEscrever] = useState<string | null>(null);

  useEffect(() => {
    fetch('/videos_rosa.json').then(r => r.ok ? r.json() : null).then(setDados).catch(() => setDados(null));
  }, []);
  const gravarMarcas = (m: typeof marcas) => { setMarcas(m); setConfig(ID_CONFIG, JSON.stringify(m)); };
  const favorito = (link: string) => marcas.fav.includes(link);

  const itens = dados?.itens || [];
  const indice = useMemo(() => itens.map(v => sa(`${v.legenda} ${v.tags.join(' ')} ${v.temas.join(' ')} ${marcas.notas[v.link] || ''}`)), [itens, marcas]);
  const palavras = sa(q.trim()).split(/\s+/).filter(Boolean);
  const anos = useMemo(() => [...new Set(itens.map(v => v.data.slice(0, 4)).filter(Boolean))].sort().reverse(), [itens]);
  const tipos = useMemo(() => [...new Set(itens.map(v => v.tipo))], [itens]);
  const lista = useMemo(() => {
    const r = itens.filter((v, i) => (!plat || v.p === plat) && (!tipo || v.tipo === tipo) && (!tema || v.temas.includes(tema))
      && (!ano || v.data.startsWith(ano)) && (!soFav || marcas.fav.includes(v.link)) && palavras.every(w => indice[i].includes(w)));
    return ordem === 'vistos' ? [...r].sort((a, b) => (b.vis ?? b.gostos ?? 0) - (a.vis ?? a.gostos ?? 0)) : r;
  }, [itens, plat, tipo, tema, ano, soFav, palavras.join(' '), indice, ordem, marcas]);
  const conta = (f: (v: Video) => boolean) => itens.filter(f).length;

  const chip = (on: boolean, cor = '#b5651d'): React.CSSProperties => ({ padding: '6px 12px', borderRadius: 999, fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'inherit', border: `1.5px solid ${on ? cor : 'rgba(26,23,20,0.18)'}`, background: on ? cor : '#fff', color: on ? '#fff' : 'rgba(26,23,20,0.75)' });
  const sel: React.CSSProperties = { padding: '7px 10px', borderRadius: 10, border: '1.5px solid rgba(26,23,20,0.2)', fontSize: 14, fontFamily: 'inherit', background: '#fff' };

  if (dados === undefined) return <div style={{ padding: 24, color: 'rgba(26,23,20,0.6)' }}>A abrir os seus vídeos…</div>;
  if (dados === null || !itens.length) return (
    <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid var(--border)', lineHeight: 1.6 }}>
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>🎬 Os meus vídeos</div>
      Ainda não há vídeos aqui. Quando a extensão Claude no Chrome terminar a lista do Instagram (e do Facebook),
      envie o ficheiro ao Claude: os vídeos aparecem aqui, com pesquisa por palavras, temas, plataforma e ano.
    </div>
  );

  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg,#833ab4,#c13584 55%,#f77737)', borderRadius: 16, padding: '16px 18px', color: '#fff', marginBottom: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>🎬 Os meus vídeos</div>
        <div style={{ fontSize: 13.5, opacity: 0.9 }}>
          {itens.length.toLocaleString('pt-PT')} publicações · Instagram {conta(v => v.p === 'instagram')} · Facebook {conta(v => v.p === 'facebook')}
          {dados.atualizado ? ` · lista de ${dataPT(dados.atualizado)}` : ''} · só visível para si
        </div>
      </div>

      <input value={q} onChange={e => { setQ(e.target.value); setQuantos(48); }} placeholder="Procurar (ex.: bacalhau, massa folhada, alunos, concurso)"
        style={{ width: '100%', boxSizing: 'border-box', minHeight: 50, padding: '0 16px', borderRadius: 14, border: '1.5px solid rgba(26,23,20,0.2)', fontSize: 16, fontFamily: 'inherit', marginBottom: 10 }} />

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        <button style={chip(!tema)} onClick={() => setTema('')}>Todos os temas</button>
        {dados.temas.map(t => { const k = conta(v => v.temas.includes(t)); return k ? (
          <button key={t} style={chip(tema === t)} onClick={() => { setTema(tema === t ? '' : t); setQuantos(48); }}>{t} ({k})</button>) : null; })}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <button style={chip(plat === 'instagram', COR.instagram)} onClick={() => setPlat(plat === 'instagram' ? '' : 'instagram')}>Instagram</button>
        <button style={chip(plat === 'facebook', COR.facebook)} onClick={() => setPlat(plat === 'facebook' ? '' : 'facebook')}>Facebook</button>
        <select value={tipo} onChange={e => setTipo(e.target.value)} style={sel}>
          <option value="">Todos os tipos</option>{tipos.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={ano} onChange={e => setAno(e.target.value)} style={sel}>
          <option value="">Todos os anos</option>{anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={ordem} onChange={e => setOrdem(e.target.value as any)} style={sel}>
          <option value="recentes">Mais recentes</option><option value="vistos">Mais vistos</option>
        </select>
        <button style={chip(soFav, '#c9a227')} onClick={() => setSoFav(!soFav)}>⭐ Favoritos ({marcas.fav.length})</button>
      </div>

      <div style={{ fontSize: 14, color: 'rgba(26,23,20,0.6)', marginBottom: 8 }}>{lista.length.toLocaleString('pt-PT')} publicaç{lista.length === 1 ? 'ão' : 'ões'}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))', gap: 12 }}>
        {lista.slice(0, quantos).map(v => (
          <div key={v.link} style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(26,23,20,0.1)', display: 'flex', flexDirection: 'column' }}>
            <a href={v.link} target="_blank" rel="noreferrer" style={{ position: 'relative', display: 'block', background: '#f3efe9', height: 200 }}>
              {v.capa && <img src={v.capa} alt="" loading="lazy" referrerPolicy="no-referrer"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} />}
              <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, pointerEvents: 'none',
                textShadow: '0 1px 6px rgba(0,0,0,0.5)', color: '#fff' }}>{v.tipo === 'reel' || v.tipo === 'vídeo' ? '▶' : ''}</span>
              <span style={{ position: 'absolute', left: 8, top: 8, background: COR[v.p], color: '#fff', fontSize: 11.5, fontWeight: 800, borderRadius: 999, padding: '2px 8px' }}>
                {v.p === 'instagram' ? 'Instagram' : 'Facebook'} · {v.tipo}</span>
            </a>
            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'rgba(26,23,20,0.6)' }}>
                <span>{dataPT(v.data)}</span>
                <span>{[v.vis != null ? `▶ ${n(v.vis)}` : '', v.gostos != null ? `♥ ${n(v.gostos)}` : ''].filter(Boolean).join(' · ')}</span>
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.4, whiteSpace: 'pre-line', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                {v.legenda || <i style={{ color: 'rgba(26,23,20,0.45)' }}>Sem legenda</i>}</div>
              {v.temas.length > 0 && <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {v.temas.map(t => <span key={t} style={{ fontSize: 11.5, background: '#fbefe4', color: '#8a4b14', borderRadius: 999, padding: '1px 7px', fontWeight: 700 }}>{t}</span>)}</div>}
              {marcas.notas[v.link] && aEscrever !== v.link && (
                <div style={{ fontSize: 12.5, background: '#fffbe8', border: '1px solid #f0e2a8', borderRadius: 8, padding: '5px 8px' }}>📝 {marcas.notas[v.link]}</div>)}
              {aEscrever === v.link && (
                <textarea autoFocus defaultValue={marcas.notas[v.link] || ''} rows={2} placeholder="Nota só para si (ex.: usar na aula de massas)"
                  onBlur={e => { const t = e.target.value.trim(); const notas = { ...marcas.notas }; if (t) notas[v.link] = t; else delete notas[v.link];
                    gravarMarcas({ ...marcas, notas }); setAEscrever(null); }}
                  style={{ width: '100%', boxSizing: 'border-box', fontSize: 13.5, fontFamily: 'inherit', borderRadius: 8, border: '1px solid rgba(26,23,20,0.25)', padding: 6 }} />)}
              <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                <a href={v.link} target="_blank" rel="noreferrer" style={{ flex: 1, textAlign: 'center', padding: '7px 8px', borderRadius: 9, background: COR[v.p], color: '#fff',
                  fontWeight: 700, fontSize: 13.5, textDecoration: 'none' }}>Abrir ↗</a>
                <button title="Favorito" onClick={() => gravarMarcas({ ...marcas, fav: favorito(v.link) ? marcas.fav.filter(x => x !== v.link) : [...marcas.fav, v.link] })}
                  style={{ padding: '7px 10px', borderRadius: 9, border: '1px solid rgba(26,23,20,0.2)', background: favorito(v.link) ? '#fff6d6' : '#fff', cursor: 'pointer', fontSize: 15 }}>
                  {favorito(v.link) ? '⭐' : '☆'}</button>
                <button title="Nota" onClick={() => setAEscrever(v.link)}
                  style={{ padding: '7px 10px', borderRadius: 9, border: '1px solid rgba(26,23,20,0.2)', background: '#fff', cursor: 'pointer', fontSize: 15 }}>📝</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {lista.length > quantos && (
        <button onClick={() => setQuantos(k => k + 48)} style={{ ...chip(false), width: '100%', marginTop: 12, padding: '10px' }}>
          Mostrar mais ({(lista.length - quantos).toLocaleString('pt-PT')} por mostrar)</button>)}
      {lista.length === 0 && <div style={{ padding: '24px 0', color: 'rgba(26,23,20,0.6)' }}>Nenhuma publicação com esses filtros.</div>}
    </div>
  );
}

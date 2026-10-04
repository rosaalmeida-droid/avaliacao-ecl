// ============================================================
// Requisições já feitas (Rosa, out/2026)
// ============================================================
// «Fui à procura de uma requisição que já tinha feito e não aparece
// nenhuma biblioteca de requisições.» Aqui ficam todas as requisições
// guardadas na aplicação, separadas pelo que as originou: as das aulas
// (plano), as dos eventos e as soltas (orçamentos). Tocar numa abre-a com
// as fichas, as doses, as quantidades e os preços que tinha.
// ============================================================
import React, { useMemo, useState } from 'react';
import { getRequisicoes, getFichasProducao, getPlanosAula, lerEventosLocais } from '../backend';
import type { RequisicaoAula } from '../types';

type Tipo = 'aula' | 'evento' | 'solta';
const tipoDe = (r: any): Tipo => r.eventoId ? 'evento' : r.planoAulaId ? 'aula' : 'solta';
const ROTULO: Record<Tipo, string> = { aula: 'Das aulas', evento: 'Dos eventos', solta: 'Soltas (orçamentos)' };

const dataPT = (iso?: string) => {
  const s = String(iso || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : '';
};
const euro = (n?: number) => (Number(n) || 0).toFixed(2).replace('.', ',') + ' €';
const sa = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function RequisicoesFeitas({ onAbrir }: { onAbrir: (r: RequisicaoAula) => void }) {
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<Tipo>('aula');
  const [q, setQ] = useState('');

  const todas = useMemo(() => {
    const fichas = new Map(getFichasProducao().map(f => [f.id, String(f.nomePrato || '').replace(/([^.])\.$/, '$1')]));
    const planos = new Map(getPlanosAula().map(p => [p.id, p]));
    let eventos = new Map<string, string>();
    try { eventos = new Map(lerEventosLocais<any>().map(e => [String(e.id), String(e.nome || e.titulo || '')])); } catch { /* */ }
    return getRequisicoes()
      .filter(r => r?.id)
      .map(r => {
        const t = tipoDe(r);
        const plano = r.planoAulaId ? planos.get(r.planoAulaId) : undefined;
        const nomesFichas = (r.fichasIds || []).map(id => fichas.get(id)).filter(Boolean) as string[];
        const titulo = t === 'evento' ? (eventos.get(String((r as any).eventoId)) || 'Evento')
          : t === 'aula' ? (plano?.titulo || 'Aula') : (nomesFichas.join(' + ') || 'Requisição solta');
        const quando = (r as any).dataIngredientes || r.dataAula || r.criadaEm;
        return { r, t, titulo, nomesFichas, quando, plano };
      })
      .sort((a, b) => String(b.r.atualizadaEm || b.r.criadaEm || '').localeCompare(String(a.r.atualizadaEm || a.r.criadaEm || '')));
  }, [aberto]);

  const conta = (t: Tipo) => todas.filter(x => x.t === t).length;
  const qq = sa(q.trim());
  const lista = todas.filter(x => x.t === tipo && (!qq || sa(`${x.titulo} ${x.nomesFichas.join(' ')} ${x.r.professor} ${x.r.turmaId}`).includes(qq)));

  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', marginBottom: 12 }}>
      <button onClick={() => setAberto(a => !a)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 800 }}>📂 Requisições já feitas ({todas.length})</span>
        <span style={{ fontSize: 13, color: 'var(--copper)', fontWeight: 700 }}>{aberto ? 'Fechar ▲' : 'Ver ▼'}</span>
      </button>
      {aberto && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {(['aula', 'evento', 'solta'] as Tipo[]).map(t => (
              <button key={t} onClick={() => setTipo(t)}
                style={{ flex: '1 1 120px', padding: '8px 10px', borderRadius: 10, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                  fontWeight: tipo === t ? 800 : 500, border: `1.5px solid ${tipo === t ? 'var(--copper)' : 'var(--border)'}`,
                  background: tipo === t ? 'var(--copper-pale)' : '#fff', color: tipo === t ? 'var(--copper)' : 'inherit' }}>
                {ROTULO[t]} ({conta(t)})
              </button>
            ))}
          </div>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Procurar (prato, evento, turma, professor)"
            style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 10, border: '1.5px solid rgba(26,23,20,0.3)', fontSize: 14, fontFamily: 'inherit', marginBottom: 8 }} />
          {lista.length === 0 && (
            <div style={{ fontSize: 13.5, color: 'rgba(26,23,20,0.6)', padding: '8px 2px', lineHeight: 1.5 }}>
              {q ? 'Nenhuma requisição com esse nome.' : `Ainda não há requisições ${tipo === 'aula' ? 'de aulas' : tipo === 'evento' ? 'de eventos' : 'soltas'} guardadas na aplicação.`}
              {tipo === 'solta' && !q && <><br />As requisições soltas feitas antes de outubro de 2026 só ficaram na folha «Ficha de Food Cost/Requisição» (um separador por requisição).</>}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 420, overflowY: 'auto' }}>
            {lista.map(({ r, titulo, nomesFichas, quando }) => (
              <button key={r.id} onClick={() => onAbrir(r)}
                style={{ textAlign: 'left', background: '#faf7f2', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px',
                  cursor: 'pointer', fontFamily: 'inherit', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{titulo}</div>
                  {nomesFichas.length > 0 && <div style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.65)' }}>{nomesFichas.join(' · ')}</div>}
                  <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.5)', marginTop: 2 }}>
                    {[dataPT(quando) && `para ${dataPT(quando)}`, r.turmaId, r.professor, `feita em ${dataPT(r.criadaEm)}`].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--copper)' }}>{euro(r.custoTotal)}</div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: r.estado === 'rascunho' ? '#b5651d' : 'var(--sage)' }}>
                    {r.estado === 'rascunho' ? 'rascunho (não chegou à folha)' : r.estado === 'aprovada' ? 'aprovada' : 'enviada'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

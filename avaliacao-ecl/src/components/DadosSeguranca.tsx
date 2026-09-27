// ============================================================
// Dados e segurança — só a coordenadora
// ============================================================
// O que apaga ou substitui dados deixou de estar do lado do professor:
//   - a cópia de segurança (descarregar e restaurar);
//   - anular planos de aula para sempre (qualquer plano de qualquer
//     turma — o professor arquiva, a coordenadora anula);
//   - eliminar fichas de produção para sempre.
// E os PINs dos professores, que é a coordenadora quem entrega.
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import {
  getTurmas, getPlanosAulaPorTurma, getFichasProducao, eliminarFichaProducaoDefinitivamente, sincronizarDoSheets,
} from '../backend';
import type { PlanoAula } from '../types';
import { DialogoEliminarPlano } from './DialogoEliminarPlano';
import { CopiaSegurancaView } from './CopiaSeguranca';
import { PROFESSORES } from '../professores';
import { fmtDataCurta } from '../datas';

const caixa: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: '14px 16px',
  marginBottom: 14, border: '1px solid rgba(26,23,20,0.08)' };
const titulo: React.CSSProperties = { fontSize: 16, fontWeight: 800, marginBottom: 4 };
const nota: React.CSSProperties = { fontSize: 13, color: 'rgba(26,23,20,0.6)', lineHeight: 1.5, marginBottom: 10 };
const botaoApagar: React.CSSProperties = { padding: '6px 12px', borderRadius: 8, border: '1px solid var(--danger, #c0392b)',
  background: '#fff', color: 'var(--danger, #c0392b)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' };

export function DadosSeguranca() {
  const [versao, setVersao] = useState(0);
  const [pesquisa, setPesquisa] = useState('');
  const [aEliminar, setAEliminar] = useState<PlanoAula | null>(null);

  const [pesquisaPlano, setPesquisaPlano] = useState('');
  const [aCarregar, setACarregar] = useState(true);
  const [aAbrir, setAAbrir] = useState('');

  // Este aparelho não tem os planos das outras turmas: vai buscá-los todos.
  useEffect(() => {
    let vivo = true;
    Promise.allSettled(getTurmas().map(t => sincronizarDoSheets(t.id, { leve: true, forcar: true })))
      .finally(() => { if (vivo) { setACarregar(false); setVersao(v => v + 1); } });
    return () => { vivo = false; };
  }, []);

  // Os arquivados primeiro (foi o professor que pediu), depois os outros, do mais recente.
  const planos = useMemo(() => {
    const q = pesquisaPlano.trim().toLowerCase();
    return getTurmas().flatMap(t => getPlanosAulaPorTurma(t.id, true))
      .filter(p => !q || [p.turmaId, p.titulo, p.data, fmtDataCurta(p.data)].some(x => String(x || '').toLowerCase().includes(q)))
      .sort((a, b) => (a.estado === 'arquivado' ? 0 : 1) - (b.estado === 'arquivado' ? 0 : 1)
        || String(b.data || '').localeCompare(String(a.data || '')));
  }, [versao, pesquisaPlano]);

  // Antes de mostrar o aviso, traz as presenças e avaliações da turma,
  // para o aviso dizer tudo o que se vai apagar.
  function pedirAnular(p: PlanoAula) {
    setAAbrir(p.id);
    sincronizarDoSheets(p.turmaId, { forcar: true }).catch(() => {})
      .finally(() => { setAAbrir(''); setAEliminar(p); });
  }
  const fichas = useMemo(() => {
    const q = pesquisa.trim().toLowerCase();
    return getFichasProducao().filter(f => !q || (f.nomePrato || '').toLowerCase().includes(q))
      .sort((a, b) => (a.nomePrato || '').localeCompare(b.nomePrato || ''));
  }, [versao, pesquisa]);

  return (
    <div style={{ marginTop: 12 }}>
      {/* O mesmo aviso do plano: mostra o que a aula tem e pede confirmação. */}
      {aEliminar && (
        <DialogoEliminarPlano plano={aEliminar} podeEliminar
          onFechar={() => setAEliminar(null)}
          onFeito={() => { setAEliminar(null); setVersao(v => v + 1); }} />
      )}
      <div style={caixa}>
        <div style={titulo}>PINs dos professores</div>
        <div style={nota}>Cada professor entra com o seu PIN e só vê as suas turmas. Entrega o PIN a cada um.</div>
        {PROFESSORES.map(p => (
          <div key={p.nome} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 0',
            borderTop: '1px solid rgba(26,23,20,0.06)', fontSize: 14, flexWrap: 'wrap' }}>
            <b style={{ minWidth: 140 }}>{p.nome}</b>
            <span>PIN <b style={{ fontFamily: 'monospace', fontSize: 15 }}>{p.pin}</b></span>
            <span style={{ color: 'rgba(26,23,20,0.6)' }}>Turmas: {p.turmas.join(', ')}</span>
          </div>
        ))}
      </div>

      <div style={caixa}>
        <div style={titulo}>Cópia de segurança</div>
        <CopiaSegurancaView />
      </div>

      <div style={caixa}>
        <div style={titulo}>Anular planos de aula</div>
        <div style={nota}>
          Anula o plano para sempre — aqui e no arquivo da escola — com tudo o que é dele (presenças, avaliações,
          grupos, requisição). As fichas técnicas e os guiões ficam, só saem do plano. Os arquivados pelo professor aparecem primeiro.
        </div>
        <input value={pesquisaPlano} onChange={e => setPesquisaPlano(e.target.value)} placeholder="Pesquisar por turma, título ou data…"
          style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8,
            border: '1px solid rgba(26,23,20,0.15)', fontSize: 14, marginBottom: 8 }} />
        {aCarregar && <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.5)', marginBottom: 6 }}>A buscar os planos de todas as turmas…</div>}
        {!aCarregar && planos.length === 0 && <div style={{ fontSize: 14, color: 'rgba(26,23,20,0.5)' }}>Não há planos.</div>}
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {planos.map(p => (
            <div key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '7px 0',
              borderTop: '1px solid rgba(26,23,20,0.06)', fontSize: 14 }}>
              <span style={{ minWidth: 60, color: 'rgba(26,23,20,0.55)' }}>{p.turmaId}</span>
              <span style={{ minWidth: 50, color: 'rgba(26,23,20,0.55)' }}>{fmtDataCurta(p.data)}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                {p.titulo || '(sem título)'}
                {p.estado === 'arquivado' && <span style={{ marginLeft: 6, fontSize: 12, color: 'var(--danger, #c0392b)', fontWeight: 700 }}>arquivado</span>}
              </span>
              <button style={{ ...botaoApagar, opacity: aAbrir ? 0.5 : 1 }} disabled={!!aAbrir} onClick={() => pedirAnular(p)}>
                {aAbrir === p.id ? 'A ver…' : 'Anular'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={caixa}>
        <div style={titulo}>Eliminar fichas de produção</div>
        <div style={nota}>Apaga a ficha aqui e no arquivo da escola — não pode ser desfeito.</div>
        <input value={pesquisa} onChange={e => setPesquisa(e.target.value)} placeholder="Pesquisar ficha pelo nome…"
          style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8,
            border: '1px solid rgba(26,23,20,0.15)', fontSize: 14, marginBottom: 8 }} />
        {fichas.slice(0, 60).map(f => (
          <div key={f.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '7px 0',
            borderTop: '1px solid rgba(26,23,20,0.06)', fontSize: 14 }}>
            <span style={{ flex: 1, minWidth: 0 }}>{f.nomePrato || '(sem nome)'}</span>
            <button style={botaoApagar} onClick={() => {
              if (!confirm(`Eliminar definitivamente «${f.nomePrato}»?\n\nApaga a ficha aqui e no arquivo da escola — não pode ser desfeito.`)) return;
              eliminarFichaProducaoDefinitivamente(f.id); setVersao(v => v + 1);
            }}>Eliminar</button>
          </div>
        ))}
        {fichas.length > 60 && <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.5)', marginTop: 6 }}>
          Mostram-se 60 de {fichas.length}. Pesquisa pelo nome para encontrar as outras.</div>}
      </div>
    </div>
  );
}

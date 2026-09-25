// ============================================================
// Dados e segurança — só a coordenadora
// ============================================================
// O que apaga ou substitui dados deixou de estar do lado do professor:
//   - a cópia de segurança (descarregar e restaurar);
//   - eliminar planos de aula para sempre (só os já arquivados — o
//     professor arquiva, a coordenadora elimina);
//   - eliminar fichas de produção para sempre.
// E os PINs dos professores, que é a coordenadora quem entrega.
// ============================================================
import React, { useMemo, useState } from 'react';
import {
  getTurmas, getPlanosAulaPorTurma, getFichasProducao, eliminarFichaProducaoDefinitivamente,
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

  const arquivados = useMemo(() => getTurmas().flatMap(t =>
    getPlanosAulaPorTurma(t.id, true).filter(p => p.estado === 'arquivado')), [versao]);
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
        <div style={titulo}>Eliminar planos de aula</div>
        <div style={nota}>
          O professor arquiva os planos que já não quer. Aqui eliminam-se para sempre (aqui e no arquivo da escola).
          Só aparecem os planos arquivados.
        </div>
        {arquivados.length === 0 && <div style={{ fontSize: 14, color: 'rgba(26,23,20,0.5)' }}>Não há planos arquivados.</div>}
        {arquivados.map(p => (
          <div key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '7px 0',
            borderTop: '1px solid rgba(26,23,20,0.06)', fontSize: 14 }}>
            <span style={{ minWidth: 60, color: 'rgba(26,23,20,0.55)' }}>{p.turmaId}</span>
            <span style={{ minWidth: 50, color: 'rgba(26,23,20,0.55)' }}>{fmtDataCurta(p.data)}</span>
            <span style={{ flex: 1, minWidth: 0 }}>{p.titulo || '(sem título)'}</span>
            <button style={botaoApagar} onClick={() => setAEliminar(p)}>Eliminar</button>
          </div>
        ))}
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

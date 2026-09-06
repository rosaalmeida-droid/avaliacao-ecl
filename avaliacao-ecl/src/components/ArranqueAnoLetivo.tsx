// ============================================================
// Arranque do ano letivo.
//
// Tudo o que foi feito antes do arranque foi simulação — a aplicação
// nunca foi usada por alunos. Este ecrã apaga esse trabalho de teste
// para o ano começar limpo.
//
// A limpeza que já existia só apagava registos com prefixo "seed_", e
// o que foi feito à mão a testar não tem esse prefixo. Esta apaga por
// data.
//
// Não apaga alunos, turmas, manuais, cronograma nem biblioteca.
// ============================================================

import React, { useState } from 'react';
import { previewArranqueAno, limparParaArranqueAno, reporArranqueAno } from '../backend';

const C = {
  branco: '#fff', tinta: '#1A1A1A', suave: '#777',
  bordeaux: '#7B2233', bordeauxSuave: '#F6ECEE',
  perigo: '#C0392B', perigoSuave: '#FDF0EF',
  verde: '#3E7A31', verdeSuave: '#E8F3E5',
  border: '#E4E1E8',
};

export function ArranqueAnoLetivo({ onFechar }: { onFechar?: () => void }) {
  const [data, setData] = useState('2026-09-21');
  const [confirmacao, setConfirmacao] = useState('');
  const [feito, setFeito] = useState<null | { total: number }>(null);
  const [erro, setErro] = useState('');

  const p = previewArranqueAno(data);
  const total = p.planos + p.fichas + p.requisicoes + p.avaliacoes
              + p.presencas + p.selecoes + p.validacoes + p.atividades;

  function limpar() {
    const r = limparParaArranqueAno(data, confirmacao);
    if (!r.ok) { setErro(r.erro ?? 'Não foi possível.'); return; }
    setErro('');
    setFeito({ total });
  }

  function repor() {
    const r = reporArranqueAno();
    if (!r.ok) { setErro(r.erro ?? 'Não foi possível repor.'); return; }
    setFeito(null); setConfirmacao(''); setErro('');
  }

  const linha = (label: string, n: number) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0',
      borderBottom: `1px solid ${C.border}`, fontSize: 14.5 }}>
      <span style={{ color: C.tinta }}>{label}</span>
      <span style={{ fontWeight: 700, color: n > 0 ? C.perigo : C.suave }}>{n}</span>
    </div>
  );

  if (feito) {
    return (
      <div style={{ background: C.branco, borderRadius: 16, padding: 24, textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: C.verdeSuave,
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={C.verde}
            strokeWidth={2.5} strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
        </div>
        <div style={{ fontSize: 19, fontWeight: 700, color: C.tinta }}>
          Apagados {feito.total} registos de teste
        </div>
        <div style={{ fontSize: 14.5, color: C.suave, marginTop: 8, lineHeight: 1.6 }}>
          O ano letivo pode começar. Os alunos, as turmas, os manuais e o
          cronograma ficaram intactos.
        </div>
        <div style={{ background: C.bordeauxSuave, borderRadius: 12, padding: 14, marginTop: 18,
          fontSize: 14, color: C.bordeaux, lineHeight: 1.55, textAlign: 'left' }}>
          Guardei uma cópia do que foi apagado. Se te enganaste, podes repor
          agora — mas só enquanto não fechares esta janela.
        </div>
        <button onClick={repor} style={{ marginTop: 14, background: 'transparent',
          border: `2px solid ${C.bordeaux}`, borderRadius: 12, padding: '12px 20px',
          fontSize: 15, fontWeight: 700, color: C.bordeaux, cursor: 'pointer',
          fontFamily: 'inherit' }}>
          Repor o que foi apagado
        </button>
        {onFechar && (
          <button onClick={onFechar} style={{ display: 'block', width: '100%', marginTop: 10,
            background: 'transparent', border: 'none', padding: 12, fontSize: 14.5,
            color: C.suave, cursor: 'pointer', fontFamily: 'inherit' }}>
            Fechar
          </button>
        )}
        {erro && <div style={{ color: C.perigo, fontSize: 14, marginTop: 10 }}>{erro}</div>}
      </div>
    );
  }

  return (
    <div style={{ background: C.branco, borderRadius: 16, padding: 20 }}>
      <div style={{ fontSize: 19, fontWeight: 700, color: C.tinta }}>Arranque do ano letivo</div>
      <div style={{ fontSize: 14.5, color: C.suave, marginTop: 6, lineHeight: 1.6 }}>
        Apaga o trabalho de aula anterior ao arranque — o que foi feito a testar.
        Alunos, turmas, manuais, cronograma e biblioteca de técnicas ficam intactos.
      </div>

      <div style={{ marginTop: 18 }}>
        <label style={{ fontSize: 13.5, fontWeight: 700, color: C.tinta, display: 'block',
          marginBottom: 6 }}>
          O ano começa a
        </label>
        <input type="date" value={data} onChange={e => setData(e.target.value)}
          style={{ width: '100%', padding: '12px 14px', borderRadius: 10,
            border: `1px solid ${C.border}`, fontSize: 15.5, fontFamily: 'inherit' }} />
        <div style={{ fontSize: 13, color: C.suave, marginTop: 5 }}>
          Tudo o que tiver data anterior é apagado.
        </div>
      </div>

      <div style={{ marginTop: 20, background: C.perigoSuave, borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.perigo, marginBottom: 10 }}>
          Vai apagar
        </div>
        {linha('Planos de aula', p.planos)}
        {linha('Fichas técnicas', p.fichas)}
        {linha('Requisições', p.requisicoes)}
        {linha('Autoavaliações', p.selecoes)}
        {linha('Validações do professor', p.validacoes)}
        {linha('Registos de avaliação', p.avaliacoes)}
        {linha('Presenças', p.presencas)}
        {linha('Atividades', p.atividades)}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 11,
          fontSize: 16, fontWeight: 700, color: C.perigo }}>
          <span>Total</span><span>{total}</span>
        </div>
      </div>

      <div style={{ marginTop: 14, background: C.verdeSuave, borderRadius: 12, padding: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.verde, marginBottom: 8 }}>
          Fica intacto
        </div>
        <div style={{ fontSize: 14.5, color: C.tinta, lineHeight: 1.6 }}>
          {p.alunosMantidos} alunos · {p.turmasMantidas} turmas · manuais ·
          cronograma · referencial · biblioteca de técnicas
        </div>
      </div>

      {total > 0 && (
        <>
          <div style={{ marginTop: 20 }}>
            <label style={{ fontSize: 13.5, fontWeight: 700, color: C.tinta, display: 'block',
              marginBottom: 6 }}>
              Para confirmar, escreve APAGAR
            </label>
            <input value={confirmacao} onChange={e => setConfirmacao(e.target.value)}
              placeholder="APAGAR"
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10,
                border: `2px solid ${confirmacao === 'APAGAR' ? C.perigo : C.border}`,
                fontSize: 16, fontFamily: 'inherit', letterSpacing: '0.1em' }} />
          </div>

          <button onClick={limpar} disabled={confirmacao !== 'APAGAR'}
            style={{ width: '100%', marginTop: 14, padding: 16, borderRadius: 12, border: 'none',
              background: confirmacao === 'APAGAR' ? C.perigo : '#DDD',
              color: '#fff', fontSize: 16.5, fontWeight: 700,
              cursor: confirmacao === 'APAGAR' ? 'pointer' : 'default', fontFamily: 'inherit' }}>
            Apagar {total} registos de teste
          </button>
        </>
      )}

      {total === 0 && (
        <div style={{ marginTop: 18, padding: 16, borderRadius: 12, background: C.verdeSuave,
          fontSize: 15, color: C.verde, textAlign: 'center' }}>
          Não há nada para apagar antes desta data.
        </div>
      )}

      {erro && (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: C.perigoSuave,
          color: C.perigo, fontSize: 14 }}>{erro}</div>
      )}
    </div>
  );
}

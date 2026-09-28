// ============================================================
// O que falta avaliar nesta UC — aviso ao professor
// ============================================================
// Prática, conhecimentos e atitudes da UC: quanto já foi avaliado e o que
// falta. Fica mais forte perto do fim da UC.
import React from 'react';
import { coberturaDaUC } from '../backend';

export function AvisoCoberturaUC({ turmaId, ucId }: { turmaId: string; ucId?: string }) {
  if (!ucId) return null;
  let c;
  try { c = coberturaDaUC(turmaId, ucId); } catch { return null; }
  const falta = c.pratica.faltam.length + c.conhecimentos.faltam.length + (c.atitudes.avaliadas ? 0 : 1);
  if (!falta) return null;
  const perto = c.diasParaFim != null && c.diasParaFim <= 14;
  const cor = perto ? '#9B2C2C' : '#8a4f1e', fundo = perto ? '#FDECEC' : '#FDF6EE';
  const linha = (t: string, a: number, total: number) => (
    <span style={{ whiteSpace: 'nowrap' }}><b>{t}</b> {a} de {total}</span>);
  return (
    <details style={{ background: fundo, border: `1px solid ${cor}33`, borderRadius: 12, padding: '10px 14px', margin: '0 0 14px', fontSize: 13.5, color: cor }}>
      <summary style={{ cursor: 'pointer', fontWeight: 700, lineHeight: 1.5 }}>
        ⚠ Falta avaliar nesta UC ({ucId}{c.diasParaFim != null && c.diasParaFim >= 0 ? ` · acaba daqui a ${c.diasParaFim} dias` : ''}):{' '}
        {linha('Prática', c.pratica.avaliadas, c.pratica.total)} · {linha('Conhecimentos', c.conhecimentos.avaliados, c.conhecimentos.total)} ·{' '}
        <b>Atitudes</b> {c.atitudes.avaliadas ? 'avaliadas' : 'nenhuma avaliada'}
      </summary>
      <div style={{ marginTop: 8, color: 'rgba(26,23,20,0.75)', lineHeight: 1.5 }}>
        {c.conhecimentos.faltam.length > 0 && <>
          <div style={{ fontWeight: 700, marginTop: 4 }}>Conhecimentos do referencial por avaliar</div>
          <ul style={{ margin: '4px 0 6px 18px', padding: 0 }}>{c.conhecimentos.faltam.map(t => <li key={t}>{t}</li>)}</ul>
        </>}
        {c.pratica.faltam.length > 0 && <>
          <div style={{ fontWeight: 700, marginTop: 4 }}>Técnicas da UC ainda sem avaliação ({c.pratica.faltam.length})</div>
          <ul style={{ margin: '4px 0 6px 18px', padding: 0 }}>{c.pratica.faltam.slice(0, 8).map(t => <li key={t}>{t}</li>)}</ul>
          {c.pratica.faltam.length > 8 && <div>… e mais {c.pratica.faltam.length - 8}.</div>}
        </>}
        <div style={{ fontSize: 12.5, marginTop: 4 }}>As fichas de outras áreas (eventos) também contam para o aluno; isto é só o que a UC ainda pede.</div>
      </div>
    </details>
  );
}

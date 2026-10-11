// ============================================================
// Registo das horas em atividades extra (Rosa, 7/out/2026)
// ============================================================
// Por aluno: as horas fora do horário da turma, quantas à noite e quantas
// ao fim de semana; e, ao tocar, as atividades uma a uma. Descarrega-se
// para o Excel (para usar mais tarde).
// ============================================================
import React, { useMemo, useState } from 'react';
import { getAlunos, getTurmas } from '../backend';
import { horasExtraDoAluno, totaisHorasExtra, horasTxt } from '../horasExtra';
import { descarregar } from '../pautaUC';

const C = { tinta: '#1A1714', suave: 'rgba(26,23,20,0.6)', linha: 'rgba(26,23,20,0.1)', bordeaux: '#7B2233', cobre: '#B5651D' };
const dataPT = (iso: string) => iso.split('-').reverse().join('/');

export function RegistoHorasExtra({ turmaId, onVoltar }: { turmaId?: string; onVoltar: () => void }) {
  const turmas = getTurmas().map((t: any) => t.id || t);
  const [turma, setTurma] = useState(turmaId || turmas[0] || '');
  const [aberto, setAberto] = useState<string | null>(null);
  const alunos = useMemo(() => getAlunos().filter(a => a.turmaId === turma && a.ativo !== false && a.numero < 80)
    .sort((a, b) => a.numero - b.numero)
    .map(a => { const linhas = horasExtraDoAluno(a.id, turma); return { a, linhas, t: totaisHorasExtra(linhas) }; }), [turma]);
  const totalTurma = alunos.reduce((s, x) => s + x.t.horas, 0);

  function descarregarCSV() {
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const n = (x: number) => String(x).replace('.', ',');
    const linhas = [['Turma', 'Nº', 'Aluno', 'Data', 'Dia', 'Atividade', 'Tipo', 'Horário', 'Horas fora do horário', 'Das quais à noite', 'Das quais ao fim de semana', 'Participação confirmada']];
    for (const { a, linhas: ls } of alunos) for (const l of ls)
      linhas.push([turma, String(a.numero), a.nome || '', dataPT(l.data), l.diaSemana, l.titulo, l.tipo, l.horario, n(l.horas), n(l.noite), n(l.fimDeSemana), l.confirmado ? 'sim' : 'por confirmar']);
    linhas.push([]);
    linhas.push(['Totais por aluno (só participação confirmada)']);
    linhas.push(['Turma', 'Nº', 'Aluno', 'Atividades', 'Horas fora do horário', 'À noite', 'Ao fim de semana']);
    for (const { a, t } of alunos) linhas.push([turma, String(a.numero), a.nome || '', String(t.atividades), n(t.horas), n(t.noite), n(t.fimDeSemana)]);
    const csv = '﻿' + linhas.map(l => l.map(esc).join(';')).join('\r\n');
    descarregar(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `Horas extra ${turma.replace('º', '')} ${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <button onClick={onVoltar} style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${C.linha}`, background: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 12 }}>← Voltar</button>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.tinta }}>Registo de horas extra</div>
      <div style={{ fontSize: 14, color: C.suave, lineHeight: 1.5, margin: '4px 0 12px' }}>
        As horas que cada aluno fez em atividades extra <b>fora do horário da turma</b>: nos dias de semana fora das aulas,
        à noite (depois das 19:00) e ao fim de semana. Só contam as atividades em que confirmou quem participou.
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <select value={turma} onChange={e => { setTurma(e.target.value); setAberto(null); }}
          style={{ padding: '9px 10px', borderRadius: 10, border: `1px solid ${C.linha}`, fontSize: 14.5, fontFamily: 'inherit' }}>
          {turmas.map((t: string) => <option key={t} value={t}>{t}</option>)}
        </select>
        <span style={{ fontSize: 14, color: C.suave }}>Turma: <b style={{ color: C.tinta }}>{horasTxt(totalTurma)}</b></span>
        <button onClick={descarregarCSV} style={{ marginLeft: 'auto', padding: '9px 14px', borderRadius: 10, border: 'none', background: C.bordeaux, color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          Descarregar para o Excel</button>
      </div>
      {alunos.map(({ a, linhas, t }) => {
        const ab = aberto === a.id;
        return (
          <div key={a.id} style={{ background: '#fff', border: `1px solid ${C.linha}`, borderRadius: 12, marginBottom: 8, overflow: 'hidden' }}>
            <button onClick={() => setAberto(ab ? null : a.id)} disabled={!linhas.length}
              style={{ width: '100%', display: 'flex', gap: 10, alignItems: 'center', padding: '11px 14px', border: 'none', background: 'transparent',
                cursor: linhas.length ? 'pointer' : 'default', fontFamily: 'inherit', textAlign: 'left' }}>
              <span style={{ width: 30, fontWeight: 800, color: C.suave }}>{a.numero}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 700, color: C.tinta }}>{a.nome}</span>
                <span style={{ display: 'block', fontSize: 13, color: C.suave }}>
                  {t.atividades ? `${t.atividades} atividade${t.atividades === 1 ? '' : 's'} · à noite ${horasTxt(t.noite)} · ao fim de semana ${horasTxt(t.fimDeSemana)}` : 'sem horas extra'}
                  {t.porConfirmar ? <b style={{ color: C.cobre }}> · {t.porConfirmar} por confirmar</b> : null}
                </span>
              </span>
              <b style={{ fontSize: 17, color: C.tinta }}>{horasTxt(t.horas)}</b>
            </button>
            {ab && (
              <div style={{ borderTop: `1px solid ${C.linha}`, padding: '6px 14px 10px' }}>
                {linhas.map(l => (
                  <div key={l.planoId} style={{ display: 'flex', gap: 10, padding: '7px 0', borderBottom: `1px solid ${C.linha}`, fontSize: 14 }}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <b>{dataPT(l.data)}</b> ({l.diaSemana}) · {l.titulo}
                      <span style={{ display: 'block', fontSize: 12.5, color: C.suave }}>
                        {l.horario} · {l.quando}{l.noite && l.quando !== 'Fim de semana' ? ` (${horasTxt(l.noite)} à noite)` : ''}
                        {!l.confirmado && <b style={{ color: C.cobre }}> · participação por confirmar (não conta)</b>}
                      </span>
                    </span>
                    <b>{horasTxt(l.horas)}</b>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
